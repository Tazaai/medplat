import fetch from "node-fetch";

export async function translate(text, targetLang) {
  const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text, target: targetLang }),
  });
  const data = await res.json();
  return data.data.translations[0].translatedText;
}
