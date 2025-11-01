#!/bin/bash
set -e

OUTFILE=${1:-.env.local}

echo "🔧 Generating $OUTFILE ..."
echo "--------------------------------------"

# Ensure required variables are set
REQUIRED_VARS=(OPENAI_API_KEY GCP_PROJECT VITE_API_BASE FIREBASE_SERVICE_KEY GCP_SA_KEY)
for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    echo "❌ Missing required env var: $VAR"
    exit 1
  fi
done

# Simple JSON validation helper
validate_json() {
  local value="$1"
  echo "$value" | jq empty >/dev/null 2>&1
}

# Validate FIREBASE_SERVICE_KEY
if ! validate_json "$FIREBASE_SERVICE_KEY"; then
  echo "⚠️  Warning: FIREBASE_SERVICE_KEY is not valid JSON."
else
  echo "✅ FIREBASE_SERVICE_KEY JSON valid"
fi

# Validate GCP_SA_KEY
if ! validate_json "$GCP_SA_KEY"; then
  echo "⚠️  Warning: GCP_SA_KEY is not valid JSON."
else
  echo "✅ GCP_SA_KEY JSON valid"
fi

# Write to .env.local
{
  echo "OPENAI_API_KEY=\"$OPENAI_API_KEY\""
  echo "GCP_PROJECT=\"$GCP_PROJECT\""
  echo "VITE_API_BASE=\"$VITE_API_BASE\""
  echo "FIREBASE_SERVICE_KEY='$FIREBASE_SERVICE_KEY'"
  echo "GCP_SA_KEY='$GCP_SA_KEY'"
} > "$OUTFILE"

echo "--------------------------------------"
echo "✅ $OUTFILE generated successfully."
