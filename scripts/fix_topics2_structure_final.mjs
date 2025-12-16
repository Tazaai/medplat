#!/usr/bin/env node
// fix_topics2_structure_final.mjs
// Comprehensive structure fix: Remove lang, difficulty, fix duplicates, standardize keywords

import { initFirebase } from '../backend/firebaseClient.js';

// Standard structure (FINAL - no lang, no difficulty)
const STANDARD_STRUCTURE = {
  id: 'string',
  topic: 'string',
  category: 'string',
  keywords: {
    topic: 'string'
  }
};

// Convert string to snake_case
function toSnakeCase(str) {
  if (!str) return '';
  return str
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase();
}

// Convert string to Title Case
function toTitleCase(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

// Validate and fix document structure
function validateAndFixDoc(doc) {
  const fixed = {};
  let changed = false;
  const issues = [];
  
  // 1. Extract and fix id
  if (doc.id && typeof doc.id === 'string') {
    const normalizedId = toSnakeCase(doc.id);
    fixed.id = normalizedId;
    if (normalizedId !== doc.id) {
      changed = true;
      issues.push('id_normalized');
    }
  } else if (doc.topic) {
    // Generate id from topic
    fixed.id = toSnakeCase(doc.topic);
    changed = true;
    issues.push('id_generated');
  } else {
    return { doc: null, valid: false, reason: 'Missing both id and topic', issues: [] };
  }
  
  // 2. Extract and fix topic (handle duplicates)
  let topic = null;
  
  // Check if topic appears multiple times (as different types)
  const topicValues = [];
  if (doc.topic) {
    if (Array.isArray(doc.topic)) {
      topicValues.push(...doc.topic.filter(t => typeof t === 'string'));
    } else if (typeof doc.topic === 'string') {
      topicValues.push(doc.topic);
    }
  }
  
  // Also check for duplicate topic keys (some docs have topic x2)
  const topicKeys = Object.keys(doc).filter(k => k === 'topic');
  if (topicKeys.length > 1) {
    issues.push('duplicate_topic_keys');
    changed = true;
  }
  
  // Use first valid topic value
  if (topicValues.length > 0) {
    topic = topicValues[0].trim();
    if (topicValues.length > 1) {
      issues.push('duplicate_topic_values');
      changed = true;
    }
  } else if (doc.id) {
    // Generate topic from id
    topic = doc.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    changed = true;
    issues.push('topic_generated');
  } else {
    return { doc: null, valid: false, reason: 'Cannot determine topic', issues: [] };
  }
  
  // Normalize topic to Title Case
  const normalizedTopic = toTitleCase(topic);
  fixed.topic = normalizedTopic;
  if (normalizedTopic !== topic) {
    changed = true;
    issues.push('topic_normalized');
  }
  
  // Ensure id matches topic (snake_case)
  const expectedId = toSnakeCase(fixed.topic);
  if (fixed.id !== expectedId) {
    fixed.id = expectedId;
    changed = true;
    issues.push('id_recalculated');
  }
  
  // 3. Extract and fix category
  if (doc.category && typeof doc.category === 'string') {
    fixed.category = doc.category.trim();
  } else {
    return { doc: null, valid: false, reason: 'Missing category', issues: [] };
  }
  
  // 4. Fix keywords - MUST be object with topic key
  if (doc.keywords) {
    if (typeof doc.keywords === 'object' && !Array.isArray(doc.keywords)) {
      // Already an object - ensure it has topic key
      fixed.keywords = { topic: fixed.topic };
      if (!doc.keywords.topic || doc.keywords.topic !== fixed.topic) {
        changed = true;
        issues.push('keywords_fixed');
      }
      // Remove lang from keywords if present
      if ('lang' in doc.keywords) {
        changed = true;
        issues.push('keywords_lang_removed');
      }
    } else if (Array.isArray(doc.keywords)) {
      // Convert array to object
      fixed.keywords = { topic: fixed.topic };
      changed = true;
      issues.push('keywords_array_to_object');
    } else {
      // Invalid keywords - create new
      fixed.keywords = { topic: fixed.topic };
      changed = true;
      issues.push('keywords_recreated');
    }
  } else {
    // No keywords - create
    fixed.keywords = { topic: fixed.topic };
    changed = true;
    issues.push('keywords_created');
  }
  
  // 5. Remove lang field (if present)
  if ('lang' in doc) {
    changed = true;
    issues.push('lang_removed');
  }
  
  // 6. Remove difficulty field (if present)
  if ('difficulty' in doc) {
    changed = true;
    issues.push('difficulty_removed');
  }
  
  // 7. Remove any other extra fields (keep only: id, topic, category, keywords)
  const allowedFields = ['id', 'topic', 'category', 'keywords'];
  const extraFields = Object.keys(fixed).filter(k => !allowedFields.includes(k));
  if (extraFields.length > 0) {
    extraFields.forEach(field => delete fixed[field]);
    changed = true;
    issues.push('extra_fields_removed');
  }
  
  // Final validation
  if (!fixed.id || !fixed.topic || !fixed.category || !fixed.keywords || !fixed.keywords.topic) {
    return { doc: null, valid: false, reason: 'Invalid structure after fix', issues: [] };
  }
  
  return { doc: fixed, valid: true, changed, issues };
}

// Main function
async function fixStructure() {
  console.log('🔧 Starting comprehensive topics2 structure fix...\n');
  
  // Check Firebase credentials
  if (!process.env.FIREBASE_SERVICE_KEY) {
    console.error('❌ FIREBASE_SERVICE_KEY not set!');
    console.error('\nTo run this script:');
    console.error('  $key = gcloud secrets versions access latest --secret="FIREBASE_SERVICE_KEY" --project="medplat-458911"');
    console.error('  $env:FIREBASE_SERVICE_KEY = $key');
    console.error('  node scripts/fix_topics2_structure_final.mjs');
    process.exit(1);
  }
  
  const firebase = initFirebase();
  if (!firebase.initialized) {
    console.error('❌ Firebase initialization failed!');
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
    invalid: 0,
    langRemoved: 0,
    difficultyRemoved: 0,
    duplicateTopicFixed: 0,
    keywordsFixed: 0,
    unchanged: 0
  };
  
  const issueCounts = {};
  const toUpdate = [];
  const toDelete = [];
  
  // Process all documents
  console.log('🔍 Processing documents...');
  for (const docSnap of snapshot.docs) {
    const doc = { id: docSnap.id, ...docSnap.data() };
    
    // Validate and fix
    const result = validateAndFixDoc(doc);
    
    if (!result.valid) {
      toDelete.push(docSnap.ref);
      stats.invalid++;
      console.log(`   ❌ Invalid: ${doc.id || 'unknown'} - ${result.reason}`);
      continue;
    }
    
    const fixedDoc = result.doc;
    
    // Track issues
    if (result.issues) {
      result.issues.forEach(issue => {
        issueCounts[issue] = (issueCounts[issue] || 0) + 1;
        
        if (issue === 'lang_removed') stats.langRemoved++;
        if (issue === 'difficulty_removed') stats.difficultyRemoved++;
        if (issue.includes('duplicate_topic')) stats.duplicateTopicFixed++;
        if (issue.includes('keywords')) stats.keywordsFixed++;
      });
    }
    
    // Check if document needs update
    if (result.changed || docSnap.id !== fixedDoc.id) {
      toUpdate.push({ ref: docSnap.ref, newId: fixedDoc.id, data: fixedDoc });
      stats.fixed++;
    } else {
      stats.unchanged++;
    }
  }
  
  console.log(`\n📊 Processing complete:`);
  console.log(`   Documents to fix: ${toUpdate.length}`);
  console.log(`   Documents to delete: ${toDelete.length}`);
  console.log(`   Documents unchanged: ${stats.unchanged}\n`);
  
  // Delete invalid documents
  if (toDelete.length > 0) {
    console.log('🗑️  Deleting invalid documents...');
    const batch = db.batch();
    let deleteCount = 0;
    
    for (const ref of toDelete) {
      batch.delete(ref);
      deleteCount++;
      
      if (deleteCount % 500 === 0) {
        await batch.commit();
        console.log(`   Deleted ${deleteCount}/${toDelete.length}...`);
        batch = db.batch();
      }
    }
    
    if (deleteCount % 500 !== 0) {
      await batch.commit();
    }
    
    console.log(`   ✅ Deleted ${deleteCount} documents\n`);
  }
  
  // Update documents
  if (toUpdate.length > 0) {
    console.log('✏️  Updating documents...');
    let updateCount = 0;
    
    // Separate ID changes from regular updates
    const idChanges = toUpdate.filter(item => item.ref.id !== item.newId);
    const regularUpdates = toUpdate.filter(item => item.ref.id === item.newId);
    
    // Process regular updates first
    if (regularUpdates.length > 0) {
      let batch = db.batch();
      let batchCount = 0;
      
      for (const { ref, data } of regularUpdates) {
        batch.set(ref, data);
        updateCount++;
        batchCount++;
        
        if (batchCount >= 500) {
          await batch.commit();
          console.log(`   Updated ${updateCount}/${toUpdate.length}...`);
          batch = db.batch();
          batchCount = 0;
        }
      }
      
      if (batchCount > 0) {
        await batch.commit();
      }
    }
    
    // Process ID changes (create new + delete old)
    if (idChanges.length > 0) {
      let batch = db.batch();
      let batchCount = 0;
      
      for (const { ref, newId, data } of idChanges) {
        const newRef = collection.doc(newId);
        batch.set(newRef, data);
        batch.delete(ref);
        updateCount++;
        batchCount++;
        
        if (batchCount >= 500) {
          await batch.commit();
          console.log(`   Updated ${updateCount}/${toUpdate.length}...`);
          batch = db.batch();
          batchCount = 0;
        }
      }
      
      if (batchCount > 0) {
        await batch.commit();
      }
    }
    
    console.log(`   ✅ Updated ${updateCount} documents\n`);
  }
  
  // Verify final structure
  console.log('🔍 Verifying final structure...');
  const verifySnapshot = await collection.get();
  let verified = 0;
  let hasLang = 0;
  let hasDifficulty = 0;
  let hasDuplicateTopic = 0;
  let invalidKeywords = 0;
  
  for (const docSnap of verifySnapshot.docs) {
    const doc = docSnap.data();
    let isValid = true;
    
    if ('lang' in doc) {
      hasLang++;
      isValid = false;
    }
    if ('difficulty' in doc) {
      hasDifficulty++;
      isValid = false;
    }
    if (!doc.id || !doc.topic || !doc.category || !doc.keywords) {
      isValid = false;
    }
    if (doc.keywords && (!doc.keywords.topic || Array.isArray(doc.keywords))) {
      invalidKeywords++;
      isValid = false;
    }
    
    // Check for duplicate topic
    const topicKeys = Object.keys(doc).filter(k => k === 'topic');
    if (topicKeys.length > 1) {
      hasDuplicateTopic++;
      isValid = false;
    }
    
    if (isValid) verified++;
  }
  
  // Generate report
  console.log('\n' + '='.repeat(60));
  console.log('📋 STRUCTURE FIX REPORT');
  console.log('='.repeat(60));
  console.log(`Total documents processed: ${stats.total}`);
  console.log(`Documents fixed: ${stats.fixed}`);
  console.log(`Documents deleted (invalid): ${stats.invalid}`);
  console.log(`Documents unchanged: ${stats.unchanged}`);
  console.log(`\nIssues fixed:`);
  console.log(`  - Lang fields removed: ${stats.langRemoved}`);
  console.log(`  - Difficulty fields removed: ${stats.difficultyRemoved}`);
  console.log(`  - Duplicate topic fields fixed: ${stats.duplicateTopicFixed}`);
  console.log(`  - Keywords fixed: ${stats.keywordsFixed}`);
  console.log(`\nFinal verification:`);
  console.log(`  - Valid documents: ${verified}/${verifySnapshot.size}`);
  console.log(`  - Documents with lang: ${hasLang}`);
  console.log(`  - Documents with difficulty: ${hasDifficulty}`);
  console.log(`  - Documents with duplicate topic: ${hasDuplicateTopic}`);
  console.log(`  - Documents with invalid keywords: ${invalidKeywords}`);
  console.log('='.repeat(60));
  
  if (hasLang === 0 && hasDifficulty === 0 && hasDuplicateTopic === 0 && invalidKeywords === 0) {
    console.log('\n✅ ALL DOCUMENTS HAVE CORRECT STRUCTURE!');
  } else {
    console.log('\n⚠️  Some documents still have issues. Re-run the script if needed.');
  }
  
  console.log('\n✅ Structure fix complete!');
}

// Run
fixStructure().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

