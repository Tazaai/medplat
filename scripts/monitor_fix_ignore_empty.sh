#!/usr/bin/env bash
set -euo pipefail
# Low-risk helper to clean up empty/non-numeric run IDs that make the monitor spam logs.
# It writes a cleaned seen_runs file and seeds it with any numeric deploy-run logs already present.

OUTDIR="/workspaces/medplat/tmp"
SEEN="$OUTDIR/seen_runs.txt"
BACKUP="$OUTDIR/seen_runs.bak.$(date +%s)"
CLEAN="$OUTDIR/seen_runs.clean.txt"

mkdir -p "$OUTDIR"
touch "$SEEN"
cp -a "$SEEN" "$BACKUP" || true

echo "Cleaning seen runs file: $SEEN -> $CLEAN"
# keep only lines that are pure digits
grep -E '^[0-9]+$' "$SEEN" | sort -u > "$CLEAN" || true

echo "Seeding from existing deploy-run-*.log files (if any)"
for f in "$OUTDIR"/deploy-run-*.log; do
  [ -e "$f" ] || continue
  # filename pattern /.../deploy-run-<id>.log
  base=$(basename "$f")
  id=$(echo "$base" | sed -E 's/^deploy-run-([0-9]+)\.log$/\1/')
  if [[ "$id" =~ ^[0-9]+$ ]]; then
    echo "$id" >> "$CLEAN"
  fi
done

# dedupe and sort
sort -n -u "$CLEAN" -o "$CLEAN" || true
mv "$CLEAN" "$SEEN"

echo "Cleaned seen runs written to: $SEEN"
echo "Backup of previous seen runs: $BACKUP"

echo "Summary (first 50 lines):"
sed -n '1,50p' "$SEEN" || true

echo "If a monitor process is running and still printing empty run IDs, consider restarting it after ensuring this cleaned file is in place."

exit 0
