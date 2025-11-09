#!/usr/bin/env node
/**
 * 🔍 Firestore Topics2 Validator
 * 
 * Validate, deduplicate, and enrich topics2 collection.
 * 1. Check for duplicates by `id` or identical `topic`
 * 2. Fix missing fields (category, lang, topic)
 * 3. Normalize all IDs to snake_case
 * 4. Optionally import new topics from JSON (--add)
 * 
 * Usage:
 *   node backend/scripts/validate_topics2.mjs
 *   node backend/scripts/validate_topics2.mjs --add=new_topics.json
 *   npm run validate:topics2
 */

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// Initialize Firebase
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT || 
                           process.env.GOOGLE_APPLICATION_CREDENTIALS ||
                           './firebase-service-key.json';

try {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  initializeApp({
    credential: {
      getAccessToken: () => Promise.resolve({ access_token: 'mock', expires_in: 3600 }),
      getCertificate: () => serviceAccount
    }
  });
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error.message);
  process.exit(1);
}

const db = getFirestore();

// Normalize string to snake_case (lowercase, underscores, alphanumeric only)
const normalize = str => 
  str.toLowerCase()
     .replace(/\s+/g, "_")
     .replace(/[^a-z0-9_]/g, "")
     .replace(/_+/g, "_")
     .replace(/^_|_$/g, "");

/**
 * Main validation logic
 */
(async () => {
  console.log('🔍 Starting topics2 validation...\n');
  
  const snap = await db.collection("topics2").get();
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  console.log(`📊 Total documents: ${docs.length}\n`);
  
  const seen = new Set();
  const duplicates = [];
  const report = [];
  const topicMap = new Map(); // Track topics by normalized name
  
  // Phase 1: Detect duplicates
  console.log('📋 Phase 1: Detecting duplicates...');
  for (const d of docs) {
    const normalizedTopic = normalize(d.topic || d.id);
    
    if (seen.has(d.id)) {
      duplicates.push({ id: d.id, reason: 'Duplicate document ID' });
    } else if (topicMap.has(normalizedTopic)) {
      duplicates.push({ 
        id: d.id, 
        reason: `Duplicate topic name: "${d.topic}" (conflicts with ${topicMap.get(normalizedTopic)})` 
      });
    } else {
      seen.add(d.id);
      topicMap.set(normalizedTopic, d.id);
    }
  }
  
  if (duplicates.length > 0) {
    console.log(`⚠️  Found ${duplicates.length} duplicates:`);
    duplicates.forEach(dup => console.log(`   - ${dup.id}: ${dup.reason}`));
  } else {
    console.log('✅ No duplicates found');
  }
  console.log();
  
  // Phase 2: Validate and fix missing fields
  console.log('🔧 Phase 2: Validating and fixing fields...');
  let fixed = 0;
  
  for (const d of docs) {
    const fixedId = normalize(d.topic || d.id);
    const changes = [];
    
    const fixed_data = {
      id: fixedId,
      topic: d.topic || d.id.replace(/_/g, " "),
      category: d.category || "Uncategorized",
      lang: (d.lang || "en").toLowerCase(),
      area: d.area || null,
      keywords: d.keywords || [],
      difficulty: d.difficulty || "intermediate"
    };
    
    // Check what changed
    if (fixedId !== d.id) changes.push(`id: ${d.id} → ${fixedId}`);
    if (!d.topic) changes.push(`added topic: "${fixed_data.topic}"`);
    if (!d.category) changes.push(`added category: "Uncategorized"`);
    if (!d.lang) changes.push(`added lang: "en"`);
    
    if (changes.length > 0) {
      // Update or create new document with fixed ID
      await db.collection("topics2").doc(fixedId).set(fixed_data);
      
      // Delete old document if ID changed
      if (fixedId !== d.id) {
        await db.collection("topics2").doc(d.id).delete();
      }
      
      report.push({ 
        action: fixedId !== d.id ? "renamed" : "updated", 
        from: d.id, 
        to: fixedId,
        changes 
      });
      
      fixed++;
      console.log(`   ✓ ${d.id}: ${changes.join(', ')}`);
    }
  }
  
  if (fixed === 0) {
    console.log('✅ All documents valid');
  } else {
    console.log(`✅ Fixed ${fixed} documents`);
  }
  console.log();
  
  // Phase 3: Optional import new topics
  const addArg = process.argv.find(a => a.includes("--add"));
  if (addArg) {
    console.log('📥 Phase 3: Importing new topics...');
    const filePath = addArg.split("=")[1];
    
    try {
      const newTopics = JSON.parse(readFileSync(filePath, "utf8"));
      let imported = 0;
      
      for (const t of newTopics) {
        const normalizedId = normalize(t.topic);
        
        // Skip if already exists
        if (topicMap.has(normalizedId)) {
          console.log(`   ⊘ Skipped "${t.topic}" (already exists as ${topicMap.get(normalizedId)})`);
          continue;
        }
        
        const newDoc = {
          id: normalizedId,
          topic: t.topic,
          category: t.category || "Uncategorized",
          lang: (t.lang || "en").toLowerCase(),
          area: t.area || null,
          keywords: t.keywords || [],
          difficulty: t.difficulty || "intermediate"
        };
        
        await db.collection("topics2").doc(normalizedId).set(newDoc);
        report.push({ action: "imported", id: normalizedId, source: filePath });
        imported++;
        console.log(`   ✓ Imported "${t.topic}" (${normalizedId})`);
      }
      
      console.log(`✅ Imported ${imported} new topics`);
    } catch (error) {
      console.error(`❌ Failed to import from ${filePath}:`, error.message);
    }
    console.log();
  }
  
  // Write audit report
  const auditPath = resolve(process.cwd(), 'topics2_audit.json');
  const audit = {
    timestamp: new Date().toISOString(),
    total_documents: docs.length,
    duplicates_found: duplicates.length,
    duplicates,
    changes_made: report.length,
    report
  };
  
  writeFileSync(auditPath, JSON.stringify(audit, null, 2));
  
  console.log('📄 Summary:');
  console.log(`   Total documents: ${docs.length}`);
  console.log(`   Duplicates found: ${duplicates.length}`);
  console.log(`   Changes made: ${report.length}`);
  console.log(`   Audit report: ${auditPath}`);
  console.log();
  console.log('✅ Validation complete!');
  
  process.exit(0);
})().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
