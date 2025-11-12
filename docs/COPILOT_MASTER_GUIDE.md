# 🤖 GitHub Copilot Master Instruction — MedPlat v3 (Post-Phase 3 Deployment)

**Last Updated:** 2025-11-12  
**Version:** v3.0.0  
**Status:** ✅ LIVE IN PRODUCTION

---

## 🧭 Project State

**Current Deployment:**
- **Version:** v3.0.0 (tagged)
- **Status:** ✅ Live in Production
- **Backend:** `medplat-backend-01033-scb` (100% traffic)
- **Frontend:** `medplat-frontend-00346-55t`
- **Validation:** 10/10 tests passed
- **Region:** europe-west1
- **Base URL:** https://medplat-backend-139218747785.europe-west1.run.app

**Operational Endpoints:**
- `/api/guidelines/fetch` — 4-tier guideline cascade
- `/api/adaptive-feedback/next-quiz-topics` — 60/40 quiz selection
- `/api/adaptive-feedback/update-progress` — XP/streak tracking
- `/api/adaptive-feedback/update-weak-areas` — Remediation
- `/api/gamify-direct` — Persona-enhanced MCQ generation
- `/api/topics` — Medical topics registry

---

## 🎯 Copilot Mission

### Primary Responsibilities
1. **Maintain production stability** (Phase 3 code & endpoints)
2. **Apply External Development Panel guidance** to future upgrades
3. **Prepare for Phase 4** (AI Mentor Mode + Curriculum Builder)
4. **Ensure zero-downtime deployments** with proper health checks
5. **Preserve clinical quality** and guideline accuracy

---

## 🧩 Core Operational Guidelines

### 1️⃣ Continuous Verification Protocol

Copilot must automatically verify production health:

```bash
# Health check
curl -s https://medplat-backend-139218747785.europe-west1.run.app/

# Guidelines API (4-tier cascade)
curl -s https://medplat-backend-139218747785.europe-west1.run.app/api/guidelines/fetch \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"topic":"Atrial Fibrillation","region":"Denmark"}'

# Adaptive feedback (60/40 logic)
curl -s https://medplat-backend-139218747785.europe-west1.run.app/api/adaptive-feedback/next-quiz-topics \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"uid":"healthcheck"}'
```

**Expected Results:**
- Health: `{"status":"MedPlat OK","pid":1}`
- Guidelines: HTTP 200 + JSON with `["local","national","regional","international"]`
- Adaptive: HTTP 200 + JSON with `{"remedial":8,"new":4}`

**If Verification Fails:**
1. Read Cloud Run logs: `gcloud logging read ... "guidelines" OR "adaptive"`
2. Check route mounting: `gcloud logging read ... "Mounted"`
3. Verify traffic routing: `gcloud run services describe medplat-backend`
4. Review `backend/index.js` router normalization logic
5. Check Firestore connectivity in `backend/firebaseClient.js`

---

### 2️⃣ Phase 3 Preservation Rules

**Critical Files (DO NOT MODIFY without testing):**
- `backend/routes/guidelines_api.mjs` (172 lines)
- `backend/routes/adaptive_feedback_api.mjs` (123 lines)
- `backend/routes/gamify_direct_api.mjs` (persona support)
- `backend/index.js` (router normalization fix)

**Router Normalization Pattern (MUST PRESERVE):**
```javascript
function normalizeRouter(mod) {
  try {
    const info = { hasModule: !!mod, keys: mod ? Object.keys(mod) : [], hasDefault: !!(mod && mod.default) };
    let router = mod && (mod.default || mod);
    // Check .stack BEFORE calling as function (Express routers are also functions)
    if (router && Array.isArray(router.stack)) return router;
    // If module exported a factory, call it to obtain the router
    if (typeof router === 'function') router = router();
    // Check again after calling factory
    if (router && Array.isArray(router.stack)) return router;
    console.warn('normalizeRouter: unexpected module shape', info, 'routerType', typeof router);
    return null;
  } catch (e) {
    console.error('normalizeRouter: error while normalizing module', e && e.stack ? e.stack : e);
    return null;
  }
}
```

**Firestore Schema (PRESERVE):**
```
users/{uid}/
  ├── progress/
  │   ├── xp: number
  │   ├── streak: number
  │   ├── tier: "Learner" | "Skilled" | "Expert"
  │   └── last_updated: timestamp
  └── weak_areas/{topic}/
      └── concepts: string[]

topics2/{topic_id}/
  ├── topic: string
  ├── category: string
  ├── difficulty: string
  └── keywords: string[]

guideline_registry/{region}/{topic}/  (Phase 4)
  ├── local: array
  ├── national: array
  ├── regional: array
  └── international: array
```

---

### 3️⃣ External Development Panel Governance

**Reference Document:** `docs/EXTERNAL_PANEL_ENHANCEMENT_PLAN.md`

#### 🌍 Purpose
System-wide, cross-disciplinary review of MedPlat's AI logic, UX, and clinical quality — **not per-case**, but **global improvements**.

#### 👥 Panel Composition (17 Members)

**Core Leadership Team (5):**
- USMLE Expert — Exam logic and question quality
- Professor of Medicine — Academic depth and teaching pedagogy
- AI/Coding Expert — Technical architecture and AI safety
- Medical Student — User experience and learning curve
- Field Researcher — Real-world clinical validation

**Clinical Specialists (9):**
- 3 Specialists (various disciplines: Cardiology, Neurology, Emergency)
- 1 Pharmacist — Drug interactions and dosing
- 2 General Practitioners — Primary care perspective
- 2 Emergency Specialists — Acute management protocols
- 1-2 Radiologists — Imaging interpretation

**Strategic Advisory (3):**
- 1 Competitor Voice — Benchmark against UpToDate, AMBOSS, Medscape
- 1 Business Consultant — Market positioning and sustainability
- 1 Digital Marketing Expert — User acquisition and engagement
- 1 Web Developer — Frontend UX and accessibility

#### ⚙️ Scope of Review

**What Panel Evaluates:**
1. **Clinical Logic:** Management reasoning, guideline alignment
2. **AI Architecture:** Prompt engineering, model selection, memory use
3. **Educational Progression:** Adaptive difficulty, learning curves
4. **Global Inclusivity:** Language support, regional guidelines
5. **UX Clarity:** Navigation, feedback loops, accessibility
6. **Evidence Quality:** DOI citations, guideline freshness

**What Panel Does NOT Evaluate:**
- Individual case content (handled by internal Professor V3 panel)
- Day-to-day bug fixes (handled by DevOps)
- Marketing campaigns (separate team)

#### 💬 Feedback Template

```markdown
**[Role]:** [Medical Student | USMLE Expert | Professor | etc.]

**Recommendation:** [Short systemic improvement]

**Impact Area:** [Backend | Frontend | Educational Core | AI Logic]

**Priority:** [High | Medium | Low]

**Rationale:** [Why this improves MedPlat globally]

**Implementation Scope:** [1-2 sentences on what needs to change]
```

#### 🔁 Consensus Output Format

After each review cycle, generate:

```markdown
# Global Consensus Summary — [Date]

## Themes Identified
1. [Theme 1: e.g., "Adaptive difficulty needs finer granularity"]
2. [Theme 2: e.g., "Guideline freshness verification needed"]
3. [Theme 3: e.g., "UI feedback loops too subtle"]

## Scope of Effect
- Backend: [X% of recommendations]
- Frontend: [Y% of recommendations]
- Educational Core: [Z% of recommendations]

## Implementation Priority
- **High Priority (Next Sprint):**
  - [Action item 1]
  - [Action item 2]
- **Medium Priority (Next Quarter):**
  - [Action item 3]
- **Low Priority (Future Consideration):**
  - [Action item 4]

## Assigned Responsibility
- AI/Coding Expert: [Technical implementations]
- Professor of Medicine: [Clinical content review]
- Web Developer: [UX improvements]
```

#### 🎯 Guiding Principle

**Every recommendation must improve MedPlat globally, not just a single topic.**

- ✅ DO: "Adaptive feedback should track concept-level weaknesses across all topics"
- ❌ DON'T: "Atrial Fibrillation case needs better warfarin explanation"

Keep guidelines **dynamic** (no static text). Preserve **academic depth** and **professional rigor**.

---

### 4️⃣ AI Behavior Guidelines

#### Model Selection Strategy
- **Default:** `gpt-4o-mini` (cost-effective, fast, sufficient for MCQs)
- **Fallback:** `gpt-4o` (complex cases, multi-step reasoning)
- **Never Use:** Deprecated models (gpt-3.5-turbo)

#### Persona-Specific Tone

| Persona              | Clinical Focus       | Tone & Style                    | Example Prompt Modifier                |
| -------------------- | -------------------- | ------------------------------- | -------------------------------------- |
| 🎓 Medical Student   | Foundational         | Step-by-step, simplified        | "Explain as if teaching 2nd year med"  |
| 📝 USMLE Candidate   | Exam logic           | Concise, "next best step"       | "USMLE Step 2 CK style question"       |
| 👨‍⚕️ Practicing Doctor | Professional context | Guideline-driven, evidence-based | "Include ESC/AHA guideline references" |

#### Reasoning Order Enforcement
- **Q1-3 (History):** Patient presentation, risk factors, history
- **Q4-8 (Diagnosis):** Differential, investigations, ECG/imaging
- **Q9-12 (Treatment):** Management, medications, follow-up

#### Error Handling
- Graceful fallback to static guidelines when Firestore unavailable
- Log OpenAI rate limit errors without blocking user flow
- Return partial results with warnings rather than hard failures

---

### 5️⃣ Gamification Enhancement Vision

**Inspiration Sources:**
- **Duolingo:** Daily streaks, XP rewards, tier progression, micro-celebrations
- **UpToDate:** Evidence depth, guideline integration, clinical utility

**Target Experience:**
1. **Positive AI Feedback Loops:** Every correct answer reinforces learning with encouragement
2. **Un-stoppable Feeling:** Small wins accumulate into big achievements
3. **Exam Preparation Modules:** USMLE Step 2 CK, PANCE, MRCGP readiness certificates
4. **Social Learning (Phase 4):** Leaderboards, collaborative cases, mentor matching

**Current Implementation (Phase 3):**
- XP: +10 per correct answer
- Streaks: Reset on wrong answer (consider grace period in Phase 4)
- Tiers: 🟢 Learner (<50%), 🔵 Skilled (50-79%), 🟣 Expert (80%+)

**Phase 4 Enhancements:**
- Badges: "Cardiology Master", "ER Specialist", "Diagnostician"
- Challenges: Timed quizzes, case competitions
- AI Mentor: Personalized study plans based on weak areas

---

### 6️⃣ Post-Deployment Operations

#### Monitoring Commands

**Check Service Health:**
```bash
gcloud run services describe medplat-backend \
  --region=europe-west1 \
  --project=medplat-458911 \
  --format="yaml(status.conditions,status.traffic)"
```

**View Recent Logs:**
```bash
gcloud logging read \
  'resource.type=cloud_run_revision AND resource.labels.service_name=medplat-backend' \
  --limit=50 \
  --project=medplat-458911 \
  --format="table(timestamp,severity,textPayload)"
```

**Monitor Route Mounting:**
```bash
gcloud logging read \
  'textPayload:"Mounted"' \
  --limit=20 \
  --project=medplat-458911 \
  --freshness=10m
```

**Check for Errors:**
```bash
gcloud logging read \
  'severity>=ERROR' \
  --limit=20 \
  --project=medplat-458911 \
  --freshness=1h
```

#### Deployment Workflow

**Standard Deployment (Code Changes):**
```bash
# 1. Run local validation
bash validate_phase3.sh

# 2. Commit changes
git add .
git commit -m "Description of changes"
git push origin main

# 3. Build backend
cd backend
gcloud builds submit --tag=gcr.io/medplat-458911/medplat-backend:latest --project=medplat-458911

# 4. Deploy with secrets
gcloud run deploy medplat-backend \
  --image=gcr.io/medplat-458911/medplat-backend:latest \
  --region=europe-west1 \
  --platform=managed \
  --allow-unauthenticated \
  --set-secrets=OPENAI_API_KEY=medplat-openai-key:latest,FIREBASE_SERVICE_KEY=medplat-firebase-key:latest \
  --project=medplat-458911

# 5. Route traffic (manual step required until Phase 4 CI/CD)
gcloud run services update-traffic medplat-backend \
  --to-latest \
  --region=europe-west1 \
  --project=medplat-458911

# 6. Verify deployment
curl -s https://medplat-backend-139218747785.europe-west1.run.app/
bash validate_phase3.sh
```

**Rollback Procedure:**
```bash
# List recent revisions
gcloud run revisions list \
  --service=medplat-backend \
  --region=europe-west1 \
  --project=medplat-458911

# Route to previous stable revision
gcloud run services update-traffic medplat-backend \
  --to-revisions=medplat-backend-XXXXX-YYY=100 \
  --region=europe-west1 \
  --project=medplat-458911
```

#### Log Archiving

```bash
# Archive deployment logs
mkdir -p logs/archive
cp /tmp/build_fix.log logs/archive/phase3_build_$(date +%F).log

# Note: logs/ is gitignored, store critical logs separately
```

#### Version Tagging

```bash
# Tag new releases
git tag -a v3.1.0 -m "Phase 3.1: [Feature description]"
git push origin v3.1.0
```

---

### 7️⃣ Phase 4 Preparation Roadmap

#### 1. Firestore Guidelines Seeding

**Objective:** Move static GUIDELINE_REGISTRY to Firestore for dynamic updates

**Implementation:**
```javascript
// backend/scripts/seed_guidelines.js
import { db } from '../firebaseClient.js';

async function seedGuidelines() {
  const guidelines = {
    Denmark: { /* ... */ },
    'United States': { /* ... */ },
    global: { /* ... */ }
  };

  for (const [region, topics] of Object.entries(guidelines)) {
    for (const [topic, tiers] of Object.entries(topics)) {
      await db.collection('guideline_registry')
        .doc(`${region}_${topic}`)
        .set({ region, topic, ...tiers });
    }
  }
}
```

**Benefits:**
- Update guidelines without code deployment
- Version control for guideline changes
- Regional admins can manage local guidelines

#### 2. CI/CD Auto-Traffic Routing

**Objective:** Eliminate manual traffic routing step

**Workflow Enhancement (.github/workflows/deploy.yml):**
```yaml
- name: Health Check
  run: |
    RESPONSE=$(curl -s ${{ secrets.BACKEND_URL }}/)
    if [[ $(echo $RESPONSE | jq -r '.status') != "MedPlat OK" ]]; then
      echo "Health check failed"
      exit 1
    fi

- name: Auto-Route Traffic
  run: |
    gcloud run services update-traffic medplat-backend \
      --to-latest \
      --region=europe-west1 \
      --project=${{ secrets.GCP_PROJECT }}
```

**Safety Measures:**
- Canary deployment: 10% → 50% → 100% traffic split
- Automatic rollback on error rate spike
- Slack/Discord notifications

#### 3. Telemetry & Analytics

**Metrics to Track:**
- OpenAI API usage (requests, tokens, costs)
- Quiz latency (p50, p95, p99)
- User engagement (XP gained, streaks maintained)
- Weak area remediation effectiveness

**Implementation:**
```javascript
// backend/utils/metrics.js
export function trackOpenAIUsage(model, tokens, latency) {
  // Send to Cloud Monitoring or analytics platform
}

export function trackQuizCompletion(uid, score, timeSpent) {
  // Store in Firestore analytics collection
}
```

#### 4. AI Mentor Mode

**Concept:** Personalized AI tutor that:
- Reviews your weak areas after each quiz
- Suggests targeted study plans
- Explains concepts in your preferred style
- Adjusts difficulty based on performance

**Endpoint:** `POST /api/ai-mentor/session`

**Example Interaction:**
```json
{
  "uid": "user_12345",
  "weak_areas": ["ECG interpretation", "Heart failure management"],
  "recent_performance": { "accuracy": 65, "streak": 3 },
  "preferred_style": "Medical Student"
}
```

**Response:**
```json
{
  "mentor_message": "I noticed you're struggling with ECG interpretation. Let's focus on bundle branch blocks today...",
  "recommended_topics": ["LBBB", "RBBB", "Axis deviation"],
  "study_plan": [
    {"day": 1, "topic": "Normal ECG intervals", "duration": "15 min"},
    {"day": 2, "topic": "LBBB patterns", "duration": "20 min"}
  ]
}
```

#### 5. Curriculum Builder

**Concept:** Create custom learning paths for:
- USMLE Step 2 CK preparation (8-week plan)
- EM residency board prep (12-week plan)
- General practice recertification (4-week plan)

**Features:**
- Drag-and-drop topic sequencing
- Spaced repetition scheduling
- Progress tracking with certificates
- Collaborative study groups

---

## ✅ Copilot Completion Checklist

**Phase 3 Deployment:**
- [x] All 7 implementation tasks completed
- [x] Router normalization bug fixed (commit 0371ab8)
- [x] Deployment validated (10/10 tests)
- [x] v3.0.0 tag pushed to GitHub
- [x] Logs archived to `logs/archive/`
- [x] PHASE3_DEPLOYMENT_REPORT.md created
- [x] PHASE3_OPERATIONS_GUIDE.md created
- [x] Backend serving 100% traffic on revision 01033-scb
- [x] Frontend deployed to revision 00346-55t

**Documentation:**
- [x] External Panel Guide referenced (`docs/EXTERNAL_PANEL_ENHANCEMENT_PLAN.md`)
- [x] Copilot Master Guide created (this file)
- [x] Operations guide includes troubleshooting procedures
- [x] Validation script (`validate_phase3.sh`) committed

**Production Readiness:**
- [x] Health check endpoint responsive
- [x] All Phase 3 endpoints operational
- [x] Firestore integration working
- [x] OpenAI API calls successful
- [x] Error handling graceful
- [x] Traffic routing confirmed

**Next Phase:**
- [ ] Firestore guidelines seeding
- [ ] CI/CD auto-traffic routing
- [ ] Telemetry and analytics setup
- [ ] AI Mentor Mode design
- [ ] Curriculum Builder prototype

---

## 🏁 Expected Copilot Report

Upon successful verification, Copilot should output:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ MedPlat v3.0.0 — Phase 3 Production Verified
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: LIVE IN PRODUCTION
Backend: medplat-backend-01033-scb (100% traffic)
Health: ✅ {"status":"MedPlat OK","pid":1}

Phase 3 Features:
  ✅ 4-tier guideline cascade
  ✅ Adaptive 60/40 quiz generator
  ✅ XP/streak/tier progression
  ✅ Weak area remediation
  ✅ Persona-enhanced MCQ generation

Governance: External Development Panel active
Next Phase: Phase 4 (AI Mentor Mode + Curriculum Builder)

Ready to initiate Phase 4 development.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📚 Reference Documentation

### Primary Documents
- **Strategic Vision:** `docs/COPILOT_GUIDE.md` (695 lines)
- **Implementation Guide:** `docs/COPILOT_IMPLEMENTATION_GUIDE.md` (539 lines)
- **External Panel Guide:** `docs/EXTERNAL_PANEL_ENHANCEMENT_PLAN.md`
- **Operations Manual:** `PHASE3_OPERATIONS_GUIDE.md`
- **Deployment Report:** `PHASE3_DEPLOYMENT_REPORT.md`

### Quick References
- **Validation Script:** `bash validate_phase3.sh`
- **Project Overview:** `PROJECT_GUIDE.md`
- **Quick Reference:** `PHASE3_QUICK_REFERENCE.md`

### Critical Files
- **Router Normalization:** `backend/index.js` (lines 84-99)
- **Guidelines API:** `backend/routes/guidelines_api.mjs`
- **Adaptive Feedback:** `backend/routes/adaptive_feedback_api.mjs`
- **Gamify Direct:** `backend/routes/gamify_direct_api.mjs`
- **Firebase Client:** `backend/firebaseClient.js`

---

## 🆘 Emergency Contacts

**Production Issues:**
- Check: `PHASE3_OPERATIONS_GUIDE.md` → Troubleshooting section
- Logs: `gcloud logging read ... severity>=ERROR`
- Rollback: See "Rollback Procedure" above

**Feature Requests:**
- External Panel: Submit via feedback template
- Internal improvements: GitHub Issues

**Support Channels:**
- GitHub: https://github.com/Tazaai/medplat/issues
- Project Owner: @Tazaai

---

**Last Reviewed:** 2025-11-12  
**Next Review:** 2025-12-12 (monthly)  
**Maintained By:** AI/Coding Expert + DevOps Team

---

*This document serves as the single source of truth for GitHub Copilot and AI agents working on MedPlat. All changes to architecture, deployment procedures, or governance must be reflected here.*
