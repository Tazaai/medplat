/**
 * Test script to verify differential diagnoses with "for" and "against" reasoning
 * are short, relevant, and case-related
 */

const BACKEND_URL = 'https://medplat-backend-139218747785.europe-west1.run.app';

async function testDifferentialDiagnoses() {
  console.log('🧪 Testing Differential Diagnoses Generation\n');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Initialize case
    console.log('\n1️⃣ Initializing case...');
    const initResponse = await fetch(`${BACKEND_URL}/api/case/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'Cardiology',
        topic: 'Acute Myocardial Infarction',
        age: '54',
        sex: 'male',
        setting: 'Emergency Department'
      })
    });
    
    if (!initResponse.ok) {
      throw new Error(`Init failed: ${initResponse.status} ${await initResponse.text()}`);
    }
    
    const initData = await initResponse.json();
    const caseId = initData.data?.caseId || initData.caseId;
    
    if (!caseId) {
      throw new Error('No caseId returned from init');
    }
    
    console.log(`✅ Case initialized: ${caseId}`);
    console.log(`   Topic: ${initData.data?.meta?.topic || 'N/A'}`);
    
    // Step 2: Add history
    console.log('\n2️⃣ Adding history...');
    const historyResponse = await fetch(`${BACKEND_URL}/api/case/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId })
    });
    
    if (!historyResponse.ok) {
      throw new Error(`History failed: ${historyResponse.status}`);
    }
    
    const historyData = await historyResponse.json();
    console.log(`✅ History added`);
    console.log(`   Preview: ${(historyData.data?.history || '').substring(0, 100)}...`);
    
    // Step 3: Add physical exam
    console.log('\n3️⃣ Adding physical exam...');
    const examResponse = await fetch(`${BACKEND_URL}/api/case/exam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId })
    });
    
    if (!examResponse.ok) {
      throw new Error(`Exam failed: ${examResponse.status}`);
    }
    
    const examData = await examResponse.json();
    console.log(`✅ Physical exam added`);
    
    // Step 4: Add paraclinical (this generates differential diagnoses)
    console.log('\n4️⃣ Generating paraclinical and differential diagnoses...');
    const paraclinicalResponse = await fetch(`${BACKEND_URL}/api/case/paraclinical`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId })
    });
    
    if (!paraclinicalResponse.ok) {
      throw new Error(`Paraclinical failed: ${paraclinicalResponse.status}`);
    }
    
    const paraclinicalData = await paraclinicalResponse.json();
    console.log(`✅ Paraclinical generated`);
    
    // Step 5: Analyze differential diagnoses
    console.log('\n' + '='.repeat(60));
    console.log('📋 DIFFERENTIAL DIAGNOSES ANALYSIS\n');
    
    const differentials = paraclinicalData.data?.differential_diagnoses || [];
    const finalDiagnosis = paraclinicalData.data?.final_diagnosis || 'N/A';
    
    console.log(`Final Diagnosis: ${finalDiagnosis}\n`);
    console.log(`Found ${differentials.length} differential diagnoses:\n`);
    
    if (differentials.length === 0) {
      console.log('❌ ERROR: No differential diagnoses found!');
      return;
    }
    
    let allPassed = true;
    
    differentials.forEach((diff, index) => {
      console.log(`${index + 1}. ${diff.name || 'Unnamed'}`);
      
      const forReasoning = diff.for || diff.why_for || diff.FOR || '';
      const againstReasoning = diff.against || diff.why_against || diff.AGAINST || '';
      
      // Count words
      const forWords = forReasoning.split(/\s+/).filter(w => w.length > 0).length;
      const againstWords = againstReasoning.split(/\s+/).filter(w => w.length > 0).length;
      
      // Check length
      const forPass = forWords <= 30;
      const againstPass = againstWords <= 30;
      
      // Check for case history noise
      const caseHistoryPatterns = [
        /a \d+-year-old (male|female|patient) presents/i,
        /the patient is a \d+-year-old/i,
        /on auscultation/i,
        /lung auscultation reveals/i,
        /an ecg is performed/i,
        /laboratory tests including/i,
        /further supporting the focus on/i,
        /suggesting no acute/i,
        /and abdominal examination is unremarkable/i
      ];
      
      const forHasNoise = caseHistoryPatterns.some(pattern => pattern.test(forReasoning));
      const againstHasNoise = caseHistoryPatterns.some(pattern => pattern.test(againstReasoning));
      
      // Display results
      console.log(`   FOR: "${forReasoning}"`);
      console.log(`        Words: ${forWords} ${forPass ? '✅' : '❌'} (max 30)`);
      if (forHasNoise) {
        console.log(`        ⚠️  Contains case history noise`);
        allPassed = false;
      }
      
      console.log(`   AGAINST: "${againstReasoning}"`);
      console.log(`        Words: ${againstWords} ${againstPass ? '✅' : '❌'} (max 30)`);
      if (againstHasNoise) {
        console.log(`        ⚠️  Contains case history noise`);
        allPassed = false;
      }
      
      // Check relevance (should mention diagnosis or related terms)
      const diagnosisLower = (diff.name || '').toLowerCase();
      const forRelevant = diagnosisLower.length > 0 && 
        (forReasoning.toLowerCase().includes(diagnosisLower.split(' ')[0]) || 
         forReasoning.length > 10);
      const againstRelevant = diagnosisLower.length > 0 && 
        (againstReasoning.toLowerCase().includes(diagnosisLower.split(' ')[0]) || 
         againstReasoning.length > 10);
      
      if (!forRelevant && forReasoning.length > 0) {
        console.log(`        ⚠️  FOR reasoning may not be relevant to diagnosis`);
      }
      if (!againstRelevant && againstReasoning.length > 0) {
        console.log(`        ⚠️  AGAINST reasoning may not be relevant to diagnosis`);
      }
      
      if (!forPass || !againstPass) {
        allPassed = false;
      }
      
      console.log('');
    });
    
    // Summary
    console.log('='.repeat(60));
    console.log('\n📊 TEST SUMMARY\n');
    
    const avgForWords = differentials.reduce((sum, d) => {
      const forText = d.for || d.why_for || d.FOR || '';
      return sum + forText.split(/\s+/).filter(w => w.length > 0).length;
    }, 0) / differentials.length;
    
    const avgAgainstWords = differentials.reduce((sum, d) => {
      const againstText = d.against || d.why_against || d.AGAINST || '';
      return sum + againstText.split(/\s+/).filter(w => w.length > 0).length;
    }, 0) / differentials.length;
    
    console.log(`Average FOR words: ${avgForWords.toFixed(1)} (target: ≤30)`);
    console.log(`Average AGAINST words: ${avgAgainstWords.toFixed(1)} (target: ≤30)`);
    console.log(`\n${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}\n`);
    
    // Show case context for reference
    console.log('='.repeat(60));
    console.log('\n📝 CASE CONTEXT (for reference)\n');
    console.log(`History: ${(paraclinicalData.data?.history || '').substring(0, 200)}...`);
    console.log(`\nPhysical Exam: ${(paraclinicalData.data?.physical_exam || '').substring(0, 200)}...`);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testDifferentialDiagnoses();






