# External Panel Implementation Roadmap - Universal System Rules

**Date:** 2025-01-27  
**Source:** MedPlat External Global Development Panel v2.0  
**Status:** ✅ **READY FOR IMPLEMENTATION**

---

## Executive Summary

The External Panel has provided **12 detailed, actionable universal rules** based on case review analysis. These are **system-level fixes** that apply to ALL cases, not case-specific patches. All rules align with our master plan and existing implementation framework.

---

## 📋 12 Universal Implementation Rules

### Category 1: Schema & Rendering (2 rules)

1. ✅ **Schema Object Serialization Enforcement**
   - **Critical:** Automatic `[object Object]` detection → case quality failure
   - **Action:** Enforce strict schemas, always map fields explicitly in renderer
   - **File:** `EXTERNAL_PANEL_DETAILED_IMPLEMENTATION_RULES.json` (rule_id: `schema_object_serialization_enforcement`)

2. ✅ **Hide Empty/Placeholder Sections**
   - **Critical:** Hide sections with "No items available" or empty arrays
   - **Action:** Conditional rendering in frontend, hide empty guideline levels
   - **File:** `EXTERNAL_PANEL_DETAILED_IMPLEMENTATION_RULES.json` (rule_id: `hide_empty_placeholder_sections`)

### Category 2: Clinical Reasoning & Differential Engine (2 rules)

3. ✅ **Differential Structure Mandatory**
   - **High Priority:** Remove debug text, enforce structured FOR/AGAINST format
   - **Action:** Create `differential_schema.mjs`, strip debug strings automatically
   - **File:** `EXTERNAL_PANEL_DETAILED_IMPLEMENTATION_RULES.json` (rule_id: `differential_structure_mandatory`)

4. ✅ **Reasoning Chain Deduplication & Domain Filter**
   - **High Priority:** Remove duplication, filter domain-inappropriate steps
   - **Action:** Enhance `reasoning_cleanup.mjs`, add domain tags to reasoning snippets
   - **File:** `EXTERNAL_PANEL_DETAILED_IMPLEMENTATION_RULES.json` (rule_id: `reasoning_chain_deduplication_domain_filter`)

### Category 3: Management & High-Acuity Engine (2 rules)

5. ✅ **Domain-Specific High-Acuity Headers**
   - **Medium Priority:** Parameterize high-acuity text by domain + topic
   - **Action:** Update `high_acuity_engine.mjs` with domain-specific templates
   - **File:** `EXTERNAL_PANEL_DETAILED_IMPLEMENTATION_RULES.json` (rule_id: `domain_specific_high_acuity_headers`)

6. ✅ **Structured Treatment Thresholds**
   - **Medium Priority:** Create universal threshold schema with guideline linkage
   - **Action:** Create `threshold_schema.mjs`, link to guidelines
   - **File:** `EXTERNAL_PANEL_DETAILED_IMPLEMENTATION_RULES.json` (rule_id: `structured_treatment_thresholds`)

### Category 4: Complications Library (1 rule)

7. ✅ **Domain-Specific Complication Libraries**
   - **High Priority:** Filter complications by domain, remove duplicates, tag by setting
   - **Action:** Create domain-specific libraries, filter by domain/setting match
   - **File:** `EXTERNAL_PANEL_DETAILED_IMPLEMENTATION_RULES.json` (rule_id: `domain_specific_complication_libraries`)

### Category 5: Pharmacology (1 rule)

8. ✅ **Structured Medication Schema with Synergy**
   - **High Priority:** Add synergy/combination field, explicit LMIC alternatives
   - **Action:** Enhance `medication_schema.mjs`, add synergy combinations
   - **File:** `EXTERNAL_PANEL_DETAILED_IMPLEMENTATION_RULES.json` (rule_id: `structured_medication_schema_synergy`)

### Category 6: Guidelines & LMIC Logic (2 rules)

9. ✅ **Domain-Tagged Guideline Registry**
   - **Medium Priority:** Add domain_tags and condition_tags, filter by intersection
   - **Action:** Create `guideline_registry.mjs` with tag system, hide empty levels
   - **File:** `EXTERNAL_PANEL_DETAILED_IMPLEMENTATION_RULES.json` (rule_id: `domain_tagged_guideline_registry`)

10. ✅ **Structured LMIC Option Schema**
    - **Medium Priority:** Create structured LMIC workflow with resource levels
    - **Action:** Create `lmic_option_schema.mjs`, domain-specific LMIC libraries
    - **File:** `EXTERNAL_PANEL_DETAILED_IMPLEMENTATION_RULES.json` (rule_id: `structured_lmic_option_schema`)

### Category 7: Education & Exam Layer (1 rule)

11. ✅ **Linked Teaching Blocks**
    - **Medium Priority:** Link teaching items to specific case elements
    - **Action:** Create `teaching_item_schema.mjs`, link to thresholds/differentials/guidelines
    - **File:** `EXTERNAL_PANEL_DETAILED_IMPLEMENTATION_RULES.json` (rule_id: `linked_teaching_blocks`)

### Category 8: UX & Clarity (1 rule)

12. ✅ **Redundancy Compression & Quality Gate**
    - **Low Priority:** Detect and compress redundant text, add redundancy scoring
    - **Action:** Create `redundancy_detector.mjs`, add quality gate
    - **File:** `EXTERNAL_PANEL_DETAILED_IMPLEMENTATION_RULES.json` (rule_id: `redundancy_compression_quality_gate`)

---

## 🎯 Implementation Priority Order

### **Phase 1: Critical UX Blockers** (Week 1)
**Goal:** Fix immediate user experience issues

1. ✅ **Rule #1: Schema Object Serialization Enforcement**
   - Integrate `serialization_helper.mjs` into pipeline
   - Add automatic `[object Object]` detection test
   - Quality gate: reject cases with `[object Object]`

2. ✅ **Rule #2: Hide Empty/Placeholder Sections**
   - Update frontend conditional rendering
   - Hide empty guideline levels

**Impact:** Eliminates `[object Object]` bugs, cleaner UI

---

### **Phase 2: High-Priority Quality Fixes** (Week 2-3)
**Goal:** Fix major quality issues

3. ✅ **Rule #3: Differential Structure Mandatory**
   - Create `differential_schema.mjs`
   - Strip debug strings automatically
   - Enforce FOR/AGAINST structure

4. ✅ **Rule #4: Reasoning Chain Deduplication**
   - Enhance `reasoning_cleanup.mjs`
   - Add domain filtering
   - Remove duplication

5. ✅ **Rule #7: Domain-Specific Complication Libraries**
   - Create domain-specific libraries
   - Filter by domain/setting
   - Remove duplicates

**Impact:** Structured differentials, clean reasoning chains, relevant complications

---

### **Phase 3: Schema Enhancements** (Week 4-5)
**Goal:** Enhance structured data

6. ✅ **Rule #8: Structured Medication Schema with Synergy**
   - Enhance `medication_schema.mjs`
   - Add synergy combinations
   - Explicit LMIC alternatives

7. ✅ **Rule #6: Structured Treatment Thresholds**
   - Create `threshold_schema.mjs`
   - Link to guidelines
   - Quantifiable criteria

8. ✅ **Rule #10: Structured LMIC Option Schema**
   - Create `lmic_option_schema.mjs`
   - Domain-specific LMIC libraries
   - Structured workflows

**Impact:** Better structured data, gamification-ready

---

### **Phase 4: Domain Routing & Content Filtering** (Week 6-7)
**Goal:** Prevent template leakage

9. ✅ **Rule #9: Domain-Tagged Guideline Registry**
   - Create `guideline_registry.mjs`
   - Add domain/condition tags
   - Filter by intersection

10. ✅ **Rule #5: Domain-Specific High-Acuity Headers**
    - Update `high_acuity_engine.mjs`
    - Domain-specific templates
    - Parameterize by topic

**Impact:** Domain-appropriate content, no template leakage

---

### **Phase 5: Education & UX Polish** (Week 8)
**Goal:** Enhance educational value and clarity

11. ✅ **Rule #11: Linked Teaching Blocks**
    - Create `teaching_item_schema.mjs`
    - Link to case elements
    - Gamification integration

12. ✅ **Rule #12: Redundancy Compression**
    - Create `redundancy_detector.mjs`
    - Add quality gate
    - Compress redundant text

**Impact:** Better educational value, cleaner text

---

## 📁 Files Created

1. **`EXTERNAL_PANEL_DETAILED_IMPLEMENTATION_RULES.json`**
   - Complete structured rules with implementation details
   - 12 rules, each with problem pattern, universal fix, acceptance criteria
   - Ready for programmatic processing

2. **`EXTERNAL_PANEL_IMPLEMENTATION_ROADMAP.md`** (this file)
   - Executive summary
   - Priority-based implementation plan
   - Timeline and impact assessment

3. **Existing Files (Aligned):**
   - `EXTERNAL_PANEL_UNIVERSAL_FIXES.json` - Original 12 universal issues
   - `EXTERNAL_PANEL_FEEDBACK_SUMMARY.md` - Analysis summary
   - `CASE_REVIEW_ENDOCARDITIS_ANALYSIS.md` - Case review details

---

## ✅ Alignment Confirmation

### Master Plan ✅
- ✅ All rules respect Universal Case Generator architecture
- ✅ No case-specific patches
- ✅ Schema-level, engine-level, rendering-level changes only

### Existing Framework ✅
- ✅ Builds on Phase 1: Schema & Serialization foundation
- ✅ Extends SYSTEM_LEVEL_FIXES_IMPLEMENTATION_PLAN.md
- ✅ Aligned with 5-phase implementation strategy

### External Panel Process ✅
- ✅ Universal patterns only
- ✅ All fixes apply to ALL cases
- ✅ Ready for implementation

---

## 🚀 Next Steps

1. **Review Implementation Rules**
   - File: `EXTERNAL_PANEL_DETAILED_IMPLEMENTATION_RULES.json`
   - Verify all 12 rules are understood

2. **Start Phase 1 Implementation**
   - Priority: Critical UX blockers
   - Focus: Serialization enforcement + empty section hiding

3. **Track Progress**
   - Update `SYSTEM_FIXES_STATUS.md`
   - Check off rules as implemented

---

**Status:** ✅ **ALL 12 RULES DOCUMENTED AND READY FOR IMPLEMENTATION**

Each rule has:
- ✅ Clear problem pattern
- ✅ Detailed universal fix
- ✅ Implementation steps
- ✅ Acceptance criteria
- ✅ Affected modules identified

