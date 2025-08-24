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
      customSearch,            // ✅ optional custom text
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

    // 🌍 Auto-detect location if not explicitly provided
    let finalLocation = userLocation;
    try {
      if (!finalLocation) {
        const forwardedFor = req.headers["x-forwarded-for"];
        const ip =
          (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) ||
          req.ip ||
          null;

        // For now, we just attach the IP; a geolocation service could be plugged in later
        if (ip) {
          finalLocation = `ip:${ip}`;
        } else {
          finalLocation = "unspecified";
        }
      }
    } catch (e) {
      console.warn("⚠️ Failed to auto-detect location:", e.message);
      finalLocation = "unspecified";
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
        userLocation: finalLocation,
        caseIdFromFirebase
      });

      // ✅ cleanup: remove Difficulty_Level if present
      if (result?.json && "Difficulty_Level" in result.json) {
        delete result.json.Difficulty_Level;
      }

      // ✅ inject source marker
      if (result?.json) {
        result.json.meta = {
          ...(result.json.meta || {}),
          source: customSearch ? "customSearch" : "dropdown",
          detectedLocation: finalLocation
        };
      }

      return res.status(200).json({
        ok: true,
        aiReply: result,
        case_id: result?.meta?.case_id || caseIdFromFirebase,
        instance_id: result?.meta?.instance_id || null,
        usedCustomSearch: !!customSearch,
        userLocation: finalLocation
      });
    } catch (err) {
      console.error("❌ Error in /api/dialog:", err);
      return res.status(500).json({ error: "Server error" });
    }
  });

  return router;
}
