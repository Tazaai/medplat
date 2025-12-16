// Test Round 2 Engines via API
const API_BASE = 'https://medplat-backend-139218747785.europe-west1.run.app';

const testCases = [
  { topic: "Acute myocardial infarction", category: "Cardiology", expectedEngines: ["domain_interactions", "guideline_synthesis", "probabilistic_reasoning"] },
  { topic: "DKA with sepsis", category: "Endocrinology", expectedEngines: ["domain_interactions", "system_pathophysiology"] },
  { topic: "Pediatric asthma exacerbation", category: "Pediatrics", expectedEngines: ["system_pathophysiology", "guideline_synthesis"] },
  { topic: "Opioid overdose with agitation", category: "Toxicology", expectedEngines: ["domain_interactions", "probabilistic_reasoning"] },
  { topic: "Acute stroke", category: "Neurology", expectedEngines: ["probabilistic_reasoning", "guideline_synthesis"] },
  { topic: "Ectopic pregnancy", category: "OB/GYN", expectedEngines: ["domain_interactions", "guideline_synthesis"] },
  { topic: "Cardiorenal syndrome", category: "Cardiology", expectedEngines: ["domain_interactions", "system_pathophysiology"] },
  { topic: "Pneumonia with respiratory failure", category: "Pulmonology", expectedEngines: ["domain_interactions", "system_pathophysiology", "guideline_synthesis"] },
];

async function testRound2Engines() {
  console.log('\n🧪 ROUND 2 ENGINES TEST (via API)\n');
  console.log(`Testing ${testCases.length} cases...\n`);
  
  const results = [];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n[${i + 1}/${testCases.length}] Testing: ${testCase.topic} (${testCase.category})`);
    console.log(`Expected engines: ${testCase.expectedEngines.join(", ")}`);
    
    try {
      const startTime = Date.now();
      
      const response = await fetch(`${API_BASE}/api/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: testCase.topic,
          category: testCase.category,
          language: 'en',
          region: i < 4 ? 'EU/DK' : 'LMIC', // Test LMIC fallback for some cases
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
      
      // Check for Round 2 engine outputs
      const engineChecks = {
        domain_interactions: caseData.meta?.domain_interactions && caseData.meta.domain_interactions.length > 0,
        guideline_synthesis: caseData.guidelines?.synthesized_algorithm || caseData.guidelines?.severity_specific,
        probabilistic_reasoning: caseData.meta?.probabilistic_reasoning && 
          (caseData.meta.probabilistic_reasoning.pre_test_probability || 
           caseData.meta.probabilistic_reasoning.decision_tree),
        system_pathophysiology: caseData.pathophysiology_detail?.organ_crosstalk || 
          caseData.pathophysiology_detail?.feedback_loops ||
          caseData.pathophysiology_detail?.variant_specific,
        lmic_fallback: caseData.meta?.lmic_mode || caseData.guidelines?.lmic_alternatives?.length > 0,
        mentor_graph: caseData.meta?.mentor_knowledge_graph && 
          caseData.meta.mentor_knowledge_graph.reasoning_tree?.length > 0,
        cross_system_patho: caseData.pathophysiology_detail?.organ_crosstalk ||
          caseData.pathophysiology_detail?.disease_progression
      };
      
      console.log(`\nEngine Checks:`);
      Object.keys(engineChecks).forEach(engine => {
        console.log(`  - ${engine}: ${engineChecks[engine] ? '✅' : '❌'}`);
      });
      
      // Check domain interactions specifically
      if (testCase.topic.toLowerCase().includes("dka") || testCase.topic.toLowerCase().includes("sepsis")) {
        const hasInteraction = caseData.meta?.domain_interactions?.some(i => 
          i.toLowerCase().includes("infection") || i.toLowerCase().includes("endocrine")
        );
        console.log(`  - Multi-domain interaction detected: ${hasInteraction ? '✅' : '❌'}`);
        engineChecks.domain_interactions = hasInteraction;
      }
      
      // Check LMIC fallback for LMIC region cases
      if (i >= 4) {
        console.log(`  - LMIC mode active: ${engineChecks.lmic_fallback ? '✅' : '❌'}`);
      }
      
      const enginesPresent = Object.values(engineChecks).filter(v => v).length;
      const expectedEnginesPresent = testCase.expectedEngines.filter(e => 
        engineChecks[e] || engineChecks[e.replace("_", "_")] || 
        (e === "system_pathophysiology" && engineChecks.cross_system_patho)
      ).length;
      
      const success = enginesPresent >= 3 && expectedEnginesPresent >= testCase.expectedEngines.length * 0.5;
      
      console.log(`\n${success ? '✅ PASSED' : '❌ FAILED'}: Engines present: ${enginesPresent}/8, Expected: ${expectedEnginesPresent}/${testCase.expectedEngines.length}`);
      console.log(`Generation time: ${duration}s`);
      
      // Show sample outputs
      if (caseData.meta?.domain_interactions) {
        console.log(`\nSample Domain Interaction: ${caseData.meta.domain_interactions[0]?.substring(0, 80)}...`);
      }
      if (caseData.meta?.probabilistic_reasoning?.pre_test_probability) {
        console.log(`Sample Probabilistic Reasoning: ${caseData.meta.probabilistic_reasoning.pre_test_probability.substring(0, 80)}...`);
      }
      
      results.push({
        testCase,
        success,
        enginesPresent,
        expectedEnginesPresent,
        engineChecks,
        duration
      });
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      results.push({ testCase, success: false, error: error.message });
    }
  }
  
  // Summary
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('📊 ROUND 2 ENGINES TEST SUMMARY');
  console.log(`${'='.repeat(80)}\n`);
  
  const passed = results.filter(r => r.success).length;
  const failed = results.length - passed;
  
  console.log(`Total test cases: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  // Engine presence summary
  const engineSummary = {
    domain_interactions: results.filter(r => r.engineChecks?.domain_interactions).length,
    guideline_synthesis: results.filter(r => r.engineChecks?.guideline_synthesis).length,
    probabilistic_reasoning: results.filter(r => r.engineChecks?.probabilistic_reasoning).length,
    system_pathophysiology: results.filter(r => r.engineChecks?.system_pathophysiology).length,
    lmic_fallback: results.filter(r => r.engineChecks?.lmic_fallback).length,
    mentor_graph: results.filter(r => r.engineChecks?.mentor_graph).length
  };
  
  console.log(`\nEngine Presence Summary:`);
  Object.keys(engineSummary).forEach(engine => {
    console.log(`  - ${engine}: ${engineSummary[engine]}/${results.length} cases`);
  });
  
  if (failed > 0) {
    console.log(`\n❌ FAILED TEST CASES:`);
    results.forEach((r, i) => {
      if (!r.success) {
        console.log(`\n${i + 1}. ${r.testCase.topic} (${r.testCase.category}):`);
        if (r.error) {
          console.log(`   Error: ${r.error}`);
        } else {
          console.log(`   Engines present: ${r.enginesPresent}/8`);
          console.log(`   Expected engines found: ${r.expectedEnginesPresent}/${r.testCase.expectedEngines.length}`);
        }
      }
    });
  }
  
  console.log(`\n${'='.repeat(80)}\n`);
  
  return results;
}

// Run tests
testRound2Engines().catch(console.error);

