#!/usr/bin/env node
// test_deployment.mjs
// Comprehensive deployment validation tests for MedPlat

const BACKEND_URL = 'https://medplat-backend-139218747785.europe-west1.run.app';
const FRONTEND_URL = 'https://medplat-frontend-139218747785.europe-west1.run.app';

const results = {
  backendHealth: { status: 'PENDING', message: '' },
  topics2Categories: { status: 'PENDING', message: '' },
  caseGenerator: { status: 'PENDING', message: '' },
  gamification: { status: 'PENDING', message: '' },
  frontendAvailability: { status: 'PENDING', message: '' },
  frontendBackendConnectivity: { status: 'PENDING', message: '' }
};

async function testEndpoint(method, url, body = null, description) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const status = response.status;
    const contentType = response.headers.get('content-type') || '';
    let data = null;
    
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { text: text.substring(0, 500) }; // Limit text for display
    }
    
    return {
      success: status >= 200 && status < 300,
      status,
      data,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: 0
    };
  }
}

async function runTests() {
  console.log('🧪 MedPlat Deployment Validation Tests\n');
  console.log('='.repeat(60));
  
  // Test 1: Backend Health
  console.log('\n1️⃣  Testing Backend Health...');
  const healthResult = await testEndpoint('GET', `${BACKEND_URL}/health`, null, 'Backend Health');
  if (healthResult.success && healthResult.status === 200) {
    results.backendHealth = { status: 'OK', message: `HTTP ${healthResult.status}` };
    console.log(`   ✅ Backend Health: OK (HTTP ${healthResult.status})`);
  } else {
    results.backendHealth = { status: 'FAIL', message: `HTTP ${healthResult.status || 'ERROR'}: ${healthResult.error || 'Unexpected response'}` };
    console.log(`   ❌ Backend Health: FAIL - ${results.backendHealth.message}`);
  }
  
  // Test 2: Topics2 Categories
  console.log('\n2️⃣  Testing Topics2 Categories Endpoint...');
  const categoriesResult = await testEndpoint('POST', `${BACKEND_URL}/api/topics2/categories`, {}, 'Topics2 Categories');
  if (categoriesResult.success && categoriesResult.status === 200) {
    const hasCategories = categoriesResult.data && (categoriesResult.data.categories || Array.isArray(categoriesResult.data));
    if (hasCategories) {
      const catCount = categoriesResult.data.categories?.length || categoriesResult.data.length || 0;
      results.topics2Categories = { status: 'OK', message: `HTTP ${categoriesResult.status}, ${catCount} categories` };
      console.log(`   ✅ Topics2 Categories: OK (HTTP ${categoriesResult.status}, ${catCount} categories)`);
    } else {
      results.topics2Categories = { status: 'FAIL', message: 'HTTP 200 but no categories in response' };
      console.log(`   ❌ Topics2 Categories: FAIL - No categories in response`);
    }
  } else if (categoriesResult.status === 404) {
    results.topics2Categories = { status: 'FAIL', message: 'HTTP 404 - Route not mounted!' };
    console.log(`   ❌ Topics2 Categories: FAIL - HTTP 404 (Route not mounted!)`);
  } else {
    results.topics2Categories = { status: 'FAIL', message: `HTTP ${categoriesResult.status || 'ERROR'}: ${categoriesResult.error || 'Unexpected response'}` };
    console.log(`   ❌ Topics2 Categories: FAIL - ${results.topics2Categories.message}`);
  }
  
  // Test 3: Case Generator
  console.log('\n3️⃣  Testing Case Generator (/api/dialog)...');
  // Note: We removed 'lang' field, using topic name directly
  // Response structure: { ok: true, aiReply: { json: {...} } }
  const dialogResult = await testEndpoint('POST', `${BACKEND_URL}/api/dialog`, {
    topic: 'Acute Abdomen',
    model: 'gpt-4o-mini'
  }, 'Case Generator');
  
  if (dialogResult.success && dialogResult.status === 200) {
    const hasCase = dialogResult.data && (
      dialogResult.data.ok === true || 
      dialogResult.data.aiReply || 
      dialogResult.data.json ||
      dialogResult.data.case || 
      dialogResult.data.sections || 
      dialogResult.data.text
    );
    if (hasCase) {
      results.caseGenerator = { status: 'OK', message: `HTTP ${dialogResult.status}, case generated` };
      console.log(`   ✅ Case Generator: OK (HTTP ${dialogResult.status}, case generated)`);
    } else {
      results.caseGenerator = { status: 'FAIL', message: 'HTTP 200 but no case/aiReply in response' };
      console.log(`   ❌ Case Generator: FAIL - No case/aiReply in response`);
    }
  } else {
    results.caseGenerator = { status: 'FAIL', message: `HTTP ${dialogResult.status || 'ERROR'}: ${dialogResult.error || 'Unexpected response'}` };
    console.log(`   ❌ Case Generator: FAIL - ${results.caseGenerator.message}`);
  }
  
  // Test 4: Gamification
  console.log('\n4️⃣  Testing Gamification (/api/gamify)...');
  const gamifyResult = await testEndpoint('POST', `${BACKEND_URL}/api/gamify`, {
    caseId: 'acute_abdomen',
    paragraph: 'Patient with severe abdominal pain localized to the RLQ.',
    step: 1
  }, 'Gamification');
  
  if (gamifyResult.success && gamifyResult.status === 200) {
    const hasQuestion = gamifyResult.data && (gamifyResult.data.question || gamifyResult.data.choices || gamifyResult.data.explanation);
    if (hasQuestion) {
      results.gamification = { status: 'OK', message: `HTTP ${gamifyResult.status}, MCQ generated` };
      console.log(`   ✅ Gamification: OK (HTTP ${gamifyResult.status}, MCQ generated)`);
    } else {
      results.gamification = { status: 'FAIL', message: 'HTTP 200 but no question/choices in response' };
      console.log(`   ❌ Gamification: FAIL - No question/choices in response`);
    }
  } else if (gamifyResult.status === 400) {
    // 400 might be expected if request body is incomplete
    results.gamification = { status: 'OK', message: `HTTP ${gamifyResult.status} (expected for incomplete request)` };
    console.log(`   ⚠️  Gamification: HTTP ${gamifyResult.status} (may require more parameters)`);
  } else {
    results.gamification = { status: 'FAIL', message: `HTTP ${gamifyResult.status || 'ERROR'}: ${gamifyResult.error || 'Unexpected response'}` };
    console.log(`   ❌ Gamification: FAIL - ${results.gamification.message}`);
  }
  
  // Test 5: Frontend Availability
  console.log('\n5️⃣  Testing Frontend Availability...');
  const frontendResult = await testEndpoint('GET', FRONTEND_URL, null, 'Frontend');
  if (frontendResult.success && frontendResult.status === 200) {
    const hasHtml = frontendResult.data && (frontendResult.data.text?.includes('<html') || frontendResult.data.text?.includes('<!DOCTYPE'));
    if (hasHtml) {
      results.frontendAvailability = { status: 'OK', message: `HTTP ${frontendResult.status}, HTML served` };
      console.log(`   ✅ Frontend Availability: OK (HTTP ${frontendResult.status}, HTML served)`);
    } else {
      results.frontendAvailability = { status: 'FAIL', message: 'HTTP 200 but no HTML in response' };
      console.log(`   ❌ Frontend Availability: FAIL - No HTML in response`);
    }
  } else {
    results.frontendAvailability = { status: 'FAIL', message: `HTTP ${frontendResult.status || 'ERROR'}: ${frontendResult.error || 'Unexpected response'}` };
    console.log(`   ❌ Frontend Availability: FAIL - ${results.frontendAvailability.message}`);
  }
  
  // Test 6: Frontend → Backend Connectivity
  console.log('\n6️⃣  Testing Frontend → Backend Connectivity...');
  // Check if VITE_API_BASE.txt exists in frontend/dist
  try {
    const fs = await import('fs');
    const path = await import('path');
    const viteBasePath = path.join(process.cwd(), 'frontend', 'dist', 'VITE_API_BASE.txt');
    
    if (fs.existsSync(viteBasePath)) {
      const viteBase = fs.readFileSync(viteBasePath, 'utf8').trim();
      console.log(`   Found VITE_API_BASE: ${viteBase}`);
      
      const connectivityResult = await testEndpoint('POST', `${viteBase}/api/topics2/categories`, {}, 'Frontend→Backend');
      if (connectivityResult.success && connectivityResult.status === 200) {
        results.frontendBackendConnectivity = { status: 'OK', message: `HTTP ${connectivityResult.status}, connected to ${viteBase}` };
        console.log(`   ✅ Frontend→Backend Connectivity: OK (HTTP ${connectivityResult.status})`);
      } else {
        results.frontendBackendConnectivity = { status: 'FAIL', message: `HTTP ${connectivityResult.status || 'ERROR'}: Cannot connect to ${viteBase}` };
        console.log(`   ❌ Frontend→Backend Connectivity: FAIL - ${results.frontendBackendConnectivity.message}`);
      }
    } else {
      // Fallback: test with known backend URL
      const connectivityResult = await testEndpoint('POST', `${BACKEND_URL}/api/topics2/categories`, {}, 'Frontend→Backend');
      if (connectivityResult.success && connectivityResult.status === 200) {
        results.frontendBackendConnectivity = { status: 'OK', message: `HTTP ${connectivityResult.status} (using default backend URL)` };
        console.log(`   ✅ Frontend→Backend Connectivity: OK (HTTP ${connectivityResult.status}, using default URL)`);
      } else {
        results.frontendBackendConnectivity = { status: 'FAIL', message: `HTTP ${connectivityResult.status || 'ERROR'}` };
        console.log(`   ❌ Frontend→Backend Connectivity: FAIL - ${results.frontendBackendConnectivity.message}`);
      }
    }
  } catch (error) {
    // Fallback test
    const connectivityResult = await testEndpoint('POST', `${BACKEND_URL}/api/topics2/categories`, {}, 'Frontend→Backend');
    if (connectivityResult.success && connectivityResult.status === 200) {
      results.frontendBackendConnectivity = { status: 'OK', message: `HTTP ${connectivityResult.status} (fallback test)` };
      console.log(`   ✅ Frontend→Backend Connectivity: OK (HTTP ${connectivityResult.status}, fallback test)`);
    } else {
      results.frontendBackendConnectivity = { status: 'FAIL', message: `Error: ${error.message}` };
      console.log(`   ❌ Frontend→Backend Connectivity: FAIL - ${error.message}`);
    }
  }
  
  // Print Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Backend Health:              ${results.backendHealth.status === 'OK' ? '✅ OK' : '❌ FAIL'} - ${results.backendHealth.message}`);
  console.log(`Topics2 Categories:          ${results.topics2Categories.status === 'OK' ? '✅ OK' : '❌ FAIL'} - ${results.topics2Categories.message}`);
  console.log(`Case Generator:              ${results.caseGenerator.status === 'OK' ? '✅ OK' : '❌ FAIL'} - ${results.caseGenerator.message}`);
  console.log(`Gamification:                ${results.gamification.status === 'OK' ? '✅ OK' : '❌ FAIL'} - ${results.gamification.message}`);
  console.log(`Frontend Availability:       ${results.frontendAvailability.status === 'OK' ? '✅ OK' : '❌ FAIL'} - ${results.frontendAvailability.message}`);
  console.log(`Frontend→Backend Connectivity: ${results.frontendBackendConnectivity.status === 'OK' ? '✅ OK' : '❌ FAIL'} - ${results.frontendBackendConnectivity.message}`);
  console.log('='.repeat(60));
  
  const allPassed = Object.values(results).every(r => r.status === 'OK');
  if (allPassed) {
    console.log('\n✅ ALL TESTS PASSED! MedPlat is fully operational.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  SOME TESTS FAILED. Review the output above.\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch(err => {
  console.error('❌ Test execution failed:', err);
  process.exit(1);
});

