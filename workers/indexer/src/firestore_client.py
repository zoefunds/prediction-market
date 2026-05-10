"""Thin wrapper around firebase_admin.firestore for typed writes."""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import firebase_admin
from firebase_admin import credentials, firestore
from google.auth.credentials import AnonymousCredentials
from google.cloud.firestore import SERVER_TIMESTAMP, Client

from .config import Config

log = logging.getLogger(__name__)


def init_firestore(cfg: Config) -> Client:
    """Initialize Firebase Admin and return a Firestore client."""
    if not firebase_admin._apps:
        if cfg.firestore_emulator_host:
            cred = credentials.ApplicationDefault.__new__(
                credentials.ApplicationDefault
            )
            cred._g_credential = AnonymousCredentials()
            cred._project_id = cfg.firebase_project_id
            firebase_admin.initialize_app(
                cred, {"projectId": cfg.firebase_project_id}
            )
        elif cfg.google_application_credentials:
            cred = credentials.Certificate(cfg.google_application_credentials)
            firebase_admin.initialize_app(
                cred, {"projectId": cfg.firebase_project_id}
            )
        else:
            firebase_admin.initialize_app(
                options={"projectId": cfg.firebase_project_id}
            )
        log.info(
            "firebase initialized: project=%s emulator=%s",
            cfg.firebase_project_id,
            cfg.firestore_emulator_host or "<live>",
        )
    return firestore.client()


def upsert_market(
    db: Client, market_id: str, data: Dict[str, Any]
) -> None:
    """Merge data into markets/{market_id}.

    Special handling: if the doc already has `hidden=True`, we never overwrite
    that flag. This lets us mark old test markets as hidden once and have them
    stay hidden across reindexing.
    """
    ref = db.collection("markets").document(market_id)
    snap = ref.get()
    if snap.exists:
        existing = snap.to_dict() or {}
        # Preserve hidden flag across upserts
        if existing.get("hidden") is True and "hidden" not in data:
            # Don't pass hidden in data; merge=True will leave it alone.
            pass
        ref.set({**data, "updatedAt": SERVER_TIMESTAMP}, merge=True)
    else:
        ref.set(
            {
                **data,
                "createdAt": SERVER_TIMESTAMP,
                "updatedAt": SERVER_TIMESTAMP,
            },
            merge=True,
        )


def write_event(
    db: Client,
    event_id: str,
    *,
    type_: str,
    market_id: Optional[str],
    tx_sig: str,
    slot: int,
    block_time: int,
    payload: Dict[str, Any],
) -> bool:
    """Idempotent event write. Returns True if newly inserted, False if exists."""
    ref = db.collection("events").document(event_id)
    snap = ref.get()
    if snap.exists:
        return False
    ref.set(
        {
            "type": type_,
            "marketId": market_id,
            "txSig": tx_sig,
            "slot": slot,
            "blockTime": block_time,
            "payload": payload,
            "indexedAt": SERVER_TIMESTAMP,
        }
    )
    return True
