// Multi-Specialty Case Generation Validation Test
// Tests via API endpoint (uses deployed backend with API keys)

const API_BASE = 'https://medplat-backend-139218747785.europe-west1.run.app';

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

function validateField(caseData, path, value) {
  const errors = [];
  
  if (value === undefined) {
    errors.push(`❌ Missing field: ${path}`);
    return errors;
  }
  
  if (Array.isArray(value)) {
    const nonStringItems = value.filter(item => typeof item !== 'string');
    if (nonStringItems.length > 0) {
      errors.push(`❌ Array contains non-string items in ${path}: ${JSON.stringify(nonStringItems.slice(0, 2))}`);
    }
    const objectStrings = value.filter(item => String(item).includes('[object Object]'));
    if (objectStrings.length > 0) {
      errors.push(`❌ Array contains [object Object] in ${path}`);
    }
  }
  
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
  
  if (caseData.error || !caseData.ok) {
    errors.push(`❌ Generation failed: ${caseData.message || caseData.fallback || 'Unknown error'}`);
    return { errors, warnings, caseData: null };
  }
  
  // Extract case from response
  const actualCase = caseData.case || caseData;
  
  // Validate required top-level fields
  for (const field of requiredFields) {
    const value = actualCase[field];
    errors.push(...validateField(actualCase, field, value));
    
    if (value === undefined) {
      errors.push(`❌ Missing required field: ${field}`);
    }
  }
  
  // Validate nested structures
  if (actualCase.meta) {
    const metaFields = ['topic', 'category', 'disease_subtype', 'severity_grade', 'temporal_phase', 'primary_diagnosis', 'secondary_diagnoses'];
    for (const field of metaFields) {
      if (actualCase.meta[field] === undefined) {
        errors.push(`❌ Missing meta.${field}`);
      }
    }
  }
  
  if (actualCase.management) {
    if (!actualCase.management.pharmacology) {
      errors.push(`❌ Missing management.pharmacology`);
    } else {
      const pharmFields = ['key_drugs', 'mechanisms_of_action', 'dosing_adjustments', 'contraindicated_medications', 'stepwise_escalation', 'drug_disease_interactions'];
      for (const field of pharmFields) {
        if (actualCase.management.pharmacology[field] === undefined) {
          errors.push(`❌ Missing management.pharmacology.${field}`);
        }
      }
    }
    
    if (!actualCase.management.complications) {
      errors.push(`❌ Missing management.complications`);
    } else {
      ['immediate', 'early', 'late'].forEach(phase => {
        if (!Array.isArray(actualCase.management.complications[phase])) {
          errors.push(`❌ management.complications.${phase} is not an array`);
        }
      });
    }
  }
  
  if (actualCase.paraclinical?.diagnostic_evidence) {
    const diagFields = ['sensitivity', 'specificity', 'ppv', 'npv', 'likelihood_ratios', 'diagnostic_traps', 'imaging_misses'];
    for (const field of diagFields) {
      if (actualCase.paraclinical.diagnostic_evidence[field] === undefined) {
        warnings.push(`⚠️ Missing paraclinical.diagnostic_evidence.${field} (may be empty if not applicable)`);
      }
    }
  }
  
  // Check for contradictions
  if (actualCase.history && actualCase.final_diagnosis) {
    const historyLower = actualCase.history.toLowerCase();
    const diagnosisLower = actualCase.final_diagnosis.toLowerCase();
    
    if (historyLower.includes('appendectomy') && diagnosisLower.includes('appendicitis') && !diagnosisLower.includes('stump')) {
      errors.push(`❌ CONTRADICTION: History mentions appendectomy but diagnosis is appendicitis`);
    }
    
    if (historyLower.includes('cholecystectomy') && diagnosisLower.includes('cholecystitis')) {
      errors.push(`❌ CONTRADICTION: History mentions cholecystectomy but diagnosis is cholecystitis`);
    }
  }
  
  // Check temporal phase
  if (actualCase.meta?.temporal_phase) {
    const phase = actualCase.meta.temporal_phase.toLowerCase();
    if (!['early', 'middle', 'late'].some(p => phase.includes(p))) {
      warnings.push(`⚠️ Temporal phase "${actualCase.meta.temporal_phase}" may not be standard`);
    }
  }
  
  // Check severity grade
  if (actualCase.meta?.severity_grade === '') {
    warnings.push(`⚠️ Severity grade is empty`);
  }
  
  // Check pathophysiology depth
  if (actualCase.pathophysiology_detail) {
    const detailFields = Object.keys(actualCase.pathophysiology_detail);
    const emptyFields = detailFields.filter(f => !actualCase.pathophysiology_detail[f] || actualCase.pathophysiology_detail[f] === '');
    if (emptyFields.length === detailFields.length) {
      warnings.push(`⚠️ All pathophysiology_detail fields are empty`);
    }
  }
  
  // Check guideline cascade
  if (actualCase.guidelines) {
    const hasAnyGuidelines = ['local', 'national', 'continental', 'usa', 'international'].some(
      tier => Array.isArray(actualCase.guidelines[tier]) && actualCase.guidelines[tier].length > 0
    );
    if (!hasAnyGuidelines) {
      warnings.push(`⚠️ No guidelines populated in any tier`);
    }
  }
  
  // Check reasoning chain
  if (!Array.isArray(actualCase.reasoning_chain) || actualCase.reasoning_chain.length === 0) {
    warnings.push(`⚠️ Reasoning chain is empty or not an array`);
  }
  
  return { errors, warnings, caseData: actualCase };
}

async function runTests() {
  console.log('\n🧪 MULTI-SPECIALTY CASE GENERATION VALIDATION TEST\n');
  console.log(`Testing ${testCases.length} specialties via API...\n`);
  
  const results = [];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n[${i + 1}/${testCases.length}] Generating: ${testCase.topic}...`);
    
    try {
      const startTime = Date.now();
      const response = await fetch(`${API_BASE}/api/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: testCase.topic,
          category: testCase.category,
          language: 'en',
          region: 'EU/DK',
          level: 'intermediate',
          model: 'gpt-4o-mini',
        }),
      });
      
      const caseData = await response.json();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      const validation = validateCase(caseData, testCase);
      validation.duration = duration;
      validation.testCase = testCase;
      results.push(validation);
      
      // Print raw JSON (first 1500 chars)
      if (validation.caseData) {
        const jsonStr = JSON.stringify(validation.caseData, null, 2);
        console.log(`\n📄 Raw JSON (first 1500 chars):`);
        console.log(jsonStr.substring(0, 1500) + (jsonStr.length > 1500 ? '\n... (truncated)' : ''));
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

