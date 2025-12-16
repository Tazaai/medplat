/**
 * End-to-end test cases for case generation pipeline
 * Tests: paraclinical, teaching, deepEvidence, risk assessment
 */

const BACKEND_URL = 'https://medplat-backend-139218747785.europe-west1.run.app';

async function testCase(testName, steps) {
  console.log(`\n=== ${testName} ===`);
  let caseId = null;
  const results = { test: testName, steps: [], passed: true };
  
  try {
    for (const step of steps) {
      const response = await fetch(`${BACKEND_URL}/api/case${step.endpoint}`, {
        method: step.method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(step.body),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        results.steps.push({ name: step.name, status: 'FAILED', error: `${response.status}: ${errorText}` });
        results.passed = false;
        console.log(`✗ ${step.name}: HTTP ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      if (step.name === 'Init' && data.caseId) {
        caseId = data.caseId;
        console.log(`✓ Case ID: ${caseId}`);
        results.steps.push({ name: step.name, status: 'PASSED', caseId });
      }
      
      // Validate step-specific checks
      if (step.validate) {
        const validation = step.validate(data);
        if (validation.pass) {
          console.log(`✓ ${step.name}: ${validation.message}`);
          results.steps.push({ name: step.name, status: 'PASSED', details: validation.message });
        } else {
          console.log(`✗ ${step.name}: ${validation.message}`);
          results.steps.push({ name: step.name, status: 'FAILED', error: validation.message });
          results.passed = false;
        }
      } else {
        console.log(`✓ ${step.name}: Completed`);
        results.steps.push({ name: step.name, status: 'PASSED' });
      }
    }
    
    return { ...results, caseId };
  } catch (error) {
    console.log(`✗ ${testName}: ERROR - ${error.message}`);
    return { ...results, passed: false, error: error.message };
  }
}

async function runE2ETests() {
  console.log('=== End-to-End Pipeline Tests ===');
  console.log(`Backend URL: ${BACKEND_URL}\n`);
  
  const allResults = [];
  
  // Test Case 1: Full case with paraclinical
  let caseId1 = null;
  try {
    const init1 = await fetch(`${BACKEND_URL}/api/case/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'Acute Myocardial Infarction', category: 'Cardiology' }),
    });
    const initData1 = await init1.json();
    caseId1 = initData1.caseId;
    console.log(`\n=== Test Case 1: Paraclinical Pipeline ===`);
    console.log(`✓ Case ID: ${caseId1}`);
    
    await fetch(`${BACKEND_URL}/api/case/history`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caseId: caseId1 }) });
    await fetch(`${BACKEND_URL}/api/case/exam`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caseId: caseId1 }) });
    
    const para1 = await fetch(`${BACKEND_URL}/api/case/paraclinical`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId: caseId1 }),
    });
    const paraData1 = await para1.json();
    const paraclinical = paraData1.data?.paraclinical;
    const hasLabs = paraclinical?.labs && (typeof paraclinical.labs === 'string' ? paraclinical.labs.trim().length > 0 : Object.keys(paraclinical.labs || {}).length > 0);
    const hasImaging = paraclinical?.imaging && (typeof paraclinical.imaging === 'string' ? paraclinical.imaging.trim().length > 0 : Object.keys(paraclinical.imaging || {}).length > 0);
    const hasDifferentials = Array.isArray(paraData1.data?.differential_diagnoses) && paraData1.data.differential_diagnoses.length > 0;
    const labsType = typeof paraclinical?.labs;
    const imagingType = typeof paraclinical?.imaging;
    console.log(`✓ Paraclinical: labs=${hasLabs ? '✓' : '✗'} (type: ${labsType}), imaging=${hasImaging ? '✓' : '✗'} (type: ${imagingType}), differentials=${hasDifferentials ? '✓' : '✗'}`);
    allResults.push({ test: 'Test 1: Paraclinical', passed: hasLabs && hasImaging && hasDifferentials, details: { labs: hasLabs, imaging: hasImaging, differentials: hasDifferentials, labsType, imagingType } });
  } catch (error) {
    console.log(`✗ Test Case 1: ERROR - ${error.message}`);
    allResults.push({ test: 'Test 1: Paraclinical', passed: false, error: error.message });
  }
  
  // Test Case 2: Teaching mode with structured output
  let caseId2 = null;
  try {
    const init2 = await fetch(`${BACKEND_URL}/api/case/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'Pneumonia', category: 'Pulmonology' }),
    });
    const initData2 = await init2.json();
    caseId2 = initData2.caseId;
    console.log(`\n=== Test Case 2: Teaching Mode ===`);
    console.log(`✓ Case ID: ${caseId2}`);
    
    await fetch(`${BACKEND_URL}/api/case/history`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caseId: caseId2 }) });
    await fetch(`${BACKEND_URL}/api/case/exam`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caseId: caseId2 }) });
    await fetch(`${BACKEND_URL}/api/case/paraclinical`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caseId: caseId2 }) });
    
    const teach2 = await fetch(`${BACKEND_URL}/api/case/expand/teaching`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId: caseId2 }),
    });
    const teachData2 = await teach2.json();
    const hasKeyConcepts = Array.isArray(teachData2.data?.key_concepts) && teachData2.data.key_concepts.length > 0;
    const hasPearls = Array.isArray(teachData2.data?.clinical_pearls) && teachData2.data.clinical_pearls.length > 0;
    const hasPitfalls = Array.isArray(teachData2.data?.common_pitfalls) && teachData2.data.common_pitfalls.length > 0;
    const hasTeachingString = typeof teachData2.data?.teaching === 'string' && teachData2.data.teaching.trim().length > 0;
    console.log(`✓ Teaching: concepts=${hasKeyConcepts ? '✓' : '✗'} (${teachData2.data?.key_concepts?.length || 0}), pearls=${hasPearls ? '✓' : '✗'} (${teachData2.data?.clinical_pearls?.length || 0}), pitfalls=${hasPitfalls ? '✓' : '✗'} (${teachData2.data?.common_pitfalls?.length || 0}), string=${hasTeachingString ? '✓' : '✗'}`);
    allResults.push({ test: 'Test 2: Teaching', passed: (hasKeyConcepts || hasPearls || hasPitfalls) || hasTeachingString, details: { key_concepts: hasKeyConcepts, clinical_pearls: hasPearls, common_pitfalls: hasPitfalls, teaching_string: hasTeachingString } });
  } catch (error) {
    console.log(`✗ Test Case 2: ERROR - ${error.message}`);
    allResults.push({ test: 'Test 2: Teaching', passed: false, error: error.message });
  }
  
  // Test Case 3: Deep Evidence and Risk Assessment
  let caseId3 = null;
  try {
    const init3 = await fetch(`${BACKEND_URL}/api/case/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'Sepsis', category: 'Emergency Medicine' }),
    });
    const initData3 = await init3.json();
    caseId3 = initData3.caseId;
    console.log(`\n=== Test Case 3: Deep Evidence & Risk ===`);
    console.log(`✓ Case ID: ${caseId3}`);
    
    await fetch(`${BACKEND_URL}/api/case/history`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caseId: caseId3 }) });
    await fetch(`${BACKEND_URL}/api/case/exam`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caseId: caseId3 }) });
    await fetch(`${BACKEND_URL}/api/case/paraclinical`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caseId: caseId3 }) });
    
    const evid3 = await fetch(`${BACKEND_URL}/api/case/expand/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId: caseId3 }),
    });
    const evidData3 = await evid3.json();
    const hasEvidence = typeof evidData3.data?.deepEvidence === 'string' && evidData3.data.deepEvidence.trim().length > 0;
    const hasRiskAssessment = typeof evidData3.data?.clinical_risk_assessment === 'string' && evidData3.data.clinical_risk_assessment.trim().length > 0;
    const riskText = evidData3.data?.clinical_risk_assessment || '';
    const abgCount = (riskText.match(/ABG/g) || []).length;
    const noDuplicates = abgCount <= 1;
    const evidenceType = typeof evidData3.data?.deepEvidence;
    console.log(`✓ Evidence: ${hasEvidence ? '✓' : '✗'} (type: ${evidenceType}), Risk: ${hasRiskAssessment ? '✓' : '✗'}, Dedup: ${noDuplicates ? '✓' : '✗'} (ABG count: ${abgCount})`);
    allResults.push({ test: 'Test 3: Deep Evidence', passed: hasEvidence && hasRiskAssessment && noDuplicates, details: { evidence: hasEvidence, risk: hasRiskAssessment, dedup: noDuplicates, evidenceType, abgCount } });
  } catch (error) {
    console.log(`✗ Test Case 3: ERROR - ${error.message}`);
    allResults.push({ test: 'Test 3: Deep Evidence', passed: false, error: error.message });
  }
  
  // Summary
  console.log('\n=== Test Summary ===');
  const passed = allResults.filter(r => r.passed).length;
  const total = allResults.length;
  console.log(`Passed: ${passed}/${total}`);
  
  allResults.forEach((result, idx) => {
    console.log(`\nTest ${idx + 1}: ${result.test}`);
    console.log(`  Status: ${result.passed ? '✓ PASSED' : '✗ FAILED'}`);
    if (result.details) {
      console.log(`  Details:`, JSON.stringify(result.details, null, 2));
    }
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
  });
  
  return { passed, total, results: allResults };
}

runE2ETests().catch(console.error);

