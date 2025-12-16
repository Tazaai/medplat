// Test script to verify case quality and all improvements
// Run: node backend/test_case_quality.mjs

import { generateClinicalCase } from './generate_case_clinical.mjs';
import { runInternalPanel } from './intelligence_core/internal_panel.mjs';
import { scanForPlaceholders } from './intelligence_core/qa_engine.mjs';
import { validateAcuityConsistency } from './intelligence_core/case_validator.mjs';

console.log('🧪 Testing Case Quality - All Improvements\n');
console.log('='.repeat(60));

// Test cases covering different scenarios
const testCases = [
  {
    name: 'Low-Acuity Case (Hypertension)',
    params: {
      topic: 'Routine hypertension follow-up',
      category: 'Cardiology',
      model: 'gpt-4o-mini',
      lang: 'en',
      region: 'US',
      mcq_mode: false,
      mode: 'classic'
    },
    checks: {
      noHighAcuityScripts: true,
      noABCSteps: true,
      hasJustifications: true,
      noPlaceholders: true
    }
  },
  {
    name: 'High-Acuity Case (Acute MI)',
    params: {
      topic: 'Acute ST-elevation myocardial infarction',
      category: 'Cardiology',
      model: 'gpt-4o-mini',
      lang: 'en',
      region: 'US',
      mcq_mode: false,
      mode: 'classic'
    },
    checks: {
      hasHighAcuityScripts: true,
      hasEscalationTriggers: true,
      hasJustifications: true,
      noPlaceholders: true,
      hasStructuredABG: false // Optional
    }
  },
  {
    name: 'Infection Pattern Case (Pneumonia)',
    params: {
      topic: 'Community-acquired pneumonia',
      category: 'Respiratory',
      model: 'gpt-4o-mini',
      lang: 'en',
      region: 'US',
      mcq_mode: false,
      mode: 'classic'
    },
    checks: {
      hasInfectionTriggerManagement: true,
      hasJustifications: true,
      noPlaceholders: true,
      hasRuleInRuleOut: true
    }
  },
  {
    name: 'Renal Case (No Cardiac Logic)',
    params: {
      topic: 'Acute kidney injury',
      category: 'Nephrology',
      model: 'gpt-4o-mini',
      lang: 'en',
      region: 'US',
      mcq_mode: false,
      mode: 'classic'
    },
    checks: {
      noCardiacLogic: true, // Should not have ACS/chest pain logic
      hasJustifications: true,
      noPlaceholders: true,
      noTemplateBleed: true
    }
  }
];

async function testCaseQuality(testCase) {
  console.log(`\n📋 Testing: ${testCase.name}`);
  console.log('-'.repeat(60));
  
  try {
    // Generate case
    console.log('⏳ Generating case...');
    const generatedCase = await generateClinicalCase(testCase.params);
    
    if (!generatedCase) {
      console.log('❌ FAIL: Case generation returned null/undefined');
      return { passed: false, errors: ['Case generation failed'] };
    }
    
    const errors = [];
    const warnings = [];
    const passed = [];
    
    // Check 1: Template Bleed Prevention
    if (testCase.checks.noTemplateBleed || testCase.checks.noCardiacLogic) {
      const reasoningChain = generatedCase.reasoning_chain || [];
      const reasoningText = reasoningChain.join(' ').toLowerCase();
      
      // Check for cross-topic residues
      if (testCase.checks.noCardiacLogic) {
        const hasCardiacLogic = reasoningText.includes('chest pain') || 
                               reasoningText.includes('troponin') ||
                               reasoningText.includes('st elevation') ||
                               reasoningText.includes('acs');
        if (hasCardiacLogic && !testCase.params.topic.toLowerCase().includes('cardiac')) {
          errors.push('Template bleed detected: Cardiac logic in non-cardiac case');
        } else {
          passed.push('✓ No template bleed (no cardiac logic in renal case)');
        }
      }
      
      // Check if reasoning starts from case context
      if (reasoningChain.length > 0) {
        const firstStep = String(reasoningChain[0]).toLowerCase();
        const hasGenericStart = firstStep.includes('assess') && !firstStep.includes('patient') &&
                               !firstStep.includes('history') && !firstStep.includes('exam');
        if (hasGenericStart) {
          warnings.push('⚠ Reasoning chain may start with generic template');
        } else {
          passed.push('✓ Reasoning chain starts from case context');
        }
      }
    }
    
    // Check 2: Section Validity
    if (testCase.checks.noPlaceholders) {
      const placeholders = scanForPlaceholders(generatedCase);
      if (placeholders.length > 0) {
        errors.push(`Placeholders detected: ${placeholders.length} found`);
        console.log(`   Found placeholders:`, placeholders.slice(0, 3).map(p => p.path));
      } else {
        passed.push('✓ No placeholders detected');
      }
      
      // Check for empty sections that should be hidden
      const emptySections = [];
      if (!generatedCase.complications || generatedCase.complications.length === 0) {
        // This is OK if case doesn't need complications
      }
      if (generatedCase.differential_diagnoses && generatedCase.differential_diagnoses.length === 0) {
        errors.push('Differential diagnoses section is empty');
      }
    }
    
    // Check 3: Differential Justifications
    if (testCase.checks.hasJustifications) {
      const differentials = generatedCase.differential_diagnoses || [];
      const missingJustification = differentials.filter(diff => {
        if (typeof diff === 'string') return true;
        if (typeof diff === 'object' && diff !== null) {
          const just = diff.justification || "";
          return !just || 
                 just.toLowerCase().includes("no justification") ||
                 just.toLowerCase().includes("not provided") ||
                 just.trim().length === 0;
        }
        return false;
      });
      
      if (missingJustification.length > 0) {
        errors.push(`${missingJustification.length} differentials missing justification`);
      } else {
        passed.push(`✓ All ${differentials.length} differentials have justification`);
      }
    }
    
    // Check 4: Rule-In/Rule-Out Format
    if (testCase.checks.hasRuleInRuleOut) {
      const reasoningChain = generatedCase.reasoning_chain || [];
      const reasoningText = reasoningChain.join(' ').toLowerCase();
      const hasRuleIn = reasoningText.includes('rule in') || reasoningText.includes('rule-in');
      const hasRuleOut = reasoningText.includes('rule out') || reasoningText.includes('rule-out');
      
      if (!hasRuleIn && !hasRuleOut) {
        warnings.push('⚠ Reasoning may not use structured rule-in/rule-out format');
      } else {
        passed.push('✓ Reasoning uses rule-in/rule-out format');
      }
    }
    
    // Check 5: High-Acuity Scripts
    if (testCase.checks.noHighAcuityScripts) {
      const management = generatedCase.management?.initial || "";
      const hasHighAcuityPrefix = management.includes("HIGH-ACUITY");
      const reasoningChain = generatedCase.reasoning_chain || [];
      const hasABCSteps = reasoningChain.some(step => 
        String(step).toLowerCase().includes("assess and secure airway")
      );
      
      if (hasHighAcuityPrefix || hasABCSteps) {
        errors.push('High-acuity scripts found in low-acuity case');
      } else {
        passed.push('✓ No high-acuity scripts in low-acuity case');
      }
    }
    
    if (testCase.checks.hasHighAcuityScripts) {
      const management = generatedCase.management?.initial || "";
      const hasHighAcuityPrefix = management.includes("HIGH-ACUITY");
      if (!hasHighAcuityPrefix) {
        warnings.push('⚠ High-acuity case may be missing HIGH-ACUITY prefix');
      } else {
        passed.push('✓ High-acuity case has HIGH-ACUITY prefix');
      }
    }
    
    // Check 6: Escalation Triggers
    if (testCase.checks.hasEscalationTriggers) {
      const management = JSON.stringify(generatedCase.management || {}).toLowerCase();
      const hasICUTrigger = management.includes('icu') && (management.includes('respiratory rate') || 
                                                           management.includes('gcs') ||
                                                           management.includes('transfer'));
      const hasDialysisTrigger = management.includes('dialysis') && (management.includes('creatinine') ||
                                                                    management.includes('hyperkalemia'));
      
      if (!hasICUTrigger && !hasDialysisTrigger) {
        warnings.push('⚠ Escalation triggers may not be explicit enough');
      } else {
        passed.push('✓ Explicit escalation triggers found');
      }
    }
    
    // Check 7: Infection Trigger Management
    if (testCase.checks.hasInfectionTriggerManagement) {
      const history = (generatedCase.history || "").toLowerCase();
      const hasFever = history.includes('fever') || history.includes('temperature');
      const management = JSON.stringify(generatedCase.management || {}).toLowerCase();
      const hasAntimicrobial = management.includes('antibiotic') || management.includes('antimicrobial') ||
                               management.includes('treatment');
      
      if (hasFever && !hasAntimicrobial) {
        warnings.push('⚠ Infection pattern may not have explicit management');
      } else {
        passed.push('✓ Infection trigger management present');
      }
    }
    
    // Check 8: Internal Consistency
    const consistency = validateAcuityConsistency(generatedCase);
    if (!consistency.isValid) {
      warnings.push(`⚠ Acuity consistency issues: ${consistency.errors.length} errors, ${consistency.warnings.length} warnings`);
    } else {
      passed.push('✓ Acuity consistency validated');
    }
    
    // Check 9: Guidelines/LMIC Cleanup
    const guidelines = generatedCase.guidelines || [];
    const hasRawJSON = guidelines.some(g => {
      if (typeof g === 'string') {
        try {
          JSON.parse(g);
          return true; // String contains JSON
        } catch (e) {
          return false;
        }
      }
      return false;
    });
    
    if (hasRawJSON) {
      errors.push('Raw JSON detected in guidelines');
    } else {
      passed.push('✓ Guidelines properly normalized (no raw JSON)');
    }
    
    // Check 10: Expert Conference Realism
    const expertConference = generatedCase.expert_conference || "";
    const hasDisagreement = expertConference.toLowerCase().includes('disagree') ||
                           expertConference.toLowerCase().includes('debate') ||
                           expertConference.toLowerCase().includes('argue');
    const hasTemplatedConfirmation = expertConference.toLowerCase().includes('all agree') &&
                                    !expertConference.toLowerCase().includes('disagree');
    
    if (hasTemplatedConfirmation) {
      warnings.push('⚠ Expert conference may have templated confirmation');
    } else if (hasDisagreement) {
      passed.push('✓ Expert conference has disagreement/realism');
    } else {
      warnings.push('⚠ Expert conference may lack disagreement');
    }
    
    // Run internal panel review
    console.log('⏳ Running internal panel review...');
    const domains = testCase.params.category ? [testCase.params.category.toLowerCase()] : [];
    const panelResult = await runInternalPanel(generatedCase, {
      domains: domains,
      isLMIC: false,
      region: testCase.params.region || 'US',
      acuity: generatedCase.meta?.acuity || 'moderate'
    });
    
    console.log(`   Panel quality score: ${panelResult.case_quality_score?.toFixed(2) || 'N/A'}`);
    console.log(`   Regenerate required: ${panelResult.regenerate_case || false}`);
    console.log(`   Critical issues: ${panelResult.critical_safety_issues?.length || 0}`);
    
    if (panelResult.critical_safety_issues && panelResult.critical_safety_issues.length > 0) {
      errors.push(`Panel detected ${panelResult.critical_safety_issues.length} critical safety issues`);
    }
    
    // Summary
    console.log('\n📊 Test Results:');
    passed.forEach(p => console.log(`   ${p}`));
    if (warnings.length > 0) {
      warnings.forEach(w => console.log(`   ${w}`));
    }
    if (errors.length > 0) {
      errors.forEach(e => console.log(`   ❌ ${e}`));
    }
    
    return {
      passed: errors.length === 0,
      errors,
      warnings,
      passedChecks: passed.length,
      qualityScore: panelResult.case_quality_score
    };
    
  } catch (error) {
    console.error(`   ❌ ERROR: ${error.message}`);
    console.error(error.stack);
    return { passed: false, errors: [error.message] };
  }
}

// Run all tests
async function runAllTests() {
  const results = [];
  
  for (const testCase of testCases) {
    const result = await testCaseQuality(testCase);
    results.push({
      name: testCase.name,
      ...result
    });
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 FINAL SUMMARY');
  console.log('='.repeat(60));
  
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const totalErrors = results.reduce((sum, r) => sum + (r.errors?.length || 0), 0);
  const totalWarnings = results.reduce((sum, r) => sum + (r.warnings?.length || 0), 0);
  const avgQualityScore = results
    .filter(r => r.qualityScore !== undefined)
    .reduce((sum, r) => sum + r.qualityScore, 0) / results.filter(r => r.qualityScore !== undefined).length;
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}/${totalTests}`);
  console.log(`Total Errors: ${totalErrors}`);
  console.log(`Total Warnings: ${totalWarnings}`);
  console.log(`Average Quality Score: ${avgQualityScore ? avgQualityScore.toFixed(2) : 'N/A'}`);
  
  results.forEach(r => {
    console.log(`\n${r.name}:`);
    console.log(`  Status: ${r.passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Passed Checks: ${r.passedChecks || 0}`);
    console.log(`  Quality Score: ${r.qualityScore ? r.qualityScore.toFixed(2) : 'N/A'}`);
    if (r.errors && r.errors.length > 0) {
      console.log(`  Errors: ${r.errors.length}`);
    }
    if (r.warnings && r.warnings.length > 0) {
      console.log(`  Warnings: ${r.warnings.length}`);
    }
  });
  
  console.log('\n✅ Case quality testing completed!');
}

// Run tests
runAllTests().catch(console.error);
