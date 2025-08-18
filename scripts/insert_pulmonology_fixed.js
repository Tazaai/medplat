// insert_pulmonology_fixed.js
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  ["Asthma", "asthma"],
  ["Chronic Obstructive Pulmonary Disease (COPD)", "copd"],
  ["Acute Exacerbation of COPD", "acute_exacerbation_of_copd"],
  ["Bronchiectasis", "bronchiectasis"],
  ["Interstitial Lung Disease (ILD)", "interstitial_lung_disease"],
  ["Idiopathic Pulmonary Fibrosis", "idiopathic_pulmonary_fibrosis"],
  ["Sarcoidosis", "sarcoidosis"],
  ["Pneumoconiosis (e.g., Asbestosis, Silicosis)", "pneumoconiosis"],
  ["Community-Acquired Pneumonia", "community_acquired_pneumonia"],
  ["Hospital-Acquired Pneumonia", "hospital_acquired_pneumonia"],
  ["Ventilator-Associated Pneumonia", "ventilator_associated_pneumonia"],
  ["Tuberculosis (TB)", "tuberculosis"],
  ["Pulmonary Fungal Infections (e.g., Aspergillosis)", "pulmonary_fungal_infections"],
  ["COVID-19 Pneumonia", "covid19_pneumonia"],
  ["Pulmonary Embolism (PE)", "pulmonary_embolism"],
  ["Pulmonary Hypertension", "pulmonary_hypertension"],
  ["Cor Pulmonale", "cor_pulmonale"],
  ["Pneumothorax", "pneumothorax"],
  ["Pleural Effusion", "pleural_effusion"],
  ["Empyema", "empyema"],
  ["Hemothorax", "hemothorax"],
  ["Chylothorax", "chylothorax"],
  ["Lung Cancer (Non-Small Cell)", "lung_cancer_nsclc"],
  ["Lung Cancer (Small Cell)", "lung_cancer_sclc"],
  ["Pancoast Tumor", "pancoast_tumor"],
  ["Carcinoid Tumor of the Lung", "lung_carcinoid"],
  ["Obstructive Sleep Apnea (OSA)", "obstructive_sleep_apnea"],
  ["Central Sleep Apnea", "central_sleep_apnea"],
  ["Obesity Hypoventilation Syndrome", "obesity_hypoventilation"],
  ["Acute Respiratory Distress Syndrome (ARDS)", "ards"],
  ["Chronic Cough", "chronic_cough"],
  ["Hemoptysis", "hemoptysis"],
  ["Respiratory Failure (Type I / Type II)", "respiratory_failure"],
  ["Hypoxia / Hypoxemia", "hypoxia"],
  ["Hypercapnia", "hypercapnia"],
  ["Spirometry Interpretation", "spirometry"],
  ["Bronchoscopy (Diagnostic & Interventional)", "bronchoscopy"],
  ["Pulmonary Function Tests (PFTs)", "pfts"],
  ["Arterial Blood Gas (ABG) Interpretation", "abg_interpretation"],
  ["Non-Invasive Ventilation (BiPAP/CPAP)", "noninvasive_ventilation"],
  ["Mechanical Ventilation", "mechanical_ventilation"],
  ["Oxygen Therapy", "oxygen_therapy"]
];

async function insertCorrectedPulmonology() {
  const batch = db.batch();

  topics.forEach(([topic, id]) => {
    const docRef = db.doc(`topics2/${id}`);
    batch.set(docRef, {
      category: "Internal Medicine",
      topic,
      id,
      lang: "en"
    });
    console.log(`🫁 Inserted: ${id}`);
  });

  await batch.commit();
  console.log("✅ Pulmonology topics inserted using correct flat structure.");
}

insertCorrectedPulmonology().catch(console.error);
