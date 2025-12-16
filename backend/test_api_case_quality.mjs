// API-based case quality test (can be run against deployed service)
// Run: node backend/test_api_case_quality.mjs [backend-url]

import https from 'https';
import http from 'http';

const BACKEND_URL = process.argv[2] || 'https://medplat-backend-139218747785.europe-west1.run.app';

console.log('🧪 Testing Case Quality via API');
console.log(`Backend URL: ${BACKEND_URL}\n`);
console.log('='.repeat(60));

function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(data))
      }
    };
    
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function testCaseGeneration(topic, category) {
  console.log(`\n📋 Testing: ${topic} (${category})`);
  console.log('-'.repeat(60));
  
  try {
    const requestData = {
      topic: topic,
      category: category,
      lang: 'en',
      region: 'US',
      mode: 'classic'
    };
    
    console.log('⏳ Generating case via API...');
    const response = await makeRequest(`${BACKEND_URL}/api/dialog/generate-case`, requestData);
    
    if (response.status !== 200) {
      console.log(`❌ API returned status ${response.status}`);
      return { passed: false, error: `HTTP ${response.status}` };
    }
    
    const caseData = response.data;
    if (!caseData) {
      console.log('❌ No case data returned');
      return { passed: false, error: 'No data' };
    }
    
    const checks = {
      hasDifferentials: Array.isArray(caseData.differential_diagnoses) && caseData.differential_diagnoses.length > 0,
      hasJustifications: true,
      noPlaceholders: true,
      hasManagement: !!caseData.management,
      hasReasoning: Array.isArray(caseData.reasoning_chain) && caseData.reasoning_chain.length > 0
    };
    
    // Check differential justifications
    if (checks.hasDifferentials) {
      const differentials = caseData.differential_diagnoses;
      const missingJustification = differentials.filter(diff => {
        if (typeof diff === 'object' && diff !== null) {
          const just = diff.justification || "";
          return !just || 
                 just.toLowerCase().includes("no justification") ||
                 just.trim().length === 0;
        }
        return true; // String format needs conversion
      });
      checks.hasJustifications = missingJustification.length === 0;
    }
    
    // Check for placeholders
    const caseString = JSON.stringify(caseData).toLowerCase();
    const hasPlaceholders = caseString.includes('[object object]') ||
                           caseString.includes('see case analysis') ||
                           caseString.includes('not provided') ||
                           caseString.includes('placeholder');
    checks.noPlaceholders = !hasPlaceholders;
    
    // Check for template bleed (reasoning should reference case data)
    if (checks.hasReasoning) {
      const reasoningText = caseData.reasoning_chain.join(' ').toLowerCase();
      // Simple check: reasoning should mention patient/history/exam, not just generic steps
      const hasCaseContext = reasoningText.includes('patient') ||
                            reasoningText.includes('history') ||
                            reasoningText.includes('exam') ||
                            reasoningText.includes('finding');
      checks.hasCaseContext = hasCaseContext;
    }
    
    // Results
    console.log('📊 Quality Checks:');
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`  ${passed ? '✅' : '❌'} ${check.replace(/([A-Z])/g, ' $1').trim()}`);
    });
    
    const allPassed = Object.values(checks).every(v => v === true);
    
    return {
      passed: allPassed,
      checks,
      topic,
      category
    };
    
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    return { passed: false, error: error.message };
  }
}

async function runTests() {
  const testCases = [
    { topic: 'Routine hypertension follow-up', category: 'Cardiology' },
    { topic: 'Acute ST-elevation myocardial infarction', category: 'Cardiology' },
    { topic: 'Community-acquired pneumonia', category: 'Respiratory' }
  ];
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await testCaseGeneration(testCase.topic, testCase.category);
    results.push(result);
    
    // Delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 FINAL SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log(`Tests Passed: ${passed}/${total}`);
  
  results.forEach(r => {
    console.log(`\n${r.topic}:`);
    console.log(`  Status: ${r.passed ? '✅ PASS' : '❌ FAIL'}`);
    if (r.error) {
      console.log(`  Error: ${r.error}`);
    }
    if (r.checks) {
      const failedChecks = Object.entries(r.checks)
        .filter(([_, passed]) => !passed)
        .map(([name, _]) => name);
      if (failedChecks.length > 0) {
        console.log(`  Failed checks: ${failedChecks.join(', ')}`);
      }
    }
  });
  
  console.log('\n✅ API case quality testing completed!');
}

// Check if backend is reachable first
console.log('🔍 Checking backend availability...');
makeRequest(`${BACKEND_URL}/health`, {})
  .then(() => {
    console.log('✅ Backend is reachable\n');
    runTests().catch(console.error);
  })
  .catch((error) => {
    console.log(`⚠️  Backend health check failed: ${error.message}`);
    console.log('Attempting to run tests anyway...\n');
    runTests().catch(console.error);
  });
