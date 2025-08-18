// ~/medplat/backend/fix_topics_lang.mjs
import { db } from "./firebaseClient.js";

/**
 * Normalize { id, topic, category, lang } for both 'topics2' and 'topics'.
 * - Ensures lang exists (default "en")
 * - Ensures id is normalized snake_case of topic if missing/wrong
 */
function normId(s = "") {
  return s
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "");
}

async function fixCollection(name) {
  const snap = await db.collection(name).get();
  let count = 0;

  for (const doc of snap.docs) {
    const d = doc.data() || {};
    const updates = {};

    if (!d.lang) updates.lang = "en";
    if (!d.topic || !d.category) continue; // skip unusable docs

    const expectedId = normId(d.topic);
    if (!d.id || d.id.startsWith("case_") || d.id !== expectedId) {
      updates.id = expectedId;
    }

    if (Object.keys(updates).length) {
      await doc.ref.set({ ...d, ...updates }, { merge: true });
      count++;
      console.log(`✅ ${name}/${doc.id} →`, updates);
    }
  }

  console.log(`Done: ${name} fixed ${count} documents.`);
}

(async function run() {
  await fixCollection("topics2");
  await fixCollection("topics");
  process.exit(0);
})().catch((e) => {
  console.error("❌ fix_topics_lang failed:", e);
  process.exit(1);
});
