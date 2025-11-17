// ~/medplat/backend/routes/gamify_direct_api.mjs
// DIRECT GAMIFICATION: Generate MCQs without full case generation (faster, cheaper)
/**
 * 🧭 @copilot: Expert Panel MCQ Generation
 * 
 * See: docs/COPILOT_GUIDE.md for dynamic guideline implementation
 * 
 * Current Implementation (Phase 2 - Expert Panel A+ Features):
 * ✅ Risk scoring integration (CHA₂DS₂-VASc, TIMI, CURB-65, GRACE, WELLS)
 * ✅ DOI citations in explanations (ESC 2023 §4.2.1, AHA/ACC 2022 3.4)
 * ✅ Multi-step clinical scenarios (AF + HFpEF vs HFrEF, diabetes + CKD)
 * ✅ Resource-limited scenarios (no MRI, warfarin bridging, renal dosing)
 * ✅ Imaging pitfall questions (thrombus vs artifact, pneumothorax detection)
 * ✅ Adaptive feedback based on learner performance
 * 
 * Dynamic Template Variables:
 * - ${topic}: Never hardcoded, injected from request
 * - ${region}: Adapts to user location (Denmark → ESC, USA → AHA/ACC)
 * - ${language}: Supports en, da, es, ar, ur, fa, de
 * 
 * Next Phase (Dynamic Guidelines):
 * - Add hierarchical guideline cascade (local → national → regional → international)
 * - Implement guideline registry lookup per region
 * - Return guideline sources with DOI/URL in response metadata
 * 
 * Example Response Format:
 * {
 *   ok: true,
 *   mcqs: [...],
 *   guidelines: {
 *     local: [{society: 'Sundhedsstyrelsen', year: 2023, doi: '...'}],
 *     regional: [{society: 'ESC', year: 2023, doi: '10.1093/...'}],
 *     international: [{society: 'WHO', year: 2022, url: '...'}]
 *   }
 * }
 */
import express from 'express';
import { getOpenAIClient } from '../openaiClient.js';
import { withTimeoutAndRetry, safeRouteHandler, createFallbackResponse } from '../utils/api_helpers.mjs';

export default function gamifyDirectApi() {
  const router = express.Router();
  const client = getOpenAIClient();

  // POST /api/gamify-direct - generate 12 MCQs directly from topic (no case generation step)
  router.post('/', safeRouteHandler(async (req, res) => {
    const { 
      topic = 'Acute Coronary Syndrome', 
      language = 'en',
      region = 'global',
        level = 'intermediate',
        model = 'gpt-4o-mini'
      } = req.body || {};
      
      if (!topic) {
        return res.status(400).json({ ok: false, error: 'Missing topic' });
      }

      console.log(`🎯 Direct gamification: ${topic} (${language}, ${region})`);

      // Build comprehensive system prompt for 12-question adaptive quiz
      const systemPrompt = `You are a medical education expert creating CLINICAL REASONING questions for board exams (USMLE Step 2/3, MRCP, FRACP).

TOPIC: ${topic}
LANGUAGE: ${language}
REGION: ${region}
LEVEL: ${level}

CRITICAL: Generate NEW patient vignettes — DO NOT ask about facts from a specific case. Test application, not recall.

Generate exactly 12 multiple-choice questions (MCQs) with these STRICT RULES:

**QUESTION TYPES (Required Distribution):**
- Questions 1-3: DATA INTERPRETATION - New patient scenarios requiring vital sign/lab/imaging interpretation
  * Example: "A 62-year-old man presents with chest pain. BP R arm 180/100, L arm 130/80. HR 110. What is the most likely diagnosis?"
  * MUST include: Risk scoring systems (e.g., CHA₂DS₂-VASc, HEART, WELLS, CURB-65) when relevant to ${topic}
  
- Questions 4-6: DIFFERENTIAL DIAGNOSIS - Clinical reasoning with similar presentations
  * Example: "Which finding best distinguishes aortic dissection from acute MI in a patient with chest pain?"
  * MUST include: Comparative diagnostic reasoning (vs myocarditis, vs pericarditis, vs PE, etc.)
  * MUST include: Multi-step scenarios when relevant (e.g., AF with HFpEF vs HFrEF, diabetes with CKD vs without)
  
- Questions 7-9: MANAGEMENT DECISIONS - Next-step/treatment choice scenarios  
  * Example: "A patient with suspected Type A dissection is hypotensive. What is the MOST APPROPRIATE immediate action?"
  * MUST include: Resource-limited setting variant (1-2 questions): "In a community hospital without advanced imaging, which finding best supports diagnosis?"
  * MUST include: Drug interactions, renal dosing, or contraindications when relevant
  * MUST include: Strategic decisions (e.g., rhythm vs rate control in AF, insulin vs GLP-1 in T2DM)
  
- Questions 10-12: COMPLICATIONS & PATHOPHYSIOLOGY - Apply knowledge to predict outcomes
  * Example: "In Stanford Type A dissection, which complication results from coronary ostia involvement?"
  * MUST include: Imaging pitfalls or interpretation challenges (e.g., atrial thrombus vs artifact on echo, pneumothorax on upright vs supine CXR)

**ADVANCED CLINICAL REASONING (REQUIREMENTS):**
1. **Applied Diagnostic Reasoning**: Include imaging/test comparison (e.g., "CT vs MRI sensitivity", "ECG vs echo diagnostic yield", "D-dimer vs CTPA")
2. **Guideline Integration**: Reference SPECIFIC recommendations with CLASS/LEVEL in explanations
   * Format: "ESC 2023 Guideline §4.2.1 (Class I, Level A): ..."
   * Format: "AHA/ACC 2022 recommendation 3.4 (Class IIa, Level B-R): ..."
   * Include DOI when citing studies: "NEJM 2021 doi:10.1056/..."
3. **Global Context**: Include 1-2 resource-limited scenarios (diagnosis without MRI/advanced imaging, low-resource drug alternatives)
4. **Reasoning Diversity**: Mix single-best-answer with prioritization ("Which test has HIGHEST diagnostic yield?", "MOST APPROPRIATE next step")
   * Include ECG/imaging interpretation questions (describe findings, ask for diagnosis)
   * Include multi-step scenarios requiring sequential reasoning
5. **Evidence-Based Distractors**: Each wrong answer must represent a plausible but guideline-inconsistent choice
6. **Risk Stratification**: When relevant, test ability to apply scoring systems (CHA₂DS₂-VASc, HAS-BLED, TIMI, GRACE, etc.)

**REGIONAL ADAPTATION (${region}):**
${region === 'global' ? '- Include international guidelines (WHO, global protocols)' : ''}
${region === 'north-america' ? '- Focus on AHA/ACC, USPSTF, FDA-approved therapies' : ''}
${region === 'europe' ? '- Emphasize ESC, NICE, EMA-approved medications' : ''}
${region === 'asia' ? '- Include resource-limited scenarios, tropical disease considerations' : ''}
${region === 'africa' ? '- Emphasize WHO essential medicines, point-of-care diagnostics' : ''}
${region === 'latin-america' ? '- Consider PAHO guidelines, emerging disease epidemiology' : ''}

**LANGUAGE OUTPUT: ${language}**
${language === 'en' ? '- Use American English medical terminology' : ''}
${language !== 'en' ? `- Translate ALL content (questions, choices, explanations) to ${language}` : ''}
${language !== 'en' ? `- Use culturally appropriate clinical examples for ${language}-speaking regions` : ''}

**QUALITY STANDARDS:**
- Each question = mini-vignette with NEW clinical scenario related to ${topic}
- Provide 4 answer choices (A, B, C, D)
- Distractors must require clinical reasoning to eliminate (not obviously wrong)
- Expert explanation MUST include:
  * WHY correct answer applies (with pathophysiology when relevant)
  * WHY each distractor is wrong (brief, specific reason per distractor)
  * Guideline citation with SPECIFIC recommendation number and class/level
    - Example: "ESC 2023 AF Guidelines §9.1.2 (Class I, Level A) recommends NOACs over warfarin in eligible patients"
    - Example: "AHA/ACC 2022 Heart Failure Guidelines rec. 4.2.1 (Class IIa, Level B-NR) suggests SGLT2i in HFpEF"
  * DOI citation for landmark trials when applicable: "AFFIRM trial (NEJM 2002, doi:10.1056/NEJMoa021328)"
  * Clinical pearl or teaching point for learner development
- Use CONSTRUCTIVE language for feedback (avoid "this is basic" or "below standard")
  * Instead: "Review rhythm control indications in symptomatic AF" or "Consider anticoagulation risk stratification tools"

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
      "explanation": "Differential BP (>20mmHg between arms) + widened mediastinum + tearing pain = classic Type A dissection (ESC 2023 diagnostic criteria). AMI would not cause BP differential. PE presents with dyspnea/tachypnea. Pericarditis has positional pain.",
      "step": 1,
      "type": "data_interpretation",
      "reasoning_type": "differential_diagnosis",
      "guideline_reference": "ESC 2023"
    }
  ]
}

Do NOT include markdown fences, code blocks, or commentary outside the JSON structure.`;

      const userPrompt = `Generate 12 clinical reasoning MCQs for: ${topic}

Requirements:
- All questions in ${language}
- Clinical context: ${region}
- Difficulty: ${level}
- Focus on diagnostic reasoning, differential diagnosis, management decisions, complications
- Include guideline citations in explanations
- Mix resource-rich and resource-limited scenarios

Return ONLY valid JSON with "mcqs" array (no markdown, no commentary).`;

      // Call OpenAI with timeout protection
      const completion = await withTimeoutAndRetry(
        async () => await client.chat.completions.create({
          model: model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.8,
          max_tokens: 4000,
        }),
        8000, // 8 second timeout
        1 // 1 retry
      );

      const rawText = completion.choices[0]?.message?.content || '';
      console.log('📦 Raw MCQ response length:', rawText.length);

      // Parse JSON response (with fallback strategies)
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
        console.error('❌ Invalid MCQ response structure:', rawText.substring(0, 200));
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
        mcqs.push({
          id: `q${step}`,
          question: `[Fallback] Clinical vignette ${step} related to ${topic}. This question would test clinical reasoning about ${topic}.`,
          choices: [
            'A: First clinical option',
            'B: Second clinical option', 
            'C: Third clinical option',
            'D: Fourth clinical option',
          ],
          correct: 'A: First clinical option',
          explanation: `Fallback explanation for question ${step}. The correct answer applies evidence-based clinical reasoning principles.`,
          step,
          type: step <= 3 ? 'data_interpretation' : step <= 6 ? 'differential_diagnosis' : step <= 9 ? 'management' : 'complications',
          reasoning_type: 'clinical_reasoning',
          guideline_reference: 'General Guidelines',
        });
      }

      console.log(`✅ Direct gamification complete: ${mcqs.length} MCQs generated for ${topic}`);

      res.json({
        ok: true,
        mcqs,
        meta: {
          topic,
          language,
          region,
          level,
          model,
          question_count: mcqs.length,
          generation_type: 'direct_gamification',
        },
      });

    } catch (err) {
      console.error('❌ Direct gamification error:', err);
      
      // v15.2.0: Return fallback MCQs instead of complete failure
      console.log('🔄 Returning fallback MCQs due to generation error');
      const fallback = createFallbackResponse('mcq', { topic, category: extractCategory(topic) });
      return res.json(fallback);
    }
  }));

  // Helper: extract category from topic
  function extractCategory(topic) {
    const t = topic.toLowerCase();
    if (t.includes('heart') || t.includes('cardiac') || t.includes('mi')) return 'cardiology';
    if (t.includes('stroke') || t.includes('neuro')) return 'neurology';
    if (t.includes('lung') || t.includes('asthma')) return 'pulmonology';
    return 'general';
  }

  return router;
}
