import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  ["Sepsis", "sepsis"],
  ["Acute Respiratory Failure", "acute_respiratory_failure"],
  ["Acute Kidney Injury (AKI)", "aki"],
  ["Hypertensive Emergency", "hypertensive_emergency"],
  ["Acute Coronary Syndrome (ACS)", "acs"],
  ["Pulmonary Embolism", "pulmonary_embolism"],
  ["Diabetic Ketoacidosis (DKA)", "dka"],
  ["Hyperosmolar Hyperglycemic State (HHS)", "hhs"],
  ["Acute Heart Failure", "acute_heart_failure"],
  ["Anaphylaxis", "anaphylaxis"],
  ["Acute Stroke", "acute_stroke"],
  ["Upper GI Bleeding", "upper_gi_bleeding"],
  ["Lower GI Bleeding", "lower_gi_bleeding"],
  ["Status Epilepticus", "status_epilepticus"],
  ["Meningitis", "meningitis"],
  ["Delirium", "delirium"],
  ["Hyperkalemia", "hyperkalemia"],
  ["Hypoglycemia", "hypoglycemia"],
  ["Hypothermia", "hypothermia"],
  ["Hyperthermia", "hyperthermia"],
  ["Acute Abdomen", "acute_abdomen"],
  ["Tension Pneumothorax", "tension_pneumothorax"],
  ["Cardiac Tamponade", "cardiac_tamponade"],
  ["Massive Hemoptysis", "massive_hemoptysis"],
  ["Myxedema Coma", "myxedema_coma"],
  ["Thyroid Storm", "thyroid_storm"],
  ["Adrenal Crisis", "adrenal_crisis"],
  ["Acute Liver Failure", "acute_liver_failure"],
  ["Acute Pancreatitis", "acute_pancreatitis"],
  ["Toxidrome Recognition", "toxidrome_recognition"],
  ["Acute Confusion", "acute_confusion"],
  ["Acute Chest Pain", "acute_chest_pain"],
  ["Acute Back Pain (Red Flags)", "acute_back_pain_red_flags"],
  ["Alcohol Withdrawal", "alcohol_withdrawal"],
  ["Acute Agitation", "acute_agitation"],
  ["Acute Psychosis", "acute_psychosis"],
  ["Unconscious Patient", "unconscious_patient"],
  ["Acute Weakness", "acute_weakness"],
  ["Collapse / Syncope", "collapse_syncope"],
  ["Dizziness / Vertigo", "dizziness_vertigo"]
];

async function insertAcuteMedicine() {
  const batch = db.batch();
  topics.forEach(([topic, id]) => {
    const ref = db.doc(`topics2/${id}`);
    batch.set(ref, {
      category: "Acute Medicine",
      topic,
      id,
      lang: "en"
    });
    console.log("🏥 Inserted:", id);
  });
  await batch.commit();
  console.log("✅ All Acute Medicine topics inserted.");
}

insertAcuteMedicine().catch(console.error);
