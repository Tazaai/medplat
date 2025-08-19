#!/bin/bash

# Repair CORS + routing + topics_api

echo "🔧 Fixing topics_api route..."

ROUTE_FILE="./backend/index.js"

if grep -q "topics_api" "$ROUTE_FILE"; then
  echo "✅ topics_api already imported in index.js"
else
  sed -i "/express();/a\\import topicsApi from './routes/topics_api.mjs';" $ROUTE_FILE
  sed -i "/app.use(express.json());/a\\app.use('/api/topics', topicsApi(db));" $ROUTE_FILE
  echo "✅ topics_api route added to index.js"
fi

echo "🔧 Patching topics_api.mjs for proper CORS and POST..."

TOPICS_API="./backend/routes/topics_api.mjs"

cat << 'TOPICS_EOF' > $TOPICS_API
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
TOPICS_EOF

echo "✅ Done patching. Now redeploy backend to apply changes."
