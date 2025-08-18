import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateCase(prompt, lang = "en") {
  const systemPrompt = `
You are a skilled clinical educator. 
Given a medical topic ("${prompt}"), generate a realistic patient case in the following structure:

1. 📜 Short History
2. 🩺 Objectives (3-5 findings with +++, ++, +, -)
3. 📋 Differential Diagnoses (2-3)
4. ✅ Final Diagnosis
5. 🧠 Short Pathophysiology
6. 🧪 Paraclinics
7. 💊 Treatment
8. 🧠 Conclusion

Respond strictly in valid JSON format:
{
  "history": "...",
  "objectives": [
    { "label": "...", "score": "+++" }
  ],
  "differentials": ["..."],
  "diagnosis": "...",
  "pathophysiology": "...",
  "paraclinics": ["..."],
  "treatment": "...",
  "conclusion": "..."
}
`.trim();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ],
    temperature: 0.7,
  });

  return response.choices[0].message.content;
}

export default generateCase;
