#!/usr/bin/env node
// add_categories_and_topics.mjs
// Add 14 new categories with 50+ topics each, and review existing categories

import { initFirebase } from '../backend/firebaseClient.js';
import { getOpenAIClient } from '../backend/openaiClient.js';

// New categories to add (14 total)
const NEW_CATEGORIES = [
  'Geriatrics',
  'Critical Care / ICU Medicine',
  'Sports Medicine',
  'Allergy & Immunology',
  'Family Medicine',
  'Preventive Medicine',
  'Pain Medicine',
  'Sleep Medicine',
  'Medical Ethics',
  'Forensic Medicine',
  'Travel Medicine',
  'Wilderness Medicine',
  'Medical Genetics',
  'ALS'
];

// Topics for each new category (50+ per category)
const CATEGORY_TOPICS = {
  'Geriatrics': [
    'Falls in Elderly', 'Polypharmacy Management', 'Delirium Assessment', 'Dementia Care',
    'Frailty Syndrome', 'Sarcopenia', 'Osteoporosis Management', 'Urinary Incontinence',
    'Pressure Ulcers', 'Elder Abuse', 'Cognitive Decline', 'Medication Review',
    'Functional Assessment', 'Geriatric Depression', 'Hip Fracture Management',
    'Parkinson Disease in Elderly', 'Stroke in Elderly', 'Heart Failure in Elderly',
    'Atrial Fibrillation in Elderly', 'Hypertension in Elderly', 'Diabetes in Elderly',
    'Chronic Kidney Disease in Elderly', 'COPD in Elderly', 'Pneumonia in Elderly',
    'UTI in Elderly', 'Sepsis in Elderly', 'Dehydration in Elderly', 'Malnutrition',
    'Swallowing Disorders', 'Hearing Loss', 'Vision Impairment', 'Sleep Disorders',
    'Constipation', 'Chronic Pain', 'End of Life Care', 'Advance Directives',
    'Palliative Care', 'Hospice Care', 'Caregiver Support', 'Social Isolation',
    'Driving Safety', 'Home Safety Assessment', 'Medication Adherence',
    'Vaccination in Elderly', 'Cancer Screening', 'Bone Health', 'Muscle Mass Loss',
    'Balance Disorders', 'Gait Disorders', 'Memory Loss', 'Behavioral Changes'
  ],
  'Critical Care / ICU Medicine': [
    'Mechanical Ventilation', 'ARDS Management', 'Sepsis Protocol', 'Septic Shock',
    'Cardiogenic Shock', 'Hypovolemic Shock', 'Distributive Shock', 'Vasopressor Use',
    'Inotropic Support', 'Fluid Resuscitation', 'Acute Respiratory Failure',
    'Ventilator Associated Pneumonia', 'ICU Delirium', 'Sedation Management',
    'Analgesia in ICU', 'Neuromuscular Blockade', 'Prone Positioning',
    'Extracorporeal Membrane Oxygenation', 'Continuous Renal Replacement Therapy',
    'Acute Kidney Injury in ICU', 'Stress Ulcer Prophylaxis', 'Deep Vein Thrombosis Prophylaxis',
    'Central Line Associated Bloodstream Infection', 'Catheter Associated UTI',
    'ICU Acquired Weakness', 'Post ICU Syndrome', 'Brain Death Determination',
    'Organ Donation', 'Withdrawal of Life Support', 'Family Communication in ICU',
    'Endotracheal Intubation', 'Rapid Sequence Intubation', 'Difficult Airway',
    'Cricothyrotomy', 'Tracheostomy Care', 'Chest Tube Management', 'Pleural Effusion',
    'Pneumothorax', 'Acute Coronary Syndrome in ICU', 'Cardiac Arrest',
    'Post Cardiac Arrest Care', 'Status Epilepticus', 'Intracranial Pressure Monitoring',
    'Cerebral Perfusion Pressure', 'Hypothermia Protocol', 'Hyperthermia Management',
    'Acid Base Disorders', 'Electrolyte Imbalances', 'Hyperglycemia in ICU',
    'Adrenal Insufficiency', 'Thyroid Storm', 'Myxedema Coma'
  ],
  'Sports Medicine': [
    'Concussion Management', 'ACL Injury', 'Meniscal Tear', 'Rotator Cuff Injury',
    'Tennis Elbow', 'Golfer Elbow', 'Shin Splints', 'Stress Fractures',
    'Achilles Tendon Rupture', 'Plantar Fasciitis', 'Ankle Sprain', 'Hamstring Strain',
    'Groin Strain', 'Hip Flexor Injury', 'Lower Back Pain in Athletes',
    'Shoulder Impingement', 'Frozen Shoulder', 'Dislocated Shoulder',
    'Patellofemoral Pain Syndrome', 'IT Band Syndrome', 'Runner Knee',
    'Exercise Induced Asthma', 'Heat Illness', 'Heat Stroke', 'Heat Exhaustion',
    'Exercise Associated Hyponatremia', 'Rhabdomyolysis', 'Compartment Syndrome',
    'Overtraining Syndrome', 'Relative Energy Deficiency', 'Female Athlete Triad',
    'Sudden Cardiac Death', 'Pre Participation Screening', 'Cardiac Screening',
    'Return to Play Protocol', 'Injury Prevention', 'Biomechanics Assessment',
    'Performance Nutrition', 'Hydration Strategies', 'Supplement Use',
    'Doping Prevention', 'Doping Testing', 'Sports Psychology', 'Mental Health in Athletes',
    'Eating Disorders in Athletes', 'Sleep in Athletes', 'Recovery Strategies',
    'Rehabilitation Protocols', 'Sports Specific Injuries', 'Youth Sports Safety'
  ],
  'Allergy & Immunology': [
    'Anaphylaxis', 'Food Allergy', 'Drug Allergy', 'Insect Sting Allergy',
    'Latex Allergy', 'Allergic Rhinitis', 'Asthma', 'Atopic Dermatitis',
    'Urticaria', 'Angioedema', 'Contact Dermatitis', 'Allergic Conjunctivitis',
    'Eosinophilic Disorders', 'Mastocytosis', 'Primary Immunodeficiency',
    'Common Variable Immunodeficiency', 'Selective IgA Deficiency', 'X Linked Agammaglobulinemia',
    'Severe Combined Immunodeficiency', 'Chronic Granulomatous Disease',
    'Complement Deficiencies', 'Autoimmune Disorders', 'Systemic Lupus Erythematosus',
    'Rheumatoid Arthritis', 'Sjogren Syndrome', 'Scleroderma', 'Mixed Connective Tissue Disease',
    'Vasculitis', 'Giant Cell Arteritis', 'Granulomatosis with Polyangiitis',
    'Eosinophilic Granulomatosis', 'Hypersensitivity Pneumonitis', 'Allergic Bronchopulmonary Aspergillosis',
    'Drug Hypersensitivity', 'Stevens Johnson Syndrome', 'Toxic Epidermal Necrolysis',
    'Serum Sickness', 'Allergic Contact Dermatitis', 'Photoallergic Reaction',
    'Immunotherapy', 'Allergen Immunotherapy', 'Desensitization Protocols',
    'Immunoglobulin Replacement', 'Immunosuppression', 'Transplant Immunology',
    'Graft Versus Host Disease', 'Transplant Rejection', 'Immunodeficiency Workup',
    'Allergy Testing', 'Skin Prick Testing', 'Patch Testing', 'Component Resolved Diagnosis'
  ],
  'Family Medicine': [
    'Hypertension Management', 'Diabetes Management', 'Hyperlipidemia',
    'Preventive Care', 'Well Child Visits', 'Well Adult Visits', 'Vaccination Schedule',
    'Cancer Screening', 'Depression Screening', 'Anxiety Management', 'Stress Management',
    'Smoking Cessation', 'Obesity Management', 'Weight Loss Counseling',
    'Chronic Disease Management', 'Medication Management', 'Polypharmacy',
    'Medication Reconciliation', 'Care Coordination', 'Referral Management',
    'Acute Illness Management', 'Upper Respiratory Infection', 'Sinusitis',
    'Otitis Media', 'Pharyngitis', 'Bronchitis', 'Pneumonia', 'UTI',
    'Gastroenteritis', 'Skin Infections', 'Cellulitis', 'Abscess',
    'Wound Care', 'Minor Trauma', 'Fracture Management', 'Sprain Management',
    'Contraception Counseling', 'Prenatal Care', 'Postnatal Care',
    'Menopause Management', 'Osteoporosis Screening', 'Bone Density Testing',
    'Mental Health Screening', 'Substance Abuse', 'Alcohol Use Disorder',
    'Domestic Violence', 'Elder Abuse', 'Child Abuse', 'Health Maintenance',
    'Patient Education', 'Lifestyle Counseling', 'Exercise Prescription',
    'Nutrition Counseling', 'Sleep Hygiene', 'Travel Health'
  ],
  'Preventive Medicine': [
    'Cancer Screening Guidelines', 'Breast Cancer Screening', 'Cervical Cancer Screening',
    'Colorectal Cancer Screening', 'Lung Cancer Screening', 'Prostate Cancer Screening',
    'Skin Cancer Screening', 'Vaccination Schedule', 'Childhood Vaccinations',
    'Adult Vaccinations', 'Influenza Vaccination', 'Pneumococcal Vaccination',
    'HPV Vaccination', 'Hepatitis B Vaccination', 'Meningococcal Vaccination',
    'Tetanus Vaccination', 'COVID 19 Vaccination', 'Health Risk Assessment',
    'Cardiovascular Risk Assessment', 'Diabetes Risk Assessment', 'Osteoporosis Risk',
    'Depression Screening', 'Anxiety Screening', 'Substance Abuse Screening',
    'Tobacco Use Screening', 'Alcohol Use Screening', 'Domestic Violence Screening',
    'STI Screening', 'HIV Screening', 'Hepatitis C Screening',
    'Hypertension Screening', 'Hyperlipidemia Screening', 'Diabetes Screening',
    'Obesity Screening', 'Nutrition Assessment', 'Physical Activity Assessment',
    'Sleep Assessment', 'Mental Health Assessment', 'Fall Risk Assessment',
    'Medication Review', 'Drug Interaction Screening', 'Adverse Drug Reaction Prevention',
    'Primary Prevention', 'Secondary Prevention', 'Tertiary Prevention',
    'Health Promotion', 'Disease Prevention', 'Injury Prevention',
    'Occupational Health', 'Environmental Health', 'Public Health Surveillance'
  ],
  'Pain Medicine': [
    'Acute Pain Management', 'Chronic Pain Management', 'Postoperative Pain',
    'Cancer Pain', 'Neuropathic Pain', 'Nociceptive Pain', 'Visceral Pain',
    'Musculoskeletal Pain', 'Low Back Pain', 'Neck Pain', 'Headache',
    'Migraine', 'Tension Headache', 'Cluster Headache', 'Trigeminal Neuralgia',
    'Postherpetic Neuralgia', 'Diabetic Neuropathy', 'Peripheral Neuropathy',
    'Complex Regional Pain Syndrome', 'Fibromyalgia', 'Myofascial Pain',
    'Arthritis Pain', 'Osteoarthritis Pain', 'Rheumatoid Arthritis Pain',
    'Pain Assessment', 'Pain Scales', 'Multimodal Analgesia', 'Opioid Therapy',
    'Opioid Risk Assessment', 'Opioid Misuse Prevention', 'Opioid Tapering',
    'Non Opioid Analgesics', 'NSAIDs', 'Acetaminophen', 'Adjuvant Analgesics',
    'Antidepressants for Pain', 'Anticonvulsants for Pain', 'Topical Analgesics',
    'Regional Anesthesia', 'Nerve Blocks', 'Epidural Injection', 'Facet Joint Injection',
    'Trigger Point Injection', 'Radiofrequency Ablation', 'Spinal Cord Stimulation',
    'Intrathecal Pump', 'Physical Therapy for Pain', 'Cognitive Behavioral Therapy',
    'Mindfulness for Pain', 'Acupuncture', 'Massage Therapy', 'Pain Psychology',
    'Pain Rehabilitation', 'Multidisciplinary Pain Management'
  ],
  'Sleep Medicine': [
    'Insomnia', 'Obstructive Sleep Apnea', 'Central Sleep Apnea', 'Restless Legs Syndrome',
    'Periodic Limb Movement Disorder', 'Narcolepsy', 'Hypersomnia', 'Circadian Rhythm Disorders',
    'Delayed Sleep Phase Syndrome', 'Advanced Sleep Phase Syndrome', 'Shift Work Disorder',
    'Jet Lag', 'Parasomnias', 'Sleepwalking', 'Night Terrors', 'REM Sleep Behavior Disorder',
    'Sleep Paralysis', 'Bruxism', 'Sleep Related Eating Disorder', 'Sleep Disordered Breathing',
    'Upper Airway Resistance Syndrome', 'Sleep Hypoventilation', 'Sleep Related Hypoxemia',
    'Sleep Study Interpretation', 'Polysomnography', 'Home Sleep Testing',
    'CPAP Therapy', 'BiPAP Therapy', 'AutoPAP Therapy', 'Oral Appliance Therapy',
    'Sleep Hygiene', 'Cognitive Behavioral Therapy for Insomnia', 'Sleep Restriction',
    'Stimulus Control', 'Relaxation Techniques', 'Medication for Sleep',
    'Melatonin', 'Sleep Aids', 'Sleep Deprivation', 'Sleep and Health',
    'Sleep and Cardiovascular Disease', 'Sleep and Diabetes', 'Sleep and Obesity',
    'Sleep and Mental Health', 'Sleep in Children', 'Sleep in Elderly',
    'Sleep in Pregnancy', 'Sleep and Shift Work', 'Sleep and Travel',
    'Sleep Environment', 'Sleep Disorders in Neurological Disease', 'Sleep and Medications'
  ],
  'Medical Ethics': [
    'Informed Consent', 'Capacity Assessment', 'Decision Making Capacity',
    'Advance Directives', 'Living Will', 'Durable Power of Attorney', 'Healthcare Proxy',
    'End of Life Decisions', 'Withdrawal of Life Support', 'Do Not Resuscitate',
    'Physician Assisted Death', 'Euthanasia', 'Medical Futility', 'Resource Allocation',
    'Triage Ethics', 'Organ Allocation', 'Transplant Ethics', 'Research Ethics',
    'Institutional Review Board', 'Informed Consent in Research', 'Vulnerable Populations',
    'Pediatric Ethics', 'Geriatric Ethics', 'Pregnancy Ethics', 'Mental Health Ethics',
    'Confidentiality', 'Privacy', 'HIPAA', 'Medical Records', 'Disclosure',
    'Truth Telling', 'Breaking Bad News', 'Medical Error Disclosure',
    'Professional Boundaries', 'Dual Relationships', 'Conflicts of Interest',
    'Gifts from Patients', 'Industry Relationships', 'Academic Integrity',
    'Plagiarism', 'Authorship', 'Peer Review', 'Medical Malpractice',
    'Negligence', 'Standard of Care', 'Expert Witness', 'Medical Testimony',
    'Cultural Competence', 'Religious Considerations', 'Language Barriers',
    'Health Disparities', 'Social Justice', 'Public Health Ethics'
  ],
  'Forensic Medicine': [
    'Death Investigation', 'Autopsy', 'Cause of Death', 'Manner of Death',
    'Time of Death', 'Postmortem Changes', 'Livor Mortis', 'Rigor Mortis',
    'Algor Mortis', 'Decomposition', 'Trauma Assessment', 'Blunt Force Trauma',
    'Sharp Force Trauma', 'Gunshot Wounds', 'Stab Wounds', 'Asphyxia',
    'Strangulation', 'Hanging', 'Drowning', 'Burns', 'Electrical Injuries',
    'Child Abuse', 'Elder Abuse', 'Domestic Violence', 'Sexual Assault',
    'Toxicology', 'Drug Overdose', 'Alcohol Intoxication', 'Poisoning',
    'Forensic Toxicology', 'Drug Testing', 'Blood Alcohol', 'Toxic Substances',
    'Medical Malpractice', 'Negligence', 'Standard of Care', 'Expert Testimony',
    'Medical Records Review', 'Injury Documentation', 'Photography in Forensics',
    'Chain of Custody', 'Evidence Collection', 'Wound Documentation',
    'Age Estimation', 'Identification', 'DNA Analysis', 'Fingerprint Analysis',
    'Bite Mark Analysis', 'Pattern Injuries', 'Defense Wounds', 'Self Inflicted Injuries',
    'Malingering', 'Factitious Disorder', 'Forensic Psychiatry', 'Competency Evaluation'
  ],
  'Travel Medicine': [
    'Pre Travel Consultation', 'Travel Vaccinations', 'Yellow Fever Vaccine',
    'Typhoid Vaccine', 'Hepatitis A Vaccine', 'Hepatitis B Vaccine', 'Rabies Vaccine',
    'Japanese Encephalitis Vaccine', 'Meningococcal Vaccine', 'Cholera Vaccine',
    'Malaria Prevention', 'Malaria Chemoprophylaxis', 'Antimalarial Medications',
    'Traveler Diarrhea', 'Food and Water Safety', 'Altitude Illness',
    'Acute Mountain Sickness', 'High Altitude Pulmonary Edema', 'High Altitude Cerebral Edema',
    'Jet Lag', 'Motion Sickness', 'Deep Vein Thrombosis Prevention',
    'Traveler Thrombosis', 'Travel Insurance', 'Medical Evacuation',
    'Tropical Diseases', 'Dengue Fever', 'Chikungunya', 'Zika Virus',
    'Yellow Fever', 'Malaria', 'Typhoid Fever', 'Cholera', 'Hepatitis A',
    'Hepatitis E', 'Traveler Health Kit', 'Prescription Medications Abroad',
    'Medical Conditions and Travel', 'Pregnancy and Travel', 'Children and Travel',
    'Elderly Travelers', 'Disabled Travelers', 'Chronic Disease and Travel',
    'Diabetes and Travel', 'Cardiac Disease and Travel', 'Respiratory Disease and Travel',
    'Post Travel Illness', 'Fever in Returning Traveler', 'Diarrhea in Returning Traveler',
    'Skin Lesions in Traveler', 'Respiratory Symptoms in Traveler', 'Travel Health Resources'
  ],
  'Wilderness Medicine': [
    'Hypothermia', 'Frostbite', 'Heat Illness', 'Heat Stroke', 'Heat Exhaustion',
    'Dehydration', 'Altitude Illness', 'Acute Mountain Sickness', 'HACE', 'HAPE',
    'Lightning Injury', 'Wilderness Trauma', 'Improvised Splinting', 'Improvised Bandaging',
    'Wilderness Wound Care', 'Infection Prevention', 'Water Purification',
    'Food Safety', 'Wildlife Encounters', 'Bear Safety', 'Snake Bites',
    'Spider Bites', 'Insect Bites', 'Tick Bites', 'Lyme Disease Prevention',
    'Wilderness Evacuation', 'Search and Rescue', 'Emergency Signaling',
    'Shelter Building', 'Fire Making', 'Navigation', 'Survival Skills',
    'Wilderness First Aid', 'CPR in Wilderness', 'Airway Management',
    'Shock Management', 'Fracture Management', 'Dislocation Reduction',
    'Sprain Management', 'Burn Management', 'Blisters', 'Foot Care',
    'Sun Protection', 'Eye Protection', 'Wilderness Hygiene',
    'Medical Kits', 'Improvised Medical Equipment', 'Wilderness Pharmacology',
    'Pain Management', 'Antibiotic Use', 'Waterborne Illness', 'Foodborne Illness',
    'Environmental Hazards', 'Weather Related Illness', 'Cold Injury',
    'Hot Weather Injury', 'Wilderness Mental Health', 'Stress Management'
  ],
  'Medical Genetics': [
    'Genetic Counseling', 'Family History', 'Pedigree Analysis', 'Inheritance Patterns',
    'Autosomal Dominant', 'Autosomal Recessive', 'X Linked', 'Mitochondrial Inheritance',
    'Chromosomal Disorders', 'Down Syndrome', 'Trisomy 21', 'Trisomy 18', 'Trisomy 13',
    'Turner Syndrome', 'Klinefelter Syndrome', 'Fragile X Syndrome', 'Prader Willi Syndrome',
    'Angelman Syndrome', 'Single Gene Disorders', 'Cystic Fibrosis', 'Sickle Cell Disease',
    'Thalassemia', 'Hemophilia', 'Duchenne Muscular Dystrophy', 'Huntington Disease',
    'Marfan Syndrome', 'Ehlers Danlos Syndrome', 'Neurofibromatosis', 'Tuberous Sclerosis',
    'Genetic Testing', 'Carrier Screening', 'Prenatal Testing', 'Newborn Screening',
    'Preimplantation Genetic Testing', 'Predictive Testing', 'Diagnostic Testing',
    'Pharmacogenomics', 'Drug Metabolism', 'Personalized Medicine', 'Targeted Therapy',
    'Cancer Genetics', 'BRCA Mutations', 'Lynch Syndrome', 'Familial Cancer Syndromes',
    'Cardiac Genetics', 'Familial Hypercholesterolemia', 'Long QT Syndrome',
    'Hypertrophic Cardiomyopathy', 'Dilated Cardiomyopathy', 'Arrhythmogenic Right Ventricular Dysplasia',
    'Metabolic Disorders', 'Phenylketonuria', 'Galactosemia', 'Maple Syrup Urine Disease',
    'Lysosomal Storage Diseases', 'Gaucher Disease', 'Tay Sachs Disease', 'Niemann Pick Disease',
    'Mitochondrial Disorders', 'Leber Hereditary Optic Neuropathy', 'MELAS', 'MERRF'
  ],
  'ALS': [
    'Advanced Life Support', 'Cardiac Arrest Algorithm', 'Ventricular Fibrillation',
    'Pulseless Ventricular Tachycardia', 'Asystole', 'Pulseless Electrical Activity',
    'Defibrillation', 'Cardioversion', 'CPR', 'High Quality CPR', 'Chest Compressions',
    'Airway Management', 'Endotracheal Intubation', 'Laryngeal Mask Airway',
    'Bag Valve Mask', 'Oxygen Delivery', 'Ventilation', 'Capnography',
    'ROSC', 'Post Cardiac Arrest Care', 'Targeted Temperature Management',
    'Therapeutic Hypothermia', 'Hemodynamic Support', 'Vasopressors',
    'Epinephrine', 'Norepinephrine', 'Dopamine', 'Dobutamine', 'Vasopressin',
    'Amiodarone', 'Lidocaine', 'Atropine', 'Calcium', 'Magnesium',
    'Sodium Bicarbonate', 'Glucose', 'Fluid Resuscitation', 'Blood Products',
    'Reversible Causes', '4 Hs and 4 Ts', 'Hypoxia', 'Hypovolemia',
    'Hypothermia', 'Hypo Hyperkalemia', 'Tension Pneumothorax', 'Tamponade',
    'Toxins', 'Thromboembolism', 'Team Dynamics', 'Leadership',
    'Communication', 'Closed Loop Communication', 'Situational Awareness',
    'Crisis Resource Management', 'Medical Emergency Team', 'Rapid Response Team',
    'Code Blue', 'Resuscitation Team', 'Post Resuscitation Care', 'Neurological Prognostication',
    'Brain Death', 'Organ Donation', 'Family Communication', 'End of Life Care'
  ]
};

// Convert to snake_case
function toSnakeCase(str) {
  return str.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
}

// Note: difficulty field removed - no longer used

// Main function
async function addCategoriesAndTopics() {
  console.log('🚀 Adding new categories and topics to Firestore...\n');
  
  // Check Firebase credentials
  if (!process.env.FIREBASE_SERVICE_KEY) {
    console.error('❌ FIREBASE_SERVICE_KEY not set!');
    process.exit(1);
  }
  
  const firebase = initFirebase();
  if (!firebase.initialized) {
    console.error('❌ Firebase initialization failed!');
    process.exit(1);
  }
  
  const db = firebase.firestore;
  const collection = db.collection('topics2');
  
  // Get existing topics to avoid duplicates
  console.log('📖 Reading existing topics...');
  const existingSnapshot = await collection.get();
  const existingTopics = new Set(existingSnapshot.docs.map(d => d.data().topic?.toLowerCase()));
  const existingCategories = new Set(existingSnapshot.docs.map(d => d.data().category).filter(Boolean));
  
  console.log(`   Found ${existingSnapshot.size} existing topics\n`);
  
  let totalAdded = 0;
  let totalSkipped = 0;
  
  // Add topics for each new category
  for (const category of NEW_CATEGORIES) {
    console.log(`📝 Processing category: ${category}`);
    
    if (existingCategories.has(category)) {
      console.log(`   ⚠️  Category already exists, adding missing topics...`);
    }
    
    const topics = CATEGORY_TOPICS[category] || [];
    const batch = db.batch();
    let batchCount = 0;
    let added = 0;
    let skipped = 0;
    
    for (const topic of topics) {
      const topicLower = topic.toLowerCase();
      
      // Skip if topic already exists
      if (existingTopics.has(topicLower)) {
        skipped++;
        continue;
      }
      
      const id = toSnakeCase(topic);
      
      const doc = {
        id,
        topic,
        category,
        keywords: { topic }
      };
      
      const docRef = collection.doc(id);
      batch.set(docRef, doc);
      batchCount++;
      added++;
      existingTopics.add(topicLower);
      
      // Commit batch when it reaches 500
      if (batchCount >= 500) {
        await batch.commit();
        console.log(`   ✅ Committed batch (${added} added so far)...`);
        batchCount = 0;
      }
    }
    
    // Commit remaining
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log(`   ✅ Added ${added} topics, skipped ${skipped} duplicates\n`);
    totalAdded += added;
    totalSkipped += skipped;
  }
  
  // Now review existing categories and add missing topics
  console.log('🔍 Reviewing existing categories for missing topics...\n');
  
  const existingCategoriesList = Array.from(existingCategories);
  const additionalTopics = await generateAdditionalTopics(existingCategoriesList);
  
  let reviewAdded = 0;
  let reviewSkipped = 0;
  
  for (const [category, topics] of Object.entries(additionalTopics)) {
    if (topics.length === 0) continue;
    
    console.log(`📝 Adding ${topics.length} topics to existing category: ${category}`);
    
    const batch = db.batch();
    let batchCount = 0;
    let added = 0;
    let skipped = 0;
    
    for (const topic of topics) {
      const topicLower = topic.toLowerCase();
      
      if (existingTopics.has(topicLower)) {
        skipped++;
        continue;
      }
      
      const id = toSnakeCase(topic);
      
      const doc = {
        id,
        topic,
        category,
        keywords: { topic }
      };
      
      const docRef = collection.doc(id);
      batch.set(docRef, doc);
      batchCount++;
      added++;
      existingTopics.add(topicLower);
      
      if (batchCount >= 500) {
        await batch.commit();
        batchCount = 0;
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log(`   ✅ Added ${added} topics, skipped ${skipped} duplicates\n`);
    reviewAdded += added;
    reviewSkipped += skipped;
  }
  
  // Summary
  console.log('='.repeat(60));
  console.log('📋 SUMMARY');
  console.log('='.repeat(60));
  console.log(`New categories added: ${NEW_CATEGORIES.length}`);
  console.log(`Topics added (new categories): ${totalAdded}`);
  console.log(`Topics skipped (duplicates): ${totalSkipped}`);
  console.log(`Topics added (existing categories): ${reviewAdded}`);
  console.log(`Topics skipped (existing, duplicates): ${reviewSkipped}`);
  console.log(`Total new topics: ${totalAdded + reviewAdded}`);
  console.log('='.repeat(60));
  console.log('\n✅ Complete!');
}

// Generate additional topics for existing categories using AI logic
async function generateAdditionalTopics(categories) {
  const additional = {};
  
  // Common missing topics per category (AI-generated suggestions)
  const suggestions = {
    'Cardiology': [
      'Atrial Flutter', 'Supraventricular Tachycardia', 'Wolff Parkinson White Syndrome',
      'Long QT Syndrome', 'Brugada Syndrome', 'Arrhythmogenic Right Ventricular Dysplasia',
      'Takotsubo Cardiomyopathy', 'Pericarditis', 'Constrictive Pericarditis',
      'Cardiac Tamponade', 'Endocarditis', 'Infective Endocarditis',
      'Rheumatic Heart Disease', 'Valvular Heart Disease', 'Aortic Stenosis',
      'Mitral Regurgitation', 'Tricuspid Regurgitation', 'Pulmonary Hypertension',
      'Eisenmenger Syndrome', 'Patent Foramen Ovale', 'Atrial Septal Defect',
      'Ventricular Septal Defect', 'Coarctation of Aorta', 'Tetralogy of Fallot',
      'Cardiac Catheterization', 'Echocardiography Interpretation', 'Stress Testing',
      'Cardiac MRI', 'Cardiac CT', 'Nuclear Cardiology', 'Electrophysiology Study',
      'Cardiac Resynchronization Therapy', 'Implantable Cardioverter Defibrillator',
      'Cardiac Rehabilitation', 'Cardiac Risk Stratification', 'Preoperative Cardiac Evaluation'
    ],
    'Emergency Medicine': [
      'Trauma Assessment', 'Primary Survey', 'Secondary Survey', 'ATLS Protocol',
      'Mass Casualty Incident', 'Triage', 'Disaster Medicine', 'Emergency Airway',
      'Rapid Sequence Intubation', 'Cricothyrotomy', 'Needle Thoracostomy',
      'Chest Tube Insertion', 'Pericardiocentesis', 'Emergency Ultrasound',
      'FAST Exam', 'Emergency Procedures', 'Wound Closure', 'Laceration Repair',
      'Abscess Drainage', 'Foreign Body Removal', 'Reduction Techniques',
      'Emergency Pharmacology', 'Pain Management', 'Sedation',
      'Pediatric Emergency', 'Geriatric Emergency', 'Obstetric Emergency',
      'Psychiatric Emergency', 'Toxicologic Emergency', 'Environmental Emergency',
      'Emergency Department Operations', 'Patient Flow', 'Overcrowding',
      'Emergency Disposition', 'Admission Criteria', 'Discharge Planning'
    ],
    'Infectious Diseases': [
      'Antimicrobial Stewardship', 'Antibiotic Resistance', 'MRSA', 'VRE',
      'Clostridioides Difficile', 'Sepsis', 'Septic Shock', 'Bacteremia',
      'Fungemia', 'Endocarditis', 'Meningitis', 'Encephalitis',
      'Pneumonia', 'Tuberculosis', 'HIV', 'AIDS',
      'Hepatitis B', 'Hepatitis C', 'Hepatitis A', 'Hepatitis E',
      'Influenza', 'COVID 19', 'RSV', 'Varicella',
      'Herpes Zoster', 'Herpes Simplex', 'Cytomegalovirus', 'Epstein Barr Virus',
      'Mononucleosis', 'Lyme Disease', 'Rocky Mountain Spotted Fever',
      'Malaria', 'Dengue', 'Chikungunya', 'Zika',
      'Travel Medicine', 'Tropical Diseases', 'Parasitic Infections',
      'Fungal Infections', 'Opportunistic Infections', 'Post Exposure Prophylaxis'
    ],
    'Neurology': [
      'Stroke', 'Ischemic Stroke', 'Hemorrhagic Stroke', 'TIA',
      'Seizure', 'Epilepsy', 'Status Epilepticus', 'Headache',
      'Migraine', 'Cluster Headache', 'Trigeminal Neuralgia',
      'Multiple Sclerosis', 'Parkinson Disease', 'Alzheimer Disease',
      'Dementia', 'Vascular Dementia', 'Lewy Body Dementia',
      'Frontotemporal Dementia', 'Amyotrophic Lateral Sclerosis',
      'Myasthenia Gravis', 'Guillain Barre Syndrome', 'Bell Palsy',
      'Peripheral Neuropathy', 'Diabetic Neuropathy', 'Carpal Tunnel Syndrome',
      'Meningitis', 'Encephalitis', 'Brain Abscess', 'Subdural Hematoma',
      'Epidural Hematoma', 'Subarachnoid Hemorrhage', 'Intracerebral Hemorrhage',
      'Brain Tumor', 'Spinal Cord Injury', 'Neuroimaging', 'EEG',
      'EMG', 'Lumbar Puncture', 'Neurological Examination'
    ],
    'Pediatrics': [
      'Newborn Care', 'Neonatal Resuscitation', 'Prematurity', 'Low Birth Weight',
      'Respiratory Distress Syndrome', 'Neonatal Jaundice', 'Feeding Issues',
      'Growth and Development', 'Developmental Milestones', 'Vaccination Schedule',
      'Well Child Visits', 'Childhood Immunizations', 'Fever in Children',
      'Febrile Seizure', 'Common Childhood Infections', 'Ear Infections',
      'Strep Throat', 'Pink Eye', 'Croup', 'Bronchiolitis',
      'Pneumonia in Children', 'Asthma in Children', 'Allergies in Children',
      'ADHD', 'Autism Spectrum Disorder', 'Learning Disabilities',
      'Childhood Obesity', 'Nutrition in Children', 'Adolescent Health',
      'Puberty', 'Menstrual Disorders', 'Eating Disorders',
      'Mental Health in Children', 'Child Abuse', 'Neglect',
      'Pediatric Emergency', 'Pediatric Trauma', 'Pediatric Procedures'
    ]
  };
  
  // Add suggestions for categories that exist
  for (const category of categories) {
    if (suggestions[category]) {
      additional[category] = suggestions[category];
    }
  }
  
  return additional;
}

// Run
addCategoriesAndTopics().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

