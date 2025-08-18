import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  ["Iron Deficiency Anemia", "iron_deficiency_anemia"],
  ["Vitamin B12 Deficiency", "vitamin_b12_deficiency"],
  ["Folate Deficiency", "folate_deficiency"],
  ["Anemia of Chronic Disease", "anemia_of_chronic_disease"],
  ["Aplastic Anemia", "aplastic_anemia"],
  ["Hemolytic Anemia", "hemolytic_anemia"],
  ["Autoimmune Hemolytic Anemia", "autoimmune_hemolytic_anemia"],
  ["Sickle Cell Disease", "sickle_cell_disease"],
  ["Thalassemia", "thalassemia"],
  ["Hereditary Spherocytosis", "hereditary_spherocytosis"],
  ["G6PD Deficiency", "g6pd_deficiency"],
  ["Hemochromatosis", "hemochromatosis"],
  ["Polycythemia Vera", "polycythemia_vera"],
  ["Essential Thrombocythemia", "essential_thrombocythemia"],
  ["Myelofibrosis", "myelofibrosis"],
  ["Acute Myeloid Leukemia (AML)", "aml"],
  ["Chronic Myeloid Leukemia (CML)", "cml"],
  ["Acute Lymphoblastic Leukemia (ALL)", "all"],
  ["Chronic Lymphocytic Leukemia (CLL)", "cll"],
  ["Hairy Cell Leukemia", "hairy_cell_leukemia"],
  ["Hodgkin Lymphoma", "hodgkin_lymphoma"],
  ["Non-Hodgkin Lymphoma", "non_hodgkin_lymphoma"],
  ["Multiple Myeloma", "multiple_myeloma"],
  ["Monoclonal Gammopathy of Undetermined Significance (MGUS)", "mgus"],
  ["Myelodysplastic Syndromes (MDS)", "mds"],
  ["Tumor Lysis Syndrome", "tumor_lysis_syndrome"],
  ["Disseminated Intravascular Coagulation (DIC)", "dic"],
  ["Thrombotic Thrombocytopenic Purpura (TTP)", "ttp"],
  ["Hemolytic Uremic Syndrome (HUS)", "hus"],
  ["Immune Thrombocytopenic Purpura (ITP)", "itp"],
  ["Heparin-Induced Thrombocytopenia (HIT)", "hit"],
  ["Hemophilia A", "hemophilia_a"],
  ["Hemophilia B", "hemophilia_b"],
  ["Von Willebrand Disease", "von_willebrand_disease"],
  ["Factor V Leiden", "factor_v_leiden"],
  ["Antiphospholipid Syndrome", "antiphospholipid_syndrome"],
  ["Deep Vein Thrombosis (DVT)", "dvt"],
  ["Pulmonary Embolism (PE) – Hematology context", "pe_hematology"],
  ["Hypercoagulable States", "hypercoagulable_states"],
  ["Warfarin Management", "warfarin_management"],
  ["Direct Oral Anticoagulants (DOACs)", "doacs"]
];

async function insertHematology() {
  const batch = db.batch();
  topics.forEach(([topic, id]) => {
    const ref = db.doc(`topics2/${id}`);
    batch.set(ref, {
      category: "Hematology",
      topic,
      id,
      lang: "en"
    });
    console.log("🩸 Inserted:", id);
  });
  await batch.commit();
  console.log("✅ All Hematology topics inserted.");
}

insertHematology().catch(console.error);
