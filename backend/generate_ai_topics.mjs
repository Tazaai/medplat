import admin from "firebase-admin";
import fs from "fs";

const serviceAccount = JSON.parse(fs.readFileSync("serviceAccountKey.json", "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const topics = [
  "Sepsis hos immunsupprimeret",
  "AKS hos diabetiker",
  "Hyponatriæmi og konfusion",
  "Hypoglykæmi med kramper",
  "Lungeemboli hos gravid",
  "UVI hos ældre med delir",
  "Anafylaksi efter antibiotika",
  "KOL med CO2-retention",
  "GI-blødning hos AK-behandlet patient",
  "Hyperkaliæmi med EKG-forandringer",
  "Pneumoni hos splenektomeret",
  "Meningitis hos ung uden feber",
  "Delirium hos cancerpatient",
  "Status epilepticus",
  "DVT og lungeemboli kombineret",
  "Ascites og SBP",
  "Leverkoma",
  "Akut nyresvigt og dehydrering",
  "Hypercalcæmi hos cancerpatient",
  "Akut urinretention hos mand",
  "Thyrotoksisk krise",
  "Addison-krise",
  "Akut konfusion og infektion",
  "Neutropen feber",
  "Akut GI-infektion med shock",
  "Ketoacidose hos type 1 diabetiker",
  "HHS hos ældre",
  "Hypertensiv krise",
  "Takyarytmi og synkope",
  "Bradykardi og bevidsthedstab",
  "Forgiftning – paracetamol",
  "Forgiftning – opioider",
  "Akut nyresten med sepsis",
  "Nyopdaget diabetes med ketoacidose",
  "Akut iskæmisk apopleksi",
  "Blødning hos AK-behandlet",
  "Postpartum blødning",
  "Ekstrauterin graviditet",
  "Pneumothorax efter traume",
  "Svær astma eksacerbation",
  "KOL med pneumoni",
  "Tarmiskæmi og shock",
  "Perforeret ulcus",
  "Meningokokmeningitis",
  "Trombocytopeni og blødning",
  "Febril neutropeni",
  "Anæmi og hjertesvigt",
  "Epilepsi med status",
  "Migræne med aura og lammelse",
  "Guillain-Barré med respirationssvigt",
  "Tarmobstruktion og opkast",
  "Sepsis og nyreinsufficiens",
  "Akut leversvigt",
  "Stasekramper og diuretika",
  "Hypotermi og bevidsthedstab",
  "Elektrolytforstyrrelser og delirium",
  "Bakteriæmi og endokarditis",
  "Feber og petekkier – mistanke om meningokokker"
];

(async () => {
  for (const topic of topics) {
    await db.collection("ai_case_topics").add({
      topic,
      created_at: new Date().toISOString(),
      source: "ai_topic"
    });
    console.log("✅ Uploadet:", topic);
  }
  console.log("🎉 Færdig!");
})();
