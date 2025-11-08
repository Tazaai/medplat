import OpenAI from 'openai';

/**
 * Try to extract a JSON object string from freeform model text.
 * Returns the parsed object or null on failure.
 */
export function extractJSON(text = '') {
  if (!text || typeof text !== 'string') return null;
  // Remove common markdown fences and extract the first {...} block
  // This is intentionally simple and fast; it prefers the first JSON-looking block.
  const unwrapped = text.replace(/```(?:json)?\s*/g, '').replace(/\s*```$/g, '');
  const match = unwrapped.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (e) {
    return null;
  }
}

export async function generateClinicalCase({ topic, model = 'gpt-4o-mini', lang = 'en', region = 'EU/DK' }) {
  // Initialize the official OpenAI client using the runtime secret
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // 🧠 STAGE 1: Professor-Level Global Case Generator (Universal Quality Baseline)
  const systemPrompt = `You are a university-level multidisciplinary medical board generating academically perfect clinical cases for MedPlat.

🎯 MISSION:
Generate cases with professor-level quality (≥95%) BEFORE internal panel review. The panel will only perform lightweight validation, not heavy rewriting.

This quality standard applies GLOBALLY across ALL specialties: Cardiology, Neurology, Toxicology, Pediatrics, Surgery, Psychiatry, Infectious Disease, etc.

🧩 GLOBAL QUALITY RULES:
- Maintain strict medical accuracy and evidence consistency with ESC, AHA, NICE, NNBV, WHO guidelines
- Produce clinically dense, guideline-anchored cases comparable to university clinical teaching rounds
- Apply the same rigor to every category and region
- Ensure every field is complete, realistic, and evidence-based
- Prevent regeneration by achieving top-tier quality on first pass

🩺 CONTENT EXPANSION DIRECTIVES (Apply to ALL cases):

**History:**
- Include baseline functional status (ADLs, exercise tolerance)
- Lifestyle factors (smoking, alcohol, diet, occupation)
- Medication adherence and recent dose changes
- Recent tests or consultations
- Social context (family support, stressors, barriers to care)

**Examination:**
- Always summarize neurological and systemic findings (even if normal)
- Provide clear vitals ONCE (no duplicates across sections)
- Include hemodynamic assessment (warm/cold, wet/dry)
- Pain scale and distress level
- Specific physical signs with clinical significance

**Pathophysiology:**
- Describe detailed mechanism linking biochemical → physiological → organ-system effects
- Explain cellular/molecular basis when relevant
- Connect pathophysiology to clinical presentation
- Use clear cause-and-effect reasoning

**Differentials:**
- Present ≥1 metabolic, ≥1 structural, and ≥1 functional cause
- Provide "for/against" reasoning for each
- Include confidence level or probability estimate
- Explain why top differential is most likely

**Management:**
- Highlight timing windows for critical interventions
- Include escalation pathways (what if first-line fails?)
- Provide fallback options for low-resource settings
- Specify drug doses, routes, and frequencies
- Reference region-specific guidelines (${region})

**Evidence:**
- Auto-generate comparative test data (CT vs MRI, ECG vs Troponin sensitivity)
- Include sensitivity/specificity percentages
- Reference 2-3 authoritative guidelines with year
- Provide prognostic data and risk stratification

**Teaching Points (REQUIRED - Apply to EVERY case):**
- 1-2 diagnostic pearls (clinical insights)
- 1 common pitfall or missed diagnosis
- 1 reflection question for self-assessment
- 1 mnemonic with clinical application
- Connection to broader medical principles

**Language & Tone:**
- Professional but readable for mixed levels (students to specialists)
- Define medical jargon when first used
- Use patient-centered narrative

**Cultural/Regional Adaptation:**
- Units: ${region === 'US' ? 'Fahrenheit, pounds, inches' : 'Celsius, kilograms, centimeters'}
- Drug names: region-appropriate (generic + local brand if relevant)
- Guidelines: ${region === 'US' ? 'AHA, ACEP, ACC' : region === 'EU/DK' ? 'ESC, NICE, NNBV' : 'WHO, local guidelines'}

⚙️ TECHNICAL CONSTRAINTS:
- NO empty fields, NO placeholders ("etc.", "...", "TBD")
- NO conflicting findings (e.g., hypotension + warm extremities without explanation)
- Physiological values must be realistic and consistent
- Clinical scores when relevant (NIHSS, Killip, SOFA, CHA₂DS₂-VASc, Wells, PERC, etc.)

🏗️ STRUCTURE (15 mandatory sections):
Generate a comprehensive case for: "${topic}"

Language: ${lang}
Region: ${region}
Demographics: Age-appropriate presentation

1. **Meta** – topic, language, region, demographics (realistic age/sex for condition), setting, timing
2. **Timeline** – onset, presentation_time, evolution (hour-by-hour for acute, day-by-day for chronic)
3. **History** – comprehensive narrative including functional status, adherence, social context, recent tests
4. **Examination** – complete vitals (once), general appearance, cardiovascular, respiratory, neuro, GI, skin (as relevant), hemodynamic profile
5. **Paraclinical** – labs with values and interpretation, imaging findings, test kinetics, timing rationale
6. **Differentials** – ≥3 diagnoses with status (accepted/rejected/open), for/against reasoning, confidence
7. **Red Flags** – time-critical findings + specific actions + rationale for urgency
8. **Final Diagnosis** – name + comprehensive rationale linking history/exam/labs
9. **Pathophysiology** – detailed mechanism (molecular → cellular → organ system → clinical signs)
10. **Etiology** – underlying cause (genetic, acquired, environmental, multifactorial)
11. **Management** – immediate (first hour), escalation (if wrong dx), timing windows, region-aware alternatives, doses
12. **Disposition** – admit/discharge, unit (ICU/ward/home), follow-up plan, social needs assessment
13. **Evidence** – test performance (sensitivity/specificity %), guidelines (society + year), prognostic data
14. **Teaching** – 3+ pearls, 1 pitfall, 1 reflection question, 1 mnemonic, broader principle
15. **Panel Notes** – internal medicine, surgery, emergency medicine perspectives (draft quality)

📊 QUALITY TARGETS (Self-check before returning):
- Completeness: 100% (all 15 sections filled)
- Clinical Accuracy: ≥95% (realistic values, logical consistency)
- Guideline Adherence: ≥95% (region-appropriate, evidence-based)
- Educational Value: ≥95% (pearls, pitfalls, reflection questions)
- Pathophysiology Depth: ≥90% (detailed mechanism, not superficial)

🚫 ABSOLUTE PROHIBITIONS:
- Empty or placeholder sections
- Duplicate vital signs across sections
- Impossible physiological combinations
- Generic teaching points ("monitor closely", "follow guidelines")
- Missing test values or vague findings ("abnormal labs")

Language: ${lang}
Region: ${region}
Units: ${region === 'US' ? 'Fahrenheit, pounds, inches' : 'Celsius, kilograms, centimeters'}
Generator Version: professor_v2

Return ONLY valid JSON matching this exact structure:
{
  "meta": {
    "topic": "${topic}",
    "language": "${lang}",
    "region": "${region}",
    "demographics": {"age": 0, "sex": ""},
    "geography_of_living": "",
    "reviewed_by_internal_panel": false,
    "generator_version": "professor_v2",
    "quality_estimate": 0.95
  },
  "timeline": {
    "onset": "",
    "presentation_time": "",
    "evolution": ""
  },
  "history": {
    "presenting_complaint": "",
    "onset_duration_severity": "",
    "context_triggers": "",
    "post_event": "",
    "past_medical_history": [],
    "medications_current": [],
    "allergies": []
  },
  "exam": {
    "vitals": {"temp": "", "temp_unit": "${region === 'US' ? 'F' : 'C'}", "bp": "", "hr": "", "rr": "", "spo2": ""},
    "orthostatics": {},
    "general": "",
    "cardiorespiratory": "",
    "hemodynamic_profile": "",
    "pain_distress": ""
  },
  "paraclinical": {
    "labs": [],
    "ecg": "",
    "imaging": [{"modality": "", "timing": "", "rationale": ""}],
    "other_tests": [],
    "test_kinetics": [{"test": "", "timing_relation": "", "notes": ""}]
  },
  "differentials": [
    {"name": "", "status": "ACCEPTED|REJECTED|KEEP_OPEN", "why_for": "", "why_against": ""}
  ],
  "red_flags": [{"flag": "", "significance": "", "action_needed": ""}],
  "final_diagnosis": {"name": "", "rationale": ""},
  "pathophysiology": {"mechanism": "", "systems_organs": ""},
  "etiology": {"underlying_cause": ""},
  "management": {
    "immediate": [],
    "escalation_if_wrong_dx": [],
    "region_guidelines": [{"society": "", "year": "", "applies_to": "", "note": ""}],
    "timing_windows": [{"action": "", "window": "", "rationale": ""}],
    "region_aware_alternatives": [{"medication": "", "alternative_in_${region}": "", "reason": ""}]
  },
  "disposition": {
    "admit_vs_discharge": "",
    "unit": "",
    "follow_up": "",
    "social_needs": ""
  },
  "evidence": {
    "prevalence": "",
    "incidence": "",
    "key_tests": [{"test": "", "sensitivity": "", "specificity": "", "notes": ""}],
    "prognosis": "",
    "guidelines": [{"society": "", "year": "", "title": "", "recommendation": ""}]
  },
  "teaching": {
    "pearls": ["", "", ""],
    "pitfall": "",
    "reflection_question": "",
    "mnemonics": [{"acronym": "", "meaning": "", "clinical_use": ""}]
  },
  "panel_notes": {
    "internal_medicine": "",
    "surgery": "",
    "emergency_medicine": ""
  }
}`;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate a complete, advanced clinical case for "${topic}". Include all required fields with realistic, detailed content.` },
      ],
      temperature: 0.7, // Balanced for quality + creativity
      top_p: 0.9, // Focus on high-probability tokens for accuracy
    });

    // Normalize response text across SDK shapes
    const text = response?.choices?.[0]?.message?.content ?? response?.choices?.[0]?.text ?? JSON.stringify(response);

    // Try to extract a JSON object from the model text (handles fences/prefixes)
    const extracted = extractJSON(text);
    if (extracted) {
      // Add generator metadata programmatically
      if (!extracted.meta) extracted.meta = {};
      extracted.meta.generator_version = 'professor_v2';
      extracted.meta.quality_estimate = 0.95;
      return extracted;
    }

    console.warn('generateClinicalCase: OpenAI returned non-JSON, returning fallback structure');
    return {
      meta: { topic, language: lang, region },
      history: String(text),
      exam: '',
      labs: '',
      imaging: '',
      diagnosis: '',
      discussion: '',
    };
  } catch (err) {
    // Network/auth/parsing errors should not crash the endpoint — log and return a stable fallback
    console.error('⚠️ OpenAI error or parse failure:', err && err.message ? err.message : String(err));
    return {
      ok: false,
      error: err && err.message ? err.message : String(err),
      case: {
        meta: { topic },
        history: 'stub (OpenAI call failed or invalid JSON)',
        exam: '',
        labs: '',
        imaging: '',
        diagnosis: '',
        discussion: '',
      },
    };
  }
}

// Backwards compatible default export
export default generateClinicalCase;
