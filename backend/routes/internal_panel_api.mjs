import express from "express";
import OpenAI from "openai";
import { getPanelRoles, getRoleExpertise } from '../utils/panelRoles.mjs';
import { validateReferences, getFallbackReferences } from '../utils/validateReferences.mjs';

const router = express.Router();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Dynamic expert role selection based on topic/category
 * Uses the enhanced panelRoles module for specialty-matched panel diversity
 * Ensures ≥5 roles with universal experts (GP, Pharmacology, Ethics)
 */
function selectExpertRoles(topic, category, options = {}) {
  // Use enhanced panel role selection from utility module
  const enhancedRoles = getPanelRoles(topic, category, {
    minRoles: 5,
    maxRoles: 7,
    includeGP: true,
    includePharmacology: true,
    includeEthics: options.includeEthics || false
  });
  
  // Add permanent academic roles if not already included
  const permanentRoles = [
    "Medical Student (learning perspective)",
    "Professor (academic rigor and teaching)",
    "Researcher (evidence-based medicine)"
  ];
  
  const allRoles = [...new Set([...permanentRoles, ...enhancedRoles])];
  
  // Log role diversity for quality monitoring
  console.log(`📋 Panel assembled: ${allRoles.length} roles for ${category}/${topic}`);
  
  return allRoles.slice(0, 8); // Cap at 8 to avoid overwhelming context
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
1. **Guideline Integration (Hierarchical):** Prioritize guidelines by region (5 tiers):
   - Local/Hospital → Regional (state/province) → National → Continental → International
   - Format all guidelines with URLs or DOIs: "[Society Year] Title - URL"
   - Ensure ${region}-specific guidelines appear first
   - Example: Copenhagen University Hospital protocol (local) → Sundhedsstyrelsen (national) → ESC (continental)
2. **Pathophysiology Depth (Classification + Molecular Flow):** 
   - Include relevant disease classification (Stanford/DeBaKey for dissection, Killip for MI, NYHA for HF, TOAST for stroke, etc.)
   - Provide complete molecular → cellular → organ → clinical flow
   - Explain hemodynamic/structural consequences (e.g., dissection → coronary ostia shear → MI, carotid involvement → stroke)
   - Connect pathophysiology directly to patient's symptoms and exam findings
3. **Completeness:** Ensure every section is filled with realistic, specific values (no empty fields)
4. **Clinical Accuracy:** Verify vitals, lab values, imaging findings are physiologically consistent
5. **Red Flags:** Add missing time-critical findings with specific actions
6. **Timing Windows with Rationale:** ALWAYS explain pathophysiology → consequence → action
   - Example: "β-blockers can worsen bradycardia and reduce cardiac output → use with caution → hold until hemodynamically stable"
7. **Evidence-Based Management (NO hardcoded alternatives):** Generate region-specific management using local guidelines:
   - Format: Action | Dose/Route | Timing | Evidence Level (Class I–III, Level A–C) | Guideline + URL
   - Denmark → Sundhedsstyrelsen + NNBV + ESC | USA → AHA/ACC + ACEP | UK → NICE + BNF | EU → ESC
   - For STEMI/ACS: Always include PCI and dual antiplatelet therapy with evidence levels
   - Include DOI or official URL for each guideline reference
8. **Differential Reasoning:** Ensure arguments for/against each diagnosis are evidence-based
8. **Hemodynamic Profiling:** Validate warm/cold, wet/dry assessment is accurate
9. **Disposition:** Ensure admit/discharge, unit, follow-up, social needs are region-appropriate
10. **Teaching Quality:** Verify pearls are clinically useful, mnemonics are memorable
11. **Evidence Depth:** Add specific guidelines with URLs/DOIs in hierarchical order (tier: local/regional/national/continental/international)
12. **Clinical Scales:** Include relevant scores (NIHSS, Killip, SOFA, etc.) when applicable
13. **Panel Discussion (Conference-Style):** Remove individual expert perspectives, create unified conference discussion with:
    - Specialist viewpoints with for/against arguments
    - Confidence scores and evidence citations
    - **AT LEAST 3 points of debate/disagreement** (format: **Disagreement 1: [Topic]** - Role1: [Position] - Role2: [Counter])
    - Final consensus statement
    - Each disagreement must cite specific guidelines or evidence
14. **Academic Rigor:** Refine language to be concise, professional, globally guideline-aware

**Draft Case:**
${JSON.stringify(caseData, null, 2)}

**Output Requirements:**
Return a JSON object with TWO fields:
1. "improved_case": {...} - The enhanced case (same schema as draft)
2. "quality_score": 0.0-1.0 - Overall quality assessment (0.95+ = excellent, ready to publish)

Quality scoring criteria (UPDATED weights for professor-level assessment):
- Completeness: 15% (all sections filled, no placeholders)
- Clinical Accuracy: 15% (realistic values, logical consistency)
- Guideline Adherence (5-Tier Hierarchical): 15% (local → regional → national → continental → international with URLs)
- Pathophysiology Depth: 25% (classification system + molecular → cellular → organ → clinical flow + hemodynamic/structural consequences) **[INCREASED & ENHANCED]**
- Educational Value: 20% (teaching pearls, pitfalls, reflection questions, mnemonics, conference discussion)
- Clinical Rationale Before Timing: 5% (pathophysiology → action for all timing windows)
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
    if (!improvedCase.meta) {
      improvedCase.meta = {}; // Initialize if missing
    }
    
    improvedCase.meta.reviewed_by_internal_panel = true;
    improvedCase.meta.panel_review_timestamp = new Date().toISOString();
    improvedCase.meta.quality_score = qualityScore;
    improvedCase.meta.panel_roles = expertRoles; // Track panel diversity
    
    // Preserve Stage 1 generator metadata
    if (caseData.meta?.generator_version) {
      improvedCase.meta.generator_version = caseData.meta.generator_version;
    }
    if (caseData.meta?.quality_estimate !== undefined) {
      improvedCase.meta.quality_estimate = caseData.meta.quality_estimate;
    }

    // ✅ Validate and fix references
    if (improvedCase.evidence && Array.isArray(improvedCase.evidence.guidelines)) {
      const refValidation = await validateReferences(
        improvedCase.evidence.guidelines,
        region || 'EU'
      );
      
      improvedCase.meta.reference_validation = {
        total: refValidation.stats.total,
        verified: refValidation.stats.verified,
        fabricated: refValidation.stats.fabricated
      };
      
      // Replace fabricated references with verified fallbacks
      if (refValidation.stats.fabricated > 0) {
        console.log(`⚠️  Detected ${refValidation.stats.fabricated} fabricated references, applying fallbacks`);
        const fallbackRefs = getFallbackReferences(topic, region || 'EU');
        improvedCase.evidence.guidelines = [
          ...refValidation.valid.map(v => v.original),
          ...fallbackRefs
        ];
        improvedCase.meta.reference_validation.fallback_applied = true;
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
