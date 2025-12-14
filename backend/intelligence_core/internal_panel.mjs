// backend/intelligence_core/internal_panel.mjs
// Dynamic Internal Expert Panel - Single GPT call with structured prompting

import OpenAI from "openai";
import { upgradeExpertConference, upgradePathophysiology, upgradeManagement } from "./ai_model_admin.mjs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Select panel members dynamically based on case characteristics
 * QUALITY MODE: Full panel power (8-10 members)
 */
function selectPanelMembers(caseData, domains, isLMIC, hasImaging, acuity) {
  const members = [];
  
  // 1. Professor of Medicine (always included)
  members.push({
    role: "Professor of Medicine",
    specialty: "General Medicine",
    focus: "Overall case consistency, educational value, and clinical reasoning"
  });
  
  // 2. Specialty consultants (up to 3, from detected domains)
  const specialtyMap = {
    "cardiology": "Cardiologist",
    "neurology": "Neurologist",
    "infectious": "Infectious Disease Specialist",
    "respiratory": "Pulmonologist",
    "gastroenterology": "Gastroenterologist",
    "nephrology": "Nephrologist",
    "endocrinology": "Endocrinologist",
    "psychiatry": "Psychiatrist",
    "obgyn": "Obstetrician-Gynecologist",
    "pediatrics": "Pediatrician",
    "trauma": "Trauma Surgeon",
    "emergency": "Emergency Medicine Physician"
  };
  
  let specialtyCount = 0;
  for (const domain of domains) {
    if (specialtyCount >= 3) break;
    const specialty = specialtyMap[domain];
    if (specialty && !members.find(m => m.specialty === specialty)) {
      members.push({
        role: specialty,
        specialty: specialty,
        focus: `Domain-specific accuracy for ${domain} cases`
      });
      specialtyCount++;
    }
  }
  
  // 3. Emergency Medicine Physicians (2 for high acuity)
  if (acuity === "high" || acuity === "critical" || domains.includes("emergency")) {
    members.push({
      role: "Emergency Medicine Physician",
      specialty: "Emergency Medicine",
      focus: "Acute care protocols, time-critical decisions, stabilization"
    });
    if (members.length < 9) {
      members.push({
        role: "Emergency Medicine Physician (Senior)",
        specialty: "Emergency Medicine",
        focus: "Advanced life support, critical care transitions"
      });
    }
  }
  
  // 4. General Practitioner (always included)
  members.push({
    role: "General Practitioner",
    specialty: "Primary Care",
    focus: "Primary care perspective, common presentations, differential diagnosis"
  });
  
  // 5. Clinical Pharmacist (always included)
  members.push({
    role: "Clinical Pharmacist",
    specialty: "Pharmacology",
    focus: "Medication safety, drug interactions, dosing accuracy"
  });
  
  // 6. Radiologist (if imaging present)
  if (hasImaging) {
    members.push({
      role: "Radiologist",
      specialty: "Radiology",
      focus: "Imaging interpretation, appropriate imaging selection"
    });
  }
  
  // 7. Global health / LMIC expert (if LMIC triggered)
  if (isLMIC) {
    members.push({
      role: "Global Health / LMIC Expert",
      specialty: "Global Health",
      focus: "Resource-limited settings, WHO guidelines, cost-effective care"
    });
  }
  
  // Ensure we have 8-10 members (quality mode)
  while (members.length < 8) {
    members.push({
      role: "General Medicine Consultant",
      specialty: "General Medicine",
      focus: "Clinical reasoning and case quality"
    });
  }
  
  // Limit to 10 members max
  return members.slice(0, 10);
}

/**
 * Run internal expert panel review - single GPT call with structured prompting
 */
export async function runInternalPanel(rawCase, options = {}) {
  try {
    const {
      domains = [],
      isLMIC = false,
      region = "global",
      acuity = "moderate",
      model = "gpt-4o" // Force gpt-4o
    } = options;
    
    // Check if case has imaging
    const hasImaging = !!(rawCase.paraclinical?.imaging || 
                          rawCase.paraclinical?.diagnostic_evidence?.imaging);
    
    // Select panel members dynamically
    const panelMembers = selectPanelMembers(rawCase, domains, isLMIC, hasImaging, acuity);
    
    // Create structured prompt for panel review (v3.1)
    const topic = rawCase.meta?.topic || 'Unknown';
    const area = rawCase.meta?.category || 'General Medicine';
    
    const panelPrompt = `## MEDPLAT INTERNAL EXPERT PANEL v3.1

You are the INTERNAL EXPERT PANEL for MedPlat.

Your job is to take a raw generated clinical case and:

1) review it as a multi-expert panel,

2) fix it,

3) reject it if quality is unsafe or structurally wrong.

INPUT:

- case_json: ${JSON.stringify(rawCase, null, 2)}

- region: ${region}

- lmic_mode: ${isLMIC ? 'Yes' : 'No'}

- acuity: ${acuity}

- topic: ${topic}

- area: ${area}

PANEL ROLES (DYNAMIC – choose only those relevant to THIS case):

Core roles (almost always relevant):

1. Professor of Medicine (overall coherence, teaching value)

2. Topic Specialists (2–3 specialists dynamically chosen based on area/topic)

3. General Practitioner (realistic primary-care & common-presentations view)

4. Clinical Pharmacist (doses, interactions, contraindications, safety)

5. LMIC / Global Health Expert (if lmic_mode = Yes or region is low-resource)

6. Medical Educator / Exam Expert (structure, clarity, exam readiness)

7. Senior USMLE Student (Step 2/3 level – high-yield focus, board-style thinking)

8. Medical Student (early clinical years – clarity, cognitive load, confusion points)

Context-dependent (ONLY if clinically relevant):

9. Emergency Physician (for acute/ED/critical or trauma-style presentations)

10. Radiologist (ONLY if imaging text is present and important for decisions)

Act as ALL relevant roles simultaneously, but do NOT invent roles that are not needed for this topic/acuity.

CONTEXT:

- Model: GPT-4o for case generation.

- Goal: world-class, exam-ready, clinically realistic cases WITHOUT human review.

- No ECG or radiology images are available; only text descriptions.

TASK 1 – PANEL REVIEW (PER-ROLE, CASE-SPECIFIC)

For each relevant role, output:

- flags: key issues (bullet list)

- corrections: 4–6 case-specific corrections, concise but professional

- quality_score: 0.0–1.0

- required_fixes: concrete fixes that MUST be applied

Mandatory checks (PATTERN-BASED, NOT condition-specific):

0) REQUIRED: SYSTEM-WIDE FIXES (12 Permanent Rules + 7 Additional Improvements):

ADDITIONAL IMPROVEMENTS (Universal, Pattern-Based):

a) KILL TEMPLATE BLEED:
   - Reasoning chains MUST start from case context (actual findings from THIS case)
   - BAN cross-topic residues (e.g., ACS logic in renal cases, cardiac logic in neurological cases)
   - Each reasoning step MUST reference specific case data, not generic disease templates

b) ENFORCE SECTION VALIDITY:
   - If content is empty or generic, HIDE the section (omit from output)
   - Never output placeholder strings or online artifacts like "[object Object]"
   - Panel MUST remove or hide empty/generic sections

c) STRENGTHEN INTERNAL CONSISTENCY CHECKS:
   - Detect and flag mismatched labs (e.g., dipstick vs microscopy inconsistencies)
   - Validate acuity and hypertension rules
   - Force coherent phase + complications (acute phase → immediate/early complications, chronic phase → late complications)

d) GUIDELINES + LMIC CLEANUP:
   - Map topic → correct guideline families (hide irrelevant cascades)
   - Prevent raw JSON leakage (normalize all entries)
   - Normalize LMIC blocks (structured format, no raw JSON)
   - FAILURE RULE: If guidelines include items outside topic domain → auto-clean or request regeneration
   - Panel MUST remove guidelines unrelated to case topic (mental health, trauma, dermatology, psychiatry unless relevant)

e) REASONING AND DIFFERENTIAL UPGRADES:
   - Require structured rule-in/rule-out format for all differential reasoning
   - Use pattern-based consistency across all topics (not topic-specific rules)

f) SAFETY ESCALATION IMPROVEMENTS:
   - Explicit escalation triggers (ICU, dialysis, rapid deterioration) with exact criteria
   - Clear framing of emergency vs urgency

g) CONFERENCE REALISM:
   - Enforce disagreement and evidence-based reasoning
   - Remove templated confirmations

0) REQUIRED: SYSTEM-WIDE FIXES (12 Permanent Rules):

a) DIFFERENTIAL JUSTIFICATION FIX:
   - Enforce that every differential diagnosis ALWAYS has a justification
   - NEVER allow literal strings like "No justification provided" to appear
   - If justification is missing, panel MUST synthesize a short, pattern-based explanation (e.g., "Acute onset pattern with fever suggests infectious etiology" or "Chronic progressive pattern with risk factors suggests degenerative process")
   - Pattern-based, not disease-specific

b) OXYGEN TARGET SAFETY RULE:
   - Align O2 targets with shared acuity/stability logic:
     * In suspected chronic CO₂ retention patterns → target should NEVER exceed safe universal range (88-92% SpO₂)
     * Acute-only, no-retention patterns → allow higher targets (94-98% SpO₂) but ONLY if consistent with red-flag hierarchy
   - Internal panel MUST correct inconsistencies automatically
   - Check that oxygen targets match meta.acuity and meta.stability

c) INFECTION TRIGGER LOGIC (Universal):
   - If history includes fever + leukocytosis + sputum increase → treat as "infection-trigger pattern"
   - Management MUST reflect infection-trigger pattern (appropriate antimicrobial approach)
   - No drug names, no condition-specific rules - use pattern-level logic
   - Panel MUST detect missing treatment and patch or regenerate relevant section

d) VENTILATION ESCALATION CRITERIA:
   - Ventilation escalation (NIV / invasive) MUST use pattern-level criteria:
     * Fatigue indicators (e.g., "increased work of breathing with accessory muscle use")
     * Mental-status change (e.g., "altered mental status or decreased responsiveness")
     * Worsening gas pattern (e.g., "progressive hypercapnia or worsening hypoxemia")
     * Persistently high work of breathing (e.g., "respiratory rate >30 despite treatment")
   - Panel MUST reject or correct vague phrases like "consider NIV if persists"

e) COMPLICATION TIMELINE RULES:
   - Complications MUST match: acuity, phase, setting
   - For example, avoid late-phase complications appearing in acute settings unless clearly justified
   - Panel MUST auto-correct mismatched complication timelines

f) RED-FLAG HARMONIZATION:
   - Red-flag list, red-flag thresholds, and acuity labels MUST use one unified internal ontology
   - Panel MUST detect and correct mismatches, especially when red-flag thresholds contradict oxygen target or phase

g) EXPERT CONFERENCE DEPTH UPGRADE:
   - Conference MUST include: (1) Disagreement between at least two positions, (2) Reasoning tradeoffs, (3) Short evidence-level or uncertainty notes, (4) Final justified consensus
   - Panel MUST rewrite superficial conferences

h) STRUCTURED ABG INTERPRETATION:
   - When ABG exists, generator MUST ALWAYS include: numeric ranges or qualitative patterns, interpretation logic (pattern-level, not disease-specific)
   - Panel MUST prevent generic sentences like "indicates hypoxemia"

i) PATHOPHYSIOLOGY VISIBILITY RULE:
   - High-acuity cases must NOT hide pathophysiology by default
   - Expand or force visibility unless user collapses manually

j) LMIC SAFETY DEFAULTS:
   - LMIC sections must: hide noisy or irrelevant blocks, include fallback when ABG or advanced ventilation is unavailable
   - Panel MUST auto-clean messy LMIC entries
   - REJECT cases with raw JSON strings in LMIC alternatives (must be plain text)
   - REQUIRED: LMIC alternatives MUST contain triggers + actions + monitoring
   - Panel MUST check each LMIC alternative has: trigger (when to use), action (what to do), monitoring (what to monitor)
   - If any LMIC alternative missing trigger/action/monitoring, patch or regenerate

k) EXPERT CONFERENCE ENFORCEMENT:
   - REJECT cases with missing expert_conference section
   - Expert conference is MANDATORY for all cases
   - If missing, set regenerate_case = true

l) PATHOPHYSIOLOGY ENFORCEMENT:
   - REJECT cases with layered/double pathophysiology (multiple pathophysiology sections)
   - Must be single integrated pathophysiology block
   - If multiple sections detected, set regenerate_case = true

m) MANAGEMENT STRUCTURE ENFORCEMENT:
   - REJECT cases with missing management.initial, management.definitive, management.escalation, or management.disposition
   - All four fields are MANDATORY
   - If any missing, set regenerate_case = true
   - Ensure management structure is stable (no nested objects, no "[object Object]")

k) UX CLEANUP:
   - Panel MUST remove or replace: placeholder noise, double JSON, inconsistent formatting, content mismatches across sections

l) INTERNAL PANEL ENFORCEMENT:
   - Internal panel MUST reject or regenerate: unsafe oxygen guidance, missing infection-trigger management, unreasoned differentials, mismatched complications, unsafe escalation logic
   - Structured logs MUST reflect which fixes were applied

1) REQUIRED: Acuity Consistency Validation (Pattern-Based)

- Verify consistency between metadata, severity labels, acuity tags, and management text:
  * meta.severity_grade MUST match management urgency and tone
  * meta.acuity MUST match red flags and complication timelines
  * meta.temporal_phase MUST match management segments (short/medium/long-term)
  * meta.setting MUST match management approach (outpatient ≠ emergency stabilization)
  * All labels across sections MUST be internally consistent
- PATTERN RULE: If acuity is "low" or "routine" → NO generic ABC/resuscitation scripts, NO HIGH-ACUITY prefixes
- PATTERN RULE: If setting is "outpatient" → NO emergency stabilization steps, NO ICU escalation rules
- PATTERN RULE: If stability is "stable" → NO critical red flags, NO immediate life-threatening complications
- PATTERN RULE: If acuity is "critical" or "high" → MUST have appropriate red flags, MUST have urgent management tone
- Reject or flag any case where generic life-threat scripts (ABC/resuscitation) are used in clearly low-risk scenarios
- If case has low-acuity metadata (low/routine) but HIGH-ACUITY management prefix, this is an ERROR
- If case has outpatient setting but emergency stabilization steps, this is a WARNING

2) Clinical Reasoning & Safety (CHECK FOR DUPLICATES AND PLACEHOLDERS)

- History, exam, investigations, diagnosis, management must be coherent and safe.

- Red flags must be appropriate for THIS topic and acuity.

- Explicitly mark any unsafe or misleading advice.

- REQUIRED: Check for repeated red-flag loops in reasoning_chain:
  * If reasoning_chain has multiple identical red-flag steps, remove duplicates
  * If reasoning_chain has duplicated reasoning fragments, normalize to single numbering
  * Ensure each reasoning step adds unique value (no redundant conclusions)

- REQUIRED: Check for raw placeholders and schema glitches:
  * Scan for "[object Object]", "See case analysis", "placeholder", "not provided", "pending"
  * If found, either rewrite the section with proper content or flag for regeneration
  * Ensure no double-encoded JSON (strings containing JSON strings)

2) Differential Diagnoses (REQUIRED JUSTIFICATION FIX, STRUCTURED RULE-IN/RULE-OUT)

- REQUIRED: REASONING AND DIFFERENTIAL UPGRADES:
  - Require structured rule-in/rule-out format for all differential reasoning
  - Format: "Rule IN: [finding supports diagnosis]. Rule OUT: [finding argues against alternative]"
  - Use pattern-based consistency across all topics (not topic-specific rules)
- REQUIRED: Every differential diagnosis MUST have a justification field
- FORBIDDEN: Never allow literal strings like "No justification provided"
- If justification is missing, panel MUST synthesize a short, pattern-based explanation
- Differential list must be structured:

  * Critical life-threatening

  * Urgent/important mimics

  * Common

  * Benign

- For EACH differential:

  * Add one short "FOR" argument.

  * Add one short "AGAINST" argument.

  * REQUIRED: Add justification (pattern-based, e.g., "Acute onset with fever pattern suggests infectious etiology")

- Remove differentials that are not realistically considered for THIS case.

3) Guidelines & Geolocation

- Use REGION-based cascade: local → national → continental → US → WHO.

- Remove guidelines not domain-correct for THIS topic. Guidelines must be directly relevant to the specific condition being presented, not just the general category.

- FAILURE RULE: If guidelines include items outside topic domain → auto-clean or request regeneration
  * Panel MUST remove guidelines unrelated to case topic (mental health, trauma, dermatology, psychiatry unless relevant)
  * Panel MUST check each guideline for domain match
  * If >50% of guidelines are unrelated, set regenerate_case = true

- For each guideline kept:

  * Store only short reference (org, year, title, region).

  * Mark as \`"popup_reference": true\` for frontend popup display.

- Do NOT dump long guideline text into the case.

4) Diagnostics & Metrics (STRUCTURED ABG INTERPRETATION, INTERNAL CONSISTENCY CHECKS, UPGRADED DIAGNOSTIC CONTENT)

- REQUIRED: UPGRADE DIAGNOSTIC CONTENT:
  - Ensure labs + imaging have clinical interpretation, not generic statements (e.g., "Troponin 0.85 ng/mL (elevated, >0.04) indicates myocardial injury, consistent with acute MI" not "Labs are abnormal")
  - Eliminate mismatches (e.g., lab/RBC inconsistency - if dipstick shows protein, microscopy MUST be consistent)
  - Unify bedside vs advanced diagnostics into structured pattern (bedside → advanced with clear escalation)
- REQUIRED: STRENGTHEN INTERNAL CONSISTENCY CHECKS:
  - Detect and flag mismatched labs (e.g., dipstick shows protein but microscopy shows no casts - flag inconsistency)
  - Validate acuity and hypertension rules (if case has hypertension, ensure BP values and management align)
  - Force coherent phase + complications (acute phase must have immediate/early complications, chronic phase must have late complications)
- REQUIRED: STRUCTURED ABG INTERPRETATION:
  - When ABG exists, generator MUST ALWAYS include: numeric ranges or qualitative patterns, interpretation logic (pattern-level, not disease-specific)
  - Panel MUST prevent generic sentences like "indicates hypoxemia"
  - ABG interpretation MUST include: pH, pCO2, pO2, HCO3 values and pattern interpretation
- Check that required investigations for THIS topic are present.

- Add or adjust where relevant:

  * Serial troponin or serial lab reasoning.

  * Sensitivity/specificity and LR+/LR− for key tests.

  * Risk scores appropriate for this topic and condition:
    - Cardiac: GRACE, TIMI, HEART, CRUSADE (select based on condition)
    - Neurological: NIHSS, mRS, CHA₂DS₂-VASc (for AF), ABCD² (for TIA)
    - Infectious: SOFA, qSOFA, CURB-65, SIRS, APACHE (select based on condition)
    - Other: Wells (PE), PERC (PE), Ranson (pancreatitis), Child-Pugh (liver)
    - Use the most appropriate score(s) for THIS specific condition

- Do NOT instruct viewing real ECG/images; only text-based interpretation.

5) Management & Pharmacology (STRUCTURED ENTRIES REQUIRED, OXYGEN TARGETS, INFECTION TRIGGERS, VENTILATION CRITERIA, SAFETY ESCALATION, UPGRADED MANAGEMENT QUALITY)

- REQUIRED: UPGRADE MANAGEMENT QUALITY:
  - System-level dosing logic: Steroids (prednisone 0.5-1 mg/kg/day), antibiotics (dose ranges by class), antihypertensives (start low, titrate) - non-country-specific
  - Treatment escalation rules: Clear criteria for when to escalate (e.g., "If no improvement after 48 hours, consider alternative")
  - Monitoring requirements: What to monitor, how often, what values trigger action
  - Red-flag emergence triggers: When new red flags appear, what action to take
  - Avoid unsafe or vague treatment statements: No "consider treatment" without criteria
- REQUIRED: IMPROVE PHARMACOLOGY:
  - Mechanism, indication, basic dosing (non-country-specific)
  - Contraindication + monitoring notes
  - Avoid drug names where too region-specific (use drug classes)
- REQUIRED: SAFETY ESCALATION IMPROVEMENTS:
  - Explicit escalation triggers: ICU (e.g., "If respiratory rate >30 with accessory muscle use, transfer to ICU"), dialysis (e.g., "If creatinine >5.0 with hyperkalemia, initiate dialysis"), rapid deterioration (e.g., "If GCS drops by 2 points, escalate immediately")
  - Clear framing of emergency vs urgency: Emergency = immediate life threat, Urgency = needs attention within hours
  - Each escalation trigger MUST specify exact criteria (vital signs, lab values, clinical signs)
  - Panel MUST reject vague escalation phrases like "consider ICU if needed" or "escalate if persists"
- REQUIRED: OXYGEN TARGET SAFETY RULE:
  - Check that O2 targets align with shared acuity/stability logic
  - In suspected chronic CO₂ retention patterns → target should NEVER exceed safe universal range (88-92% SpO₂)
  - Acute-only, no-retention patterns → allow higher targets (94-98% SpO₂) but ONLY if consistent with red-flag hierarchy
  - Panel MUST correct inconsistencies automatically

- REQUIRED: INFECTION TRIGGER LOGIC (Universal):
  - If history includes fever + leukocytosis + sputum increase → treat as "infection-trigger pattern"
  - Management MUST reflect infection-trigger pattern (appropriate antimicrobial approach)
  - Panel MUST detect missing treatment and patch or regenerate relevant section

- REQUIRED: VENTILATION ESCALATION CRITERIA:
  - Ventilation escalation (NIV / invasive) MUST use pattern-level criteria:
    * Fatigue indicators
    * Mental-status change
    * Worsening gas pattern
    * Persistently high work of breathing
  - Panel MUST reject or correct vague phrases like "consider NIV if persists"

- Check initial vs definitive management for safety, stages, and escalation.

- Pharmacology (PATTERN RULE: All entries must be structured, not generic one-liners):
  * Each pharmacology entry MUST have: class-type, mechanism, dosing range (or explicit omission), monitoring fields
  * Include typical dose ranges and regimens (structured format, not free text).
  * Indicate renal/hepatic adjustment needs (structured, not generic).
  * Add weight-based logic when relevant for the specific medications used in this case.
  * Add one-line "why contraindicated" explanations (structured, not generic).
  * Block generic, unconditional escalation advice that ignores acuity or physiology.
  * Normalize pharmacology JSON so no partially encoded or nested raw strings exist.
- Remove drugs unrealistic for region or resource level.

6) Complications (PATTERN-BASED TIMELINE VALIDATION, AUTO-CORRECT MISMATCHES)

- REQUIRED: COMPLICATION TIMELINE RULES:
  - Complications MUST match: acuity, phase, setting
  - For example, avoid late-phase complications appearing in acute settings unless clearly justified
  - Panel MUST auto-correct mismatched complication timelines
- PATTERN RULE: Complication timelines MUST match phase and acuity:
  * Low-acuity + outpatient → NO immediate life-threatening complications (shock, arrest, herniation)
  * High-acuity + emergency → Immediate complications appropriate (shock, arrest, respiratory failure)
  * Chronic/stable cases → More late complications, fewer immediate
  * Acute/unstable cases → More immediate complications, fewer late
- Keep only topic-relevant complications.
- Group into Immediate / Early / Late based on pathophysiology AND case phase/acuity.
- Remove generic trauma/respiratory/psychiatric items unless clearly linked to THIS case.
- Check for repeated red-flag loops: If reasoning_chain has multiple identical red-flag steps, remove duplicates.

7) LMIC / Resource Tiers

- Use a 3-tier model:

  * Basic: minimal labs, limited/no imaging.

  * Intermediate: ECG and basic labs.

  * Advanced: full workup, cath access, etc.

- REQUIRED: LMIC alternatives must contain triggers + actions + monitoring:
  * Each LMIC alternative MUST have: trigger (when to use), action (what to do), monitoring (how to monitor)
  * If any LMIC alternative is missing trigger, action, or monitoring → auto-clean or regenerate
  * Ensure LMIC suggestions are safe, realistic, and WHO-compatible.

- REQUIRED: LMIC alternatives MUST contain triggers + actions + monitoring
  * Each LMIC alternative MUST have:
    - trigger: When to use this alternative (e.g., "If ABG unavailable")
    - action: What to do (e.g., "Use clinical signs: tachypnea, accessory muscle use")
    - monitoring: What to monitor (e.g., "Monitor respiratory rate, mental status, oxygen saturation")
  * Panel MUST check each LMIC alternative - if missing trigger/action/monitoring, patch or regenerate

8) Expert Conference (REQUIRED: Reference Reasoning & Management)

- REQUIRED: Expert conference must reference reasoning chain & management decisions:
  * Each expert voice MUST reference specific reasoning steps from the case
  * Each expert voice MUST reference specific management decisions and explain rationale
  * Conference must explain WHY certain diagnostic tests were chosen (from reasoning)
  * Conference must explain WHY certain management steps were taken (from management)
  * Do NOT generate generic conference - must be tied to actual case reasoning and management
  * If expert conference does not reference reasoning or management → regenerate

9) Pathophysiology (VISIBILITY RULE)

- REQUIRED: PATHOPHYSIOLOGY VISIBILITY RULE:
  - High-acuity cases must NOT hide pathophysiology by default
  - Expand or force visibility unless user collapses manually
  - Mark pathophysiology_detail with "collapsible": false for high-acuity cases, "collapsible": true for low-acuity cases
- Deepen pathophysiology but keep it structured:

  * Core mechanism of disease specific to this condition (include relevant pathophysiological elements).

  * Oxygen supply–demand mismatch.

  * Time-to-necrosis / progression timeline.

  * Coagulation/thrombus formation.

  * Reperfusion injury basics if relevant.

- Mark long pathophysiology sections for UI as collapsible, e.g. \`"collapsible": true\` (only for low-acuity cases).

9) Expert Conference

- Create a realistic short conference discussion:

  * 3–5 doctors relevant to this case (select specialists based on topic, acuity, and resource setting).

  * 3–5 bullet points of agreement.

  * 3–5 bullet points of disagreement or nuance.

  * Final 2–4 line conclusion summarizing diagnostic certainty and preferred management strategy.

- Do NOT dump guidelines here; guidelines are accessed via popup references.

10) Gamification (if present)

- Check MCQs, difficulty spectrum, distractors, scoring, safety.

- Ensure no MCQ teaches unsafe or clearly outdated care.

- Ensure levels/XP roughly match difficulty and educational gain.

TASK 2 – SYNTHESIS & REFINED CASE

After all reviews:

1) Compute \`case_quality_score\` (0.0–1.0) based on safety, coherence, guideline fit, pathophysiology depth, and educational value.

2) Decide if the case is acceptable (INTERNAL PANEL ENFORCEMENT):

   - REQUIRED: Internal panel MUST reject or regenerate:
     * Unsafe oxygen guidance (targets not aligned with acuity/stability)
     * Missing infection-trigger management (if infection-trigger pattern detected)
     * Unreasoned differentials (missing justification fields)
     * Mismatched complications (timeline doesn't match acuity/phase/setting)
     * Unsafe escalation logic (vague ventilation criteria)
     * Generic ABG interpretation without numeric patterns
     * Superficial expert conference without disagreement/tradeoffs
   - If unsafe, logically inconsistent, wrong-domain guidelines, or major gaps in diagnostics/management:

     * set \`"regenerate_case": true\`

     * \`case_quality_score\` MUST be < 0.9

   - Otherwise:

     * \`"regenerate_case": false\`

3) Build \`refined_case\`:

   - Start from \`case_json\`.

   - Apply ALL critical corrections from \`required_fixes\`.

   - Keep the schema identical (same keys and structure, with improved content).

   - Ensure:

     * Guidelines are cleaned and in popup_reference format.

     * Differential is structured with FOR/AGAINST arguments.

     * Pathophysiology is enriched and marked collapsible if long.

     * Expert conference is added in concise, realistic form.

   - Do NOT add panel metadata to \`refined_case\`.

OUTPUT FORMAT (JSON):

{
  "panel_reviews": [
    {
      "role": "Panel Member Role",
      "flags": ["flag1", "flag2"],
      "corrections": ["correction1", "correction2", "correction3", "correction4"],
      "quality_score": 0.87,
      "required_fixes": ["fix1", "fix2"]
    }
  ],
  "refined_case": {
    // Complete refined case JSON, same schema as input, with all improvements
    // Include meta.panel_modifications array for debugging (not rendered to frontend)
  },
  "synthesis_summary": "Brief summary of key improvements and any remaining limitations.",
  "case_quality_score": 0.87,
  "regenerate_case": false,
  "regenerate_sections": [], // Optional: array of section names that need regeneration (e.g., ["complications", "reasoning_chain"])
  "critical_safety_issues": [] // Optional: array of critical safety/acuity inconsistencies that require rejection
}

IMPORTANT:

- All corrections MUST be case-specific, not generic boilerplate.

- Safety and correctness are higher priority than politeness.

- If in doubt about safety or domain fit: set \`"regenerate_case": true\`.`;

    // QUALITY MODE: Full panel power with gpt-4o
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Force gpt-4o
      messages: [
        {
          role: "system",
          content: "You are an expert medical case review panel. Provide structured JSON output with panel reviews and refined case."
        },
        {
          role: "user",
          content: panelPrompt
        }
      ],
      temperature: 0.3, // Balanced temperature for quality reviews
      response_format: { type: "json_object" }
    });
    
    let panelResult;
    try {
      panelResult = JSON.parse(response.choices[0].message.content);
    } catch (parseError) {
      console.error("❌ Failed to parse panel result JSON:", parseError.message);
      console.error("Raw response:", response.choices[0].message.content?.substring(0, 500));
      return rawCase; // Return original case if parsing fails
    }
    
    // Validate panel result structure
    if (!panelResult || typeof panelResult !== 'object') {
      console.error("❌ Panel result is not a valid object");
      return rawCase;
    }
    
    // REQUIRED: Structured internal logs (controlled by environment flag)
    const enablePanelLogging = process.env.ENABLE_PANEL_LOGGING !== 'false'; // Default true, set to 'false' to disable
    const logLevel = process.env.PANEL_LOG_LEVEL || 'info'; // 'debug', 'info', 'warn', 'error'
    
    // Log panel metadata (not sent to user) - Preserve for logging
    const reviewCount = panelResult.panel_reviews?.length || 0;
    const avgScore = reviewCount > 0 
      ? panelResult.panel_reviews.reduce((sum, r) => sum + (r.quality_score || 0), 0) / reviewCount
      : 0;
    const totalFlags = panelResult.panel_reviews?.reduce((sum, r) => sum + (r.flags?.length || 0), 0) || 0;
    const totalCorrections = panelResult.panel_reviews?.reduce((sum, r) => sum + (r.corrections?.length || 0), 0) || 0;
    const caseQualityScore = panelResult.case_quality_score || avgScore;
    
    // REQUIRED: Handle critical safety errors - reject case if critical issues found
    const criticalSafetyIssues = panelResult.critical_safety_issues || [];
    
    // STRICT ENFORCEMENT CHECKS - SAFE WITH FALLBACK
    const enforcementChecks = [];
    
    try {
      // 1. Expert conference check
    if (!panelResult.refined_case.expert_conference || 
        (typeof panelResult.refined_case.expert_conference === 'string' && panelResult.refined_case.expert_conference.trim() === '') ||
        (typeof panelResult.refined_case.expert_conference === 'object' && Object.keys(panelResult.refined_case.expert_conference).length === 0)) {
      enforcementChecks.push('Missing expert_conference section');
      panelResult.regenerate_case = true;
    }
    
    // 2. Pathophysiology check (no layered duplicates)
    const pathoCount = [
      panelResult.refined_case.pathophysiology,
      panelResult.refined_case.pathophysiology_detail
    ].filter(p => p && (typeof p === 'string' ? p.trim() : (typeof p === 'object' ? Object.keys(p).length > 0 : false))).length;
    if (pathoCount > 2) {
      enforcementChecks.push('Multiple/layered pathophysiology sections detected (should be single block)');
      panelResult.regenerate_case = true;
    }
    
    // 3. LMIC raw JSON check
    if (panelResult.refined_case.guidelines?.lmic_alternatives) {
      const lmic = panelResult.refined_case.guidelines.lmic_alternatives;
      if (Array.isArray(lmic)) {
        lmic.forEach((alt, idx) => {
          if (typeof alt === 'string' && (alt.trim().startsWith('{') || alt.trim().startsWith('['))) {
            try {
              JSON.parse(alt);
              enforcementChecks.push(`LMIC alternative ${idx + 1} contains raw JSON string`);
              panelResult.regenerate_case = true;
            } catch (e) {
              // Not JSON, OK
            }
          }
        });
      }
    }
    
    // 4. Management structure check
    if (!panelResult.refined_case.management) {
      enforcementChecks.push('Missing management object');
      panelResult.regenerate_case = true;
    } else {
      const mgmt = panelResult.refined_case.management;
      if (!mgmt.initial || typeof mgmt.initial === 'object' || String(mgmt.initial).includes('[object Object]')) {
        enforcementChecks.push('management.initial missing, is object, or contains [object Object]');
        panelResult.regenerate_case = true;
      }
      if (!mgmt.definitive || typeof mgmt.definitive === 'object' || String(mgmt.definitive).includes('[object Object]')) {
        enforcementChecks.push('management.definitive missing, is object, or contains [object Object]');
        panelResult.regenerate_case = true;
      }
      if (!mgmt.escalation || typeof mgmt.escalation === 'object' || String(mgmt.escalation).includes('[object Object]')) {
        enforcementChecks.push('management.escalation missing, is object, or contains [object Object]');
        panelResult.regenerate_case = true;
      }
      if (!mgmt.disposition || typeof mgmt.disposition === 'object' || String(mgmt.disposition).includes('[object Object]')) {
        enforcementChecks.push('management.disposition missing, is object, or contains [object Object]');
        panelResult.regenerate_case = true;
      }
      
      // Check if vitals unstable but initial management is not stabilization-first
      const vitals = panelResult.refined_case.physical_exam || '';
      const vitalsStr = typeof vitals === 'string' ? vitals : JSON.stringify(vitals);
      const hrMatch = vitalsStr.match(/HR[:\s]+(\d+)|heart rate[:\s]+(\d+)/i);
      const sbpMatch = vitalsStr.match(/SBP[:\s]+(\d+)|systolic[:\s]+(\d+)/i);
      const spo2Match = vitalsStr.match(/SpO2[:\s]+(\d+)|oxygen[:\s]+(\d+)/i);
      const rrMatch = vitalsStr.match(/RR[:\s]+(\d+)|respiratory rate[:\s]+(\d+)/i);
      
      const hr = hrMatch ? parseInt(hrMatch[1] || hrMatch[2]) : null;
      const sbp = sbpMatch ? parseInt(sbpMatch[1] || sbpMatch[2]) : null;
      const spo2 = spo2Match ? parseInt(spo2Match[1] || spo2Match[2]) : null;
      const rr = rrMatch ? parseInt(rrMatch[1] || rrMatch[2]) : null;
      
      const isUnstable = (hr !== null && hr < 45) || (sbp !== null && sbp < 90) || (spo2 !== null && spo2 < 92) || (rr !== null && rr > 30);
      
      // Check if vitals unstable but initial management is not stabilization-first
      if (isUnstable && mgmt.initial) {
        const initialStr = String(mgmt.initial).toLowerCase();
        const hasStabilization = initialStr.includes('abc') || initialStr.includes('airway') || initialStr.includes('breathing') || 
                                 initialStr.includes('circulation') || initialStr.includes('stabilization') || initialStr.includes('resuscitation') ||
                                 initialStr.includes('hemodynamic') || initialStr.includes('life-threatening');
        if (!hasStabilization) {
          enforcementChecks.push('Vitals unstable but initial management does not start with stabilization (should be stabilization-first)');
          panelResult.regenerate_case = true;
        }
      }
      
      // Check vital signs consistency
      const examStr = String(panelResult.refined_case.physical_exam || '').toLowerCase();
      const hasShockVitals = (sbp !== null && sbp < 90) || (hr !== null && hr > 120);
      const hasRespDistress = (rr !== null && rr > 30) || (spo2 !== null && spo2 < 92);
      
      if (hasShockVitals && (examStr.includes('appears well') || examStr.includes('stable') || examStr.includes('comfortable'))) {
        enforcementChecks.push('Vital signs show shock but physical exam says patient appears well/stable (inconsistency)');
        panelResult.regenerate_case = true;
      }
      
      if (hasRespDistress && (examStr.includes('comfortable') || examStr.includes('at rest') || examStr.includes('no distress'))) {
        enforcementChecks.push('Vital signs show respiratory distress but physical exam says comfortable/at rest (inconsistency)');
        panelResult.regenerate_case = true;
      }
      
      // ENFORCE: Structured escalation thresholds tied to vitals and labs
      if (mgmt.escalation) {
        const escalationStr = String(mgmt.escalation).toLowerCase();
        const hasVitalThresholds = escalationStr.includes('hr') || escalationStr.includes('sbp') || escalationStr.includes('rr') || escalationStr.includes('spo2') || 
                                   escalationStr.includes('heart rate') || escalationStr.includes('blood pressure') || escalationStr.includes('respiratory rate') || escalationStr.includes('oxygen');
        const hasLabThresholds = escalationStr.includes('creatinine') || escalationStr.includes('troponin') || escalationStr.includes('lactate') || escalationStr.includes('bnp') ||
                                 escalationStr.includes('lab') || escalationStr.includes('value');
        if (!hasVitalThresholds && !hasLabThresholds) {
          enforcementChecks.push('Escalation criteria must include specific vital sign or lab value thresholds');
          panelResult.regenerate_case = true;
        }
      }
      
      // ENFORCE: Require rare-dangerous tier in red-flag hierarchy
      if (panelResult.refined_case.red_flag_hierarchy) {
        if (!panelResult.refined_case.red_flag_hierarchy.rare_dangerous || 
            !Array.isArray(panelResult.refined_case.red_flag_hierarchy.rare_dangerous) || 
            panelResult.refined_case.red_flag_hierarchy.rare_dangerous.length === 0) {
          enforcementChecks.push('Red-flag hierarchy must include rare_dangerous tier');
          panelResult.regenerate_case = true;
        }
      }
      
      // VALIDATE: LMIC alternative formatting
      if (panelResult.refined_case.guidelines?.lmic_alternatives) {
        const lmic = panelResult.refined_case.guidelines.lmic_alternatives;
        if (Array.isArray(lmic)) {
          lmic.forEach((alt, idx) => {
            if (typeof alt === 'string' && (alt.trim().startsWith('{') || alt.trim().startsWith('['))) {
              enforcementChecks.push(`LMIC alternative ${idx + 1} contains raw JSON string (must be formatted as object)`);
              panelResult.regenerate_case = true;
            } else if (typeof alt === 'object' && alt !== null) {
              if (!alt.intervention || !alt.trigger || !alt.action || !alt.monitoring) {
                enforcementChecks.push(`LMIC alternative ${idx + 1} missing required fields (intervention, trigger, action, monitoring)`);
                panelResult.regenerate_case = true;
              }
            }
          });
        }
      }
      
      if (isUnstable && mgmt.initial) {
        const initialStr = String(mgmt.initial).toLowerCase();
        const hasStabilization = initialStr.includes('abc') || initialStr.includes('airway') || initialStr.includes('breathing') || 
                                 initialStr.includes('circulation') || initialStr.includes('stabilization') || initialStr.includes('resuscitation') ||
                                 initialStr.includes('hemodynamic') || initialStr.includes('life-threatening');
        if (!hasStabilization) {
          enforcementChecks.push('Vitals unstable but initial management is not stabilization-first');
          panelResult.regenerate_case = true;
        }
      }
      
      // Note: examStr already declared above, no need to redeclare
    }
    
    // 5. Guidelines domain check
    if (panelResult.refined_case.guidelines) {
      const guidelines = panelResult.refined_case.guidelines;
      const topic = panelResult.refined_case.meta?.topic || topic || '';
      const topicLower = topic.toLowerCase();
      let unrelatedCount = 0;
      let totalCount = 0;
      
      ['local', 'national', 'continental', 'usa', 'international'].forEach(tier => {
        if (Array.isArray(guidelines[tier])) {
          guidelines[tier].forEach(guideline => {
            totalCount++;
            const guidelineStr = typeof guideline === 'string' ? guideline : JSON.stringify(guideline);
            const guidelineLower = guidelineStr.toLowerCase();
            // Check if guideline is unrelated (mental health, trauma, dermatology, psychiatry)
            const isUnrelated = (guidelineLower.includes('mental health') || guidelineLower.includes('psychiatry') || 
                                guidelineLower.includes('trauma') || guidelineLower.includes('dermatology')) &&
                               !topicLower.includes('mental') && !topicLower.includes('psych') && 
                               !topicLower.includes('trauma') && !topicLower.includes('dermat');
            if (isUnrelated) {
              unrelatedCount++;
            }
          });
        }
      });
      
      if (totalCount > 0 && (unrelatedCount / totalCount) > 0.5) {
        enforcementChecks.push(`>50% of guidelines are unrelated to topic (${unrelatedCount}/${totalCount})`);
        panelResult.regenerate_case = true;
      }
    }
    
    // 6. LMIC alternatives check (trigger + action + monitoring)
    if (panelResult.refined_case.guidelines?.lmic_alternatives) {
      const lmic = panelResult.refined_case.guidelines.lmic_alternatives;
      if (Array.isArray(lmic)) {
        lmic.forEach((alt, idx) => {
          if (typeof alt === 'object' && alt !== null) {
            const hasTrigger = alt.trigger && String(alt.trigger).trim();
            const hasAction = alt.action && String(alt.action).trim();
            const hasMonitoring = alt.monitoring && String(alt.monitoring).trim();
            if (!hasTrigger || !hasAction || !hasMonitoring) {
              enforcementChecks.push(`LMIC alternative ${idx + 1} missing trigger, action, or monitoring`);
              panelResult.regenerate_case = true;
            }
          }
        });
      }
    }
    
      // 7. Check for missing major blocks and add fallback fill logic
      const missingBlocks = [];
      
      // Check complications - REJECT if missing
      if (!panelResult.refined_case.management?.complications) {
        missingBlocks.push('complications');
        enforcementChecks.push('Missing complications section');
        panelResult.regenerate_case = true;
      }
      
      // Check pharmacology - REJECT if missing
      if (!panelResult.refined_case.management?.pharmacology || 
          (typeof panelResult.refined_case.management.pharmacology === 'object' && Object.keys(panelResult.refined_case.management.pharmacology).length === 0)) {
        missingBlocks.push('pharmacology');
        enforcementChecks.push('Missing or empty pharmacology section');
        panelResult.regenerate_case = true;
      }
      
      // Check diagnostic_evidence - REJECT if missing
      if (!panelResult.refined_case.paraclinical?.diagnostic_evidence || 
          (typeof panelResult.refined_case.paraclinical.diagnostic_evidence === 'object' && Object.keys(panelResult.refined_case.paraclinical.diagnostic_evidence).length === 0)) {
        missingBlocks.push('diagnostic_evidence');
        enforcementChecks.push('Missing or empty diagnostic_evidence');
        panelResult.regenerate_case = true;
      }
      
      // Check guidelines content - REJECT if empty
      if (panelResult.refined_case.guidelines) {
        const guidelineTiers = ['local', 'national', 'continental', 'usa', 'international'];
        let hasAnyGuideline = false;
        guidelineTiers.forEach(tier => {
          if (Array.isArray(panelResult.refined_case.guidelines[tier]) && panelResult.refined_case.guidelines[tier].length > 0) {
            hasAnyGuideline = true;
          }
        });
        if (!hasAnyGuideline) {
          missingBlocks.push('guidelines_content');
          enforcementChecks.push('Guidelines cascade is empty');
          panelResult.regenerate_case = true;
        }
      }
      
      // Check final_diagnosis - CRITICAL: Block if missing
      if (!panelResult.refined_case.final_diagnosis || 
          (typeof panelResult.refined_case.final_diagnosis === 'string' && panelResult.refined_case.final_diagnosis.trim().length === 0)) {
        missingBlocks.push('final_diagnosis');
        enforcementChecks.push('CRITICAL: Missing final_diagnosis - Case will be blocked');
        panelResult.regenerate_case = true;
        panelResult.refined_case.meta = panelResult.refined_case.meta || {};
        panelResult.refined_case.meta.blocked_publication = true;
      } else {
        const diagStr = String(panelResult.refined_case.final_diagnosis).toLowerCase();
        if (diagStr.includes('not provided') || diagStr.includes('pending') || diagStr.includes('n/a') || 
            diagStr.includes('to be determined') || diagStr.includes('tbd') || diagStr.includes('see case')) {
          enforcementChecks.push('CRITICAL: Final diagnosis contains placeholder text - Case will be blocked');
          panelResult.regenerate_case = true;
          panelResult.refined_case.meta = panelResult.refined_case.meta || {};
          panelResult.refined_case.meta.blocked_publication = true;
        }
      }
      
      // Check expert_conference - ENFORCE Dr A-D structured with disagreements + consensus
      if (!panelResult.refined_case.expert_conference || 
          (typeof panelResult.refined_case.expert_conference === 'string' && panelResult.refined_case.expert_conference.trim() === '') ||
          (typeof panelResult.refined_case.expert_conference === 'object' && Object.keys(panelResult.refined_case.expert_conference).length === 0)) {
        missingBlocks.push('expert_conference');
        enforcementChecks.push('Missing expert_conference section');
        panelResult.regenerate_case = true;
      } else if (typeof panelResult.refined_case.expert_conference === 'object') {
        // Enforce Dr A-D structured format with named speakers
        if (!panelResult.refined_case.expert_conference.voices || !Array.isArray(panelResult.refined_case.expert_conference.voices) || panelResult.refined_case.expert_conference.voices.length < 3) {
          enforcementChecks.push('Expert conference must have at least 3 voices (Dr A-D format with named speakers)');
          panelResult.regenerate_case = true;
        } else {
          // Validate named speakers (Dr A, Dr B, etc.)
          const hasNamedSpeakers = panelResult.refined_case.expert_conference.voices.some(v => 
            v.role && (String(v.role).includes('Dr') || String(v.role).includes('Specialist') || String(v.role).includes('Emergency') || String(v.role).includes('General'))
          );
          if (!hasNamedSpeakers) {
            enforcementChecks.push('Expert conference voices must have named speakers (Dr A, Dr B, etc.)');
            panelResult.regenerate_case = true;
          }
        }
        if (!panelResult.refined_case.expert_conference.disagreements || !Array.isArray(panelResult.refined_case.expert_conference.disagreements) || panelResult.refined_case.expert_conference.disagreements.length === 0) {
          enforcementChecks.push('Expert conference must have disagreements section with explicit reasoning contrasts');
          panelResult.regenerate_case = true;
        }
        if (!panelResult.refined_case.expert_conference.consensus || String(panelResult.refined_case.expert_conference.consensus).trim() === '') {
          enforcementChecks.push('Expert conference must have explicit final consensus summary');
          panelResult.regenerate_case = true;
        }
      }
      
      // Validate differential FOR/AGAINST reasoning
      if (panelResult.refined_case.differential_diagnoses && Array.isArray(panelResult.refined_case.differential_diagnoses)) {
        panelResult.refined_case.differential_diagnoses.forEach((diff, idx) => {
          if (typeof diff === 'string') {
            enforcementChecks.push(`Differential ${idx + 1} is string (must be object with FOR/AGAINST/TIER)`);
            panelResult.regenerate_case = true;
          } else if (typeof diff === 'object' && diff !== null) {
            if (!diff.for || String(diff.for).trim().length === 0 || String(diff.for).toLowerCase().includes('not provided')) {
              enforcementChecks.push(`Differential ${idx + 1} missing or placeholder FOR reasoning`);
              panelResult.regenerate_case = true;
            }
            if (!diff.against || String(diff.against).trim().length === 0 || String(diff.against).toLowerCase().includes('not provided')) {
              enforcementChecks.push(`Differential ${idx + 1} missing or placeholder AGAINST reasoning`);
              panelResult.regenerate_case = true;
            }
            if (!diff.tier || !['1', '2', '3', 'top', 'middle', 'rare'].includes(String(diff.tier).toLowerCase())) {
              enforcementChecks.push(`Differential ${idx + 1} missing or invalid tier`);
              panelResult.regenerate_case = true;
            }
          }
        });
      }
      
      // Validate escalation thresholds are numeric
      if (mgmt.escalation && typeof mgmt.escalation === 'string') {
        const escalationStr = mgmt.escalation.toLowerCase();
        const hasNumericThresholds = /\d+/.test(escalationStr) && (
          escalationStr.includes('>') || escalationStr.includes('<') || escalationStr.includes('=') ||
          escalationStr.includes('above') || escalationStr.includes('below') || escalationStr.includes('exceeds')
        );
        if (!hasNumericThresholds) {
          enforcementChecks.push('Escalation criteria must include numeric thresholds (not qualitative-only)');
          panelResult.regenerate_case = true;
        }
      }
      
      // Validate disposition thresholds are numeric
      if (mgmt.disposition && typeof mgmt.disposition === 'string') {
        const dispositionStr = mgmt.disposition.toLowerCase();
        const hasNumericThresholds = /\d+/.test(dispositionStr) && (
          dispositionStr.includes('>') || dispositionStr.includes('<') || dispositionStr.includes('=') ||
          dispositionStr.includes('above') || dispositionStr.includes('below')
        );
        if (!hasNumericThresholds && (dispositionStr.includes('discharge') || dispositionStr.includes('admit') || dispositionStr.includes('icu'))) {
          enforcementChecks.push('Disposition criteria must include numeric thresholds (not qualitative-only)');
          panelResult.regenerate_case = true;
        }
      }
      
      // Check pathophysiology
      if (!panelResult.refined_case.pathophysiology && 
          (!panelResult.refined_case.pathophysiology_detail || 
           (typeof panelResult.refined_case.pathophysiology_detail === 'object' && Object.keys(panelResult.refined_case.pathophysiology_detail).length === 0))) {
        missingBlocks.push('pathophysiology');
        // Fallback fill
        panelResult.refined_case.pathophysiology = 'Pathophysiology requires case-specific analysis';
        panelResult.refined_case.pathophysiology_detail = {
          mechanism: 'See case-specific pathophysiology',
          organ_interactions: 'See case analysis'
        };
      }
      
      // Check guidelines
      if (!panelResult.refined_case.guidelines || typeof panelResult.refined_case.guidelines !== 'object') {
        missingBlocks.push('guidelines');
        panelResult.refined_case.guidelines = {
          local: [],
          national: [],
          continental: [],
          usa: [],
          international: ['WHO Clinical Guidelines - See case-specific recommendations']
        };
      } else {
        const guidelineTiers = ['local', 'national', 'continental', 'usa', 'international'];
        let hasAnyGuideline = false;
        guidelineTiers.forEach(tier => {
          if (Array.isArray(panelResult.refined_case.guidelines[tier]) && panelResult.refined_case.guidelines[tier].length > 0) {
            hasAnyGuideline = true;
          }
        });
        if (!hasAnyGuideline) {
          missingBlocks.push('guidelines_content');
          panelResult.refined_case.guidelines.international = ['WHO Clinical Guidelines - See case-specific recommendations'];
        }
      }
      
      // Check LMIC
      if (!panelResult.refined_case.guidelines?.lmic_alternatives || 
          !Array.isArray(panelResult.refined_case.guidelines.lmic_alternatives) || 
          panelResult.refined_case.guidelines.lmic_alternatives.length === 0) {
        missingBlocks.push('lmic_alternatives');
        if (!panelResult.refined_case.guidelines) panelResult.refined_case.guidelines = {};
        panelResult.refined_case.guidelines.lmic_alternatives = [
          {
            resource_level: 'basic',
            intervention: 'Basic diagnostic and treatment options',
            trigger: 'Limited resources',
            action: 'Use clinical assessment',
            monitoring: 'Monitor response'
          }
        ];
      }
      
      // Check pharmacology
      if (!panelResult.refined_case.management?.pharmacology || 
          (typeof panelResult.refined_case.management.pharmacology === 'object' && Object.keys(panelResult.refined_case.management.pharmacology).length === 0)) {
        missingBlocks.push('pharmacology');
        if (!panelResult.refined_case.management) panelResult.refined_case.management = {};
        panelResult.refined_case.management.pharmacology = {
          medications: [],
          dosing_ranges: {},
          monitoring: {},
          contraindications: {}
        };
      }
      
      // Check complications
      if (!panelResult.refined_case.management?.complications) {
        missingBlocks.push('complications');
        if (!panelResult.refined_case.management) panelResult.refined_case.management = {};
        panelResult.refined_case.management.complications = {
          immediate: ['Monitor for acute deterioration', 'Assess stability'],
          early: ['Watch for treatment response', 'Monitor side effects'],
          late: ['Long-term follow-up', 'Chronic monitoring']
        };
      }
      
      // If any major block was missing, mark for regeneration
      if (missingBlocks.length > 0) {
        console.warn('[Internal Panel] ⚠️ Missing blocks auto-filled:', missingBlocks);
        enforcementChecks.push(`Missing blocks auto-filled: ${missingBlocks.join(', ')}`);
        // Set regenerate_case if critical blocks missing
        if (missingBlocks.includes('expert_conference') || missingBlocks.includes('pathophysiology') || missingBlocks.includes('complications')) {
          panelResult.regenerate_case = true;
        }
        if (!panelResult.refined_case.meta) panelResult.refined_case.meta = {};
        panelResult.refined_case.meta.auto_filled_blocks = missingBlocks;
      }
      
      if (enforcementChecks.length > 0) {
        criticalSafetyIssues.push(...enforcementChecks);
        if (!panelResult.refined_case.meta) panelResult.refined_case.meta = {};
        panelResult.refined_case.meta.enforcement_failures = enforcementChecks;
      }
    } catch (enforcementError) {
      console.error('[Internal Panel] ❌ ENFORCEMENT_EXCEPTION: Enforcement checks threw exception:', {
        error: enforcementError.message,
        stack: enforcementError.stack,
        topic: topic || 'unknown',
        category: area || 'unknown'
      });
      // Fallback: Log the error but continue with panel result - don't crash
      if (!panelResult.refined_case.meta) panelResult.refined_case.meta = {};
      panelResult.refined_case.meta.enforcement_exception = enforcementError.message;
      // Don't set regenerate_case on exception - let panel result through
    }
    
    if (criticalSafetyIssues.length > 0) {
      // Log critical safety issues
      if (enablePanelLogging) {
        console.error(`[Internal Panel] ❌ CRITICAL SAFETY ISSUES DETECTED:`, {
          issues: criticalSafetyIssues,
          topic: topic,
          category: area,
          acuity: acuity
        });
      }
      
      // Either correct the issues in refined_case or mark for rejection
      // For now, we'll mark for regeneration and log the error
      if (!panelResult.refined_case.meta) panelResult.refined_case.meta = {};
      panelResult.refined_case.meta.critical_safety_issues = criticalSafetyIssues;
      panelResult.refined_case.meta.panel_rejection_reason = 'Critical safety/acuity inconsistencies or structural violations detected';
      panelResult.regenerate_case = true; // Force regeneration
    }
    
    // REQUIRED: Structured internal logs (controlled by environment flag)
    if (enablePanelLogging) {
      // Structured logging - only structural/meta info, NO PHI or user-identifiable data
      const logEntry = {
        timestamp: new Date().toISOString(),
        panel_version: '3.1',
        case_meta: {
          topic: topic,
          category: area,
          acuity: acuity,
          setting: rawCase.meta?.setting || 'unknown',
          domains: domains,
          isLMIC: isLMIC
        },
        panel_stats: {
          members_count: panelMembers.length,
          reviews_count: reviewCount,
          avg_quality_score: avgScore.toFixed(2),
          case_quality_score: caseQualityScore.toFixed(2),
          total_flags: totalFlags,
          total_corrections: totalCorrections,
          regenerate_required: panelResult.regenerate_case || false,
          regenerate_sections: panelResult.regenerate_sections || [],
          critical_safety_issues: criticalSafetyIssues.length
        },
        modifications: panelResult.refined_case?.meta?.panel_modifications || []
      };
      
      if (logLevel === 'debug' || logLevel === 'info') {
        console.log(`[Internal Panel v3.1] ✅ Panel review completed`);
        console.log(`[Internal Panel] Structured log:`, JSON.stringify(logEntry, null, 2));
      } else if (logLevel === 'warn' && (caseQualityScore < 0.7 || panelResult.regenerate_case || criticalSafetyIssues.length > 0)) {
        console.warn(`[Internal Panel] ⚠️ Quality issues detected:`, logEntry);
      }
      
      // Log panel modifications for debugging (only if debug level)
      if (logLevel === 'debug' && panelResult.refined_case?.meta?.panel_modifications) {
        console.log(`[Internal Panel] Panel modifications:`, JSON.stringify(panelResult.refined_case.meta.panel_modifications, null, 2));
      }
    }
    
    // Apply section upgrades using model admin
    let refinedCase = panelResult.refined_case || rawCase;
    
    // Upgrade expert conference if present
    if (refinedCase.expert_conference) {
      try {
        const up = await upgradeExpertConference(
          refinedCase.expert_conference,
          refinedCase.meta?.topic || topic,
          refinedCase.meta?.acuity || acuity
        );
        const parsed = JSON.parse(up);
        if (parsed.expert_conference) {
          refinedCase.expert_conference = parsed.expert_conference;
        }
      } catch (upgradeError) {
        console.warn('[Internal Panel] Expert conference upgrade failed, using panel refined version:', upgradeError.message);
      }
    }

    // Upgrade pathophysiology if present
    if (refinedCase.pathophysiology) {
      try {
        const up = await upgradePathophysiology(
          refinedCase.pathophysiology,
          refinedCase.meta?.topic || topic
        );
        const parsed = JSON.parse(up);
        if (parsed.pathophysiology) {
          refinedCase.pathophysiology = parsed.pathophysiology;
        }
      } catch (upgradeError) {
        console.warn('[Internal Panel] Pathophysiology upgrade failed, using panel refined version:', upgradeError.message);
      }
    }

    // Upgrade management if present
    if (refinedCase.management) {
      try {
        const up = await upgradeManagement(
          refinedCase.management,
          refinedCase.meta || { topic: topic, acuity: acuity }
        );
        const parsed = JSON.parse(up);
        if (parsed.management) {
          refinedCase.management = parsed.management;
        }
      } catch (upgradeError) {
        console.warn('[Internal Panel] Management upgrade failed, using panel refined version:', upgradeError.message);
      }
    }

    // Return structured result with regenerate_case flag and section regeneration requests
    const result = {
      refined_case: refinedCase,
      regenerate_case: panelResult.regenerate_case || false,
      regenerate_sections: panelResult.regenerate_sections || [], // Sections that need regeneration
      case_quality_score: caseQualityScore,
      panel_reviews: panelResult.panel_reviews || [],
      synthesis_summary: panelResult.synthesis_summary || '',
      critical_safety_issues: criticalSafetyIssues
    };
    
    // If regenerate_case is true, mark it but still return refined_case
    if (result.regenerate_case === true) {
      if (!result.refined_case.meta) result.refined_case.meta = {};
      result.refined_case.meta.regenerate_required = true;
      result.refined_case.meta.panel_quality_score = caseQualityScore;
      if (result.regenerate_sections.length > 0) {
        result.refined_case.meta.regenerate_sections = result.regenerate_sections;
      }
    }
    
    return result;
    
  } catch (error) {
    console.error("❌ Internal panel review failed:", error.message);
    // Fail gracefully - return structured result with original case
    return {
      refined_case: rawCase,
      regenerate_case: false,
      case_quality_score: 0,
      panel_reviews: [],
      synthesis_summary: `Panel review failed: ${error.message}`
    };
  }
}

