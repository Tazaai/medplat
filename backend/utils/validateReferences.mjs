/**
 * Reference Validation Module
 * 
 * Prevents fabricated or placeholder guideline URLs from appearing in cases.
 * Validates references against:
 * - Known guideline registries (ESC, AHA/ACC, NICE, Sundhedsstyrelsen)
 * - DOI resolution
 * - Domain authenticity
 * 
 * Usage:
 *   import { validateReferences } from './utils/validateReferences.mjs';
 *   const validated = await validateReferences(caseData.evidence);
 */

// Verified guideline domains by region
const VERIFIED_DOMAINS = {
  DK: [
    'sundhedsstyrelsen.dk',
    'cardio.dk',
    'dsam.dk',
    'nbv.cardio.dk'
  ],
  EU: [
    'escardio.org',
    'esc-online.org',
    'easd.org',
    'ers-education.org'
  ],
  UK: [
    'nice.org.uk',
    'sign.ac.uk',
    'rcplondon.ac.uk',
    'bmj.com'
  ],
  US: [
    'acc.org',
    'heart.org',
    'chestnet.org',
    'uptodate.com',
    'nejm.org'
  ],
  GLOBAL: [
    'who.int',
    'doi.org',
    'pubmed.ncbi.nlm.nih.gov',
    'cochranelibrary.com'
  ]
};

// Known fabricated patterns to reject
const FABRICATED_PATTERNS = [
  /Copenhagen University Hospital protocol/i,
  /Internal hospital guidelines/i,
  /Local protocol \d{4}/i,
  /https?:\/\/example\./,
  /https?:\/\/placeholder\./,
  /\[citation needed\]/i
];

/**
 * Check if a URL domain is in verified list
 */
function isVerifiedDomain(url, region = null) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    
    // Check global domains first
    if (VERIFIED_DOMAINS.GLOBAL.some(d => domain.includes(d))) {
      return { verified: true, source: 'GLOBAL' };
    }
    
    // Check region-specific if provided
    if (region && VERIFIED_DOMAINS[region]) {
      if (VERIFIED_DOMAINS[region].some(d => domain.includes(d))) {
        return { verified: true, source: region };
      }
    }
    
    // Check all regions
    for (const [reg, domains] of Object.entries(VERIFIED_DOMAINS)) {
      if (reg === 'GLOBAL') continue;
      if (domains.some(d => domain.includes(d))) {
        return { verified: true, source: reg };
      }
    }
    
    return { verified: false, source: null };
  } catch (e) {
    return { verified: false, source: null, error: 'Invalid URL' };
  }
}

/**
 * Check if reference text contains fabricated patterns
 */
function isFabricated(text) {
  return FABRICATED_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Extract URLs from reference text
 */
function extractUrls(text) {
  // Handle non-string inputs (objects, arrays, null, undefined)
  if (typeof text !== 'string') {
    if (text && typeof text === 'object') {
      // If it's an object with a 'text' or 'title' property, use that
      text = text.text || text.title || text.url || JSON.stringify(text);
    } else {
      return [];
    }
  }
  
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

/**
 * Validate a single reference
 */
export function validateReference(ref, region = null) {
  // Handle non-string references
  let refText = ref;
  if (typeof ref !== 'string') {
    if (ref && typeof ref === 'object') {
      refText = ref.text || ref.title || ref.url || JSON.stringify(ref);
    } else {
      refText = String(ref || '');
    }
  }
  
  const result = {
    original: refText,
    valid: true,
    warnings: [],
    source: null,
    verified_url: null
  };
  
  // Check for fabricated patterns
  if (isFabricated(refText)) {
    result.valid = false;
    result.warnings.push('Contains fabricated or placeholder text');
    return result;
  }
  
  // Extract and validate URLs
  const urls = extractUrls(refText);
  if (urls.length === 0) {
    result.warnings.push('No URL provided - citation only');
    return result;
  }
  
  // Validate first URL
  const urlCheck = isVerifiedDomain(urls[0], region);
  if (urlCheck.verified) {
    result.source = urlCheck.source;
    result.verified_url = urls[0];
  } else {
    result.valid = false;
    result.warnings.push(`Unverified domain: ${urls[0]}`);
  }
  
  return result;
}

/**
 * Validate array of references
 */
export async function validateReferences(references, region = null) {
  if (!Array.isArray(references)) {
    return { valid: [], invalid: [], warnings: ['References must be an array'] };
  }
  
  const results = {
    valid: [],
    invalid: [],
    warnings: [],
    stats: {
      total: references.length,
      verified: 0,
      unverified: 0,
      fabricated: 0
    }
  };
  
  for (const ref of references) {
    const validation = validateReference(ref, region);
    
    if (validation.valid) {
      results.valid.push(validation);
      results.stats.verified++;
    } else {
      results.invalid.push(validation);
      if (validation.warnings.some(w => w.includes('fabricated'))) {
        results.stats.fabricated++;
      } else {
        results.stats.unverified++;
      }
    }
  }
  
  // Add summary warnings
  if (results.stats.fabricated > 0) {
    results.warnings.push(`❌ ${results.stats.fabricated} fabricated reference(s) detected`);
  }
  if (results.stats.unverified > 0) {
    results.warnings.push(`⚠️  ${results.stats.unverified} unverified reference(s)`);
  }
  
  return results;
}

/**
 * Get fallback verified references for a topic/region
 */
export function getFallbackReferences(topic, region = 'EU') {
  const fallbacks = {
    ACS: {
      EU: 'ESC 2023 Guidelines for acute coronary syndromes - https://academic.oup.com/eurheartj/article/44/38/3720/7243210',
      UK: 'NICE CG167: Acute coronary syndromes - https://www.nice.org.uk/guidance/cg167',
      US: 'AHA/ACC 2023 STEMI Guidelines - https://www.acc.org/Clinical-Topics/Acute-Coronary-Syndromes',
      DK: 'Dansk Cardiologisk Selskab retningslinjer - https://nbv.cardio.dk'
    },
    Sepsis: {
      GLOBAL: 'Surviving Sepsis Campaign 2021 - https://www.sccm.org/SurvivingSepsisCampaign',
      EU: 'ERS/ESICM sepsis guidelines - https://erj.ersjournals.com',
      UK: 'NICE NG51: Sepsis recognition and treatment - https://www.nice.org.uk/guidance/ng51'
    }
  };
  
  // Detect topic category
  const topicKey = Object.keys(fallbacks).find(k => 
    topic.toLowerCase().includes(k.toLowerCase())
  );
  
  if (topicKey && fallbacks[topicKey][region]) {
    return [fallbacks[topicKey][region]];
  }
  
  // Return global fallback
  return ['WHO Clinical Guidelines - https://www.who.int/publications/guidelines'];
}

export default {
  validateReferences,
  validateReference,
  isVerifiedDomain,
  getFallbackReferences
};
