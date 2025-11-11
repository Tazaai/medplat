# 🧭 @copilot: Global Implementation Guide — MedPlat Dynamic Guidelines & Education Framework

## 🎯 Objective
You are contributing to **MedPlat**, a global, AI-powered clinical case simulator and gamified learning platform.
Your goal is to implement **dynamic, region-aware guideline retrieval** and **tiered educational delivery** for a broad medical audience.

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

## ⚙️ Dynamic Guideline Hierarchy
When displaying or validating case management:
1. **Local / Institutional** → (e.g. `Sundhedsstyrelsen`, `NNBV.dk`)
2. **National** → (e.g. Danish, UK NHS, US AHA/ACC)
3. **Regional / Continental** → (e.g. ESC, ESMO, EASL, NICE Europe)
4. **International / Global** → (e.g. WHO, CDC, NIH, ISICEM)

Implement this as a **fallback cascade**:
- Always start local → climb upward only if unavailable.
- Each citation must include `{society, year, title, url_or_doi, recommendation}`.
- Never hardcode static text; fetch dynamically or via cached registry.

Backend example:
```js
// Example structure in guidelines_api.mjs
const priority = ["local", "national", "regional", "international"];
const registry = {
  local: ["Sundhedsstyrelsen", "NNBV"],
  national: ["AHA/ACC", "NICE"],
  regional: ["ESC", "EASL"],
  international: ["WHO", "CDC"]
};
```

---

## 🧩 Implementation Tasks for Copilot

### 1. **Backend (`guidelines_api.mjs`)**

Implement a modular `fetchGuidelines()` that:
- Reads user region (from `ip`, `lang`, or explicit selector).
- Queries Firestore or static registry for matching guideline sources.
- Returns JSON array in correct priority order.

### 2. **Frontend (React Components)**

Add `⚙️ Load Guidelines` button (already present) that calls `/api/guidelines/local`.
Display collapsible cards (per level: local → global) with:
- Title, Society, Year, Recommendation summary, DOI/URL link.
- Tailwind + shadcn/ui components (`Card`, `Badge`, `Collapsible`).

### 3. **Educational Tier Logic**

Implement **tiered rendering**:
- Level 1 → simplified, guided reasoning.
- Level 2 → intermediate, applied management.
- Level 3 → expert or "AI vs You" challenge.

Scoring stays hidden until case completion; display as tier labels:
- 🟢 *Learner*, 🔵 *Skilled*, 🟣 *Expert* (no numeric score).

### 4. **Gamification & Feedback**

Integrate adaptive motivation loops:
- Streaks, milestones, mini-achievements.
- Post-case motivational reflection (e.g. "You improved diagnostic speed by 12%").
- Use Duolingo inspiration: short feedback bursts, not academic paragraphs.

### 5. **Data Validation**

Ensure each generated case passes `validateReferences()` to confirm:
- No fabricated hospital names or citation IDs.
- All guideline sources exist in registry.
- At least one valid `local` or `regional` source per case.

---

## 🧠 Key Principle

> All guideline retrieval, reasoning validation, and teaching output must be **dynamic, hierarchical, and globally inclusive** — scaling smoothly from a Danish student's local view to an international physician's reference standard.

**Do not** duplicate content per specialty — design once, adapt dynamically via user context and language.

---

## ✅ Success Criteria

Copilot should consider implementation complete when:
- Each case displays guideline data in proper hierarchical order.
- Educational feedback adapts to user level and language.
- Scoring is tier-based (non-revealing, motivational).
- Backend registry dynamically updates per region.
- Frontend experience balances *Duolingo engagement* with *UpToDate academic credibility*.

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
