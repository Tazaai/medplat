#!/usr/bin/env bash
# Helper: fetch_workflow_logs.sh
# Usage: ./scripts/fetch_workflow_logs.sh deploy.yml
# Requires: gh CLI authenticated with a user that can list and view workflow runs.

set -euo pipefail

WORKFLOW_FILE=${1:-deploy.yml}
OUTDIR=${2:-/workspaces/medplat/tmp}

mkdir -p "$OUTDIR"

echo "Listing recent runs for workflow: $WORKFLOW_FILE"
gh run list --workflow="$WORKFLOW_FILE" --limit 10 --json id,status,event,conclusion,createdAt --jq '.[] | {id, status, conclusion, createdAt}' || true

echo "Enter run id to fetch logs (or press ENTER to fetch most recent):"
read -r RUN_ID

if [ -z "$RUN_ID" ]; then
  echo "Finding most recent run id..."
  RUN_ID=$(gh run list --workflow="$WORKFLOW_FILE" --limit 1 --json id --jq '.[0].id') || true
fi

if [ -z "$RUN_ID" ]; then
  echo "No run id found. Exiting." >&2
  exit 2
fi

OUTFILE="$OUTDIR/deploy-run-${RUN_ID}.log"
echo "Fetching logs for run id $RUN_ID -> $OUTFILE"
gh run view "$RUN_ID" --log > "$OUTFILE"

echo "Logs saved to: $OUTFILE"
echo "You can copy this file into the devcontainer at /workspaces/medplat/tmp/ for the automation agent to inspect."
