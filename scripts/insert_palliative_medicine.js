import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  "Principles of palliative care",
  "End-of-life care",
  "Advanced care planning",
  "Breaking bad news",
  "Do-not-resuscitate (DNR) orders",
  "Hospice care",
  "Palliative sedation",
  "Withdrawal of life-sustaining treatment",
  "Ethical issues in palliative care",
  "Legal aspects of end-of-life decisions",
  "Pain management in palliative care",
  "Cancer pain management",
  "Opioid titration and rotation",
  "Dyspnea management in terminal illness",
  "Nausea and vomiting in palliative care",
  "Constipation and bowel obstruction",
  "Delirium in terminal patients",
  "Anxiety and depression in palliative patients",
  "Fatigue in advanced disease",
  "Anorexia and cachexia",
  "Palliative care in non-cancer illnesses",
  "Heart failure in palliative care",
  "COPD in palliative care",
  "Dementia and palliative needs",
  "Renal failure and conservative management",
  "Liver failure and symptom control",
  "Spiritual care and existential distress",
  "Grief and bereavement support",
  "Family counseling and caregiver support",
  "Palliative care emergencies",
  "Communication skills in difficult conversations"
];

for (const topic of topics) {
  const id = topic.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  await db.collection("topics2").doc(id).set({
    category: "Palliative Medicine",
    topic,
    id,
    lang: "en"
  });
  console.log("✅ Inserted:", topic);
}
