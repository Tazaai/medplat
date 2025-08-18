import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  "Preoperative assessment",
  "Airway management - basic",
  "Airway management - difficult",
  "Rapid sequence intubation",
  "General anesthesia - induction and maintenance",
  "Spinal anesthesia",
  "Epidural anesthesia",
  "Combined spinal-epidural",
  "Peripheral nerve blocks",
  "Ultrasound-guided regional anesthesia",
  "Conscious sedation",
  "Monitored anesthesia care (MAC)",
  "Total intravenous anesthesia (TIVA)",
  "Local anesthetic systemic toxicity (LAST)",
  "Anesthesia for trauma",
  "Anesthesia for cesarean section",
  "Anesthesia in pediatric patients",
  "Anesthesia in geriatric patients",
  "Anesthesia in obese patients",
  "Malignant hyperthermia",
  "Anaphylaxis under anesthesia",
  "Postoperative nausea and vomiting (PONV)",
  "Postoperative delirium",
  "Awareness under anesthesia",
  "Neuromuscular blockade and reversal",
  "Ventilation strategies during surgery",
  "Management of intraoperative hypotension",
  "Temperature control during anesthesia",
  "Anesthesia for non-operating room procedures (NORA)",
  "Anesthetic implications of comorbidities (e.g., COPD, CHF)",
  "Sedation in ICU",
  "Pain management - acute",
  "Pain management - chronic",
  "Enhanced recovery after surgery (ERAS)"
];

for (const topic of topics) {
  const id = topic.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  await db.collection("topics2").doc(id).set({
    category: "Anesthesiology",
    topic,
    id,
    lang: "en"
  });
  console.log("✅ Inserted:", topic);
}
