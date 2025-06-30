import * as dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const prompts = [
  "Lav en akutmedicinsk case om blødningsforstyrrelser",
  "Lav en akutmedicinsk case om forgiftning med opiater"
];

for (const prompt of prompts) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.choices[0].message.content;
    const filename = `./cases/${prompt.replace(/\s+/g, '_')}.txt`;
    fs.writeFileSync(filename, text);
    console.log(`✅ Gemte case: ${filename}`);
  } catch (err) {
    console.error(`❌ Fejl ved: ${prompt}`, err);
  }
}
