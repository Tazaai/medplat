# 🤖 **GitHub Copilot Development Guide – MedPlat Phase 4 (AI Mentor + Curriculum Builder)**

---

## 🧭 **Current Environment**

| Setting          | Value                             |
| ---------------- | --------------------------------- |
| **Branch**       | `feature/phase4-ai-mentor`        |
| **Base Version** | `v3.0.0` (production-stable)      |
| **Next Target**  | `v4.0.0`                          |
| **Duration**     | 8 weeks (2025-11-12 → 2026-01-07) |
| **Governance**   | `docs/COPILOT_MASTER_GUIDE.md`    |
| **Operations**   | `PHASE3_OPERATIONS_GUIDE.md`      |
| **Plan File**    | `PHASE4_PLAN.md`                  |

---

## 🎯 **Copilot's Mission**

1. Keep all Phase 3 functionality working (10/10 regression tests).
2. Implement the **Phase 4 milestones** in the correct order.
3. Follow governance from the **External Development Panel**.
4. Tag and document all progress for transparent review.

---

## 🧩 **Milestone 1 – Infrastructure & Telemetry Foundations**

**Goal:** make the backend self-maintaining and measurable.

### Tasks

1. **Firestore Seeding**

   * Create `backend/setup/seed_guidelines.js`
   * Populate collection `guideline_registry` dynamically.
   * Ensure `POST /api/guidelines/fetch` reads from Firestore when available.

2. **CI/CD Auto-Routing**

   * Add workflow `.github/workflows/auto_traffic.yml`
   * After Cloud Build success → run health check → route 100 % traffic.
   * Roll back if health ≠ 200 OK.

3. **Telemetry Layer**

   * Create `backend/telemetry/telemetry_logger.mjs`
   * Record OpenAI calls, latency (p50/p95/p99), quiz completions.
   * Save to Firestore → collection `telemetry`.
   * Expose summary endpoint `/api/telemetry/stats`.

4. **Regression Check**

   * Run `bash validate_phase3.sh`
   * Must print `10/10 tests passed`.

---

## 🧠 **Milestone 2 – AI Mentor Mode**

**Goal:** personalized adaptive tutoring.

### Backend

* New route: `/api/mentor/session`
* Accepts `{ uid, weakAreas[], language }`
* Returns:

  ```json
  {
    "ok": true,
    "mentorPlan": [
      {"topic": "AF Anticoagulation", "focus": "Decision-score reasoning"},
      {"topic": "Sepsis Management", "focus": "Fluid strategy review"}
    ]
  }
  ```
* Uses Firestore data from `weak_areas` and `user_progress`.

### Frontend

* Component: `MentorPanel.jsx`
* Located under `frontend/src/components/`
* Displays mentor recommendations, study links, and progress summary.

---

## 🎓 **Milestone 3 – Curriculum Builder**

**Goal:** structured learning paths and certifications.

### Tasks

1. Add backend route `/api/curriculum/generate`
2. Accept `{ examType: "USMLE", targetWeeks: 6 }`
3. Generate a progressive topic list via OpenAI + Firestore topics2.
4. Create UI component `CurriculumBuilder.jsx` with:

   * Topic checklist
   * Progress % bar
   * "Export to PDF" button
5. Store generated curriculums in `users/{uid}/curriculum`.

---

## 📊 **Milestone 4 – Analytics & Optimization**

* Add dashboard `/api/analytics/overview` for admin use.
* Visualize telemetry: calls/day, avg latency, user XP growth.
* Integrate with Firestore collection `telemetry`.
* Create `AnalyticsDashboard.jsx` (frontend) for internal panel.

---

## 🔒 **Quality & Governance Rules**

| Rule                      | Copilot Action                                              |
| ------------------------- | ----------------------------------------------------------- |
| **Regression Safety**     | Never change validated Phase 3 endpoints unless tests fail. |
| **Governance Compliance** | Reference External Panel guidance in each PR summary.       |
| **Documentation**         | Update `PHASE4_PLAN.md` after each milestone.               |
| **Validation**            | Run `validate_phase3.sh` + new Phase 4 tests.               |
| **Tagging**               | `v4.0.0-alpha`, `v4.0.0-beta`, then final `v4.0.0`.         |

---

## ⚙️ **Testing & Verification**

1. Local smoke test

   ```bash
   npm run dev
   bash validate_phase3.sh
   ```
2. New endpoint test

   ```bash
   curl -X POST /api/mentor/session
   curl -X POST /api/curriculum/generate
   ```
3. Log validation

   ```bash
   gcloud logging read 'resource.labels.service_name=medplat-backend'
   ```

---

## 🚀 **Deployment Sequence for Phase 4**

1. Push branch → Cloud Build triggers test run.
2. Health check → automatic traffic routing (auto_traffic.yml).
3. Archive logs → `logs/archive/phase4_build_<date>.log`.
4. Run validation + telemetry checks.
5. If 100 % pass → tag `v4.0.0-alpha`.

---

## 🔮 **Expected Output**

> **"Phase 4 Milestone 1 completed — Firestore seeding, telemetry, and auto-traffic routing live.
> All Phase 3 tests passing; AI Mentor development unlocked."**

---

## ✅ **Copilot Summary Checklist**

| Step                      | Status |
| ------------------------- | ------ |
| Branch created            | ✅      |
| Phase 4 plan committed    | ✅      |
| Firestore seeding started | ⬜      |
| CI/CD auto-routing added  | ⬜      |
| Telemetry logger added    | ⬜      |
| AI Mentor backend route   | ⬜      |
| Curriculum Builder        | ⬜      |
| Analytics dashboard       | ⬜      |
| Documentation updated     | ⬜      |

---

## 🧰 **Implementation Patterns**

### Pattern 1: Adding New Routes (Phase 4)

```javascript
// backend/routes/mentor_api.mjs
import express from 'express';
import { db } from '../firebaseClient.js';

const router = express.Router();

router.post('/session', async (req, res) => {
  try {
    const { uid, weakAreas = [], language = 'en' } = req.body;
    
    // Fetch user progress from Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    const progress = userDoc.data()?.progress || {};
    
    // Generate mentor plan based on weak areas
    const mentorPlan = weakAreas.map(area => ({
      topic: area.topic,
      focus: area.focus || 'Comprehensive review',
      resources: area.resources || []
    }));
    
    res.json({ ok: true, mentorPlan });
  } catch (err) {
    console.error('Mentor session error:', err);
    res.status(500).json({ ok: false, error: 'Failed to generate mentor plan' });
  }
});

export default router;
```

### Pattern 2: Telemetry Integration

```javascript
// backend/telemetry/telemetry_logger.mjs
import { db } from '../firebaseClient.js';

export async function logOpenAICall(params) {
  const { model, tokens, latency, cost, endpoint } = params;
  
  await db.collection('telemetry').add({
    type: 'openai_call',
    model,
    tokens,
    latency,
    cost,
    endpoint,
    timestamp: new Date().toISOString()
  });
}

export async function logQuizCompletion(params) {
  const { uid, topic, score, timeSpent } = params;
  
  await db.collection('telemetry').add({
    type: 'quiz_completion',
    uid,
    topic,
    score,
    timeSpent,
    timestamp: new Date().toISOString()
  });
}
```

### Pattern 3: Firestore Seeding Script

```javascript
// backend/setup/seed_guidelines.js
import { db } from '../firebaseClient.js';

const GUIDELINE_DATA = {
  'denmark_af': {
    local: { name: 'Sundhedsstyrelsen', url: '...' },
    national: { name: 'DSC', url: '...' },
    regional: { name: 'ESC', url: '...' },
    international: { name: 'AHA/ACC', url: '...' }
  },
  // ... more topics
};

async function seedGuidelines() {
  const batch = db.batch();
  
  for (const [key, data] of Object.entries(GUIDELINE_DATA)) {
    const ref = db.collection('guideline_registry').doc(key);
    batch.set(ref, data);
  }
  
  await batch.commit();
  console.log('✅ Guidelines seeded successfully');
}

seedGuidelines().catch(console.error);
```

---

## 🎓 **External Panel Integration Points**

When implementing Phase 4 features, consider feedback from:

1. **USMLE Expert** — Curriculum alignment with exam objectives
2. **Professor** — Pedagogical soundness of AI Mentor recommendations
3. **AI Expert** — Model selection and prompt engineering optimization
4. **Student Representative** — UI/UX clarity and engagement patterns
5. **Field Researcher** — Evidence-based guideline integration

---

## 📋 **Pre-Merge Checklist**

Before merging any Phase 4 milestone to `main`:

- [ ] All Phase 3 regression tests pass (`validate_phase3.sh`)
- [ ] New endpoints tested locally and in staging
- [ ] Telemetry confirms no performance degradation
- [ ] Documentation updated (`PHASE4_PLAN.md`, `COPILOT_MASTER_GUIDE.md`)
- [ ] External Panel review completed (if applicable)
- [ ] Version tag prepared (`v4.0.0-alpha`, etc.)
- [ ] Rollback plan documented

---

## 🚨 **Emergency Rollback Procedure**

If Phase 4 deployment causes issues:

```bash
# Immediate rollback to v3.0.0
gcloud run services update-traffic medplat-backend \
  --to-revisions=medplat-backend-01033-scb=100 \
  --region=europe-west1

# Verify health
curl https://medplat-backend-139218747785.europe-west1.run.app/

# Check logs
gcloud logging read 'resource.labels.service_name=medplat-backend' --limit 50
```

---

This guide ensures Copilot can autonomously implement Phase 4 while maintaining the production stability and governance standards established in Phase 3. All work proceeds incrementally with continuous validation.
