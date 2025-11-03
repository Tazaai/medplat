#!/usr/bin/env bash
# Monitor deploy.yml workflow runs and fetch logs for completed runs.
# Usage: ./scripts/monitor_workflow_and_fetch.sh [interval_seconds]
# Requires: gh CLI authenticated with an account that can view workflow runs.

set -euo pipefail

WORKFLOW=${WORKFLOW:-deploy.yml}
OUTDIR=${OUTDIR:-/workspaces/medplat/tmp}
SEEN_FILE=${SEEN_FILE:-$OUTDIR/seen_runs.txt}
INTERVAL=${1:-60}

mkdir -p "$OUTDIR"
touch "$SEEN_FILE"

echo "Monitoring workflow '$WORKFLOW' every ${INTERVAL}s. Logs -> $OUTDIR"

while true; do
  # find completed runs (most recent first)
  mapfile -t IDS < <(gh run list --workflow="$WORKFLOW" --limit 50 --json id,status --jq '.[] | select(.status=="completed") | .id' 2>/dev/null || true)

  for id in "${IDS[@]:-}"; do
    # skip if already seen
    if grep -qx "$id" "$SEEN_FILE"; then
      continue
    fi

    echo "New completed run found: $id — fetching logs..."
    OUTFILE="$OUTDIR/deploy-run-${id}.log"
    if gh run view "$id" --log > "$OUTFILE" 2>/dev/null; then
      echo "$id" >> "$SEEN_FILE"
      echo "Saved logs to $OUTFILE"
    else
      echo "Failed to fetch logs for run $id" >&2
    fi
  done

  sleep "$INTERVAL"
done
