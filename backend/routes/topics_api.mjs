// ~/medplat/backend/routes/topics_api.mjs
import express from "express";
console.log("🚨 THIS IS THE REAL topics_api.mjs RUNNING");

export default function topicsApi(db) {
  const router = express.Router();

  router.post("/", async (req, res) => {
    try {
      const area = req.body?.area || "";
      const collectionOverride = req.body?.collection;

      console.log("🔍 /api/topics POST called with:", { area, collectionOverride });

      // 🧠 Decide which Firestore collection to query
      let collectionName = "";

      if (collectionOverride) {
        collectionName = collectionOverride;
      } else if (area === "Medical Fields") {
        collectionName = "topics2";
      } else if (area === "ECG") {
        collectionName = "ecg";
      } else if (area === "ABG") {
        collectionName = "abg";
      } else if (area === "USMLE Step 1") {
        collectionName = "usmle1";
      } else {
        return res.status(400).json({ error: "Missing or invalid area/collection" });
      }

      console.log("📂 Fetching from collection:", collectionName);
      const topicsRef = db.collection(collectionName);
      const snapshot = await topicsRef.get();

      if (snapshot.empty) {
        return res.status(404).json({ error: `No topics found in ${collectionName}` });
      }

      const topics = snapshot.docs
        .map(doc => {
          const data = doc.data();

          if (typeof data !== "object" || data === null || Array.isArray(data)) {
            console.warn("❌ Skipping malformed doc:", doc.id, data);
            return null;
          }

          if (typeof data.next === "string" && data.next.trim() === "") {
            delete data.next;
          }

          return data;
        })
        .filter(Boolean);

      console.log(`✅ Fetched ${topics.length} topics from "${collectionName}"`);
      if (topics.length) console.log("💡 First topic:", topics[0]);

      return res.status(200).json({ topics });
    } catch (err) {
      console.error("❌ Error in /api/topics:", err);
      return res.status(500).json({ error: "Server error" });
    }
  });

  return router;
}
