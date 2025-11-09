# 🤖 Case Generation Rendering Fix Guide

## 🎯 Goal

Ensure the **Generate Case** button retrieves and renders full case JSON from backend `/api/cases` endpoint.

---

## 🔍 Common Issues & Fixes

### Issue 1: Network requests return 200 but no case renders

**Symptoms:**
- ✅ Network tab shows `/api/cases` returns 200 OK
- ✅ Response contains valid JSON with `{ ok: true, case: {...} }`
- ❌ Frontend shows no case data / blank screen

**Root Cause:**
- Frontend not parsing response correctly
- Missing defensive checks for empty data
- No console logging to debug data flow

**Fix Applied in `frontend/src/components/CaseView.jsx`:**

```javascript
const data = await res.json();
console.log("✅ Case generation response:", data);

if (!data || !data.case) {
  console.error("❌ No case data in response:", data);
  throw new Error("Backend returned empty case data");
}

const normalizedCase = normalizeCaseData(data.case);
console.log("✅ Normalized case:", normalizedCase);
setCaseData(normalizedCase);
```

---

## 🧩 Backend Response Contract

**Endpoint:** `POST /api/cases`

**Request Body:**
```json
{
  "topic": "Acute Myocardial Infarction",
  "language": "en",
  "region": "EU/DK",
  "level": "intermediate",
  "model": "gpt-4o-mini",
  "category": "Cardiology"
}
```

**Expected Response:**
```json
{
  "ok": true,
  "topic": "Acute Myocardial Infarction",
  "case": {
    "Topic": "Acute Myocardial Infarction",
    "Timeline": "...",
    "Patient_History": "...",
    "Objective_Findings": "...",
    "Paraclinical_Investigations": {...},
    "Differential_Diagnoses": [...],
    "Red_Flags": [...],
    "Final_Diagnosis": {...},
    "Management": "...",
    "meta": {
      "topic": "Acute Myocardial Infarction",
      "age": "58",
      "sex": "Male",
      "region": "EU/DK",
      "model": "gpt-4o-mini",
      "quality_score": 0.92,
      "reviewed_by_internal_panel": true
    }
  }
}
```

---

## 🛠️ Backend Implementation (`backend/routes/cases_api.mjs`)

**Key Points:**
1. Always return JSON (not plain text)
2. Use `res.json()` not `res.send()`
3. Wrap response in `{ ok: true, case: {...} }` structure
4. Include defensive error handling

```javascript
router.post('/', async (req, res) => {
  try {
    const { topic, language = 'en', region = 'EU/DK', model = 'gpt-4o-mini' } = req.body || {};
    if (!topic) return res.status(400).json({ ok: false, error: 'Missing topic' });

    const draftResult = await generateCase({ topic, model, lang: language, region });
    
    const transformed = {
      Topic: draftResult.meta?.topic || topic,
      Patient_History: draftResult.history || '',
      // ... other fields
      meta: {
        topic,
        region,
        model,
        quality_score: 0.9
      }
    };
    
    return res.json({ ok: true, topic, case: transformed });
  } catch (err) {
    console.error('❌ /api/cases error:', err.stack);
    return res.status(500).json({ ok: false, error: err.message });
  }
});
```

---

## 🔐 CORS Configuration (`backend/index.js`)

**Required for frontend to access backend:**

```javascript
import cors from 'cors';

// Enable permissive CORS early
app.use(cors({ origin: true, credentials: true }));

// Alternative for development
app.use(cors({ origin: '*' }));

// Handle preflight requests
app.options('*', cors());
```

---

## 🧪 Testing Checklist

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Open DevTools → Network tab | Ready to capture requests |
| 2 | Click "Generate Case" button | Loading spinner appears |
| 3 | Check Network → `/api/cases` request | Status 200 OK |
| 4 | Click `/api/cases` → Response tab | JSON with `{ ok: true, case: {...} }` |
| 5 | Check Console tab | `✅ Case generation response:` log with data |
| 6 | Check Console tab | `✅ Normalized case:` log with transformed data |
| 7 | Check UI | Case sections render (History, Exam, Labs, etc.) |
| 8 | Click section collapse toggles | Sections expand/collapse smoothly |

---

## 🚨 Error Scenarios

### Backend Error (500)

**Console:**
```
❌ Error generating case: Internal Server Error
```

**Fix:** Check backend logs for stack trace:
```bash
gcloud run services logs read medplat-backend --region=europe-west1 --limit=50
```

### Empty Response

**Console:**
```
❌ No case data in response: { ok: true }
```

**Fix:** Backend is not including `case` field. Check `cases_api.mjs` line ~104:
```javascript
return res.json({ ok: true, topic, case: transformed }); // ← case field required
```

### CORS Error

**Console:**
```
Access to fetch at 'https://...' has been blocked by CORS policy
```

**Fix:** Add CORS middleware in `backend/index.js`:
```javascript
app.use(cors({ origin: true }));
```

---

## 📋 Debugging Commands

**Test backend directly:**
```bash
curl -X POST https://medplat-backend-139218747785.europe-west1.run.app/api/cases \
  -H "Content-Type: application/json" \
  -d '{"topic":"Sepsis","language":"en","region":"EU/DK","model":"gpt-4o-mini"}' \
  | jq '.case.Topic'
```

**Check mounted routes:**
```bash
gcloud run services logs read medplat-backend --region=europe-west1 --limit=20 | grep "Mounted /api/cases"
```

**Local frontend debugging:**
```javascript
// In browser console after clicking Generate Case:
localStorage.debug = '*'
// Reload page and try again
```

---

## ✅ Acceptance Criteria

- [x] `/api/cases` returns 200 with valid JSON
- [x] Response includes `{ ok: true, case: {...} }` structure
- [x] Frontend logs response data in console
- [x] Frontend logs normalized case data in console
- [x] Case sections render on screen
- [x] No undefined/null errors in console
- [x] Collapse/expand functionality works

---

## 🔄 Auto-Repair Workflow

If case generation fails after deployment:

1. **Check logs:** `gcloud run services logs read medplat-backend --limit=50`
2. **Verify route:** Look for `✅ Mounted /api/cases` in startup logs
3. **Test endpoint:** Use curl command above to verify backend works
4. **Check frontend:** Open DevTools → Console → look for `❌ No case data`
5. **Compare schema:** Ensure backend response matches frontend expectation

---

**Last Updated:** November 9, 2025  
**Related Files:**
- `frontend/src/components/CaseView.jsx` (lines 190-220)
- `backend/routes/cases_api.mjs` (lines 1-110)
- `backend/index.js` (lines 170-180)
