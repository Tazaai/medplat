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

  // 🌍 location interpretation
  let locationNote = "";
  if (userLocation && typeof userLocation === "string") {
    if (userLocation.startsWith("ip:")) {
      locationNote = `User location detected by IP (${userLocation}). Interpret this as the likely geographic region for applying local guidelines. If unclear, fallback to national, then regional, then global.`;
    } else if (userLocation !== "unspecified") {
      locationNote = `User specified location: ${userLocation}. Prefer local guidelines first.`;
    }
  }

  const systemPrompt = `
You are a multidisciplinary expert panel that generates structured clinical cases.
Always return a complete structured case as **valid JSON only**.
Never use markdown, no backticks, no free text outside JSON.
The JSON must be globally valid and parseable.
`.trim();

  const userPrompt = `
Case_ID: ${case_id}
Instance_ID: ${instance_id}
Medical Specialty: ${area}
Topic: "${effectiveTopic}"   ${customSearch ? "(user custom search applied)" : ""}
Language: ${language || "en"}
Region: ${region}
UserLocation: ${userLocation || "unspecified"}
${locationNote}

Generate a structured clinical case for advanced medical learners (medical students, residents, doctors).
Always use **expert-level reasoning** – do not classify as easy/medium/hard.

⚠️ For guidelines, follow this hierarchy:
1. Local (hospital/region) if user location available
2. National (country health authority)
3. Regional (EU/continent-level)
4. Global (WHO, NICE, UpToDate, PubMed)

Sections required:

I. Patient_History
  - Age, Sex, Geography (always include)
  - Presenting_Complaint (symptoms, duration, severity, detailed examples)
  - Past_Medical_History
  - Medications_and_Allergies
  - Social_and_Family_History

II. Objective_Findings
  - Vitals
  - Physical_Exam (structured, detailed)
  - Risk_Factors, Exposures, Family_Disposition

III. Paraclinical_Investigations
  - Labs (with reasoning why chosen; include realistic numeric values and CRP, renal, liver, thyroid when relevant)
  - Imaging (reasoning, sensitivity/specificity, timing; e.g. CT vs MRI vs LP; justify choice)
  - Other_Tests_Procedures
  - Each choice must include evidence-based reasoning and guideline references

IV. Differential_Diagnoses
  - 3–5 differential diagnoses
  - For each: Why_Fits / Why_Less_Likely / Red_Flags (with examples)
  - Confidence_Score (0–100)
  - Each entry should include counterarguments and references

V. Final_Diagnosis
  - Name + detailed reasoning with evidence/guidelines

VI. Pathophysiology_and_Etiology
  - Detailed pathophysiology (for medical student/USMLE prep level)
  - Etiology with categories (metabolic, structural, infectious, drug-related)

VII. Management
  - Immediate_Management
  - Specific_Treatments (drug, dose, monitoring; include warnings/contraindications)
  - Escalation (ICU transfer, advanced imaging, surgical options if relevant)
  - Region_Aware_Guideline_Snippet (local → national → global)
  - Timing_Windows (include evidence/references)

VIII. Disposition
  - Admit_vs_Discharge (with justification)
  - Follow_Up
  - Social_Aspects

IX. Evidence_and_References
  - Sensitivity/Specificity with sources
  - Prognosis (with evidence, risks of delay)
  - References (PubMed, NICE, WHO, national guidelines)

X. Teaching_and_Reasoning_Panel
  - Panel_Debate: multiple roles chosen dynamically based on case context (e.g. neurologist, cardiologist, obstetrician, GP, emergency physician, professor, researcher, medical student, junior doctor). 
  - Each role should give a short but professional, evidence-based opinion. Some should agree, others disagree.
  - Agreements: explicit list of consensus points
  - Disagreements: explicit list of controversies
  - References: cited in-line
  - This should read like a high-level conference discussion.

XI. Conclusion
  - Synthesized expert consensus and evidence-based recommendation.
  - Must summarize the debate clearly, give a professional conclusion, and final recommendation so user is not left with unresolved arguments.
  - Include references.

XII. Atypical_Presentations
  - Elderly
  - Pediatric
  - Pregnant
  - Immunocompromised
  - Regional/rare variations if relevant

Return only valid JSON, no prose.
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

    // ✅ sanity filter: remove Difficulty_Level if GPT sneaks it in
    if (parsed && "Difficulty_Level" in parsed) {
      delete parsed.Difficulty_Level;
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
