// Test script to generate 1-2 cases with 100% gpt-4o and print them fully
import { generateClinicalCase } from './generate_case_clinical.mjs';

async function testCaseGeneration() {
  console.log('='.repeat(80));
  console.log('TESTING 100% GPT-4O CASE GENERATION');
  console.log('='.repeat(80));
  
  const testCases = [
    { topic: 'acute myocardial infarction', category: 'Cardiology' },
    { topic: 'pneumonia', category: 'Pulmonology' }
  ];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n${'='.repeat(80)}`);
    console.log(`TEST CASE ${i + 1}: ${testCase.topic} (${testCase.category})`);
    console.log('='.repeat(80));
    console.log(`\n⏳ Generating case...\n`);
    
    try {
      const startTime = Date.now();
      const caseData = await generateClinicalCase({
        topic: testCase.topic,
        category: testCase.category,
        model: "gpt-4o",
        lang: "en",
        region: "global"
      });
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      console.log(`\n✅ Case generated successfully in ${duration}s\n`);
      console.log('='.repeat(80));
      console.log('FULL CASE OUTPUT:');
      console.log('='.repeat(80));
      console.log(JSON.stringify(caseData, null, 2));
      console.log('='.repeat(80));
      
      // Quick validation checks
      console.log('\n📋 QUICK VALIDATION:');
      console.log(`- History: ${caseData.history ? `${caseData.history.split('.').length} sentences` : 'MISSING'}`);
      console.log(`- Physical Exam: ${caseData.physical_exam ? `${caseData.physical_exam.split('.').length} sentences` : 'MISSING'}`);
      console.log(`- Final Diagnosis: ${caseData.final_diagnosis || 'MISSING'}`);
      console.log(`- Differentials: ${caseData.differential_diagnoses?.length || 0} items`);
      console.log(`- Complications: ${caseData.management?.complications ? 'Present' : 'MISSING'}`);
      console.log(`- Pharmacology: ${caseData.management?.pharmacology ? 'Present' : 'MISSING'}`);
      console.log(`- Expert Conference: ${caseData.expert_conference ? 'Present' : 'MISSING'}`);
      console.log(`- Pathophysiology: ${caseData.pathophysiology_detail ? 'Present' : 'MISSING'}`);
      console.log(`- Guidelines: ${caseData.guidelines ? 'Present' : 'MISSING'}`);
      
      if (i < testCases.length - 1) {
        console.log('\n⏳ Waiting 5 seconds before next test case...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.error(`\n❌ ERROR generating case ${i + 1}:`, error.message);
      console.error(error.stack);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80));
}

testCaseGeneration().catch(console.error);
