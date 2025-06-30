import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import admin from "firebase-admin";
import fs from "fs";
dotenv.config();
const genAI = new GoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
const serviceAccount = JSON.parse(fs.readFileSync("serviceAccountKey.json", "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();


dotenv.config();


const serviceAccount = JSON.parse(fs.readFileSync("serviceAccountKey.json", "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function cleanCaseWithGemini(originalText) {
  const prompt = `Strukturer denne akut-case i følgende felter som JSON:\n
  - title
  - anamnese
  - objektiv
  - paraklinik
  - vurdering
  - plan\n
  Hvis noget mangler, skriv "".\n
  Her er teksten:\n${originalText}`;

  const result = await model.generateContent({
    contents: [{ parts: [{ text: prompt }] }]
  });

  const output = await result.response.text();
  let structured = {};
  try {
    structured = JSON.parse(output);
  } catch {
    console.warn("⚠️ Kunne ikke parse JSON – gemmer som raw text");
    structured = { text_output: output };
  }

  return {
    ...structured,
    original: originalText,
    created_at: new Date().toISOString()
  };
}

async function run() {
  const snapshot = await db.collection("cases").get();
  let count = 0;

  for (const doc of snapshot.docs) {
    const original = doc.data().content || doc.data().text || "";
    const cleaned = await cleanCaseWithGemini(original);
    await db.collection("structured_cases").doc(doc.id).set(cleaned);
    count++;
    console.log(`✅ Gemte structured case ${count}: ${doc.id}`);
  }

  console.log(`🎉 Færdig! ${count} cases gemt i 'structured_cases'`);
}

run().catch(err => {
  console.error("❌ Fejl:", err);
  process.exit(1);
});
