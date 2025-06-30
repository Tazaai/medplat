import admin from 'firebase-admin';
import { Translate } from '@google-cloud/translate').v2;
import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const translate = new Translate();

async function translateCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.name && data.lang !== 'en') {
      const [translated] = await translate.translate(data.name, 'en');
      await doc.ref.update({ name: translated, lang: 'en' });
      console.log(`✅ ${collectionName}/${doc.id} → "${data.name}" → "${translated}"`);
    }
  }
}

await translateCollection('topics');
await translateCollection('topics2');

console.log('🎉 Done translating all topics to English.');
