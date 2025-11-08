  - `DialogChat.jsx` → AI chat dialog
  - `CaseList.jsx`, `CaseSelectors.jsx`, etc.
- Uses dynamic props:
  - `model` (`gpt-4o`, `gpt-4o-mini`)
  - `lang` (ISO language)
  - `gamify` (true / false)

---

## � Backend API Endpoints

### Core Routes
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/topics` | GET | Fetch all 1115 topics from Firestore `topics2` collection |
| `/api/topics/categories` | POST | Get 30 unique categories (areas) from topics |
| `/api/topics/search` | POST | Filter topics by category/area |
| `/api/cases` | POST | Generate clinical case using GPT-4o/mini + **auto-internal-panel review** |
| `/api/internal-panel` | POST | **Internal auto-review** (invisible to users, quality layer) |
| `/api/dialog` | POST | Interactive AI chat for case discussion |
| `/api/gamify` | POST | Generate 12-question adaptive MCQ quiz |
| `/api/panel/review` | POST | Expert panel case review (legacy) |
| `/api/expert-panel` | POST | **External**: Dynamic 12-role expert panel review (manual/developer use) |
| `/api/location` | GET | Detect user region for guideline adaptation |
| `/api/comment` | POST | Save user feedback/comments |

### 🧬 INTERNAL EXPERT PANEL (inside case generator — invisible to users)

### 🩺 Purpose

Automatically **reviews, validates, and enhances** each generated case before it is shown to the user. Acts as a professor-level multidisciplinary review board, ensuring every case meets academic, clinical, and educational excellence.

> 🧠 Goal: Deliver reasoning, structure, and quality that **surpass UpToDate, AMBOSS, and Medscape**, setting MedPlat as the global benchmark for intelligent clinical learning.

---

### 🧩 Dynamic Composition

The internal panel is automatically assembled based on the case’s specialty and complexity.

**Standard composition (context-adaptive):**

- 3 senior specialists from the relevant field (e.g., Cardiology, Toxicology, Neurology, etc.)
- 2 general practitioners (GPs)
- 2 emergency medicine consultants
- 1 clinical pharmacist
- 1 field researcher (for public health / epidemiology)
- 1 university professor of medicine (for academic oversight)
- 1 radiologist (optional, per case need)
- 1 internal AI-education logic reviewer (for structure and reasoning clarity)

---

### ⚙️ Behavior

- Runs **automatically inside `/api/dialog`** immediately after raw case generation.
- The panel silently:

  - Reviews all structured fields (history, exam, labs, management, teaching).
  - Checks **guideline accuracy**, **timing windows**, and **evidence depth**.
  - Adds missing **red flags**, **social/disposition notes**, or **ethical concerns**.
  - Ensures **clinical scales and quantifications** (e.g., NIHSS, Killip, SOFA) appear when relevant.
  - Refines language to be concise, academic, and globally guideline-aware.
- Only the refined, consensus-approved version is returned.
- Users only see the tag:

  > ✅ *Validated by Internal Expert Panel*

---

### 🎯 Focus and Quality Criteria

1. **Realism & Completeness:** every section filled, logical, and region-adapted.
2. **Guideline Integration:** harmonize with **NNBV, ESC, AHA, NICE, WHO**, and regional authorities.
3. **Academic Depth:** teaching pearls, mnemonics, and evidence hierarchy always included.
4. **Diversity of Reasoning:** encourage alternative explanations and clinical uncertainty when realistic.
5. **Scalability:** logic remains dynamic and specialty-aware — never static or hardcoded.
6. **Regeneration Loop:** if internal panel quality score < 0.85 (out of 1.0) → automatic refinement before publishing.

---

### 🏆 Vision

> MedPlat’s internal panel must ensure every case reads like a **university-level clinical masterclass** — structured, evidence-anchored, and pedagogically superior to any existing reference source.

---

### Implementation notes (developer guidance)

- The internal panel should be invoked as a synchronous quality layer after raw generation and before user return; do not expose internal deliberations.
- Maintain a structured metadata tag on cases: `meta.internal_panel = { reviewed: true, score: 0.92, timestamp: ISOString }`.
- Log panel actions in `logs/` for auditability but avoid sensitive data leakage.
- Keep `/api/internal-panel` read-only for data stores; it must not perform Firestore writes to topic collections.

---

### Would you like this exact block copied into `PROJECT_GUIDE.md` (it will replace the previous panel section)?

---

## �🔐 Secret Management

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
