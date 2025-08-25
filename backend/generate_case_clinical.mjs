import openai from "./routes/openai_client.js";
import crypto from "crypto";
import fs from "fs";
import path from "path";

export default async function generateCase(opts) {
  const {
    area,
    topic,
    customSearch = null,
    language,
    model = "gpt-4o-mini",
    region: inputRegion,
    caseIdFromFirebase = null,
    userLocation = null,
  } = opts;

  // ✅ normalize topic
  let t = typeof topic === "object" && topic?.topic ? topic.topic : topic || "";
  const effectiveTopic = customSearch?.trim() || t.trim();
  if (!effectiveTopic) throw new Error("Invalid topic/customSearch input");

  const case_id =
    caseIdFromFirebase || effectiveTopic.toLowerCase().replace(/\s+/g, "_");
  const instance_id = crypto.randomUUID();

  // 🌍 region handling
  let region = inputRegion || "global";
  if (!inputRegion && userLocation) {
    if (userLocation.startsWith("ip:")) region = "by_ip";
    else if (userLocation !== "unspecified") region = userLocation;
  }

  // 🌍 location note for prompt
  let locationNote = "";
  if (userLocation?.startsWith("ip:")) {
    locationNote = `User location detected by IP (${userLocation}). Use this as likely region for guidelines.`;
  } else if (userLocation && userLocation !== "unspecified") {
    locationNote = `User specified location: ${userLocation}. Prefer local guidelines first.`;
  }

  // >>> systemPrompt START <<<
  const systemPrompt = `
You are an expert panel creating structured clinical cases.
Audience: advanced learners (residents, specialists, professors).
Always return **valid JSON only** (no markdown, no prose outside JSON).
Cases must be **detailed, evidence-based, and structured**.
`.trim();
  // >>> systemPrompt END <<<

  // >>> userPrompt START <<<
  const userPrompt = `
Case_ID: ${case_id}
Instance_ID: ${instance_id}
Medical_Specialty: ${area}
Topic: "${effectiveTopic}" ${customSearch ? "(custom search applied)" : ""}
Language: ${language || "en"}
Region: ${region}
UserLocation: ${userLocation || "unspecified"}
${locationNote}

Generate a **comprehensive structured clinical case** at an expert level.
Every section must be ≥150 words where applicable.
Explain **why** findings, tests, or management choices matter.
No placeholders.

Required sections:

I. Patient_History  
- Risk factors, family history, psychosocial context.

II. Objective_Findings  
- Include vitals + exam.
- Highlight urgent red flags explicitly.

III. Paraclinical_Investigations  
- Labs + imaging must include **actual values** + interpretation.
- Always include:  
  • Troponins + ECG (if cardiac)  
  • ABG + D-dimer (if pulmonary/critical care)  
  • Creatinine/eGFR (if renal)  
- Radiologists must contribute explicit imaging reasoning.  
- Provide contextual test results per specialty.

IV. Differential_Diagnoses  
- Each includes: Why_Fits, Why_Less_Likely, Red_Flags.

V. Provisional_Diagnosis  

VI. Pathophysiology_and_Etiology  
- Explicit mechanism → clinical decision link.

VII. Management  
- Immediate care must include **airway escalation** (O2 → CPAP/NIV → intubation).  
- Enforce **time-critical bundles** (e.g., fluids <3h, antibiotics <1h in sepsis).  
- Definitive management: drugs, surgery, long-term care.  
- Always include **agreements + controversies**.  
- Clinical Pharmacist must detail **drug choices, dosing, renal/hepatic adjustments, and alternatives**.  
- Include at least **one management flowchart or table** (e.g., IV fluids by weight, sepsis 1h–3h bundle).

VIII. Disposition  
- Social aspects, follow-up.  
- Preventive & Long-Term Care (lifestyle, vaccination, smoking cessation).  
- Multidisciplinary follow-up plan (GP, specialists, rehab, nursing).

IX. Evidence_and_References  
- Must ONLY include **major guidelines** (ESC, ACC/AHA, NICE, WHO, Surviving Sepsis, UpToDate, ATLS).  
- Exclude vague “studies”.

X. Expert_Panel_and_Teaching  
- Always simulate a **dynamic 12+ expert panel** contextual to the case:  
  • Medical Student (mnemonics/simplified pearls)  
  • 2 General Practitioners / Family Doctors  
  • 2 Emergency Physicians  
  • 2–3 Specialists relevant to the case (e.g., Cardiologist, Pulmonologist, Nephrologist, Infectious Disease, Trauma Surgeon)  
  • Radiologist  
  • Clinical Pharmacist  
  • ICU Nurse / Critical Care Team  
  • Paramedic / Disaster Medicine Expert (if trauma/mass casualty)  
  • Field Researcher  
  • Professor of Medicine (must explicitly connect pathophysiology → clinical lesson)  
  • Competitor voice (flat guideline perspective for contrast)  
- Each member: 2–3 sentences of evidence-based reasoning with references.  
- Must include **agreements + disagreements**.  
- Always finish with unified **Final_Consensus**.

XI. Conclusion  
- Teaching summary with lessons.

XII. Atypical_Presentations  
- Elderly, pediatric, immunocompromised, or other atypical.

XIII. Summary  
- Abstract (3–4 sentences) for preview.

XIV. Charts_and_Tables  
- Always include at least 1 chart or table relevant to the case (drug dosing, fluid resuscitation per kg, clinical decision algorithm, or diagnostic criteria table).

Return valid JSON only.
`.trim();
  // >>> userPrompt END <<<

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
    let parsed = {};

    // 🛠 JSON parsing + repair
    try {
      parsed = JSON.parse(raw || "{}");
    } catch (err) {
      console.warn("⚠️ JSON parse fail, repairing…", err.message);

      let repaired = (raw || "{}")
        .replace(/^[^{[]+/, "")
        .replace(/[^}\]]+$/, "")
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":');

      if (process.env.NODE_ENV !== "production") {
        const debugDir = path.resolve("./debug_cases");
        if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
        const fileBase = path.join(debugDir, `${case_id}_${instance_id}`);
        fs.writeFileSync(`${fileBase}_raw.json`, raw, "utf-8");
        fs.writeFileSync(`${fileBase}_repaired.json`, repaired, "utf-8");
      }

      try {
        parsed = JSON.parse(repaired);
        raw = repaired;
        console.log(`✅ JSON repair successful for case ${case_id} (${instance_id})`);
      } catch (err2) {
        console.error("❌ Still invalid JSON after repair:", err2.message);
        parsed = {};
      }
    }

    // ✅ Ensure required fields
    parsed.Provisional_Diagnosis ??= { Diagnosis: "Not specified" };
    parsed.Expert_Panel_and_Teaching ??= { Members: [], Final_Consensus: "Not provided" };
    parsed.Evidence_and_References ??= [];

    if ("Difficulty_Level" in parsed) delete parsed.Difficulty_Level;

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
