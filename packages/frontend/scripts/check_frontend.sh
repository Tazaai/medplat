#!/bin/bash
echo "🎨 Checking frontend..."
cd ~/medplat/packages/frontend || exit 1

DRY_RUN=true
[[ "$1" == "--apply" ]] && DRY_RUN=false

if [ ! -f package.json ]; then
  echo "❌ package.json missing"
  exit 1
fi

if ! grep -q '"build"' package.json; then
  echo "➕ Missing build script"
  $DRY_RUN && exit 1
  jq '.scripts.build = "vite build"' package.json > tmp && mv tmp package.json
fi

if [ ! -f index.html ]; then
  echo "❌ index.html missing"
  $DRY_RUN && exit 1
fi

if [ ! -f Dockerfile ]; then
  echo "❌ Missing frontend Dockerfile"
  $DRY_RUN && exit 1
  echo "➕ Creating Dockerfile"
  cat << 'DOCKER' > Dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 80
CMD ["npx", "serve", "dist"]
DOCKER
fi

if grep -q "tailwindcss" postcss.config.js && ! grep -q "@tailwindcss/postcss" postcss.config.js; then
  echo "🔧 Rewriting postcss.config.js to use @tailwindcss/postcss"
  $DRY_RUN || sed -i 's/tailwindcss/@tailwindcss\\/postcss/' postcss.config.js
  $DRY_RUN || npm install -D @tailwindcss/postcss
fi

if ! npm list tailwindcss postcss autoprefixer >/dev/null 2>&1; then
  echo "➕ Installing Tailwind dependencies"
  $DRY_RUN || npm install -D tailwindcss postcss autoprefixer
fi

if ! $DRY_RUN; then
  echo "🩺 Running npm audit fix"
  npm audit fix --force || echo "⚠️ npm audit fix failed"
fi

$DRY_RUN && echo "✅ DRY RUN complete" && exit 0

npm install || exit 1
npm run build || exit 1

# 🔍 Cross-check API usage consistency
echo "🔍 Checking if /api/topics and /api/dialog are used correctly in frontend..."

if ! grep -q "/api/topics" ./src/components/CaseView.jsx; then
  echo "❌ /api/topics not used in CaseView.jsx"
fi

if ! grep -q "/api/dialog" ./src/components/CaseView.jsx; then
  echo "❌ /api/dialog not used in CaseView.jsx"
fi

if ! grep -q "/api/dialog" ./src/components/DialogChat.jsx; then
  echo "⚠️  /api/dialog not referenced in DialogChat.jsx"
fi

echo "✅ API usage check (frontend) complete."


# 🔁 Shared sync checker
source ~/medplat/packages/shared/check_api_sync.sh
check_api_sync
