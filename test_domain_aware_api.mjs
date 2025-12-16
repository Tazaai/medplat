// Test Domain-Aware System via API
const API_BASE = 'https://medplat-backend-139218747785.europe-west1.run.app';

const testCases = [
  { topic: "Acute myocardial infarction", category: "Cardiology", expectedDomains: ["cardiology"] },
  { topic: "Pediatric asthma exacerbation", category: "Pediatrics", expectedDomains: ["pediatrics", "respiratory"] },
  { topic: "Opioid overdose", category: "Toxicology", expectedDomains: ["toxicology"] },
  { topic: "Acute stroke", category: "Neurology", expectedDomains: ["neurology"] },
  { topic: "Ectopic pregnancy", category: "OB/GYN", expectedDomains: ["obgyn"] },
];

async function testDomainAwareSystem() {
  console.log('\n🧪 DOMAIN-AWARE MODULE SYSTEM TEST (via API)\n');
  console.log(`Testing ${testCases.length} specialties...\n`);
  
  const results = [];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n[${i + 1}/${testCases.length}] Testing: ${testCase.topic} (${testCase.category})`);
    console.log(`Expected domains: ${testCase.expectedDomains.join(", ")}`);
    
    try {
      const startTime = Date.now();
      
      const response = await fetch(`${API_BASE}/api/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: testCase.topic,
          category: testCase.category,
          language: 'en',
          region: 'EU/DK',
          level: 'intermediate',
          model: 'gpt-4o-mini',
        }),
      });
      
      const data = await response.json();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      if (!data.ok || data.error) {
        console.log(`❌ Generation failed: ${data.error || data.message}`);
        results.push({ testCase, success: false, error: data.error || data.message });
        continue;
      }
      
      const caseData = data.case;
      
      // Check for domain-specific enhancements
      const hasDomainEnhancements = {
        complications: caseData.management?.complications && 
          (caseData.management.complications.immediate?.length > 0 ||
           caseData.management.complications.early?.length > 0 ||
           caseData.management.complications.late?.length > 0),
        pathophysiology_detail: caseData.pathophysiology_detail &&
          Object.values(caseData.pathophysiology_detail).some(v => v && v !== ""),
        diagnostic_evidence: caseData.paraclinical?.diagnostic_evidence &&
          Object.keys(caseData.paraclinical.diagnostic_evidence).length > 0,
        domain_guidelines: caseData.guidelines &&
          (caseData.guidelines.usa?.length > 0 || 
           caseData.guidelines.continental?.length > 0 ||
           caseData.guidelines.international?.length > 0),
        pharmacology: caseData.management?.pharmacology &&
          (caseData.management.pharmacology.key_drugs?.length > 0 ||
           caseData.management.pharmacology.mechanisms_of_action)
      };
      
      console.log(`\nDomain Enhancements:`);
      console.log(`  - Complications: ${hasDomainEnhancements.complications ? '✅' : '❌'}`);
      console.log(`  - Pathophysiology Detail: ${hasDomainEnhancements.pathophysiology_detail ? '✅' : '❌'}`);
      console.log(`  - Diagnostic Evidence: ${hasDomainEnhancements.diagnostic_evidence ? '✅' : '❌'}`);
      console.log(`  - Domain Guidelines: ${hasDomainEnhancements.domain_guidelines ? '✅' : '❌'}`);
      console.log(`  - Pharmacology: ${hasDomainEnhancements.pharmacology ? '✅' : '❌'}`);
      
      // Check for domain-specific content in history/exam
      const historyText = (caseData.history || "").toLowerCase();
      const examText = (caseData.physical_exam || "").toLowerCase();
      const combinedText = `${historyText} ${examText}`;
      
      let domainDetected = false;
      if (testCase.expectedDomains.includes("cardiology")) {
        domainDetected = combinedText.includes("chest") || combinedText.includes("cardiac") || combinedText.includes("ecg");
      }
      if (testCase.expectedDomains.includes("toxicology")) {
        domainDetected = combinedText.includes("overdose") || combinedText.includes("substance") || combinedText.includes("opioid");
      }
      if (testCase.expectedDomains.includes("neurology")) {
        domainDetected = combinedText.includes("stroke") || combinedText.includes("neurological") || combinedText.includes("focal");
      }
      if (testCase.expectedDomains.includes("pediatrics")) {
        domainDetected = caseData.meta?.age?.includes("year") || combinedText.includes("pediatric") || combinedText.includes("child");
      }
      if (testCase.expectedDomains.includes("obgyn")) {
        domainDetected = combinedText.includes("pregnancy") || combinedText.includes("pelvic") || combinedText.includes("ectopic");
      }
      
      const allEnhancementsPresent = Object.values(hasDomainEnhancements).filter(v => v).length >= 3;
      const success = domainDetected && allEnhancementsPresent;
      
      console.log(`\n${success ? '✅ PASSED' : '❌ FAILED'}: Domain content detected: ${domainDetected ? '✅' : '❌'}, Enhancements (≥3): ${allEnhancementsPresent ? '✅' : '❌'}`);
      console.log(`Generation time: ${duration}s`);
      
      // Show sample of domain-specific content
      if (hasDomainEnhancements.complications) {
        console.log(`\nSample Complications:`);
        if (caseData.management.complications.immediate?.length > 0) {
          console.log(`  Immediate: ${caseData.management.complications.immediate[0]}`);
        }
      }
      
      results.push({
        testCase,
        success,
        domainDetected,
        hasDomainEnhancements,
        duration
      });
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      results.push({ testCase, success: false, error: error.message });
    }
  }
  
  // Summary
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('📊 DOMAIN-AWARE SYSTEM TEST SUMMARY');
  console.log(`${'='.repeat(80)}\n`);
  
  const passed = results.filter(r => r.success).length;
  const failed = results.length - passed;
  
  console.log(`Total test cases: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log(`\n❌ FAILED TEST CASES:`);
    results.forEach((r, i) => {
      if (!r.success) {
        console.log(`\n${i + 1}. ${r.testCase.topic} (${r.testCase.category}):`);
        if (r.error) {
          console.log(`   Error: ${r.error}`);
        } else {
          console.log(`   Domain detected: ${r.domainDetected ? "Yes" : "No"}`);
          console.log(`   Enhancements present: ${Object.values(r.hasDomainEnhancements).filter(v => v).length}/5`);
        }
      }
    });
  }
  
  console.log(`\n${'='.repeat(80)}\n`);
  
  return results;
}

// Run tests
testDomainAwareSystem().catch(console.error);

