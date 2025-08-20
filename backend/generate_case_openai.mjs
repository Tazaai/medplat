// ~/medplat/backend/generate_case_openai.mjs
import openai from "./routes/openai_client.js";
import { translateText } from "./utils/translate_util.mjs";

export default async function generateCase({ area, topic, language, niveau, model = "gpt-4o-mini" }) {
  // 🧠 Normalize topic input
  if (typeof topic === "object" && topic?.topic) {
    topic = topic.topic;
  }

  if (typeof topic !== "string" || !topic.trim()) {
    throw new Error("Invalid topic");
  }

  const systemPrompt = `You are an expert medical AI that generates structured clinical cases for training.`.trim();

  const userPrompt = `
Generate a clinical case focused **only on** the topic: "${topic}".
Medical Area: ${area}
Level: ${niveau}
Language: ${language}

Include the following sections:
I. Short History  
II. Objectives  
III. Paraclinic  
IV. Differential Diagnoses  
V. Diagnosis  
VI. Short Pathophysiology  
VII. Conclusion and Short Discussion
`.trim();

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    let caseText = completion?.choices?.[0]?.message?.content || "⚠️ No case generated";

    if (language.toLowerCase() !== "english") {
      caseText = await translateText(caseText, language);
    }

    return caseText;
  } catch (err) {
    console.error("❌ generateCase error:", err);
    return `⚠️ Error generating case: ${err.message || "Unknown error"}`;
  }
}
