import admin from "firebase-admin";
import fs from "fs";
const serviceAccount = JSON.parse(fs.readFileSync("serviceAccountKey.json", "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

await db.collection("topics").add({
  title: "Hyperkaliæmi med EKG-ændringer",
  prompt: "Lav en akutmedicinsk case om en patient med svær hyperkaliæmi og EKG‐forandringer",
  created_at: new Date().toISOString(),
  source: "prompt"
});

console.log("✅ Tilføjet topic");
process.exit(0);
