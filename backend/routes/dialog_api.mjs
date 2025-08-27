// ~/medplat/backend/routes/dialog_api.mjs
import express from "express";
import generateCase from "../generate_case_clinical.mjs";
import admin from "../firebase.js";

console.log("✅ dialog_api.mjs LOADED");

export default function dialogApi() {
  const router = express.Router();

  // 🌍 New location proxy (avoid CORS issues from frontend)
  router.get("/location", async (_req, res) => {
    try {
      const response = await fetch("https://ipapi.co/json/");
      if (!response.ok) throw new Error("Failed to fetch from ipapi.co");
      const data = await response.json();
      return res.json(data);
    } catch (err) {
      console.error("❌ Location fetch failed:", err.message);
      return res.json({ country_name: "unspecified" });
    }
  });

  // 🧠 Main dialog endpoint
  router.post("/", async (req, res) => {
    console.log("🎯 POST /api/dialog RECEIVED");

    const {
      area,
      topic,
      customSearch, // optional custom text
      language,
      model = "gpt-4o-mini",
      region = "global",
      userLocation = null,
    } = req.body;

    // ✅ force default language
    const finalLang =
      (typeof language === "string" && language.trim()) || "en";

    // ✅ prefer customSearch if provided
    const finalTopic = (customSearch && customSearch.trim()) || topic;

    if (
      typeof area !== "string" ||
      typeof finalTopic !== "string" ||
      !area ||
      !finalTopic
    ) {
      return res
        .status(400)
        .json({ error: "Missing or invalid area/topic/customSearch" });
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
      // 🔎 Look up caseId from Firebase (topics2 → topics)
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

      // 🧠 Generate case
      const result = await generateCase({
        area,
        topic: finalTopic,
        customSearch,
        language: finalLang,
        model,
        region,
        userLocation: finalLocation,
        caseIdFromFirebase,
      });

      // ✅ cleanup: remove Difficulty_Level if present
      if (result?.json && "Difficulty_Level" in result.json) {
        delete result.json.Difficulty_Level;
      }

      // ✅ inject metadata marker
      if (result?.json) {
        result.json.meta = {
          ...(result.json.meta || {}),
          source: customSearch ? "customSearch" : "dropdown",
          detectedLocation: finalLocation,
        };
      }

      return res.status(200).json({
        ok: true,
        aiReply: result,
        case_id: result?.meta?.case_id || caseIdFromFirebase,
        instance_id: result?.meta?.instance_id || null,
        usedCustomSearch: !!customSearch,
        userLocation: finalLocation,
      });
    } catch (err) {
      console.error("❌ Error in /api/dialog:", err);
      return res.status(500).json({ error: "Server error" });
    }
  });

  return router;
}
