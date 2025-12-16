// Direct function testing for case context manager (no HTTP required)
// Tests Firestore merge behavior and function logic

import { getCase, saveCase, updateCaseFields, generateCaseId } from './utils/case_context_manager.mjs';

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

async function testGenerateCaseId() {
  console.log('\n🧪 Testing generateCaseId()');
  try {
    const id1 = generateCaseId();
    const id2 = generateCaseId();
    
    if (!id1 || typeof id1 !== 'string' || id1.length === 0) {
      logTest('generateCaseId() - Returns string', false, new Error('Invalid caseId format'));
      return null;
    }
    
    if (!id1.startsWith('case_')) {
      logTest('generateCaseId() - Correct prefix', false, new Error('CaseId missing prefix'));
      return null;
    }
    
    if (id1 === id2) {
      logTest('generateCaseId() - Unique IDs', false, new Error('Generated duplicate IDs'));
      return null;
    }
    
    logTest('generateCaseId() - Returns string', true);
    logTest('generateCaseId() - Correct prefix', true);
    logTest('generateCaseId() - Unique IDs', true);
    
    return id1;
  } catch (error) {
    logTest('generateCaseId()', false, error);
    return null;
  }
}

async function testSaveCase() {
  console.log('\n🧪 Testing saveCase()');
  try {
    const caseId = generateCaseId();
    const testData = {
      meta: { topic: 'Test Topic', category: 'Test Category' },
      chief_complaint: 'Test complaint',
      initial_context: 'Test context',
      field1: 'value1'
    };
    
    const saved = await saveCase(caseId, testData);
    
    if (!saved || saved.id !== caseId) {
      logTest('saveCase() - Returns correct structure', false, new Error('Save returned wrong structure'));
      return null;
    }
    
    if (!saved.meta || saved.meta.topic !== 'Test Topic') {
      logTest('saveCase() - Preserves data', false, new Error('Data not preserved'));
      return null;
    }
    
    if (!saved.updatedAt) {
      logTest('saveCase() - Adds updatedAt', false, new Error('updatedAt missing'));
      return null;
    }
    
    logTest('saveCase() - Returns correct structure', true);
    logTest('saveCase() - Preserves data', true);
    logTest('saveCase() - Adds updatedAt', true);
    
    return caseId;
  } catch (error) {
    logTest('saveCase()', false, error);
    return null;
  }
}

async function testGetCase(caseId) {
  console.log('\n🧪 Testing getCase()');
  if (!caseId) {
    logTest('getCase() - Skipped (no caseId)', false, new Error('No caseId from saveCase'));
    return;
  }
  
  try {
    const retrieved = await getCase(caseId);
    
    if (!retrieved) {
      logTest('getCase() - Retrieves case', false, new Error('Case not found'));
      return;
    }
    
    if (retrieved.id !== caseId) {
      logTest('getCase() - Correct caseId', false, new Error('Wrong caseId returned'));
      return;
    }
    
    if (!retrieved.meta || retrieved.meta.topic !== 'Test Topic') {
      logTest('getCase() - Preserves data', false, new Error('Data not preserved'));
      return;
    }
    
    logTest('getCase() - Retrieves case', true);
    logTest('getCase() - Correct caseId', true);
    logTest('getCase() - Preserves data', true);
  } catch (error) {
    logTest('getCase()', false, error);
  }
}

async function testUpdateCaseFields() {
  console.log('\n🧪 Testing updateCaseFields() merge behavior');
  try {
    const testId = `merge_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Save initial case
    await saveCase(testId, {
      meta: { topic: 'Test', category: 'Test' },
      history: 'Initial history',
      field1: 'value1',
      field2: 'value2'
    });
    
    // Update only specific fields
    await updateCaseFields(testId, {
      physical_exam: 'New exam',
      field3: 'value3'
    });
    
    // Verify merge behavior
    const stored = await getCase(testId);
    
    if (!stored) {
      logTest('updateCaseFields() - Case exists', false, new Error('Case not found after update'));
      return;
    }
    
    if (!stored.meta || stored.meta.topic !== 'Test') {
      logTest('updateCaseFields() - Preserves existing fields (meta)', false, new Error('Meta field lost'));
      return;
    }
    
    if (stored.history !== 'Initial history') {
      logTest('updateCaseFields() - Preserves existing fields (history)', false, new Error('History field lost'));
      return;
    }
    
    if (stored.field1 !== 'value1') {
      logTest('updateCaseFields() - Preserves existing fields (field1)', false, new Error('field1 lost'));
      return;
    }
    
    if (stored.field2 !== 'value2') {
      logTest('updateCaseFields() - Preserves existing fields (field2)', false, new Error('field2 lost'));
      return;
    }
    
    if (stored.physical_exam !== 'New exam') {
      logTest('updateCaseFields() - Adds new fields (physical_exam)', false, new Error('New field not added'));
      return;
    }
    
    if (stored.field3 !== 'value3') {
      logTest('updateCaseFields() - Adds new fields (field3)', false, new Error('New field3 not added'));
      return;
    }
    
    if (!stored.updatedAt) {
      logTest('updateCaseFields() - Updates timestamp', false, new Error('updatedAt missing'));
      return;
    }
    
    logTest('updateCaseFields() - Preserves existing fields (meta)', true);
    logTest('updateCaseFields() - Preserves existing fields (history)', true);
    logTest('updateCaseFields() - Preserves existing fields (field1)', true);
    logTest('updateCaseFields() - Preserves existing fields (field2)', true);
    logTest('updateCaseFields() - Adds new fields (physical_exam)', true);
    logTest('updateCaseFields() - Adds new fields (field3)', true);
    logTest('updateCaseFields() - Updates timestamp', true);
    
    // Test overwrite behavior (should merge, not replace)
    await updateCaseFields(testId, {
      field2: 'updated_value2',
      field4: 'value4'
    });
    
    const afterOverwrite = await getCase(testId);
    
    if (afterOverwrite.field2 !== 'updated_value2') {
      logTest('updateCaseFields() - Updates existing fields', false, new Error('field2 not updated'));
      return;
    }
    
    if (afterOverwrite.field1 !== 'value1') {
      logTest('updateCaseFields() - Does not overwrite unrelated fields', false, new Error('field1 lost during update'));
      return;
    }
    
    if (afterOverwrite.meta.topic !== 'Test') {
      logTest('updateCaseFields() - Does not overwrite nested objects', false, new Error('meta lost during update'));
      return;
    }
    
    logTest('updateCaseFields() - Updates existing fields', true);
    logTest('updateCaseFields() - Does not overwrite unrelated fields', true);
    logTest('updateCaseFields() - Does not overwrite nested objects', true);
  } catch (error) {
    logTest('updateCaseFields() merge behavior', false, error);
  }
}

async function testNoUndefinedValues() {
  console.log('\n🧪 Testing for undefined values in responses');
  try {
    const testId = `undefined_test_${Date.now()}`;
    
    await saveCase(testId, {
      meta: { topic: 'Test', category: 'Test' },
      history: 'Test history',
      undefinedField: undefined, // This should be filtered by Firestore
      nullField: null,
      emptyString: '',
      zeroValue: 0
    });
    
    const retrieved = await getCase(testId);
    
    const caseStr = JSON.stringify(retrieved);
    if (caseStr.includes('undefined')) {
      logTest('No undefined values - Response check', false, new Error('Response contains undefined'));
      return;
    }
    
    // Check that valid null/empty values are preserved
    if (retrieved.nullField !== null) {
      logTest('No undefined values - Preserves null', false, new Error('null value lost'));
      return;
    }
    
    if (retrieved.emptyString !== '') {
      logTest('No undefined values - Preserves empty string', false, new Error('empty string lost'));
      return;
    }
    
    if (retrieved.zeroValue !== 0) {
      logTest('No undefined values - Preserves zero', false, new Error('zero value lost'));
      return;
    }
    
    logTest('No undefined values - Response check', true);
    logTest('No undefined values - Preserves null', true);
    logTest('No undefined values - Preserves empty string', true);
    logTest('No undefined values - Preserves zero', true);
  } catch (error) {
    logTest('No undefined values', false, error);
  }
}

async function runAllTests() {
  console.log('========================================');
  console.log('🧪 Case Context Manager Direct Tests');
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
  
  // Test functions in sequence
  const caseId1 = await testGenerateCaseId();
  const caseId2 = await testSaveCase();
  if (caseId2) {
    await testGetCase(caseId2);
  }
  await testUpdateCaseFields();
  await testNoUndefinedValues();
  
  // Summary
  console.log('\n========================================');
  console.log('📊 Test Summary');
  console.log('========================================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  const total = testResults.passed + testResults.failed;
  if (total > 0) {
    console.log(`📈 Success Rate: ${((testResults.passed / total) * 100).toFixed(1)}%`);
  }
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ Errors:');
    testResults.errors.forEach((err, idx) => {
      console.log(`   ${idx + 1}. ${err.test}: ${err.error}`);
    });
  }
  
  console.log('\n');
  console.log('📝 Note: For HTTP endpoint testing, use test_case_api.mjs with a running server');
  console.log('   Or test manually with curl/Postman against deployed backend\n');
  
  if (testResults.failed > 0) {
    process.exit(1);
  } else {
    console.log('✅ All direct function tests passed!');
    process.exit(0);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});
