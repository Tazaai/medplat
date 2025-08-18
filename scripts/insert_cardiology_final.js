// insert_cardiology_final.js
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  ["Acute Coronary Syndrome (ACS)", "acs"],
  ["Aortic Stenosis", "aortic_stenosis"],
  ["Atrial Fibrillation", "atrial_fibrillation"],
  ["Atrial Flutter", "atrial_flutter"],
  ["AV Block (2nd & 3rd degree)", "av_block"],
  ["Bradycardia", "bradycardia"],
  ["Cardiac Tamponade", "cardiac_tamponade"],
  ["Cardiogenic Shock", "cardiogenic_shock"],
  ["Chest Pain (non-ACS)", "chest_pain_non_acs"],
  ["Complete Heart Block", "complete_heart_block"],
  ["Dilated Cardiomyopathy", "dilated_cardiomyopathy"],
  ["Endocarditis", "endocarditis"],
  ["Heart Failure with Preserved EF", "hfpef"],
  ["Heart Failure with Reduced EF", "hfref"],
  ["Hypertension Emergency", "hypertensive_emergency"],
  ["Hypertension Urgency", "hypertensive_urgency"],
  ["Hypertrophic Cardiomyopathy", "hcm"],
  ["Inferior STEMI", "inferior_stemi"],
  ["Lateral STEMI", "lateral_stemi"],
  ["Mitral Regurgitation", "mitral_regurgitation"],
  ["Mitral Stenosis", "mitral_stenosis"],
  ["Myocardial Infarction", "mi"],
  ["Myocarditis", "myocarditis"],
  ["NSTEMI", "nstemi"],
  ["Pericarditis", "pericarditis"],
  ["Post-MI Complications", "post_mi_complications"],
  ["Pulseless Electrical Activity (PEA)", "pea"],
  ["Stable Angina", "stable_angina"],
  ["STEMI", "stemi"],
  ["Sudden Cardiac Arrest", "sudden_cardiac_arrest"],
  ["Supraventricular Tachycardia", "supraventricular_tachycardia"],
  ["Syncope", "syncope"],
  ["Tachycardia", "tachycardia"],
  ["Takotsubo Cardiomyopathy", "takotsubo_cardiomyopathy"],
  ["Tetralogy of Fallot", "tetralogy_of_fallot"],
  ["TIA (Cardioembolic)", "tia"],
  ["Unstable Angina", "unstable_angina"],
  ["Ventricular Fibrillation", "ventricular_fibrillation"],
  ["Ventricular Septal Defect", "ventricular_septal_defect"],
  ["Ventricular Tachycardia", "ventricular_tachycardia"],
  ["Wolff-Parkinson-White (WPW)", "wpw"],
  ["Cardiomyopathy (Unspecified)", "cardiomyopathy_unspecified"],
  ["Pacemaker Complications", "pacemaker_complications"],
  ["LV Aneurysm", "lv_aneurysm"],
  ["Coronary Artery Disease", "cad"],
  ["Hyperlipidemia", "hyperlipidemia"],
  ["Cardiac Arrest", "cardiac_arrest"],
  ["Pulmonary Edema (Cardiogenic)", "pulmonary_edema"],
  ["Post-cardiac Surgery Complications", "post_cardiac_surgery"],
  ["Right Heart Failure", "right_heart_failure"],
  ["Left Heart Failure", "left_heart_failure"],
  ["Valvular Heart Disease", "valvular_hd"],
  ["Bicuspid Aortic Valve", "bicuspid_aortic_valve"],
  ["Pericardial Effusion", "pericardial_effusion"],
  ["Cardiac Stress Testing", "cardiac_stress_testing"],
  ["Coronary Artery Bypass Graft (CABG)", "cabg"],
  ["Arrhythmogenic Right Ventricular Cardiomyopathy", "arvc"],
  ["Cardiac Syncope", "cardiac_syncope"],
  ["Heart Murmurs", "heart_murmurs"],
  ["Ischemic Cardiomyopathy", "ischemic_cardiomyopathy"],
  ["Sick Sinus Syndrome", "sick_sinus_syndrome"],
  ["Infective Endocarditis", "infective_endocarditis"],
  ["Aortic Dissection", "aortic_dissection"],
  ["Atrial Septal Defect", "atrial_septal_defect"],
  ["Congestive Heart Failure", "chf"],
  ["Premature Ventricular Contractions", "pvc"]
];

async function insertCardiologyTopics() {
  const batch = db.batch();

  topics.forEach(([topic, id]) => {
    const docRef = db.doc(`topics2/${id}`);
    batch.set(docRef, {
      category: "Cardiology",
      topic,
      id,
      lang: "en"
    });
    console.log(`❤️ Inserted: ${id}`);
  });

  await batch.commit();
  console.log("✅ All 64 Cardiology topics inserted into topics2.");
}

insertCardiologyTopics().catch(console.error);
