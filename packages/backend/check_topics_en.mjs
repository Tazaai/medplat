import admin from "firebase-admin";
import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const checkTopics = async (collection) => {
  const snapshot = await db.collection(collection)
    .where("lang", "==", "en")
    .limit(10)
    .get();

  if (snapshot.empty) {
    console.log(`❌ No English topics found in ${collection}`);
  } else {
    console.log(`✅ Found English topics in ${collection}:`);
    snapshot.forEach(doc => {
      const d = doc.data();
      console.log(`- ${d.topic || d.name}`);
    });
  }
};

await checkTopics("topics");
await checkTopics("topics2");
