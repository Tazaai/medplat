#!/usr/bin/env bash
set -euo pipefail

# Simple connectivity check for MedPlat backend topics endpoint.
# Usage: bash scripts/check_connectivity.sh [BASE_URL] [ENDPOINT]
# Defaults: BASE_URL=${BACKEND_URL:-http://localhost:8080}, ENDPOINT=/api/topics

TS=$(date +%Y%m%d_%H%M%S)
LOG=logs/connectivity_${TS}.log
mkdir -p logs

BASE_URL="${1:-${BACKEND_URL:-http://localhost:8080}}"
ENDPOINT="${2:-/api/topics}"
FULL_URL="${BASE_URL%/}${ENDPOINT}"

echo "Timestamp: $TS" > "$LOG"
echo "Checking $FULL_URL" >> "$LOG"

TMP_RESP=$(mktemp)
HTTP=$(curl -s -o "$TMP_RESP" -w "%{http_code}" "$FULL_URL" || echo "000")
echo "HTTP $HTTP" >> "$LOG"

if [ "$HTTP" = "200" ]; then
  # append body (not huge for topics) and mark pass
  cat "$TMP_RESP" >> "$LOG" 2>/dev/null || true
  echo "Result: PASS" >> "$LOG"
  cat "$LOG"
  rm -f "$TMP_RESP"
  exit 0
else
  echo "Result: FAIL - HTTP $HTTP" >> "$LOG"
  cat "$TMP_RESP" 2>/dev/null || true
  cat "$LOG"
  rm -f "$TMP_RESP"
  exit 2
fi
