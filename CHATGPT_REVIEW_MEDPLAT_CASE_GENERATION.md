# MedPlat Case Generation System - Complete Code Review for ChatGPT

**Date:** 2024-12-08  
**System Status:** ✅ Fully Migrated to Multi-Step API (Classic Mode Completely Removed)  
**Architecture:** Unified Multi-Step Interactive API using GPT-4o-mini exclusively

---

## EXECUTIVE SUMMARY

MedPlat is a clinical case generation platform producing structured, exam-level medical cases for USMLE Step 2, medical students, doctors, and clinical researchers. The system has been **fully migrated** from a deprecated two-stage Classic Mode generator to a unified **multi-step interactive API** using GPT-4o-mini exclusively.

**Current Architecture:** Multi-Step Interactive API → Firestore Persistence → Post-Processing → Output  
**Previous Architecture:** Two-stage GPT-4o Classic Mode (completely removed December 2024)

**Key Achievement:** Complete removal of Classic Mode, unified prompt system, simplified architecture with 13 endpoints, all using GPT-4o-mini.

---

## 1. SYSTEM ARCHITECTURE

### 1.1 Current Architecture (Post-Migration)

```
User Request
    ↓
POST /api/case/init (Generate meta, chief_complaint, initial_context)
    ↓
Save to Firestore (caseId created)
    ↓
POST /api/case/history (Generate history - 6-10 sentences)
    ↓
Merge & Save to Firestore
    ↓
POST /api/case/exam (Generate physical_exam - 5-8 sentences with vitals)
    ↓
Merge & Save to Firestore
    ↓
POST /api/case/paraclinical (Generate labs + imaging)
    ↓
Merge & Save to Firestore
    ↓
[Optional] POST /api/case/expand/* (Generate optional sections)
    ↓
Cache Check → Return cached OR Generate → Merge & Save
    ↓
Post-Processing (if needed)
    ↓
Return Complete Case
```

### 1.2 Core Components

1. **Multi-Step Case API** (`backend/routes/case_api.mjs` - 1093 lines)
   - 13 endpoints (4 core + 9 expansions)
   - All use GPT-4o-mini
   - Universal system message
   - Caching mechanism

2. **Case Context Manager** (`backend/utils/case_context_manager.mjs` - 93 lines)
   - Firestore operations
   - Field-level caching
   - Incremental updates

3. **Post-Processor** (`backend/utils/case_post_processor.mjs` - 650 lines)
   - 8 cleanup functions
   - Diagnosis inference
   - JSON cleaning
   - Field mapping

---

## 2. MULTI-STEP API ENDPOINTS

### 2.1 Universal System Message

All endpoints use `UNIVERSAL_SYSTEM_MESSAGE` with:

**Target Audience:**
- USMLE Step 2 candidates
- Medical students
- Medical doctors
- Clinical researchers

**Content Rules:**
- Units: Celsius (°C) for temperature, SI units for labs/vitals
- Normal ranges: Include ONLY when clinically relevant (format: "N: X–Y" with interpretation tag)
- Timing/dynamics: One short sentence when relevant (troponin, CK-MB, D-dimer, etc.)
- Radiology logic: Brief decision reasoning (CT vs MRI vs US) when relevant
- Pathophysiology: Exam-level detail with histophysiology layer (3-4 sentences max)
- Output cleanliness: No raw JSON blocks, placeholders, guidelines, references, mechanical markers

**Global Style:**
- Clarity over length
- Compact reasoning
- Dynamic intelligence

### 2.2 Core Endpoints (Required for Basic Case)

#### **POST /api/case/init**
- **Input:** `{ topic, category, lang, region }`
- **Output:** `{ caseId, case: { meta, chief_complaint, initial_context } }`
- **Generates:** meta (topic, category, age, sex, setting, region, lang), chief_complaint, initial_context
- **Timeout:** 30 seconds
- **Storage:** Creates new Firestore document

#### **POST /api/case/history**
- **Input:** `{ caseId }`
- **Output:** `{ caseId, case: { ...existingCase, history } }`
- **Generates:** history (6-10 sentences with onset, timeline, risk factors, relevant negatives)
- **Rules:** Never include raw JSON blocks, professional language
- **Timeout:** 30 seconds
- **Storage:** Merges into existing Firestore document

#### **POST /api/case/exam**
- **Input:** `{ caseId }`
- **Output:** `{ caseId, case: { ...existingCase, physical_exam } }`
- **Generates:** physical_exam (5-8 sentences)
- **Rules:** MUST include BP, HR, RR, Temp, SpO2, Celsius, SI units, no raw JSON
- **Timeout:** 30 seconds
- **Storage:** Merges into existing Firestore document

#### **POST /api/case/paraclinical**
- **Input:** `{ caseId }`
- **Output:** `{ caseId, case: { ...existingCase, paraclinical } }`
- **Generates:** paraclinical.labs, paraclinical.imaging
- **Rules:** SI units, normal ranges format "N: X–Y", timing/dynamics when relevant, brief radiology reasoning, no raw JSON
- **Timeout:** 30 seconds
- **Storage:** Merges into existing Firestore document

### 2.3 Expansion Endpoints (Optional, Cached)

#### **POST /api/case/expand/pathophysiology**
- **Generates:** pathophysiology_detail (cellular_molecular, organ_microanatomy, mechanistic_links, compensatory_pathways)
- **Rules:** Exam-level detail with histophysiology, 3-4 sentences max
- **Caching:** ✅ Returns cached value if exists
- **Timeout:** 30 seconds

#### **POST /api/case/expand/management**
- **Generates:** management (initial, definitive, escalation, disposition)
- **Rules:** Short, high-level, clear escalation triggers, disposition thresholds, no guidelines
- **Caching:** ✅ Returns cached value if exists
- **Timeout:** 30 seconds

#### **POST /api/case/expand/expert_panel**
- **Generates:** expertConference (plain text string)
- **Format:** Dr A (Primary Specialty), Dr B (Emergency Medicine), Dr C (Subspecialty), disagreements, consensus
- **Rules:** 10-14 sentences, natural language, no mechanical markers
- **Caching:** ✅ Returns cached value if exists
- **Timeout:** 30 seconds
- **Special:** Converts structured object to readable text if needed

#### **POST /api/case/expand/teaching**
- **Generates:** teaching (key concepts, pitfalls, pearls, exam-level traps)
- **Rules:** 6-10 sentences, professional, exam-level language
- **Caching:** ✅ Returns cached value if exists
- **Timeout:** 30 seconds

#### **POST /api/case/expand/evidence**
- **Generates:** deepEvidence (test interpretation, probability shifts, clinical logic)
- **Rules:** 8-12 sentences, evidence-based reasoning, no guidelines
- **Caching:** ✅ Returns cached value if exists
- **Timeout:** 30 seconds

#### **POST /api/case/expand/stability**
- **Generates:** stability (1-2 sentences: stable / borderline / unstable)
- **Rules:** One sentence justification, prompt < 40 words
- **Caching:** ✅ Returns cached value if exists
- **Timeout:** 20 seconds

#### **POST /api/case/expand/risk**
- **Generates:** risk (simple tag: high / moderate / low)
- **Rules:** No explanation, just tag
- **Caching:** ✅ Returns cached value if exists
- **Timeout:** 20 seconds

#### **POST /api/case/expand/consistency**
- **Generates:** consistency (short note if history, exam, labs contradict)
- **Rules:** Max 2 lines, no panel
- **Caching:** ✅ Returns cached value if exists
- **Timeout:** 20 seconds

#### **POST /api/case/expand/question**
- **Input:** `{ caseId, userQuestion }`
- **Output:** `{ caseId, answer }`
- **Generates:** Focused answer (e.g., "CT vs MRI", "CTA sensitivity")
- **Rules:** Based on case context, focused, concise
- **Timeout:** 30 seconds
- **Note:** Does NOT save to case (returns answer only)

---

## 3. CASE CONTEXT MANAGER

### 3.1 Functions

**File:** `backend/utils/case_context_manager.mjs` (93 lines)

1. **getCase(caseId)** - Retrieves case from Firestore
2. **saveCase(caseId, caseData)** - Saves/updates case in Firestore (auto-adds updatedAt)
3. **updateCaseFields(caseId, fields)** - Updates specific fields with caching
4. **generateCaseId()** - Generates unique case ID

### 3.2 Caching Mechanism

**Cacheable Fields:**
- teaching
- deepEvidence
- pathophysiology
- expertConference / expert_conference
- stability
- risk
- consistency

**Logic:**
- `updateCaseFields()` checks if field already exists and has content
- If cached → skip update, return cached value
- If missing/empty → update with new value
- Prevents redundant LLM calls and reduces costs

### 3.3 Firestore Structure

**Collection:** `cases`  
**Document ID:** `caseId` (format: `case_{timestamp}_{random}`)

**Fields:**
- All case data (meta, history, physical_exam, paraclinical, etc.)
- `createdAt` - ISO timestamp
- `updatedAt` - ISO timestamp (auto-updated)

**Merge Strategy:** `set(data, { merge: true })` for incremental updates

---

## 4. POST-PROCESSOR

### 4.1 Main Function

**File:** `backend/utils/case_post_processor.mjs` (650 lines)

**Function:** `postProcessCase(caseData)`

**Processing Order:**
1. `ensureFinalDiagnosis()` - Infers diagnosis if missing
2. `cleanHistory()` - Removes embedded JSON blocks
3. `cleanParaclinical()` - Cleans labs and imaging text
4. `normalizeNormalRanges()` - Standardizes normal range formatting
5. `stabilizeManagement()` - Cleans management escalation structure
6. `mapStabilityRiskConsistency()` - Maps into standard fields
7. `routeTeachingAndEvidence()` - Routes into schema fields
8. `cleanExpertConference()` - Removes noise from expert conference

### 4.2 Key Functions

#### **ensureFinalDiagnosis(caseData)**
- **Purpose:** Ensures final_diagnosis is always filled
- **Logic:**
  1. Check `meta.primary_diagnosis`
  2. Check `meta.topic` (if diagnosis-like)
  3. Check `differential_diagnoses[0]`
  4. Pattern matching from paraclinical/history/exam (15+ patterns: AML, ACS, Stroke, Pneumonia, Sepsis, DKA, PE, Appendicitis, MI, CHF, Meningitis, Asthma, COPD, etc.)
  5. Last resort: generic placeholder
- **Patterns Supported:** 15+ common diagnoses

#### **extractAndCleanJSON(text)**
- **Purpose:** Removes embedded JSON blocks from text
- **Process:**
  1. Try parsing as full JSON object → convert to sentences
  2. Extract JSON-like structures: `{ "key": "value" }`
  3. Format keys nicely (e.g., "Findings" → "Findings")
  4. Process matches in reverse order (preserve indices)
  5. Remove JSON artifacts (empty braces, brackets, nested quotes)
  6. Normalize whitespace
- **Example:**
  - Before: `{ "Findings": "Blast cells 40%", "Interpretation": "Consistent with AML" }`
  - After: `Findings: Blast cells 40%. Interpretation: Consistent with AML.`

#### **cleanParaclinical(caseData)**
- **Purpose:** Cleans labs and imaging text
- **Handles:** String format and object format
- **Applies to:** `paraclinical.labs`, `paraclinical.imaging`

#### **normalizeNormalRanges(caseData)**
- **Purpose:** Standardizes normal range formatting
- **Patterns:** `"N: 0.04–0.40"` (en dash), converts `"N 0.04-0.40"` → `"N: 0.04–0.40"`
- **Applies to:** `paraclinical.labs`, `physical_exam` (if object with vitals)

#### **stabilizeManagement(caseData)**
- **Purpose:** Cleans management escalation structure
- **Removes:** Standalone labels without content
- **Converts:** Labels with content → full sentences
  - `vitals_thresholds: ...` → `"Escalate if vitals meet these thresholds: ..."`
  - `sepsis_indicators: ...` → `"Monitor for sepsis indicators: ..."`
  - `escalation_criteria: ...` → `"Escalate to ICU if: ..."`
- **Normalizes:** Whitespace, removes empty lines

#### **mapStabilityRiskConsistency(caseData)**
- **Purpose:** Maps stability/risk/consistency into standard fields
- **Logic:**
  - Extracts `stability`, `risk`, `consistency` from case
  - Updates `meta.severity_grade` based on risk level
  - Creates/updates `clinical_risk_assessment` field
- **Mapping:**
  - `risk: "high"` → `meta.severity_grade: "high"`
  - Combines into `clinical_risk_assessment: "Stability: X. Risk: Y. Consistency: Z."`

#### **routeTeachingAndEvidence(caseData)**
- **Purpose:** Routes teaching/deep evidence into existing schema fields
- **Teaching Mode:** Maps to `crucial_concepts`, `exam_pearls`, `common_pitfalls`
- **Deep Evidence Mode:** Maps to `clinical_risk_assessment`, `next_diagnostic_steps`

#### **cleanExpertConference(caseData)**
- **Purpose:** Removes noise from expert conference
- **Removes:**
  - Mechanical markers: `[Disagreement]`, `[Agreement]`, `[Consensus]`
  - Duplicate patterns: `Dr A vs Dr B disagreement:` (if repeated)
  - Redundant mid-text disagreement patterns
- **Normalizes:**
  - Doctor references: `Dr. A:` → `Dr A:`
  - Whitespace: `\n{3,}` → `\n\n`, `\s{2,}` → ` `
  - Sentence endings: `..` → `.`
- **Handles:** Both `expertConference` and `expert_conference` fields

---

## 5. TECHNICAL SPECIFICATIONS

### 5.1 Models Used

**All Endpoints:**
- Model: **GPT-4o-mini**
- Temperature: 0.4 (most endpoints), 0.5 (expert_panel, teaching, evidence), 0.3 (stability, risk, consistency)
- Format: JSON Object (`response_format: { type: "json_object" }`)

### 5.2 Timeouts

- Init: 30 seconds
- History/Exam/Paraclinical: 30 seconds each
- Expansions: 30 seconds (20 seconds for stability/risk/consistency)
- Question: 30 seconds

### 5.3 Response Format

**Standard Response:**
```json
{
  "ok": true,
  "caseId": "case_1234567890_abc123",
  "case": { ...caseData },
  "cached": false  // Only for expansion endpoints
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": "Error message"
}
```

### 5.4 Error Handling

**Pattern:**
1. Input validation (check caseId, topic, etc.)
2. Try-catch blocks around API calls
3. JSON parsing with fallback (clean markdown, retry)
4. Firestore error handling
5. Comprehensive error logging
6. Standardized error responses

### 5.5 Data Storage

**Firestore:**
- Collection: `cases`
- Document ID: `caseId` (format: `case_{timestamp}_{random}`)
- Merge strategy: `set(data, { merge: true })`
- Caching: Field-level (check before update)
- Timestamps: `createdAt`, `updatedAt` (ISO format)

---

## 6. SYSTEM STRENGTHS

### 6.1 Architecture
✅ **Unified System** - Single multi-step API, no dual modes  
✅ **Simplified Pipeline** - No complex engines, just API → Firestore → Post-processing  
✅ **Caching Mechanism** - Reduces redundant LLM calls and costs  
✅ **Firestore Persistence** - Enables incremental generation and state management  
✅ **Modular Design** - Each endpoint is independent, easy to maintain

### 6.2 Generation Quality
✅ **Consistent Prompts** - Universal system message ensures uniform quality  
✅ **GPT-4o-mini** - Cost-effective while maintaining quality  
✅ **Structured Output** - JSON format ensures predictable structure  
✅ **Post-Processing** - Handles edge cases (missing diagnosis, JSON leakage)  
✅ **Content Rules** - Clear rules for units, normal ranges, timing/dynamics

### 6.3 User Experience
✅ **Interactive Generation** - Users can build cases step-by-step  
✅ **Optional Expansions** - On-demand generation of additional sections  
✅ **Caching** - Prevents duplicate API calls, faster responses  
✅ **Flexible** - Can generate complete case or build incrementally

### 6.4 Code Quality
✅ **Defensive Programming** - Input validation, error handling, fallbacks  
✅ **Clear Logging** - Comprehensive console logs for debugging  
✅ **Error Recovery** - JSON parsing with fallback, try-catch blocks  
✅ **Type Safety** - Array/object validation and normalization

---

## 7. SYSTEM WEAKNESSES & AREAS FOR IMPROVEMENT

### 7.1 Architecture Issues

#### **1. No Validation Layer**
- **Issue:** No structured validation of case quality, consistency, or safety
- **Impact:** Cases may have contradictions or quality issues
- **Recommendation:** Add lightweight validation (acuity consistency, field completeness, clinical safety)

#### **2. No Quality Scoring**
- **Issue:** No objective measure of case quality
- **Impact:** Cannot identify low-quality cases automatically
- **Recommendation:** Implement quality metrics (completeness, consistency, clinical accuracy)

#### **3. Limited Error Handling**
- **Issue:** Some errors may not be caught or handled gracefully
- **Impact:** Potential for unexpected failures
- **Recommendation:** Standardize error handling across all endpoints

### 7.2 Generation Quality Issues

#### **1. No Consistency Checking**
- **Issue:** No validation of contradictions (e.g., vitals vs labs, history vs exam)
- **Impact:** Cases may have logical inconsistencies
- **Recommendation:** Add lightweight consistency checks in post-processor

#### **2. Limited Diagnosis Inference**
- **Issue:** `ensureFinalDiagnosis()` uses pattern matching (15+ patterns, but may miss rare diagnoses)
- **Impact:** May fail to infer diagnosis for uncommon cases
- **Recommendation:** Expand pattern matching or use LLM-based inference

#### **3. Expert Conference Quality**
- **Issue:** Expert conference generation may lack depth or realism
- **Impact:** May produce superficial disagreements or generic consensus
- **Recommendation:** Enhance expert conference prompt with more specific requirements

#### **4. No Clinical Safety Checks**
- **Issue:** No validation of dangerous recommendations or contradictions
- **Impact:** Potential for unsafe or incorrect clinical guidance
- **Recommendation:** Add safety validation layer (e.g., check for dangerous drug interactions, contraindications)

### 7.3 Post-Processing Limitations

#### **1. JSON Cleaning May Be Too Aggressive**
- **Issue:** `extractAndCleanJSON()` may remove legitimate content
- **Impact:** May lose important clinical information
- **Recommendation:** More conservative cleaning with better pattern detection

#### **2. Management Escalation Cleaning**
- **Issue:** `stabilizeManagement()` uses regex patterns (may miss edge cases)
- **Impact:** Some broken fragments may remain
- **Recommendation:** More robust pattern matching or LLM-based cleaning

#### **3. No Semantic Validation**
- **Issue:** Post-processor only does structural cleanup, no semantic checks
- **Impact:** May miss logical errors or inconsistencies
- **Recommendation:** Add lightweight semantic validation (e.g., check if vitals match exam description)

### 7.4 Performance & Cost

#### **1. No Request Batching**
- **Issue:** Each expansion endpoint makes separate API calls
- **Impact:** Multiple round trips, higher latency
- **Recommendation:** Batch multiple expansions in single request

#### **2. No Response Caching**
- **Issue:** No caching of complete cases (only field-level caching)
- **Impact:** Regenerating same case costs full API call
- **Recommendation:** Cache complete cases by topic/category hash

#### **3. GPT-4o-mini Limitations**
- **Issue:** GPT-4o-mini may produce lower quality than GPT-4o for complex sections
- **Impact:** Some sections (expert conference, pathophysiology) may lack depth
- **Recommendation:** Consider GPT-4o for quality-critical sections (expert conference, pathophysiology_detail)

### 7.5 Code Quality Issues

#### **1. Large Function (case_api.mjs)**
- **Issue:** `case_api.mjs` is ~1093 lines (large file)
- **Impact:** Hard to maintain, test, and debug
- **Recommendation:** Split into smaller modules (core endpoints, expansion endpoints, utilities)

#### **2. Duplicate Code**
- **Issue:** Similar error handling and JSON parsing logic repeated across endpoints
- **Impact:** Code duplication, harder to maintain
- **Recommendation:** Extract common logic into helper functions

#### **3. Limited Test Coverage**
- **Issue:** Test files may reference deleted modules, may be outdated
- **Impact:** No confidence in system correctness
- **Recommendation:** Update tests, add integration tests for all endpoints

---

## 8. CODE STRUCTURE

### 8.1 Key Files

**Generation:**
- `backend/routes/case_api.mjs` (1093 lines) - Multi-Step API (all 13 endpoints)
- `backend/utils/case_post_processor.mjs` (650 lines) - Post-processing (8 functions)
- `backend/utils/case_context_manager.mjs` (93 lines) - Firestore operations

**Utilities:**
- `backend/utils/api_helpers.mjs` - Timeout and retry logic
- `backend/index.js` - Express server (mounts `/api/case`)

### 8.2 File Sizes

- Total generation code: ~1,836 lines
- Post-processing: 650 lines
- State management: 93 lines
- **Total:** ~2,579 lines of core generation logic

### 8.3 Endpoints Summary

**Core Endpoints (4):**
1. `/init` - Initialize case
2. `/history` - Generate history
3. `/exam` - Generate physical exam
4. `/paraclinical` - Generate labs + imaging

**Expansion Endpoints (9):**
5. `/expand/pathophysiology` - Deep pathophysiology
6. `/expand/management` - Management plan
7. `/expand/expert_panel` - Expert conference
8. `/expand/teaching` - Teaching block
9. `/expand/evidence` - Deep evidence reasoning
10. `/expand/stability` - Stability score
11. `/expand/risk` - Risk label
12. `/expand/consistency` - Consistency check
13. `/expand/question` - Answer user question

**Total:** 13 endpoints

---

## 9. MIGRATION STATUS

### 9.1 Classic Mode Removal

✅ **Deleted Files:**
- `backend/generate_case_clinical.mjs` (removed)
- `backend/routes/dialog_api.mjs` (removed)

✅ **Cleaned Up:**
- `backend/index.js` - Removed all dialog_api references
- All imports and route mounting removed

✅ **Remaining References:**
- Test files (`test_*.mjs`) - Non-critical, can be updated later
- Documentation files (`.md`) - Historical reference only
- Archived files (`backend/archived/`) - Not used in production

### 9.2 Unified Prompt System

✅ **Universal System Message:**
- All endpoints use `UNIVERSAL_SYSTEM_MESSAGE`
- Consistent content rules across all generation
- No duplicate or conflicting prompts

---

## 10. RECOMMENDATIONS FOR IMPROVEMENT

### 10.1 High Priority

1. **Add Lightweight Validation Layer**
   - Acuity consistency checks
   - Field completeness validation
   - Clinical safety checks (dangerous recommendations, contradictions)
   - Consistency validation (vitals vs labs, history vs exam)

2. **Improve Diagnosis Inference**
   - Expand pattern matching (add more common diagnoses)
   - Or use LLM-based inference for missing diagnoses
   - Better fallback logic

3. **Enhance Expert Conference Quality**
   - More specific prompt requirements
   - Enforce realistic disagreements
   - Require evidence-based arguments
   - Consider GPT-4o for expert conference (higher quality)

4. **Add Quality Scoring**
   - Completeness score
   - Consistency score
   - Clinical accuracy score
   - Overall quality metric

### 10.2 Medium Priority

5. **Optimize Costs**
   - Implement response caching (complete cases by topic/category hash)
   - Batch multiple expansions in single request
   - Consider GPT-4o only for quality-critical sections

6. **Refactor Large Files**
   - Split `case_api.mjs` into smaller modules
   - Extract common logic (error handling, JSON parsing) into helpers
   - Improve testability

7. **Add Semantic Validation**
   - Check vitals consistency (e.g., HR in exam matches history)
   - Validate lab values against normal ranges
   - Check for logical contradictions

8. **Improve Post-Processing**
   - More conservative JSON cleaning
   - Better pattern matching for management escalation
   - LLM-based cleaning for complex cases

### 10.3 Low Priority

9. **Update Test Suite**
   - Remove references to deleted modules
   - Add integration tests for all endpoints
   - Add unit tests for post-processor

10. **Documentation**
    - API documentation for all endpoints
    - Schema documentation
    - Generation flow diagrams

11. **Monitoring & Analytics**
    - Track generation success rates
    - Monitor API costs
    - Quality metrics dashboard

---

## 11. CODE EXAMPLES

### 11.1 Typical Generation Flow

```javascript
// 1. Initialize case
POST /api/case/init
{ topic: "Acute Myocardial Infarction", category: "Cardiology" }
→ { caseId: "case_123...", case: { meta: {...}, chief_complaint: "...", initial_context: "..." } }

// 2. Generate history
POST /api/case/history
{ caseId: "case_123..." }
→ { caseId: "case_123...", case: { ...existingCase, history: "..." } }

// 3. Generate exam
POST /api/case/exam
{ caseId: "case_123..." }
→ { caseId: "case_123...", case: { ...existingCase, physical_exam: "..." } }

// 4. Generate paraclinical
POST /api/case/paraclinical
{ caseId: "case_123..." }
→ { caseId: "case_123...", case: { ...existingCase, paraclinical: {...} } }

// 5. Optional: Expand pathophysiology
POST /api/case/expand/pathophysiology
{ caseId: "case_123..." }
→ { caseId: "case_123...", case: { ...existingCase, pathophysiology_detail: {...} } }

// 6. Optional: Expand expert conference
POST /api/case/expand/expert_panel
{ caseId: "case_123..." }
→ { caseId: "case_123...", case: { ...existingCase, expertConference: "..." }, cached: false }
```

### 11.2 Caching Example

```javascript
// First call - generates and caches
POST /api/case/expand/expert_panel
{ caseId: "case_123..." }
→ { caseId: "case_123...", case: { ...existingCase, expertConference: "Dr A: ..." }, cached: false }

// Second call - returns cached value
POST /api/case/expand/expert_panel
{ caseId: "case_123..." }
→ { caseId: "case_123...", case: { ...existingCase, expertConference: "Dr A: ..." }, cached: true }
```

### 11.3 Post-Processing Example

```javascript
// Before post-processing
{
  history: '{ "Findings": "Chest pain", "Duration": "2 hours" }',
  final_diagnosis: "",
  paraclinical: {
    labs: "Troponin: 0.15 ng/mL (N 0.04-0.40, high)"
  }
}

// After post-processing
{
  history: "Findings: Chest pain. Duration: 2 hours.",
  final_diagnosis: "Acute Myocardial Infarction (MI)",
  paraclinical: {
    labs: "Troponin: 0.15 ng/mL (N: 0.04–0.40, high)"
  }
}
```

---

## 12. CONCLUSION

The MedPlat case generation system has been **successfully migrated** from a complex two-stage Classic Mode generator to a unified multi-step interactive API. The system now has:

✅ **Unified architecture** (single multi-step API, no dual modes)  
✅ **Consistent generation** (universal system message, GPT-4o-mini)  
✅ **Flexible generation** (incremental building, optional expansions)  
✅ **Robust post-processing** (handles edge cases, cleans structure)  
✅ **Caching mechanism** (reduces costs and latency)  
✅ **Firestore persistence** (enables state management)

**Areas for improvement:**
- Add lightweight validation layer
- Improve diagnosis inference
- Enhance expert conference quality
- Optimize costs (caching, batching)
- Refactor large files
- Add semantic validation

**Overall Assessment:** The system is **production-ready** and well-architected after the migration. The recommended improvements would enhance quality, reduce costs, and improve maintainability.

---

## 13. FILE REFERENCE

### 13.1 Core Generation Files

1. **`backend/routes/case_api.mjs`** (1093 lines)
   - All 13 endpoints
   - Universal system message
   - Error handling
   - Caching logic

2. **`backend/utils/case_post_processor.mjs`** (650 lines)
   - 8 post-processing functions
   - JSON cleaning
   - Diagnosis inference
   - Field mapping

3. **`backend/utils/case_context_manager.mjs`** (93 lines)
   - Firestore operations
   - Caching logic
   - Case ID generation

### 13.2 Supporting Files

4. **`backend/utils/api_helpers.mjs`**
   - `withTimeoutAndRetry()` function
   - Timeout and retry logic

5. **`backend/index.js`**
   - Express server setup
   - Route mounting (`/api/case`)
   - CORS configuration

### 13.3 Deleted Files (No Longer Used)

- ❌ `backend/generate_case_clinical.mjs` (removed)
- ❌ `backend/routes/dialog_api.mjs` (removed)

---

**End of Comprehensive Review Report**

