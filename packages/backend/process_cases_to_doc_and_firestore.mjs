import fs from "fs";
import { google } from "googleapis";
import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
import admin from "firebase-admin";

// Load env
dotenv.config();

// OAuth credentials
const token = JSON.parse(fs.readFileSync("oauth-token.json", "utf8"));
const credentials = JSON.parse(fs.readFileSync("oauth-credentials.json", "utf8")).installed;
const oAuth2Client = new OAuth2Client(credentials.client_id, credentials.client_secret);
oAuth2Client.setCredentials(token);

// Firebase init
const serviceAccount = JSON.parse(fs.readFileSync("serviceAccountKey.json", "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// Google APIs
const docs = google.docs({ version: "v1", auth: oAuth2Client });

// 1. Read document
const sources = JSON.parse(fs.readFileSync("case_sources.json", "utf8"));
const docId = sources[0].id;

async function getOriginalText(docId) {
  const doc = await docs.documents.get({ documentId: docId });
  return doc.data.body.content
    .map(e => e.paragraph?.elements?.map(el => el.textRun?.content || "").join("") || "")
    .join("\n");
}

// 2. Gemini cleans + structures
  const model = genAI.getGenerativeModel({ model: "models/gemini-pro" });
async function generateCasesAI(rawText) {
  const prompt = `Du er en AI-klinikassistent. Opdel denne tekst i separate # Case-sektioner og fjern personfølsomme data (CPR, navne, adresser, tlf). Formatér som ren tekst:\n\n${rawText}`;
  const result = await model.generateContent(prompt);
  return (await result.response.text()).trim();
}

// 3. Create new Google Doc
async function createNewDoc(title, content) {
  const newDoc = await docs.documents.create({ requestBody: { title } });
  const docId = newDoc.data.documentId;
  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: [{
      insertText: {
        text: content,
        location: { index: 1 }
      }
    }]
  });
  console.log(`📄 Ny Google Doc oprettet: https://docs.google.com/document/d/${docId}/edit`);
}

// 4. Upload cases to Firestore
async function uploadCasesToFirestore(text) {
  const rawCases = text.split(/#\s*Case\s*/i).map(c => c.trim()).filter(c => c.length > 10);

  console.log(`📦 Uploading ${rawCases.length} cases to Firestore...`);
  for (const raw of rawCases) {
    const [firstLine, ...rest] = raw.split("\n");
    const docData = {
      title: firstLine.trim().substring(0, 100),
      content: raw,
      category: "Ukendt", // AI kategori kan tilføjes senere
      created_at: new Date().toISOString(),
    };

    try {
      const res = await db.collection("cases").add(docData);
      console.log(`✅ Uploadet: ${docData.title} (ID: ${res.id})`);
    } catch (err) {
      console.error("❌ Firestore-fejl:", err.message);
    }
  }
}

(async () => {
  console.log("📥 Læser dokument...");
  const original = await getOriginalText(docId);

  console.log("🤖 Kører AI-rens...");
  const aiOutput = await generateCasesAI(original);

  console.log("📄 Skriver til ny Google Doc...");
  await createNewDoc("Processed + Uploaded Cases", aiOutput);

  console.log("🔥 Uploader til Firestore...");
  await uploadCasesToFirestore(aiOutput);

  console.log("🎉 Færdig! Alt uploadet og gemt.");
})();
