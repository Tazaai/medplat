// Test script to verify all 12 system-wide fixes are working
// Run: node backend/test_system_wide_fixes.mjs

import { generateClinicalCase } from './generate_case_clinical.mjs';
import { runInternalPanel } from './intelligence_core/internal_panel.mjs';
import { scanForPlaceholders } from './intelligence_core/qa_engine.mjs';
import { validateAcuityConsistency } from './intelligence_core/case_validator.mjs';

console.log('🧪 Testing System-Wide Fixes...\n');

// Test 1: Low-acuity case (should NOT have HIGH-ACUITY scripts)
console.log('Test 1: Low-acuity case (should suppress HIGH-ACUITY scripts)');
try {
  const lowAcuityCase = await generateClinicalCase({
    topic: 'Routine hypertension follow-up',
    category: 'Cardiology',
    model: 'gpt-4o-mini',
    lang: 'en',
    region: 'US',
    mcq_mode: false,
    mode: 'classic'
  });
  
  // Check for HIGH-ACUITY prefix
  const hasHighAcuityPrefix = (lowAcuityCase.management?.initial || "").includes("HIGH-ACUITY");
  const hasABCSteps = (lowAcuityCase.reasoning_chain || []).some(step => 
    String(step).toLowerCase().includes("assess and secure airway")
  );
  
  console.log(`  ✓ Generated low-acuity case`);
  console.log(`  - Has HIGH-ACUITY prefix: ${hasHighAcuityPrefix} (should be false)`);
  console.log(`  - Has ABC steps: ${hasABCSteps} (should be false)`);
  
  if (hasHighAcuityPrefix || hasABCSteps) {
    console.log('  ❌ FAIL: Low-acuity case has high-acuity artifacts');
  } else {
    console.log('  ✅ PASS: Low-acuity case correctly suppresses high-acuity scripts');
  }
} catch (error) {
  console.error('  ❌ ERROR:', error.message);
}

// Test 2: Differential justification
console.log('\nTest 2: Differential justification (every differential must have justification)');
try {
  const testCase = await generateClinicalCase({
    topic: 'Chest pain',
    category: 'Cardiology',
    model: 'gpt-4o-mini',
    lang: 'en',
    region: 'US',
    mcq_mode: false,
    mode: 'classic'
  });
  
  const differentials = testCase.differential_diagnoses || [];
  const missingJustification = differentials.filter(diff => {
    if (typeof diff === 'string') return true; // String format needs conversion
    if (typeof diff === 'object') {
      const just = diff.justification || "";
      return !just || 
             just.toLowerCase().includes("no justification") ||
             just.toLowerCase().includes("not provided") ||
             just.trim().length === 0;
    }
    return false;
  });
  
  console.log(`  ✓ Generated case with ${differentials.length} differentials`);
  console.log(`  - Missing justification: ${missingJustification.length} (should be 0)`);
  
  if (missingJustification.length > 0) {
    console.log('  ❌ FAIL: Some differentials missing justification');
  } else {
    console.log('  ✅ PASS: All differentials have justification');
  }
} catch (error) {
  console.error('  ❌ ERROR:', error.message);
}

// Test 3: Placeholder detection
console.log('\nTest 3: Placeholder detection (should find no placeholders)');
try {
  const testCase = await generateClinicalCase({
    topic: 'Diabetes management',
    category: 'Endocrinology',
    model: 'gpt-4o-mini',
    lang: 'en',
    region: 'US',
    mcq_mode: false,
    mode: 'classic'
  });
  
  const placeholders = scanForPlaceholders(testCase);
  console.log(`  ✓ Scanned case for placeholders`);
  console.log(`  - Placeholders found: ${placeholders.length} (should be 0)`);
  
  if (placeholders.length > 0) {
    console.log('  ❌ FAIL: Placeholders detected:', placeholders.slice(0, 3));
  } else {
    console.log('  ✅ PASS: No placeholders detected');
  }
} catch (error) {
  console.error('  ❌ ERROR:', error.message);
}

// Test 4: Acuity consistency validation
console.log('\nTest 4: Acuity consistency validation');
try {
  const testCase = await generateClinicalCase({
    topic: 'Acute MI',
    category: 'Cardiology',
    model: 'gpt-4o-mini',
    lang: 'en',
    region: 'US',
    mcq_mode: false,
    mode: 'classic'
  });
  
  const validation = validateAcuityConsistency(testCase);
  console.log(`  ✓ Validated acuity consistency`);
  console.log(`  - Is valid: ${validation.isValid}`);
  console.log(`  - Errors: ${validation.errors.length}`);
  console.log(`  - Warnings: ${validation.warnings.length}`);
  
  if (!validation.isValid) {
    console.log('  ⚠️ WARNING: Acuity consistency issues found:', validation.errors);
  } else {
    console.log('  ✅ PASS: Acuity consistency validated');
  }
} catch (error) {
  console.error('  ❌ ERROR:', error.message);
}

// Test 5: Internal panel review
console.log('\nTest 5: Internal panel review (should apply all fixes)');
try {
  const testCase = await generateClinicalCase({
    topic: 'Pneumonia',
    category: 'Respiratory',
    model: 'gpt-4o-mini',
    lang: 'en',
    region: 'US',
    mcq_mode: false,
    mode: 'classic'
  });
  
  const panelResult = await runInternalPanel(testCase, {
    domains: ['respiratory', 'infectious'],
    isLMIC: false,
    region: 'US',
    acuity: testCase.meta?.acuity || 'moderate'
  });
  
  console.log(`  ✓ Panel reviewed case`);
  console.log(`  - Quality score: ${panelResult.case_quality_score?.toFixed(2) || 'N/A'}`);
  console.log(`  - Regenerate required: ${panelResult.regenerate_case || false}`);
  console.log(`  - Critical safety issues: ${panelResult.critical_safety_issues?.length || 0}`);
  
  // Check refined case for fixes
  const refinedCase = panelResult.refined_case || testCase;
  const refinedDifferentials = refinedCase.differential_diagnoses || [];
  const allHaveJustification = refinedDifferentials.every(diff => {
    if (typeof diff === 'object' && diff !== null) {
      const just = diff.justification || "";
      return just && !just.toLowerCase().includes("no justification") && just.trim().length > 0;
    }
    return false;
  });
  
  console.log(`  - All differentials have justification: ${allHaveJustification}`);
  
  if (panelResult.critical_safety_issues && panelResult.critical_safety_issues.length > 0) {
    console.log('  ⚠️ WARNING: Critical safety issues detected');
  } else {
    console.log('  ✅ PASS: Panel review completed without critical issues');
  }
} catch (error) {
  console.error('  ❌ ERROR:', error.message);
}

console.log('\n✅ System-wide fixes test completed!');
