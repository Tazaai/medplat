#!/bin/bash
# Quick save & push script for MedPlat
# Usage: ./save.sh "commit message"

cd /workspaces/medplat

# If no message is given, use a default
MSG=${1:-"Quick save from Codespace"}

echo "📂 Checking changes..."
git status -s

echo "➕ Adding all changes..."
git add .

echo "💾 Committing..."
git commit -m "$MSG"

echo "🚀 Pushing to GitHub..."
git push origin main

echo "✅ Done!"
echo "📂 Saved files:"
git diff --name-only HEAD~1 HEAD
