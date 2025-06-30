import express from 'express';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import OpenAI from 'openai';

// Init
initializeApp({ credential: applicationDefault() });
const db = getFirestore();
const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: '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',
});

// POST /api/comment
app.post('/api/comment', async (req, res) => {
  const { caseId, userComment } = req.body;

  if (!caseId || !userComment) {
    return res.status(400).json({ error: 'caseId og userComment er påkrævet' });
  }

  try {
    // 🔍 Generér AI-svar
    const prompt = `En bruger har skrevet følgende kommentar til en akutmedicinsk case:\n\n"${userComment}"\n\nSkriv et kort, klinisk AI-svar (maks 5 linjer).`;

    const aiRes = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
    });

    const aiReply = aiRes.choices[0].message.content;

    // 💾 Gem i Firestore
    await db.collection('case_feedback').add({
      caseId,
      userComment,
      aiReply,
      timestamp: FieldValue.serverTimestamp(),
    });

    res.json({ aiReply });
  } catch (err) {
    console.error('❌ Fejl i /api/comment:', err.message);
    res.status(500).json({ error: 'Serverfejl' });
  }
});

// Start server
app.listen(3000, () => {
  console.log('🚀 API klar på http://localhost:3000/api/comment');
});
