import express from 'express';
import { initFirebase } from '../firebaseClient.js';
// generate_case_clinical.mjs lives at the repository root (copied into the image root)
// relative to this routes file it is one level up: ../generate_case_clinical.mjs
import generateCase from '../generate_case_clinical.mjs';

export default function casesApi() {
  const router = express.Router();
  const fb = initFirebase();
  const firestore = fb && fb.firestore;
  const collectionName = process.env.CASES_COLLECTION || 'cases';

  // POST /api/cases - generate a new case dynamically
  router.post('/', async (req, res) => {
    try {
      const { topic, language = 'en', region = 'EU/DK', level = 'intermediate', model = 'gpt-4o-mini' } = req.body || {};
      if (!topic) return res.status(400).json({ ok: false, error: 'Missing topic' });

      const result = await generateCase({ topic, model, lang: language, region });
      
      // Transform comprehensive schema to frontend-expected format
      const transformed = {
        Topic: result.meta?.topic || topic,
        Patient_History: result.history?.presenting_complaint || result.history || '',
        Objective_Findings: result.exam?.general || result.exam || '',
        Paraclinical_Investigations: {
          labs: result.paraclinical?.labs || result.labs || [],
          imaging: result.paraclinical?.imaging || result.imaging || [],
          ecg: result.paraclinical?.ecg || '',
          other: result.paraclinical?.other_tests || []
        },
        Differential_Diagnoses: result.differentials || [],
        Final_Diagnosis: { 
          Diagnosis: result.final_diagnosis?.name || result.diagnosis || 'No confirmed final diagnosis.',
          Rationale: result.final_diagnosis?.rationale || ''
        },
        Management: result.management?.immediate || result.discussion || '',
        Pathophysiology: result.pathophysiology || {},
        Red_Flags: result.red_flags || [],
        Evidence_and_References: result.evidence || {},
        Teaching: result.teaching || {},
        Expert_Panel_and_Teaching: result.panel_notes || {},
        meta: {
          topic: result.meta?.topic || topic,
          age: result.meta?.demographics?.age || result.meta?.age || '',
          sex: result.meta?.demographics?.sex || result.meta?.sex || '',
          setting: result.meta?.geography_of_living || result.meta?.setting || '',
          language,
          region,
          model,
        }
      };
      
      return res.json({ ok: true, topic, case: transformed });
    } catch (err) {
      console.error('❌ /api/cases generation error:', err && err.stack ? err.stack : err);
      return res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) });
    }
  });

  // POST /api/cases/save - save a case document to Firestore
  router.post('/save', async (req, res) => {
    try {
      const payload = req.body || {};
      // attach metadata
      const doc = { ...payload, created_at: new Date().toISOString() };
      const col = firestore.collection(collectionName);
      const addRes = await col.add(doc);
      res.json({ ok: true, id: addRes && addRes.id ? addRes.id : null });
    } catch (e) {
      console.error('Failed to save case:', e.message || e);
      res.status(500).json({ ok: false, error: String(e) });
    }
  });

  // GET /api/cases - list recent cases (optional)
  router.get('/', async (req, res) => {
    try {
      const col = firestore.collection(collectionName);
      const snapshot = await col.get();
      const docs = snapshot && snapshot.docs ? snapshot.docs : [];
      const items = docs.map((d) => ({ id: d.id || null, ...(typeof d.data === 'function' ? d.data() : d) }));
      res.json({ ok: true, cases: items });
    } catch (e) {
      console.warn('Failed to list cases:', e.message || e);
      res.json({ ok: true, cases: [] });
    }
  });

  return router;
}
