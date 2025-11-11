# 🧭 @copilot: Global Dynamic Development – Phase 3 Integration & Adaptive Reasoning Upgrade

## 🎯 Objective
Implement the full **Phase 3 MedPlat adaptive learning architecture** — combining:
- Dynamic 4-tier guideline cascade  
- Duolingo-style gamification  
- Adaptive feedback loop with weak-area tracking  
- Multi-persona reasoning depth (Medical Student → Specialist)  
- Continuous, research-linked differential reasoning

**Core Mission**: Transform MedPlat into the world's most dynamic, evidence-based, and engaging medical learning ecosystem that scales globally while maintaining the academic quality demonstrated in expert-reviewed cases (Cardiac Syncope A+ baseline).

---

## 🩺 Lessons from Expert Case Review (Cardiac Syncope Baseline)

**Clinical Strengths to Preserve**:
- ✅ Evidence citations (AHA/ACC 2022, ESC 2023 with §sections)
- ✅ Step-wise diagnostic reasoning
- ✅ Realistic distractors with clinical validity
- ✅ Multi-step scenarios (e.g., syncope + structural heart disease)
- ✅ Risk stratification integration (EGSYS, San Francisco Syncope Rule)

**Identified Enhancements Needed**:
1. **Conciseness**: Explanations currently text-heavy → make tier-based, scannable hints
2. **Delayed Scoring**: Numeric % revealed too early → hide until completion, show tier emoji instead
3. **Active Gamification**: Currently passive → add XP, streaks, challenge unlocks
4. **Local Context**: Missing local guidelines → implement 4-tier cascade (see below)
5. **Adaptive Feedback**: Generic responses → personalize based on weak areas

**Reference Template**: Use Cardiac Syncope quality as the gold standard for all future case generation across all specialties and topics. This quality level is achieved through:
- Template-driven prompts with `${topic}`, `${region}`, `${language}` variables
- Dynamic risk scoring (CHA₂DS₂-VASc for AF, EGSYS for syncope, CURB-65 for pneumonia)
- Guideline citations with DOI links
- Multi-domain reasoning (imaging, labs, risk scores, management)

---

## 🌍 Target Users
- **Medical Students** (foundational reasoning, anatomy, and physiology focus)
- **USMLE Students / International Examinees** (evidence application, management logic)
- **Doctors at All Levels** (diagnostic reasoning, risk stratification, and guideline-based decisions)

Each user should experience:
- Adaptive difficulty (Level 1 → 3)
- Duolingo-style progression feedback (non-revealing scores + mastery tiers)
- UpToDate-like reference interface (collapsible evidence cards with direct DOI/URL links)

---

## 🌍 1️⃣ Dynamic Guideline Cascade
Implement in backend (`guidelines_api.mjs`) and frontend (`GuidelinePanel.jsx`).

Priority order:
1. **Local / Institutional** (Sundhedsstyrelsen, NNBV)  
2. **National** (AHA/ACC US, NICE UK)  
3. **Regional / Continental** (ESC Europe, ESMO Oncology, EASL Hepatology)  
4. **International / Global** (WHO, CDC, NIH)

Output JSON:
```json
{
  "tier": "local|national|regional|international",
  "society": "",
  "year": "",
  "title": "",
  "doi_or_url": "",
  "recommendation": "",
  "class": "",
  "level": ""
}
```

Frontend: show collapsible guideline cards (Tailwind + shadcn/ui), ordered local→global with colored badges:
🟢 Local 🔵 National 🟣 Regional ⚪ Global.

**Storage**: Use Firestore collection `guideline_registry` with structure:
```javascript
{
  region: "Denmark",
  topic: "Atrial Fibrillation",
  tiers: {
    local: [{society, year, title, doi_or_url, recommendation}],
    national: [...],
    regional: [...],
    international: [...]
  }
}
```

Backend example:
```js
// backend/routes/guidelines_api.mjs
const GUIDELINE_REGISTRY = {
  Denmark: {
    local: ['Sundhedsstyrelsen', 'NNBV'],
    national: ['Danish Society of Cardiology'],
    regional: ['ESC'],
    international: ['WHO', 'AHA/ACC']
  },
  'United States': {
    local: ['Institution-specific protocols'],
    national: ['AHA/ACC', 'CDC'],
    regional: ['North American societies'],
    international: ['WHO']
  },
  // Add more regions dynamically from Firestore
};

router.post('/api/guidelines/fetch', async (req, res) => {
  const { region, topic } = req.body;
  const cascade = GUIDELINE_REGISTRY[region] || GUIDELINE_REGISTRY['WHO'];
  
  // Query Firestore guideline_registry collection
  const guidelines = await fetchGuidelinesForTopicAndRegion(topic, cascade);
  
  // Return 4-tier structured array
  res.json({ ok: true, guidelines });
});
```

**IMPORTANT**: NO hardcoding of topic-specific guidelines. Use template variables:
- `${topic}` → "Atrial Fibrillation", "Cardiac Syncope", "Pneumonia", etc.
- `${region}` → "Denmark", "United States", "WHO", etc.
- Fetch guidelines dynamically based on these variables

---

## 🎮 Gamified Learning Loop (Duolingo-Style Engagement)

## 🎮 2️⃣ Gamified Learning Loop

Replace static score with **tiered mastery + engagement**:

| Tier | Range     | Label   |
| ---- | --------- | ------- |
| 🟢   | < 50 %    | Learner |
| 🔵   | 50 – 79 % | Skilled |
| 🟣   | ≥ 80 %    | Expert  |

Add:

* XP (+10 per correct, +5 attempt)
* Streak 🔥 tracker + daily goal
* Achievements 🏅 (Perfect Score / 10-Day Streak / Specialty Expert)
* "Challenge Mode" → unlocked after 2 Expert completions
* Motivational prompts ("💪 Great progress — ready for Expert Mode?")

**Firestore Structure**:
```javascript
// users/{uid}/progress
{
  xp: 1250,
  streak: 7,
  dailyGoal: 1,
  totalQuizzes: 23,
  expertCount: 5,
  achievements: ['first_perfect', '10_day_streak']
}
```

**Behavior**:
- After each question: "✅ Correct! +10 XP" (brief, non-intrusive)
   - After quiz: "💪 Great progress — ready for Expert Mode?"
   - Encouraging tone: "You improved diagnostic speed by 12%" (vs "You're slow")

**Frontend Implementation**:
```jsx
// Level2CaseLogic.jsx
const [userProgress, setUserProgress] = useState({ xp: 0, streak: 0 });

const awardXP = (questionCorrect) => {
  const baseXP = questionCorrect ? 10 : 5; // partial credit for attempt
  const streakBonus = userProgress.streak > 5 ? 5 : 0;
  setUserProgress(prev => ({ ...prev, xp: prev.xp + baseXP + streakBonus }));
};

// Display tier instead of percentage
const getTierDisplay = (score) => {
  if (score < 50) return { emoji: '🟢', label: 'Learner', color: 'green' };
  if (score < 80) return { emoji: '🔵', label: 'Skilled', color: 'blue' };
  return { emoji: '🟣', label: 'Expert', color: 'purple' };
};
```

**Hide Numeric Score Until Completion**:
- During quiz: Show "Question 3/12" with progress bar, NO percentage
- After completion: Show tier emoji + label first, then percentage in smaller text
- Review mode: Full breakdown with per-question analysis

---

## 🧠 Adaptive Feedback & Personalization

**Track Weak Areas Per User**:
```javascript
// Firestore: users/{uid}/weak_areas
{
  "Atrial Fibrillation": {
## 🧠 3️⃣ Adaptive Feedback & Personalization

Backend (`gamify_api.mjs`) and Firestore:

```javascript
users/{uid}/weak_areas: {
  "Atrial Fibrillation": {
    "rhythm_control": { missed: 3, total: 5 },
    "anticoagulation_scoring": { missed: 2, total: 4 }
  }
}
```

Behavior:

* 60 % remedial (weak areas) + 40 % new material
* "Focus Cards" → brief evidence tips with DOIs (e.g. ESC §4.2.1 Class I Level A)
* Tone = constructive ("Keep building — review anticoag criteria")

**Focus Cards** (UpToDate-Style Evidence):
```jsx
// Show after wrong answer in review mode
<div className="focus-card bg-blue-50 border-l-4 border-blue-600 p-3">
  <h4 className="font-semibold">💡 Focus Area: Rhythm Control in AF</h4>
  <p>You missed 2/3 questions on this topic. Key concepts:</p>
  <ul className="list-disc ml-6">
    <li>ESC 2023 §5.3: Rhythm control preferred in symptomatic AF</li>
    <li>Avoid Class IC agents in structural heart disease</li>
    <li>Amiodarone = safest but requires monitoring</li>
  </ul>
  <a href="doi:10.1093/eurheartj/ehad194" className="text-blue-600 underline">
    📄 Read ESC 2023 Guideline
  </a>
</div>
```

---

## 🩺 4️⃣ Educational Personas

Auto-adjust explanation style & difficulty:

| Persona           | Focus                  | Style                                    |
| ----------------- | ---------------------- | ---------------------------------------- |
| Medical Student   | Foundational reasoning | Step-by-step, simplified                 |
| USMLE Candidate   | Exam logic             | Differential priority + timed reasoning  |
| Practicing Doctor | Clinical decision      | Evidence-based + risk/benefit discussion |

**Implementation**:
```javascript
// Detect persona from user profile or quiz history
const getPersona = (user) => {
  if (user.profile.role === 'student') return 'Medical Student';
  if (user.quizzesTaken < 10) return 'Medical Student'; // beginner
  if (user.averageScore > 75) return 'Practicing Doctor'; // advanced
  return 'USMLE Candidate'; // intermediate
};

// Adjust explanation depth in prompts (NO hardcoding per topic)
const systemPrompt = `
  You are generating explanations for ${topic} targeted at a ${persona}.
  ${persona === 'Medical Student' ? 'Use simple language, define medical terms.' : ''}
  ${persona === 'Practicing Doctor' ? 'Focus on clinical decision-making and guidelines.' : ''}
`;
```

---

## 💻 5️⃣ Interface Upgrades

* Multi-color animated progress bar (tier-linked)
* "Continue Learning" → loads adaptive next quiz
* "Press AI Key" → fetch local guidelines instantly
* Evidence Cards → UpToDate-style collapsible boxes with DOIs
* Gamification panel → XP, streak, achievements, weak-areas summary

**Evidence Cards** (UpToDate-Style):
```jsx
<div className="evidence-card collapsible">
  <div className="header cursor-pointer" onClick={toggleExpand}>
    <h4>📚 ESC 2023 Atrial Fibrillation Guidelines</h4>
    <span className="badge">Regional • Europe</span>
  </div>
  {expanded && (
    <div className="content">
      <p><strong>§4.2.1 Stroke Prevention (Class I, Level A):</strong></p>
      <p>Anticoagulation recommended for CHA₂DS₂-VASc ≥2 in males, ≥3 in females</p>
      <a href="https://doi.org/10.1093/eurheartj/ehad194" target="_blank">
        📄 View Full Guideline
      </a>
    </div>
  )}
</div>
```

**Keyboard Shortcuts**:
- Press `G` → fetch region-specific local guidelines
- Press `N` → next question
- Press `R` → review mode toggle

---

## 🔬 6️⃣ Clinical Reasoning Upgrade (Continuous Differential Engine)

Apply across all specialties.
Each case must simulate **real-time reasoning**, e.g.:

* *Meningitis vs Delirium → LP or CT first (sensitivity, specificity)*
* *SAH vs Migraine → CT angio vs CT non-contrast vs LP*
* *Pacemaker vs Isoprenaline → indications & contraindications*
* *IBD treatment failure → Step 1, 2, 3 choices + pregnancy modifications*
* *Posterior Cerebral Infarct vs Other stroke patterns*
* *Infection without focus → Spondylodiscitis CT vs MRI; Cauda Equina CT vs MRI*

Add optional "📘 Click for more info" boxes with latest citations (ESC, AHA, NNBV, WHO).

---

## 🧩 Implementation Tasks for Copilot

## 🧩 Implementation Tasks for Copilot

### 1. **Backend (`backend/routes/guidelines_api.mjs`)** — NEW FILE

Create modular `fetchGuidelines()` endpoint:
- Reads user region (from `ip`, `lang`, or explicit selector)
- Queries Firestore `guideline_registry` collection for matching sources
- Returns JSON array in correct 4-tier priority order (local → national → regional → international)
- **NO HARDCODING**: Use `${topic}` and `${region}` template variables

```javascript
export default function guidelinesApi() {
  const router = express.Router();
  
  router.post('/api/guidelines/fetch', async (req, res) => {
    const { region, topic } = req.body;
    const guidelines = await fetchGuidelinesForTopicAndRegion(topic, region);
    res.json({ ok: true, guidelines });
  });
  
  return router;
}
```

### 2. **Frontend (`frontend/src/components/GuidelinePanel.jsx`)** — NEW COMPONENT

Create collapsible guideline display component:
- "⚙️ Load Guidelines" button calls `/api/guidelines/fetch`
- Display collapsible cards (per tier: local → global) with badges
- Show: Title, Society, Year, Recommendation summary, DOI/URL link
- Use Tailwind + shadcn/ui components (`Card`, `Badge`, `Collapsible`)

```jsx
export default function GuidelinePanel({ topic, region }) {
  const [guidelines, setGuidelines] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadGuidelines = async () => {
    setLoading(true);
    const res = await fetch(`${API_BASE}/api/guidelines/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, region })
    });
    const data = await res.json();
    setGuidelines(data.guidelines || []);
    setLoading(false);
  };

  return (
    <div>
      <button onClick={loadGuidelines} className="btn-primary">
        ⚙️ Load Guidelines
      </button>
      {/* Render collapsible cards with 4-tier structure */}
    </div>
  );
}
```

### 3. **Educational Tier Logic (`Level2CaseLogic.jsx`)** — UPDATE EXISTING

Implement tier-based scoring display:
- Replace percentage with tier emoji during quiz
- Hide numeric score until completion
- Show tier labels: 🟢 Learner, 🔵 Skilled, 🟣 Expert

```jsx
const getTierDisplay = (score) => {
  if (score < 50) return { emoji: '🟢', label: 'Learner', color: 'green' };
  if (score < 80) return { emoji: '🔵', label: 'Skilled', color: 'blue' };
  return { emoji: '🟣', label: 'Expert', color: 'purple' };
};

// In results display:
const tier = getTierDisplay(finalScore);
<div className={`text-${tier.color}-600`}>
  <span className="text-4xl">{tier.emoji}</span>
  <p className="text-xl font-semibold">{tier.label}</p>
  <p className="text-sm text-gray-600">{finalScore}% correct</p>
</div>
```

### 4. **Gamification & XP System** — NEW FEATURES

Integrate adaptive motivation loops:
- XP/streak tracking in Firestore `users/{uid}/progress`
- Daily goal tracking with visual streak flame (🔥)
- Achievement badges (First Perfect Score, 10-Day Streak, Specialty Expert)
- Motivational micro-feedback after each question: "+10 XP ✅"
- Challenge Mode unlocks after 2 Expert completions in same specialty

```javascript
// Firestore structure
users/{uid}/progress: {
  xp: 1250,
  streak: 7,
  dailyGoal: 1,
  totalQuizzes: 23,
  expertCount: 5,
  achievements: ['first_perfect', '10_day_streak']
}
```

### 5. **Adaptive Quiz Generation (`backend/routes/adaptive_quiz_api.mjs`)** — NEW FILE

Generate next quiz based on weak areas:
- Analyze user's `weak_areas` from Firestore
- Weight prompts 60% toward missed concepts, 40% new material
- **Maintain Phase 2 quality**: risk scoring, DOI citations, multi-step scenarios
- **NO HARDCODING**: All topic-specific logic uses `${topic}` variables

```javascript
const generateAdaptiveQuiz = async (userId, topic) => {
  const weakAreas = await getWeakAreas(userId, topic);
  const prompt = `
    Generate 12 MCQs for ${topic}.
    Weight 60% toward: ${weakAreas.join(', ')}
    Weight 40% toward: new concepts not previously tested
    Include risk scoring, guideline citations, multi-step scenarios
  `;
  // GPT-4o-mini call with weighted prompt
};
```

### 5. **Data Validation & Quality Assurance**

Ensure each generated case passes `validateReferences()` to confirm:
- NO fabricated hospital names or citation IDs
- All guideline sources exist in `guideline_registry` collection
- At least one valid `local` or `regional` source per case
- Template variables (`${topic}`, `${region}`, `${language}`) used throughout
- Risk scoring appropriate to topic (CHA₂DS₂-VASc for AF, CURB-65 for pneumonia, etc.)

```javascript
// backend/utils/validateReferences.js
export const validateReferences = async (caseData) => {
  const { guidelines, risk_scores } = caseData;
  
  // Check all guideline citations exist in registry
  for (const guide of guidelines) {
    const exists = await checkGuidelineExists(guide.doi || guide.url);
    if (!exists) throw new Error(`Invalid guideline: ${guide.society}`);
  }
  
  // Verify risk score is topic-appropriate
  const validScores = VALID_RISK_SCORES[caseData.topic];
  if (risk_scores && !validScores.includes(risk_scores[0]?.name)) {
    throw new Error(`Invalid risk score for ${caseData.topic}`);
  }
  
  return true;
};
```

---

## 🧪 Validation Tasks (Success Criteria)

Before marking Phase 3 complete, verify:
## 🧩 7️⃣ Validation Checklist (10 Points)

* ✅ Guideline cascade (4 tiers, dynamic)
* ✅ Tier labels (emoji system)
* ✅ XP/streak persistence (Firestore)
* ✅ Adaptive next-quiz generator
* ✅ Educational persona switching
* ✅ Evidence cards with DOIs
* ✅ Keyboard shortcuts (G/N/R)
* ✅ Challenge Mode unlock
* ✅ Latency ≤ Phase 2 (~50 s, 1 API call)
* ✅ No hardcoding (3000 + topics)

---

## ✅ Success Criteria

* Maintain **Cardiac Syncope A+ baseline** (evidence citations, realistic distractors, structured reasoning).
* Achieve **Phase 3 goals**: interactive, adaptive, globally dynamic, cost-efficient.
* Learners experience Duolingo-style motivation + UpToDate-level credibility.
* Users feel "can't-stop-learning" engagement — curiosity driven, AI-supported, professionally accurate.

> Build once, scale globally — MedPlat becomes the world's most dynamic, evidence-based, and engaging medical learning ecosystem.

**User Experience Transformation**:
- Phase 2: "Complete quiz → See score → Done"
- Phase 3: "Complete quiz → Earn XP → Build streak → Unlock challenge → See weak areas → Continue adaptive learning"

From Copenhagen to California, every medical learner sees:
- ✅ Local guidelines first (Sundhedsstyrelsen for Danish, AHA/ACC for US)
- ✅ Personalized weak-area feedback
- ✅ Gamified progression system
- ✅ Evidence-based, tier-appropriate explanations
- ✅ Motivational, non-punitive scoring

**Result**: Professional, globally consistent case output with dynamic panels, guideline cascade, and adaptive learning — all without a single line of hardcoded content.

---

## 🔗 Integration Points

### Existing System Components
- **Backend**: `backend/routes/gamify_direct_api.mjs` (expert panel MCQ generation)
- **Frontend**: `frontend/src/components/Level2CaseLogic.jsx` (adaptive feedback UI)
- **Case Display**: `frontend/src/components/ProfessionalCaseDisplay.jsx` (narrative cases)
- **Guidelines**: Dynamic template variables (`${topic}`, `${region}`, `${language}`)

### Current Expert Panel Features (Phase 2)
✅ Risk scoring integration (CHA₂DS₂-VASc, TIMI, CURB-65, etc.)
✅ DOI citations in explanations (ESC 2023, AHA/ACC 2022)
✅ Adaptive feedback based on performance
✅ Resource-limited scenarios (no MRI, warfarin bridging)
✅ Progress bars and guideline badges
✅ Multi-step clinical scenarios
✅ Imaging pitfall questions

### Next Implementation Steps
1. **Create `backend/routes/guidelines_api.mjs`**
   - Implement hierarchical guideline registry
   - Add region detection and fallback cascade
   - Integrate with existing Firestore collections

2. **Enhance `frontend/src/components/GuidelinePanel.jsx`** (new component)
   - Collapsible cards for each guideline level
   - DOI/URL links with external icon
   - Badge system for guideline authority levels

3. **Extend `Level2CaseLogic.jsx`**
   - Add tier-based scoring display (🟢🔵🟣 instead of percentages)
   - Integrate streak tracking
   - Add motivational micro-feedback after each question

4. **Update `ProfessionalCaseDisplay.jsx`**
   - Add "Load Guidelines" button
   - Display hierarchical guideline sources
   - Show local → global cascade visually

---

## 📐 Code Patterns

### Backend: Dynamic Guideline Fetch
```javascript
// backend/routes/guidelines_api.mjs
import express from 'express';
import { db } from '../firebaseClient.js';

const router = express.Router();

const GUIDELINE_REGISTRY = {
  Denmark: {
    local: ['Sundhedsstyrelsen', 'NNBV'],
    national: ['Danish Society of Cardiology'],
    regional: ['ESC'],
    international: ['WHO', 'AHA/ACC']
  },
  'United States': {
    local: ['Institution-specific'],
    national: ['AHA/ACC', 'CDC'],
    regional: ['North American'],
    international: ['WHO']
  },
  // ... more regions
};

router.post('/api/guidelines/local', async (req, res) => {
  const { region, topic } = req.body;
  const cascade = GUIDELINE_REGISTRY[region] || GUIDELINE_REGISTRY['WHO'];
  
  // Fetch from Firestore or static registry
  const guidelines = await fetchGuidelinesForTopic(topic, cascade);
  
  res.json({ ok: true, guidelines });
});

export default router;
```

### Frontend: Guideline Display Component
```jsx
// frontend/src/components/GuidelinePanel.jsx
import React, { useState } from 'react';

export default function GuidelinePanel({ topic, region }) {
  const [guidelines, setGuidelines] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadGuidelines = async () => {
    setLoading(true);
    const res = await fetch(`${API_BASE}/api/guidelines/local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, region })
    });
    const data = await res.json();
    setGuidelines(data.guidelines || []);
    setLoading(false);
  };

  return (
    <div className="space-y-3">
      <button onClick={loadGuidelines} className="btn-primary">
        ⚙️ Load Guidelines
      </button>
      
      {guidelines.map((guide, idx) => (
        <div key={idx} className="border rounded p-3 bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold">{guide.title}</h4>
              <p className="text-sm text-gray-600">
                {guide.society} • {guide.year}
              </p>
            </div>
            <span className="badge badge-{guide.level}">
              {guide.level}
            </span>
          </div>
          <p className="mt-2 text-sm">{guide.recommendation}</p>
          {guide.doi && (
            <a href={guide.doi} target="_blank" rel="noreferrer" 
               className="text-blue-600 text-xs underline">
              📄 View Reference
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Tier-Based Scoring Display
```jsx
// frontend/src/components/Level2CaseLogic.jsx
const getTierDisplay = (score) => {
  if (score < 50) return { emoji: '🟢', label: 'Learner', color: 'green' };
  if (score < 80) return { emoji: '🔵', label: 'Skilled', color: 'blue' };
  return { emoji: '🟣', label: 'Expert', color: 'purple' };
};

// In results display:
const tier = getTierDisplay(finalScore);
<div className={`text-${tier.color}-600`}>
  <span className="text-4xl">{tier.emoji}</span>
  <p className="text-xl font-semibold">{tier.label}</p>
</div>
```

---

## 🚀 Deployment Integration

This guide aligns with the existing deployment workflow:
- **Script**: `deploy_expert_panel.sh` handles Docker builds and Cloud Run deployments
- **Secrets**: OPENAI_API_KEY, FIREBASE_SERVICE_KEY managed via Secret Manager
- **Environment**: Backend (europe-west1), Frontend (europe-west1)

After implementing guideline features, run:
```bash
bash deploy_expert_panel.sh
```

---

## 📚 Related Documentation
- `docs/EXPERT_PANEL_ENHANCEMENTS.md` — Phase 2 expert panel implementation
- `docs/DYNAMIC_VERIFICATION.md` — Proof of no hardcoding (720 lines)
- `EXPERT_PANEL_SUMMARY.md` — Quick reference for A+ features
- `PROJECT_GUIDE.md` — Master architecture document

---

**Last updated**: November 11, 2025
**Status**: Phase 2 complete (Expert Panel), Phase 3 planned (Dynamic Guidelines)
