#!/usr/bin/env bash
# Purge sensitive archive from git history and rotate service-account key in Secret Manager
# SAFE MODE: script is a dry-run by default. Use --execute to actually run destructive steps.
# Usage (dry-run): ./scripts/purge_and_rotate.sh
# Usage (execute): SERVICE_ACCOUNT="sa@PROJECT.iam.gserviceaccount.com" CLOUD_RUN_URL="https://..." ./scripts/purge_and_rotate.sh --execute

set -euo pipefail

PATH_TO_REMOVE="medplat_backup_20250901_2042.tar.gz"
LOG_DIR="logs"
mkdir -p "$LOG_DIR"
TIMESTAMP=$(date +"%F_%H-%M-%S")
LOG_FILE="$LOG_DIR/purge_and_rotate_${TIMESTAMP}.log"
EXECUTE=false

# Parse flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    --execute) EXECUTE=true; shift ;;
    -h|--help) echo "Usage: $0 [--execute]"; exit 0 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# Tee output to a timestamped log file
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== Purge & Rotate script started: $TIMESTAMP ==="
echo "Repository: $(git rev-parse --show-toplevel)"
echo "Current branch: $(git rev-parse --abbrev-ref HEAD)"
echo "Path to remove: $PATH_TO_REMOVE"
echo "Execute mode: $EXECUTE"

echo "-- Step 1: Create backup branch (local & remote) --"
BACKUP_BRANCH="backup/purge_${TIMESTAMP}"
# Create backup branch from the current main (verify main exists locally)
if git rev-parse --verify main >/dev/null 2>&1; then
  echo "Creating backup branch $BACKUP_BRANCH from main"
  git checkout main
  git pull --ff-only origin main
  git branch -f "$BACKUP_BRANCH" main
  git push -u origin "$BACKUP_BRANCH"
else
  echo "ERROR: branch 'main' not found locally. Aborting." >&2
  exit 2
fi

# Show diff summary that would be affected (dry-run)
echo "-- Git files containing $PATH_TO_REMOVE (if any): --"
if git ls-files | grep -F "$PATH_TO_REMOVE" >/dev/null 2>&1; then
  git ls-files | grep -F "$PATH_TO_REMOVE"
else
  echo "No tracked file named $PATH_TO_REMOVE found in current working tree. It might be present in history only." 
fi

# If not executing, print the plan and exit
if [ "$EXECUTE" = false ]; then
  echo "\nDRY RUN (no destructive actions taken). To execute, re-run with --execute and set required env vars." 
  echo "Planned actions if executed:" 
  echo " 1) Run: npx git-filter-repo --path $PATH_TO_REMOVE --invert-paths" 
  echo " 2) git push --force origin main" 
  echo " 3) Create new service-account key and add as new Secret Manager version for 'medplat-service-key'" 
  echo " 4) Optionally disable/remove old service-account keys" 
  echo " 5) Run smoke test: API_BASE=\"$CLOUD_RUN_URL\" node backend/test/test_topics_api_smoke.cjs (requires CLOUD_RUN_URL env)" 
  echo "Log file written to: $LOG_FILE"
  exit 0
fi

# Execution continues here
# Precondition checks
if [ -z "${SERVICE_ACCOUNT:-}" ]; then
  echo "ERROR: SERVICE_ACCOUNT env var not set. Set SERVICE_ACCOUNT to the service account email to create a new key." >&2
  echo "Example: SERVICE_ACCOUNT=medplat-sa@my-project.iam.gserviceaccount.com" >&2
  exit 3
fi
if [ -z "${CLOUD_RUN_URL:-}" ]; then
  echo "WARNING: CLOUD_RUN_URL not set. You can still rotate keys, but smoke test will be skipped." >&2
fi

# Step 2: Run git-filter-repo to remove the path from history
echo "-- Step 2: Running git-filter-repo to remove $PATH_TO_REMOVE from history --"
if ! command -v npx >/dev/null 2>&1; then
  echo "ERROR: npx not found on PATH. Install Node.js/npm to run git-filter-repo via npx." >&2
  exit 4
fi
# Ensure git-filter-repo is available; npx will download if needed
# Run the filter-repo command
echo "Running: npx git-filter-repo --path $PATH_TO_REMOVE --invert-paths"
# Note: git-filter-repo rewrites the repository in-place; ensure backup branch pushed earlier.
npx git-filter-repo --path "$PATH_TO_REMOVE" --invert-paths

echo "git-filter-repo finished. Showing recent commits (top 10) for review:"
git --no-pager log --oneline -n 10

# Step 3: Force-push rewritten main
echo "-- Step 3: Force-push updated main to origin --"
git checkout main
# Ensure we have updated refs
git fetch origin
echo "Force-pushing main to origin (this is destructive)"
git push --force origin main

# Step 4: Rotate service account key in Secret Manager
echo "-- Step 4: Rotate service account key in Secret Manager --"
NEW_KEY_FILE="/tmp/new-key-${TIMESTAMP}.json"
echo "Creating new key for service account: $SERVICE_ACCOUNT -> $NEW_KEY_FILE"
gcloud iam service-accounts keys create "$NEW_KEY_FILE" \
  --iam-account="$SERVICE_ACCOUNT"

echo "Adding new key as a new version to Secret Manager secret 'medplat-service-key'"
gcloud secrets versions add medplat-service-key --data-file="$NEW_KEY_FILE"

# Optional: disable or delete previous keys (interactive) - list keys
echo "Listing keys for $SERVICE_ACCOUNT (for manual review):"
gcloud iam service-accounts keys list --iam-account="$SERVICE_ACCOUNT" --format=json | jq -r '.[] | "- name: \(.name)  validAfterTime: \(.validAfterTime)  validBeforeTime: \(.validBeforeTime)"'

# Cleanup local key file
shred -u "$NEW_KEY_FILE" || rm -f "$NEW_KEY_FILE"

# Step 5: Run smoke test if CLOUD_RUN_URL provided
if [ -n "${CLOUD_RUN_URL:-}" ]; then
  echo "-- Step 5: Running smoke test against $CLOUD_RUN_URL --"
  API_BASE="$CLOUD_RUN_URL" node backend/test/test_topics_api_smoke.cjs || {
    echo "Smoke test FAILED. Please inspect logs and ensure service works after history rewrite and key rotation." >&2
    exit 5
  }
  echo "Smoke test passed."
else
  echo "CLOUD_RUN_URL not set; skipping smoke test. Please run smoke test manually: API_BASE=... node backend/test/test_topics_api_smoke.cjs"
fi

echo "=== Purge & Rotate script completed successfully. Log: $LOG_FILE ==="
exit 0
