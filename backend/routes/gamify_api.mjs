// ~/medplat/backend/routes/gamify_api.mjs
import express from 'express';
import OpenAI from 'openai';

export default function gamifyApi() {
  const router = express.Router();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // POST /api/gamify - generate 12 adaptive MCQs for a clinical case
  router.post('/', async (req, res) => {
    try {
      const { text, caseId = 'unknown', index = 0 } = req.body || {};
      
      if (!text) {
        return res.status(400).json({ ok: false, error: 'Missing case text' });
      }

      // Parse case data
      let caseData = {};
      try {
        caseData = typeof text === 'string' ? JSON.parse(text) : text;
      } catch {
        caseData = { text };
      }

      // Build comprehensive system prompt for 12-question adaptive quiz
      const systemPrompt = `You are a medical education expert creating an adaptive clinical quiz.

Generate exactly 12 multiple-choice questions (MCQs) for this clinical case. Follow these rules:

PROGRESSION (critical for adaptive learning):
- Questions 1-3: EARLY STEPS - history taking, initial exam findings, basic vitals
  * DO NOT ask about diagnosis, treatment, or advanced reasoning yet
  * Focus on: chief complaint details, timeline, risk factors, physical exam priorities
- Questions 4-7: INTERMEDIATE - deeper exam, key lab orders, differential diagnosis
- Questions 8-10: ADVANCED - diagnosis, pathophysiology, treatment planning
- Questions 11-12: EXPERT - complications, specialist management, long-term care

QUALITY STANDARDS:
- Each question must be clinically realistic and education-focused
- Provide 4 answer choices (A, B, C, D)
- Distractors must be plausible but clearly wrong to an expert
- Filter out low-quality distractors (e.g., "None of the above", overly obvious wrong answers)
- Include brief expert explanation for each answer (2-3 sentences)

OUTPUT FORMAT (strict JSON):
Return a JSON array of exactly 12 objects with this structure:
{
  "mcqs": [
    {
      "id": "q1",
      "question": "Clear, specific clinical question",
      "choices": ["A: first option", "B: second option", "C: third option", "D: fourth option"],
      "correct": "A: first option",
      "explanation": "Expert reasoning for why this is correct (2-3 sentences)",
      "step": 1,
      "type": "history|exam|lab|diagnosis|treatment|management"
    },
    ...
  ]
}

Do NOT include markdown fences, code blocks, or commentary outside the JSON structure.`;

      const userMessage = `Clinical case:
${JSON.stringify(caseData, null, 2)}

Generate 12 adaptive MCQs following the progression rules.`;

      // Call OpenAI with optimized settings
      const response = await client.chat.completions.create({
        model: process.env.GAMIFY_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      });

      const rawText = response?.choices?.[0]?.message?.content || '';
      
      // Robust JSON extraction with multiple fallback strategies
      let parsed = null;
      
      // Strategy 1: Direct parse
      try {
        parsed = JSON.parse(rawText);
      } catch {
        // Strategy 2: Extract from markdown fences
        const fenceMatch = rawText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (fenceMatch) {
          try {
            parsed = JSON.parse(fenceMatch[1]);
          } catch {}
        }
      }

      // Strategy 3: Find first JSON object in text
      if (!parsed) {
        const jsonMatch = rawText.match(/\{[\s\S]*"mcqs"[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch {}
        }
      }

      // Validate structure
      if (!parsed || !Array.isArray(parsed.mcqs)) {
        console.error('Invalid MCQ response structure:', rawText.substring(0, 200));
        return res.status(500).json({
          ok: false,
          error: 'Failed to generate valid MCQ structure',
          raw: rawText.substring(0, 500),
        });
      }

      // Ensure we have exactly 12 questions
      let mcqs = parsed.mcqs.slice(0, 12);
      
      // Fill with fallback questions if we got fewer than 12
      while (mcqs.length < 12) {
        mcqs.push({
          id: `q${mcqs.length + 1}`,
          question: `Clinical reasoning question ${mcqs.length + 1} (generation incomplete)`,
          choices: [
            'A: Option A',
            'B: Option B', 
            'C: Option C',
            'D: Option D',
          ],
          correct: 'A: Option A',
          explanation: 'This question was auto-generated as a fallback',
          step: mcqs.length + 1,
          type: 'general',
        });
      }

      // Normalize question IDs and ensure all required fields
      mcqs = mcqs.map((q, idx) => ({
        id: q.id || `q${idx + 1}`,
        question: q.question || `Question ${idx + 1}`,
        choices: Array.isArray(q.choices) ? q.choices : ['A', 'B', 'C', 'D'],
        correct: q.correct || q.choices?.[0] || 'A',
        explanation: q.explanation || 'No explanation provided',
        step: idx + 1,
        type: q.type || (idx < 3 ? 'history' : idx < 7 ? 'exam' : idx < 10 ? 'diagnosis' : 'management'),
      }));

      res.json({
        ok: true,
        mcqs,
        caseId,
        count: mcqs.length,
      });

    } catch (error) {
      console.error('❌ Gamify API error:', error);
      res.status(500).json({
        ok: false,
        error: error.message || 'Internal server error',
      });
    }
  });

  return router;
}
