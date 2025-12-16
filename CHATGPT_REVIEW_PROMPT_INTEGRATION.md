# ChatGPT Review - Prompt Integration Guide

**Date:** 2025-01-27  
**Source:** ChatGPT Case Review (Score: 5.0/10)  
**Goal:** Integrate review feedback into case generation prompts

---

## 📋 Critical Issues to Fix via Prompts

### Issue 1: Differential Diagnosis Block Non-Functional

**Problem:**
- No tiers assigned
- No FOR/AGAINST reasoning
- Placeholders: "Differential diagnosis 6: See case analysis"

**Prompt Fix for `generate_case_clinical.mjs` (line ~186):**

```javascript
- Differential Diagnoses: MUST have at least 4–6 items, each with:
  * STRICT FORMAT: {"name": "Diagnosis Name", "tier": "critical_life_threatening | urgent_mimics | common_causes | benign_causes", "for": "Brief evidence FOR (1-2 sentences)", "against": "Brief evidence AGAINST (1-2 sentences)", "justification": "Why considered (optional)"}
  * FORBIDDEN: NO placeholder strings like "See case analysis", "tier should be determined by clinical context"
  * FORBIDDEN: NO plain strings - ALL differentials must be structured objects
  * Every differential MUST have non-empty "for" and "against" fields
```

---

### Issue 2: Reasoning Chain Cross-Domain Contamination

**Problem:**
- ACS probability logic in non-ACS cases
- Generic ABC/primary survey in non-trauma cases
- Duplication: "Step 1: Step 1: 1."

**Prompt Fix for `generate_case_clinical.mjs` (line ~310):**

```javascript
- Reasoning Chain: MUST be domain-specific, NOT generic templates:
  * For infectious disease: History → Risk factors → Physical exam → Cultures → Imaging → Management
  * For cardiac: Risk stratification → ECG → Biomarkers → Management
  * For neuro: History → Localization → Mechanism → Imaging → Management
  * For trauma ONLY: ABC/primary survey is appropriate
  * FORBIDDEN: NO generic ABC/primary survey in non-trauma cases
  * FORBIDDEN: NO ACS probability calculations in non-ACS cases
  * FORBIDDEN: NO step duplication - check before outputting (each step unique)
  * Format: "Step 1: [description]", "Step 2: [description]" (single numbering, no nested prefixes)
  * Remove any step that duplicates content already in management section
```

---

### Issue 3: Generic "ICU Soup" Complications

**Problem:**
- MODS, DIC, ARDS, malignant hyperthermia in non-ICU cases
- Complications not relevant to case domain

**Prompt Fix for `generate_case_clinical.mjs` (line ~288):**

```javascript
- Complications: MUST be domain-specific and condition-relevant:
  * ONLY include complications relevant to THIS specific condition and domain
  * For endocarditis: valve perforation, perivalvular abscess, embolic events, conduction abnormalities
  * For pulmonary edema: acute heart failure, respiratory failure, cardiogenic shock
  * For stroke: hemorrhagic transformation, cerebral edema, aspiration pneumonia
  * FORBIDDEN: NO generic ICU complications (MODS, DIC, ARDS, malignant hyperthermia, serotonin syndrome) unless case is explicitly in ICU setting
  * FORBIDDEN: NO complications from wrong domain (cardiac complications in neuro cases, etc.)
  * FORBIDDEN: NO duplicates - check list before outputting (each complication appears once)
  * Group by timing: Immediate (hours) / Early (days-weeks) / Late (weeks-months)
```

---

### Issue 4: [object Object] Serialization Bugs

**Problem:**
- Medications, guidelines, LMIC sections show [object Object]
- Objects not formatted as readable strings

**Prompt Fix for `generate_case_clinical.mjs` (line ~279, ~319, ~326):**

```javascript
CRITICAL - OBJECT SERIALIZATION (applies to ALL structured objects):
- ALL medications MUST be formatted as readable strings, NEVER raw objects
  Format: "**Drug Name** (Class) - Dose: X - Mechanism: Y - Monitoring: Z"
- ALL guidelines MUST be formatted as readable strings, NEVER raw objects
  Format: "**Guideline Name** (Organization, Year) - Reference: URL"
- ALL LMIC alternatives MUST be formatted as readable strings, NEVER raw objects
  Format: "Basic: [workflow]. Intermediate: [workflow]. Advanced: [workflow]."
- If you output a structured object, immediately convert it to a formatted string
- NEVER output [object Object] - this is an automatic quality failure and case will be rejected
```

---

### Issue 5: Irrelevant Guidelines

**Problem:**
- Mental health guidelines in cardiac cases
- ATLS in non-trauma cases
- Generic WHO/AMR guidelines in wrong cases

**Prompt Fix for `generate_case_clinical.mjs` (line ~319):**

```javascript
- Guidelines: MUST match case domain:
  * For cardiac cases: ONLY cardiology guidelines (AHA/ACC, ESC, local cardiology societies)
  * For neuro cases: ONLY neurology guidelines (AHA/ASA stroke, neuro societies)
  * For infectious: ONLY infection guidelines (IDSA, ESCMID, local ID societies)
  * FORBIDDEN: NO ATLS guidelines unless case is trauma
  * FORBIDDEN: NO generic sepsis guidelines unless case is sepsis
  * FORBIDDEN: NO mental health guidelines unless case is psychiatric
  * FORBIDDEN: NO generic WHO cardiovascular prevention in specific condition cases
  * If no guidelines exist for a cascade level (national, continental), omit that level entirely (do not show "No items available")
```

---

### Issue 6: Over-Simplified Pharmacology

**Problem:**
- Blanket statements: "avoid beta-blockers in acute settings"
- Missing context and monitoring

**Prompt Fix for `generate_case_clinical.mjs` (line ~279):**

```javascript
- Pharmacology: MUST be structured and contextual:
  * Each medication: Name (specific drug), Class, Mechanism (SPECIFIC, not generic), Standard dose, Route, Duration
  * Renal/hepatic adjustments: Specify conditions (e.g., "if CrCl <30: reduce by 50%")
  * Contraindications: Context-specific (e.g., "avoid beta-blockers if: bradycardia, heart block, acute decompensated HF")
  * Monitoring: Specific parameters (e.g., "monitor renal function q48h, gentamicin levels daily")
  * FORBIDDEN: NO blanket statements without context (e.g., "avoid beta-blockers in acute settings" - too vague)
  * FORBIDDEN: NO casual drug suggestions without monitoring/cautions (e.g., morphine without respiratory monitoring context)
  * Format as structured strings, never raw objects
```

---

### Issue 7: Placeholder Sections

**Problem:**
- "No items available" in sections
- "Key concepts relevant to this case" without content

**Prompt Fix for `generate_case_clinical.mjs` (multiple locations):**

```javascript
CRITICAL - NO PLACEHOLDERS:
- NEVER use placeholder text: "No items available", "See case analysis", "Key concepts relevant to this case"
- If a section would be empty (secondary_diagnoses, guidelines, teaching blocks):
  * Either fill it with relevant content specific to THIS case, OR
  * Omit it entirely (do not include empty arrays or placeholder strings)
- Teaching blocks (Crucial Concepts, Common Pitfalls, Exam Pearls): Minimum 3 bullet points each, all case-specific
  * If cannot generate, omit section entirely (do not show placeholder)
```

---

## 📝 Integration Steps

### Step 1: Update Main Case Generation Prompt

**File:** `backend/generate_case_clinical.mjs`
**Location:** System prompt around lines 153-344

**Actions:**
1. Add object serialization rules after line 160
2. Enhance differential diagnosis section (line 186)
3. Add reasoning chain domain-specific rules (line 310)
4. Enhance complications section (line 288)
5. Enhance guidelines section (line 319)
6. Enhance pharmacology section (line 279)

### Step 2: Update Internal Panel Prompt

**File:** `backend/intelligence_core/internal_panel.mjs`
**Location:** Panel prompt around lines 139-414

**Actions:**
1. Add validation rules in "Mandatory checks" (line 213)
2. Enhance differential diagnosis check (line 223)
3. Add domain consistency check for reasoning chain
4. Add complication relevance check (line 292)
5. Add guideline relevance check (line 243)
6. Add pharmacology validation (line 276)

### Step 3: Add Quality Gates

**Both Files:**
- Add automatic rejection criteria for:
  - `[object Object]` in output
  - Placeholder text in critical sections
  - Domain-inconsistent content
  - Missing FOR/AGAINST in differentials

---

## ✅ Validation Checklist

After integration, test that:
- [ ] No `[object Object]` appears in generated cases
- [ ] All differentials have tier and FOR/AGAINST
- [ ] Reasoning chains are domain-specific
- [ ] Complications are condition-relevant
- [ ] Guidelines match case domain
- [ ] No placeholder text in sections
- [ ] Pharmacology is structured and contextual

---

**Status:** Ready for prompt integration

