# 🧠 MedPlat Global AI Improvement Guide

**Version:** 1.0  
**Last Updated:** November 8, 2025  
**Purpose:** Safe, structured AI self-improvement for medical case generation quality

---

## 🎯 Mission Statement

> **MedPlat's goal is to produce globally validated, professor-level medical cases — dynamically adaptive, clinically accurate, and pedagogically superior — while keeping full human control over system design and production.**

---

## 🧩 Core Principles

### 1. Dynamic, Global Improvement

**Apply refinements to ALL cases and specialties** — never as hardcoded fixes for one topic.

✅ **Correct Approach:**
- Pattern-based logic that adapts to ANY topic (Cardiology, Neurology, Toxicology, Pediatrics, Surgery, etc.)
- Context-aware reasoning (emergency vs chronic, resource-rich vs limited, adult vs pediatric)
- Scalable quality improvements across all regions and languages

❌ **Prohibited Approach:**
- Hardcoded content for specific diagnoses (e.g., "if MI then troponin 2.5")
- Static examples that don't generalize
- Specialty-specific rules that don't apply universally

### 2. Stage 1 Quality Target (Professor-Level Baseline)

**Every raw case should reach ≥95% quality BEFORE panel review.**

**Strengthen these areas dynamically:**

#### Clinical Depth
- Enforce numeric values with units (temp °C/°F, BP mmHg, HR bpm, SpO2 %, labs with reference ranges)
- Include mild/borderline findings for realism (not every value at extremes)
- Complete neurological assessment even if "normal" (GCS, cranial nerves, motor/sensory, reflexes, gait)
- Hemodynamic profiling (warm/cold perfusion, wet/dry volume status)

#### Context-Rich History
- Occupational exposures (chemicals, dust, stress, shift work)
- Living situation (housing type, stairs, family support, isolation risk)
- Baseline functional status (ADLs, mobility aids, exercise tolerance)
- Medication adherence patterns and recent dose changes
- Environmental exposures (travel, pets, hobbies, recent infections)

#### Pathophysiology Chain
- Structured flow: molecular/biochemical → cellular dysfunction → organ system → clinical manifestation
- Cross-system consequences (e.g., hypoxia → pulmonary vasoconstriction → RV strain)
- Physiological precision with cause-and-effect reasoning

#### Evidence & Statistics (Dynamic Auto-Generation)
- Comparative test data (sensitivity/specificity % for relevant diagnostics)
- ONE global guideline (WHO/ESC/AHA/NICE) with year and title
- ONE region-specific statistic (auto-matched to user location)
- Prognostic data (mortality %, survival, functional outcomes)

#### Teaching & Learning (MANDATORY)
- ≥2 diagnostic pearls (specific clinical insights)
- ≥2 reflection questions (clinical reasoning + management)
- ≥2 learning objectives per case
- Mnemonics with clinical application context
- Common pitfalls with clinical consequences

### 3. Stage 2 Internal Expert Panel (Lightweight Validator)

**Focus on micro-refinement only; no structural rewriting.**

- Validate completeness, realism, and clinical reasoning depth
- Maintain auto-regeneration loop if score < 0.95
- Add region-specific guideline alignment while preserving realistic variability
- Preserve Stage 1 generator metadata (generator_version, quality_estimate)

---

## 🔒 AI Learning Safety Rules

> **Panel feedback and specialist suggestions are for internal AI reasoning improvement only — NOT for production deployment or UI modification.**

### ✅ Copilot MUST:
1. Use feedback to fine-tune reasoning, guideline integration, and content consistency
2. Improve medical accuracy, evidence depth, and teaching quality
3. Strengthen pathophysiology explanations and differential reasoning
4. Enhance regional guideline adaptation dynamically

### 🚫 Copilot MUST NOT:
1. Auto-modify frontend, gamification, or UX design without explicit approval
2. Apply unreviewed researcher or developer suggestions to production code
3. Change interactive logic, UI components, or user workflows autonomously
4. Modify deployment configurations, secrets, or infrastructure

### 📋 Required Approval Process:
- **Medical Content Changes:** Automatic improvement allowed (within quality guidelines)
- **UI/UX Changes:** Require explicit maintainer approval + PR review
- **Code Architecture Changes:** Require explicit maintainer approval + testing
- **Deployment Changes:** Require explicit maintainer approval + staging validation

---

## 📐 Implementation Guidelines

### File-Level Responsibilities

#### `backend/generate_case_clinical.mjs` (Stage 1: Professor-Level Generator)
**Purpose:** Generate ≥95% quality cases on first pass

**Allowed Improvements:**
- Enhance system prompt with richer medical detail
- Add dynamic evidence generation logic
- Strengthen pathophysiology chain instructions
- Improve teaching point quality requirements
- Add regional guideline auto-selection logic

**Prohibited Changes:**
- Hardcoded content for specific diagnoses
- Static lookup tables that don't generalize
- Changes that reduce flexibility or adaptability

#### `backend/routes/internal_panel_api.mjs` (Stage 2: Internal Panel Validator)
**Purpose:** Lightweight validation and micro-refinement

**Allowed Improvements:**
- Refine quality scoring criteria
- Enhance regeneration trigger logic
- Improve panel composition based on specialty
- Strengthen validation prompts

**Prohibited Changes:**
- Heavy rewriting of cases (should stay lightweight)
- Removal of Stage 1 metadata preservation
- Changes that break the two-stage architecture

#### Frontend Components (Protected from Auto-Changes)
**Files:** `CaseView.jsx`, `CaseDisplay.jsx`, `Level2CaseLogic.jsx`, etc.

**Allowed with Approval:**
- Bug fixes (after manual testing)
- Performance optimizations (after benchmarking)
- Accessibility improvements (after review)

**Prohibited without Approval:**
- UI/UX redesigns
- Gamification logic changes
- Loading states or user feedback modifications

---

## 🧪 Quality Validation

### Self-Check Criteria (Apply to EVERY Case)

**Completeness: 100%**
- All 15 sections filled with realistic content
- No empty fields or placeholders ("etc.", "...", "TBD")
- Numeric values include units

**Clinical Accuracy: ≥95%**
- Realistic values with physiological consistency
- No conflicting findings without explanation
- Clinical scores when relevant (NIHSS, Killip, SOFA, Wells, PERC, CURB-65)

**Guideline Adherence: ≥95%**
- Region-appropriate guidelines cited (society, year, recommendation class)
- Evidence-based management with timing windows
- Regional formulary awareness

**Pathophysiology Depth: ≥95%**
- Molecular → clinical flow with cross-system effects
- Cellular mechanisms explained
- Direct connection to patient symptoms

**Educational Value: ≥95%**
- ≥2 pearls, ≥2 reflection questions, ≥2 learning objectives
- Mnemonics with clinical application
- Common pitfalls with consequences

---

## 📊 Continuous Improvement Process

### 1. Collect Feedback
- Store panel discussion outputs for training
- Log quality scores with topic/category/region metadata
- Track regeneration frequency and reasons

### 2. Analyze Patterns
- Identify common quality gaps across specialties
- Detect regional guideline inconsistencies
- Find teaching content weaknesses

### 3. Refine Prompts
- Update Stage 1 system prompt with generalizable improvements
- Strengthen Stage 2 validation criteria
- Enhance evidence generation logic

### 4. Validate Improvements
- Test across multiple specialties and regions
- Verify quality score improvements
- Ensure no regression in other areas

### 5. Deploy Safely
- Medical content improvements: automatic (within guidelines)
- Code/UI changes: require approval + testing
- Monitor telemetry: `📊 Quality Metrics | Topic: X | Score: 0.XXX`

---

## 🚨 Safety Boundaries

### Medical Content Domain (AI-Driven Improvement Allowed)
- Case generation prompts
- Quality validation criteria
- Evidence integration logic
- Teaching content requirements
- Differential reasoning depth
- Pathophysiology explanations

### System Design Domain (Human Approval Required)
- Frontend UI/UX
- Gamification logic
- User workflows
- Deployment configurations
- Database schema
- API contracts

### Red Lines (Never Auto-Change)
- Secret management
- Authentication/authorization
- Production deployment scripts
- User data handling
- Payment/billing logic
- External integrations

---

## 🎓 Examples of Safe AI Improvements

### ✅ Allowed (Automatic)
```javascript
// BEFORE: Generic teaching point
"Monitor patient closely"

// AFTER: Specific, actionable teaching
"Monitor BP every 15min × 1h, then hourly. Target MAP >65 mmHg. If systolic <90 despite 2L fluids, start norepinephrine 0.1-0.5 mcg/kg/min."
```

### ✅ Allowed (Automatic)
```javascript
// BEFORE: Vague pathophysiology
"Inflammation causes tissue damage"

// AFTER: Molecular → clinical chain
"TNF-α and IL-1β activate NFκB → upregulate COX-2 → produce PGE2 → sensitize peripheral nociceptors (pain) + dilate cerebral vessels (headache) + hypothalamic set-point elevation (fever)"
```

### 🚫 Prohibited (Requires Approval)
```jsx
// BEFORE: Loading spinner
<div className="animate-spin h-8 w-8 border-4 border-blue-500">

// AFTER: Different UI design
<div className="spinner-custom-animation rainbow-gradient">
```

### 🚫 Prohibited (Requires Approval)
```javascript
// BEFORE: Gamification scoring
score = correctAnswers / totalQuestions

// AFTER: New scoring algorithm
score = (correctAnswers * timeBonus * difficultyMultiplier) / totalQuestions
```

---

## 📝 Commit Message Format for AI Improvements

### Medical Content Improvements (Automatic)
```
feat: enhance pathophysiology depth across all specialties

- Add molecular → cellular → organ → clinical flow requirement
- Mandate ≥1 cross-system consequence per case
- Strengthen evidence generation with sensitivity/specificity %

Backend: Professor-v2 global quality upgrade
Generator: Stage 1 enhancement (no UI changes)
```

### UI/Code Changes (Requires Approval)
```
feat: add custom region input option

- Added "Other..." option to region dropdown
- Users can specify custom country names
- Backend already supports custom region strings

Frontend: Custom region input
Approved by: @maintainer
PR: #123
```

---

## 🔄 Version History

- **v1.0** (Nov 8, 2025): Initial guide - Safe AI improvement boundaries
  - Defined medical content vs system design domains
  - Established approval requirements
  - Documented quality targets and validation criteria

---

## 📞 Questions or Concerns?

If unsure whether a change requires approval:
1. Check domain boundaries above
2. Ask: "Does this change UI, UX, or user workflows?" → Needs approval
3. Ask: "Does this improve medical accuracy without code changes?" → Automatic
4. When in doubt, request approval

**Contact:** Repository maintainers via GitHub Issues

---

*This guide ensures MedPlat maintains professor-level medical quality while preventing unsafe autonomous changes to system design and user experience.*
