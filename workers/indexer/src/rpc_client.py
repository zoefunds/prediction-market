"""Minimal Solana RPC client for our indexer needs.

We only need:
  - logsSubscribe (websocket) for live tail
  - getSignaturesForAddress (HTTP) for backfill
  - getTransaction (HTTP) to fetch logs for a sig
"""
from __future__ import annotations

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Any, AsyncIterator, Dict, List, Optional

import httpx
import websockets

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class TxLogs:
    signature: str
    slot: int
    block_time: int
    err: Optional[Any]
    logs: List[str]


class RpcClient:
    def __init__(self, http_url: str, ws_url: str):
        self._http_url = http_url
        self._ws_url = ws_url
        self._http = httpx.AsyncClient(timeout=30.0)

    async def close(self) -> None:
        await self._http.aclose()

    # ── HTTP ─────────────────────────────────────────────────────────────
    async def _http_call(self, method: str, params: List[Any]) -> Any:
        body = {"jsonrpc": "2.0", "id": 1, "method": method, "params": params}
        r = await self._http.post(self._http_url, json=body)
        r.raise_for_status()
        j = r.json()
        if "error" in j:
            raise RuntimeError(f"{method}: {j['error']}")
        return j["result"]

    async def get_signatures_for_address(
        self, address: str, *, limit: int = 1000, before: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        params: List[Any] = [address, {"limit": limit}]
        if before is not None:
            params[1]["before"] = before
        return await self._http_call("getSignaturesForAddress", params)

    async def get_transaction(self, sig: str) -> Optional[Dict[str, Any]]:
        params: List[Any] = [
            sig,
            {"commitment": "confirmed", "maxSupportedTransactionVersion": 0},
        ]
        try:
            return await self._http_call("getTransaction", params)
        except RuntimeError as e:
            log.warning("get_transaction(%s): %s", sig, e)
            return None

    # ── WS ───────────────────────────────────────────────────────────────
    @asynccontextmanager
    async def logs_subscribe(self, address: str) -> AsyncIterator["asyncio.Queue[TxLogs]"]:
        queue: asyncio.Queue[TxLogs] = asyncio.Queue(maxsize=1024)
        stop = asyncio.Event()

        async def reader():
            backoff = 1.0
            while not stop.is_set():
                try:
                    async with websockets.connect(
                        self._ws_url, max_size=2**24, ping_interval=20
                    ) as ws:
                        await ws.send(
                            json.dumps(
                                {
                                    "jsonrpc": "2.0",
                                    "id": 1,
                                    "method": "logsSubscribe",
                                    "params": [
                                        {"mentions": [address]},
                                        {"commitment": "confirmed"},
                                    ],
                                }
                            )
                        )
                        backoff = 1.0
                        async for raw in ws:
                            msg = json.loads(raw)
                            params = msg.get("params")
                            if not params:
                                continue
                            value = params.get("result", {}).get("value", {})
                            ctx = params.get("result", {}).get("context", {})
                            if not value:
                                continue
                            tx = TxLogs(
                                signature=value.get("signature", ""),
                                slot=ctx.get("slot", 0),
                                block_time=0,  # not in WS payload; fetched lazily if needed
                                err=value.get("err"),
                                logs=value.get("logs") or [],
                            )
                            try:
                                queue.put_nowait(tx)
                            except asyncio.QueueFull:
                                log.warning("logs queue full; dropping %s", tx.signature)
                except Exception as e:
                    if stop.is_set():
                        break
                    log.warning("logs ws disconnect: %s; reconnecting in %.1fs", e, backoff)
                    await asyncio.sleep(backoff)
                    backoff = min(backoff * 2, 30.0)

        task = asyncio.create_task(reader())
        try:
            yield queue
        finally:
            stop.set()
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
