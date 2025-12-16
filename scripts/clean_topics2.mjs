#!/usr/bin/env node
// clean_topics2.mjs
// ✅ Firestore topics2 Cleaner & Unifier
// Automatically inspects and cleans the Firestore topics2 collection

import { initFirebase } from '../backend/firebaseClient.js';

// Standard MedPlat categories (excluding Radiology)
const STANDARD_CATEGORIES = [
  'Acute Medicine',
  'Addiction Medicine',
  'Anesthesiology',
  'Cardiology',
  'Dermatology',
  'Disaster & Crisis Response',
  'Education',
  'Emergency Medicine',
  'Endocrinology',
  'ENT / Otolaryngology',
  'Gastroenterology',
  'General Practice',
  'Hematology',
  'Infectious Diseases',
  'Nephrology',
  'Neurology',
  'Nutrition & Metabolism',
  'Obstetrics',
  'Obstetrics & Gynecology',
  'Occupational Medicine',
  'Oncology',
  'Ophthalmology',
  'Orthopedics',
  'Palliative Medicine',
  'Pediatrics',
  'Psychiatry',
  'Public Health',
  'Pulmonology',
  'Rehabilitation Medicine',
  'Rheumatology',
  'Telemedicine',
  'Toxicology',
  'Urology'
];

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

// Normalize category name to standard
function normalizeCategory(category) {
  if (!category) return null;
  
  const normalized = category.trim();
  
  // Direct match
  if (STANDARD_CATEGORIES.includes(normalized)) {
    return normalized;
  }
  
  // Case-insensitive match
  const match = STANDARD_CATEGORIES.find(cat => 
    cat.toLowerCase() === normalized.toLowerCase()
  );
  if (match) return match;
  
  // Handle common variations
  const variations = {
    'radiology': null, // Remove
    'radiology & imaging': null,
    'imaging': null,
    'ob/gyn': 'Obstetrics & Gynecology',
    'obstetrics and gynecology': 'Obstetrics & Gynecology',
    'ent': 'ENT / Otolaryngology',
    'otolaryngology': 'ENT / Otolaryngology',
    'emergency': 'Emergency Medicine',
    'acute care': 'Acute Medicine',
    'general medicine': 'General Practice',
    'family medicine': 'General Practice',
    'internal medicine': 'General Practice',
  };
  
  const lower = normalized.toLowerCase();
  if (variations[lower] !== undefined) {
    return variations[lower]; // null means remove
  }
  
  // If no match, return null (will be handled as invalid)
  return null;
}

// Validate and fix document schema
function validateAndFixDoc(doc) {
  const fixed = { ...doc };
  let changed = false;
  
  // Ensure id exists and is snake_case
  if (!fixed.id || typeof fixed.id !== 'string') {
    if (fixed.topic) {
      fixed.id = toSnakeCase(fixed.topic);
      changed = true;
    } else {
      return { doc: fixed, valid: false, reason: 'Missing both id and topic' };
    }
  } else {
    const normalizedId = toSnakeCase(fixed.id);
    if (normalizedId !== fixed.id) {
      fixed.id = normalizedId;
      changed = true;
    }
  }
  
  // Ensure topic exists
  if (!fixed.topic || typeof fixed.topic !== 'string') {
    if (fixed.id) {
      fixed.topic = fixed.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      changed = true;
    } else {
      return { doc: fixed, valid: false, reason: 'Missing topic' };
    }
  }
  
  // Normalize topic (Title Case)
  const normalizedTopic = toTitleCase(fixed.topic.trim());
  if (normalizedTopic !== fixed.topic) {
    fixed.topic = normalizedTopic;
    changed = true;
  }
  
  // Ensure category exists and is normalized
  if (!fixed.category || typeof fixed.category !== 'string') {
    return { doc: fixed, valid: false, reason: 'Missing category' };
  }
  
  const normalizedCategory = normalizeCategory(fixed.category);
  if (normalizedCategory === null) {
    return { doc: fixed, valid: false, reason: 'Invalid category (Radiology or unknown)' };
  }
  
  if (normalizedCategory !== fixed.category) {
    fixed.category = normalizedCategory;
    changed = true;
  }
  
  // Ensure lang is "en"
  if (fixed.lang !== 'en') {
    fixed.lang = 'en';
    changed = true;
  }
  
  // Remove extra fields (keep only: id, topic, category, lang, difficulty, area, keywords)
  const allowedFields = ['id', 'topic', 'category', 'lang', 'difficulty', 'area', 'keywords'];
  const extraFields = Object.keys(fixed).filter(k => !allowedFields.includes(k));
  if (extraFields.length > 0) {
    extraFields.forEach(field => delete fixed[field]);
    changed = true;
  }
  
  // Set defaults for optional fields
  if (!fixed.difficulty) {
    fixed.difficulty = 'intermediate';
    changed = true;
  }
  if (!fixed.keywords) {
    fixed.keywords = { topic: fixed.topic, lang: 'en' };
    changed = true;
  }
  
  // Ensure id matches topic (snake_case of topic)
  const expectedId = toSnakeCase(fixed.topic);
  if (fixed.id !== expectedId) {
    fixed.id = expectedId;
    changed = true;
  }
  
  // Check for placeholder/generic topics
  if (/^(case\s*#?\d+|placeholder|test|dummy|sample|unknown|generic)/i.test(fixed.topic)) {
    return { doc: fixed, valid: false, reason: 'Placeholder/generic topic' };
  }
  
  return { doc: fixed, valid: true, changed };
}

// Main cleaning function
async function cleanTopics2() {
  console.log('🔍 Starting topics2 collection cleanup...\n');
  
  // Check for Firebase credentials
  if (!process.env.FIREBASE_SERVICE_KEY) {
    console.error('❌ FIREBASE_SERVICE_KEY environment variable not set!');
    console.error('');
    console.error('To run this script, you need to set the FIREBASE_SERVICE_KEY:');
    console.error('');
    console.error('Option 1: Set environment variable');
    console.error('  $env:FIREBASE_SERVICE_KEY="<json-key>"');
    console.error('  node scripts/clean_topics2.mjs');
    console.error('');
    console.error('Option 2: Get from GCP Secret Manager');
    console.error('  $key = gcloud secrets versions access latest --secret="FIREBASE_SERVICE_KEY"');
    console.error('  $env:FIREBASE_SERVICE_KEY=$key');
    console.error('  node scripts/clean_topics2.mjs');
    console.error('');
    console.error('Option 3: Use a file path');
    console.error('  $env:FIREBASE_SERVICE_KEY="./path/to/firebase_key.json"');
    console.error('  node scripts/clean_topics2.mjs');
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
    duplicatesRemoved: 0,
    radiologyRemoved: 0,
    invalidRemoved: 0,
    categoriesNormalized: 0,
    idsNormalized: 0,
    structuralRepairs: 0,
    kept: 0
  };
  
  const processedDocs = new Map(); // id -> doc
  const categoryMap = new Map(); // category -> Set of ids
  const topicMap = new Map(); // topic -> Set of ids
  const toDelete = [];
  const toUpdate = [];
  
  // First pass: process all documents
  console.log('🔧 Processing documents...');
  for (const docSnap of snapshot.docs) {
    const doc = { id: docSnap.id, ...docSnap.data() };
    
    // Check for Radiology category
    const categoryLower = (doc.category || '').toLowerCase();
    if (categoryLower.includes('radiology') || categoryLower.includes('imaging')) {
      toDelete.push(docSnap.ref);
      stats.radiologyRemoved++;
      continue;
    }
    
    // Validate and fix
    const result = validateAndFixDoc(doc);
    
    if (!result.valid) {
      toDelete.push(docSnap.ref);
      stats.invalidRemoved++;
      console.log(`   ❌ Removing invalid: ${doc.id} - ${result.reason}`);
      continue;
    }
    
    const fixedDoc = result.doc;
    
    // Track changes
    if (result.changed) {
      stats.fixed++;
      if (fixedDoc.id !== doc.id) stats.idsNormalized++;
      if (fixedDoc.category !== doc.category) stats.categoriesNormalized++;
      if (result.changed) stats.structuralRepairs++;
    }
    
    // Check for duplicates by id (after normalization)
    if (processedDocs.has(fixedDoc.id)) {
      // Duplicate ID - keep the one with better data
      const existing = processedDocs.get(fixedDoc.id);
      if (existing.topic === fixedDoc.topic && existing.category === fixedDoc.category) {
        // Exact duplicate - remove this one
        toDelete.push(docSnap.ref);
        stats.duplicatesRemoved++;
        continue;
      } else {
        // Different data with same ID - regenerate ID for this one
        let newId = toSnakeCase(fixedDoc.topic);
        let counter = 1;
        while (processedDocs.has(newId)) {
          newId = toSnakeCase(fixedDoc.topic) + '_' + counter;
          counter++;
        }
        fixedDoc.id = newId;
        stats.idsNormalized++;
      }
    }
    
    // Check for duplicates by topic
    if (topicMap.has(fixedDoc.topic)) {
      const existingIds = topicMap.get(fixedDoc.topic);
      const existing = processedDocs.get(existingIds.values().next().value);
      
      // Same topic, same category = duplicate
      if (existing && existing.category === fixedDoc.category) {
        toDelete.push(docSnap.ref);
        stats.duplicatesRemoved++;
        continue;
      }
    }
    
    // Add to maps
    processedDocs.set(fixedDoc.id, fixedDoc);
    
    if (!categoryMap.has(fixedDoc.category)) {
      categoryMap.set(fixedDoc.category, new Set());
    }
    categoryMap.get(fixedDoc.category).add(fixedDoc.id);
    
    if (!topicMap.has(fixedDoc.topic)) {
      topicMap.set(fixedDoc.topic, new Set());
    }
    topicMap.get(fixedDoc.topic).add(fixedDoc.id);
    
    // Check if document needs update
    if (result.changed || docSnap.id !== fixedDoc.id) {
      toUpdate.push({ ref: docSnap.ref, newId: fixedDoc.id, data: fixedDoc });
    } else {
      stats.kept++;
    }
  }
  
  console.log(`\n📊 Processing complete:`);
  console.log(`   Documents to delete: ${toDelete.length}`);
  console.log(`   Documents to update: ${toUpdate.length}`);
  console.log(`   Documents to keep: ${stats.kept}\n`);
  
  // Delete invalid/duplicate documents
  if (toDelete.length > 0) {
    console.log('🗑️  Deleting invalid/duplicate documents...');
    const batch = db.batch();
    let deleteCount = 0;
    
    for (const ref of toDelete) {
      batch.delete(ref);
      deleteCount++;
      
      if (deleteCount % 500 === 0) {
        await batch.commit();
        console.log(`   Deleted ${deleteCount}/${toDelete.length}...`);
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
    
    // Separate ID changes from regular updates (ID changes need special handling)
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
  
  // Generate final report
  console.log('='.repeat(60));
  console.log('📋 CLEANUP REPORT');
  console.log('='.repeat(60));
  console.log(`Total documents processed: ${stats.total}`);
  console.log(`Documents fixed: ${stats.fixed}`);
  console.log(`Duplicates removed: ${stats.duplicatesRemoved}`);
  console.log(`Radiology documents removed: ${stats.radiologyRemoved}`);
  console.log(`Invalid documents removed: ${stats.invalidRemoved}`);
  console.log(`Categories normalized: ${stats.categoriesNormalized}`);
  console.log(`IDs normalized: ${stats.idsNormalized}`);
  console.log(`Structural repairs: ${stats.structuralRepairs}`);
  console.log(`Documents kept unchanged: ${stats.kept}`);
  console.log(`\nFinal category count: ${categoryMap.size}`);
  console.log(`Categories: ${Array.from(categoryMap.keys()).sort().join(', ')}`);
  console.log('='.repeat(60));
  console.log('\n✅ Cleanup complete!');
}

// Run cleanup
cleanTopics2().catch(err => {
  console.error('❌ Error during cleanup:', err);
  process.exit(1);
});

