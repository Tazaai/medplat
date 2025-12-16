// Round 4 Comprehensive Test Suite - 12 specialties
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
];

async function testRound4Comprehensive() {
  console.log('\n🧪 ROUND 4 COMPREHENSIVE TEST SUITE\n');
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
        meta_exists: caseData.meta && typeof caseData.meta === 'object',
        round2_fields: {
          domain_interactions: Array.isArray(caseData.meta?.domain_interactions),
          probabilistic_reasoning: caseData.meta?.probabilistic_reasoning && typeof caseData.meta.probabilistic_reasoning === 'object',
          mentor_graph: caseData.meta?.mentor_knowledge_graph && typeof caseData.meta.mentor_knowledge_graph === 'object',
          lmic_mode: typeof caseData.meta?.lmic_mode === 'boolean'
        },
        reasoning_chain_length: Array.isArray(caseData.reasoning_chain) && caseData.reasoning_chain.length > 8,
        mentor_graph_complete: caseData.meta?.mentor_knowledge_graph && 
          caseData.meta.mentor_knowledge_graph.reasoning_tree?.length > 0 &&
          caseData.meta.mentor_knowledge_graph.algorithm_nodes?.length > 0,
        guideline_cascade_stabilized: caseData.guidelines && (
          (Array.isArray(caseData.guidelines.local) && caseData.guidelines.local.length > 0) ||
          (Array.isArray(caseData.guidelines.national) && caseData.guidelines.national.length > 0) ||
          (Array.isArray(caseData.guidelines.continental) && caseData.guidelines.continental.length > 0) ||
          (Array.isArray(caseData.guidelines.usa) && caseData.guidelines.usa.length > 0) ||
          (Array.isArray(caseData.guidelines.international) && caseData.guidelines.international.length > 0)
        ),
        lmic_function_correct: testCase.expectedLMIC ? caseData.meta?.lmic_mode === true : true,
        no_undefined_fields: !hasUndefinedFields(caseData),
        high_acuity_data: testCase.expectedHighAcuity ? 
          (caseData.meta?.high_acuity && caseData.meta.high_acuity.is_high_acuity === true) : true
      };
      
      const round2FieldsPresent = Object.values(validations.round2_fields).filter(v => v).length;
      const allValidations = [
        validations.meta_exists,
        round2FieldsPresent >= 3,
        validations.reasoning_chain_length,
        validations.mentor_graph_complete,
        validations.guideline_cascade_stabilized,
        validations.lmic_function_correct,
        validations.no_undefined_fields,
        validations.high_acuity_data
      ];
      
      const passed = allValidations.filter(v => v).length;
      const total = allValidations.length;
      const success = passed >= 7; // 7/8 or 8/8 = pass (allow 1 minor issue)
      
      console.log(`\nValidation Results:`);
      console.log(`  - Meta exists: ${validations.meta_exists ? '✅' : '❌'}`);
      console.log(`  - Round 2 fields (${round2FieldsPresent}/4): ${round2FieldsPresent >= 3 ? '✅' : '❌'}`);
      console.log(`  - Reasoning chain length > 8: ${validations.reasoning_chain_length ? '✅' : '❌'} (${caseData.reasoning_chain?.length || 0})`);
      console.log(`  - Mentor graph complete: ${validations.mentor_graph_complete ? '✅' : '❌'}`);
      console.log(`  - Guideline cascade stabilized: ${validations.guideline_cascade_stabilized ? '✅' : '❌'}`);
      console.log(`  - LMIC function correct: ${validations.lmic_function_correct ? '✅' : '❌'} (${caseData.meta?.lmic_mode})`);
      console.log(`  - No undefined fields: ${validations.no_undefined_fields ? '✅' : '❌'}`);
      console.log(`  - High-acuity data: ${validations.high_acuity_data ? '✅' : '❌'}`);
      
      console.log(`\n${success ? '✅ PASSED' : '❌ FAILED'}: ${passed}/${total} validations passed`);
      console.log(`Generation time: ${duration}s`);
      
      if (testCase.expectedHighAcuity && caseData.meta?.high_acuity) {
        console.log(`\n🔍 High-Acuity Details:`);
        console.log(`  - Is high-acuity: ${caseData.meta.high_acuity.is_high_acuity}`);
        console.log(`  - First threat: ${caseData.meta.high_acuity.first_threat?.substring(0, 60)}...`);
        console.log(`  - Time-critical steps: ${caseData.meta.high_acuity.time_critical_steps?.length || 0}`);
      }
      
      if (testCase.expectedLMIC) {
        console.log(`\n🔍 LMIC Case Details:`);
        console.log(`  - LMIC mode: ${caseData.meta?.lmic_mode}`);
        console.log(`  - LMIC adaptations: ${caseData.meta?.lmic_adaptations ? 'Present' : 'Missing'}`);
      }
      
      results.push({
        testCase,
        success,
        validations,
        passed,
        total,
        duration
      });
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      results.push({ testCase, success: false, error: error.message });
    }
  }
  
  // Summary
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('📊 ROUND 4 COMPREHENSIVE TEST SUMMARY');
  console.log(`${'='.repeat(80)}\n`);
  
  const passed = results.filter(r => r.success).length;
  const failed = results.length - passed;
  const successRate = ((passed / results.length) * 100).toFixed(1);
  
  console.log(`Total test cases: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success rate: ${successRate}%`);
  
  // High-acuity summary
  const highAcuityCases = results.filter(r => r.testCase.expectedHighAcuity);
  const highAcuityPassed = highAcuityCases.filter(r => r.success).length;
  console.log(`\nHigh-Acuity Cases: ${highAcuityCases.length} total, ${highAcuityPassed} passed (${((highAcuityPassed / highAcuityCases.length) * 100).toFixed(1)}%)`);
  
  // LMIC summary
  const lmicCases = results.filter(r => r.testCase.expectedLMIC);
  const lmicPassed = lmicCases.filter(r => r.success).length;
  console.log(`LMIC Cases: ${lmicCases.length} total, ${lmicPassed} passed (${((lmicPassed / lmicCases.length) * 100).toFixed(1)}%)`);
  
  if (failed > 0) {
    console.log(`\n❌ FAILED TEST CASES:`);
    results.forEach((r, i) => {
      if (!r.success) {
        console.log(`\n${i + 1}. ${r.testCase.topic} (${r.testCase.category}):`);
        if (r.error) {
          console.log(`   Error: ${r.error}`);
        } else {
          console.log(`   Validations passed: ${r.passed}/${r.total}`);
          if (!r.validations.meta_exists) console.log(`   ❌ Meta missing`);
          if (Object.values(r.validations.round2_fields).filter(v => v).length < 3) console.log(`   ❌ Round 2 fields incomplete`);
          if (!r.validations.reasoning_chain_length) console.log(`   ❌ Reasoning chain too short`);
          if (!r.validations.mentor_graph_complete) console.log(`   ❌ Mentor graph incomplete`);
          if (!r.validations.guideline_cascade_stabilized) console.log(`   ❌ Guideline cascade empty`);
          if (!r.validations.lmic_function_correct && r.testCase.expectedLMIC) console.log(`   ❌ LMIC fallback not triggered`);
          if (!r.validations.high_acuity_data && r.testCase.expectedHighAcuity) console.log(`   ❌ High-acuity data missing`);
        }
      }
    });
  }
  
  console.log(`\n${'='.repeat(80)}\n`);
  
  return { passed, failed, total: results.length, successRate, results };
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
testRound4Comprehensive().catch(console.error);

