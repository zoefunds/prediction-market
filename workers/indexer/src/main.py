"""Solana → Firestore event indexer entry point."""
from __future__ import annotations

import asyncio
import logging
import os
import signal
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from .config import Config, load_config
from .decoder import EventDecoder
from .firestore_client import init_firestore, upsert_market, write_event
from .market_account import decode_market_account
from .rpc_client import RpcClient

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

log = logging.getLogger("indexer")


def _normalize(raw: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for k, v in raw.items():
        if isinstance(v, int) and (v > 2**53 - 1 or v < -(2**53 - 1)):
            out[k] = str(v)
        elif isinstance(v, dict):
            out[k] = _normalize(v)
        elif isinstance(v, list):
            out[k] = [_normalize(i) if isinstance(i, dict) else i for i in v]
        else:
            out[k] = v
    return out


class Indexer:
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.rpc = RpcClient(cfg.rpc_url, cfg.rpc_ws_url)
        self.db = init_firestore(cfg)
        idl_path = Path(cfg.idl_path).resolve()
        if not idl_path.exists():
            raise FileNotFoundError(f"IDL not found: {idl_path}")
        self.decoder = EventDecoder(idl_path)
        self._pda_to_id: Dict[str, str] = {}
        self._hydrate_pda_map()
        log.info(
            "indexer ready: program=%s rpc=%s",
            cfg.program_id,
            cfg.rpc_url,
        )

    def _hydrate_pda_map(self) -> None:
        for snap in self.db.collection("markets").stream():
            d = snap.to_dict() or {}
            pda = d.get("marketPda")
            if pda:
                self._pda_to_id[pda] = snap.id

    async def close(self) -> None:
        await self.rpc.close()

    async def _enrich_from_chain(self, market_pda: str) -> Dict[str, Any]:
        """Pull the on-chain market account and return the rich UI fields."""
        raw = await self.rpc.get_account_data(market_pda)
        if not raw:
            return {}
        m = decode_market_account(raw)
        if not m:
            return {}
        return {
            "question": m.question,
            "description": m.description,
            "category": m.category or "general",
            "resolver": m.resolver,
            "closeTs": m.close_ts,
            "resolvedTs": m.resolved_ts,
            "status": m.status,
            "winningOutcome": m.winning_outcome,
            "yesPool": m.yes_pool,
            "noPool": m.no_pool,
            "totalPositions": m.total_positions,
        }

    async def process_tx_logs(
        self,
        signature: str,
        slot: int,
        block_time: int,
        logs: List[str],
        err: Optional[Any] = None,
    ) -> int:
        if err is not None:
            return 0
        n = 0
        idx = 0
        for line in logs:
            decoded = self.decoder.decode_log_line(line)
            if decoded is None:
                continue
            event_id = f"{signature}-{idx}"
            payload = _normalize(decoded["data"])
            market_id = self._extract_market_id(decoded["name"], payload)
            inserted = write_event(
                self.db,
                event_id,
                type_=decoded["name"],
                market_id=market_id,
                tx_sig=signature,
                slot=slot,
                block_time=block_time,
                payload=payload,
            )
            if inserted:
                n += 1
                await self._mirror_event(decoded["name"], payload, slot, block_time)
            idx += 1
        return n

    def _extract_market_id(self, event_name: str, payload: Dict[str, Any]) -> Optional[str]:
        if event_name == "MarketCreated":
            return str(payload.get("id"))
        pda = payload.get("market")
        if pda and pda in self._pda_to_id:
            return self._pda_to_id[pda]
        return None

    async def _mirror_event(
        self,
        name: str,
        payload: Dict[str, Any],
        slot: int,
        block_time: int,
    ) -> None:
        if name == "MarketCreated":
            mid = str(payload.get("id"))
            pda = payload.get("market")
            if pda:
                self._pda_to_id[pda] = mid
            base = {
                "id": mid,
                "creator": payload.get("creator"),
                "marketPda": pda,
                "closeTs": int(payload.get("close_ts") or 0),
                "status": "Open",
                "totalPositions": 0,
            }
            # Enrich with on-chain question/description/category.
            if pda:
                base.update(await self._enrich_from_chain(pda))
            upsert_market(self.db, mid, base)
            return

        pda = payload.get("market")
        if not pda:
            return
        mid = self._pda_to_id.get(pda)
        if not mid:
            return

        if name == "PositionSubmitted":
            upsert_market(
                self.db,
                mid,
                {"totalPositions": payload.get("total_positions")},
            )
        elif name == "MarketResolutionRequested":
            upsert_market(self.db, mid, {"status": "AwaitingResolution"})
        elif name == "MarketResolved":
            yes = payload.get("yes_pool")
            no = payload.get("no_pool")
            upsert_market(
                self.db,
                mid,
                {
                    "status": "Resolved",
                    "winningOutcome": payload.get("winning_outcome"),
                    "yesPool": int(yes) if isinstance(yes, str) else yes,
                    "noPool": int(no) if isinstance(no, str) else no,
                    "resolvedTs": payload.get("timestamp"),
                },
            )

    async def backfill(self, max_pages: int = 5) -> None:
        log.info("backfill starting…")
        before = None
        total = 0
        for page in range(max_pages):
            sigs = await self.rpc.get_signatures_for_address(
                self.cfg.program_id, limit=1000, before=before
            )
            if not sigs:
                break
            log.info("backfill page %d: %d sigs", page + 1, len(sigs))
            for s in reversed(sigs):
                if s.get("err") is not None:
                    continue
                tx = await self.rpc.get_transaction(s["signature"])
                if not tx or not tx.get("meta"):
                    continue
                meta = tx["meta"]
                logs = meta.get("logMessages") or []
                n = await self.process_tx_logs(
                    s["signature"],
                    s.get("slot", 0),
                    s.get("blockTime") or 0,
                    logs,
                    meta.get("err"),
                )
                total += n
            before = sigs[-1]["signature"]
            await asyncio.sleep(0.2)
        log.info("backfill complete: %d events written", total)

    async def tail(self) -> None:
        log.info("tailing program logs via websocket…")
        async with self.rpc.logs_subscribe(self.cfg.program_id) as queue:
            while True:
                tx = await queue.get()
                n = await self.process_tx_logs(
                    tx.signature, tx.slot, tx.block_time, tx.logs, tx.err
                )
                if n:
                    log.info("tail: %s slot=%d events=%d", tx.signature[:8], tx.slot, n)


async def amain() -> int:
    cfg = load_config()
    idx = Indexer(cfg)
    stop = asyncio.Event()

    def _stop(*_: Any) -> None:
        stop.set()

    loop = asyncio.get_running_loop()
    for s in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(s, _stop)
        except NotImplementedError:
            pass

    try:
        if cfg.backfill_slot_window > 0:
            await idx.backfill()
        tail_task = asyncio.create_task(idx.tail())
        await stop.wait()
        tail_task.cancel()
        try:
            await tail_task
        except asyncio.CancelledError:
            pass
    finally:
        await idx.close()
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(amain()))
