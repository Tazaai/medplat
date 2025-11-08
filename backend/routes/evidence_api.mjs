import express from "express";
import OpenAI from "openai";

const router = express.Router();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Evidence Comparison API - Test performance data
 * POST /api/evidence
 * Returns sensitivity/specificity comparisons for diagnostic tests
 */
router.post("/", async (req, res) => {
  const { condition, tests, context } = req.body;

  if (!condition) {
    return res.status(400).json({ ok: false, error: "Missing condition parameter" });
  }

  try {
    const testsString = Array.isArray(tests) ? tests.join(", ") : tests || "common diagnostic tests";
    
    const prompt = `Provide evidence-based test performance comparison for: "${condition}"

Context: ${context || "General diagnostic workup"}
Tests to compare: ${testsString}

Requirements:
- Include 3-5 relevant diagnostic tests (imaging, labs, clinical tests)
- Provide sensitivity and specificity (% values)
- Add brief interpretation notes
- Include 1-2 guideline references
- Focus on clinical utility

Format:
{
  "condition": "${condition}",
  "tests": [
    {
      "name": "Test name (e.g., CT Chest, D-dimer, ECG)",
      "sensitivity": "85-95%",
      "specificity": "70-80%",
      "notes": "Brief clinical interpretation",
      "timing": "When to use (acute vs chronic, first-line vs confirmatory)"
    }
  ],
  "guidelines": [
    {
      "society": "Organization name",
      "year": "2023",
      "recommendation": "Key recommendation"
    }
  ],
  "clinical_pearls": "2-3 sentences on test selection strategy"
}

Return ONLY valid JSON.`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a medical evidence synthesis assistant providing accurate test performance data. Return only valid JSON." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 800
    });

    const evidence = JSON.parse(completion.choices[0].message.content);

    res.json({
      ok: true,
      condition,
      evidence
    });

  } catch (error) {
    console.error("❌ Evidence API error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to generate evidence comparison",
      fallback: {
        condition,
        tests: [],
        guidelines: [],
        clinical_pearls: "Consult evidence-based guidelines for test selection"
      }
    });
  }
});

export default router;
