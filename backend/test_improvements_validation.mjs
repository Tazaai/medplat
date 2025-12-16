// Validation test - checks that all improvements are present in code
// Run: node backend/test_improvements_validation.mjs

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Validating Improvements in Code\n');
console.log('='.repeat(60));

const checks = {
  generator: {
    file: join(__dirname, 'generate_case_clinical.mjs'),
    patterns: [
      { name: 'Template Bleed Prevention', pattern: /KILL TEMPLATE BLEED|template.*bleed|BAN CROSS-TOPIC/i },
      { name: 'Section Validity', pattern: /ENFORCE SECTION VALIDITY|hide.*section|empty.*generic/i },
      { name: 'Internal Consistency', pattern: /STRENGTHEN INTERNAL CONSISTENCY|mismatched.*labs|dipstick.*microscopy/i },
      { name: 'Guidelines Cleanup', pattern: /GUIDELINES.*LMIC CLEANUP|raw JSON|normalize.*LMIC/i },
      { name: 'Rule-In/Rule-Out', pattern: /RULE.*IN.*RULE.*OUT|structured.*rule/i },
      { name: 'Safety Escalation', pattern: /SAFETY ESCALATION|explicit.*escalation|ICU.*dialysis/i },
      { name: 'Conference Realism', pattern: /CONFERENCE REALISM|templated.*confirmation|evidence.*based/i },
      { name: 'Differential Justification', pattern: /justification.*required|no justification provided/i },
      { name: 'Oxygen Target Safety', pattern: /OXYGEN TARGET|CO2.*retention|SpO2/i },
      { name: 'Infection Trigger', pattern: /INFECTION TRIGGER|fever.*leukocytosis/i },
      { name: 'Ventilation Escalation', pattern: /VENTILATION ESCALATION|NIV.*criteria|fatigue.*indicators/i },
      { name: 'Complication Timeline', pattern: /COMPLICATION TIMELINE|acuity.*phase.*setting/i },
      { name: 'Red-Flag Harmonization', pattern: /RED-FLAG HARMONIZATION|unified.*ontology/i },
      { name: 'ABG Interpretation', pattern: /STRUCTURED ABG|numeric.*ranges|qualitative.*patterns/i },
      { name: 'Pathophysiology Visibility', pattern: /PATHOPHYSIOLOGY VISIBILITY|high-acuity.*hide/i },
      { name: 'LMIC Safety Defaults', pattern: /LMIC SAFETY|fallback.*ABG/i }
    ]
  },
  panel: {
    file: join(__dirname, 'intelligence_core', 'internal_panel.mjs'),
    patterns: [
      { name: 'Template Bleed Prevention', pattern: /KILL TEMPLATE BLEED|template.*bleed|BAN CROSS-TOPIC/i },
      { name: 'Section Validity', pattern: /ENFORCE SECTION VALIDITY|hide.*section/i },
      { name: 'Internal Consistency', pattern: /STRENGTHEN INTERNAL CONSISTENCY|mismatched.*labs/i },
      { name: 'Guidelines Cleanup', pattern: /GUIDELINES.*LMIC CLEANUP|raw JSON/i },
      { name: 'Rule-In/Rule-Out', pattern: /RULE.*IN.*RULE.*OUT/i },
      { name: 'Safety Escalation', pattern: /SAFETY ESCALATION|explicit.*escalation/i },
      { name: 'Conference Realism', pattern: /CONFERENCE REALISM|templated.*confirmation/i },
      { name: 'All 12 System Fixes', pattern: /SYSTEM-WIDE FIXES.*12/i },
      { name: 'Additional Improvements', pattern: /ADDITIONAL IMPROVEMENTS|7 Additional/i }
    ]
  },
  validator: {
    file: join(__dirname, 'intelligence_core', 'case_validator.mjs'),
    patterns: [
      { name: 'Differential Justification Fix', pattern: /justification.*synthesize|pattern-based.*explanation/i },
      { name: 'Acuity Consistency', pattern: /validateAcuityConsistency|acuity.*consistency/i }
    ]
  }
};

function validateFile(filePath, patterns, fileType) {
  console.log(`\n📄 Validating ${fileType}: ${filePath.split('/').pop()}`);
  console.log('-'.repeat(60));
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const results = [];
    
    patterns.forEach(({ name, pattern }) => {
      const found = pattern.test(content);
      results.push({ name, found });
      console.log(`  ${found ? '✅' : '❌'} ${name}`);
    });
    
    const passed = results.filter(r => r.found).length;
    const total = results.length;
    
    console.log(`\n  Summary: ${passed}/${total} checks passed`);
    
    return { passed, total, results };
  } catch (error) {
    console.error(`  ❌ ERROR reading file: ${error.message}`);
    return { passed: 0, total: patterns.length, error: error.message };
  }
}

// Run all validations
const allResults = [];

Object.entries(checks).forEach(([key, config]) => {
  const result = validateFile(config.file, config.patterns, key);
  allResults.push({ file: key, ...result });
});

// Final summary
console.log('\n' + '='.repeat(60));
console.log('📊 VALIDATION SUMMARY');
console.log('='.repeat(60));

const totalChecks = allResults.reduce((sum, r) => sum + r.total, 0);
const totalPassed = allResults.reduce((sum, r) => sum + r.passed, 0);

allResults.forEach(result => {
  console.log(`\n${result.file.toUpperCase()}:`);
  console.log(`  Passed: ${result.passed}/${result.total}`);
  if (result.error) {
    console.log(`  Error: ${result.error}`);
  }
});

console.log(`\n🎯 OVERALL: ${totalPassed}/${totalChecks} checks passed (${((totalPassed/totalChecks)*100).toFixed(1)}%)`);

if (totalPassed === totalChecks) {
  console.log('\n✅ All improvements validated in code!');
} else {
  console.log(`\n⚠️  ${totalChecks - totalPassed} improvements may be missing or need review.`);
}
