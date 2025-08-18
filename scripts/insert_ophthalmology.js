import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  "Red eye - differential diagnosis",
  "Conjunctivitis - bacterial",
  "Conjunctivitis - viral",
  "Allergic conjunctivitis",
  "Blepharitis",
  "Hordeolum (stye)",
  "Chalazion",
  "Keratitis",
  "Corneal ulcer",
  "Dry eye syndrome",
  "Uveitis (anterior/posterior)",
  "Scleritis",
  "Episcleritis",
  "Glaucoma - open angle",
  "Glaucoma - acute angle closure",
  "Cataract",
  "Macular degeneration - dry",
  "Macular degeneration - wet",
  "Diabetic retinopathy",
  "Hypertensive retinopathy",
  "Central retinal artery occlusion (CRAO)",
  "Central retinal vein occlusion (CRVO)",
  "Retinal detachment",
  "Optic neuritis",
  "Papilledema",
  "Amblyopia",
  "Strabismus",
  "Nystagmus",
  "Color blindness",
  "Ocular trauma - blunt",
  "Ocular trauma - penetrating",
  "Chemical eye injury",
  "Foreign body in eye",
  "Orbital cellulitis",
  "Preseptal cellulitis",
  "Endophthalmitis",
  "Vision loss - acute painless",
  "Vision loss - acute painful",
  "Vision loss - chronic",
  "Visual field defects",
  "Screening for diabetic eye disease",
  "Ophthalmologic manifestations of systemic disease"
];

for (const topic of topics) {
  const id = topic.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  await db.collection("topics2").doc(id).set({
    category: "Ophthalmology",
    topic,
    id,
    lang: "en"
  });
  console.log("✅ Inserted:", topic);
}
