// ~/medplat/backend/utils/translate_util.mjs
import fetch from "node-fetch";

/**
 * Translate arbitrary text to target language (ISO code or English name).
 * Gracefully falls back to the original text if the API key is missing or a call fails.
 *
 * @param {string} text
 * @param {string} targetLang - e.g., "English" or "en", "Danish" or "da"
 * @returns {Promise<string>}
 */
export async function translateText(text = "", targetLang = "English") {
  try {
    const key = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!key) return text;

    // Accept "English" or "en"
    const tl = (targetLang || "en").toString().slice(0, 2).toLowerCase();

    const res = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, target: tl })
      }
    );

    const data = await res.json();
    const out = data?.data?.translations?.[0]?.translatedText;
    return typeof out === "string" && out.length ? out : text;
  } catch (err) {
    console.warn("translateText fallback:", err?.message || err);
    return text;
  }
}

export default { translateText };

