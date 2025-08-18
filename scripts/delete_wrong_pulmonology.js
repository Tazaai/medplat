// delete_wrong_pulmonology.js
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

// List of IDs inserted with "Internal Medicine" category
const badPulmonologyIds = [
  "asthma",
  "copd",
  "acute_exacerbation_of_copd",
  "bronchiectasis",
  "interstitial_lung_disease",
  "idiopathic_pulmonary_fibrosis",
  "sarcoidosis",
  "pneumoconiosis",
  "community_acquired_pneumonia",
  "hospital_acquired_pneumonia",
  "ventilator_associated_pneumonia",
  "tuberculosis",
  "pulmonary_fungal_infections",
  "covid19_pneumonia",
  "pulmonary_embolism",
  "pulmonary_hypertension",
  "cor_pulmonale",
  "pneumothorax",
  "pleural_effusion",
  "empyema",
  "hemothorax",
  "chylothorax",
  "lung_cancer_nsclc",
  "lung_cancer_sclc",
  "pancoast_tumor",
  "lung_carcinoid",
  "obstructive_sleep_apnea",
  "central_sleep_apnea",
  "obesity_hypoventilation",
  "ards",
  "chronic_cough",
  "hemoptysis",
  "respiratory_failure",
  "hypoxia",
  "hypercapnia",
  "spirometry",
  "bronchoscopy",
  "pfts",
  "abg_interpretation",
  "noninvasive_ventilation",
  "mechanical_ventilation",
  "oxygen_therapy"
];

async function deleteWrongPulmonologyDocs() {
  let deleted = 0;
  for (const id of badPulmonologyIds) {
    const docRef = db.doc(`topics2/${id}`);
    const snap = await docRef.get();
    if (snap.exists && snap.data().category === "Internal Medicine") {
      await docRef.delete();
      console.log(`🗑️ Deleted: ${id}`);
      deleted++;
    }
  }
  console.log(`✅ Finished cleanup. ${deleted} documents removed.`);
}

deleteWrongPulmonologyDocs().catch(console.error);
