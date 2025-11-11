# 📋 MedPlat Phase 3 — Quick Reference

## 🎯 Two-Guide System

### 1. **Strategic Vision** → `docs/COPILOT_GUIDE.md` (695 lines)
**Purpose**: High-level architecture, principles, and quality standards

**Contents**:
- Clinical quality baseline (Cardiac Syncope A+ standard)
- 7 strategic components (guidelines, gamification, adaptive feedback, personas, UI, reasoning, validation)
- "Build once, scale globally" principle
- NO HARDCODING enforcement
- Success criteria and expected impact

**When to read**: Understanding *why* and *what* Phase 3 should achieve

---

### 2. **Tactical Implementation** → `docs/COPILOT_IMPLEMENTATION_GUIDE.md` (539 lines)
**Purpose**: Step-by-step developer instructions with complete code examples

**Contents**:
- Complete backend route examples (guidelines_api.mjs, adaptive_feedback_api.mjs)
- Frontend component templates (GuidelinePanel.jsx, persona selector, tier display)
- Firestore schema specifications
- Development sequence (ordered 1→6)
- 10-point validation checklist
- Deployment commands and verification

**When to read**: Implementing Phase 3 with AI agent/Copilot

---

## 🚀 Quick Start (For AI Agents)

### Step 1: Read Context
```bash
# Strategic understanding
Read: docs/COPILOT_GUIDE.md

# Implementation details
Read: docs/COPILOT_IMPLEMENTATION_GUIDE.md
```

### Step 2: Follow Development Sequence
1. ✅ Create `backend/routes/guidelines_api.mjs`
2. ✅ Update `backend/routes/gamify_api.mjs` (reasoning order)
3. ✅ Add `backend/routes/adaptive_feedback_api.mjs`
4. ✅ Update `frontend/src/components/CaseView.jsx` (persona selector)
5. ✅ Update `frontend/src/components/Level2CaseLogic.jsx` (XP/streak)
6. ✅ Create `frontend/src/components/GuidelinePanel.jsx`

### Step 3: Validate
Run through 10-point checklist in `COPILOT_IMPLEMENTATION_GUIDE.md`

### Step 4: Deploy
```bash
./deploy_expert_panel.sh
```

This automated script handles:
1. ✅ Git push to origin/main
2. ✅ Backend Docker build (GCR)
3. ✅ Backend Cloud Run deployment (with Secret Manager integration)
4. ✅ Frontend build (npm ci + npm run build)
5. ✅ Frontend Docker build (GCR)
6. ✅ Frontend Cloud Run deployment (with VITE_API_BASE env)

### Step 5: Verify
```bash
# Test guideline API
curl -s https://medplat-backend-139218747785.europe-west1.run.app/api/guidelines/fetch \
  -H "Content-Type: application/json" \
  -d '{"topic":"Atrial Fibrillation","region":"Denmark"}' | jq .

# Test gamification API
curl -s https://medplat-backend-139218747785.europe-west1.run.app/api/gamify-direct \
  -H "Content-Type: application/json" \
  -d '{"topic":"Cardiac Syncope","region":"United States","language":"en","level":"intermediate","model":"gpt-4o-mini"}' | jq .
```

---

## 📊 Phase 3 Feature Matrix

| Component | Backend File | Frontend File | Firestore Collection | Status |
|-----------|-------------|---------------|---------------------|--------|
| **Guideline Cascade** | `guidelines_api.mjs` | `GuidelinePanel.jsx` | `guideline_registry` | 📋 Planned |
| **XP/Streaks** | `gamify_api.mjs` | `Level2CaseLogic.jsx` | `users/{uid}/progress` | 📋 Planned |
| **Adaptive Feedback** | `adaptive_feedback_api.mjs` | `Level2CaseLogic.jsx` | `users/{uid}/weak_areas` | 📋 Planned |
| **Personas** | `gamify_api.mjs` | `CaseView.jsx` | `users/{uid}/persona` | 📋 Planned |
| **Clinical Reasoning** | `gamify_api.mjs` (enhanced) | N/A | N/A | 📋 Planned |

---

## 🎯 Key Principles (Enforced Globally)

### 1. NO HARDCODING
❌ `if (topic === 'Atrial Fibrillation') { ... }`
✅ `const riskScores = RISK_SCORE_REGISTRY[topic]`

### 2. Template-Driven
✅ Use `${topic}`, `${region}`, `${language}` in all prompts
✅ Fetch from Firestore dynamically
✅ Apply logic based on context, not topic names

### 3. Global Scalability Test
- Works for all 3000+ topics? ✅
- Supports all regions (Denmark, US, UK, WHO)? ✅
- Functions in all languages (en, da, es, ar)? ✅

### 4. Quality Baseline
Maintain **Cardiac Syncope A+ standard**:
- Evidence citations (ESC 2023 §4.2.1, AHA/ACC 2022)
- Realistic distractors
- Step-wise reasoning
- Multi-domain integration (imaging, labs, risk scores)

---

## 🔍 Documentation Hierarchy

```
PROJECT_GUIDE.md
├── Architecture overview
├── Secret management
└── Deployment standards

docs/
├── COPILOT_GUIDE.md ★ (Strategic vision - READ FIRST)
│   ├── Clinical quality baseline
│   ├── 7 strategic components
│   ├── Success criteria
│   └── Expected impact
│
├── COPILOT_IMPLEMENTATION_GUIDE.md ★★ (Tactical code - IMPLEMENT THIS)
│   ├── Complete code examples
│   ├── Development sequence
│   ├── 10-point checklist
│   └── Deployment verification
│
├── EXPERT_PANEL_ENHANCEMENTS.md
│   └── Phase 2 implementation (already deployed)
│
├── DYNAMIC_VERIFICATION.md
│   └── NO HARDCODING proof (720 lines)
│
└── DEPLOYMENT_READINESS.md
    └── Production checklist
```

---

## 💡 For Human Developers

**Read this order**:
1. `PROJECT_GUIDE.md` (10 min) — understand architecture
2. `docs/COPILOT_GUIDE.md` (15 min) — understand Phase 3 vision
3. `docs/COPILOT_IMPLEMENTATION_GUIDE.md` (20 min) — see exact code patterns

**For AI Agents (Copilot/ChatGPT)**:
1. Paste entire `docs/COPILOT_IMPLEMENTATION_GUIDE.md` into context
2. Follow development sequence 1→6
3. Validate with 10-point checklist
4. Deploy and verify

---

## 🌍 Vision

> **Build once, scale globally.**  
> MedPlat unites Duolingo's engagement with UpToDate's precision —  
> A world-class adaptive clinical reasoning ecosystem for every learner.

---

## 📞 Need Help?

- **Strategic questions**: See `docs/COPILOT_GUIDE.md`
- **Code questions**: See `docs/COPILOT_IMPLEMENTATION_GUIDE.md`
- **Deployment issues**: See `DEPLOYMENT_READINESS.md`
- **Architecture questions**: See `PROJECT_GUIDE.md`

---

**Last updated**: November 11, 2025
**Current Status**: Phase 2 in production, Phase 3 guides ready for implementation
