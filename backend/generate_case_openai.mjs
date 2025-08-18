// ~/medplat/backend/generate_case_openai.mjs
/**
 * Global JSON case generator (primary).
 * - Named export generateCaseJSON(): returns a strict JSON object using the unified schema.
 * - Default export: legacy TEXT renderer built from the same JSON (optionally translated).
 *
 * Unified JSON schema keys (must exist in model output):
 * meta, history, exam, paraclinical, differentials, red_flags, final_diagnosis,
 * pathophysiology, etiology, management, disposition, evidence, teaching, panel_notes
 */

import openai from "./routes/openai_client.js";
import { translateText } from "./utils/translate_util.mjs";

/* ---------- Strict system & schema guidance ---------- */
const SCHEMA_HINT = `
Return ONE JSON object with these keys and shapes (English keys; values in requested language):
{
  "meta": {
    "topic": string,
    "language": string,         // e.g., "en", "da", "ar"
    "region": string,           // e.g., "EU/DK", "US", "UK", "GCC"
    "demographics": { "age": number, "sex": string },   // "male" | "female" | "unspecified"
    "geography_of_living": string                       // e.g., "urban, lives alone"
  },
  "history": {
    "presenting_complaint": string,
    "onset_duration_severity": string,
    "context_triggers": string,
    "post_event": string,
    "past_medical_history": string[],
    "medications_current": string[],
    "allergies": string[]
  },
  "exam": {
    "vitals": object,           // { BP, HR, RR, Temp, SpO2 ... }
    "orthostatics": object,     // {} or { sitting, standing, delta }
    "general": string,
    "cardiorespiratory": string,
    "hemodynamic_profile": string,  // "warm & dry" | "warm & wet" | "cold & dry" | "cold & wet"
    "pain_distress": string
  },
  "paraclinical": {
    "labs": string[],           // list each salient lab finding or "pending"
    "ecg": string,
    "imaging": [ { "modality": string, "timing": string, "rationale": string } ],
    "other_tests": string[],
    "test_kinetics": [ { "test": string, "timing_relation": string, "notes": string } ]
  },
  "differentials": [
    { "name": string, "status": "ACCEPTED" | "REJECTED" | "KEEP_OPEN", "why_for": string, "why_against": string }
  ],
  "red_flags": string[],
  "final_diagnosis": { "name": string, "rationale": string },
  "pathophysiology": { "mechanism": string, "systems_organs": string },
  "etiology": { "underlying_cause": string },
  "management": {
    "immediate": string[],      // ABC, urgent steps tailored to the topic
    "escalation_if_wrong_dx": string[], // contingencies if initial dx incorrect
    "region_guidelines": [ { "society": string, "year": string, "applies_to": string, "note": string } ],
    "timing_windows": [ { "action": string, "window": string } ]
  },
  "disposition": {
    "admit_vs_discharge": string,
    "unit": string,
    "follow_up": string,
    "social_needs": string
  },
  "evidence": {
    "prevalence": string,
    "incidence": string,
    "key_tests": [ { "test": string, "sensitivity": string, "specificity": string, "notes": string } ],
    "prognosis": string
  },
  "teaching": { "pearls": string[], "mnemonics": string[] },
  "panel_notes": {
    "internal_medicine": string,
    "surgery": string,
    "emergency_medicine": string
  }
}
`.trim();

const SYSTEM_PROMPT = `
You are a GLOBAL CLINICAL CASE GENERATOR for medical education.
• Output MUST be valid JSON only (no prose, no code fences).
• Follow clinical chronology and realism.
• Enforce hemodynamic profile (warm/cold; wet/dry) and pain/distress.
• Include test kinetics where relevant (e.g., troponin rise/peak windows).
• Imaging must include timing & escalation (bedside → acute → subacute → outpatient).
• Differentials must carry ACCEPTED/REJECTED/KEEP_OPEN with "why_for" and "why_against".
• Management must include: immediate steps, timing windows, region-aware guidelines, and contingencies if wrong dx.
• Disposition must reflect social needs.
• Use requested language and region. No URLs. No questions or "self-check".
• Conform to the following schema precisely:
${SCHEMA_HINT}
`.trim();

/* ---------- User prompt builder ---------- */
function userJSONPrompt({
  area,
  topic,
  language = "en",
  region = "EU/DK",
  niveau = "",
  patient_constraints = {},
  minutes_from_onset = null
}) {
  return `
Generate one realistic case using the unified JSON schema.

context:
- area: ${area}
- topic: ${topic}
- niveau: ${niveau}
- language: ${language}
- region: ${region}
- patient_constraints: ${JSON.stringify(patient_constraints)}
- onset_minutes_ago: ${minutes_from_onset ?? "unknown"}

Global requirements:
- Demographics must be realistic for the topic (age/sex not random).
- Geography_of_living must be present (e.g., "urban, lives alone").
- Labs/imaging must be diagnostically relevant for ${topic}.
- Include red flags tailored to ${topic}.
- Avoid brand names if generic exists.
- No references as URLs; summarize guideline sources in "region_guidelines.note".
`.trim();
}

/* ---------- Utilities: strip fences, repair, and normalize ---------- */
const stripFences = (s = "") =>
  String(s)
    .trim()
    .replace(/^`{3,}(?:json)?\s*/i, "")
    .replace(/`{3,}\s*$/i, "")
    .replace(/^`+|`+$/g, "");

async function repairJson(badJsonText, model = "gpt-4o-mini") {
  const repairPrompt = `
Fix ONLY the formatting so the following becomes valid JSON. Output JSON only:

${badJsonText}
`.trim();

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "You output ONLY valid JSON. No commentary." },
      { role: "user", content: repairPrompt }
    ],
    temperature: 0.0
  });

  return stripFences(completion?.choices?.[0]?.message?.content || "{}");
}

function ensureArray(v) {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  return [v].filter(Boolean);
}

function ensureObject(v) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

function normalizeAndFill(obj = {}, ctx = {}) {
  const out = { ...obj };

  // Ensure all top-level required keys exist.
  const requiredTop = [
    "meta","history","exam","paraclinical","differentials","red_flags",
    "final_diagnosis","pathophysiology","etiology","management",
    "disposition","evidence","teaching","panel_notes"
  ];
  for (const k of requiredTop) if (!(k in out)) out[k] = (k === "differentials" || k === "red_flags") ? [] : {};

  // meta
  out.meta = ensureObject(out.meta);
  out.meta.topic = ctx.topic || out.meta.topic || "";
  out.meta.language = ctx.language || out.meta.language || "en";
  out.meta.region = ctx.region || out.meta.region || "EU/DK";
  out.meta.demographics = ensureObject(out.meta.demographics);
  if (typeof out.meta.demographics.age !== "number") out.meta.demographics.age = 60;
  if (!out.meta.demographics.sex) out.meta.demographics.sex = "unspecified";
  out.meta.geography_of_living = out.meta.geography_of_living || "urban, lives with family";

  // history
  out.history = ensureObject(out.history);
  out.history.past_medical_history = ensureArray(out.history.past_medical_history);
  out.history.medications_current = ensureArray(out.history.medications_current);
  out.history.allergies = ensureArray(out.history.allergies);

  // exam
  out.exam = ensureObject(out.exam);
  out.exam.vitals = ensureObject(out.exam.vitals);
  out.exam.orthostatics = ensureObject(out.exam.orthostatics);
  out.exam.hemodynamic_profile = out.exam.hemodynamic_profile || "warm & dry";
  out.exam.pain_distress = out.exam.pain_distress || "appears uncomfortable";

  // paraclinical
  out.paraclinical = ensureObject(out.paraclinical);
  out.paraclinical.labs = ensureArray(out.paraclinical.labs);
  out.paraclinical.imaging = ensureArray(out.paraclinical.imaging).map(x => ({
    modality: x?.modality || "",
    timing: x?.timing || "",
    rationale: x?.rationale || ""
  }));
  out.paraclinical.other_tests = ensureArray(out.paraclinical.other_tests);
  out.paraclinical.test_kinetics = ensureArray(out.paraclinical.test_kinetics).map(x => ({
    test: x?.test || "",
    timing_relation: x?.timing_relation || "",
    notes: x?.notes || ""
  }));

  // diffs & red flags
  out.differentials = ensureArray(out.differentials).map(d => ({
    name: d?.name || "",
    status: d?.status || "KEEP_OPEN",
    why_for: d?.why_for || "",
    why_against: d?.why_against || ""
  }));
  out.red_flags = ensureArray(out.red_flags);

  // management
  out.management = ensureObject(out.management);
  out.management.immediate = ensureArray(out.management.immediate);
  out.management.escalation_if_wrong_dx = ensureArray(out.management.escalation_if_wrong_dx);
  out.management.region_guidelines = ensureArray(out.management.region_guidelines).map(g => ({
    society: g?.society || (out.meta.region.includes("EU") ? "ESO/ESC" : "AHA/ACC"),
    year: g?.year || "2021",
    applies_to: g?.applies_to || out.meta.topic || "",
    note: g?.note || "See regional consensus; summarize without links."
  }));
  out.management.timing_windows = ensureArray(out.management.timing_windows).map(t => ({
    action: t?.action || "",
    window: t?.window || ""
  }));

  // disposition
  out.disposition = ensureObject(out.disposition);
  out.disposition.admit_vs_discharge = out.disposition.admit_vs_discharge || "Admit";
  out.disposition.unit = out.disposition.unit || "Appropriate specialty ward";
  out.disposition.follow_up = out.disposition.follow_up || "Arrange specialty follow-up";
  out.disposition.social_needs = out.disposition.social_needs || "Assess caregiver support and home safety";

  // evidence
  out.evidence = ensureObject(out.evidence);
  out.evidence.key_tests = ensureArray(out.evidence.key_tests).map(t => ({
    test: t?.test || "",
    sensitivity: t?.sensitivity || "",
    specificity: t?.specificity || "",
    notes: t?.notes || ""
  }));

  // teaching
  out.teaching = ensureObject(out.teaching);
  out.teaching.pearls = ensureArray(out.teaching.pearls);
  out.teaching.mnemonics = ensureArray(out.teaching.mnemonics);

  // panel notes
  out.panel_notes = ensureObject(out.panel_notes);
  if (!out.panel_notes.internal_medicine) out.panel_notes.internal_medicine = "—";
  if (!out.panel_notes.surgery) out.panel_notes.surgery = "—";
  if (!out.panel_notes.emergency_medicine) out.panel_notes.emergency_medicine = "—";

  return out;
}

/* ---------- Public JSON API ---------- */
export async function generateCaseJSON({
  area,
  topic,
  language = "en",
  region = "EU/DK",
  niveau = "",
  model = "gpt-4o-mini",
  patient_constraints = {},
  minutes_from_onset = null
}) {
  if (typeof topic === "object" && topic?.topic) topic = topic.topic;
  if (typeof topic !== "string" || !topic.trim()) throw new Error("Invalid topic");

  // 1) Try strict JSON output
  let raw = "{}";
  try {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userJSONPrompt({ area, topic, language, region, niveau, patient_constraints, minutes_from_onset }) }
      ],
      temperature: 0.4
    });
    raw = completion?.choices?.[0]?.message?.content || "{}";
  } catch (e) {
    // fallback will happen below
    raw = "{}";
  }

  // 2) Parse or repair
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    const repaired = await repairJson(raw, model);
    data = JSON.parse(repaired);
  }

  // 3) Normalize & backfill required fields
  const normalized = normalizeAndFill(data, { topic, language, region });
  return normalized;
}

/* ---------- Legacy TEXT API (default export) ---------- */
function renderTextFromJSON(obj) {
  try {
    const {
      history = {}, exam = {}, paraclinical = {},
      differentials = [], red_flags = [],
      final_diagnosis = {}, pathophysiology = {}, etiology = {},
      management = {}, disposition = {}, evidence = {}, teaching = {}, panel_notes = {}
    } = obj;

    const lines = [];
    lines.push(`I. Patient History`);
    lines.push(`Presenting Complaint: ${history.presenting_complaint || ""}`);
    lines.push(`Onset/Duration/Severity: ${history.onset_duration_severity || ""}`);
    lines.push(`Context & Triggers: ${history.context_triggers || ""}`);
    lines.push(`Post-event Details: ${history.post_event || ""}`);
    lines.push(`Past Medical History: ${(history.past_medical_history || []).join("; ")}`);
    lines.push(`Medications & Allergies: ${(history.medications_current || []).join(", ")}; Allergies: ${(history.allergies || []).join(", ")}`);

    lines.push(`\nII. Objective Clinical Findings`);
    lines.push(`Vitals: ${JSON.stringify(exam.vitals || {})}`);
    lines.push(`Orthostatics: ${JSON.stringify(exam.orthostatics || {})}`);
    lines.push(`General: ${exam.general || ""}`);
    lines.push(`Cardiorespiratory: ${exam.cardiorespiratory || ""}`);
    lines.push(`Hemodynamic: ${exam.hemodynamic_profile || ""}; Pain: ${exam.pain_distress || ""}`);

    lines.push(`\nIII. Paraclinical Investigations`);
    (paraclinical.labs || []).forEach(l => lines.push(`Lab: ${l}`));
    lines.push(`ECG: ${paraclinical.ecg || "—"}`);
    (paraclinical.imaging || []).forEach(i => lines.push(`Imaging: ${i.modality} — ${i.timing} — ${i.rationale}`));
    (paraclinical.test_kinetics || []).forEach(k => lines.push(`Kinetics: ${k.test}: ${k.timing_relation} (${k.notes})`));

    lines.push(`\nIV. Differential Diagnoses`);
    differentials.forEach(d => lines.push(`- ${d.name} [${d.status}] — for: ${d.why_for}; against: ${d.why_against}`));
    lines.push(`Red Flags: ${red_flags.join("; ")}`);

    lines.push(`\nV. Final Diagnosis`);
    lines.push(`${final_diagnosis.name || ""}`);
    lines.push(`Rationale: ${final_diagnosis.rationale || ""}`);

    lines.push(`\nVI. Pathophysiology`);
    lines.push(`${pathophysiology.mechanism || ""}`);
    lines.push(`\nVI.b Etiology`);
    lines.push(`${etiology.underlying_cause || ""}`);

    lines.push(`\nVII. Conclusion, Treatment & Discussion`);
    (management.immediate || []).forEach(m => lines.push(`- ${m}`));
    (management.timing_windows || []).forEach(t => lines.push(`Timing: ${t.action} — ${t.window}`));
    (management.region_guidelines || []).forEach(g => lines.push(`Guideline: ${g.society} ${g.year} — ${g.applies_to}: ${g.note}`));

    lines.push(`\nDisposition & Follow-up`);
    lines.push(`Plan: ${disposition.admit_vs_discharge || ""}; Unit: ${disposition.unit || ""}; Follow-up: ${disposition.follow_up || ""}; Social: ${disposition.social_needs || ""}`);

    lines.push(`\nVIII. Evidence & Statistics`);
    lines.push(`Prevalence: ${evidence.prevalence || ""}; Incidence: ${evidence.incidence || ""}`);
    (evidence.key_tests || []).forEach(t => lines.push(`Test ${t.test}: sens ${t.sensitivity}, spec ${t.specificity} — ${t.notes}`));
    lines.push(`Prognosis: ${evidence.prognosis || ""}`);

    lines.push(`\nTeaching & Gamification`);
    (teaching.pearls || []).forEach(p => lines.push(`Pearl: ${p}`));
    (teaching.mnemonics || []).forEach(m => lines.push(`Mnemonic: ${m}`));
    (Object.keys(panel_notes || {})).forEach(k => lines.push(`Panel (${k}): ${panel_notes[k]}`));

    return lines.join("\n");
  } catch {
    return "⚠️ Could not render text from JSON.";
  }
}

export default async function generateCase({
  area,
  topic,
  language = "en",
  region = "EU/DK",
  niveau = "",
  model = "gpt-4o-mini",
  patient_constraints = {},
  minutes_from_onset = null,
  format = "text" // "text" | "json"
}) {
  const jsonObj = await generateCaseJSON({
    area, topic, language, region, niveau, model, patient_constraints, minutes_from_onset
  });

  if (format === "json") return jsonObj;

  // Legacy behavior: return TEXT; translate if needed
  let text = renderTextFromJSON(jsonObj);
  if (language && language.toLowerCase() !== "en") {
    try {
      text = await translateText(text, language);
    } catch {
      // ignore translation errors
    }
  }
  return text;
}
