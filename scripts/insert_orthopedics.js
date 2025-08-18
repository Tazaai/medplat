import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const topics = [
  "Hip fracture",
  "Femoral shaft fracture",
  "Pelvic fracture",
  "Clavicle fracture",
  "Proximal humerus fracture",
  "Distal radius fracture (Colles)",
  "Scaphoid fracture",
  "Tibial shaft fracture",
  "Ankle fracture",
  "Ankle sprain",
  "Patellar fracture",
  "Knee dislocation",
  "Shoulder dislocation",
  "Rotator cuff tear",
  "Anterior cruciate ligament (ACL) injury",
  "Meniscus tear",
  "Achilles tendon rupture",
  "Osteoarthritis of the knee",
  "Osteoarthritis of the hip",
  "Osteomyelitis",
  "Septic arthritis",
  "Gout and pseudogout",
  "Rheumatoid arthritis (orthopedic aspects)",
  "Low back pain",
  "Lumbar disc herniation",
  "Spinal stenosis",
  "Scoliosis",
  "Spondylolisthesis",
  "Cervical radiculopathy",
  "Carpal tunnel syndrome",
  "De Quervain’s tenosynovitis",
  "Dupuytren’s contracture",
  "Trigger finger",
  "Compartment syndrome",
  "Fat embolism syndrome",
  "Open fracture management",
  "Fracture healing and non-union",
  "Pediatric fractures (greenstick, supracondylar, etc.)",
  "Bone tumors (benign/malignant)",
  "Avascular necrosis",
  "Total hip replacement complications",
  "Total knee replacement complications",
  "Orthopedic postoperative infection",
  "Orthopedic hardware failure"
];

for (const topic of topics) {
  const id = topic.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  await db.collection("topics2").doc(id).set({
    category: "Orthopedics",
    topic,
    id,
    lang: "en"
  });
  console.log("✅ Inserted:", topic);
}
