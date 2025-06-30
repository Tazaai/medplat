import admin from "firebase-admin";
import { Translate } from "@google-cloud/translate/build/src/v2/index.js";
import path from "path";
import fs from "fs";

// Init service account for Firestore
const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Init Google Translate API
const keyFilename = path.join(process.cwd(), "google-translate-service-account.json");
const translate = new Translate({ keyFilename });

async function translateText(text, targetLanguage = "en") {
  if (!text || typeof text !== "string") return text;
  if (targetLanguage === "en" && /^[a-zA-Z0-9\s\-,.]+$/.test(text)) return text;
  try {
    const [translation] = await translate.translate(text, targetLanguage);
    return translation;
  } catch (err) {
    console.error("Translation error:", err);
    return text;
  }
}

async function updateAllCategories() {
  const snapshot = await db.collection("topics").get();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    let updated = false;

    // Translate only if not already English
    if (data.category) {
      const enCategory = await translateText(data.category, "en");
      if (enCategory !== data.category) {
        data.category = enCategory;
        updated = true;
      }
    }
    if (data.subcategory) {
      const enSubcategory = await translateText(data.subcategory, "en");
      if (enSubcategory !== data.subcategory) {
        data.subcategory = enSubcategory;
        updated = true;
      }
    }
    if (data.topic) {
      const enTopic = await translateText(data.topic, "en");
      if (enTopic !== data.topic) {
        data.topic = enTopic;
        updated = true;
      }
    }

    if (updated) {
      await doc.ref.update(data);
      console.log(`Updated: ${doc.id}`);
    }
  }
  console.log("All categories translated to English!");
}

// Run script
updateAllCategories().then(() => process.exit());
