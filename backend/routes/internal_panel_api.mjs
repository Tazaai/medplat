import express from "express";
import OpenAI from "openai";

const router = express.Router();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Dynamic expert role selection based on topic/category
 * Always includes: Medical Student, Professor, Researcher (permanent members)
 * Plus 3-4 specialists relevant to the case
 */
function selectExpertRoles(topic, category) {
  const topicLower = (topic || "").toLowerCase();
  const categoryLower = (category || "").toLowerCase();

  // Permanent members
  const permanentRoles = [
    "Medical Student (learning perspective)",
    "Professor (academic rigor and teaching)",
    "Researcher (evidence-based medicine)"
  ];

  // Dynamic role selection based on topic/category
  let dynamicRoles = [];

  if (categoryLower.includes("cardio") || topicLower.includes("mi") || topicLower.includes("heart") || topicLower.includes("cardiac")) {
    dynamicRoles = ["Cardiologist", "Emergency Physician", "Internist", "Cardiac Surgeon"];
  } else if (categoryLower.includes("neuro") || topicLower.includes("stroke") || topicLower.includes("seizure")) {
    dynamicRoles = ["Neurologist", "Neuroradiologist", "Internal Medicine Specialist", "Emergency Physician"];
  } else if (categoryLower.includes("pulm") || categoryLower.includes("respir") || topicLower.includes("asthma") || topicLower.includes("copd")) {
    dynamicRoles = ["Pulmonologist", "Critical Care Specialist", "Emergency Physician", "Thoracic Surgeon"];
  } else if (categoryLower.includes("gastro") || topicLower.includes("gi bleed") || topicLower.includes("abdomen")) {
    dynamicRoles = ["Gastroenterologist", "General Surgeon", "Emergency Physician", "Hepatologist"];
  } else if (categoryLower.includes("renal") || categoryLower.includes("nephro") || topicLower.includes("kidney")) {
    dynamicRoles = ["Nephrologist", "Internist", "Emergency Physician", "Urologist"];
  } else if (categoryLower.includes("endo") || topicLower.includes("diabetes") || topicLower.includes("thyroid")) {
    dynamicRoles = ["Endocrinologist", "Internist", "Emergency Physician", "Clinical Pharmacist"];
  } else if (categoryLower.includes("infect") || topicLower.includes("sepsis") || topicLower.includes("pneumonia")) {
    dynamicRoles = ["Infectious Disease Specialist", "Intensivist", "Emergency Physician", "Clinical Microbiologist"];
  } else if (categoryLower.includes("hema") || categoryLower.includes("oncol") || topicLower.includes("anemia")) {
    dynamicRoles = ["Hematologist", "Oncologist", "Internist", "Emergency Physician"];
  } else if (categoryLower.includes("rheum") || topicLower.includes("arthritis") || topicLower.includes("lupus")) {
    dynamicRoles = ["Rheumatologist", "Internist", "Emergency Physician", "Clinical Immunologist"];
  } else if (categoryLower.includes("trauma") || categoryLower.includes("ortho") || topicLower.includes("fracture")) {
    dynamicRoles = ["Trauma Surgeon", "Orthopedic Surgeon", "Emergency Physician", "Anesthesiologist"];
  } else if (categoryLower.includes("toxicol") || topicLower.includes("overdose") || topicLower.includes("poisoning")) {
    dynamicRoles = ["Toxicologist", "Clinical Pharmacist", "Emergency Physician", "Intensivist"];
  } else if (categoryLower.includes("psych") || topicLower.includes("depression") || topicLower.includes("psychosis")) {
    dynamicRoles = ["Psychiatrist", "Emergency Physician", "Clinical Psychologist", "Neurologist"];
  } else {
    // General/unknown category - balanced panel
    dynamicRoles = ["General Practitioner", "Internist", "Emergency Physician", "Clinical Pharmacist"];
  }

  return [...permanentRoles, ...dynamicRoles];
}

/**
 * Internal Expert Panel - Auto-review and improve case before user sees it
 * This is INVISIBLE to users - they only see the refined result
 */
router.post("/", async (req, res) => {
  const { topic, caseData, category, language = "en", region = "EU/DK" } = req.body;

  if (!topic || !caseData) {
    return res.status(400).json({ ok: false, error: "Missing topic or caseData" });
  }

  try {
    const expertRoles = selectExpertRoles(topic, category);
    const rolesString = expertRoles.map((r, i) => `${i + 1}. ${r}`).join("\n");

    const panelPrompt = `You are an Internal Expert Panel that reviews and improves medical case drafts BEFORE they are shown to users.

**Context:**
Topic: ${topic}
Category: ${category || "General"}
Language: ${language}
Region: ${region}

**Expert Panel Composition:**
${rolesString}

**Your Task:**
Silently review the draft case and IMPROVE it by:
1. Ensuring clinical accuracy and guideline adherence (${region} guidelines)
2. Adding missing critical elements (red flags, timing windows, rescue therapies)
3. Clarifying reasoning and differential diagnoses
4. Enriching labs/imaging with realistic timing and rationale
5. Verifying hemodynamic profiling is correct (warm/cold, wet/dry)
6. Ensuring social needs and disposition are region-appropriate
7. Checking that teaching pearls and mnemonics are high-quality
8. Validating evidence (prevalence, test characteristics) is accurate

**Draft Case:**
${JSON.stringify(caseData, null, 2)}

**Output Requirements:**
- Return ONLY the improved case JSON (same schema)
- Do NOT add meta-commentary or panel discussion
- Ensure all fields are enhanced but structure remains identical
- Focus on SUBSTANCE: add missing details, correct errors, enrich clinical reasoning
- Make it top-level medical education quality

**JSON Schema (maintain this exactly):**
{
  "meta": {...},
  "history": {...},
  "exam": {...},
  "paraclinical": {...},
  "differentials": [...],
  "red_flags": [...],
  "final_diagnosis": {...},
  "pathophysiology": {...},
  "etiology": {...},
  "management": {...},
  "disposition": {...},
  "evidence": {...},
  "teaching": {...},
  "panel_notes": {...}
}

Return ONLY valid JSON. No markdown, no explanations.`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert medical panel that improves case quality. Return only valid JSON." },
        { role: "user", content: panelPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const improvedCase = JSON.parse(completion.choices[0].message.content);

    // Tag case as reviewed by internal panel
    if (improvedCase.meta) {
      improvedCase.meta.reviewed_by_internal_panel = true;
      improvedCase.meta.panel_review_timestamp = new Date().toISOString();
    }

    res.json({
      ok: true,
      case: improvedCase,
      reviewed: true,
      panelNote: "✅ Reviewed by internal specialist panel"
    });

  } catch (error) {
    console.error("❌ Internal panel error:", error);
    // Fallback: return original case if panel fails
    const fallbackCase = { ...caseData };
    if (fallbackCase.meta) {
      fallbackCase.meta.reviewed_by_internal_panel = false;
    }
    res.json({
      ok: true,
      case: fallbackCase,
      reviewed: false,
      panelNote: "⚠️ Internal review unavailable, using draft"
    });
  }
});

export default router;
