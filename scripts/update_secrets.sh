#!/bin/bash
# scripts/update_secrets.sh
# Manually update Secret Manager secrets when needed (not automatic during CI/CD)

set -e

GCP_PROJECT="${GCP_PROJECT:-medplat-458911}"

echo "🔐 Manual Secret Update Script"
echo "================================"
echo ""
echo "This script allows you to manually update secrets in Secret Manager."
echo "Secrets are NOT automatically updated during CI/CD to prevent accidental overwrites."
echo ""

# Check for Firebase key
if [ -f "firebase_key.json" ]; then
  echo "✅ Found firebase_key.json"
  read -p "Update medplat-firebase-key in Secret Manager? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Uploading new version of medplat-firebase-key..."
    gcloud secrets versions add medplat-firebase-key \
      --data-file=firebase_key.json \
      --project=$GCP_PROJECT
    echo "✅ Firebase key updated"
  fi
else
  echo "⚠️  firebase_key.json not found in current directory"
fi

echo ""

# Check for OpenAI key
if [ -n "$OPENAI_API_KEY" ]; then
  echo "✅ Found OPENAI_API_KEY environment variable"
  read -p "Update medplat-openai-key in Secret Manager? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Uploading new version of medplat-openai-key..."
    printf '%s' "$OPENAI_API_KEY" | gcloud secrets versions add medplat-openai-key \
      --data-file=- \
      --project=$GCP_PROJECT
    echo "✅ OpenAI key updated"
  fi
else
  echo "⚠️  OPENAI_API_KEY environment variable not set"
fi

echo ""
echo "📋 Current secret versions:"
echo ""
echo "Firebase key:"
gcloud secrets versions list medplat-firebase-key --limit=3 --project=$GCP_PROJECT
echo ""
echo "OpenAI key:"
gcloud secrets versions list medplat-openai-key --limit=3 --project=$GCP_PROJECT
echo ""
echo "✅ Done"
