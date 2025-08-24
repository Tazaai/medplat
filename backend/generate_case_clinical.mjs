// ~/workspaces/medplat/backend/generate_case_clinical.mjs
import openai from "./routes/openai_client.js";
import crypto from "crypto";
import fs from "fs";
import path from "path";

export default async function generateCase({
  area,
  topic,
  customSearch = null,
  language,
  model = "gpt-4o-mini",
  region = "global",
  caseIdFromFirebase = null,
  userLocation = null,
}) {
  // ✅ normalize topic
  if (typeof topic === "object" && topic?.topic) {
    topic = topic.topic;
  }
  if (typeof topic !== "string") topic = "";

  const effectiveTopic = customSearch?.trim() || topic?.trim();
  if (!effectiveTopic) throw new Error("Invalid topic/customSearch input");

  const case_id =
    caseIdFromFirebase || effectiveTopic.toLowerCase().replace(/\s+/g, "_");
  const instance_id = crypto.randomUUID();

  // 🌍 location interpretation
  let locationNote = "";
  if (userLocation && typeof userLocation === "string") {
    if (userLocation.startsWith("ip:")) {
      locationNote = `User location detected by IP (${userLocation}). Interpret this as the likely geographic region for applying local guidelines.`;
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

Generate a structured clinical case for advanced medical learners.
[... full section instructions unchanged ...]
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
      console.warn("⚠️ GPT returned invalid JSON, attempting repair…", err.message);

      let repaired = raw.replace(/^[^{[]+/, "").replace(/[^}\]]+$/, "");
      repaired = repaired.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
      repaired = repaired.replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":');

      // ✅ save debug logs only in development
      if (process.env.NODE_ENV !== "production") {
        const debugDir = path.resolve("./debug_cases");
        if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
        const fileBase = path.join(debugDir, `${case_id}_${instance_id}`);
        fs.writeFileSync(`${fileBase}_raw.json`, raw, "utf-8");
        fs.writeFileSync(`${fileBase}_repaired.json`, repaired, "utf-8");
        console.log(`💾 Debug saved to ${fileBase}_*.json`);
      }

      try {
        parsed = JSON.parse(repaired);
        raw = repaired;
        console.log(`✅ JSON repair successful for case ${case_id} (${instance_id})`);
      } catch (err2) {
        console.error("❌ Still invalid JSON after repair:", err2.message);
        throw err2;
      }
    }

    if (parsed && "Difficulty_Level" in parsed) {
      delete parsed.Difficulty_Level;
    }

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
