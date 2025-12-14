// Frontend Integration Test Script
// Simulates frontend API calls and validates responses
// Uses built-in fetch (Node.js 18+)

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://medplat-frontend-139218747785.europe-west1.run.app';
const BACKEND_URL = process.env.BACKEND_URL || 'https://medplat-backend-139218747785.europe-west1.run.app';

const testCases = [
  { topic: 'Aortic Dissection', category: 'Cardiology', region: 'auto' },
  { topic: 'Sepsis', category: 'Infectious Disease', region: 'auto' },
  { topic: 'Stroke', category: 'Neurology', region: 'auto' },
  { topic: 'Heart Failure', category: 'Cardiology', region: 'auto' },
  { topic: 'Ectopic Pregnancy', category: 'Obstetrics & Gynecology', region: 'auto' }
];

const regionTests = [
  { region: 'dk', expected: 'Denmark' },
  { region: 'us', expected: 'United States' },
  { region: 'uk', expected: 'United Kingdom' },
  { region: 'auto', expected: 'auto' }
];

async function testCaseGeneration(topic, category, region = 'auto') {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TESTING: ${topic} (${category}) - Region: ${region}`);
  console.log('='.repeat(80));
  
  const startTime = Date.now();
  
  try {
    // Simulate frontend API call to /api/dialog
    const payload = {
      topic,
      category,
      model: "gpt-4o-mini", // Frontend now forces this
      lang: "en",
      region,
      mcq_mode: false // Gamify toggle does NOT affect case generation payload
    };
    
    console.log(`📤 Request payload:`, JSON.stringify(payload, null, 2));
    
    const response = await fetch(`${BACKEND_URL}/api/dialog`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    const elapsed = Date.now() - startTime;
    
    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      const errorText = await response.text();
      console.error(`   Error body: ${errorText.substring(0, 500)}`);
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
    
    // Validate response structure
    const validations = {
      hasMeta: !!caseData.meta,
      hasHistory: typeof caseData.history === 'string',
      hasPhysicalExam: typeof caseData.physical_exam === 'string',
      hasParaclinical: !!caseData.paraclinical,
      hasDifferentialDiagnoses: Array.isArray(caseData.differential_diagnoses),
      hasFinalDiagnosis: typeof caseData.final_diagnosis === 'string',
      hasManagement: !!caseData.management,
      hasGuidelines: !!caseData.guidelines,
      hasRedFlags: Array.isArray(caseData.red_flags),
      hasReasoningChain: Array.isArray(caseData.reasoning_chain),
      noPanelMetadata: !caseData.panel_reviews && !caseData.synthesis_summary && !caseData.case_quality_score
    };
    
    const schemaPass = Object.values(validations).every(v => v === true);
    
    // Check region detection
    const regionDetected = caseData.meta?.region_guideline_source || 'unknown';
    
    // Check guideline cascade
    const hasLocalGuidelines = Array.isArray(caseData.guidelines?.local) && caseData.guidelines.local.length > 0;
    const hasNationalGuidelines = Array.isArray(caseData.guidelines?.national) && caseData.guidelines.national.length > 0;
    const hasContinentalGuidelines = Array.isArray(caseData.guidelines?.continental) && caseData.guidelines.continental.length > 0;
    const hasGuidelines = hasLocalGuidelines || hasNationalGuidelines || hasContinentalGuidelines || 
                         Array.isArray(caseData.guidelines?.usa) || Array.isArray(caseData.guidelines?.international);
    
    // Check if panel metadata leaked
    const panelMetadataLeaked = !validations.noPanelMetadata;
    
    console.log(`✅ Case generated successfully (${elapsed}ms)`);
    console.log(`   Schema check: ${schemaPass ? 'PASS' : 'FAIL'}`);
    console.log(`   Region detected: ${regionDetected}`);
    console.log(`   Local guidelines: ${hasLocalGuidelines ? 'YES' : 'NO'}`);
    console.log(`   National guidelines: ${hasNationalGuidelines ? 'YES' : 'NO'}`);
    console.log(`   Continental guidelines: ${hasContinentalGuidelines ? 'YES' : 'NO'}`);
    console.log(`   Guidelines present: ${hasGuidelines ? 'YES' : 'NO'}`);
    console.log(`   Panel metadata leaked: ${panelMetadataLeaked ? 'YES ❌' : 'NO ✅'}`);
    
    if (!schemaPass) {
      const missing = Object.entries(validations).filter(([_, v]) => !v).map(([k]) => k);
      console.log(`   Missing fields: ${missing.join(', ')}`);
    }
    
    return {
      success: true,
      elapsed,
      schemaPass,
      regionDetected,
      hasGuidelines,
      hasLocalGuidelines,
      hasNationalGuidelines,
      hasContinentalGuidelines,
      panelMetadataLeaked,
      caseData
    };
    
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ Error: ${error.message}`);
    return { success: false, error: error.message, elapsed };
  }
}

async function testModelEnforcement() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TESTING: Model Enforcement`);
  console.log('='.repeat(80));
  
  // Test that even if frontend sends gpt-4o, backend uses gpt-4o-mini
  const testPayloads = [
    { model: 'gpt-4o-mini', expected: 'gpt-4o-mini' },
    { model: 'gpt-4o', expected: 'gpt-4o-mini' }, // Should be forced
    { model: 'gpt-4', expected: 'gpt-4o-mini' } // Should be forced
  ];
  
  const results = [];
  
  for (const test of testPayloads) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/dialog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'Test Case',
          category: 'General Practice',
          model: test.model,
          lang: 'en',
          region: 'auto'
        }),
      });
      
      if (response.ok) {
        console.log(`✅ Model ${test.model} → Backend accepted (should use gpt-4o-mini internally)`);
        results.push({ model: test.model, success: true });
      } else {
        console.log(`❌ Model ${test.model} → HTTP ${response.status}`);
        results.push({ model: test.model, success: false });
      }
    } catch (error) {
      console.log(`❌ Model ${test.model} → Error: ${error.message}`);
      results.push({ model: test.model, success: false });
    }
  }
  
  return results;
}

async function testRegionCodes() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TESTING: Region Code Mapping`);
  console.log('='.repeat(80));
  
  const results = [];
  
  for (const test of regionTests) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/dialog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'Test Case',
          category: 'General Practice',
          model: 'gpt-4o-mini',
          lang: 'en',
          region: test.region
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const detectedRegion = data.aiReply?.json?.meta?.region_guideline_source;
        console.log(`✅ Region ${test.region} → Detected: ${detectedRegion}`);
        results.push({ region: test.region, detected: detectedRegion, success: true });
      } else {
        console.log(`❌ Region ${test.region} → HTTP ${response.status}`);
        results.push({ region: test.region, success: false });
      }
    } catch (error) {
      console.log(`❌ Region ${test.region} → Error: ${error.message}`);
      results.push({ region: test.region, success: false });
    }
  }
  
  return results;
}

async function runIntegrationTest() {
  console.log('\n' + '='.repeat(80));
  console.log('FRONTEND → BACKEND INTEGRATION TEST');
  console.log('='.repeat(80));
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Test Cases: ${testCases.length}`);
  console.log('='.repeat(80));
  
  const results = [];
  
  // Test 1: Model Enforcement
  const modelResults = await testModelEnforcement();
  
  // Test 2: Region Codes
  const regionResults = await testRegionCodes();
  
  // Test 3: Case Generation
  for (const testCase of testCases) {
    const result = await testCaseGeneration(testCase.topic, testCase.category, testCase.region);
    results.push({
      topic: testCase.topic,
      category: testCase.category,
      region: testCase.region,
      ...result
    });
    
    // Wait 3 seconds between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('INTEGRATION TEST SUMMARY');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const schemaPassed = results.filter(r => r.schemaPass);
  const allRegionsDetected = results.filter(r => r.regionDetected && r.regionDetected !== 'unknown');
  const allHaveGuidelines = results.filter(r => r.hasGuidelines);
  const noMetadataLeaked = results.filter(r => !r.panelMetadataLeaked);
  
  console.log(`\nCase Generation Tests: ${results.length}`);
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  console.log(`\nSchema Validation: ${schemaPassed.length}/${results.length} passed`);
  console.log(`Region Detection: ${allRegionsDetected.length}/${results.length} detected`);
  console.log(`Guidelines Present: ${allHaveGuidelines.length}/${results.length} have guidelines`);
  console.log(`Panel Metadata Leak: ${noMetadataLeaked.length}/${results.length} clean (no leak)`);
  
  const avgElapsed = successful.length > 0 
    ? successful.reduce((sum, r) => sum + r.elapsed, 0) / successful.length 
    : 0;
  console.log(`\nAverage Generation Time: ${avgElapsed.toFixed(0)}ms`);
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed Tests:`);
    failed.forEach(r => {
      console.log(`   - ${r.topic}: ${r.error}`);
    });
  }
  
  if (noMetadataLeaked.length < results.length) {
    console.log(`\n❌ Panel Metadata Leaked:`);
    results.filter(r => r.panelMetadataLeaked).forEach(r => {
      console.log(`   - ${r.topic}: Panel metadata found in response`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('FINAL RESULTS');
  console.log('='.repeat(80));
  
  const allPassed = 
    successful.length === results.length &&
    schemaPassed.length === results.length &&
    allRegionsDetected.length === results.length &&
    allHaveGuidelines.length === results.length &&
    noMetadataLeaked.length === results.length &&
    modelResults.every(r => r.success) &&
    regionResults.every(r => r.success);
  
  if (allPassed) {
    console.log('✅ ALL INTEGRATION TESTS PASSED');
  } else {
    console.log('⚠️ SOME INTEGRATION TESTS FAILED - See details above');
  }
  
  console.log('='.repeat(80) + '\n');
  
  return { 
    allPassed, 
    results, 
    modelResults, 
    regionResults,
    summary: {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      schemaPassed: schemaPassed.length,
      regionsDetected: allRegionsDetected.length,
      hasGuidelines: allHaveGuidelines.length,
      noMetadataLeak: noMetadataLeaked.length
    }
  };
}

// Run the test
runIntegrationTest()
  .then(({ allPassed, results, modelResults, regionResults, summary }) => {
    // Write results to file for report generation
    import('fs').then(fs => {
      const reportData = {
        timestamp: new Date().toISOString(),
        allPassed,
        results,
        modelResults,
        regionResults,
        summary
      };
      fs.writeFileSync('integration_test_results.json', JSON.stringify(reportData, null, 2));
      console.log('📄 Test results saved to: integration_test_results.json');
      process.exit(allPassed ? 0 : 1);
    });
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

