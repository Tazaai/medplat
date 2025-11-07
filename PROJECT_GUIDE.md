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

### Expert Panel System (Two-Layer Architecture)

#### 1️⃣ Internal Dynamic Expert Panel (Automatic, Invisible)
**Endpoint:** `/api/internal-panel` (called automatically by `/api/cases`)

**Purpose:** Auto-review and improve every case BEFORE showing it to users.

**Behavior:**
- When user requests case generation, backend creates **draft case** → sends to internal panel
- Panel reviews and **improves** the case (adds missing elements, ensures guideline accuracy)
- **Refined case** returned to user with note: `"✅ Reviewed by internal specialist panel"`
- User never sees panel discussion, only high-quality validated cases

**Permanent Members (every case):**
- Medical Student (learning perspective)
- Professor (academic rigor and teaching)
- Researcher (evidence-based medicine)

**Dynamic Specialists (auto-selected by topic/category):**
- **Cardiology:** Cardiologist + Emergency Physician + Internist + Cardiac Surgeon
- **Neurology:** Neurologist + Neuroradiologist + Internal Medicine + Emergency Physician
- **Infectious Disease:** ID Specialist + Intensivist + Emergency Physician + Clinical Microbiologist
- **Endocrinology:** Endocrinologist + Internist + Emergency Physician + Clinical Pharmacist
- **Trauma:** Trauma Surgeon + Orthopedic Surgeon + Emergency Physician + Anesthesiologist
- **Toxicology:** Toxicologist + Clinical Pharmacist + Emergency Physician + Intensivist
- *(12 specialty categories total)*

**Review Focus:**
- Clinical accuracy and guideline adherence (region-specific)
- Missing critical elements (red flags, timing windows, rescue therapies)
- Differential diagnoses reasoning
- Hemodynamic profiling accuracy
- Evidence-based data validation
- Teaching quality

**Model:** GPT-4o-mini (fast, cost-effective for every case)

---

#### 2️⃣ External Expert Panel (Manual, Visible for Developers)
**Endpoint:** `/api/expert-panel` (triggered manually or by frontend after case generation)

**Purpose:** Meta-feedback for developers/evaluators to improve the overall system.

**Composition:**
- Same clinical experts as internal panel **+ additional roles:**
  - AI Education & Coding Expert
  - Web Developer (system realism & structure)
  - Competitor Voice

**Use Cases:**
- DevOps testing and CI review
- Copilot/ChatGPT external evaluation
- System-wide improvements (not case-specific)
- UI/UX feedback
- Scalability analysis

**Key Features:**
- Reviews apply globally to ALL specialties (not hardcoded per topic)
- Highlights missing rescue therapies, red flags, regional differences
- Provides "Global Consensus" with scalable improvements
- Uses GPT-4o for high-quality multi-perspective analysis

---

### Expert Panel Review (New Feature)
The `/api/expert-panel` endpoint provides comprehensive case review from 12 simulated expert roles:
- 1 Medical Student
- 1 Medical Doctor
- 3 Specialists (different fields)
- 2 Generalists
- 2 Emergency Medicine Specialists
- 1 Field Researcher
- 1 University Professor of Medicine
- 1 USMLE Expert
- 1 AI Education & Coding Expert
- 1 Web Developer (system realism & structure)
- 1 Competitor Voice

**Key Features:**
- Reviews apply globally to ALL specialties (not hardcoded per topic)
- Highlights missing rescue therapies, red flags, regional differences
- Provides "Global Consensus" with scalable improvements
- Uses GPT-4o for high-quality multi-perspective analysis

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
