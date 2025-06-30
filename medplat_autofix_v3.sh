#!/bin/bash

# Step 1: Detect backend and frontend directories
BACKEND_DIR="./backend"
FRONTEND_DIR="./frontend"
API_FILE="$BACKEND_DIR/routes/topics_api.mjs"
INDEX_FILE="$BACKEND_DIR/index.js"

echo "🔍 Checking project structure..."

# Step 2: Validate backend index.js
if [ ! -f "$INDEX_FILE" ]; then
  echo "❌ ERROR: $INDEX_FILE not found."
  exit 1
fi

# Step 3: Ensure topics_api is imported
if ! grep -q "topics_api.mjs" "$INDEX_FILE"; then
  echo "🔧 Inserting topics_api route into index.js..."
  sed -i "/express();/i import topicsApi from './routes/topics_api.mjs';" "$INDEX_FILE"
  sed -i "/app = express();/a app.post('/api/topics', topicsApi(db));" "$INDEX_FILE"
else
  echo "✅ topics_api already present in index.js"
fi

# Step 4: Fix topics_api.mjs CORS + error handling
if [ -f "$API_FILE" ]; then
  echo "🔧 Patching topics_api.mjs for CORS + POST..."
  cat << 'ENDAPI' > "$API_FILE"
export default function (db) {
  return async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { lang, collection = "topics" } = req.body;
    if (!lang || !collection) return res.status(400).json({ topics: [], error: "Missing lang or collection" });

    try {
      const snapshot = await db.collection(collection).where("lang", "==", lang).get();
      const topics = snapshot.docs.map(doc => doc.data());
      res.json({ topics });
    } catch (err) {
      console.error("🔥 Error fetching topics:", err);
      res.status(500).json({ topics: [], error: err.message });
    }
  };
}
ENDAPI
else
  echo "❌ ERROR: $API_FILE not found!"
  exit 1
fi

# Step 5: Rebuild and redeploy backend
echo "🚀 Rebuilding backend..."
gcloud builds submit --tag gcr.io/medplat-458911/medplat-backend "$BACKEND_DIR"

echo "🚀 Deploying backend..."
gcloud run deploy medplat-backend --image gcr.io/medplat-458911/medplat-backend --region europe-west1

echo "✅ Backend fixed and redeployed."
