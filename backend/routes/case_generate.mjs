// ~/medplat/backend/routes/case_generate.mjs
import express from "express";
import openai from "./openai_client.js";

const router = express.Router();

/** Global, reasoning-first generator. Output JSON only. */
const SYSTEM_PROMPT = `
You are a GLOBAL CLINICAL CASE GENERATOR for medical education.
Return a SINGLE VALID JSON object and nothing else.

Rules (apply to all topics/regions):
- Include demographics (age, sex) and geography of living.
- History → Exam (include hemodynamic profile: warm/cold & wet/dry; pain distress) →
  Paraclinical (labs; ECG if relevant; imaging with timing: bedside/urgent/subacute/ambulatory; add test kinetics when applicable, e.g., troponin rise windows) →
  Differentials (4–6 items; mark each as ACCEPTED/REJECTED/KEEP_OPEN with short "why for" and "why against") →
  Final diagnosis with rationale →
  Pathophysiology (mechanism; systems/organs) →
  Etiology →
  Management (region-aware guideline names + year; explicit timing windows; contingencies if the diagnosis is wrong / tests negative; ethical/geriatric considerations if relevant) →
  Disposition (admit/discharge, unit, follow-up, social needs) →
  Evidence (prevalence/incidence ranges; key test sensitivity/specificity and timing; concise source tags—no URLs) →
  Teaching (4–6 pearls, 2–3 mnemonics) →
  Panel notes (very short notes from Internal Medicine, Surgery, Emergency Medicine).
- Use the requested language/region for terms/units/guideline labels.
- If exact numbers are uncertain, give reasonable ranges and say "varies by region".
- Output JSON ONLY (no markdown/prose outside JSON).
`.trim();

/** Defaults for the "must_include" list (your global plan) */
const DEFAULT_MUST_INCLUDE = [
  "medication_list_with_allergies",
  "hemodynamic_profile_warm_cold_wet_dry",
  "test_kinetics_if_applicable",
  "imaging_timing_and_escalation",
  "accepted_vs_rejected_differentials_with_arguments",
  "region_aware_guidelines_and_timing",
  "disposition_plus_followup_and_social_needs"
];

/** Build the user prompt */
function buildUserPrompt({
  topic,
  area = "",
  language = "en",
  region = "US",
  patient_constraints = {},
  onset_minutes_ago = null,
  must_include = []
}) {
  const mi = (must_include && must_include.length) ? must_include : DEFAULT_MUST_INCLUDE;
  return `
Generate one realistic case.

topic: ${topic}
area: ${area}
language: ${language}
region: ${region}
patient_constraints: ${JSON.stringify(patient_constraints)}
onset_minutes_ago: ${onset_minutes_ago ?? "unknown"}
must_include: ${JSON.stringify(mi)}

Output format MUST include these keys:
meta, history, exam, paraclinical, differentials, red_flags, final_diagnosis,
pathophysiology, etiology, management, disposition, evidence, teaching, panel_notes.

The "meta" must include: topic, language, region, demographics (age, sex), geography_of_living.
`.trim();
}

/* ---------- helpers to normalize shape ---------- */
const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const asObject = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

/** Ensure stable keys so clients don't break on minor model variance */
function normalizeCase(c) {
  const out = asObject(c);

  // final_diagnosis: always { name, rationale }
  const fd = asObject(out.final_diagnosis);
  const fdName =
    fd.name ||
    fd.diagnosis ||
    fd.title ||
    (typeof out.final_diagnosis === "string" ? out.final_diagnosis : "");
  const fdRationale =
    fd.rationale || fd.reason || fd.explanation || fd.summary || "";
  out.final_diagnosis = { name: fdName, rationale: fdRationale };

  // arrays that UI expects
  out.differentials = asArray(out.differentials).map((d) => {
    const o = asObject(d);
    return {
      name: o.name || o.diagnosis || "",
      status: o.status || "KEEP_OPEN",
      why_for: o.why_for || o.for || "",
      why_against: o.why_against || o.against || ""
    };
  });

  out.red_flags = asArray(out.red_flags);

  out.history = asObject(out.history);
  out.history.past_medical_history = asArray(out.history.past_medical_history);
  out.history.medications_current = asArray(out.history.medications_current);
  out.history.allergies = asArray(out.history.allergies);

  out.exam = asObject(out.exam);
  out.exam.vitals = asObject(out.exam.vitals);
  out.exam.orthostatics = asObject(out.exam.orthostatics);

  out.paraclinical = asObject(out.paraclinical);
  out.paraclinical.labs = asArray(out.paraclinical.labs);
  out.paraclinical.imaging = asArray(out.paraclinical.imaging).map((i) => {
    const o = asObject(i);
    return {
      modality: o.modality || "",
      timing: o.timing || "",
      rationale: o.rationale || ""
    };
  });
  out.paraclinical.other_tests = asArray(out.paraclinical.other_tests);
  out.paraclinical.test_kinetics = asArray(out.paraclinical.test_kinetics).map((k) => {
    const o = asObject(k);
    return {
      test: o.test || "",
      timing_relation: o.timing_relation || o.timing || "",
      notes: o.notes || ""
    };
  });

  out.management = asObject(out.management);
  out.management.immediate = asArray(out.management.immediate);
  out.management.escalation_if_wrong_dx = asArray(out.management.escalation_if_wrong_dx);
  out.management.region_guidelines = asArray(out.management.region_guidelines).map((g) => {
    const o = asObject(g);
    return {
      society: o.society || o.source || "",
      year: String(o.year || ""),
      applies_to: o.applies_to || "",
      note: o.note || o.notes || ""
    };
  });
  out.management.timing_windows = asArray(out.management.timing_windows).map((t) => {
    const o = asObject(t);
    return { action: o.action || "", window: o.window || "" };
  });

  out.disposition = asObject(out.disposition);

  out.evidence = asObject(out.evidence);
  out.evidence.key_tests = asArray(out.evidence.key_tests).map((t) => {
    const o = asObject(t);
    return {
      test: o.test || "",
      sensitivity: o.sensitivity || "",
      specificity: o.specificity || "",
      notes: o.notes || ""
    };
  });

  out.teaching = asObject(out.teaching);
  out.teaching.pearls = asArray(out.teaching.pearls);
  out.teaching.mnemonics = asArray(out.teaching.mnemonics);

  out.panel_notes = asObject(out.panel_notes);

  // meta defaults
  out.meta = asObject(out.meta);
  out.meta.demographics = asObject(out.meta.demographics);

  return out;
}

/** POST /api/cases/generate  (mounted under /api in index.js) */
router.post("/cases/generate", async (req, res) => {
  try {
    const {
      topic,
      area = "",
      language = "en",
      region = "US",
      patient_constraints = {},
      // accept both names for robustness with older callers
      minutes_from_onset = null,
      onset_minutes_ago = null,
      must_include = [],
      model = process.env.GPT_MODEL || "gpt-4o-mini"
    } = req.body || {};

    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return res.status(400).json({ ok: false, error: "Missing or invalid 'topic'." });
    }

    const onsetMinutes = onset_minutes_ago ?? minutes_from_onset ?? null;

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: buildUserPrompt({
          topic,
          area,
          language,
          region,
          patient_constraints,
          onset_minutes_ago: onsetMinutes,
          must_include
        })
      }
    ];

    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages
    });

    const content = completion?.choices?.[0]?.message?.content || "{}";
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return res.status(502).json({
        ok: false,
        error: "Model returned non-JSON content.",
        preview: content.slice(0, 500)
      });
    }

    // normalize before returning
    const normalized = normalizeCase(parsed);

    return res.json({ ok: true, case: normalized });
  } catch (err) {
    console.error("[/api/cases/generate] Error:", err);
    return res.status(500).json({ ok: false, error: String(err).slice(0, 500) });
  }
});

export default router;
