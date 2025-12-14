// backend/intelligence_core/schemas/guideline_schema.mjs
// Strict schema for guideline objects to prevent [object Object] serialization bugs

/**
 * Guideline Schema Definition
 */
export const GUIDELINE_SCHEMA = {
  name: "string (required) - Guideline name",
  body: "string (required) - Issuing body/society",
  year: "number (required) - Publication year",
  region: "string (required) - Region code (dk, us, uk, etc.)",
  tier: "local|regional|national|continental|international (required)",
  domain: "neuro|cardio|id|trauma|general (required)",
  condition_group: "string (optional) - Condition type",
  strength: "string (optional) - Evidence strength (Class I, Level A, etc.)",
  url_or_doi: "string (optional) - Reference URL or DOI"
};

const VALID_TIERS = ['local', 'regional', 'national', 'continental', 'international'];
const VALID_DOMAINS = ['neuro', 'cardio', 'id', 'trauma', 'general', 'resp', 'nephro', 'endo'];

/**
 * Validate and normalize guideline object
 */
export function validateGuideline(guideline) {
  if (!guideline || typeof guideline !== 'object') return null;
  
  // Handle string fallback
  if (typeof guideline === 'string') {
    return {
      name: guideline,
      body: "Unknown",
      year: new Date().getFullYear(),
      region: "global",
      tier: "international",
      domain: "general",
      condition_group: "",
      strength: "",
      url_or_doi: ""
    };
  }
  
  const validated = {
    name: String(guideline.name || guideline.title || "").trim(),
    body: String(guideline.body || guideline.society || guideline.organization || "").trim(),
    year: Number(guideline.year) || new Date().getFullYear(),
    region: String(guideline.region || guideline.region_code || "global").trim(),
    tier: VALID_TIERS.includes(guideline.tier) ? guideline.tier : 'international',
    domain: VALID_DOMAINS.includes(guideline.domain) ? guideline.domain : 'general',
    condition_group: String(guideline.condition_group || guideline.condition || "").trim(),
    strength: String(guideline.strength || guideline.evidence_level || "").trim(),
    url_or_doi: String(guideline.url_or_doi || guideline.url || guideline.doi || "").trim()
  };
  
  // Require at least name and body
  if (!validated.name || !validated.body) return null;
  
  return validated;
}

/**
 * Serialize guideline to display string
 */
export function serializeGuideline(guideline) {
  const validated = validateGuideline(guideline);
  if (!validated) return "";
  
  let result = `**${validated.name}**`;
  
  if (validated.body && validated.body !== "Unknown") {
    result += ` (${validated.body}`;
    if (validated.year) {
      result += `, ${validated.year}`;
    }
    result += ")";
  }
  result += "\n";
  
  if (validated.strength) {
    result += `Strength: ${validated.strength}\n`;
  }
  
  if (validated.tier && validated.tier !== "international") {
    result += `Tier: ${validated.tier}\n`;
  }
  
  if (validated.url_or_doi) {
    result += `Reference: ${validated.url_or_doi}\n`;
  }
  
  return result.trim();
}

/**
 * Serialize array of guidelines
 */
export function serializeGuidelines(guidelines) {
  if (!Array.isArray(guidelines)) return "";
  
  return guidelines
    .map(guideline => serializeGuideline(guideline))
    .filter(Boolean)
    .join("\n\n");
}

