#!/usr/bin/env node
// fix_topics2_structure.mjs
// Review and fix topics2 structure - remove lang field, ensure consistency

import { initFirebase } from '../backend/firebaseClient.js';

// Standard structure (NO lang field)
const STANDARD_STRUCTURE = {
  id: 'string',
  topic: 'string',
  category: 'string',
  difficulty: 'string',
  keywords: 'object'
};

// Convert string to snake_case
function toSnakeCase(str) {
  if (!str) return '';
  return str
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase();
}

// Validate and fix document structure
function validateAndFixDoc(doc) {
  const fixed = { ...doc };
  let changed = false;
  const issues = [];
  
  // Remove lang field
  if ('lang' in fixed) {
    delete fixed.lang;
    changed = true;
    issues.push('Removed lang field');
  }
  
  // Ensure id exists and is snake_case
  if (!fixed.id || typeof fixed.id !== 'string') {
    if (fixed.topic) {
      fixed.id = toSnakeCase(fixed.topic);
      changed = true;
      issues.push('Generated id from topic');
    } else {
      return { doc: fixed, valid: false, reason: 'Missing both id and topic' };
    }
  } else {
    const normalizedId = toSnakeCase(fixed.id);
    if (normalizedId !== fixed.id) {
      fixed.id = normalizedId;
      changed = true;
      issues.push('Normalized id to snake_case');
    }
  }
  
  // Ensure topic exists
  if (!fixed.topic || typeof fixed.topic !== 'string') {
    if (fixed.id) {
      fixed.topic = fixed.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      changed = true;
      issues.push('Generated topic from id');
    } else {
      return { doc: fixed, valid: false, reason: 'Missing topic' };
    }
  }
  
  // Ensure category exists
  if (!fixed.category || typeof fixed.category !== 'string') {
    return { doc: fixed, valid: false, reason: 'Missing category' };
  }
  
  // Ensure difficulty exists
  if (!fixed.difficulty || typeof fixed.difficulty !== 'string') {
    fixed.difficulty = 'intermediate';
    changed = true;
    issues.push('Set default difficulty');
  }
  
  // Ensure keywords exists
  if (!fixed.keywords || typeof fixed.keywords !== 'object') {
    fixed.keywords = { topic: fixed.topic };
    changed = true;
    issues.push('Generated keywords');
  }
  
  // Remove any extra fields (keep only: id, topic, category, difficulty, keywords)
  const allowedFields = ['id', 'topic', 'category', 'difficulty', 'keywords'];
  const extraFields = Object.keys(fixed).filter(k => !allowedFields.includes(k));
  if (extraFields.length > 0) {
    extraFields.forEach(field => {
      delete fixed[field];
      changed = true;
    });
    issues.push(`Removed extra fields: ${extraFields.join(', ')}`);
  }
  
  // Ensure id matches topic (snake_case of topic)
  const expectedId = toSnakeCase(fixed.topic);
  if (fixed.id !== expectedId) {
    fixed.id = expectedId;
    changed = true;
    issues.push('Fixed id to match topic');
  }
  
  return { doc: fixed, valid: true, changed, issues };
}

// Main function
async function fixTopics2Structure() {
  console.log('🔍 Reviewing and fixing topics2 structure...\n');
  
  // Check for Firebase credentials
  if (!process.env.FIREBASE_SERVICE_KEY) {
    console.error('❌ FIREBASE_SERVICE_KEY environment variable not set!');
    console.error('');
    console.error('To run this script, set FIREBASE_SERVICE_KEY:');
    console.error('  $key = gcloud secrets versions access latest --secret="FIREBASE_SERVICE_KEY" --project="medplat-458911"');
    console.error('  $env:FIREBASE_SERVICE_KEY=$key');
    console.error('  node scripts/fix_topics2_structure.mjs');
    console.error('');
    process.exit(1);
  }
  
  const firebase = initFirebase();
  if (!firebase.initialized) {
    console.error('❌ Failed to initialize Firebase!');
    console.error('Please check your FIREBASE_SERVICE_KEY credentials.');
    process.exit(1);
  }
  
  const db = firebase.firestore;
  const collection = db.collection('topics2');
  
  // Read all documents
  console.log('📖 Reading all documents from topics2...');
  const snapshot = await collection.get();
  const totalDocs = snapshot.size;
  console.log(`   Found ${totalDocs} documents\n`);
  
  const stats = {
    total: totalDocs,
    fixed: 0,
    langRemoved: 0,
    extraFieldsRemoved: 0,
    idsFixed: 0,
    structureFixed: 0,
    invalid: 0,
    kept: 0
  };
  
  const toUpdate = [];
  const toDelete = [];
  const structureIssues = [];
  
  // Process all documents
  console.log('🔧 Processing documents...');
  for (const docSnap of snapshot.docs) {
    const doc = { id: docSnap.id, ...docSnap.data() };
    
    // Validate and fix
    const result = validateAndFixDoc(doc);
    
    if (!result.valid) {
      toDelete.push(docSnap.ref);
      stats.invalid++;
      console.log(`   ❌ Removing invalid: ${doc.id} - ${result.reason}`);
      continue;
    }
    
    const fixedDoc = result.doc;
    
    // Track changes
    if (result.changed) {
      stats.fixed++;
      if (result.issues.some(i => i.includes('lang'))) stats.langRemoved++;
      if (result.issues.some(i => i.includes('extra fields'))) stats.extraFieldsRemoved++;
      if (result.issues.some(i => i.includes('id'))) stats.idsFixed++;
      if (result.issues.length > 0) stats.structureFixed++;
      
      // Check structure consistency
      const hasLang = 'lang' in fixedDoc;
      const hasExtraFields = Object.keys(fixedDoc).some(k => !['id', 'topic', 'category', 'difficulty', 'keywords'].includes(k));
      
      if (hasLang || hasExtraFields) {
        structureIssues.push({
          id: fixedDoc.id,
          issues: result.issues
        });
      }
      
      toUpdate.push({ ref: docSnap.ref, data: fixedDoc, issues: result.issues });
    } else {
      // Check if structure is already correct
      const hasLang = 'lang' in fixedDoc;
      const hasExtraFields = Object.keys(fixedDoc).some(k => !['id', 'topic', 'category', 'difficulty', 'keywords'].includes(k));
      
      if (!hasLang && !hasExtraFields) {
        stats.kept++;
      } else {
        // Still needs fixing
        toUpdate.push({ ref: docSnap.ref, data: fixedDoc, issues: ['Structure check'] });
        stats.fixed++;
      }
    }
  }
  
  console.log(`\n📊 Processing complete:`);
  console.log(`   Documents to delete: ${toDelete.length}`);
  console.log(`   Documents to update: ${toUpdate.length}`);
  console.log(`   Documents already correct: ${stats.kept}\n`);
  
  // Delete invalid documents
  if (toDelete.length > 0) {
    console.log('🗑️  Deleting invalid documents...');
    let batch = db.batch();
    let batchCount = 0;
    
    for (const ref of toDelete) {
      batch.delete(ref);
      batchCount++;
      
      if (batchCount >= 500) {
        await batch.commit();
        console.log(`   Deleted ${batchCount}/${toDelete.length}...`);
        batch = db.batch();
        batchCount = 0;
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log(`   ✅ Deleted ${toDelete.length} documents\n`);
  }
  
  // Update documents
  if (toUpdate.length > 0) {
    console.log('✏️  Updating documents...');
    let batch = db.batch();
    let batchCount = 0;
    
    for (const { ref, data } of toUpdate) {
      batch.set(ref, data);
      batchCount++;
      
      if (batchCount >= 500) {
        await batch.commit();
        console.log(`   Updated ${batchCount}/${toUpdate.length}...`);
        batch = db.batch();
        batchCount = 0;
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log(`   ✅ Updated ${toUpdate.length} documents\n`);
  }
  
  // Verify final structure
  console.log('🔍 Verifying final structure...');
  const verifySnapshot = await collection.get();
  let correctCount = 0;
  let incorrectCount = 0;
  const incorrectDocs = [];
  
  for (const docSnap of verifySnapshot.docs) {
    const doc = docSnap.data();
    const hasLang = 'lang' in doc;
    const fields = Object.keys(doc);
    const expectedFields = ['id', 'topic', 'category', 'difficulty', 'keywords'];
    const hasExtraFields = fields.some(f => !expectedFields.includes(f));
    const missingFields = expectedFields.filter(f => !fields.includes(f));
    
    if (hasLang || hasExtraFields || missingFields.length > 0) {
      incorrectCount++;
      incorrectDocs.push({
        id: doc.id,
        hasLang,
        extraFields: fields.filter(f => !expectedFields.includes(f)),
        missingFields
      });
    } else {
      correctCount++;
    }
  }
  
  // Generate report
  console.log('='.repeat(60));
  console.log('📋 STRUCTURE FIX REPORT');
  console.log('='.repeat(60));
  console.log(`Total documents processed: ${stats.total}`);
  console.log(`Documents fixed: ${stats.fixed}`);
  console.log(`Lang fields removed: ${stats.langRemoved}`);
  console.log(`Extra fields removed: ${stats.extraFieldsRemoved}`);
  console.log(`IDs fixed: ${stats.idsFixed}`);
  console.log(`Structure repairs: ${stats.structureFixed}`);
  console.log(`Invalid documents removed: ${stats.invalid}`);
  console.log(`Documents kept unchanged: ${stats.kept}`);
  console.log(`\nFinal verification:`);
  console.log(`  ✅ Correct structure: ${correctCount}`);
  console.log(`  ❌ Incorrect structure: ${incorrectCount}`);
  
  if (incorrectDocs.length > 0) {
    console.log(`\n⚠️  Documents with structure issues:`);
    incorrectDocs.slice(0, 10).forEach(doc => {
      console.log(`  - ${doc.id}:`);
      if (doc.hasLang) console.log(`    ❌ Still has lang field`);
      if (doc.extraFields.length > 0) console.log(`    ❌ Extra fields: ${doc.extraFields.join(', ')}`);
      if (doc.missingFields.length > 0) console.log(`    ❌ Missing fields: ${doc.missingFields.join(', ')}`);
    });
    if (incorrectDocs.length > 10) {
      console.log(`  ... and ${incorrectDocs.length - 10} more`);
    }
  }
  
  console.log(`\n✅ Standard structure:`);
  console.log(`  - id (string, snake_case)`);
  console.log(`  - topic (string)`);
  console.log(`  - category (string)`);
  console.log(`  - difficulty (string)`);
  console.log(`  - keywords (object)`);
  console.log(`  - NO lang field`);
  console.log('='.repeat(60));
  console.log('\n✅ Structure fix complete!');
}

// Run fix
fixTopics2Structure().catch(err => {
  console.error('❌ Error during structure fix:', err);
  process.exit(1);
});

