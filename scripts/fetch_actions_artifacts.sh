#!/usr/bin/env bash
# Fetch artifacts for recent workflow runs and save under tmp/actions-artifacts/<run-id>/
set -euo pipefail

mkdir -p tmp/actions-artifacts

# Get recent runs (limit 50) as JSON and extract run ids and urls
runs_json=$(gh run list --repo Tazaai/medplat --limit 50 --json databaseId,conclusion,url || true)
if [ -z "$runs_json" ]; then
  echo "No runs found or gh not authenticated"
  exit 0
fi

echo "$runs_json" | jq -c '.[]' | while read -r run; do
  id=$(echo "$run" | jq -r '.databaseId')
  conclusion=$(echo "$run" | jq -r '.conclusion')
  url=$(echo "$run" | jq -r '.url')
  dir="tmp/actions-artifacts/$id"
  if [ -d "$dir" ]; then
    echo "Run $id already fetched -> $dir"
    continue
  fi
  mkdir -p "$dir"
  echo "Fetching run $id (conclusion=$conclusion) -> $dir"
  # try to download artifacts (may be none)
  if gh run download "$id" --repo Tazaai/medplat --dir "$dir" --name "frontend-dist" >/dev/null 2>&1; then
    echo "Downloaded frontend-dist for run $id"
  else
    echo "No frontend-dist artifact for run $id or download failed"
  fi
  # try downloading all artifacts
  if gh run download "$id" --repo Tazaai/medplat --dir "$dir" >/dev/null 2>&1; then
    echo "Downloaded artifacts for run $id"
  else
    echo "No artifacts or download failed for run $id"
  fi
  # fetch basic run logs (if available)
  if gh run view "$id" --repo Tazaai/medplat --log >/dev/null 2>&1; then
    gh run view "$id" --repo Tazaai/medplat --log > "$dir/run-${id}.log" || true
    echo "Saved run log for $id"
  else
    echo "No run log available for $id"
  fi
  # write run metadata
  echo "$run" > "$dir/metadata.json"
done

echo "Fetch complete. Artifacts saved under tmp/actions-artifacts/"
