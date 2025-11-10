// ~/medplat/backend/routes/external_panel_api.mjs
// EXTERNAL PANEL - Development & Governance Review Framework
// Purpose: System-level quality review for MedPlat generation process improvement
// NOT per-case review - this is for periodic development governance
//
// Core 5 Strategic Reviewers: USMLE Expert, Researcher, Professor, AI Expert, Medical Student
// Supporting 13 Roles: Clinicians, Specialists, Pharmacist, Radiologist, Web Dev, Business, Marketing

import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-local-dev',
});

/**
 * POST /api/external-panel/system-review
 * 
 * Development-level governance review of MedPlat's generation quality
 * Reviews a SAMPLE of cases to provide system improvement recommendations
 * 
 * Body: { case_samples, focus_area, system_version }
 * Returns: { ok, core_review, supporting_review, global_consensus, improvement_roadmap }
 */
router.post('/system-review', async (req, res) => {
  try {
    const { 
      case_samples = [], 
      focus_area = 'overall', 
      system_version = '1.0',
      review_depth = 'comprehensive' 
    } = req.body;

    if (!case_samples || case_samples.length === 0) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Case samples required for system review (minimum 3-5 cases recommended)' 
      });
    }

    console.log(`🌍 External Panel SYSTEM REVIEW: ${case_samples.length} cases, focus: ${focus_area}`);

    // Format case samples for analysis
    const sampleSummary = case_samples.map((c, idx) => `
**Case Sample ${idx + 1}**:
Topic: ${c.topic || 'Unknown'}
MCQs Generated: ${c.mcqs?.length || 0}
Sample MCQ: ${c.mcqs?.[0]?.question?.slice(0, 150) || 'N/A'}...
Quality Indicators: ${JSON.stringify(c.quality_metrics || {})}
User Feedback: ${c.user_feedback || 'N/A'}
`).join('\n---\n');

    // Build development governance review prompt
    const governancePrompt = `You are conducting a **DEVELOPMENT-LEVEL GOVERNANCE REVIEW** of MedPlat's case generation and MCQ quality system.

**CONTEXT**: This is NOT a per-case clinical review. You are evaluating the **SYSTEM'S ABILITY TO GENERATE HIGH-QUALITY MEDICAL EDUCATION CONTENT** across multiple cases.

---

## 🎯 CORE STRATEGIC REVIEWERS (Primary Decision Weight):

### 1. USMLE Expert
**Mandate**: Global academic alignment, question quality standards, exam format compliance
**Evaluate**:
- Do MCQs match USMLE Step 2/3 style? (Clinical vignette format, next-best-step)
- Are stems clear, unambiguous, and appropriately complex?
- Do distractors follow NBME patterns (plausible but clearly wrong)?
**Flag**: Recall-based questions, poor distractors, format violations, ambiguous stems

### 2. Medical Researcher
**Mandate**: Evidence hierarchy, citation quality, guideline adherence
**Evaluate**:
- Are references real and current? (Check guideline years, trial names)
- Is evidence tier appropriate? (SORT A/B/C, guideline strength)
- Are claims verifiable and not hallucinated?
**Flag**: Fabricated citations, outdated guidelines (pre-2020), missing evidence, Wikipedia-level depth

### 3. Professor of Medicine
**Mandate**: Pedagogical structure, learning progression, didactic coherence
**Evaluate**:
- Does content teach effectively? (Bloom's taxonomy: apply > recall)
- Is progression logical? (Simple → complex, foundation → advanced)
- Are explanations clear and educational (not just "correct answer is B")?
**Flag**: Rote memorization focus, missing teaching moments, poor explanations, no learning scaffolding

### 4. AI / Medical-Coding Expert
**Mandate**: Model logic, prompt architecture, reasoning flow, explainability
**Evaluate**:
- Are AI outputs consistent across similar topics?
- Is reasoning transparent and traceable? (Can we see the logic chain?)
- Are prompts well-engineered? (Clear instructions, examples, constraints)
**Flag**: Hallucinations, inconsistent logic, poor prompt engineering, black-box outputs, lack of citations

### 5. Medical Student (Learner Advocate)
**Mandate**: Learning clarity, accessibility, progression from trainee perspective
**Evaluate**:
- Can a 3rd/4th year student follow and learn from this?
- Is language appropriate? (Not overly simplistic, not unnecessarily complex)
- Is UX frustrating or empowering?
**Flag**: Overly complex jargon without explanation, missing context, confusing interface, demotivating feedback

---

## 🩺 SUPPORTING CLINICAL & PROFESSIONAL REVIEWERS:

- **Medical Doctor (Practicing Clinician)**: Practical realism, workflow consistency, "does this reflect real practice?"
- **Clinical Specialists (3)**: Specialty accuracy, guideline validation for cardiology/neuro/etc.
- **Emergency Medicine (2)**: Acute response realism, triage logic, time-critical decision accuracy
- **General Practitioners (2)**: Primary care integration, continuity, chronic disease management
- **Clinical Pharmacist**: Medication safety, interactions, dosing accuracy, contraindications
- **Radiologist (1-2)**: Imaging appropriateness, diagnostic timelines, sensitivity/specificity discussion
- **Field Researcher**: Real-world/resource-limited applicability, global health perspective
- **Web Developer**: UI/UX quality, data flow, user experience, mobile accessibility
- **Competitor Voice**: Benchmark vs Osmosis, Amboss, USMLE Rx, Sketchy - where do we stand?
- **Business Consultant**: Scalability, compliance, sustainability, revenue potential
- **Digital Marketing Expert**: Communication clarity, educational reach, user engagement

---

## 📊 CASE SAMPLES ANALYZED (${case_samples.length} cases):

${sampleSummary}

---

## 🎯 REVIEW OBJECTIVES (Focus: ${focus_area}):

1. **Evidence Validation** - verify references, guideline tiers, claims authenticity
2. **Pedagogical Strength** - assess clarity, structure, learning progression quality
3. **Reasoning Quality** - evaluate AI logic chains, adaptive fidelity, consistency
4. **User Experience** - ensure global accessibility, clarity, and learner engagement
5. **Global Alignment** - confirm regional adaptability without bias (ESC vs AHA, low-resource settings)

---

## 📝 OUTPUT FORMAT (STRICT JSON):

{
  "core_review": {
    "usmle_expert": {
      "assessment": "Overall evaluation of exam alignment and question quality...",
      "key_findings": [
        "Finding 1: Specific issue observed across cases",
        "Finding 2: Pattern in question formatting",
        "Finding 3: Strength to maintain"
      ],
      "recommendations": [
        "Action 1: Specific improvement needed",
        "Action 2: Prompt modification required"
      ],
      "severity": "LOW|MEDIUM|HIGH|CRITICAL"
    },
    "medical_researcher": {
      "assessment": "...",
      "key_findings": ["...", "..."],
      "recommendations": ["...", "..."],
      "severity": "..."
    },
    "professor_of_medicine": { "assessment": "...", "key_findings": ["..."], "recommendations": ["..."], "severity": "..." },
    "ai_coding_expert": { "assessment": "...", "key_findings": ["..."], "recommendations": ["..."], "severity": "..." },
    "medical_student": { "assessment": "...", "key_findings": ["..."], "recommendations": ["..."], "severity": "..." }
  },
  
  "supporting_review": {
    "medical_doctor": { "assessment": "...", "recommendations": ["..."] },
    "clinical_specialists": { "assessment": "...", "recommendations": ["..."] },
    "emergency_medicine": { "assessment": "...", "recommendations": ["..."] },
    "general_practitioners": { "assessment": "...", "recommendations": ["..."] },
    "clinical_pharmacist": { "assessment": "...", "recommendations": ["..."] },
    "radiologist": { "assessment": "...", "recommendations": ["..."] },
    "web_developer": { "assessment": "...", "recommendations": ["..."] },
    "competitor_voice": { "assessment": "...", "recommendations": ["..."] },
    "business_consultant": { "assessment": "...", "recommendations": ["..."] }
  },
  
  "global_consensus": {
    "summary": "Overall system quality assessment in 2-3 sentences...",
    "critical_actions": ["Immediate fix needed for X - blocks quality/safety"],
    "high_priority": ["Important improvements that significantly enhance quality"],
    "medium_priority": ["Recommended enhancements for better UX/pedagogy"],
    "low_priority": ["Nice-to-have features, long-term vision"],
    "strengths": ["What's working well and should be preserved/amplified"],
    "weaknesses": ["What needs improvement - specific and actionable"]
  },
  
  "improvement_roadmap": {
    "sprint_1_critical": ["Week 1-2: Critical fixes that must happen now"],
    "sprint_2_high": ["Week 3-4: High-priority improvements"],
    "sprint_3_medium": ["Month 2: Medium-priority enhancements"],
    "long_term": ["Quarter 2-4: Strategic features and vision"]
  },
  
  "scores": {
    "evidence_quality": 7.5,
    "pedagogical_effectiveness": 8.2,
    "ai_reasoning_quality": 6.8,
    "user_experience": 7.0,
    "global_applicability": 7.5,
    "overall_system_quality": 7.4
  }
}

---

## ⚠️ CRITICAL RULES:

1. **Core 5 reviewers have PRIMARY DECISION WEIGHT** - their consensus drives action items
2. **Supporting reviewers provide context** but don't override core strategic decisions
3. **Be specific and actionable** - vague feedback like "improve quality" is useless
4. **Focus on SYSTEM patterns**, not individual case nitpicks
5. **Prioritize by severity**: CRITICAL (blocks launch) → HIGH (major impact) → MEDIUM (nice improvement) → LOW (future vision)
6. **Scores are 0-10** with decimals allowed (e.g., 7.5) - be realistic, not all 10s
7. **Return ONLY valid JSON** - no markdown, no code fences, no explanatory text outside JSON

Generate the comprehensive development governance review now.`;

    const startTime = Date.now();

    // Call OpenAI for governance review
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are a multidisciplinary medical education governance panel conducting development-level system reviews. Provide structured, actionable feedback for continuous improvement. Return only valid JSON.' 
        },
        { role: 'user', content: governancePrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 12000,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const reviewData = JSON.parse(response.choices[0].message.content);

    console.log(`✅ External Panel system review completed in ${elapsed}s`);
    console.log(`📊 Overall System Quality Score: ${reviewData.scores?.overall_system_quality || 'N/A'}/10`);
    console.log(`🎯 Critical Actions: ${reviewData.global_consensus?.critical_actions?.length || 0}`);
    console.log(`⚡ High Priority: ${reviewData.global_consensus?.high_priority?.length || 0}`);

    return res.json({
      ok: true,
      review_type: 'system_governance',
      focus_area,
      cases_analyzed: case_samples.length,
      elapsed_seconds: parseFloat(elapsed),
      timestamp: new Date().toISOString(),
      ...reviewData
    });

  } catch (error) {
    console.error('❌ External panel system review error:', error);
    return res.status(500).json({ 
      ok: false, 
      error: error.message || 'System review failed' 
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    service: 'external-panel-governance', 
    status: 'active',
    version: 'development-review-framework',
    core_reviewers: 5,
    supporting_reviewers: 13,
    total_panel: 18,
  });
});

export default router;
