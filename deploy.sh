#!/usr/bin/env bash
set -euo pipefail

SVC="medplat-backend"
REGION="europe-west1"

echo "🚀 Deploying medplat-backend from source..."

# Change to the project root to ensure the --source path is correct
# This makes the script runnable from any directory, even via symlinks.
cd "$(dirname "$(readlink -f "$0" || echo "$0")")"

gcloud run deploy "$SVC" \
  --source ./backend \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-secrets=OPENAI_API_KEY=OPENAI_API_KEY:latest \
  --project "$(gcloud config get-value project)"

echo "✅ Deployment command executed."
