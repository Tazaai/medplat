/**
 * Case Transformer - Applies global system-wide improvements to case display
 * Transforms case data before rendering to improve UI/UX and structure
 * DO NOT modify backend engines or panel logic - only frontend display layer
 */

/**
 * Clean reasoning chain: Remove duplicates, enforce appropriate clinical flow, ensure chronological structure
 */
export function cleanReasoningChain(reasoningChain) {
  if (!Array.isArray(reasoningChain) || reasoningChain.length === 0) {
    return [];
  }

  // Remove duplicates
  const uniqueSteps = [];
  const seen = new Set();
  
  for (const step of reasoningChain) {
    const stepStr = typeof step === 'string' ? step : JSON.stringify(step);
    const normalized = stepStr.toLowerCase().trim();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      uniqueSteps.push(step);
    }
  }

  // Dynamically reorder based on clinical reasoning flow detected in steps
  // Detect primary survey patterns (ABC/ABCDE) and condition-specific assessments
  const primarySurveyPattern = /airway|breathing|circulation|disability|exposure|abc|primary survey/i;
  const conditionSpecificPattern = /cardiac|neurological|respiratory|gastrointestinal|renal|endocrine|assessment|exam/i;
  
  const hasPrimarySurvey = uniqueSteps.some(s => primarySurveyPattern.test(String(s)));
  const hasConditionSpecific = uniqueSteps.some(s => conditionSpecificPattern.test(String(s)));
  
  // Reorder if primary survey and condition-specific assessment are present
  if (hasPrimarySurvey && hasConditionSpecific) {
    const primarySteps = uniqueSteps.filter(s => primarySurveyPattern.test(String(s)));
    const conditionSteps = uniqueSteps.filter(s => conditionSpecificPattern.test(String(s)));
    const otherSteps = uniqueSteps.filter(s => !primarySurveyPattern.test(String(s)) && !conditionSpecificPattern.test(String(s)));
    
    return [...primarySteps, ...conditionSteps, ...otherSteps];
  }

  // Clean numbering
  return uniqueSteps.map((step, idx) => {
    const stepStr = String(step);
    // Remove existing step numbers and renumber
    const cleaned = stepStr.replace(/^(Step\s*\d+[:\-]?\s*)/i, '').trim();
    return `Step ${idx + 1}: ${cleaned}`;
  });
}

/**
 * Safe parser for nested arrays/objects - converts to renderable format
 * @param {*} value - Value to parse safely
 * @returns {string|Array<string>} Renderable string or array of strings
 */
function safeParseNested(value) {
  if (value == null) return '';
  if (typeof value === 'string') {
    // Remove [object Object] strings
    if (value.includes('[object Object]') || value.includes('[object object]')) {
      return value.replace(/\[object Object\]/gi, '').trim() || '';
    }
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map(item => {
      const parsed = safeParseNested(item);
      return typeof parsed === 'string' ? parsed : String(parsed);
    }).filter(item => item && item.trim());
  }
  if (typeof value === 'object') {
    // Extract text/description/name if available
    if (value.text) return String(value.text);
    if (value.description) return String(value.description);
    if (value.name) return String(value.name);
    // Convert to key-value pairs
    const keys = Object.keys(value);
    if (keys.length === 0) return '';
    return keys.map(key => `${key}: ${safeParseNested(value[key])}`).join('; ');
  }
  return String(value);
}

/**
 * Fallback formatter: if any field resolves to non-string → stringify safely
 * @param {*} value - Value to format
 * @returns {string|Array<string>} Safe string or array of strings
 */
function safeFormatField(value) {
  const parsed = safeParseNested(value);
  if (Array.isArray(parsed)) {
    return parsed.length > 0 ? parsed : [];
  }
  return parsed || '';
}

/**
 * Filter guidelines: Hide empty levels, preserve all guidelines (backend filters by topic)
 * Auto-clean guideline blocks to remove empty sections before display
 */
export function filterGuidelines(guidelines, category, caseTopic = '') {
  if (!guidelines || typeof guidelines !== 'object') {
    return {};
  }

  const filtered = {};

  // Backend should already filter guidelines by topic relevance
  // Frontend only hides empty tiers - no content filtering

  // Filter each tier - auto-clean empty sections
  const tiers = ['local', 'national', 'continental', 'usa', 'international'];
  for (const tier of tiers) {
    if (guidelines[tier] && Array.isArray(guidelines[tier]) && guidelines[tier].length > 0) {
      // Clean each guideline entry (remove objects, ensure strings)
      const cleaned = guidelines[tier]
        .map(g => {
          if (typeof g === 'string') return g;
          if (typeof g === 'object' && g !== null) {
            // Extract text/name/title
            return g.text || g.name || g.title || g.description || JSON.stringify(g);
          }
          return String(g);
        })
        .filter(g => g && g.trim() && !g.includes('[object Object]'));
      
      if (cleaned.length > 0) {
        filtered[tier] = cleaned;
      }
    }
  }

  // Preserve other fields (with safe parsing)
  if (guidelines.versions) filtered.versions = safeFormatField(guidelines.versions);
  if (guidelines.lmic_alternatives) filtered.lmic_alternatives = guidelines.lmic_alternatives;
  if (guidelines.antibiotic_resistance_logic) filtered.antibiotic_resistance_logic = safeFormatField(guidelines.antibiotic_resistance_logic);

  return filtered;
}

/**
 * Clean differential diagnosis text - remove trailing instructional text
 * @param {string} text - Raw differential diagnosis text
 * @returns {string} - Cleaned text
 */
export function cleanDifferentialText(text) {
  if (!text || typeof text !== 'string') return text;
  
  // Remove trailing text patterns
  const patterns = [
    /\s*\(Differential diagnosis\s*[-–—]\s*tier should be determined.*?\)\s*$/i,
    /\s*\(Differential diagnosis.*?tier.*?\)\s*$/i,
    /\s*-\s*tier should be determined.*$/i,
    /\s*\(tier should be determined.*?\)\s*$/i,
  ];
  
  let cleaned = text;
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '').trim();
  }
  
  return cleaned;
}

/**
 * Stratify differential diagnoses into 4 tiers (backend should provide tier info)
 */
export function stratifyDifferentials(differentials) {
  if (!Array.isArray(differentials) || differentials.length === 0) {
    return {
      critical_life_threatening: [],
      urgent_mimics: [],
      common_causes: [],
      benign_causes: []
    };
  }

  const stratified = {
    critical_life_threatening: [],
    urgent_mimics: [],
    common_causes: [],
    benign_causes: []
  };

  for (const diff of differentials) {
    if (typeof diff === 'string') {
      // Simple string - backend should provide tier information
      // If tier is missing, check if it's already structured with tier info
      // Default to common_causes if no tier info available (backend should provide this)
      stratified.common_causes.push({ 
        name: cleanDifferentialText(diff), 
        tier: 'common_causes', 
        justification: '' 
      });
    } else if (typeof diff === 'object') {
      // Already structured - use tier from backend
      const tier = diff.tier || 'common_causes';
      // Map old tier names to new ones
      const tierKey = tier === 'urgent_acs_mimics' ? 'urgent_mimics' : tier;
      if (stratified[tierKey]) {
        stratified[tierKey].push({
          name: cleanDifferentialText(diff.name || diff),
          tier: tierKey,
          justification: diff.justification || 'No justification provided'
        });
      } else {
        // Fallback to common_causes if tier not recognized
        stratified.common_causes.push({
          name: cleanDifferentialText(diff.name || diff),
          tier: 'common_causes',
          justification: diff.justification || 'No justification provided'
        });
      }
    }
  }

  return stratified;
}

/**
 * Filter complications to topic-relevant only (backend should already filter)
 */
export function filterComplications(complications, category, caseTopic = '') {
  if (!complications || typeof complications !== 'object') {
    return { immediate: [], early: [], late: [] };
  }

  // Backend should already filter complications by topic relevance
  // Frontend only preserves structure - no content filtering
  
  const filterArray = (arr) => {
    if (!Array.isArray(arr)) return [];
    // Return all complications - backend should have already filtered by topic
    return arr;
  };

  return {
    immediate: filterArray(complications.immediate),
    early: filterArray(complications.early),
    late: filterArray(complications.late)
  };
}

/**
 * Enhance pharmacology display with adjustments and contraindications
 */
export function enhancePharmacology(pharmacology) {
  if (!pharmacology || typeof pharmacology !== 'object') {
    return null;
  }

  const enhanced = { ...pharmacology };

  // Ensure dosing adjustments mention renal/hepatic
  if (enhanced.dosing_adjustments && !enhanced.dosing_adjustments.toLowerCase().includes('renal') && !enhanced.dosing_adjustments.toLowerCase().includes('hepatic')) {
    enhanced.dosing_adjustments = `${enhanced.dosing_adjustments}\n\nNote: Adjust for renal and hepatic function as needed.`;
  }

  // Ensure contraindicated medications explain WHY
  if (enhanced.contraindicated_medications) {
    const contraStr = String(enhanced.contraindicated_medications);
    if (!contraStr.toLowerCase().includes('because') && !contraStr.toLowerCase().includes('due to') && !contraStr.toLowerCase().includes('reason:')) {
      enhanced.contraindicated_medications = `${contraStr}\n\nNote: Review contraindications based on patient-specific factors.`;
    }
  }

  return enhanced;
}

/**
 * Transform LMIC alternatives to 3-tier structure
 * Removes raw JSON strings, converts to bullet points
 */
export function transformLMICAlternatives(lmicAlternatives) {
  if (!Array.isArray(lmicAlternatives) || lmicAlternatives.length === 0) {
    return [];
  }

  return lmicAlternatives.map(alt => {
    // If it's a string, check if it's JSON and parse it
    if (typeof alt === 'string') {
      // Check if it looks like JSON
      const trimmed = alt.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          const parsed = JSON.parse(alt);
          // Convert parsed JSON to structured format
          if (typeof parsed === 'object' && parsed !== null) {
            return {
              tier: parsed.tier || 'intermediate',
              intervention: parsed.intervention || parsed.text || parsed.description || String(parsed),
              rationale: parsed.rationale || 'Resource-appropriate alternative for low-resource settings'
            };
          }
        } catch (e) {
          // Not valid JSON, treat as plain string
        }
      }
      
      // Try to infer tier dynamically based on content
      const altLower = alt.toLowerCase();
      let tier = 'intermediate';
      if (altLower.includes('basic') || altLower.includes('essential') || altLower.includes('minimal')) {
        tier = 'basic';
      } else if (altLower.includes('advanced') || altLower.includes('tertiary') || altLower.includes('specialized')) {
        tier = 'advanced';
      }
      
      return {
        tier: tier,
        intervention: alt,
        rationale: 'Resource-appropriate alternative for low-resource settings'
      };
    }
    
    // If it's an object, ensure all fields are strings (no nested objects)
    if (typeof alt === 'object' && alt !== null) {
      const transformed = {};
      if (alt.tier) transformed.tier = String(alt.tier);
      if (alt.intervention) {
        if (typeof alt.intervention === 'string') {
          transformed.intervention = alt.intervention;
        } else if (typeof alt.intervention === 'object') {
          transformed.intervention = alt.intervention.text || alt.intervention.description || String(alt.intervention);
        } else {
          transformed.intervention = String(alt.intervention);
        }
      }
      if (alt.rationale) transformed.rationale = String(alt.rationale);
      if (alt.trigger) transformed.trigger = String(alt.trigger);
      if (alt.action) transformed.action = String(alt.action);
      if (alt.monitoring) transformed.monitoring = String(alt.monitoring);
      return transformed;
    }
    
    return {
      tier: 'intermediate',
      intervention: String(alt),
      rationale: 'Resource-appropriate alternative for low-resource settings'
    };
  });
}

/**
 * Enhance diagnostic evidence with topic-specific metrics
 * Recognizes classic clinical patterns (chest pain, stroke, sepsis) for appropriate enhancements
 */
export function enhanceDiagnosticEvidence(diagnosticEvidence, category, caseTopic = '') {
  if (!diagnosticEvidence || typeof diagnosticEvidence !== 'object') {
    return {};
  }

  const enhanced = { ...diagnosticEvidence };
  const categoryLower = (category || '').toLowerCase();
  const topicLower = (caseTopic || '').toLowerCase();

  // Pattern recognition for classic clinical presentations
  const isCardiac = categoryLower.includes('cardio') || 
                     topicLower.includes('chest pain') || 
                     topicLower.includes('mi') || 
                     topicLower.includes('acs') || 
                     topicLower.includes('stemi') || 
                     topicLower.includes('nstemi') ||
                     topicLower.includes('angina') ||
                     topicLower.includes('cardiac');
  
  const isNeurological = categoryLower.includes('neuro') || 
                         topicLower.includes('stroke') || 
                         topicLower.includes('tia') || 
                         topicLower.includes('cva') ||
                         topicLower.includes('seizure') ||
                         topicLower.includes('neurological');
  
  const isInfectious = categoryLower.includes('infectious') || 
                       topicLower.includes('sepsis') || 
                       topicLower.includes('pneumonia') || 
                       topicLower.includes('infection') ||
                       topicLower.includes('bacteremia');
  
  // Dynamically add diagnostic metrics based on recognized patterns
  // Backend should provide these, but frontend can add placeholders if missing
  
  // For cardiac cases: serial troponin, ECG mapping
  if (isCardiac && !enhanced.serial_troponin) {
    enhanced.serial_troponin = 'Serial troponins should be measured at appropriate intervals based on clinical context.';
  }
  
  if (isCardiac && !enhanced.ecg_regional_mapping) {
    enhanced.ecg_regional_mapping = 'ECG changes correspond to specific anatomical territories relevant to this condition.';
  }

  // For neurological cases: serial neurological exam
  if (isNeurological && !enhanced.serial_neurological_exam) {
    enhanced.serial_neurological_exam = 'Serial neurological examinations should be performed to monitor progression.';
  }

  // For infectious cases: serial labs
  if (isInfectious && !enhanced.serial_labs) {
    enhanced.serial_labs = 'Serial laboratory monitoring should be performed based on the specific infection.';
  }

  return enhanced;
}

/**
 * Transform expert conference to structured format
 * Handles upgraded GPT-4o structure with voices, disagreement, evidence, consensus
 */
export function transformExpertConference(expertConference) {
  if (!expertConference) {
    return {
      discussion: '',
      agreement_points: [],
      disagreement_points: [],
      conclusion: ''
    };
  }

  if (typeof expertConference === 'string') {
    // Try to parse if it's JSON-like, otherwise return as discussion
    try {
      const parsed = JSON.parse(expertConference);
      if (parsed.agreement_points || parsed.disagreement_points || parsed.voices || parsed.consensus) {
        // Handle upgraded structure with voices
        if (parsed.voices && Array.isArray(parsed.voices)) {
          const discussion = parsed.voices.map(v => 
            `${v.role || 'Expert'}: ${v.position || v.argument || ''}`
          ).join('\n\n');
          const disagreements = parsed.voices
            .filter(v => v.disagreement)
            .map(v => ({
              topic: v.disagreement.topic || '',
              specialist_1: v.disagreement.position_1 || '',
              specialist_2: v.disagreement.position_2 || ''
            }));
          
          return {
            discussion: discussion || parsed.discussion || expertConference,
            agreement_points: parsed.agreement_points || [],
            disagreement_points: disagreements.length > 0 ? disagreements : (parsed.disagreement_points || []),
            conclusion: parsed.consensus || parsed.conclusion || ''
          };
        }
        // Standard structured format
        return {
          discussion: parsed.discussion || expertConference,
          agreement_points: parsed.agreement_points || [],
          disagreement_points: parsed.disagreement_points || [],
          conclusion: parsed.conclusion || ''
        };
      }
    } catch (e) {
      // Not JSON, treat as plain text
    }
    
    return {
      discussion: expertConference,
      agreement_points: [],
      disagreement_points: [],
      conclusion: ''
    };
  }

  // Already structured - handle upgraded GPT-4o format
  if (expertConference.voices && Array.isArray(expertConference.voices)) {
    // Build discussion from voices with evidence-based arguments
    const discussion = expertConference.voices.map(v => {
      const role = v.role || v.specialty || 'Expert';
      const position = v.position || v.argument || v.reasoning || '';
      const evidence = v.evidence ? ` (Evidence: ${v.evidence})` : '';
      const redFlags = v.red_flags ? ` [Red flags: ${Array.isArray(v.red_flags) ? v.red_flags.join(', ') : v.red_flags}]` : '';
      return `${role}: ${position}${evidence}${redFlags}`;
    }).join('\n\n');
    
    // Extract disagreements (2-3 points as per GPT-4o upgrade)
    const disagreements = expertConference.voices
      .filter(v => v.disagreement || v.disagrees_with)
      .map(v => {
        if (v.disagreement) {
          return {
            topic: v.disagreement.topic || v.disagreement.issue || '',
            specialist_1: v.disagreement.position_1 || v.disagreement.argument_1 || '',
            specialist_2: v.disagreement.position_2 || v.disagreement.argument_2 || '',
            evidence: v.disagreement.evidence || ''
          };
        }
        // Alternative format
        return {
          topic: v.disagrees_with?.topic || '',
          specialist_1: v.position || v.argument || '',
          specialist_2: v.disagrees_with?.position || '',
          evidence: v.evidence || ''
        };
      });
    
    // Extract agreement points if explicitly provided
    const agreementPoints = expertConference.agreement_points || 
      expertConference.voices
        .filter(v => !v.disagreement && !v.disagrees_with)
        .map(v => v.position || v.argument || '')
        .filter(p => p);
    
    return {
      discussion: discussion || expertConference.discussion || '',
      agreement_points: agreementPoints,
      disagreement_points: disagreements.length > 0 ? disagreements : (expertConference.disagreement_points || []),
      conclusion: expertConference.consensus || expertConference.conclusion || expertConference.final_consensus || ''
    };
  }

  // Standard structured format
  return {
    discussion: expertConference.discussion || expertConference.expert_conference || '',
    agreement_points: expertConference.agreement_points || [],
    disagreement_points: expertConference.disagreement_points || [],
    conclusion: expertConference.conclusion || ''
  };
}

/**
 * Transform pathophysiology to handle upgraded GPT-4o structure
 * Maps new structure (mechanism, molecular_drivers, etc.) to display format
 */
export function transformPathophysiology(pathophysiology, pathophysiology_detail = {}) {
  // If pathophysiology is an object with upgraded structure
  if (pathophysiology && typeof pathophysiology === 'object' && !Array.isArray(pathophysiology)) {
    const upgraded = pathophysiology;
    
    // Map upgraded fields to display structure
    const detail = {
      ...pathophysiology_detail,
      // Map new structure to existing display fields
      cellular_molecular: upgraded.molecular_drivers || upgraded.mechanism || pathophysiology_detail.cellular_molecular,
      organ_microanatomy: upgraded.organ_interactions || pathophysiology_detail.organ_microanatomy,
      mechanistic_links: upgraded.mechanism || pathophysiology_detail.mechanistic_links,
      compensatory_pathways: upgraded.recovery_path || pathophysiology_detail.compensatory_pathways,
      timeline: upgraded.timeline || pathophysiology_detail.timeline,
      diagnostic_implications: upgraded.diagnostic_implications || pathophysiology_detail.diagnostic_implications,
      therapeutic_implications: upgraded.therapeutic_implications || pathophysiology_detail.therapeutic_implications
    };
    
    // Create a readable string summary
    const summaryParts = [];
    if (upgraded.mechanism) summaryParts.push(`Mechanism: ${upgraded.mechanism}`);
    if (upgraded.molecular_drivers) summaryParts.push(`Molecular Drivers: ${upgraded.molecular_drivers}`);
    if (upgraded.organ_interactions) summaryParts.push(`Organ Interactions: ${upgraded.organ_interactions}`);
    if (upgraded.timeline) summaryParts.push(`Timeline: ${upgraded.timeline}`);
    
    return {
      pathophysiology: summaryParts.length > 0 ? summaryParts.join('\n\n') : (typeof pathophysiology === 'string' ? pathophysiology : JSON.stringify(pathophysiology)),
      pathophysiology_detail: detail
    };
  }
  
  // If it's a string, return as-is
  return {
    pathophysiology: typeof pathophysiology === 'string' ? pathophysiology : '',
    pathophysiology_detail: pathophysiology_detail
  };
}

/**
 * Transform management to ensure all fields are renderable (arrays of strings)
 * Handles GPT-4o upgraded structure: { initial: [...], definitive: [...], escalation: [...], interventions: [...] }
 * FLATTENS all objects into arrays of readable strings - never allows [object Object]
 */
export function transformManagement(management) {
  if (!management) {
    return {};
  }

  // If it's already a string, convert to array
  if (typeof management === 'string') {
    return { text: [management] };
  }

  // If it's not an object, return empty
  if (typeof management !== 'object' || Array.isArray(management)) {
    return {};
  }

  const transformed = { ...management };

  // Helper to convert any value to array of strings (never objects)
  const toStringArray = (value) => {
    if (value == null) return [];
    if (typeof value === 'string') {
      // Split by newlines if multi-line, otherwise single item
      return value.split('\n').filter(line => line.trim());
    }
    if (typeof value === 'number' || typeof value === 'boolean') return [String(value)];
    if (Array.isArray(value)) {
      // Convert array to array of strings
      return value.map(item => {
        if (typeof item === 'string') return item;
        if (typeof item === 'number' || typeof item === 'boolean') return String(item);
        if (typeof item === 'object' && item !== null) {
          // Extract text/description/name, or convert to readable format
          if (item.text) return item.text;
          if (item.description) return item.description;
          if (item.name) return item.name;
          // Convert object to readable string
          const keys = Object.keys(item);
          if (keys.length === 0) return '';
          return keys.map(key => {
            const val = item[key];
            if (typeof val === 'string') return `${key}: ${val}`;
            if (typeof val === 'number' || typeof val === 'boolean') return `${key}: ${val}`;
            return `${key}: ${String(val)}`;
          }).join('; ');
        }
        return String(item);
      }).filter(item => item && item.trim());
    }
    if (typeof value === 'object') {
      // Convert object to array of strings
      const keys = Object.keys(value);
      if (keys.length === 0) return [];
      // If object has text/description, use it
      if (value.text) return [value.text];
      if (value.description) return [value.description];
      if (value.name) return [value.name];
      // Convert to readable format
      return keys.map(key => {
        const val = value[key];
        if (typeof val === 'string') return `${key}: ${val}`;
        if (typeof val === 'number' || typeof val === 'boolean') return `${key}: ${val}`;
        if (Array.isArray(val)) return `${key}: ${val.join(', ')}`;
        return `${key}: ${String(val)}`;
      }).filter(item => item && item.trim());
    }
    return [String(value)];
  };

  // Transform common management fields to arrays of strings
  const fieldsToTransform = ['initial', 'definitive', 'escalation', 'interventions', 'disposition', 'monitoring', 'dosing'];
  
  fieldsToTransform.forEach(field => {
    if (transformed[field]) {
      transformed[field] = toStringArray(transformed[field]);
    }
  });

  // Handle nested objects (e.g., initial.immediate, initial.stabilization)
  Object.keys(transformed).forEach(key => {
    if (typeof transformed[key] === 'object' && !Array.isArray(transformed[key]) && transformed[key] !== null) {
      // Always flatten nested objects to arrays of strings
      transformed[key] = toStringArray(transformed[key]);
    }
  });

  return transformed;
}

/**
 * Transform LMIC alternatives to ensure all intervention blocks are renderable
 */
export function transformLMICInterventions(lmicAlternatives) {
  if (!Array.isArray(lmicAlternatives) || lmicAlternatives.length === 0) {
    return [];
  }

  return lmicAlternatives.map(alt => {
    if (typeof alt === 'string') {
      return alt;
    }
    
    if (typeof alt === 'object' && alt !== null) {
      const transformed = { ...alt };
      
      // Ensure intervention field is renderable
      if (transformed.intervention) {
        if (typeof transformed.intervention === 'object' && !Array.isArray(transformed.intervention)) {
          // Convert object to string
          if (transformed.intervention.text) {
            transformed.intervention = transformed.intervention.text;
          } else if (transformed.intervention.description) {
            transformed.intervention = transformed.intervention.description;
          } else {
            transformed.intervention = JSON.stringify(transformed.intervention);
          }
        } else if (Array.isArray(transformed.intervention)) {
          transformed.intervention = transformed.intervention.map(item => 
            typeof item === 'string' ? item : (item.text || item.description || JSON.stringify(item))
          ).join(', ');
        }
      }
      
      // Ensure other fields are strings
      if (transformed.rationale && typeof transformed.rationale !== 'string') {
        transformed.rationale = String(transformed.rationale);
      }
      if (transformed.trigger && typeof transformed.trigger !== 'string') {
        transformed.trigger = String(transformed.trigger);
      }
      if (transformed.action && typeof transformed.action !== 'string') {
        transformed.action = String(transformed.action);
      }
      if (transformed.monitoring && typeof transformed.monitoring !== 'string') {
        transformed.monitoring = String(transformed.monitoring);
      }
      
      return transformed;
    }
    
    return String(alt);
  });
}

/**
 * Fallback formatter: if any field resolves to non-string → stringify safely
 * @param {*} value - Value to format
 * @returns {string} Safe string representation
 */
function safeStringify(value) {
  if (value == null) return '';
  if (typeof value === 'string') {
    // Remove [object Object] if present
    if (value.includes('[object Object]') || value.includes('[object object]')) {
      return value.replace(/\[object Object\]/gi, '').trim() || '';
    }
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map(item => safeStringify(item)).filter(item => item).join(', ');
  }
  if (typeof value === 'object') {
    // Try to extract meaningful content
    if (value.text) return safeStringify(value.text);
    if (value.description) return safeStringify(value.description);
    if (value.name) return safeStringify(value.name);
    // Convert to readable format
    const keys = Object.keys(value);
    if (keys.length === 0) return '';
    return keys.map(key => `${key}: ${safeStringify(value[key])}`).join('; ');
  }
  return String(value);
}

/**
 * Auto-clean guideline blocks: remove empty sections before display
 * @param {Object} guidelines - Guidelines object
 * @returns {Object} Cleaned guidelines
 */
function autoCleanGuidelines(guidelines) {
  if (!guidelines || typeof guidelines !== 'object') {
    return {};
  }
  
  const cleaned = {};
  const tiers = ['local', 'national', 'continental', 'usa', 'international'];
  
  tiers.forEach(tier => {
    if (guidelines[tier] && Array.isArray(guidelines[tier]) && guidelines[tier].length > 0) {
      // Filter out empty or invalid entries
      const validEntries = guidelines[tier].filter(entry => {
        if (!entry) return false;
        if (typeof entry === 'string') {
          return entry.trim().length > 0 && !entry.includes('[object Object]');
        }
        if (typeof entry === 'object') {
          // Check if it has meaningful content
          const hasContent = entry.title || entry.org || entry.year || entry.name;
          return hasContent && !String(hasContent).includes('[object Object]');
        }
        return false;
      });
      if (validEntries.length > 0) {
        cleaned[tier] = validEntries;
      }
    }
  });
  
  // Preserve other fields (lmic_alternatives, etc.)
  Object.keys(guidelines).forEach(key => {
    if (!tiers.includes(key) && guidelines[key]) {
      cleaned[key] = guidelines[key];
    }
  });
  
  return cleaned;
}

/**
 * Main transformer function - applies all improvements
 */
export function transformCaseForDisplay(caseData) {
  if (!caseData || typeof caseData !== 'object') {
    return caseData;
  }

  const transformed = { ...caseData };

  // 1. Clean reasoning chain
  if (transformed.reasoning_chain) {
    transformed.reasoning_chain = cleanReasoningChain(transformed.reasoning_chain);
  }

  // 2. Filter and auto-clean guidelines
  if (transformed.guidelines) {
    transformed.guidelines = filterGuidelines(
      transformed.guidelines, 
      transformed.meta?.category,
      transformed.meta?.topic
    );
    // Auto-clean: remove empty sections
    transformed.guidelines = autoCleanGuidelines(transformed.guidelines);
  }

  // 3. Stratify differentials
  if (transformed.differential_diagnoses) {
    transformed.differential_diagnoses_stratified = stratifyDifferentials(transformed.differential_diagnoses);
  }

  // 4. Transform management (ensure all fields are renderable)
  if (transformed.management) {
    transformed.management = transformManagement(transformed.management);
  }

  // 5. Filter complications
  if (transformed.management?.complications) {
    transformed.management.complications = filterComplications(
      transformed.management.complications,
      transformed.meta?.category,
      transformed.meta?.topic
    );
  }

  // 6. Enhance pharmacology
  if (transformed.management?.pharmacology) {
    transformed.management.pharmacology = enhancePharmacology(transformed.management.pharmacology);
  }

  // 7. Transform LMIC alternatives - REQUIRED: bullet-style readable text, no raw JSON
  if (transformed.guidelines?.lmic_alternatives) {
    transformed.guidelines.lmic_alternatives = transformLMICAlternatives(transformed.guidelines.lmic_alternatives);
    // Also ensure intervention blocks are renderable
    transformed.guidelines.lmic_alternatives = transformLMICInterventions(transformed.guidelines.lmic_alternatives);
    
    // Convert LMIC to bullet-style readable text format
    transformed.guidelines.lmic_alternatives = transformed.guidelines.lmic_alternatives.map(alt => {
      if (typeof alt === 'string') {
        // Already a string, return as bullet point
        return alt;
      }
      if (typeof alt === 'object' && alt !== null) {
        // Format as readable bullet points
        const parts = [];
        if (alt.resource_level) parts.push(`Resource Level: ${alt.resource_level}`);
        if (alt.intervention) parts.push(`Intervention: ${alt.intervention}`);
        if (alt.trigger) parts.push(`Trigger: ${alt.trigger}`);
        if (alt.action) parts.push(`Action: ${alt.action}`);
        if (alt.monitoring) parts.push(`Monitoring: ${alt.monitoring}`);
        return parts.length > 0 ? parts.join(' | ') : JSON.stringify(alt);
      }
      return String(alt);
    });
  }

  // 8. Enhance diagnostic evidence
  if (transformed.paraclinical?.diagnostic_evidence) {
    transformed.paraclinical.diagnostic_evidence = enhanceDiagnosticEvidence(
      transformed.paraclinical.diagnostic_evidence,
      transformed.meta?.category,
      transformed.meta?.topic
    );
  }

  // 9. Transform expert conference
  if (transformed.expert_conference) {
    transformed.expert_conference_structured = transformExpertConference(transformed.expert_conference);
  }

  // 10. Transform pathophysiology (handle upgraded GPT-4o structure)
  // MERGE pathophysiology + detailed pathophysiology into single collapsible section
  if (transformed.pathophysiology || transformed.pathophysiology_detail) {
    const pathoResult = transformPathophysiology(
      transformed.pathophysiology,
      transformed.pathophysiology_detail || {}
    );
    // Merge into single pathophysiology_detail object
    if (pathoResult.pathophysiology_detail && Object.keys(pathoResult.pathophysiology_detail).length > 0) {
      // If we have detailed patho, use it as primary
      transformed.pathophysiology_detail = pathoResult.pathophysiology_detail;
      // Keep summary as pathophysiology
      transformed.pathophysiology = pathoResult.pathophysiology || '';
    } else {
      transformed.pathophysiology = pathoResult.pathophysiology;
      transformed.pathophysiology_detail = pathoResult.pathophysiology_detail;
    }
  }

  // 11. Clean red-flag hierarchy: hide empty placeholders
  if (transformed.red_flag_hierarchy) {
    const cleaned = {};
    Object.keys(transformed.red_flag_hierarchy).forEach(tier => {
      const flags = transformed.red_flag_hierarchy[tier];
      if (flags && Array.isArray(flags) && flags.length > 0) {
        // Filter out empty strings and placeholder text
        const validFlags = flags.filter(flag => {
          if (!flag || typeof flag !== 'string') return false;
          const lower = flag.toLowerCase().trim();
          return lower.length > 0 && 
                 !lower.includes('[object object]') &&
                 !lower.includes('placeholder') &&
                 !lower.includes('not provided') &&
                 !lower.includes('n/a');
        });
        if (validFlags.length > 0) {
          cleaned[tier] = validFlags;
        }
      }
    });
    transformed.red_flag_hierarchy = Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }

  // 12. Final sanitization: ensure no [object Object] reaches JSX
  // SAFEGUARD: Never render empty schema blocks; mark for warning banners
  const sanitizeValue = (value) => {
    if (value == null) return value;
    if (typeof value === 'string') {
      // Replace any [object Object] strings
      if (value.includes('[object Object]') || value.includes('[object object]')) {
        return value.replace(/\[object Object\]/gi, '').trim() || '';
      }
      return value;
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      // Check if object is empty
      if (Object.keys(value).length === 0) {
        return null; // Mark empty objects as null for frontend to show warnings
      }
      // Recursively sanitize object
      const sanitized = {};
      Object.keys(value).forEach(key => {
        sanitized[key] = sanitizeValue(value[key]);
      });
      // Check if all values are null/empty
      const hasContent = Object.values(sanitized).some(v => v !== null && v !== '' && (Array.isArray(v) ? v.length > 0 : true));
      return hasContent ? sanitized : null;
    }
    if (Array.isArray(value)) {
      const sanitized = value.map(item => sanitizeValue(item)).filter(item => item !== null && item !== '');
      return sanitized.length > 0 ? sanitized : null; // Mark empty arrays as null
    }
    return value;
  };

  // Sanitize all top-level fields
  Object.keys(transformed).forEach(key => {
    const sanitized = sanitizeValue(transformed[key]);
    // Mark empty critical blocks for frontend warnings
    if (sanitized === null && ['expert_conference', 'pathophysiology', 'guidelines', 'red_flag_hierarchy'].includes(key)) {
      transformed[`${key}_empty`] = true;
    }
    transformed[key] = sanitized;
  });

  // FINAL PASS: Apply safe parser and fallback formatter to all fields
  const applySafeFormatting = (obj) => {
    if (obj == null) return obj;
    if (typeof obj === 'string') return safeStringify(obj);
    if (typeof obj === 'number' || typeof obj === 'boolean') return obj;
    if (Array.isArray(obj)) {
      return obj.map(item => {
        if (typeof item === 'string') return safeStringify(item);
        if (typeof item === 'object') return safeParseNested(item);
        return safeStringify(item);
      });
    }
    if (typeof obj === 'object') {
      const formatted = {};
      Object.keys(obj).forEach(key => {
        formatted[key] = applySafeFormatting(obj[key]);
      });
      return formatted;
    }
    return safeStringify(obj);
  };

  // Apply safe formatting to critical fields
  const criticalFields = ['management', 'guidelines', 'paraclinical', 'differential_diagnoses', 'red_flags', 'reasoning_chain'];
  criticalFields.forEach(field => {
    if (transformed[field]) {
      transformed[field] = applySafeFormatting(transformed[field]);
    }
  });

  return transformed;
}
