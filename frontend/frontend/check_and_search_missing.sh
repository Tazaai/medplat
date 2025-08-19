#!/bin/bash

echo "🔍 Scanning MedPlat project for key files and searching in backup if missing..."

# Define the backup root
BACKUP_ROOT=~/medplat_backup_20250625_full

# Define all expected file paths
files=(
  ~/medplat/backend/Dockerfile
  ~/medplat/backend/firebaseClient.js
  ~/medplat/backend/generate_case_openai.mjs
  ~/medplat/backend/update_cases.mjs
  ~/medplat/backend/translate_util.mjs
  ~/medplat/backend/routes/topics_api.mjs
  ~/medplat/backend/routes/dialog_api.mjs
  ~/medplat/backend/routes/comment_api.mjs
  ~/medplat/frontend/Dockerfile
  ~/medplat/frontend/index.html
  ~/medplat/frontend/src/components/CaseView.jsx
  ~/medplat/frontend/src/components/CaseSelectors.jsx
  ~/medplat/frontend/src/components/CaseList.jsx
  ~/medplat/frontend/src/components/CaseEditor.jsx
  ~/medplat/frontend/src/components/CaseSearch.jsx
  ~/medplat/frontend/src/components/AISuggestionBox.jsx
  ~/medplat/frontend/src/components/DialogChat.jsx
)

# Check each file
for f in "${files[@]}"; do
  if [ -f "$f" ]; then
    echo "✅ Found: $f"
  else
    echo "❌ Missing: $f"
    # Try to locate the file in the backup
    relative_path="${f/#~\//}"  # Strip ~/
    filename=$(basename "$f")
    echo "   🔎 Searching for '$filename' in backup..."
    find "$BACKUP_ROOT" -type f -name "$filename" 2>/dev/null
  fi
done
