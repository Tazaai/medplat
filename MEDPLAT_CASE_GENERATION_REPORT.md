# MedPlat Case Generation System - Complete Process Report

## Overview
This document describes the complete case generation process in MedPlat, from user selection to final case delivery, including the internal review panel system.

---

## 1. USER INPUT & SELECTION

### Frontend User Selection
- **Location**: `frontend/src/components/CaseView.jsx`
- **Selection Flow**:
  1. **Step 0**: User selects **Category** from predefined list (e.g., "Cardiology", "Neurology", "General Practice")
     - Handler: `handleCategorySelect(cat)` - Sets category, resets topic, moves to step 1
  2. **Step 1**: User selects **Topic** from category-specific topics OR enters **Custom Topic**
     - Handler: `handleTopicSelect(t)` - Sets predefined topic, clears custom topic
     - Handler: `handleCustomTopicSelect(searchValue)` - Sets custom topic (mutually exclusive with predefined)
     - Effective topic: Custom topic takes precedence if both exist
  3. **Step 2**: User clicks "Generate Case" button
     - Function: `generateCase()` - Initiates case generation
- **User Inputs**:
  1. **Category**: Medical specialty/category (required)
  2. **Topic**: Specific medical condition (required - predefined or custom)
  3. **Language**: Display language (default: "en" - from LanguageSelector component)
  4. **Region**: Geographic region for guidelines (default: "auto" - auto-detected from user location)
  5. **Mode**: Case mode - "classic", "gamified", or "simulation" (default: "classic")
  6. **Gamify**: Boolean flag for MCQ generation (optional)

### API Request
- **Endpoint**: `POST /api/dialog`
- **Route**: `backend/routes/dialog_api.mjs`
- **Request Body**:
```json
{
  "topic": "Acute ST-elevation myocardial infarction",
  "category": "Cardiology",
  "lang": "en",
  "region": "auto",
  "userLocation": "US",
  "mcq_mode": false,
  "mode": "classic"
}
```

---

## 2. INPUT VALIDATION & SANITIZATION

### Location: `backend/routes/dialog_api.mjs` (lines 12-46)

**Validation Steps**:
1. **Topic Validation**: Must be non-empty string
   - If invalid → Returns 400 error
   - Sanitized: `String(topic).trim()`

2. **Category Sanitization**: 
   - If missing/invalid → Defaults to "General Practice"
   - Sanitized: `String(category).trim() || "General Practice"`

3. **Language Sanitization**: 
   - Defaults to "en" if invalid
   - Sanitized: `String(lang).trim() || "en"`

4. **Region Detection**:
   - If "auto" or "unspecified" → Auto-detects from request headers/IP
   - Uses `detectRegion(req)` from `intelligence_core/region_detector.mjs`
   - Fallback: "global"

5. **Mode Validation**:
   - Must be one of: "classic", "gamified", "simulation"
   - Defaults to "classic" if invalid

---

## 3. CASE GENERATION PROCESS

### Location: `backend/generate_case_clinical.mjs`

### Step 1: Domain Classification
- **Function**: `determineDomains()` from `intelligence_core/domain_classifier.mjs`
- **Input**: Topic, category, region
- **Output**: Array of detected medical domains (e.g., ["cardiology", "emergency"])
- **Purpose**: Identifies which medical specialties are relevant to the case

### Step 2: Region & LMIC Detection
- **Region Inference**: Determines effective region for guidelines
- **LMIC Mode**: Detects if case is in low/middle-income country setting
- **Output**: `effectiveRegion`, `isLMIC` flag

### Step 3: Domain Extensions
- **Functions Used**:
  - `extendHistoryBasedOnDomains()` - Adds domain-specific history elements
  - `extendPhysicalExamByDomain()` - Adds domain-specific exam findings
  - `generateInvestigationsForDomains()` - Suggests domain-specific tests
  - `generateComplicationsForDomains()` - Generates domain-specific complications
  - `generatePathophysiology()` - Generates pathophysiology for domains
  - `generateDomainGuidelines()` - Maps domains to relevant guidelines

### Step 4: Intelligence Core Engines
Multiple specialized engines are called:

1. **Probabilistic Reasoning Engine** (`probabilistic_reasoning.mjs`):
   - Generates pre-test probability
   - Creates Bayesian reasoning steps
   - Builds decision trees
   - Context-aware (emergency/inpatient/outpatient)

2. **High Acuity Engine** (`high_acuity_engine.mjs`):
   - Detects high-acuity cases
   - Adds stabilization pathways (ABC, hemodynamic support)
   - Adds ICU escalation rules

3. **Consistency Engine** (`consistency_engine.mjs`):
   - Ensures consistency between sections
   - Validates acuity matches management
   - Removes placeholder content

4. **Red Flag Engine** (`red_flag_engine.mjs`):
   - Generates red flags based on case findings
   - Creates red flag hierarchy (critical/important/rare)

5. **Acuity Classifier** (`acuity_classifier.mjs`):
   - Classifies case acuity (low/moderate/high/critical)
   - Determines stability (stable/unstable)
   - Sets temporal phase (acute/subacute/chronic)

6. **Severity Model** (`severity_model.mjs`):
   - Determines severity grade
   - Links to acuity and phase

7. **Tone Adapter** (`tone_adapter.mjs`):
   - Adapts narrative tone based on acuity/context
   - Emergency vs routine language

### Step 5: LLM Case Generation
- **Model**: `gpt-4o-mini`
- **System Prompt**: Comprehensive prompt (2000+ lines) with:
  - Universal dynamic generation rules
  - Domain-aware filtering
  - Reasoning chain requirements
  - Differential diagnosis structure
  - Management segments (short/medium/long-term)
  - Complication timelines
  - Pathophysiology layers
  - Guidelines routing
  - Pharmacology structure
  - LMIC alternatives
  - Expert conference requirements
  - All 19 system-wide fixes and improvements

- **Prompt Structure**:
  1. Critical requirements (dynamic generation, no templates)
  2. Domain-aware filtering rules
  3. Reasoning chain requirements
  4. Guideline routing
  5. Mandatory content requirements
  6. Hard rules (section validity, no placeholders)
  7. JSON structure specification

### Step 6: Post-Generation Processing
After LLM generates case JSON:

1. **Schema Normalization** (`schema_normalizer.mjs`):
   - Ensures all required fields exist
   - Normalizes data types
   - Validates structure

2. **Content Sanitization** (`content_sanitizer.mjs`):
   - Removes placeholder text
   - Removes "[object Object]" strings
   - Cleans arrays and objects

3. **Reasoning Cleanup** (`reasoning_cleanup.mjs`):
   - Removes duplicate reasoning steps
   - Normalizes step numbering
   - Removes contradictory steps

4. **Case Validation** (`case_validator.mjs`):
   - Validates acuity consistency
   - Checks for placeholder differentials
   - Validates section completeness
   - Enforces differential justifications

5. **QA Engine** (`qa_engine.mjs`):
   - Scans for placeholders
   - Checks for conflicting statements
   - Validates safety

6. **Case Polish** (`case_polish.mjs`):
   - Improves narrative flow
   - Enhances readability

### Step 7: Quality Score Assignment
- **Generator Quality Score**: 0.0 - 1.0
- **Factors**:
  - Completeness of sections
  - Absence of placeholders
  - Consistency of metadata
  - Safety of recommendations
  - Educational value

---

## 4. INTERNAL REVIEW PANEL

### Location: `backend/intelligence_core/internal_panel.mjs`

### Panel Trigger Logic
**Location**: `backend/routes/dialog_api.mjs` (lines 173-183)

- **Condition**: Panel runs if `generator_quality_score < 0.9`
- **Skip Condition**: If `generator_quality_score >= 0.9`, panel is skipped
- **Purpose**: Quality-based review - only review cases that need improvement

### Panel Member Selection
**Function**: `selectPanelMembers()` (lines 14-100)

**Panel Composition** (8-10 members):
1. **Professor of Medicine** (always included)
   - Focus: Overall consistency, educational value

2. **Specialty Consultants** (up to 3)
   - Selected based on detected domains
   - Examples: Cardiologist, Neurologist, Pulmonologist

3. **Emergency Medicine Physicians** (2 for high-acuity cases)
   - Focus: Acute care protocols, stabilization

4. **General Practitioner** (always included)
   - Focus: Primary care perspective, common presentations

5. **Clinical Pharmacist** (always included)
   - Focus: Medication safety, dosing accuracy

6. **Radiologist** (if imaging present)
   - Focus: Imaging interpretation

7. **Global Health/LMIC Expert** (if LMIC mode)
   - Focus: Resource-limited settings, WHO guidelines

8. **Medical Educator** (always included)
   - Focus: Structure, clarity, exam readiness

9. **Senior USMLE Student** (always included)
   - Focus: High-yield, board-style thinking

10. **Medical Student** (always included)
    - Focus: Clarity, cognitive load

### Panel Review Process

#### TASK 1: Individual Panel Member Reviews
Each panel member reviews the case and provides:

1. **Flags**: Issues detected (e.g., "Missing justification in differential", "Inconsistent acuity")
2. **Corrections**: Specific corrections needed (e.g., "Add justification to differential #3")
3. **Quality Score**: 0.0-1.0 for their specialty area
4. **Required Fixes**: Critical fixes that must be applied

#### Review Categories (Mandatory Checks):

**0) System-Wide Fixes (12 Permanent Rules + 7 Additional Improvements)**
- All 19 system-wide fixes are checked
- Includes: differential justification, oxygen targets, infection triggers, ventilation criteria, complication timelines, red-flag harmonization, expert conference depth, ABG interpretation, pathophysiology visibility, LMIC safety, UX cleanup, panel enforcement

**1) Acuity Consistency Validation**
- Verifies consistency between metadata, severity labels, acuity tags, and management text
- Checks: severity_grade matches management urgency, acuity matches red flags, temporal_phase matches management segments, setting matches management approach
- Pattern rules: Low acuity → no ABC scripts, Outpatient → no emergency stabilization

**2) Clinical Reasoning & Safety**
- Checks for duplicates and placeholders
- Validates template bleed prevention (no cross-topic residues)
- Enforces section validity (hide empty/generic sections)
- UX cleanup (remove placeholders, double JSON, formatting issues)

**3) Differential Diagnoses**
- Requires structured rule-in/rule-out format
- Every differential MUST have justification
- Never allows "No justification provided"
- Pattern-based justifications required

**4) Diagnostics & Metrics**
- Upgrades diagnostic content (clinical interpretation, not generic statements)
- Detects mismatched labs (e.g., dipstick vs microscopy)
- Validates acuity and hypertension rules
- Structured ABG interpretation required

**5) Management & Pharmacology**
- Upgrades management quality (system-level dosing, escalation rules)
- Improves pharmacology (mechanism, indication, dosing)
- Safety escalation improvements (explicit triggers)
- Oxygen target safety rules
- Infection trigger logic
- Ventilation escalation criteria

**6) Complications**
- Complication timeline rules (match acuity, phase, setting)
- Auto-corrects mismatched timelines

**7) LMIC / Resource Tiers**
- Strengthens LMIC fallback logic (structured alternatives, no raw JSON)
- Guidelines cleanup (map topic to correct families, hide irrelevant cascades)

**8) Pathophysiology**
- Pathophysiology visibility rule (high-acuity cases expanded by default)

**9) Expert Conference**
- Improves expert conferences (real disagreement, evidence logic, uncertainty)
- Removes template-style confirmations

**10) Gamification** (if present)
- Checks MCQs for safety and accuracy

#### TASK 2: Synthesis & Refined Case

**Quality Score Calculation**:
- Computes `case_quality_score` (0.0-1.0)
- Based on: safety, coherence, guideline fit, pathophysiology depth, educational value

**Acceptance Decision**:
- **Reject/Regenerate** if:
  - Unsafe oxygen guidance
  - Missing infection-trigger management
  - Unreasoned differentials
  - Mismatched complications
  - Unsafe escalation logic
  - Generic ABG interpretation
  - Superficial expert conference
  - Logically inconsistent
  - Wrong-domain guidelines
  - Major gaps in diagnostics/management

- **Accept** if:
  - All checks pass
  - Quality score acceptable
  - No critical safety issues

**Refined Case Building**:
- Starts from original case JSON
- Applies ALL critical corrections from `required_fixes`
- Keeps schema identical (same keys and structure)
- Ensures:
  - Guidelines cleaned and in popup_reference format
  - Differential structured with FOR/AGAINST arguments
  - Pathophysiology enriched
  - Expert conference realistic
- Does NOT add panel metadata to refined_case (metadata is for debugging only)

### Panel Output Format

```json
{
  "panel_reviews": [
    {
      "role": "Cardiologist",
      "flags": ["flag1", "flag2"],
      "corrections": ["correction1", "correction2"],
      "quality_score": 0.87,
      "required_fixes": ["fix1", "fix2"]
    }
  ],
  "refined_case": {
    // Complete refined case JSON, same schema as input
    // All improvements applied
  },
  "synthesis_summary": "Brief summary of improvements",
  "case_quality_score": 0.87,
  "regenerate_case": false,
  "regenerate_sections": [],
  "critical_safety_issues": []
}
```

### Panel Rules (CRITICAL)

**The panel does NOT edit the case directly. Instead:**

1. **Review Only**: Panel reviews the case and identifies issues
2. **Corrections List**: Panel provides list of corrections needed
3. **Refined Case**: Panel builds a new `refined_case` object with corrections applied
4. **Schema Preservation**: Refined case maintains identical schema to original
5. **Metadata Tracking**: Panel modifications tracked in `meta.panel_modifications` (for debugging, not sent to frontend)
6. **Regeneration Flag**: If critical issues found, sets `regenerate_case: true`
7. **Section Regeneration**: Can request specific sections to be regenerated (future enhancement)

**Panel does NOT**:
- Modify the original case object
- Add new fields to schema
- Break existing structure
- Include panel metadata in frontend response

---

## 5. POST-PANEL PROCESSING

### Location: `backend/routes/dialog_api.mjs` (lines 209-280)

### Critical Safety Issues Handling
- If `critical_safety_issues` array has items:
  - Logs error
  - Forces `regenerate_case: true`
  - Case is rejected for regeneration

### Regeneration Logic
- If `regenerate_case: true` and attempts < maxRegenAttempts (1):
  - Regenerates entire case
  - Skips panel on regeneration (trusts generator more on second attempt)
  - Uses regenerated case if successful

### Final Case Selection
- If panel quality score acceptable and no regeneration needed:
  - Uses `panelResult.refined_case`
- If regeneration successful:
  - Uses regenerated case
- If regeneration fails:
  - Falls back to `panelResult.refined_case` or original `caseData`

### Interactive Elements (if gamified/simulation mode)
- Calls `refineInteractiveElements()` from `interactive_engine.mjs`
- Adds gamification data, branching logic, vitals timeline

---

## 6. FINAL RESPONSE

### Response Format
```json
{
  "ok": true,
  "case": {
    // Complete case JSON with all sections
    // Same schema as generator output
    // All panel corrections applied
  }
}
```

### Response Sections Include:
- `meta`: Metadata (topic, category, age, sex, setting, acuity, etc.)
- `history`: Patient history
- `physical_exam`: Physical examination findings
- `paraclinical`: Laboratory and imaging results
- `differential_diagnoses`: Ranked differentials with FOR/AGAINST/justification
- `final_diagnosis`: Primary diagnosis
- `management`: Short/medium/long-term management
- `complications`: Immediate/early/late complications
- `reasoning_chain`: Step-by-step clinical reasoning
- `red_flags`: Red flag list
- `red_flag_hierarchy`: Critical/important/rare dangerous flags
- `expert_conference`: Multi-voice expert discussion
- `pathophysiology`: Pathophysiology summary
- `pathophysiology_detail`: Detailed pathophysiology layers
- `guidelines`: Guideline references (by tier)
- `lmic_alternatives`: LMIC resource alternatives
- `pharmacology`: Medication details
- `teaching`: Teaching sections (crucial concepts, pitfalls, exam pearls)
- And more...

---

## 7. KEY SYSTEM FEATURES

### Universal Dynamic Generation
- NO static templates
- NO hardcoded content
- NO generic examples
- All content generated dynamically based on topic, specialty, region, demographics, acuity

### Domain-Aware Processing
- Detects medical domains from topic/category
- Applies domain-specific extensions
- Filters complications, guidelines, reasoning by domain
- Prevents cross-domain contamination

### Acuity-Based Logic
- Classifies acuity (low/moderate/high/critical)
- Adapts reasoning, management, complications to acuity
- High-acuity: Stabilization-first approach
- Low-acuity: Diagnostic-first approach

### Quality Assurance
- Multiple validation layers
- Placeholder detection and removal
- Consistency checks
- Safety validation
- Template bleed prevention

### Panel Review System
- Quality-based triggering (only if score < 0.9)
- Multi-specialty panel review
- Structured corrections
- Refined case generation
- Regeneration support

---

## 8. TECHNICAL ARCHITECTURE

### Core Files:
1. **`backend/routes/dialog_api.mjs`**: API endpoint, input validation, panel orchestration
2. **`backend/generate_case_clinical.mjs`**: Main case generator (1700+ lines)
3. **`backend/intelligence_core/internal_panel.mjs`**: Internal review panel (750+ lines)

### Intelligence Core Modules:
- `domain_classifier.mjs`: Domain detection
- `probabilistic_reasoning.mjs`: Reasoning engine
- `high_acuity_engine.mjs`: High-acuity case handling
- `consistency_engine.mjs`: Consistency validation
- `case_validator.mjs`: Case validation
- `qa_engine.mjs`: Quality assurance
- `reasoning_cleanup.mjs`: Reasoning cleanup
- `content_sanitizer.mjs`: Content sanitization
- `schema_normalizer.mjs`: Schema normalization
- And 20+ more specialized modules

### Model Used:
- **Primary**: `gpt-4o-mini` (OpenAI)
- **Temperature**: 0.3-0.7 (varies by component)
- **Response Format**: JSON for structured outputs

---

## 9. PANEL REVIEW RULES SUMMARY

### What Panel Does:
✅ Reviews case for quality, safety, consistency
✅ Identifies issues and provides corrections
✅ Builds refined_case with corrections applied
✅ Assigns quality scores
✅ Flags critical safety issues
✅ Can request regeneration

### What Panel Does NOT Do:
❌ Does NOT modify original case object
❌ Does NOT add new schema fields
❌ Does NOT break existing structure
❌ Does NOT send panel metadata to frontend
❌ Does NOT edit case directly (builds new refined_case)

### Panel Output:
- `refined_case`: Corrected case (same schema)
- `case_quality_score`: Overall quality (0.0-1.0)
- `regenerate_case`: Boolean flag
- `regenerate_sections`: Array of section names (optional)
- `critical_safety_issues`: Array of critical issues
- `panel_reviews`: Individual panel member reviews
- `synthesis_summary`: Summary of improvements

---

## 10. COMPLETE FLOW DIAGRAM

```
User selects category + topic
         ↓
Frontend sends POST /api/dialog
         ↓
Input validation & sanitization
         ↓
Region detection (auto or manual)
         ↓
Domain classification
         ↓
Case generation (generate_case_clinical.mjs)
    ├─ Domain extensions
    ├─ Intelligence core engines
    ├─ LLM generation (gpt-4o-mini)
    ├─ Post-processing
    └─ Quality score assignment
         ↓
Quality check: score >= 0.9?
    ├─ YES → Skip panel, return case
    └─ NO → Run internal panel review
         ↓
Internal Panel Review (internal_panel.mjs)
    ├─ Select panel members (8-10)
    ├─ Individual reviews
    ├─ Synthesis
    ├─ Build refined_case
    └─ Quality score + regeneration flag
         ↓
Critical safety issues?
    ├─ YES → Force regeneration
    └─ NO → Continue
         ↓
Regeneration needed?
    ├─ YES → Regenerate case (skip panel on retry)
    └─ NO → Use refined_case
         ↓
Interactive elements (if gamified/simulation)
         ↓
Return final case to frontend
```

---

## END OF REPORT

This report documents the complete MedPlat case generation system, from user input through generation, review, and final delivery. All processes are universal, pattern-based, and work across all medical specialties and case modes.
