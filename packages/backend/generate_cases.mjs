// generate_cases.mjs
import fs from "fs";
import admin from "firebase-admin";
import { VertexAI } from "@google-cloud/vertexai";
import serviceAccount from "./your-service-account.json" assert { type: "json" };

// 🔐 Init Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// 📂 Load prompts
const prompts = JSON.parse(fs.readFileSync("prompts.json", "utf8"));

// 🤖 Init Vertex AI
const vertex_ai = new VertexAI({
  project: "medplat-458911",
  location: "us-central1",
});
const model = vertex_ai.getGenerativeModel({
  model: "projects/medplat-458911/locations/us-central1/publishers/google/models/chat-bison",
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 2048,
  },
});

async function generateCases() {
  let count = 0;
  for (const topic of prompts) {
    try {
      const prompt = topic.prompt;
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || "[Tomt svar]";

      await db.collection("ai_generated_cases").add({
        topic,
        case_text: text,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ Genereret case for: ${topic.title}`);
      count++;
    } catch (err) {
      console.error(`❌ Fejl ved: ${topic.title}`, err.message);
    }
  }
  console.log(`\n🎉 Færdig: ${count} cases genereret og uploadet!`);
}

generateCases();
