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
      const systemPrompt = `You are a medical education expert creating CLINICAL REASONING questions for board exams (USMLE Step 2/3, MRCP, FRACP).

CRITICAL: Generate NEW patient vignettes — DO NOT ask about facts from the provided case. Test application, not recall.

Generate exactly 12 multiple-choice questions (MCQs) with these STRICT RULES:

**QUESTION TYPES (Required Distribution):**
- Questions 1-3: DATA INTERPRETATION - New patient scenarios requiring vital sign/lab/imaging interpretation
  * Example: "A 62-year-old man presents with chest pain. BP R arm 180/100, L arm 130/80. HR 110. What is the most likely diagnosis?"
  * DO NOT ask: "What was the patient's blood pressure in the case?"
  
- Questions 4-6: DIFFERENTIAL DIAGNOSIS - Clinical reasoning with similar presentations
  * Example: "Which finding best distinguishes aortic dissection from acute MI in a patient with chest pain?"
  * DO NOT ask: "What was the final diagnosis in this case?"
  
- Questions 7-9: MANAGEMENT DECISIONS - Next-step/treatment choice scenarios
  * Example: "A patient with suspected Type A dissection is hypotensive. What is the MOST APPROPRIATE immediate action?"
  * DO NOT ask: "What medication was given to the patient?"
  
- Questions 10-12: COMPLICATIONS & PATHOPHYSIOLOGY - Apply knowledge to predict outcomes
  * Example: "In Stanford Type A dissection, which complication results from coronary ostia involvement?"
  * DO NOT ask: "What is the pathophysiology described in the case?"

**CLINICAL REASONING REQUIREMENTS:**
1. **New Patient Vignettes**: Each question presents a DIFFERENT patient (not the case patient)
2. **Data Integration**: Require students to synthesize multiple findings (vitals + labs + imaging)
3. **Differential Thinking**: Force comparison between similar conditions
4. **Management Decisions**: Test treatment choices based on clinical presentation
5. **Plausible Distractors**: Wrong answers must be reasonable alternatives (not obviously wrong)

**FORBIDDEN (Reading Comprehension Patterns):**
❌ "What was the patient's chief complaint?" → This is CTRL+F testing
❌ "How long did symptoms last before presentation?" → Memory recall
❌ "What imaging modality was used?" → Fact checking
❌ "What medication did the patient receive?" → Case regurgitation

**QUALITY STANDARDS:**
- Each question = mini-vignette with NEW clinical scenario
- Provide 4 answer choices (A, B, C, D)
- Distractors must require clinical reasoning to eliminate (not obviously wrong)
- Expert explanation should teach WHY correct answer applies AND why distractors don't
- Include mechanism/pathophysiology in explanations (connect to case topic)

**OUTPUT FORMAT (strict JSON):**
Return a JSON array of exactly 12 objects:
{
  "mcqs": [
    {
      "id": "q1",
      "question": "62yo M, sudden tearing chest pain. BP R 180/100, L 130/80. HR 110. CXR: widened mediastinum. Most likely diagnosis?",
      "choices": [
        "A: Acute myocardial infarction",
        "B: Aortic dissection",
        "C: Pulmonary embolism",
        "D: Acute pericarditis"
      ],
      "correct": "B: Aortic dissection",
      "explanation": "Differential BP (>20mmHg between arms) + widened mediastinum + tearing pain = classic Type A dissection. AMI would not cause BP differential. PE presents with dyspnea/tachypnea. Pericarditis has positional pain.",
      "step": 1,
      "type": "data_interpretation",
      "reasoning_type": "differential_diagnosis"
    },
    ...
  ]
}

Do NOT include markdown fences, code blocks, or commentary outside the JSON structure.`;

      const userMessage = `Clinical case topic: ${caseData.meta?.topic || caseData.Final_Diagnosis?.Diagnosis || 'Unknown'}

**Case Summary (for context ONLY - do NOT create questions about these specific facts):**
- Diagnosis: ${caseData.Final_Diagnosis?.Diagnosis || caseData.final_diagnosis?.name || 'N/A'}
- Key Pathophysiology: ${caseData.Pathophysiology?.mechanism || caseData.pathophysiology?.molecular_mechanism || 'N/A'}
- Classification: ${caseData.pathophysiology?.classification || 'N/A'}
- Key Management: ${JSON.stringify(caseData.Management?.immediate || caseData.management?.immediate || [])}

**Your Task:**
Generate 12 clinical reasoning questions about ${caseData.meta?.topic || 'this condition'} using NEW patient vignettes.

Requirements:
- Questions 1-3: Data interpretation (new patient scenarios with vitals/labs/imaging)
- Questions 4-6: Differential diagnosis reasoning (compare similar conditions)
- Questions 7-9: Management decisions (next-step questions)
- Questions 10-12: Complications & pathophysiology (predict outcomes, mechanisms)

DO NOT ask about facts from the case above. Create NEW scenarios testing clinical application.`;

      // Call OpenAI with optimized settings
      const response = await client.chat.completions.create({
        model: process.env.GAMIFY_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.9, // Increased for more creative vignette generation
        max_tokens: 3000, // Increased for detailed clinical reasoning explanations
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
        const step = mcqs.length + 1;
        const types = {
          1: { type: 'data_interpretation', reasoning: 'differential_diagnosis' },
          2: { type: 'data_interpretation', reasoning: 'lab_interpretation' },
          3: { type: 'data_interpretation', reasoning: 'imaging_interpretation' },
          4: { type: 'differential_diagnosis', reasoning: 'diagnostic_reasoning' },
          5: { type: 'differential_diagnosis', reasoning: 'diagnostic_reasoning' },
          6: { type: 'differential_diagnosis', reasoning: 'risk_stratification' },
          7: { type: 'management', reasoning: 'treatment_decision' },
          8: { type: 'management', reasoning: 'treatment_decision' },
          9: { type: 'management', reasoning: 'escalation_decision' },
          10: { type: 'complications', reasoning: 'outcome_prediction' },
          11: { type: 'complications', reasoning: 'pathophysiology_application' },
          12: { type: 'complications', reasoning: 'pathophysiology_application' },
        };
        
        mcqs.push({
          id: `q${step}`,
          question: `[Fallback] Clinical vignette ${step} - generation incomplete. This question would test clinical reasoning.`,
          choices: [
            'A: First clinical option',
            'B: Second clinical option', 
            'C: Third clinical option',
            'D: Fourth clinical option',
          ],
          correct: 'A: First clinical option',
          explanation: 'This question was auto-generated as a fallback due to incomplete AI response.',
          step,
          type: types[step]?.type || 'general',
          reasoning_type: types[step]?.reasoning || 'clinical_reasoning',
        });
      }

      // Normalize question IDs and ensure all required fields
      mcqs = mcqs.map((q, idx) => {
        const step = idx + 1;
        const defaultTypes = {
          1: { type: 'data_interpretation', reasoning: 'differential_diagnosis' },
          2: { type: 'data_interpretation', reasoning: 'lab_interpretation' },
          3: { type: 'data_interpretation', reasoning: 'imaging_interpretation' },
          4: { type: 'differential_diagnosis', reasoning: 'diagnostic_reasoning' },
          5: { type: 'differential_diagnosis', reasoning: 'diagnostic_reasoning' },
          6: { type: 'differential_diagnosis', reasoning: 'risk_stratification' },
          7: { type: 'management', reasoning: 'treatment_decision' },
          8: { type: 'management', reasoning: 'treatment_decision' },
          9: { type: 'management', reasoning: 'escalation_decision' },
          10: { type: 'complications', reasoning: 'outcome_prediction' },
          11: { type: 'complications', reasoning: 'pathophysiology_application' },
          12: { type: 'complications', reasoning: 'pathophysiology_application' },
        };
        
        return {
          id: q.id || `q${step}`,
          question: q.question || `Question ${step}`,
          choices: Array.isArray(q.choices) ? q.choices : ['A', 'B', 'C', 'D'],
          correct: q.correct || q.choices?.[0] || 'A',
          explanation: q.explanation || 'No explanation provided',
          step,
          type: q.type || defaultTypes[step]?.type || 'general',
          reasoning_type: q.reasoning_type || defaultTypes[step]?.reasoning || 'clinical_reasoning',
        };
      });

      res.json({
        ok: true,
        mcqs,
        caseId,
        count: mcqs.length,
      });

      // 📝 NOTE: External panel is for MANUAL development testing only (never auto-runs)
      // Agent runs test scripts that call /api/external-panel/system-review explicitly
      // Users and frontend NEVER trigger external panel - it's purely for dev governance

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
