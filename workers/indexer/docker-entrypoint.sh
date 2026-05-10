#!/bin/sh
set -e

if [ -n "$GOOGLE_APPLICATION_CREDENTIALS_JSON_B64" ]; then
  mkdir -p /app/secrets
  echo "$GOOGLE_APPLICATION_CREDENTIALS_JSON_B64" | base64 -d > /app/secrets/firebase-admin.json
  echo "[entrypoint] decoded credentials to /app/secrets/firebase-admin.json ($(wc -c < /app/secrets/firebase-admin.json) bytes)"
elif [ -n "$GOOGLE_APPLICATION_CREDENTIALS_JSON" ]; then
  mkdir -p /app/secrets
  printf '%s' "$GOOGLE_APPLICATION_CREDENTIALS_JSON" > /app/secrets/firebase-admin.json
  echo "[entrypoint] wrote credentials to /app/secrets/firebase-admin.json ($(wc -c < /app/secrets/firebase-admin.json) bytes)"
fi

exec python -m src.main
