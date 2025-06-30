import { Configuration, OpenAIApi } from "openai";
import dotenv from "dotenv";
dotenv.config();

// ✅ Initialize OpenAI securely
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// ✅ Main generator function
export async function generateCase(prompt, lang = "da") {
  const systemPrompt = `
Du er en erfaren dansk klinisk underviser.
Givet et emne eller sygdom ("${prompt}"), generér en patienthistorie og alle relaterede dele i følgende struktur:
1. 📜 Anamnese (kort patienthistorie)
2. 🩺 Objektive fund (3-5 relevante med vigtighed +++, ++, +, -)
3. 📋 Differentialdiagnoser (2-3 mulige)
4. ✅ Diagnose (en konkluderende diagnose)
5. 🧪 Paraklinik (relevante tests som blodprøver, billeddiagnostik)
6. 💊 Behandling (kort behandlingstiltag)
7. 🧠 Konklusion (samlet vurdering af patientens forløb)

Svar **udelukkende på dansk** i **gyldig JSON**:
{
  "history": "...",
  "objectives": [
    { "label": "...", "score": "+++" },
    { "label": "...", "score": "+" }
  ],
  "differentials": ["...", "..."],
  "diagnosis": "...",
  "paraclinics": ["...", "..."],
  "treatment": "...",
  "conclusion": "..."
}
  `.trim();

  const response = await openai.createChatCompletion({
    model: "gpt-4",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ],
    temperature: 0.7,
  });

  // ✅ Return only the raw text (stringified JSON)
  return response.data.choices[0].message.content;
}
