#!/bin/sh
set -e

if [ -n "$GOOGLE_APPLICATION_CREDENTIALS_JSON" ]; then
  mkdir -p /app/secrets
  echo "$GOOGLE_APPLICATION_CREDENTIALS_JSON" > /app/secrets/firebase-admin.json
  echo "[entrypoint] wrote credentials to /app/secrets/firebase-admin.json"
fi

exec python -m src.main
