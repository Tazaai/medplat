#!/usr/bin/env bash
set -euo pipefail
# Lightweight secret presence and JSON check for local dev
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE='.env.local'
echo "Checking secrets (no secret values will be printed)..."

missing=0

check_var() {
  local name=$1
  local present=0
  if [ -n "${!name:-}" ]; then
    present=1
  elif [ -f "$ENV_FILE" ] && grep -qE "^\s*(export\s+)?${name}=" "$ENV_FILE"; then
    present=1
  fi
  if [ $present -eq 1 ]; then
    echo "  ✅ $name: present"
  else
    echo "  ❌ $name: missing"
    missing=$((missing+1))
  fi
}

check_var OPENAI_API_KEY
check_var GCP_PROJECT
check_var VITE_API_BASE

# Validate FIREBASE_SERVICE_KEY JSON inside .env.local if present
if [ -f "$ENV_FILE" ] && grep -qE "^\s*(export\s+)?FIREBASE_SERVICE_KEY=" "$ENV_FILE"; then
  if command -v node >/dev/null 2>&1; then
    echo -n "  🔍 FIREBASE_SERVICE_KEY JSON: ";
    node ./scripts/validate_secret_json.mjs FIREBASE_SERVICE_KEY .env.local && echo "✅ OK" || echo "❌ INVALID"
  else
    echo "  ⚠️ FIREBASE_SERVICE_KEY JSON: node not available to validate"
  fi
else
  echo "  ❌ FIREBASE_SERVICE_KEY: missing in .env.local or env"
  missing=$((missing+1))
fi

if [ $missing -eq 0 ]; then
  echo "\nAll required local secrets present (or set in .env.local)."
  exit 0
else
  echo "\n$missing secrets are missing. Add them to .env.local or export in your shell before running local checks."
  exit 1
fi
