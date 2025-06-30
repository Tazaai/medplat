import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import OpenAI from 'openai';

// Init Firebase & OpenAI
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const openai = new OpenAI({
  apiKey: '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',
});

async function generateReply(commentText) {
  const prompt = `En bruger har skrevet følgende kommentar til en akutmedicinsk case:\n\n"${commentText}"\n\nSkriv et kort, klinisk og fagligt AI-svar (maks 5 linjer).`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
  });

  return response.choices[0].message.content;
}

async function processComments() {
  const snapshot = await db.collection('case_feedback').get();

  for (const doc of snapshot.docs) {
    const data = doc.data();

    if (!data.aiReply && data.userComment) {
      const commentText = data.userComment;
      console.log(`📨 Behandler kommentar: "${commentText}"`);

      try {
        const reply = await generateReply(commentText);
        await doc.ref.update({ aiReply: reply });
        console.log(`🤖 Svar gemt:\n${reply}\n`);
      } catch (err) {
        console.error(`❌ Fejl: ${err.message}`);
      }

      await new Promise(r => setTimeout(r, 2000)); // undgå rate limit
    }
  }
}

processComments();
