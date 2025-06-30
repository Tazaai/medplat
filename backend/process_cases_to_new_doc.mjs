import fs from "fs";
import { google } from "googleapis";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";

// Load .env
dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Load credentials
const token = JSON.parse(fs.readFileSync("oauth-token.json", "utf8"));
const credentials = JSON.parse(fs.readFileSync("oauth-credentials.json", "utf8")).installed;
const oAuth2Client = new OAuth2Client(credentials.client_id, credentials.client_secret);
oAuth2Client.setCredentials(token);

// Google Docs clients
const docs = google.docs({ version: "v1", auth: oAuth2Client });
const drive = google.drive({ version: "v3", auth: oAuth2Client });

// Read document ID from case_sources.json
const sources = JSON.parse(fs.readFileSync("case_sources.json", "utf8"));
const docId = sources[0].id;

// Step 1: Read original doc
async function getOriginalText(docId) {
  const doc = await docs.documents.get({ documentId: docId });
  return doc.data.body.content
    .map(e => e.paragraph?.elements?.map(el => el.textRun?.content || "").join("") || "")
    .join("\n");
}

// Step 2: Clean + reformat with Gemini
async function generateCasesAI(rawText) {
  const prompt = `Du er en lægeassistent. Opdel denne tekst i kliniske # Case-formater, fjern CPR, navne, adresser og telefonnumre, og strukturer teksten klar til journalføring:\n\n${rawText}`;
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const result = await model.generateContent(prompt);
  return (await result.response.text()).trim();
}

// Step 3: Create new Google Doc
async function createNewDoc(title, content) {
  const newDoc = await docs.documents.create({
    requestBody: { title }
  });
  const docId = newDoc.data.documentId;

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [
        {
          insertText: {
            text: content,
            location: { index: 1 }
          }
        }
      ]
    }
  });

  console.log(`✅ Ny Google Doc oprettet: https://docs.google.com/document/d/${docId}/edit`);
}

(async () => {
  console.log("📥 Læser originalt dokument...");
  const originalText = await getOriginalText(docId);

  console.log("🤖 Bruger Gemini til at formatere tekst...");
  const aiOutput = await generateCasesAI(originalText);

  console.log("📄 Skriver til ny Google Doc...");
  await createNewDoc("Processed Cases – Auto AI", aiOutput);
})();
