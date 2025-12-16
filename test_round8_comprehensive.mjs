// Round 8 Comprehensive Test Suite
const API_BASE = 'https://medplat-backend-139218747785.europe-west1.run.app';

const testCases = [
  // Light specialty cases
  { topic: "Severe eczema flare", category: "Dermatology", region: "EU/DK", language: "en", expectedLightNuance: true, expectedLMIC: false },
  { topic: "Iron deficiency anemia", category: "Hematology", region: "EU/DK", language: "en", expectedLightNuance: true, expectedLMIC: false },
  { topic: "Mild depression", category: "Psychiatry", region: "EU/DK", language: "en", expectedLightNuance: true, expectedLMIC: false },
  
  // Stroke LMIC cases
  { topic: "Acute stroke", category: "Neurology", region: "LMIC", language: "sw", expectedStrokeLMIC: true, expectedLMIC: true },
  
  // Multi-domain LMIC cases
  { topic: "Ectopic pregnancy with infection", category: "OB/GYN", region: "LMIC", language: "ha", expectedMultiDomainLMIC: true, expectedLMIC: true },
  { topic: "ARDS with sepsis", category: "ICU", region: "LMIC", language: "hi", expectedMultiDomainLMIC: true, expectedLMIC: true },
  { topic: "Stroke with diabetes", category: "Neurology", region: "LMIC", language: "ur", expectedMultiDomainLMIC: true, expectedLMIC: true },
  
  // Trauma LMIC
  { topic: "Traumatic brain injury", category: "Trauma", region: "LMIC", language: "bn", expectedLMIC: true },
];

async function testRound8Comprehensive() {
  console.log('\n🧪 ROUND 8 COMPREHENSIVE TEST SUITE\n');
  console.log(`Testing ${testCases.length} cases...\n`);
  
  const results = [];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n[${i + 1}/${testCases.length}] Testing: ${testCase.topic} (${testCase.category})`);
    console.log(`Region: ${testCase.region}, Language: ${testCase.language}`);
    
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
        light_specialty_nuance: testCase.expectedLightNuance ? 
          (caseData.meta?.dermatology_light_nuance || caseData.meta?.hematology_light_nuance || 
           caseData.meta?.psychiatry_light_nuance || caseData.meta?.endocrine_light_nuance || 
           caseData.meta?.nephrology_light_nuance) : true,
        lmic_multi_domain_override: testCase.expectedMultiDomainLMIC ? 
          (caseData.meta?.lmic_enforcement_applied === true && 
           caseData.guidelines?.primary_locked === "international") : true,
        stroke_lmic_guideline: testCase.expectedStrokeLMIC ? 
          (caseData.meta?.stroke_lmic_adaptation && 
           caseData.guidelines?.primary_locked === "international" &&
           caseData.guidelines?.international?.some(g => g.toLowerCase().includes("who"))) : true,
        lmic_priority_enforced: testCase.expectedLMIC ? 
          (caseData.meta?.lmic_mode === true && 
           caseData.meta?.lmic_enforcement_applied === true) : true,
        mentor_graph_enriched: caseData.meta?.mentor_knowledge_graph && 
          (caseData.meta.mentor_knowledge_graph.domain_teaching_pearls ||
           caseData.meta.mentor_knowledge_graph.pitfall_explanations?.length >= 4 ||
           caseData.meta.mentor_knowledge_graph.lmic_comparisons?.length >= 2),
        reasoning_no_redundancy: Array.isArray(caseData.reasoning_chain) && 
          caseData.reasoning_chain.length >= 10 &&
          !hasRedundantSteps(caseData.reasoning_chain),
        reasoning_ge_10: Array.isArray(caseData.reasoning_chain) && caseData.reasoning_chain.length >= 10,
        no_undefined_fields: !hasUndefinedFields(caseData)
      };
      
      const allValidations = Object.values(validations);
      const passed = allValidations.filter(v => v).length;
      const total = allValidations.length;
      const success = passed >= total * 0.9; // 90% pass threshold
      
      console.log(`\nValidation Results:`);
      console.log(`  - Light specialty nuance: ${validations.light_specialty_nuance ? '✅' : '❌'}`);
      console.log(`  - LMIC multi-domain override: ${validations.lmic_multi_domain_override ? '✅' : '❌'}`);
      console.log(`  - Stroke LMIC guideline: ${validations.stroke_lmic_guideline ? '✅' : '❌'}`);
      console.log(`  - LMIC priority enforced: ${validations.lmic_priority_enforced ? '✅' : '❌'}`);
      console.log(`  - Mentor graph enriched: ${validations.mentor_graph_enriched ? '✅' : '❌'}`);
      console.log(`  - Reasoning no redundancy: ${validations.reasoning_no_redundancy ? '✅' : '❌'}`);
      console.log(`  - Reasoning ≥10 steps: ${validations.reasoning_ge_10 ? '✅' : '❌'} (${caseData.reasoning_chain?.length || 0})`);
      console.log(`  - No undefined fields: ${validations.no_undefined_fields ? '✅' : '❌'}`);
      
      console.log(`\n${success ? '✅ PASSED' : '❌ FAILED'}: ${passed}/${total} validations passed`);
      console.log(`Generation time: ${duration}s`);
      
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
  console.log('📊 ROUND 8 COMPREHENSIVE TEST SUMMARY');
  console.log(`${'='.repeat(80)}\n`);
  
  const passed = results.filter(r => r.success).length;
  const failed = results.length - passed;
  const successRate = ((passed / results.length) * 100).toFixed(1);
  
  console.log(`Total test cases: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success rate: ${successRate}%`);
  
  // Feature-specific summary
  const lightNuanceCases = results.filter(r => r.testCase.expectedLightNuance);
  const lightNuancePassed = lightNuanceCases.filter(r => r.validations?.light_specialty_nuance).length;
  console.log(`\nLight Specialty Nuance: ${lightNuancePassed}/${lightNuanceCases.length} cases have nuance (${((lightNuancePassed / lightNuanceCases.length) * 100).toFixed(1)}%)`);
  
  const lmicCases = results.filter(r => r.testCase.expectedLMIC);
  const lmicPassed = lmicCases.filter(r => r.validations?.lmic_priority_enforced).length;
  console.log(`LMIC Priority Enforcement: ${lmicPassed}/${lmicCases.length} cases enforced (${((lmicPassed / lmicCases.length) * 100).toFixed(1)}%)`);
  
  const multiDomainLMIC = results.filter(r => r.testCase.expectedMultiDomainLMIC);
  const multiDomainPassed = multiDomainLMIC.filter(r => r.validations?.lmic_multi_domain_override).length;
  console.log(`Multi-Domain LMIC Override: ${multiDomainPassed}/${multiDomainLMIC.length} cases passed (${((multiDomainPassed / multiDomainLMIC.length) * 100).toFixed(1)}%)`);
  
  const strokeLMIC = results.filter(r => r.testCase.expectedStrokeLMIC);
  const strokePassed = strokeLMIC.filter(r => r.validations?.stroke_lmic_guideline).length;
  console.log(`Stroke LMIC Guidelines: ${strokePassed}/${strokeLMIC.length} cases corrected (${((strokePassed / strokeLMIC.length) * 100).toFixed(1)}%)`);
  
  const mentorEnriched = results.filter(r => r.validations?.mentor_graph_enriched).length;
  console.log(`Mentor Graph Enriched: ${mentorEnriched}/${results.length} cases (${((mentorEnriched / results.length) * 100).toFixed(1)}%)`);
  
  const noRedundancy = results.filter(r => r.validations?.reasoning_no_redundancy).length;
  console.log(`Reasoning No Redundancy: ${noRedundancy}/${results.length} cases (${((noRedundancy / results.length) * 100).toFixed(1)}%)`);
  
  if (failed > 0) {
    console.log(`\n❌ FAILED TEST CASES:`);
    results.forEach((r, i) => {
      if (!r.success) {
        console.log(`\n${i + 1}. ${r.testCase.topic} (${r.testCase.category}):`);
        if (r.error) {
          console.log(`   Error: ${r.error}`);
        } else {
          console.log(`   Validations passed: ${r.passed}/${r.total}`);
        }
      }
    });
  }
  
  console.log(`\n${'='.repeat(80)}\n`);
  
  return { passed, failed, total: results.length, successRate, results };
}

function hasRedundantSteps(reasoningChain) {
  if (!Array.isArray(reasoningChain) || reasoningChain.length < 2) return false;
  
  const seen = new Set();
  for (const step of reasoningChain) {
    const key = step.toLowerCase().substring(0, 50); // First 50 chars
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
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
testRound8Comprehensive().catch(console.error);

