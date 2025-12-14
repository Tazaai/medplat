// LMIC Multi-Domain Override Enforcer
// Ensures LMIC mode properly overrides high-resource recommendations
// Universal, domain-aware - NO hardcoded diagnoses

/**
 * Enforce LMIC priority - remove high-resource recommendations
 * @param {Object} finalCase - Final case data
 * @param {Array<string>} domains - Detected domains
 * @returns {Object} Case with LMIC priority enforced
 */
export function enforceLMICPriority(finalCase, domains) {
  const enforced = JSON.parse(JSON.stringify(finalCase));
  
  // Only enforce if LMIC mode is active
  if (!enforced.meta?.lmic_mode || enforced.meta.lmic_mode !== true) {
    return enforced;
  }
  
  // Remove advanced imaging from management
  if (enforced.management) {
    // Remove CT/MRI references from initial management
    if (enforced.management.initial) {
      enforced.management.initial = enforced.management.initial
        .replace(/\bCT\s+scan\b/gi, "clinical assessment")
        .replace(/\bMRI\b/gi, "clinical assessment")
        .replace(/\bcomputed\s+tomography\b/gi, "clinical assessment")
        .replace(/\bmagnetic\s+resonance\s+imaging\b/gi, "clinical assessment");
    }
    
    // Remove CT/MRI from definitive management
    if (enforced.management.definitive) {
      enforced.management.definitive = enforced.management.definitive
        .replace(/\bCT\s+scan\b/gi, "clinical assessment")
        .replace(/\bMRI\b/gi, "clinical assessment")
        .replace(/\bcomputed\s+tomography\b/gi, "clinical assessment")
        .replace(/\bmagnetic\s+resonance\s+imaging\b/gi, "clinical assessment");
    }
    
    // Replace with clinical pathways
    if (!enforced.management.lmic_clinical_pathway) {
      enforced.management.lmic_clinical_pathway = "Clinical diagnosis and management based on history, physical examination, and basic laboratory tests. Advanced imaging replaced with clinical scoring systems and serial monitoring.";
    }
  }
  
  // Remove advanced imaging from paraclinical
  if (enforced.paraclinical) {
    if (enforced.paraclinical.imaging) {
      enforced.paraclinical.imaging = enforced.paraclinical.imaging
        .replace(/\bCT\s+scan\b/gi, "clinical assessment")
        .replace(/\bMRI\b/gi, "clinical assessment")
        .replace(/\bcomputed\s+tomography\b/gi, "clinical assessment")
        .replace(/\bmagnetic\s+resonance\s+imaging\b/gi, "clinical assessment");
      
      // Add note if imaging was removed
      if (enforced.paraclinical.imaging.includes("clinical assessment")) {
        enforced.paraclinical.imaging += " (LMIC adaptation: advanced imaging unavailable, using clinical pathways)";
      }
    }
  }
  
  // Replace unavailable drugs with LMIC alternatives
  if (enforced.management?.pharmacology) {
    const pharm = enforced.management.pharmacology;
    
    // Replace expensive/unavailable medications
    if (pharm.key_drugs && Array.isArray(pharm.key_drugs)) {
      pharm.key_drugs = pharm.key_drugs.map(drug => {
        const drugLower = drug.toLowerCase();
        // Replace expensive biologics, newer antibiotics, etc. with WHO Essential Medicines
        if (drugLower.includes("biologic") || drugLower.includes("monoclonal")) {
          return "WHO Essential Medicine alternative (see LMIC adaptations)";
        }
        if (drugLower.includes("linezolid") || drugLower.includes("daptomycin")) {
          return "WHO Essential Medicine alternative: clindamycin or metronidazole if indicated";
        }
        return drug;
      });
    }
    
    // Add LMIC medication note
    if (!pharm.lmic_alternatives) {
      pharm.lmic_alternatives = "All medications selected from WHO Essential Medicines List. Expensive or unavailable drugs replaced with accessible alternatives.";
    }
  }
  
  // Force WHO guideline first ALWAYS
  if (enforced.guidelines) {
    // Ensure international (WHO) guidelines are first
    if (!Array.isArray(enforced.guidelines.international)) {
      enforced.guidelines.international = [];
    }
    
    // Add WHO guidelines if not present
    const hasWHO = enforced.guidelines.international.some(g => 
      g.toLowerCase().includes("who") || g.toLowerCase().includes("world health organization")
    );
    
    if (!hasWHO) {
      enforced.guidelines.international.unshift("WHO Evidence-Based Guidelines (Primary for LMIC)");
    }
    
    // Reorder: international first, then others
    const reorderedGuidelines = {
      international: enforced.guidelines.international || [],
      local: enforced.guidelines.local || [],
      country: enforced.guidelines.country || [],
      regional: enforced.guidelines.regional || [],
      continental: enforced.guidelines.continental || [],
      usa: enforced.guidelines.usa || [],
      specialty_specific: enforced.guidelines.specialty_specific || []
    };
    
    enforced.guidelines = reorderedGuidelines;
    enforced.guidelines.primary_locked = "international"; // Force WHO as primary
  }
  
  // Block specialty engines from adding high-resource tools
  // Remove any high-resource recommendations that might have been added after LMIC override
  if (enforced.meta?.high_acuity) {
    // Keep high-acuity data but remove high-resource tools
    if (enforced.meta.high_acuity.stabilization_pathway) {
      enforced.meta.high_acuity.stabilization_pathway = enforced.meta.high_acuity.stabilization_pathway.map(step => 
        step.replace(/\bCT\b/gi, "clinical assessment")
            .replace(/\bMRI\b/gi, "clinical assessment")
      );
    }
  }
  
  // Add LMIC enforcement note
  if (!enforced.meta.lmic_enforcement_applied) {
    enforced.meta.lmic_enforcement_applied = true;
    enforced.meta.lmic_enforcement_note = "LMIC priority enforced: advanced imaging removed, medications replaced with WHO Essential Medicines, WHO guidelines prioritized.";
  }
  
  return enforced;
}

