import { Translate } from "@google-cloud/translate/build/src/v2/index.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const translator = new Translate({
  keyFilename: path.join(__dirname, "../serviceAccountKey.json")
});

export async function translateText(text, targetLanguage) {
  if (!text || !targetLanguage) return text;
  try {
    const [translation] = await translator.translate(text, targetLanguage);
    return translation;
  } catch (err) {
    console.error("❌ Translation error:", err);
    return text;
  }
}
