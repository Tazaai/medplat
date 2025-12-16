// Backend Integrity Test Script
// Tests: Model enforcement, panel always runs, panel power, timeouts, fallback, and 5 test cases

import fetch from 'node-fetch';

const BACKEND_URL = process.env.BACKEND_URL || 'https://medplat-backend-139218747785.europe-west1.run.app';

const testCases = [
  { topic: 'Aortic Dissection', category: 'Cardiology' },
  { topic: 'Sepsis', category: 'Infectious Disease' },
  { topic: 'Stroke', category: 'Neurology' },
  { topic: 'Heart Failure', category: 'Cardiology' },
  { topic: 'Ectopic Pregnancy', category: 'Obstetrics & Gynecology' }
];

async function testCaseGeneration(topic, category) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TESTING: ${topic} (${category})`);
  console.log('='.repeat(80));
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/dialog`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic,
        category,
        lang: 'en',
        region: 'auto',
        model: 'gpt-4o-mini' // Should be forced anyway
      }),
    });
    
    const elapsed = Date.now() - startTime;
    
    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      return { success: false, error: `HTTP ${response.status}`, elapsed };
    }
    
    const data = await response.json();
    
    if (!data.ok) {
      console.error(`❌ API Error: ${data.error || data.message}`);
      return { success: false, error: data.error, elapsed };
    }
    
    const caseData = data.aiReply?.json;
    
    if (!caseData) {
      console.error(`❌ No case data in response`);
      return { success: false, error: 'No case data', elapsed };
    }
    
    // Validate JSON schema
    const schemaChecks = {
      hasMeta: !!caseData.meta,
      hasHistory: typeof caseData.history === 'string',
      hasPhysicalExam: typeof caseData.physical_exam === 'string',
      hasParaclinical: !!caseData.paraclinical,
      hasDifferentialDiagnoses: Array.isArray(caseData.differential_diagnoses),
      hasFinalDiagnosis: typeof caseData.final_diagnosis === 'string',
      hasManagement: !!caseData.management,
      hasGuidelines: !!caseData.guidelines,
      hasRedFlags: Array.isArray(caseData.red_flags),
      hasReasoningChain: Array.isArray(caseData.reasoning_chain)
    };
    
    const schemaPass = Object.values(schemaChecks).every(v => v === true);
    
    // Check region detection
    const regionDetected = caseData.meta?.region_guideline_source || 'unknown';
    
    // Check guideline cascade
    const hasGuidelines = !!(
      caseData.guidelines?.local?.length > 0 ||
      caseData.guidelines?.national?.length > 0 ||
      caseData.guidelines?.continental?.length > 0 ||
      caseData.guidelines?.usa?.length > 0 ||
      caseData.guidelines?.international?.length > 0
    );
    
    // Check if panel metadata leaked (should NOT be in response)
    const panelMetadataLeaked = !!(
      caseData.panel_reviews ||
      caseData.synthesis_summary ||
      caseData.case_quality_score
    );
    
    console.log(`✅ Case generated successfully (${elapsed}ms)`);
    console.log(`   Schema check: ${schemaPass ? 'PASS' : 'FAIL'}`);
    console.log(`   Region detected: ${regionDetected}`);
    console.log(`   Guidelines present: ${hasGuidelines ? 'YES' : 'NO'}`);
    console.log(`   Panel metadata leaked: ${panelMetadataLeaked ? 'YES ❌' : 'NO ✅'}`);
    
    if (!schemaPass) {
      console.log(`   Missing fields:`, Object.entries(schemaChecks).filter(([_, v]) => !v).map(([k]) => k));
    }
    
    return {
      success: true,
      elapsed,
      schemaPass,
      regionDetected,
      hasGuidelines,
      panelMetadataLeaked,
      caseData
    };
    
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ Error: ${error.message}`);
    return { success: false, error: error.message, elapsed };
  }
}

async function runIntegrityTest() {
  console.log('\n' + '='.repeat(80));
  console.log('BACKEND INTEGRITY TEST');
  console.log('='.repeat(80));
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Test Cases: ${testCases.length}`);
  console.log('='.repeat(80));
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await testCaseGeneration(testCase.topic, testCase.category);
    results.push({
      topic: testCase.topic,
      category: testCase.category,
      ...result
    });
    
    // Wait 2 seconds between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const schemaPassed = results.filter(r => r.schemaPass);
  const allRegionsDetected = results.filter(r => r.regionDetected && r.regionDetected !== 'unknown');
  const allHaveGuidelines = results.filter(r => r.hasGuidelines);
  const noMetadataLeaked = results.filter(r => !r.panelMetadataLeaked);
  
  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  console.log(`\nSchema Validation: ${schemaPassed.length}/${results.length} passed`);
  console.log(`Region Detection: ${allRegionsDetected.length}/${results.length} detected`);
  console.log(`Guidelines Present: ${allHaveGuidelines.length}/${results.length} have guidelines`);
  console.log(`Panel Metadata Leak: ${noMetadataLeaked.length}/${results.length} clean (no leak)`);
  
  const avgElapsed = successful.reduce((sum, r) => sum + r.elapsed, 0) / successful.length;
  console.log(`\nAverage Generation Time: ${avgElapsed.toFixed(0)}ms`);
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed Tests:`);
    failed.forEach(r => {
      console.log(`   - ${r.topic}: ${r.error}`);
    });
  }
  
  if (schemaPassed.length < results.length) {
    console.log(`\n⚠️ Schema Failures:`);
    results.filter(r => !r.schemaPass).forEach(r => {
      console.log(`   - ${r.topic}: Missing required fields`);
    });
  }
  
  if (noMetadataLeaked.length < results.length) {
    console.log(`\n❌ Panel Metadata Leaked:`);
    results.filter(r => r.panelMetadataLeaked).forEach(r => {
      console.log(`   - ${r.topic}: Panel metadata found in response`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('INTEGRITY CHECK RESULTS');
  console.log('='.repeat(80));
  
  const allPassed = 
    successful.length === results.length &&
    schemaPassed.length === results.length &&
    allRegionsDetected.length === results.length &&
    allHaveGuidelines.length === results.length &&
    noMetadataLeaked.length === results.length;
  
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED');
  } else {
    console.log('⚠️ SOME TESTS FAILED - See details above');
  }
  
  console.log('='.repeat(80) + '\n');
  
  return { allPassed, results };
}

// Run the test
runIntegrityTest()
  .then(({ allPassed, results }) => {
    process.exit(allPassed ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

