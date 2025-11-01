#!/usr/bin/env bash
set -euo pipefail
# Stop processes started by start_local_dev.sh
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

for pidfile in tmp/*.pid; do
  [ -e "$pidfile" ] || continue
  pid=$(cat "$pidfile")
  if kill -0 "$pid" >/dev/null 2>&1; then
    echo "Killing $pid (from $pidfile)"
    kill "$pid" || true
    sleep 0.2
    if kill -0 "$pid" >/dev/null 2>&1; then
      echo "Force killing $pid"
      kill -9 "$pid" || true
    fi
  else
    echo "No running process for pidfile $pidfile"
  fi
  rm -f "$pidfile"
done

echo "Stopped local dev processes. Logs remain in tmp/*.log"
