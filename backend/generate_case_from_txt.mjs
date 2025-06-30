import fs from "fs";
import admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

// Load .env
dotenv.config();
const genAI = new GoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

// Firebase init
const serviceAccount = JSON.parse(fs.readFileSync("serviceAccountKey.json", "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// Load input text
const rawText = fs.readFileSync("input_case.txt", "utf8");

// Prompt Gemini to generate a structured case
async function generateCase(text) {
  const prompt = `Du er en klinisk AI. Ud fra følgende tekst skal du:
- Identificere titel på casen (kort)
- Anslå medicinsk kategori (Infektion, Kardiologi, Neurologi...)
- Fjerne alle personfølsomme oplysninger (navn, CPR, tlf, adresse)
- Returnere i JSON-format med felterne: title, category, content

Tekst:
"""${text}"""
`;

  const model = genAI.getGenerativeModel({ model: "models/gemini-pro" });
  const result = await model.generateContent(prompt);
  const output = await result.response.text();
  return JSON.parse(output);
}

const caseData = await generateCase(rawText);

// Upload to Firestore
await db.collection("cases").add({
  ...caseData,
  created_at: new Date().toISOString(),
});

console.log("✅ Case uploadet:", caseData.title);
