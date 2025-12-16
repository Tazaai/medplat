// Test script to verify all 3 models work correctly
// Tests: Lite (gpt-4o-mini), Flash (gpt-4o), Pro (gpt-5.1)

const API_BASE = 'https://medplat-backend-139218747785.europe-west1.run.app';

async function testModel(modelName, expectedBackendModel) {
  console.log(`\n🧪 Testing ${modelName} (should map to ${expectedBackendModel})...`);
  
  try {
    const response = await fetch(`${API_BASE}/api/case/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: 'sepsis',
        category: 'Infectious Diseases',
        model: modelName
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ ${modelName} failed: HTTP ${response.status} - ${errorText.substring(0, 200)}`);
      return false;
    }

    const data = await response.json();
    
    if (data.success && data.data) {
      const actualModel = data.data.model || 'unknown';
      console.log(`✅ ${modelName} succeeded!`);
      console.log(`   Backend model used: ${actualModel}`);
      console.log(`   Expected: ${expectedBackendModel}`);
      console.log(`   Match: ${actualModel === expectedBackendModel ? '✅' : '❌'}`);
      console.log(`   Case ID: ${data.caseId}`);
      return actualModel === expectedBackendModel;
    } else {
      console.error(`❌ ${modelName} failed: Invalid response`, data);
      return false;
    }
  } catch (error) {
    console.error(`❌ ${modelName} failed with error:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Testing all 3 models...\n');
  
  const results = {
    'Lite': await testModel('Lite', 'gpt-4o-mini'),
    'Flash': await testModel('Flash', 'gpt-4o'),
    'Pro': await testModel('Pro', 'gpt-5.1') // May fallback to gpt-4o if not available
  };

  console.log('\n📊 Test Results:');
  console.log('================');
  Object.entries(results).forEach(([model, passed]) => {
    console.log(`${model}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  });

  const allPassed = Object.values(results).every(r => r);
  console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed'}`);
  process.exit(allPassed ? 0 : 1);
}

runTests().catch(console.error);

