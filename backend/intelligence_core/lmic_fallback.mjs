// LMIC Fallback Engine
// Adapts cases for low/middle income country settings

/**
 * Apply LMIC fallback adaptations
 * @param {Array<string>} domains - Detected domains
 * @param {string} region - User region
 * @param {Object} resources - Available resources (imaging, labs, etc.)
 * @returns {Object} LMIC adaptations
 */
export function lmicFallback(domains, region, resources = {}, language = "en") {
  // LMIC triggers when ANY of these conditions are met:
  // 1. Explicit region === "LMIC"
  // 2. Language is LMIC language
  // 3. resources === "low"
  // 4. Region inference indicates LMIC
  
  const regionUpper = (region || "").toUpperCase();
  const languageLower = (language || "en").toLowerCase();
  
  const lmicLanguages = ["sw", "ha", "ps", "ur", "bn", "ne", "hi", "fa"];
  const highResourceRegions = ["US", "USA", "EU", "UK", "DK", "Denmark", "Sweden", "Norway", "Germany", "France", "Canada", "Australia"];
  
  const isLMIC = 
    regionUpper.includes("LMIC") ||
    regionUpper.includes("LOW") ||
    lmicLanguages.includes(languageLower) ||
    resources === "low" ||
    (resources && resources.resources === "low") ||
    !highResourceRegions.some(r => regionUpper.includes(r.toUpperCase()));
  
  if (!isLMIC) {
    return { lmic_mode: false, adaptations: {} };
  }
  
  const adaptations = {
    lmic_mode: true,
    imaging_alternatives: [],
    lab_alternatives: [],
    management_alternatives: [],
    antibiotic_alternatives: [],
    clinical_pathways: [],
    warnings: []
  };
  
  // Imaging alternatives
  adaptations.imaging_alternatives.push("Prioritize clinical examination and scoring systems over advanced imaging");
  adaptations.imaging_alternatives.push("Use point-of-care ultrasound when available instead of CT/MRI");
  adaptations.imaging_alternatives.push("Consider X-ray and clinical correlation when CT unavailable");
  
  // Lab alternatives
  adaptations.lab_alternatives.push("Use clinical scoring systems (e.g., Alvarado for appendicitis, Wells for PE) when labs limited");
  adaptations.lab_alternatives.push("Prioritize essential labs: glucose, electrolytes, basic CBC when available");
  adaptations.lab_alternatives.push("Use point-of-care tests (urine dipstick, rapid tests) when available");
  
  // Management alternatives
  if (domains.includes("infectious")) {
    adaptations.management_alternatives.push("Use WHO Essential Medicines List antibiotics");
    adaptations.management_alternatives.push("Consider local resistance patterns and formulary availability");
    adaptations.management_alternatives.push("Empiric therapy based on clinical presentation when cultures unavailable");
  }
  
  if (domains.includes("cardiology")) {
    adaptations.management_alternatives.push("Use clinical risk scores (TIMI, GRACE) when troponin unavailable");
    adaptations.management_alternatives.push("Aspirin and basic antiplatelet therapy when advanced agents unavailable");
  }
  
  if (domains.includes("respiratory")) {
    adaptations.management_alternatives.push("Oxygen therapy and basic bronchodilators when advanced respiratory support unavailable");
    adaptations.management_alternatives.push("Clinical assessment and scoring when ABG unavailable");
  }
  
  // Antibiotic alternatives (WHO-based)
  adaptations.antibiotic_alternatives.push("First-line: WHO Essential Medicines (amoxicillin, doxycycline, metronidazole)");
  adaptations.antibiotic_alternatives.push("Second-line: Based on local availability and resistance patterns");
  adaptations.antibiotic_alternatives.push("Avoid expensive broad-spectrum agents unless critically indicated");
  
  // Clinical pathways (no advanced diagnostics)
  adaptations.clinical_pathways.push("Use clinical scoring systems for diagnosis");
  adaptations.clinical_pathways.push("Empiric treatment based on high clinical probability");
  adaptations.clinical_pathways.push("Monitor response clinically rather than with repeat imaging/labs");
  
  // Warnings
  adaptations.warnings.push("⚠️ Resource-limited setting: Adaptations applied for low-resource environment");
  adaptations.warnings.push("⚠️ When advanced imaging unavailable, rely on clinical examination and scoring");
  adaptations.warnings.push("⚠️ Antibiotic selection based on WHO Essential Medicines and local availability");
  
  return adaptations;
}

/**
 * Apply LMIC adaptations to case data
 * @param {Object} caseData - Generated case data
 * @param {Object} lmicAdaptations - LMIC adaptation data
 * @returns {Object} Adapted case data
 */
export function applyLMICAdaptations(caseData, lmicAdaptations) {
  if (!lmicAdaptations || !lmicAdaptations.lmic_mode) return caseData;

  // Add LMIC note to guidelines
  if (!caseData.guidelines) caseData.guidelines = {};
  if (!caseData.guidelines.lmic_alternatives) {
    caseData.guidelines.lmic_alternatives = [];
  }

  // Merge LMIC alternatives - safely check for adaptations object
  const adaptations = lmicAdaptations.adaptations || lmicAdaptations;
  if (adaptations && adaptations.clinical_pathways && Array.isArray(adaptations.clinical_pathways)) {
      adaptations.clinical_pathways.forEach(pathway => {
        if (!caseData.guidelines.lmic_alternatives.includes(pathway)) {
          caseData.guidelines.lmic_alternatives.push(pathway);
        }
      });
    }
  
  // Add LMIC note to diagnostic evidence
  if (caseData.paraclinical?.diagnostic_evidence) {
    caseData.paraclinical.diagnostic_evidence.lmic_note = 
      "In resource-limited settings, prioritize clinical scoring systems and point-of-care tests over advanced diagnostics.";
  }
  
  return caseData;
}

