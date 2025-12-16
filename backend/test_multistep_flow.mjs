// Test multi-step case generation flow
import fetch from 'node-fetch';

const BACKEND_URL = 'https://medplat-backend-139218747785.europe-west1.run.app';

async function testMultiStepFlow() {
  console.log('🧪 Testing Multi-Step Case Generation Flow...\n');

  try {
    // Step 1: Initialize case
    console.log('1️⃣ Testing POST /api/case/init...');
    const initRes = await fetch(`${BACKEND_URL}/api/case/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: 'Acute Myocardial Infarction',
        category: 'Cardiology',
        lang: 'en',
        region: 'global'
      })
    });
    const initData = await initRes.json();
    if (!initData.ok || !initData.caseId) {
      throw new Error('Init failed: ' + JSON.stringify(initData));
    }
    const caseId = initData.caseId;
    console.log(`   ✅ Case initialized: ${caseId}\n`);

    // Step 2: Generate history
    console.log('2️⃣ Testing POST /api/case/history...');
    const historyRes = await fetch(`${BACKEND_URL}/api/case/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId })
    });
    const historyData = await historyRes.json();
    if (!historyData.ok) {
      throw new Error('History failed: ' + JSON.stringify(historyData));
    }
    console.log(`   ✅ History generated (length: ${historyData.case?.history?.length || 0} chars)\n`);

    // Step 3: Generate exam
    console.log('3️⃣ Testing POST /api/case/exam...');
    const examRes = await fetch(`${BACKEND_URL}/api/case/exam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId })
    });
    const examData = await examRes.json();
    if (!examData.ok) {
      throw new Error('Exam failed: ' + JSON.stringify(examData));
    }
    console.log(`   ✅ Exam generated (length: ${examData.case?.physical_exam?.length || 0} chars)\n`);

    // Step 4: Generate paraclinical
    console.log('4️⃣ Testing POST /api/case/paraclinical...');
    const paraclinicalRes = await fetch(`${BACKEND_URL}/api/case/paraclinical`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId })
    });
    const paraclinicalData = await paraclinicalRes.json();
    if (!paraclinicalData.ok) {
      throw new Error('Paraclinical failed: ' + JSON.stringify(paraclinicalData));
    }
    console.log(`   ✅ Paraclinical generated\n`);

    // Step 5: Generate management (optional)
    console.log('5️⃣ Testing POST /api/case/expand/management...');
    const managementRes = await fetch(`${BACKEND_URL}/api/case/expand/management`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId })
    });
    const managementData = await managementRes.json();
    if (!managementData.ok) {
      throw new Error('Management failed: ' + JSON.stringify(managementData));
    }
    console.log(`   ✅ Management generated\n`);

    // Final case summary
    const finalCase = managementData.case;
    console.log('📋 Final Case Summary:');
    console.log(`   - Topic: ${finalCase.meta?.topic || 'N/A'}`);
    console.log(`   - History: ${finalCase.history ? '✅' : '❌'}`);
    console.log(`   - Physical Exam: ${finalCase.physical_exam ? '✅' : '❌'}`);
    console.log(`   - Paraclinical: ${finalCase.paraclinical ? '✅' : '❌'}`);
    console.log(`   - Management: ${finalCase.management ? '✅' : '❌'}`);

    console.log('\n✅ Multi-step flow test PASSED!');
    return true;
  } catch (error) {
    console.error('\n❌ Multi-step flow test FAILED:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    return false;
  }
}

testMultiStepFlow().then(success => {
  process.exit(success ? 0 : 1);
});
