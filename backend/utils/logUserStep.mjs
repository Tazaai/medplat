// ~/medplat/backend/utils/logUserStep.mjs
import db from "../firebaseClient.js";

/**
 * Recursively remove properties with value === undefined
 */
function stripUndefined(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = stripUndefined(v);
  }
  return out;
}

/**
 * Log a single user step (answer + score) during gamification
 * Fields that are undefined are removed before writing to Firestore.
 * Numeric fields (level, step, score) are normalized to numbers or null.
 *
 * @param {Object} params
 * @param {string} params.userId - Firebase user ID (or "anonymous")
 * @param {string} params.caseId - Case identifier (e.g., case_078)
 * @param {number} [params.level] - Level number (e.g., 2). Optional.
 * @param {number} [params.step] - Step index within the case. Optional.
 * @param {string} [params.question] - Prompt/question text. Optional.
 * @param {string} [params.selected] - The option selected by the user. Optional.
 * @param {number} [params.score] - Score (3/1/0 or other). Optional.
 * @param {string} [params.language="en"] - User language.
 */
export async function logUserStep({
  userId,
  caseId,
  level,
  step,
  question,
  selected,
  score,
  language = "en",
} = {}) {
  try {
    const entry = {
      userId: userId || "anonymous",
      caseId: caseId || "unknown",
      level: Number.isFinite(level) ? level : null,
      step: Number.isFinite(step) ? step : null,
      question: question ?? null,
      selected: selected ?? null,
      score: Number.isFinite(score) ? score : null,
      language: language || "en",
      timestamp: new Date().toISOString(),
    };

    const clean = stripUndefined(entry); // remove any undefined values (nested-safe)

    await db.collection("user_scores").add(clean);
    console.log(
      `✅ Score logged: ${clean.userId} – ${clean.caseId} [L${clean.level ?? "?"} S${clean.step ?? "?"}]`
    );
  } catch (err) {
    console.error("❌ Failed to log user step:", err?.message || err);
  }
}

export default { logUserStep };
