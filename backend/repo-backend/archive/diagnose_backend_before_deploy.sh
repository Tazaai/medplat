#!/bin/bash
# File: diagnose_backend_before_deploy.sh

echo "🩺 Running Medplat backend diagnostics..."

# Check if frontend files accidentally landed in backend folder
echo "🔍 Checking for misplaced frontend files in backend/"
find ~/medplat/backend -type f \( -name "*.jsx" -o -name "*.css" -o -name "index.html" \)

# Check Dockerfile presence
if [[ ! -f ~/medplat/backend/Dockerfile ]]; then
  echo "❌ Dockerfile missing in backend/"
else
  echo "✅ Dockerfile found"
fi

# Check CORS and routes in index.js
echo "🔍 Checking index.js for CORS and routes..."
INDEX_FILE=~/medplat/backend/index.js

# Check CORS headers
grep -q 'Access-Control-Allow-Origin' "$INDEX_FILE" && echo "✅ CORS headers present" || echo "⚠️ CORS headers missing"

# Check for route mounts
grep -q '/api/topics' "$INDEX_FILE" && echo "✅ /api/topics route found" || echo "⚠️ /api/topics route missing"
grep -q '/api/dialog' "$INDEX_FILE" && echo "✅ /api/dialog route found" || echo "⚠️ /api/dialog route missing"
grep -q '/api/gamify' "$INDEX_FILE" && echo "✅ /api/gamify route found" || echo "⚠️ /api/gamify route missing"

echo "🛑 No changes were made. Review above issues before deploying."
