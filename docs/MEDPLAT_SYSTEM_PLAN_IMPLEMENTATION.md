# MedPlat System Plan Implementation

**Date:** 2025-12-05  
**Status:** 🚧 In Progress

## Overview

This document outlines the comprehensive system improvements to align MedPlat's case generation, reasoning engines, guidelines, education, and UX architecture with clinical accuracy and educational quality standards.

---

## 1. Generator Improvements

### 1.1 Align Acuity Labels with Setting, Symptoms, and Stability Metadata

**Current State:** Acuity labels may not consistently match case context  
**Target:** Acuity labels automatically derived from case metadata

**Implementation:**
- Create `acuity_classifier.mjs` in `backend/intelligence_core/`
- Extract acuity from:
  - Setting (ED vs clinic vs ward)
  - Symptoms (severity, progression)
  - Stability metadata (vitals, exam findings)
- Update `generate_case_clinical.mjs` to use acuity classifier
- Ensure acuity propagates to all downstream components

**Files to Modify:**
- `backend/intelligence_core/acuity_classifier.mjs` (NEW)
- `backend/generate_case_clinical.mjs`
- `backend/intelligence_core/high_acuity_engine.mjs`

---

### 1.2 Separate Stabilization Templates from Routine Chronic and Preventive Narratives

**Current State:** Templates may mix emergency and routine content  
**Target:** Distinct templates for stabilization vs routine care

**Implementation:**
- Create template routing in `domain_extensions.mjs`
- Add `template_type` field: `"stabilization" | "routine" | "preventive"`
- Filter template selection based on acuity and phase
- Update narrative generation to use appropriate template

**Files to Modify:**
- `backend/intelligence_core/domain_extensions.mjs`
- `backend/generate_case_clinical.mjs`

---

### 1.3 Constrain Complication Generation to Match Phase, Setting, and Risk Profile

**Current State:** Complications may not align with case timeline  
**Target:** Complications only generated when contextually appropriate

**Implementation:**
- Update `generateComplicationsForDomains()` in `domain_extensions.mjs`
- Add phase validation (acute vs chronic vs follow-up)
- Add setting validation (ED complications vs ward complications)
- Add risk profile matching (high-risk patients get high-risk complications)
- Filter out temporally impossible complications

**Files to Modify:**
- `backend/intelligence_core/domain_extensions.mjs`
- `backend/intelligence_core/consistency_engine.mjs`

---

### 1.4 Guard Reasoning Templates Against Injecting Unrelated High-Risk Pathways

**Current State:** Reasoning may include irrelevant high-risk scenarios  
**Target:** Reasoning only includes pathways relevant to case

**Implementation:**
- Add pathway filtering in `probabilistic_reasoning.mjs`
- Validate reasoning steps against:
  - Case domains
  - Acuity level
  - Available resources
  - Case phase
- Remove generic high-risk pathways that don't match context

**Files to Modify:**
- `backend/intelligence_core/probabilistic_reasoning.mjs`
- `backend/intelligence_core/reasoning_cleanup.mjs`

---

### 1.5 Require Management Tone to Match Acuity, Context, and Follow-up Horizon

**Current State:** Management tone may be inconsistent  
**Target:** Management tone automatically adapts to case context

**Implementation:**
- Create `tone_adapter.mjs` in `backend/intelligence_core/`
- Tone rules:
  - High acuity → Urgent, directive tone
  - Routine → Educational, collaborative tone
  - Preventive → Motivational, counseling tone
- Apply tone to `initial_management` and `definitive_management` sections

**Files to Modify:**
- `backend/intelligence_core/tone_adapter.mjs` (NEW)
- `backend/generate_case_clinical.mjs`

---

## 2. Engine Improvements

### 2.1 Route Reasoning Engine Using Shared Acuity, Phase, and Context Ontology

**Current State:** Reasoning engine may not use consistent ontology  
**Target:** Unified ontology across all reasoning components

**Implementation:**
- Create `clinical_ontology.mjs` in `backend/intelligence_core/`
- Define shared terms:
  - Acuity levels: `critical | high | moderate | low | routine`
  - Phases: `presentation | workup | management | followup`
  - Context: `emergency | inpatient | outpatient | preventive`
- Update all engines to use ontology

**Files to Modify:**
- `backend/intelligence_core/clinical_ontology.mjs` (NEW)
- `backend/intelligence_core/probabilistic_reasoning.mjs`
- `backend/intelligence_core/high_acuity_engine.mjs`

---

### 2.2 Filter Differential Branches That Conflict with Case Stability and Presentation

**Current State:** Differentials may include incompatible diagnoses  
**Target:** Differentials filtered by case stability and presentation

**Implementation:**
- Update `differential_builder.mjs` to validate against:
  - Case stability (stable vs unstable)
  - Presentation timeline (acute vs chronic)
  - Available findings
- Remove differentials that conflict with stability
- Add conflict detection logic

**Files to Modify:**
- `backend/ai/differential_builder.mjs`
- `backend/intelligence_core/consistency_engine.mjs`

---

### 2.3 Link Pharmacology Engine to Structured Comorbidity and Risk-Factor Fields

**Current State:** Pharmacology may not consider comorbidities  
**Target:** Pharmacology automatically considers patient risk factors

**Implementation:**
- Create `pharmacology_engine.mjs` in `backend/intelligence_core/`
- Link to structured fields:
  - Comorbidities array
  - Risk factors object
  - Allergies array
  - Current medications array
- Generate medication recommendations with contraindication checks

**Files to Modify:**
- `backend/intelligence_core/pharmacology_engine.mjs` (NEW)
- `backend/generate_case_clinical.mjs`

---

### 2.4 Calibrate Complication Probabilities Using Chronicity and Longitudinal Risk Tags

**Current State:** Complication probabilities may be generic  
**Target:** Complication probabilities calibrated to patient risk profile

**Implementation:**
- Update `generateComplicationsForDomains()` to:
  - Calculate base probability from chronicity
  - Adjust for longitudinal risk factors
  - Apply domain-specific risk multipliers
  - Return probability ranges, not fixed values

**Files to Modify:**
- `backend/intelligence_core/domain_extensions.mjs`
- `backend/intelligence_core/probabilistic_reasoning.mjs`

---

### 2.5 Synchronize Red-Flag, Complication, and Reasoning Outputs via Common Severity Model

**Current State:** Red flags, complications, and reasoning may be inconsistent  
**Target:** All outputs use unified severity model

**Implementation:**
- Create `severity_model.mjs` in `backend/intelligence_core/`
- Define severity levels:
  - `life_threatening | critical | serious | moderate | minor`
- Apply severity model to:
  - Red flags generation
  - Complication assessment
  - Reasoning prioritization

**Files to Modify:**
- `backend/intelligence_core/severity_model.mjs` (NEW)
- `backend/intelligence_core/red_flag_engine.mjs`
- `backend/intelligence_core/domain_extensions.mjs`
- `backend/intelligence_core/probabilistic_reasoning.mjs`

---

## 3. Guidelines (LMIC) Improvements

### 3.1 Filter Guideline Suggestions by Topic Tags, Acuity, and Temporal Phase

**Current State:** Guidelines may not be filtered by context  
**Target:** Guidelines filtered by topic, acuity, and phase

**Implementation:**
- Update `guideline_synthesis.mjs` to:
  - Filter by topic tags
  - Filter by acuity level
  - Filter by temporal phase
- Remove guidelines that don't match context

**Files to Modify:**
- `backend/intelligence_core/guideline_synthesis.mjs`
- `backend/intelligence_core/lmic_fallback.mjs`

---

### 3.2 Down-Rank Guideline Blocks That Conflict with Case Context and Domain Tags

**Current State:** Conflicting guidelines may appear  
**Target:** Conflicting guidelines automatically down-ranked

**Implementation:**
- Add conflict detection in `guideline_synthesis.mjs`
- Calculate conflict score:
  - Domain mismatch penalty
  - Acuity mismatch penalty
  - Phase mismatch penalty
- Sort guidelines by relevance score

**Files to Modify:**
- `backend/intelligence_core/guideline_synthesis.mjs`

---

### 3.3 Model LMIC Pathways Around Resource Tiers and Workflow Patterns, Not Documents

**Current State:** LMIC adaptations may be document-based  
**Target:** LMIC pathways based on resource tiers and workflows

**Implementation:**
- Update `lmic_fallback.mjs` to:
  - Define resource tiers: `tier_1 | tier_2 | tier_3`
  - Map workflows to resource tiers
  - Generate pathways based on available resources
  - Remove document-centric logic

**Files to Modify:**
- `backend/intelligence_core/lmic_fallback.mjs`

---

### 3.4 Prefer Prevention-Focused Guidance When Presentation is Stable and Long-Term

**Current State:** Prevention guidance may not be prioritized  
**Target:** Prevention guidance prioritized for stable, long-term cases

**Implementation:**
- Add prevention detection in `guideline_synthesis.mjs`
- Detect stable, long-term presentations
- Prioritize prevention guidelines when appropriate
- Add prevention-focused recommendations

**Files to Modify:**
- `backend/intelligence_core/guideline_synthesis.mjs`

---

### 3.5 Prevent Guideline Fallbacks from Mixing Unrelated Emergency and Chronic Frameworks

**Current State:** Fallbacks may mix emergency and chronic guidelines  
**Target:** Fallbacks preserve framework consistency

**Implementation:**
- Add framework validation in `lmic_fallback.mjs`
- Detect framework type: `emergency | chronic | preventive`
- Prevent mixing of frameworks
- Use framework-appropriate fallbacks only

**Files to Modify:**
- `backend/intelligence_core/lmic_fallback.mjs`
- `backend/intelligence_core/guideline_synthesis.mjs`

---

## 4. Education & Gamification Improvements

### 4.1 Focus Teaching Blocks on Realistic Risk Stratification and Long-Term Outcomes

**Current State:** Teaching blocks may be generic  
**Target:** Teaching blocks focus on risk stratification and outcomes

**Implementation:**
- Update `education_adaptive.mjs` to:
  - Include risk stratification examples
  - Add long-term outcome scenarios
  - Use realistic patient trajectories
- Update gamification engine to include risk-based questions

**Files to Modify:**
- `backend/intelligence_core/education_adaptive.mjs`
- `backend/intelligence_core/gamification_engine.mjs`

---

### 4.2 Add Concise Counseling Patterns for Lifestyle Change and Treatment Adherence

**Current State:** Counseling patterns may be missing  
**Target:** Counseling patterns included in education blocks

**Implementation:**
- Create `counseling_patterns.mjs` in `backend/intelligence_core/`
- Define patterns:
  - Lifestyle modification counseling
  - Medication adherence counseling
  - Preventive care counseling
- Integrate into education blocks

**Files to Modify:**
- `backend/intelligence_core/counseling_patterns.mjs` (NEW)
- `backend/intelligence_core/education_adaptive.mjs`

---

## 5. UX Architecture Improvements

### 5.1 Block Raw Placeholder Text and Serialized Objects from All User-Facing Sections

**Current State:** Placeholders may leak to users  
**Target:** All placeholders filtered before display

**Implementation:**
- Create `content_sanitizer.mjs` in `backend/intelligence_core/`
- Detect and remove:
  - Placeholder patterns: `{{...}}`, `[PLACEHOLDER]`, etc.
  - Serialized objects: `[object Object]`, JSON strings
- Apply sanitization to all case sections

**Files to Modify:**
- `backend/intelligence_core/content_sanitizer.mjs` (NEW)
- `backend/generate_case_clinical.mjs`
- `frontend/src/components/CaseView.jsx`

---

### 5.2 Enforce Section-Level Topic and Acuity Tags Before Rendering Content Blocks

**Current State:** Sections may render without proper tags  
**Target:** All sections validated before rendering

**Implementation:**
- Add validation in `case_validator.mjs`
- Require:
  - Topic tag for each section
  - Acuity tag for each section
- Block rendering if tags missing

**Files to Modify:**
- `backend/intelligence_core/case_validator.mjs`
- `frontend/src/components/CaseView.jsx`

---

### 5.3 Normalize Reasoning Chains to Single Numbering and Consistent Step Granularity

**Current State:** Reasoning chains may have inconsistent numbering  
**Target:** Reasoning chains use consistent numbering

**Implementation:**
- Update `reasoning_cleanup.mjs` to:
  - Normalize numbering (1, 2, 3...)
  - Ensure consistent step granularity
  - Remove duplicate numbering
- Apply to all reasoning outputs

**Files to Modify:**
- `backend/intelligence_core/reasoning_cleanup.mjs`
- `backend/intelligence_core/probabilistic_reasoning.mjs`

---

### 5.4 Hide or Collapse Sections When Content is Generic, Empty, or Contradictory

**Current State:** Empty or generic sections may be displayed  
**Target:** Empty/generic sections hidden or collapsed

**Implementation:**
- Add content quality checks in `case_validator.mjs`
- Detect:
  - Generic content (common phrases, templates)
  - Empty content
  - Contradictory content
- Mark sections for hiding/collapsing

**Files to Modify:**
- `backend/intelligence_core/case_validator.mjs`
- `frontend/src/components/CaseView.jsx`

---

### 5.5 Add Automated QA Checks for Conflicting Acuity, Risk, and Stability Statements

**Current State:** Conflicting statements may not be detected  
**Target:** Automated QA detects conflicts

**Implementation:**
- Create `qa_engine.mjs` in `backend/intelligence_core/`
- Check for conflicts:
  - Acuity conflicts (high acuity + stable)
  - Risk conflicts (high risk + low-risk management)
  - Stability conflicts (unstable + routine follow-up)
- Flag conflicts for review

**Files to Modify:**
- `backend/intelligence_core/qa_engine.mjs` (NEW)
- `backend/intelligence_core/case_validator.mjs`

---

## Implementation Status

### ✅ Phase 1 (Critical) - COMPLETED
1. ✅ **Acuity classifier** - `backend/intelligence_core/acuity_classifier.mjs`
2. ✅ **Content sanitizer** - `backend/intelligence_core/content_sanitizer.mjs`
3. ✅ **Severity model** - `backend/intelligence_core/severity_model.mjs`
4. ✅ **Clinical ontology** - `backend/intelligence_core/clinical_ontology.mjs`

### ✅ Phase 2 (High Priority) - COMPLETED
5. ✅ **Complication constraints** - Updated `domain_extensions.mjs` with phase/setting/risk filtering
6. ✅ **Reasoning normalization** - Updated `reasoning_cleanup.mjs` with single numbering
7. ✅ **Tone adapter** - `backend/intelligence_core/tone_adapter.mjs`
8. ✅ **QA engine** - `backend/intelligence_core/qa_engine.mjs`
9. ✅ **Integration** - All modules integrated into `generate_case_clinical.mjs`

### 🚧 Phase 3 (Medium Priority) - IN PROGRESS
10. ⏳ **Template separation** - Partial (complications constrained, full template routing pending)
11. ⏳ **Reasoning guards** - Partial (QA checks added, pathway filtering pending)
12. ⏳ **Differential filtering** - Pending (needs update to `differential_builder.mjs`)
13. ⏳ **Pharmacology engine** - Pending
14. ⏳ **Guideline filtering** - Pending (needs update to `guideline_synthesis.mjs`)

### 📋 Phase 4 (Enhancement) - PENDING
15. ⏳ **Counseling patterns** - Pending
16. ⏳ **Education improvements** - Pending
17. ⏳ **UX normalization** - Pending (frontend updates needed)
18. ⏳ **LMIC pathway modeling** - Pending

---

## Testing Strategy

1. **Unit Tests:** Each new module tested independently
2. **Integration Tests:** Modules tested together
3. **Case Generation Tests:** Full case generation with new improvements
4. **QA Validation:** Automated QA checks run on all generated cases

---

## Success Metrics

- ✅ Zero placeholder text in user-facing content
- ✅ 100% of cases have consistent acuity labels
- ✅ 0% conflicting statements in generated cases
- ✅ All guidelines filtered by context
- ✅ All reasoning chains normalized

---

## Notes

- All improvements maintain backward compatibility
- Existing cases continue to work
- New features are opt-in via configuration flags
- Gradual rollout recommended
