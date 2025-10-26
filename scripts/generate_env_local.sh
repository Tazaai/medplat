#!/usr/bin/env bash
# Generate a gitignored .env.local file from environment variables.
# Designed to run in CI (where secrets are available as env vars) or locally after you export secrets.
set -euo pipefail

OUT_FILE=${1:-.env.local}
echo "Generating $OUT_FILE from environment variables (will overwrite if exists)"
rm -f "$OUT_FILE"

escape() {
  # Escape single quotes for safe single-quoted shell literal
  printf '%s' "$1" | sed "s/'/'\\''/g"
}

write_var() {
  local name="$1"
  local val="${!name-}"
  if [ -n "$val" ]; then
    esc=$(escape "$val")
    printf "%s='%s'\n" "$name" "$esc" >> "$OUT_FILE"
  fi
}

# List of vars to persist into .env.local (only if set)
VARS=(OPENAI_API_KEY GCP_PROJECT GCP_SA_KEY FIREBASE_SERVICE_KEY VITE_API_BASE)
for v in "${VARS[@]}"; do
  write_var "$v"
done

chmod 600 "$OUT_FILE" || true
echo "Wrote $OUT_FILE"
