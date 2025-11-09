# MedPlat Developer Guide

## 📋 Table of Contents

1. [Copilot Comment Blocks](#copilot-comment-blocks)
2. [Architecture Overview](#architecture-overview)
3. [Local Development Setup](#local-development-setup)
4. [Testing & CI](#testing--ci)

---

## 🧭 Copilot Comment Blocks

### Purpose

MedPlat uses **inline Copilot guide comments** in key renderer components to ensure AI-driven case generation follows global clinical standards, evidence-based reasoning, and dynamic panel composition.

### Location

Each of the following renderer files contains a **mandatory Copilot Guide comment block**:

- `frontend/src/components/CaseView.jsx`
- `frontend/src/components/ProfessionalCaseDisplay.jsx`
- `frontend/src/components/Level2CaseLogic.jsx`

### Content

The comment block defines AI behavior for:

1. **Cross-specialty reasoning** — Modality choices (CT vs MRI, LP indications, US vs X-ray), timing, sensitivity, and duration where relevant.
2. **Dynamic expert panels** — Panel members adapt to case type (e.g., Neurology → Neurologist, Neuroradiologist, ICU, Emergency).
3. **Global guidelines** — Evidence-based references loaded dynamically (ESC, NICE, AHA, WHO, regional). No static citations or hardcoded placeholders.
4. **Global applicability** — Logic must generalize across regions and disease areas (not single-topic).

### Example

```javascript
/**
 * 🧭 Copilot Guide — Global Clinical Context & Dynamic Panels
 *
 * Goal: Make case management, diagnostics, and expert debate globally relevant,
 * evidence-based, and adaptive to context.
 *
 * Instructions:
 * 1) Generate practical, high-level reasoning across specialties (not single-topic).
 *    - Include modality choices and rationale (e.g., CT vs MRI: sensitivity & timing;
 *      LP indications; US vs X-ray for pneumothorax; MRI vs CT for spondylodiscitis).
 *    - Explain when, why, and duration/sensitivity where relevant.
 *
 * 2) Ensure the expert conference panel is dynamic (not hardcoded).
 *    - Members adapt to case type (e.g., Neurology -> Neurologist, Neuroradiologist, ICU, Emergency).
 *    - Each discussion should show concise, multidisciplinary evidence-based reasoning.
 *
 * 3) Use evidence-based, global guidelines loaded dynamically (ESC / NICE / AHA / WHO / local).
 *    - Do NOT include static citations or regional placeholders.
 *
 * 4) Keep outputs globally applicable — logic must generalize across regions and disease areas.
 *
 * Result: Professional, globally consistent case output with dynamic panels, modality
 * reasoning, and guideline-driven explanations.
 */
```

### Rules

- **Do NOT remove or modify** these comment blocks without updating the CI check script.
- **Do NOT hardcode** clinical content (guidelines, panel members, regional alternatives).
- **Use AI triggers** for dynamic data fetching (e.g., "Load Local Guidelines" button).

### CI Validation

The script `scripts/check_copilot_comments.sh` validates the presence of Copilot guide comments in all three renderer files:

```bash
bash scripts/check_copilot_comments.sh
```

**Expected output:**

```
✅ OK: frontend/src/components/CaseView.jsx contains Copilot guide
✅ OK: frontend/src/components/ProfessionalCaseDisplay.jsx contains Copilot guide
✅ OK: frontend/src/components/Level2CaseLogic.jsx contains Copilot guide

✅ All Copilot guide comments present and accounted for!
```

If any comment is missing, the script exits with code 1 and CI will fail.

---

## 🏗️ Architecture Overview

### Backend (Node 18 + Express)

- **Entry**: `backend/index.js` — dynamic ESM route mounting, Cloud Run friendly (`PORT=8080`, `HOST=0.0.0.0`)
- **Routes**: `backend/routes/{topics_api,dialog_api,gamify_api,comment_api,cases_api,internal_panel_api,guidelines_api}.mjs`
- **Integration**: Firebase Admin SDK (`topics2` collection), OpenAI API (GPT-4o/mini for case generation + MCQs)
- **Deployment**: Cloud Run container (`europe-west1`)

### Frontend (React + Vite + Tailwind)

- **Entry**: `frontend/src/main.jsx` → `App.jsx`
- **Key components**:
  - `CaseView.jsx` — topic/model selector, case generation controls
  - `ProfessionalCaseDisplay.jsx` — professional case view with collapsible sections, teaching points, conference panel
  - `Level2CaseLogic.jsx` — MCQ logic + scoring (gamified mode)
  - `ModernCaseDisplay.jsx` — modern UI with shadcn/ui components, Framer Motion animations
  - `ConferencePanel.jsx` — expert panel discussion renderer
- **Build-time env**: `VITE_API_BASE` (backend URL injected by workflow)

### CI/CD (GitHub Actions)

- **Workflow**: `.github/workflows/deploy.yml`
- **Secret validation** → Artifact Registry build → Secret Manager provisioning → Cloud Run deploy
- **Required secrets**: `OPENAI_API_KEY`, `GCP_PROJECT`, `GCP_SA_KEY`, `FIREBASE_SERVICE_KEY`

---

## 🛠️ Local Development Setup

### Prerequisites

- Node.js 18+
- Firebase project with Firestore (`topics2` collection)
- OpenAI API key

### Backend

```bash
cd backend
npm install
PORT=8080 node index.js
```

### Frontend

```bash
cd frontend
npm install
VITE_API_BASE=http://localhost:8080 npm run dev
```

### Environment Variables

Create `.env.local` in the backend directory (gitignored):

```env
OPENAI_API_KEY=sk-...
FIREBASE_SERVICE_KEY={"type":"service_account",...}
PORT=8080
```

---

## 🧪 Testing & CI

### Local-First Workflow (Mandatory)

**Before any PR or deploy:**

```bash
bash review_report.sh         # Generates agent.md with diagnostics
bash test_backend_local.sh    # Runs backend integration tests
bash scripts/check_copilot_comments.sh  # Validates Copilot guide comments
```

### Quick Syntax Check

```bash
node --check backend/index.js
```

### CI Workflow

1. **Secret validation** — ensures required secrets exist in GitHub Secrets and Secret Manager
2. **Backend build** — Docker image → Artifact Registry (`europe-west1-docker.pkg.dev/$GCP_PROJECT/medplat/medplat-backend:$TAG`)
3. **Frontend build** — Docker image → Artifact Registry (`medplat-frontend:$TAG`)
4. **Deploy** — Cloud Run services updated with new revisions, secrets bound via `--set-secrets`

---

## 📝 Additional Resources

- **Project Guide**: `PROJECT_GUIDE.md` — master architecture doc (authoritative)
- **Copilot Instructions**: `.github/copilot-instructions.md` — high-level guidance for automated agents
- **Deployment Standard**: `docs/DEPLOYMENT_STANDARD.md` — deployment checklist and best practices

---

**Last updated**: November 9, 2025
