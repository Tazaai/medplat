// Multi-step case generation API
// Uses gpt-4o-mini only, no guidelines, modular interactive pipeline
// UNIFIED: All endpoints use the same universal prompt rules
// EXPERT FREEDOM MODE: Allows deeper reasoning and professional abstraction while maintaining structure

import express from 'express';
import OpenAI from 'openai';
import { withTimeoutAndRetry } from '../utils/api_helpers.mjs';
import { getCase, saveCase, updateCaseFields, generateCaseId } from '../utils/case_context_manager.mjs';
import { postProcessCase } from '../utils/case_post_processor.mjs';

// Verify OpenAI client initialization
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('[CASE_API] CRITICAL: OPENAI_API_KEY not found at module load time');
} else {
  console.log('[CASE_API] OpenAI client initialized');
}

const client = new OpenAI({
  apiKey: apiKey,
});

/**
 * Unified model resolver - used by all endpoints
 * Maps frontend labels to actual model names and ensures fallback
 */
function getModel(req, existingCase = null) {
  // Model mapping: frontend labels to actual OpenAI model names
  const modelMapping = {
    // Frontend labels
    'Lite': 'gpt-4.0-mini',
    'Flash': 'gpt-4.0',
    'Pro': 'gpt-5.1',
    // Technical model names
    'gpt-4o-mini': 'gpt-4o-mini',
    'gpt-4.0-mini': 'gpt-4o-mini', // Handle frontend label variant
    'gpt-4o': 'gpt-4o',
    'gpt-4.0': 'gpt-4o', // Handle frontend label variant
    'gpt-4': 'gpt-4o', // Map gpt-4 to gpt-4o
    'gpt-5': 'gpt-4o', // Map gpt-5 to gpt-4o (gpt-5 not available yet, use gpt-4o as fallback)
    'gpt-5.1': 'gpt-5.1', // gpt-5.1 is available
  };
  
  const validModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-5.1'];
  
  // Get model from request body, existing case, or default
  let model = req.body?.model || existingCase?.model || 'gpt-4o-mini';

  // Normalize to string to avoid pathological cases (objects, numbers, etc.)
  if (typeof model !== 'string') {
    console.warn('[CASE_API] getModel: non-string model provided, falling back to default', typeof model);
    model = 'gpt-4o-mini';
  }
  
  // Map to actual model name recursively (handles nested mappings like Lite -> gpt-4.0-mini -> gpt-4o-mini)
  // Guard against mapping cycles or unexpected recursion
  const seen = new Set();
  let hops = 0;
  while (modelMapping[model]) {
    if (seen.has(model) || hops++ > 10) {
      console.error('[CASE_API] getModel: mapping cycle/too many hops, falling back to gpt-4o-mini', { model, hops });
      model = 'gpt-4o-mini';
      break;
    }
    seen.add(model);
    model = modelMapping[model];
    if (typeof model !== 'string') {
      console.error('[CASE_API] getModel: mapping produced non-string, falling back to gpt-4o-mini', { modelType: typeof model });
      model = 'gpt-4o-mini';
      break;
    }
  }
  
  // Validate and fallback to Lite if invalid
  return validModels.includes(model) ? model : 'gpt-4o-mini';
}

/**
 * Unified generation function - used by ALL endpoints
 * Same system prompt, same structure, same schema for all models
 * Model selection ONLY changes the `model` parameter
 */
async function generateCaseContent(model, userPrompt, temperature = 0.4, timeout = 30000) {
  try {
    return await withTimeoutAndRetry(
      async () => await client.chat.completions.create({
        model: model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: UNIVERSAL_SYSTEM_MESSAGE },
          { role: 'user', content: userPrompt },
        ],
        temperature: temperature,
      }),
      timeout,
      1
    );
  } catch (error) {
    // If model not available (e.g., gpt-5.1) or API key issue, fallback to gpt-4o
    const isModelError = model === 'gpt-5.1' && (
      error.message?.includes('model') || 
      error.message?.includes('not found') || 
      error.message?.includes('not available') ||
      error.status === 404 ||
      error.code === 'model_not_found'
    );
    
    if (isModelError) {
      console.warn(`[CASE_API] Model ${model} not available, falling back to gpt-4o`);
      try {
        return await withTimeoutAndRetry(
          async () => await client.chat.completions.create({
            model: 'gpt-4o',
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: UNIVERSAL_SYSTEM_MESSAGE },
              { role: 'user', content: userPrompt },
            ],
            temperature: temperature,
          }),
          timeout,
          1
        );
      } catch (fallbackError) {
        // If gpt-4o also fails, try gpt-4o-mini as last resort
        console.warn(`[CASE_API] gpt-4o also failed, falling back to gpt-4o-mini`);
        return await withTimeoutAndRetry(
          async () => await client.chat.completions.create({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: UNIVERSAL_SYSTEM_MESSAGE },
              { role: 'user', content: userPrompt },
            ],
            temperature: temperature,
          }),
          timeout,
          1
        );
      }
    }
    throw error;
  }
}

/**
 * Safe JSON parser - attempts strict parse, then removes markdown fences and retries
 * No other cleanup or string manipulation
 */
function safeParseJSON(text) {
  if (!text || typeof text !== 'string') {
    return {};
  }

  // First attempt: strict JSON.parse
  try {
    return JSON.parse(text);
  } catch (err) {
    // Second attempt: remove markdown fences and retry
    try {
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (parseErr) {
      // Third attempt: extract the outermost JSON object substring and parse
      try {
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          const candidate = cleaned.slice(firstBrace, lastBrace + 1);
          return JSON.parse(candidate);
        }
      } catch (_) {
        // fall through to error log
      }

      console.error('[CASE_API] JSON parse error:', parseErr.message, 'Text preview:', text.substring(0, 160));
      return {};
    }
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

const PLACEHOLDER_PATTERNS = [
  /not provided/i,
  /not available/i,
  /missing/i,
  /pending/i,
  /\bn\/a\b/i,
  /unknown/i,
];

function hasMeaningfulText(value) {
  if (!isNonEmptyString(value)) return false;
  return !PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

function slugifyTopic(value) {
  if (!isNonEmptyString(value)) return 'case';
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || 'case';
}

function normalizeDiagnosis(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function buildCaseContextFromCase(caseData) {
  const meta = caseData?.meta || {};
  const paraclinical = caseData?.paraclinical && typeof caseData.paraclinical === 'object'
    ? caseData.paraclinical
    : {};

  return {
    topic_slug: slugifyTopic(meta.topic || caseData?.topic || ''),
    final_diagnosis: stripSurroundingWhitespace(caseData?.final_diagnosis || caseData?.finalDiagnosis || ''),
    demographics: {
      topic: meta.topic || caseData?.topic || '',
      category: meta.category || caseData?.category || '',
      age: meta.age || '',
      sex: meta.sex || '',
      setting: meta.setting || '',
    },
    history: stripSurroundingWhitespace(caseData?.history || ''),
    exam: stripSurroundingWhitespace(caseData?.physical_exam || ''),
    paraclinical: {
      labs: paraclinical.labs || paraclinical.Labs || '',
      imaging: paraclinical.imaging || paraclinical.Imaging || '',
    },
    risk: stripSurroundingWhitespace(caseData?.risk || ''),
    stability: stripSurroundingWhitespace(caseData?.stability || ''),
  };
}

function mergeCaseContext(existingCase, updates, lockContext = false) {
  if (existingCase?.case_context_locked) {
    return null;
  }
  const base = existingCase?.case_context && typeof existingCase.case_context === 'object'
    ? existingCase.case_context
    : buildCaseContextFromCase(existingCase || {});

  const merged = {
    ...base,
    ...updates,
  };

  if (updates?.paraclinical && typeof updates.paraclinical === 'object') {
    merged.paraclinical = {
      labs: updates.paraclinical.labs || '',
      imaging: updates.paraclinical.imaging || '',
    };
  }

  return {
    case_context: merged,
    case_context_locked: lockContext || existingCase?.case_context_locked || false,
  };
}

function canonicalizeCaseContextValue(value) {
  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }
  if (value === null || value === undefined) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.map(canonicalizeCaseContextValue);
  }
  if (typeof value === 'object') {
    const normalized = {};
    Object.keys(value)
      .sort()
      .forEach((key) => {
        normalized[key] = canonicalizeCaseContextValue(value[key]);
      });
    return normalized;
  }
  return value;
}

function isSameCaseContext(a, b) {
  const normalizedA = canonicalizeCaseContextValue(a);
  const normalizedB = canonicalizeCaseContextValue(b);
  return JSON.stringify(normalizedA) === JSON.stringify(normalizedB);
}

function requireLockedCaseContext(existingCase, endpoint) {
  const storedContext = existingCase?.case_context;
  if (!storedContext || typeof storedContext !== 'object') {
    throw new Error(`Persistent case_context missing for ${endpoint}`);
  }
  if (!existingCase.case_context_locked) {
    throw new Error(`Case context not locked for ${endpoint}`);
  }
  if (!hasMeaningfulText(storedContext.final_diagnosis)) {
    throw new Error(`Case context missing final diagnosis for ${endpoint}`);
  }
  return storedContext;
}

function extractCaseId(req) {
  return req.body?.caseId || req.body?.case_id || '';
}

function getCaseContextForExpand(req, existingCase, endpoint) {
  const body = req.body || {};
  const payloadContext = body.full_case_context || body.fullCaseContext || body.case_context;
  if (!payloadContext || typeof payloadContext !== 'object') {
    throw new Error('Missing full_case_context payload');
  }

  const storedContext = requireLockedCaseContext(existingCase, endpoint);
  if (!isSameCaseContext(payloadContext, storedContext)) {
    console.warn(`[CASE_API] Case context mismatch for ${endpoint}`, {
      caseId: existingCase?.caseId || existingCase?.id || 'unknown',
    });
    throw new Error('Case context mismatch');
  }

  return storedContext;
}

function stripSurroundingWhitespace(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function containsJsonArtifacts(text) {
  if (!isNonEmptyString(text)) return false;
  if (text.includes('```')) return true;
  if (/{\s*\"/.test(text) || /\[\s*{/.test(text)) return true;
  return false;
}

function validateDeepEvidenceText(text) {
  const t = stripSurroundingWhitespace(text);
  if (!isNonEmptyString(t)) {
    throw new Error('Deep Evidence validation failed: empty');
  }
  if (containsJsonArtifacts(t)) {
    throw new Error('Deep Evidence validation failed: contains JSON/Markdown artifacts');
  }
  const wordCount = t.split(/\s+/).filter(Boolean).length;
  if (wordCount < 60) {
    throw new Error('Deep Evidence validation failed: too short');
  }
  const reasoningTokens = [
    'increases', 'decreases', 'raises', 'lowers', 'more likely', 'less likely',
    'argues for', 'argues against', 'supports', 'refutes', 'shifts', 'probability',
    'rules in', 'rules out', 'therefore', 'thus', 'because', 'changes management'
  ];
  const hitCount = reasoningTokens.reduce((acc, token) => acc + (t.toLowerCase().includes(token) ? 1 : 0), 0);
  if (hitCount < 2) {
    throw new Error('Deep Evidence validation failed: insufficient probability/decision reasoning');
  }
  return t;
}

function normalizeManagementObject(raw) {
  const m = raw && typeof raw === 'object' ? raw : {};
  return {
    initial: stripSurroundingWhitespace(m.initial || ''),
    definitive: stripSurroundingWhitespace(m.definitive || ''),
    escalation: stripSurroundingWhitespace(m.escalation || ''),
    disposition: stripSurroundingWhitespace(m.disposition || ''),
  };
}

function validateManagementObject(management) {
  if (!management || typeof management !== 'object') {
    throw new Error('Management validation failed: missing object');
  }
  if (!isNonEmptyString(management.initial) || !isNonEmptyString(management.definitive)) {
    throw new Error('Management validation failed: missing initial/definitive');
  }
  if (containsJsonArtifacts(management.initial) || containsJsonArtifacts(management.definitive)) {
    throw new Error('Management validation failed: contains JSON/Markdown artifacts');
  }
  return management;
}

function normalizeDifferentialDiagnoses(rawList) {
  const list = Array.isArray(rawList) ? rawList : [];
  return list
    .map((item) => {
      if (!item) return null;

      if (typeof item === 'string') {
        const s = item.trim();
        const match = s.match(/^(?<dx>.+?)(?:\s*[-–:]\s*)For:\s*(?<for>.+?)(?:\s*[-–|]\s*)Against:\s*(?<against>.+)$/i);
        if (!match?.groups) return null;
        return {
          diagnosis: stripSurroundingWhitespace(match.groups.dx),
          FOR: stripSurroundingWhitespace(match.groups.for),
          AGAINST: stripSurroundingWhitespace(match.groups.against),
        };
      }

      if (typeof item === 'object') {
        return {
          diagnosis: stripSurroundingWhitespace(item.diagnosis || item.name || item.label || ''),
          FOR: stripSurroundingWhitespace(item.FOR || item.for || ''),
          AGAINST: stripSurroundingWhitespace(item.AGAINST || item.against || ''),
        };
      }

      return null;
    })
    .filter(Boolean);
}

function validateDifferentialDiagnoses(list) {
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('Differential validation failed: missing list');
  }

  for (const item of list) {
    if (!item || typeof item !== 'object') {
      throw new Error('Differential validation failed: invalid item');
    }
    if (!isNonEmptyString(item.diagnosis) || !isNonEmptyString(item.FOR) || !isNonEmptyString(item.AGAINST)) {
      throw new Error('Differential validation failed: missing diagnosis/FOR/AGAINST');
    }
    const against = item.AGAINST;
    const hasNumbered = against.includes('1)') && against.includes('2)');
    const parts = against.split(';').map((p) => p.trim()).filter(Boolean);
    const hasSemicolonSplit = parts.length >= 2 && parts.every((p) => p.length >= 8);
    if (!hasNumbered && !hasSemicolonSplit) {
      throw new Error('Differential validation failed: AGAINST must contain 2 refuting points');
    }
  }

  return list;
}

/**
 * Stabilize init output - ensures all required fields exist for case initialization
 * Guarantees meta, chief_complaint, and initial_context are present
 */
function stabilizeInitOutput(initData) {
  if (!initData || typeof initData !== 'object') {
    return {
      meta: {
        topic: '',
        category: 'General Practice',
        age: '',
        sex: '',
        setting: '',
        region: 'global',
        lang: 'en',
      },
      chief_complaint: '',
      initial_context: '',
    };
  }

  const stabilized = { ...initData };

  // Ensure meta object exists with all required fields
  if (!stabilized.meta || typeof stabilized.meta !== 'object') {
    stabilized.meta = {};
  }
  stabilized.meta = {
    topic: stabilized.meta.topic || '',
    category: stabilized.meta.category || 'General Practice',
    age: stabilized.meta.age || '',
    sex: stabilized.meta.sex || '',
    setting: stabilized.meta.setting || '',
    region: stabilized.meta.region || 'global',
    lang: stabilized.meta.lang || 'en',
  };

  // Ensure chief_complaint is string
  if (typeof stabilized.chief_complaint !== 'string') {
    stabilized.chief_complaint = stabilized.chiefComplaint || stabilized.chief_complaint || '';
  }

  // Ensure initial_context is string
  if (typeof stabilized.initial_context !== 'string') {
    stabilized.initial_context = stabilized.initialContext || stabilized.initial_context || '';
  }

  return stabilized;
}

/**
 * Stabilize case fields - ensures consistent output shape and prevents errors
 * Lightweight stabilization without heavy processing
 */
function stabilizeCaseFields(caseData) {
  if (!caseData || typeof caseData !== 'object') {
    return {
      history: '',
      physical_exam: '',
      paraclinical: { labs: '', imaging: '' },
      differential_diagnoses: [],
      final_diagnosis: '',
    };
  }

  const stabilized = { ...caseData };

  // Ensure paraclinical structure
  if (!stabilized.paraclinical || typeof stabilized.paraclinical !== 'object') {
    stabilized.paraclinical = { labs: '', imaging: '' };
  } else {
    // Safely normalize labs - can be string, object, or array
    let normalizedLabs = stabilized.paraclinical.labs;
    if (normalizedLabs === null || normalizedLabs === undefined) {
      normalizedLabs = '';
    } else if (typeof normalizedLabs !== 'string' && !Array.isArray(normalizedLabs) && typeof normalizedLabs !== 'object') {
      normalizedLabs = String(normalizedLabs);
    }
    // Safely normalize imaging - can be string, object, or array
    let normalizedImaging = stabilized.paraclinical.imaging;
    if (normalizedImaging === null || normalizedImaging === undefined) {
      normalizedImaging = '';
    } else if (typeof normalizedImaging !== 'string' && !Array.isArray(normalizedImaging) && typeof normalizedImaging !== 'object') {
      normalizedImaging = String(normalizedImaging);
    }
    stabilized.paraclinical = {
      labs: normalizedLabs,
      imaging: normalizedImaging,
    };
  }

  // Ensure differential_diagnoses is array
  if (!Array.isArray(stabilized.differential_diagnoses)) {
    if (Array.isArray(stabilized.differentialDiagnosis)) {
      stabilized.differential_diagnoses = stabilized.differentialDiagnosis;
    } else if (Array.isArray(stabilized.differentialDiagnoses)) {
      stabilized.differential_diagnoses = stabilized.differentialDiagnoses;
    } else if (Array.isArray(stabilized.Differential_Diagnoses)) {
      stabilized.differential_diagnoses = stabilized.Differential_Diagnoses;
    } else {
      stabilized.differential_diagnoses = [];
    }
  }

  // Ensure final_diagnosis is string
  if (!stabilized.final_diagnosis) {
    if (stabilized.finalDiagnosis) {
      stabilized.final_diagnosis = stabilized.finalDiagnosis;
    } else if (stabilized.Final_Diagnosis) {
      stabilized.final_diagnosis = typeof stabilized.Final_Diagnosis === 'object' 
        ? (stabilized.Final_Diagnosis.Diagnosis || '') 
        : String(stabilized.Final_Diagnosis || '');
    } else {
      stabilized.final_diagnosis = '';
    }
  }

  // Ensure history is string
  if (!stabilized.history) {
    stabilized.history = stabilized.History || stabilized.history_full || stabilized.Patient_History || '';
  }

  // Ensure physical_exam is string
  if (!stabilized.physical_exam) {
    stabilized.physical_exam = stabilized.physicalExam || stabilized.Physical_Exam || 
                              stabilized.exam || stabilized.Exam_Full || stabilized.Objective_Findings || '';
  }

  return stabilized;
}

/**
 * Normalize case response to ensure all required fields are always present
 * Prevents 500 errors from undefined field access in frontend
 * @deprecated Use stabilizeCaseFields instead
 */
function normalizeCaseResponse(caseData) {
  return stabilizeCaseFields(caseData);
}

// Universal system message for all case generation endpoints
// EXPERT FREEDOM MODE: Allows deeper reasoning and professional abstraction
const UNIVERSAL_SYSTEM_MESSAGE = `You are MedPlat's clinical case generator. Generate exam-level, specialist-informed cases across all topics and specialties.

Target Audience: Medical doctors, medical students, clinical researchers, and USMLE Step 2 / clinical exam candidates. Output must be suitable for clinical teaching and exam preparation at a professional level. All clinical language must be exam-level for USMLE Step 2, doctors, medical students, and clinical researchers — concise, professional, and globally understandable.

Core principles:
- Platform is dynamic and topic-agnostic; never hardcode disease-specific or specialty-specific pathways.
- Expert Freedom Mode inside a safe medical frame: use consultant-level reasoning, but never invent missing facts.
- Stage A (base case) must follow the requested fixed JSON structure and provides the factual ground truth.
- Stage B (on-demand expansions) must treat Stage A as immutable context and must not modify any Stage A content.
- Output hygiene: return only valid JSON; no Markdown; never embed JSON objects/arrays inside text fields.

Expert Freedom & Depth:
- Use deeper clinical reasoning and higher-level professional abstraction when helpful
- Expand pathophysiology or management when complexity demands it
- Compress reasoning when brief, but allow natural expansion when clinically meaningful
- Use expert-level language naturally while maintaining exam-level density
- Connect mechanisms, findings, and implications with professional clarity
- Avoid over-restriction; let clinical expertise guide appropriate depth

Quality Standards:
- Professional, exam-ready, medically precise tone
- Micro-reasoning chains (3–5 sentences max) that demonstrate clinical thinking
- Anchor each section to concrete diagnostic or pathophysiologic principles
- Maximize density of clinically useful information; avoid filler
- Avoid repetition across sections
- Maintain tight logical links between symptoms, findings, labs, imaging, diagnosis, and management
- Differential diagnoses: 3–6 realistic, exam-relevant options
- Management: stepwise early → definitive → escalation logic
- Pathophysiology: mechanism → findings → clinical implications
- Teaching: high-yield pearls, common pitfalls, exam concepts
- Evidence: brief probability shifts and structured reasoning
- Expert Panel: realistic disagreement converging to safe consensus

Clinical Depth:
- Reasoning chains: definition → key features → clinical implications → diagnostic significance
- Exam-level logic: connect symptoms to pathophys mechanisms; link findings to diagnostic reasoning
- Evidence integration: explain test selection rationale and what they rule in/out
- Management clarity: structured escalation with initial stabilization → definitive therapy → escalation triggers → disposition logic

Content Rules:
- Units: Standard international units (Celsius for temperature, SI units for labs/vitals)
- Normal ranges: Include ONLY when clinically relevant, format as "N: X–Y" with interpretation (normal | high | low | borderline)
- Timing/dynamics: When relevant (troponin, CK-MB, D-dimer, cultures, LP, radiology timing), include ONE short sentence about when marker rises/peaks/declines or when test becomes meaningful
- Radiology logic: Brief decision reasoning (CT vs MRI vs US) when relevant: CT for emergencies/perforation/hemorrhage, US for gallbladder/DVT/pediatrics, MRI for neurology/soft tissue/spine
- Pathophysiology: Exam-level detail with micro-histopathology when meaningful. Include: cellular/molecular trigger, organ-level dysfunction, systemic consequence, compensatory mechanisms. Keep concise (3–4 sentences maximum)
- Output cleanliness: Never include raw JSON blocks, placeholders, guidelines, references, or mechanical markers
- Labs naming: Consistent names: lipase, amylase, WBC (not leukocytes), bicarbonate (not HCO3-), LFTs, triglycerides
- Imaging format: Structure as CT, MRI, Ultrasound blocks with clear modality-specific findings
- Cross-section consistency: No invented labs/facts not present in earlier sections

Style:
- Clarity over length: concise and professional
- High-yield microstructure: definition → key features → implications
- Dynamic intelligence: adapt depth to clinical complexity
- Professional abstraction: use expert-level language naturally when appropriate

Constraints:
- Do not increase total token size significantly
- Do not add extra model calls
- Keep architecture: init-stage + expansion-stage
- Do not introduce guideline citations or long references
- Prioritize exam-level density without over-explanation

Never:
- Output placeholder text, boilerplate like "No items available", or free-floating JSON artifacts
- Include raw JSON blocks inside text fields
- Reference guidelines, external sources, or mechanical markers
- Return Markdown, comments, or explanation outside the JSON
- Invent findings that contradict your own vitals, labs, or imaging

Return only valid JSON.`;

export default function caseApi() {
  const router = express.Router();

  // POST /api/case/init - Initialize case with meta, chief complaint, initial context
  router.post('/init', async (req, res) => {
    console.log('[INIT] handler entered');
    console.log('[INIT_PATH]', { originalUrl: req.originalUrl, baseUrl: req.baseUrl, path: req.path });
    console.log('[INIT_REQ]', {
      method: req.method,
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
      origin: req.headers.origin,
    });
    console.log('[INIT_BODY]', req.body);
    console.log(`[CASE_API] /api/init handler entered - timestamp: ${new Date().toISOString()}`);
    try {
      const { topic, category, lang = 'en', region = 'global', model } = req.body || {};
      
      if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
        console.log('[INIT_400]', 'missing_or_invalid_topic', {
          topic,
          topicType: typeof topic,
          bodyKeys: Object.keys(req.body || {}),
        });
        console.log(`[CASE_API] /api/init early return - missing/invalid topic`);
        return res.status(400).json({
          success: false,
          error: 'Missing or invalid topic',
        });
      }

      // Check OpenAI API key before proceeding
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error('[CASE_API] OPENAI_API_KEY not set - early return');
        return res.status(500).json({
          success: false,
          error: 'OpenAI API key not configured',
        });
      }
      
      // Verify API key format (should start with sk-)
      if (!apiKey.startsWith('sk-')) {
        console.error('[CASE_API] OPENAI_API_KEY format invalid (does not start with sk-) - early return');
        return res.status(500).json({
          success: false,
          error: 'OpenAI API key format invalid',
        });
      }

      console.log('[INIT_MODEL] before getModel');
      const modelStartMs = Date.now();
      let selectedModel = getModel(req, null);
      const modelElapsedMs = Date.now() - modelStartMs;
      console.log('[INIT_MODEL] after getModel', { selectedModel, ms: modelElapsedMs });
      if (!selectedModel || modelElapsedMs > 100) {
        console.warn('[INIT_MODEL] getModel slow/invalid, falling back to gpt-4o-mini', { selectedModel, ms: modelElapsedMs });
        selectedModel = 'gpt-4o-mini';
      }

      console.log(`[CASE_API] Init request - topic: ${topic}, model: ${selectedModel}`);
      console.log(`[CASE_API] Model resolved: ${selectedModel}, proceeding to case generation`);

      const caseId = generateCaseId();
      
      const prompt = `Generate initial case context for topic: "${topic}", category: "${category || 'General Practice'}".

Use professional clinical language appropriate for USMLE Step 2, medical students, doctors, and researchers. Write natural clinical text. Ensure strict cross-section consistency; no invented labs/facts not present in earlier sections.

Return ONLY valid JSON:
{
  "meta": {
    "topic": "${topic}",
    "category": "${category || 'General Practice'}",
    "age": "",
    "sex": "",
    "setting": "",
    "region": "${region}",
    "lang": "${lang}"
  },
  "chief_complaint": "",
  "initial_context": ""
}`;

      // /api/init only needs meta + chief_complaint + initial_context - optimize for speed
      // Use lower temperature, max_tokens limit, and 30s timeout for fast response
      console.log(`[CASE_API] About to call OpenAI - model: ${selectedModel}, topic: ${topic}`);
      let completion;
      const requestStartTime = Date.now();
      console.log(`[CASE_API] Sending OpenAI request - model: ${selectedModel}, timestamp: ${new Date().toISOString()}`);
      
      try {
        completion = await Promise.race([
          withTimeoutAndRetry(
            async () => {
              console.log(`[CASE_API] OpenAI API call starting - model: ${selectedModel}`);
              const result = await client.chat.completions.create({
                model: selectedModel,
                response_format: { type: 'json_object' },
                messages: [
                  { role: 'system', content: UNIVERSAL_SYSTEM_MESSAGE },
                  { role: 'user', content: prompt },
                ],
                temperature: 0.3, // Lower temperature for faster, more focused response
                max_tokens: 500, // Limit tokens for init (only needs meta + chief_complaint + initial_context)
              });
              console.log(`[CASE_API] OpenAI API call completed - model: ${selectedModel}, duration: ${Date.now() - requestStartTime}ms, choices: ${result.choices?.length || 0}`);
              return result;
            },
            30000, // 30 second timeout for init
            1
          ),
          new Promise((_, reject) => 
            setTimeout(() => {
              console.error(`[CASE_API] OpenAI request timeout after ${Date.now() - requestStartTime}ms`);
              reject(new Error('Init timeout'));
            }, 30000)
          )
        ]);
      } catch (error) {
        console.error(`[CASE_API] OpenAI request failed - model: ${selectedModel}, error: ${error.message}, status: ${error.status}, code: ${error.code}, duration: ${Date.now() - requestStartTime}ms`);
        
        // If model not available (e.g., gpt-5.1), fallback to gpt-4o
        const isModelError = selectedModel === 'gpt-5.1' && (
          error.message?.includes('model') || 
          error.message?.includes('not found') || 
          error.message?.includes('not available') ||
          error.status === 404 ||
          error.code === 'model_not_found'
        );
        
        if (isModelError) {
          console.warn(`[CASE_API] Model ${selectedModel} not available, falling back to gpt-4o`);
          const fallbackStartTime = Date.now();
          try {
            console.log(`[CASE_API] Fallback to gpt-4o starting`);
            completion = await Promise.race([
              withTimeoutAndRetry(
                async () => {
                  const result = await client.chat.completions.create({
                    model: 'gpt-4o',
                    response_format: { type: 'json_object' },
                    messages: [
                      { role: 'system', content: UNIVERSAL_SYSTEM_MESSAGE },
                      { role: 'user', content: prompt },
                    ],
                    temperature: 0.3,
                    max_tokens: 500,
                  });
                  console.log(`[CASE_API] Fallback gpt-4o completed - duration: ${Date.now() - fallbackStartTime}ms`);
                  return result;
                },
                30000,
                1
              ),
              new Promise((_, reject) => 
                setTimeout(() => {
                  console.error(`[CASE_API] Fallback gpt-4o timeout after ${Date.now() - fallbackStartTime}ms`);
                  reject(new Error('Init timeout'));
                }, 30000)
              )
            ]);
          } catch (fallbackError) {
            // If gpt-4o also fails, try gpt-4o-mini as last resort
            console.warn(`[CASE_API] gpt-4o also failed: ${fallbackError.message}, falling back to gpt-4o-mini`);
            const miniStartTime = Date.now();
            completion = await Promise.race([
              withTimeoutAndRetry(
                async () => {
                  const result = await client.chat.completions.create({
                    model: 'gpt-4o-mini',
                    response_format: { type: 'json_object' },
                    messages: [
                      { role: 'system', content: UNIVERSAL_SYSTEM_MESSAGE },
                      { role: 'user', content: prompt },
                    ],
                    temperature: 0.3,
                    max_tokens: 500,
                  });
                  console.log(`[CASE_API] Fallback gpt-4o-mini completed - duration: ${Date.now() - miniStartTime}ms`);
                  return result;
                },
                30000,
                1
              ),
              new Promise((_, reject) => 
                setTimeout(() => {
                  console.error(`[CASE_API] Fallback gpt-4o-mini timeout after ${Date.now() - miniStartTime}ms`);
                  reject(new Error('Init timeout'));
                }, 30000)
              )
            ]);
          }
        } else {
          // Non-model errors (API key, network, etc.) - fail fast with clear error
          console.error(`[CASE_API] OpenAI error (non-model): ${error.message}, status: ${error.status}, code: ${error.code}`);
          return res.status(500).json({
            success: false,
            error: `OpenAI API error: ${error.message || 'Request failed'}`,
            details: error.status ? `HTTP ${error.status}` : undefined
          });
        }
      }
      
      console.log(`[CASE_API] OpenAI response received - total duration: ${Date.now() - requestStartTime}ms`);

      const text = completion.choices?.[0]?.message?.content || '{}';
      const parsed = safeParseJSON(text);

      const stabilized = stabilizeInitOutput(parsed);

      const baseCaseContext = buildCaseContextFromCase({
        meta: stabilized.meta,
      });

      const caseData = {
        caseId,
        ...stabilized,
        case_context: baseCaseContext,
        case_context_locked: false,
        model: selectedModel, // Store model for subsequent steps
        createdAt: new Date().toISOString(),
      };

      await saveCase(caseId, caseData);

      const processedCase = postProcessCase(stabilizeCaseFields(caseData));

      res.json({
        success: true,
        data: processedCase,
        caseId,
      });
    } catch (error) {
      console.error('[CASE_API] Init error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to initialize case',
        data: null,
      });
    }
  });

  // POST /api/case/history - Generate history based on context
  router.post('/history', async (req, res) => {
    try {
      const caseId = extractCaseId(req);
      
      if (!caseId) {
        return res.status(400).json({ ok: false, error: 'Missing caseId' });
      }

      const existingCase = await getCase(caseId);
      if (!existingCase) {
        return res.status(404).json({ ok: false, error: 'Case not found' });
      }

      const selectedModel = getModel(req, existingCase);

      const prompt = `Generate patient history (6-10 sentences) for:
Topic: ${existingCase.meta?.topic || 'Clinical case'}
Chief Complaint: ${existingCase.chief_complaint || 'Not specified'}
Context: ${existingCase.initial_context || ''}

Structure: Present illness timeline → associated symptoms → relevant past medical/surgical history → medications/allergies → social/family context
Reasoning: Connect symptoms to possible pathophys mechanisms; highlight red flags or diagnostic clues
Detail: Include symptom quality, timing, exacerbating/alleviating factors, and functional impact
Tone: Concise, objective, clinically relevant, professional

Ensure strict cross-section consistency; no invented labs/facts not present in earlier sections.
No placeholders: All required fields must be populated with real case content. Do not use "Not provided" for finalDiagnosis.

Return ONLY valid JSON:
{
  "history": ""
}`;

      const completion = await generateCaseContent(selectedModel, prompt, 0.4, 30000);

      const text = completion.choices?.[0]?.message?.content || '{}';
      const parsed = safeParseJSON(text);

      const historyText = parsed.history || '';
      const updatePayload = { history: historyText };
      const contextUpdate = mergeCaseContext(existingCase, { history: historyText });
      if (contextUpdate) {
        Object.assign(updatePayload, contextUpdate);
      }

      const updated = await updateCaseFields(caseId, updatePayload);
      const fullCase = await getCase(caseId);
      const processedCase = postProcessCase(stabilizeCaseFields(fullCase));

      res.json({
        success: true,
        data: processedCase,
        caseId,
      });
    } catch (error) {
      console.error('[CASE_API] History error:', error);
      res.status(500).json({
        ok: false,
        error: error.message || 'Failed to generate history',
      });
    }
  });

  // POST /api/case/exam - Generate physical exam
  router.post('/exam', async (req, res) => {
    try {
      const caseId = extractCaseId(req);
      
      if (!caseId) {
        return res.status(400).json({ ok: false, error: 'Missing caseId' });
      }

      const existingCase = await getCase(caseId);
      if (!existingCase) {
        return res.status(404).json({ ok: false, error: 'Case not found' });
      }

      const selectedModel = getModel(req, existingCase);

      const prompt = `Generate physical examination (5-8 sentences, MUST include BP, HR, RR, Temp, SpO2) for:
Topic: ${existingCase.meta?.topic || 'Clinical case'}
History: ${existingCase.history || 'Not available'}

Structure: Vital signs → general appearance → system-specific findings → pertinent negatives
Reasoning: Connect physical findings to diagnostic hypotheses; note findings that support or refute differential diagnoses
Detail: Include location, quality, severity, and clinical significance of abnormal findings
Logic: Highlight pathognomonic signs or key exam maneuvers relevant to the case

MUST include BP, HR, RR, Temp, SpO2, and be consistent with the vitals. Use standard international units. Temperature in Celsius (°C). Use exam-level, professional language. Ensure strict cross-section consistency; no invented labs/facts not present in earlier sections.

Return ONLY valid JSON:
{
  "physical_exam": ""
}`;

      const completion = await generateCaseContent(selectedModel, prompt, 0.4, 30000);

      const text = completion.choices?.[0]?.message?.content || '{}';
      const parsed = safeParseJSON(text);

      const examText = parsed.physical_exam || '';
      const updatePayload = { physical_exam: examText };
      const contextUpdate = mergeCaseContext(existingCase, { exam: examText });
      if (contextUpdate) {
        Object.assign(updatePayload, contextUpdate);
      }

      const updated = await updateCaseFields(caseId, updatePayload);
      const fullCase = await getCase(caseId);
      const processedCase = postProcessCase(stabilizeCaseFields(fullCase));

      res.json({
        success: true,
        data: processedCase,
        caseId,
      });
    } catch (error) {
      console.error('[CASE_API] Exam error:', error);
      res.status(500).json({
        ok: false,
        error: error.message || 'Failed to generate exam',
      });
    }
  });

  // POST /api/case/paraclinical - Generate labs + imaging
  router.post('/paraclinical', async (req, res) => {
    try {
      const caseId = extractCaseId(req);
      
      if (!caseId) {
        return res.status(400).json({ ok: false, error: 'Missing caseId' });
      }

      const existingCase = await getCase(caseId);
      if (!existingCase) {
        return res.status(404).json({ ok: false, error: 'Case not found' });
      }

      const selectedModel = getModel(req, existingCase);

      const prompt = `Generate paraclinical investigations (labs + imaging with interpretations) for:
Topic: ${existingCase.meta?.topic || 'Clinical case'}
History: ${existingCase.history || 'Not available'}
Physical Exam: ${existingCase.physical_exam || 'Not available'}

Diagnostic logic: Explain test selection rationale (why specific tests rule in/out diagnoses)
Evidence integration: Link abnormal results to pathophys mechanisms and diagnostic significance
Reasoning chains: Structure as test → result → interpretation → clinical implication
Focus: Highlight pathognomonic findings or key diagnostic markers

Labs: Use SI units. Consistent naming: lipase, amylase, WBC (not leukocytes), bicarbonate (not HCO3-), LFTs, triglycerides. Include normal ranges ONLY when clinically relevant, format as "N: X–Y" with interpretation (normal | high | low | borderline).
CRITICAL: Do not leave partial lab entries. If a lab value is missing or placeholder (e.g., ".", empty field), omit it entirely. Do not include incomplete lab panels (e.g., "CBC: not provided"). Only include labs with actual values.

Imaging: Structure as clear CT, MRI, Ultrasound blocks. Include brief decision reasoning (CT vs MRI vs US) when relevant: CT for emergencies/perforation/hemorrhage, US for gallbladder/DVT/pediatrics, MRI for neurology/soft tissue/spine.
CRITICAL: If imaging contradicts the diagnosis (e.g., normal CT angiography with NSTEMI), the finalDiagnosis must reconcile this using ONLY existing Stage A data:
- If troponin is elevated, diagnosis can be NSTEMI (troponin-driven, non-occlusive plaque, microvascular ischemia)
- If reconciliation cannot be justified from Stage A data, set finalDiagnosis to reflect the imaging findings or state uncertainty

Timing/dynamics: When relevant (troponin, CK-MB, D-dimer, cultures, LP, radiology timing), include ONE short sentence about when marker rises/peaks/declines or when test becomes meaningful.
ALWAYS include finalDiagnosis, differentialDiagnosis, and management fields, even if empty strings/arrays.
DifferentialDiagnosis: Return 3-6 options. Each item MUST be an object:
- diagnosis: short name
- FOR: 1 supporting argument grounded in provided history/exam/labs/imaging OR explicitly "Not provided" if no supporting evidence exists
- AGAINST: 2 refuting arguments in ONE line, formatted exactly as "1) ...; 2) ...", grounded in provided data

CRITICAL RULES:
- Do NOT use "Insufficient data provided" when AGAINST evidence already exists (e.g., normal CXR excludes PE, CTA excludes dissection)
- Populate FOR and AGAINST using available Stage A data only
- If AGAINST evidence exists (normal imaging, negative labs, etc.), use it explicitly
- Only use "Not provided" or "Absent/unspecified" when data is truly missing, not when it exists and argues against the diagnosis
- Use probability-shift language (e.g., "raises probability", "lowers probability", "argues against") rather than generic exclusions
Management: must match the finalDiagnosis and the case physiology. Include contraindications/nuances if relevant. Escalation/disposition thresholds must be case-specific (avoid generic triggers).
Ensure strict cross-section consistency; no invented labs/facts not present in earlier sections.

Return ONLY valid JSON:
{
  "paraclinical": {
    "labs": "",
    "imaging": ""
  },
  "finalDiagnosis": "",
  "differentialDiagnosis": [],
  "management": {
    "initial": "",
    "definitive": "",
    "escalation": "",
    "disposition": ""
  }
}`;

      const buildUpdateFields = (parsed) => {
        // Ensure complete JSON structure even if fields missing
        const updateFields = {
          paraclinical: {
            labs: parsed.paraclinical?.labs || parsed.paraclinical?.Labs || '',
            imaging: parsed.paraclinical?.imaging || parsed.paraclinical?.Imaging || ''
          }
        };

        // Lock diagnosis after ECG/lab interpretation step
        // Always set final_diagnosis (default to empty string if missing)
        const lockedDiagnosis = parsed.finalDiagnosis || parsed.final_diagnosis || parsed.Final_Diagnosis || '';
        if (!hasMeaningfulText(lockedDiagnosis)) {
          throw new Error('Final diagnosis validation failed: missing or placeholder');
        }
        if (containsJsonArtifacts(lockedDiagnosis)) {
          throw new Error('Final diagnosis validation failed: contains JSON/Markdown artifacts');
        }
        updateFields.final_diagnosis = lockedDiagnosis;

        // Stage A: Always set differential_diagnoses with required For/Against structure
        const rawDifferentials =
          parsed.differentialDiagnosis ||
          parsed.differential_diagnoses ||
          parsed.Differential_Diagnoses ||
          [];
        const normalizedDifferentials = normalizeDifferentialDiagnoses(rawDifferentials);
        updateFields.differential_diagnoses = validateDifferentialDiagnoses(normalizedDifferentials);

        // Stage A: management is part of the base case (ground truth)
        const management = normalizeManagementObject(parsed.management || parsed.Management || {});
        updateFields.management = validateManagementObject(management);

        // Store locked diagnosis in meta for reuse across sections
        if (hasMeaningfulText(lockedDiagnosis)) {
          updateFields.meta = existingCase.meta || {};
          updateFields.meta.locked_diagnosis = lockedDiagnosis;
          updateFields.meta.diagnosis_locked_at = new Date().toISOString();
        }

        const contextUpdate = mergeCaseContext(existingCase, {
          final_diagnosis: lockedDiagnosis,
          history: existingCase.history || '',
          exam: existingCase.physical_exam || '',
          paraclinical: updateFields.paraclinical,
          risk: existingCase.risk || '',
          stability: existingCase.stability || '',
        }, true);
        if (contextUpdate) {
          Object.assign(updateFields, contextUpdate);
        }

        return updateFields;
      };

      const attemptParaclinical = async (userPrompt, attemptLabel) => {
        const attemptStart = Date.now();
        const completion = await generateCaseContent(selectedModel, userPrompt, 0.4, 30000);
        const text = completion.choices?.[0]?.message?.content || '{}';
        const parsed = safeParseJSON(text);
        const updateFields = buildUpdateFields(parsed);
        const elapsedMs = Date.now() - attemptStart;
        console.log(`[PARACLINICAL_RETRY] ${attemptLabel} success`, { caseId, ms: elapsedMs });
        return updateFields;
      };

      let updateFields;
      const firstAttemptStart = Date.now();
      try {
        updateFields = await attemptParaclinical(prompt, 'attempt_1');
      } catch (err) {
        const firstElapsedMs = Date.now() - firstAttemptStart;
        console.warn('[PARACLINICAL_RETRY] attempt_1 failed, retrying once', {
          caseId,
          ms: firstElapsedMs,
          error: err?.message || String(err),
        });

        const retryPrompt = `${prompt}\n\nReturn valid JSON strictly matching the required structure. No prose, no markdown.`;
        const retryStart = Date.now();
        try {
          updateFields = await attemptParaclinical(retryPrompt, 'attempt_2');
        } catch (retryErr) {
          const retryElapsedMs = Date.now() - retryStart;
          console.warn('[PARACLINICAL_RETRY] attempt_2 failed', {
            caseId,
            ms: retryElapsedMs,
            error: retryErr?.message || String(retryErr),
          });
          throw retryErr;
        }
      }

      const updated = await updateCaseFields(caseId, updateFields);
      const fullCase = await getCase(caseId);
      const processedCase = postProcessCase(stabilizeCaseFields(fullCase));

      res.json({
        success: true,
        data: processedCase,
        caseId,
      });
    } catch (error) {
      console.error('[CASE_API] Paraclinical error:', error);
      res.status(500).json({
        ok: false,
        error: error.message || 'Failed to generate paraclinical',
      });
    }
  });

  // POST /api/case/expand/pathophysiology - Generate pathophysiology on demand
  router.post('/expand/pathophysiology', async (req, res) => {
    try {
      const caseId = extractCaseId(req);
      
      if (!caseId) {
        return res.status(400).json({ ok: false, error: 'Missing caseId' });
      }

      const existingCase = await getCase(caseId);
      if (!existingCase) {
        return res.status(404).json({ ok: false, error: 'Case not found' });
      }

      let caseContext;
      try {
        caseContext = getCaseContextForExpand(req, existingCase, 'pathophysiology');
      } catch (error) {
        return res.status(400).json({ ok: false, error: error.message || 'Case context not available' });
      }

      const selectedModel = getModel(req, existingCase);

      const prompt = `Generate pathophysiology for the locked case context below.

CRITICAL: Use the provided case_context as immutable ground truth. Do NOT change diagnosis or introduce new diseases.
DO NOT CHANGE CASE CONTENT.
Expand only. If data is missing, say "Not provided".

FULL CASE CONTEXT JSON:
${JSON.stringify(caseContext)}

Reasoning chain: Trigger (cellular/molecular) → organ dysfunction → systemic effects → compensatory responses
Depth: Connect pathophys mechanisms to clinical presentation and diagnostic findings
Structure: Definition → key pathophys steps → clinical implications
Precision: 3–4 sentences covering essential mechanisms and their clinical relevance

Require micro-histopathology, systemic cascade, compensatory mechanisms in 3–4 sentences. Include: cellular/molecular trigger, organ-level dysfunction, systemic consequence, compensatory mechanisms. Use professional, globally understandable language. Ensure strict cross-section consistency; no invented labs/facts not present in earlier sections.

Return ONLY valid JSON:
{
  "pathophysiology": ""
}`;

      const completion = await generateCaseContent(selectedModel, prompt, 0.4, 30000);

      const text = completion.choices?.[0]?.message?.content || '{}';
      const parsed = safeParseJSON(text);

      const pathophysiologyText = stripSurroundingWhitespace(parsed.pathophysiology || '');
      if (!isNonEmptyString(pathophysiologyText)) {
        throw new Error('Pathophysiology validation failed: empty');
      }
      if (containsJsonArtifacts(pathophysiologyText)) {
        throw new Error('Pathophysiology validation failed: contains JSON/Markdown artifacts');
      }

      const updated = await updateCaseFields(caseId, { 
        pathophysiology: pathophysiologyText
      });
      const fullCase = await getCase(caseId);
      const processedCase = postProcessCase(stabilizeCaseFields(fullCase));

      res.json({
        success: true,
        data: processedCase,
        caseId,
      });
    } catch (error) {
      console.error('[CASE_API] Pathophysiology error:', error);
      res.status(500).json({
        ok: false,
        error: error.message || 'Failed to generate pathophysiology',
      });
    }
  });

  // POST /api/case/expand/management - Generate management on demand
  router.post('/expand/management', async (req, res) => {
    try {
      const caseId = extractCaseId(req);
      
      if (!caseId) {
        return res.status(400).json({ ok: false, error: 'Missing caseId' });
      }

      const existingCase = await getCase(caseId);
      if (!existingCase) {
        return res.status(404).json({ ok: false, error: 'Case not found' });
      }

      let caseContext;
      try {
        caseContext = getCaseContextForExpand(req, existingCase, 'management');
      } catch (error) {
        return res.status(400).json({ ok: false, error: error.message || 'Case context not available' });
      }

      const selectedModel = getModel(req, existingCase);

      // Cache: if management already exists (Stage A ground truth), do not regenerate
      if (existingCase.management && typeof existingCase.management === 'object') {
        const processedCase = postProcessCase(stabilizeCaseFields(existingCase));
        return res.json({
          success: true,
          data: processedCase,
          caseId,
          cached: true,
        });
      }

const prompt = `Generate management for the locked case context below. Include:
- Do NOT change diagnosis or introduce new diseases. Expand only.
- If data is missing, say "Not provided" rather than inventing facts.
DO NOT CHANGE CASE CONTENT.

FULL CASE CONTEXT JSON:
${JSON.stringify(caseContext)}

Include:
- Initial treatment (first-line interventions)
- Definitive treatment (targeted therapy)
- Contraindications/nuances: if any intervention depends on pregnancy, renal/hepatic function, bleeding risk, drug interactions, comorbidities, or instability, state the constraint briefly (do not invent missing facts)
- Escalation triggers: diagnosis-specific objective thresholds (vitals/labs/symptoms) that change immediate actions; avoid generic triggers unrelated to this case
- Disposition thresholds: ward vs ICU criteria tied to the primary diagnosis; avoid generic sepsis/ICU logic unless supported by this case

Structure: Stabilization → Diagnostic Workup → Definitive Therapy → Escalation → Disposition. Keep wording compact.
Approach: Anchor decisions to the primary diagnosis (use provided final diagnosis if present) and standard-of-care practice (no citations)
Escalation: Specify objective thresholds (vitals, labs, symptoms) that trigger next steps
Clarity: Concise, action-oriented, exam-ready format

Keep wording short, high-level, clear. Use standard international units for vitals. Ensure strict cross-section consistency; no invented labs/facts not present in earlier sections.

Return ONLY valid JSON:
{
  "management": {
    "initial": "",
    "definitive": "",
    "escalation": "",
    "disposition": ""
  }
}`;

      const completion = await generateCaseContent(selectedModel, prompt, 0.4, 30000);

      const text = completion.choices?.[0]?.message?.content || '{}';
      const parsed = safeParseJSON(text);

      const management = validateManagementObject(normalizeManagementObject(parsed.management || parsed.Management || {}));

      const updated = await updateCaseFields(caseId, { 
        management
      });
      const fullCase = await getCase(caseId);
      const processedCase = postProcessCase(stabilizeCaseFields(fullCase));

      res.json({
        success: true,
        data: processedCase,
        caseId,
      });
    } catch (error) {
      console.error('[CASE_API] Management error:', error);
      res.status(500).json({
        ok: false,
        error: error.message || 'Failed to generate management',
      });
    }
  });

  // POST /api/case/expand/expert_panel - Generate expert conference discussion
  router.post('/expand/expert_panel', async (req, res) => {
    let caseId = null;
    let existingCase = null;
    const respondWithFallback = (warning) => {
      console.warn('[CASE_API] Expert panel fallback:', warning);
      return res.status(200).json({
        success: false,
        ok: false,
        caseId,
        warning,
      });
    };

    try {
      caseId = extractCaseId(req);
      if (!caseId) {
        return respondWithFallback('Missing caseId for expert panel');
      }

      existingCase = await getCase(caseId);
      if (!existingCase) {
        return respondWithFallback('Case context unavailable for expert panel');
      }

      let caseContext;
      try {
        caseContext = getCaseContextForExpand(req, existingCase, 'expert_panel');
      } catch (error) {
        return res.status(400).json({
          success: false,
          ok: false,
          caseId,
          error: error.message || 'Case context not available',
        });
      }

      const selectedModel = getModel(req, existingCase);

      // Early return if expertConference already present
      const existingExpertConf = existingCase.expertConference || existingCase.expert_conference;
      if (existingExpertConf && typeof existingExpertConf === 'string' && existingExpertConf.trim().length > 0) {
        console.log('[CASE_API] Expert Conference cache hit for caseId:', caseId);
        const processedCase = postProcessCase(stabilizeCaseFields(existingCase));
        return res.json({
          success: true,
          data: processedCase,
          caseId,
          cached: true,
        });
      }

      const caseContextJson = JSON.stringify(caseContext);

      const prompt = `Generate an expert conference with 3 consultants with different perspectives. Choose roles dynamically from the case topic/context (do not hardcode a fixed specialty set):
- Dr A: most relevant domain consultant for the case topic
- Dr B: acute care/triage perspective (focus on immediate risk and disposition)
- Dr C: diagnostic/referral perspective (focus on discriminating tests and alternatives)

CRITICAL: Use the locked case_context provided below. Do NOT change, regenerate, or question the diagnosis. The diagnosis is already determined from Stage A data.
DO NOT CHANGE CASE CONTENT.
DO NOT CHANGE CASE CONTENT.
DO NOT CHANGE CASE CONTENT.
DO NOT CHANGE CASE CONTENT.

Include:
1. Diagnostic approach and findings grounded in provided data
2. Treatment decisions and alternatives with explicit trade-offs/contraindications when relevant
3. Real disagreement: each consultant must disagree at least once with a specific, case-grounded trade-off (not just tone)
4. Short final consensus (1-2 sentences) that stays within a safe medical frame

Keep concise (10-14 sentences), professional, globally understandable. Return as plain text string, not object. Use natural language: "Dr A: [comment]. Dr B: [comment]." Ensure strict cross-section consistency; no invented labs/facts not present in earlier sections.

FULL CASE CONTEXT JSON:
${caseContextJson}

Return ONLY valid JSON:
{
  "expertConference": "Dr A (Role): [comment]. Dr B (Role): [comment]. Dr C (Role): [comment]. Dr B vs Dr C disagreement: [specific point]. Consensus: [short agreement]."
}`;

      const completion = await generateCaseContent(selectedModel, prompt, 0.5, 30000);

      const text = completion.choices?.[0]?.message?.content || '{}';
      const parsed = safeParseJSON(text);

      let expertConferenceText = '';
      if (typeof parsed.expertConference === 'string') {
        expertConferenceText = parsed.expertConference;
      } else if (typeof parsed.expertConference === 'object' && parsed.expertConference !== null) {
        const conf = parsed.expertConference;
        const parts = [];
        if (conf.discussion && Array.isArray(conf.discussion)) {
          conf.discussion.forEach((item) => {
            const specialist = item.specialist || item.role || 'Specialist';
            const specialty = item.specialty || '';
            const comment = item.comments || item.position || '';
            parts.push(`${specialist}${specialty ? ` (${specialty})` : ''}: ${comment}`);
          });
        }
        if (conf.consensus) {
          parts.push(`Consensus: ${conf.consensus}`);
        }
        expertConferenceText = parts.join('\n\n');
      } else {
        expertConferenceText = '';
      }

      if (!isNonEmptyString(expertConferenceText)) {
        throw new Error('Expert Conference validation failed: empty');
      }
      if (containsJsonArtifacts(expertConferenceText)) {
        throw new Error('Expert Conference validation failed: contains JSON/Markdown artifacts');
      }
      const lower = expertConferenceText.toLowerCase();
      if (!(lower.includes('dr a:') && lower.includes('dr b:') && lower.includes('dr c:'))) {
        throw new Error('Expert Conference validation failed: missing Dr A/B/C speaker labels');
      }

      await updateCaseFields(caseId, { 
        expertConference: expertConferenceText
      });
      const fullCase = await getCase(caseId);
      const processedCase = postProcessCase(stabilizeCaseFields(fullCase));

      res.json({
        success: true,
        data: processedCase,
        caseId,
      });
    } catch (error) {
      console.error('[CASE_API] Expert panel error:', error);
      return respondWithFallback('Expert Conference temporarily unavailable');
    }
  });

  // POST /api/case/expand/question - Answer focused user question
  router.post('/expand/question', async (req, res) => {
    try {
      const caseId = extractCaseId(req);
      const { userQuestion } = req.body || {};
      
      if (!caseId || !userQuestion) {
        return res.status(400).json({ ok: false, error: 'Missing caseId or userQuestion' });
      }

      const existingCase = await getCase(caseId);
      if (!existingCase) {
        return res.status(404).json({ ok: false, error: 'Case not found' });
      }

      let caseContext;
      try {
        caseContext = getCaseContextForExpand(req, existingCase, 'question');
      } catch (error) {
        return res.status(400).json({ ok: false, error: error.message || 'Case context not available' });
      }

      const selectedModel = getModel(req, existingCase);

      const prompt = `Answer this focused clinical question based on the case:
Question: ${userQuestion}

CRITICAL: Use the locked case_context below as immutable ground truth. Do NOT change diagnosis or introduce new diseases.
DO NOT CHANGE CASE CONTENT.
Expand only. If data is missing, say "Not provided".

FULL CASE CONTEXT JSON:
${JSON.stringify(caseContext)}

Use professional clinical reasoning. Ensure strict cross-section consistency; no invented labs/facts not present in earlier sections.

Return ONLY valid JSON with a focused answer:
{
  "answer": ""
}`;

      const completion = await generateCaseContent(selectedModel, prompt, 0.4, 30000);

      const text = completion.choices?.[0]?.message?.content || '{}';
      const parsed = safeParseJSON(text);

      const caseData = await getCase(caseId);
      const processedCase = postProcessCase(stabilizeCaseFields(caseData));

      res.json({
        success: true,
        data: {
          answer: parsed.answer || '',
          case: processedCase,
        },
        caseId,
      });
    } catch (error) {
      console.error('[CASE_API] Question error:', error);
      res.status(500).json({
        ok: false,
        error: error.message || 'Failed to answer question',
      });
    }
  });

  // POST /api/case/expand/teaching - Generate teaching block (key concepts, pitfalls, pearls)
  router.post('/expand/teaching', async (req, res) => {
    let caseId;
    const respondWithFallback = (warning) => {
      console.warn('[CASE_API] Teaching fallback:', warning);
      return res.status(200).json({
        success: false,
        ok: false,
        caseId,
        warning,
      });
    };

    try {
      caseId = extractCaseId(req);
      if (!caseId) {
        return respondWithFallback('Missing caseId for teaching');
      }

      const existingCase = await getCase(caseId);
      if (!existingCase) {
        return respondWithFallback('Case context unavailable for teaching');
      }

      let caseContext;
      try {
        caseContext = getCaseContextForExpand(req, existingCase, 'teaching');
      } catch (error) {
        return res.status(400).json({
          success: false,
          ok: false,
          caseId,
          error: error.message || 'Case context not available',
        });
      }

      const selectedModel = getModel(req, existingCase);

      // Check cache - if teaching already exists, return cached value
      if (existingCase.teaching && typeof existingCase.teaching === 'string' && existingCase.teaching.trim().length > 0) {
        console.log('[CASE_API] Teaching cache hit for caseId:', caseId);
        const processedCase = postProcessCase(stabilizeCaseFields(existingCase));
        return res.json({
          success: true,
          data: processedCase,
          caseId,
          cached: true,
        });
      }

      const caseContextJson = JSON.stringify(caseContext);

      const prompt = `Generate a concise teaching block for this clinical case. Include:
1. Key concepts (2-3 most important learning points)
2. Common pitfalls (what students/learners often miss)
3. Clinical pearls (practical takeaways)

CRITICAL: Use the locked case_context provided below. Do NOT change, regenerate, or question the diagnosis. The diagnosis is already determined from Stage A data.

Keep brief (6-10 sentences total), clinically useful, educational. Use professional, exam-level language suitable for USMLE Step 2, medical students, doctors, researchers. Each pearl/pitfall should map to a specific part of the case (history, exam, labs, or management). Ensure strict cross-section consistency; no invented labs/facts not present in earlier sections.

FULL CASE CONTEXT JSON:
${caseContextJson}

Return ONLY valid JSON:
{
  "teaching": ""
}`; 

      const completion = await generateCaseContent(selectedModel, prompt, 0.5, 30000);

      const text = completion.choices?.[0]?.message?.content || '{}';
      const parsed = safeParseJSON(text);

      const teachingText = stripSurroundingWhitespace(parsed.teaching || '');
      if (!isNonEmptyString(teachingText)) {
        throw new Error('Teaching validation failed: empty');
      }
      if (containsJsonArtifacts(teachingText)) {
        throw new Error('Teaching validation failed: contains JSON/Markdown artifacts');
      }

      await updateCaseFields(caseId, { 
        teaching: teachingText
      });
      const fullCase = await getCase(caseId);
      const processedCase = postProcessCase(stabilizeCaseFields(fullCase));

      res.json({
        success: true,
        data: processedCase,
        caseId,
        cached: false,
      });
    } catch (error) {
      console.error('[CASE_API] Teaching error:', error);
      return respondWithFallback('Teaching block temporarily unavailable');
    }
  });

  // POST /api/case/expand/evidence - Generate deep evidence reasoning (NO guidelines)
  router.post('/expand/evidence', async (req, res) => {
    let caseId = null;
    const respondWithFallback = (warning) => {
      console.warn('[CASE_API] Deep Evidence fallback:', warning);
      return res.status(200).json({
        success: false,
        ok: false,
        caseId,
        warning,
      });
    };

    try {
      caseId = extractCaseId(req);
      if (!caseId) {
        return respondWithFallback('Missing caseId for deep evidence');
      }

      const existingCase = await getCase(caseId);
      if (!existingCase) {
        return respondWithFallback('Case context unavailable for deep evidence');
      }

      let caseContext;
      try {
        caseContext = getCaseContextForExpand(req, existingCase, 'evidence');
      } catch (error) {
        return res.status(400).json({
          success: false,
          ok: false,
          caseId,
          error: error.message || 'Case context not available',
        });
      }

      const selectedModel = getModel(req, existingCase);

      // Check cache - if deepEvidence already exists, return cached value
      if (existingCase.deepEvidence && typeof existingCase.deepEvidence === 'string' && existingCase.deepEvidence.trim().length > 0) {
        console.log('[CASE_API] Deep Evidence cache hit for caseId:', caseId);
        const processedCase = postProcessCase(stabilizeCaseFields(existingCase));
        return res.json({
          success: true,
          data: processedCase,
          caseId,
          cached: true,
        });
      }

      const paraclinical = caseContext.paraclinical || {};
      const labs = paraclinical.labs || paraclinical.Labs || '';
      const imaging = paraclinical.imaging || paraclinical.Imaging || '';
      const hasLabs = hasMeaningfulText(labs);
      const hasImaging = hasMeaningfulText(imaging);
      if (!hasLabs && !hasImaging) {
        return respondWithFallback('Data not available in current case');
      }
      const paraclinicalDetails = [];
      if (hasLabs) paraclinicalDetails.push(`Labs: ${labs}`);
      if (hasImaging) paraclinicalDetails.push(`Imaging: ${imaging}`);
      const paraclinicalContext = paraclinicalDetails.join('\n');

      const caseContextJson = JSON.stringify(caseContext);

      const prompt = `Generate Deep Evidence (specialist-level) as plain text only.

CRITICAL: Use the locked case_context provided below. Do NOT change, regenerate, or question the diagnosis. The diagnosis is already determined from Stage A data.

Rules (universal):
- Strictly use ONLY the provided Stage A case facts (history/exam/paraclinical/diagnosis/management). Reference Stage A data explicitly by name (e.g., "The troponin of X", "CT angiography showing Y").
- If a value is missing, explicitly state "Not provided" rather than assuming it.
- State uncertainty where data is incomplete (e.g., "Limited by missing X", "Cannot assess Y without Z").
- Do not overstate conclusions beyond what Stage A data supports.
- Do not restate the case; every sentence must add reasoning (probability shift, mechanism, decision impact, or test interpretation).
- Explain why a finding changes diagnostic probability OR changes a management decision (probability-shift language, not checklist exclusions).
- Include thresholds, kinetics, mechanisms, or decision-impact when applicable to the findings present (do not invent missing numbers).
- No citations, no guideline names, no Markdown, and no JSON fragments inside the text.

Output:
- 8-12 sentences, dense and clinically useful.

FULL CASE CONTEXT JSON:
${caseContextJson}
- Refer explicitly to discriminating findings already present (numeric/qualitative) and tie them to what they rule in/out and what they change next.
- When referencing data, cite it explicitly: "The [test name] showing [result] argues for/against [diagnosis] because..."

Ensure strict cross-section consistency; no invented labs/facts not present in earlier sections.

Case: ${caseContext.demographics?.topic || 'Clinical case'}
History: ${caseContext.history || 'Not available'}
Exam: ${caseContext.exam || 'Not available'}
Paraclinical: ${paraclinicalContext}

Return ONLY valid JSON:
{
  "deepEvidence": ""
}`; 

      const completion = await generateCaseContent(selectedModel, prompt, 0.5, 30000);

      const text = completion.choices?.[0]?.message?.content || '{}';
      const parsed = safeParseJSON(text);
      const deepEvidenceText = validateDeepEvidenceText(parsed.deepEvidence || '');

      const updated = await updateCaseFields(caseId, { 
        deepEvidence: deepEvidenceText
      });
      const fullCase = await getCase(caseId);
      const processedCase = postProcessCase(stabilizeCaseFields(fullCase));

      res.json({
        success: true,
        data: processedCase,
        caseId,
        cached: false,
      });
    } catch (error) {
      console.error('[CASE_API] Deep Evidence error:', error);
      return respondWithFallback('Deep Evidence temporarily unavailable');
    }
  });

  // POST /api/case/expand/stability - Generate stability score
  router.post('/expand/stability', async (req, res) => {
    try {
      const caseId = extractCaseId(req);
      
      if (!caseId) {
        return res.status(400).json({ ok: false, error: 'Missing caseId' });
      }

      const existingCase = await getCase(caseId);
      if (!existingCase) {
        return res.status(404).json({ ok: false, error: 'Case not found' });
      }

      let caseContext;
      try {
        caseContext = getCaseContextForExpand(req, existingCase, 'stability');
      } catch (error) {
        return res.status(400).json({ ok: false, error: error.message || 'Case context not available' });
      }

      const selectedModel = getModel(req, existingCase);

      // Check cache
      if (existingCase.stability && typeof existingCase.stability === 'string' && existingCase.stability.trim().length > 0) {
        console.log('[CASE_API] Stability cache hit for caseId:', caseId);
        const processedCase = postProcessCase(stabilizeCaseFields(existingCase));
        return res.json({
          success: true,
          data: processedCase,
          caseId,
          cached: true,
        });
      }

      const caseContextJson = JSON.stringify(caseContext);

      const prompt = `Assess patient stability based on the FULL case context below. Return: stable / borderline / unstable. One sentence justification.

CRITICAL: Use the locked case_context provided. Do NOT change, regenerate, or question the diagnosis. The diagnosis is already determined from Stage A data.
DO NOT CHANGE CASE CONTENT.
DO NOT CHANGE CASE CONTENT.

Ensure strict cross-section consistency; no invented labs/facts not present in earlier sections.

FULL CASE CONTEXT JSON:
${caseContextJson}

Return JSON: {"stability": ""}`;

      const completion = await generateCaseContent(selectedModel, prompt, 0.3, 20000);

      const text = completion.choices?.[0]?.message?.content || '{}';
      const parsed = safeParseJSON(text);

      const stabilityText = stripSurroundingWhitespace(parsed.stability || '');
      if (!isNonEmptyString(stabilityText)) {
        throw new Error('Stability validation failed: empty');
      }
      if (containsJsonArtifacts(stabilityText)) {
        throw new Error('Stability validation failed: contains JSON/Markdown artifacts');
      }
      const stabilityLower = stabilityText.toLowerCase();
      if (!(stabilityLower.startsWith('stable') || stabilityLower.startsWith('borderline') || stabilityLower.startsWith('unstable'))) {
        throw new Error('Stability validation failed: must start with stable/borderline/unstable');
      }

      const updated = await updateCaseFields(caseId, { 
        stability: stabilityText
      });
      const fullCase = await getCase(caseId);
      const processedCase = postProcessCase(stabilizeCaseFields(fullCase));

      res.json({
        success: true,
        data: processedCase,
        caseId,
        cached: false,
      });
    } catch (error) {
      console.error('[CASE_API] Stability error:', error);
      const statusCode = error.message?.includes('Missing') || error.message?.includes('not found') ? 400 : 500;
      res.status(statusCode).json({
        ok: false,
        error: error.message || 'Failed to generate stability',
      });
    }
  });

  // POST /api/case/expand/risk - Generate risk label
  router.post('/expand/risk', async (req, res) => {
    try {
      const caseId = extractCaseId(req);
      
      if (!caseId) {
        return res.status(400).json({ ok: false, error: 'Missing caseId' });
      }

      const existingCase = await getCase(caseId);
      if (!existingCase) {
        return res.status(404).json({ ok: false, error: 'Case not found' });
      }

      let caseContext;
      try {
        caseContext = getCaseContextForExpand(req, existingCase, 'risk');
      } catch (error) {
        return res.status(400).json({ ok: false, error: error.message || 'Case context not available' });
      }

      const selectedModel = getModel(req, existingCase);

      // Check cache
      if (existingCase.risk && typeof existingCase.risk === 'string' && existingCase.risk.trim().length > 0) {
        console.log('[CASE_API] Risk cache hit for caseId:', caseId);
        const processedCase = postProcessCase(stabilizeCaseFields(existingCase));
        return res.json({
          success: true,
          data: processedCase,
          caseId,
          cached: true,
        });
      }

      const caseContextJson = JSON.stringify(caseContext);

      const prompt = `Assess clinical risk based on the FULL case context below. Return: high / moderate / low. No explanation.

CRITICAL: Use the locked case_context provided. Do NOT change, regenerate, or question the diagnosis. The diagnosis is already determined from Stage A data.

Ensure strict cross-section consistency; no invented labs/facts not present in earlier sections.

FULL CASE CONTEXT JSON:
${caseContextJson}

Return JSON: {"risk": ""}`;

      const completion = await generateCaseContent(selectedModel, prompt, 0.3, 20000);

      const text = completion.choices?.[0]?.message?.content || '{}';
      const parsed = safeParseJSON(text);

      const riskRaw = stripSurroundingWhitespace(parsed.risk || '');
      if (!isNonEmptyString(riskRaw)) {
        throw new Error('Risk validation failed: empty');
      }
      if (containsJsonArtifacts(riskRaw)) {
        throw new Error('Risk validation failed: contains JSON/Markdown artifacts');
      }
      const riskToken = riskRaw.toLowerCase().split(/\s+/)[0];
      if (!(riskToken === 'high' || riskToken === 'moderate' || riskToken === 'low')) {
        throw new Error('Risk validation failed: must be high/moderate/low');
      }

      const updated = await updateCaseFields(caseId, { 
        risk: riskToken
      });
      const fullCase = await getCase(caseId);
      const processedCase = postProcessCase(stabilizeCaseFields(fullCase));

      res.json({
        success: true,
        data: processedCase,
        caseId,
        cached: false,
      });
    } catch (error) {
      console.error('[CASE_API] Risk error:', error);
      const statusCode = error.message?.includes('Missing') || error.message?.includes('not found') ? 400 : 500;
      res.status(statusCode).json({
        ok: false,
        error: error.message || 'Failed to generate risk',
      });
    }
  });

  // POST /api/case/expand/consistency - Check consistency
  router.post('/expand/consistency', async (req, res) => {
    try {
      const caseId = extractCaseId(req);
      
      if (!caseId) {
        return res.status(400).json({ ok: false, error: 'Missing caseId' });
      }

      const existingCase = await getCase(caseId);
      if (!existingCase) {
        return res.status(404).json({ ok: false, error: 'Case not found' });
      }

      // Validate that diagnosis and management exist before computing consistency
      const hasDiagnosis = existingCase.final_diagnosis && 
                           typeof existingCase.final_diagnosis === 'string' && 
                           existingCase.final_diagnosis.trim().length > 0 &&
                           !existingCase.final_diagnosis.toLowerCase().includes('not provided') &&
                           !existingCase.final_diagnosis.toLowerCase().includes('not available');
      
      const hasManagement = existingCase.management && 
                           typeof existingCase.management === 'object' &&
                           ((existingCase.management.initial && typeof existingCase.management.initial === 'string' && existingCase.management.initial.trim().length > 0) ||
                            (existingCase.management.definitive && typeof existingCase.management.definitive === 'string' && existingCase.management.definitive.trim().length > 0));

      if (!hasDiagnosis || !hasManagement) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Consistency check requires both diagnosis and management to be present. Please complete Stage A case generation first.',
          requires: {
            diagnosis: !hasDiagnosis,
            management: !hasManagement
          }
        });
      }

      let caseContext;
      try {
        caseContext = getCaseContextForExpand(req, existingCase, 'consistency');
      } catch (error) {
        return res.status(400).json({ ok: false, error: error.message || 'Case context not available' });
      }

      const selectedModel = getModel(req, existingCase);

      // Check cache
      if (existingCase.consistency && typeof existingCase.consistency === 'string' && existingCase.consistency.trim().length > 0) {
        console.log('[CASE_API] Consistency cache hit for caseId:', caseId);
        const processedCase = postProcessCase(stabilizeCaseFields(existingCase));
        return res.json({
          success: true,
          data: processedCase,
          caseId,
          cached: true,
        });
      }

      const caseContextJson = JSON.stringify(caseContext);

      const prompt = `Check clinical consistency across all Stage A data (history, exam, paraclinical, diagnosis, management).

CRITICAL: Use the locked case_context provided below. Do NOT change, regenerate, or question the diagnosis. The diagnosis is already determined from Stage A data.

CRITICAL RULES:
- NEVER auto-mark "Consistent" without thorough verification
- Mark "Consistent" ONLY if ALL of the following align without unresolved conflict:
  1. History matches physical exam findings
  2. Paraclinical results support the diagnosis
  3. Diagnosis is justified by available data
  4. Management aligns with diagnosis and case physiology
  5. No contradictions between imaging findings and diagnosis

- If imaging contradicts diagnosis (e.g., normal CT angiography with NSTEMI diagnosis), explicitly reconcile using ONLY Stage A data:
  * If reconciliation possible (e.g., troponin-driven, non-occlusive plaque, microvascular ischemia), explain the reconciliation
  * If reconciliation cannot be justified from Stage A data, return "Unable to assess"

- If any contradiction exists that cannot be resolved, describe it (max 2 lines)

- Do not invent data to force consistency

FULL CASE CONTEXT JSON:
${caseContextJson}

Return JSON: {"consistency": ""}`;

      const completion = await generateCaseContent(selectedModel, prompt, 0.3, 20000);

      const text = completion.choices?.[0]?.message?.content || '{}';
      const parsed = safeParseJSON(text);

      const consistencyText = stripSurroundingWhitespace(parsed.consistency || '');
      if (!isNonEmptyString(consistencyText)) {
        throw new Error('Consistency validation failed: empty');
      }
      if (containsJsonArtifacts(consistencyText)) {
        throw new Error('Consistency validation failed: contains JSON/Markdown artifacts');
      }
      if (consistencyText.length > 600) {
        throw new Error('Consistency validation failed: too long');
      }

      const updated = await updateCaseFields(caseId, { 
        consistency: consistencyText
      });
      const fullCase = await getCase(caseId);
      const processedCase = postProcessCase(stabilizeCaseFields(fullCase));

      res.json({
        success: true,
        data: processedCase,
        caseId,
        cached: false,
      });
    } catch (error) {
      console.error('[CASE_API] Consistency error:', error);
      const statusCode = error.message?.includes('Missing') || error.message?.includes('not found') ? 400 : 500;
      res.status(statusCode).json({
        ok: false,
        error: error.message || 'Failed to generate consistency',
      });
    }
  });

  // GET /api/case/:caseId - Get case by ID
  router.get('/:caseId', async (req, res) => {
    try {
      const { caseId } = req.params;
      const caseData = await getCase(caseId);
      
      if (!caseData) {
        return res.status(404).json({ ok: false, error: 'Case not found' });
      }

      const processedCase = postProcessCase(stabilizeCaseFields(caseData));

      res.json({
        success: true,
        data: processedCase,
        caseId,
      });
    } catch (error) {
      console.error('[CASE_API] Get case error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get case',
      });
    }
  });

  return router;
}
