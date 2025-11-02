#!/usr/bin/env bash
# ci_watch_and_logs.sh
# Usage: bash scripts/ci_watch_and_logs.sh [--workflow ci-checks.yml] [--ref main] [--outdir /tmp]
#
# Triggers a workflow_dispatch for the given workflow/ref (optional), polls until completion,
# then saves the full run log and per-job logs for failed jobs to the output directory.
# Produces summary files:
#   <outdir>/run-<RUN_ID>.log
#   <outdir>/run-<RUN_ID>-jobs.json
#   <outdir>/run-<RUN_ID>-jobs.txt (summary: id name status conclusion)
#   <outdir>/run-<RUN_ID>-job-<JOBID>.log (for failed jobs where job id is available)
#
set -euo pipefail

WORKFLOW="ci-checks.yml"
REF="main"
OUTDIR="/tmp"
GH_BIN=$(command -v gh || true)

while [ "$#" -gt 0 ]; do
  case "$1" in
    --workflow) WORKFLOW="$2"; shift 2;;
    --ref) REF="$2"; shift 2;;
    --outdir) OUTDIR="$2"; shift 2;;
    -h|--help) sed -n '1,120p' "$0"; exit 0;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

if [ -z "$GH_BIN" ]; then
  echo "gh CLI not found. Install GitHub CLI and authenticate (gh auth login)." >&2
  exit 2
fi

mkdir -p "$OUTDIR"

echo "Dispatching workflow '$WORKFLOW' on ref '$REF'..."
# Fire a workflow_dispatch; ignore errors if workflow doesn't accept dispatch
if gh workflow view "$WORKFLOW" >/dev/null 2>&1; then
  gh workflow run "$WORKFLOW" --ref "$REF" || true
else
  echo "Warning: workflow '$WORKFLOW' not found in this repo. Continuing to look for latest run." >&2
fi

# Wait a short moment for GH to register the run
sleep 2

# Get latest run id for this workflow
RUN_ID=$(gh run list --workflow="$WORKFLOW" --limit 1 --json databaseId -q '.[0].databaseId' 2>/dev/null || true)
if [ -z "$RUN_ID" ] || [ "$RUN_ID" = "null" ]; then
  echo "Could not determine latest run id for workflow '$WORKFLOW'. Exiting." >&2
  exit 3
fi

echo "Watching run: $RUN_ID"

# Poll until completed
count=0
while true; do
  status=$(gh run view "$RUN_ID" --json status -q '.status' 2>/dev/null || echo "unknown")
  echo "$(date -u +%H:%M:%S) status: $status"
  if [ "$status" = "completed" ]; then
    echo "Run completed. Collecting logs..."
    break
  fi
  count=$((count+1))
  if [ $count -ge 120 ]; then
    echo "Timeout waiting for run to complete (~20 minutes). Exiting." >&2
    exit 4
  fi
  sleep 10
done

OUT_RUN_LOG="$OUTDIR/run-${RUN_ID}.log"
OUT_JOBS_JSON="$OUTDIR/run-${RUN_ID}-jobs.json"
OUT_JOBS_TXT="$OUTDIR/run-${RUN_ID}-jobs.txt"

# Save the full run log if available
if gh run view "$RUN_ID" --log > "$OUT_RUN_LOG" 2>/dev/null; then
  echo "Saved full run log: $OUT_RUN_LOG"
else
  echo "Full run log not available via gh run view --log; continuing to fetch per-job logs where possible." >&2
fi

# Fetch jobs metadata via API
REPO_SLUG=$(gh repo view --json owner,name -q '.owner.login + "/" + .name')
# Use API to get jobs; write pretty JSON
gh api "/repos/${REPO_SLUG}/actions/runs/${RUN_ID}/jobs" > "$OUT_JOBS_JSON" || echo "Failed to fetch jobs JSON" >&2

# Summarize jobs
jq -r '.jobs[] | [(.id // "null"), .name, .status, (.conclusion // "null")] | @tsv' "$OUT_JOBS_JSON" 2>/dev/null | awk -F"\t" '{printf "%s\t%s\t%s\t%s\n", $1, $2, $3, $4}' > "$OUT_JOBS_TXT" || echo "No jobs summary created"

echo "Jobs summary written to: $OUT_JOBS_TXT"
cat "$OUT_JOBS_TXT" || true

# For failed or cancelled jobs, attempt to download job logs if id is present
FAILED=0
if [ -f "$OUT_JOBS_TXT" ]; then
  while IFS=$'\t' read -r jobid jobname status conclusion; do
    if [ "${conclusion}" != "success" ]; then
      FAILED=1
      if [ "$jobid" != "null" ] && [ -n "$jobid" ]; then
        echo "Fetching job log for $jobname (id=$jobid) ..."
        # gh run view --job <jobid> --log is sometimes available
        if gh run view --job "$jobid" --log > "$OUTDIR/run-${RUN_ID}-job-${jobid}.log" 2>/dev/null; then
          echo "Saved: $OUTDIR/run-${RUN_ID}-job-${jobid}.log"
        else
          echo "Failed to download job log for id=$jobid via gh run view --job. Attempting to fetch from API..."
          # Try API endpoint for job logs (may require different handling)
          # Skip if not available
        fi
      else
        echo "No job id for $jobname; skipping job-specific log download."
      fi
    fi
  done < "$OUT_JOBS_TXT"
fi

# Produce simple summary: grep errors in full log (if it exists)
if [ -f "$OUT_RUN_LOG" ]; then
  echo
  echo "----- Error/Failure lines from full run log -----"
  grep -nE "ERROR|error|FAIL|Failed|exit code|ERROR:" "$OUT_RUN_LOG" || echo "No error-like lines found in full run log."
  echo
  echo "----- Tail of full run log (last 300 lines) -----"
  tail -n 300 "$OUT_RUN_LOG" || true
fi

if [ $FAILED -ne 0 ]; then
  echo
  echo "One or more jobs did not succeed. Check per-job logs in $OUTDIR for details."
  exit 5
else
  echo
  echo "All jobs succeeded (or no failing jobs found)." 
  exit 0
fi
