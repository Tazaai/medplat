import fs from 'fs';
import admin from 'firebase-admin';

const raw = fs.readFileSync('./anonymiserede_cases.json', 'utf8');
const allCases = JSON.parse(raw);

// Firebase init
const serviceAccount = JSON.parse(fs.readFileSync('serviceAccountKey.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function uploadInChunks(data, chunkSize = 25) {
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    const uploads = chunk.map(entry => {
      return db.collection('cases').add({
        ...entry,
        created_at: new Date().toISOString()
      });
    });
    await Promise.all(uploads);
    console.log(`✅ Uploaded ${i + chunk.length} of ${data.length}`);
  }
}

uploadInChunks(allCases).then(() => {
  console.log('🎉 Færdig!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Fejl:', err);
  process.exit(1);
});
