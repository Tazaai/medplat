// ~/medplat/backend/routes/dialog_api.mjs
import express from "express";

const router = express.Router();

// A simplified version of the original prompt builder
function buildPrompt({ topic, language }) {
  return `You are a medical expert providing a concise summary for a given topic.

Topic: ${topic}
Language: ${language}

Please provide a brief, clinically relevant summary.
`;
}

async function handleDialog(req, res) {
  try {
    const { openai } = req;
    const { area, topic, language = "en", model = "gpt-4o-mini" } = req.body;

    if (!area || !topic) {
      return res.status(400).json({ ok: false, error: "Missing area/topic" });
    }

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "You are a helpful medical assistant." },
        { role: "user", content: buildPrompt({ topic, language }) },
      ],
      temperature: 0.4,
    });

    const aiReply = completion.choices[0].message.content;

    // The frontend expects a `json` object and a `text` field.
    // We can send the AI reply in both for now.
    res.status(200).json({ ok: true, json: { reply: aiReply }, text: aiReply, aiReply });

  } catch (err) {
    console.error("❌ /api/dialog error:", err);
    res.status(500).json({ ok: false, error: err?.message || "Server error" });
  }
}

router.post("/dialog", handleDialog);

export default router;
