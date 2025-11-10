// ~/medplat/backend/routes/external_panel_api_enhanced.mjs
// ENHANCED External Panel Review - 18-Member Conference Simulation
// Purpose: Comprehensive MCQ quality review with multidisciplinary perspectives
// Note: This is PHASE 1 enhancement - simulated conference (single LLM call)

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
 * Enhanced: 18-member multidisciplinary conference panel review
 * 
 * Body: { caseContext, mcqs, topic, level, region }
 * Returns: { ok, moderator_opening, panel_comments, disagreements, consensus, global_reflection, scores_summary, action_items }
 */
router.post('/review-mcqs', async (req, res) => {
  try {
    const { caseContext, mcqs, topic, level = 'intermediate', region = 'global' } = req.body;

    if (!mcqs || !Array.isArray(mcqs) || mcqs.length === 0) {
      return res.status(400).json({ ok: false, error: 'MCQs array required' });
    }

    console.log(`🎓 External panel (ENHANCED) reviewing ${mcqs.length} MCQs for topic: ${topic}`);

    // Format MCQs for prompt
    const mcqText = mcqs.map((q, idx) => `
**Question ${idx + 1}**:
Stem: ${q.question || q.stem}
A) ${q.options?.[0] || q.a}
B) ${q.options?.[1] || q.b}
C) ${q.options?.[2] || q.c}
D) ${q.options?.[3] || q.d}
Correct Answer: ${q.correct || q.answer}
Explanation: ${q.explanation || 'None provided'}
`).join('\n---\n');

    // Build enhanced conference panel prompt
    const enhancedPrompt = `You are simulating a multidisciplinary medical education conference reviewing MCQs for **${topic}** (${level} level, ${region} region).

**PANEL COMPOSITION** (18 members):

1. **Medical Student (Year 4)** - Learner perspective, question clarity, fairness
2. **Junior Medical Doctor** - Practical clinical application
3. **Clinical Specialist 1** - Specialty-specific accuracy (auto-select: Cardiology, Neurology, etc. based on ${topic})
4. **Clinical Specialist 2** - Secondary specialty perspective
5. **Clinical Specialist 3** - Tertiary specialty input
6. **Emergency Medicine Specialist 1** - Acute management, time-critical decisions
7. **Emergency Medicine Specialist 2** - Triage priorities, rescue therapies
8. **General Practitioner 1** - Primary care relevance, community practice
9. **General Practitioner 2** - Follow-up care, chronic management
10. **Clinical Pharmacist** - Drug safety, interactions, contraindications, dosing
11. **Radiologist** - Imaging modality selection, interpretation reasoning
12. **Field Researcher** - Evidence quality, guideline adherence, trial validity
13. **Professor of Medicine** - Educational design, Bloom's taxonomy, teaching effectiveness
14. **USMLE/NBME Expert** - Assessment standards, NBME-style format compliance
15. **AI/Medical-Coding Expert** - System integration, digital health quality
16. **Web Developer** - UX, mobile accessibility, interface clarity
17. **Competitor Voice** - Market comparison (Osmosis, Amboss, USMLE Rx, Sketchy)
18. **Business Consultant** - Scalability, user engagement, monetization potential

---

**CASE CONTEXT**:
\`\`\`
${typeof caseContext === 'string' ? caseContext.slice(0, 2000) : JSON.stringify(caseContext, null, 2).slice(0, 2000)}
\`\`\`

---

**MCQs TO REVIEW**:
${mcqText}

---

**CONFERENCE PROCESS** (simulate grand rounds / academic morning conference):

### 1. OPENING MODERATOR SUMMARY
- Introduce case and MCQ set (1-2 sentences)
- Outline 2-3 key controversies or learning objectives
- Set expectations for panel discussion

### 2. SPECIALTY COMMENT ROUNDS
Each of the 18 panel members provides:
- **MCQ Focus**: Which questions they're commenting on (array of question numbers)
- **Comment**: Specific, actionable feedback (2-4 sentences)
- **Guideline References**: Relevant guidelines (ESC, NICE, AHA, WHO, local ${region} protocols, NBME standards, etc.)
- **Role-Specific Scores**: 1-2 numeric scores (1-5 scale) relevant to their expertise

**Example Comments**:
- Medical Student: "Q3 stem ambiguous - 'typical chest pain' undefined. Q7 explanation uses unexplained abbreviations (PCI, DAPT)."
- Cardiologist: "Q4 ticagrelor choice correct per ESC 2023 but lacks setting context - in ${region}, clopidogrel may be more common."
- Emergency Doc: "Q2 needs time-critical cue (⏱️ icon or 'STAT' label) - STEMI is door-to-balloon race."
- USMLE Expert: "Q7 stem too short for NBME (should be 2-3 sentences with clinical vignette). Q11 matches format well."
- Web Developer: "Q1 options A/B visually similar on mobile (both start 'ST'). Q3 long options wrap awkwardly."
- Competitor Analyst: "Compared to Amboss: similar difficulty but they have guideline toggle (ESC vs AHA). vs Osmosis: our explanations better."

### 3. INTER-SPECIALTY REBUTTALS
Identify **≥2 disagreements** where panel members have differing views:
- **Issue**: The controversy (1 sentence)
- **Opinions**: Array of { role, view } (2-3 conflicting perspectives)
- **Resolution**: Proposed compromise or action (1 sentence)

**Example**:
{
  "issue": "Antiplatelet choice in Q4 (ticagrelor vs clopidogrel)",
  "opinions": [
    { "role": "Cardiologist", "view": "Ticagrelor is ESC guideline-recommended" },
    { "role": "General Practitioner 1", "view": "In ${region}, clopidogrel more common due to cost/availability" },
    { "role": "Clinical Pharmacist", "view": "Both valid - question should specify setting" }
  ],
  "resolution": "Add 'in ESC guideline-adherent center' to stem"
}

### 4. CONSENSUS STATEMENT
- Synthesize all feedback into 2-3 sentences
- Balance evidence, patient context, and educational goals
- Provide overall quality assessment (e.g., "Strong set, avg 4.2/5")

### 5. GLOBAL REFLECTION
- How would this MCQ set vary across regions? (Denmark vs US vs India vs sub-Saharan Africa)
- Guideline conflicts to note (ESC vs AHA vs NICE vs WHO)
- Low-resource setting adaptations needed
- Cultural/language considerations

---

**OUTPUT FORMAT** (JSON - return ONLY valid JSON, no markdown):

{
  "ok": true,
  "moderator_opening": "This 12-question MCQ set on acute myocardial infarction covers STEMI recognition, risk stratification, and acute management...",
  
  "panel_comments": [
    {
      "role": "Medical Student (Year 4)",
      "mcq_focus": [3, 7, 11],
      "comment": "Question 3 stem ambiguous - 'typical chest pain' could mean different things...",
      "guideline_refs": [],
      "scores": { "clarity": 3, "fairness": 4 }
    },
    {
      "role": "Cardiologist",
      "mcq_focus": [1, 4, 5, 8],
      "comment": "Q1 ECG interpretation excellent, matches ESC criteria. Q4 ticagrelor is guideline-recommended but...",
      "guideline_refs": ["ESC 2023 STEMI Guidelines", "AHA 2021 Antiplatelet Therapy"],
      "scores": { "clinical_accuracy": 5, "guideline_alignment": 4 }
    }
    // ... all 18 members (generate dynamically based on ${topic})
  ],
  
  "disagreements": [
    {
      "issue": "Antiplatelet choice in Q4",
      "opinions": [
        { "role": "Cardiologist", "view": "Ticagrelor per ESC" },
        { "role": "GP 1", "view": "Clopidogrel in ${region}" }
      ],
      "resolution": "Specify setting in stem"
    }
    // minimum 2 disagreements required
  ],
  
  "consensus": "Overall strong MCQ set (avg 4.2/5). Main improvements: (1) add setting context for drugs, (2) expand stems for NBME alignment, (3) time-critical cues for EM scenarios.",
  
  "global_reflection": "Regional variations: ${region} uses X, US uses Y, low-resource settings use Z. Guideline conflicts: ESC vs NICE on timing. WHO guidelines less prescriptive. Recommendation: add 'Guidelines applied: ESC 2023' banner.",
  
  "scores_summary": {
    "average_difficulty": 3.4,
    "average_distractor_quality": 4.1,
    "average_educational_value": 4.5,
    "nbme_alignment_score": 3.5,
    "global_applicability_score": 3.8,
    "clinical_accuracy_score": 4.8,
    "ux_score": 3.5
  },
  
  "action_items": [
    "CRITICAL: Revise Q4 to specify 'in ESC guideline-adherent center'",
    "HIGH: Expand Q7 stem to 2-3 sentences",
    "MEDIUM: Add timer icon to Q2, Q6",
    "LOW: Consider guideline selector feature"
  ],
  
  "meta": {
    "panel_size": 18,
    "review_duration_sec": 0,
    "model": "gpt-4o-mini",
    "temperature": 0.4,
    "timestamp": "",
    "topic": "${topic}",
    "region": "${region}",
    "level": "${level}"
  }
}

**CRITICAL RULES**:
1. Return ONLY valid JSON (no markdown, no code fences, no explanatory text)
2. Generate ALL 18 panel member comments (adapt specialties to ${topic})
3. Provide AT LEAST 2 disagreements (realistic conflicts)
4. Reference actual guidelines (ESC, NICE, AHA, WHO, NBME, ${region}-specific)
5. Be critical but constructive - this is for improvement, not rejection
6. Scores must be numeric 1-5 scale (allow decimals like 3.5)
7. Action items must be prioritized (CRITICAL/HIGH/MEDIUM/LOW)

Generate the full conference panel review now:`;

    // Call OpenAI for enhanced conference review
    const startTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: enhancedPrompt }],
      temperature: 0.4, // Slightly higher for diversity in panel perspectives
      max_tokens: 8000, // Larger for 18-member responses
      response_format: { type: "json_object" }, // Force JSON output
    });
    const reviewResult = completion.choices[0]?.message?.content || '{}';
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`✅ Enhanced external panel review completed in ${duration}s`);

    // Parse review response
    let reviewData = {};
    try {
      reviewData = JSON.parse(reviewResult);
      
      // Validate structure
      if (!reviewData.panel_comments || !Array.isArray(reviewData.panel_comments)) {
        throw new Error('Missing panel_comments array');
      }
      if (!reviewData.disagreements || reviewData.disagreements.length < 2) {
        console.warn('⚠️ Less than 2 disagreements - panel may not be diverse enough');
      }
      if (!reviewData.action_items || reviewData.action_items.length === 0) {
        console.warn('⚠️ No action items - review may not be actionable');
      }

      // Add metadata
      reviewData.meta = {
        ...reviewData.meta,
        panel_size: reviewData.panel_comments?.length || 0,
        review_duration_sec: parseFloat(duration),
        model: 'gpt-4o-mini',
        temperature: 0.4,
        timestamp: new Date().toISOString(),
        topic,
        region,
        level,
      };

    } catch (parseError) {
      console.error('❌ Enhanced panel response parse error:', parseError.message);
      console.error('Response excerpt:', reviewResult.slice(0, 500));
      
      // Fallback: return error response
      return res.status(500).json({
        ok: false,
        error: 'Enhanced panel review parse failed',
        message: parseError.message,
        raw_response_excerpt: reviewResult.slice(0, 500),
      });
    }

    // Log summary
    console.log(`📊 Panel Summary:`);
    console.log(`   - ${reviewData.panel_comments?.length || 0} member comments`);
    console.log(`   - ${reviewData.disagreements?.length || 0} disagreements`);
    console.log(`   - ${reviewData.action_items?.length || 0} action items`);
    console.log(`   - Avg Educational Value: ${reviewData.scores_summary?.average_educational_value}`);
    console.log(`   - NBME Alignment: ${reviewData.scores_summary?.nbme_alignment_score}`);

    res.json(reviewData);

  } catch (error) {
    console.error('❌ Enhanced external panel review error:', error);
    res.status(500).json({
      ok: false,
      error: 'Enhanced external panel review failed',
      message: error.message,
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    service: 'external-panel-api-enhanced', 
    status: 'active',
    version: 'phase-1-conference-simulation',
    panel_size: 18,
  });
});

export default router;
