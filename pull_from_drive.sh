#!/usr/bin/env bash
set -euo pipefail
REMOTE="medplat_drive:medplat_src"
LOCAL="$HOME/medplat"
FILTER="$LOCAL/.rclonefilter"
mkdir -p "$LOCAL/backend" "$LOCAL/frontend"
echo "→ Pulling backend (Drive → VM)"
rclone copy "$REMOTE/backend"  "$LOCAL/backend"  --filter-from "$FILTER" --create-empty-src-dirs --progress
echo "→ Pulling frontend (Drive → VM)"
rclone copy "$REMOTE/frontend" "$LOCAL/frontend" --filter-from "$FILTER" --create-empty-src-dirs --progress
echo "✅ Done. Drive was not modified."
