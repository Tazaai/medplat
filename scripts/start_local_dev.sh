#!/usr/bin/env bash
set -euo pipefail
# Start backend and frontend for local development in background.
# Writes PIDs to tmp/*.pid and logs to tmp/*.log
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

mkdir -p tmp

echo "Installing backend dependencies..."
npm ci --prefix backend

echo "Installing frontend dependencies..."
npm ci --prefix frontend

# Start backend
if [ -f tmp/backend.pid ] && kill -0 "$(cat tmp/backend.pid)" >/dev/null 2>&1; then
  echo "Backend already running (pid=$(cat tmp/backend.pid))."
else
  echo "Starting backend on PORT=8080..."
  PORT=8080 nohup node ./backend/index.js > tmp/backend.log 2>&1 &
  echo $! > tmp/backend.pid
  echo "Backend pid=$(cat tmp/backend.pid)"
fi

# Wait briefly for backend to become reachable
echo "Waiting for backend to warm up..."
for i in {1..10}; do
  if curl -sS --connect-timeout 1 http://localhost:8080/ >/dev/null 2>&1; then
    echo "Backend is up"
    break
  fi
  sleep 0.5
done

# Start frontend dev server in background using VITE_API_BASE
if [ -f tmp/frontend.pid ] && kill -0 "$(cat tmp/frontend.pid)" >/dev/null 2>&1; then
  echo "Frontend dev server already running (pid=$(cat tmp/frontend.pid))."
else
  echo "Starting frontend dev server with VITE_API_BASE=http://localhost:8080..."
  export VITE_API_BASE=http://localhost:8080
  (cd frontend && VITE_API_BASE=http://localhost:8080 npm run dev) > tmp/frontend.log 2>&1 &
  echo $! > tmp/frontend.pid
  echo "Frontend pid=$(cat tmp/frontend.pid)"
fi

# Build frontend production assets (writes VITE_API_BASE to dist)
echo "Building frontend production assets (optional)..."
VITE_API_BASE=http://localhost:8080 npm run --prefix frontend build > tmp/frontend-build.log 2>&1 || true

# Run review_report.sh to produce agent.md
echo "Running diagnostics (review_report.sh)..."
bash review_report.sh || true

echo "Start complete. Logs in tmp/*.log; PIDs in tmp/*.pid"
