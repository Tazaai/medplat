import admin from 'firebase-admin';
import pkg from '@google-cloud/translate';
const { v2: { Translate } } = pkg;
import serviceAccount from './serviceAccountKey.json' with { type: 'json' };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const translate = new Translate();

async function translateField(text) {
  if (!text || typeof text !== 'string') return text;
  const [translated] = await translate.translate(text, 'en');
  return translated;
}

async function translateCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  console.log(`📁 Translating ${collectionName}...`);

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.lang === 'en') continue;

    const updated = {
      ...data,
      lang: 'en',
      topic: await translateField(data.topic),
    };

    if (data.category) updated.category = await translateField(data.category);
    if (data.subcategory) updated.subcategory = await translateField(data.subcategory);

    await doc.ref.update(updated);
    console.log(`✅ ${collectionName}/${doc.id} translated`);
  }
}

await translateCollection('topics');
await translateCollection('topics2');

console.log('🎉 Done translating and updating all topics to English.');
