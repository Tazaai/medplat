// ~/medplat/backend/routes/external_panel_api.mjs
// External Panel Review for Gamification MCQ Quality Assurance
// Purpose: Review generated MCQs for difficulty, distractor quality, and educational value
// Note: This is SEPARATE from internal panel (which reviews cases during generation)

import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-local-dev',
});

/**
 * POST /api/external-panel/review-mcqs
 * 
 * Reviews generated MCQs using external expert panel for quality assessment
 * Used for gamification improvement and training data collection
 * 
 * Body: { caseContext, mcqs, topic, level }
 * Returns: { ok, reviews: [{ question_id, difficulty_score, distractor_quality, suggestions, ... }] }
 */
router.post('/review-mcqs', async (req, res) => {
  try {
    const { caseContext, mcqs, topic, level = 'intermediate' } = req.body;

    if (!mcqs || !Array.isArray(mcqs) || mcqs.length === 0) {
      return res.status(400).json({ ok: false, error: 'MCQs array required' });
    }

    console.log(`🎓 External panel reviewing ${mcqs.length} MCQs for topic: ${topic}`);

    // Build external panel review prompt
    const externalPanelPrompt = `You are an expert panel of medical educators reviewing MCQs for quality assurance.

**Your Role**: Assess the educational quality of these multiple-choice questions for ${level}-level medical training.

**Case Context**:
${typeof caseContext === 'string' ? caseContext : JSON.stringify(caseContext, null, 2).slice(0, 1000)}

**MCQs to Review**:
${mcqs.map((q, idx) => `
Question ${idx + 1}: ${q.question}
A) ${q.options?.[0] || q.a}
B) ${q.options?.[1] || q.b}
C) ${q.options?.[2] || q.c}
D) ${q.options?.[3] || q.d}
Correct: ${q.correct || q.answer}
Explanation: ${q.explanation || 'None provided'}
`).join('\n---\n')}

**Assessment Criteria**:
For each question, provide:

1. **Difficulty Score** (1-5):
   - 1 = Too easy (obvious answer)
   - 2 = Easy (basic recall)
   - 3 = Moderate (application of knowledge)
   - 4 = Hard (requires clinical reasoning)
   - 5 = Very hard (expert-level integration)

2. **Distractor Quality** (1-5):
   - 1 = Implausible distractors (obviously wrong)
   - 2 = Weak distractors (easy to eliminate)
   - 3 = Good distractors (plausible but incorrect)
   - 4 = Strong distractors (require careful reasoning)
   - 5 = Excellent distractors (could be argued by students)

3. **Educational Value** (1-5):
   - 1 = Trivial/irrelevant
   - 2 = Basic fact-checking
   - 3 = Tests important concept
   - 4 = High clinical relevance
   - 5 = Critical for practice/safety

4. **Specific Suggestions**: 1-2 concrete improvements (or "None" if excellent)

5. **Overall Assessment**: Brief summary (1 sentence)

Return JSON array with this structure:
[
  {
    "question_id": 1,
    "difficulty_score": 3,
    "distractor_quality": 4,
    "educational_value": 5,
    "suggestions": "Consider adding a time-pressure element to increase realism",
    "overall_assessment": "Excellent question testing critical STEMI management"
  },
  ...
]`;

    // Call OpenAI for external panel review
    const startTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: externalPanelPrompt }],
      temperature: 0.3, // Low temperature for consistent scoring
      max_tokens: 4000,
    });
    const reviewResult = completion.choices[0]?.message?.content || '[]';
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`✅ External panel review completed in ${duration}s`);

    // Parse review response
    let reviews = [];
    try {
      reviews = JSON.parse(reviewResult);
      if (!Array.isArray(reviews)) {
        reviews = [reviews];
      }
    } catch (parseError) {
      console.warn('⚠️ External panel response not valid JSON, parsing manually:', parseError.message);
      // Fallback: return basic structure
      reviews = mcqs.map((_, idx) => ({
        question_id: idx + 1,
        difficulty_score: 3,
        distractor_quality: 3,
        educational_value: 3,
        suggestions: 'Review format issue - manual assessment needed',
        overall_assessment: 'External panel response parse failed',
        raw_response: reviewResult.slice(0, 500)
      }));
    }

    // Add metadata
    const response = {
      ok: true,
      reviews,
      meta: {
        topic,
        level,
        mcq_count: mcqs.length,
        review_duration_sec: parseFloat(duration),
        timestamp: new Date().toISOString(),
        average_difficulty: (reviews.reduce((sum, r) => sum + (r.difficulty_score || 0), 0) / reviews.length).toFixed(2),
        average_distractor_quality: (reviews.reduce((sum, r) => sum + (r.distractor_quality || 0), 0) / reviews.length).toFixed(2),
        average_educational_value: (reviews.reduce((sum, r) => sum + (r.educational_value || 0), 0) / reviews.length).toFixed(2)
      }
    };

    console.log(`📊 Average scores: Difficulty=${response.meta.average_difficulty}, Distractors=${response.meta.average_distractor_quality}, Value=${response.meta.average_educational_value}`);

    res.json(response);

  } catch (error) {
    console.error('❌ External panel review error:', error);
    res.status(500).json({
      ok: false,
      error: 'External panel review failed',
      message: error.message
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'external-panel-api', status: 'active' });
});

export default router;
