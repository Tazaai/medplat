import express from 'express';
import fetch from 'node-fetch';
import Ajv from 'ajv';

const router = express.Router();
const ajv = new Ajv({ allErrors: true, strict: false });

// JSON schema for a generated clinical case — keep it permissive but enforce essentials
const caseSchema = {
  type: 'object',
  properties: {
    Topic: { type: 'string' },
    Patient_History: { anyOf: [{ type: 'string' }, { type: 'object' }] },
    meta: {
      type: 'object',
      properties: {
        case_id: { type: 'string' },
        region: { type: 'string' }
      },
      required: ['case_id', 'region'],
      additionalProperties: true
    },
    Objective_Findings: { anyOf: [{ type: 'string' }, { type: 'object' }] },
    Paraclinical_Investigations: { anyOf: [{ type: 'string' }, { type: 'array' }, { type: 'object' }] },
    Differential_Diagnoses: { anyOf: [{ type: 'string' }, { type: 'array' }, { type: 'object' }] },
    Final_Diagnosis: { anyOf: [{ type: 'string' }, { type: 'object' }] },
    Management: { anyOf: [{ type: 'string' }, { type: 'object' }] },
    Conclusion: { anyOf: [{ type: 'string' }, { type: 'object' }] }
  },
  required: ['Topic', 'Patient_History', 'meta'],
  additionalProperties: true
};
const validateCase = ajv.compile(caseSchema);

// Helper: produce a safe stub when OpenAI is unavailable
function stubReply(req) {
  return {
    ok: true,
    aiReply: {
      json: {
        Topic: req.body.topic || req.body.customSearch || 'Sample clinical case (stub)',
        Patient_History: 'No history — stub response',
        meta: { case_id: `stub-${Date.now()}`, region: req.body.userLocation || 'global' },
      },
    },
  };
}

// POST /api/dialog - generate or fetch a case (live with OpenAI when configured)
router.post('/', async (req, res) => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const model = req.body.model || 'gpt-4o-mini';
  const language = req.body.language || 'en';
  const userLocation = req.body.userLocation || 'global';

  if (!OPENAI_API_KEY) {
    // fallback to safe stub
    return res.json(stubReply(req));
  }

  try {
    // Prompt — request a strict JSON output describing a clinical case
  const system = `You are a clinical case generator for medical education. Produce a single JSON object that validates against the provided schema. Required keys: Topic (string), Patient_History (string or structured object), meta (object with case_id and region). You may include Objective_Findings, Paraclinical_Investigations, Differential_Diagnoses, Final_Diagnosis, Management, Conclusion. Output ONLY valid JSON and nothing else.`;
  const user = `Generate one realistic, educational clinical case in ${language}. Topic or search: ${req.body.customSearch || req.body.topic || 'general medicine'}. Region: ${userLocation}. Ensure the JSON includes meta.case_id and meta.region. Return only JSON.`;

    const body = {
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
      max_tokens: 1200,
    };

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

  const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || '';

    // Try to parse JSON directly; if it fails, attempt to extract JSON substring
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      const m = text.match(/\{[\s\S]*\}$/m);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch (e2) {
          parsed = null;
        }
      }
    }

    // Validate parsed result against schema
    let valid = parsed && validateCase(parsed);

    // If invalid or not parsed, try a single retry with a stronger instruction
    if (!valid) {
      // Attempt one retry with clearer schema guidance and a small temperature bump
      const retrySystem = system + ' If you are unable to output valid JSON, respond with a JSON object containing an "error" key explaining the issue.';
      const retryBody = {
        model,
        messages: [
          { role: 'system', content: retrySystem },
          { role: 'user', content: user },
        ],
        temperature: 0.5,
        max_tokens: 1200,
      };

      try {
        const r2 = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(retryBody),
        });
        const data2 = await r2.json();
        const text2 = data2?.choices?.[0]?.message?.content || data2?.choices?.[0]?.text || '';
        try {
          parsed = JSON.parse(text2);
        } catch (e) {
          const m2 = text2.match(/\{[\s\S]*\}$/m);
          if (m2) {
            try {
              parsed = JSON.parse(m2[0]);
            } catch (e2) {
              parsed = null;
            }
          }
        }
        valid = parsed && validateCase(parsed);
        if (!valid) {
          // Return validation errors to help debugging (still keep ok:true to avoid breaking UI)
          return res.json({ ok: true, aiReply: { json: parsed || null, validation: { valid: false, errors: validateCase.errors }, raw: data2 } });
        }
      } catch (retryErr) {
        console.warn('dialog_api retry error', retryErr?.message || retryErr);
      }
    }

  // Ensure meta.case_id exists
  if (!parsed.meta) parsed.meta = {};
  if (!parsed.meta.case_id) parsed.meta.case_id = `case-${Date.now()}`;
  if (!parsed.meta.region) parsed.meta.region = userLocation;

  return res.json({ ok: true, aiReply: { json: parsed } });
  } catch (err) {
    console.error('dialog_api error:', err?.message || err);
    // On error, fallback to stub to keep UI working
    return res.json(stubReply(req));
  }
});

export default function dialogApi() {
  return router;
}
