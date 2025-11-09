/**
 * Panel Role Enrichment Module
 * 
 * Dynamically selects appropriate expert panel members based on case topic/category.
 * Ensures realistic, specialty-matched academic discourse.
 * 
 * Usage:
 *   import { getPanelRoles } from './utils/panelRoles.mjs';
 *   const roles = getPanelRoles('Acute Coronary Syndrome', 'Cardiology');
 */

// Core roles always included
const CORE_ROLES = [
  'Professor of Medicine',
  'Emergency Medicine Specialist'
];

// Specialty-specific role mappings
const SPECIALTY_ROLES = {
  Cardiology: [
    'Interventional Cardiologist',
    'Clinical Pharmacology (Cardiology)',
    'Intensive Care Medicine',
    'Cardiac Imaging Specialist'
  ],
  'Infectious Diseases': [
    'Infectious Disease Specialist',
    'Clinical Microbiology',
    'Antimicrobial Stewardship',
    'Critical Care Medicine',
    'Tropical Medicine Specialist'
  ],
  Pulmonology: [
    'Pulmonologist',
    'Critical Care Medicine',
    'Thoracic Imaging',
    'Respiratory Therapy',
    'Sleep Medicine Specialist'
  ],
  Neurology: [
    'Neurologist',
    'Neurosurgery',
    'Neuroradiology',
    'Stroke Medicine',
    'Neurointensive Care'
  ],
  Gastroenterology: [
    'Gastroenterologist',
    'Hepatology',
    'Interventional Endoscopy',
    'Nutrition & Metabolism',
    'General Surgery'
  ],
  Endocrinology: [
    'Endocrinologist',
    'Diabetes Specialist',
    'Clinical Pharmacology (Endocrine)',
    'Nutrition & Metabolism'
  ],
  Nephrology: [
    'Nephrologist',
    'Dialysis Medicine',
    'Transplant Medicine',
    'Critical Care Medicine'
  ],
  Psychiatry: [
    'Psychiatrist',
    'Clinical Psychology',
    'Addiction Medicine',
    'Neuropsychiatry',
    'Psychopharmacology'
  ],
  Pediatrics: [
    'Pediatrician',
    'Pediatric Emergency Medicine',
    'Neonatology',
    'Pediatric Intensive Care'
  ],
  'Obstetrics & Gynecology': [
    'Obstetrician',
    'Maternal-Fetal Medicine',
    'Reproductive Endocrinology',
    'Gynecologic Oncology'
  ],
  Oncology: [
    'Medical Oncologist',
    'Radiation Oncology',
    'Palliative Care',
    'Hematology',
    'Surgical Oncology'
  ],
  Orthopedics: [
    'Orthopedic Surgeon',
    'Sports Medicine',
    'Rheumatology',
    'Physical Medicine & Rehabilitation'
  ],
  Rheumatology: [
    'Rheumatologist',
    'Clinical Immunology',
    'Musculoskeletal Radiology'
  ],
  'Emergency Medicine': [
    'Emergency Physician',
    'Trauma Surgery',
    'Toxicology',
    'Prehospital Medicine'
  ],
  'General Practice': [
    'General Practitioner',
    'Family Medicine',
    'Community Health',
    'Preventive Medicine'
  ]
};

// Topic keyword → specialty role mappings
const TOPIC_KEYWORDS = {
  'ACS|STEMI|NSTEMI|myocardial infarction|angina': 'Cardiology',
  'sepsis|infection|pneumonia|meningitis|HIV': 'Infectious Diseases',
  'stroke|seizure|TIA|parkinson|dementia': 'Neurology',
  'COPD|asthma|pneumothorax|pulmonary embolism': 'Pulmonology',
  'cirrhosis|hepatitis|pancreatitis|IBD': 'Gastroenterology',
  'diabetes|thyroid|adrenal|hypoglycemia': 'Endocrinology',
  'renal failure|dialysis|kidney|AKI|CKD': 'Nephrology',
  'depression|anxiety|psychosis|schizophrenia': 'Psychiatry',
  'trauma|fracture|wound|burn': 'Emergency Medicine',
  'pregnancy|labor|abortion|preeclampsia': 'Obstetrics & Gynecology',
  'cancer|tumor|malignancy|chemotherapy': 'Oncology'
};

// Universal roles that complement any specialty
const UNIVERSAL_ROLES = [
  'General Practice',
  'Clinical Pharmacology',
  'Medical Ethics',
  'Public Health',
  'Radiology',
  'Laboratory Medicine',
  'Palliative Care'
];

/**
 * Detect primary specialty from topic
 */
function detectSpecialty(topic, category) {
  // First try category direct match
  if (SPECIALTY_ROLES[category]) {
    return category;
  }
  
  // Then try topic keyword matching
  const topicLower = topic.toLowerCase();
  for (const [pattern, specialty] of Object.entries(TOPIC_KEYWORDS)) {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(topicLower)) {
      return specialty;
    }
  }
  
  // Default fallback
  return 'General Practice';
}

/**
 * Get panel roles for a specific case
 * 
 * @param {string} topic - Case topic (e.g., "Acute Coronary Syndrome")
 * @param {string} category - Medical category (e.g., "Cardiology")
 * @param {object} options - Configuration options
 * @returns {string[]} Array of expert roles
 */
export function getPanelRoles(topic, category, options = {}) {
  const {
    minRoles = 5,
    maxRoles = 7,
    includeGP = true,
    includeEthics = false,
    includePharmacology = true
  } = options;
  
  const roles = [...CORE_ROLES];
  
  // Add specialty-specific roles
  const specialty = detectSpecialty(topic, category);
  if (SPECIALTY_ROLES[specialty]) {
    const specialtyRoles = SPECIALTY_ROLES[specialty].slice(0, 3);
    roles.push(...specialtyRoles);
  }
  
  // Add complementary universal roles
  if (includeGP && !roles.includes('General Practice')) {
    roles.push('General Practice');
  }
  
  if (includePharmacology && !roles.some(r => r.includes('Pharmacology'))) {
    roles.push('Clinical Pharmacology');
  }
  
  if (includeEthics) {
    roles.push('Medical Ethics');
  }
  
  // Add more universal roles if needed to reach minRoles
  const availableUniversal = UNIVERSAL_ROLES.filter(r => !roles.includes(r));
  while (roles.length < minRoles && availableUniversal.length > 0) {
    roles.push(availableUniversal.shift());
  }
  
  // Limit to maxRoles
  return roles.slice(0, maxRoles);
}

/**
 * Get role-specific expertise areas for prompting
 */
export function getRoleExpertise(role) {
  const expertise = {
    'Professor of Medicine': 'Academic leadership, evidence synthesis, clinical research, guideline development',
    'Emergency Medicine Specialist': 'Acute stabilization, rapid assessment, triage, resuscitation protocols',
    'Interventional Cardiologist': 'PCI techniques, coronary intervention, acute MI management, device therapy',
    'Clinical Pharmacology': 'Drug interactions, pharmacokinetics, dose optimization, adverse effects',
    'Intensive Care Medicine': 'Critical illness management, mechanical ventilation, shock, multi-organ support',
    'General Practice': 'Primary care perspective, patient continuity, prevention, community resources',
    'Medical Ethics': 'End-of-life decisions, patient autonomy, resource allocation, informed consent',
    'Infectious Disease Specialist': 'Antimicrobial therapy, infection control, tropical diseases, HIV',
    'Nephrologist': 'Renal replacement therapy, electrolyte disorders, acid-base balance, CKD management',
    'Neurologist': 'Stroke protocols, seizure management, neuroimaging interpretation, neurodegenerative diseases',
    'Pulmonologist': 'Ventilation strategies, COPD/asthma, interstitial lung disease, pulmonary embolism'
  };
  
  return expertise[role] || 'General medical expertise';
}

export default {
  getPanelRoles,
  getRoleExpertise,
  detectSpecialty
};
