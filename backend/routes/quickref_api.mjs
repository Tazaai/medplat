import express from "express";
import OpenAI from "openai";

export default function quickrefApi() {
  const router = express.Router();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  /**
   * Quick Reference API - Tooltip definitions for medical terms
   * GET/POST /api/quickref?term=<term>
   * Returns 3-line summary + 1 citation for hover tooltips
   */
  router.get("/", async (req, res) => {
  const term = req.query.term || req.body?.term;
  
  if (!term) {
    return res.status(400).json({ ok: false, error: "Missing term parameter" });
  }

  try {
    const prompt = `Provide a concise medical reference for: "${term}"

Requirements:
- 3 lines maximum (definition, key features, clinical significance)
- 1 authoritative citation (guideline or major reference)
- Professional medical tone
- Suitable for tooltip display

Format:
{
  "term": "${term}",
  "definition": "Brief 1-sentence definition",
  "key_features": "2-3 key clinical features or findings",
  "clinical_significance": "Why it matters clinically",
  "citation": "Source (e.g., ESC Guidelines 2023, UpToDate 2024)"
}

Return ONLY valid JSON.`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a medical reference assistant providing concise, accurate definitions for clinical tooltips. Return only valid JSON." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Low temperature for factual accuracy
      max_tokens: 300
    });

    const reference = JSON.parse(completion.choices[0].message.content);

    res.json({
      ok: true,
      term,
      reference
    });

  } catch (error) {
    console.error("❌ Quickref error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to generate reference",
      fallback: {
        term,
        definition: `${term} - medical term (reference unavailable)`,
        key_features: "See standard medical reference",
        clinical_significance: "Consult clinical guidelines",
        citation: "N/A"
      }
    });
  }
});

// Support POST as well
router.post("/", async (req, res) => {
  req.query.term = req.body?.term || req.query.term;
  const term = req.query.term;
  
  if (!term) {
    return res.status(400).json({ ok: false, error: "Missing term parameter" });
  }

  try {
    const prompt = `Provide a concise medical reference for: "${term}"

Requirements:
- 3 lines maximum (definition, key features, clinical significance)
- 1 authoritative citation (guideline or major reference)
- Professional medical tone
- Suitable for tooltip display

Format:
{
  "term": "${term}",
  "definition": "Brief 1-sentence definition",
  "key_features": "2-3 key clinical features or findings",
  "clinical_significance": "Why it matters clinically",
  "citation": "Source (e.g., ESC Guidelines 2023, UpToDate 2024)"
}

Return ONLY valid JSON.`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a medical reference assistant providing concise, accurate definitions for clinical tooltips. Return only valid JSON." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 300
    });

    const reference = JSON.parse(completion.choices[0].message.content);

    res.json({
      ok: true,
      term,
      reference
    });

  } catch (error) {
    console.error("❌ Quickref error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to generate reference",
      fallback: {
        term,
        definition: `${term} - medical term (reference unavailable)`,
        key_features: "See standard medical reference",
        clinical_significance: "Consult clinical guidelines",
        citation: "N/A"
      }
    });
  }
});

  return router;
}
