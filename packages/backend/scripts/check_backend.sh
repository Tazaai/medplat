#!/bin/bash
echo "🩺 Checking backend..."
cd ~/medplat/packages/backend || exit 1

DRY_RUN=true
[[ "$1" == "--apply" ]] && DRY_RUN=false

# Check required files
for f in index.js package.json Dockerfile; do
  if [ ! -f "$f" ]; then
    echo "❌ $f missing"
    $DRY_RUN && exit 1
  fi
done

# Ensure proper port handling in index.js
if ! grep -q 'process.env.PORT || 8080' index.js; then
  echo "🛠️ Adding fallback port 8080 to index.js"
  $DRY_RUN || sed -i 's/process.env.PORT/process.env.PORT || 8080/' index.js
fi

# Ensure CORS is used
if ! grep -q 'cors' index.js; then
  echo "➕ Adding CORS support"
  $DRY_RUN || sed -i '1iimport cors from "cors";' index.js
  $DRY_RUN || sed -i '/express.json()/a app.use(cors());' index.js
fi

# Ensure /api/topics route mounted with GET and POST
if ! grep -q 'app.route("/api/topics")' index.js; then
  echo "🧩 Mounting /api/topics route"
  $DRY_RUN || sed -i '/app.use(express.json())/a \
app.route("/api/topics")\n\
  .get(topicsApi(db))\n\
  .post(topicsApi(db));' index.js
fi

# Check Dockerfile port
if ! grep -q 'EXPOSE 8080' Dockerfile; then
  echo "🚪 Fixing EXPOSE in Dockerfile"
  $DRY_RUN || sed -i 's/EXPOSE .*/EXPOSE 8080/' Dockerfile
fi

# Check and add default build script if missing
if ! grep -q '"start"' package.json; then
  echo "➕ Adding start script"
  $DRY_RUN || jq '.scripts.start = "node index.js"' package.json > tmp && mv tmp package.json
fi

$DRY_RUN && echo "✅ DRY RUN complete" && exit 0

npm install || exit 1
npm start || echo "🚫 Backend start failed. Please check logs."
