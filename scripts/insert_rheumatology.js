import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  ["Rheumatoid Arthritis", "rheumatoid_arthritis"],
  ["Systemic Lupus Erythematosus (SLE)", "sle"],
  ["Ankylosing Spondylitis", "ankylosing_spondylitis"],
  ["Psoriatic Arthritis", "psoriatic_arthritis"],
  ["Reactive Arthritis (Reiter Syndrome)", "reactive_arthritis"],
  ["Osteoarthritis", "osteoarthritis"],
  ["Gout", "gout"],
  ["Pseudogout (CPPD)", "pseudogout"],
  ["Vasculitis (General)", "vasculitis"],
  ["Giant Cell Arteritis", "giant_cell_arteritis"],
  ["Takayasu Arteritis", "takayasu_arteritis"],
  ["Polyarteritis Nodosa", "polyarteritis_nodosa"],
  ["Granulomatosis with Polyangiitis (Wegener)", "wegener_granulomatosis"],
  ["Microscopic Polyangiitis", "microscopic_polyangiitis"],
  ["Churg-Strauss Syndrome (EGPA)", "egpa"],
  ["Henoch-Schönlein Purpura (HSP)", "hsp"],
  ["Behçet’s Disease", "behcet_disease"],
  ["Systemic Sclerosis (Scleroderma)", "scleroderma"],
  ["Limited Cutaneous Systemic Sclerosis (CREST)", "crest_syndrome"],
  ["Sjogren’s Syndrome", "sjogren_syndrome"],
  ["Mixed Connective Tissue Disease", "mctd"],
  ["Dermatomyositis", "dermatomyositis"],
  ["Polymyositis", "polymyositis"],
  ["Fibromyalgia", "fibromyalgia"],
  ["Raynaud’s Phenomenon", "raynaud"],
  ["Antiphospholipid Syndrome", "aps"],
  ["Juvenile Idiopathic Arthritis", "jia"],
  ["Still’s Disease", "stills_disease"],
  ["Polymyalgia Rheumatica", "polymyalgia_rheumatica"]
];

async function insertRheumatology() {
  const batch = db.batch();
  topics.forEach(([topic, id]) => {
    const ref = db.doc(`topics2/${id}`);
    batch.set(ref, {
      category: "Rheumatology",
      topic,
      id,
      lang: "en"
    });
    console.log("🦴 Inserted:", id);
  });
  await batch.commit();
  console.log("✅ All Rheumatology topics inserted.");
}

insertRheumatology().catch(console.error);
