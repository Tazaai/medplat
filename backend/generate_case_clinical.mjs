// ~/medplat/backend/generate_case_clinical.mjs
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
    if (userLocation.startsWith("ip:")) {
      region = "by_ip"; // can later resolve geo-IP
    } else if (userLocation !== "unspecified") {
      region = userLocation;
    }
  }

  // 🌍 location note for prompt
  let locationNote = "";
  if (userLocation?.startsWith("ip:")) {
    locationNote = `User location detected by IP (${userLocation}). Interpret this as the likely geographic region for applying local guidelines.`;
  } else if (userLocation && userLocation !== "unspecified") {
    locationNote = `User specified location: ${userLocation}. Prefer local guidelines first.`;
  }

  const systemPrompt = `
You are a multidisciplinary expert panel generating structured clinical cases
for advanced medical learners (residents, specialists, professors).
Always return JSON only. No markdown, no prose outside JSON.
Cases must be professional, detailed, and reasoning-based.
`.trim();

  const userPrompt = `
Case_ID: ${case_id}
Instance_ID: ${instance_id}
Medical_Specialty: ${area}
Topic: "${effectiveTopic}" ${customSearch ? "(user custom search applied)" : ""}
Language: ${language || "en"}
Region: ${region}
UserLocation: ${userLocation || "unspecified"}
${locationNote}

Generate a structured clinical case at expert level.
Each section must be ≥150 words where appropriate.
Explain WHY findings, tests, or management choices matter.
Never use placeholder text.

Required sections:

I. Patient_History
   - Risk factors, family history, psychosocial context.

II. Objective_Findings
   - Include vitals, exam findings, highlight urgent red flags.

III. Paraclinical_Investigations
   - Labs and imaging must include ACTUAL VALUES and reasons.
   - Always include: Troponins & ECG (if cardiac), ABG & D-dimer (if pulmonary/critical care), Creatinine/eGFR (if renal).
   - Provide context-appropriate tests depending on specialty.

IV. Differential_Diagnoses
   - Each must include Why_Fits, Why_Less_Likely, Red_Flags.

V. Provisional_Diagnosis

VI. Pathophysiology_and_Etiology
   - Explain underlying mechanism in detail.

VII. Management
   - Immediate emergency care must include airway escalation (O2 → CPAP/NIV → intubation → surgical airway if needed).
   - Must enforce time-critical bundles (e.g., antibiotics within 1h, fluids within 3h in sepsis).
   - Then definitive management (drugs, long-term therapy).
   - Always provide reasoning and mention controversies (when not to use a treatment).
   - When possible, include small tables or charts (e.g., IV fluid resuscitation per kg, dosing tables, diagnostic algorithms like Dix-Hallpike vs. HINTS).

VIII. Disposition
   - Social aspects, follow-up.
   - "Preventive & Long-Term Care" (lifestyle, vaccination, smoking cessation).
   - Highlight multidisciplinary follow-up (GP, physiotherapist, nephrologist, etc.).

IX. Evidence_and_References
   - Must ONLY include major guidelines RELEVANT to the case (ATLS, ESC, ACC/AHA, NICE, WHO, Surviving Sepsis, UpToDate).
   - No vague "studies" or irrelevant citations.

X. Expert_Panel_and_Teaching
   - Must include a **context-specific panel of clinical experts**:
     • Medical Student (with mnemonic or simplified pearl)
     • General Practitioner / Family Doctor
     • 1–2 Emergency Physicians
     • 2–3 Specialists tailored to the case (e.g., Cardiologist, Pulmonologist, Nephrologist, Infectious Disease, Trauma Surgeon, depending on case context)
     • Clinical Pharmacist (must cover antibiotics, analgesics, transfusions/TXA, dosing, alternatives, reasoning)
     • ICU Nurse or Critical Care Team (if critical care case)
     • Paramedic / Disaster Medicine Expert (if trauma, mass casualty, disaster medicine)
     • Field Researcher (public health or trial perspective)
     • Professor of Medicine (explicitly link pathophysiology → teaching pearl)
     • Competitor voice (compare to flat guideline sources like AMBOSS/UpToDate, and add scoring/triage systems relevant to the case: e.g., ISS, TRISS, CURB-65, CHA₂DS₂-VASc)
   - Roles should be **dynamic to match the case context**.
   - Each role must provide 2–3 sentences of reasoning.
   - Must include Agreements AND Disagreements.
   - Finish with unified "Final_Consensus".

XI. Conclusion
   - Teaching summary with lessons.

XII. Atypical_Presentations
   - Edge cases, elderly/atypical signs.

XIII. Summary
   - Short abstract (3–4 sentences) for preview.

Return valid JSON only.
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
