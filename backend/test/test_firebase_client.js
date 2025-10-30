const assert = require('assert');
const { initFirebase } = require('../firebaseClient');

(async () => {
  console.log('Running firebaseClient no-op tests...');
  const client = initFirebase();
  assert(client, 'initFirebase must return an object');
  const fs = client.firestore;
  assert(fs && typeof fs.collection === 'function', 'firestore.collection should be a function');
  const col = fs.collection('test');
  const d = col.doc('id1');
  const got = await d.get();
  assert(typeof got.exists === 'boolean', 'doc.get should return object with exists');
  const addRes = await col.add({ foo: 'bar' });
  assert(addRes && addRes.id, 'collection.add should return an id');
  console.log('✅ firebaseClient no-op tests passed');
})();
