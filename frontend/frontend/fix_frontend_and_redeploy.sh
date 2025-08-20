#!/bin/bash
set -e

FRONTEND_DIR=~/medplat/frontend/frontend

echo "🔧 Replacing all 'GET /api/topics' fetch calls with 'POST'..."

grep -rl "fetch.*GET.*\/api\/topics" "$FRONTEND_DIR" | while read -r file; do
  sed -i 's/fetch(\(.*\/api\/topics[^)]*\))/fetch(\1, { method: "POST" })/' "$file"
  echo "  ✔ Patched $file"
done

echo "🔧 Patching package.json to use Vite preview with Cloud Run PORT..."

sudo apt-get install -y jq moreutils > /dev/null 2>&1
cd "$FRONTEND_DIR"
jq '.scripts.start="vite preview --port $PORT --host"' package.json | sponge package.json

echo "🔧 Overwriting vite.config.js with Cloud Run compatible preview..."

cat <<EOF > "$FRONTEND_DIR/vite.config.js"
export default {
  preview: {
    host: true,
    port: parseInt(process.env.PORT) || 8080,
    allowedHosts: ['.run.app']
  }
}
EOF

echo "🔁 Rebuilding and deploying to Cloud Run..."
gcloud builds submit --tag gcr.io/medplat-458911/medplat-frontend "$FRONTEND_DIR"
gcloud run deploy medplat-frontend \
  --image gcr.io/medplat-458911/medplat-frontend \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated

echo "✅ Deployment complete. Check your frontend at:"
echo "   https://$(gcloud run services describe medplat-frontend --region europe-west1 --format='value(status.url)')"
