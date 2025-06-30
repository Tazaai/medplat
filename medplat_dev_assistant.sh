#!/bin/bash

PROJECT_ROOT=~/medplat
BACKEND="$PROJECT_ROOT/backend"
FRONTEND="$PROJECT_ROOT/frontend"
OPENAI_KEY_PATH="$HOME/.openai_api_key"

check_openai_key() {
  if [[ -f "$OPENAI_KEY_PATH" ]]; then
    echo "✅ OpenAI API key found."
  else
    echo "⚠️ Missing OpenAI API key. Add it with:"
    echo "   echo 'sk-...' > $OPENAI_KEY_PATH"
  fi
}

init_git() {
  cd "$PROJECT_ROOT" || exit
  if [[ ! -d ".git" ]]; then
    git init && git add . && git commit -m "Initial commit – Medplat Dev Assistant"
    echo "✅ Git initialized and project committed."
  else
    echo "🔄 Git already initialized."
  fi
}

watch_files() {
  echo "🔍 Watching key files for changes..."
  inotifywait -e modify -m \
    $BACKEND/*.js $BACKEND/*.mjs $BACKEND/Dockerfile \
    $BACKEND/routes/*.mjs \
    $FRONTEND/src/components/*.jsx $FRONTEND/src/pages/*.jsx \
    $FRONTEND/Dockerfile $FRONTEND/index.html |
  while read -r path action file; do
    echo "📌 Change detected in: $file ($action)"
    echo "🛠️  Suggesting: git add '$path$file' && git commit"
  done
}

deploy_backend() {
  echo "🚀 Deploying backend to Cloud Run..."
  gcloud builds submit --tag gcr.io/medplat-458911/medplat-backend
  gcloud run deploy medplat-backend --image gcr.io/medplat-458911/medplat-backend --region europe-west1
}

summary() {
  echo
  echo "🔧 Managed Files:"
  find "$BACKEND" "$FRONTEND" -type f | grep -E '\.js$|\.mjs$|\.jsx$|Dockerfile|index.html'
  echo
  echo "🧠 Reminder: Only topics are stored in Firebase — not full cases."
  echo
}

# === Run flow ===
check_openai_key
init_git
summary
# Uncomment to enable live file watcher
# watch_files
