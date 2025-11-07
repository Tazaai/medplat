import express from "express";
import OpenAI from "openai";
const router = express.Router();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/", async (req, res) => {
  try {
    const { topic, language = "en", region = "EU/DK", caseData } = req.body;
    const prompt = `You are an EXTERNAL EXPERT PANEL for development (not the internal 12+ expert panel used inside the case generator).
Your role is to critically review the generated case provided below.

Panel Composition:
- 1 Medical Student
- 1 Medical Doctor
- 1 AI Education, Medical and Coding Expert
- 3 Specialist Doctors (different areas)
- 2 Generalists (GP)
- 2 Emergency Medicine Specialists
- 1 Field Researcher
- 1 University Professor of Medicine
- 1 USMLE Expert
- 1 Web Developer (system realism & structure)
- 1 Competitor Voice

Review Task:
- Critically evaluate the generated case
- Each panel member must give their feedback under their own role
- Feedback should be ADVANCED, DIFFICULT, and constructive (not beginner level)
- Focus on GLOBAL improvements to the case generator system, not just this single topic
- Ensure feedback applies across ALL specialties and case categories
- DO NOT suggest hardcoding or static solutions — only DYNAMIC, SCALABLE improvements
- Highlight missing elements:
  * Rescue therapies (e.g., auto-injectors for seizures, naloxone for opioid overdose)
  * Guideline adherence (regional variations: EU/DK vs US vs WHO)
  * Red flags and atypical presentations
  * Multidisciplinary management
  * Resource-limited adaptations
  * Test kinetics and timing
  * Hemodynamic profiling
  * Disposition and social needs
- Identify gaps in evidence, structure, and realism
- The competitor voice should suggest where other platforms might outperform this one

Output Format:
- Use clear headings per role (e.g., "**Medical Student:**", "**Cardiologist:**")
- End with a **Global Consensus** section summarizing how the generator should improve across ALL specialties
- Return as structured markdown or JSON

Topic: ${topic}
Language: ${language}
Region: ${region}
`;
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are the MedPlat external expert panel coordinator. Provide critical, advanced, multi-perspective review." },
        { role: "user", content: prompt },
        { role: "user", content: `Case data:\n${JSON.stringify(caseData).slice(0, 8000)}` }
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
