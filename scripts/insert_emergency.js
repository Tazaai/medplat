import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  ["Acute Coronary Syndrome (ACS)", "acs"],
  ["STEMI", "stemi"],
  ["NSTEMI", "nstemi"],
  ["Cardiac Arrest", "cardiac_arrest"],
  ["Pulseless Electrical Activity", "pea"],
  ["Asystole", "asystole"],
  ["Ventricular Fibrillation", "vfib"],
  ["Ventricular Tachycardia", "vtach"],
  ["Supraventricular Tachycardia", "svt"],
  ["Bradycardia", "bradycardia"],
  ["Atrial Fibrillation with RVR", "afib_rvr"],
  ["Sepsis", "sepsis"],
  ["Anaphylaxis", "anaphylaxis"],
  ["Status Asthmaticus", "status_asthmaticus"],
  ["Acute Pulmonary Edema", "pulmonary_edema"],
  ["Tension Pneumothorax", "tension_pneumothorax"],
  ["Hemothorax", "hemothorax"],
  ["Massive PE", "massive_pe"],
  ["Stroke (Ischemic)", "ischemic_stroke"],
  ["Stroke (Hemorrhagic)", "hemorrhagic_stroke"],
  ["Seizure", "seizure"],
  ["Status Epilepticus", "status_epilepticus"],
  ["Head Trauma", "head_trauma"],
  ["Spinal Cord Injury", "spinal_cord_injury"],
  ["Open Fracture", "open_fracture"],
  ["Pelvic Fracture", "pelvic_fracture"],
  ["Blunt Abdominal Trauma", "blunt_abdominal_trauma"],
  ["Penetrating Trauma", "penetrating_trauma"],
  ["Burns", "burns"],
  ["Hypothermia", "hypothermia"],
  ["Heat Stroke", "heat_stroke"],
  ["Drowning", "drowning"],
  ["Electrocution", "electrocution"],
  ["Smoke Inhalation Injury", "smoke_inhalation"],
  ["Carbon Monoxide Poisoning", "carbon_monoxide"],
  ["Organophosphate Poisoning", "organophosphate_poisoning"],
  ["Opioid Overdose", "opioid_overdose"],
  ["Benzodiazepine Overdose", "benzo_overdose"],
  ["Alcohol Intoxication", "alcohol_intoxication"],
  ["Delirium Tremens", "delirium_tremens"],
  ["Pediatric Sepsis", "pediatric_sepsis"],
  ["Pediatric Meningitis", "pediatric_meningitis"],
  ["Febrile Seizures", "febrile_seizures"],
  ["Foreign Body Aspiration", "foreign_body_aspiration"],
  ["Ectopic Pregnancy", "ectopic_pregnancy"],
  ["Placental Abruption", "placental_abruption"],
  ["Postpartum Hemorrhage", "pph"],
  ["Rape/Assault Case", "rape_assault"],
  ["Agitated Patient", "agitated_patient"],
  ["Psychosis in ED", "psychosis_ed"],
  ["Legal Hold / Involuntary Admission", "legal_hold"],
  ["Airway Management", "airway_management"],
  ["Rapid Sequence Intubation", "rsi"],
  ["Chest Tube Insertion", "chest_tube"],
  ["Central Line Placement", "central_line"],
  ["Needle Decompression", "needle_decompression"],
  ["Focused Assessment with Sonography in Trauma (FAST)", "fast_exam"],
  ["Gadeberg Syndrome", "gadeberg_syndrome"]
];

async function insertEmergency() {
  const batch = db.batch();
  topics.forEach(([topic, id]) => {
    const ref = db.doc(`topics2/${id}`);
    batch.set(ref, {
      category: "Emergency Medicine",
      topic,
      id,
      lang: "en"
    });
    console.log("🚑 Inserted:", id);
  });
  await batch.commit();
  console.log("✅ All Emergency Medicine topics inserted.");
}

insertEmergency().catch(console.error);
