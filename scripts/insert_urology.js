import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  "Benign prostatic hyperplasia (BPH)",
  "Prostate cancer",
  "Bladder cancer",
  "Renal cell carcinoma",
  "Testicular cancer",
  "Erectile dysfunction",
  "Urinary tract infection (male)",
  "Urinary tract infection (female)",
  "Urethritis",
  "Cystitis",
  "Pyelonephritis",
  "Renal colic",
  "Nephrolithiasis",
  "Hydronephrosis",
  "Ureteric obstruction",
  "Hematuria - gross",
  "Hematuria - microscopic",
  "Urinary incontinence - stress",
  "Urinary incontinence - urge",
  "Urinary retention",
  "Interstitial cystitis",
  "Prostatitis - acute",
  "Prostatitis - chronic",
  "Testicular torsion",
  "Varicocele",
  "Hydrocele",
  "Epididymitis",
  "Phimosis",
  "Paraphimosis",
  "Peyronie’s disease",
  "Priapism",
  "Nocturnal enuresis",
  "Neurogenic bladder",
  "Scrotal swelling"
];

for (const topic of topics) {
  const id = topic.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  await db.collection("topics2").doc(id).set({
    category: "Urology",
    topic,
    id,
    lang: "en"
  });
  console.log("✅ Inserted:", topic);
}
