#!/usr/bin/env node
/**
 * Professor-V3 Conference Engine Regression Test Suite
 * 
 * Tests the dynamic specialty-based debate engine across 5 clinical domains:
 * - Neurology (Stroke)
 * - Cardiology (NSTEMI)
 * - Respiratory (COPD Exacerbation)
 * - Infectious Disease (Sepsis)
 * - Emergency Medicine (Polytrauma)
 * 
 * Acceptance Criteria:
 * - discussion_rounds.length >= 3
 * - disagreement count >= 2
 * - unique specialties >= 3
 * - panel_consensus.length >= 100
 * - No generic "Dr." names
 * 
 * Usage: node tests/test_professor_v3_conference_engine.js
 * Or: npm run test:professor-v3
 */

import { generateClinicalCase } from '../backend/generate_case_clinical.mjs';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Test configuration
const TEST_CASES = [
  {
    topic: 'Acute Ischemic Stroke with Large Vessel Occlusion',
    specialty: 'Neurology',
    region: 'Denmark',
    expectedSpecialties: ['Emergency Physician', 'Neurologist', 'Radiologist', 'Neurosurgeon']
  },
  {
    topic: 'NSTEMI in a Diabetic Patient',
    specialty: 'Cardiology',
    region: 'United States',
    expectedSpecialties: ['Cardiologist', 'Emergency Physician', 'Internist']
  },
  {
    topic: 'COPD Exacerbation with Respiratory Failure',
    specialty: 'Respiratory',
    region: 'United Kingdom',
    expectedSpecialties: ['Pulmonologist', 'Intensivist', 'Emergency Physician']
  },
  {
    topic: 'Septic Shock with Unclear Source',
    specialty: 'Infectious Disease',
    region: 'Germany',
    expectedSpecialties: ['Infectious Disease Specialist', 'Intensivist', 'Emergency Physician']
  },
  {
    topic: 'Polytrauma from Motor Vehicle Collision',
    specialty: 'Emergency Medicine',
    region: 'Canada',
    expectedSpecialties: ['Trauma Surgeon', 'Emergency Physician', 'Orthopedic Surgeon', 'Intensivist']
  }
];

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  cases: []
};

/**
 * Validate a single generated case against professor-v3 criteria
 */
function validateCase(caseData, testConfig) {
  const validation = {
    topic: testConfig.topic,
    specialty: testConfig.specialty,
    checks: {},
    passed: true,
    errors: [],
    warnings: []
  };

  // Extract panel discussion
  const panel = caseData.panel_discussion || caseData.Expert_Panel_and_Teaching;
  
  if (!panel) {
    validation.passed = false;
    validation.errors.push('No panel discussion found in generated case');
    return validation;
  }

  const rounds = panel.discussion_rounds || [];
  const consensus = panel.panel_consensus || panel.consensus || '';

  // Check 1: Discussion rounds >= 3
  validation.checks.discussionRounds = {
    expected: '>=3',
    actual: rounds.length,
    passed: rounds.length >= 3
  };
  if (!validation.checks.discussionRounds.passed) {
    validation.passed = false;
    validation.errors.push(`Insufficient discussion rounds: ${rounds.length} (expected >=3)`);
  }

  // Check 2: Disagreements >= 2
  const disagreements = rounds.filter(r => 
    r.stance?.toLowerCase().includes('disagree') || 
    r.counter_to || 
    r.argument?.toLowerCase().includes('disagree') ||
    r.argument?.toLowerCase().includes('however') ||
    r.argument?.toLowerCase().includes('i disagree')
  );
  
  validation.checks.disagreements = {
    expected: '>=2',
    actual: disagreements.length,
    passed: disagreements.length >= 2
  };
  if (!validation.checks.disagreements.passed) {
    validation.passed = false;
    validation.errors.push(`Insufficient disagreements: ${disagreements.length} (expected >=2)`);
  }

  // Check 3: Unique specialties >= 3
  const specialties = new Set(rounds.map(r => r.specialty || r.speaker || r.role).filter(Boolean));
  validation.checks.specialtyDiversity = {
    expected: '>=3',
    actual: specialties.size,
    passed: specialties.size >= 3,
    specialties: Array.from(specialties)
  };
  if (!validation.checks.specialtyDiversity.passed) {
    validation.passed = false;
    validation.errors.push(`Insufficient specialty diversity: ${specialties.size} (expected >=3)`);
  }

  // Check 4: Panel consensus >= 100 characters
  validation.checks.consensusLength = {
    expected: '>=100',
    actual: consensus.length,
    passed: consensus.length >= 100
  };
  if (!validation.checks.consensusLength.passed) {
    validation.passed = false;
    validation.errors.push(`Panel consensus too short: ${consensus.length} chars (expected >=100)`);
  }

  // Check 5: No generic "Dr." names
  const genericNamePattern = /Dr\.\s+(Smith|Johnson|Lee|Jones|Brown|Davis|Miller|Wilson|Moore|Taylor|Anderson|Thomas|Jackson|White|Harris|Martin|Thompson|Garcia|Martinez|Robinson|Clark|Rodriguez|Lewis|Walker|Hall|Allen|Young|King|Wright|Lopez|Hill|Scott|Green|Adams|Baker|Nelson|Carter|Mitchell|Perez|Roberts|Turner|Phillips|Campbell|Parker|Evans|Edwards|Collins)/gi;
  
  const fullText = JSON.stringify(panel);
  const genericMatches = fullText.match(genericNamePattern) || [];
  
  validation.checks.noGenericNames = {
    expected: 'No "Dr. [GenericName]" patterns',
    actual: genericMatches.length === 0 ? 'Clean' : `Found: ${genericMatches.join(', ')}`,
    passed: genericMatches.length === 0
  };
  if (!validation.checks.noGenericNames.passed) {
    validation.passed = false;
    validation.errors.push(`Generic doctor names found: ${genericMatches.join(', ')}`);
  }

  // Check 6: Moderator intro and summary present (warnings only)
  if (!panel.moderator_intro) {
    validation.warnings.push('Missing moderator_intro');
  }
  if (!panel.moderator_summary) {
    validation.warnings.push('Missing moderator_summary');
  }

  // Check 7: Regional guideline citations (warning if not found)
  const hasRegionalCitations = fullText.toLowerCase().includes(testConfig.region.toLowerCase());
  if (!hasRegionalCitations) {
    validation.warnings.push(`No explicit ${testConfig.region} regional citations found`);
  }

  // Check 8: Quality metadata
  validation.checks.qualityMetadata = {
    generator_version: caseData.meta?.generator_version || 'unknown',
    quality_estimate: caseData.meta?.quality_estimate || 0,
    debate_balance: caseData.meta?.debate_balance || 'unknown',
    consensus_clarity: caseData.meta?.consensus_clarity || 'unknown'
  };

  return validation;
}

/**
 * Run a single test case
 */
async function runTest(testConfig, index) {
  console.log(`\n${colors.cyan}${colors.bold}[Test ${index + 1}/${TEST_CASES.length}]${colors.reset} ${colors.blue}${testConfig.topic}${colors.reset}`);
  console.log(`  Specialty: ${testConfig.specialty} | Region: ${testConfig.region}`);

  try {
    const startTime = Date.now();
    
    const caseData = await generateClinicalCase({
      topic: testConfig.topic,
      language: 'en',
      region: testConfig.region,
      level: 'intermediate',
      model: 'gpt-4o-mini' // Use mini for faster tests
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`  ${colors.cyan}Generated in ${duration}s${colors.reset}`);

    const validation = validateCase(caseData, testConfig);
    results.cases.push(validation);

    if (validation.passed) {
      results.passed++;
      console.log(`  ${colors.green}✅ PASSED${colors.reset}`);
      
      // Show specialties found
      if (validation.checks.specialtyDiversity?.specialties) {
        console.log(`  ${colors.green}Specialties:${colors.reset} ${validation.checks.specialtyDiversity.specialties.join(', ')}`);
      }
      
      // Show warnings if any
      if (validation.warnings.length > 0) {
        results.warnings += validation.warnings.length;
        validation.warnings.forEach(w => {
          console.log(`  ${colors.yellow}⚠️  ${w}${colors.reset}`);
        });
      }
    } else {
      results.failed++;
      console.log(`  ${colors.red}❌ FAILED${colors.reset}`);
      validation.errors.forEach(err => {
        console.log(`  ${colors.red}  • ${err}${colors.reset}`);
      });
    }

  } catch (error) {
    results.failed++;
    console.log(`  ${colors.red}❌ ERROR: ${error.message}${colors.reset}`);
    results.cases.push({
      topic: testConfig.topic,
      specialty: testConfig.specialty,
      passed: false,
      errors: [error.message],
      warnings: []
    });
  }
}

/**
 * Print final summary
 */
function printSummary() {
  console.log(`\n${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}📊 PROFESSOR-V3 REGRESSION TEST SUMMARY${colors.reset}`);
  console.log(`${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  const totalTests = TEST_CASES.length;
  const passRate = ((results.passed / totalTests) * 100).toFixed(1);

  console.log(`  Total Tests:    ${totalTests}`);
  console.log(`  ${colors.green}✅ Passed:       ${results.passed}${colors.reset}`);
  console.log(`  ${colors.red}❌ Failed:       ${results.failed}${colors.reset}`);
  console.log(`  ${colors.yellow}⚠️  Warnings:     ${results.warnings}${colors.reset}`);
  console.log(`  Pass Rate:      ${passRate >= 80 ? colors.green : colors.red}${passRate}%${colors.reset}\n`);

  // Detailed results per specialty
  console.log(`${colors.bold}Detailed Results by Specialty:${colors.reset}\n`);
  results.cases.forEach((result, idx) => {
    const icon = result.passed ? '✅' : '❌';
    const color = result.passed ? colors.green : colors.red;
    console.log(`  ${color}${icon} ${result.specialty}${colors.reset}: ${result.topic}`);
    
    if (result.checks?.specialtyDiversity?.specialties) {
      console.log(`     Specialties (${result.checks.specialtyDiversity.actual}): ${result.checks.specialtyDiversity.specialties.join(', ')}`);
    }
    if (result.checks?.disagreements) {
      console.log(`     Disagreements: ${result.checks.disagreements.actual}`);
    }
    if (result.checks?.qualityMetadata) {
      const meta = result.checks.qualityMetadata;
      console.log(`     Quality: ${meta.quality_estimate} | Debate: ${meta.debate_balance} | Consensus: ${meta.consensus_clarity}`);
    }
  });

  console.log(`\n${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

  // Acceptance criteria
  console.log(`\n${colors.bold}Acceptance Criteria:${colors.reset}`);
  console.log(`  ${passRate >= 80 ? colors.green + '✅' : colors.red + '❌'} Overall pass rate >= 80%: ${passRate}%${colors.reset}`);
  console.log(`  ${results.failed === 0 ? colors.green + '✅' : colors.red + '❌'} Zero critical failures: ${results.failed === 0 ? 'Yes' : `No (${results.failed} failures)`}${colors.reset}`);
  
  const allCasesHaveMinRounds = results.cases.every(c => c.checks?.discussionRounds?.passed);
  console.log(`  ${allCasesHaveMinRounds ? colors.green + '✅' : colors.red + '❌'} All cases have >=3 rounds: ${allCasesHaveMinRounds ? 'Yes' : 'No'}${colors.reset}`);
  
  const allCasesHaveDisagreements = results.cases.every(c => c.checks?.disagreements?.passed);
  console.log(`  ${allCasesHaveDisagreements ? colors.green + '✅' : colors.red + '❌'} All cases have >=2 disagreements: ${allCasesHaveDisagreements ? 'Yes' : 'No'}${colors.reset}`);

  console.log(`\n${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

/**
 * Main test runner
 */
async function main() {
  console.log(`${colors.bold}${colors.blue}`);
  console.log(`╔═══════════════════════════════════════════════════════════════════╗`);
  console.log(`║  🧠 Professor-V3 Conference Engine Regression Test Suite         ║`);
  console.log(`║                                                                   ║`);
  console.log(`║  Testing dynamic specialty-based debate generation across 5      ║`);
  console.log(`║  clinical domains with strict quality validation.                ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════════╝`);
  console.log(`${colors.reset}`);

  console.log(`\n${colors.bold}Test Configuration:${colors.reset}`);
  console.log(`  Model: gpt-4o-mini`);
  console.log(`  Cases: ${TEST_CASES.length}`);
  console.log(`  Specialties: Neurology, Cardiology, Respiratory, Infectious Disease, Emergency`);
  console.log(`  Regions: Denmark, United States, United Kingdom, Germany, Canada`);

  const startTime = Date.now();

  for (let i = 0; i < TEST_CASES.length; i++) {
    await runTest(TEST_CASES[i], i);
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

  printSummary();

  console.log(`${colors.cyan}Total test duration: ${totalDuration}s${colors.reset}\n`);

  // Exit with appropriate code
  // Accept ≥80% pass rate (allows for LLM output variability)
  const totalTests = results.passed + results.failed;
  const passRate = totalTests > 0 ? (results.passed / totalTests) * 100 : 0;
  const threshold = 80;
  
  if (passRate >= threshold) {
    console.log(`${colors.green}✅ Pass rate ${passRate.toFixed(1)}% meets threshold (≥${threshold}%)${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}❌ Pass rate ${passRate.toFixed(1)}% below threshold (≥${threshold}%)${colors.reset}\n`);
    process.exit(1);
  }
}

// Run tests
main().catch(error => {
  console.error(`${colors.red}${colors.bold}Fatal error:${colors.reset} ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
