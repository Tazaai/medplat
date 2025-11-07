import express from "express";
import OpenAI from "openai";
const router = express.Router();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/", async (req, res) => {
  try {
    const { topic, language = "en", region = "EU/DK", caseData } = req.body;
    const prompt = `
You are an EXTERNAL EXPERT PANEL reviewing the generated MedPlat case.

Panel Composition:
- 1 Medical Student, 1 Medical Doctor
- 3 Specialists (different fields)
- 2 Generalists
- 2 Emergency Medicine Specialists
- 1 Field Researcher
- 1 University Professor of Medicine
- 1 USMLE Expert
- 1 AI Education & Coding Expert
- 1 Web Developer (system realism & structure)
- 1 Competitor Voice

Review Task:
- Critically evaluate the case on realism, completeness, structure, and scalability.
- Feedback must apply to ALL specialties, not just ${topic}.
- Highlight missing rescue therapies, red flags, multidisciplinary management, regional guideline differences, and realism.
- Do NOT suggest static or hardcoded fixes—only dynamic, scalable logic improvements.
- End with a "Global Consensus" summarizing improvements across the generator system.

Format your output as structured JSON with keys for each role and a "Global Consensus".
`;
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are the MedPlat external expert panel coordinator." },
        { role: "user", content: prompt },
        { role: "user", content: `Case data:\n${JSON.stringify(caseData).slice(0, 6000)}` }
      ],
      temperature: 0.7,
    });
    const output = completion.choices[0]?.message?.content || "";
    res.json({ ok: true, review: output });
  } catch (err) {
    console.error("Expert panel error:", err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});
export default router;
