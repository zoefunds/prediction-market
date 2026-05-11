"""One-shot: re-enrich every market doc from the on-chain Market account.

Run this once after fixing the indexer to repair existing Firestore data
that was written with stale event-payload values.

Usage (locally):
    python -m workers.indexer.src.backfill_markets

Or inside the Railway container after a deploy:
    railway run python -m src.backfill_markets
"""
from __future__ import annotations

import asyncio
import logging

from .config import load_config
from .firestore_client import init_firestore, upsert_market
from .market_account import decode_market_account
from .rpc_client import RpcClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("backfill")


async def main() -> int:
    cfg = load_config()
    db = init_firestore(cfg)
    rpc = RpcClient(cfg.rpc_url, cfg.rpc_ws_url)

    snaps = list(db.collection("markets").stream())
    log.info("scanning %d market docs", len(snaps))
    fixed = 0
    skipped = 0
    for snap in snaps:
        d = snap.to_dict() or {}
        pda = d.get("marketPda")
        if not pda:
            log.warning("market %s has no marketPda, skipping", snap.id)
            skipped += 1
            continue
        raw = await rpc.get_account_data(pda)
        if not raw:
            log.warning("market %s pda=%s has no account data", snap.id, pda)
            skipped += 1
            continue
        m = decode_market_account(raw)
        if not m:
            log.warning("market %s pda=%s failed to decode", snap.id, pda)
            skipped += 1
            continue
        update = {
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
        upsert_market(db, snap.id, update)
        log.info(
            "market %s: positions=%d status=%s",
            snap.id,
            m.total_positions,
            m.status,
        )
        fixed += 1

    await rpc.close()
    log.info("done: fixed=%d skipped=%d", fixed, skipped)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
