// ~/medplat/backend/routes/gamify_api.mjs
import express from "express";
import openai from "./openai_client.js";   // ✅ use shared client
import { SYSTEM_APPEND, afterParse } from "./gamify_overrides.mjs";

const router = express.Router();

// ---------- helpers ----------
function extractJsonArray(text = "") {
  const cleaned = String(text).replace(/```json|```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.mcqs)) return parsed.mcqs;
  } catch {}
  const m = cleaned.match(/\[[\s\S]*\]/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

async function chatWithRetry(messages, model, maxRetries = 2) {
  let lastErr;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await openai.chat.completions.create({
        model,
        messages,
        temperature: 0.5,
      });
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

function normalizeItem(item, idx = 0) {
  const section   = String(item.section || item.type || "").trim();
  const prompt    = String(item.prompt || item.stem || item.question || "").trim();
  const paragraph = String(item.paragraph || item.context || "").trim();

  let choices = Array.isArray(item.choices) ? item.choices.slice(0, 3) : [];
  choices = choices.map((c) => {
    if (typeof c === "string") return { text: c, score: 0 };
    if (c && typeof c.text === "string") {
      const s = Number.isFinite(c.score) ? c.score : 0;
      const score = s < 0 ? 0 : s > 3 ? 3 : s;
      return { text: c.text, score };
    }
    return { text: String(c ?? "—"), score: 0 };
  });
  while (choices.length < 3) choices.push({ text: "—", score: 0 });

  let answerIndex;
  if (typeof item.answerIndex === "number") {
    answerIndex = Math.max(0, Math.min(2, item.answerIndex));
  } else if (typeof item.answer === "string") {
    const map = { A: 0, B: 1, C: 2 };
    answerIndex = map[item.answer.trim().toUpperCase()] ?? 0;
  } else {
    const maxIdx = choices.reduce((m, c, i) => (c.score > choices[m].score ? i : m), 0);
    answerIndex = maxIdx;
  }

  choices = choices.map((c, i) => {
    if (i === answerIndex) return { text: c.text, score: 3 };
    const s = Number.isFinite(c.score) ? c.score : 0;
    const partial = s >= 1 && s <= 2 ? s : 0;
    return { text: c.text, score: partial };
  });

  const rationalePanel = Array.isArray(item.rationalePanel) ? item.rationalePanel.slice(0, 3) : [];
  const references    = Array.isArray(item.references) ? item.references.slice(0, 5) : [];

  return { id: item.id || `q${idx+1}`, index: idx, section, prompt, paragraph, choices, answerIndex, rationalePanel, references };
}

// ---------- ROUTE (kept at /api/gamify to match frontend) ----------
router.post("/", async (req, res) => {
  try {
    const {
      text = "",
      language = "en",
      caseId = "unknown_case",
      model = "gpt-4o-mini",
      userId = "anonymous",
      locale = "DK",
      request = {},
    } = req.body || {};

    if (!String(text).trim()) {
      return res.status(400).json({ error: "BadRequest", detail: "text is required" });
    }

    const targetCount = Math.max(1, Math.min(12, Number(request.targetCount) || 12));
    const askCount = Math.min(16, Math.max(targetCount + 2, 14));

    const shortHistory = (() => {
      const lines = String(text).split(/\n+/).map(s => s.trim()).filter(Boolean);
      const hit = lines.find(l => /history|presentation|complaint/i.test(l)) || lines.slice(0, 2).join(" ");
      return hit.slice(0, 600);
    })();

    const system = [{
      role: "system",
      content:
`You generate clinically accurate, education-focused MCQs for a case-based quiz engine.
Audience: advanced medical student / junior doctor.
Output: ONLY a JSON array of items (no markdown).
Each item must be a JSON object with:
- "section": category (history_and_red_flags, risk_factors, pathophysiology, diagnosis, management, prognosis, complications, ethics, systems, disaster, psych)
- "paragraph": 6–12 words copied or tightly paraphrased from case text
- "prompt": a single focused question
- "choices": exactly 3 options with {text, score}
- "answerIndex": 0|1|2
- "rationalePanel": array of 1–3 expert notes
- "references": array of 1–3 short references

Rules:
- Exactly 3 choices; one best answer (score=3); 0–2 partials (score=1–2); rest=0
- Explanations saved for END-QUIZ review (not mid-quiz)
- First 3 Qs must NOT be diagnosis/management
- Stay on-topic for: ${caseId}
- Language: ${language}
${SYSTEM_APPEND}`
    }];

    const user = [{
      role: "user",
      content:
`CASE_ID: ${caseId}
REGION/LOCALE: ${locale}
CASE TEXT:
${text}

TASK:
- Generate ${askCount} MCQs following schema strictly.
- Balance sections across case (history/risk first, diagnosis/management later).
- Use concise paragraph context from case text (no invention).
- Return ONLY the JSON array (no backticks).`
    }];

    const r = await chatWithRetry([...system, ...user], model, 2);
    const raw = r?.choices?.[0]?.message?.content || "";
    let list = extractJsonArray(raw);
    if (!Array.isArray(list)) {
      return res.status(502).json({ error: "ParseError", detail: "Model did not return a valid JSON array." });
    }

    list = afterParse(list, { text });

    list = list.map((q, i) => normalizeItem(q, i))
               .filter(q => q.prompt && q.choices?.length === 3 && [0,1,2].includes(q.answerIndex));

    if (list.length > targetCount) list = list.slice(0, targetCount);

    res.json({
      shortHistory,
      mcqs: list,
      count: list.length,
      meta: { userId, caseId, model, language, locale }
    });
  } catch (err) {
    console.error("gamify_api error:", err);
    res.status(500).json({ error: "ServerError", detail: String(err?.message || err) });
  }
});

export default router;
