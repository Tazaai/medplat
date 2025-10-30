# 🧠 MedPlat – Clinical AI Platform (Full Project Guide)
⚠️ **SYSTEM CONTEXT FILE — Protected Reference**  
Used by GitHub Actions, Codox GPT, and local scripts to understand MedPlat’s  
goals, architecture, workflows, and deployment sequence.  
**Do not edit automatically** — only with explicit developer authorization.

---

## 🎯 Project Goal
MedPlat is an **AI-driven medical case simulator** and **gamified learning platform**  
for clinicians and students.  
It generates realistic cases, interactive MCQs, and adaptive explanations  
based on expert-panel reasoning.

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
