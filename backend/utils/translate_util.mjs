// ~/medplat/backend/utils/translate_util.mjs
// 🚫 Google Translate removed.
// ✅ Stub kept to avoid breaking old imports.
// If something calls translate(), it just returns the input unchanged.

export async function translate(text, targetLang) {
  console.warn("[translate_util] Deprecated call — returning original text");
  return text;
}
