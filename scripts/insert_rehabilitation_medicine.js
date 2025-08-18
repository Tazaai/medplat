import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  "Stroke rehabilitation",
  "Spinal cord injury rehabilitation",
  "Traumatic brain injury (TBI) rehabilitation",
  "Amputee rehabilitation",
  "Prosthetics and orthotics",
  "Neurogenic bladder management",
  "Bowel training programs",
  "Cognitive rehabilitation",
  "Speech and language therapy",
  "Swallowing disorders rehabilitation",
  "Rehabilitation after orthopedic surgery",
  "Joint replacement rehabilitation",
  "Pain management in rehabilitation",
  "Neuropathic pain in rehab patients",
  "Rehabilitation for multiple sclerosis",
  "Rehabilitation for Parkinson's disease",
  "Balance and gait training",
  "Falls prevention programs",
  "Cardiac rehabilitation",
  "Pulmonary rehabilitation",
  "Occupational therapy in rehab",
  "Physical therapy techniques",
  "Functional electrical stimulation (FES)",
  "Wheelchair assessment and prescription",
  "Assistive technologies in rehab",
  "Chronic fatigue and energy conservation",
  "Rehabilitation in elderly patients",
  "Multidisciplinary team approach in rehab",
  "Disability evaluation and return to function",
  "Rehabilitation goal setting and outcome measures"
];

for (const topic of topics) {
  const id = topic.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  await db.collection("topics2").doc(id).set({
    category: "Rehabilitation Medicine",
    topic,
    id,
    lang: "en"
  });
  console.log("✅ Inserted:", topic);
}
