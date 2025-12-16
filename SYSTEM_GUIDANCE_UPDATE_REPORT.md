# System Guidance Update Report

**Date:** 2024  
**Action:** Update case generation system guidance  
**Status:** ✅ Changes prepared (NOT deployed - awaiting explicit deploy command)

## Summary

Updated MedPlat case generation system to align with new universal dynamic clinical case lab guidance. Changes apply to both Classic Mode (monolithic generator) and Multi-Step API endpoints.

## Changes Applied

### 1. **Classic Mode Generator** (`backend/generate_case_clinical.mjs`)

#### Main System Prompt Updates:
- **Units & Conventions:**
  - Temperature: Celsius (°C)
  - Vitals: Standard international units
  - Labs: SI units with consistent formatting

- **Normal Ranges:**
  - Policy: Include ONLY when clinically relevant
  - Format: "N: X–Y" with interpretation tag (normal | high | low | borderline)

- **Timing & Dynamics:**
  - When clinically relevant (troponin, CK-MB, D-dimer, cultures, LP, radiology), include ONE short sentence about timing/dynamics
  - Examples: when marker rises/peaks/declines, when test becomes meaningful

- **Radiology Logic:**
  - Include brief decision reasoning (CT vs MRI vs US) when relevant
  - CT: emergencies, perforation, hemorrhage
  - US: first-line for gallbladder, DVT, pediatrics
  - MRI: neurology, soft tissue, spine emergencies

- **Pathophysiology Standard:**
  - Exam-level detail with short histophysiology layer when meaningful
  - Components: cellular/molecular trigger, organ-level dysfunction, systemic consequence, compensatory mechanisms

- **Output Cleanliness:**
  - No raw JSON blocks inside text
  - No placeholders
  - No guidelines
  - No references
  - No mechanical markers

- **Global Style:**
  - Clarity over length
  - Professional language
  - Compact reasoning
  - Avoid overloading
  - Dynamic intelligence

#### Stage A Prompt Updates:
- Added units guidance (Celsius, SI units)
- Added normal ranges policy and format
- Added timing/dynamics rule for labs
- Added radiology decision reasoning
- Added output cleanliness rules

#### Stage B Prompt Updates:
- Added pathophysiology standard (exam-level with histophysiology)
- Added expert conference natural language requirement (no mechanical markers)
- Added output cleanliness rules

### 2. **Multi-Step API** (`backend/routes/case_api.mjs`)

#### Updated Endpoints:

1. **`/api/case/paraclinical`:**
   - Added SI units requirement
   - Added normal ranges policy (only when clinically relevant, format: N: X–Y)
   - Added timing/dynamics rule
   - Added radiology decision reasoning (CT vs MRI vs US)
   - Added output cleanliness rules

2. **`/api/case/expand/pathophysiology`:**
   - Added exam-level detail with histophysiology requirement
   - Added components: cellular/molecular, organ-level, systemic, compensatory
   - Added professional, globally understandable language requirement

3. **`/api/case/expand/management`:**
   - Added standard international units requirement
   - Added output cleanliness rules (no guidelines, no raw JSON, no placeholders)

4. **`/api/case/expand/expert_panel`:**
   - Added natural language requirement (no mechanical markers)
   - Added output cleanliness rules

5. **`/api/case/expand/teaching`:**
   - Added exam-level language requirement
   - Added clarity over length principle
   - Added output cleanliness rules

6. **`/api/case/expand/evidence`:**
   - Added exam-level language requirement
   - Added compact and professional requirement
   - Added output cleanliness rules

#### System Messages Updated:
- All system messages now include:
  - Audience: USMLE Step 2, medical students, doctors, researchers
  - Quality level: exam-level, specialist-informed
  - Output cleanliness: no guidelines, references, placeholders

### 3. **Post-Processor** (`backend/utils/case_post_processor.mjs`)

- Already aligned with new guidance:
  - `normalizeNormalRanges()`: Formats normal ranges as "N: X–Y"
  - `extractAndCleanJSON()`: Removes raw JSON blocks
  - `cleanExpertConference()`: Removes mechanical markers
  - All functions maintain schema cleanliness

## Principles Applied

✅ **Dynamic:** System adapts to case context  
✅ **Non-static:** No hardcoded rules  
✅ **Model flexibility:** Respects AI initiative  
✅ **No prompt overload:** Concise, focused instructions  
✅ **Respect AI initiative:** Allows appropriate depth

## Quality Level

- **Audience:** USMLE Step 2 examinees, medical students, medical doctors, clinical researchers
- **Standard:** Exam-level, specialist-informed, high-precision, globally valid
- **Language:** Professional, concise, globally understandable

## Files Modified

1. `backend/generate_case_clinical.mjs`
   - Main `systemPrompt` (lines ~589-605)
   - `stageAPrompt` (lines ~350-393)
   - `stageBPrompt` (lines ~395-467)

2. `backend/routes/case_api.mjs`
   - `/paraclinical` prompt (lines ~231-242)
   - `/expand/pathophysiology` prompt (lines ~299-307)
   - `/expand/management` prompt (lines ~364-385)
   - `/expand/expert_panel` prompt (lines ~465-481)
   - `/expand/teaching` prompt (lines ~647-660)
   - `/expand/evidence` prompt (lines ~739-756)
   - All system messages (multiple locations)

3. `backend/utils/case_post_processor.mjs`
   - Already aligned (no changes needed)

## Deployment Status

⚠️ **NOT DEPLOYED** - Changes prepared and ready, awaiting explicit deploy command.

## Next Steps

1. Review changes for accuracy
2. Test case generation with new guidance
3. Deploy backend when ready
4. Monitor output quality

---

**Note:** All changes maintain backward compatibility with existing schema. The updates enhance guidance without breaking existing functionality.
