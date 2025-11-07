// ~/medplat/backend/utils/logUserStep.mjs
import admin from 'firebase-admin';

/**
 * Log a user's quiz step to Firestore
 * @param {string} caseId - The case identifier
 * @param {number} stepIndex - The step/question index (0-11)
 * @param {string} answer - The user's selected answer
 * @param {boolean} correct - Whether the answer was correct
 * @param {number} points - Points awarded (0-3)
 */
export async function logUserStep(caseId, stepIndex, answer, correct, points) {
  try {
    if (!admin.apps.length) {
      console.warn('Firebase not initialized, skipping logUserStep');
      return;
    }

    const db = admin.firestore();
    const logEntry = {
      caseId,
      stepIndex,
      answer,
      correct,
      points,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('quiz_logs').add(logEntry);
    console.log(`✅ Logged step ${stepIndex} for case ${caseId}: ${correct ? 'correct' : 'incorrect'} (${points} pts)`);
  } catch (error) {
    console.error('⚠️ Failed to log user step:', error.message);
    // Don't throw - logging failures shouldn't break the quiz flow
  }
}
