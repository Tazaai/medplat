// upload_cases_with_ai.mjs
import fs from "fs";
import { google } from "googleapis";
import { GoogleGenerativeAI } from "@google/generative-ai";
import admin from "firebase-admin";
import * as dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";

// 🔐 Load environment variables (Gemini API Key)
dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🔥 Firebase initialization
const serviceAccount = JSON.parse(fs.readFileSync("serviceAccountKey.json", "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
console.log("🔗 Firebase projekt ID:", serviceAccount.project_id);

// 🔑 Load OAuth2 credentials (Google Docs API access)
const token = JSON.parse(fs.readFileSync("oauth-token.json", "utf8"));
const credentials = JSON.parse(fs.readFileSync("oauth-credentials.json", "utf8")).installed;
const oAuth2Client = new OAuth2Client(credentials.client_id, credentials.client_secret);
oAuth2Client.setCredentials(token);
const docs = google.docs({ version: "v1", auth: oAuth2Client });

// 📄 Hent indhold fra Google Docs
async function getTextFromGoogleDoc(docId) {
  const doc = await docs.documents.get({ documentId: docId });
  return doc.data.body.content
    .map(e => e.paragraph?.elements?.map(el => el.textRun?.content || "").join("") || "")
    .join("\n");
}

// 🧼 Rens personfølsomme oplysninger
function cleanContent(text) {
  return text
    .replace(/\b\d{6}-\d{4}\b/g, "[CPR fjernet]")
    .replace(/\b(\+45)?\s?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}\b/g, "[Tlf fjernet]")
    .replace(/(adresse|vej|gade|allé)[^\n]{0,50}/gi, "[Adresse fjernet]")
    .replace(/(navn|patientnavn|pt\.)[: ]+[A-ZÆØÅ][a-zæøå]+/gi, "[Navn fjernet]");
}

// 🤖 Brug Gemini til at finde kategori
async function guessCategory(text) {
  const prompt = `Du er akutmediciner. Giv kun én kort kategori (fx 'Infektion', 'Kardiologi', 'Nefrologi') for denne case:\n\n${text}\n\nSvar kun med én kategori:`;
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const result = await model.generateContent(prompt);
  return (await result.response.text()).replace(/[^A-Za-zÆØÅæøå ]/g, "").trim();
}

// ⬆️ Upload én Google Doc (splittet i cases)
async function processDoc(docId) {
  const rawText = await getTextFromGoogleDoc(docId);
  const rawCases = rawText.split(/#\s*Case\s*/i).slice(1);

  console.log(`📦 Fundet ${rawCases.length} cases i dokumentet.`);

  for (const raw of rawCases) {
    const [firstLine, ...rest] = raw.trim().split("\n");
    const cleaned = cleanContent(rest.join("\n"));
    const category = await guessCategory(cleaned);

    const docData = {
      title: firstLine.trim().substring(0, 100),
      content: cleaned,
      category: category || "Ukendt",
      created_at: new Date().toISOString(),
    };

    try {
      const res = await db.collection("cases").add(docData);
      console.log(`✅ Uploadet: ${docData.title} → ${docData.category} (ID: ${res.id})`);
    } catch (err) {
      console.error("❌ Fejl ved upload til Firestore:", err.message);
    }
  }
}

// 🚀 Kør upload for alle dokumenter angivet i case_sources.json
const sources = JSON.parse(fs.readFileSync("case_sources.json", "utf8"));
for (const src of sources) {
  console.log(`🔍 Henter dokument: ${src.id}`);
  await processDoc(src.id);
}

console.log("🎉 Færdig! Alle cases er AI-sorteret og uploadet.");
