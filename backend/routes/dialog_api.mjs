// ~/medplat/backend/routes/dialog_api.mjs
import express from "express";
import openai from "./openai_client.js"; // lazy client; no throw at import

console.log("✅ dialog_api.mjs LOADED (merged generator)");

// ---------------------------------------------------------------------
// Schema + Prompting
// ---------------------------------------------------------------------
const SCHEMA_HINT = `
Return ONE JSON object with exactly these top-level keys:
{
  "meta": {
    "topic": string,
    "language": string,            // ISO code like "en", "da", "ar"
    "region": string,              // e.g., "EU/DK", "US", "UK"
    "demographics": { "age": number, "sex": "male"|"female"|"unspecified" },
    "geography_of_living": string
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
    "vitals": object,              // { BP, HR, RR, Temp, Sat/SpO2, GCS, etc. }
    "orthostatics": object,        // {} or structured values
    "general": string,
    "cardiorespiratory": string,
    "hemodynamic_profile": string, // "warm & dry" | "warm & wet" | "cold & dry" | "cold & wet"
    "pain_distress": string
  },
  "paraclinical": {
    "labs": string[],
    "ecg": string,
    "imaging": [ { "modality": string, "timing": string, "rationale": string } ],
    "other_tests": string[],
    "test_kinetics": [ { "test": string, "timing_relation": string, "notes": string } ]
  },
  "differentials": [
    { "name": string, "status": "ACCEPTED"|"REJECTED"|"KEEP_OPEN", "why_for": string, "why_against": string }
  ],
  "red_flags": string[],
  "final_diagnosis": { "name": string, "rationale": string },
  "pathophysiology": { "mechanism": string, "systems_organs": string },
  "etiology": { "underlying_cause": string },
  "management": {
    "immediate": string[],
    "escalation_if_wrong_dx": string[],
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
  "teaching": {
    "pearls": string[],
    "mnemonics": string[]
  },
  "panel_notes": {
    "internal_medicine": string,
    "surgery": string,
    "emergency_medicine": string
  }
}
`.trim();

const SYSTEM_PROMPT = `
You are a senior clinical panel generating *complete* teaching cases.
CRITICAL:
- Output STRICT JSON only (no markdown fences, no prose).
- Fill EVERY field with realistic details. Never leave arrays empty.
- Use appropriate demographics for the topic.
- Use requested language code for content (keys remain in English as per schema).
- No URLs in guidelines; summarize in "note".
Schema to follow:
${SCHEMA_HINT}
`.trim();

function userJSONPrompt({
  area = "",
  topic = "",
  language = "en",
  region = "EU/DK",
  niveau = "",
  patient_constraints = {},
  minutes_from_onset = null,
  must_include = []
}) {
  const hints =
    Array.isArray(must_include) && must_include.length
      ? `\nMust-include directives (strictly honor each):\n- ${must_include.join("\n- ")}\n`
      : "";

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
${hints}
Global requirements:
- Demographics must be realistic for the topic (age/sex not random).
- Geography_of_living must be present (e.g., "urban, lives alone").
- Labs/imaging must be diagnostically relevant for ${topic}.
- Include red flags tailored to ${topic}.
- Avoid brand names if generic exists.
- No references as URLs; summarize guideline sources in "region_guidelines.note".
`.trim();
}

// ---------------------------------------------------------------------
// JSON utilities
// ---------------------------------------------------------------------
const stripFences = (s = "") =>
  String(s).trim()
    .replace(/^`{3,}(?:json)?\s*/i, "")
    .replace(/`{3,}\s*$/i, "")
    .replace(/^`+|`+$/g, "");

async function repairJson(badJsonText, model = "gpt-4o-mini") {
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "You output ONLY valid JSON. No commentary." },
      { role: "user", content: `Fix ONLY the formatting so the following becomes valid JSON. Output JSON only:\n\n${badJsonText}` }
    ],
    temperature: 0.0
  });
  return stripFences(completion?.choices?.[0]?.message?.content || "{}");
}

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v].filter(Boolean));
const normStr = (x, d = "") => (typeof x === "string" && x.trim() ? x.trim() : d);
const nonEmpty = (v) => (Array.isArray(v) ? v.length > 0 : !!v);
const s = (x) => (typeof x === "string" && x.trim() ? x.trim() : "");
const first = (...vals) => vals.find((v) => s(v)) || "";

// normalize language labels to ISO
function normalizeLang(language = "en") {
  const L = normStr(language).toLowerCase();
  const map = {
    english: "en", en: "en",
    dansk: "da", danish: "da", da: "da",
    deutsch: "de", german: "de", de: "de",
    french: "fr", fr: "fr",
    spanish: "es", es: "es",
    italian: "it", it: "it",
    arabic: "ar", ar: "ar",
    turkish: "tr", tr: "tr",
    urdu: "ur", ur: "ur",
    farsi: "fa", persian: "fa", fa: "fa"
  };
  return map[L] || "en";
}

// baseline normalizer (ensures keys exist, shapes OK)
function normalizeAndBaseline(obj = {}, ctx = {}) {
  const out = { ...obj };

  // ensure keys
  for (const k of [
    "meta","history","exam","paraclinical","differentials","red_flags",
    "final_diagnosis","pathophysiology","etiology","management",
    "disposition","evidence","teaching","panel_notes"
  ]) {
    if (!(k in out)) out[k] = (k === "differentials" || k === "red_flags") ? [] : {};
  }

  // meta
  out.meta = isObj(out.meta) ? out.meta : {};
  out.meta.topic = ctx.topic || out.meta.topic || "";
  out.meta.language = normalizeLang(out.meta.language || ctx.language || "en");
  out.meta.region = out.meta.region || ctx.region || "EU/DK";
  out.meta.demographics = isObj(out.meta.demographics) ? out.meta.demographics : {};
  if (typeof out.meta.demographics.age !== "number") out.meta.demographics.age = 60;
  if (!out.meta.demographics.sex) out.meta.demographics.sex = "unspecified";
  out.meta.geography_of_living = out.meta.geography_of_living || "urban, lives with family";

  // history
  out.history = isObj(out.history) ? out.history : {};
  out.history.presenting_complaint = normStr(out.history.presenting_complaint);
  out.history.onset_duration_severity = normStr(out.history.onset_duration_severity);
  out.history.context_triggers = normStr(out.history.context_triggers);
  out.history.post_event = normStr(out.history.post_event);
  out.history.past_medical_history = arr(out.history.past_medical_history);
  out.history.medications_current = arr(out.history.medications_current);
  out.history.allergies = arr(out.history.allergies);

  // exam
  out.exam = isObj(out.exam) ? out.exam : {};
  out.exam.vitals = isObj(out.exam.vitals) ? out.exam.vitals : {};
  out.exam.orthostatics = isObj(out.exam.orthostatics) ? out.exam.orthostatics : {};
  out.exam.general = normStr(out.exam.general);
  out.exam.cardiorespiratory = normStr(out.exam.cardiorespiratory);
  out.exam.hemodynamic_profile = out.exam.hemodynamic_profile || "warm & dry";
  out.exam.pain_distress = out.exam.pain_distress || "appears uncomfortable";

  // paraclinical
  out.paraclinical = isObj(out.paraclinical) ? out.paraclinical : {};
  out.paraclinical.labs = arr(out.paraclinical.labs);
  out.paraclinical.ecg = normStr(out.paraclinical.ecg);
  out.paraclinical.imaging = arr(out.paraclinical.imaging).map(x => ({
    modality: x?.modality || "",
    timing: x?.timing || "",
    rationale: x?.rationale || ""
  }));
  out.paraclinical.other_tests = arr(out.paraclinical.other_tests);
  out.paraclinical.test_kinetics = arr(out.paraclinical.test_kinetics).map(x => ({
    test: x?.test || "",
    timing_relation: x?.timing_relation || "",
    notes: x?.notes || ""
  }));

  // diffs, red flags
  out.differentials = arr(out.differentials).map(d => ({
    name: d?.name || "",
    status: d?.status || "KEEP_OPEN",
    why_for: d?.why_for || "",
    why_against: d?.why_against || ""
  }));
  out.red_flags = arr(out.red_flags);

  // management
  out.management = isObj(out.management) ? out.management : {};
  out.management.immediate = arr(out.management.immediate);
  out.management.escalation_if_wrong_dx = arr(out.management.escalation_if_wrong_dx);
  out.management.region_guidelines = arr(out.management.region_guidelines).map(g => ({
    society: g?.society || (out.meta.region.includes("EU") ? "ESO/ESC" : "AHA/ACC"),
    year: g?.year || "2021",
    applies_to: g?.applies_to || out.meta.topic || "",
    note: g?.note || "Regional consensus summary."
  }));
  out.management.timing_windows = arr(out.management.timing_windows).map(t => ({
    action: t?.action || "",
    window: t?.window || ""
  }));

  // disposition
  out.disposition = isObj(out.disposition) ? out.disposition : {};
  out.disposition.admit_vs_discharge = out.disposition.admit_vs_discharge || "Admit";
  out.disposition.unit = out.disposition.unit || "Appropriate specialty ward";
  out.disposition.follow_up = out.disposition.follow_up || "Arrange specialty follow-up";
  out.disposition.social_needs = out.disposition.social_needs || "Assess caregiver support and home safety";

  // evidence
  out.evidence = isObj(out.evidence) ? out.evidence : {};
  out.evidence.prevalence = normStr(out.evidence.prevalence);
  out.evidence.incidence = normStr(out.evidence.incidence);
  out.evidence.key_tests = arr(out.evidence.key_tests).map(t => ({
    test: t?.test || "",
    sensitivity: t?.sensitivity || "",
    specificity: t?.specificity || "",
    notes: t?.notes || ""
  }));
  out.evidence.prognosis = normStr(out.evidence.prognosis);

  // teaching
  out.teaching = isObj(out.teaching) ? out.teaching : {};
  out.teaching.pearls = arr(out.teaching.pearls);
  out.teaching.mnemonics = arr(out.teaching.mnemonics);

  // panel
  out.panel_notes = isObj(out.panel_notes) ? out.panel_notes : {};
  out.panel_notes.internal_medicine = normStr(out.panel_notes.internal_medicine, "—");
  out.panel_notes.surgery = normStr(out.panel_notes.surgery, "—");
  out.panel_notes.emergency_medicine = normStr(out.panel_notes.emergency_medicine, "—");

  return out;
}

// extra completeness fillers (topic-aware) -------------------------------
function ensureVitals(v = {}) {
  const vv = isObj(v) ? { ...v } : {};
  vv.HR = vv.HR ?? 104;
  vv.BP = vv.BP ?? "132/78";
  vv.RR = vv.RR ?? 20;
  vv.Sat = vv.Sat ?? "98% (RA)";
  vv.Temp = vv.Temp ?? 37.8;
  vv.GCS = vv.GCS ?? "15";
  return vv;
}

function topicFillers(topic = "") {
  const t = (topic || "").toLowerCase();

  // ✅ Appendicitis / acute abdomen
  if (
    t.includes("acute_abdomen") ||
    t.includes("acute abdomen") ||
    t.includes("appendicitis") ||
    t.includes("acute appendicitis")
  ) {
    return {
      presenting: "Acute abdominal pain localizing to the right lower quadrant, nausea, anorexia.",
      onset: "Sudden onset 12–18 hours ago, progressive, VAS 7–8/10.",
      context: "No trauma. Last meal 8h ago. No prior abdominal surgery.",
      pmh: ["Hypertension", "Hyperlipidemia"],
      meds: ["Amlodipine 5 mg daily", "Atorvastatin 20 mg nightly"],
      allergies: ["No known drug allergies"],
      exam: {
        general: "Uncomfortable, prefers to lie still.",
        cardiorespiratory: "Clear lungs, regular heart sounds.",
        hemodynamic_profile: "warm & dry",
        pain_distress: "guarding noted over RLQ",
        abdomen: "RLQ tenderness with rebound at McBurney point, positive Rovsing sign"
      },
      labs: [
        "CBC: WBC 14.2 ×10^9/L (neutrophil predominance), Hb 13.2 g/dL, Plt 250 ×10^9/L",
        "CRP 85 mg/L",
        "BMP: Na 138, K 3.8, Creatinine 1.1 mg/dL, Urea 8 mmol/L",
        "LFTs: AST 22, ALT 24, ALP 88, Bilirubin 0.9 mg/dL",
        "Lipase 22 U/L",
        "Urinalysis: negative nitrite/leuk est; no hematuria",
        "hCG: negative (if applicable)",
        "Lactate 1.8 mmol/L"
      ],
      imaging: [
        { modality: "Ultrasound abdomen", timing: "ED", rationale: "Evaluate RLQ, rule out biliary disease" },
        { modality: "CT abd/pelvis with IV contrast", timing: "First 2–4 h", rationale: "Appendiceal inflammation, fat stranding, no free air" }
      ],
      diffs: [
        { name: "Acute appendicitis", status: "ACCEPTED", why_for: "RLQ pain, WBC/CRP up, CT signs", why_against: "" },
        { name: "Cholecystitis", status: "REJECTED", why_for: "Nausea", why_against: "Pain RLQ not RUQ; no Murphy sign" },
        { name: "Small bowel obstruction", status: "KEEP_OPEN", why_for: "Abdominal pain", why_against: "No vomiting; no prior surgery" },
        { name: "Renal colic", status: "REJECTED", why_for: "Flank→groin pain can mimic", why_against: "UA negative for blood" }
      ],
      red_flags: [
        "Peritonitis or generalized guarding",
        "Sepsis (hypotension, tachycardia, fever)",
        "Elderly with atypical presentation",
        "Pregnancy with abdominal pain"
      ],
      finalDx: { name: "Acute appendicitis", rationale: "Consistent exam + labs + CT" },
      patho: { mechanism: "Luminal obstruction → bacterial overgrowth → inflammation.", systems_organs: "Appendix; may involve peritoneum if perforated." },
      etiology: { underlying_cause: "Fecalith or lymphoid hyperplasia (less commonly tumor)." },
      immediate: [
        "ABC; monitoring; analgesia and antiemetic",
        "NPO; IV access ×2; isotonic fluids",
        "Broad-spectrum antibiotics (per local protocol)",
        "CT abdomen/pelvis with contrast if not done",
        "Urgent surgical consult for appendectomy"
      ],
      escalation: ["If perforation/peritonitis: urgent OR; ICU if unstable."],
      timing: [
        { action: "Pre-incision antibiotics", window: "Before incision" },
        { action: "Appendectomy", window: "Within 12–24 h if stable; ASAP if complicated" }
      ],
      guidelines: [
        { society: "WSES", year: "2020", applies_to: "Acute appendicitis", note: "Antibiotics before appendectomy; early surgery; imaging for diagnosis." }
      ],
      teaching: {
        pearls: [
          "Analgesia does not mask peritoneal signs—treat pain.",
          "US first in young/pregnant; CT has highest accuracy otherwise."
        ],
        mnemonics: ["APPENDIX: Anorexia, Pain RLQ, Pyrexia, Elevated WBC, Nausea, Defense, Imaging, eXclude mimics"]
      },
      evidence: {
        key_tests: [
          { test: "CT abdomen (contrast)", sensitivity: "~94–98%", specificity: "~95–97%", notes: "High accuracy" },
          { test: "Ultrasound (graded compression)", sensitivity: "~75–90%", specificity: "~86–95%", notes: "Operator dependent" }
        ],
        prognosis: "Excellent with timely surgery."
      },
      panel: {
        internal_medicine: "Optimize fluids/comorbidities pre-op.",
        surgery: "Likely appendectomy; antibiotics per protocol.",
        emergency_medicine: "Early antibiotics and imaging; prompt surgical involvement."
      }
    };
  }

  // ✅ Acute ischemic stroke
  if (t.includes("stroke")) {
    return {
      presenting: "Sudden right-sided weakness and slurred speech; witnessed onset 45 minutes ago.",
      onset: "Abrupt onset; last-known-well 45 minutes prior to arrival; symptoms persistent.",
      context: "No head trauma. Not on anticoagulation. Vascular risk factors present.",
      pmh: ["Hypertension", "Type 2 diabetes mellitus", "Hyperlipidemia"],
      meds: ["Metformin 1 g BID", "Atorvastatin 40 mg nightly", "Perindopril 5 mg daily"],
      allergies: ["No known drug allergies"],
      exam: {
        general: "Alert but anxious; mild dysarthria.",
        cardiorespiratory: "Regular heart sounds; lungs clear.",
        hemodynamic_profile: "warm & dry",
        pain_distress: "appears uncomfortable",
        abdomen: "soft, non-tender"
      },
      labs: [
        "POC glucose 6.2 mmol/L (112 mg/dL)",
        "CBC: Hb 13.6 g/dL, WBC 8.2 ×10^9/L, Plt 230 ×10^9/L",
        "BMP: Na 140, K 4.1, Cr 1.0 mg/dL (88 µmol/L)",
        "PT/INR 1.0, aPTT normal",
        "Troponin normal"
      ],
      imaging: [
        { modality: "Non-contrast CT head", timing: "Within 20 minutes of arrival", rationale: "Exclude intracranial hemorrhage" },
        { modality: "CT angiography head & neck", timing: "Immediately after NCCT", rationale: "Identify large-vessel occlusion (LVO)" },
        { modality: "CT perfusion (or MR perfusion)", timing: "If onset unclear or extended window", rationale: "Core–penumbra mismatch assessment" }
      ],
      diffs: [
        { name: "Acute ischemic stroke", status: "ACCEPTED", why_for: "Focal deficit with sudden onset; CT excludes hemorrhage", why_against: "" },
        { name: "Intracerebral hemorrhage", status: "REJECTED", why_for: "Acute neuro deficit", why_against: "NCCT shows no bleed" },
        { name: "Stroke mimic (hypoglycemia, seizure, migraine)", status: "KEEP_OPEN", why_for: "Common mimics", why_against: "Glucose normal; no seizure" }
      ],
      red_flags: [
        "Airway compromise or rapidly decreasing GCS",
        "Severe hypertension with end-organ damage",
        "Anticoagulant use with coagulopathy",
        "Posterior circulation symptoms with risk of sudden deterioration"
      ],
      finalDx: { name: "Acute ischemic stroke", rationale: "Sudden focal deficits; imaging supports ischemia, not hemorrhage" },
      patho: { mechanism: "Thromboembolic occlusion → ischemia; penumbra at risk.", systems_organs: "CNS (cerebral vasculature)" },
      etiology: { underlying_cause: "Large-artery atherosclerosis vs cardioembolism (AF) vs small-vessel disease." },
      immediate: [
        "Airway and breathing; oxygen to keep SpO2 ≥94%",
        "IV access ×2; cardiac monitoring",
        "Check glucose and correct if <3.0 mmol/L (54 mg/dL)",
        "Activate stroke pathway; emergent NCCT ± CTA",
        "Consider IV thrombolysis if eligible (within 4.5 h)",
        "Consider endovascular thrombectomy for LVO (up to 6–24 h if eligible)",
        "BP management per protocol; avoid hypotension"
      ],
      escalation: [
        "If ICH identified: reverse anticoagulation, manage BP, neurosurgery consult",
        "Transfer to ICU/stroke unit if deterioration or post-thrombectomy care"
      ],
      timing: [
        { action: "Door-to-CT", window: "≤20 minutes" },
        { action: "Door-to-needle (IVT)", window: "≤60 minutes; onset ≤4.5 h" },
        { action: "Door-to-groin (EVT)", window: "ASAP; up to 6–24 h in select patients" }
      ],
      guidelines: [
        { society: "ESO/ESMINT", year: "2021", applies_to: "Acute ischemic stroke", note: "IVT within 4.5 h; EVT for LVO up to 24 h in selected cases." }
      ],
      teaching: {
        pearls: [
          "Time is brain—minimize door-to-needle and door-to-groin times.",
          "Check glucose early; treat hypoglycemia before labeling stroke mimic."
        ],
        mnemonics: ["FAST: Face, Arm, Speech, Time"]
      },
      evidence: {
        key_tests: [
          { test: "Non-contrast CT head", sensitivity: "High for hemorrhage", specificity: "High for hemorrhage", notes: "Rule-out bleed before IVT" },
          { test: "CT angiography", sensitivity: "High for LVO", specificity: "High", notes: "Guides EVT decisions" }
        ],
        prognosis: "Improved outcomes with rapid reperfusion; risk stratified by NIHSS and reperfusion success."
      },
      panel: {
        internal_medicine: "Risk-factor control; antithrombotic planning post-acute phase.",
        surgery: "Neurointerventional radiology for EVT; neurosurgery if hemorrhagic transformation.",
        emergency_medicine: "Door-to-CT/needle coordination; stabilization."
      }
    };
  }

  // ✅ Anaphylaxis
  if (t.includes("anaphylaxis") || t.includes("anaphylactic")) {
    return {
      presenting: "Acute generalized urticaria, wheeze, and dizziness after likely allergen exposure.",
      onset: "Rapid (minutes) after ingestion of a suspected trigger; progressive.",
      context: "No prior intubations. History of seasonal allergies. No beta-blocker use.",
      pmh: ["Allergic rhinitis"],
      meds: ["Cetirizine 10 mg PRN"],
      allergies: ["Peanuts (suspected)"],
      exam: {
        general: "Anxious, speaking in short phrases.",
        cardiorespiratory: "Diffuse expiratory wheeze; mild stridor.",
        hemodynamic_profile: "warm & wet",
        pain_distress: "moderate distress",
        abdomen: "soft; no tenderness"
      },
      labs: [
        "POC glucose normal",
        "CBC, BMP baseline",
        "Serum tryptase (1–4 h after onset) for confirmation"
      ],
      imaging: [
        { modality: "None routinely required", timing: "ED", rationale: "Clinical diagnosis" }
      ],
      diffs: [
        { name: "Anaphylaxis", status: "ACCEPTED", why_for: "Multi-system involvement after exposure (skin + respiratory ± hypotension)", why_against: "" },
        { name: "Asthma exacerbation", status: "KEEP_OPEN", why_for: "Wheeze", why_against: "Urticaria and hypotension suggest anaphylaxis" },
        { name: "Vasovagal syncope", status: "REJECTED", why_for: "Dizziness", why_against: "Cutaneous signs + wheeze + response to epinephrine" }
      ],
      red_flags: [
        "Hypotension or syncope",
        "Airway edema/stridor",
        "History of severe/biphasic reaction",
        "Beta-blocker use (poor response to epinephrine)"
      ],
      finalDx: { name: "Anaphylaxis", rationale: "Acute multi-system reaction consistent with exposures" },
      patho: { mechanism: "IgE-mediated mast cell/basophil degranulation; massive mediator release.", systems_organs: "Skin, respiratory, cardiovascular, GI" },
      etiology: { underlying_cause: "Food allergy (nuts), insect stings, medications, latex." },
      immediate: [
        "IM epinephrine 0.3–0.5 mg (1:1000) lateral thigh; repeat every 5–15 min as needed",
        "High-flow oxygen; airway positioning; prepare for difficult airway",
        "Large-bore IV access; rapid isotonic fluids (10–20 mL/kg boluses)",
        "Adjuncts: H1/H2 antihistamines, corticosteroids (prevent biphasic), inhaled beta-agonists for bronchospasm",
        "Observe minimum 4–6 h (longer if severe or high risk)",
        "Prescribe auto-injector and education on avoidance on discharge"
      ],
      escalation: [
        "Refractory shock: start epinephrine infusion; consider glucagon if on beta-blockers",
        "Impending airway compromise: early intubation; call ICU/ENT"
      ],
      timing: [
        { action: "First epinephrine dose", window: "Immediately on recognition" },
        { action: "Observation", window: "≥4–6 h (24 h if severe/biphasic risk)" }
      ],
      guidelines: [
        { society: "EAACI", year: "2021", applies_to: "Anaphylaxis management", note: "IM epinephrine first-line; observe for biphasic reactions." },
        { society: "WAO", year: "2020", applies_to: "Anaphylaxis", note: "Airway, epinephrine, fluids; discharge with auto-injector." }
      ],
      teaching: {
        pearls: [
          "Epinephrine is first-line—do not delay for antihistamines or steroids.",
          "Most biphasic reactions occur within 8–12 h—consider prolonged observation when severe."
        ],
        mnemonics: ["AIRWAY-EPINEPHRINE-FLUIDS (AEF)"]
      },
      evidence: {
        key_tests: [
          { test: "Serum tryptase", sensitivity: "Moderate", specificity: "High when elevated", notes: "Best 1–4 h after onset; normal does not exclude" }
        ],
        prognosis: "Excellent with prompt epinephrine; risk with delayed treatment or comorbid asthma."
      },
      panel: {
        internal_medicine: "Trigger evaluation; comorbidity optimization.",
        surgery: "Not applicable unless airway intervention needed.",
        emergency_medicine: "Immediate epinephrine and airway-first approach."
      }
    };
  }

  // 🔁 Generic baseline (fallback)
  return {
    presenting: "Acute symptoms prompting ED evaluation.",
    onset: "Hours to days; moderate to severe intensity.",
    context: "No trauma reported.",
    pmh: ["Hypertension"],
    meds: ["Amlodipine 5 mg daily"],
    allergies: ["No known drug allergies"],
    exam: {
      general: "Alert, oriented.",
      cardiorespiratory: "Normal heart sounds, clear lungs.",
      hemodynamic_profile: "warm & dry",
      pain_distress: "mild distress",
      abdomen: "soft, localized tenderness"
    },
    labs: ["CBC: mild leukocytosis", "CRP elevated", "BMP near baseline", "Urinalysis unremarkable"],
    imaging: [
      { modality: "Ultrasound", timing: "ED", rationale: "First-line assessment" },
      { modality: "CT as indicated", timing: "ED", rationale: "Define pathology if unclear" }
    ],
    diffs: [
      { name: "Primary topic-related diagnosis", status: "KEEP_OPEN", why_for: "Matches presentation", why_against: "" },
      { name: "Important alternative 1", status: "KEEP_OPEN", why_for: "", why_against: "" }
    ],
    red_flags: ["Rapid deterioration", "Hemodynamic instability"],
    finalDx: { name: normStr(topic), rationale: "Working diagnosis" },
    patho: { mechanism: "Pathophysiology consistent with presentation.", systems_organs: "Relevant organ(s)." },
    etiology: { underlying_cause: "Common causes for this condition." },
    immediate: ["ABC; monitoring", "IV access; fluids", "Analgesia/antiemetic", "Screening labs & targeted imaging", "Consult appropriate specialty"],
    escalation: ["Escalate/ICU if unstable or deterioration."],
    timing: [
      { action: "Initial assessment", window: "Immediately on arrival" }
    ],
    guidelines: [
      { society: "Generic", year: "2021", applies_to: "Acute care", note: "Standard ED stabilization and workup." }
    ],
    teaching: { pearls: ["Early targeted testing improves outcomes."], mnemonics: [] },
    evidence: { key_tests: [], prognosis: "" },
    panel: { internal_medicine: "Stabilize comorbidities.", surgery: "Consult if operative pathology suspected.", emergency_medicine: "Initiate diagnostics & early therapy." }
  };
}

function ensureCaseCompleteness(unified, { topic, language, region }) {
  const u = normalizeAndBaseline(unified, { topic, language, region });
  const tfill = topicFillers(u?.meta?.topic || "");

  // history
  if (!nonEmpty(u.history.presenting_complaint)) u.history.presenting_complaint = tfill.presenting;
  if (!nonEmpty(u.history.onset_duration_severity)) u.history.onset_duration_severity = tfill.onset;
  if (!nonEmpty(u.history.context_triggers)) u.history.context_triggers = tfill.context;
  if (!nonEmpty(u.history.past_medical_history)) u.history.past_medical_history = arr(tfill.pmh);
  if (!nonEmpty(u.history.medications_current)) u.history.medications_current = arr(tfill.meds);
  if (!nonEmpty(u.history.allergies)) u.history.allergies = arr(tfill.allergies);

  // exam
  u.exam.vitals = ensureVitals(u.exam.vitals);
  if (!nonEmpty(u.exam.general)) u.exam.general = tfill.exam?.general || "Alert, oriented.";
  if (!nonEmpty(u.exam.cardiorespiratory)) u.exam.cardiorespiratory = tfill.exam?.cardiorespiratory || "Normal heart sounds, clear lungs.";
  u.exam.hemodynamic_profile = u.exam.hemodynamic_profile || tfill.exam?.hemodynamic_profile || "warm & dry";
  u.exam.pain_distress = u.exam.pain_distress || tfill.exam?.pain_distress || "mild distress";
  if (!nonEmpty(u.exam.abdomen)) u.exam.abdomen = tfill.exam?.abdomen || "soft, localized tenderness";

  // paraclinical
  if (!nonEmpty(u.paraclinical.labs)) u.paraclinical.labs = arr(tfill.labs);
  if (!nonEmpty(u.paraclinical.imaging)) u.paraclinical.imaging = arr(tfill.imaging);
  if (!nonEmpty(u.paraclinical.test_kinetics)) {
    // provide a generic kinetics scaffold (topic-agnostic, harmless if not applicable)
    u.paraclinical.test_kinetics = [
      { test: "Key biomarker (if applicable)", timing_relation: "Baseline (0 h)", notes: "Obtain at presentation" },
      { test: "Key biomarker (if applicable)", timing_relation: "Repeat at 3–6 h", notes: "Trend for kinetics" }
    ];
  }

  // diffs, red flags, final dx
  if (!nonEmpty(u.differentials)) u.differentials = arr(tfill.diffs);
  if (!nonEmpty(u.red_flags)) u.red_flags = arr(tfill.red_flags || ["Clinical deterioration", "Hemodynamic instability"]);

  if (!isObj(u.final_diagnosis)) u.final_diagnosis = {};
  if (!nonEmpty(u.final_diagnosis.name)) u.final_diagnosis.name = tfill.finalDx.name;
  if (!nonEmpty(u.final_diagnosis.rationale)) u.final_diagnosis.rationale = tfill.finalDx.rationale;

  // patho/etiology
  if (!isObj(u.pathophysiology)) u.pathophysiology = {};
  if (!nonEmpty(u.pathophysiology.mechanism)) u.pathophysiology.mechanism = tfill.patho.mechanism;
  if (!nonEmpty(u.pathophysiology.systems_organs)) u.pathophysiology.systems_organs = tfill.patho.systems_organs;

  if (!isObj(u.etiology)) u.etiology = {};
  if (!nonEmpty(u.etiology.underlying_cause)) u.etiology.underlying_cause = tfill.etiology.underlying_cause;

  // management
  if (!isObj(u.management)) u.management = {};
  if (!nonEmpty(u.management.immediate)) u.management.immediate = arr(tfill.immediate);
  if (!nonEmpty(u.management.escalation_if_wrong_dx)) u.management.escalation_if_wrong_dx = arr(tfill.escalation);

  // timing windows as objects per schema
  if (!nonEmpty(u.management.timing_windows)) {
    u.management.timing_windows = arr(tfill.timing);
  } else {
    u.management.timing_windows = u.management.timing_windows.map((tw) => {
      if (typeof tw === "string") return { action: tw, window: "" };
      return { action: tw?.action || "", window: tw?.window || "" };
    });
  }

  // region guidelines
  if (!nonEmpty(u.management.region_guidelines)) {
    const defaultGuidelines = tfill.guidelines || [
      {
        society: region.includes("EU") ? "ESO/ESC" : "AHA/ACC",
        year: "2021",
        applies_to: u.meta.topic || "",
        note: "Regional consensus summary."
      }
    ];
    u.management.region_guidelines = defaultGuidelines;
  }

  // disposition
  if (!isObj(u.disposition)) u.disposition = {};
  if (!nonEmpty(u.disposition.admit_vs_discharge)) u.disposition.admit_vs_discharge = tfill.disposition?.admit_vs_discharge || "Admit";
  if (!nonEmpty(u.disposition.unit)) u.disposition.unit = tfill.disposition?.unit || "Appropriate ward";
  if (!nonEmpty(u.disposition.follow_up)) u.disposition.follow_up = tfill.disposition?.follow_up || "Clinic follow-up";
  if (!nonEmpty(u.disposition.social_needs)) u.disposition.social_needs = tfill.disposition?.social_needs || "Assess supports/safety";

  // evidence & teaching
  if (!isObj(u.evidence)) u.evidence = {};
  if (!nonEmpty(u.evidence.key_tests)) u.evidence.key_tests = arr(tfill.evidence.key_tests || [{ test: "Key diagnostic test", sensitivity: "", specificity: "", notes: "" }]);
  if (!nonEmpty(u.evidence.prognosis)) u.evidence.prognosis = tfill.evidence.prognosis || "Prognosis depends on timely diagnosis and treatment.";

  if (!isObj(u.teaching)) u.teaching = {};
  if (!nonEmpty(u.teaching.pearls)) u.teaching.pearls = arr(tfill.teaching.pearls || ["Recognize time-sensitive red flags."]);
  if (!nonEmpty(u.teaching.mnemonics)) u.teaching.mnemonics = arr(tfill.teaching.mnemonics || []);

  // panel
  if (!isObj(u.panel_notes)) u.panel_notes = {};
  u.panel_notes.internal_medicine ||= tfill.panel.internal_medicine;
  u.panel_notes.surgery ||= tfill.panel.surgery;
  u.panel_notes.emergency_medicine ||= tfill.panel.emergency_medicine;

  return u;
}

// legacy sections for older readers ------------------------------------
function buildLegacySections(unified) {
  const u = unified || {};
  const history = u.history || {};
  const exam = u.exam || {};
  const para = u.paraclinical || {};
  const diffs = Array.isArray(u.differentials) ? u.differentials : [];
  const refs = Array.isArray((u.management || {}).region_guidelines) ? u.management.region_guidelines : [];

  const I_PatientHistory = {
    presenting_complaint: history.presenting_complaint || "",
    onset_duration_severity: history.onset_duration_severity || "",
    context_triggers: history.context_triggers || "",
    post_event_details: history.post_event || "",
    past_medical_history: (history.past_medical_history || []).join("; "),
    medications_allergies: `Meds: ${(history.medications_current || []).join(", ")}; Allergies: ${(history.allergies || []).join(", ")}`
  };

  const II_ObjectiveFindings = {
    vitals: JSON.stringify(exam.vitals || {}),
    orthostatic_vitals: JSON.stringify(exam.orthostatics || {}),
    physical_exam: [
      exam.general ? `General: ${exam.general}` : "",
      exam.cardiorespiratory ? `Cardiorespiratory: ${exam.cardiorespiratory}` : "",
      exam.abdomen ? `Abdomen: ${exam.abdomen}` : "",
      exam.hemodynamic_profile ? `Hemodynamic: ${exam.hemodynamic_profile}` : "",
      exam.pain_distress ? `Pain/Distress: ${exam.pain_distress}` : ""
    ].filter(Boolean).join(" | "),
    risk_factors: (u.meta?.topic ? `Topic: ${u.meta.topic}. ` : "") + (history.past_medical_history || []).join(", "),
    exposures: "",
    family_disposition: ""
  };

  const III_ParaclinicalInvestigations = {
    labs: (para.labs || []).join("; "),
    ecg: para.ecg || "",
    imaging: (para.imaging || []).map(i => {
      if (isObj(i)) return `${i.modality}${i.timing ? " — " + i.timing : ""}${i.rationale ? " — " + i.rationale : ""}`;
      return String(i || "");
    }).join(" | "),
    other_tests: (para.other_tests || []).join("; ")
  };

  const IV_DifferentialDiagnoses = {
    list: diffs.map(d => {
      const n = isObj(d) ? d.name : String(d || "");
      const st = isObj(d) ? d.status : "";
      return st ? `${n} [${st}]` : n;
    }),
    red_flags: Array.isArray(u.red_flags) ? u.red_flags : []
  };

  const V_FinalDiagnosis = {
    diagnosis: u.final_diagnosis?.name || "",
    criteria_or_rationale: u.final_diagnosis?.rationale || ""
  };

  const VI_Pathophysiology = {
    mechanism: u.pathophysiology?.mechanism || "",
    systems_or_organs: u.pathophysiology?.systems_organs || ""
  };

  const VIb_Etiology = {
    underlying_cause: u.etiology?.underlying_cause || ""
  };

  const VII_ConclusionAndDiscussion = {
    summary: `Diagnosis: ${u.final_diagnosis?.name || ""}. ${u.final_diagnosis?.rationale || ""}`,
    treatment_principles: (u.management?.immediate || []).map(s => ({ title: (String(s).split(":")[0] || "Step").slice(0, 40), details: String(s) })),
    immediate_management: (u.management?.immediate || []).join(" | "),
    discharge_vs_admit_criteria: u.disposition?.admit_vs_discharge || "",
    disposition_and_followup: `Unit: ${u.disposition?.unit || ""}; Follow-up: ${u.disposition?.follow_up || ""}; Social: ${u.disposition?.social_needs || ""}`,
    references: refs.map(r => {
      if (isObj(r)) {
        const parts = [r.society, r.year, r.applies_to, r.note].filter(Boolean);
        return parts.join(" — ");
      }
      return String(r || "");
    })
  };

  const VIII_EvidenceAndStatistics = {
    prevalence: u.evidence?.prevalence || "",
    incidence: u.evidence?.incidence || "",
    key_test_performance: (u.evidence?.key_tests || []).map(t => ({
      test: t.test || "",
      sensitivity: t.sensitivity || "",
      specificity: t.specificity || "",
      notes: t.notes || ""
    })),
    prognosis: u.evidence?.prognosis || "",
    biphasic_reaction_rate: "",
    recommended_observation_time: ""
  };

  const TeachingAndGamification = {
    clinical_reasoning_notes: (u.teaching?.pearls || []).join(" | "),
    mnemonics_or_pearls: u.teaching?.mnemonics || [],
    next_step_prompts: []
  };

  return {
    I_PatientHistory,
    II_ObjectiveFindings,
    III_ParaclinicalInvestigations,
    IV_DifferentialDiagnoses,
    V_FinalDiagnosis,
    VI_Pathophysiology,
    VIb_Etiology,
    VII_ConclusionAndDiscussion,
    VIII_EvidenceAndStatistics,
    TeachingAndGamification
  };
}

// simple text formatter used by UI preview (optional)
function formatCaseToText(obj = {}) {
  try {
    const h = obj.history || {};
    const ex = obj.exam || {};
    const fd = obj.final_diagnosis || {};
    const hL = obj["I_PatientHistory"] || {};
    const exL = obj["II_ObjectiveFindings"] || {};
    const fdL = obj["V_FinalDiagnosis"] || {};

    const presenting = first(h.presenting_complaint, hL.presenting_complaint);
    const onset = first(h.onset_duration_severity, hL.onset_duration_severity);
    const hemo = first(ex.hemodynamic_profile, exL.hemodynamic_profile);
    const pain = first(ex.pain_distress, exL.pain_distress);
    const finalDx = first(fd.name, fdL.diagnosis);

    return [
      "I. Patient History",
      `Presenting Complaint: ${presenting}`,
      `Onset/Duration/Severity: ${onset}`,
      "",
      "II. Objective Clinical Findings",
      `Hemodynamic: ${hemo}; Pain: ${pain}`,
      "",
      "V. Final Diagnosis",
      finalDx
    ].join("\n");
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------
// Core generator (merged): OpenAI → repair → baseline → completeness
// ---------------------------------------------------------------------
async function generateCaseJSON({
  area,
  topic,
  language = "en",
  region = "EU/DK",
  niveau = "",
  model = "gpt-4o-mini",
  patient_constraints = {},
  minutes_from_onset = null,
  must_include = []
}) {
  if (typeof topic === "object" && topic?.topic) topic = topic.topic;
  if (typeof topic !== "string" || !topic.trim()) throw new Error("Invalid topic");

  let raw = "{}";
  try {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userJSONPrompt({ area, topic, language, region, niveau, patient_constraints, minutes_from_onset, must_include }) }
      ],
      temperature: 0.4
    });
    raw = completion?.choices?.[0]?.message?.content || "{}";
  } catch {
    raw = "{}";
  }

  // parse or repair
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    const repaired = await repairJson(raw, model);
    data = JSON.parse(repaired);
  }

  // baseline + completeness (topic-aware)
  const baseline = normalizeAndBaseline(data, { topic, language, region });
  const enriched = ensureCaseCompleteness(baseline, { topic, language, region });

  // Add legacy sections for compatibility
  const legacy = buildLegacySections(enriched);

  // return hybrid
  return {
    ...enriched,
    ...legacy,
    meta: {
      ...(enriched.meta || {}),
      medical_area: area,
      niveau,
      language: enriched.meta?.language || normalizeLang(language),
      keywords: Array.isArray(enriched.meta?.keywords) ? enriched.meta.keywords : []
    }
  };
}

// ---------------------------------------------------------------------
// Express Router
// ---------------------------------------------------------------------
const router = express.Router();

router.get("/", (_req, res) =>
  res.json({
    ok: true,
    usage: [
      "POST /api/dialog",
      "POST /api/cases/generate"
    ],
    note: "Both endpoints accept: { area, topic, language, region, niveau, model, patient_constraints, minutes_from_onset | onset_minutes_ago, must_include }"
  })
);

router.get("/healthz", (_req, res) => res.status(200).send("ok"));

async function handleDialog(req, res) {
  try {
    const body = req.body || {};
    const {
      area,
      topic,
      language = "en",
      region = "EU/DK",
      niveau = "",
      model = "gpt-4o-mini",
      patient_constraints = {},
      must_include = []
    } = body;

    // Support both minutes_from_onset and onset_minutes_ago
    const minutes_from_onset =
      body.minutes_from_onset != null
        ? body.minutes_from_onset
        : (body.onset_minutes_ago != null ? body.onset_minutes_ago : null);

    if (!area || !topic) {
      return res.status(400).json({ ok: false, error: "Missing area/topic" });
    }

    const unified = await generateCaseJSON({
      area, topic, language, region, niveau, model, patient_constraints, minutes_from_onset, must_include
    });

    const aiReply = JSON.stringify(unified);
    const text = formatCaseToText(unified);

    return res.status(200).json({ ok: true, case: unified, aiReply, text });
  } catch (err) {
    console.error("❌ /api/dialog error:", err);
    return res.status(500).json({ ok: false, error: err?.message || "Server error" });
  }
}

// Support both mount styles and both paths:
// app.use("/api/dialog", router)  → POST /api/dialog
router.post("/", handleDialog);
// app.use("/api", router)         → POST /api/dialog
router.post("/dialog", handleDialog);
// app.use("/api", router)         → POST /api/cases/generate
router.post("/cases/generate", handleDialog);

export default router;
export { generateCaseJSON };
