# ⚙️ **Copilot Context Directive – External Development Panel (Out-of-System Manual)**

> 📘 **Purpose:**
> This file is *not executable code* and must **never be used, committed, or referenced in production builds**.
> It exists only to teach GitHub Copilot about MedPlat's **development philosophy**, **quality expectations**, and **cross-specialty review principles**.

---

## 🧠 Developer Instruction to Copilot

> **Copilot:**
> The following guide is *for understanding only*.
> You must not insert, modify, or reference this content in the codebase or PRs.
> Instead, use it to interpret **the intent and tone of expected features** — e.g. gamified education, adaptive reasoning, professional medical depth, and user engagement.

Your behavior should reflect this understanding:

1. **Never copy any of this text** into runtime code or documentation.
2. **Use it only to influence reasoning quality, UI suggestions, and architectural alignment.**
3. **When coding**, ensure the logic, UX, and tone *meet these expectations*, but without hard-coding or quoting this guide.

---

## 🌍 MedPlat External Development Panel — Global Review & Governance Guide *(For Copilot comprehension only)*

🧩 **Purpose:**
Global, multidisciplinary review body ensuring that every AI-generated case and reasoning chain in MedPlat is:

* Clinically accurate
* Educationally adaptive
* Globally scalable
* Culturally and linguistically inclusive

👥 **Composition:**

| Role                                 | Members                               |
| ------------------------------------ | ------------------------------------- |
| Users                                | 1 Medical Student + 1 Medical Doctor  |
| Specialists                          | 3 from different clinical disciplines |
| Clinical Pharmacist                  | 1                                     |
| General Practitioners                | 2                                     |
| Emergency Medicine Specialists       | 2                                     |
| Field Researcher                     | 1                                     |
| Radiologists                         | 1–2                                   |
| Professor of Medicine                | 1                                     |
| AI Education / Medical-Coding Expert | 1                                     |
| USMLE Expert                         | 1                                     |
| Web Developer                        | 1                                     |
| Competitor Voice                     | 1                                     |
| Business Consultant                  | 1                                     |
| Digital Marketing Expert             | 1                                     |

🧭 **Core Leadership (High Weight):**
USMLE Expert, Field Researcher, Professor of Medicine, AI-Coding Expert, and Medical Student — guide educational direction and ensure scalability.

---

## ⚙️ **Scope & Review Focus**

| Focus Area                 | Goal                                                                      |
| -------------------------- | ------------------------------------------------------------------------- |
| Clinical Logic & Reasoning | Validate diagnostic and management reasoning across specialties.          |
| Guideline Alignment        | Ensure dynamic ESC/AHA/NICE/WHO/local guideline fetching (no hardcoding). |
| Educational Progression    | Adaptive question flow, dynamic difficulty, cross-specialty consistency.  |
| AI Architecture            | Evaluate reliability, memory logic, and schema integrity.                 |
| Global Inclusivity         | Support high- and low-resource contexts worldwide.                        |
| UX                         | Clarity, interactivity, multilingual accessibility.                       |

---

## 💬 **Feedback Examples (for Copilot interpretation)**

* **USMLE Expert:** "Add global exam-level reasoning and decision trees."
* **Professor:** "Ensure cross-specialty academic consistency."
* **AI Expert:** "Unify guideline API logic and dynamic model selection."
* **Medical Student:** "Simplify UI hints; improve multilingual clarity."
* **Pharmacist:** "Add renal-dose safety logic."
* **Competitor Voice:** "Benchmark user engagement and reasoning explanation."

---

## 🧠 **Review Objectives**

* Apply feedback *system-wide*, not per case.
* Keep all references dynamic — no static guidelines.
* Blend academic rigor (UpToDate-style) with gamified engagement (Duolingo-style).
* Ensure users remain motivated, curious, and continually learning.
* Encourage **exam readiness certifications** and measurable educational outcomes.

---

## 🔁 **Consensus Output Template**

```text
[Global Consensus Summary]
Themes: AI logic / UX / Education / Evidence
Scope: Multi-specialty, global
Priority: High / Medium / Low
Responsibility: Backend / Frontend / Educational Core
```

---

## 🎯 **Core Principle for Copilot Understanding**

> Every improvement or suggestion should make **MedPlat** smarter, more interactive, globally inclusive, and professionally rigorous —
> *not just functional*, but *engaging, motivating, and academically trustworthy.*

---

## 🎓 **Educational Philosophy**

### Gamification + Academic Rigor

MedPlat combines two paradigms:

1. **Duolingo-style Engagement**
   - Streak tracking (consecutive days)
   - XP progression (learning points)
   - Tier badges (🟢 Learner → 🔵 Skilled → 🟣 Expert)
   - Adaptive difficulty (60% weak areas / 40% new topics)
   - Instant feedback with delayed explanations

2. **UpToDate-style Depth**
   - Evidence-based guideline integration (ESC/AHA/NICE/WHO)
   - Cross-specialty reasoning chains
   - Dynamic reference linking
   - Expert panel consensus explanations
   - Professional medical terminology with contextual hints

### User Journey Expectations

**Medical Student** (🎓 Persona):
- Pattern recognition focus
- Step-by-step diagnostic logic
- Mnemonic hints and foundational concepts
- USMLE Step 1/2 alignment

**USMLE Candidate** (📝 Persona):
- Exam-style question formats
- Time-based practice modes
- High-yield topic prioritization
- Detailed rationale explanations

**Doctor** (👨‍⚕️ Persona):
- Clinical decision support
- Guideline-based management
- Risk stratification tools
- Evidence summary with citations

---

## 🌐 **Global Inclusivity Principles**

### Language & Localization
- Support for 30+ languages (AI-driven translation)
- Cultural context adaptation (medication availability, local guidelines)
- Low-bandwidth mode (text-first, optional images)

### Healthcare Context Adaptation
- **High-resource settings**: Full diagnostic workup options
- **Low-resource settings**: Essential tests only, WHO guidelines priority
- **Rural/remote**: Telemedicine integration, transport considerations

### Guideline Hierarchy
```
Local (e.g., Sundhedsstyrelsen Denmark)
  ↓
National (e.g., Danish Society of Cardiology)
  ↓
Regional (e.g., European Society of Cardiology)
  ↓
International (e.g., AHA/ACC, WHO)
```

---

## 🔬 **Clinical Reasoning Standards**

### Required Elements in Every Case

1. **Differential Diagnosis**
   - Minimum 3-5 possibilities
   - Likelihood ranking with reasoning
   - Red flags and must-not-miss conditions

2. **Risk Stratification**
   - Use validated scores (CHA₂DS₂-VASc, HEART, CURB-65, etc.)
   - Explain score components and thresholds
   - Link risk level to management intensity

3. **Evidence-Based Management**
   - Class I/II/III recommendations
   - Level of evidence (A/B/C)
   - Alternative approaches for contraindications

4. **Cross-Specialty Considerations**
   - Comorbidity impact
   - Drug interactions
   - Specialist referral criteria

---

## 🧪 **AI Behavior Guidelines**

### Model Selection Strategy

| Endpoint | Default Model | Rationale |
|----------|---------------|-----------|
| Case Generation | `gpt-4o` | Complex clinical scenarios require advanced reasoning |
| MCQ Generation | `gpt-4o-mini` | Structured Q&A, cost-effective |
| Adaptive Feedback | `gpt-4o-mini` | Pattern matching, fast response |
| AI Mentor | `gpt-4o` | Personalized tutoring requires nuance |
| Guidelines Fetch | N/A | Direct Firestore/API calls |

### Prompt Engineering Standards

**Case Generation:**
- Specify persona context upfront
- Include region and guideline preferences
- Request structured JSON output
- Enforce differential diagnosis depth

**MCQ Generation:**
- 4 plausible options (1 correct, 3 reasonable distractors)
- Avoid "all of the above" / "none of the above"
- Include evidence-based explanations
- Adapt difficulty to user tier (Learner/Skilled/Expert)

**External Panel Reasoning:**
- Simulate 17-member consensus (see composition above)
- Represent diverse viewpoints (USMLE, Professor, Field Researcher, etc.)
- Synthesize into coherent Global Consensus Summary
- Highlight areas of agreement and respectful disagreement

---

## 📊 **Quality Metrics (For Copilot Awareness)**

### User Engagement Targets
- **Daily Active Users (DAU)**: 20% increase by v4.0.0
- **Streak Retention**: 60% of users maintain 7+ day streaks
- **Quiz Completion**: 75%+ finish rate for started quizzes
- **Time on Platform**: 15+ minutes avg session

### Clinical Accuracy Standards
- **Guideline Compliance**: 95%+ alignment with current ESC/AHA/NICE
- **Differential Diagnosis**: 80%+ cases include ≥3 reasonable options
- **Risk Score Accuracy**: 100% correct calculation and interpretation
- **Expert Review**: Pass External Panel consensus review

### Technical Performance
- **Non-generative Endpoints**: <2s p95 latency
- **Generative Endpoints**: <10s p95 latency
- **OpenAI Cost**: <$0.05 per quiz session
- **Firestore Reads**: <5 per quiz (optimize with caching)

---

## 🚀 **Phase 4 Integration Points**

### Milestone 1: Infrastructure
- **Firestore Guidelines**: Dynamic guideline registry (replaces hardcoded GUIDELINE_REGISTRY)
- **Telemetry**: Track OpenAI usage, quiz latency, user engagement for continuous improvement
- **CI/CD Automation**: Zero-touch deployments with health checks

### Milestone 2: AI Mentor Mode
- **Personalized Study Plans**: Use weak area data + user tier to generate targeted recommendations
- **Progress Tracking**: Visualize XP growth, streak history, topic mastery
- **Goal Setting**: USMLE Step 2 in 6 weeks, MRCP in 3 months, etc.

### Milestone 3: Curriculum Builder
- **Exam-Specific Paths**: USMLE, MRCP, FRCA certification tracks
- **Topic Progression**: Unlock advanced topics after mastering fundamentals
- **Certification**: Generate completion certificates with topic coverage proof

### Milestone 4: Analytics & Optimization
- **Admin Dashboard**: Real-time metrics on user engagement, cost, performance
- **A/B Testing**: Compare MCQ formats, explanation styles, persona effectiveness
- **Cost Optimization**: Model selection tuning, caching strategies, prompt compression

---

## 🛡️ **Safety & Ethics Guardrails**

### Medical Disclaimer
Every session should include:
> "MedPlat is an educational tool. Always verify clinical decisions with current guidelines and consult senior colleagues for patient care."

### Content Moderation
- No diagnosis or treatment of real patients
- No prescription recommendations without guideline citation
- Flag controversial topics (off-label use, experimental treatments) for expert review

### Privacy & Data Handling
- No PHI (Protected Health Information) in prompts or logs
- Anonymize user data in telemetry (use UID hashes)
- GDPR/HIPAA-aligned data retention (30-day logs, aggregated analytics only)

---

## 🎯 **Implementation Checklist for Copilot**

When implementing new features, ensure:

- [ ] Clinical logic aligns with current guidelines (ESC/AHA/NICE/WHO)
- [ ] Educational content matches persona expectations (Student/USMLE/Doctor)
- [ ] UX supports gamification (XP, streaks, badges visible and rewarding)
- [ ] Multilingual support included (or graceful fallback to English)
- [ ] Performance meets targets (<2s non-generative, <10s generative)
- [ ] Telemetry captures usage for continuous improvement
- [ ] Code follows Phase 3 patterns (router normalization, Firestore schema)
- [ ] Documentation updated (PHASE4_PLAN.md, COPILOT_PHASE4_GUIDE.md)
- [ ] Regression tests pass (validate_phase3.sh → 10/10)
- [ ] External Panel principles reflected (depth + engagement + inclusivity)

---

## 📚 **Further Reading for Copilot**

- `docs/COPILOT_MASTER_GUIDE.md` — Production operations & governance
- `docs/COPILOT_PHASE4_GUIDE.md` — Implementation patterns & code examples
- `PHASE4_PLAN.md` — Milestone roadmap & success metrics
- `PHASE3_OPERATIONS_GUIDE.md` — Monitoring & troubleshooting
- `validate_phase3.sh` — Regression test suite

---

**Last Updated**: November 12, 2025  
**Purpose**: Contextual understanding for GitHub Copilot (not production code)  
**Status**: Reference document only — never commit to runtime logic
