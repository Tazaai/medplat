#!/usr/bin/env node
/**
 * Manage categories: merge, remove, and ensure categories exist
 * 
 * Usage:
 *   node scripts/manage_categories.mjs
 */

import { initFirebase } from '../backend/firebaseClient.js';

// Initialize Firebase
const { firestore, initialized } = initFirebase();

if (!initialized) {
  console.error('❌ Failed to initialize Firebase. Make sure FIREBASE_SERVICE_KEY is set.');
  process.exit(1);
}

const db = firestore;
console.log('✅ Firebase initialized\n');

// Configuration from user request
const config = {
  merge_categories: [
    {
      sources: ["Acute Medicine", "Emergency Medicine"],
      target: "Acute & Emergency Medicine",
      description: "Integrated acute and emergency presentations, triage, stabilization and early management.",
      move_all_topics: true
    }
  ],
  remove_categories: [
    "Education",
    "Nutrition & Metabolism",
    "Sleep Medicine",
    "Sports Medicine",
    "Travel Medicine",
    "Telemedicine",
    "Forensic Medicine",
    "Wilderness Medicine"
  ],
  ensure_categories: [
    {
      name: "ALS / ACLS",
      description: "Resuscitation algorithms, peri-arrest care, post-resuscitation management."
    },
    {
      name: "Medical Ethics",
      description: "Consent, capacity, priority setting, end-of-life decisions."
    },
    {
      name: "Medical Genetics",
      description: "Genetic counseling, hereditary disease patterns, testing strategies."
    },
    {
      name: "Occupational Medicine",
      description: "Work-related illness, fitness for duty, exposure assessment."
    },
    {
      name: "Preventive Medicine",
      description: "Screening, vaccination, risk factor modification."
    },
    {
      name: "Public Health",
      description: "Population-level prevention, outbreaks, health systems and policy."
    }
  ]
};

(async () => {
  try {
    console.log('🚀 Starting category management operations...\n');
    
    const stats = {
      merged: 0,
      removed: 0,
      ensured: 0,
      errors: []
    };
    
    // Step 1: Merge categories
    console.log('📋 Step 1: Merging categories...');
    for (const merge of config.merge_categories) {
      console.log(`\n   Merging: ${merge.sources.join(' + ')} → ${merge.target}`);
      
      let totalMoved = 0;
      
      for (const sourceCategory of merge.sources) {
        // Find all topics in source category
        const snapshot = await db.collection('topics2')
          .where('category', '==', sourceCategory)
          .get();
        
        if (snapshot.empty) {
          console.log(`      ⚠️  No topics found in "${sourceCategory}"`);
          continue;
        }
        
        console.log(`      Found ${snapshot.size} topics in "${sourceCategory}"`);
        
        // Update all topics to target category
        const batch = db.batch();
        let batchCount = 0;
        
        snapshot.docs.forEach(doc => {
          batch.update(doc.ref, { category: merge.target });
          batchCount++;
          totalMoved++;
          
          // Commit batch when it reaches 500
          if (batchCount >= 500) {
            batch.commit();
            batchCount = 0;
          }
        });
        
        // Commit remaining
        if (batchCount > 0) {
          await batch.commit();
        }
      }
      
      console.log(`      ✅ Moved ${totalMoved} topics to "${merge.target}"`);
      stats.merged += totalMoved;
    }
    
    // Step 2: Remove categories
    console.log('\n📋 Step 2: Removing categories...');
    for (const categoryToRemove of config.remove_categories) {
      console.log(`\n   Removing category: "${categoryToRemove}"`);
      
      // Find all topics in this category
      const snapshot = await db.collection('topics2')
        .where('category', '==', categoryToRemove)
        .get();
      
      if (snapshot.empty) {
        console.log(`      ⚠️  No topics found in "${categoryToRemove}"`);
        continue;
      }
      
      console.log(`      Found ${snapshot.size} topics to delete`);
      
      // Delete all topics in this category
      const batch = db.batch();
      let batchCount = 0;
      let deleted = 0;
      
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        batchCount++;
        deleted++;
        
        // Commit batch when it reaches 500
        if (batchCount >= 500) {
          batch.commit();
          batchCount = 0;
        }
      });
      
      // Commit remaining
      if (batchCount > 0) {
        await batch.commit();
      }
      
      console.log(`      ✅ Deleted ${deleted} topics from "${categoryToRemove}"`);
      stats.removed += deleted;
    }
    
    // Step 3: Ensure categories exist
    console.log('\n📋 Step 3: Ensuring categories exist...');
    for (const category of config.ensure_categories) {
      console.log(`\n   Checking category: "${category.name}"`);
      
      // Check if any topics exist in this category
      const snapshot = await db.collection('topics2')
        .where('category', '==', category.name)
        .limit(1)
        .get();
      
      if (!snapshot.empty) {
        console.log(`      ✅ Category "${category.name}" already exists (has topics)`);
        stats.ensured++;
      } else {
        console.log(`      ℹ️  Category "${category.name}" has no topics yet (will be created when topics are added)`);
        stats.ensured++;
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ CATEGORY MANAGEMENT COMPLETE');
    console.log('='.repeat(60));
    console.log(`Topics merged: ${stats.merged}`);
    console.log(`Topics removed: ${stats.removed}`);
    console.log(`Categories ensured: ${stats.ensured}`);
    
    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
      stats.errors.forEach(err => console.log(`   - ${err}`));
    }
    
    console.log('\n📊 Operations Summary:');
    console.log(`   Merged: ${config.merge_categories.length} category merge(s)`);
    console.log(`   Removed: ${config.remove_categories.length} category(ies)`);
    console.log(`   Ensured: ${config.ensure_categories.length} category(ies)`);
    console.log('='.repeat(60));
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
