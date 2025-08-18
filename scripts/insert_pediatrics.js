import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  ["Neonatal Jaundice", "neonatal_jaundice"],
  ["Neonatal Sepsis", "neonatal_sepsis"],
  ["Failure to Thrive", "failure_to_thrive"],
  ["Infant Colic", "infant_colic"],
  ["Pyloric Stenosis", "pyloric_stenosis"],
  ["Intussusception", "intussusception_peds"],
  ["Hirschsprung Disease", "hirschsprung"],
  ["Bronchiolitis", "bronchiolitis"],
  ["Croup", "croup"],
  ["Asthma (Pediatric)", "asthma_peds"],
  ["Pneumonia (Pediatric)", "pneumonia_peds"],
  ["Otitis Media", "otitis_media"],
  ["Otitis Externa", "otitis_externa"],
  ["Strep Pharyngitis", "strep_pharyngitis"],
  ["Febrile Seizures", "febrile_seizures"],
  ["Meningitis (Pediatric)", "meningitis_peds"],
  ["UTI (Pediatric)", "uti_peds"],
  ["Vesicoureteral Reflux", "vur"],
  ["Congenital Heart Disease", "chd"],
  ["Kawasaki Disease", "kawasaki"],
  ["Rheumatic Fever", "rheumatic_fever"],
  ["Henoch-Schönlein Purpura (HSP)", "hsp"],
  ["Iron Deficiency Anemia", "iron_deficiency_peds"],
  ["Lead Poisoning", "lead_poisoning"],
  ["Type 1 Diabetes (Pediatric)", "t1dm_peds"],
  ["Growth Delay", "growth_delay"],
  ["Constitutional Growth Delay", "constitutional_delay"],
  ["Short Stature", "short_stature"],
  ["Precocious Puberty", "precocious_puberty"],
  ["Delayed Puberty", "delayed_puberty"],
  ["Developmental Delay", "developmental_delay"],
  ["Autism Spectrum Disorder", "asd"],
  ["ADHD (Pediatric)", "adhd_peds"],
  ["Down Syndrome", "down_syndrome"],
  ["Cerebral Palsy", "cerebral_palsy"],
  ["Speech Delay", "speech_delay"],
  ["School Issues", "school_issues_peds"],
  ["Vaccine Schedule", "vaccine_schedule"],
  ["Missed Vaccinations", "missed_vaccines"],
  ["Measles", "measles"],
  ["Mumps", "mumps"],
  ["Rubella", "rubella"],
  ["Varicella", "varicella"],
  ["Pertussis", "pertussis"],
  ["Tetanus", "tetanus_peds"],
  ["Child Abuse Suspicion", "child_abuse"],
  ["Enuresis (Bedwetting)", "enuresis_peds"],
  ["Constipation (Pediatric)", "constipation_peds"],
  ["Food Allergy", "food_allergy"],
  ["Atopic Dermatitis (Peds)", "eczema_peds"],
  ["Tinea Capitis", "tinea_capitis"],
  ["Limp in Child", "limp_child"],
  ["Intellectual Disability", "intellectual_disability"],
  ["Juvenile Idiopathic Arthritis", "jia"]
];

async function insertPediatrics() {
  const batch = db.batch();
  topics.forEach(([topic, id]) => {
    const ref = db.doc(`topics2/${id}`);
    batch.set(ref, {
      category: "Pediatrics",
      topic,
      id,
      lang: "en"
    });
    console.log("👶 Inserted:", id);
  });
  await batch.commit();
  console.log("✅ All Pediatrics topics inserted.");
}

insertPediatrics().catch(console.error);
