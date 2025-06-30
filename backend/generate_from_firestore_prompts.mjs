import admin from "firebase-admin";
import fs from "fs";
import { execSync } from "child_process";
import dotenv from "dotenv";
dotenv.config();

const serviceAccount = JSON.parse(fs.readFileSync("serviceAccountKey.json", "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const snapshot = await db.collection("acut cases").doc("s1ee8HuSWwLjVvUJeEQg").get();
const promptText = snapshot.data()?.content || "";

const prompts = promptText
  .split(/^\d+\.\s+/gm) // split ved "1. ", "2. ", ...
  .map(p => p.trim())
  .filter(p => p.length > 10);

for (const prompt of prompts.slice(0, 20)) {  // 💡 Begræns til 20 i første omgang
  const safePrompt = prompt.replace(/"/g, '\"');
  console.log("🧠 Genererer:", prompt);
  execSync(`node generate_cases.mjs "${safePrompt}"`, { stdio: "inherit" });
}
