import admin from "firebase-admin";
import fs from "fs";
const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

(async () => {
  const snapshot = await db.collection("topics").get();
  let batch = db.batch();
  let count = 0;
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.category !== "Emergency Medicine") {
      batch.delete(doc.ref);
      count++;
      if (count % 450 === 0) { batch.commit(); batch = db.batch(); }
    }
  });
  await batch.commit();
  console.log(`Kun Emergency Medicine topics er tilbage.`);
  process.exit(0);
})();
