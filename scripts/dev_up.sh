#!/bin/bash
# Dev helper: start backend + frontend safely and verify connectivity

set -euo pipefail
LOGDIR="logs"; mkdir -p "$LOGDIR" tmp
TS=$(date +%Y%m%d_%H%M%S)
LOG="$LOGDIR/dev_up_${TS}.log"

echo "=== MedPlat dev_up.sh started at $TS ===" | tee "$LOG"

PORT=${PORT:-8080}
FRONT_PORT=${FRONT_PORT:-5173}

# Support non-interactive mode via --yes / -y
AUTO_YES=false
for arg in "$@"; do
  if [[ "$arg" == "--yes" || "$arg" == "-y" ]]; then
    AUTO_YES=true
  fi
done
[ "$AUTO_YES" = true ] && echo "[dev_up] Running non-interactively (--yes flag detected)" | tee -a "$LOG"

# Check if backend port is in use
if ss -ltnp | grep -q ":$PORT"; then
  echo "⚠️ Port $PORT already in use — showing process:" | tee -a "$LOG"
  ss -ltnp | grep ":$PORT" | tee -a "$LOG"
  if [ "$AUTO_YES" = true ]; then
    ANSWER="y"
  else
    read -r -p "Kill this process? (y/N): " ANSWER
  fi
  if [[ "$ANSWER" =~ ^[Yy]$ ]]; then
    PID=$(ss -ltnp | grep ":$PORT" | sed -E 's/.*pid=([0-9]+).*/\1/' | head -n1)
    echo "Killing PID=$PID" | tee -a "$LOG"
    kill -9 "$PID" 2>/dev/null || true
    sleep 2
  else
    echo "Aborted. Exiting." | tee -a "$LOG"
    exit 1
  fi
fi

echo "Starting backend..." | tee -a "$LOG"
nohup env PORT=$PORT npm --prefix backend start > tmp/backend.out 2>&1 &
BACK_PID=$!
sleep 4
if ! curl -s http://localhost:$PORT/ | grep -q "MedPlat"; then
  echo "❌ Backend did not start correctly" | tee -a "$LOG"
  echo "=== tail tmp/backend.out (last 40 lines) ===" | tee -a "$LOG"
  tail -n 40 tmp/backend.out | tee -a "$LOG" || true
  exit 2
fi
echo "✅ Backend running on :$PORT" | tee -a "$LOG"

echo "Starting frontend (VITE_API_BASE=http://localhost:$PORT)..." | tee -a "$LOG"
pkill -f vite || true
nohup env VITE_API_BASE=http://localhost:$PORT npm --prefix frontend run dev > tmp/frontend.out 2>&1 &
FRONT_PID=$!
sleep 5

echo "Running connectivity check..." | tee -a "$LOG"
bash scripts/check_connectivity.sh http://localhost:$PORT | tee -a "$LOG"

echo "✅ Dev environment ready — backend PID=$BACK_PID, frontend PID=$FRONT_PID" | tee -a "$LOG"
echo "Log: $LOG"

exit 0
