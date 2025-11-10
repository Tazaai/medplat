#!/usr/bin/env node
// Test script to generate a gamified case and trigger external panel review

const API_BASE = 'http://localhost:8080';

async function generateGamifiedCase() {
  console.log('🎮 Generating gamified case with external panel review...\n');
  
  try {
    const response = await fetch(`${API_BASE}/api/gamify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: 'Acute myocardial infarction',
        language: 'en',
        region: 'Denmark',
        level: 'intermediate',
        model: 'gpt-4o-mini',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('✅ Gamified case generated successfully!\n');
    console.log(`📊 Case ID: ${data.caseId || 'N/A'}`);
    console.log(`🎯 Topic: ${data.topic || 'N/A'}`);
    console.log(`📝 MCQ Count: ${data.mcqs?.length || 0}`);
    
    if (data.mcqs && data.mcqs.length > 0) {
      console.log('\n📚 Sample MCQ:');
      const sample = data.mcqs[0];
      console.log(`Q: ${sample.question || sample.stem}`);
      console.log(`Options: ${JSON.stringify(sample.options || [sample.a, sample.b, sample.c, sample.d])}`);
      console.log(`Correct: ${sample.correct || sample.answer}`);
    }

    console.log('\n⏳ External panel review running in background...');
    console.log('📊 Check backend logs in 5-10 seconds for review results:');
    console.log('   grep "External panel" /tmp/backend.log\n');

    // Wait a bit to see backend logs
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    console.log('\n🔍 Checking for external panel results in backend logs...\n');
    const { execSync } = require('child_process');
    try {
      const logs = execSync('grep -A 5 "External panel" /tmp/backend.log | tail -20', { encoding: 'utf8' });
      console.log(logs);
    } catch (e) {
      console.log('⚠️ Could not retrieve logs (external panel may still be processing)');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

generateGamifiedCase();
