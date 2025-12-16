/**
 * Automated test cases for deployed backend
 * Tests: paraclinical fields, teaching structure, deep evidence formatting, risk assessment
 */

const BACKEND_URL = 'https://medplat-backend-139218747785.europe-west1.run.app';

async function testCase(testName, steps) {
  console.log(`\n=== ${testName} ===`);
  let caseId = null;
  let errors = [];
  
  try {
    for (const step of steps) {
      const response = await fetch(`${BACKEND_URL}/api/case${step.endpoint}`, {
        method: step.method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(step.body),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        errors.push(`Step ${step.name}: ${response.status} - ${errorText}`);
        continue;
      }
      
      const data = await response.json();
      
      if (step.name === 'Init' && data.caseId) {
        caseId = data.caseId;
        console.log(`✓ Case ID: ${caseId}`);
      }
      
      // Validate step-specific checks
      if (step.validate) {
        const validation = step.validate(data);
        if (validation.pass) {
          console.log(`✓ ${step.name}: ${validation.message}`);
        } else {
          errors.push(`${step.name}: ${validation.message}`);
          console.log(`✗ ${step.name}: ${validation.message}`);
        }
      } else {
        console.log(`✓ ${step.name}: Completed`);
      }
    }
    
    if (errors.length === 0) {
      console.log(`✓ ${testName}: PASSED`);
      return { pass: true, caseId };
    } else {
      console.log(`✗ ${testName}: FAILED - ${errors.length} errors`);
      return { pass: false, caseId, errors };
    }
  } catch (error) {
    console.log(`✗ ${testName}: ERROR - ${error.message}`);
    return { pass: false, caseId, errors: [error.message] };
  }
}

async function runTests() {
  console.log('Starting automated test cases against deployed backend...');
  console.log(`Backend URL: ${BACKEND_URL}\n`);
  
  const results = [];
  
  // Test Case 1: Full case generation with paraclinical
  results.push(await testCase('Test Case 1: Full Case Generation', [
    {
      name: 'Init',
      endpoint: '/init',
      body: { topic: 'Acute Myocardial Infarction', category: 'Cardiology' },
    },
    {
      name: 'History',
      endpoint: '/history',
      body: { caseId: null }, // Will be set from init
    },
    {
      name: 'Exam',
      endpoint: '/exam',
      body: { caseId: null },
    },
    {
      name: 'Paraclinical',
      endpoint: '/paraclinical',
      body: { caseId: null },
      validate: (data) => {
        const paraclinical = data.data?.paraclinical;
        const hasLabs = paraclinical?.labs && paraclinical.labs.trim().length > 0;
        const hasImaging = paraclinical?.imaging && paraclinical.imaging.trim().length > 0;
        const hasDifferentials = Array.isArray(data.data?.differential_diagnoses) && data.data.differential_diagnoses.length > 0;
        return {
          pass: hasLabs && hasImaging && hasDifferentials,
          message: `Paraclinical: labs=${hasLabs ? '✓' : '✗'}, imaging=${hasImaging ? '✓' : '✗'}, differentials=${hasDifferentials ? '✓' : '✗'}`,
        };
      },
    },
  ]));
  
  // Test Case 2: Teaching mode with structured output
  results.push(await testCase('Test Case 2: Teaching Mode', [
    {
      name: 'Init',
      endpoint: '/init',
      body: { topic: 'Pneumonia', category: 'Pulmonology' },
    },
    {
      name: 'History',
      endpoint: '/history',
      body: { caseId: null },
    },
    {
      name: 'Exam',
      endpoint: '/exam',
      body: { caseId: null },
    },
    {
      name: 'Paraclinical',
      endpoint: '/paraclinical',
      body: { caseId: null },
    },
    {
      name: 'Teaching',
      endpoint: '/expand/teaching',
      body: { caseId: null },
      validate: (data) => {
        const hasKeyConcepts = Array.isArray(data.data?.key_concepts) && data.data.key_concepts.length > 0;
        const hasPearls = Array.isArray(data.data?.clinical_pearls) && data.data.clinical_pearls.length > 0;
        const hasPitfalls = Array.isArray(data.data?.common_pitfalls) && data.data.common_pitfalls.length > 0;
        return {
          pass: hasKeyConcepts && hasPearls && hasPitfalls,
          message: `Teaching: concepts=${hasKeyConcepts ? '✓' : '✗'}, pearls=${hasPearls ? '✓' : '✗'}, pitfalls=${hasPitfalls ? '✓' : '✗'}`,
        };
      },
    },
  ]));
  
  // Test Case 3: Deep Evidence and Risk Assessment
  results.push(await testCase('Test Case 3: Deep Evidence & Risk', [
    {
      name: 'Init',
      endpoint: '/init',
      body: { topic: 'Sepsis', category: 'Emergency Medicine' },
    },
    {
      name: 'History',
      endpoint: '/history',
      body: { caseId: null },
    },
    {
      name: 'Exam',
      endpoint: '/exam',
      body: { caseId: null },
    },
    {
      name: 'Paraclinical',
      endpoint: '/paraclinical',
      body: { caseId: null },
    },
    {
      name: 'Deep Evidence',
      endpoint: '/expand/evidence',
      body: { caseId: null },
      validate: (data) => {
        const hasEvidence = typeof data.data?.deepEvidence === 'string' && data.data.deepEvidence.trim().length > 0;
        const hasRiskAssessment = typeof data.data?.clinical_risk_assessment === 'string' && data.data.clinical_risk_assessment.trim().length > 0;
        const riskText = data.data?.clinical_risk_assessment || '';
        const abgCount = (riskText.match(/ABG/g) || []).length;
        const noDuplicates = abgCount <= 1;
        return {
          pass: hasEvidence && hasRiskAssessment && noDuplicates,
          message: `Evidence: ${hasEvidence ? '✓' : '✗'}, Risk: ${hasRiskAssessment ? '✓' : '✗'}, Dedup: ${noDuplicates ? '✓' : '✗'}`,
        };
      },
    },
    {
      name: 'Stability',
      endpoint: '/expand/stability',
      body: { caseId: null },
    },
    {
      name: 'Risk',
      endpoint: '/expand/risk',
      body: { caseId: null },
    },
  ]));
  
  // Summary
  console.log('\n=== Test Summary ===');
  const passed = results.filter(r => r.pass).length;
  const total = results.length;
  console.log(`Passed: ${passed}/${total}`);
  
  results.forEach((result, idx) => {
    console.log(`Test ${idx + 1}: ${result.pass ? '✓ PASSED' : '✗ FAILED'}`);
    if (!result.pass && result.errors) {
      result.errors.forEach(err => console.log(`  - ${err}`));
    }
  });
  
  return { passed, total, results };
}

async function runTestsFixed() {
  console.log('Starting automated test cases against deployed backend...');
  console.log(`Backend URL: ${BACKEND_URL}\n`);
  
  const results = [];
  
  // Test Case 1: Full case generation with paraclinical
  let caseId1 = null;
  try {
    // Init
    const init1 = await fetch(`${BACKEND_URL}/api/case/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'Acute Myocardial Infarction', category: 'Cardiology' }),
    });
    const initData1 = await init1.json();
    caseId1 = initData1.caseId;
    console.log(`\n=== Test Case 1: Full Case Generation ===`);
    console.log(`✓ Case ID: ${caseId1}`);
    
    // History
    const hist1 = await fetch(`${BACKEND_URL}/api/case/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId: caseId1 }),
    });
    const histData1 = await hist1.json();
    console.log(`✓ History: Completed`);
    
    // Exam
    const exam1 = await fetch(`${BACKEND_URL}/api/case/exam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId: caseId1 }),
    });
    const examData1 = await exam1.json();
    console.log(`✓ Exam: Completed`);
    
    // Paraclinical
    const para1 = await fetch(`${BACKEND_URL}/api/case/paraclinical`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId: caseId1 }),
    });
    const paraData1 = await para1.json();
    const paraclinical = paraData1.data?.paraclinical;
    const hasLabs = paraclinical?.labs && paraclinical.labs.trim().length > 0;
    const hasImaging = paraclinical?.imaging && paraclinical.imaging.trim().length > 0;
    const hasDifferentials = Array.isArray(paraData1.data?.differential_diagnoses) && paraData1.data.differential_diagnoses.length > 0;
    console.log(`✓ Paraclinical: labs=${hasLabs ? '✓' : '✗'}, imaging=${hasImaging ? '✓' : '✗'}, differentials=${hasDifferentials ? '✓' : '✗'}`);
    results.push({ pass: hasLabs && hasImaging && hasDifferentials, name: 'Test Case 1' });
  } catch (error) {
    console.log(`✗ Test Case 1: ERROR - ${error.message}`);
    results.push({ pass: false, name: 'Test Case 1', error: error.message });
  }
  
  // Test Case 2: Teaching mode
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
    console.log(`✓ Teaching: concepts=${hasKeyConcepts ? '✓' : '✗'}, pearls=${hasPearls ? '✓' : '✗'}, pitfalls=${hasPitfalls ? '✓' : '✗'}`);
    results.push({ pass: hasKeyConcepts && hasPearls && hasPitfalls, name: 'Test Case 2' });
  } catch (error) {
    console.log(`✗ Test Case 2: ERROR - ${error.message}`);
    results.push({ pass: false, name: 'Test Case 2', error: error.message });
  }
  
  // Test Case 3: Deep Evidence & Risk
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
    console.log(`✓ Evidence: ${hasEvidence ? '✓' : '✗'}, Risk: ${hasRiskAssessment ? '✓' : '✗'}, Dedup: ${noDuplicates ? '✓' : '✗'}`);
    results.push({ pass: hasEvidence && hasRiskAssessment && noDuplicates, name: 'Test Case 3' });
  } catch (error) {
    console.log(`✗ Test Case 3: ERROR - ${error.message}`);
    results.push({ pass: false, name: 'Test Case 3', error: error.message });
  }
  
  // Summary
  console.log('\n=== Test Summary ===');
  const passed = results.filter(r => r.pass).length;
  const total = results.length;
  console.log(`Passed: ${passed}/${total}`);
  
  results.forEach((result, idx) => {
    console.log(`Test ${idx + 1}: ${result.pass ? '✓ PASSED' : '✗ FAILED'}`);
    if (result.error) console.log(`  - ${result.error}`);
  });
  
  return { passed, total, results };
}

runTestsFixed().catch(console.error);

