import express from "express";
import { getOpenAI } from "./openai_client.js";

const router = express.Router();

// POST /api/gamify -> { ok:true, mcqs:[...] }  (placeholder response shape)
router.post("/", async (req, res) => {
  try {
    const { caseText, language = "en", model = "gpt-4o-mini" } = req.body || {};
    if (!caseText) return res.status(400).json({ ok: false, error: "caseText_required" });

    const openai = await getOpenAI();

    const prompt = `Create 5 high-quality MCQs based on the case text. Return JSON with mcqs[]. Each MCQ has question, options[4], correctIndex, explanation. Language: ${language}. Case:\n${caseText}`;

    const r = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "You are a clinical educator." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    });

    const raw = r?.choices?.[0]?.message?.content?.trim() || "";
    let json = null;
    try { json = JSON.parse(raw); } catch { json = null; }

    res.json({ ok: true, json, aiReply: { text: raw }, text: raw });
  } catch (e) {
    console.error("gamify error:", e);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

export default router;