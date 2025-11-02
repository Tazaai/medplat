#!/usr/bin/env bash
# Helper: configure GitHub CLI with a personal access token (PAT) that has
# repo and workflow scopes so CI dispatch and workflow-run APIs work.
#
# Usage:
#  - One-shot (interactive): run this script and paste the PAT when prompted.
#  - Non-interactive: set GH_PAT env var and run the script.
#
# Note: This script does not store secrets in the repo. It calls `gh auth login`
# which stores credentials in the user's gh config (~/.config/gh/hosts.yml).

set -euo pipefail

if command -v gh >/dev/null 2>&1; then
  echo "gh CLI found: $(gh --version | head -n1)"
else
  echo "gh CLI not found. Install from https://cli.github.com/ and retry." >&2
  exit 2
fi

if [ -n "${GH_PAT:-}" ]; then
  TOKEN="$GH_PAT"
else
  echo "Enter a GitHub Personal Access Token (PAT) with these scopes: repo, workflow"
  echo "You can create one at https://github.com/settings/tokens"
  read -r -s -p "Paste PAT: " TOKEN
  echo
fi

if [ -z "$TOKEN" ]; then
  echo "No token provided; aborting." >&2
  exit 3
fi

# Use gh login with token
echo "$TOKEN" | gh auth login --with-token

echo "gh CLI configured. Current auth status:"
gh auth status || true

echo "Done. You can now run: gh workflow run <workflow-file> --ref <branch>"
