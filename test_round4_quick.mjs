// Quick Round 4 test - 3 cases
const API_BASE = 'https://medplat-backend-139218747785.europe-west1.run.app';

const testCases = [
  { topic: "Acute myocardial infarction", category: "Cardiology", region: "EU/DK", language: "en" },
  { topic: "Pediatric asthma exacerbation", category: "Pediatrics", region: "EU/DK", language: "en" },
  { topic: "Opioid overdose", category: "Toxicology", region: "EU/DK", language: "en" },
];

async function quickTest() {
  console.log('\n🧪 ROUND 4 QUICK TEST (3 cases)\n');
  
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    console.log(`\n[${i + 1}/3] ${tc.topic} (${tc.category})`);
    
    try {
      const r = await fetch(`${API_BASE}/api/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: tc.topic,
          category: tc.category,
          language: tc.language,
          region: tc.region,
          level: 'intermediate',
          model: 'gpt-4o-mini',
        }),
      });
      
      const d = await r.json();
      
      if (!d.ok) {
        console.log(`❌ FAILED: ${d.error || d.message}`);
        continue;
      }
      
      const caseData = d.case;
      console.log(`✅ OK`);
      console.log(`  - Has meta: ${!!caseData.meta}`);
      console.log(`  - Has highAcuity: ${!!caseData.meta?.high_acuity}`);
      console.log(`  - Reasoning chain: ${caseData.reasoning_chain?.length || 0} steps`);
      console.log(`  - Has mentor graph: ${!!caseData.meta?.mentor_knowledge_graph}`);
      console.log(`  - Has guidelines: ${!!caseData.guidelines && (caseData.guidelines.international?.length > 0 || caseData.guidelines.continental?.length > 0)}`);
      
    } catch (e) {
      console.log(`❌ ERROR: ${e.message}`);
    }
  }
}

quickTest().catch(console.error);

