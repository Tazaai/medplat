// ~/medplat/backend/generate_case_clinical.mjs
import openai from "./routes/openai_client.js";
import crypto from "crypto";
import fs from "fs";
import path from "path";

export default async function generateCase(opts) {
  const {
    area, topic, customSearch = null, language,
    model = "gpt-4o-mini", region: inputRegion,
    caseIdFromFirebase = null, userLocation = null,
  } = opts;

  // ✅ normalize topic
  let t = typeof topic === "object" && topic?.topic ? topic.topic : topic || "";
  const effectiveTopic = customSearch?.trim() || t.trim();
  if (!effectiveTopic) throw new Error("Invalid topic/customSearch input");

  const case_id = caseIdFromFirebase || effectiveTopic.toLowerCase().replace(/\s+/g, "_");
  const instance_id = crypto.randomUUID();

  // 🌍 region handling
  let region = inputRegion || "global";
  if (!inputRegion && userLocation) {
    if (userLocation.startsWith("ip:")) region = "by_ip";
    else if (userLocation !== "unspecified") region = userLocation;
  }

  // 🌍 location note
  let locationNote = "";
  if (userLocation?.startsWith("ip:")) locationNote = `User location detected by IP (${userLocation}).`;
  else if (userLocation && userLocation !== "unspecified") locationNote = `User specified location: ${userLocation}.`;

  const systemPrompt = `
You are a multidisciplinary panel of senior clinicians generating structured clinical cases.
Audience: advanced learners (residents, specialists, professors).
Always return **valid JSON only** (no markdown).
Cases must be professional, detailed, evidence-based, structured.
`.trim();

  const userPrompt = `
Case_ID: ${case_id}
Instance_ID: ${instance_id}
Medical_Specialty: ${area}
Topic: "${effectiveTopic}"
Language: ${language || "en"}
Region: ${region}
UserLocation: ${userLocation || "unspecified"}
${locationNote}

Generate a comprehensive structured clinical case.
Required sections: History, Objective, Investigations, Differential, Provisional Dx, Pathophysiology, Management, Disposition, Evidence, Expert_Panel_and_Teaching, Conclusion, Atypical, Summary, Charts, Red_Flags_and_Rescue.

Rules:
- ≥150 words per section where relevant.
- Include risk factors, red flags, and actual lab/imaging values.
- Always create a **Red_Flags_and_Rescue** section with time-sensitive dangers + immediate stabilization.
- **Expert_Panel_and_Teaching**:
   - Must include at least **12 dynamic, context-relevant expert roles** depending on the specialty.
   - Always mix in: GP, 2×Emergency, Radiologist(s), Clinical Pharmacist, Field Researcher, Professor of Medicine, Global Health Expert.
   - Each expert provides **role-tagged reasoning**.
   - Must include **at least 2 explicit debates/disagreements**.
   - Conclude with a **short Final_Consensus**.
   - Consensus must reflect a **hierarchical weighting**.
   - Do NOT include medical students or competitor voices here.
- Always cite ≥1 major guideline (ESC, ACC/AHA, NICE, WHO, AAP, ATLS, Surviving Sepsis, GINA, ILAE).
- If seizure/epilepsy case → must include benzodiazepine rescue therapy + admission criteria.
- Always specify admission criteria when pediatric, neurology, or emergency.
- Add region-aware and low-resource adaptations.
- Include clear timeline of interventions (0h, 1h, 3h, 24h).
- Include psychosocial context (adherence, counseling, follow-up).
Return JSON only.
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
    try { parsed = JSON.parse(raw || "{}"); }
    catch (err) {
      let repaired = (raw || "{}")
        .replace(/^[^{[]+/, "").replace(/[^}\]]+$/, "")
        .replace(/,\s*}/g, "}").replace(/,\s*]/g, "]")
        .replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":');

      if (process.env.NODE_ENV !== "production") {
        const debugDir = path.resolve("./debug_cases");
        if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
        const fileBase = path.join(debugDir, `${case_id}_${instance_id}`);
        fs.writeFileSync(`${fileBase}_raw.json`, raw, "utf-8");
        fs.writeFileSync(`${fileBase}_repaired.json`, repaired, "utf-8");
      }
      try { parsed = JSON.parse(repaired); raw = repaired; }
      catch { parsed = {}; }
    }

    // ✅ Auto-validation & safeguard (integrated validator)
    const requireSection = (cond, fill) => { if (!cond) return fill; return cond; };

    parsed.History = requireSection(parsed.History, { Note: "History missing" });
    parsed.Objective = requireSection(parsed.Objective, { Note: "Objective missing" });
    parsed.Investigations = requireSection(parsed.Investigations, { Note: "Investigations missing" });
    parsed.Differential = requireSection(parsed.Differential, ["Not specified"]);
    parsed.Provisional_Diagnosis = requireSection(parsed.Provisional_Diagnosis, { Diagnosis: "Not specified" });
    parsed.Pathophysiology = requireSection(parsed.Pathophysiology, { Note: "Pathophysiology missing" });
    parsed.Management = requireSection(parsed.Management, {});
    parsed.Disposition = requireSection(parsed.Disposition, { Note: "Disposition missing" });
    parsed.Evidence_and_References = requireSection(parsed.Evidence_and_References, ["NICE 2023", "WHO 2023", "Surviving Sepsis 2021"]);
    parsed.Conclusion = requireSection(parsed.Conclusion, { Note: "Conclusion missing" });
    parsed.Atypical = requireSection(parsed.Atypical, { Note: "Atypical presentation missing" });
    parsed.Summary = requireSection(parsed.Summary, { Note: "Summary missing" });
    parsed.Charts = requireSection(parsed.Charts, { Trend: "No trend charts provided" });

    // 🔧 Rescue therapy safeguard
    if (!parsed.Red_Flags_and_Rescue) {
      parsed.Red_Flags_and_Rescue = {
        Time_Critical_Interventions: ["Immediate airway, breathing, circulation stabilization"],
        Rescue_Therapies: ["IV fluids, empiric antibiotics, vasopressors if persistent hypotension"],
      };
    } else if (!parsed.Red_Flags_and_Rescue.Rescue_Therapies) {
      parsed.Red_Flags_and_Rescue.Rescue_Therapies = [
        "IV fluids, empiric antibiotics, vasopressors if persistent hypotension"
      ];
    }

    // 🔧 Timeline safeguard
    if (!parsed.Management.Initial_Interventions || parsed.Management.Initial_Interventions.length === 0) {
      parsed.Management.Initial_Interventions = [
        { Time: "0h", Action: "Establish IV access, start fluids (30 mL/kg crystalloids)" },
        { Time: "1h", Action: "Administer broad-spectrum antibiotics" },
        { Time: "3h", Action: "Reassess hemodynamics, monitor lactate, consider vasopressors" },
        { Time: "24h", Action: "Review culture results, adjust antibiotics, escalate/de-escalate care" }
      ];
    }

    // Expert Panel safeguard (dynamic, ≥12 roles)
    if (!parsed.Expert_Panel_and_Teaching) parsed.Expert_Panel_and_Teaching = {};
    if (!Array.isArray(parsed.Expert_Panel_and_Teaching.Panel) || parsed.Expert_Panel_and_Teaching.Panel.length < 12) {
      parsed.Expert_Panel_and_Teaching.Panel = [
        { Role: "General Practitioner", Input: "Primary care reasoning", Weight: 1 },
        { Role: "Emergency Physician 1", Input: "Acute stabilization approach", Weight: 2 },
        { Role: "Emergency Physician 2", Input: "Triage & resuscitation view", Weight: 2 },
        { Role: `${area} Specialist 1`, Input: "Core specialty reasoning", Weight: 3 },
        { Role: `${area} Specialist 2`, Input: "Alternative differential", Weight: 3 },
        { Role: `${area} Specialist 3`, Input: "Advanced therapy view", Weight: 3 },
        { Role: "Clinical Pharmacist", Input: "Drug dosing & interactions", Weight: 2 },
        { Role: "Radiologist 1", Input: "Imaging interpretation", Weight: 2 },
        { Role: "Radiologist 2", Input: "Advanced modality suggestion", Weight: 2 },
        { Role: "Field Researcher", Input: "Resource-limited adaptation", Weight: 1 },
        { Role: "Professor of Medicine", Input: "Teaching integration", Weight: 4 },
        { Role: "Global Health Expert", Input: "International/low-resource adaptations", Weight: 2 },
      ];
    }
    if (!parsed.Expert_Panel_and_Teaching.Disagreements || parsed.Expert_Panel_and_Teaching.Disagreements.length < 2) {
      parsed.Expert_Panel_and_Teaching.Disagreements = [
        {
          Issue: "Timing of imaging vs stabilization",
          Opinions: [
            { Role: "Emergency Physician 1", View: "Stabilize before imaging" },
            { Role: "Radiologist 1", View: "Urgent imaging first" },
          ]
        },
        {
          Issue: "Choice of first-line therapy",
          Opinions: [
            { Role: `${area} Specialist 1`, View: "Start guideline-based therapy immediately" },
            { Role: "Clinical Pharmacist", View: "Check contraindications first" },
          ]
        }
      ];
    }
    if (!parsed.Expert_Panel_and_Teaching.Final_Consensus) {
      parsed.Expert_Panel_and_Teaching.Final_Consensus =
        "Weighted consensus: specialists and professor dominate final decision, GP/researcher provide context.";
    }

    // Special safeguard for seizures
    const seizureKeywords = ["seizure", "epilepsy", "status epilepticus", "convulsion"];
    if (seizureKeywords.some(k => effectiveTopic.toLowerCase().includes(k))) {
      parsed.Management.Immediate_care = parsed.Management.Immediate_care || {};
      parsed.Management.Immediate_care.Rescue_Therapy = {
        Drug: "Diazepam (rectal 0.5 mg/kg) or Midazolam (buccal 0.3–0.5 mg/kg)",
        Note: "Administer if seizure >5 minutes. Repeat once if needed."
      };
    }

    // attach meta
    parsed.meta = {
      ...(parsed.meta || {}),
      case_id, instance_id, topic: effectiveTopic, area,
      language: language || "en", region, userLocation,
      customSearch: customSearch || null,
      generated_at: new Date().toISOString(),
    };

    return { json: parsed, rawText: raw, aiReply: completion.choices[0].message, meta: parsed.meta };
  } catch (err) {
    console.error("❌ Error in generate_case_clinical:", err);
    throw err;
  }
}
