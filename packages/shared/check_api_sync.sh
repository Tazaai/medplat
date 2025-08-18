#!/bin/bash
check_api_sync() {
  echo "🔗 Checking backend–frontend API integration..."

  BACKEND_ROUTES=$(grep -E 'app\\.(get|post|route)' ~/medplat/packages/backend/index.js | grep -oE '/api/[^"\\)]*')
  FRONTEND_CALLS=$(grep -rhoE 'fetch\\(["'\\']?/api/[^"'\\']+' ~/medplat/packages/frontend/src | sed 's/fetch(//g' | tr -d '"'"'" | sort | uniq)

  echo "🔍 Backend routes:"
  echo "$BACKEND_ROUTES"
  echo "🔍 Frontend API calls:"
  echo "$FRONTEND_CALLS"

  MISSING_ROUTES=()
  while read -r route; do
    if ! grep -q "$route" <<< "$BACKEND_ROUTES"; then
      MISSING_ROUTES+=("$route")
    fi
  done <<< "$FRONTEND_CALLS"

  if [ ${#MISSING_ROUTES[@]} -gt 0 ]; then
    echo "❌ Missing backend routes for these frontend calls:"
    for r in "${MISSING_ROUTES[@]}"; do echo "   - $r"; done
  else
    echo "✅ All frontend API calls have matching backend routes"
  fi
}
