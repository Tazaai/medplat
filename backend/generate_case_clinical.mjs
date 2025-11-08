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

  const systemPrompt = `You are an expert clinical case generator for the MedPlat platform.

Generate a comprehensive, realistic clinical case for: "${topic}"

CRITICAL REQUIREMENTS:
- Start with timeline/onset for acute cases (e.g., "45 minutes before arrival")
- Include medication lists with allergies
- **ALWAYS populate Physical Examination** with complete vitals (HR, BP, RR, SpO2, Temp), general appearance, cardiorespiratory findings, hemodynamic profile (warm/cold, wet/dry)
- Specify hemodynamic profile with region-specific units (${region === 'US' ? 'Fahrenheit, lb, in' : 'Celsius, kg, cm'})
- **ALWAYS include 2-3 key Paraclinical findings** (e.g., CXR, ECG, labs, ABG with specific values and interpretation)
- Include test kinetics and timing
- Provide imaging timing and escalation rationale
- List accepted vs rejected differentials with arguments
- Apply region-specific guidelines (${region})
- **ALWAYS include Disposition** (admit vs discharge, unit, follow-up plan, social needs assessment)
- Add red flags PROMINENTLY before management with specific actions
- Add timing windows for critical interventions with rationale
- Include region-aware medication alternatives
- Add 2-3 teaching pearls and at least 1 mnemonic
- **ALWAYS include Evidence & References** (2-3 specific guidelines with year, society name)
- Include internal expert panel notes (internal medicine, surgery, emergency medicine perspectives)

Language: ${lang}
Region: ${region}
Units: ${region === 'US' ? 'Fahrenheit, pounds, inches' : 'Celsius, kilograms, centimeters'}

**IMPORTANT**: Do NOT leave exam, paraclinical, disposition, or evidence sections empty. Always provide realistic, specific values and findings.

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
      temperature: 0.7,
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
