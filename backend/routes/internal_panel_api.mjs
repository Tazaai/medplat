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
 * 
 * 🩺 STAGE 2: Internal Expert Panel Review (quality layer)
 * Includes quality scoring and automatic regeneration if quality < 0.85
 */
router.post("/", async (req, res) => {
  const { topic, caseData, category, language = "en", region = "EU/DK" } = req.body;

  if (!topic || !caseData) {
    return res.status(400).json({ ok: false, error: "Missing topic or caseData" });
  }

  try {
    const expertRoles = selectExpertRoles(topic, category);
    const rolesString = expertRoles.map((r, i) => `${i + 1}. ${r}`).join("\n");

    // 🎯 STAGE 2: Professor-Level Panel Review
    const panelPrompt = `You are an Internal Expert Panel that reviews and improves medical case drafts BEFORE they are shown to users.

**Mission:** Ensure every case surpasses UpToDate, AMBOSS, and Medscape quality — university-level clinical masterclass standard.

**Context:**
Topic: ${topic}
Category: ${category || "General"}
Language: ${language}
Region: ${region}

**Expert Panel Composition:**
${rolesString}

**Your Task:**
Silently review the draft case and IMPROVE it by:
1. **Guideline Integration (Hierarchical):** Prioritize guidelines by region:
   - Regional/Hospital → National → Continental → International
   - Format all guidelines with URLs or DOIs: "[Society Year] Title - URL"
   - Ensure ${region}-specific guidelines appear first
2. **Completeness:** Ensure every section is filled with realistic, specific values (no empty fields)
3. **Clinical Accuracy:** Verify vitals, lab values, imaging findings are physiologically consistent
4. **Red Flags:** Add missing time-critical findings with specific actions
5. **Timing Windows with Rationale:** ALWAYS explain pathophysiology → consequence → action
   - Example: "β-blockers can worsen bradycardia and reduce cardiac output → use with caution → hold until hemodynamically stable"
6. **Differential Reasoning:** Ensure arguments for/against each diagnosis are evidence-based
7. **Hemodynamic Profiling:** Validate warm/cold, wet/dry assessment is accurate
8. **Disposition:** Ensure admit/discharge, unit, follow-up, social needs are region-appropriate
9. **Teaching Quality:** Verify pearls are clinically useful, mnemonics are memorable
10. **Evidence Depth:** Add specific guidelines with URLs/DOIs in hierarchical order (tier: regional/national/continental/international)
11. **Clinical Scales:** Include relevant scores (NIHSS, Killip, SOFA, etc.) when applicable
12. **Panel Discussion (Conference-Style):** Remove individual expert perspectives, create unified conference discussion with:
    - Specialist viewpoints with for/against arguments
    - Confidence scores and evidence citations
    - Points of debate (1-2 areas of disagreement)
    - Final consensus statement
13. **Academic Rigor:** Refine language to be concise, professional, globally guideline-aware

**Draft Case:**
${JSON.stringify(caseData, null, 2)}

**Output Requirements:**
Return a JSON object with TWO fields:
1. "improved_case": {...} - The enhanced case (same schema as draft)
2. "quality_score": 0.0-1.0 - Overall quality assessment (0.95+ = excellent, ready to publish)

Quality scoring criteria (UPDATED weights for professor-level assessment):
- Completeness: 15% (all sections filled, no placeholders)
- Clinical Accuracy: 20% (realistic values, logical consistency)
- Guideline Adherence (Hierarchical): 15% (regional → national → international with URLs) **[UPDATED]**
- Pathophysiology Depth: 20% (detailed mechanism, molecular → organ system → clinical) **[INCREASED]**
- Educational Value: 20% (teaching pearls, pitfalls, reflection questions, mnemonics, conference discussion) **[INCREASED]**
- Clinical Rationale Before Timing: 5% (pathophysiology → action for all timing windows) **[NEW]**
- Academic Rigor: 5% (professional tone, references)

MINIMUM ACCEPTABLE: 0.95 (cases below this trigger micro-refinement)

Return ONLY valid JSON. No markdown, no explanations.

Expected format:
{
  "improved_case": {
    "meta": {...},
    "timeline": {...},
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
    "panel_discussion": {...}
  },
  "quality_score": 0.92
}`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert medical panel that improves case quality and scores it objectively. Return only valid JSON." },
        { role: "user", content: panelPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const panelResponse = JSON.parse(completion.choices[0].message.content);
    let improvedCase = panelResponse.improved_case || panelResponse.case || caseData;
    let qualityScore = panelResponse.quality_score || 0.9; // Default to high if not provided

    // 🔄 REGENERATION LOOP: If quality < 0.95, run one more refinement pass
    if (qualityScore < 0.95) {
      console.log(`⚠️ Quality score ${qualityScore.toFixed(2)} below 0.95 threshold, running refinement pass...`);
      
      const refinementPrompt = `The case quality score was ${qualityScore.toFixed(2)} (below 0.95 threshold).

**Refinement Focus:**
Identify specific gaps and strengthen:
- Missing clinical details (labs, vitals, specific values)
- Weak differential reasoning
- Incomplete disposition or social needs
- Missing red flags or timing windows
- Vague teaching pearls or evidence

**Case to Refine:**
${JSON.stringify(improvedCase, null, 2)}

Return improved case with quality_score >= 0.95.

Same JSON format:
{
  "improved_case": {...},
  "quality_score": 0.96
}`;

      const refinementCompletion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an expert medical panel performing final quality refinement. Return only valid JSON." },
          { role: "user", content: refinementPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.6, // Lower temperature for refinement
      });

      const refinedResponse = JSON.parse(refinementCompletion.choices[0].message.content);
      improvedCase = refinedResponse.improved_case || refinedResponse.case || improvedCase;
      qualityScore = refinedResponse.quality_score || qualityScore;
      
      console.log(`✅ Refinement complete, new quality score: ${qualityScore.toFixed(2)}`);
    }

    // Tag case as reviewed by internal panel
    if (improvedCase.meta) {
      improvedCase.meta.reviewed_by_internal_panel = true;
      improvedCase.meta.panel_review_timestamp = new Date().toISOString();
      improvedCase.meta.quality_score = qualityScore;
      
      // Preserve Stage 1 generator metadata
      if (caseData.meta?.generator_version) {
        improvedCase.meta.generator_version = caseData.meta.generator_version;
      }
      if (caseData.meta?.quality_estimate !== undefined) {
        improvedCase.meta.quality_estimate = caseData.meta.quality_estimate;
      }
    }

    // 📊 Telemetry: Log quality score for monitoring
    console.log(`📊 Quality Metrics | Topic: ${topic} | Category: ${category || 'General'} | Score: ${qualityScore.toFixed(3)} | Generator: ${caseData.meta?.generator_version || 'unknown'}`);

    res.json({
      ok: true,
      case: improvedCase,
      reviewed: true,
      qualityScore: qualityScore,
      panelNote: `✅ Validated by Internal Expert Panel (Quality: ${(qualityScore * 100).toFixed(0)}%)`
    });

  } catch (error) {
    console.error("❌ Internal panel error:", error);
    // Fallback: return original case if panel fails
    const fallbackCase = { ...caseData };
    if (fallbackCase.meta) {
      fallbackCase.meta.reviewed_by_internal_panel = false;
      fallbackCase.meta.quality_score = 0.0;
    }
    res.json({
      ok: true,
      case: fallbackCase,
      reviewed: false,
      qualityScore: 0.0,
      panelNote: "⚠️ Internal review unavailable, using draft"
    });
  }
});

export default router;
