// Multi-Specialty Case Generation Validation Test
// Tests the universal enhancements across 10 different specialties

import { generateClinicalCase } from './generate_case_clinical.mjs';

const testCases = [
  { topic: "Chest pain", category: "Cardiology" },
  { topic: "COPD exacerbation", category: "Pulmonology" },
  { topic: "Acute appendicitis", category: "Acute Medicine" },
  { topic: "Diabetic ketoacidosis", category: "Endocrinology" },
  { topic: "UTI with sepsis", category: "Infectious Diseases" },
  { topic: "Stroke", category: "Neurology" },
  { topic: "Lower GI bleeding", category: "Gastroenterology" },
  { topic: "Kidney stone", category: "Urology" },
  { topic: "Pediatric asthma", category: "Pediatrics" },
  { topic: "Post-op fever", category: "Surgery" },
];

const requiredFields = [
  'meta',
  'history',
  'physical_exam',
  'paraclinical',
  'differential_diagnoses',
  'final_diagnosis',
  'management',
  'red_flags',
  'key_points',
  'pathophysiology',
  'pathophysiology_detail',
  'reasoning_chain',
  'counterfactuals',
  'crucial_concepts',
  'common_pitfalls',
  'exam_notes',
  'exam_pearls',
  'guidelines',
  'clinical_risk_assessment',
  'next_diagnostic_steps',
];

const requiredNestedFields = {
  meta: ['topic', 'category', 'disease_subtype', 'severity_grade', 'temporal_phase', 'primary_diagnosis', 'secondary_diagnoses'],
  management: ['initial', 'definitive', 'pharmacology', 'complications', 'treatment_thresholds'],
  'management.pharmacology': ['key_drugs', 'mechanisms_of_action', 'dosing_adjustments', 'contraindicated_medications', 'stepwise_escalation', 'drug_disease_interactions'],
  'management.complications': ['immediate', 'early', 'late'],
  paraclinical: ['labs', 'imaging', 'diagnostic_evidence'],
  'paraclinical.diagnostic_evidence': ['sensitivity', 'specificity', 'ppv', 'npv', 'likelihood_ratios', 'diagnostic_traps', 'imaging_misses'],
  guidelines: ['local', 'national', 'continental', 'usa', 'international', 'versions', 'lmic_alternatives', 'antibiotic_resistance_logic'],
  red_flag_hierarchy: ['critical', 'important', 'rare_dangerous'],
  pathophysiology_detail: ['cellular_molecular', 'organ_microanatomy', 'mechanistic_links', 'compensatory_pathways', 'text_diagrams'],
};

function validateField(caseData, path, value) {
  const errors = [];
  
  // Check if field exists
  if (value === undefined) {
    errors.push(`❌ Missing field: ${path}`);
    return errors;
  }
  
  // Check array types
  if (Array.isArray(value)) {
    const nonStringItems = value.filter(item => typeof item !== 'string');
    if (nonStringItems.length > 0) {
      errors.push(`❌ Array contains non-string items in ${path}: ${JSON.stringify(nonStringItems.slice(0, 2))}`);
    }
    // Check for [object Object]
    const objectStrings = value.filter(item => String(item).includes('[object Object]'));
    if (objectStrings.length > 0) {
      errors.push(`❌ Array contains [object Object] in ${path}`);
    }
  }
  
  // Check for [object Object] in strings
  if (typeof value === 'string' && value.includes('[object Object]')) {
    errors.push(`❌ String contains [object Object] in ${path}`);
  }
  
  return errors;
}

function validateCase(caseData, testCase) {
  const errors = [];
  const warnings = [];
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${testCase.topic} (${testCase.category})`);
  console.log(`${'='.repeat(80)}\n`);
  
  // Check for error field
  if (caseData.error) {
    errors.push(`❌ Generation failed: ${caseData.message || caseData.fallback}`);
    return { errors, warnings, caseData: null };
  }
  
  // Validate required top-level fields
  for (const field of requiredFields) {
    const value = caseData[field];
    errors.push(...validateField(caseData, field, value));
    
    if (value === undefined) {
      errors.push(`❌ Missing required field: ${field}`);
    }
  }
  
  // Validate nested structures
  if (caseData.meta) {
    for (const field of requiredNestedFields.meta) {
      if (caseData.meta[field] === undefined) {
        errors.push(`❌ Missing meta.${field}`);
      }
    }
  }
  
  if (caseData.management) {
    for (const field of requiredNestedFields.management) {
      if (caseData.management[field] === undefined) {
        errors.push(`❌ Missing management.${field}`);
      }
    }
    
    if (caseData.management.pharmacology) {
      for (const field of requiredNestedFields['management.pharmacology']) {
        if (caseData.management.pharmacology[field] === undefined) {
          errors.push(`❌ Missing management.pharmacology.${field}`);
        }
      }
    }
    
    if (caseData.management.complications) {
      for (const field of requiredNestedFields['management.complications']) {
        if (!Array.isArray(caseData.management.complications[field])) {
          errors.push(`❌ management.complications.${field} is not an array`);
        }
      }
    }
  }
  
  if (caseData.paraclinical) {
    for (const field of requiredNestedFields.paraclinical) {
      if (caseData.paraclinical[field] === undefined) {
        errors.push(`❌ Missing paraclinical.${field}`);
      }
    }
    
    if (caseData.paraclinical.diagnostic_evidence) {
      for (const field of requiredNestedFields['paraclinical.diagnostic_evidence']) {
        if (caseData.paraclinical.diagnostic_evidence[field] === undefined) {
          warnings.push(`⚠️ Missing paraclinical.diagnostic_evidence.${field} (may be empty if not applicable)`);
        }
      }
    }
  }
  
  if (caseData.guidelines) {
    for (const field of requiredNestedFields.guidelines) {
      if (caseData.guidelines[field] === undefined) {
        errors.push(`❌ Missing guidelines.${field}`);
      }
    }
  }
  
  // Check for contradictions
  if (caseData.history && caseData.final_diagnosis) {
    const historyLower = caseData.history.toLowerCase();
    const diagnosisLower = caseData.final_diagnosis.toLowerCase();
    
    // Check for appendectomy + appendicitis
    if (historyLower.includes('appendectomy') && diagnosisLower.includes('appendicitis') && !diagnosisLower.includes('stump')) {
      errors.push(`❌ CONTRADICTION: History mentions appendectomy but diagnosis is appendicitis (should be stump appendicitis if relevant)`);
    }
    
    // Check for cholecystectomy + cholecystitis
    if (historyLower.includes('cholecystectomy') && diagnosisLower.includes('cholecystitis')) {
      errors.push(`❌ CONTRADICTION: History mentions cholecystectomy but diagnosis is cholecystitis`);
    }
  }
  
  // Check temporal phase consistency
  if (caseData.meta?.temporal_phase) {
    const phase = caseData.meta.temporal_phase.toLowerCase();
    if (!['early', 'middle', 'late'].some(p => phase.includes(p))) {
      warnings.push(`⚠️ Temporal phase "${caseData.meta.temporal_phase}" may not be standard (expected: early/middle/late)`);
    }
  }
  
  // Check severity grade
  if (caseData.meta?.severity_grade) {
    if (caseData.meta.severity_grade === '') {
      warnings.push(`⚠️ Severity grade is empty (should be populated for most cases)`);
    }
  }
  
  // Check pathophysiology depth
  if (caseData.pathophysiology_detail) {
    const detailFields = Object.keys(caseData.pathophysiology_detail);
    const emptyFields = detailFields.filter(f => !caseData.pathophysiology_detail[f] || caseData.pathophysiology_detail[f] === '');
    if (emptyFields.length === detailFields.length) {
      warnings.push(`⚠️ All pathophysiology_detail fields are empty`);
    }
  }
  
  // Check guideline cascade
  if (caseData.guidelines) {
    const hasAnyGuidelines = ['local', 'national', 'continental', 'usa', 'international'].some(
      tier => Array.isArray(caseData.guidelines[tier]) && caseData.guidelines[tier].length > 0
    );
    if (!hasAnyGuidelines) {
      warnings.push(`⚠️ No guidelines populated in any tier`);
    }
  }
  
  // Check reasoning chain
  if (!Array.isArray(caseData.reasoning_chain) || caseData.reasoning_chain.length === 0) {
    warnings.push(`⚠️ Reasoning chain is empty or not an array`);
  }
  
  // Check pharmacology structure
  if (caseData.management?.pharmacology) {
    if (!Array.isArray(caseData.management.pharmacology.key_drugs)) {
      errors.push(`❌ management.pharmacology.key_drugs is not an array`);
    }
  }
  
  return { errors, warnings, caseData };
}

async function runTests() {
  console.log('\n🧪 MULTI-SPECIALTY CASE GENERATION VALIDATION TEST\n');
  console.log(`Testing ${testCases.length} specialties with universal enhancements...\n`);
  
  const results = [];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n[${i + 1}/${testCases.length}] Generating: ${testCase.topic}...`);
    
    try {
      const startTime = Date.now();
      const caseData = await generateClinicalCase({
        topic: testCase.topic,
        category: testCase.category,
        model: 'gpt-4o-mini',
        lang: 'en',
        region: 'EU/DK',
        mcq_mode: false,
      });
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      const validation = validateCase(caseData, testCase);
      validation.duration = duration;
      validation.testCase = testCase;
      results.push(validation);
      
      // Print raw JSON (first 2000 chars to avoid overwhelming output)
      if (validation.caseData) {
        const jsonStr = JSON.stringify(validation.caseData, null, 2);
        console.log(`\n📄 Raw JSON (first 2000 chars):`);
        console.log(jsonStr.substring(0, 2000) + (jsonStr.length > 2000 ? '\n... (truncated)' : ''));
      }
      
      // Print errors and warnings
      if (validation.errors.length > 0) {
        console.log(`\n❌ ERRORS (${validation.errors.length}):`);
        validation.errors.forEach(err => console.log(`  ${err}`));
      }
      
      if (validation.warnings.length > 0) {
        console.log(`\n⚠️ WARNINGS (${validation.warnings.length}):`);
        validation.warnings.forEach(warn => console.log(`  ${warn}`));
      }
      
      if (validation.errors.length === 0 && validation.warnings.length === 0) {
        console.log(`\n✅ PASSED: All validations passed`);
      }
      
      console.log(`\n⏱️ Generation time: ${duration}s`);
      
    } catch (error) {
      console.error(`\n❌ FAILED: ${error.message}`);
      results.push({
        testCase,
        errors: [`Generation exception: ${error.message}`],
        warnings: [],
        caseData: null,
        duration: 0,
      });
    }
  }
  
  // Summary
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('📊 VALIDATION SUMMARY');
  console.log(`${'='.repeat(80)}\n`);
  
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
  const passed = results.filter(r => r.errors.length === 0).length;
  const failed = results.length - passed;
  
  console.log(`Total test cases: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Total errors: ${totalErrors}`);
  console.log(`Total warnings: ${totalWarnings}`);
  
  if (totalErrors > 0) {
    console.log(`\n❌ ERRORS BY TEST CASE:`);
    results.forEach((r, i) => {
      if (r.errors.length > 0) {
        console.log(`\n${i + 1}. ${r.testCase.topic} (${r.testCase.category}):`);
        r.errors.forEach(err => console.log(`   ${err}`));
      }
    });
  }
  
  if (totalWarnings > 0) {
    console.log(`\n⚠️ WARNINGS BY TEST CASE:`);
    results.forEach((r, i) => {
      if (r.warnings.length > 0) {
        console.log(`\n${i + 1}. ${r.testCase.topic} (${r.testCase.category}):`);
        r.warnings.forEach(warn => console.log(`   ${warn}`));
      }
    });
  }
  
  console.log(`\n${'='.repeat(80)}\n`);
  
  return results;
}

// Run tests
runTests().catch(console.error);

