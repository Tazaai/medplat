import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  ["Malnutrition (Marasmus, Kwashiorkor)", "malnutrition"],
  ["Obesity", "obesity"],
  ["Metabolic Syndrome", "metabolic_syndrome"],
  ["Vitamin A Deficiency", "vitamin_a_deficiency"],
  ["Vitamin B1 (Thiamine) Deficiency", "vitamin_b1_deficiency"],
  ["Vitamin B12 Deficiency", "vitamin_b12_deficiency"],
  ["Folate Deficiency", "folate_deficiency"],
  ["Vitamin C Deficiency (Scurvy)", "vitamin_c_deficiency"],
  ["Vitamin D Deficiency", "vitamin_d_deficiency"],
  ["Vitamin K Deficiency", "vitamin_k_deficiency"],
  ["Iron Deficiency", "iron_deficiency"],
  ["Zinc Deficiency", "zinc_deficiency"],
  ["Calcium Deficiency", "calcium_deficiency"],
  ["Iodine Deficiency", "iodine_deficiency"],
  ["Refeeding Syndrome", "refeeding_syndrome"],
  ["Parenteral Nutrition", "parenteral_nutrition"],
  ["Enteral Nutrition", "enteral_nutrition"],
  ["Hyperlipidemia", "hyperlipidemia"],
  ["Hypercholesterolemia", "hypercholesterolemia"],
  ["Triglyceridemia (High TG)", "hypertriglyceridemia"],
  ["Phenylketonuria (PKU)", "pku"],
  ["Maple Syrup Urine Disease", "msud"],
  ["Galactosemia", "galactosemia"],
  ["Homocystinuria", "homocystinuria"],
  ["Tyrosinemia", "tyrosinemia"],
  ["Glycogen Storage Diseases", "glycogen_storage_diseases"],
  ["Lysosomal Storage Disorders", "lysosomal_storage_disorders"],
  ["Wilson's Disease", "wilsons_disease"],
  ["Hemochromatosis", "hemochromatosis"],
  ["Carnitine Deficiency", "carnitine_deficiency"],
  ["Medium-Chain Acyl-CoA Dehydrogenase Deficiency", "mcad_deficiency"],
  ["Lactose Intolerance", "lactose_intolerance"],
  ["Celiac Disease", "celiac_disease_nutrition"],
  ["Ketogenic Diet Indications", "ketogenic_diet"],
  ["Nutrition in Chronic Kidney Disease", "nutrition_ckd"],
  ["Nutrition in Heart Failure", "nutrition_heart_failure"],
  ["Nutrition in Liver Disease", "nutrition_liver_disease"],
  ["Nutrition in Critical Illness", "nutrition_critical_illness"],
  ["Bariatric Surgery Nutrition", "bariatric_nutrition"],
  ["Eating Disorders (Anorexia, Bulimia)", "eating_disorders"],
  ["Nutritional Assessment Tools", "nutritional_assessment"],
  ["Failure to Thrive", "failure_to_thrive"],
  ["Inborn Errors of Metabolism", "inborn_errors_of_metabolism"]
];

async function insertNutritionTopics() {
  const batch = db.batch();
  topics.forEach(([topic, id]) => {
    const ref = db.doc(`topics2/${id}`);
    batch.set(ref, {
      category: "Nutrition & Metabolism",
      topic,
      id,
      lang: "en"
    });
    console.log("🥦 Inserted:", id);
  });
  await batch.commit();
  console.log("✅ All Nutrition & Metabolism topics inserted.");
}

insertNutritionTopics().catch(console.error);
