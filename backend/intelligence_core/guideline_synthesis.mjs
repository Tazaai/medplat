// Dynamic Guideline Synthesis Engine
// Universal, region-aware, severity-stratified

/**
 * Generate synthesized guidelines based on domains, region, and severity
 * @param {Array<string>} domains - Detected domains
 * @param {string} region - User region
 * @param {string} severity - Case severity (mild/moderate/severe)
 * @returns {Object} Synthesized guideline cascade
 */
/**
 * Lock primary guideline based on domain
 * @param {Array<string>} domains - Detected domains
 * @param {boolean} isLMIC - Whether LMIC mode is active
 * @returns {string|null} Primary guideline tier
 */
export function lockPrimaryGuideline(domains, isLMIC) {
  // ROUND 6: LMIC ALWAYS primary
  if (isLMIC) {
    return "international"; // WHO
  }
  
  const domainSet = new Set(domains);
  
  // Domain-specific primary guidelines
  if (domainSet.has("trauma")) {
    return "international"; // ATLS
  }
  
  if (domainSet.has("obgyn")) {
    return "usa"; // ACOG (or continental RCOG based on region)
  }
  
  if (domainSet.has("pediatrics")) {
    return "usa"; // AAP (or continental NICE based on region)
  }
  
  if (domainSet.has("cardiology")) {
    return "continental"; // ESC (or USA AHA/ACC based on region)
  }
  
  if (domainSet.has("neurology") && domains.some(d => d.includes("stroke"))) {
    return "continental"; // ESO
  }
  
  return null; // No specific lock
}

export function generateGuidelineSynthesis(domains, region, severity, isLMIC = false) {
  // ROUND 4: Priority matrix - ensure at least ONE guideline always generated
  // ENHANCED: Tag guidelines by domain and acuity; filter by case pattern
  const guidelines = {
    local: [],
    country: [],
    regional: [],
    continental: [],
    specialty_specific: [],
    usa: [],
    international: [],
    synthesized_algorithm: "",
    severity_specific: [],
    priority_order: [],
    primary_locked: null,
    domain_tags: domains || [], // Tag guidelines by detected domains
    acuity_level: severity || "moderate" // Tag by acuity
  };
  
  // Detect if LMIC (low/middle income country) - use parameter if provided, otherwise calculate from region
  const detectedIsLMIC = !["US", "USA", "EU", "UK", "DK", "Denmark", "Sweden", "Norway", "Germany", "France"].some(r => 
    region && region.toUpperCase().includes(r.toUpperCase())
  );
  // Use explicit parameter if provided (true), otherwise use detected value
  const finalIsLMIC = isLMIC === true ? true : detectedIsLMIC;
  
  // ROUND 6: Smart-lock primary guideline
  const primaryLock = lockPrimaryGuideline(domains, finalIsLMIC);
  if (primaryLock) {
    guidelines.primary_locked = primaryLock;
  }
  
  // Dynamic region-specific guideline loading (works for any country code)
  const regionCode = region ? region.toLowerCase().substring(0, 2) : 'global';
  
  // ROUND 9: Ensure guidelines ALWAYS start with LocalGuideline: regionCode
  if (regionCode && regionCode !== 'global' && regionCode !== 'unspecified') {
    // Ensure local guidelines array starts with LocalGuideline entry
    if (guidelines.local.length === 0) {
      guidelines.local.push(`LocalGuideline: ${regionCode}`);
    } else if (!guidelines.local[0]?.includes(regionCode)) {
      guidelines.local.unshift(`LocalGuideline: ${regionCode}`);
    }
    
    // UNIVERSAL DYNAMIC CORE: Guidelines are generated dynamically by GPT based on:
    // - Region geolocation (regionCode)
    // - Detected domains (domains array)
    // - Case severity (severity)
    // - LMIC status (finalIsLMIC)
    // - Topic-specific requirements
    // NO hardcoded guideline lists - all guidelines must be dynamically generated
    // The GPT model will generate appropriate guidelines based on these parameters
  }
  
  // ROUND 11: Priority order matrix (globally safe)
  const priority_order = [
    `${regionCode}-local`,
    `${regionCode}-hospital`,
    `${regionCode}-regional`,
    regionCode,
    "continental",
    "specialty",
    "us",
    "who",
    "global"
  ];
  
  guidelines.priority_order = priority_order;
  
  // Generate synthesized algorithm text
  guidelines.synthesized_algorithm = generateSynthesizedAlgorithm(domains, region, severity, finalIsLMIC);
  
  // LMIC fallback
  if (finalIsLMIC) {
    guidelines.lmic_note = "Resource-limited setting: Prioritize WHO guidelines and clinical scoring systems over advanced diagnostics";
    if (!guidelines.international.includes("WHO Guidelines")) {
      guidelines.international.push("WHO Evidence-Based Guidelines");
    }
  }
  
  // ROUND 4: Ensure at least ONE guideline always generated
  const hasAnyGuideline = 
    guidelines.local.length > 0 ||
    guidelines.country.length > 0 ||
    guidelines.regional.length > 0 ||
    guidelines.continental.length > 0 ||
    guidelines.specialty_specific.length > 0 ||
    guidelines.usa.length > 0 ||
    guidelines.international.length > 0;
  
  if (!hasAnyGuideline) {
    // Fallback: Add WHO guideline
    guidelines.international.push("WHO Evidence-Based Guidelines");
  }
  
  // ROUND 11: DK guideline injection (only for DK region)
  if (regionCode === "dk") {
    guidelines.local.unshift({
      title: "Region Sjælland – Slagelse Hospital",
      url: "https://"
    });
    guidelines.local.unshift({
      title: "Danish National Cardiology Society",
      url: "https://"
    });
  }
  
  return guidelines;
}

/**
 * Generate synthesized algorithm text
 */
function generateSynthesizedAlgorithm(domains, region, severity, isLMIC) {
  let algorithm = "Guideline Synthesis Algorithm:\n\n";
  
  algorithm += "1. Assess severity: " + (severity || "moderate") + "\n";
  algorithm += "2. Identify primary domain: " + (domains[0] || "general") + "\n";
  
  if (domains.length > 1) {
    algorithm += "3. Multi-domain case: Address all active domains\n";
  }
  
  algorithm += "4. Guideline priority:\n";
  algorithm += "   - Local protocols (if available)\n";
  algorithm += "   - National guidelines\n";
  algorithm += "   - Continental guidelines\n";
  algorithm += "   - US guidelines (if applicable)\n";
  algorithm += "   - International/WHO guidelines\n";
  
  if (isLMIC) {
    algorithm += "\n5. LMIC Mode: Use WHO-based protocols, prioritize clinical scoring over advanced diagnostics\n";
  }
  
  if (severity === "severe" || severity === "critical") {
    algorithm += "\n6. Critical Care: Apply ICU protocols, consider early escalation\n";
  }
  
  return algorithm;
}

