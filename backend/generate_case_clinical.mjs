import OpenAI from 'openai';

export async function generateClinicalCase({ topic, model = 'gpt-4o-mini', lang = 'en' }) {
  // Initialize the official OpenAI client using the runtime secret
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const systemPrompt = `You are a medical expert and clinical case builder.\nGenerate a concise but realistic clinical case for topic: "${topic}".\nReturn in structured JSON format:\n{\n  \"meta\": { \"topic\": \"\", \"age\": \"\", \"sex\": \"\", \"setting\": \"\" },\n  \"history\": \"\",\n  \"exam\": \"\",\n  \"labs\": \"\",\n  \"imaging\": \"\",\n  \"diagnosis\": \"\",\n  \"discussion\": \"\"\n}\nLanguage: ${lang}.\nKeep tone realistic and educational.`;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate a complete structured case for topic "${topic}".` },
      ],
      temperature: 0.7,
    });

    // Normalize response text across SDK shapes
    const text = response?.choices?.[0]?.message?.content ?? response?.choices?.[0]?.text ?? JSON.stringify(response);

    // Try to parse JSON output from the model
    try {
      const parsed = JSON.parse(text);
      return parsed;
    } catch (parseErr) {
      console.warn('generateClinicalCase: OpenAI returned non-JSON, returning fallback structure', parseErr && parseErr.message);
      return {
        meta: { topic },
        history: String(text),
        exam: '',
        labs: '',
        imaging: '',
        diagnosis: '',
        discussion: '',
      };
    }
  } catch (err) {
    // Network/auth/parsing errors should not crash the endpoint — log and return a stable fallback
    console.error('⚠️ OpenAI error or parse failure:', err && err.message ? err.message : String(err));
    return {
      ok: false,
      error: err && err.message ? err.message : String(err),
      case: {
        meta: { topic },
        history: 'stub (OpenAI call failed or invalid JSON)',
        exam: '',
        labs: '',
        imaging: '',
        diagnosis: '',
        discussion: '',
      },
    };
  }
}

// Backwards compatible default export
export default generateClinicalCase;
