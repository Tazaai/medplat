// insert_endocrinology_final.js
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  ["Type 1 Diabetes Mellitus", "type1_diabetes"],
  ["Type 2 Diabetes Mellitus", "type2_diabetes"],
  ["Diabetic Ketoacidosis (DKA)", "dka"],
  ["Hyperosmolar Hyperglycemic State (HHS)", "hhs"],
  ["Hypoglycemia", "hypoglycemia"],
  ["Thyrotoxicosis (Hyperthyroidism)", "thyrotoxicosis"],
  ["Graves Disease", "graves_disease"],
  ["Toxic Multinodular Goiter", "toxic_multinodular_goiter"],
  ["Thyroid Storm", "thyroid_storm"],
  ["Hypothyroidism", "hypothyroidism"],
  ["Hashimoto Thyroiditis", "hashimoto"],
  ["Myxedema Coma", "myxedema_coma"],
  ["Goiter", "goiter"],
  ["Thyroid Nodule", "thyroid_nodule"],
  ["Thyroid Cancer", "thyroid_cancer"],
  ["Primary Hyperparathyroidism", "primary_hyperparathyroidism"],
  ["Secondary Hyperparathyroidism", "secondary_hyperparathyroidism"],
  ["Hypoparathyroidism", "hypoparathyroidism"],
  ["Hypercalcemia", "hypercalcemia"],
  ["Hypocalcemia", "hypocalcemia"],
  ["Cushing Syndrome", "cushing_syndrome"],
  ["Addison Disease", "addison_disease"],
  ["Adrenal Crisis", "adrenal_crisis"],
  ["Pheochromocytoma", "pheochromocytoma"],
  ["Hyperaldosteronism", "hyperaldosteronism"],
  ["Hypopituitarism", "hypopituitarism"],
  ["Acromegaly", "acromegaly"],
  ["Gigantism", "gigantism"],
  ["Diabetes Insipidus", "diabetes_insipidus"],
  ["Syndrome of Inappropriate ADH (SIADH)", "siadh"],
  ["Hyperprolactinemia", "hyperprolactinemia"],
  ["Polycystic Ovary Syndrome (PCOS)", "pcos"],
  ["Male Hypogonadism", "male_hypogonadism"],
  ["Metabolic Syndrome", "metabolic_syndrome"],
  ["Obesity", "obesity"],
  ["Lipid Disorders (Dyslipidemia)", "dyslipidemia"],
  ["Osteoporosis", "osteoporosis"],
  ["Paget Disease of Bone", "paget_disease"],
  ["Vitamin D Deficiency", "vitamin_d_deficiency"],
  ["Multiple Endocrine Neoplasia (MEN)", "men_syndrome"]
];

async function insertEndocrinologyTopics() {
  const batch = db.batch();

  topics.forEach(([topic, id]) => {
    const docRef = db.doc(`topics2/${id}`);
    batch.set(docRef, {
      category: "Endocrinology",
      topic,
      id,
      lang: "en"
    });
    console.log(`🧬 Inserted: ${id}`);
  });

  await batch.commit();
  console.log("✅ All Endocrinology topics inserted into topics2.");
}

insertEndocrinologyTopics().catch(console.error);
