# 🧠 MedPlat – Clinical AI Platform (Full Project Guide)
⚠️ **SYSTEM CONTEXT FILE — Protected Reference**  
Used by GitHub Actions, Codox GPT, and local scripts to understand MedPlat's  
goals, architecture, workflows, and deployment sequence.  
**Do not edit automatically** — only with explicit developer authorization.

---

## 🧠 MedPlat System Update — November 2025

### ✅ Base Case Generation (Level 0/1)
- `/api/cases` → now returns schema-compliant JSON following the unified meta/history/exam/etc. structure.
- Added external expert-panel `/api/panel/review` for critical system feedback (multi-role).
- Checkbox in **CaseView.jsx** toggles gamification on/off.
- No static cases; every case generated dynamically from `topics2`.

### 🎮 Gamification v2
- `/api/gamify` → 12 adaptive MCQs, progressive difficulty.
- **Model:** `gpt-4o-mini` (fast + cost-efficient).
- **Logic:** Q1-3 (history/exam) → Q4-7 (labs/differentials) → Q8-10 (diagnosis/management) → Q11-12 (complications).
- Robust JSON fallbacks + Firebase `logUserStep` analytics.
- **Frontend:** `Level2CaseLogic.jsx` with delayed explanations, color-coded scoring, review summary.
- **Docs Tag:** `v1.6.1-gamify-v2`.

### ☁️ Deployment
| Component | Revision | URL | Status |
|------------|-----------|-----|--------|
| Backend | latest | https://medplat-backend-139218747785.europe-west1.run.app | ✅ 1115 topics |
| Frontend | latest | https://medplat-frontend-139218747785.europe-west1.run.app | ✅ React + Vite |

**Latest Updates (Nov 7, 2025):**
- ✅ Firebase connectivity restored (Secret Manager key fixed)
- ✅ Frontend rebuilt with React 18.3.1 + Vite 5.3.1 + serve
- ✅ Multi-stage Docker build for production deployment
- ✅ Backend uses GCR images with secret bindings
- ✅ Frontend uses VITE_API_BASE environment variable

---

## 🎯 Project Goal
MedPlat is an **AI-driven medical case simulator** and **gamified learning platform**  
for clinicians and students.  
It generates realistic cases, interactive MCQs, and adaptive explanations  
based on expert-panel reasoning.

Important: MedPlat is a dynamic AI case generator — the system does not ship or rely on a library of static cases stored in the database. Instead, the backend generates cases on-demand from the set of clinical "topics" (see Data model below).

---

## 🧩 Core Objectives
| Area | Objective |
|------|------------|
| 🧠 **AI Case Generation** | Use expert-panel reasoning to build base cases. |
| 🎮 **Gamification** | Generate 12 adaptive MCQs per case with delayed expert explanations. |
| 🌍 **Localization** | Dynamic multilingual output via backend AI (no translation files). |
| 🔐 **Secure Infrastructure** | Use GitHub Secrets + Artifact Registry + Cloud Run. |
| 🧪 **Local-First Testing** | All code must pass local validation before deployment. |
| ☁️ **CI/CD Integration** | Automated secret validation → test → deploy → verify. |

---

## 🏗️ Architecture Overview

### Backend
- **Node 18 / Express**
- Routes:
  - `/api/topics` → fetch topics from Firebase (`topics2`)
  - `/api/dialog` → AI conversation (GPT-4o / GPT-4o-mini)
  - `/api/gamify` → generate MCQs + scoring + expert panel reasoning
  - `/api/comment` → feedback
- Utilities:
  - `generate_case_clinical.mjs`
  - `translate_util.mjs` (optional internal use)
- Integration:
  - Firebase Admin SDK (topics & logging)
  - OpenAI API (case generation + MCQs)
- Deployment: Cloud Run container (`process.env.PORT || 8080`)

### Data model

- Firebase contains a single operational dataset used by MedPlat: a `topics` collection (named `topics2` in production) that lists clinical topics or seeds (topic id, display name, optional metadata).
- The platform does NOT store static case documents or answer keys in Firestore. All cases and MCQs are generated dynamically by the AI at request time using the topic as the seed. This keeps the database small, avoids shipping PHI or copyrighted content, and ensures cases are adaptive and up-to-date.

Note on topics maintenance and read-only contract:

- The canonical list of topics is stored in the Firestore collection `topics2` (production). These entries are treated as seeds only — the AI generates full case content on demand and we avoid storing static cases or answer keys in Firestore.
- Topics are typically seeded from `scripts/topics_seed.json` using `scripts/seed_topics.mjs` (or the JS variant `scripts/seed_topics.js`). To update topics in production, run the seeding script with proper credentials (see `scripts/README.md` / `examine_firebaseservicekey.mjs`).
- The backend route `backend/routes/topics_api.mjs` is intentionally read-only and CI includes guards to prevent accidental writes; do not add Firestore writes to that route or other runtime endpoints unless you intentionally change the data model and CI checks.

Operational summary (explicit):

- MedPlat uses a single authoritative Firestore collection for topic seeds named `topics2` (production).
- Each entry in `topics2` is a lightweight seed (topic id, display name, optional metadata) used to drive AI generation.
- The platform does not store static case documents, answers, or MCQs in Firestore — all clinical cases and multiple-choice questions are generated dynamically by the backend at request time using the topic seed.

Note: For local development the backend includes safe, non-throwing fallbacks when secrets or SDKs are missing:
- `backend/firebaseClient.js` returns a noop `firestore()` client when `FIREBASE_SERVICE_KEY` or `firebase-admin` is not available.
- `backend/openaiClient.js` provides a stubbed client when `OPENAI_API_KEY` or the OpenAI SDK is not present.
These fallbacks keep local tests and the review scripts runnable without requiring production secrets.

### Frontend
- **React (Vite + Tailwind)**
- Components:
  - `CaseView.jsx` → topic selector, model selector, gamification toggle
  - `Level2CaseLogic.jsx` → full gamified MCQ logic & scoring
  - `DialogChat.jsx` → AI chat dialog
  - `CaseList.jsx`, `CaseSelectors.jsx`, etc.
- Uses dynamic props:
  - `model` (`gpt-4o`, `gpt-4o-mini`)
  - `lang` (ISO language)
  - `gamify` (true / false)

---

## 🔐 Secret Management

### Repository Secrets (GitHub → Settings → Actions)
| Secret | Purpose |
|---------|----------|
| `OPENAI_API_KEY` | Access to GPT models |
| `GCP_PROJECT` | Cloud project ID |
| `GCP_SA_KEY` | Service account JSON for Cloud Run deploy |
| `FIREBASE_SERVICE_KEY` | Firebase Admin SDK credentials |
| `VITE_API_BASE` | Backend URL for frontend build |

> 🧩 **No `.env` files are used in production.**  
> Development keys reside in `.env.local` (ignored by git).

---

## 🧰 Local Development

### Prerequisites
```bash
npm install
npm install --prefix backend
npm install --prefix frontend

_For temporary ops toggles (e.g. SOFT_FAIL_CONNECTIVITY), see docs/SOFT_FAIL_CONNECTIVITY.md._
