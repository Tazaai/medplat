// ~/workspaces/medplat/backend/generate_case_clinical.mjs
import openai from "./routes/openai_client.js";
import crypto from "crypto";

export default async function generateCase({
  area,
  topic,
  customSearch = null, // 🔍 optional custom text
  language,
  model = "gpt-4o-mini",
  region = "global",
  caseIdFromFirebase = null,
  userLocation = null, // 🌍 optional
}) {
  // ✅ normalize topic
  if (typeof topic === "object" && topic?.topic) {
    topic = topic.topic;
  }
  if (typeof topic !== "string") topic = "";

  // ✅ prefer customSearch if provided
  const effectiveTopic = customSearch?.trim() || topic?.trim();
  if (!effectiveTopic) {
    throw new Error("Invalid topic/customSearch input");
  }

  const case_id =
    caseIdFromFirebase ||
    effectiveTopic.toLowerCase().replace(/\s+/g, "_");
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
Topic: "${effectiveTopic}"   ${customSearch ? "(user custom search applied)" : ""}
Language: ${language || "en"}
Region: ${region}
UserLocation: ${userLocation || "unspecified"}

Generate a structured clinical case for medical students or junior doctors.
Difficulty_level: auto-classify as "easy", "medium", or "hard" depending on topic complexity.

⚠️ For guidelines, follow this hierarchy:
1. Local (hospital/region) if user location available
2. National (country health authority)
3. Regional (EU/continent-level)
4. Global (WHO, NICE, UpToDate, PubMed)

Sections required:

I. Patient History
  - Presenting Complaint (symptoms, duration, severity)
  - Past Medical History
  - Medications and Allergies
  - Social & Family history if relevant

II. Objective Findings
  - Vitals
  - Physical Exam
  - Risk Factors, Exposures, Family Disposition

III. Paraclinical Investigations
  - Labs (with reasoning why chosen; include realistic numeric values where possible)
  - Imaging (with reasoning, sensitivity/specificity, timing)
  - Other tests/procedures
  - Region-aware preferences (local → national → regional → global)

IV. Differential Diagnoses
  - 3–5 diagnoses
  - Why fits / Why less likely / Red flags
  - Confidence score (0–100%)

V. Final Diagnosis
  - Name + reasoning

VI. Pathophysiology & Etiology
  - Pathophysiology
  - Etiology

VII. Management
  - Immediate management
  - Specific treatments (drug, dose, monitoring)
  - Escalation
  - Region-aware guideline snippet
  - Timing windows

VIII. Disposition
  - Admit vs discharge
  - Follow-up
  - Social aspects

IX. Evidence & References
  - Sensitivity/specificity with sources
  - Prognosis
  - References (WHO, NICE, PubMed, national guidelines depending on region)

X. Teaching & Reasoning Panel
  - Expert pearls
  - Mnemonics
  - Panel-style reasoning (CT vs MRI, thresholds, interventions)

XI. Atypical_Presentations
  - Describe how this condition may present differently in elderly, pregnant, immunocompromised patients

Return only JSON, no prose.
`.trim();

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    });

    let raw = completion.choices[0]?.message?.content?.trim();
    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.warn("⚠️ GPT returned invalid JSON, attempting fallback…");
      raw = raw.replace(/^[^{[]+/, "").replace(/[^}\]]+$/, "");
      parsed = JSON.parse(raw);
    }

    // ✅ attach meta info
    parsed.meta = {
      ...(parsed.meta || {}),
      case_id,
      instance_id,
      topic: effectiveTopic,
      area,
      language: language || "en",
      region,
      userLocation,
      customSearch: customSearch || null,
      generated_at: new Date().toISOString(),
    };

    return {
      json: parsed,
      rawText: raw,
      aiReply: completion.choices[0].message,
      meta: parsed.meta,
    };
  } catch (err) {
    console.error("❌ Error in generate_case_clinical:", err);
    throw err;
  }
}
