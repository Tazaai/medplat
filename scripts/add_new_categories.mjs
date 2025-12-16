#!/usr/bin/env node
/**
 * Add new categories and topics to Firestore topics2 collection
 * 
 * Usage:
 *   node scripts/add_new_categories.mjs
 */

import { initFirebase } from '../backend/firebaseClient.js';

// Initialize Firebase
const { firestore, initialized } = initFirebase();

if (!initialized) {
  console.error('❌ Failed to initialize Firebase. Make sure FIREBASE_SERVICE_KEY is set.');
  process.exit(1);
}

const db = firestore;
console.log('✅ Firebase initialized');
console.log('Starting script execution...');

// Normalize string to snake_case
const normalizeId = str => 
  str.toLowerCase()
     .replace(/\s+/g, "_")
     .replace(/[^a-z0-9_]/g, "")
     .replace(/_+/g, "_")
     .replace(/^_|_$/g, "");

// Categories and topics from user request
const newCategories = [
  {
    name: "Nutrition",
    description: "Clinical nutrition in hospital and outpatient care",
    topics: [
      "Clinical Nutrition Basics",
      "Hospital Malnutrition and Screening",
      "Enteral Nutrition: Indications and Complications",
      "Parenteral Nutrition: Indications and Monitoring",
      "Refeeding Syndrome: Prevention and Management",
      "Nutrition in Chronic Kidney Disease",
      "Nutrition in Chronic Liver Disease",
      "Nutrition in Heart Failure and Fluid Restriction",
      "Nutrition in Diabetes and Metabolic Syndrome",
      "Nutrition in Frail or Elderly Patients"
    ]
  },
  {
    name: "Weight Loss",
    description: "Assessment and management of overweight and obesity",
    topics: [
      "Initial Assessment of Overweight and Obesity",
      "Lifestyle and Dietary Interventions for Weight Loss",
      "Structured Exercise and Activity Programs",
      "Pharmacologic Treatment of Obesity",
      "Bariatric Surgery: Indications and Overview",
      "Weight Loss in Patients with Diabetes",
      "Preventing Weight Regain After Weight Loss",
      "Obesity and Cardiometabolic Risk Reduction",
      "Behavioral and Psychological Aspects of Weight Loss",
      "Monitoring Safety During Weight Loss Treatment"
    ]
  },
  {
    name: "Arterial Gas",
    description: "Arterial blood gas, acid–base and capnography",
    topics: [
      "ABG Interpretation: Stepwise Approach",
      "Metabolic Acidosis: High Anion Gap Patterns",
      "Metabolic Acidosis: Normal Anion Gap Patterns",
      "Metabolic Alkalosis: Causes and Correction",
      "Respiratory Acidosis: Acute vs Chronic",
      "Respiratory Alkalosis: Acute vs Chronic",
      "Mixed Acid–Base Disorders: Recognition",
      "Lactic Acidosis and Tissue Hypoperfusion",
      "DKA and Hyperosmolar States on ABG",
      "Salicylate and Other Intoxications on ABG",
      "ABG in COPD with CO2 Retention",
      "ABG in Acute Severe Asthma and Bronchodilators",
      "ABG in Sepsis and Septic Shock",
      "ABG in Cardiogenic and Hypovolemic Shock",
      "ABG in Mechanically Ventilated Patients",
      "Base Excess and Buffer Base Interpretation",
      "A–a Gradient and Shunt Physiology",
      "Capnography: Waveform Interpretation and Pitfalls",
      "Hypercapnia with Normal Oxygenation: Differential",
      "Hypoxemia with Normal CO2: Differential"
    ]
  }
];

(async () => {
  try {
    console.log('🚀 Adding new categories and topics to Firestore...\n');
    
    let totalAdded = 0;
    let totalSkipped = 0;
    
    for (const category of newCategories) {
      console.log(`📁 Processing category: ${category.name}`);
      console.log(`   Description: ${category.description}`);
      console.log(`   Topics: ${category.topics.length}\n`);
      
      for (const topicName of category.topics) {
        const topicId = normalizeId(topicName);
        const docRef = db.collection('topics2').doc(topicId);
        
        // Check if document already exists
        const existingDoc = await docRef.get();
        
        if (existingDoc.exists) {
          console.log(`   ⚠️  Skipping "${topicName}" (already exists: ${topicId})`);
          totalSkipped++;
          continue;
        }
        
        // Create document with correct structure
        const doc = {
          id: topicId,
          topic: topicName,
          category: category.name,
          keywords: {
            topic: topicName
          }
        };
        
        // Write document directly
        await docRef.set(doc);
        totalAdded++;
        
        console.log(`   ✅ Added: "${topicName}" (${topicId})`);
      }
      
      console.log('');
    }
    
    console.log('========================================');
    console.log('✅ COMPLETE');
    console.log('========================================');
    console.log(`Total topics added: ${totalAdded}`);
    console.log(`Total topics skipped: ${totalSkipped}`);
    console.log(`Total categories: ${newCategories.length}`);
    console.log('');
    console.log('Categories added:');
    newCategories.forEach(cat => {
      console.log(`  - ${cat.name} (${cat.topics.length} topics)`);
    });
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
