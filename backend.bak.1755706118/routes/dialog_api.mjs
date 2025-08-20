// ~/medplat/backend/routes/dialog_api.mjs
import express from "express";
import generateCase from "../generate_case_clinical.mjs";

console.log("✅ dialog_api.mjs LOADED");

export default function dialogApi(db) {
  const router = express.Router();

  router.post("/", async (req, res) => {
    console.log("🎯 POST /api/dialog RECEIVED");

    const {
      area,
      topic,
      language = "English",
      model = "gpt-4o-mini"
    } = req.body;

    if (typeof area !== "string" || typeof topic !== "string" || !area || !topic) {
      return res.status(400).json({ error: "Missing or invalid area/topic" });
    }

    try {
      const result = await generateCase({ area, topic, language, model });

      const replyText =
        typeof result === "string" ? result : JSON.stringify(result, null, 2);

      return res.status(200).json({ aiReply: replyText });
    } catch (err) {
      console.error("❌ Error in /api/dialog:", err);
      return res.status(500).json({ error: "Server error" });
    }
  });

  return router;
}
