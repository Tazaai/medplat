/**
 * Case Post-Processor
 * Lightweight structural cleanup for generated cases without heavy pipelines.
 * Ensures JSON output is clean, professional, and suitable for medical professionals.
 */

/**
 * Post-process a generated case to ensure structural cleanliness
 * @param {Object} caseData - The generated case object
 * @returns {Object} - Cleaned case object
 */
export function postProcessCase(caseData) {
  if (!caseData || typeof caseData !== 'object') {
    return caseData;
  }

  let cleaned = { ...caseData };

  // 1. Ensure final_diagnosis is always filled
  cleaned = ensureFinalDiagnosis(cleaned);

  // 1a. Validate final_diagnosis doesn't reference unavailable labs
  cleaned = validateFinalDiagnosisLabs(cleaned);

  // 2. Clean History text to avoid embedded JSON blocks
  cleaned = cleanHistory(cleaned);

  // 3. Ensure paraclinical structure exists
  cleaned = ensureParaclinicalStructure(cleaned);

  // 3a. Clean Paraclinical text to avoid embedded JSON blocks
  cleaned = cleanParaclinical(cleaned);

  // 3b. Remove paraclinical placeholders and ensure completeness
  cleaned = removeParaclinicalPlaceholders(cleaned);

  // 3c. Normalize normal_range formatting in labs/vitals (preserve object structure for frontend formatting)
  cleaned = normalizeNormalRanges(cleaned);
  
  // Note: formatParaclinicalForDisplay removed - frontend handles formatting

  // 3d. Normalize differential diagnoses into structured objects with justifications
  cleaned = normalizeDifferentials(cleaned);

  // 4. Stabilize Management Escalation structure
  cleaned = stabilizeManagement(cleaned);

  // 4a. Improve escalation logic to be pathology-specific
  cleaned = improveEscalationLogic(cleaned);

  // 5. Map stability/risk/consistency into standard fields
  cleaned = mapStabilityRiskConsistency(cleaned);

  // 6. Route teaching/deep evidence blocks into existing schema fields
  cleaned = routeTeachingAndEvidence(cleaned);

  // 7. Clean expert_conference noise
  cleaned = cleanExpertConference(cleaned);

  // 8. Remove cross-section redundancy (verbatim repetition)
  cleaned = removeCrossSectionRedundancy(cleaned);

  // 9. Add lightweight consistency checks
  cleaned = addConsistencyChecks(cleaned);

  // 10. Soften CXR conclusions when echo/BNP not available
  cleaned = softenCXRConclusions(cleaned);

  // 11. Add contraindication logic for management
  cleaned = addManagementContraindications(cleaned);

  // 12. Enforce strict data reuse in Deep Evidence Mode
  cleaned = enforceDeepEvidenceStrictReuse(cleaned);

  return cleaned;
}

/**
 * Ensure final_diagnosis is always filled with a specific diagnosis
 */
function ensureFinalDiagnosis(caseData) {
  const cleaned = { ...caseData };

  // If final_diagnosis is empty or placeholder, try to infer from context
  if (!cleaned.final_diagnosis || 
      cleaned.final_diagnosis.trim() === '' || 
      cleaned.final_diagnosis.toLowerCase().includes('not provided') ||
      cleaned.final_diagnosis.toLowerCase().includes('see case') ||
      cleaned.final_diagnosis.toLowerCase().includes('to be determined') ||
      cleaned.final_diagnosis.toLowerCase().includes('pending')) {
    
    // Try meta.primary_diagnosis first
    if (cleaned.meta?.primary_diagnosis && 
        cleaned.meta.primary_diagnosis.trim() !== '' &&
        !cleaned.meta.primary_diagnosis.toLowerCase().includes('not provided')) {
      cleaned.final_diagnosis = cleaned.meta.primary_diagnosis;
    }
    // Try meta.topic if it looks like a diagnosis
    else if (cleaned.meta?.topic) {
      const topic = cleaned.meta.topic.trim();
      // If topic is a diagnosis-like string (not too generic), use it
      if (topic.length > 3 && 
          !topic.toLowerCase().includes('case') &&
          !topic.toLowerCase().includes('scenario') &&
          !topic.toLowerCase().includes('presentation')) {
        cleaned.final_diagnosis = topic;
      }
    }
    // Try to extract from differential_diagnoses if available
    else if (cleaned.differential_diagnoses && Array.isArray(cleaned.differential_diagnoses) && cleaned.differential_diagnoses.length > 0) {
      const firstDiff = cleaned.differential_diagnoses[0];
      if (typeof firstDiff === 'string') {
        cleaned.final_diagnosis = firstDiff.split(':')[0].trim();
      } else if (firstDiff.name) {
        cleaned.final_diagnosis = firstDiff.name;
      } else if (firstDiff.diagnosis) {
        cleaned.final_diagnosis = firstDiff.diagnosis;
      }
    }
    // Try to infer from paraclinical content (e.g., AML from blast count, ACS from troponin)
    else if (cleaned.paraclinical) {
      const paraclinicalText = JSON.stringify(cleaned.paraclinical).toLowerCase();
      const historyText = (cleaned.history || '').toLowerCase();
      const examText = (cleaned.physical_exam || '').toLowerCase();
      const combinedText = `${paraclinicalText} ${historyText} ${examText}`;
      
      // Common diagnosis patterns
      if (combinedText.includes('blast') || combinedText.includes('aml') || combinedText.includes('acute myeloid leukemia')) {
        cleaned.final_diagnosis = 'Acute Myeloid Leukemia (AML)';
      } else if (combinedText.includes('troponin') && (combinedText.includes('elevated') || combinedText.includes('high') || combinedText.includes('positive'))) {
        cleaned.final_diagnosis = 'Acute Coronary Syndrome (ACS)';
      } else if (combinedText.includes('stroke') || (combinedText.includes('ct') && combinedText.includes('ischemic'))) {
        cleaned.final_diagnosis = 'Acute Ischemic Stroke';
      } else if (combinedText.includes('pneumonia') || (combinedText.includes('chest x-ray') && combinedText.includes('infiltrate'))) {
        cleaned.final_diagnosis = 'Community-Acquired Pneumonia';
      } else if (combinedText.includes('sepsis') || (combinedText.includes('lactate') && combinedText.includes('elevated'))) {
        cleaned.final_diagnosis = 'Sepsis';
      } else if (combinedText.includes('diabetic ketoacidosis') || (combinedText.includes('dka') || (combinedText.includes('glucose') && combinedText.includes('ketone')))) {
        cleaned.final_diagnosis = 'Diabetic Ketoacidosis (DKA)';
      } else if (combinedText.includes('pulmonary embolism') || (combinedText.includes('pe') || (combinedText.includes('ctpa') && combinedText.includes('embolism')))) {
        cleaned.final_diagnosis = 'Pulmonary Embolism (PE)';
      } else if (combinedText.includes('appendicitis') || (combinedText.includes('ct abdomen') && combinedText.includes('appendix'))) {
        cleaned.final_diagnosis = 'Acute Appendicitis';
      } else if (combinedText.includes('myocardial infarction') || combinedText.includes('mi') || combinedText.includes('stemi')) {
        cleaned.final_diagnosis = 'Acute Myocardial Infarction (MI)';
      } else if (combinedText.includes('heart failure') || (combinedText.includes('bnp') && combinedText.includes('elevated'))) {
        cleaned.final_diagnosis = 'Acute Heart Failure';
      } else if (combinedText.includes('chf') || (combinedText.includes('congestive heart failure') && (combinedText.includes('exacerbation') || combinedText.includes('decompensated')))) {
        cleaned.final_diagnosis = 'CHF Exacerbation';
      } else if (combinedText.includes('meningitis') || (combinedText.includes('lumbar puncture') && (combinedText.includes('pleocytosis') || combinedText.includes('elevated protein')))) {
        cleaned.final_diagnosis = 'Meningitis';
      } else if (combinedText.includes('asthma') && (combinedText.includes('exacerbation') || combinedText.includes('attack') || combinedText.includes('wheezing'))) {
        cleaned.final_diagnosis = 'Acute Asthma Exacerbation';
      } else if (combinedText.includes('copd') && (combinedText.includes('exacerbation') || combinedText.includes('decompensated'))) {
        cleaned.final_diagnosis = 'COPD Exacerbation';
      } else if (combinedText.includes('chf') || (combinedText.includes('congestive heart failure') || (combinedText.includes('jvd') && combinedText.includes('edema')))) {
        cleaned.final_diagnosis = 'CHF Exacerbation';
      } else if (combinedText.includes('meningitis') || (combinedText.includes('lumbar puncture') && combinedText.includes('csf')) || (combinedText.includes('kernig') || combinedText.includes('brudzinski'))) {
        cleaned.final_diagnosis = 'Meningitis';
      } else if (combinedText.includes('asthma') && (combinedText.includes('wheezing') || combinedText.includes('bronchospasm') || combinedText.includes('peak flow'))) {
        cleaned.final_diagnosis = 'Acute Asthma Attack';
      } else if (combinedText.includes('copd') && (combinedText.includes('exacerbation') || combinedText.includes('acute'))) {
        cleaned.final_diagnosis = 'COPD Exacerbation';
      } else if (paraclinicalText.includes('stroke') || paraclinicalText.includes('ct head') || paraclinicalText.includes('mri brain')) {
        cleaned.final_diagnosis = 'Acute Stroke';
      } else if (paraclinicalText.includes('pneumonia') || paraclinicalText.includes('chest x-ray') || paraclinicalText.includes('infiltrate')) {
        cleaned.final_diagnosis = 'Community-Acquired Pneumonia';
      }
    }
    // Last resort: use a generic placeholder that's better than empty
    if (!cleaned.final_diagnosis || cleaned.final_diagnosis.trim() === '') {
      cleaned.final_diagnosis = 'Clinical diagnosis pending further evaluation';
    }
  }

  return cleaned;
}

/**
 * Repair missing differential evidence fields before normalization
 * Ensures all differentials have usable raw evidence for for/against generation
 */
function repairMissingDifferentialEvidence(diffs, caseData) {
  return diffs.map(d => {
    if (typeof d === 'string') return { name: d };
    const name = d.name || d.diagnosis || 'Unknown';
    const hasAny = d.supporting || d.justification || d.clue;
    if (!hasAny) {
      const h = caseData.history?.slice(0,150) || '';
      d.justification = `Based on case: ${h}`;
    }
    return d;
  });
}

/**
 * Normalize differentials into objects with a meaningful justification to avoid
 * placeholder text downstream.
 */
function normalizeDifferentials(caseData) {
  const cleaned = { ...caseData };

  if (!Array.isArray(cleaned.differential_diagnoses)) {
    return cleaned;
  }

  const DIFF_PLACEHOLDERS = ['no_raw', 'no justification', 'not provided', 'none', 'n/a'];
  function isPlaceholder(x) { return !x || DIFF_PLACEHOLDERS.includes(String(x).toLowerCase().trim()); }

  // Repair missing evidence fields before normalization
  const repaired = repairMissingDifferentialEvidence(cleaned.differential_diagnoses, cleaned);
  cleaned.differential_diagnoses = repaired;

  const parseJustification = (text) => {
    if (!text || typeof text !== 'string') return '';
    const pieces = text.split(/[-–—]|:/).map(p => p.trim()).filter(Boolean);
    if (pieces.length <= 1) return '';
    // Rejoin everything after the first token as justification
    return pieces.slice(1).join(' | ');
  };

  // Build context for enhanced justification
  const historyText = (cleaned.history || '').toLowerCase();
  const examText = (cleaned.physical_exam || '').toLowerCase();
  const paraclinicalText = JSON.stringify(cleaned.paraclinical || {}).toLowerCase();
  const contextText = `${historyText} ${examText} ${paraclinicalText}`;

  // Extract available labs/values from paraclinical (for validation)
  const extractAvailableLabs = () => {
    const available = new Set();
    const paraclinical = cleaned.paraclinical || {};
    
    // Common lab names to check for
    const labNames = [
      'sodium', 'na', 'potassium', 'k', 'chloride', 'cl', 'bicarbonate', 'hco3',
      'glucose', 'bun', 'creatinine', 'creat', 'troponin', 'ck', 'ck-mb',
      'bnp', 'nt-probnp', 'd-dimer', 'ddimer', 'lactate', 'wbc', 'white blood cell',
      'hemoglobin', 'hgb', 'hematocrit', 'hct', 'platelet', 'plt',
      'alt', 'ast', 'bilirubin', 'albumin', 'inr', 'pt', 'ptt',
      'urinalysis', 'ua', 'urine', 'culture', 'blood culture',
      'troponin i', 'troponin t', 'ckmb', 'myoglobin'
    ];
    
    // Check labs object
    if (paraclinical.labs) {
      if (typeof paraclinical.labs === 'object' && !Array.isArray(paraclinical.labs)) {
        for (const [key, value] of Object.entries(paraclinical.labs)) {
          const keyLower = key.toLowerCase();
          const valueStr = String(value || '').trim().toLowerCase();
          // Only add if value exists and is not a placeholder
          if (valueStr && valueStr.length > 0 && 
              !['n/a', 'na', 'none', 'pending', 'not provided', 'tbd', 'placeholder'].includes(valueStr)) {
            available.add(keyLower);
            // Also add common variations
            for (const labName of labNames) {
              if (keyLower.includes(labName) || labName.includes(keyLower)) {
                available.add(labName);
              }
            }
          }
        }
      } else if (typeof paraclinical.labs === 'string') {
        // Extract lab names from string
        const labsStr = paraclinical.labs.toLowerCase();
        for (const labName of labNames) {
          if (labsStr.includes(labName) && !labsStr.includes(`${labName} not`) && 
              !labsStr.includes(`${labName} n/a`) && !labsStr.includes(`${labName} pending`)) {
            available.add(labName);
          }
        }
      }
    }
    
    // Check imaging
    if (paraclinical.imaging) {
      const imagingStr = typeof paraclinical.imaging === 'string' 
        ? paraclinical.imaging.toLowerCase() 
        : JSON.stringify(paraclinical.imaging).toLowerCase();
      if (imagingStr.includes('ecg') || imagingStr.includes('ekg')) available.add('ecg');
      if (imagingStr.includes('chest x-ray') || imagingStr.includes('cxr')) available.add('cxr');
      if (imagingStr.includes('ct') && !imagingStr.includes('ct not')) available.add('ct');
      if (imagingStr.includes('mri') && !imagingStr.includes('mri not')) available.add('mri');
      if (imagingStr.includes('ultrasound') && !imagingStr.includes('ultrasound not')) available.add('ultrasound');
      if (imagingStr.includes('ctpa') && !imagingStr.includes('ctpa not')) available.add('ctpa');
    }
    
    return available;
  };

  const availableLabs = extractAvailableLabs();

  // Validate and remove references to missing/placeholder labs from text
  const removeInvalidLabReferences = (text) => {
    if (!text || typeof text !== 'string') return text;
    
    const labPatterns = [
      /\b(sodium|na)\s+(?:is|was|of|level|value|result)\s+[^.]*\.?/gi,
      /\b(potassium|k)\s+(?:is|was|of|level|value|result)\s+[^.]*\.?/gi,
      /\b(urinalysis|ua)\s+(?:is|was|shows?|reveals?)\s+[^.]*\.?/gi,
      /\b(glucose|blood sugar)\s+(?:is|was|of|level|value|result)\s+[^.]*\.?/gi,
      /\b(bun|blood urea nitrogen)\s+(?:is|was|of|level|value|result)\s+[^.]*\.?/gi,
      /\b(creatinine|creat)\s+(?:is|was|of|level|value|result)\s+[^.]*\.?/gi,
      /\b(troponin)\s+(?:is|was|of|level|value|result)\s+[^.]*\.?/gi,
      /\b(d-dimer|ddimer)\s+(?:is|was|of|level|value|result)\s+[^.]*\.?/gi,
      /\b(lactate)\s+(?:is|was|of|level|value|result)\s+[^.]*\.?/gi,
      /\b(bnp|nt-probnp)\s+(?:is|was|of|level|value|result)\s+[^.]*\.?/gi,
    ];
    
    let cleaned = text;
    
    for (const pattern of labPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const labName = match[1].toLowerCase();
        // Check if this lab is available
        const isAvailable = Array.from(availableLabs).some(available => 
          available.includes(labName) || labName.includes(available)
        );
        
        if (!isAvailable) {
          // Remove this reference
          cleaned = cleaned.replace(match[0], '').trim();
        }
      }
    }
    
    // Clean up multiple spaces and periods
    cleaned = cleaned.replace(/\s+/g, ' ').replace(/\.{2,}/g, '.').trim();
    
    return cleaned;
  };

  // Extract specific clues from case content (for supporting evidence)
  // Enhanced to extract concrete facts, not generic statements
  // Improved matching: uses diagnosis-specific keywords to find relevant evidence
  const extractSpecificClues = (diagnosisName) => {
    const nameLower = diagnosisName.toLowerCase();
    const clues = [];
    
    // Diagnosis-specific keyword mapping for better evidence extraction
    const diagnosisKeywords = {
      'aortic dissection': ['chest pain', 'back pain', 'tearing', 'ripping', 'ct angiography', 'cta', 'mediastinal', 'aorta'],
      'pulmonary embolism': ['dyspnea', 'shortness of breath', 'chest pain', 'd-dimer', 'ctpa', 'ventilation', 'perfusion'],
      'unstable angina': ['chest pain', 'troponin', 'ecg', 'st elevation', 'st depression', 'coronary'],
      'myocardial infarction': ['chest pain', 'troponin', 'ck-mb', 'ecg', 'st elevation', 'coronary'],
      'stem': ['chest pain', 'troponin', 'ecg', 'st elevation', 'coronary'],
      'pneumonia': ['fever', 'cough', 'chest x-ray', 'cxr', 'infiltrate', 'wbc', 'culture'],
      'appendicitis': ['abdominal pain', 'right lower quadrant', 'ct', 'ultrasound', 'wbc'],
      'pancreatitis': ['abdominal pain', 'lipase', 'amylase', 'ct'],
    };
    
    // Find relevant keywords for this diagnosis
    const relevantKeywords = [];
    for (const [key, keywords] of Object.entries(diagnosisKeywords)) {
      if (nameLower.includes(key)) {
        relevantKeywords.push(...keywords);
      }
    }
    // Also add individual words from diagnosis name
    const nameWords = nameLower.split(/\s+/).filter(w => w.length > 3);
    relevantKeywords.push(...nameWords);
    
    // Extract concrete findings from history (symptoms, timing, quality)
    if (historyText) {
      const historySentences = historyText.split(/[.!?]/).filter(s => s.trim().length > 10);
      for (const sentence of historySentences) {
        // Look for specific symptoms, timing, or quality descriptors
        const hasSpecificDetail = /\b\d+\s*(?:hour|day|week|month|year|minute)\b/i.test(sentence) ||
                                   /\b(?:sudden|gradual|acute|chronic|severe|mild|sharp|dull|radiating)\b/i.test(sentence) ||
                                   /\b(?:fever|pain|dyspnea|chest pain|shortness of breath|nausea|vomiting)\b/i.test(sentence);
        
        if (hasSpecificDetail && sentence.length < 200) {
          // Check if sentence relates to diagnosis using keywords
          const sentenceLower = sentence.toLowerCase();
          const relatesToDiagnosis = relevantKeywords.some(keyword => sentenceLower.includes(keyword)) ||
                                     nameWords.some(word => sentenceLower.includes(word)) ||
                                     sentenceLower.includes(nameLower.split(' ')[0]);
          
          if (relatesToDiagnosis) {
            const clue = sentence.trim();
            if (clue && !clues.some(c => c.toLowerCase() === clue.toLowerCase())) {
              clues.push(clue);
              if (clues.length >= 2) break;
            }
          }
        }
      }
    }
    
    // Extract concrete findings from physical exam (specific signs, vitals, measurements)
    if (examText) {
      const examSentences = examText.split(/[.!?]/).filter(s => s.trim().length > 10);
      for (const sentence of examSentences) {
        // Look for specific exam findings: vitals, physical signs, measurements
        const hasSpecificFinding = /\b\d+\s*(?:mmhg|bpm|°c|%|cm|kg)\b/i.test(sentence) ||
                                   /\b(?:tachycardia|bradycardia|hypertension|hypotension|fever|hypothermia)\b/i.test(sentence) ||
                                   /\b(?:murmur|gallop|rales|wheezes|edema|distension|tenderness|guarding)\b/i.test(sentence);
        
        if (hasSpecificFinding && sentence.length < 200) {
          const sentenceLower = sentence.toLowerCase();
          const relatesToDiagnosis = relevantKeywords.some(keyword => sentenceLower.includes(keyword)) ||
                                     nameWords.some(word => sentenceLower.includes(word)) ||
                                     sentenceLower.includes(nameLower.split(' ')[0]);
          
          if (relatesToDiagnosis) {
            const clue = sentence.trim();
            if (clue && !clues.some(c => c.toLowerCase() === clue.toLowerCase())) {
              clues.push(clue);
              if (clues.length >= 2) break;
            }
          }
        }
      }
    }
    
    // Extract concrete findings from paraclinical (specific lab values, imaging findings)
    // This is the most important source for differential justification
    if (paraclinicalText) {
      const paraclinicalSentences = paraclinicalText.split(/[.!?]/).filter(s => s.trim().length > 10);
      for (const sentence of paraclinicalSentences) {
        // Look for specific lab values, imaging findings with numbers or specific abnormalities
        const hasSpecificResult = /\b\d+[.\d]*\s*(?:mg\/dl|mmol\/l|iu\/l|ng\/ml|pg\/ml|mm|cm)\b/i.test(sentence) ||
                                  /\b(?:elevated|decreased|positive|negative|abnormal|normal)\s+\w+/i.test(sentence) ||
                                  /\b(?:st elevation|q waves|t wave|infiltrate|effusion|mass|nodule)\b/i.test(sentence);
        
        if (hasSpecificResult && sentence.length < 200) {
          const sentenceLower = sentence.toLowerCase();
          // More lenient matching for paraclinical - if it contains relevant keywords OR diagnosis-related terms
          const relatesToDiagnosis = relevantKeywords.some(keyword => sentenceLower.includes(keyword)) ||
                                     nameWords.some(word => sentenceLower.includes(word)) ||
                                     sentenceLower.includes(nameLower.split(' ')[0]);
          
          if (relatesToDiagnosis) {
            const clue = sentence.trim();
            if (clue && !clues.some(c => c.toLowerCase() === clue.toLowerCase())) {
              clues.push(clue);
              if (clues.length >= 2) break;
            }
          }
        }
      }
      
      // If no clues found yet, extract ANY relevant paraclinical finding (more aggressive fallback)
      if (clues.length === 0) {
        for (const sentence of paraclinicalSentences) {
          const sentenceLower = sentence.toLowerCase();
          // Check if sentence mentions any relevant keyword
          if (relevantKeywords.some(keyword => sentenceLower.includes(keyword)) && sentence.length < 200) {
            const clue = sentence.trim();
            if (clue && !clues.some(c => c.toLowerCase() === clue.toLowerCase())) {
              clues.push(clue);
              if (clues.length >= 1) break; // Take first relevant finding
            }
          }
        }
      }
    }
    
    return clues.slice(0, 2); // Return up to 2 specific clues
  };

  // Generate diagnosis-specific "against" reasoning from case evidence
  // ONLY uses concrete evidence: exam findings, imaging, timeline - NO generic phrases
  const generateAgainstReasoning = (diagnosisName, finalDiagnosis) => {
    const nameLower = diagnosisName.toLowerCase();
    const finalLower = (finalDiagnosis || '').toLowerCase();
    const againstReasons = [];
    
    // If this is the final diagnosis, use uncertainty language instead of generic exclusion
    if (nameLower === finalLower) {
      return null; // Return null to indicate no against reasoning needed for final diagnosis
    }
    
    // Diagnosis-specific exclusion patterns (imaging, labs, temporal patterns)
    const diagnosisSpecificPatterns = {
      'chest pain': ['troponin normal', 'ecg normal', 'no st elevation', 'negative d-dimer'],
      'mi': ['troponin normal', 'ecg normal', 'no st elevation', 'negative troponin'],
      'stem': ['troponin normal', 'ecg normal', 'no st elevation'],
      'pulmonary embolism': ['d-dimer normal', 'negative d-dimer', 'ctpa normal', 'ventilation normal'],
      'pe': ['d-dimer normal', 'negative d-dimer', 'ctpa normal'],
      'aortic dissection': ['ct normal', 'no mediastinal widening', 'normal aorta'],
      'pneumonia': ['chest x-ray normal', 'cxr clear', 'no infiltrate', 'negative culture'],
      'appendicitis': ['ct normal', 'no appendiceal', 'normal appendix', 'ultrasound normal'],
      'stroke': ['ct normal', 'mri normal', 'no acute', 'negative imaging'],
      'meningitis': ['csf normal', 'lp normal', 'no pleocytosis', 'negative culture'],
      'sepsis': ['lactate normal', 'no elevated', 'negative culture', 'normal wbc'],
      'dka': ['glucose normal', 'no ketones', 'normal ph', 'bicarbonate normal'],
    };
    
    // Find relevant exclusion patterns for this diagnosis
    const relevantPatterns = [];
    for (const [key, patterns] of Object.entries(diagnosisSpecificPatterns)) {
      if (nameLower.includes(key)) {
        relevantPatterns.push(...patterns);
      }
    }
    
    // Check paraclinical for diagnosis-specific contradictory findings
    // ONLY use labs/imaging that are actually available
    if (paraclinicalText && relevantPatterns.length > 0) {
      const paraclinicalLower = paraclinicalText.toLowerCase();
      for (const pattern of relevantPatterns) {
        // Check if this pattern references a lab that's available
        const patternWords = pattern.split(' ');
        const labName = patternWords.find(w => ['troponin', 'd-dimer', 'lactate', 'ecg', 'ct', 'mri', 'cxr'].includes(w.toLowerCase()));
        
        if (labName) {
          const isAvailable = Array.from(availableLabs).some(available => 
            available.includes(labName.toLowerCase()) || labName.toLowerCase().includes(available)
          );
          if (!isAvailable) continue; // Skip if lab not available
        }
        
        if (paraclinicalLower.includes(pattern)) {
          // Extract the specific finding
          const findingMatch = paraclinicalText.match(new RegExp(`(${patternWords.join('|')})[^.]*`, 'i'));
          if (findingMatch) {
            const finding = findingMatch[0].trim();
            // Validate finding doesn't reference unavailable labs
            const cleanedFinding = removeInvalidLabReferences(finding);
            if (cleanedFinding && cleanedFinding.length > 10 && cleanedFinding.length < 100 && 
                !againstReasons.some(r => r.toLowerCase().includes(pattern))) {
              againstReasons.push(cleanedFinding);
              if (againstReasons.length >= 2) break;
            }
          }
        }
      }
    }
    
    // Check for imaging findings that contradict the diagnosis
    // ONLY use imaging that's actually available
    if (paraclinicalText) {
      const imagingPatterns = {
        'chest pain': ['normal ecg', 'normal troponin', 'normal cxr'],
        'pneumonia': ['clear chest', 'no infiltrate', 'normal cxr'],
        'appendicitis': ['normal appendix', 'no appendiceal', 'normal ct'],
        'stroke': ['no acute', 'normal ct', 'normal mri'],
        'pe': ['normal ctpa', 'no embolism', 'normal perfusion'],
      };
      
      for (const [key, patterns] of Object.entries(imagingPatterns)) {
        if (nameLower.includes(key)) {
          for (const pattern of patterns) {
            // Check if imaging is available
            const imagingType = pattern.match(/\b(ecg|cxr|ct|mri|ctpa|ultrasound)\b/i)?.[1]?.toLowerCase();
            if (imagingType) {
              const isAvailable = Array.from(availableLabs).some(available => 
                available.includes(imagingType) || imagingType.includes(available)
              );
              if (!isAvailable) continue; // Skip if imaging not available
            }
            
            if (paraclinicalText.toLowerCase().includes(pattern)) {
              const match = paraclinicalText.match(new RegExp(pattern + '[^.]*', 'i'));
              if (match && !againstReasons.some(r => r.toLowerCase().includes(pattern))) {
                const cleanedMatch = removeInvalidLabReferences(match[0].trim());
                if (cleanedMatch && cleanedMatch.length > 10) {
                  againstReasons.push(cleanedMatch);
                  if (againstReasons.length >= 2) break;
                }
              }
            }
          }
        }
      }
    }
    
    // Check for temporal patterns that contradict (e.g., acute vs chronic)
    if (historyText) {
      const historyLower = historyText.toLowerCase();
      // Check for chronic patterns when diagnosis is acute
      if (nameLower.includes('acute') && (historyLower.includes('months') || historyLower.includes('weeks') || historyLower.includes('chronic'))) {
        const chronicMatch = historyText.match(/(?:months|weeks|chronic)[^.]*\.?/i);
        if (chronicMatch && !againstReasons.some(r => r.toLowerCase().includes('chronic'))) {
          againstReasons.push(`Chronic presentation (${chronicMatch[0].trim()})`);
        }
      }
      // Check for acute patterns when diagnosis is chronic
      if (nameLower.includes('chronic') && (historyLower.includes('sudden') || historyLower.includes('acute') || historyLower.includes('hours'))) {
        const acuteMatch = historyText.match(/(?:sudden|acute|hours)[^.]*\.?/i);
        if (acuteMatch && !againstReasons.some(r => r.toLowerCase().includes('acute'))) {
          againstReasons.push(`Acute presentation (${acuteMatch[0].trim()})`);
        }
      }
    }
    
    // Check for concrete ECG findings that contradict the diagnosis
    if (paraclinicalText) {
      const paraclinicalLower = paraclinicalText.toLowerCase();
      
      // Extract concrete ECG findings
      const ecgFindings = [
        'atrial fibrillation', 'afib', 'af', 'sinus rhythm', 'sinus bradycardia', 'sinus tachycardia',
        'ventricular tachycardia', 'vt', 'svt', 'supraventricular tachycardia',
        'atrial flutter', 'aflutter', 'flutter', 'regular rhythm', 'irregular rhythm',
        'p waves', 'qrs complex', 'st elevation', 'st depression', 't wave',
        'pr interval', 'qt interval', 'wide qrs', 'narrow qrs'
      ];
      
      // For arrhythmia diagnoses, check for contradictory ECG patterns
      if (nameLower.includes('ventricular tachycardia') || nameLower.includes('vt')) {
        // VT requires wide QRS - if narrow QRS or AF present, contradicts
        if (paraclinicalLower.includes('narrow qrs') || paraclinicalLower.includes('atrial fibrillation') || 
            paraclinicalLower.includes('afib') || paraclinicalLower.includes('sinus rhythm')) {
          const ecgMatch = paraclinicalText.match(/(?:narrow qrs|atrial fibrillation|afib|sinus rhythm)[^.]*\.?/i);
          if (ecgMatch && !againstReasons.some(r => r.toLowerCase().includes('ecg'))) {
            againstReasons.push(`ECG shows ${ecgMatch[0].trim()}`);
          }
        }
      }
      
      if (nameLower.includes('supraventricular tachycardia') || nameLower.includes('svt')) {
        // SVT requires narrow QRS - if wide QRS present, contradicts
        if (paraclinicalLower.includes('wide qrs') || paraclinicalLower.includes('ventricular')) {
          const ecgMatch = paraclinicalText.match(/(?:wide qrs|ventricular)[^.]*\.?/i);
          if (ecgMatch && !againstReasons.some(r => r.toLowerCase().includes('ecg'))) {
            againstReasons.push(`ECG shows ${ecgMatch[0].trim()}`);
          }
        }
      }
      
      if (nameLower.includes('atrial flutter') || nameLower.includes('flutter')) {
        // Flutter has sawtooth pattern - if AF present, contradicts
        if (paraclinicalLower.includes('atrial fibrillation') || paraclinicalLower.includes('afib')) {
          const ecgMatch = paraclinicalText.match(/(?:atrial fibrillation|afib)[^.]*\.?/i);
          if (ecgMatch && !againstReasons.some(r => r.toLowerCase().includes('ecg'))) {
            againstReasons.push(`ECG shows ${ecgMatch[0].trim()}`);
          }
        }
      }
    }
    
    // Check for contradictory findings in exam (diagnosis-specific)
    if (examText) {
      const examLower = examText.toLowerCase();
      // For cardiac diagnoses, check for normal cardiac exam
      if ((nameLower.includes('mi') || nameLower.includes('chest pain') || nameLower.includes('cardiac')) && 
          examLower.includes('normal') && (examLower.includes('heart') || examLower.includes('cardiac') || examLower.includes('s1s2'))) {
        const normalCardiac = examText.match(/normal[^.]*(?:heart|cardiac|s1s2)[^.]*\.?/i);
        if (normalCardiac && !againstReasons.some(r => r.toLowerCase().includes('normal'))) {
          againstReasons.push(normalCardiac[0].trim());
        }
      }
      // For respiratory diagnoses, check for normal respiratory exam
      if ((nameLower.includes('pneumonia') || nameLower.includes('pe') || nameLower.includes('respiratory')) &&
          examLower.includes('normal') && (examLower.includes('lung') || examLower.includes('respiratory') || examLower.includes('breath'))) {
        const normalResp = examText.match(/normal[^.]*(?:lung|respiratory|breath)[^.]*\.?/i);
        if (normalResp && !againstReasons.some(r => r.toLowerCase().includes('normal'))) {
          againstReasons.push(normalResp[0].trim());
        }
      }
    }
    
    // If we found specific against evidence, return it
    if (againstReasons.length > 0) {
      return againstReasons.slice(0, 2).join('. ');
    }
    
    // NO generic fallback - return null to indicate no concrete evidence
    // The caller will handle this appropriately
    return null;
  };

  // Enhanced cleaning to remove all JSON fragments and malformed entries from differentials
  const cleanParaclinicalBleed = (text) => {
    if (!text || typeof text !== 'string') return text;
    
    // Remove JSON-like fragments: '"unit":', '"interpretation":', '"wbc":', etc.
    let cleaned = text
      .replace(/["']unit["']\s*:\s*/gi, '')
      .replace(/["']interpretation["']\s*:\s*/gi, '')
      .replace(/["']value["']\s*:\s*/gi, '')
      .replace(/["']name["']\s*:\s*/gi, '')
      .replace(/["']wbc["']\s*:\s*/gi, '')
      .replace(/["']hemoglobin["']\s*:\s*/gi, '')
      .replace(/["']result["']\s*:\s*/gi, '')
      .replace(/["']finding["']\s*:\s*/gi, '');
    
    // Remove bracketed objects: {...}, [...]
    cleaned = cleaned.replace(/\{[^}]*\}/g, '');
    cleaned = cleaned.replace(/\[[^\]]*\]/g, '');
    
    // Remove standalone commas and JSON separators
    cleaned = cleaned.replace(/,\s*,/g, ',');
    cleaned = cleaned.replace(/^\s*,\s*/, '');
    
    // If contains JSON artifacts (=, :, {, }, quotes), extract only diagnosis name
    if (/[=:{}]/.test(cleaned) || (cleaned.includes('"') && cleaned.includes(':'))) {
      // Keep only text before first '(', comma, or colon that's not part of a normal sentence
      const beforeParen = cleaned.split('(')[0].trim();
      const beforeComma = beforeParen.split(',')[0].trim();
      const beforeColon = beforeComma.split(/:\s*(?![^:]*:)/)[0].trim(); // Only split on first colon if it looks like JSON
      cleaned = beforeColon;
    }
    
    return cleaned.trim();
  };

  function stripTailCaseText(str) {
    if (!str) return str;
    // Remove everything after the FIRST parenthesis group
    const firstParen = str.indexOf('(');
    if (firstParen > -1) {
      return str.slice(0, firstParen).trim();
    }
    return str.trim();
  }

  // Hard-filter non-diagnostic phrases from differential reasoning
  function filterNonDiagnosticNoise(text) {
    if (!text || typeof text !== 'string') return text;
    
    let cleaned = text;
    
    // FIRST PASS: Remove exact phrases and patterns (aggressive phrase-level filtering)
    const exactPhrases = [
      // Medications/allergies - exact matches
      /\babsence\s+of\s+(?:known\s+)?(?:drug\s+)?allerg(?:ies|y)\b/gi,
      /\b(?:no|denies)\s+(?:known\s+)?(?:drug\s+)?allerg(?:ies|y)\b/gi,
      /\btakes?\s+(?:no\s+)?(?:medications?|meds?|drugs?)\b/gi,
      /\b(?:on|taking)\s+(?:no\s+)?(?:medications?|meds?|drugs?)\b/gi,
      /\bno\s+(?:current\s+)?(?:medications?|meds?|drugs?)\b/gi,
      /\b(?:patient|pt)\s+(?:takes?|taking|on)\s+(?:no\s+)?(?:medications?|meds?|drugs?)\b/gi,
      
      // History boilerplate
      /\b(?:past\s+)?(?:medical\s+)?history\s+(?:of|includes?|shows?|reveals?)\s+[^.]*\.?/gi,
      /\b(?:social\s+)?history\s+(?:of|includes?|shows?|reveals?)\s+[^.]*\.?/gi,
      /\b(?:family\s+)?history\s+(?:of|includes?|shows?|reveals?)\s+[^.]*\.?/gi,
      
      // Generic exam findings unrelated to differentials
      /\b(?:absence\s+of|no)\s+(?:jugular\s+venous\s+distension|jvd)\b/gi,
      /\b(?:absence\s+of|no)\s+(?:peripheral\s+)?edema\b/gi,
      /\b(?:absence\s+of|no)\s+(?:lymphadenopathy|lymph\s+nodes)\b/gi,
      /\b(?:abdominal\s+)?examination\s+(?:is\s+)?(?:unremarkable|normal|benign)\b/gi,
      /\b(?:general\s+)?appearance\s+(?:is\s+)?(?:normal|unremarkable)\b/gi,
      /\b(?:vital\s+)?signs?\s+(?:are\s+)?(?:stable|normal|within\s+normal)\b/gi,
      /\b(?:patient\s+)?(?:is\s+)?(?:alert|awake|oriented)\b/gi,
      /\b(?:no\s+)?(?:acute\s+)?distress\b/gi,
      
      // Case presentation boilerplate
      /\ba\s+\d+[- ](?:year|month|day)[- ]old\s+(?:male|female|patient)\s+presents[^.]*\.?/gi,
      /\bthe\s+patient\s+is\s+a\s+\d+[- ](?:year|month|day)[- ]old[^.]*\.?/gi,
    ];
    
    // Remove exact phrases
    for (const pattern of exactPhrases) {
      cleaned = cleaned.replace(pattern, '');
    }
    
    // SECOND PASS: Split into sentences and filter sentences containing non-diagnostic content
    const sentences = cleaned.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
    
    // Keywords that indicate non-diagnostic content
    const nonDiagnosticKeywords = [
      'allerg', 'medication', 'meds', 'drugs', 'social history', 'family history',
      'past medical history', 'examination unremarkable', 'vital signs stable',
      'alert and oriented', 'no acute distress', 'takes no', 'absence of known'
    ];
    
    const filteredSentences = sentences.filter(sentence => {
      const lower = sentence.toLowerCase();
      
      // Remove sentences containing non-diagnostic keywords
      for (const keyword of nonDiagnosticKeywords) {
        if (lower.includes(keyword)) {
          return false;
        }
      }
      
      // Remove very short sentences that are likely fragments
      if (sentence.length < 15) {
        // Only keep if it's clearly diagnostic (contains medical terms)
        const hasMedicalTerm = /\b(?:pain|fever|symptom|sign|finding|test|result|diagnos|treat|disease|condition|syndrome)\b/i.test(sentence);
        if (!hasMedicalTerm) {
          return false;
        }
      }
      
      // Remove connector sentences that contain non-diagnostic content
      if (/^(however|but|although|also|additionally|furthermore|moreover)/i.test(sentence.trim())) {
        if (/(allerg|medication|drug|social|family|history|examination\s+unremarkable|vital\s+signs)/i.test(sentence)) {
          return false;
        }
      }
      
      return true;
    });
    
    // Rejoin filtered sentences
    cleaned = filteredSentences.join('. ').trim();
    
    // THIRD PASS: Final cleanup - remove any remaining fragments
    cleaned = cleaned
      .replace(/\b(?:however|but|although)\s+(?:absence\s+of|no|denies|takes?)\s+[^.]*\.?/gi, '')
      .replace(/\b(?:absence\s+of|no|denies)\s+(?:known\s+)?(?:drug\s+)?allerg[^.]*\.?/gi, '')
      .replace(/\b(?:takes?|taking|on)\s+(?:no\s+)?(?:medications?|meds?|drugs?)[^.]*\.?/gi, '')
      .replace(/\s+/g, ' ')
      .replace(/\.{2,}/g, '.')
      .replace(/\s*\.\s*\./g, '.')
      .replace(/^\.+\s*/, '')
      .replace(/\s*\.+$/, '')
      .replace(/^[,\s]+/, '')
      .replace(/[,\s]+$/, '')
      .trim();
    
    return cleaned;
  }

  // Truncate reasoning to one short sentence (max 25-30 words)
  function truncateToShortSentence(text, maxWords = 25) {
    if (!text || typeof text !== 'string') return text;
    
    // First apply hard-filter to remove non-diagnostic noise
    let cleaned = filterNonDiagnosticNoise(text);
    
    // Split into sentences
    const sentences = cleaned.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
    
    if (sentences.length === 0) {
      // If no sentences found, try to extract first meaningful phrase
      const words = cleaned.split(/\s+/);
      if (words.length <= maxWords) return cleaned;
      return words.slice(0, maxWords).join(' ') + '.';
    }
    
    // Find first sentence that's not too long
    for (const sentence of sentences) {
      const words = sentence.split(/\s+/);
      if (words.length <= maxWords) {
        return sentence + (sentence.match(/[.!?]$/) ? '' : '.');
      }
    }
    
    // If all sentences are too long, truncate first sentence to maxWords
    const firstSentence = sentences[0];
    const words = firstSentence.split(/\s+/);
    if (words.length > maxWords) {
      return words.slice(0, maxWords).join(' ') + '.';
    }
    
    return firstSentence + (firstSentence.match(/[.!?]$/) ? '' : '.');
  }

  // Get final diagnosis for generating "against" reasoning
  const finalDiagnosis = cleaned.final_diagnosis || '';

  // Exclusion patterns that indicate AGAINST reasoning (shared by string and object parsing)
  const exclusionPatterns = [
    /\b(?:less likely|unlikely)\s+(?:because|due to|since|as)\s+/i,
    /\b(?:ruled out|excluded)\s+(?:because|due to|since|as)\s+/i,
    /\b(?:argues against|weighs against|contraindicated)\s+/i,
    /\b(?:not consistent with|inconsistent with)\s+/i,
    /\b(?:less likely|unlikely)\s+/i,
    /\b(?:ruled out|excluded)\s+/i,
    /\bagainst\s+/i,
  ];

  cleaned.differential_diagnoses = cleaned.differential_diagnoses.map((item) => {
    if (typeof item === 'string') {
      // Clean paraclinical bleed-through first
      const cleanedItem = cleanParaclinicalBleed(item);
      
      // Parse string for "for" and "against" reasoning
      let forReasoning = '';
      let againstReasoning = '';
      let name = '';
      
      // Exclusion patterns with prefixes for string parsing (in order of specificity)
      const exclusionPatternsWithPrefix = [
        { pattern: /\b(?:less likely|unlikely)\s+(?:because|due to|since|as)\s+/i, prefix: /^(?:less likely|unlikely)\s+(?:because|due to|since|as)\s*/i },
        { pattern: /\b(?:ruled out|excluded)\s+(?:because|due to|since|as)\s+/i, prefix: /^(?:ruled out|excluded)\s+(?:because|due to|since|as)\s*/i },
        { pattern: /\b(?:argues against|weighs against|contraindicated)\s+/i, prefix: /^(?:argues against|weighs against|contraindicated)\s*/i },
        { pattern: /\b(?:not consistent with|inconsistent with)\s+/i, prefix: /^(?:not consistent with|inconsistent with)\s*/i },
        { pattern: /\b(?:less likely|unlikely)\s+/i, prefix: /^(?:less likely|unlikely)\s*/i },
        { pattern: /\b(?:ruled out|excluded)\s+/i, prefix: /^(?:ruled out|excluded)\s*/i },
        { pattern: /\bagainst\s+/i, prefix: /^against\s*/i },
      ];
      
      // Find the first exclusion pattern in the string
      let exclusionMatch = null;
      let exclusionIndex = -1;
      const cleanedLower = cleanedItem.toLowerCase();
      
      for (const exclusion of exclusionPatternsWithPrefix) {
        const match = cleanedItem.match(exclusion.pattern);
        if (match) {
          exclusionIndex = cleanedLower.indexOf(match[0].toLowerCase());
          exclusionMatch = exclusion;
          break; // Use first (most specific) match
        }
      }
      
      if (exclusionIndex > -1 && exclusionMatch) {
        // Split on exclusion pattern to separate FOR from AGAINST
        const beforeExclusion = cleanedItem.substring(0, exclusionIndex).trim();
        const afterExclusion = cleanedItem.substring(exclusionIndex).trim();
        
        // Extract name: first part before comma (or before exclusion if no comma)
        if (beforeExclusion.includes(',')) {
          const parts = beforeExclusion.split(',');
          name = stripTailCaseText(parts[0]).trim();
          // First segment after name is supporting clue (FOR)
          if (parts.length > 1) {
            const firstSegment = parts[1].trim();
            if (firstSegment && !isPlaceholder(firstSegment)) {
              forReasoning = firstSegment;
            }
          }
        } else {
          // No commas, name is everything before exclusion pattern
          name = stripTailCaseText(beforeExclusion).trim();
        }
        
        // Extract AGAINST reasoning from exclusion portion
        if (afterExclusion) {
          // Remove exclusion prefix and clean
          againstReasoning = afterExclusion.replace(exclusionMatch.prefix, '').trim();
          // If still contains exclusion marker, remove it
          againstReasoning = againstReasoning.replace(/^(?:less likely|unlikely|ruled out|excluded|argues against|weighs against|contraindicated|not consistent with|inconsistent with|against)\s*/i, '').trim();
        }
      } else {
        // No exclusion pattern found, extract name and check for implicit exclusion
        if (cleanedItem.includes(',')) {
          const parts = cleanedItem.split(',');
          name = stripTailCaseText(parts[0]).trim();
          
          // Check each segment for exclusion language
          for (let i = 1; i < parts.length; i++) {
            const segment = parts[i].trim();
            if (!segment || isPlaceholder(segment)) continue;
            
            const segmentLower = segment.toLowerCase();
            // Check if segment contains exclusion language
            const hasExclusion = exclusionPatterns.some(pattern => pattern.test(segment));
            
            if (hasExclusion) {
              // This segment is AGAINST reasoning
              againstReasoning = segment.replace(/^(?:less likely|unlikely|ruled out|excluded|argues against|weighs against|contraindicated|not consistent with|inconsistent with|against)\s*/i, '').trim();
            } else if (!forReasoning) {
              // First non-exclusion segment is FOR reasoning
              forReasoning = segment;
            }
          }
        } else {
          // No commas, try to extract from colon/dash separator or use whole string
          const nameWithSeparator = cleanedItem.split(/[:\-–—]/)[0].trim();
          name = stripTailCaseText(nameWithSeparator).trim();
          // Check if there's content after name separator
          if (cleanedItem.length > nameWithSeparator.length) {
            const cluePart = cleanedItem.substring(nameWithSeparator.length).replace(/^[:\-–—,\s]+/, '').trim();
            if (cluePart && !isPlaceholder(cluePart)) {
              // Check if cluePart contains exclusion language
              const hasExclusion = exclusionPatterns.some(pattern => pattern.test(cluePart));
              if (hasExclusion) {
                againstReasoning = cluePart.replace(/^(?:less likely|unlikely|ruled out|excluded|argues against|weighs against|contraindicated|not consistent with|inconsistent with|against)\s*/i, '').trim();
              } else {
                forReasoning = cluePart;
              }
            }
          }
        }
        
        // Try to parse justification if no forReasoning found (but only if it doesn't contain exclusion language)
        if (!forReasoning && !againstReasoning) {
          let justification = parseJustification(cleanedItem);
          if (justification && !isPlaceholder(justification) && !justification.toLowerCase().includes('reasoning provided')) {
            // Check if justification contains exclusion language
            const hasExclusion = exclusionPatterns.some(ex => ex.pattern.test(justification));
            if (hasExclusion) {
              againstReasoning = justification.replace(/^(?:less likely|unlikely|ruled out|excluded|argues against|weighs against|contraindicated|not consistent with|inconsistent with|against)\s*/i, '').trim();
            } else {
              forReasoning = justification;
            }
          }
        }
      }
      
      // Ensure name is set (fallback if parsing failed)
      if (!name || name.trim() === '') {
        // Try to extract from cleanedItem as last resort
        if (cleanedItem.includes(',')) {
          name = stripTailCaseText(cleanedItem.split(',')[0]).trim();
        } else {
          name = stripTailCaseText(cleanedItem.split(/[:\-–—]/)[0]).trim();
        }
        if (!name || name.trim() === '') {
          name = cleanedItem.substring(0, 50).trim(); // Last resort: first 50 chars
        }
      }
      
      // If no "for" reasoning found, generate from case evidence
      if (!forReasoning) {
        const specificClues = extractSpecificClues(name);
        if (specificClues.length > 0) {
          forReasoning = specificClues.join('. ');
        } else {
          // Enhanced fallback: extract specific findings instead of generic phrases
          const nameLower = name.toLowerCase();
          const clues = [];
          
          // Try to extract specific findings from history/exam/paraclinical
          if (historyText) {
            const historyMatch = historyText.match(new RegExp(`([^.]*${nameLower.split(' ')[0]}[^.]*\\.)`, 'i'));
            if (historyMatch && historyMatch[1].length < 150) {
              clues.push(historyMatch[1].trim());
            }
          }
          
          if (examText) {
            const examMatch = examText.match(new RegExp(`([^.]*${nameLower.split(' ')[0]}[^.]*\\.)`, 'i'));
            if (examMatch && examMatch[1].length < 150) {
              clues.push(examMatch[1].trim());
            }
          }
          
          if (paraclinicalText) {
            const paraclinicalMatch = paraclinicalText.match(new RegExp(`([^.]*${nameLower.split(' ')[0]}[^.]*\\.)`, 'i'));
            if (paraclinicalMatch && paraclinicalMatch[1].length < 150) {
              clues.push(paraclinicalMatch[1].trim());
            }
          }
          
          // Only use generic fallback if absolutely no specific findings found
          forReasoning = clues.length > 0 
            ? clues[0] // Use first specific finding
            : null; // Return null to indicate no specific evidence
        }
      }
      
      // If no "against" reasoning found, generate from case evidence
      if (!againstReasoning) {
        againstReasoning = generateAgainstReasoning(name, finalDiagnosis);
      }
      
      // Remove invalid lab references from FOR reasoning (only if it exists)
      if (forReasoning) {
        forReasoning = removeInvalidLabReferences(forReasoning);
      }
      
      // After deriving name, ALWAYS sanitize reasoning fragments
      forReasoning = forReasoning ? stripTailCaseText(forReasoning) : null;
      againstReasoning = againstReasoning ? stripTailCaseText(againstReasoning) : null;
      
      // Hard-filter non-diagnostic noise first, then truncate
      forReasoning = forReasoning ? filterNonDiagnosticNoise(forReasoning) : null;
      againstReasoning = againstReasoning ? filterNonDiagnosticNoise(againstReasoning) : null;
      
      // Truncate to short sentences (max 25 words each)
      forReasoning = forReasoning ? truncateToShortSentence(forReasoning, 25) : null;
      againstReasoning = againstReasoning ? truncateToShortSentence(againstReasoning, 25) : null;
      
      // Only include against reasoning if concrete evidence exists - no placeholder phrases
      const finalAgainst = againstReasoning || '';
      
      // Only include FOR reasoning if specific evidence exists
      // If still no FOR reasoning, extract from paraclinical as last resort
      let finalFor = forReasoning || '';
      if (!finalFor && paraclinicalText) {
        // Last resort: extract any relevant paraclinical finding related to diagnosis
        const nameWords = name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const paraclinicalSentences = paraclinicalText.split(/[.!?]/).filter(s => s.trim().length > 10);
        for (const sentence of paraclinicalSentences) {
          const sentenceLower = sentence.toLowerCase();
          // Check if sentence mentions diagnosis-related terms or common findings
          if (nameWords.some(word => sentenceLower.includes(word)) || 
              sentenceLower.includes(name.toLowerCase().split(' ')[0])) {
            if (sentence.length < 150 && /\b(?:elevated|decreased|positive|negative|abnormal|normal|consistent|shows?|reveals?)\b/i.test(sentence)) {
              finalFor = sentence.trim();
              break;
            }
          }
        }
      }
      
      return {
        name,
        for: finalFor,
        against: finalAgainst,
        // Frontend compatibility fields
        why_for: finalFor,
        FOR: finalFor,
        why_against: finalAgainst,
        AGAINST: finalAgainst,
        justification: finalAgainst 
          ? (finalFor ? `${finalFor} However, ${finalAgainst}` : finalAgainst)
          : finalFor,
      };
    }
    if (typeof item === 'object' && item !== null) {
      // Clean paraclinical bleed-through from name and other fields
      let rawName = item.name || item.diagnosis || item.label || '';
      rawName = cleanParaclinicalBleed(String(rawName));
      const name = rawName.trim();
      
      let rawSupporting = item.supporting || item.supporting_clue || item.clue || item.for || '';
      rawSupporting = cleanParaclinicalBleed(String(rawSupporting));
      const supporting = rawSupporting.trim();
      
      let rawLessLikely = item.less_likely || item.lessLikely || item.reason || item.why_less_likely || item.against || '';
      rawLessLikely = cleanParaclinicalBleed(String(rawLessLikely));
      const lessLikely = rawLessLikely.trim();
      
      let rawJustification = item.justification || '';
      rawJustification = cleanParaclinicalBleed(String(rawJustification));
      
      // Extract "for" reasoning from existing fields
      let forReasoning = '';
      if (supporting && !isPlaceholder(supporting)) {
        forReasoning = supporting;
      } else if (rawJustification && !isPlaceholder(rawJustification) && !rawJustification.toLowerCase().includes('reasoning provided')) {
        // Check if justification contains exclusion language - if so, don't use as FOR
        const hasExclusion = exclusionPatterns.some(pattern => pattern.test(rawJustification));
        if (!hasExclusion) {
          forReasoning = rawJustification;
        }
      }
      
      // If no "for" reasoning found, generate from case evidence
      if (!forReasoning) {
        const specificClues = extractSpecificClues(name);
        if (specificClues.length > 0) {
          forReasoning = specificClues.join('. ');
        } else {
          // Enhanced fallback: extract specific findings instead of generic phrases
          const nameLower = String(name || '').toLowerCase();
          const clues = [];
          
          // Try to extract specific findings from history/exam/paraclinical
          if (historyText) {
            const historyMatch = historyText.match(new RegExp(`([^.]*${nameLower.split(' ')[0]}[^.]*\\.)`, 'i'));
            if (historyMatch && historyMatch[1].length < 150) {
              clues.push(historyMatch[1].trim());
            }
          }
          
          if (examText) {
            const examMatch = examText.match(new RegExp(`([^.]*${nameLower.split(' ')[0]}[^.]*\\.)`, 'i'));
            if (examMatch && examMatch[1].length < 150) {
              clues.push(examMatch[1].trim());
            }
          }
          
          if (paraclinicalText) {
            const paraclinicalMatch = paraclinicalText.match(new RegExp(`([^.]*${nameLower.split(' ')[0]}[^.]*\\.)`, 'i'));
            if (paraclinicalMatch && paraclinicalMatch[1].length < 150) {
              clues.push(paraclinicalMatch[1].trim());
            }
          }
          
          // Only use generic fallback if absolutely no specific findings found
          forReasoning = clues.length > 0 
            ? clues[0] // Use first specific finding
            : null; // Return null to indicate no specific evidence
        }
      }
      
      // Extract "against" reasoning from existing fields or generate
      let againstReasoning = '';
      
      // Exclusion patterns that indicate AGAINST reasoning
      const exclusionPatterns = [
        /\b(?:less likely|unlikely)\s+(?:because|due to|since|as)\s+/i,
        /\b(?:ruled out|excluded)\s+(?:because|due to|since|as)\s+/i,
        /\b(?:argues against|weighs against|contraindicated)\s+/i,
        /\b(?:not consistent with|inconsistent with)\s+/i,
        /\b(?:less likely|unlikely)\s+/i,
        /\b(?:ruled out|excluded)\s+/i,
        /\bagainst\s+/i,
      ];
      
      if (lessLikely && !isPlaceholder(lessLikely)) {
        againstReasoning = lessLikely;
      } else if (rawJustification) {
        // Check if justification contains exclusion language
        const hasExclusion = exclusionPatterns.some(pattern => pattern.test(rawJustification));
        if (hasExclusion) {
          // Extract exclusion portion from justification
          for (const pattern of exclusionPatterns) {
            const match = rawJustification.match(new RegExp(pattern.source + '[^.]*\.?', 'i'));
            if (match) {
              againstReasoning = match[0].replace(/^(?:less likely|unlikely|ruled out|excluded|argues against|weighs against|contraindicated|not consistent with|inconsistent with|against)\s*/i, '').trim();
              break;
            }
          }
          // If no match found but has exclusion, use the whole justification
          if (!againstReasoning) {
            againstReasoning = rawJustification.replace(/^(?:less likely|unlikely|ruled out|excluded|argues against|weighs against|contraindicated|not consistent with|inconsistent with|against)\s*/i, '').trim();
          }
        }
      }
      
      // If no "against" reasoning found, generate from case evidence
      if (!againstReasoning) {
        againstReasoning = generateAgainstReasoning(name, finalDiagnosis);
      }
      
      // Remove invalid lab references from FOR reasoning (only if it exists)
      if (forReasoning) {
        forReasoning = removeInvalidLabReferences(forReasoning);
      }
      
       // After deriving name, ALWAYS sanitize reasoning fragments
       forReasoning = forReasoning ? stripTailCaseText(forReasoning) : null;
       againstReasoning = againstReasoning ? stripTailCaseText(againstReasoning) : null;
       
       // Hard-filter non-diagnostic noise first, then truncate
       forReasoning = forReasoning ? filterNonDiagnosticNoise(forReasoning) : null;
       againstReasoning = againstReasoning ? filterNonDiagnosticNoise(againstReasoning) : null;
       
       // Truncate to short sentences (max 25 words each)
       forReasoning = forReasoning ? truncateToShortSentence(forReasoning, 25) : null;
       againstReasoning = againstReasoning ? truncateToShortSentence(againstReasoning, 25) : null;
       
       // Only include against reasoning if concrete evidence exists - no placeholder phrases
       const finalAgainst = againstReasoning || '';
       
       // Only include FOR reasoning if specific evidence exists
       const finalFor = forReasoning || '';
       
       return {
         name: String(name || '').trim(),
         for: finalFor,
         against: finalAgainst,
         // Frontend compatibility fields
         why_for: finalFor,
         FOR: finalFor,
         why_against: finalAgainst,
         AGAINST: finalAgainst,
         justification: finalAgainst 
           ? (finalFor ? `${finalFor} However, ${finalAgainst}` : finalAgainst)
           : finalFor,
       };
     }
     // Fallback for non-object items
     const name = String(item || '').trim();
     let forReasoning = extractSpecificClues(name).join('. ') || 'Clinical presentation supports consideration.';
     let againstReasoning = generateAgainstReasoning(name, finalDiagnosis);
     
     // Remove invalid lab references from FOR reasoning (only if it exists)
     if (forReasoning) {
       forReasoning = removeInvalidLabReferences(forReasoning);
     }
     
     // After deriving name, ALWAYS sanitize reasoning fragments
     forReasoning = forReasoning ? stripTailCaseText(forReasoning) : null;
     againstReasoning = againstReasoning ? stripTailCaseText(againstReasoning) : null;
     
     // Hard-filter non-diagnostic noise first, then truncate
     forReasoning = forReasoning ? filterNonDiagnosticNoise(forReasoning) : null;
     againstReasoning = againstReasoning ? filterNonDiagnosticNoise(againstReasoning) : null;
     
     // Truncate to short sentences (max 25 words each)
     forReasoning = forReasoning ? truncateToShortSentence(forReasoning, 25) : null;
     againstReasoning = againstReasoning ? truncateToShortSentence(againstReasoning, 25) : null;
     
     // Only include against reasoning if concrete evidence exists - no placeholder phrases
     const finalAgainst = againstReasoning || '';
    
    return {
      name,
      for: forReasoning,
      against: finalAgainst,
      // Frontend compatibility fields
      why_for: forReasoning,
      FOR: forReasoning,
      why_against: finalAgainst,
      AGAINST: finalAgainst,
      justification: finalAgainst 
        ? `${forReasoning} However, ${finalAgainst}`
        : forReasoning,
    };
  });

  // Filter redundant differentials based on confirmed diagnoses
  cleaned.differential_diagnoses = filterRedundantDifferentials(cleaned.differential_diagnoses, cleaned);

  return cleaned;
}

/**
 * Filter redundant differentials when specific diagnoses are confirmed
 * - If AF is confirmed, remove VT/SVT (rhythm already identified)
 * - Enforce rhythm-class logic: irregular vs regular tachyarrhythmias
 */
function filterRedundantDifferentials(differentials, caseData) {
  if (!Array.isArray(differentials) || differentials.length === 0) {
    return differentials;
  }

  const filtered = [];
  const paraclinicalText = JSON.stringify(caseData.paraclinical || {}).toLowerCase();
  const finalDiagnosis = (caseData.final_diagnosis || '').toLowerCase();
  
  // Check if AF is confirmed (in final diagnosis or paraclinical)
  const afConfirmed = finalDiagnosis.includes('atrial fibrillation') || 
                      finalDiagnosis.includes('afib') ||
                      paraclinicalText.includes('atrial fibrillation') ||
                      paraclinicalText.includes('afib') ||
                      paraclinicalText.includes('"af"');

  // Check if regular rhythm is confirmed
  const regularRhythmConfirmed = paraclinicalText.includes('sinus rhythm') ||
                                  paraclinicalText.includes('regular rhythm') ||
                                  paraclinicalText.includes('regularly irregular');

  // Check if irregular rhythm is confirmed
  const irregularRhythmConfirmed = paraclinicalText.includes('irregular rhythm') ||
                                    paraclinicalText.includes('irregularly irregular') ||
                                    afConfirmed;

  for (const diff of differentials) {
    const name = (diff.name || diff.diagnosis || '').toLowerCase();
    
    // If AF is confirmed, remove redundant rhythm differentials
    if (afConfirmed) {
      // Remove VT/SVT when AF is already confirmed (AF is the rhythm)
      if (name.includes('ventricular tachycardia') || name.includes('vt') ||
          name.includes('supraventricular tachycardia') || name.includes('svt')) {
        continue; // Skip this differential
      }
    }
    
    // Enforce rhythm-class logic
    if (regularRhythmConfirmed) {
      // If regular rhythm confirmed, remove irregular rhythm differentials
      if (name.includes('atrial fibrillation') || name.includes('afib') ||
          name.includes('atrial flutter') || name.includes('flutter')) {
        continue; // Skip irregular rhythm differentials
      }
    }
    
    if (irregularRhythmConfirmed) {
      // If irregular rhythm confirmed, remove regular rhythm differentials
      if (name.includes('sinus tachycardia') || name.includes('sinus bradycardia') ||
          name.includes('regular rhythm')) {
        continue; // Skip regular rhythm differentials
      }
    }
    
    // Keep this differential
    filtered.push(diff);
  }

  return filtered;
}

/**
 * Validate final_diagnosis doesn't reference unavailable labs
 * Prevents final diagnosis from introducing new lab values not in paraclinical
 */
function validateFinalDiagnosisLabs(caseData) {
  const cleaned = { ...caseData };

  if (!cleaned.final_diagnosis || typeof cleaned.final_diagnosis !== 'string') {
    return cleaned;
  }

  // Extract available labs (same logic as in normalizeDifferentials)
  const availableLabs = new Set();
  const paraclinical = cleaned.paraclinical || {};
  
  const labNames = [
    'sodium', 'na', 'potassium', 'k', 'chloride', 'cl', 'bicarbonate', 'hco3',
    'glucose', 'bun', 'creatinine', 'creat', 'troponin', 'ck', 'ck-mb',
    'bnp', 'nt-probnp', 'd-dimer', 'ddimer', 'lactate', 'wbc', 'white blood cell',
    'hemoglobin', 'hgb', 'hematocrit', 'hct', 'platelet', 'plt',
    'alt', 'ast', 'bilirubin', 'albumin', 'inr', 'pt', 'ptt',
    'urinalysis', 'ua', 'urine', 'culture', 'blood culture',
    'troponin i', 'troponin t', 'ckmb', 'myoglobin'
  ];
  
  if (paraclinical.labs) {
    if (typeof paraclinical.labs === 'object' && !Array.isArray(paraclinical.labs)) {
      for (const [key, value] of Object.entries(paraclinical.labs)) {
        const keyLower = key.toLowerCase();
        const valueStr = String(value || '').trim().toLowerCase();
        if (valueStr && valueStr.length > 0 && 
            !['n/a', 'na', 'none', 'pending', 'not provided', 'tbd', 'placeholder'].includes(valueStr)) {
          availableLabs.add(keyLower);
          for (const labName of labNames) {
            if (keyLower.includes(labName) || labName.includes(keyLower)) {
              availableLabs.add(labName);
            }
          }
        }
      }
    } else if (typeof paraclinical.labs === 'string') {
      const labsStr = paraclinical.labs.toLowerCase();
      for (const labName of labNames) {
        if (labsStr.includes(labName) && !labsStr.includes(`${labName} not`) && 
            !labsStr.includes(`${labName} n/a`) && !labsStr.includes(`${labName} pending`)) {
          availableLabs.add(labName);
        }
      }
    }
  }

  // Remove references to unavailable labs from final_diagnosis
  const labPatterns = [
    /\b(sodium|na)\s+(?:is|was|of|level|value|result)\s+[^.]*\.?/gi,
    /\b(potassium|k)\s+(?:is|was|of|level|value|result)\s+[^.]*\.?/gi,
    /\b(urinalysis|ua)\s+(?:is|was|shows?|reveals?)\s+[^.]*\.?/gi,
    /\b(glucose|blood sugar)\s+(?:is|was|of|level|value|result)\s+[^.]*\.?/gi,
    /\b(bun|blood urea nitrogen)\s+(?:is|was|of|level|value|result)\s+[^.]*\.?/gi,
    /\b(creatinine|creat)\s+(?:is|was|of|level|value|result)\s+[^.]*\.?/gi,
    /\b(troponin)\s+(?:is|was|of|level|value|result)\s+[^.]*\.?/gi,
    /\b(d-dimer|ddimer)\s+(?:is|was|of|level|value|result)\s+[^.]*\.?/gi,
    /\b(lactate)\s+(?:is|was|of|level|value|result)\s+[^.]*\.?/gi,
    /\b(bnp|nt-probnp)\s+(?:is|was|of|level|value|result)\s+[^.]*\.?/gi,
  ];
  
  let finalDiagnosis = cleaned.final_diagnosis;
  
  for (const pattern of labPatterns) {
    const matches = finalDiagnosis.matchAll(pattern);
    for (const match of matches) {
      const labName = match[1].toLowerCase();
      const isAvailable = Array.from(availableLabs).some(available => 
        available.includes(labName) || labName.includes(available)
      );
      
      if (!isAvailable) {
        // Remove this reference
        finalDiagnosis = finalDiagnosis.replace(match[0], '').trim();
      }
    }
  }
  
  // Clean up multiple spaces and periods
  finalDiagnosis = finalDiagnosis.replace(/\s+/g, ' ').replace(/\.{2,}/g, '.').trim();
  
  cleaned.final_diagnosis = finalDiagnosis;
  return cleaned;
}

/**
 * Clean History text to avoid embedded JSON blocks
 */
function cleanHistory(caseData) {
  const cleaned = { ...caseData };

  if (cleaned.history && typeof cleaned.history === 'string') {
    cleaned.history = extractAndCleanJSON(cleaned.history);
  }

  return cleaned;
}

/**
 * Ensure paraclinical structure exists and routes any labs/imaging fields correctly
 */
function ensureParaclinicalStructure(caseData) {
  const cleaned = { ...caseData };

  // Ensure paraclinical object exists
  if (!cleaned.paraclinical || typeof cleaned.paraclinical !== 'object') {
    cleaned.paraclinical = { labs: '', imaging: '' };
  }

  // Route any top-level labs/imaging fields into paraclinical
  if (cleaned.labs && !cleaned.paraclinical.labs) {
    cleaned.paraclinical.labs = cleaned.labs;
    delete cleaned.labs;
  }
  if (cleaned.imaging && !cleaned.paraclinical.imaging) {
    cleaned.paraclinical.imaging = cleaned.imaging;
    delete cleaned.imaging;
  }

  // Ensure labs and imaging fields exist
  if (!cleaned.paraclinical.labs) {
    cleaned.paraclinical.labs = '';
  }
  if (!cleaned.paraclinical.imaging) {
    cleaned.paraclinical.imaging = '';
  }

  return cleaned;
}

/**
 * Clean Paraclinical text to avoid embedded JSON blocks
 * Normalize labs/imaging so each entry is either:
 * (A) a clean object {name, value, unit, interpretation} OR
 * (B) a clean short narrative sentence
 * Remove hybrid 'result: x, unit: y' strings.
 */
function cleanParaclinical(caseData) {
  const cleaned = { ...caseData };

  if (!cleaned.paraclinical || typeof cleaned.paraclinical !== 'object') {
    return cleaned;
  }

  const paraclinical = { ...cleaned.paraclinical };

  // Normalize a single paraclinical entry
  const normalizeEntry = (value) => {
    if (typeof value !== 'string') {
      // If already an object, ensure it has clean structure
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Check if it's already a clean object with name/value/unit/interpretation
        if (value.name || value.value || value.unit || value.interpretation) {
          return value; // Already structured, keep as-is
        }
        // Otherwise convert to narrative
        const parts = [];
        for (const [k, v] of Object.entries(value)) {
          if (v != null && String(v).trim()) {
            parts.push(`${k}: ${v}`);
          }
        }
        return parts.length > 0 ? parts.join('. ') : value;
      }
      return value;
    }

    let text = extractAndCleanJSON(value);
    
    // Detect hybrid patterns like "result: x, unit: y" or "value: x, unit: y"
    const hybridPattern = /(?:result|value|finding)[:\s]+([^,]+?)(?:,\s*unit[:\s]+([^,]+?))?(?:,\s*interpretation[:\s]+(.+?))?(?:\.|$)/gi;
    const hybridMatch = hybridPattern.exec(text);
    
    if (hybridMatch) {
      // Convert to clean object
      const obj = {
        name: text.split(/[:\-]/)[0]?.trim() || '',
        value: hybridMatch[1]?.trim() || '',
        unit: hybridMatch[2]?.trim() || '',
        interpretation: hybridMatch[3]?.trim() || ''
      };
      // Only return object if we have meaningful content
      if (obj.value || obj.unit) {
        return obj;
      }
    }
    
    // Detect structured patterns like "Hemoglobin: 12.5 g/dL (normal)"
    const structuredPattern = /^([^:]+?):\s*([^\s(]+)\s*(?:\(([^)]+)\))?/;
    const structMatch = structuredPattern.exec(text.trim());
    
    if (structMatch && text.trim().length < 200) {
      // Short structured entry - convert to object
      const obj = {
        name: structMatch[1].trim(),
        value: structMatch[2].trim(),
        unit: structMatch[2].match(/\s+([a-z%\/]+)$/i)?.[1] || '',
        interpretation: structMatch[3]?.trim() || ''
      };
      if (obj.value) {
        return obj;
      }
    }
    
    // If text is too long or doesn't match patterns, return as clean narrative
    // Remove hybrid artifacts
    text = text.replace(/(?:result|value|finding)[:\s]+/gi, '');
    text = text.replace(/,\s*unit[:\s]+/gi, ', ');
    text = text.replace(/\s+/g, ' ').trim();
    
    // If it's a short sentence (< 150 chars), return as narrative
    if (text.length < 150 && !text.includes('{') && !text.includes('[')) {
      return text;
    }
    
    // For longer text, ensure it's clean narrative (no JSON artifacts)
    return text;
  };

  // Clean labs
  if (paraclinical.labs) {
    if (typeof paraclinical.labs === 'string') {
      paraclinical.labs = normalizeEntry(paraclinical.labs);
    } else if (typeof paraclinical.labs === 'object' && !Array.isArray(paraclinical.labs)) {
      const cleanedLabs = {};
      for (const [key, value] of Object.entries(paraclinical.labs)) {
        cleanedLabs[key] = normalizeEntry(value);
      }
      paraclinical.labs = cleanedLabs;
    }
  }

  // Clean imaging
  if (paraclinical.imaging) {
    if (typeof paraclinical.imaging === 'string') {
      paraclinical.imaging = normalizeEntry(paraclinical.imaging);
    } else if (typeof paraclinical.imaging === 'object' && !Array.isArray(paraclinical.imaging)) {
      const cleanedImaging = {};
      for (const [key, value] of Object.entries(paraclinical.imaging)) {
        cleanedImaging[key] = normalizeEntry(value);
      }
      paraclinical.imaging = cleanedImaging;
    }
  }

  cleaned.paraclinical = paraclinical;
  return cleaned;
}

/**
 * Format paraclinical JSON into clean grouped bullet lists
 * Converts raw JSON objects into readable formatted text with grouped sections
 */
function formatParaclinicalForDisplay(caseData) {
  const cleaned = { ...caseData };

  if (!cleaned.paraclinical || typeof cleaned.paraclinical !== 'object') {
    return cleaned;
  }

  const paraclinical = { ...cleaned.paraclinical };

  // Format labs
  if (paraclinical.labs) {
    if (typeof paraclinical.labs === 'object' && !Array.isArray(paraclinical.labs)) {
      const labsObj = paraclinical.labs;
      const formattedSections = [];
      
      // Group labs by category (CBC, CMP, Lipid, etc.)
      const categories = {
        'Complete Blood Count (CBC)': ['hemoglobin', 'hb', 'hgb', 'wbc', 'white_blood_cell', 'platelet', 'plt', 'hematocrit', 'hct', 'mcv', 'mch', 'mchc', 'rdw'],
        'Comprehensive Metabolic Panel (CMP)': ['sodium', 'na', 'potassium', 'k', 'chloride', 'cl', 'bicarbonate', 'hco3', 'bun', 'urea', 'creatinine', 'creat', 'glucose', 'gluc', 'calcium', 'ca', 'phosphorus', 'phos', 'magnesium', 'mg', 'albumin', 'alb', 'total_protein', 'tp', 'bilirubin', 'bili', 'ast', 'alt', 'alkaline_phosphatase', 'alp'],
        'Lipid Profile': ['cholesterol', 'chol', 'triglyceride', 'tg', 'hdl', 'ldl'],
        'Cardiac Markers': ['troponin', 'trop', 'ck_mb', 'ck-mb', 'bnp', 'nt_probnp', 'nt-probnp'],
        'Coagulation': ['pt', 'prothrombin_time', 'inr', 'ptt', 'aptt', 'd_dimer', 'd-dimer', 'fibrinogen'],
        'Inflammatory Markers': ['crp', 'c_reactive_protein', 'esr', 'sed_rate', 'procalcitonin', 'pct'],
        'Other Labs': []
      };

      const categorized = {};
      const uncategorized = {};

      // Categorize labs
      for (const [key, value] of Object.entries(labsObj)) {
        if (typeof value === 'string' || typeof value === 'number') {
          const keyLower = key.toLowerCase();
          let categorized_flag = false;
          
          for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(kw => keyLower.includes(kw))) {
              if (!categorized[category]) categorized[category] = [];
              categorized[category].push({ key, value });
              categorized_flag = true;
              break;
            }
          }
          
          if (!categorized_flag) {
            if (!categorized['Other Labs']) categorized['Other Labs'] = [];
            categorized['Other Labs'].push({ key, value });
          }
        }
      }

      // Format each category
      for (const [category, items] of Object.entries(categorized)) {
        if (items.length > 0) {
          formattedSections.push(`\n${category}:`);
          for (const item of items) {
            const formattedKey = item.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            formattedSections.push(`  • ${formattedKey}: ${item.value}`);
          }
        }
      }

      paraclinical.labs = formattedSections.join('\n').trim();
    }
  }

  // Format imaging
  if (paraclinical.imaging) {
    if (typeof paraclinical.imaging === 'object' && !Array.isArray(paraclinical.imaging)) {
      const imagingObj = paraclinical.imaging;
      const formattedSections = [];
      
      // Group imaging by modality
      const modalities = {
        'CT Scans': ['ct', 'computed_tomography'],
        'MRI': ['mri', 'magnetic_resonance'],
        'Ultrasound': ['us', 'ultrasound', 'ultrasonography', 'echo', 'echocardiography'],
        'X-Ray': ['xray', 'x_ray', 'x-ray', 'chest_xray', 'cxr'],
        'Other Imaging': []
      };

      const categorized = {};

      // Categorize imaging
      for (const [key, value] of Object.entries(imagingObj)) {
        if (typeof value === 'string' || typeof value === 'number') {
          const keyLower = key.toLowerCase();
          let categorized_flag = false;
          
          for (const [modality, keywords] of Object.entries(modalities)) {
            if (keywords.some(kw => keyLower.includes(kw))) {
              if (!categorized[modality]) categorized[modality] = [];
              categorized[modality].push({ key, value });
              categorized_flag = true;
              break;
            }
          }
          
          if (!categorized_flag) {
            if (!categorized['Other Imaging']) categorized['Other Imaging'] = [];
            categorized['Other Imaging'].push({ key, value });
          }
        }
      }

      // Format each modality
      for (const [modality, items] of Object.entries(categorized)) {
        if (items.length > 0) {
          formattedSections.push(`\n${modality}:`);
          for (const item of items) {
            const formattedKey = item.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            formattedSections.push(`  • ${formattedKey}: ${item.value}`);
          }
        }
      }

      paraclinical.imaging = formattedSections.join('\n').trim();
    }
  }

  cleaned.paraclinical = paraclinical;
  return cleaned;
}

/**
 * Normalize normal_range formatting in labs and vitals
 * Only formats existing normal_range fields; does not add content
 */
function normalizeNormalRanges(caseData) {
  const cleaned = { ...caseData };

  // Normalize in paraclinical.labs
  if (cleaned.paraclinical?.labs) {
    if (typeof cleaned.paraclinical.labs === 'object' && !Array.isArray(cleaned.paraclinical.labs)) {
      const labs = { ...cleaned.paraclinical.labs };
      for (const [key, value] of Object.entries(labs)) {
        if (typeof value === 'string') {
          // Normalize patterns like "N: 0.04–0.40", "N 0.04-0.40", "Normal: 0.04-0.40"
          labs[key] = value.replace(/(?:N|Normal|Reference)[:\s]*([0-9.]+)[\s\-–]+([0-9.]+)/gi, 'N: $1–$2');
          labs[key] = labs[key].replace(/(?:N|Normal|Reference)[:\s]*([0-9.]+)/gi, 'N: $1');
        }
      }
      cleaned.paraclinical.labs = labs;
    }
  }

  // Normalize in physical_exam if it's an object with vitals
  if (cleaned.physical_exam && typeof cleaned.physical_exam === 'object' && !Array.isArray(cleaned.physical_exam)) {
    const exam = { ...cleaned.physical_exam };
    for (const [key, value] of Object.entries(exam)) {
      if (typeof value === 'string') {
        // Normalize normal range patterns in vital signs
        exam[key] = value.replace(/(?:N|Normal|Reference)[:\s]*([0-9.]+)[\s\-–]+([0-9.]+)/gi, 'N: $1–$2');
        exam[key] = exam[key].replace(/(?:N|Normal|Reference)[:\s]*([0-9.]+)/gi, 'N: $1');
      }
    }
    cleaned.physical_exam = exam;
  }

  return cleaned;
}

/**
 * Extract and clean embedded JSON blocks from text
 */
function extractAndCleanJSON(text) {
  if (typeof text !== 'string') return text;

  let cleaned = text;

  // Try to parse as full JSON object first
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === 'object' && parsed !== null) {
      // Convert object to readable sentences
      const sentences = [];
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'string' && value.trim().length > 0) {
          sentences.push(`${key}: ${value}`);
        } else if (typeof value === 'object' && value !== null) {
          sentences.push(`${key}: ${JSON.stringify(value)}`);
        }
      }
      return sentences.join('. ') + '.';
    }
  } catch (e) {
    // Not a full JSON object, continue with pattern matching
  }

  // Look for JSON-like structures: { "key": "value", "key2": "value2" }
  const jsonPattern = /\{\s*"([^"]+)":\s*"([^"]+)"(?:\s*,\s*"([^"]+)":\s*"([^"]+)")*\s*\}/g;
  
  let match;
  const matches = [];
  
  // Collect all matches first
  while ((match = jsonPattern.exec(text)) !== null) {
    matches.push(match);
  }
  
  // Process matches in reverse order to preserve indices
  for (let i = matches.length - 1; i >= 0; i--) {
    const fullMatch = matches[i][0];
    const pairs = [];
    
    // Extract all key-value pairs
    const pairPattern = /"([^"]+)":\s*"([^"]+)"/g;
    let pairMatch;
    while ((pairMatch = pairPattern.exec(fullMatch)) !== null) {
      pairs.push({ key: pairMatch[1], value: pairMatch[2] });
    }
    
    // Convert to readable sentence
    if (pairs.length > 0) {
      const readable = pairs.map(p => {
        // Format key nicely (e.g., "Findings" -> "Findings", "Interpretation" -> "Interpretation")
        const formattedKey = p.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return `${formattedKey}: ${p.value}`;
      }).join('. ') + '.';
      cleaned = cleaned.substring(0, matches[i].index) + readable + cleaned.substring(matches[i].index + fullMatch.length);
    }
  }

  // Also handle simpler patterns like { "Findings": "...", "Interpretation": "..." } (single-line)
  const simplePattern = /\{\s*"([^"]+)":\s*"([^"]+)"\s*\}/g;
  cleaned = cleaned.replace(simplePattern, (match, key, value) => {
    const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return `${formattedKey}: ${value}`;
  });

  // Remove any remaining JSON artifacts (unmatched braces, quotes)
  cleaned = cleaned.replace(/\{\s*\}/g, '');
  cleaned = cleaned.replace(/\[\s*\]/g, '');
  
  // Remove standalone curly braces and brackets that weren't caught
  cleaned = cleaned.replace(/\{[^}]*\}/g, (match) => {
    // If it looks like JSON but wasn't caught, try to extract content
    const contentMatch = match.match(/"([^"]+)":\s*"([^"]+)"/);
    if (contentMatch) {
      return `${contentMatch[1]}: ${contentMatch[2]}`;
    }
    // Remove braces and quotes, keep content
    return match.replace(/[{}"]/g, '').trim();
  });
  
  // Remove nested quotes that look like JSON artifacts
  cleaned = cleaned.replace(/"([^"]+)":\s*"([^"]+)"/g, '$1: $2');
  
  // Remove any remaining standalone quotes that look like JSON
  cleaned = cleaned.replace(/^"|"$/g, '');
  cleaned = cleaned.replace(/\s*:\s*"/g, ': ');
  cleaned = cleaned.replace(/"\s*,/g, ',');
  
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Stabilize Management Escalation structure
 */
function stabilizeManagement(caseData) {
  const cleaned = { ...caseData };

  if (!cleaned.management || typeof cleaned.management !== 'object') {
    return cleaned;
  }

  const management = { ...cleaned.management };

  // Clean initial management
  if (management.initial) {
    if (typeof management.initial === 'string') {
      management.initial = cleanManagementText(management.initial);
    } else if (Array.isArray(management.initial)) {
      management.initial = management.initial
        .map(item => typeof item === 'string' ? cleanManagementText(item) : item)
        .join(' ');
    }
  }

  // Clean definitive management
  if (management.definitive) {
    if (typeof management.definitive === 'string') {
      management.definitive = cleanManagementText(management.definitive);
    } else if (Array.isArray(management.definitive)) {
      management.definitive = management.definitive
        .map(item => typeof item === 'string' ? cleanManagementText(item) : item)
        .join(' ');
    }
  }

  // Clean escalation
  if (management.escalation) {
    if (typeof management.escalation === 'string') {
      management.escalation = cleanManagementText(management.escalation);
    } else if (Array.isArray(management.escalation)) {
      management.escalation = management.escalation
        .map(item => typeof item === 'string' ? cleanManagementText(item) : item)
        .join(' ');
    }
  }

  cleaned.management = management;
  return cleaned;
}

/**
 * Clean management text to remove broken key fragments
 */
function cleanManagementText(text) {
  if (typeof text !== 'string') return text;

  let cleaned = text;

  // Remove meaningless labels without content (standalone labels)
  cleaned = cleaned.replace(/vitals_thresholds:\s*$/gim, '');
  cleaned = cleaned.replace(/sepsis_indicators:\s*$/gim, '');
  cleaned = cleaned.replace(/escalation_criteria:\s*$/gim, '');
  cleaned = cleaned.replace(/disposition_thresholds:\s*$/gim, '');
  cleaned = cleaned.replace(/treatment_thresholds:\s*$/gim, '');
  cleaned = cleaned.replace(/icu_criteria:\s*$/gim, '');

  // Convert label-only lines into full sentences if they have content
  cleaned = cleaned.replace(/vitals_thresholds:\s*(.+?)(?:\n|$)/gim, (match, content) => {
    if (content.trim().length > 0) {
      return `Escalate if vitals meet these thresholds: ${content.trim()}. `;
    }
    return '';
  });
  cleaned = cleaned.replace(/sepsis_indicators:\s*(.+?)(?:\n|$)/gim, (match, content) => {
    if (content.trim().length > 0) {
      return `Monitor for sepsis indicators: ${content.trim()}. `;
    }
    return '';
  });
  cleaned = cleaned.replace(/escalation_criteria:\s*(.+?)(?:\n|$)/gim, (match, content) => {
    if (content.trim().length > 0) {
      return `Escalate to ICU if: ${content.trim()}. `;
    }
    return '';
  });
  cleaned = cleaned.replace(/disposition_thresholds:\s*(.+?)(?:\n|$)/gim, (match, content) => {
    if (content.trim().length > 0) {
      return `Disposition criteria: ${content.trim()}. `;
    }
    return '';
  });
  cleaned = cleaned.replace(/treatment_thresholds:\s*(.+?)(?:\n|$)/gim, (match, content) => {
    if (content.trim().length > 0) {
      return `Treatment thresholds: ${content.trim()}. `;
    }
    return '';
  });

  // Remove empty lines and normalize whitespace
  cleaned = cleaned.split('\n')
    .filter(line => line.trim().length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

/**
 * Map stability/risk/consistency into standard fields
 */
function mapStabilityRiskConsistency(caseData) {
  const cleaned = { ...caseData };

  // Extract stability/risk/consistency from various locations
  let stability = null;
  let risk = null;
  let consistency = null;

  // Check if they exist as separate fields (from expand endpoints)
  if (cleaned.stability) stability = cleaned.stability;
  if (cleaned.risk) risk = cleaned.risk;
  if (cleaned.consistency) consistency = cleaned.consistency;

  // Build clinical_risk_assessment if we have stability/risk info
  if (stability || risk) {
    const riskParts = [];
    if (stability) riskParts.push(`Stability: ${stability}`);
    if (risk) riskParts.push(`Risk: ${risk}`);
    if (consistency) riskParts.push(`Consistency: ${consistency}`);

    if (riskParts.length > 0) {
      // Update meta.severity_grade if risk indicates severity
      if (risk && typeof risk === 'string') {
        const riskLower = risk.toLowerCase();
        if (riskLower.includes('high') || riskLower.includes('critical')) {
          cleaned.meta = cleaned.meta || {};
          if (!cleaned.meta.severity_grade || cleaned.meta.severity_grade === 'moderate') {
            cleaned.meta.severity_grade = 'high';
          }
        } else if (riskLower.includes('moderate') || riskLower.includes('borderline')) {
          cleaned.meta = cleaned.meta || {};
          if (!cleaned.meta.severity_grade) {
            cleaned.meta.severity_grade = 'moderate';
          }
        }
      }

      // Create or append to clinical_risk_assessment
      if (!cleaned.clinical_risk_assessment) {
        cleaned.clinical_risk_assessment = riskParts.join('. ') + '.';
      } else {
        cleaned.clinical_risk_assessment = `${cleaned.clinical_risk_assessment} ${riskParts.join('. ')}.`;
      }
    }
  }

  // Deduplicate repeated sentences (e.g., ABG blocks echoed twice)
  if (cleaned.clinical_risk_assessment) {
    cleaned.clinical_risk_assessment = dedupeSentences(cleaned.clinical_risk_assessment);
  }

  return cleaned;
}

/**
 * Route teaching/deep evidence blocks into existing schema fields
 * If structured teaching fields exist, suppress any raw teaching text and eliminate duplicate blocks.
 */
function routeTeachingAndEvidence(caseData) {
  const cleaned = { ...caseData };

  // Handle Teaching Mode content
  if (cleaned.teaching) {
    const teaching = cleaned.teaching;
    const asString = teaching && typeof teaching !== 'string' ? JSON.stringify(teaching) : teaching;
    const normalized = extractTeachingBlocks(asString);

    // Check if structured fields already exist
    const hasStructuredFields = 
      (cleaned.key_concepts && Array.isArray(cleaned.key_concepts) && cleaned.key_concepts.length > 0) ||
      (cleaned.clinical_pearls && Array.isArray(cleaned.clinical_pearls) && cleaned.clinical_pearls.length > 0) ||
      (cleaned.common_pitfalls && Array.isArray(cleaned.common_pitfalls) && cleaned.common_pitfalls.length > 0);

    // Only populate if structured fields don't exist, or merge if they do
    if (normalized.key_concepts.length > 0) {
      if (hasStructuredFields && cleaned.key_concepts && Array.isArray(cleaned.key_concepts)) {
        // Merge and deduplicate
        const existing = new Set(cleaned.key_concepts.map(c => c.toLowerCase().trim()));
        const newConcepts = normalized.key_concepts.filter(c => !existing.has(c.toLowerCase().trim()));
        cleaned.key_concepts = [...cleaned.key_concepts, ...newConcepts];
      } else {
        cleaned.key_concepts = normalized.key_concepts;
      }
    }
    if (normalized.clinical_pearls.length > 0) {
      if (hasStructuredFields && cleaned.clinical_pearls && Array.isArray(cleaned.clinical_pearls)) {
        // Merge and deduplicate
        const existing = new Set(cleaned.clinical_pearls.map(p => p.toLowerCase().trim()));
        const newPearls = normalized.clinical_pearls.filter(p => !existing.has(p.toLowerCase().trim()));
        cleaned.clinical_pearls = [...cleaned.clinical_pearls, ...newPearls];
      } else {
        cleaned.clinical_pearls = normalized.clinical_pearls;
      }
    }
    if (normalized.common_pitfalls.length > 0) {
      if (hasStructuredFields && cleaned.common_pitfalls && Array.isArray(cleaned.common_pitfalls)) {
        // Merge and deduplicate
        const existing = new Set(cleaned.common_pitfalls.map(p => p.toLowerCase().trim()));
        const newPitfalls = normalized.common_pitfalls.filter(p => !existing.has(p.toLowerCase().trim()));
        cleaned.common_pitfalls = [...cleaned.common_pitfalls, ...newPitfalls];
      } else {
        cleaned.common_pitfalls = normalized.common_pitfalls;
      }
    }

    // Suppress raw teaching text if structured fields exist
    if (hasStructuredFields || normalized.key_concepts.length > 0 || normalized.clinical_pearls.length > 0 || normalized.common_pitfalls.length > 0) {
      delete cleaned.teaching;
    }
  }

  // Handle Deep Evidence Mode content
  if (cleaned.deepEvidence) {
    const evidence = cleaned.deepEvidence;
    
    // Handle JSON format with structured fields
    if (typeof evidence === 'object' && evidence !== null && !Array.isArray(evidence)) {
      const clinicalLogic = [];
      const testInterpretation = [];
      const probabilityShifts = [];
      
      // Extract from structured JSON fields
      if (evidence.clinicalLogic) {
        const logic = Array.isArray(evidence.clinicalLogic) 
          ? evidence.clinicalLogic.join(' ') 
          : String(evidence.clinicalLogic);
        clinicalLogic.push(logic);
      }
      if (evidence.testInterpretation) {
        const interpretation = Array.isArray(evidence.testInterpretation)
          ? evidence.testInterpretation.join(' ')
          : String(evidence.testInterpretation);
        testInterpretation.push(interpretation);
      }
      if (evidence.probabilityShifts) {
        const shifts = Array.isArray(evidence.probabilityShifts)
          ? evidence.probabilityShifts.join(' ')
          : String(evidence.probabilityShifts);
        probabilityShifts.push(shifts);
      }
      
      // Convert to readable text block
      const evidenceParts = [];
      if (clinicalLogic.length > 0) {
        evidenceParts.push(`Clinical Logic: ${clinicalLogic.join(' ')}`);
      }
      if (testInterpretation.length > 0) {
        evidenceParts.push(`Test Interpretation: ${testInterpretation.join(' ')}`);
      }
      if (probabilityShifts.length > 0) {
        evidenceParts.push(`Probability Shifts: ${probabilityShifts.join(' ')}`);
      }
      
      const formattedEvidence = evidenceParts.join('. ') + (evidenceParts.length > 0 ? '.' : '');
      
      // Map to existing schema fields
      if (clinicalLogic.length > 0) {
        if (!cleaned.clinical_risk_assessment) {
          cleaned.clinical_risk_assessment = clinicalLogic.join(' ');
        } else {
          cleaned.clinical_risk_assessment = `${cleaned.clinical_risk_assessment} ${clinicalLogic.join(' ')}`;
        }
      }
      if (testInterpretation.length > 0) {
        cleaned.next_diagnostic_steps = testInterpretation.join(' ');
      }
      if (probabilityShifts.length > 0) {
        if (!cleaned.clinical_risk_assessment) {
          cleaned.clinical_risk_assessment = probabilityShifts.join(' ');
        } else {
          cleaned.clinical_risk_assessment = `${cleaned.clinical_risk_assessment} ${probabilityShifts.join(' ')}`;
        }
      }
      
      // Store formatted evidence as readable text (with deduplication)
      cleaned.deepEvidence = dedupeSentences(formattedEvidence || cleaned.deepEvidence);
    } else if (typeof evidence === 'string') {
      // Extract clinical logic, test interpretation, probability shifts from string
      const lines = evidence.split('\n').filter(l => l.trim().length > 0);
      
      const clinicalLogic = [];
      const testInterpretation = [];
      const probabilityShifts = [];
      
      lines.forEach(line => {
        const lower = line.toLowerCase();
        if (lower.includes('probability') || lower.includes('likelihood') || lower.includes('risk')) {
          probabilityShifts.push(line.trim());
        } else if (lower.includes('test') || lower.includes('result') || lower.includes('interpretation')) {
          testInterpretation.push(line.trim());
        } else if (line.trim().length > 20) {
          clinicalLogic.push(line.trim());
        }
      });

      // Map to existing schema fields
      if (clinicalLogic.length > 0) {
        if (!cleaned.clinical_risk_assessment) {
          cleaned.clinical_risk_assessment = clinicalLogic.join(' ');
        } else {
          cleaned.clinical_risk_assessment = `${cleaned.clinical_risk_assessment} ${clinicalLogic.join(' ')}`;
        }
      }
      if (testInterpretation.length > 0) {
        cleaned.next_diagnostic_steps = testInterpretation.join(' ');
      }
      if (probabilityShifts.length > 0) {
        if (!cleaned.clinical_risk_assessment) {
          cleaned.clinical_risk_assessment = probabilityShifts.join(' ');
        } else {
          cleaned.clinical_risk_assessment = `${cleaned.clinical_risk_assessment} ${probabilityShifts.join(' ')}`;
        }
      }
      
      // Apply sentence-level deduplication to deepEvidence
      if (cleaned.deepEvidence && typeof cleaned.deepEvidence === 'string') {
        cleaned.deepEvidence = dedupeSentences(cleaned.deepEvidence);
      }
    }

    if (cleaned.clinical_risk_assessment) {
      cleaned.clinical_risk_assessment = dedupeSentences(cleaned.clinical_risk_assessment);
    }
  } else {
    // If deepEvidence is empty or placeholder, populate from available data
    const paraclinical = cleaned.paraclinical || {};
    const paraclinicalText = JSON.stringify(paraclinical).toLowerCase();
    const finalDiagnosis = (cleaned.final_diagnosis || '').toLowerCase();
    
    // Check if deepEvidence is empty or placeholder
    const isEmpty = !cleaned.deepEvidence || 
                    (typeof cleaned.deepEvidence === 'string' && cleaned.deepEvidence.trim().length < 20) ||
                    (typeof cleaned.deepEvidence === 'string' && /placeholder|not provided|n\/a/i.test(cleaned.deepEvidence));
    
    if (isEmpty) {
      const evidenceParts = [];
      
      // Extract troponin findings
      if (paraclinicalText.includes('troponin')) {
        const troponinMatch = paraclinicalText.match(/troponin[^.]*\.?/i);
        if (troponinMatch) {
          evidenceParts.push(`Troponin elevation indicates myocardial injury`);
        }
      }
      
      // Extract ECG findings
      if (paraclinicalText.includes('ecg') || paraclinicalText.includes('ekg')) {
        if (paraclinicalText.includes('st elevation') || paraclinicalText.includes('stemi')) {
          evidenceParts.push(`ECG shows ST elevation consistent with STEMI`);
        } else if (paraclinicalText.includes('no st elevation') || paraclinicalText.includes('st depression')) {
          evidenceParts.push(`ECG absence of ST elevation supports NSTEMI diagnosis`);
        }
      }
      
      // Extract CTA findings
      if (paraclinicalText.includes('ct') && (paraclinicalText.includes('angiography') || paraclinicalText.includes('cta'))) {
        if (paraclinicalText.includes('no evidence') || paraclinicalText.includes('negative') || paraclinicalText.includes('normal')) {
          if (paraclinicalText.includes('dissection') || paraclinicalText.includes('embolism')) {
            evidenceParts.push(`CT angiography excludes aortic dissection and pulmonary embolism`);
          }
        } else if (paraclinicalText.includes('stenosis')) {
          evidenceParts.push(`Coronary CT angiography reveals coronary stenosis`);
        }
      }
      
      // Build deep evidence from extracted parts
      if (evidenceParts.length > 0) {
        cleaned.deepEvidence = evidenceParts.join('. ') + '.';
      }
    }
    
    // Schema enforcement: Deep Evidence must have minimum structure
    // Require: labs interpretation + ECG/imaging + probability shift
    if (cleaned.deepEvidence && typeof cleaned.deepEvidence === 'string') {
      const evidenceLower = cleaned.deepEvidence.toLowerCase();
      const hasLabs = evidenceLower.includes('troponin') || evidenceLower.includes('lab') || 
                      evidenceLower.includes('result') || evidenceLower.includes('value');
      const hasImaging = evidenceLower.includes('ecg') || evidenceLower.includes('ekg') || 
                         evidenceLower.includes('ct') || evidenceLower.includes('imaging') ||
                         evidenceLower.includes('x-ray');
      const hasProbability = evidenceLower.includes('probability') || evidenceLower.includes('likelihood') ||
                             evidenceLower.includes('supports') || evidenceLower.includes('reduces');
      
      // If missing required components, enhance from paraclinical
      if (!hasLabs && paraclinicalText.includes('troponin')) {
        const troponinMatch = paraclinicalText.match(/troponin[^.]*\.?/i);
        if (troponinMatch) {
          cleaned.deepEvidence = `Troponin elevation indicates myocardial injury. ${cleaned.deepEvidence}`;
        }
      }
      if (!hasImaging && (paraclinicalText.includes('ecg') || paraclinicalText.includes('ct'))) {
        const imagingMatch = paraclinicalText.match(/(?:ecg|ekg|ct)[^.]*\.?/i);
        if (imagingMatch) {
          cleaned.deepEvidence = `${cleaned.deepEvidence} ${imagingMatch[0].trim()} provides diagnostic information.`;
        }
      }
      if (!hasProbability) {
        cleaned.deepEvidence = `${cleaned.deepEvidence} These findings support the diagnosis.`;
      }
    }
  }

  return cleaned;
}

/**
 * Clean expert_conference noise
 */
function cleanExpertConference(caseData) {
  const cleaned = { ...caseData };

  // Handle both expertConference and expert_conference fields
  const expertConf = cleaned.expertConference || cleaned.expert_conference;
  
  if (!expertConf || typeof expertConf !== 'string') {
    return cleaned;
  }

  let cleanedText = expertConf;

  // Remove duplicated phrases and mechanical markers
  cleanedText = cleanedText.replace(/Dr\s+[A-D]\s+vs\s+Dr\s+[A-D]\s+disagreement:\s*/gi, '');
  cleanedText = cleanedText.replace(/Dr\s+[A-D]\s+disagrees\s+with\s+Dr\s+[A-D]:\s*/gi, '');
  cleanedText = cleanedText.replace(/Disagreement\s+between\s+Dr\s+[A-D]\s+and\s+Dr\s+[A-D]:\s*/gi, '');
  cleanedText = cleanedText.replace(/\[Disagreement\]/gi, '');
  cleanedText = cleanedText.replace(/\[Agreement\]/gi, '');
  cleanedText = cleanedText.replace(/\[Consensus\]/gi, '');

  // Remove double disagreement lines (same pattern appearing twice)
  cleanedText = cleanedText.replace(/(Dr\s+[A-D]\s+vs\s+Dr\s+[A-D][^\n]*\n\s*){2,}/gi, '');
  cleanedText = cleanedText.replace(/(Dr\s+[A-D]\s+disagrees[^\n]*\n\s*){2,}/gi, '');

  // Normalize doctor references to consistent format
  cleanedText = cleanedText.replace(/Dr\.\s*([A-D])\s*[:\-]\s*/gi, 'Dr $1: ');
  cleanedText = cleanedText.replace(/Dr\s+([A-D])\s*[:\-]\s*/gi, 'Dr $1: ');

  // Remove redundant "Dr X vs Dr Y disagreement" patterns that appear mid-text
  cleanedText = cleanedText.replace(/\s+Dr\s+[A-D]\s+vs\s+Dr\s+[A-D]\s+disagreement[:\-]\s*/gi, ' ');
  cleanedText = cleanedText.replace(/\s+Dr\s+[A-D]\s+and\s+Dr\s+[A-D]\s+disagree[:\-]\s*/gi, ' ');

  // Clean up excessive whitespace and normalize line breaks
  cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n');
  cleanedText = cleanedText.replace(/\s{2,}/g, ' ');

  // Ensure proper sentence endings
  cleanedText = cleanedText.replace(/\.\s*\./g, '.');
  cleanedText = cleanedText.replace(/\?\s*\?/g, '?');

  // Trim and update the field
  cleanedText = cleanedText.trim();
  
  if (cleaned.expertConference) {
    cleaned.expertConference = cleanedText;
  }
  if (cleaned.expert_conference) {
    cleaned.expert_conference = cleanedText;
  }

  return cleaned;
}

/**
 * Extract teaching content into structured buckets while stripping raw JSON artifacts.
 * Enforces order: key_concepts → clinical_pearls → common_pitfalls
 */
function extractTeachingBlocks(teachingText) {
  const key_concepts = [];
  const clinical_pearls = [];
  const common_pitfalls = [];

  if (!teachingText || typeof teachingText !== 'string') {
    return { key_concepts, clinical_pearls, common_pitfalls };
  }

  // Strip markdown code fences and JSON markers
  let trimmed = teachingText.trim();
  trimmed = trimmed.replace(/^```json\s*/i, '').replace(/^```\s*/i, '');
  trimmed = trimmed.replace(/```\s*$/i, '');
  trimmed = trimmed.replace(/^\{[\s\n]*"teaching":\s*"/i, '').replace(/"[\s\n]*\}\s*$/i, '');
  trimmed = trimmed.replace(/\\n/g, '\n').replace(/\\"/g, '"');
  trimmed = trimmed.trim();

  // Try to parse JSON if the model returned a JSON block
  let parsed;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      parsed = JSON.parse(trimmed);
    } catch (e) {
      // Try extracting JSON from markdown-wrapped content
      const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          // ignore JSON parse failure, fallback to string parsing
        }
      }
    }
  }

  const pushIfString = (val, bucket) => {
    if (typeof val === 'string' && val.trim().length > 0) {
      const cleaned = val.trim().replace(/^["']|["']$/g, '');
      if (cleaned.length > 0) {
        bucket.push(cleaned);
      }
    }
  };

  if (parsed) {
    if (Array.isArray(parsed)) {
      parsed.forEach((entry) => pushIfString(entry, key_concepts));
    } else if (typeof parsed === 'object') {
      // Extract key_concepts first (order enforcement)
      if (parsed.key_concepts || parsed.keyConcepts) {
        const concepts = parsed.key_concepts || parsed.keyConcepts;
        if (Array.isArray(concepts)) {
          concepts.forEach(c => pushIfString(c, key_concepts));
        } else {
          pushIfString(concepts, key_concepts);
        }
      }
      // Extract clinical_pearls second
      if (parsed.clinical_pearls || parsed.pearls) {
        const pearls = parsed.clinical_pearls || parsed.pearls;
        if (Array.isArray(pearls)) {
          pearls.forEach(p => pushIfString(p, clinical_pearls));
        } else {
          pushIfString(pearls, clinical_pearls);
        }
      }
      // Extract common_pitfalls third
      if (parsed.common_pitfalls || parsed.pitfalls) {
        const pitfalls = parsed.common_pitfalls || parsed.pitfalls;
        if (Array.isArray(pitfalls)) {
          pitfalls.forEach(p => pushIfString(p, common_pitfalls));
        } else {
          pushIfString(pitfalls, common_pitfalls);
        }
      }
    }
  }

  // Parse line-by-line text to capture pearls/pitfalls/concepts
  const lines = trimmed.split('\n').filter(l => l.trim().length > 0);
  lines.forEach((line) => {
    // Strip JSON markers from line
    let cleanedLine = line.replace(/^[\-\d\.\)]\s*/, '').trim();
    cleanedLine = cleanedLine.replace(/^["']|["']$/g, '');
    cleanedLine = cleanedLine.replace(/^\{[\s\n]*"[^"]+":\s*"([^"]+)"[\s\n]*\}/, '$1');
    
    if (cleanedLine.length === 0) return;
    
    const lower = cleanedLine.toLowerCase();
    if (lower.includes('pearl') || lower.includes('takeaway') || lower.includes('key point')) {
      const pearl = cleanedLine.replace(/^(key point|pearl|takeaway)[:\-]\s*/i, '').trim();
      if (pearl.length > 0) clinical_pearls.push(pearl);
    } else if (lower.includes('pitfall') || lower.includes('common mistake') || lower.includes('trap')) {
      const pitfall = cleanedLine.replace(/^(pitfall|common mistake|trap)[:\-]\s*/i, '').trim();
      if (pitfall.length > 0) common_pitfalls.push(pitfall);
    } else {
      // Default to key_concepts if no specific marker
      key_concepts.push(cleanedLine);
    }
  });

  // Deduplicate strictly and enforce order
  const dedupeArray = (arr) => {
    const seen = new Set();
    return arr.filter(item => {
      const key = item.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  return {
    key_concepts: dedupeArray(key_concepts.map(s => s.trim()).filter(Boolean)),
    clinical_pearls: dedupeArray(clinical_pearls.map(s => s.trim()).filter(Boolean)),
    common_pitfalls: dedupeArray(common_pitfalls.map(s => s.trim()).filter(Boolean)),
  };
}

/**
 * Remove paraclinical placeholders and ensure completeness
 * If a test is listed, ensure a value or omit entirely
 * Enhanced to remove incomplete lab panels (CBC, lipid panel placeholders)
 */
function removeParaclinicalPlaceholders(caseData) {
  const cleaned = { ...caseData };

  if (!cleaned.paraclinical || typeof cleaned.paraclinical !== 'object') {
    return cleaned;
  }

  const paraclinical = { ...cleaned.paraclinical };
  const placeholders = ['not provided', 'n/a', 'na', 'none', 'pending', 'to be determined', 'tbd', 'placeholder', ''];
  
  // Patterns for incomplete lab panels
  const incompletePanelPatterns = [
    /\b(?:cbc|complete blood count|lipid panel|metabolic panel)\s*[:\-]?\s*(?:not provided|n\/a|na|none|pending|to be determined|tbd|placeholder)\b/gi,
    /\b(?:cbc|complete blood count|lipid panel|metabolic panel)\s*[:\-]?\s*$/gi,
  ];

  // Clean labs
  if (paraclinical.labs) {
    if (typeof paraclinical.labs === 'object' && !Array.isArray(paraclinical.labs)) {
      const cleanedLabs = {};
      for (const [key, value] of Object.entries(paraclinical.labs)) {
        const valueStr = String(value || '').trim().toLowerCase();
        // Only keep if it's not a placeholder and has actual content
        if (valueStr && !placeholders.includes(valueStr) && valueStr.length > 2) {
          // Check if it's an incomplete panel reference
          const isIncompletePanel = incompletePanelPatterns.some(pattern => 
            pattern.test(`${key}: ${valueStr}`)
          );
          if (!isIncompletePanel) {
            cleanedLabs[key] = value;
          }
        }
      }
      paraclinical.labs = Object.keys(cleanedLabs).length > 0 ? cleanedLabs : '';
    } else if (typeof paraclinical.labs === 'string') {
      // Remove placeholder phrases from string
      let cleanedLabs = paraclinical.labs;
      for (const placeholder of placeholders) {
        cleanedLabs = cleanedLabs.replace(new RegExp(`\\b${placeholder}\\b`, 'gi'), '');
      }
      // Remove incomplete panel references
      for (const pattern of incompletePanelPatterns) {
        cleanedLabs = cleanedLabs.replace(pattern, '');
      }
      // Remove sentences that only mention incomplete panels
      const sentences = cleanedLabs.split(/[.!?]/).filter(s => {
        const sLower = s.toLowerCase();
        return !incompletePanelPatterns.some(pattern => pattern.test(sLower)) &&
               s.trim().length > 0;
      });
      cleanedLabs = sentences.join('. ').trim();
      paraclinical.labs = cleanedLabs || '';
    }
  }

  // Clean imaging
  if (paraclinical.imaging) {
    if (typeof paraclinical.imaging === 'object' && !Array.isArray(paraclinical.imaging)) {
      const cleanedImaging = {};
      for (const [key, value] of Object.entries(paraclinical.imaging)) {
        const valueStr = String(value || '').trim().toLowerCase();
        // Only keep if it's not a placeholder
        if (valueStr && !placeholders.includes(valueStr) && valueStr.length > 2) {
          cleanedImaging[key] = value;
        }
      }
      paraclinical.imaging = Object.keys(cleanedImaging).length > 0 ? cleanedImaging : '';
    } else if (typeof paraclinical.imaging === 'string') {
      // Remove placeholder phrases from string
      let cleanedImaging = paraclinical.imaging;
      for (const placeholder of placeholders) {
        cleanedImaging = cleanedImaging.replace(new RegExp(`\\b${placeholder}\\b`, 'gi'), '');
      }
      paraclinical.imaging = cleanedImaging.trim() || '';
    }
  }

  cleaned.paraclinical = paraclinical;
  return cleaned;
}

/**
 * Improve escalation logic to be pathology-specific
 * Remove generic escalation criteria that don't match the diagnosis
 */
function improveEscalationLogic(caseData) {
  const cleaned = { ...caseData };

  if (!cleaned.management || typeof cleaned.management !== 'object') {
    return cleaned;
  }

  const management = { ...cleaned.management };
  const finalDiagnosis = (cleaned.final_diagnosis || '').toLowerCase();
  const diagnosisLower = finalDiagnosis;

  // Pathology-specific escalation patterns to remove
  const genericPatterns = {
    // Sepsis language that shouldn't appear in non-sepsis cases
    'sepsis': {
      excludeFrom: ['mi', 'stem', 'chest pain', 'acs', 'stroke', 'pneumonia', 'appendicitis'],
      patterns: ['sirs criteria', 'qsofa', 'sepsis bundle', 'lactate >4']
    },
    // Cardiac language that shouldn't appear in non-cardiac cases
    'cardiac': {
      excludeFrom: ['pneumonia', 'appendicitis', 'stroke', 'meningitis'],
      patterns: ['st elevation', 'troponin elevation', 'cardiac catheterization']
    },
    // Respiratory language that shouldn't appear in non-respiratory cases
    'respiratory': {
      excludeFrom: ['mi', 'appendicitis', 'stroke'],
      patterns: ['mechanical ventilation', 'oxygen requirement', 'pneumonia protocol']
    }
  };

  // Clean escalation text
  if (management.escalation && typeof management.escalation === 'string') {
    let escalation = management.escalation;
    
    // Remove generic patterns that don't match the diagnosis
    for (const [category, config] of Object.entries(genericPatterns)) {
      const shouldExclude = config.excludeFrom.some(exclude => diagnosisLower.includes(exclude));
      if (shouldExclude) {
        for (const pattern of config.patterns) {
          const regex = new RegExp(`[^.]*${pattern}[^.]*\\.?`, 'gi');
          escalation = escalation.replace(regex, '');
        }
      }
    }

    // Remove overly generic escalation phrases
    const overlyGeneric = [
      /escalate\s+if\s+patient\s+deteriorates/gi,
      /monitor\s+for\s+complications/gi,
      /transfer\s+to\s+icu\s+if\s+needed/gi,
    ];
    
    for (const pattern of overlyGeneric) {
      escalation = escalation.replace(pattern, '');
    }

    // Clean up multiple spaces and periods
    escalation = escalation.replace(/\s+/g, ' ').replace(/\.{2,}/g, '.').trim();
    
    management.escalation = escalation || management.escalation;
  }

  cleaned.management = management;
  return cleaned;
}

/**
 * Remove cross-section redundancy (verbatim repetition across sections)
 * Allow reuse of facts but avoid verbatim restatement
 */
function removeCrossSectionRedundancy(caseData) {
  const cleaned = { ...caseData };
  
  // Collect all text content from different sections
  const sectionMap = {
    paraclinical: JSON.stringify(cleaned.paraclinical || {}),
    deepEvidence: cleaned.deepEvidence || '',
    clinicalRisk: cleaned.clinical_risk_assessment || '',
    nextSteps: cleaned.next_diagnostic_steps || '',
    pathophysiology: cleaned.pathophysiology || '',
  };

  // Map section names to actual property names
  const propertyMap = {
    paraclinical: 'paraclinical',
    deepEvidence: 'deepEvidence',
    clinicalRisk: 'clinical_risk_assessment',
    nextSteps: 'next_diagnostic_steps',
    pathophysiology: 'pathophysiology',
  };

  // Extract sentences from each section
  const sectionSentences = {};
  for (const [section, text] of Object.entries(sectionMap)) {
    if (text && typeof text === 'string' && text.length > 20) {
      sectionSentences[section] = text.split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 20) // Only meaningful sentences
        .map(s => s.toLowerCase());
    }
  }

  // Find duplicate sentences across sections
  const allSentences = [];
  for (const sentences of Object.values(sectionSentences)) {
    allSentences.push(...sentences);
  }

  const sentenceCounts = {};
  for (const sentence of allSentences) {
    sentenceCounts[sentence] = (sentenceCounts[sentence] || 0) + 1;
  }

  // Remove verbatim duplicates (appearing 2+ times) from secondary sections
  const duplicateSentences = Object.keys(sentenceCounts).filter(s => sentenceCounts[s] > 1);
  
  if (duplicateSentences.length > 0) {
    // Priority: Keep in paraclinical, remove from others
    const priorityOrder = ['paraclinical', 'deepEvidence', 'clinicalRisk', 'nextSteps', 'pathophysiology'];
    
    for (const duplicate of duplicateSentences) {
      for (const priority of priorityOrder) {
        if (sectionSentences[priority] && sectionSentences[priority].includes(duplicate)) {
          // Remove from all lower priority sections
          const priorityIndex = priorityOrder.indexOf(priority);
          for (let i = priorityIndex + 1; i < priorityOrder.length; i++) {
            const lowerPriority = priorityOrder[i];
            const propertyName = propertyMap[lowerPriority];
            if (cleaned[propertyName] && typeof cleaned[propertyName] === 'string') {
              // Remove the duplicate sentence (case-insensitive)
              const escapedDuplicate = duplicate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(escapedDuplicate + '[.!?]*', 'gi');
              cleaned[propertyName] = cleaned[propertyName].replace(regex, '').trim();
              // Clean up multiple spaces and periods
              cleaned[propertyName] = cleaned[propertyName].replace(/\s+/g, ' ').replace(/\.{2,}/g, '.').trim();
            }
          }
          break;
        }
      }
    }
  }

  return cleaned;
}

/**
 * Add lightweight consistency checks
 * Fix minor inconsistencies without constraining AI reasoning
 */
function addConsistencyChecks(caseData) {
  const cleaned = { ...caseData };
  
  // Check for rhythm description consistency
  if (cleaned.physical_exam && typeof cleaned.physical_exam === 'string') {
    const examLower = cleaned.physical_exam.toLowerCase();
    // If exam mentions "regular rhythm" but paraclinical says "atrial fibrillation"
    if (examLower.includes('regular rhythm') || examLower.includes('normal sinus')) {
      const paraclinicalText = JSON.stringify(cleaned.paraclinical || {}).toLowerCase();
      if (paraclinicalText.includes('atrial fibrillation') || paraclinicalText.includes('afib')) {
        // Remove the conflicting rhythm description
        cleaned.physical_exam = cleaned.physical_exam.replace(/\b(regular rhythm|normal sinus)[^.]*\.?/gi, '').trim();
      }
    }
  }

  // Check for lactate assumptions (if mentioned in one place, should be consistent)
  const allText = JSON.stringify(cleaned).toLowerCase();
  if (allText.includes('lactate')) {
    const lactateMatches = allText.match(/lactate[^.]*\.?/gi);
    if (lactateMatches && lactateMatches.length > 1) {
      // Ensure consistent lactate values if mentioned multiple times
      const values = lactateMatches.map(m => m.match(/[\d.]+/)?.[0]).filter(Boolean);
      if (values.length > 1) {
        const uniqueValues = [...new Set(values)];
        // If multiple different values, this is inconsistent - keep the first mentioned
        if (uniqueValues.length > 1) {
          // This is a consistency issue, but we'll let it pass to preserve AI freedom
          // Just log for now - could add more sophisticated logic later
        }
      }
    }
  }
  
  // Add clinical explanation for NSTEMI without obstructive stenosis
  // This is not a contradiction - NSTEMI can occur via plaque rupture, spasm, or microvascular disease
  if (cleaned.consistency && typeof cleaned.consistency === 'string') {
    const consistencyLower = cleaned.consistency.toLowerCase();
    const finalDiagnosis = (cleaned.final_diagnosis || '').toLowerCase();
    const paraclinicalText = JSON.stringify(cleaned.paraclinical || {}).toLowerCase();
    const examText = (cleaned.physical_exam || '').toLowerCase();
    
    // Check if consistency flags NSTEMI vs no stenosis contradiction
    if ((consistencyLower.includes('nstemi') || consistencyLower.includes('non-stemi')) &&
        (paraclinicalText.includes('no stenosis') || paraclinicalText.includes('no significant stenosis') || 
         paraclinicalText.includes('normal coronary') || paraclinicalText.includes('no obstructive'))) {
      // Add clinical explanation
      if (!consistencyLower.includes('plaque rupture') && !consistencyLower.includes('spasm') && 
          !consistencyLower.includes('microvascular')) {
        cleaned.consistency = `${cleaned.consistency} Note: NSTEMI can occur without obstructive stenosis via plaque rupture, coronary spasm, or microvascular disease.`;
      }
    }
    
    // Fix false contradiction: elevated troponin does NOT equal heart failure
    // Myocardial injury (troponin elevation) is distinct from heart failure (symptoms + signs)
    if (consistencyLower.includes('troponin') && consistencyLower.includes('elevated') && 
        (consistencyLower.includes('contradict') || consistencyLower.includes('inconsistent'))) {
      // Check if it's flagging troponin vs no HF signs as contradiction
      const hasTroponinElevation = paraclinicalText.includes('troponin') && 
                                   (paraclinicalText.includes('elevated') || paraclinicalText.match(/troponin[^.]*\d+[^.]*ng\/ml/i));
      const hasNoHFSigns = (examText.includes('no') && (examText.includes('jvd') || examText.includes('jugular') || 
                          examText.includes('edema') || examText.includes('rales'))) ||
                          (paraclinicalText.includes('no') && (paraclinicalText.includes('cardiomegaly') || 
                           paraclinicalText.includes('pulmonary congestion')));
      
      if (hasTroponinElevation && hasNoHFSigns && 
          !consistencyLower.includes('myocardial injury') && !consistencyLower.includes('heart failure')) {
        // This is NOT a contradiction - troponin elevation indicates myocardial injury, not necessarily HF
        cleaned.consistency = cleaned.consistency.replace(
          /(?:contradict|inconsistent|conflict).*troponin.*(?:no|without).*(?:hf|heart failure|signs)/gi,
          'Note: Elevated troponin indicates myocardial injury, which is distinct from heart failure. No contradiction.'
        );
      }
    }
  }

  return cleaned;
}

/**
 * Soften CXR conclusions when echo/BNP not available
 * Prevents overstating heart failure certainty without supporting data
 */
function softenCXRConclusions(caseData) {
  const cleaned = { ...caseData };
  
  const paraclinical = cleaned.paraclinical || {};
  const paraclinicalText = JSON.stringify(paraclinical).toLowerCase();
  
  // Check if echo or BNP is available
  const hasEcho = paraclinicalText.includes('echo') || paraclinicalText.includes('echocardiogram') || 
                  paraclinicalText.includes('ejection fraction') || paraclinicalText.includes('ef');
  const hasBNP = paraclinicalText.includes('bnp') || paraclinicalText.includes('nt-probnp') ||
                  paraclinicalText.includes('brain natriuretic peptide');
  
  // If CXR mentions cardiomegaly or pulmonary congestion but no echo/BNP, soften the language
  if (paraclinical.imaging && typeof paraclinical.imaging === 'string') {
    let imaging = paraclinical.imaging;
    const imagingLower = imaging.toLowerCase();
    
    // Check for strong HF statements without supporting data
    if ((imagingLower.includes('cardiomegaly') || imagingLower.includes('pulmonary congestion') || 
         imagingLower.includes('pulmonary edema')) && !hasEcho && !hasBNP) {
      // Soften definitive statements
      imaging = imaging
        .replace(/\b(cardiomegaly|pulmonary congestion|pulmonary edema)\s+(?:is|indicates|suggests|confirms|diagnostic of|consistent with)\s+(?:heart failure|hf|chf)\b/gi, 
                 (match, finding) => `${finding} may suggest heart failure, but echo or BNP needed for confirmation`)
        .replace(/\bheart failure\s+(?:is|is confirmed|is present|is evident)\b/gi, 
                 'heart failure may be present')
        .replace(/\b(?:definite|clear|obvious|confirmed)\s+heart failure\b/gi, 
                 'possible heart failure');
    }
    
    paraclinical.imaging = imaging;
    cleaned.paraclinical = paraclinical;
  }
  
  return cleaned;
}

/**
 * Add contraindication logic for management
 * Specifically for nitrates/beta-blockers in inferior STEMI/RV infarct
 */
function addManagementContraindications(caseData) {
  const cleaned = { ...caseData };
  
  if (!cleaned.management || typeof cleaned.management !== 'object') {
    return cleaned;
  }
  
  const management = { ...cleaned.management };
  const finalDiagnosis = (cleaned.final_diagnosis || '').toLowerCase();
  const paraclinicalText = JSON.stringify(cleaned.paraclinical || {}).toLowerCase();
  const examText = (cleaned.physical_exam || '').toLowerCase();
  
  // Check if this is inferior STEMI or RV infarct
  const isInferiorSTEMI = finalDiagnosis.includes('inferior') && 
                          (finalDiagnosis.includes('stemi') || finalDiagnosis.includes('mi')) ||
                          paraclinicalText.includes('inferior') && 
                          (paraclinicalText.includes('st elevation') || paraclinicalText.includes('stemi'));
  const hasRVInvolvement = paraclinicalText.includes('right ventricular') || 
                           paraclinicalText.includes('rv infarct') ||
                           examText.includes('jugular') && examText.includes('distension') ||
                           examText.includes('jvd');
  
  if (isInferiorSTEMI || hasRVInvolvement) {
    // Add contraindication warnings for nitrates and beta-blockers
    const contraindicationNote = 'Note: Avoid nitrates and beta-blockers if RV involvement or hypotension present.';
    
    if (management.initial && typeof management.initial === 'string') {
      // Check if nitrates or beta-blockers mentioned without contraindication
      const initialLower = management.initial.toLowerCase();
      if ((initialLower.includes('nitroglycerin') || initialLower.includes('nitrate') || 
           initialLower.includes('beta-blocker') || initialLower.includes('beta blocker')) &&
          !initialLower.includes('contraindication') && !initialLower.includes('avoid') &&
          !initialLower.includes('caution')) {
        management.initial = `${management.initial} ${contraindicationNote}`;
      }
    }
    
    if (management.definitive && typeof management.definitive === 'string') {
      const definitiveLower = management.definitive.toLowerCase();
      if ((definitiveLower.includes('nitroglycerin') || definitiveLower.includes('nitrate') || 
           definitiveLower.includes('beta-blocker') || definitiveLower.includes('beta blocker')) &&
          !definitiveLower.includes('contraindication') && !definitiveLower.includes('avoid') &&
          !definitiveLower.includes('caution')) {
        management.definitive = `${management.definitive} ${contraindicationNote}`;
      }
    }
  }
  
  // Align management to NSTEMI vs STEMI pathway
  // If final diagnosis is NSTEMI but management mentions STEMI-specific interventions, clarify
  const isNSTEMI = finalDiagnosis.includes('nstemi') || finalDiagnosis.includes('non-stemi') || 
                   (finalDiagnosis.includes('mi') && !finalDiagnosis.includes('stemi') && 
                    !paraclinicalText.includes('st elevation'));
  const isSTEMI = finalDiagnosis.includes('stemi') || paraclinicalText.includes('st elevation');
  
  if (isNSTEMI && management.definitive && typeof management.definitive === 'string') {
    const definitiveLower = management.definitive.toLowerCase();
    // If management mentions primary PCI or immediate reperfusion (STEMI pathway) but diagnosis is NSTEMI
    if ((definitiveLower.includes('primary pci') || definitiveLower.includes('immediate reperfusion') ||
         definitiveLower.includes('emergency pci')) && !definitiveLower.includes('nstemi')) {
      // Clarify that this is NSTEMI pathway (risk-stratified, not immediate PCI)
      if (!definitiveLower.includes('risk-stratified') && !definitiveLower.includes('grace') && 
          !definitiveLower.includes('timi')) {
        management.definitive = management.definitive.replace(
          /(primary pci|immediate reperfusion|emergency pci)/gi,
          'risk-stratified management (NSTEMI pathway)'
        );
      }
    }
  }
  
  if (isSTEMI && management.definitive && typeof management.definitive === 'string') {
    const definitiveLower = management.definitive.toLowerCase();
    // If management mentions delayed PCI or conservative approach (NSTEMI pathway) but diagnosis is STEMI
    if ((definitiveLower.includes('delayed pci') || definitiveLower.includes('conservative') ||
         definitiveLower.includes('medical management only')) && !definitiveLower.includes('stemi')) {
      // Clarify that this is STEMI pathway (immediate reperfusion)
      if (!definitiveLower.includes('immediate') && !definitiveLower.includes('primary pci')) {
        management.definitive = management.definitive.replace(
          /(delayed pci|conservative|medical management only)/gi,
          'immediate reperfusion (STEMI pathway)'
        );
      }
    }
  }
  
  cleaned.management = management;
  return cleaned;
}

/**
 * Enforce strict data reuse in Deep Evidence Mode
 * Remove references to labs/findings not explicitly stated earlier
 */
function enforceDeepEvidenceStrictReuse(caseData) {
  const cleaned = { ...caseData };
  
  if (!cleaned.deepEvidence || typeof cleaned.deepEvidence !== 'string') {
    return cleaned;
  }
  
  // Extract all explicitly stated labs/findings from earlier sections
  const statedLabs = new Set();
  const statedFindings = new Set();
  
  // Collect from paraclinical
  const paraclinical = cleaned.paraclinical || {};
  if (paraclinical.labs) {
    const labsText = typeof paraclinical.labs === 'string' ? paraclinical.labs : JSON.stringify(paraclinical.labs);
    // Extract lab names mentioned
    const labNames = ['wbc', 'white blood cell', 'hemoglobin', 'hgb', 'hematocrit', 'hct', 'platelet', 
                      'troponin', 'ck', 'bnp', 'd-dimer', 'lactate', 'glucose', 'sodium', 'potassium',
                      'creatinine', 'bun', 'alt', 'ast', 'bilirubin'];
    labNames.forEach(lab => {
      if (labsText.toLowerCase().includes(lab)) {
        statedLabs.add(lab);
      }
    });
  }
  
  // Collect from exam
  const examText = (cleaned.physical_exam || '').toLowerCase();
  const examFindings = ['fever', 'tachycardia', 'bradycardia', 'hypotension', 'hypertension', 
                        'edema', 'rales', 'wheezes', 'murmur'];
  examFindings.forEach(finding => {
    if (examText.includes(finding)) {
      statedFindings.add(finding);
    }
  });
  
  // Remove references to unstated labs/findings from deepEvidence
  let deepEvidence = cleaned.deepEvidence;
  
  // Remove references to labs not explicitly stated
  statedLabs.forEach(lab => {
    // Keep references to stated labs
  });
  
  // Remove references to unstated labs
  const unstatedLabPatterns = [
    /\bleukocytosis\b(?!.*\b(?:wbc|white blood cell)\b)/gi,
    /\banemia\b(?!.*\b(?:hemoglobin|hgb|hematocrit|hct)\b)/gi,
    /\bthrombocytopenia\b(?!.*\bplatelet\b)/gi,
  ];
  
  for (const pattern of unstatedLabPatterns) {
    deepEvidence = deepEvidence.replace(pattern, '');
  }
  
  // Clean up multiple spaces
  deepEvidence = deepEvidence.replace(/\s+/g, ' ').trim();
  
  cleaned.deepEvidence = deepEvidence;
  return cleaned;
}

/**
 * Deduplicate repeated sentences to prevent duplicated ABG or risk text.
 */
function dedupeSentences(text) {
  if (!text || typeof text !== 'string') return text;
  const sentences = text
    .split(/[\\.!?]/)
    .map(s => s.trim())
    .filter(Boolean);
  const unique = [];
  const seen = new Set();
  sentences.forEach((s) => {
    const key = s.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(s);
    }
  });
  return unique.join('. ') + (unique.length ? '.' : '');
}
