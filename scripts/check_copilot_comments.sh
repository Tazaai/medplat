#!/bin/bash
# CI check script — validate Copilot guide comments in renderer files
# Prevents accidental deletion of critical AI guidance documentation
# Usage: bash scripts/check_copilot_comments.sh

set -e

echo "🔍 Validating Copilot guide comments in renderer components..."

MISSING=0
FILES=(
  "frontend/src/components/CaseView.jsx"
  "frontend/src/components/ProfessionalCaseDisplay.jsx"
  "frontend/src/components/Level2CaseLogic.jsx"
)

for FILE in "${FILES[@]}"; do
  if ! grep -q "Copilot Guide — Global Clinical Context" "$FILE"; then
    echo "❌ FAIL: Missing Copilot guide comment in $FILE"
    MISSING=1
  else
    echo "✅ OK: $FILE contains Copilot guide"
  fi
done

if [ $MISSING -eq 1 ]; then
  echo ""
  echo "⚠️  ERROR: One or more renderer files are missing the required Copilot guide comment."
  echo "    The guide ensures AI-driven case generation follows global clinical standards."
  echo "    Do not remove these comments without updating the CI check."
  exit 1
fi

echo ""
echo "✅ All Copilot guide comments present and accounted for!"
exit 0
