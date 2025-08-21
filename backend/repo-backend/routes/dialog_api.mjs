// ~/medplat/backend/routes/dialog_api.mjs
import express from "express";
import generateCase from "../generate_case_clinical.mjs";
import admin from "../firebase.js"; // ✅ Firebase for case_id lookup

console.log("✅ dialog_api.mjs LOADED");

export default function dialogApi(db) {
  const router = express.Router();

  router.post("/", async (req, res) => {
    console.log("🎯 POST /api/dialog RECEIVED");

    const {
      area,
      topic,
      language = "English",
      niveau = "kompleks",
      model = "gpt-4o-mini",
      region = "global"   // 🌍 default global if none provided
    } = req.body;

    if (typeof area !== "string" || typeof topic !== "string" || !area || !topic) {
      return res.status(400).json({ error: "Missing or invalid area/topic" });
    }

    try {
      // 🔹 Lookup case_id from Firebase (topics2 or topics)
      let caseIdFromFirebase = null;
      if (admin.apps.length) {
        try {
          const fdb = admin.firestore();
          const collections = ["topics2", "topics"];
          for (const col of collections) {
            const snap = await fdb.collection(col).where("topic", "==", topic).limit(1).get();
            if (!snap.empty) {
              caseIdFromFirebase = snap.docs[0].id; // use Firestore doc ID
              break;
            }
          }
        } catch (e) {
          console.warn("⚠️ Firebase lookup failed:", e.message);
        }
      }

      // 🔹 Generate case
      const result = await generateCase({
        area,
        topic,
        language,
        model,
        region,
        caseIdFromFirebase
      });

      // ✅ Ensure JSON reply
      return res.status(200).json({
        ok: true,
        aiReply: result,
        case_id: result?.meta?.case_id || caseIdFromFirebase,
        instance_id: result?.meta?.instance_id || null
      });
    } catch (err) {
      console.error("❌ Error in /api/dialog:", err);
      return res.status(500).json({ error: "Server error" });
    }
  });

  return router;
}
