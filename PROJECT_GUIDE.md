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
| `/api/cases` | POST | Generate clinical case using GPT-4o/mini |
| `/api/dialog` | POST | Interactive AI chat for case discussion |
| `/api/gamify` | POST | Generate 12-question adaptive MCQ quiz |
| `/api/panel/review` | POST | Expert panel case review (legacy) |
| `/api/expert-panel` | POST | **NEW**: Dynamic 12-role expert panel review |
| `/api/location` | GET | Detect user region for guideline adaptation |
| `/api/comment` | POST | Save user feedback/comments |

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
