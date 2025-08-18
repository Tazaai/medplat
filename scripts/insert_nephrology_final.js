import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  ["Acute Kidney Injury (AKI)", "aki"],
  ["Chronic Kidney Disease (CKD)", "ckd"],
  ["End-Stage Renal Disease (ESRD)", "esrd"],
  ["Hematuria", "hematuria"],
  ["Proteinuria", "proteinuria"],
  ["Nephrotic Syndrome", "nephrotic_syndrome"],
  ["Nephritic Syndrome", "nephritic_syndrome"],
  ["Glomerulonephritis", "glomerulonephritis"],
  ["Post-Streptococcal Glomerulonephritis", "psgn"],
  ["IgA Nephropathy (Berger Disease)", "iga_nephropathy"],
  ["Rapidly Progressive Glomerulonephritis", "rpg"],
  ["Minimal Change Disease", "minimal_change"],
  ["Focal Segmental Glomerulosclerosis (FSGS)", "fsgs"],
  ["Membranous Nephropathy", "membranous_nephropathy"],
  ["Polycystic Kidney Disease", "pkd"],
  ["Renal Artery Stenosis", "renal_artery_stenosis"],
  ["Renal Tubular Acidosis", "rta"],
  ["Pyelonephritis (Acute)", "acute_pyelonephritis"],
  ["Pyelonephritis (Chronic)", "chronic_pyelonephritis"],
  ["Acute Interstitial Nephritis", "ain"],
  ["Urinary Tract Infection (UTI)", "uti"],
  ["Asymptomatic Bacteriuria", "asymptomatic_bacteriuria"],
  ["Hydronephrosis", "hydronephrosis"],
  ["Kidney Stones (Nephrolithiasis)", "nephrolithiasis"],
  ["Hyperkalemia", "hyperkalemia"],
  ["Hypokalemia", "hypokalemia"],
  ["Hypernatremia", "hypernatremia"],
  ["Hyponatremia", "hyponatremia"],
  ["Hypercalcemia", "hypercalcemia"],
  ["Hypocalcemia", "hypocalcemia"],
  ["Hyperphosphatemia", "hyperphosphatemia"],
  ["Metabolic Acidosis", "metabolic_acidosis"],
  ["Metabolic Alkalosis", "metabolic_alkalosis"],
  ["Dialysis Complications", "dialysis_complications"],
  ["Hemodialysis", "hemodialysis"],
  ["Peritoneal Dialysis", "peritoneal_dialysis"],
  ["Renal Transplant Rejection", "renal_transplant_rejection"],
  ["Anemia of CKD", "anemia_of_ckd"],
  ["Electrolyte Abnormalities in CKD", "ckd_electrolyte_abnormalities"]
];

async function insertNephrology() {
  const batch = db.batch();
  topics.forEach(([topic, id]) => {
    const ref = db.doc(`topics2/${id}`);
    batch.set(ref, {
      category: "Nephrology",
      topic,
      id,
      lang: "en"
    });
    console.log("🩸 Inserted:", id);
  });
  await batch.commit();
  console.log("✅ All Nephrology topics inserted.");
}

insertNephrology().catch(console.error);
