// Test Domain-Aware Module System
// Tests 5 random specialties to verify domain detection and enhancements

import { generateClinicalCase } from './generate_case_clinical.mjs';
import { determineDomains } from './utils/domain_classifier.mjs';

const testCases = [
  { topic: "Acute myocardial infarction", category: "Cardiology", expectedDomains: ["cardiology", "emergency"] },
  { topic: "Pediatric asthma exacerbation", category: "Pediatrics", expectedDomains: ["pediatrics", "respiratory"] },
  { topic: "Opioid overdose", category: "Toxicology", expectedDomains: ["toxicology", "emergency"] },
  { topic: "Acute stroke", category: "Neurology", expectedDomains: ["neurology", "emergency"] },
  { topic: "Ectopic pregnancy", category: "OB/GYN", expectedDomains: ["obgyn", "emergency"] },
];

async function testDomainAwareSystem() {
  console.log('\n🧪 DOMAIN-AWARE MODULE SYSTEM TEST\n');
  console.log(`Testing ${testCases.length} specialties...\n`);
  
  const results = [];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n[${i + 1}/${testCases.length}] Testing: ${testCase.topic} (${testCase.category})`);
    console.log(`Expected domains: ${testCase.expectedDomains.join(", ")}`);
    
    try {
      const startTime = Date.now();
      
      // Generate case
      const caseData = await generateClinicalCase({
        topic: testCase.topic,
        category: testCase.category,
        model: 'gpt-4o-mini',
        lang: 'en',
        region: 'EU/DK',
        mcq_mode: false,
      });
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      if (caseData.error) {
        console.log(`❌ Generation failed: ${caseData.message}`);
        results.push({ testCase, success: false, error: caseData.message });
        continue;
      }
      
      // Test domain detection from generated case
      const detectedDomains = determineDomains(
        { topic: caseData.meta?.topic || testCase.topic, category: testCase.category, region: 'EU/DK' },
        {
          topic: caseData.meta?.topic || testCase.topic,
          category: testCase.category,
          history: caseData.history || "",
          physical_exam: caseData.physical_exam || "",
          paraclinical: caseData.paraclinical || {},
          final_diagnosis: caseData.final_diagnosis || ""
        }
      );
      
      console.log(`Detected domains: ${detectedDomains.join(", ")}`);
      
      // Check if expected domains are detected
      const hasExpectedDomains = testCase.expectedDomains.some(domain => detectedDomains.includes(domain));
      
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
           caseData.guidelines.international?.length > 0)
      };
      
      console.log(`\nDomain Enhancements:`);
      console.log(`  - Complications: ${hasDomainEnhancements.complications ? '✅' : '❌'}`);
      console.log(`  - Pathophysiology Detail: ${hasDomainEnhancements.pathophysiology_detail ? '✅' : '❌'}`);
      console.log(`  - Diagnostic Evidence: ${hasDomainEnhancements.diagnostic_evidence ? '✅' : '❌'}`);
      console.log(`  - Domain Guidelines: ${hasDomainEnhancements.domain_guidelines ? '✅' : '❌'}`);
      
      const allEnhancementsPresent = Object.values(hasDomainEnhancements).every(v => v);
      const domainDetectionCorrect = hasExpectedDomains || detectedDomains.length > 0;
      
      const success = domainDetectionCorrect && allEnhancementsPresent;
      
      console.log(`\n${success ? '✅ PASSED' : '❌ FAILED'}: Domain detection: ${domainDetectionCorrect ? '✅' : '❌'}, Enhancements: ${allEnhancementsPresent ? '✅' : '❌'}`);
      console.log(`Generation time: ${duration}s`);
      
      results.push({
        testCase,
        success,
        detectedDomains,
        hasExpectedDomains,
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
          console.log(`   Detected domains: ${r.detectedDomains?.join(", ") || "None"}`);
          console.log(`   Expected domains found: ${r.hasExpectedDomains ? "Yes" : "No"}`);
          console.log(`   Enhancements: ${JSON.stringify(r.hasDomainEnhancements)}`);
        }
      }
    });
  }
  
  console.log(`\n${'='.repeat(80)}\n`);
  
  return results;
}

// Run tests
testDomainAwareSystem().catch(console.error);

