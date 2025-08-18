import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  ["Hypertension", "hypertension"],
  ["Type 2 Diabetes Mellitus", "type_2_diabetes"],
  ["Hyperlipidemia", "hyperlipidemia"],
  ["Hypothyroidism", "hypothyroidism"],
  ["Chronic Kidney Disease", "ckd"],
  ["Obesity", "obesity"],
  ["Smoking Cessation", "smoking_cessation"],
  ["Depression", "depression"],
  ["Generalized Anxiety Disorder", "generalized_anxiety"],
  ["Insomnia", "insomnia"],
  ["Fatigue (Chronic)", "chronic_fatigue"],
  ["Low Back Pain", "low_back_pain"],
  ["Migraine", "migraine"],
  ["Tension Headache", "tension_headache"],
  ["Musculoskeletal Pain", "musculoskeletal_pain"],
  ["Osteoarthritis", "osteoarthritis"],
  ["Menstrual Disorders", "menstrual_disorders"],
  ["Contraceptive Counseling", "contraceptive_counseling"],
  ["Pregnancy Confirmation & Referral", "pregnancy_referral"],
  ["Breast Lump Evaluation", "breast_lump"],
  ["UTI (Women)", "uti_women"],
  ["STI Screening", "sti_screening"],
  ["Prostate Concerns", "prostate_screening"],
  ["Erectile Dysfunction", "erectile_dysfunction"],
  ["Childhood Vaccination", "child_vaccination"],
  ["Travel Vaccination", "travel_vaccination"],
  ["COVID-19 Vaccination", "covid19_vaccine"],
  ["Skin Rash Evaluation", "rash"],
  ["Eczema", "eczema"],
  ["Psoriasis", "psoriasis"],
  ["Allergic Rhinitis", "allergic_rhinitis"],
  ["Asthma (Stable)", "asthma_stable"],
  ["COPD (Mild)", "copd_mild"],
  ["Smoking-related Lung Symptoms", "smoking_symptoms"],
  ["Preventive Health Checks", "health_screening"],
  ["Pap Smear / Cervical Screening", "cervical_screening"],
  ["Colorectal Cancer Screening", "crc_screening"],
  ["Breast Cancer Screening", "breast_screening"],
  ["Pediatric Fever", "pediatric_fever"],
  ["Developmental Delay (Child)", "developmental_delay"],
  ["School Performance Concerns", "school_issues"],
  ["Enuresis (Bedwetting)", "enuresis"],
  ["ADHD", "adhd"],
  ["Elderly Fall Risk", "fall_risk_elderly"],
  ["Dementia (Early)", "dementia_early"],
  ["Polypharmacy Review", "polypharmacy"],
  ["Home Care Planning", "home_care_gp"],
  ["End-of-Life Planning", "eol_gp"],
  ["Vaccination Hesitancy", "vaccine_hesitancy"],
  ["Patient Counseling Techniques", "counseling_gp"],
  ["Gadeberg Syndrome", "gadeberg_syndrome"],  // ❗ Exception case
  ["Unexplained Weight Loss", "unexplained_weight_loss"],
  ["Chronic Cough (GP setting)", "chronic_cough_gp"]
];

async function insertGP() {
  const batch = db.batch();
  topics.forEach(([topic, id]) => {
    const ref = db.doc(`topics2/${id}`);
    batch.set(ref, {
      category: "General Practice",
      topic,
      id,
      lang: "en"
    });
    console.log("🩺 Inserted:", id);
  });
  await batch.commit();
  console.log("✅ All General Practice topics inserted.");
}

insertGP().catch(console.error);
