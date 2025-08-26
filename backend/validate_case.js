// ~/medplat/backend/validate_case.js
import fs from "fs";

// Load case JSON from file (output of curl test saved as response.json)
const file = process.argv[2] || "./response.json";
if (!fs.existsSync(file)) {
  console.error(`❌ File not found: ${file}`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(file, "utf-8"));
} catch (err) {
  console.error("❌ Invalid JSON in file:", err.message);
  process.exit(1);
}

const caseJson = data.json || data; // support both wrapper or raw JSON

// ✅ Dynamic schema checks
const checks = [];

function check(path, condition, message) {
  if (!condition) checks.push(`⚠️ Missing/invalid: ${path} → ${message}`);
}

// Core required blocks
check("History", !!caseJson.History, "Missing patient history");
check("Objective", !!caseJson.Objective, "Missing objective findings");
check("Investigations", !!caseJson.Investigations, "Missing labs/imaging");
check("Differential", Array.isArray(caseJson.Differential) && caseJson.Differential.length > 0, "No differential diagnosis list");
check("Provisional_Dx || Provisional_Diagnosis", caseJson.Provisional_Dx || caseJson.Provisional_Diagnosis, "Missing provisional diagnosis");
check("Pathophysiology", !!caseJson.Pathophysiology, "Missing pathophysiology explanation");
check("Management", !!caseJson.Management, "No management section");
check("Disposition", !!caseJson.Disposition, "Missing disposition/admission criteria");
check("Evidence/Evidence_and_References", caseJson.Evidence || caseJson.Evidence_and_References, "Missing guideline references");
check("Expert_Panel_and_Teaching", !!caseJson.Expert_Panel_and_Teaching, "Missing expert panel");
check("Red_Flags_and_Rescue", !!caseJson.Red_Flags_and_Rescue, "Missing red flags/rescue therapies");
check("Conclusion", !!caseJson.Conclusion, "Missing conclusion");
check("Atypical", !!caseJson.Atypical, "Missing atypical presentation");
check("Charts", !!caseJson.Charts, "Missing trend charts/graphs");

// 🔍 Specific quality checks
if (caseJson.Expert_Panel_and_Teaching?.Panel?.length < 12) {
  checks.push("⚠️ Expert panel has fewer than 12 roles");
}
if (!caseJson.Red_Flags_and_Rescue?.Rescue_Therapies && !caseJson.Red_Flags_and_Rescue?.Immediate_Stabilization) {
  checks.push("⚠️ No rescue therapy explicitly mentioned");
}
if (Array.isArray(caseJson.Evidence_and_References) && caseJson.Evidence_and_References.length < 1) {
  checks.push("⚠️ No evidence references listed");
}
if (!caseJson.Management?.Initial_Interventions?.length) {
  checks.push("⚠️ Management missing timeline of interventions");
}
if (!caseJson.Teaching && !caseJson.Expert_Panel_and_Teaching?.Debates) {
  checks.push("⚠️ No explicit teaching debates included");
}

// 📊 Results
if (checks.length === 0) {
  console.log("✅ Case passed schema validation (dynamic).");
} else {
  console.log("🔎 Validation issues found:");
  for (const c of checks) console.log(" - " + c);
}
