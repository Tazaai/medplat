# 🧭 @copilot: Phase 3 – Global Adaptive Learning + Guideline Cascade (Refined from Clinical Review)

## 🎯 Objective
Transform **MedPlat** into a **globally adaptive, guideline-driven, gamified tutor** that maintains the academic quality demonstrated in expert-reviewed cases (Cardiac Syncope baseline), while extending interactivity, personalization, and dynamic guideline sourcing across all specialties.

**Core Mission**: You are implementing **dynamic, region-aware guideline retrieval** and **tiered educational delivery** for a broad medical audience — from medical students to practicing physicians — ensuring NO hardcoding and 100% global scalability.

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

## ⚙️ Dynamic Guideline Hierarchy (4-Tier Cascade)

**Critical**: Implement full 4-tier guideline retrieval logic with automatic fallback:

1️⃣ **Local / Institutional** → (e.g. `Sundhedsstyrelsen`, `NNBV.dk`, hospital protocols)  
2️⃣ **National** → (e.g. Danish, UK NHS, US AHA/ACC)  
3️⃣ **Regional / Continental** → (e.g. ESC, ESMO, EASL, NICE Europe)  
4️⃣ **International / Global** → (e.g. WHO, CDC, NIH, ISICEM)

**Cascade Logic**:
- Always start local → climb upward only if unavailable
- Each citation must include structured metadata:

```json
{
  "tier": "local|national|regional|international",
  "society": "ESC",
  "year": 2023,
  "title": "Atrial Fibrillation Management Guidelines",
  "url_or_doi": "doi:10.1093/eurheartj/ehad194",
  "recommendation": "Anticoagulation for CHA₂DS₂-VASc ≥2",
  "class": "I",
  "level": "A"
}
```

**Storage**: Use Firestore collection `guideline_registry` with structure:
```javascript
{
  region: "Denmark",
  topic: "Atrial Fibrillation",
  tiers: {
    local: [{society, year, title, url_or_doi, recommendation}],
    national: [...],
    regional: [...],
    international: [...]
  }
}
```

**Rendering**: Collapsible cards (Tailwind + shadcn/ui) ordered local→global with visual hierarchy:
- 📌 Local (green badge)
- 🇩🇰 National (blue badge)
- 🇪🇺 Regional (purple badge)
- 🌍 International (gray badge)

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

**Replace static scoring with tier-based mastery + engagement metrics**:

| Tier | Score Range | Label   | Emoji | Color  |
|------|-------------|---------|-------|--------|
| 🟢   | < 50%       | Learner | 🟢    | green  |
| 🔵   | 50–79%      | Skilled | 🔵    | blue   |
| 🟣   | ≥ 80%       | Expert  | 🟣    | purple |

**Gamification Features to Add**:

1. **XP & Streak System**:
   ```javascript
   // Firestore: users/{uid}/progress
   {
     xp: 1250,
     streak: 7,
     dailyGoal: 1,
     totalQuizzes: 23,
     expertCount: 5
   }
   ```

2. **Daily Goal Tracker**:
   - "Complete 1 quiz/day" → +50 XP bonus
   - Visual streak flame icon (🔥) with number
   - Motivational prompt: "7-day streak! You're on fire! 🔥"

3. **Challenge Mode Unlocks**:
   - Unlock "Expert Challenge" after 2 Expert-tier completions in same specialty
   - Expert Challenge = harder questions, no hints, time pressure
   - Reward: 3x XP multiplier

4. **Achievement Badges**:
   - First Perfect Score (12/12)
   - 10-Day Streak
   - Specialty Expert (5 Expert quizzes in same area)
   - Global Scholar (quizzes in 3+ languages)

5. **Motivational Micro-Feedback**:
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
    "rhythm_control": { missed: 3, total: 5 },
    "anticoagulation_scoring": { missed: 2, total: 4 },
    "rate_control": { missed: 0, total: 3 }
  },
  "Cardiac Syncope": {
    "risk_stratification": { missed: 2, total: 3 },
    "ecg_interpretation": { missed: 1, total: 2 }
  }
}
```

**Adaptive Next-Quiz Generation**:
1. After quiz completion, analyze weak domains
2. Generate follow-up quiz weighted 60% toward missed concepts, 40% new material
3. Example: If user missed rhythm control questions in AF quiz → next quiz emphasizes rhythm vs rate control scenarios

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

**Constructive Feedback Tone**:
- ❌ Bad: "You failed. Score: 42%"
- ✅ Good: "Great effort! Focus on rhythm control strategies to reach Skilled tier (50%+)"
- Always include actionable study recommendations with specific guideline references

---

## 🩺 Educational Personas (Dynamic Tone Adaptation)

Apply adaptive tone & depth automatically based on user profile:

| Persona               | Focus                                   | Explanation Style                    |
|-----------------------|-----------------------------------------|--------------------------------------|
| **Medical Student**   | Simplified diagnostic reasoning         | Foundational concepts, step-by-step  |
| **USMLE Candidate**   | Exam-style decision logic               | Board-style reasoning, time-efficient|
| **Practicing Doctor** | Management reasoning + risk/benefit     | Evidence-based, guideline-focused    |

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

## 💻 Interface Upgrades

**Progress Bar Enhancements**:
- Animated multi-color progress bar (tier-matched: green → blue → purple as score improves)
- Visual milestone markers at 50% and 80% thresholds
- Smooth CSS transitions between colors

**Continue Learning Button**:
```jsx
<button onClick={loadAdaptiveQuiz} className="btn-primary">
  🎯 Continue Learning: {nextTopicSuggestion}
</button>
```
- Loads adaptive next quiz based on weak areas
- Shows topic suggestion: "Continue Learning: AF Rhythm Control"

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

- [ ] **Guideline Cascade**: Starts local, includes all 4 tiers (local/national/regional/international)
- [ ] **Tier Labels**: Raw scores replaced with 🟢🔵🟣 emoji tiers
- [ ] **XP/Streak**: Persists in Firestore, displays correctly in UI
- [ ] **Multilingual**: Output verified in da/en/es/ar
- [ ] **Performance**: Latency ≤ Phase 2 standards (~50s), API calls ≤ 1 per quiz
- [ ] **Dynamic System**: NO hardcoding, works for all 3000+ topics globally
- [ ] **Adaptive Quiz**: Next quiz weights toward user's weak areas
- [ ] **Focus Cards**: Show after wrong answers with guideline links
- [ ] **Keyboard Shortcuts**: `G` for guidelines, `N` for next, `R` for review
- [ ] **Challenge Mode**: Unlocks after 2 Expert completions

---

## 🧠 Key Principle (Critical for All Implementations)

> **Build once — scale globally.**  
> All guideline retrieval, reasoning validation, and teaching output must be **dynamic, hierarchical, and globally inclusive** — scaling smoothly from a Danish student's local view (Sundhedsstyrelsen) to an international physician's reference standard (WHO, AHA/ACC).

**Absolutely NO hardcoding**:
- ❌ Do NOT write: `if (topic === 'Atrial Fibrillation') { riskScore = 'CHA₂DS₂-VASc' }`
- ✅ Do write: `const riskScores = RISK_SCORE_REGISTRY[topic]` (from Firestore/config)

**Template-driven architecture**:
- Use `${topic}`, `${region}`, `${language}` variables in all prompts
- Fetch guidelines from `guideline_registry` collection dynamically
- Apply risk scores based on topic context, not topic name hardcoding

**Global applicability test**:
- If you change code for Atrial Fibrillation, it must also work for Cardiac Syncope, Pneumonia, Dengue, etc.
- If you add Danish guidelines, the system must support US, UK, WHO guidelines equally
- If you implement a feature, it must work in English, Danish, Spanish, Arabic without code changes

**From Copenhagen to California**:  
Every medical learner sees relevant local guidelines first, with automatic fallback to regional/international sources. The same codebase serves a Danish student (sees Sundhedsstyrelsen) and a US doctor (sees AHA/ACC) — zero duplication.

---

## ✅ Success Criteria

Copilot should consider Phase 3 implementation complete when:
## ✅ Success Criteria

Copilot should consider Phase 3 implementation complete when:

- ✅ Each case displays guideline data in proper 4-tier hierarchical order (local → national → regional → international)
- ✅ Educational feedback adapts to user level (Medical Student vs USMLE vs Doctor) and language dynamically
- ✅ Scoring is tier-based (🟢🔵🟣 emoji tiers), non-revealing until completion, motivational in tone
- ✅ Backend `guideline_registry` dynamically updates per region from Firestore
- ✅ Frontend experience balances **Duolingo engagement** (XP, streaks, achievements) with **UpToDate academic credibility** (collapsible evidence cards, DOI links)
- ✅ **NO HARDCODING**: All topic-specific logic uses template variables, works for 3000+ topics globally
- ✅ Adaptive quiz generation weights toward user's weak areas (60% remedial, 40% new)
- ✅ Performance maintains Phase 2 standards (≤ 50s generation, 1 API call per quiz, 50% cost reduction)
- ✅ System validated across 10+ diverse topics (AF, Syncope, Pneumonia, Dengue, etc.) and 3+ languages (en, da, es)
- ✅ Challenge Mode unlocks and awards 3x XP correctly

**Quality Baseline**: Maintain Cardiac Syncope expert review quality (evidence citations, step-wise reasoning, realistic distractors) across ALL topics and specialties.

---

## 📊 Expected Impact (Phase 3 vs Phase 2)

| Metric | Phase 2 (Current) | Phase 3 (Target) |
|--------|-------------------|------------------|
| **Cost** | $0.06/quiz | $0.06/quiz (maintained) |
| **Speed** | ~50 seconds | ~50 seconds (maintained) |
| **Quality** | Grade A+ | Grade A+ (maintained) |
| **Engagement** | Passive quiz | Active (XP +250%, streaks) |
| **Guideline Relevance** | Generic ESC/AHA | Local-first cascade |
| **Personalization** | None | Adaptive next-quiz |
| **Retention** | 45% completion | 65%+ completion (target) |

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
