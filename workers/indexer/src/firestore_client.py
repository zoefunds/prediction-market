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
    """Initialize Firebase Admin and return a Firestore client.

    Three modes:
      1. Local emulator: FIRESTORE_EMULATOR_HOST set → use anonymous creds.
      2. Service account: GOOGLE_APPLICATION_CREDENTIALS path set.
      3. Application Default Credentials.
    """
    if not firebase_admin._apps:
        if cfg.firestore_emulator_host:
            # Emulator: no real credentials needed; firebase-admin still
            # demands *something*, so we wrap a mock.
            cred = credentials.ApplicationDefault.__new__(credentials.ApplicationDefault)
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


def upsert_market(db: Client, market_id: str, data: Dict[str, Any]) -> None:
    """Idempotently merge market state."""
    ref = db.collection("markets").document(market_id)
    payload = {**data, "updatedAt": SERVER_TIMESTAMP}
    if "createdAt" not in data:
        payload.setdefault("createdAt", SERVER_TIMESTAMP)
    ref.set(payload, merge=True)


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
    """Write an event idempotently. Returns True if newly inserted."""
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
