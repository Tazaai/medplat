import admin from "firebase-admin";
import fs from "fs";

// Load your service account
const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

// ==== Add/Update cases here ====
const cases = [
  // Akut with subcategories
  {
    id: "case_043",
    category: "Akut",
    subcategory: "Infektion",
    topic: "Sepsis"
  },
  {
    id: "case_044",
    category: "Akut",
    subcategory: "Ortopædi",
    topic: "Akut hoftefraktur"
  },
  // Specialties without subcategory
  {
    id: "cardio_003",
    category: "Cardiology",
    topic: "Atrieflimren"
  },
  {
    id: "neuro_002",
    category: "Neurology",
    topic: "Stroke"
  },
  {
    id: "onko_002",
    category: "Onkologi",
    topic: "Coloncancer"
  },
];

// Push to Firestore
async function main() {
  for (const c of cases) {
    await db.collection("topics").doc(c.id).set(c);
    console.log("Added:", c.id);
  }
  process.exit(0);
}

main();
