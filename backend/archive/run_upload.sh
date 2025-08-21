#!/bin/bash

cd ~/medplat/backend

echo "🧹 Removing old JSON keys..."
rm -f medplat-458911-firebase-*.json
rm -f *-fbsvc-*.json
rm -f serviceAccountKey.json
rm -f your-service-account.json

echo "🔍 Finding newest deployer key..."
LATEST_KEY=$(ls -t medplat-458911-*.json | head -n 1)

if [ -z "$LATEST_KEY" ]; then
  echo "❌ No valid service account key found!"
  exit 1
fi

echo "✅ Found: $LATEST_KEY"

echo "📌 Exporting GOOGLE_APPLICATION_CREDENTIALS..."
export GOOGLE_APPLICATION_CREDENTIALS="$PWD/$LATEST_KEY"

echo "🚀 Uploading cases to Firestore..."
node upload_cases_to_firestore.mjs
