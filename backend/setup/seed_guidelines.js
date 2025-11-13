#!/usr/bin/env node
/**
 * Firestore Guidelines Seeding Script
 * Phase 4 Milestone 1: Migrate GUIDELINE_REGISTRY to Firestore
 * 
 * Usage: node backend/setup/seed_guidelines.js
 * 
 * This script:
 * - Migrates static GUIDELINE_REGISTRY to Firestore collection `guideline_registry`
 * - Uses idempotent logic (skips if already seeded)
 * - Maintains same structure as Phase 3 static registry
 */

import { db } from '../firebaseClient.js';

// Static guideline registry (same as in guidelines_api.mjs)
const GUIDELINE_REGISTRY = {
  Denmark: {
    'Atrial Fibrillation': {
      local: [
        {
          society: 'Sundhedsstyrelsen',
          year: 2024,
          title: 'National klinisk retningslinje for behandling af atrieflimren',
          doi_or_url: 'https://www.sst.dk/da/udgivelser/2024/nkr-atrieflimren',
          recommendation: 'Antikoagulation anbefales ved CHA₂DS₂-VASc ≥2',
          class: 'I',
          level: 'A'
        }
      ],
      national: [
        {
          society: 'Danish Society of Cardiology',
          year: 2023,
          title: 'Guidelines for Management of Atrial Fibrillation',
          doi_or_url: 'https://nbv.cardio.dk/af',
          recommendation: 'Follow ESC guidelines with local adaptations',
          class: 'I',
          level: 'A'
        }
      ],
      regional: [
        {
          society: 'ESC',
          year: 2023,
          title: '2023 ESC Guidelines for Atrial Fibrillation Management',
          doi_or_url: 'doi:10.1093/eurheartj/ehad194',
          recommendation: 'Anticoagulation for CHA₂DS₂-VASc ≥2 (males) or ≥3 (females)',
          class: 'I',
          level: 'A'
        }
      ],
      international: [
        {
          society: 'AHA/ACC',
          year: 2023,
          title: '2023 ACC/AHA/ACCP/HRS Guideline for AF',
          doi_or_url: 'doi:10.1161/CIR.0000000000001193',
          recommendation: 'Oral anticoagulation for CHA₂DS₂-VASc ≥2',
          class: 'I',
          level: 'A'
        },
        {
          society: 'WHO',
          year: 2022,
          title: 'Global Guidelines on Cardiovascular Disease Prevention',
          doi_or_url: 'https://www.who.int/publications/i/item/9789240045064',
          recommendation: 'Evidence-based management of atrial fibrillation',
          class: 'I',
          level: 'A'
        }
      ]
    }
  },
  'United States': {
    'Atrial Fibrillation': {
      local: [],
      national: [
        {
          society: 'AHA/ACC',
          year: 2023,
          title: '2023 ACC/AHA/ACCP/HRS Guideline for AF',
          doi_or_url: 'doi:10.1161/CIR.0000000000001193',
          recommendation: 'Oral anticoagulation for CHA₂DS₂-VASc ≥2',
          class: 'I',
          level: 'A'
        }
      ],
      regional: [],
      international: [
        {
          society: 'ESC',
          year: 2023,
          title: '2023 ESC Guidelines for Atrial Fibrillation Management',
          doi_or_url: 'doi:10.1093/eurheartj/ehad194',
          recommendation: 'Anticoagulation for CHA₂DS₂-VASc ≥2 (males) or ≥3 (females)',
          class: 'I',
          level: 'A'
        }
      ]
    }
  },
  global: {
    'Atrial Fibrillation': {
      local: [],
      national: [],
      regional: [],
      international: [
        {
          society: 'WHO',
          year: 2022,
          title: 'Global Guidelines on Cardiovascular Disease Prevention',
          doi_or_url: 'https://www.who.int/publications/i/item/9789240045064',
          recommendation: 'Evidence-based management of atrial fibrillation',
          class: 'I',
          level: 'A'
        }
      ]
    }
  }
};

async function seedGuidelines() {
  try {
    console.log('🌱 Starting Firestore guidelines seeding...');
    console.log('📦 Collection: guideline_registry');
    console.log('');

    if (!db) {
      console.error('❌ Firestore not initialized. Check firebaseClient.js configuration.');
      process.exit(1);
    }

    const collection = db.collection('guideline_registry');
    let seededCount = 0;
    let skippedCount = 0;

    // Iterate through regions
    for (const [region, topics] of Object.entries(GUIDELINE_REGISTRY)) {
      console.log(`\n📍 Region: ${region}`);
      
      // Iterate through topics in this region
      for (const [topic, guidelines] of Object.entries(topics)) {
        const docId = `${region}_${topic}`.replace(/\s+/g, '_').toLowerCase();
        
        // Check if document already exists (idempotent)
        const docRef = collection.doc(docId);
        const doc = await docRef.get();
        
        if (doc.exists) {
          console.log(`   ⏭️  Skipped: ${topic} (already exists)`);
          skippedCount++;
          continue;
        }
        
        // Create document with guideline data
        await docRef.set({
          region,
          topic,
          guidelines,
          seededAt: new Date().toISOString(),
          version: '4.0.0-alpha'
        });
        
        console.log(`   ✅ Seeded: ${topic}`);
        seededCount++;
      }
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Firestore Guidelines Seeding Complete');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Seeded: ${seededCount} documents`);
    console.log(`⏭️  Skipped: ${skippedCount} documents (already existed)`);
    console.log(`📦 Total: ${seededCount + skippedCount} documents in guideline_registry`);
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding guidelines:', error);
    process.exit(1);
  }
}

// Run seeding
seedGuidelines();
