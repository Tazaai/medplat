#!/usr/bin/env node
/**
 * Verify that new categories and topics were added to Firestore
 */

import { initFirebase } from '../backend/firebaseClient.js';

const { firestore, initialized } = initFirebase();

if (!initialized) {
  console.error('❌ Failed to initialize Firebase. Make sure FIREBASE_SERVICE_KEY is set.');
  process.exit(1);
}

const db = firestore;

const categoriesToCheck = ["Nutrition", "Weight Loss", "Arterial Gas"];

(async () => {
  try {
    console.log('🔍 Verifying new categories in Firestore...\n');
    
    for (const categoryName of categoriesToCheck) {
      console.log(`📁 Checking category: ${categoryName}`);
      
      const snapshot = await db.collection('topics2')
        .where('category', '==', categoryName)
        .get();
      
      console.log(`   Found ${snapshot.docs.length} topics`);
      
      if (snapshot.docs.length > 0) {
        // Check structure of first document
        const firstDoc = snapshot.docs[0].data();
        console.log(`   Sample document structure:`);
        console.log(`     id: ${firstDoc.id}`);
        console.log(`     topic: ${firstDoc.topic}`);
        console.log(`     category: ${firstDoc.category}`);
        console.log(`     keywords: ${JSON.stringify(firstDoc.keywords)}`);
        
        // Verify structure
        const hasRequiredFields = firstDoc.id && firstDoc.topic && firstDoc.category && firstDoc.keywords;
        const hasForbiddenFields = firstDoc.lang || firstDoc.difficulty || firstDoc.area;
        const keywordsIsObject = typeof firstDoc.keywords === 'object' && !Array.isArray(firstDoc.keywords);
        
        if (hasRequiredFields && !hasForbiddenFields && keywordsIsObject) {
          console.log(`   ✅ Structure is correct\n`);
        } else {
          console.log(`   ⚠️  Structure issues detected:`);
          if (!hasRequiredFields) console.log(`      - Missing required fields`);
          if (hasForbiddenFields) console.log(`      - Has forbidden fields (lang, difficulty, or area)`);
          if (!keywordsIsObject) console.log(`      - Keywords is not an object\n`);
        }
        
        // List all topics
        console.log(`   Topics in ${categoryName}:`);
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          console.log(`     - ${data.topic} (${data.id})`);
        });
      } else {
        console.log(`   ⚠️  No topics found for this category\n`);
      }
      console.log('');
    }
    
    console.log('========================================');
    console.log('✅ Verification complete');
    console.log('========================================');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
