"""Decode the on-chain Market account (v0.2 — public stakes, no MPC)."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import base58

STATUS = ["Open", "AwaitingResolution", "Resolved", "Cancelled"]


@dataclass
class MarketAccount:
    id: int
    creator: str
    resolver: str
    question: str
    description: str
    category: str
    close_ts: int
    resolved_ts: int
    status: str
    winning_outcome: int
    yes_pool: int
    no_pool: int
    total_positions: int


def _read_string(buf: bytes, off: int) -> tuple[str, int]:
    n = int.from_bytes(buf[off : off + 4], "little")
    s = buf[off + 4 : off + 4 + n].decode("utf-8", errors="replace")
    return s, off + 4 + n


def decode_market_account(raw: bytes) -> Optional[MarketAccount]:
    if len(raw) < 8:
        return None
    o = 8  # skip discriminator
    try:
        id_ = int.from_bytes(raw[o : o + 8], "little"); o += 8
        creator = base58.b58encode(raw[o : o + 32]).decode(); o += 32
        resolver = base58.b58encode(raw[o : o + 32]).decode(); o += 32
        question, o = _read_string(raw, o)
        description, o = _read_string(raw, o)
        category, o = _read_string(raw, o)
        close_ts = int.from_bytes(raw[o : o + 8], "little", signed=True); o += 8
        resolved_ts = int.from_bytes(raw[o : o + 8], "little", signed=True); o += 8
        status_idx = raw[o]; o += 1
        winning_outcome = raw[o]; o += 1
        yes_pool = int.from_bytes(raw[o : o + 8], "little"); o += 8
        no_pool = int.from_bytes(raw[o : o + 8], "little"); o += 8
        total_positions = int.from_bytes(raw[o : o + 4], "little"); o += 4
    except (IndexError, ValueError):
        return None

    return MarketAccount(
        id=id_,
        creator=creator,
        resolver=resolver,
        question=question,
        description=description,
        category=category,
        close_ts=close_ts,
        resolved_ts=resolved_ts,
        status=STATUS[status_idx] if status_idx < len(STATUS) else "Unknown",
        winning_outcome=winning_outcome,
        yes_pool=yes_pool,
        no_pool=no_pool,
        total_positions=total_positions,
    )
