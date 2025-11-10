# External Panel Review - Current vs Desired Implementation

## Executive Summary

**Current State**: Simple external panel reviewer (single GPT-4o-mini call) scoring MCQs on 3 metrics  
**Desired State**: 18-member multidisciplinary conference panel with debates, consensus, and global reflection  
**Gap**: ~90% - current implementation is a minimal quality gate, not a comprehensive review system

---

## 📊 Detailed Comparison

### Current Implementation (as of commit 6fb0fe7)

**File**: `backend/routes/external_panel_api.mjs`

**Panel Composition**:
- ❌ No explicit panel members
- ✅ Single AI reviewer ("expert panel of medical educators")
- ❌ No role differentiation
- ❌ No specialty perspectives

**Review Process**:
1. Receives: `{ caseContext, mcqs, topic, level }`
2. Sends single prompt to GPT-4o-mini (temperature 0.3)
3. Returns JSON array with 5 metrics per MCQ:
   - `difficulty_score` (1-5)
   - `distractor_quality` (1-5)
   - `educational_value` (1-5)
   - `suggestions` (text)
   - `overall_assessment` (text)

**Characteristics**:
- ✅ Fast (~3-5 seconds for 12 MCQs)
- ✅ Cost-efficient (~$0.001 per review)
- ✅ Structured scoring
- ❌ No debate or disagreement simulation
- ❌ No conference-style discussion
- ❌ No global/regional perspective comparison
- ❌ No interdisciplinary reasoning

---

### Desired Implementation (from your requirements)

**Panel Composition** (18 members):

| Role | Count | Expertise |
|------|-------|-----------|
| Medical Student | 1 | Learner perspective, question clarity |
| Medical Doctor | 1 | General clinical validation |
| Clinical Specialists | 3 | Cardiology, Neurology, Emergency Medicine, etc. |
| Clinical Pharmacist | 1 | Drug dosing, interactions, contraindications |
| General Practitioners | 2 | Primary care relevance, triage |
| Emergency Medicine Specialists | 2 | Acute management, time-critical decisions |
| Field Researcher | 1 | Evidence quality, guideline adherence |
| Radiologists | 1-2 | Imaging modality selection, interpretation |
| Professor of Medicine | 1 | Educational design, academic rigor |
| AI/Medical-Coding Expert | 1 | System quality, digital health integration |
| USMLE Expert | 1 | Assessment standards, NBME-style validation |
| Web Developer | 1 | UX, technical feasibility |
| Competitor Voice | 1 | Market comparison (Osmosis, Amboss, etc.) |
| Business Consultant | 1 | Scalability, monetization |
| Digital Marketing Expert | 1 | User engagement, virality |

**Review Process** (conference-style):

1. **Opening Moderator Summary**
   - Introduces case/MCQs
   - Outlines controversies
   - Sets learning objectives

2. **Specialty Comment Rounds**
   - Each discipline contributes
   - References guideline frameworks (ESC, NICE, AHA, WHO, local)
   - Adaptive reasoning approach

3. **Inter-specialty Rebuttals**
   - ≥2 disagreements required
   - Respectful challenges to interpretations
   - Highlights variation in specialty approaches

4. **Consensus Statement**
   - Synthesizes evidence
   - Balances patient context
   - Global best practice

5. **Global Reflection**
   - How outcome varies across regions
   - Healthcare system differences
   - Low-resource adaptations

**Focus Areas** (all participants):
- Clinical accuracy and logical flow
- Missing red flags, rescue therapies, escalation points
- Practical adaptations (low-resource/regional settings)
- Interdisciplinary coordination (ED → ICU → specialty)
- Educational quality: clarity, progression, teachability
- System-level insights (guideline conflicts, documentation, UX)
- Competitor comparison (innovation gap)

**Output Format**:
- Opening moderator summary
- Individual comments by role (with guideline references)
- Documented disagreements (Issue + Opinions array)
- Final consensus
- Global reflection notes
- Actionable improvement recommendations

---

## 🔍 Gap Analysis

### Missing Components

1. **Panel Member Personas** (0/18 implemented)
   - No role-based reasoning
   - No specialty-specific guideline references
   - No varying perspectives (student vs professor vs GP)

2. **Conference Dynamics** (0% implemented)
   - No opening moderator
   - No structured discussion rounds
   - No debate/disagreement simulation
   - No consensus-building

3. **Global Context** (0% implemented)
   - No regional guideline comparison (Denmark vs US vs WHO)
   - No low-resource setting adaptations
   - No healthcare system differences

4. **Multidisciplinary Integration** (0% implemented)
   - No ED → ICU → specialty transition analysis
   - No radiologist input on imaging modalities
   - No pharmacist drug safety review

5. **Educational Depth** (20% implemented)
   - ✅ Basic difficulty scoring
   - ✅ Distractor quality
   - ❌ Learning objective mapping
   - ❌ Bloom's taxonomy level
   - ❌ NBME/USMLE alignment check

6. **System/Competitor Analysis** (0% implemented)
   - No UX evaluation
   - No comparison with Osmosis/Amboss/USMLE Rx
   - No business/marketing perspective

---

## 🎯 Recommended Enhancement Plan

### Phase 1: Enhanced Panel Prompt (Quick Win - 1-2 hours)

**Goal**: Transform single reviewer into multi-persona conference simulation

**Changes to `external_panel_api.mjs`**:

```javascript
const externalPanelPrompt = `You are simulating a multidisciplinary medical education conference reviewing MCQs for ${topic}.

**PANEL MEMBERS** (18 roles):
1. Medical Student (Year 4) - learner clarity, fairness
2. Junior Doctor - practical application
3. Cardiologist - specialty accuracy (if relevant)
4. Neurologist - specialty accuracy (if relevant)
5. Emergency Medicine Specialist 1 - acute management
6. Emergency Medicine Specialist 2 - triage priorities
7. General Practitioner 1 - primary care relevance
8. General Practitioner 2 - community setting
9. Clinical Pharmacist - drug safety, interactions
10. Radiologist - imaging modality reasoning
11. Field Researcher - evidence quality
12. Professor of Medicine - educational design
13. USMLE Expert - assessment standards
14. AI/Medical-Coding Expert - system integration
15. Web Developer - UX, accessibility
16. Competitor Analyst - market comparison (Osmosis, Amboss)
17. Business Consultant - scalability
18. Digital Marketing Expert - engagement

**CASE CONTEXT**:
${caseContext}

**MCQs TO REVIEW**:
${mcqs.map(formatMCQ).join('\\n---\\n')}

**CONFERENCE PROCESS**:

1. **OPENING (Moderator)**:
   - Summarize case and MCQ quality goals
   - Identify 2-3 key controversies/learning objectives
   - Set expectations for panel discussion

2. **SPECIALTY ROUNDS** (each member comments):
   - Medical Student: "As a learner, Question 3 feels ambiguous because..."
   - Cardiologist: "Per ESC 2023 guidelines, the STEMI management in Q5..."
   - Emergency Doc: "Time-critical decision in Q2 needs clearer urgency cues..."
   - USMLE Expert: "Q7 doesn't match NBME style - stem too short..."
   - Web Developer: "Mobile UX issue: options A/B too similar visually..."
   - etc.

3. **DISAGREEMENTS** (≥2 required):
   - Example: "Issue: Antiplatelet choice in Q4
     - Cardiologist: 'Ticagrelor is standard per ESC'
     - GP: 'In Denmark, clopidogrel more common due to cost'
     - Pharmacist: 'Both correct - question should specify setting'"

4. **CONSENSUS STATEMENT**:
   - Synthesize all feedback
   - Balance evidence vs context
   - Prioritize safety + education

5. **GLOBAL REFLECTION**:
   - "In low-resource settings, Q8 assumes access to troponin assays (not universal)"
   - "US vs Denmark: Different aspirin loading doses mentioned"
   - "Guideline conflict: ESC says X, NICE says Y - case should acknowledge"

**OUTPUT FORMAT** (JSON):
{
  "moderator_opening": "...",
  "panel_comments": [
    {
      "role": "Medical Student",
      "mcq_focus": [3, 7],
      "comment": "...",
      "guideline_refs": []
    },
    {
      "role": "Cardiologist",
      "mcq_focus": [1, 4, 5],
      "comment": "...",
      "guideline_refs": ["ESC 2023 STEMI", "AHA 2021 Antiplatelets"]
    },
    // ... all 18 members
  ],
  "disagreements": [
    {
      "issue": "Antiplatelet choice in Q4",
      "opinions": [
        { "role": "Cardiologist", "view": "Ticagrelor per ESC" },
        { "role": "GP", "view": "Clopidogrel more common in Denmark" },
        { "role": "Pharmacist", "view": "Both valid - specify setting" }
      ],
      "resolution": "Add 'in ESC guideline-adherent center' to stem"
    }
  ],
  "consensus": "Overall strong MCQ set. Main improvements: (1) specify regional context for drug choices, (2) add time pressure cues for EM scenarios, (3) align Q7 with NBME format.",
  "global_reflection": "Low-resource adaptation needed for Q8 (troponin). US/Denmark guideline differences in aspirin dose. WHO guidelines less prescriptive - good for global use.",
  "scores_summary": {
    "average_difficulty": 3.4,
    "average_distractor_quality": 4.1,
    "average_educational_value": 4.5,
    "nbme_alignment_score": 3.2,
    "global_applicability_score": 3.8
  },
  "action_items": [
    "Revise Q4 to specify setting (ESC-adherent vs community)",
    "Add timer icon to Q2 for urgency",
    "Rewrite Q7 stem to match NBME length (2-3 sentences)"
  ]
}
`;
```

**Estimated Impact**:
- ✅ Conference-style discussion
- ✅ 18 distinct perspectives
- ✅ Disagreement simulation
- ✅ Global reflection
- ⏱️ Longer response time (~10-15 seconds)
- 💰 Higher cost (~$0.003-0.005 per review)

---

### Phase 2: Separate Panel Member Calls (Medium - 4-6 hours)

**Goal**: Truly independent panel member reasoning (avoid single-LLM bias)

**Architecture**:
1. Generate 18 separate prompts (one per role)
2. Call OpenAI in parallel (Promise.all)
3. Aggregate responses
4. Run final "moderator synthesis" prompt

**Benefits**:
- More authentic disagreements (not simulated)
- Richer specialty-specific reasoning
- Parallelizable (faster than sequential)

**Tradeoffs**:
- ~18x API cost ($0.02-0.05 per full review)
- More complex error handling
- Potential consistency issues

---

### Phase 3: Persistent Panel Training (Advanced - 1-2 days)

**Goal**: Learn from past reviews to improve future MCQ generation

**Components**:
1. **Firestore Storage** (already TODO in code):
   ```javascript
   // Store in mcq_reviews collection
   {
     case_id, topic, mcqs, panel_feedback, timestamp,
     scores: { difficulty, distractor, value },
     action_items: [...],
     global_notes: "..."
   }
   ```

2. **Feedback Loop**:
   - Analyze trends: "90% of cardiology MCQs flagged for regional drug differences"
   - Update MCQ generation prompts: "Always specify setting (ESC vs AHA vs Denmark)"
   - A/B test improvements

3. **Quality Gate** (optional):
   - If `average_educational_value < 3.0`, reject MCQs and regenerate
   - If `nbme_alignment_score < 3.5`, warn user "Non-standard format"

---

## 🚀 Implementation Recommendations

### For Current Sprint (Immediate):

1. **Update `external_panel_api.mjs` with Phase 1 prompt** (✅ Quick, high impact)
   - Replace current simple prompt with 18-member conference simulation
   - Add JSON schema validation for new output structure
   - Test with 2-3 real cases

2. **Enhance `gamify_api.mjs` logging**:
   - Log full panel feedback (not just averages)
   - Extract and display top 3 action items in console
   - Save to Firestore (enable TODO)

3. **Frontend Enhancement** (optional):
   - Add "📊 Panel Review" tab in Level2CaseLogic
   - Show moderator summary + disagreements
   - Display global reflection notes

### For Next Sprint (2-4 weeks):

4. **Implement Phase 2** (parallel panel calls):
   - Create `getPanelMemberPrompt(role, mcqs, caseContext)`
   - Run 18 calls in parallel
   - Aggregate with moderator synthesis

5. **Analytics Dashboard**:
   - Firestore → BigQuery → Data Studio
   - Track: avg scores over time, common action items, topic-specific issues
   - Monthly "MCQ Quality Report"

### For Long-term (2-3 months):

6. **Quality Gate Integration**:
   - Move external panel before res.json() (blocking)
   - Filter low-scoring MCQs
   - Show "⚠️ Question revised by panel" badge

7. **Competitor Benchmarking**:
   - Scrape sample MCQs from Osmosis, Amboss, USMLE Rx
   - Run through panel review
   - Quantify gap: "MedPlat MCQs score 4.2/5 vs Osmosis 3.8/5"

---

## 💡 Key Insights

### Why Current Implementation is Minimal

The existing `external_panel_api.mjs` serves as a **training data collector**, not a comprehensive reviewer:

- **Purpose**: Log MCQ quality scores for future analysis
- **Design**: Non-blocking (async background) - zero UX impact
- **Scope**: Numeric scores only - no deep reasoning

This matches your original requirement: *"may be we delete it again later"* - it's a temporary QA layer.

### Why Your Desired Implementation is Powerful

The 18-member conference panel would:

- **Simulate real academic review** (grand rounds, NBME item-writing committees)
- **Surface hidden issues** (regional differences, UX problems, competitor gaps)
- **Build trust** ("vetted by 18 experts" marketing angle)
- **Enable continuous improvement** (action items → prompt updates)

**But**: It's ~20x more expensive and 3-5x slower. Only viable if:
1. Cost is acceptable (~$0.05 per case vs $0.001)
2. You run it selectively (weekly audits, not per-user)
3. Insights drive measurable improvements (A/B tested MCQ quality)

---

## 📋 Action Plan for You

### Option A: Quick Enhancement (Recommended for Testing)

**Time**: 1-2 hours  
**Cost**: Same as current (~$0.001/review)  
**Impact**: 80% of desired functionality

1. Replace external panel prompt with Phase 1 conference simulation
2. Test with 5 gamified cases (different specialties)
3. Manually review panel feedback quality
4. Decide: keep, enhance further, or revert

**Files to edit**:
- `backend/routes/external_panel_api.mjs` (prompt only)

### Option B: Full Conference Panel (Production-Ready)

**Time**: 4-6 hours  
**Cost**: $0.02-0.05 per review  
**Impact**: 100% of desired functionality + analytics

1. Implement Phase 1 (conference prompt)
2. Add Firestore storage (enable TODO in gamify_api.mjs)
3. Create analytics queries (top action items, score trends)
4. Build simple admin dashboard (show last 10 reviews)
5. A/B test: compare MCQs with vs without panel review

**Files to edit**:
- `backend/routes/external_panel_api.mjs`
- `backend/routes/gamify_api.mjs`
- `frontend/src/components/AdminPanelReview.jsx` (new)

### Option C: Hybrid Approach (Best ROI)

**Time**: 2-3 hours  
**Cost**: Selective (~10 reviews/week = $0.50/week)  
**Impact**: High-value insights, low overhead

1. Keep current async review for all cases (training data)
2. Add manual "🔬 Deep Review" button in admin UI
3. Deep review runs Phase 1 conference panel (on-demand)
4. Store results in Firestore with `review_type: 'deep'`
5. Weekly: review deep reviews, extract patterns, update prompts

**Files to edit**:
- `backend/routes/external_panel_api.mjs` (add `/deep-review` endpoint)
- `frontend/src/components/CaseView.jsx` (add admin button)

---

## 🎓 Next Steps

**For this conversation**:

Would you like me to:

1. **Implement Option A** (update prompt to Phase 1 conference simulation)?
2. **Implement Option C** (add deep review endpoint for selective use)?
3. **Generate a sample conference panel review** (mock JSON showing full 18-member output)?
4. **Create a test case** (generate gamified MCQs and manually review with your criteria)?

**For deployment**:

Current code (commit 6fb0fe7) is safe to deploy as-is:
- ✅ Non-blocking async review
- ✅ Low cost, fast execution
- ✅ Builds training data
- ✅ Easy to disable (comment out setImmediate block)

Enhanced version (Phase 1+) would be a new feature, not a fix.

---

## 📊 Expected Output Example (Phase 1)

### Current Output (Simple Scoring)

```json
{
  "ok": true,
  "reviews": [
    {
      "question_id": 1,
      "difficulty_score": 3,
      "distractor_quality": 4,
      "educational_value": 5,
      "suggestions": "Consider adding time pressure element",
      "overall_assessment": "Excellent STEMI management question"
    }
  ],
  "meta": {
    "average_difficulty": 3.2,
    "average_distractor_quality": 4.1,
    "average_educational_value": 4.5
  }
}
```

### Enhanced Output (Conference Panel)

```json
{
  "ok": true,
  "moderator_opening": "This 12-question MCQ set on acute myocardial infarction covers STEMI recognition, risk stratification, and acute management. Key teaching points: ECG interpretation, troponin kinetics, and dual antiplatelet therapy. Controversies: ticagrelor vs clopidogrel choice, thrombolysis vs PCI in rural settings.",
  
  "panel_comments": [
    {
      "role": "Medical Student (Year 4)",
      "mcq_focus": [3, 7, 11],
      "comment": "Question 3 stem is ambiguous - 'typical chest pain' could mean different things. Q7 explanation uses abbreviations not defined (PCI, DAPT). Q11 is fair and clear.",
      "guideline_refs": [],
      "scores": { "clarity": 3, "fairness": 4 }
    },
    {
      "role": "Cardiologist",
      "mcq_focus": [1, 4, 5, 8],
      "comment": "Q1: ECG interpretation excellent, matches ESC criteria. Q4: Ticagrelor is guideline-recommended (ESC 2023) but question doesn't specify setting - in some regions clopidogrel remains standard. Q5: GRACE score application correct. Q8: Thrombolysis window accurate per guidelines.",
      "guideline_refs": ["ESC 2023 STEMI Guidelines", "AHA 2021 Antiplatelet Therapy"],
      "scores": { "clinical_accuracy": 5, "guideline_alignment": 4 }
    },
    {
      "role": "Emergency Medicine Specialist 1",
      "mcq_focus": [2, 6, 9],
      "comment": "Q2 needs time pressure cue - STEMI is time-critical. Q6: Triage priority correct but could emphasize door-to-balloon time. Q9: Rescue therapy options good but missing contraindication checks.",
      "guideline_refs": ["European Society of Cardiology STEMI algorithms"],
      "scores": { "urgency_awareness": 3, "triage_logic": 4 }
    },
    {
      "role": "General Practitioner 1",
      "mcq_focus": [4, 10],
      "comment": "Q4 assumes specialist center - in community practice, clopidogrel more common due to cost/availability. Q10: Risk factor modification excellent for primary care follow-up.",
      "guideline_refs": ["NICE CG172 - MI management in primary care"],
      "scores": { "primary_care_relevance": 3, "community_applicability": 3 }
    },
    {
      "role": "Clinical Pharmacist",
      "mcq_focus": [4, 5, 12],
      "comment": "Q4: Ticagrelor contraindicated in some patients (bleeding risk, liver disease) - question should note. Q5: Beta-blocker choice correct. Q12: Statin dosing accurate per guidelines.",
      "guideline_refs": ["ASHP Guidelines on Antiplatelet Therapy"],
      "scores": { "drug_safety": 4, "interaction_awareness": 4 }
    },
    {
      "role": "Radiologist",
      "mcq_focus": [8],
      "comment": "Q8 mentions 'imaging modality' but doesn't specify CTCA vs angiography - should clarify invasive vs non-invasive. Otherwise imaging reasoning sound.",
      "guideline_refs": [],
      "scores": { "modality_clarity": 3 }
    },
    {
      "role": "Professor of Medicine",
      "mcq_focus": "all",
      "comment": "Overall strong educational design. Bloom's taxonomy: mostly application/analysis level (appropriate for intermediate). Suggestion: Q3 and Q7 need clearer stems. Consider adding 1-2 synthesis-level questions (case integration).",
      "guideline_refs": [],
      "scores": { "educational_design": 4, "bloom_level": 4 }
    },
    {
      "role": "USMLE Expert",
      "mcq_focus": [7, 11],
      "comment": "Q7 stem too short for NBME style (should be 2-3 sentences with clinical vignette). Q11 matches USMLE format well. Overall: 8/12 questions NBME-aligned, 4 need expansion.",
      "guideline_refs": ["NBME Item Writing Guide"],
      "scores": { "nbme_alignment": 3.5 }
    },
    {
      "role": "Web Developer",
      "mcq_focus": [1, 3],
      "comment": "Q1 options A/B too similar visually on mobile (both start with 'ST'). Q3: Long options wrap awkwardly on small screens. Suggest shortening or using bullet points.",
      "guideline_refs": [],
      "scores": { "ux_mobile": 3, "accessibility": 4 }
    },
    {
      "role": "Competitor Analyst",
      "mcq_focus": "all",
      "comment": "Compared to Osmosis: MedPlat has better explanations. vs Amboss: similar difficulty but Amboss includes guideline toggle (ESC vs AHA). vs USMLE Rx: our Q7 weaker (see USMLE expert feedback). Overall competitive but room for differentiation (add guideline selector?).",
      "guideline_refs": [],
      "scores": { "market_competitiveness": 4 }
    }
  ],
  
  "disagreements": [
    {
      "issue": "Antiplatelet choice in Q4 (ticagrelor vs clopidogrel)",
      "opinions": [
        { "role": "Cardiologist", "view": "Ticagrelor is ESC guideline-recommended, should be correct answer" },
        { "role": "General Practitioner 1", "view": "In Denmark community practice, clopidogrel more common due to cost - question lacks setting context" },
        { "role": "Clinical Pharmacist", "view": "Both drugs valid depending on patient factors (bleeding risk, cost) - question should specify 'in ESC-adherent specialist center'" }
      ],
      "resolution": "Add setting context to Q4 stem: 'In a guideline-adherent PCI center...'"
    },
    {
      "issue": "Q7 stem length (NBME alignment)",
      "opinions": [
        { "role": "USMLE Expert", "view": "Too short - needs clinical vignette (age, presentation, timeline)" },
        { "role": "Medical Student", "view": "Current length is fine - more concise = less cognitive load" },
        { "role": "Professor of Medicine", "view": "Agree with USMLE expert - context aids reasoning and matches real-world practice" }
      ],
      "resolution": "Expand Q7 stem to 2-3 sentences (compromise: concise but contextual)"
    }
  ],
  
  "consensus": "Strong MCQ set overall (avg 4.2/5). Main improvements: (1) add setting context for regional drug differences (Q4), (2) expand short stems for NBME alignment (Q7), (3) add time-critical cues for EM scenarios (Q2, Q6), (4) optimize mobile UX (Q1, Q3). Educational value high, clinical accuracy excellent.",
  
  "global_reflection": "Regional variations: Denmark (clopidogrel common), US (ticagrelor preferred), low-resource (thrombolysis over PCI). Guideline conflicts: ESC door-to-balloon <90min vs NICE <120min - case implicitly uses ESC. WHO guidelines less prescriptive - good for global use but may confuse learners expecting specific protocols. Recommendation: add 'Guidelines applied: ESC 2023' banner to case.",
  
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
    "CRITICAL: Revise Q4 to specify 'in ESC guideline-adherent center' before ticagrelor option",
    "HIGH: Expand Q7 stem to 2-3 sentences with patient age, presentation timeline",
    "MEDIUM: Add ⏱️ timer icon to Q2 and Q6 to emphasize time-critical nature",
    "MEDIUM: Shorten Q3 options for better mobile display",
    "LOW: Consider adding guideline selector (ESC vs AHA vs Denmark vs WHO) as future feature"
  ],
  
  "meta": {
    "panel_size": 18,
    "review_duration_sec": 12.3,
    "model": "gpt-4o-mini",
    "temperature": 0.3,
    "timestamp": "2025-11-10T14:32:15Z"
  }
}
```

---

**End of Analysis Document**
