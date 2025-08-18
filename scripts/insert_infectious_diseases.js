import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  ["Sepsis", "sepsis"],
  ["Bacterial Meningitis", "bacterial_meningitis"],
  ["Viral Meningitis", "viral_meningitis"],
  ["Tuberculous Meningitis", "tb_meningitis"],
  ["Pneumocystis Pneumonia (PCP)", "pcp"],
  ["HIV/AIDS", "hiv_aids"],
  ["HIV Opportunistic Infections", "hiv_ois"],
  ["Hepatitis A", "hepatitis_a"],
  ["Hepatitis B", "hepatitis_b"],
  ["Hepatitis C", "hepatitis_c"],
  ["Hepatitis E", "hepatitis_e"],
  ["COVID-19", "covid19"],
  ["Influenza", "influenza"],
  ["Epstein-Barr Virus (EBV)", "ebv"],
  ["Cytomegalovirus (CMV)", "cmv"],
  ["Varicella-Zoster Virus", "vzv"],
  ["Herpes Simplex Virus", "hsv"],
  ["Malaria", "malaria"],
  ["Dengue", "dengue"],
  ["Zika Virus", "zika"],
  ["Ebola", "ebola"],
  ["Tetanus", "tetanus"],
  ["Diphtheria", "diphtheria"],
  ["Pertussis (Whooping Cough)", "pertussis"],
  ["Measles", "measles"],
  ["Mumps", "mumps"],
  ["Rubella", "rubella"],
  ["Rabies", "rabies"],
  ["Brucellosis", "brucellosis"],
  ["Leptospirosis", "leptospirosis"],
  ["Typhoid Fever", "typhoid_fever"],
  ["Cholera", "cholera"],
  ["Traveler's Diarrhea", "travelers_diarrhea"],
  ["Giardiasis", "giardiasis"],
  ["Amoebiasis", "amoebiasis"],
  ["Helminthic Infections", "helminthic_infections"],
  ["MRSA Infections", "mrsa"],
  ["Clostridium difficile Infection (CDI)", "c_diff"],
  ["Infective Endocarditis", "infective_endocarditis"],
  ["Osteomyelitis", "osteomyelitis"],
  ["Septic Arthritis", "septic_arthritis"],
  ["Cellulitis", "cellulitis"],
  ["Necrotizing Fasciitis", "necrotizing_fasciitis"],
  ["Cat Scratch Disease", "cat_scratch"],
  ["Tick-borne Diseases", "tick_borne"],
  ["Lyme Disease", "lyme_disease"],
  ["Rocky Mountain Spotted Fever", "rmsf"],
  ["Syphilis", "syphilis"],
  ["Gonorrhea", "gonorrhea"],
  ["Chlamydia", "chlamydia"],
  ["Trichomoniasis", "trichomoniasis"]
];

async function insertInfectiousDiseases() {
  const batch = db.batch();
  topics.forEach(([topic, id]) => {
    const ref = db.doc(`topics2/${id}`);
    batch.set(ref, {
      category: "Infectious Diseases",
      topic,
      id,
      lang: "en"
    });
    console.log("🦠 Inserted:", id);
  });
  await batch.commit();
  console.log("✅ All Infectious Diseases topics inserted.");
}

insertInfectiousDiseases().catch(console.error);
