import fs from "fs";
import admin from "firebase-admin";

// Indlæs Firebase service account
const serviceAccount = JSON.parse(fs.readFileSync("serviceAccountKey.json", "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// Indsæt test-dokument i 'cases' collection
const testDoc = {
  title: "Test case",
  content: "Dette er en test-case for at oprette samlingen.",
  category: "Test",
  created_at: new Date().toISOString(),
};

async function init() {
  await db.collection("cases").add(testDoc);
  console.log("✅ Collection 'cases' og første dokument oprettet.");
}

init();
