// ~/medplat/backend/generate_case_structured.mjs
import openai from "./routes/openai_client.js";

/**
 * Panel-approved generator that returns a single JSON object
 * matching the v1.1 global schema (meta/context/timeline/safety, etc.).
 *
 * It includes:
 * - Strict schema prompt
 * - JSON fence stripping
 * - One-shot JSON repair if the first parse fails
 * - Minimal enrichment of meta fields (topic, area, niveau, language)
 */
export default async function generateCaseStructured({
  area,
  topic,
  language = "English",
  niveau = "kompleks",
  model = "gpt-4o-mini",
}) {
  // Normalize topic from { topic } objects
  if (typeof topic === "object" && topic?.topic) topic = topic.topic;

  if (typeof topic !== "string" || !topic.trim()) {
    throw new Error("Invalid topic input");
  }

  const systemPrompt = `
You are a multidisciplinary panel of senior medical doctors and medical educators.
Output ONLY a single strict JSON object that conforms EXACTLY to the schema provided.
No markdown, no code fences/backticks, and no commentary outside the JSON object.
Keys must be in English. Values must be in the requested language.
Maintain clinical realism, chronology, and safety. Use SI units unless the region dictates otherwise.
If an item is not applicable, return an empty array [] or null (do NOT omit required keys).
`.trim();

  // -------- v1.1 SCHEMA (keys fixed; values must be in 'language') --------
  const schema = `
{
  "meta": {
    "topic": string,
    "category": string,
    "language": string,
    "region": string,                      // "Global" | "EU" | "USA" | "DK" | etc.
    "complexity": "simple"|"moderate"|"advanced",
    "unit_system": "SI"|"US",
    "case_version": "1.1",
    "review_status": "draft"|"clinically-reviewed"|"education-reviewed",
    "created_at": string                   // ISO timestamp
  },
  "patient": {
    "age": number|null,
    "sex_at_birth": "male"|"female"|"unknown",
    "pregnancy_status": string|null,
    "height_cm": number|null,
    "weight_kg": number|null,
    "bmi": number|null,
    "comorbidity_index": number|null,
    "past_medical_history": string[],
    "medications": [
      { "name": string, "dose": string, "route": string, "frequency": string }
    ],
    "allergies": string[],
    "social_family_history": string[]
  },
  "context": {
    "setting": "Emergency Department"|"Ward"|"ICU"|"Outpatient"|"Prehospital"|"Other",
    "resource_level": "limited"|"standard"|"advanced",
    "presenting_complaint": string,
    "onset_duration_severity": string,
    "context_triggers": string,
    "post_event_details": string|null
  },
  "timeline": {
    "vitals": [
      { "time": string, "BP": string|null, "HR": string|null, "RR": string|null, "Temp": string|null, "SpO2": string|null, "GCS": number|null, "PainVAS": number|null }
    ],
    "labs": [
      { "time": string, "test": string, "value": string, "ref": string|null, "interpretation": string|null }
    ]
  },
  "objective_findings": {
    "general": string,
    "primary_survey": { "A": string, "B": string, "C": string, "D": string, "E": string },
    "focused_exam": string[]
  },
  "paraclinical": {
    "ecg_imaging": [
      { "modality": "ECG"|"X-ray"|"CT"|"MRI"|"US"|"Echo"|"Other", "finding": string }
    ],
    "other_tests": string[]
  },
  "differential_diagnoses": [
    { "dx": string, "for": string[], "against": string[] }
  ],
  "final_diagnosis": {
    "diagnosis": string,
    "criteria_rationale": string[]
  },
  "pathophysiology": {
    "mechanism": string,
    "systems_organs": string[],
    "etiology_underlying_cause": string[]
  },
  "treatment_plan": {
    "summary": string,
    "initial_management": string[],
    "definitive_management": string[],
    "disposition_followup": string[],
    "monitoring": string[],
    "contraindications_cautions": string[],
    "time_windows": string[]
  },
  "evidence_stats": {
    "prevalence_incidence": string[],
    "key_test_performance": [
      { "test": string, "sensitivity": string, "specificity": string, "notes": string }
    ],
    "prognosis": string[],
    "references": string[]                 // "Organization Year" or "Textbook Edition Year"
  },
  "teaching_gamification": {
    "clinical_reasoning_notes": string[],
    "mnemonics_pearls": string[],
    "self_check_questions": [
      { "q": string, "type": "short"|"checklist", "answer_key": string[] }
    ],
    "flags": { "difficulty": "easy"|"moderate"|"hard", "explanations_at_end": boolean }
  }
}
`.trim();

  const userPrompt = `
Generate ONE realistic clinical case object for:
- Topic: "${topic}"
- Category: ${area}
- Requested values language: ${language}

QUALITY & SAFETY (MANDATORY):
- Keep data realistic; include at least one red-flag/escalation item in monitoring.
- If time-critical (e.g., STEMI/sepsis/stroke), include explicit "time_windows".
- Provide at least 3 differential diagnoses, each with "for" and "against" bullets.
- Use SI units unless a different region is explicitly set.
- Cite evidence with short "Organization Year" notes (no URLs).
- If something is not applicable, return [] or null, but keep the key.

SET DEFAULTS if not provided by you:
- "region": "Global"
- "complexity": "moderate"
- "unit_system": "SI"
- "review_status": "draft"
- "created_at": current ISO timestamp
- "teaching_gamification.flags": {"difficulty":"moderate","explanations_at_end":true}

Return ONLY the JSON object strictly matching this schema:
${schema}
`.trim();

  const stripFences = (s = "") =>
    String(s)
      .trim()
      .replace(/^`{3,}(?:json)?\s*/i, "")
      .replace(/`{3,}\s*$/i, "")
      .replace(/^`+|`+$/g, "");

  async function getJsonOnce() {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.35,
    });
    let raw = completion?.choices?.[0]?.message?.content || "{}";
    return stripFences(raw);
  }

  async function repairJson(badJsonText) {
    const repairPrompt = `
The following text was intended to be a single JSON object matching a known schema.
Fix ONLY formatting/quoting/brackets so it becomes valid JSON.
Do NOT add commentary or code fences.
Output ONLY the corrected JSON object:

${badJsonText}
`.trim();

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "You are a strict JSON repair assistant. Output ONLY valid JSON with no commentary." },
        { role: "user", content: repairPrompt }
      ],
      temperature: 0.0,
    });

    let raw = completion?.choices?.[0]?.message?.content || "{}";
    return stripFences(raw);
  }

  try {
    // First attempt
    let jsonText = await getJsonOnce();

    // Parse or repair once
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      const repaired = await repairJson(jsonText);
      try {
        parsed = JSON.parse(repaired);
        jsonText = repaired;
      } catch (err2) {
        console.warn("⚠️ Failed to parse JSON after repair:", err2.message);
        return jsonText; // return raw so frontend can still display something
      }
    }

    // Minimal enrichment to ensure meta alignment with request
    if (!parsed.meta) parsed.meta = {};
    parsed.meta.topic = parsed.meta.topic || topic;
    parsed.meta.category = parsed.meta.category || area;
    parsed.meta.language = parsed.meta.language || language;

    // Ensure required meta defaults if model forgot
    parsed.meta.region = parsed.meta.region || "Global";
    parsed.meta.complexity = parsed.meta.complexity || "moderate";
    parsed.meta.unit_system = parsed.meta.unit_system || "SI";
    parsed.meta.case_version = "1.1";
    parsed.meta.review_status = parsed.meta.review_status || "draft";
    parsed.meta.created_at = parsed.meta.created_at || new Date().toISOString();

    // Teaching flags default
    if (!parsed.teaching_gamification) parsed.teaching_gamification = {};
    if (!parsed.teaching_gamification.flags)
      parsed.teaching_gamification.flags = { difficulty: "moderate", explanations_at_end: true };

    return parsed;
  } catch (err) {
    console.error("❌ generateCaseStructured error:", err);
    return { error: `Error generating case: ${err.message || "Unknown error"}` };
  }
}
