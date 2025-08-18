import express from "express";
import generateCase from "../generate_case_openai.mjs";

export default function (db) {
  const router = express.Router();

  router.post("/", async (req, res) => {
    try {
      const { topic, niveau, lang } = req.body;

      if (!topic) {
        return res.status(400).json({ error: "Missing topic" });
      }

      const result = await generateCase(topic, niveau || "simpel", lang || "da");
      res.setHeader("Content-Type", "application/json");
      res.send(result);
    } catch (err) {
      console.error("❌ Error generating case:", err);
      res.status(500).json({ error: "Failed to generate case" });
    }
  });

  return router;
}
