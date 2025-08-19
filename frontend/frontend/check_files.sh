#!/bin/bash

echo "🔍 Verifying restored frontend components..."

files=(
  ~/medplat/frontend/src/components/CaseList.jsx
  ~/medplat/frontend/src/components/CaseEditor.jsx
  ~/medplat/frontend/src/components/CaseSearch.jsx
  ~/medplat/frontend/src/components/AISuggestionBox.jsx
  ~/medplat/frontend/src/components/DialogChat.jsx
)

for f in "${files[@]}"; do
  if [ -f "$f" ]; then
    echo "✅ Found: $f"
  else
    echo "❌ Missing: $f"
  fi
done
