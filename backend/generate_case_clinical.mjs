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

  // 🧠 STAGE 1: High-Authority Professor-Level Case Generator
  const systemPrompt = `You are a panel of senior medical educators, specialists, and clinical researchers tasked with generating an academically perfect medical case for MedPlat.

🎯 GOAL:
Produce a realistic, structured, and globally guideline-aligned case that already meets professor-level academic standards before internal panel validation.

TARGET QUALITY: ≥ 95% (excellence threshold)
- Deliver reasoning depth comparable to university clinical teaching rounds
- Every field must be complete, realistic, and evidence-anchored
- Prevent any need for regeneration by achieving top-tier quality on first pass

💡 STYLE & TONE:
- Professional, clinical, and concise.
- Evidence-anchored (ESC, AHA, NICE, NNBV, WHO, UpToDate-level depth).
- Avoid redundancy, ensure precise flow from presentation → diagnosis → management → teaching.
- Use clear clinical reasoning over literary description.
- Include nuanced patient narrative (daily context, medication compliance, triggers).
- Keep tone readable for mixed user levels (students to specialists).

🏗️ STRUCTURE (must fill all):
Generate a comprehensive clinical case for: "${topic}"

1. **Meta** – topic, language (${lang}), region (${region}), demographics, setting, timing.
2. **Timeline** – onset, presentation_time, evolution (especially for acute cases).
3. **History** – full chronology, context triggers, comorbidities, medications, allergies.
4. **Examination** – vitals with region-specific units (${region === 'US' ? 'Fahrenheit/lb/in' : 'Celsius/kg/cm'}), systems exam, hemodynamic state (warm/cold, wet/dry), pain/distress.
5. **Paraclinical** – key labs, imaging, test kinetics (with rationale and specific values).
6. **Differentials** – accepted, rejected, open, with why-for/why-against.
7. **Red Flags** – time-critical findings + specific actions needed.
8. **Final Diagnosis** – clear rationale and pathophysiologic reasoning.
9. **Pathophysiology** – mechanism, systems/organs affected.
10. **Etiology** – underlying cause.
11. **Management** – immediate steps, escalation if wrong dx, timing windows, and region-aware guideline references (${region}).
12. **Disposition** – admit vs discharge, unit, follow-up, social needs.
13. **Evidence** – key tests with sensitivity/specificity, prognostic data, and 2-3 authoritative guidelines.
14. **Teaching** – at least 3 pearls + 1 mnemonic with clinical use.
15. **Panel Notes (draft)** – internal medicine, surgery, emergency medicine comments.

📊 REQUIREMENTS:
- Logical consistency and realism.
- Correct physiological values and ranges.
- Include clinical scores when relevant (NIHSS, Killip, SOFA, etc.).
- Ensure differential reasoning, not simplistic confirmation bias.
- Use global guideline terminology; localize only where clear (e.g., NNBV for DK, AHA for US, ESC for EU).
- Avoid bias toward a single region unless specified.
- Prefer **clear clinical reasoning** over literary description.

🚫 DO NOT:
- Produce incomplete fields.
- Use placeholders or "etc.".
- Invent impossible combinations of findings.
- Leave exam, paraclinical, disposition, or evidence sections empty.

Language: ${lang}
Region: ${region}
Units: ${region === 'US' ? 'Fahrenheit, pounds, inches' : 'Celsius, kilograms, centimeters'}

Return ONLY valid JSON matching this exact structure:
{
  "meta": {
    "topic": "${topic}",
    "language": "${lang}",
    "region": "${region}",
    "demographics": {"age": 0, "sex": ""},
    "geography_of_living": "",
    "reviewed_by_internal_panel": false
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
    if (extracted) return extracted;

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
