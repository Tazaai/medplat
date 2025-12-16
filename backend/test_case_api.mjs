// Comprehensive endpoint testing for multi-step case generator
// Tests all /api/case routes and Firestore merge behavior

import { getCase, saveCase, updateCaseFields, generateCaseId } from './utils/case_context_manager.mjs';

// Use fetch from node-fetch if available, otherwise use global fetch
let fetch;
try {
  const nodeFetch = await import('node-fetch');
  fetch = nodeFetch.default;
} catch {
  fetch = globalThis.fetch;
  if (!fetch) {
    console.error('❌ fetch not available. Install node-fetch: npm install node-fetch');
    process.exit(1);
  }
}

const API_BASE = process.env.API_BASE || 'http://localhost:8080';
const TEST_CASE_ID = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

function logTest(name, passed, error = null) {
  if (passed) {
    console.log(`✅ ${name}`);
    testResults.passed++;
  } else {
    console.error(`❌ ${name}`);
    if (error) {
      console.error(`   Error: ${error.message || error}`);
      testResults.errors.push({ test: name, error: error.message || String(error) });
    }
    testResults.failed++;
  }
}

function checkResponse(response, requiredFields = []) {
  if (!response.ok) {
    return { valid: false, error: `Response not ok: ${response.status} ${response.statusText}` };
  }
  if (!response.caseId) {
    return { valid: false, error: 'Missing caseId in response' };
  }
  if (!response.case) {
    return { valid: false, error: 'Missing case object in response' };
  }
  
  // Check for undefined values
  const caseStr = JSON.stringify(response.case);
  if (caseStr.includes('undefined')) {
    return { valid: false, error: 'Response contains undefined values' };
  }
  
  // Check required fields
  for (const field of requiredFields) {
    if (response.case[field] === undefined) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }
  
  return { valid: true };
}

async function testInit() {
  console.log('\n🧪 Testing POST /api/case/init');
  try {
    const response = await fetch(`${API_BASE}/api/case/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: 'Acute Myocardial Infarction',
        category: 'Cardiology',
        lang: 'en',
        region: 'global'
      })
    });
    
    const data = await response.json();
    const validation = checkResponse(data, ['meta', 'chief_complaint', 'initial_context']);
    
    if (!validation.valid) {
      logTest('POST /api/case/init - Response validation', false, new Error(validation.error));
      return null;
    }
    
    if (!data.caseId || typeof data.caseId !== 'string') {
      logTest('POST /api/case/init - Valid caseId', false, new Error('caseId is missing or invalid'));
      return null;
    }
    
    if (!data.case.meta || !data.case.meta.topic) {
      logTest('POST /api/case/init - Meta structure', false, new Error('meta structure invalid'));
      return null;
    }
    
    logTest('POST /api/case/init - Response validation', true);
    logTest('POST /api/case/init - Valid caseId', true);
    logTest('POST /api/case/init - Meta structure', true);
    
    // Verify Firestore storage
    const stored = await getCase(data.caseId);
    if (!stored) {
      logTest('POST /api/case/init - Firestore storage', false, new Error('Case not found in Firestore'));
      return null;
    }
    
    logTest('POST /api/case/init - Firestore storage', true);
    return data.caseId;
  } catch (error) {
    logTest('POST /api/case/init', false, error);
    return null;
  }
}

async function testHistory(caseId) {
  console.log('\n🧪 Testing POST /api/case/history');
  if (!caseId) {
    logTest('POST /api/case/history - Skipped (no caseId)', false, new Error('No caseId from init'));
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/case/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId })
    });
    
    const data = await response.json();
    const validation = checkResponse(data, ['history']);
    
    if (!validation.valid) {
      logTest('POST /api/case/history - Response validation', false, new Error(validation.error));
      return;
    }
    
    if (!data.case.history || typeof data.case.history !== 'string' || data.case.history.trim().length === 0) {
      logTest('POST /api/case/history - History field', false, new Error('History is empty or invalid'));
      return;
    }
    
    logTest('POST /api/case/history - Response validation', true);
    logTest('POST /api/case/history - History field', true);

    // Verify Firestore merge (should preserve meta, chief_complaint, initial_context)
    const stored = await getCase(caseId);
    if (!stored.meta || !stored.chief_complaint) {
      logTest('POST /api/case/history - Firestore merge', false, new Error('Previous fields lost during merge'));
      return;
    }
    
    if (!stored.history) {
      logTest('POST /api/case/history - Firestore merge', false, new Error('History not saved to Firestore'));
      return;
    }
    
    logTest('POST /api/case/history - Firestore merge', true);
  } catch (error) {
    logTest('POST /api/case/history', false, error);
  }
}

async function testExam(caseId) {
  console.log('\n🧪 Testing POST /api/case/exam');
  if (!caseId) {
    logTest('POST /api/case/exam - Skipped (no caseId)', false, new Error('No caseId'));
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/case/exam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId })
    });
    
    const data = await response.json();
    const validation = checkResponse(data, ['physical_exam']);
    
    if (!validation.valid) {
      logTest('POST /api/case/exam - Response validation', false, new Error(validation.error));
      return;
    }
    
    if (!data.case.physical_exam || typeof data.case.physical_exam !== 'string' || data.case.physical_exam.trim().length === 0) {
      logTest('POST /api/case/exam - Physical exam field', false, new Error('Physical exam is empty or invalid'));
      return;
    }
    
    logTest('POST /api/case/exam - Response validation', true);
    logTest('POST /api/case/exam - Physical exam field', true);
    
    // Verify Firestore merge (should preserve previous fields)
    const stored = await getCase(caseId);
    if (!stored.meta || !stored.history) {
      logTest('POST /api/case/exam - Firestore merge', false, new Error('Previous fields lost during merge'));
      return;
    }
    
    if (!stored.physical_exam) {
      logTest('POST /api/case/exam - Firestore merge', false, new Error('Physical exam not saved to Firestore'));
      return;
    }
    
    logTest('POST /api/case/exam - Firestore merge', true);
  } catch (error) {
    logTest('POST /api/case/exam', false, error);
  }
}

async function testParaclinical(caseId) {
  console.log('\n🧪 Testing POST /api/case/paraclinical');
  if (!caseId) {
    logTest('POST /api/case/paraclinical - Skipped (no caseId)', false, new Error('No caseId'));
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/case/paraclinical`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId })
    });
    
    const data = await response.json();
    const validation = checkResponse(data, ['paraclinical']);
    
    if (!validation.valid) {
      logTest('POST /api/case/paraclinical - Response validation', false, new Error(validation.error));
      return;
    }
    
    if (!data.case.paraclinical || typeof data.case.paraclinical !== 'object') {
      logTest('POST /api/case/paraclinical - Paraclinical structure', false, new Error('Paraclinical is not an object'));
    return;
  }

    logTest('POST /api/case/paraclinical - Response validation', true);
    logTest('POST /api/case/paraclinical - Paraclinical structure', true);
    
    // Verify Firestore merge
    const stored = await getCase(caseId);
    if (!stored.meta || !stored.history || !stored.physical_exam) {
      logTest('POST /api/case/paraclinical - Firestore merge', false, new Error('Previous fields lost during merge'));
      return;
    }
    
    if (!stored.paraclinical) {
      logTest('POST /api/case/paraclinical - Firestore merge', false, new Error('Paraclinical not saved to Firestore'));
      return;
    }
    
    logTest('POST /api/case/paraclinical - Firestore merge', true);
  } catch (error) {
    logTest('POST /api/case/paraclinical', false, error);
  }
}

async function testExpandPathophysiology(caseId) {
  console.log('\n🧪 Testing POST /api/case/expand/pathophysiology');
  if (!caseId) {
    logTest('POST /api/case/expand/pathophysiology - Skipped (no caseId)', false, new Error('No caseId'));
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/case/expand/pathophysiology`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId })
    });
    
    const data = await response.json();
    const validation = checkResponse(data, ['pathophysiology']);
    
    if (!validation.valid) {
      logTest('POST /api/case/expand/pathophysiology - Response validation', false, new Error(validation.error));
      return;
  }
    
    if (!data.case.pathophysiology || typeof data.case.pathophysiology !== 'string' || data.case.pathophysiology.trim().length === 0) {
      logTest('POST /api/case/expand/pathophysiology - Pathophysiology field', false, new Error('Pathophysiology is empty or invalid'));
      return;
    }
    
    logTest('POST /api/case/expand/pathophysiology - Response validation', true);
    logTest('POST /api/case/expand/pathophysiology - Pathophysiology field', true);
    
    // Verify Firestore merge (should NOT overwrite unrelated fields)
    const stored = await getCase(caseId);
    if (!stored.meta || !stored.history || !stored.physical_exam || !stored.paraclinical) {
      logTest('POST /api/case/expand/pathophysiology - Firestore merge (no overwrite)', false, new Error('Previous fields lost during merge'));
      return;
    }
    
    if (!stored.pathophysiology) {
      logTest('POST /api/case/expand/pathophysiology - Firestore merge', false, new Error('Pathophysiology not saved to Firestore'));
      return;
    }
    
    logTest('POST /api/case/expand/pathophysiology - Firestore merge (no overwrite)', true);
  } catch (error) {
    logTest('POST /api/case/expand/pathophysiology', false, error);
  }
}

async function testExpandManagement(caseId) {
  console.log('\n🧪 Testing POST /api/case/expand/management');
  if (!caseId) {
    logTest('POST /api/case/expand/management - Skipped (no caseId)', false, new Error('No caseId'));
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/case/expand/management`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId })
    });
    
    const data = await response.json();
    const validation = checkResponse(data, ['management']);
    
    if (!validation.valid) {
      logTest('POST /api/case/expand/management - Response validation', false, new Error(validation.error));
      return;
    }
    
    if (!data.case.management || typeof data.case.management !== 'object') {
      logTest('POST /api/case/expand/management - Management structure', false, new Error('Management is not an object'));
      return;
    }
    
    if (!data.case.management.initial || !data.case.management.definitive) {
      logTest('POST /api/case/expand/management - Management fields', false, new Error('Management missing initial or definitive'));
      return;
    }
    
    logTest('POST /api/case/expand/management - Response validation', true);
    logTest('POST /api/case/expand/management - Management structure', true);
    logTest('POST /api/case/expand/management - Management fields', true);
    
    // Verify Firestore merge (should NOT overwrite unrelated fields)
    const stored = await getCase(caseId);
    if (!stored.meta || !stored.history || !stored.physical_exam || !stored.paraclinical || !stored.pathophysiology) {
      logTest('POST /api/case/expand/management - Firestore merge (no overwrite)', false, new Error('Previous fields lost during merge'));
      return;
    }
    
    if (!stored.management) {
      logTest('POST /api/case/expand/management - Firestore merge', false, new Error('Management not saved to Firestore'));
      return;
    }
    
    logTest('POST /api/case/expand/management - Firestore merge (no overwrite)', true);
  } catch (error) {
    logTest('POST /api/case/expand/management', false, error);
  }
}

async function testExpandQuestion(caseId) {
  console.log('\n🧪 Testing POST /api/case/expand/question');
  if (!caseId) {
    logTest('POST /api/case/expand/question - Skipped (no caseId)', false, new Error('No caseId'));
    return;
  }
  
  try {
    // Store original case state
    const beforeQuestion = await getCase(caseId);
    const originalHistory = beforeQuestion?.history;
    const originalExam = beforeQuestion?.physical_exam;
    
    const response = await fetch(`${API_BASE}/api/case/expand/question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
    caseId,
        userQuestion: 'What is the sensitivity of CT angiography for detecting pulmonary embolism?'
      })
    });
    
    const data = await response.json();
  
    if (!data.ok) {
      logTest('POST /api/case/expand/question - Response ok', false, new Error(data.error || 'Response not ok'));
      return;
    }
    
    if (!data.answer || typeof data.answer !== 'string' || data.answer.trim().length === 0) {
      logTest('POST /api/case/expand/question - Answer field', false, new Error('Answer is empty or invalid'));
      return;
    }
    
    if (!data.caseId || data.caseId !== caseId) {
      logTest('POST /api/case/expand/question - CaseId consistency', false, new Error('CaseId mismatch'));
      return;
    }
    
    logTest('POST /api/case/expand/question - Response ok', true);
    logTest('POST /api/case/expand/question - Answer field', true);
    logTest('POST /api/case/expand/question - CaseId consistency', true);
    
    // Verify case was NOT modified (question endpoint should not update case)
    const afterQuestion = await getCase(caseId);
    if (afterQuestion?.history !== originalHistory || afterQuestion?.physical_exam !== originalExam) {
      logTest('POST /api/case/expand/question - No case modification', false, new Error('Question endpoint modified case data'));
      return;
    }
    
    logTest('POST /api/case/expand/question - No case modification', true);
  } catch (error) {
    logTest('POST /api/case/expand/question', false, error);
  }
}

async function testUpdateCaseFields() {
  console.log('\n🧪 Testing updateCaseFields() merge behavior');
  try {
    const testId = `merge_test_${Date.now()}`;
    
    // Save initial case
    await saveCase(testId, {
      meta: { topic: 'Test', category: 'Test' },
      history: 'Initial history',
      field1: 'value1'
    });
    
    // Update only specific fields
    await updateCaseFields(testId, {
      physical_exam: 'New exam',
      field2: 'value2'
    });
    
    // Verify merge behavior
    const stored = await getCase(testId);
    
    if (!stored.meta || stored.meta.topic !== 'Test') {
      logTest('updateCaseFields() - Preserves existing fields', false, new Error('Meta field lost'));
      return;
    }
    
    if (stored.history !== 'Initial history') {
      logTest('updateCaseFields() - Preserves existing fields', false, new Error('History field lost'));
      return;
    }
    
    if (stored.field1 !== 'value1') {
      logTest('updateCaseFields() - Preserves existing fields', false, new Error('field1 lost'));
      return;
      }
    
    if (stored.physical_exam !== 'New exam') {
      logTest('updateCaseFields() - Adds new fields', false, new Error('New field not added'));
      return;
    }
    
    if (stored.field2 !== 'value2') {
      logTest('updateCaseFields() - Adds new fields', false, new Error('New field2 not added'));
      return;
    }
    
    logTest('updateCaseFields() - Preserves existing fields', true);
    logTest('updateCaseFields() - Adds new fields', true);
    logTest('updateCaseFields() - Merge behavior', true);
  } catch (error) {
    logTest('updateCaseFields() merge behavior', false, error);
  }
}

async function testGetCase() {
  console.log('\n🧪 Testing GET /api/case/:caseId');
  try {
    // First create a case
    const initResponse = await fetch(`${API_BASE}/api/case/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'Test Get', category: 'Test' })
    });
    
    const initData = await initResponse.json();
    if (!initData.ok || !initData.caseId) {
      logTest('GET /api/case/:caseId - Setup', false, new Error('Failed to create test case'));
      return;
    }
    
    const caseId = initData.caseId;
    
    // Now get it
    const getResponse = await fetch(`${API_BASE}/api/case/${caseId}`);
    const getData = await getResponse.json();
    
    if (!getData.ok) {
      logTest('GET /api/case/:caseId - Response ok', false, new Error(getData.error || 'Response not ok'));
      return;
    }
    
    if (!getData.case || !getData.caseId) {
      logTest('GET /api/case/:caseId - Response structure', false, new Error('Missing case or caseId'));
      return;
    }
    
    if (getData.caseId !== caseId) {
      logTest('GET /api/case/:caseId - CaseId match', false, new Error('CaseId mismatch'));
      return;
    }
    
    if (!getData.case.meta) {
      logTest('GET /api/case/:caseId - Case structure', false, new Error('Case missing meta'));
      return;
    }
    
    logTest('GET /api/case/:caseId - Response ok', true);
    logTest('GET /api/case/:caseId - Response structure', true);
    logTest('GET /api/case/:caseId - CaseId match', true);
    logTest('GET /api/case/:caseId - Case structure', true);
  } catch (error) {
    logTest('GET /api/case/:caseId', false, error);
  }
}

async function runAllTests() {
  console.log('========================================');
  console.log('🧪 Multi-Step Case API Endpoint Tests');
  console.log('========================================\n');
  
  // Syntax checks first
  console.log('📋 Running syntax checks...');
  try {
    const { execSync } = await import('child_process');
    const { fileURLToPath } = await import('url');
    const { dirname } = await import('path');
    const __dirname = dirname(fileURLToPath(import.meta.url));
    
    try {
      execSync('node -c routes/case_api.mjs', { cwd: __dirname, stdio: 'pipe' });
      logTest('Syntax: case_api.mjs', true);
    } catch (e) {
      logTest('Syntax: case_api.mjs', false, new Error(e.stdout?.toString() || e.message));
    }
    
    try {
      execSync('node -c utils/case_context_manager.mjs', { cwd: __dirname, stdio: 'pipe' });
      logTest('Syntax: case_context_manager.mjs', true);
    } catch (e) {
      logTest('Syntax: case_context_manager.mjs', false, new Error(e.stdout?.toString() || e.message));
    }
    
    try {
      execSync('node -c index.js', { cwd: __dirname, stdio: 'pipe' });
      logTest('Syntax: index.js', true);
    } catch (e) {
      logTest('Syntax: index.js', false, new Error(e.stdout?.toString() || e.message));
    }
  } catch (error) {
    logTest('Syntax checks', false, error);
  }
  
  console.log('\n');
  
  // Test updateCaseFields merge behavior first (doesn't require API)
  await testUpdateCaseFields();
  
  // Test endpoints in sequence
  const caseId = await testInit();
  if (caseId) {
    await testHistory(caseId);
    await testExam(caseId);
    await testParaclinical(caseId);
    await testExpandPathophysiology(caseId);
    await testExpandManagement(caseId);
    await testExpandQuestion(caseId);
  }
  
  await testGetCase();
  
  // Summary
  console.log('\n========================================');
  console.log('📊 Test Summary');
  console.log('========================================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ Errors:');
    testResults.errors.forEach((err, idx) => {
      console.log(`   ${idx + 1}. ${err.test}: ${err.error}`);
    });
  }

  console.log('\n');
  
  if (testResults.failed > 0) {
    process.exit(1);
  } else {
    console.log('✅ All tests passed!');
    process.exit(0);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});
