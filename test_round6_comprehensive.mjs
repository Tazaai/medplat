// Round 6 Comprehensive Test Suite - 16 specialties
const API_BASE = 'https://medplat-backend-139218747785.europe-west1.run.app';

const testCases = [
  { topic: "Acute myocardial infarction", category: "Cardiology", region: "EU/DK", language: "en", expectedHighAcuity: true, expectedLMIC: false },
  { topic: "Pediatric asthma exacerbation", category: "Pediatrics", region: "EU/DK", language: "en", expectedHighAcuity: true, expectedLMIC: false },
  { topic: "Opioid overdose", category: "Toxicology", region: "EU/DK", language: "en", expectedHighAcuity: true, expectedLMIC: false },
  { topic: "Acute stroke", category: "Neurology", region: "LMIC", language: "sw", expectedHighAcuity: true, expectedLMIC: true },
  { topic: "Ectopic pregnancy", category: "OB/GYN", region: "LMIC", language: "ha", expectedHighAcuity: true, expectedLMIC: true },
  { topic: "Sepsis with DKA", category: "Infectious Disease", region: "EU/DK", language: "en", expectedHighAcuity: true, expectedLMIC: false },
  { topic: "Type 1 diabetes with DKA", category: "Endocrinology", region: "EU/DK", language: "en", expectedHighAcuity: true, expectedLMIC: false },
  { topic: "Traumatic brain injury", category: "Trauma", region: "EU/DK", language: "en", expectedHighAcuity: true, expectedLMIC: false },
  { topic: "Acute respiratory distress", category: "ICU", region: "LMIC", language: "hi", expectedHighAcuity: true, expectedLMIC: true },
  { topic: "Acute psychosis", category: "Psychiatry", region: "EU/DK", language: "en", expectedHighAcuity: false, expectedLMIC: false },
  { topic: "Acute kidney injury", category: "Renal", region: "EU/DK", language: "en", expectedHighAcuity: true, expectedLMIC: false },
  { topic: "Acute pancreatitis", category: "Gastroenterology", region: "EU/DK", language: "en", expectedHighAcuity: true, expectedLMIC: false },
  { topic: "Severe eczema flare", category: "Dermatology", region: "EU/DK", language: "en", expectedHighAcuity: false, expectedLMIC: false },
  { topic: "Acute leukemia presentation", category: "Hematology", region: "EU/DK", language: "en", expectedHighAcuity: true, expectedLMIC: false },
  { topic: "Nephrotic syndrome", category: "Nephrology", region: "EU/DK", language: "en", expectedHighAcuity: false, expectedLMIC: false },
  { topic: "Bipolar disorder with mania", category: "Psychiatry", region: "EU/DK", language: "en", expectedHighAcuity: true, expectedLMIC: false },
];

async function testRound6Comprehensive() {
  console.log('\n🧪 ROUND 6 COMPREHENSIVE TEST SUITE\n');
  console.log(`Testing ${testCases.length} specialties...\n`);
  
  const results = [];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n[${i + 1}/${testCases.length}] Testing: ${testCase.topic} (${testCase.category})`);
    console.log(`Region: ${testCase.region}, Language: ${testCase.language}`);
    console.log(`Expected High-Acuity: ${testCase.expectedHighAcuity}, Expected LMIC: ${testCase.expectedLMIC}`);
    
    try {
      const startTime = Date.now();
      
      const response = await fetch(`${API_BASE}/api/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: testCase.topic,
          category: testCase.category,
          language: testCase.language,
          region: testCase.region,
          level: 'intermediate',
          model: 'gpt-4o-mini',
        }),
      });
      
      const data = await response.json();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      if (!data.ok || data.error) {
        console.log(`❌ Generation failed: ${data.error || data.message}`);
        results.push({ testCase, success: false, error: data.error || data.message });
        continue;
      }
      
      const caseData = data.case;
      
      // Validation checks
      const validations = {
        consistency_engine: {
          reasoning_chain_ge_10: Array.isArray(caseData.reasoning_chain) && caseData.reasoning_chain.length >= 10,
          mentor_graph_complete: caseData.meta?.mentor_knowledge_graph && 
            caseData.meta.mentor_knowledge_graph.reasoning_tree?.length > 0 &&
            caseData.meta.mentor_knowledge_graph.algorithm_nodes?.length > 0 &&
            caseData.meta.mentor_knowledge_graph.guideline_nodes?.length > 0,
          guidelines_non_empty: caseData.guidelines && (
            (Array.isArray(caseData.guidelines.local) && caseData.guidelines.local.length > 0) ||
            (Array.isArray(caseData.guidelines.national) && caseData.guidelines.national.length > 0) ||
            (Array.isArray(caseData.guidelines.continental) && caseData.guidelines.continental.length > 0) ||
            (Array.isArray(caseData.guidelines.usa) && caseData.guidelines.usa.length > 0) ||
            (Array.isArray(caseData.guidelines.international) && caseData.guidelines.international.length > 0)
          ),
          high_acuity_when_required: testCase.expectedHighAcuity ? 
            (caseData.meta?.high_acuity && caseData.meta.high_acuity.is_high_acuity === true) : true,
          differentials_ge_6: Array.isArray(caseData.differential_diagnoses) && caseData.differential_diagnoses.length >= 6,
          complications_ge_4: caseData.management?.complications && (
            (Array.isArray(caseData.management.complications.immediate) ? caseData.management.complications.immediate.length : 0) +
            (Array.isArray(caseData.management.complications.early) ? caseData.management.complications.early.length : 0) +
            (Array.isArray(caseData.management.complications.late) ? caseData.management.complications.late.length : 0)
          ) >= 4,
          pathophysiology_ge_2_layers: caseData.pathophysiology_detail && (
            (caseData.pathophysiology_detail.cellular_molecular && caseData.pathophysiology_detail.cellular_molecular.trim() !== '') +
            (caseData.pathophysiology_detail.organ_microanatomy && caseData.pathophysiology_detail.organ_microanatomy.trim() !== '') +
            (caseData.pathophysiology_detail.mechanistic_links && caseData.pathophysiology_detail.mechanistic_links.trim() !== '') +
            (caseData.pathophysiology_detail.compensatory_pathways && caseData.pathophysiology_detail.compensatory_pathways.trim() !== '')
          ) >= 2
        },
        lmic_priority: testCase.expectedLMIC ? caseData.meta?.lmic_mode === true : true,
        specialty_nuance: testCase.expectedHighAcuity ? 
          (caseData.meta?.neurology_nuance || caseData.meta?.obgyn_nuance || caseData.meta?.toxicology_nuance || 
           caseData.meta?.trauma_nuance || caseData.meta?.infectious_nuance || caseData.meta?.respiratory_nuance || 
           caseData.meta?.cardiology_nuance) : true,
        guideline_smart_lock: caseData.guidelines?.primary_locked || 
          (caseData.guidelines && Object.keys(caseData.guidelines).some(k => Array.isArray(caseData.guidelines[k]) && caseData.guidelines[k].length > 0)),
        no_undefined_fields: !hasUndefinedFields(caseData),
        mentor_graph_cross_linked: caseData.meta?.mentor_knowledge_graph?.cross_links || 
          caseData.meta?.mentor_knowledge_graph?.ask_mentor_explanations
      };
      
      const consistencyChecks = Object.values(validations.consistency_engine);
      const consistencyPassed = consistencyChecks.filter(v => v).length;
      const consistencyTotal = consistencyChecks.length;
      
      const allValidations = [
        consistencyPassed >= 8, // At least 8/9 consistency checks
        validations.lmic_priority,
        validations.specialty_nuance,
        validations.guideline_smart_lock,
        validations.no_undefined_fields,
        validations.mentor_graph_cross_linked
      ];
      
      const passed = allValidations.filter(v => v).length;
      const total = allValidations.length;
      const success = passed >= 5; // 5/6 or 6/6 = pass
      
      console.log(`\nValidation Results:`);
      console.log(`  - Consistency Engine:`);
      console.log(`    * Reasoning chain ≥10: ${validations.consistency_engine.reasoning_chain_ge_10 ? '✅' : '❌'} (${caseData.reasoning_chain?.length || 0})`);
      console.log(`    * Mentor graph complete: ${validations.consistency_engine.mentor_graph_complete ? '✅' : '❌'}`);
      console.log(`    * Guidelines non-empty: ${validations.consistency_engine.guidelines_non_empty ? '✅' : '❌'}`);
      console.log(`    * High-acuity when required: ${validations.consistency_engine.high_acuity_when_required ? '✅' : '❌'}`);
      console.log(`    * Differentials ≥6: ${validations.consistency_engine.differentials_ge_6 ? '✅' : '❌'} (${caseData.differential_diagnoses?.length || 0})`);
      console.log(`    * Complications ≥4: ${validations.consistency_engine.complications_ge_4 ? '✅' : '❌'}`);
      console.log(`    * Pathophysiology ≥2 layers: ${validations.consistency_engine.pathophysiology_ge_2_layers ? '✅' : '❌'}`);
      console.log(`  - LMIC priority: ${validations.lmic_priority ? '✅' : '❌'}`);
      console.log(`  - Specialty nuance: ${validations.specialty_nuance ? '✅' : '❌'}`);
      console.log(`  - Guideline smart-lock: ${validations.guideline_smart_lock ? '✅' : '❌'}`);
      console.log(`  - No undefined fields: ${validations.no_undefined_fields ? '✅' : '❌'}`);
      console.log(`  - Mentor graph cross-linked: ${validations.mentor_graph_cross_linked ? '✅' : '❌'}`);
      
      console.log(`\n${success ? '✅ PASSED' : '❌ FAILED'}: ${passed}/${total} validations passed, Consistency: ${consistencyPassed}/${consistencyTotal}`);
      console.log(`Generation time: ${duration}s`);
      
      results.push({
        testCase,
        success,
        validations,
        passed,
        total,
        consistencyPassed,
        consistencyTotal,
        duration
      });
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      results.push({ testCase, success: false, error: error.message });
    }
  }
  
  // Summary
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('📊 ROUND 6 COMPREHENSIVE TEST SUMMARY');
  console.log(`${'='.repeat(80)}\n`);
  
  const passed = results.filter(r => r.success).length;
  const failed = results.length - passed;
  const successRate = ((passed / results.length) * 100).toFixed(1);
  
  console.log(`Total test cases: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success rate: ${successRate}%`);
  
  // Consistency engine summary
  const avgConsistency = results.filter(r => r.consistencyPassed !== undefined)
    .reduce((sum, r) => sum + (r.consistencyPassed / r.consistencyTotal), 0) / results.length * 100;
  console.log(`\nConsistency Engine: Average ${avgConsistency.toFixed(1)}% checks passed`);
  
  // LMIC summary
  const lmicCases = results.filter(r => r.testCase.expectedLMIC);
  const lmicPassed = lmicCases.filter(r => r.success).length;
  console.log(`LMIC Cases: ${lmicCases.length} total, ${lmicPassed} passed (${((lmicPassed / lmicCases.length) * 100).toFixed(1)}%)`);
  
  // Specialty nuance summary
  const highAcuityCases = results.filter(r => r.testCase.expectedHighAcuity);
  const nuancePresent = highAcuityCases.filter(r => r.validations?.specialty_nuance).length;
  console.log(`Specialty Nuance: ${nuancePresent}/${highAcuityCases.length} high-acuity cases have nuance (${((nuancePresent / highAcuityCases.length) * 100).toFixed(1)}%)`);
  
  if (failed > 0) {
    console.log(`\n❌ FAILED TEST CASES:`);
    results.forEach((r, i) => {
      if (!r.success) {
        console.log(`\n${i + 1}. ${r.testCase.topic} (${r.testCase.category}):`);
        if (r.error) {
          console.log(`   Error: ${r.error}`);
        } else {
          console.log(`   Validations passed: ${r.passed}/${r.total}`);
          console.log(`   Consistency checks: ${r.consistencyPassed}/${r.consistencyTotal}`);
        }
      }
    });
  }
  
  // Weak domains analysis
  const weakDomains = {};
  results.forEach(r => {
    if (!r.success && r.testCase.category) {
      weakDomains[r.testCase.category] = (weakDomains[r.testCase.category] || 0) + 1;
    }
  });
  
  if (Object.keys(weakDomains).length > 0) {
    console.log(`\n⚠️  WEAK DOMAINS (need improvement):`);
    Object.keys(weakDomains).forEach(domain => {
      console.log(`  - ${domain}: ${weakDomains[domain]} failed case(s)`);
    });
  }
  
  console.log(`\n${'='.repeat(80)}\n`);
  
  return { passed, failed, total: results.length, successRate, results, weakDomains };
}

function hasUndefinedFields(obj, path = '') {
  if (obj === null || obj === undefined) return true;
  if (typeof obj !== 'object') return false;
  if (Array.isArray(obj)) {
    return obj.some((item, idx) => hasUndefinedFields(item, `${path}[${idx}]`));
  }
  return Object.keys(obj).some(key => {
    const value = obj[key];
    if (value === undefined) {
      return true;
    }
    return hasUndefinedFields(value, path ? `${path}.${key}` : key);
  });
}

// Run tests
testRound6Comprehensive().catch(console.error);

