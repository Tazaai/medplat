import admin from "firebase-admin";
import fs from "fs";

const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

async function renameAkutToEmergencyMedicine() {
  const snapshot = await db.collection("topics").get();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.category === "Akut" || data.category === "Akut medicin") {
      await db.collection("topics").doc(doc.id).update({ category: "Emergency Medicine" });
      console.log(`Renamed ${doc.id} to Emergency Medicine`);
    }
  }
  process.exit(0);
}

renameAkutToEmergencyMedicine();
