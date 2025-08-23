// ~/medplat/backend/routes/dialog_api.mjs
import express from "express";
import generateCase from "../generate_case_clinical.mjs";
import admin from "../firebase.js";

console.log("✅ dialog_api.mjs LOADED");

export default function dialogApi(db) {
  const router = express.Router();

  router.post("/", async (req, res) => {
    console.log("🎯 POST /api/dialog RECEIVED");

    const {
      area,
      topic,
      customSearch,            // ✅ NEW field
      language,
      model = "gpt-4o-mini",
      region = "global",
      userLocation = null
    } = req.body;

    // ✅ force default language
    const finalLang = (typeof language === "string" && language.trim()) || "en";

    // ✅ prefer customSearch if provided
    const finalTopic = (customSearch && customSearch.trim()) || topic;

    if (typeof area !== "string" || typeof finalTopic !== "string" || !area || !finalTopic) {
      return res.status(400).json({ error: "Missing or invalid area/topic/customSearch" });
    }

    try {
      let caseIdFromFirebase = null;
      if (admin.apps.length) {
        try {
          const fdb = admin.firestore();
          const collections = ["topics2", "topics"];
          for (const col of collections) {
            const snap = await fdb
              .collection(col)
              .where("topic", "==", finalTopic)
              .limit(1)
              .get();
            if (!snap.empty) {
              caseIdFromFirebase = snap.docs[0].id;
              break;
            }
          }
        } catch (e) {
          console.warn("⚠️ Firebase lookup failed:", e.message);
        }
      }

      const result = await generateCase({
        area,
        topic: finalTopic,   // ✅ always send the chosen topic
        language: finalLang,
        model,
        region,
        userLocation,
        caseIdFromFirebase
      });

      // ✅ inject source marker
      if (result?.json) {
        result.json.meta = {
          ...(result.json.meta || {}),
          source: customSearch ? "customSearch" : "dropdown"
        };
      }

      return res.status(200).json({
        ok: true,
        aiReply: result,
        case_id: result?.meta?.case_id || caseIdFromFirebase,
        instance_id: result?.meta?.instance_id || null,
        usedCustomSearch: !!customSearch
      });
    } catch (err) {
      console.error("❌ Error in /api/dialog:", err);
      return res.status(500).json({ error: "Server error" });
    }
  });

  return router;
}
