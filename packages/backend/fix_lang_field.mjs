import admin from "firebase-admin";
import fs from "fs";

const serviceAccount = JSON.parse(fs.readFileSync("serviceAccountKey.json", "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function addLangFieldToCollections() {
  const collections = ["topics", "topics2"];

  for (const col of collections) {
    const snapshot = await db.collection(col).get();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (!data.lang) {
        await doc.ref.update({ lang: "da" });
        console.log(`✅ Updated ${col}/${doc.id} with lang: "da"`);
      }
    }
  }

  console.log("✅ Done updating lang fields.");
}

addLangFieldToCollections().catch(err => console.error("❌ Error:", err));
