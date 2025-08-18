import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  "Acute otitis media",
  "Chronic otitis media",
  "Otitis externa",
  "Hearing loss - sensorineural",
  "Hearing loss - conductive",
  "Tinnitus",
  "Meniere’s disease",
  "Vestibular neuritis",
  "Benign paroxysmal positional vertigo (BPPV)",
  "Vertigo - central vs peripheral",
  "Sinusitis - acute",
  "Sinusitis - chronic",
  "Allergic rhinitis",
  "Nasal polyps",
  "Epistaxis",
  "Septal hematoma",
  "Deviated nasal septum",
  "Tonsillitis",
  "Peritonsillar abscess",
  "Retropharyngeal abscess",
  "Ludwig’s angina",
  "Pharyngitis (viral/bacterial)",
  "Laryngitis",
  "Hoarseness",
  "Stridor in children",
  "Obstructive sleep apnea (OSA)",
  "Foreign body in ear/nose/throat",
  "Neck masses in adults",
  "Salivary gland disorders (e.g., sialadenitis)",
  "Laryngeal cancer",
  "Oral cavity cancer",
  "Thyroid nodule evaluation",
  "Head and neck squamous cell carcinoma",
  "Tracheostomy management",
  "Epiglottitis"
];

for (const topic of topics) {
  const id = topic.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  await db.collection("topics2").doc(id).set({
    category: "ENT / Otolaryngology",
    topic,
    id,
    lang: "en"
  });
  console.log("✅ Inserted:", topic);
}
