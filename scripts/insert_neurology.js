import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  ["Ischemic Stroke", "ischemic_stroke"],
  ["Hemorrhagic Stroke", "hemorrhagic_stroke"],
  ["Transient Ischemic Attack (TIA)", "tia"],
  ["Seizure (Generalized)", "generalized_seizure"],
  ["Focal Seizure", "focal_seizure"],
  ["Epilepsy", "epilepsy"],
  ["Status Epilepticus", "status_epilepticus"],
  ["Migraine", "migraine"],
  ["Tension Headache", "tension_headache"],
  ["Cluster Headache", "cluster_headache"],
  ["Subarachnoid Hemorrhage", "subarachnoid_hemorrhage"],
  ["Intracerebral Hemorrhage", "intracerebral_hemorrhage"],
  ["Multiple Sclerosis", "multiple_sclerosis"],
  ["Guillain-Barré Syndrome", "guillain_barre"],
  ["Myasthenia Gravis", "myasthenia_gravis"],
  ["Parkinson’s Disease", "parkinsons"],
  ["Essential Tremor", "essential_tremor"],
  ["Alzheimer’s Disease", "alzheimers"],
  ["Frontotemporal Dementia", "frontotemporal_dementia"],
  ["Lewy Body Dementia", "lewy_body_dementia"],
  ["Normal Pressure Hydrocephalus", "nph"],
  ["Peripheral Neuropathy", "peripheral_neuropathy"],
  ["Carpal Tunnel Syndrome", "carpal_tunnel"],
  ["Trigeminal Neuralgia", "trigeminal_neuralgia"],
  ["Bell’s Palsy", "bells_palsy"],
  ["Amyotrophic Lateral Sclerosis (ALS)", "als"],
  ["Huntington’s Disease", "huntingtons"],
  ["Spinal Cord Compression", "spinal_compression"],
  ["Meningitis (Bacterial)", "bacterial_meningitis"],
  ["Viral Encephalitis", "viral_encephalitis"],
  ["Cerebral Palsy", "cerebral_palsy"],
  ["Neurofibromatosis", "neurofibromatosis"],
  ["Tuberous Sclerosis", "tuberous_sclerosis"],
  ["Dystonia", "dystonia"],
  ["Restless Legs Syndrome", "restless_legs"],
  ["Wernicke Encephalopathy", "wernicke_encephalopathy"],
  ["Brain Tumor (General)", "brain_tumor"]
];

async function insertNeurology() {
  const batch = db.batch();
  topics.forEach(([topic, id]) => {
    const ref = db.doc(`topics2/${id}`);
    batch.set(ref, {
      category: "Neurology",
      topic,
      id,
      lang: "en"
    });
    console.log("🧠 Inserted:", id);
  });
  await batch.commit();
  console.log("✅ All Neurology topics inserted.");
}

insertNeurology().catch(console.error);
