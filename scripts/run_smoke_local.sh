#!/usr/bin/env bash
# Helper to run the post-deploy smoke test locally and capture artifacts.
# Ensures the ./tmp directory exists so piping to tee won't fail.
# Usage:
#   ./scripts/run_smoke_local.sh <FRONTEND_PRIMARY> [FRONTEND_FALLBACK] <BACKEND_PRIMARY> [BACKEND_FALLBACK]

set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <FRONTEND_PRIMARY> [FRONTEND_FALLBACK] <BACKEND_PRIMARY> [BACKEND_FALLBACK]"
  exit 2
fi

mkdir -p tmp

node scripts/post_deploy_smoke_test.mjs "$@" 2>&1 | tee tmp/smoke-output-local.txt

echo "Wrote logs to tmp/"
