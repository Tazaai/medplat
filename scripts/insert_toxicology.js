import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  "Acetaminophen (paracetamol) overdose",
  "Aspirin (salicylate) poisoning",
  "Opioid overdose",
  "Benzodiazepine overdose",
  "Ethanol intoxication",
  "Methanol poisoning",
  "Ethylene glycol poisoning",
  "Carbon monoxide poisoning",
  "Cyanide poisoning",
  "Organophosphate poisoning",
  "Nerve agent exposure",
  "Heavy metal poisoning - lead",
  "Heavy metal poisoning - arsenic",
  "Heavy metal poisoning - mercury",
  "Iron overdose",
  "Lithium toxicity",
  "Digoxin toxicity",
  "Theophylline toxicity",
  "Tricyclic antidepressant (TCA) overdose",
  "SSRI overdose",
  "Beta-blocker overdose",
  "Calcium channel blocker overdose",
  "Clonidine overdose",
  "Sulfonylurea overdose",
  "Warfarin toxicity",
  "Snakebite envenomation",
  "Scorpion sting",
  "Spider bite (black widow, brown recluse)",
  "Toxidromes - cholinergic",
  "Toxidromes - anticholinergic",
  "Toxidromes - sympathomimetic",
  "Toxidromes - opioid",
  "Toxidromes - sedative-hypnotic",
  "Decontamination techniques",
  "Activated charcoal use",
  "Whole bowel irrigation",
  "Antidotes in toxicology",
  "Flumazenil use",
  "Naloxone administration",
  "N-acetylcysteine (NAC) protocol"
];

for (const topic of topics) {
  const id = topic.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  await db.collection("topics2").doc(id).set({
    category: "Toxicology",
    topic,
    id,
    lang: "en"
  });
  console.log("✅ Inserted:", topic);
}
