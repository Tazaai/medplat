// backend/intelligence_core/schemas/medication_schema.mjs
// Strict schema for medication objects to prevent [object Object] serialization bugs

/**
 * Medication Schema Definition
 * All medication objects MUST conform to this structure
 */
export const MEDICATION_SCHEMA = {
  name: "string (required) - Medication name",
  class: "string (required) - Drug class",
  mechanism: "string (required) - Mechanism of action",
  standard_dose: "string (required) - Standard dosing",
  renal_adjustment: "string (optional) - Renal dose adjustments",
  hepatic_adjustment: "string (optional) - Hepatic dose adjustments",
  major_contraindications: "array of strings (required) - Contraindications",
  monitoring: "array of strings (required) - Monitoring requirements",
  lmic_alternative: "string (optional) - LMIC-friendly alternative"
};

/**
 * Validate and normalize medication object
 * @param {Object} med - Raw medication object
 * @returns {Object|null} - Validated medication or null
 */
export function validateMedication(med) {
  if (!med || typeof med !== 'object') return null;
  
  // Handle string fallback (legacy format)
  if (typeof med === 'string') {
    return {
      name: med,
      class: "Unknown",
      mechanism: "",
      standard_dose: "",
      renal_adjustment: "",
      hepatic_adjustment: "",
      major_contraindications: [],
      monitoring: [],
      lmic_alternative: ""
    };
  }
  
  // Enforce schema
  const validated = {
    name: String(med.name || med.medication || "").trim(),
    class: String(med.class || med.drug_class || "").trim(),
    mechanism: String(med.mechanism || med.mechanism_of_action || "").trim(),
    standard_dose: String(med.standard_dose || med.dose || med.dosing || "").trim(),
    renal_adjustment: String(med.renal_adjustment || med.renal_dosing || "").trim(),
    hepatic_adjustment: String(med.hepatic_adjustment || med.hepatic_dosing || "").trim(),
    major_contraindications: Array.isArray(med.major_contraindications) 
      ? med.major_contraindications.map(String).filter(Boolean)
      : Array.isArray(med.contraindications)
      ? med.contraindications.map(String).filter(Boolean)
      : [],
    monitoring: Array.isArray(med.monitoring)
      ? med.monitoring.map(String).filter(Boolean)
      : Array.isArray(med.monitoring_requirements)
      ? med.monitoring_requirements.map(String).filter(Boolean)
      : [],
    lmic_alternative: String(med.lmic_alternative || med.lmic_friendly_alternative || "").trim()
  };
  
  // Require at least name to be valid
  if (!validated.name) return null;
  
  return validated;
}

/**
 * Serialize medication to display string (prevents [object Object])
 * @param {Object|string} med - Medication object or string
 * @returns {string} - Human-readable medication string
 */
export function serializeMedication(med) {
  const validated = validateMedication(med);
  if (!validated) return "";
  
  // Build structured string (never return raw object)
  let result = `**${validated.name}**`;
  
  if (validated.class) {
    result += ` (${validated.class})`;
  }
  result += "\n";
  
  if (validated.mechanism) {
    result += `Mechanism: ${validated.mechanism}\n`;
  }
  
  if (validated.standard_dose) {
    result += `Dose: ${validated.standard_dose}\n`;
  }
  
  if (validated.renal_adjustment) {
    result += `Renal adjustment: ${validated.renal_adjustment}\n`;
  }
  
  if (validated.hepatic_adjustment) {
    result += `Hepatic adjustment: ${validated.hepatic_adjustment}\n`;
  }
  
  if (validated.major_contraindications.length > 0) {
    result += `Contraindications: ${validated.major_contraindications.join(", ")}\n`;
  }
  
  if (validated.monitoring.length > 0) {
    result += `Monitoring: ${validated.monitoring.join(", ")}\n`;
  }
  
  if (validated.lmic_alternative) {
    result += `LMIC alternative: ${validated.lmic_alternative}\n`;
  }
  
  return result.trim();
}

/**
 * Serialize array of medications
 * @param {Array} medications - Array of medication objects/strings
 * @returns {string} - Human-readable medications string
 */
export function serializeMedications(medications) {
  if (!Array.isArray(medications)) return "";
  
  return medications
    .map(med => serializeMedication(med))
    .filter(Boolean)
    .join("\n\n");
}

