const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = require('/home/rahpodcast2022/medplat/firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const cases = JSON.parse(fs.readFileSync('firestore_cases.json', 'utf-8'));

async function upload() {
  for (const c of cases) {
    await db.collection('cases').doc(c.id).set({
      title: c.title,
      content: c.content,
      category: c.category,
      age: c.age,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`✅ Uploaded: ${c.id}`);
  }
}

upload().then(() => {
  console.log("🚀 Alle cases er uploadet!");
});
