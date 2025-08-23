// ~/medplat/backend/routes/topics_api.mjs
import express from "express";
console.log("🚨 THIS IS THE REAL topics_api.mjs RUNNING");

export default function topicsApi(db) {
  const router = express.Router();

  // ✅ Get topics by area/category (ignore lang)
  router.post("/", async (req, res) => {
    try {
      const area = req.body?.area || req.body?.category || "";
      console.log("🔍 /api/topics POST called with:", { area });

      if (!area) {
        return res.status(400).json({ error: "Missing area/category" });
      }

      // Always query topics2 for clinical specialties (ignore lang)
      const queryRef = db.collection("topics2").where("category", "==", area);
      const snapshot = await queryRef.get();

      if (snapshot.empty) {
        console.warn(`⚠️ No topics found for ${area}`);
        return res.status(200).json({ ok: true, topics: [] });
      }

      const topics = snapshot.docs.map((doc) => doc.data());

      console.log(`✅ Returning ${topics.length} topics for "${area}"`);
      if (topics.length) console.log("💡 First topic:", topics[0]);

      return res.status(200).json({ ok: true, topics });
    } catch (err) {
      console.error("❌ Error in /api/topics:", err);
      return res.status(500).json({ error: "Server error" });
    }
  });

  // ✅ List all distinct categories (ignore lang)
  router.post("/categories", async (req, res) => {
    try {
      console.log("🔍 /api/topics/categories POST called");

      const snapshot = await db.collection("topics2").get();

      if (snapshot.empty) {
        console.warn("⚠️ No categories found");
        return res.status(200).json({ ok: true, categories: [] });
      }

      const categories = [
        ...new Set(snapshot.docs.map((doc) => doc.data().category).filter(Boolean)),
      ];

      console.log(`✅ Returning ${categories.length} categories`);
      return res.status(200).json({ ok: true, categories });
    } catch (err) {
      console.error("❌ Error in /api/topics/categories:", err);
      return res.status(500).json({ error: "Server error" });
    }
  });

  return router;
}
