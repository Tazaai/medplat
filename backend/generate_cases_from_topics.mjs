import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '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',
});

// Init Firebase
initializeApp({
  credential: applicationDefault(),
});

const db = getFirestore();

function buildPrompt(topic, level) {
  return `Lav en **Level ${level}** akutmedicinsk patient-case for emnet: "${topic}".

Level 1 = Simpel og stabil patient, én tydelig diagnose, normal paraklinik.
Level 2 = Moderat kompleks, let påvirket ABC, komorbiditet, lette parakliniske afvigelser.
Level 3 = Kritisk og ustabil patient, flere samtidige problemstillinger, svær paraklinik, etiske eller tidskritiske beslutninger.

Beskriv venligst:
- Symptomer
- Objektive fund
- Initial vurdering
- Parakliniske fund (blodprøver, CT, UL, røntgen)
- Diagnoseforslag
- Behandlingsplan`;
}

async function generateCaseFromTopic(topic, level) {
  const prompt = buildPrompt(topic, level);

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  return response.choices[0].message.content;
}

async function main() {
  const snapshot = await db.collection('topics').limit(2).get(); // Begræns til 2 for test

  for (const doc of snapshot.docs) {
    const topic = doc.data().topic;

    const selectedLevel = 3; // Juster til 1, 2 eller 3

    console.log(`\n🧠 Topic: ${topic} (Level ${selectedLevel})`);

    try {
      const caseText = await generateCaseFromTopic(topic, selectedLevel);
      console.log(`📋 Case:\n${caseText}`);
    } catch (err) {
      console.error(`❌ Fejl ved emne: ${topic}`, err.message);
    }

    await new Promise(r => setTimeout(r, 2000));
  }
}

main();
