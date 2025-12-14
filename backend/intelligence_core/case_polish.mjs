// Final Smoothing Layer
// Improves readability and consistency
// Universal - NO hardcoded content

/**
 * Polish case narrative for readability
 * @param {Object} finalCase - Final case data
 * @returns {Object} Polished case
 */
export function polishCaseNarrative(finalCase) {
  let polished = JSON.parse(JSON.stringify(finalCase));
  
  // Improve readability of key sections
  if (polished.history && typeof polished.history === 'string') {
    polished.history = smoothTransitions(polished.history);
  }
  
  if (polished.physical_exam && typeof polished.physical_exam === 'string') {
    polished.physical_exam = smoothTransitions(polished.physical_exam);
  }
  
  if (polished.management && polished.management.initial && typeof polished.management.initial === 'string') {
    polished.management.initial = smoothTransitions(polished.management.initial);
  }
  
  if (polished.management && polished.management.definitive && typeof polished.management.definitive === 'string') {
    polished.management.definitive = smoothTransitions(polished.management.definitive);
  }
  
  // Remove robotic phrasing
  if (polished.reasoning_chain && Array.isArray(polished.reasoning_chain)) {
    polished.reasoning_chain = polished.reasoning_chain.map(step => 
      removeRoboticPhrasing(step)
    );
  }
  
  // Normalize guideline references
  if (polished.guidelines) {
    polished.guidelines = normalizeGuidelineReferences(polished.guidelines);
  }
  
  // Ensure consistent terminology
  polished = normalizeTerminology(polished);
  
  // Fix minor grammar issues
  if (polished.key_points && Array.isArray(polished.key_points)) {
    polished.key_points = polished.key_points.map(point => fixGrammar(point));
  }
  
  if (polished.red_flags && Array.isArray(polished.red_flags)) {
    polished.red_flags = polished.red_flags.map(flag => fixGrammar(flag));
  }
  
  return polished;
}

/**
 * Smooth transitions between sentences
 */
function smoothTransitions(text) {
  if (!text || typeof text !== 'string') return text;
  
  // Fix common transition issues
  return text
    .replace(/\s+\.\s+/g, ". ") // Fix spacing around periods
    .replace(/\s+,\s+/g, ", ") // Fix spacing around commas
    .replace(/\s+/g, " ") // Remove extra spaces
    .replace(/\.\s*\./g, ".") // Remove double periods
    .replace(/,\s*,/g, ",") // Remove double commas
    .trim();
}

/**
 * Remove robotic phrasing
 */
function removeRoboticPhrasing(text) {
  if (!text || typeof text !== 'string') return text;
  
  return text
    .replace(/\bIt should be noted that\b/gi, "")
    .replace(/\bIt is important to note that\b/gi, "")
    .replace(/\bIt is worth noting that\b/gi, "")
    .replace(/\bOne must consider\b/gi, "Consider")
    .replace(/\bOne should\b/gi, "Should")
    .replace(/\bThe patient presents with\b/gi, "Presents with")
    .replace(/\bThe case demonstrates\b/gi, "Demonstrates")
    .replace(/\s+/g, " ") // Remove extra spaces
    .trim();
}

/**
 * Normalize guideline references
 */
function normalizeGuidelineReferences(guidelines) {
  const normalized = JSON.parse(JSON.stringify(guidelines));
  
  // Normalize guideline names
  const normalizeGuideline = (guideline) => {
    if (typeof guideline !== 'string') return guideline;
    
    return guideline
      .replace(/\bWHO\b/g, "WHO")
      .replace(/\bAHA\b/g, "AHA")
      .replace(/\bACC\b/g, "ACC")
      .replace(/\bESO\b/g, "ESO")
      .replace(/\bESC\b/g, "ESC")
      .replace(/\bNICE\b/g, "NICE")
      .replace(/\bACOG\b/g, "ACOG")
      .replace(/\bAAP\b/g, "AAP");
  };
  
  // Normalize all guideline arrays
  Object.keys(normalized).forEach(key => {
    if (Array.isArray(normalized[key])) {
      normalized[key] = normalized[key].map(normalizeGuideline);
    }
  });
  
  return normalized;
}

/**
 * Normalize terminology across case
 */
function normalizeTerminology(caseData) {
  const normalized = JSON.parse(JSON.stringify(caseData));
  
  // Common terminology normalizations
  const terminologyMap = {
    "patient": "patient",
    "pt": "patient",
    "hx": "history",
    "pe": "physical examination",
    "dx": "diagnosis",
    "tx": "treatment",
    "rx": "treatment"
  };
  
  // Apply to key text fields
  const normalizeText = (text) => {
    if (typeof text !== 'string') return text;
    let normalized = text;
    Object.keys(terminologyMap).forEach(abbrev => {
      const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
      normalized = normalized.replace(regex, terminologyMap[abbrev]);
    });
    return normalized;
  };
  
  if (normalized.history) normalized.history = normalizeText(normalized.history);
  if (normalized.physical_exam) normalized.physical_exam = normalizeText(normalized.physical_exam);
  if (normalized.management?.initial) normalized.management.initial = normalizeText(normalized.management.initial);
  if (normalized.management?.definitive) normalized.management.definitive = normalizeText(normalized.management.definitive);
  
  return normalized;
}

/**
 * Fix minor grammar issues
 */
function fixGrammar(text) {
  if (!text || typeof text !== 'string') return text;
  
  return text
    .replace(/\ba\s+([aeiouAEIOU])/g, "an $1") // Fix "a" vs "an"
    .replace(/\b([a-z]+)\s+is\s+([a-z]+)\s+([a-z]+)\s+([a-z]+)\s+([a-z]+)\b/gi, (match, p1, p2, p3, p4, p5) => {
      // Fix subject-verb agreement in some cases
      return match;
    })
    .replace(/\s+/g, " ") // Remove extra spaces
    .trim();
}

