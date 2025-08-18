// ~/medplat/backend/generate_case_clinical.mjs
/**
 * Wrapper around the JSON generator that:
 * 1) Calls generateCaseJSON (unified schema from generate_case_openai.mjs)
 * 2) Normalizes & fills gaps with realistic defaults (topic-aware)
 * 3) Adds legacy I_*, II_* … sections for backward compatibility
 * 4) Returns the hybrid payload used by routes/dialog_api.mjs
 */

import { generateCaseJSON } from "./generate_case_openai.mjs";

/* ------------------------------ helpers ------------------------------ */

const normStr = (x, d = "") => (typeof x === "string" && x.trim() ? x.trim() : d);
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v].filter(Boolean));
const nonEmpty = (v) => (Array.isArray(v) ? v.length > 0 : !!v);

/** Map common language labels → ISO code (best-effort; extend as needed) */
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
    farsi: "fa", persian: "fa", fa: "fa",
  };
  return map[L] || "en";
}

/** Ensure vitals have realistic defaults */
function ensureVitals(v = {}) {
  const vv = isObj(v) ? { ...v } : {};
  vv.HR = vv.HR ?? 98;
  vv.BP = vv.BP ?? "132/78";
  vv.RR = vv.RR ?? 18;
  vv.Sat = vv.Sat ?? "97% (RA)";
  vv.Temp = vv.Temp ?? 37.2;
  vv.GCS = vv.GCS ?? "15";
  return vv;
}

/** Normalize timing windows into objects */
function ensureTimingWindows(list) {
  const items = arr(list);
  return items.map((t) => {
    if (isObj(t)) {
      return {
        action: normStr(t.action),
        window: normStr(t.window),
      };
    }
    const s = String(t || "");
    // naive split on dash/em dash/colon
    const m = s.split(/[-–—:]/);
    const action = normStr(m[0] || s);
    const window = normStr(m.slice(1).join(" ").trim());
    return { action, window };
  });
}

/** Normalize region guidelines into objects */
function ensureGuidelines(list, fallback = { society: "ESO/ESC", year: "2021" }) {
  return arr(list).map((g) => {
    if (isObj(g)) {
      return {
        society: normStr(g.society) || fallback.society,
        year: normStr(g.year) || fallback.year,
        applies_to: normStr(g.applies_to),
        note: normStr(g.note) || "Regional consensus; summarized (no URLs).",
      };
    }
    return {
      society: fallback.society,
      year: fallback.year,
      applies_to: "",
      note: String(g || "Regional consensus; summarized (no URLs)."),
    };
  });
}

/* ---------------------- topic-aware smart fillers --------------------- */
/**
 * Minimal topic-aware defaults. Extend over time.
 */
function topicFillers(topic = "") {
  const t = (topic || "").toLowerCase();

  // Acute abdomen / appendicitis family
  if (t.includes("appendicitis") || t.includes("acute abdomen")) {
    return {
      presenting: "Acute abdominal pain localizing to the right lower quadrant, nausea, anorexia.",
      onset: "Sudden onset 12–18 hours ago, progressive, VAS 7–8/10.",
      context: "No trauma. Last meal 8h ago. No prior abdominal surgery.",
      post_event: "",
      pmh: ["Hypertension", "Hyperlipidemia"],
      meds: ["Amlodipine 5 mg daily", "Atorvastatin 20 mg nightly"],
      allergies: ["No known drug allergies"],
      exam: {
        general: "Uncomfortable, prefers to lie still.",
        cardiorespiratory: "Clear lungs, regular heart sounds.",
        hemodynamic_profile: "warm & dry",
        pain_distress: "guarding noted over RLQ",
        abdomen: "RLQ tenderness with rebound at McBurney point; positive Rovsing sign",
      },
      labs: [
        "CBC: WBC 14.2 ×10^9/L (neutrophils), Hb 13.2 g/dL, Plt 250 ×10^9/L",
        "CRP 85 mg/L",
        "BMP: Na 138, K 3.8, Creatinine 1.1 mg/dL, Urea 8 mmol/L",
        "LFTs: AST 22, ALT 24, ALP 88, Bilirubin 0.9 mg/dL",
        "Lipase 22 U/L",
        "Urinalysis: negative nitrite/leuk est; no hematuria",
        "hCG: negative (if applicable)",
        "Lactate 1.8 mmol/L",
      ],
      imaging: [
        { modality: "Ultrasound abdomen", timing: "ED", rationale: "Evaluate RLQ; rule out biliary disease" },
        { modality: "CT abd/pelvis with IV contrast", timing: "first 2–4 h", rationale: "Appendiceal inflammation; fat stranding; no free air" },
      ],
      diffs: [
        { name: "Acute appendicitis", status: "ACCEPTED", why_for: "RLQ pain, fever/inflammation, imaging", why_against: "" },
        { name: "Cholecystitis", status: "REJECTED", why_for: "Nausea", why_against: "Pain RLQ not RUQ; negative Murphy" },
        { name: "Small bowel obstruction", status: "KEEP_OPEN", why_for: "Abdominal pain", why_against: "No vomiting; no prior surgery" },
        { name: "Renal colic", status: "REJECTED", why_for: "Flank pain can mimic", why_against: "UA negative for blood" },
      ],
      finalDx: { name: "Acute appendicitis", rationale: "RLQ signs + inflammatory markers + CT findings" },
      patho: { mechanism: "Luminal obstruction → bacterial overgrowth → inflammation/ischemia.", systems_organs: "Appendix; peritoneum if perforation." },
      etiology: { underlying_cause: "Fecalith or lymphoid hyperplasia; less commonly neoplasm." },
      immediate: [
        "Airway/Breathing/Circulation; continuous monitoring",
        "NPO; IV access ×2; isotonic fluids",
        "Analgesia and antiemetic",
        "Broad-spectrum antibiotics covering gut flora (per local protocol)",
        "CT A/P with contrast if not already performed",
        "Early surgical consult for appendectomy",
      ],
      escalation: [
        "If perforation/peritonitis suspected: urgent OR; resuscitation; antibiotics; consider ICU if unstable",
      ],
      timing: [
        "Antibiotics before incision",
        "Appendectomy within 12–24 h if uncomplicated; earlier if complicated",
      ],
      disposition: {
        admit_vs_discharge: "Admit",
        unit: "Surgical ward (acute surgery unit)",
        follow_up: "Post-op review 7–10 days; wound check",
        social_needs: "Assess caregiver support and home safety; postop instructions",
      },
      teaching: {
        pearls: [
          "Analgesia does not mask peritoneal signs—treat pain early.",
          "Use ultrasound first in young/pregnant; CT has highest accuracy otherwise.",
        ],
        mnemonics: ["APPENDIX: Anorexia, Pain RLQ, Pyrexia, Elevated WBC, Nausea, Defense, Imaging, eXclude mimics"],
      },
      evidence: {
        key_tests: [
          { test: "CT abdomen (contrast)", sensitivity: "~94–98%", specificity: "~95–97%", notes: "High diagnostic accuracy" },
          { test: "Graded compression US", sensitivity: "~75–90%", specificity: "~86–95%", notes: "Operator dependent" },
        ],
        prognosis: "Excellent with timely appendectomy; risk rises with perforation.",
      },
      red_flags: ["Peritonitis", "Sepsis physiology", "Free air on imaging"],
      panel: {
        internal_medicine: "Stabilize, fluids, correct electrolytes; manage comorbidities.",
        surgery: "Appendectomy (laparoscopic preferred) ± drains if complicated.",
        emergency_medicine: "Early antibiotics and surgical involvement; re-assess frequently.",
      },
    };
  }

  // Acute ischemic stroke family
  if (t.includes("stroke") || t.includes("cva")) {
    return {
      presenting: "Sudden-onset unilateral weakness and facial droop; speech difficulty noted by spouse.",
      onset: "Symptom onset 65 minutes ago; rapidly recognized; NIHSS 8.",
      context: "No head trauma. Not on anticoagulation. Last known well 70 minutes ago.",
      post_event: "No seizure activity; no postictal confusion.",
      pmh: ["Hypertension", "Type 2 diabetes"],
      meds: ["Metformin 1 g bid", "Amlodipine 5 mg qd"],
      allergies: ["No known drug allergies"],
      exam: {
        general: "Alert, mildly dysarthric.",
        cardiorespiratory: "Regular heart sounds; lungs clear.",
        hemodynamic_profile: "warm & dry",
        pain_distress: "appears concerned but cooperative",
        neuro: "Right facial droop, right arm drift, mild aphasia; NIHSS 8",
      },
      labs: [
        "Glucose 8.2 mmol/L",
        "CBC: Hb 13.8 g/dL; Plt 230 ×10^9/L",
        "PT/INR 1.0; aPTT 30 s",
        "Creatinine 89 µmol/L",
      ],
      imaging: [
        { modality: "Non-contrast head CT", timing: "on arrival", rationale: "Exclude hemorrhage" },
        { modality: "CT angiography head/neck", timing: "immediate", rationale: "Identify LVO for thrombectomy" },
      ],
      diffs: [
        { name: "Acute ischemic stroke", status: "ACCEPTED", why_for: "Sudden focal deficits; CT neg for bleed", why_against: "" },
        { name: "Intracerebral hemorrhage", status: "REJECTED", why_for: "Acute neuro deficit", why_against: "CT negative for hemorrhage" },
        { name: "Seizure with Todd paralysis", status: "KEEP_OPEN", why_for: "Focal weakness can follow seizure", why_against: "No witnessed seizure/postictal state" },
        { name: "Hypoglycemia", status: "REJECTED", why_for: "Can mimic stroke", why_against: "Glucose normal" },
      ],
      finalDx: { name: "Acute ischemic stroke", rationale: "Classic presentation within window; imaging supports" },
      patho: { mechanism: "Thromboembolic occlusion causing focal brain ischemia.", systems_organs: "Cerebrovascular system; cortical regions per vascular territory." },
      etiology: { underlying_cause: "Large-artery atherosclerosis vs. cardioembolism; risk factors HTN/DM." },
      immediate: [
        "Stroke code activation; airway protection if needed; target SpO2 ≥94%",
        "Blood glucose control; permissive hypertension if candidate",
        "Non-contrast CT ± CTA rapidly",
        "Consider IV thrombolysis per local protocol (e.g., alteplase/tenecteplase) within time window",
        "If LVO: consult neurointerventional for thrombectomy",
      ],
      escalation: [
        "Declining mental status or airway compromise → intubation/ICU",
        "Malignant MCA syndrome risk → neurosurgical review",
      ],
      timing: [
        "Door-to-CT ≤20 min; door-to-needle ≤60 min if eligible",
        "Thrombectomy window per imaging and local criteria (e.g., up to 24 h for selected)",
      ],
      disposition: {
        admit_vs_discharge: "Admit",
        unit: "Stroke unit/ICU depending on severity",
        follow_up: "Early rehab; risk-factor optimization; secondary prevention",
        social_needs: "Assess home support, swallowing safety, and rehab needs",
      },
      teaching: {
        pearls: [
          "Time is brain: parallel workflows for imaging and labs.",
          "Rule out mimics quickly (hypoglycemia, seizure, migraine).",
        ],
        mnemonics: ["FAST: Face, Arm, Speech, Time"],
      },
      evidence: {
        key_tests: [
          { test: "NCCT for hemorrhage", sensitivity: "High for acute bleed", specificity: "High", notes: "Exclusion test before lysis" },
          { test: "CTA for LVO", sensitivity: "High", specificity: "High", notes: "Guides thrombectomy" },
        ],
        prognosis: "Improves with reperfusion; varies by NIHSS/time to treatment.",
      },
      red_flags: ["Airway compromise", "Rapid decline in GCS", "New severe headache (consider ICH)"],
      panel: {
        internal_medicine: "Control BP, glucose; manage comorbidities.",
        surgery: "Neurosurgical input for decompression if malignant edema.",
        emergency_medicine: "Orchestrate stroke pathways; minimize door-to-needle time.",
      },
    };
  }

  // Anaphylaxis
  if (t.includes("anaphylaxis") || t.includes("anaphylactic")) {
    return {
      presenting: "Sudden onset urticaria, wheeze, throat tightness after eating a nut-containing dessert.",
      onset: "Symptoms started 15 minutes ago; rapidly progressive.",
      context: "Known seasonal allergies; no known drug allergies.",
      post_event: "",
      pmh: ["Allergic rhinitis"],
      meds: ["None daily"],
      allergies: ["Possible nut allergy (suspected)"],
      exam: {
        general: "Anxious, speaking in short phrases.",
        cardiorespiratory: "Wheeze bilaterally; tachycardic; normal heart sounds.",
        hemodynamic_profile: "warm & wet",
        pain_distress: "distressed, scratching hives",
        skin: "Generalized urticaria; facial edema",
      },
      labs: [
        "Point-of-care glucose 6.1 mmol/L",
        "CBC unremarkable",
      ],
      imaging: [],
      diffs: [
        { name: "Anaphylaxis", status: "ACCEPTED", why_for: "Skin + respiratory compromise + exposure", why_against: "" },
        { name: "Acute asthma exacerbation", status: "KEEP_OPEN", why_for: "Wheeze", why_against: "Urticaria/angioedema not typical" },
        { name: "Vasovagal reaction", status: "REJECTED", why_for: "Hypotension can mimic", why_against: "Presence of urticaria/wheeze" },
      ],
      finalDx: { name: "Anaphylaxis", rationale: "Two organ systems after likely allergen" },
      patho: { mechanism: "IgE-mediated mast cell degranulation → histamine and mediator release.", systems_organs: "Skin, respiratory, cardiovascular." },
      etiology: { underlying_cause: "Food allergen (nuts) suspected." },
      immediate: [
        "IM epinephrine 0.3–0.5 mg (1:1000) in mid-thigh; repeat q5–10 min if needed",
        "High-flow oxygen; airway positioning; prepare for difficult airway",
        "IV access; rapid isotonic fluids for hypotension",
        "Adjuncts: antihistamines, corticosteroids, inhaled β2-agonists",
        "Continuous monitoring; observe for biphasic reaction",
      ],
      escalation: ["Refractory shock → epinephrine infusion; ICU consult; airway team standby/intubate if worsening"],
      timing: ["Immediate epinephrine on recognition; observe at least 4–6 h (longer if severe)"],
      disposition: {
        admit_vs_discharge: "Observe; admit if severe or recurrent symptoms",
        unit: "ED observation or ICU if unstable",
        follow_up: "Allergy referral; epinephrine auto-injector education",
        social_needs: "Action plan; medication access and education",
      },
      teaching: {
        pearls: [
          "Epinephrine is first-line and time-critical.",
          "Biphasic reactions can occur—ensure adequate observation.",
        ],
        mnemonics: ["AIR: Adrenaline, IV fluids, Reassess"],
      },
      evidence: {
        key_tests: [],
        prognosis: "Excellent with prompt epinephrine; risk with delayed treatment.",
      },
      red_flags: ["Stridor/voice changes", "Hypotension", "Rapidly progressive edema"],
      panel: {
        internal_medicine: "Address comorbidities and medication interactions.",
        surgery: "ENT/airway team for difficult airway.",
        emergency_medicine: "Give epinephrine early; reassess frequently.",
      },
    };
  }

  // Generic fallback
  return {
    presenting: "Acute symptoms prompting ED evaluation.",
    onset: "Hours to days; moderate to severe intensity.",
    context: "No trauma reported.",
    post_event: "",
    pmh: ["Hypertension"],
    meds: ["Amlodipine 5 mg daily"],
    allergies: ["No known drug allergies"],
    exam: {
      general: "Alert, oriented.",
      cardiorespiratory: "Normal heart sounds, clear lungs.",
      hemodynamic_profile: "warm & dry",
      pain_distress: "mild distress",
    },
    labs: ["CBC: mild leukocytosis", "CRP elevated", "BMP near baseline"],
    imaging: [
      { modality: "Ultrasound", timing: "ED", rationale: "First-line assessment" },
      { modality: "CT as indicated", timing: "ED", rationale: "Define pathology if unclear" },
    ],
    diffs: [
      { name: "Primary topic-related diagnosis", status: "KEEP_OPEN", why_for: "Matches presentation", why_against: "" },
      { name: "Important alternative 1", status: "KEEP_OPEN", why_for: "", why_against: "" },
    ],
    finalDx: { name: normStr(topic) || "Working diagnosis", rationale: "Best fit for clinical picture" },
    patho: { mechanism: "Underlying pathophysiology consistent with presentation.", systems_organs: "Relevant organ(s)." },
    etiology: { underlying_cause: "Common etiologies for this condition." },
    immediate: ["ABC; monitoring", "IV access; fluids", "Analgesia/antiemetic", "Screening labs & targeted imaging", "Consult appropriate specialty"],
    escalation: ["Escalate/ICU if unstable or deteriorating."],
    timing: ["Time-sensitive diagnostics & therapy per condition."],
    disposition: { admit_vs_discharge: "Admit", unit: "Appropriate ward", follow_up: "Clinic follow-up", social_needs: "Assess supports and safety" },
    teaching: { pearls: ["Early targeted testing improves outcomes."], mnemonics: [] },
    evidence: { key_tests: [], prognosis: "" },
    red_flags: ["Rapid deterioration or airway compromise"],
    panel: { internal_medicine: "Stabilize comorbidities; coordinate care.", surgery: "Consult if operative pathology suspected.", emergency_medicine: "Initiate diagnostics & early therapy; reassess frequently." },
  };
}

/* -------------------- normalize + fill + legacy shape ------------------- */

function ensureCaseCompleteness(unified, { topic, language, region }) {
  const u = isObj(unified) ? { ...unified } : {};

  // meta
  u.meta = isObj(u.meta) ? { ...u.meta } : {};
  u.meta.topic = u.meta.topic || normStr(topic);
  u.meta.language = normalizeLang(u.meta.language || language || "en");
  u.meta.region = u.meta.region || normStr(region || "EU/DK");
  u.meta.demographics = isObj(u.meta.demographics) ? u.meta.demographics : {};
  if (!u.meta.demographics.age) u.meta.demographics.age = 60;
  if (!u.meta.demographics.sex) u.meta.demographics.sex = "unspecified";
  u.meta.geography_of_living = u.meta.geography_of_living || "urban, lives with family";

  const tfill = topicFillers(u.meta.topic || "");

  // history
  u.history = isObj(u.history) ? { ...u.history } : {};
  if (!nonEmpty(u.history.presenting_complaint)) u.history.presenting_complaint = tfill.presenting;
  if (!nonEmpty(u.history.onset_duration_severity)) u.history.onset_duration_severity = tfill.onset;
  if (!nonEmpty(u.history.context_triggers)) u.history.context_triggers = tfill.context;
  if (!nonEmpty(u.history.post_event)) u.history.post_event = tfill.post_event || "";
  if (!nonEmpty(u.history.past_medical_history)) u.history.past_medical_history = arr(tfill.pmh);
  if (!nonEmpty(u.history.medications_current)) u.history.medications_current = arr(tfill.meds);
  if (!nonEmpty(u.history.allergies)) u.history.allergies = arr(tfill.allergies);

  // exam
  u.exam = isObj(u.exam) ? { ...u.exam } : {};
  u.exam.vitals = ensureVitals(u.exam.vitals);
  u.exam.orthostatics = isObj(u.exam.orthostatics) ? u.exam.orthostatics : {};
  if (!nonEmpty(u.exam.general) && tfill.exam?.general) u.exam.general = tfill.exam.general;
  if (!nonEmpty(u.exam.cardiorespiratory) && tfill.exam?.cardiorespiratory) u.exam.cardiorespiratory = tfill.exam.cardiorespiratory;
  u.exam.hemodynamic_profile = u.exam.hemodynamic_profile || tfill.exam?.hemodynamic_profile || "warm & dry";
  u.exam.pain_distress = u.exam.pain_distress || tfill.exam?.pain_distress || "appears uncomfortable";
  if (!nonEmpty(u.exam.abdomen) && tfill.exam?.abdomen) u.exam.abdomen = tfill.exam.abdomen;
  if (!nonEmpty(u.exam.neuro) && tfill.exam?.neuro) u.exam.neuro = tfill.exam.neuro;
  if (!nonEmpty(u.exam.skin) && tfill.exam?.skin) u.exam.skin = tfill.exam.skin;

  // paraclinical
  u.paraclinical = isObj(u.paraclinical) ? { ...u.paraclinical } : {};
  if (!nonEmpty(u.paraclinical.labs)) u.paraclinical.labs = arr(tfill.labs);
  u.paraclinical.ecg = normStr(u.paraclinical.ecg);
  u.paraclinical.imaging = arr(u.paraclinical.imaging).map((i) =>
    isObj(i) ? { modality: i.modality || "", timing: i.timing || "", rationale: i.rationale || "" } : { modality: String(i || ""), timing: "", rationale: "" }
  );
  if (!nonEmpty(u.paraclinical.imaging)) u.paraclinical.imaging = arr(tfill.imaging);
  u.paraclinical.other_tests = arr(u.paraclinical.other_tests);
  u.paraclinical.test_kinetics = arr(u.paraclinical.test_kinetics).map((k) =>
    isObj(k) ? { test: k.test || "", timing_relation: k.timing_relation || "", notes: k.notes || "" } : { test: String(k || ""), timing_relation: "", notes: "" }
  );

  // differentials & red flags
  u.differentials = arr(u.differentials).map((d) => ({
    name: d?.name || "",
    status: d?.status || "KEEP_OPEN",
    why_for: d?.why_for || "",
    why_against: d?.why_against || "",
  }));
  if (!nonEmpty(u.differentials)) u.differentials = arr(tfill.diffs);

  u.red_flags = arr(u.red_flags);
  if (!nonEmpty(u.red_flags) && tfill.red_flags) u.red_flags = arr(tfill.red_flags);
  if (!nonEmpty(u.red_flags)) u.red_flags = ["Rapid deterioration or airway compromise"];

  // final dx, pathophysiology, etiology
  u.final_diagnosis = isObj(u.final_diagnosis) ? u.final_diagnosis : {};
  if (!nonEmpty(u.final_diagnosis.name)) u.final_diagnosis.name = tfill.finalDx?.name || u.meta.topic || "Working diagnosis";
  if (!nonEmpty(u.final_diagnosis.rationale)) u.final_diagnosis.rationale = tfill.finalDx?.rationale || "Best fit for clinical picture";

  u.pathophysiology = isObj(u.pathophysiology) ? u.pathophysiology : {};
  if (!nonEmpty(u.pathophysiology.mechanism)) u.pathophysiology.mechanism = tfill.patho?.mechanism || "";
  if (!nonEmpty(u.pathophysiology.systems_organs)) u.pathophysiology.systems_organs = tfill.patho?.systems_organs || "";

  u.etiology = isObj(u.etiology) ? u.etiology : {};
  if (!nonEmpty(u.etiology.underlying_cause)) u.etiology.underlying_cause = tfill.etiology?.underlying_cause || "";

  // management
  u.management = isObj(u.management) ? u.management : {};
  if (!nonEmpty(u.management.immediate)) u.management.immediate = arr(tfill.immediate);
  if (!nonEmpty(u.management.escalation_if_wrong_dx)) u.management.escalation_if_wrong_dx = arr(tfill.escalation);
  u.management.timing_windows = ensureTimingWindows(u.management.timing_windows);
  if (!nonEmpty(u.management.timing_windows)) u.management.timing_windows = ensureTimingWindows(tfill.timing);

  // guidelines (object array, no URLs)
  const defaultSociety = u.meta.region?.includes("EU") ? "ESO/ESC" : "AHA/ACC";
  u.management.region_guidelines = ensureGuidelines(u.management.region_guidelines, { society: defaultSociety, year: "2021" });

  // disposition
  u.disposition = isObj(u.disposition) ? u.disposition : {};
  if (!nonEmpty(u.disposition.admit_vs_discharge)) u.disposition.admit_vs_discharge = tfill.disposition?.admit_vs_discharge || "Admit";
  if (!nonEmpty(u.disposition.unit)) u.disposition.unit = tfill.disposition?.unit || "Appropriate specialty ward";
  if (!nonEmpty(u.disposition.follow_up)) u.disposition.follow_up = tfill.disposition?.follow_up || "Arrange specialty follow-up";
  if (!nonEmpty(u.disposition.social_needs)) u.disposition.social_needs = tfill.disposition?.social_needs || "Assess caregiver support and home safety";

  // evidence & teaching
  u.evidence = isObj(u.evidence) ? u.evidence : {};
  u.evidence.key_tests = arr(u.evidence.key_tests).map((t) =>
    isObj(t) ? { test: t.test || "", sensitivity: t.sensitivity || "", specificity: t.specificity || "", notes: t.notes || "" } :
      { test: String(t || ""), sensitivity: "", specificity: "", notes: "" }
  );
  if (!nonEmpty(u.evidence.key_tests) && tfill.evidence?.key_tests) u.evidence.key_tests = arr(tfill.evidence.key_tests);
  if (!nonEmpty(u.evidence.prognosis) && tfill.evidence?.prognosis) u.evidence.prognosis = tfill.evidence.prognosis;

  u.teaching = isObj(u.teaching) ? u.teaching : {};
  if (!nonEmpty(u.teaching.pearls) && tfill.teaching?.pearls) u.teaching.pearls = arr(tfill.teaching.pearls);
  if (!nonEmpty(u.teaching.mnemonics) && tfill.teaching?.mnemonics) u.teaching.mnemonics = arr(tfill.teaching.mnemonics);

  // panel notes
  u.panel_notes = isObj(u.panel_notes) ? u.panel_notes : {};
  u.panel_notes.internal_medicine = normStr(u.panel_notes.internal_medicine, tfill.panel?.internal_medicine || "—");
  u.panel_notes.surgery = normStr(u.panel_notes.surgery, tfill.panel?.surgery || "—");
  u.panel_notes.emergency_medicine = normStr(u.panel_notes.emergency_medicine, tfill.panel?.emergency_medicine || "—");

  return u;
}

/** Build legacy sections for older readers & downstream clients */
function buildLegacySections(unified) {
  const u = unified || {};
  const history = u.history || {};
  const exam = u.exam || {};
  const para = u.paraclinical || {};
  const diffs = Array.isArray(u.differentials) ? u.differentials : [];
  const refs = Array.isArray((u.management || {}).region_guidelines)
    ? (u.management || {}).region_guidelines
    : [];

  const I_PatientHistory = {
    presenting_complaint: history.presenting_complaint || "",
    onset_duration_severity: history.onset_duration_severity || "",
    context_triggers: history.context_triggers || "",
    post_event_details: history.post_event || "",
    past_medical_history: (history.past_medical_history || []).join("; "),
    medications_allergies: `Meds: ${(history.medications_current || []).join(", ")}; Allergies: ${(history.allergies || []).join(", ")}`,
  };

  const II_ObjectiveFindings = {
    vitals: JSON.stringify(exam.vitals || {}),
    orthostatic_vitals: JSON.stringify(exam.orthostatics || {}),
    physical_exam: [
      exam.general ? `General: ${exam.general}` : "",
      exam.cardiorespiratory ? `Cardiorespiratory: ${exam.cardiorespiratory}` : "",
      exam.abdomen ? `Abdomen: ${exam.abdomen}` : "",
      exam.neuro ? `Neuro: ${exam.neuro}` : "",
      exam.skin ? `Skin: ${exam.skin}` : "",
      exam.hemodynamic_profile ? `Hemodynamic: ${exam.hemodynamic_profile}` : "",
      exam.pain_distress ? `Pain/Distress: ${exam.pain_distress}` : "",
    ].filter(Boolean).join(" | "),
    risk_factors: (u.meta?.topic ? `Topic: ${u.meta.topic}. ` : "") + (history.past_medical_history || []).join(", "),
    exposures: "",
    family_disposition: "",
  };

  const III_ParaclinicalInvestigations = {
    labs: (para.labs || []).join("; "),
    ecg: para.ecg || "",
    imaging: (para.imaging || [])
      .map((i) => (isObj(i)
        ? `${i.modality}${i.timing ? " — " + i.timing : ""}${i.rationale ? " — " + i.rationale : ""}`
        : String(i || "")))
      .join(" | "),
    other_tests: (para.other_tests || []).join("; "),
  };

  const IV_DifferentialDiagnoses = {
    list: diffs.map((d) => {
      const n = isObj(d) ? d.name : String(d || "");
      const st = isObj(d) ? d.status : "";
      return st ? `${n} [${st}]` : n;
    }),
    red_flags: Array.isArray(u.red_flags) ? u.red_flags : [],
  };

  const V_FinalDiagnosis = {
    diagnosis: u.final_diagnosis?.name || "",
    criteria_or_rationale: u.final_diagnosis?.rationale || "",
  };

  const VI_Pathophysiology = {
    mechanism: u.pathophysiology?.mechanism || "",
    systems_or_organs: u.pathophysiology?.systems_organs || "",
  };

  const VIb_Etiology = {
    underlying_cause: u.etiology?.underlying_cause || "",
  };

  const VII_ConclusionAndDiscussion = {
    summary: `Diagnosis: ${u.final_diagnosis?.name || ""}. ${u.final_diagnosis?.rationale || ""}`,
    treatment_principles: (u.management?.immediate || []).map((s) => ({
      title: (String(s).split(":")[0] || "Step").slice(0, 40),
      details: String(s),
    })),
    immediate_management: (u.management?.immediate || []).join(" | "),
    discharge_vs_admit_criteria: u.disposition?.admit_vs_discharge || "",
    disposition_and_followup: `Unit: ${u.disposition?.unit || ""}; Follow-up: ${u.disposition?.follow_up || ""}; Social: ${u.disposition?.social_needs || ""}`,
    references: refs.map((r) => (isObj(r)
      ? [r.society, r.year, r.applies_to, r.note].filter(Boolean).join(" — ")
      : String(r || ""))),
  };

  const VIII_EvidenceAndStatistics = {
    prevalence: u.evidence?.prevalence || "",
    incidence: u.evidence?.incidence || "",
    key_test_performance: (u.evidence?.key_tests || []).map((t) => ({
      test: t.test || "",
      sensitivity: t.sensitivity || "",
      specificity: t.specificity || "",
      notes: t.notes || "",
    })),
    prognosis: u.evidence?.prognosis || "",
    biphasic_reaction_rate: "",
    recommended_observation_time: "",
  };

  const TeachingAndGamification = {
    clinical_reasoning_notes: (u.teaching?.pearls || []).join(" | "),
    mnemonics_or_pearls: u.teaching?.mnemonics || [],
    next_step_prompts: [],
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
    TeachingAndGamification,
  };
}

/* -------------------------------- main -------------------------------- */

export default async function generateCase({
  area,
  topic,
  language = "English",
  niveau = "kompleks",
  model = "gpt-4o-mini",
  region = "EU/DK",
  patient_constraints = {},
  minutes_from_onset = null,
}) {
  // Support object { topic: "..." }
  if (typeof topic === "object" && topic?.topic) topic = topic.topic;
  if (typeof topic !== "string" || !topic.trim()) {
    throw new Error("Invalid topic input");
  }

  const langCode = normalizeLang(language);

  try {
    // 1) Generate unified schema via OpenAI helper
    const unified = await generateCaseJSON({
      area,
      topic,
      language: langCode,
      region,
      niveau,
      model,
      patient_constraints,
      minutes_from_onset,
      // harmless hint to underlying generator if it supports it
      force_full: true,
    });

    // 2) Ensure completeness (fill any blanks; coerce shapes)
    const enriched = ensureCaseCompleteness(unified, {
      topic,
      language: langCode,
      region,
    });

    // 3) Build legacy sections for backward compatibility
    const legacy = buildLegacySections(enriched);

    // 4) Return hybrid payload
    return {
      ...enriched,
      ...legacy,
      meta: {
        ...(enriched.meta || {}),
        medical_area: area,
        niveau,
        language: enriched.meta?.language || langCode,
        keywords: Array.isArray(enriched.meta?.keywords) ? enriched.meta.keywords : [],
      },
    };
  } catch (err) {
    console.error("❌ generate_case_clinical error:", err);
    return { error: `Error generating case: ${err.message || "Unknown error"}` };
  }
}
