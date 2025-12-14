// Stroke LMIC Guideline Order Fix
// Corrects stroke guideline ordering in LMIC settings
// Universal, domain-triggered - NO hardcoded diagnoses

/**
 * Correct stroke LMIC guidelines
 * @param {Object} finalCase - Final case data
 * @param {Array<string>} domains - Detected domains
 * @param {string} region - User region
 * @returns {Object} Case with corrected stroke LMIC guidelines
 */
export function correctStrokeLMICGuidelines(finalCase, domains, region) {
  const corrected = JSON.parse(JSON.stringify(finalCase));
  
  // Check if LMIC mode, neurology domain, and stroke detected
  const isLMIC = corrected.meta?.lmic_mode === true;
  const hasNeurology = domains.includes("neurology");
  const hasStroke = domains.some(d => d.includes("stroke")) || 
                    (corrected.final_diagnosis && corrected.final_diagnosis.toLowerCase().includes("stroke")) ||
                    (corrected.history && corrected.history.toLowerCase().includes("stroke")) ||
                    (corrected.physical_exam && corrected.physical_exam.toLowerCase().includes("stroke"));
  
  if (!isLMIC || !hasNeurology || !hasStroke) {
    return corrected;
  }
  
  // Remove U.S. NIH/AHA stroke pathways as primary
  if (corrected.guidelines) {
    // Remove NIH/AHA from USA guidelines if present
    if (Array.isArray(corrected.guidelines.usa)) {
      corrected.guidelines.usa = corrected.guidelines.usa.filter(g => 
        !g.toLowerCase().includes("nih") && 
        !g.toLowerCase().includes("aha") &&
        !g.toLowerCase().includes("american heart association")
      );
    }
    
    // Ensure international (WHO) guidelines exist and are first
    if (!Array.isArray(corrected.guidelines.international)) {
      corrected.guidelines.international = [];
    }
    
    // Add WHO stroke guidelines if not present
    const hasWHOStroke = corrected.guidelines.international.some(g => 
      g.toLowerCase().includes("who") && g.toLowerCase().includes("stroke")
    );
    
    if (!hasWHOStroke) {
      corrected.guidelines.international.unshift("WHO Package of Essential Noncommunicable Disease Interventions (PEN) - Stroke Management");
    }
    
    // Add LMIC neurology pathway
    const hasLMICNeuro = corrected.guidelines.international.some(g => 
      g.toLowerCase().includes("lmic") || g.toLowerCase().includes("low resource")
    );
    
    if (!hasLMICNeuro) {
      corrected.guidelines.international.push("LMIC Neurology Pathway: Clinical diagnosis, basic labs, clinical scoring (NIHSS adapted for resource-limited settings)");
    }
    
    // Add ESO/ESC stroke info as secondary (continental)
    if (!Array.isArray(corrected.guidelines.continental)) {
      corrected.guidelines.continental = [];
    }
    
    const hasESO = corrected.guidelines.continental.some(g => 
      g.toLowerCase().includes("eso") || g.toLowerCase().includes("european stroke")
    );
    
    if (!hasESO) {
      corrected.guidelines.continental.push("ESO (European Stroke Organisation) Guidelines - Secondary reference for LMIC settings");
    }
    
    // Ensure primary is international (WHO)
    corrected.guidelines.primary_locked = "international";
  }
  
  // Ensure CT/MRI removed if unavailable
  if (corrected.management) {
    if (corrected.management.initial) {
      corrected.management.initial = corrected.management.initial
        .replace(/\bCT\s+scan\b/gi, "clinical assessment (CT unavailable in LMIC)")
        .replace(/\bMRI\b/gi, "clinical assessment (MRI unavailable in LMIC)")
        .replace(/\bcomputed\s+tomography\b/gi, "clinical assessment")
        .replace(/\bmagnetic\s+resonance\s+imaging\b/gi, "clinical assessment");
    }
    
    if (corrected.management.definitive) {
      corrected.management.definitive = corrected.management.definitive
        .replace(/\bCT\s+scan\b/gi, "clinical assessment (CT unavailable in LMIC)")
        .replace(/\bMRI\b/gi, "clinical assessment (MRI unavailable in LMIC)");
    }
  }
  
  // Add stroke LMIC adaptation note
  if (!corrected.meta.stroke_lmic_adaptation) {
    corrected.meta.stroke_lmic_adaptation = {
      guideline_order: "WHO → LMIC Neurology Pathway → ESO (secondary)",
      imaging_removed: "CT/MRI unavailable, using clinical diagnosis and NIHSS adapted for resource-limited settings",
      management_adapted: "Focus on clinical assessment, basic labs, and WHO Essential Medicines"
    };
  }
  
  return corrected;
}

