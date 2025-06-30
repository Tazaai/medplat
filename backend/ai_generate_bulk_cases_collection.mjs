import admin from "firebase-admin";
import fs from "fs";
import fetch from "node-fetch";

const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const collectionName = process.argv[2] || "topics2"; // <-- vælg collection som 1. parameter!

const specialties = [
  "Internal Medicine", "Cardiology", "Pulmonology", "Endocrinology", "Nephrology",
  "Gastroenterology", "Hematology", "Oncology", "Rheumatology", "Infectious Diseases",
  "Neurology", "Dermatology", "Geriatrics", "Pediatrics", "Allergy/Immunology",
  "Toxicology", "Psychiatry", "Environmental Medicine", "Occupational Medicine",
  "Rehabilitation Medicine", "General Practice", "Clinical Pharmacology", "Clinical Genetics"
];

const openai_api_key = process.env.OPENAI_API_KEY;
if (!openai_api_key) {
  console.error("Set your OPENAI_API_KEY in environment variables!");
  process.exit(1);
}

const getPrompt = specialty => `
List 50 distinct, common or important diseases or clinical problems (in English, comma-separated, no extra text) within the medical specialty: ${specialty}.
`;

async function generateCases(specialty) {
  const prompt = getPrompt(specialty);
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + openai_api_key,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 600
    })
  });
  const data = await response.json();
  let diseaseList = [];
  if (data.choices && data.choices[0] && data.choices[0].message) {
    diseaseList = data.choices[0].message.content
      .replace(/\n/g,",")
      .split(",")
      .map(s => s.replace(/^\d+\.?\s*/,"").trim())
      .filter(Boolean)
      .slice(0, 50);
  }
  if (!diseaseList.length) diseaseList = Array.from({length:50},(_,i)=>`Unknown Disease #${i+1}`);
  return diseaseList.map((disease, i) => ({
    id: `${specialty.toLowerCase().replace(/[^a-z]/g,"_")}_${String(i+1).padStart(3,"0")}`,
    category: specialty,
    topic: disease
  }));
}

async function main() {
  for (const specialty of specialties) {
    console.log(`Generating cases for ${specialty} in ${collectionName}...`);
    const cases = await generateCases(specialty);
    for (const c of cases) {
      await db.collection(collectionName).doc(c.id).set(c);
    }
    console.log(`Done: ${specialty}`);
  }
  process.exit(0);
}

main();
