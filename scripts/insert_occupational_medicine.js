import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  "Occupational asthma",
  "Silicosis",
  "Asbestosis",
  "Coal workers’ pneumoconiosis",
  "Occupational COPD",
  "Occupational hearing loss (noise-induced)",
  "Hand-arm vibration syndrome",
  "Repetitive strain injury (RSI)",
  "Carpal tunnel syndrome (work-related)",
  "Work-related back pain",
  "Occupational dermatitis",
  "Chemical burns (workplace)",
  "Thermal burns (workplace)",
  "Radiation exposure (medical/industrial)",
  "Needlestick injury",
  "Latex allergy",
  "Lead poisoning (work-related)",
  "Mercury exposure",
  "Solvent exposure",
  "Benzene toxicity",
  "Occupational cancer risks (bladder, mesothelioma, etc.)",
  "Personal protective equipment (PPE) standards",
  "Workplace ergonomics and injury prevention",
  "Occupational stress and burnout",
  "Shift work disorder",
  "Return-to-work assessments",
  "Fitness-for-duty evaluations",
  "Workplace substance abuse policies",
  "Occupational health screening protocols",
  "Occupational vaccination requirements",
  "Legal and ethical issues in occupational health"
];

for (const topic of topics) {
  const id = topic.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  await db.collection("topics2").doc(id).set({
    category: "Occupational Medicine",
    topic,
    id,
    lang: "en"
  });
  console.log("✅ Inserted:", topic);
}
