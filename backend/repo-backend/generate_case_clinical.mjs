// ~/medplat/backend/generate_case_clinical.mjs
import openai from "./routes/openai_client.js";
import { translateText } from "./utils/translate_util.mjs";
import crypto from "crypto";

export default async function generateCase({
  area,
  topic,
  language,
  model = "gpt-4o-mini",
  region = "global",
  caseIdFromFirebase = null
}) {
  if (typeof topic === "object" && topic?.topic) {
    topic = topic.topic;
  }
  if (typeof topic !== "string" || !topic.trim()) {
    throw new Error("Invalid topic input");
  }

  // 🔑 Assign IDs
  const case_id = caseIdFromFirebase || topic.toLowerCase().replace(/\s+/g, "_");
  const instance_id = crypto.randomUUID();

  const systemPrompt = `
You are a multidisciplinary panel of senior doctors (internal medicine, emergency medicine, surgery).
Always return a full structured clinical case as valid JSON.
Never use markdown, no backticks, no explanations outside JSON.
`.trim();

  const userPrompt = `
Case_ID: ${case_id}
Instance_ID: ${instance_id}
Medical Specialty: ${area}
Topic: "${topic}"
Language: ${language}
Region: ${region}

Generate a structured clinical case for medical students or junior doctors.
Difficulty_level: auto-classify as "easy", "medium", or "hard" depending on topic complexity.

Sections required:

I. Patient History
  - Presenting Complaint (symptoms, duration, severity)
  - Past Medical History
  - Medications and Allergies
  - Social & Family history if relevant

II. Objective Findings
  - Vitals
  - Physical Exam (systematic, highlight positives/negatives)
  - Risk Factors, Exposures, Family Disposition

III. Paraclinical Investigations
  - Labs (with clinical reasoning why chosen)
  - Imaging (Ultrasound, CT, MRI, LP etc — include reasoning why/why not, sensitivity/specificity, when they become positive)
  - Other tests/procedures with rationale
  - Region-specific preferences (e.g. Denmark → local/national guideline first, then EU, then global WHO/UpToDate)

IV. Differential Diagnoses
  - At least 3–5 differentials
  - For each: Why it fits (reasoning) / Why less likely
  - Red flags to consider

V. Final Diagnosis
  - Name
  - Diagnostic reasoning (why labs/imaging clinch the dx)

VI. Pathophysiology & Etiology
  - Mechanism
  - Underlying cause
  - Systems/organs affected

VII. Management
  - Immediate management (ABC, supportive care)
  - Specific treatment (drug names, doses, alternatives, monitoring)
  - Escalation steps if wrong dx or complications
  - Region-aware guideline snippet (local → regional → global)
  - Timing windows (when intervention must occur)

VIII. Disposition
  - Admit vs discharge, level of care
  - Follow-up needs
  - Social aspects (support, safety, access to care)

IX. Evidence & References
  - Test sensitivities/specificities with sources
  - Prognosis
  - Cite open references (WHO, PubMed, NICE, UpToDate, Danish Sundhedsstyrelsen etc depending on region)

X. Teaching & Reasoning Panel
  - Expert pearls
  - Mnemonics
  - Panel-style reasoning: why certain labs, why CT vs MRI, why/when LP, thresholds for interventions

Return only JSON, no prose.
`.trim();

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
    });

    let raw = completion.choices[0]?.message?.content?.trim();

    // ✅ Parse JSON safely
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.warn("⚠️ GPT returned invalid JSON, fallback wrapping...");
      raw = raw.replace(/^[^{[]+/, "").replace(/[^}\]]+$/, "");
      parsed = JSON.parse(raw);
    }

    // 🔹 Add IDs for traceability
    parsed.meta = {
      ...(parsed.meta || {}),
      case_id,
      instance_id,
      topic,
      area,
      language,
      region,
      generated_at: new Date().toISOString()
    };

    // 🔹 Translate if needed
    if (language.toLowerCase() !== "en") {
      parsed = await translateText(parsed, language);
    }

    return parsed;
  } catch (err) {
    console.error("❌ Error in generate_case_clinical:", err);
    throw err;
  }
}
