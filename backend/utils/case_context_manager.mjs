// Case Context Manager - Stores and manages incremental case generation
// Uses Firestore to persist case state by caseId

import { db } from '../firebaseClient.js';

/**
 * Get case by caseId
 */
export async function getCase(caseId) {
  try {
    const doc = await db.collection('cases').doc(caseId).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('[CASE_CONTEXT] Error getting case:', error);
    throw error;
  }
}

/**
 * Save or update case by caseId
 */
export async function saveCase(caseId, caseData) {
  try {
    const dataWithTimestamp = {
      ...caseData,
      updatedAt: new Date().toISOString(),
    };
    await db.collection('cases').doc(caseId).set(dataWithTimestamp, { merge: true });
    return { id: caseId, ...dataWithTimestamp };
  } catch (error) {
    console.error('[CASE_CONTEXT] Error saving case:', error);
    throw error;
  }
}

/**
 * Update specific fields in case
 * Caching: If a field already exists and has content, skip updating it (return cached value)
 */
export async function updateCaseFields(caseId, fields) {
  try {
    // Get existing case to check for cached fields
    const existingCase = await getCase(caseId);
    if (!existingCase) {
      throw new Error('Case not found');
    }

    // Cache check: Only update fields that are missing or empty
    const fieldsToUpdate = {};
    const cacheableFields = ['teaching', 'deepEvidence', 'pathophysiology', 'expertConference', 'expert_conference', 'stability', 'risk', 'consistency'];
    
    for (const [key, value] of Object.entries(fields)) {
      // For cacheable fields, check if existing value is already present
      if (cacheableFields.includes(key)) {
        const existingValue = existingCase[key];
        if (existingValue && typeof existingValue === 'string' && existingValue.trim().length > 0) {
          console.log(`[CASE_CONTEXT] Cache hit for field: ${key}, skipping update`);
          continue; // Skip this field - use cached value
        }
      }
      // For non-cacheable fields or empty cacheable fields, include in update
      fieldsToUpdate[key] = value;
    }

    // If no fields to update (all cached), return existing case
    if (Object.keys(fieldsToUpdate).length === 0) {
      console.log('[CASE_CONTEXT] All fields cached, returning existing case');
      return existingCase;
    }

    const updateData = {
      ...fieldsToUpdate,
      updatedAt: new Date().toISOString(),
    };
    await db.collection('cases').doc(caseId).set(updateData, { merge: true });
    const updated = await getCase(caseId);
    return updated;
  } catch (error) {
    console.error('[CASE_CONTEXT] Error updating case fields:', error);
    throw error;
  }
}

/**
 * Generate new caseId
 */
export function generateCaseId() {
  return `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
