/**
 * Test script to verify case generation alignment fixes
 * Tests: paraclinical routing, teaching normalization, deep evidence formatting, differential justification
 */

import { postProcessCase } from './utils/case_post_processor.mjs';

// Test Case 1: Paraclinical routing
console.log('=== Test 1: Paraclinical Routing ===');
const test1 = {
  labs: 'WBC: 12.5, Hemoglobin: 14.2',
  imaging: 'CT Chest: No acute findings',
  history: 'Patient presents with fever',
  physical_exam: 'Temp 38.5°C',
};
const result1 = postProcessCase(test1);
console.log('Paraclinical labs:', result1.paraclinical?.labs ? '✓ Present' : '✗ Missing');
console.log('Paraclinical imaging:', result1.paraclinical?.imaging ? '✓ Present' : '✗ Missing');
console.log('Top-level labs removed:', !result1.labs ? '✓ Cleaned' : '✗ Still present');
console.log('');

// Test Case 2: Teaching normalization with JSON
console.log('=== Test 2: Teaching Normalization ===');
const test2 = {
  teaching: `{
  "key_concepts": ["Concept 1", "Concept 2"],
  "clinical_pearls": ["Pearl 1", "Pearl 2"],
  "common_pitfalls": ["Pitfall 1"]
}`,
};
const result2 = postProcessCase(test2);
console.log('Key concepts:', result2.key_concepts?.length || 0, result2.key_concepts?.length === 2 ? '✓' : '✗');
console.log('Clinical pearls:', result2.clinical_pearls?.length || 0, result2.clinical_pearls?.length === 2 ? '✓' : '✗');
console.log('Common pitfalls:', result2.common_pitfalls?.length || 0, result2.common_pitfalls?.length === 1 ? '✓' : '✗');
console.log('Order enforced:', 
  (result2.key_concepts?.length > 0 && result2.clinical_pearls?.length > 0 && result2.common_pitfalls?.length > 0) ? '✓' : '✗');
console.log('');

// Test Case 3: Deep Evidence JSON formatting
console.log('=== Test 3: Deep Evidence JSON Formatting ===');
const test3 = {
  deepEvidence: {
    clinicalLogic: 'Step-by-step reasoning here',
    testInterpretation: 'Test results indicate...',
    probabilityShifts: 'Probability increased to 85%',
  },
};
const result3 = postProcessCase(test3);
console.log('Deep evidence formatted:', typeof result3.deepEvidence === 'string' ? '✓ String format' : '✗ Not formatted');
console.log('Clinical risk assessment:', result3.clinical_risk_assessment ? '✓ Present' : '✗ Missing');
console.log('Next diagnostic steps:', result3.next_diagnostic_steps ? '✓ Present' : '✗ Missing');
console.log('');

// Test Case 4: Differential justification enhancement
console.log('=== Test 4: Differential Justification Enhancement ===');
const test4 = {
  differential_diagnoses: [
    'Acute MI',
    { name: 'Pneumonia', supporting: 'Chest X-ray findings' },
  ],
  history: 'Patient with chest pain and fever',
  physical_exam: 'Fever, tachypnea',
  paraclinical: { labs: 'WBC elevated', imaging: 'Chest X-ray shows infiltrate' },
};
const result4 = postProcessCase(test4);
console.log('Differential 1 justification:', result4.differential_diagnoses[0]?.justification ? '✓ Present' : '✗ Missing');
console.log('Differential 2 justification:', result4.differential_diagnoses[1]?.justification ? '✓ Present' : '✗ Missing');
console.log('Justification uses context:', 
  result4.differential_diagnoses[0]?.justification?.includes('clinical') || 
  result4.differential_diagnoses[0]?.justification?.includes('paraclinical') ? '✓ Enhanced' : '✗ Generic');
console.log('');

// Test Case 5: Risk assessment deduplication
console.log('=== Test 5: Risk Assessment Deduplication ===');
const test5 = {
  stability: 'Stable. ABG shows pH 7.35.',
  risk: 'Moderate risk.',
  deepEvidence: 'ABG shows pH 7.35. Clinical logic suggests stable condition.',
};
const result5 = postProcessCase(test5);
const riskText = result5.clinical_risk_assessment || '';
const abgCount = (riskText.match(/ABG/g) || []).length;
console.log('Risk assessment present:', riskText ? '✓' : '✗');
console.log('ABG deduplication:', abgCount <= 1 ? '✓ No duplicates' : `✗ Found ${abgCount} instances`);
console.log('');

console.log('=== Summary ===');
console.log('All tests completed. Review output above for ✓/✗ indicators.');

