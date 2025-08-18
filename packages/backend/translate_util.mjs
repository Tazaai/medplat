import { Translate } from "@google-cloud/translate/build/src/v2/index.js";
import path from "path";
import { franc } from "franc";

const keyFilename = path.join(process.cwd(), "google-translate-service-account.json");
const translate = new Translate({ keyFilename });

export async function translateText(text, targetLanguage) {
  if (!targetLanguage || typeof targetLanguage !== "string") targetLanguage = "en";
  if (!text || typeof text !== "string") return text;

  // Detect source language
  let detectedLang = franc(text);
  if (detectedLang === 'und') detectedLang = 'auto';

  const toLang = targetLanguage.trim().toLowerCase();

  // Validate: only allow 2-letter codes (like "en", "da", etc.)
  if (!/^[a-z]{2}$/.test(toLang)) {
    console.warn("❗Invalid target language. Using fallback:", toLang);
    return text;
  }

  // Skip translation for English text
  if (toLang === "en" && /^[a-zA-Z0-9\s\-,.]+$/.test(text)) return text;

  try {
    const [translation] = await translate.translate(text, { from: detectedLang, to: toLang });
    return translation;
  } catch (err) {
    console.error("❌ Translation error:", err.message);
    return text;
  }
}
