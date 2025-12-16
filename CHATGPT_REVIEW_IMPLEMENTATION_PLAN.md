# ChatGPT Review Implementation Plan - Case Generation Improvements

**Date:** 2025-01-27  
**Source:** ChatGPT Case Review (Global Score: 5.0/10)  
**Goal:** Improve case generation based on comprehensive review feedback

---

## 📊 Review Summary

**Global Score:** 5.0/10  
**Verdict:** "Strong universal skeleton but too much generic ICU/ACS boilerplate, broken differentials, and major schema/rendering bugs that must be fixed globally."

### Strengths ✅
- Clear universal scaffold present
- Red-flag hierarchy structure in place
- Guideline cascade modeled
- LMIC section exists
- Stepwise reasoning chain fields present
- Clinical risk assessment structured

### Critical Issues ❌
1. Differential diagnosis block non-functional (no tiers, no FOR/AGAINST, placeholders)
2. Reasoning chain cross-domain contamination (ACS logic in non-ACS cases)
3. Generic "ICU soup" complications
4. `[object Object]` serialization bugs
5. Irrelevant guidelines (mental health/ID in cardiac cases)
6. Over-simplified pharmacology statements

---

## 🎯 Implementation Strategy

This feedback requires **prompt improvements** (not just code fixes) to guide the LLM to generate better cases from the start.

---

## Implementation Tasks

### Phase 1: Critical Prompt Fixes (Immediate)

#### Task 1.1: Fix Differential Diagnosis Format
**Files:** `backend/generate_case_clinical.mjs`, `backend/intelligence_core/internal_panel.mjs`

**Changes:**
- Update prompt to require structured differential format
- Enforce: `{name, tier: "critical|urgent|common|benign", for, against, overall_comment}`
- Forbid placeholder strings: "tier should be determined", "See case analysis"

#### Task 1.2: Fix Reasoning Chain Domain Contamination
**Files:** `backend/generate_case_clinical.mjs`, `backend/intelligence_core/reasoning_cleanup.mjs`

**Changes:**
- Add domain-specific reasoning chain templates
- Prohibit generic ABC/primary survey in non-trauma cases
- Remove ACS probability calculations from non-ACS cases
- Fix step duplication ("Step 1: Step 1: 1.")

#### Task 1.3: Fix Object Serialization Bugs
**Files:** `backend/generate_case_clinical.mjs`, `backend/intelligence_core/serialization_helper.mjs`

**Changes:**
- Integrate serialization_helper.mjs into pipeline
- Add automatic `[object Object]` detection and rejection
- Format medications, guidelines, LMIC as readable strings

---

### Phase 2: Content Quality Improvements

#### Task 2.1: Domain-Specific Complications
**Files:** `backend/generate_case_clinical.mjs`

**Changes:**
- Prompt: Only include complications relevant to specific condition
- Remove generic ICU complications (MODS, DIC, ARDS) unless ICU setting
- Filter by domain tags

#### Task 2.2: Domain-Tagged Guidelines
**Files:** `backend/generate_case_clinical.mjs`, `backend/intelligence_core/guideline_synthesis.mjs`

**Changes:**
- Prompt: Filter guidelines by domain tags
- Remove mental health guidelines from cardiac cases
- Remove ATLS from non-trauma cases
- Hide empty guideline levels

#### Task 2.3: Structured Pharmacology
**Files:** `backend/generate_case_clinical.mjs`

**Changes:**
- Require structured medication format with mechanism, dose, adjustments
- Qualify pharmacology statements (no blanket "avoid beta-blockers")
- Add context and monitoring requirements

---

### Phase 3: Internal Panel Rules

#### Task 3.1: Enhance Panel Validation
**Files:** `backend/intelligence_core/internal_panel.mjs`

**Changes:**
- Add validation: Every differential has tier and FOR/AGAINST
- Reject cases with placeholder text
- Verify domain consistency in reasoning chain
- Check complication relevance

---

### Phase 4: Post-Processing Fixes

#### Task 4.1: Serialization Guard
**Files:** `backend/intelligence_core/schema_normalizer.mjs`

**Changes:**
- Detect and transform `[object Object]` to readable format
- Strip placeholder sections
- Clean reasoning chain duplication

---

### Phase 5: Frontend Renderer

#### Task 5.1: Schema-Aware Rendering
**Files:** `frontend/src/components/UniversalCaseDisplay.jsx`

**Changes:**
- Handle structured medications/guidelines properly
- Hide empty sections
- Hide placeholder text

---

## 📝 Detailed Prompt Improvements

See `PROMPT_IMPROVEMENTS_FROM_EXTERNAL_PANEL.md` for all 12 detailed prompt instructions.

---

## ✅ Next Steps

1. Integrate prompt improvements into case generation
2. Review gamification functionality
3. Deploy to existing services
4. Generate new test case
5. Re-review with ChatGPT

---

**Status:** Ready for implementation

