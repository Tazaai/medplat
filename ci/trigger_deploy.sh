#!/usr/bin/env bash
set -euo pipefail
# Helper to trigger the deploy workflow from a machine with GH CLI authenticated as an admin.
# Usage: sudo -u <admin> bash ci/trigger_deploy.sh

REPO="Tazaai/medplat"
WORKFLOW="deploy.yml"
REF="main"

echo "Triggering workflow ${WORKFLOW} on ${REPO} (ref=${REF})..."

# This will return 1 if the caller lacks repo permissions (HTTP 403).
gh workflow run "${WORKFLOW}" --repo "${REPO}" --ref "${REF}"

if [ $? -eq 0 ]; then
  echo "Workflow dispatch requested successfully."
else
  echo "Failed to dispatch workflow — check your GH CLI authentication and permissions." >&2
  exit 1
fi
