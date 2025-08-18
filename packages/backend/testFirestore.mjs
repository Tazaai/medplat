import admin from "firebase-admin";
import fs from "fs";

const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

const snapshot = await db.collection("topics").where("category", "==", "Emergency Medicine").get();
const results = snapshot.docs.map(doc => doc.data());
console.log("Found topics:", results.map(x => x.subcategory));
