# 🤖 **GitHub Copilot – Implementation Guide for MedPlat Phase 3**

---

## 🧠 Project Overview

**Project:** MedPlat
**Goal:** Build the world's most adaptive, evidence-based, gamified clinical learning platform.
**Stack:** Node.js (Express) + Firebase + React (Vite) + Cloud Run + OpenAI GPT-4o/mini

Backend routes are served from:
`https://medplat-backend-139218747785.europe-west1.run.app`

Frontend (Vite React) served from:
`https://medplat-frontend-139218747785.europe-west1.run.app`

---

## 🎯 Phase 3 Objectives (Copilot must implement)

### 1️⃣ Dynamic Guideline Cascade API (`/api/guidelines`)

**Goal:** Create a backend route + frontend display system for 4-tier guideline hierarchy.

**Backend file:**
`backend/routes/guidelines_api.mjs`

**Frontend component:**
`frontend/src/components/GuidelinePanel.jsx`

**Logic:**

* Fetch guidelines from Firestore (`guideline_registry`) with structure:

  ```js
  {
    local: [...],
    national: [...],
    regional: [...],
    international: [...]
  }
  ```
* Return as JSON with fields `{ title, class, level, doi_or_url }`.
* Frontend shows collapsible cards:

  * 🟢 Local
  * 🔵 National
  * 🟣 Regional
  * ⚪ International
* Always prioritize local first.
* No hardcoded text — dynamic Firestore read only.

**Example Backend Code:**
```javascript
// backend/routes/guidelines_api.mjs
import express from 'express';
import { db } from '../firebaseClient.js';

const router = express.Router();

router.post('/fetch', async (req, res) => {
  const { topic, region } = req.body;
  
  try {
    // Fetch from Firestore guideline_registry
    const docRef = db.collection('guideline_registry').doc(`${region}_${topic}`);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      // Fallback to global guidelines
      const globalDoc = await db.collection('guideline_registry').doc(`global_${topic}`).get();
      const data = globalDoc.exists ? globalDoc.data() : { tiers: {} };
      return res.json({ ok: true, guidelines: data.tiers || {} });
    }
    
    res.json({ ok: true, guidelines: doc.data().tiers || {} });
  } catch (err) {
    console.error('Guideline fetch error:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch guidelines' });
  }
});

export default router;
```

**Example Frontend Component:**
```jsx
// frontend/src/components/GuidelinePanel.jsx
import React, { useState } from 'react';
import { API_BASE } from '../config';

export default function GuidelinePanel({ topic, region }) {
  const [guidelines, setGuidelines] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({ local: true, national: false, regional: false, international: false });

  const loadGuidelines = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/guidelines/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, region })
      });
      const data = await res.json();
      setGuidelines(data.guidelines);
    } catch (err) {
      console.error('Failed to load guidelines:', err);
    }
    setLoading(false);
  };

  const toggleTier = (tier) => setExpanded({ ...expanded, [tier]: !expanded[tier] });

  const tierConfig = {
    local: { emoji: '🟢', label: 'Local', color: 'green' },
    national: { emoji: '🔵', label: 'National', color: 'blue' },
    regional: { emoji: '🟣', label: 'Regional', color: 'purple' },
    international: { emoji: '⚪', label: 'International', color: 'gray' }
  };

  return (
    <div className="mt-4 p-4 border rounded bg-white shadow">
      <button onClick={loadGuidelines} className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>
        {loading ? 'Loading Guidelines...' : '📚 Load Guidelines'}
      </button>

      {guidelines && (
        <div className="mt-4 space-y-3">
          {Object.entries(tierConfig).map(([tier, config]) => {
            const items = guidelines[tier] || [];
            if (items.length === 0) return null;

            return (
              <div key={tier} className="border rounded">
                <div 
                  className={`p-3 cursor-pointer bg-${config.color}-50 border-l-4 border-${config.color}-500`}
                  onClick={() => toggleTier(tier)}
                >
                  <h4 className="font-semibold">
                    {config.emoji} {config.label} Guidelines ({items.length})
                  </h4>
                </div>
                {expanded[tier] && (
                  <div className="p-3 space-y-2">
                    {items.map((g, idx) => (
                      <div key={idx} className="border-l-2 border-gray-300 pl-3">
                        <p className="font-semibold">{g.title} ({g.year})</p>
                        <p className="text-sm text-gray-700">{g.recommendation}</p>
                        {g.class && <span className="text-xs bg-blue-100 px-2 py-1 rounded">Class {g.class}</span>}
                        {g.level && <span className="text-xs bg-green-100 px-2 py-1 rounded ml-1">Level {g.level}</span>}
                        {g.doi_or_url && (
                          <a href={g.doi_or_url} target="_blank" rel="noreferrer" className="text-blue-600 text-sm block mt-1">
                            📄 View Guideline
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

---

### 2️⃣ Gamified Learning Loop (XP, Streaks, Achievements)

**Files:**
`frontend/src/components/Level2CaseLogic.jsx`
`backend/routes/gamify_api.mjs`

**Tasks:**

* Keep 12 MCQs per case with 3-point scoring system:

  * ✅ Correct = +3
  * ⚠️ Partial = +1
  * ❌ Wrong = +0
* Add XP/streak counters in Firestore under `/users/{uid}/progress`.
* After quiz ends:

  * Show encouragement tier:

    | Tier   | Label   | Emoji |
    | ------ | ------- | ----- |
    | <50%   | Learner | 🟢    |
    | 50–79% | Skilled | 🔵    |
    | ≥80%   | Expert  | 🟣    |
* Display motivational messages:

  * "You're getting closer!"
  * "Great job! Ready to level up to Specialist?"
* Track daily streaks (dates in Firestore).

**Firestore Schema:**
```javascript
users/{uid}/progress: {
  xp: 1250,
  streak: 7,
  lastQuizDate: "2025-11-11",
  dailyGoal: 1,
  totalQuizzes: 23,
  expertCount: 5,
  achievements: ['first_perfect', '10_day_streak', 'specialty_expert_cardiology']
}
```

**Tier Display Logic:**
```jsx
// frontend/src/components/Level2CaseLogic.jsx
const getTierDisplay = (score) => {
  if (score < 50) return { emoji: '🟢', label: 'Learner', color: 'green', message: "You're getting closer! Keep learning!" };
  if (score < 80) return { emoji: '🔵', label: 'Skilled', color: 'blue', message: "Great job! Ready to level up to Specialist?" };
  return { emoji: '🟣', label: 'Expert', color: 'purple', message: "Outstanding! You've mastered this topic! 🎉" };
};

// After quiz completion:
const tier = getTierDisplay(finalScore);
<div className={`text-${tier.color}-600 text-center p-6`}>
  <span className="text-6xl">{tier.emoji}</span>
  <p className="text-2xl font-bold mt-2">{tier.label}</p>
  <p className="text-lg mt-1">{tier.message}</p>
  <p className="text-sm text-gray-600 mt-2">{finalScore}% correct ({correctCount}/12)</p>
</div>
```

---

### 3️⃣ Adaptive Feedback Loop (Remedial Engine)

**Backend file:**
`backend/routes/adaptive_feedback_api.mjs`

**Logic:**

* Store user weak areas:

  ```js
  users/{uid}/weak_areas: {
    "Atrial Fibrillation": { "anticoagulation": { missed:2, total:4 } }
  }
  ```
* Next case generation:
  60% of MCQs → from weak topics
  40% → new random topics
* Add "Focus Card" recommendations in frontend after quiz:

  * Show missed concept + link to relevant guideline paragraph.

**Example Backend:**
```javascript
// backend/routes/adaptive_feedback_api.mjs
import express from 'express';
import { db } from '../firebaseClient.js';

const router = express.Router();

router.post('/update-weak-areas', async (req, res) => {
  const { uid, topic, weakAreas } = req.body;
  
  try {
    const userRef = db.collection('users').doc(uid);
    await userRef.set({
      weak_areas: {
        [topic]: weakAreas
      }
    }, { merge: true });
    
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/next-quiz-topics', async (req, res) => {
  const { uid } = req.body;
  
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    const weakAreas = userDoc.data()?.weak_areas || {};
    
    // Extract topics with >50% miss rate
    const remedialTopics = Object.entries(weakAreas)
      .filter(([topic, areas]) => {
        const totalMissed = Object.values(areas).reduce((sum, a) => sum + a.missed, 0);
        const totalQuestions = Object.values(areas).reduce((sum, a) => sum + a.total, 0);
        return totalMissed / totalQuestions > 0.5;
      })
      .map(([topic]) => topic);
    
    res.json({ ok: true, remedialTopics });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
```

**Focus Card UI:**
```jsx
// In Level2CaseLogic.jsx after quiz review
{weakAreas.length > 0 && (
  <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-600 rounded">
    <h4 className="font-semibold">💡 Focus Areas</h4>
    <p className="text-sm mt-1">You missed questions in these areas:</p>
    <ul className="list-disc ml-6 mt-2">
      {weakAreas.map((area, idx) => (
        <li key={idx}>
          <strong>{area.concept}:</strong> {area.recommendation}
          {area.doi && (
            <a href={area.doi} target="_blank" className="text-blue-600 ml-2">
              📄 Read Guideline
            </a>
          )}
        </li>
      ))}
    </ul>
  </div>
)}
```

---

### 4️⃣ Educational Persona Logic

**Frontend file:**
`frontend/src/components/CaseView.jsx`

**Goal:** Let user choose **persona** → affects reasoning tone.

| Persona         | Description                     | Output style              |
| --------------- | ------------------------------- | ------------------------- |
| Medical Student | Foundational stepwise reasoning | Simplified                |
| USMLE Candidate | Exam-level prioritization       | Timed logic               |
| Doctor          | Guideline-driven                | Evidence and risk balance |

* Save persona in Firestore under `users/{uid}/persona`.
* Pass as `persona` parameter to backend `/api/dialog`.

**Frontend Selector:**
```jsx
// In CaseView.jsx
const [persona, setPersona] = useState('Medical Student');

<select value={persona} onChange={(e) => setPersona(e.target.value)} className="border p-2 rounded">
  <option value="Medical Student">Medical Student</option>
  <option value="USMLE Candidate">USMLE Candidate</option>
  <option value="Doctor">Practicing Doctor</option>
</select>
```

**Backend Integration:**
```javascript
// In gamify_direct_api.mjs
const personaPrompts = {
  'Medical Student': 'Use simple language, define medical terms, provide step-by-step reasoning.',
  'USMLE Candidate': 'Focus on exam-style decision logic with time-efficient reasoning.',
  'Doctor': 'Emphasize guideline-based evidence, risk/benefit analysis, and clinical decision-making.'
};

const prompt = `
You are generating MCQs for ${topic} targeted at a ${persona}.
${personaPrompts[persona]}
...
`;
```

---

### 5️⃣ Clinical Reasoning Engine (Continuous Differential)

**Backend file:**
`backend/routes/gamify_api.mjs` (extend existing logic)

**Goal:** Maintain real-time reasoning hierarchy and adapt difficulty gradually.

**Rules:**

* Step 1–3 → history + risk factor MCQs
* Step 4–8 → diagnostic reasoning
* Step 9–12 → treatment, management, and escalation
* Avoid diagnosis/treatment-type MCQs in first 3 steps.
* Example dynamic reasoning flows:

  * Meningitis vs Delirium → LP vs CT timing
  * SAH vs Migraine → CT Angio vs non-contrast CT
  * Bradycardia → Pacemaker vs Isoprenaline
  * IBD flare → 1st → 3rd line management
  * Infection w/o focus → Spondylodiscitis CT vs MRI

**Implementation:**
```javascript
// In gamify_direct_api.mjs prompt
const reasoningSteps = `
Structure the 12 MCQs as follows:
- Questions 1-3: History, risk factors, initial presentation
- Questions 4-8: Diagnostic workup, differential diagnosis, test interpretation
- Questions 9-12: Treatment decisions, management escalation, follow-up

For each question, ensure:
- Real-time reasoning progression (no jumping to diagnosis in Q1)
- Evidence-based distractors with clinical validity
- Citations from ${region} guidelines when applicable
`;
```

---

### 6️⃣ External Development Panel Integration

**File:**
`docs/COPILOT_GUIDE.md` (already inserted, Copilot references it)

**Purpose:**
Global multidisciplinary governance review for systemic improvement.

**Ensure Copilot respects:**

* Review feedback applies globally (not per case).
* Dynamic guideline logic (no hardcoding).
* Maintain academic tone and region-aware localization.

Panel roles include:
Medical Student, Doctor, Professors, Radiologists, Pharmacist, USMLE Expert, AI/Coding Expert, etc.

---

### 7️⃣ Validation Checklist (Auto-Test After Build)

**Copilot must verify these before finalizing build:**

| Check | Status Criteria                                   |
| ----- | ------------------------------------------------- |
| ✅ 1   | 4-tier guideline cascade renders dynamically      |
| ✅ 2   | XP and streak system updates Firestore            |
| ✅ 3   | Adaptive feedback (60/40) correctly triggers      |
| ✅ 4   | Personas switch output tone                       |
| ✅ 5   | MCQs follow reasoning order (history → treatment) |
| ✅ 6   | Firestore schema matches spec                     |
| ✅ 7   | UI responsive with <50 s generation time          |
| ✅ 8   | 1 API call per case                               |
| ✅ 9   | JSON only, no hardcoding                          |
| ✅ 10  | Cardiac Syncope A+ quality baseline maintained    |

---

## 🧩 Development Sequence (Copilot Order)

1. Create `/backend/routes/guidelines_api.mjs`
2. Update `/backend/routes/gamify_api.mjs` with reasoning order + expert MCQs
3. Add `/backend/routes/adaptive_feedback_api.mjs`
4. Update frontend:

   * `CaseView.jsx` → persona + model selector + gamify toggle
   * `Level2CaseLogic.jsx` → XP/streak logic + end-summary
   * `GuidelinePanel.jsx` → collapsible guideline cards
5. Update Firestore schema if missing: `guideline_registry`, `user_progress`, `weak_areas`
6. Run full test:

   ```bash
   npm run dev
   ```

   Confirm all routes active: `/api/guidelines`, `/api/gamify`, `/api/adaptive-feedback`.

---

## 🧾 Deployment Notes

* Environment variable: `OPENAI_API_KEY` → loaded from Secret Manager
* Cloud Run must use dynamic port: `process.env.PORT || 8080`
* Frontend builds with Vite (`npm run build`)
* Default model: `gpt-4o-mini`, upgradeable per user

**Deploy Script:**
```bash
bash deploy_expert_panel.sh
```

**CI/CD Integration:**
See `.github/workflows/deploy.yml` for automated deployment pipeline.

---

## 🏁 Final Validation Summary

Once Copilot finishes:

* Validate all 10 checklist points.
* Confirm guideline cascade, adaptive loop, and streak logic in UI.
* Push to GitHub → trigger Cloud Build → auto-deploy Cloud Run backend + frontend.

---

### 🔔 Post-Deploy Verification

Check after deployment:

```bash
curl -s https://medplat-backend-139218747785.europe-west1.run.app/api/guidelines/fetch \
  -H "Content-Type: application/json" \
  -d '{"topic":"Atrial Fibrillation","region":"Denmark"}' | jq .

curl -s https://medplat-backend-139218747785.europe-west1.run.app/api/gamify-direct \
  -H "Content-Type: application/json" \
  -d '{"topic":"Cardiac Syncope","region":"United States","language":"en","level":"intermediate","model":"gpt-4o-mini"}' | jq .
```

Frontend: open → test gamified quiz + XP/streak updates.

---

## 🌍 Vision Tagline

> **Build once, scale globally.**
> MedPlat will unite Duolingo's engagement with UpToDate's precision —
> A world-class adaptive clinical reasoning ecosystem for every learner.

---

## 📚 Related Documentation

* `docs/COPILOT_GUIDE.md` — Complete Phase 3 strategic vision and principles
* `docs/EXPERT_PANEL_ENHANCEMENTS.md` — Phase 2 implementation details
* `PROJECT_GUIDE.md` — Master architecture document
* `.github/copilot-instructions.md` — Copilot-specific development rules

---

**Last updated**: November 11, 2025
**Status**: Phase 2 deployed (Production), Phase 3 implementation guide ready
