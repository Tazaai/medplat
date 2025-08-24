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
    model = "gpt-4o-mini", // ✅ dynamic from frontend
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
You are a multidisciplinary expert panel that generates structured clinical cases.
Always return a complete structured case as valid JSON only.
No markdown, no prose outside JSON.
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

Generate a structured clinical case for advanced medical learners.
Use expert-level reasoning. Be detailed and professional.

Each section must be explicit, well-structured, and ≥150 words where applicable.
Always explain WHY findings, tests, or diagnoses are relevant, and cite references inline where possible.

I. Patient_History
II. Objective_Findings
III. Paraclinical_Investigations
IV. Differential_Diagnoses
V. Provisional_Diagnosis
VI. Pathophysiology_and_Etiology
VII. Management
VIII. Disposition
IX. Evidence_and_References
X. Expert_Panel_and_Teaching
   - Simulate a dynamic expert panel tailored to the specialty/topic:
     • Always include a medical student, a GP, and a senior professor/researcher.
     • Add specialists relevant to the topic (e.g., Cardiologist, Neurologist, Immunologist, Emergency Physician).
     • Each member provides 2–3 sentences of evidence-based reasoning with references.
     • Include agreements AND disagreements.
     • Always provide at least one teaching pearl or mnemonic.
   - Finish with a unified "Final_Consensus" summary.
XI. Conclusion
XII. Atypical_Presentations

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
    let parsed = {};

    // 🛠 JSON parsing + repair logic
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
        parsed = {}; // fallback so server never crashes
      }
    }

    // ✅ Ensure required fields always exist
    parsed.Provisional_Diagnosis ??= { Diagnosis: "Not specified" };
    parsed.Expert_Panel_and_Teaching ??= {
      Members: [],
      Final_Consensus: "Not provided",
    };
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
