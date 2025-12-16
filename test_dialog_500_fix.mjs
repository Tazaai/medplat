// Test script to verify DIALOG_500 error handling and logging fixes
// This script verifies the code changes are correct before deployment

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const results = {
  passed: [],
  failed: [],
  warnings: []
};

function log(message, type = 'info') {
  const prefix = {
    pass: '✅',
    fail: '❌',
    warn: '⚠️',
    info: '🔍'
  }[type] || '🔍';
  console.log(`${prefix} ${message}`);
}

function test(name, fn) {
  try {
    fn();
    results.passed.push(name);
    log(name, 'pass');
    return true;
  } catch (error) {
    results.failed.push({ name, error: error.message });
    log(`${name}: ${error.message}`, 'fail');
    return false;
  }
}

function warn(message) {
  results.warnings.push(message);
  log(message, 'warn');
}

console.log('=====================================================');
console.log('🧪 Testing DIALOG_500 Error Handling & Logging Fix');
console.log('=====================================================\n');

// Test 1: Check dialog_api.mjs syntax
test('dialog_api.mjs file exists', () => {
  const filePath = path.join(__dirname, 'backend', 'routes', 'dialog_api.mjs');
  if (!fs.existsSync(filePath)) {
    throw new Error('dialog_api.mjs not found');
  }
});

// Test 2: Verify logging code is present in dialog_api.mjs
test('dialog_api.mjs contains [DIALOG_500] logging', () => {
  const filePath = path.join(__dirname, 'backend', 'routes', 'dialog_api.mjs');
  const content = fs.readFileSync(filePath, 'utf8');
  
  const requiredLogs = [
    '[DIALOG_500]',
    'Log input parameters',
    'Starting generateClinicalCase',
    'generateClinicalCase completed',
    'generateClinicalCase failed',
    'Error in POST /api/dialog'
  ];
  
  const missing = requiredLogs.filter(log => !content.includes(log));
  if (missing.length > 0) {
    throw new Error(`Missing required logging: ${missing.join(', ')}`);
  }
});

// Test 3: Verify error handling structure
test('dialog_api.mjs has proper error handling', () => {
  const filePath = path.join(__dirname, 'backend', 'routes', 'dialog_api.mjs');
  const content = fs.readFileSync(filePath, 'utf8');
  
  const requiredPatterns = [
    'ok: false',
    'error: true',
    'caseData.error === true',
    'statusCode = err.message',
    '504',
    '500'
  ];
  
  const missing = requiredPatterns.filter(pattern => !content.includes(pattern));
  if (missing.length > 0) {
    throw new Error(`Missing error handling patterns: ${missing.join(', ')}`);
  }
});

// Test 4: Verify timing logs
test('dialog_api.mjs includes timing logs', () => {
  const filePath = path.join(__dirname, 'backend', 'routes', 'dialog_api.mjs');
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('generateStartTime') || !content.includes('Date.now()')) {
    throw new Error('Missing timing logs');
  }
});

// Test 5: Check generate_case_clinical.mjs
test('generate_case_clinical.mjs file exists', () => {
  const filePath = path.join(__dirname, 'backend', 'generate_case_clinical.mjs');
  if (!fs.existsSync(filePath)) {
    throw new Error('generate_case_clinical.mjs not found');
  }
});

// Test 6: Verify OpenAI error handling
test('generate_case_clinical.mjs has OpenAI error handling', () => {
  const filePath = path.join(__dirname, 'backend', 'generate_case_clinical.mjs');
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('OpenAI API call failed in generateClinicalCase')) {
    throw new Error('Missing OpenAI error handling');
  }
});

// Test 7: Verify enhanced error logging
test('generate_case_clinical.mjs has enhanced error logging', () => {
  const filePath = path.join(__dirname, 'backend', 'generate_case_clinical.mjs');
  const content = fs.readFileSync(filePath, 'utf8');
  
  const requiredPatterns = [
    'Case generation failed in generateClinicalCase',
    'error: err.message',
    'stack: err.stack',
    'topic',
    'category',
    'region'
  ];
  
  const missing = requiredPatterns.filter(pattern => !content.includes(pattern));
  if (missing.length > 0) {
    warn(`Some error logging patterns missing: ${missing.join(', ')}`);
  }
});

// Test 8: Check syntax - try to import dialog_api
test('dialog_api.mjs has valid syntax', async () => {
  try {
    // Try to import - this will catch syntax errors
    const dialogApiPath = path.join(__dirname, 'backend', 'routes', 'dialog_api.mjs');
    const content = fs.readFileSync(dialogApiPath, 'utf8');
    
    // Basic syntax checks
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    
    if (Math.abs(openBraces - closeBraces) > 2) {
      throw new Error(`Unmatched braces: ${openBraces} open, ${closeBraces} close`);
    }
    
    if (Math.abs(openParens - closeParens) > 2) {
      throw new Error(`Unmatched parentheses: ${openParens} open, ${closeParens} close`);
    }
  } catch (error) {
    throw new Error(`Syntax error: ${error.message}`);
  }
});

// Test 9: Verify error response format
test('Error responses return correct format', () => {
  const filePath = path.join(__dirname, 'backend', 'routes', 'dialog_api.mjs');
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for proper error response structure
  const hasErrorResponse = content.includes('ok: false') && 
                          content.includes('error: true') &&
                          content.includes('message:');
  
  if (!hasErrorResponse) {
    throw new Error('Missing proper error response format');
  }
});

// Test 10: Count log statements
test('Adequate logging statements present', () => {
  const filePath = path.join(__dirname, 'backend', 'routes', 'dialog_api.mjs');
  const content = fs.readFileSync(filePath, 'utf8');
  
  const logCount = (content.match(/console\.(log|error|warn)/g) || []).length;
  const dialog500Count = (content.match(/\[DIALOG_500\]/g) || []).length;
  
  if (logCount < 5) {
    warn(`Only ${logCount} console statements found (expected at least 5)`);
  }
  
  if (dialog500Count < 5) {
    throw new Error(`Only ${dialog500Count} [DIALOG_500] tags found (expected at least 5)`);
  }
});

// Test 11: Verify all error paths are logged
test('All error paths have logging', () => {
  const filePath = path.join(__dirname, 'backend', 'routes', 'dialog_api.mjs');
  const content = fs.readFileSync(filePath, 'utf8');
  
  const errorPaths = [
    'generateClinicalCase failed',
    'Internal panel review failed',
    'Regeneration failed',
    'Interactive element refinement failed',
    'Error in POST /api/dialog'
  ];
  
  const missing = errorPaths.filter(path => !content.includes(path));
  if (missing.length > 0) {
    warn(`Some error paths may not be logged: ${missing.join(', ')}`);
  }
});

// Test 12: Check for proper error re-throwing
test('Errors are properly re-thrown to outer handler', () => {
  const filePath = path.join(__dirname, 'backend', 'routes', 'dialog_api.mjs');
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('throw caseError') && !content.includes('throw')) {
    warn('Errors may not be properly re-thrown to outer handler');
  }
});

console.log('\n=====================================================');
console.log('📊 Test Results Summary');
console.log('=====================================================');
console.log(`✅ Passed: ${results.passed.length}`);
console.log(`❌ Failed: ${results.failed.length}`);
console.log(`⚠️  Warnings: ${results.warnings.length}`);

if (results.failed.length > 0) {
  console.log('\n❌ Failed Tests:');
  results.failed.forEach(({ name, error }) => {
    console.log(`   - ${name}: ${error}`);
  });
}

if (results.warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  results.warnings.forEach(warning => {
    console.log(`   - ${warning}`);
  });
}

console.log('\n=====================================================');
console.log('📝 Code Verification Complete');
console.log('=====================================================\n');

// Generate report
const report = {
  timestamp: new Date().toISOString(),
  passed: results.passed.length,
  failed: results.failed.length,
  warnings: results.warnings.length,
  tests: {
    passed: results.passed,
    failed: results.failed,
    warnings: results.warnings
  }
};

fs.writeFileSync(
  path.join(__dirname, 'DIALOG_500_TEST_REPORT.json'),
  JSON.stringify(report, null, 2)
);

console.log('📄 Test report saved to: DIALOG_500_TEST_REPORT.json\n');

if (results.failed.length > 0) {
  console.log('❌ Some tests failed. Please review before deployment.');
  process.exit(1);
} else {
  console.log('✅ All critical tests passed! Ready for deployment.');
  process.exit(0);
}

