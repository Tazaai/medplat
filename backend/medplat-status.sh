#!/bin/bash

echo "🔍 MedPlat Status Check"
echo "============================="
echo ""
echo "📁 Tjekker aktuelle sti og mappestruktur:"
pwd
tree -L 2 . 2>/dev/null || ls -l

echo ""
echo "⚙️ Aktive udviklingsprocesser:"
ps aux | grep -E "vite|flask|gunicorn|firebase" | grep -v grep

echo ""
echo "🧪 Node.js version:"
node -v 2>/dev/null || echo "Node.js ikke installeret"

echo "🐍 Python version:"
python3 --version 2>/dev/null || echo "Python3 ikke installeret"

echo ""
echo "🔥 Firebase status:"
which firebase >/dev/null && firebase --version || echo "Firebase CLI ikke fundet" 

echo ""
echo "📦 Pipenv status:"
pipenv --venv 2>/dev/null || echo "Pipenv ikke aktiv eller installeret"

echo ""
echo "🌿 Git status:"
git status 2>/dev/null || echo "Git repo ikke initialiseret"

echo ""
echo "📂 Vigtige mapper:"
for folder in frontend backend scripts firebase; do
    if [ -d "$folder" ]; then
        echo "✅ $folder findes"
    else
        echo "❌ $folder mangler"
    fi
done

echo ""
echo "📄 Tjek for .env og service-account-filer:"
ls | grep -E '\.env|service.*\.json' || echo "Ingen .env eller service account JSON fundet"

echo ""
echo "✅ Status-check færdig."
