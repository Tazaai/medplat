import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  "Breast cancer",
  "Lung cancer",
  "Colorectal cancer",
  "Prostate cancer",
  "Pancreatic cancer",
  "Ovarian cancer",
  "Cervical cancer",
  "Endometrial cancer",
  "Testicular cancer",
  "Bladder cancer",
  "Kidney (renal cell) cancer",
  "Gastric (stomach) cancer",
  "Esophageal cancer",
  "Liver cancer (HCC)",
  "Thyroid cancer",
  "Skin cancer (non-melanoma)",
  "Melanoma",
  "Lymphoma - Hodgkin",
  "Lymphoma - Non-Hodgkin",
  "Leukemia - Acute lymphoblastic",
  "Leukemia - Acute myeloid",
  "Leukemia - Chronic lymphocytic",
  "Leukemia - Chronic myeloid",
  "Multiple myeloma",
  "Brain tumors (glioblastoma etc.)",
  "Neuroblastoma",
  "Sarcoma - Soft tissue",
  "Sarcoma - Bone (osteosarcoma)",
  "Mesothelioma",
  "Unknown primary tumor",
  "Cancer of unknown origin (CUP)",
  "Paraneoplastic syndromes",
  "Tumor lysis syndrome",
  "Oncologic emergencies (SVC syndrome, spinal cord compression)",
  "Cancer pain management",
  "Immunotherapy-related complications",
  "Chemotherapy side effects",
  "Radiotherapy complications",
  "Cancer screening programs"
];

for (const topic of topics) {
  const id = topic.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  await db.collection("topics2").doc(id).set({
    category: "Oncology",
    topic,
    id,
    lang: "en"
  });
  console.log("✅ Inserted:", topic);
}
