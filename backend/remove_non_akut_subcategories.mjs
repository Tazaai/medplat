import admin from "firebase-admin";
import fs from "fs";

const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

async function removeNonAkutSubcategories() {
  const snapshot = await db.collection("topics").get();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.category !== "Akut" && data.subcategory) {
      // Fjern subcategory fra ikke-Akut
      const { subcategory, ...rest } = data;
      await db.collection("topics").doc(doc.id).set(rest, { merge: false });
      console.log(`Removed subcategory from: ${doc.id}`);
    }
  }
  process.exit(0);
}

removeNonAkutSubcategories();
