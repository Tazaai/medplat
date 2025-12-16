# Prompt Improvements from External Panel Review

**Date:** 2025-01-27  
**Source:** MedPlat External Global Development Panel v2.0  
**Purpose:** Adapt External Panel suggestions into case generation prompt instructions

---

## Overview

The External Panel reviewed a generated case (endocarditis) and identified 12 universal issues. These should be **adapted into prompt instructions** that guide the LLM to generate better cases from the start, not fixed in post-processing.

**Key Principle:** These are **prompt engineering improvements**, not code changes. The LLM should be instructed to avoid these patterns during generation.

---

## 12 Prompt Improvements to Add

### 1. Schema & Object Serialization

**External Panel Finding:**
- `[object Object]` appears in Key Medications, Local Guidelines, LMIC Alternatives
- Objects not serialized before rendering

**Prompt Instruction to Add:**
```
CRITICAL - OBJECT SERIALIZATION:
- ALL medications MUST be formatted as readable strings, NEVER raw objects
- Format: "**Drug Name** (Class) - Dose: X - Mechanism: Y - Monitoring: Z"
- ALL guidelines MUST be formatted as readable strings, NEVER raw objects  
- Format: "**Guideline Name** (Organization, Year) - Reference: URL"
- ALL LMIC alternatives MUST be formatted as readable strings, NEVER raw objects
- If you output a structured object, immediately convert it to a formatted string
- NEVER output [object Object] - this is an automatic quality failure
```

---

### 2. Hide Empty Sections

**External Panel Finding:**
- "No items available" placeholders appear in sections
- Empty sections render as noise

**Prompt Instruction to Add:**
```
CRITICAL - NO PLACEHOLDERS:
- NEVER use placeholder text like "No items available", "See case analysis", "Pending"
- If a section would be empty (secondary_diagnoses, guidelines), either:
  * Fill it with relevant content specific to THIS case, OR
  * Omit it entirely (do not include empty arrays or placeholder strings)
- Empty guideline cascade levels should be omitted, not shown as "No items available"
- If secondary diagnoses exist, list them; if not, omit the section entirely
```

---

### 3. Differential Diagnosis Structure

**External Panel Finding:**
- Debug text: "(tier should be determined by clinical context)"
- Placeholder: "Differential diagnosis 6: See case analysis"
- Missing structured FOR/AGAINST reasoning

**Prompt Instruction to Add:**
```
CRITICAL - DIFFERENTIAL DIAGNOSIS FORMAT:
Each differential MUST follow this EXACT structure:
{
  "name": "Diagnosis Name",
  "tier": "critical_life_threatening | urgent_mimics | common_causes | benign_causes",
  "for": "Brief evidence FOR this diagnosis (1-2 sentences)",
  "against": "Brief evidence AGAINST this diagnosis (1-2 sentences)",
  "justification": "Why this diagnosis is considered in this specific case (optional)"
}

FORBIDDEN:
- NO debug text like "(tier should be determined by clinical context)"
- NO placeholder text like "See case analysis" or "Differential diagnosis 6: ..."
- NO plain strings - ALL differentials must be structured objects
- Minimum 4 differentials, all with FOR/AGAINST arguments
```

---

### 4. Reasoning Chain Quality

**External Panel Finding:**
- Duplicated steps: "Step 1: Step 1: 1. ..."
- ACS probability logic in non-ACS cases
- Generic ABC/primary survey in non-trauma cases

**Prompt Instruction to Add:**
```
CRITICAL - REASONING CHAIN QUALITY:
- Generate domain-specific reasoning steps, NOT generic templates
- For infectious disease cases: History → Risk factors → Physical exam → Cultures → Imaging → Management
- For cardiac cases: Risk stratification → ECG → Biomarkers → Management
- For neuro cases: History → Localization → Mechanism → Imaging → Management
- For trauma cases ONLY: ABC/primary survey is appropriate
- NO generic ABC/primary survey in non-trauma cases
- NO ACS probability calculations in non-ACS cases
- NO duplication: Each step must be unique (check before outputting)
- Steps should follow: "Step 1: [description]", "Step 2: [description]", etc. (single numbering)
- Remove any step that duplicates content already in management section
```

---

### 5. Domain-Specific High-Acuity Headers

**External Panel Finding:**
- Generic "HIGH-ACUITY CASE: Arrhythmias, cardiogenic shock, or cardiac arrest" in non-cardiac cases

**Prompt Instruction to Add:**
```
CRITICAL - DOMAIN-SPECIFIC HIGH-ACUITY TEXT:
High-acuity headers MUST be parameterized by domain + topic:

- Cardiac ischemia: "HIGH-ACUITY: STEMI/NSTEMI, arrhythmias, cardiogenic shock"
- Cardiac infection: "HIGH-ACUITY: Acute heart failure, embolic stroke, septic shock"
- Sepsis: "HIGH-ACUITY: Septic shock, multi-organ failure, disseminated infection"
- Neuro emergencies: "HIGH-ACUITY: Stroke, status epilepticus, increased ICP"
- Trauma: "HIGH-ACUITY: Hemorrhagic shock, airway compromise, spinal cord injury"

Do NOT use generic high-acuity text. Match the header to the specific condition.
```

---

### 6. Structured Treatment Thresholds

**External Panel Finding:**
- Vague thresholds: "Consider surgical intervention if..."
- No structured format or guideline linkage

**Prompt Instruction to Add:**
```
REQUIRED - STRUCTURED TREATMENT THRESHOLDS:
Treatment thresholds MUST include:
- Intervention name (e.g., "valve surgery", "thrombolysis")
- Specific trigger conditions (e.g., ["heart_failure", "recurrent_emboli", "uncontrolled_infection"])
- Evidence source (guideline citation)
- Urgency level (immediate | early | elective)
- Quantifiable criteria when possible (e.g., "EF <50%", "vegetation >10mm")

Format:
"Consider [intervention] if [specific condition 1] OR [specific condition 2]. Evidence: [guideline]. Urgency: [level]. Criteria: [quantifiable if applicable]."

NOT: "Consider surgical intervention if..." (too vague)
```

---

### 7. Domain-Specific Complications

**External Panel Finding:**
- Generic ICU complications (MODS, DIC, ARDS) appear in non-ICU cases
- Duplicates within case (e.g., "septic shock" twice)

**Prompt Instruction to Add:**
```
CRITICAL - DOMAIN-SPECIFIC COMPLICATIONS:
- ONLY include complications relevant to THIS specific condition and domain
- For endocarditis: valve perforation, perivalvular abscess, embolic events, conduction abnormalities
- For stroke: hemorrhagic transformation, cerebral edema, aspiration pneumonia
- For ACS: arrhythmias, heart failure, mechanical complications, cardiogenic shock

FORBIDDEN:
- NO generic ICU complications (MODS, DIC, ARDS) unless case is in ICU setting
- NO complications from wrong domain (cardiac complications in neuro cases, etc.)
- NO duplicates - check list before outputting (each complication appears once)

Group by timing:
- Immediate (hours): acute complications requiring immediate intervention
- Early (days to weeks): complications developing in first month
- Late (weeks to months): chronic complications, sequelae
```

---

### 8. Structured Pharmacology with Synergy

**External Panel Finding:**
- Generic mechanisms: "Inhibit bacterial cell wall synthesis"
- Missing synergy combinations, explicit LMIC alternatives

**Prompt Instruction to Add:**
```
REQUIRED - STRUCTURED PHARMACOLOGY:
Each medication MUST include:
- Name (specific drug, not class)
- Class (pharmacological class)
- Mechanism (SPECIFIC mechanism for THIS drug, not generic "inhibits cell wall")
- Standard dose (with route and frequency)
- Duration (if applicable)
- Renal adjustment (if applicable)
- Hepatic adjustment (if applicable)
- Major contraindications (list)
- Monitoring requirements (list)

For combination regimens (e.g., beta-lactam + gentamicin):
- Document synergy rationale
- Specify monitoring for each drug
- Document duration for each component

Format medications as structured strings, never raw objects.
```

---

### 9. Domain-Tagged Guidelines

**External Panel Finding:**
- Generic WHO/ATLS/sepsis guidelines in wrong cases
- Guidelines not filtered by domain

**Prompt Instruction to Add:**
```
CRITICAL - DOMAIN-SPECIFIC GUIDELINES:
Guideline cascade MUST match case domain:

- Endocarditis cases: ESC Endocarditis Guidelines, AHA/ACC Endocarditis, IDSA Endocarditis
- Stroke cases: AHA/ASA Stroke Guidelines, Danish Stroke Society (if DK region)
- ACS cases: AHA/ACC ACS Guidelines, ESC ACS Guidelines

FORBIDDEN:
- NO ATLS guidelines unless case is trauma
- NO generic sepsis guidelines unless case is sepsis
- NO generic WHO cardiovascular prevention in specific condition cases
- If no guidelines exist for a cascade level (national, continental), omit that level entirely

Format each guideline as:
- Short reference: "Organization Year Title"
- Region tag (if applicable)
- Popup reference: true
```

---

### 10. Structured LMIC Alternatives

**External Panel Finding:**
- LMIC section shows [object Object] and generic text
- Not clearly tied to case

**Prompt Instruction to Add:**
```
REQUIRED - STRUCTURED LMIC ALTERNATIVES:
LMIC alternatives MUST be case-specific and structured:

Format for each resource level (basic/intermediate/advanced):
- Resource level: "basic | intermediate | advanced"
- Domain: match case domain
- Topic: match case topic
- Workflow: step-by-step approach (array of steps)
- Safety notes: important cautions (array)

Example for endocarditis (basic level):
"Basic resource setting: High-dose oral amoxicillin if IV unavailable (monitor closely for progression). Basic transthoracic echo (TTE) instead of transesophageal echo (TEE). Conservative management with prolonged antibiotics if surgery unavailable."

Format as readable strings, never objects.
Always provide at least one safe, WHO-compatible workflow.
```

---

### 11. Linked Teaching Blocks

**External Panel Finding:**
- Teaching blocks too generic
- Not linked to specific case elements

**Prompt Instruction to Add:**
```
REQUIRED - LINKED TEACHING BLOCKS:
Each teaching item (Key Points, Pitfalls, Pearls, Notes) MUST:
- Link to specific case element (e.g., "linked_to": "paraclinical.blood_cultures")
- Add NEW educational angle, not restate basics already in History/Key Points
- Be specific to THIS case, not generic

Format:
- Title: Specific, actionable teaching point
- Linked to: Specific case element (differential, threshold, guideline, etc.)
- Type: "pitfall | pearl | concept"
- Exam relevance: "high | medium | low"

Example:
"Obtain blood cultures BEFORE antibiotics" - linked to paraclinical.blood_cultures, type: pitfall
NOT: "Endocarditis can present with non-specific symptoms" (too generic, repeats case header)
```

---

### 12. Reduce Redundancy

**External Panel Finding:**
- Generic sentences repeat case header information
- Common Pitfalls restate basics

**Prompt Instruction to Add:**
```
CRITICAL - AVOID REDUNDANCY:
- Do NOT repeat information already in History or Key Points
- Common Pitfalls should add NEW angle (e.g., consequence of missing a sign), not restate basics
- Remove generic sentences that repeat case header information
- Each teaching section (Pitfalls, Pearls, Notes) must add unique value

Before outputting, check:
- Is this concept already covered in History? → Remove if yes
- Is this already in Key Points? → Remove if yes
- Does this add a NEW educational angle? → Keep only if yes

Compress and de-duplicate educational text. Be concise.
```

---

## Implementation: Where to Add These

### 1. Main Case Generation Prompt (`generate_case_clinical.mjs`)

**Location:** Around line 153-344 (in the `systemPrompt`)

**Add sections:**
- After "CRITICAL REQUIREMENTS" (line 155)
- After "MANDATORY CONTENT REQUIREMENTS" (line 165)
- After "HARD RULES" (line 218)
- In the differential diagnoses section (line 186)
- In the pharmacology section (line 279)
- In the complications section (line 288)
- In the guidelines section (line 319)

### 2. Internal Panel Prompt (`internal_panel.mjs`)

**Location:** Around line 139-414 (in the `panelPrompt`)

**Add sections:**
- In "TASK 1 – PANEL REVIEW" (line 201)
- After "Mandatory checks" (line 213)
- In differential diagnoses check (line 223)
- In guidelines check (line 243)
- In complications check (line 292)
- In pharmacology check (line 276)

### 3. Quality Scoring Instructions

**Add to both prompts:**
```
AUTOMATIC QUALITY FAILURES (case rejected):
- ANY instance of "[object Object]" in output
- Empty sections with placeholder text ("No items available")
- Debug text in differentials ("tier should be determined")
- Generic ABC steps in non-trauma cases
- Wrong-domain guidelines (ATLS in non-trauma, sepsis in non-sepsis)
- Duplicate complications or reasoning steps
- Generic high-acuity headers not matching domain
```

---

## Next Steps

1. **Review these prompt improvements** and adapt to your prompt structure
2. **Integrate into** `generate_case_clinical.mjs` system prompt
3. **Integrate into** `internal_panel.mjs` panel prompt  
4. **Test** with a new case generation
5. **Validate** that External Panel suggestions are addressed

---

**Status:** ✅ **PROMPT IMPROVEMENTS DOCUMENTED - READY FOR INTEGRATION**

