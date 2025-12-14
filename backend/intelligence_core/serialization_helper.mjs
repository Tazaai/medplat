// backend/intelligence_core/serialization_helper.mjs
// Universal serialization helper to prevent [object Object] bugs everywhere

import { validateMedication, serializeMedication, serializeMedications } from './schemas/medication_schema.mjs';
import { validateGuideline, serializeGuideline, serializeGuidelines } from './schemas/guideline_schema.mjs';

/**
 * Serialize any value to a safe string representation
 * Prevents [object Object] bugs by always returning strings
 */
export function serializeValue(value) {
  if (value === null || value === undefined) return "";
  
  // Handle arrays
  if (Array.isArray(value)) {
    const serialized = value.map(item => serializeValue(item)).filter(Boolean);
    return serialized.length > 0 ? serialized.join("\n\n") : "";
  }
  
  // Handle objects - try known schemas first
  if (typeof value === 'object') {
    // Try medication schema
    const medSerialized = serializeMedication(value);
    if (medSerialized) return medSerialized;
    
    // Try guideline schema
    const guidelineSerialized = serializeGuideline(value);
    if (guidelineSerialized) return guidelineSerialized;
    
    // Try to extract common patterns
    if (value.name || value.title) {
      let result = String(value.name || value.title);
      if (value.description) result += `: ${value.description}`;
      if (value.year) result += ` (${value.year})`;
      return result;
    }
    
    // Last resort: formatted JSON (better than [object Object])
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  
  // Handle primitives
  return String(value);
}

/**
 * Recursively serialize all values in an object/array
 * Use this to clean case data before sending to frontend
 */
export function serializeForDisplay(data) {
  if (data === null || data === undefined) return "";
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => serializeForDisplay(item)).filter(Boolean);
  }
  
  // Handle objects
  if (typeof data === 'object') {
    const serialized = {};
    for (const [key, value] of Object.entries(data)) {
      const serializedValue = serializeForDisplay(value);
      // Only include non-empty values
      if (serializedValue !== "" && serializedValue !== null && serializedValue !== undefined) {
        serialized[key] = serializedValue;
      }
    }
    return serialized;
  }
  
  // Handle primitives
  return data;
}

/**
 * Clean case data by serializing all object fields
 * This should be called before returning case data to frontend
 */
export function cleanCaseData(caseData) {
  if (!caseData || typeof caseData !== 'object') return caseData;
  
  const cleaned = { ...caseData };
  
  // Clean common problematic fields
  if (cleaned.management) {
    if (cleaned.management.pharmacology) {
      if (Array.isArray(cleaned.management.pharmacology)) {
        cleaned.management.pharmacology = serializeMedications(cleaned.management.pharmacology);
      } else if (typeof cleaned.management.pharmacology === 'object') {
        cleaned.management.pharmacology = serializeMedication(cleaned.management.pharmacology) || "";
      }
    }
  }
  
  if (cleaned.guidelines) {
    if (Array.isArray(cleaned.guidelines)) {
      // Group by tier and serialize
      const grouped = {};
      cleaned.guidelines.forEach(guideline => {
        const validated = validateGuideline(guideline);
        if (validated) {
          const tier = validated.tier || 'international';
          if (!grouped[tier]) grouped[tier] = [];
          grouped[tier].push(serializeGuideline(validated));
        }
      });
      cleaned.guidelines = grouped;
    }
  }
  
  // Recursively clean remaining fields
  return serializeForDisplay(cleaned);
}

