import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateClinicalCase({ topic, model = "gpt-4o-mini", lang = "en" }) {
  const systemPrompt = `
You are a medical expert and clinical case builder.
Generate a concise but realistic clinical case for topic: "${topic}".
Return in structured JSON format:
{
  "meta": { "topic": "", "age": "", "sex": "", "setting": "" },
  "history": "",
  "exam": "",
  "labs": "",
  "imaging": "",
  "diagnosis": "",
  "discussion": ""
}
Language: ${lang}.
Keep tone realistic and educational.
`;

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Generate a complete structured case for topic "${topic}".` },
    ],
  });

  const text = completion.choices[0].message.content;
  const parsed = JSON.parse(text);
  return parsed;
}

// Backwards compatible default export
export default generateClinicalCase;
