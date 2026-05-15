#!/usr/bin/env bash
set -euo pipefail
QUEUE_SIG="$1"
FINAL_SIG="$2"

echo "== Queue =="
solana confirm "$QUEUE_SIG" --url https://api.devnet.solana.com -v | tail -n 25

echo "== Final =="
solana confirm "$FINAL_SIG" --url https://api.devnet.solana.com -v | tail -n 60 | tee /tmp/final_status.txt

if rg -q "Status: Ok" /tmp/final_status.txt; then
  echo "MPC_FINAL=PASS"
  exit 0
else
  echo "MPC_FINAL=FAIL"
  exit 1
fi
