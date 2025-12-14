// backend/intelligence_core/ai_model_admin.mjs

// Central controller for MedPlat AI model orchestration.
// Does NOT change schema, does NOT rewrite generators, only wraps them.

// Import OpenAI SDK (same as your generator)
import OpenAI from "openai";

// Reuse your environment variable
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ============================================================
   1. MODEL ADMINISTRATION
   ============================================================ */

export const AI_MODELS = {
  PRIMARY: "gpt-4o",
  UPGRADE: "gpt-4o",
};

export function selectModel(taskType = "default") {
  switch (taskType) {
    case "expert_conference":
    case "pathophysiology":
    case "mcq_reasoning":
    case "simulation_logic":
    case "certification_difficulty":
      return AI_MODELS.UPGRADE;
    default:
      return AI_MODELS.PRIMARY;
  }
}

/* ============================================================
   2. LOW-LEVEL CALL WRAPPERS
   ============================================================ */

export async function runPrimary(prompt, options = {}) {
  const response = await client.chat.completions.create({
    model: AI_MODELS.PRIMARY,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    max_tokens: options.max_tokens || 2000,
    temperature: options.temperature || 0.3,
    response_format: options.response_format || undefined
  });
  return {
    output_text: response.choices[0].message.content,
    choices: response.choices
  };
}

export async function runUpgrade(prompt, options = {}) {
  const response = await client.chat.completions.create({
    model: AI_MODELS.UPGRADE,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    max_tokens: options.max_tokens || 3000,
    temperature: options.temperature || 0.3,
    response_format: options.response_format || undefined
  });
  return {
    output_text: response.choices[0].message.content,
    choices: response.choices
  };
}

/* ============================================================
   3. SECTION-SPECIFIC UPGRADES
   ============================================================ */

export async function upgradeExpertConference(rawConference, topic, acuity) {
  const prompt = `
You upgrade ONLY the expert_conference section of a MedPlat case.

Never rewrite the whole case. Only output upgraded expert_conference JSON.

Rules:
- 3–5 voices: Specialist, EM, GP, Radiology/Pharm if needed
- Real disagreement (2–3 points)
- Evidence-based arguments
- Red-flag escalation embedded
- Short consensus conclusion
- No long paragraphs; structured JSON only.

INPUT:
Topic: ${topic}
Acuity: ${acuity}
Raw conference: ${JSON.stringify(rawConference)}

OUTPUT: { "expert_conference": { ... } }
`;

  const res = await runUpgrade(prompt, { response_format: { type: "json_object" } });
  return res.output_text;
}

export async function upgradePathophysiology(rawPath, topic) {
  const prompt = `
You upgrade ONLY the pathophysiology section of a MedPlat case.

Use ONE deep structured version (no short+long separation).

Structure:
- mechanism
- molecular_drivers
- organ_interactions
- timeline
- recovery_path
- diagnostic_implications
- therapeutic_implications

INPUT topic: ${topic}
Raw pathophysiology: ${JSON.stringify(rawPath)}

OUTPUT: { "pathophysiology": { ... } }
`;

  const res = await runUpgrade(prompt, { response_format: { type: "json_object" } });
  return res.output_text;
}

export async function upgradeManagement(management, meta) {
  const prompt = `
You upgrade ONLY the MANAGEMENT section of a MedPlat case to high-specialist level.

Never rewrite the whole case. Only output upgraded management JSON.

CRITICAL RULES:
- Structure into initial + definitive + escalation phases
- Include escalation criteria linked to acuity and labs
- Include disposition logic (home / ward / ICU)
- Include drug dosing ranges (safe, non-country-specific)
- Include contraindications and monitoring requirements
- Ensure red-flag → intervention mapping
- Remove generic statements
- Ensure alignment with history, exam, labs, diagnosis, and complications

STRICT OUTPUT FORMAT:
- management.initial: MUST be array of strings (e.g., ["Action 1", "Action 2"])
- management.definitive: MUST be array of strings
- management.escalation: MUST be array of strings
- management.disposition: MUST be array of strings
- NO nested objects - flatten everything to arrays of strings
- NO "[object Object]" anywhere

INPUT:
Topic: ${meta?.topic || 'Unknown'}
Acuity: ${meta?.acuity || 'moderate'}
Setting: ${meta?.setting || 'unknown'}
Raw management: ${JSON.stringify(management)}

OUTPUT: { "management": { "initial": ["string1", "string2"], "definitive": ["string1"], "escalation": ["string1"], "disposition": ["string1"] } }
`;

  const res = await runUpgrade(prompt, { response_format: { type: "json_object" } });
  const parsed = JSON.parse(res.output_text);
  
  // FLATTEN: Ensure all fields are arrays of strings
  if (parsed.management) {
    const flattened = {};
    ['initial', 'definitive', 'escalation', 'disposition', 'monitoring', 'dosing'].forEach(field => {
      if (parsed.management[field]) {
        const value = parsed.management[field];
        if (Array.isArray(value)) {
          flattened[field] = value.map(item => {
            if (typeof item === 'string') return item;
            if (typeof item === 'object') {
              return item.text || item.description || item.name || JSON.stringify(item);
            }
            return String(item);
          }).filter(item => item && item.trim());
        } else if (typeof value === 'string') {
          flattened[field] = value.split('\n').filter(line => line.trim());
        } else {
          flattened[field] = [String(value)];
        }
      }
    });
    // Preserve other fields
    Object.keys(parsed.management).forEach(key => {
      if (!['initial', 'definitive', 'escalation', 'disposition', 'monitoring', 'dosing'].includes(key)) {
        flattened[key] = parsed.management[key];
      }
    });
    parsed.management = flattened;
  }
  
  return JSON.stringify(parsed);
}

/* ============================================================
   4. MCQ GENERATION (GAMIFICATION)
   ============================================================ */

export async function runMCQGenerator(caseData) {
  const prompt = `
Generate 4–6 MCQs for the given clinical case.

Use PRIMARY model for MCQ stems + distractors.

Use UPGRADE model for detailed reasoning chain (attached later by the panel).

Case meta:
${JSON.stringify(caseData.meta)}

Required MCQ format:
[
  {
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "correct": "A",
    "difficulty": "basic|intermediate|advanced",
    "reasoning_placeholder": true
  }
]
`;

  const res = await runPrimary(prompt, { response_format: { type: "json_object" } });
  const parsed = JSON.parse(res.output_text);
  return parsed.mcqs || parsed;
}

export async function upgradeMCQReasoning(mcqBlock) {
  const prompt = `
You add ONLY the reasoning for MCQs.

Do not change stems or options.

INPUT:
${JSON.stringify(mcqBlock)}

RULES:
- Chronological reasoning
- Rule-in / rule-out logic
- Pre-test probability adjustments
- Red flags & escalation logic
- Pathophysiology-linked logic

OUTPUT:
Same array, but each item has:
"reasoning": "..."
`;

  const res = await runUpgrade(prompt, { response_format: { type: "json_object" } });
  return JSON.parse(res.output_text);
}

/* ============================================================
   5. CERTIFICATION ENGINE
   ============================================================ */

export async function runCertificationEngine(caseData, level = "intermediate") {
  const prompt = `
Generate certification-style MCQs.

PRIMARY model: stem + distractors.

UPGRADE model: logic + difficulty scaling.

Level: ${level}
Topic: ${caseData.meta.topic}

Output 5 certification MCQs in same format as gamification.
`;

  const res = await runPrimary(prompt, { response_format: { type: "json_object" } });
  return JSON.parse(res.output_text);
}

export async function upgradeCertificationReasoning(certMCQs) {
  const prompt = `
Upgrade reasoning for certification MCQs.

Focus on algorithmic, multi-step logic.

INPUT:
${JSON.stringify(certMCQs)}

OUTPUT:
Add reasoning to each MCQ.
`;

  const res = await runUpgrade(prompt, { response_format: { type: "json_object" } });
  return JSON.parse(res.output_text);
}

/* ============================================================
   6. INTERACTIVE SIMULATION ENGINE
   ============================================================ */

export async function runSimulationEngine(caseData) {
  const prompt = `
Generate interactive simulation structure:
- timeline: 0, 30, 60, 120 minutes
- vitals at each step
- intervention branches
- escalation triggers
- critical failure points

PRIMARY model: timeline + vitals.

UPGRADE model will refine logic later.

Case meta:
${JSON.stringify(caseData.meta)}

OUTPUT JSON:
{
  "timeline": [...],
  "branches": {...},
  "escalation_logic": {...}
}
`;

  const res = await runPrimary(prompt, { response_format: { type: "json_object" } });
  return JSON.parse(res.output_text);
}

export async function upgradeSimulationLogic(simBlock) {
  const prompt = `
Upgrade only the simulation logic.

Add escalation, deterioration patterns, decision trees, and red-flag branches.

INPUT:
${JSON.stringify(simBlock)}

OUTPUT:
Same structure with refined logic.
`;

  const res = await runUpgrade(prompt, { response_format: { type: "json_object" } });
  return JSON.parse(res.output_text);
}

/* ============================================================
   7. NIGHTLY QUALITY PASS
   ============================================================ */

export async function runNightlyQualityPass(sampleCases) {
  const prompt = `
You evaluate a batch of MedPlat cases (system-wide).

Identify patterns, quality gaps, and recurring issues.

OUTPUT:
{
  "system_flags": [...],
  "suggested_rules": [...],
  "priority_fixes": [...]
}
`;

  const res = await runUpgrade(prompt, { response_format: { type: "json_object" } });
  return JSON.parse(res.output_text);
}

/* ============================================================
   END MODULE
   ============================================================ */
