import { getOpenAIClient } from './openaiClient.js';
const client = getOpenAIClient();

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

  // Use the project's OpenAI client shim which gracefully falls back to a noop client
  const completion = await client.chatCompletion({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate a complete structured case for topic "${topic}".` },
    ],
    response_format: { type: 'json_object' },
  });

  // Different clients return different shapes; normalize to a text payload
  const text = completion && completion.choices && completion.choices[0] && completion.choices[0].message
    ? completion.choices[0].message.content
    : completion && completion.text
    ? completion.text
    : JSON.stringify(completion);
  const parsed = JSON.parse(text);
  return parsed;
}

// Backwards compatible default export
export default generateClinicalCase;
