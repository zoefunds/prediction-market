"""Runtime config for the Solana event indexer."""
from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Config:
    """Indexer configuration. All values come from env vars."""

    rpc_url: str
    rpc_ws_url: str
    program_id: str
    firebase_project_id: str
    # Path to a service-account JSON, or "" to use ADC (e.g. emulator).
    google_application_credentials: str
    # If set, point firestore client at the local emulator.
    firestore_emulator_host: str
    # If set, point auth/storage clients at the local emulators.
    firebase_auth_emulator_host: str
    # IDL file path for event decoding.
    idl_path: str
    # How far back (slots) to backfill on cold start. 0 = skip backfill.
    backfill_slot_window: int
    # Long-poll interval for RPC fallback if WS dies.
    poll_interval_secs: float


def load_config() -> Config:
    return Config(
        rpc_url=os.getenv(
            "SOLANA_RPC_URL", "https://api.devnet.solana.com"
        ),
        rpc_ws_url=os.getenv(
            "SOLANA_RPC_WS_URL", "wss://api.devnet.solana.com"
        ),
        program_id=os.getenv(
            "PROGRAM_ID", "3yC9BuiC3kkkjDw1wFtW4AxXmezRM3U8GfWRxGoqxd7A"
        ),
        firebase_project_id=os.getenv(
            "FIREBASE_PROJECT_ID", "prediction-market-b14c4"
        ),
        google_application_credentials=os.getenv(
            "GOOGLE_APPLICATION_CREDENTIALS", ""
        ),
        firestore_emulator_host=os.getenv("FIRESTORE_EMULATOR_HOST", ""),
        firebase_auth_emulator_host=os.getenv(
            "FIREBASE_AUTH_EMULATOR_HOST", ""
        ),
        idl_path=os.getenv(
            "IDL_PATH", "../../target/idl/prediction_market.json"
        ),
        backfill_slot_window=int(os.getenv("BACKFILL_SLOT_WINDOW", "1000")),
        poll_interval_secs=float(os.getenv("POLL_INTERVAL_SECS", "5.0")),
    )
