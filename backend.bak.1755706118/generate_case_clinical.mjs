// ~/medplat/backend/generate_case_clinical.mjs
import openai from "./routes/openai_client.js";
import { translateText } from "./utils/translate_util.mjs";

export default async function generateCase({ area, topic, language, model = "gpt-4o-mini" }) {
  if (typeof topic === "object" && topic?.topic) topic = topic.topic;
  if (typeof topic !== "string" || !topic.trim()) throw new Error("Invalid topic input");

  const systemPrompt = `
You are a multidisciplinary panel of senior doctors (internal medicine, surgery, emergency, ICU, GP) and medical educators. 
Your role is to **generate dynamic, realistic clinical cases** for teaching. 
- Output MUST be valid JSON only. 
- Never use markdown, backticks, or extra text. 
- Cases should feel natural and reasoning-driven, not templated.
`.trim();

  const userPrompt = `
Generate a structured clinical case for the topic: "${topic}".
Area: ${area}
Language: ${language}

The case should progress step by step with authentic reasoning. 
Include variability, avoid repeating stock phrases, and reflect uncertainty when appropriate.
Each section must be realistic and cohesive.
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

    let reply = completion.choices[0]?.message?.content?.trim();
    if (!reply) throw new Error("Empty response from OpenAI");

    // 🌍 Translate if not English
    if (language.toLowerCase() !== "english" && language.toLowerCase() !== "en") {
      try {
        reply = await translateText(reply, language);
      } catch (err) {
        console.warn("Translation failed:", err);
      }
    }

    return reply;
  } catch (err) {
    console.error("❌ generate_case_clinical error:", err);
    throw err;
  }
}
