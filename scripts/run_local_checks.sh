#!/usr/bin/env bash
set -euo pipefail
# Helper: source local env file (if present) and run project checks
# IMPORTANT: do NOT commit `.env.local` or any secret material to git.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ -f .env.local ]; then
  echo "Sourcing .env.local (ensure this file is gitignored and contains secrets only for local use)"
  # shellcheck disable=SC1091
  echo "Preparing sanitized env from .env.local (ensure this file is gitignored and contains secrets only for local use)"
  # Use Node helper to sanitize potential multiline JSON entries into single-line values
  # Use node runner to safely parse .env.local (handles multiline JSON) and run checks
  node ./scripts/run_with_env.js .env.local
  exit $?
else
  echo "No .env.local found. You can export required secrets into your shell or create a .env.local file."
  echo "Required env vars: OPENAI_API_KEY, GCP_PROJECT, GCP_SA_KEY, FIREBASE_SERVICE_KEY, VITE_API_BASE"
fi

echo "Running review_report.sh (will write agent.md)"
bash review_report.sh

echo "Running test_backend_local.sh (starts backend and runs smoke tests)"
bash test_backend_local.sh

echo "Local checks complete. Check agent.md for the diagnostic report."
