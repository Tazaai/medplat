import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  ["Upper GI bleeding", "upper_gi_bleeding"],
  ["Lower GI bleeding", "lower_gi_bleeding"],
  ["Esophageal Varices", "esophageal_varices"],
  ["Mallory-Weiss Tear", "mallory_weiss_tear"],
  ["Peptic Ulcer Disease", "peptic_ulcer_disease"],
  ["Gastritis", "gastritis"],
  ["Gastroesophageal Reflux Disease (GERD)", "gerd"],
  ["Barrett Esophagus", "barrett_esophagus"],
  ["Hiatal Hernia", "hiatal_hernia"],
  ["Esophagitis", "esophagitis"],
  ["Esophageal Cancer", "esophageal_cancer"],
  ["Gastric Cancer", "gastric_cancer"],
  ["Small Bowel Obstruction", "small_bowel_obstruction"],
  ["Large Bowel Obstruction", "large_bowel_obstruction"],
  ["Ileus", "ileus"],
  ["Appendicitis", "appendicitis"],
  ["Diverticulitis", "diverticulitis"],
  ["Diverticular Bleeding", "diverticular_bleeding"],
  ["Inflammatory Bowel Disease (IBD)", "ibd"],
  ["Crohn Disease", "crohn_disease"],
  ["Ulcerative Colitis", "ulcerative_colitis"],
  ["Irritable Bowel Syndrome (IBS)", "ibs"],
  ["Celiac Disease", "celiac_disease"],
  ["Colorectal Cancer", "colorectal_cancer"],
  ["Colon Polyps", "colon_polyps"],
  ["Volvulus", "volvulus"],
  ["Intussusception", "intussusception"],
  ["Hemorrhoids", "hemorrhoids"],
  ["Anal Fissure", "anal_fissure"],
  ["Perianal Abscess", "perianal_abscess"],
  ["Pancreatitis (Acute)", "acute_pancreatitis"],
  ["Pancreatitis (Chronic)", "chronic_pancreatitis"],
  ["Pancreatic Cancer", "pancreatic_cancer"],
  ["Cholelithiasis (Gallstones)", "cholelithiasis"],
  ["Cholecystitis", "cholecystitis"],
  ["Choledocholithiasis", "choledocholithiasis"],
  ["Cholangitis", "cholangitis"],
  ["Primary Sclerosing Cholangitis", "psc"],
  ["Primary Biliary Cholangitis", "pbc"],
  ["Biliary Stricture", "biliary_stricture"],
  ["Liver Cirrhosis", "cirrhosis"],
  ["Portal Hypertension", "portal_hypertension"],
  ["Ascites", "ascites"],
  ["Hepatic Encephalopathy", "hepatic_encephalopathy"],
  ["Spontaneous Bacterial Peritonitis (SBP)", "sbp"],
  ["Hepatitis A", "hepatitis_a"],
  ["Hepatitis B", "hepatitis_b"],
  ["Hepatitis C", "hepatitis_c"],
  ["Alcoholic Hepatitis", "alcoholic_hepatitis"],
  ["Non-Alcoholic Fatty Liver Disease (NAFLD)", "nafld"],
  ["Liver Cancer (Hepatocellular Carcinoma)", "hepatocellular_carcinoma"],
  ["Liver Abscess", "liver_abscess"],
  ["GI Tuberculosis", "gi_tuberculosis"],
  ["Short Bowel Syndrome", "short_bowel_syndrome"],
  ["GI Motility Disorders", "gi_motility_disorders"]
];

async function insertGastroTopics() {
  const batch = db.batch();

  topics.forEach(([topic, id]) => {
    const docRef = db.doc(`topics2/${id}`);
    batch.set(docRef, {
      category: "Gastroenterology",
      topic,
      id,
      lang: "en"
    });
    console.log("🍽️ Inserted:", id);
  });

  await batch.commit();
  console.log("✅ All Gastroenterology topics inserted.");
}

insertGastroTopics().catch(console.error);
