import express from 'express';
import { initFirebase } from '../firebaseClient.js';
// generate_case_clinical.mjs lives at the repository root (copied into the image root)
// relative to this routes file it is one level up: ../generate_case_clinical.mjs
import generateCase from '../generate_case_clinical.mjs';
// v15.2.0: Stability helpers
import { withTimeoutAndRetry, safeRouteHandler, createFallbackResponse } from '../utils/api_helpers.mjs';

export default function casesApi() {
  const router = express.Router();
  const fb = initFirebase();
  const firestore = fb && fb.firestore;
  const collectionName = process.env.CASES_COLLECTION || 'cases';

  // POST /api/cases - generate a new case dynamically (with timeout protection)
  router.post('/', safeRouteHandler(async (req, res) => {
    const { topic, language = 'en', region = 'EU/DK', level = 'intermediate', model = 'gpt-4o-mini', category } = req.body || {};
    if (!topic) return res.status(400).json({ ok: false, error: 'Missing topic' });

    try {
      // Step 1: Generate draft case with timeout (STAGE 1: Professor-Level Generator)
      const draftResult = await withTimeoutAndRetry(
        async (signal) => await generateCase({ topic, model, lang: language, region, signal }),
        8000, // 8 second timeout
        1 // 1 retry
      );
      
      // Step 2: Send draft to internal panel for auto-review (STAGE 2: Expert Panel Validation)
      let reviewedResult = draftResult;
      let panelNote = '';
      let qualityScore = 0.0;
      
      try {
        const internalPanelResponse = await fetch('http://localhost:8080/api/internal-panel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            caseData: draftResult,
            category: category || extractCategory(topic),
            language,
            region
          })
        });
        
        const panelData = await internalPanelResponse.json();
        if (panelData.ok && panelData.case) {
          reviewedResult = panelData.case;
          qualityScore = panelData.qualityScore || 0.9;
          panelNote = panelData.panelNote || `✅ Validated by Internal Expert Panel (Quality: ${(qualityScore * 100).toFixed(0)}%)`;
          console.log(`✅ Internal panel reviewed case for: ${topic} (Quality: ${(qualityScore * 100).toFixed(0)}%)`);
        }
      } catch (panelError) {
        console.warn('⚠️ Internal panel unavailable, using draft:', panelError.message);
        panelNote = '⚠️ Internal review unavailable';
      }
      
      // Step 3: Transform to frontend format with enhanced fields
      const transformed = {
        Topic: reviewedResult.meta?.topic || topic,
        Timeline: reviewedResult.timeline || null,
        Patient_History: reviewedResult.history?.presenting_complaint || reviewedResult.history || '',
        History_Full: reviewedResult.history || {},
        Objective_Findings: reviewedResult.exam?.general || reviewedResult.exam || '',
        Exam_Full: reviewedResult.exam || {},
        Vitals: reviewedResult.exam?.vitals || {},
        Paraclinical_Investigations: {
          labs: reviewedResult.paraclinical?.labs || reviewedResult.labs || [],
          imaging: reviewedResult.paraclinical?.imaging || reviewedResult.imaging || [],
          ecg: reviewedResult.paraclinical?.ecg || '',
          other: reviewedResult.paraclinical?.other_tests || [],
          test_kinetics: reviewedResult.paraclinical?.test_kinetics || []
        },
        Differential_Diagnoses: reviewedResult.differentials || [],
        Red_Flags: reviewedResult.red_flags || [],
        Final_Diagnosis: { 
          Diagnosis: reviewedResult.final_diagnosis?.name || reviewedResult.diagnosis || 'No confirmed final diagnosis.',
          Rationale: reviewedResult.final_diagnosis?.rationale || ''
        },
        Management: reviewedResult.management?.immediate || reviewedResult.discussion || '',
        Management_Full: {
          immediate: reviewedResult.management?.immediate || [],
          timing_windows: reviewedResult.management?.timing_windows || [],
          region_guidelines: reviewedResult.management?.region_guidelines || [],
          escalation: reviewedResult.management?.escalation_if_wrong_dx || []
        },
        Pathophysiology: reviewedResult.pathophysiology || {},
        Disposition: reviewedResult.disposition || {},
        Evidence_and_References: reviewedResult.evidence || {},
        Teaching: reviewedResult.teaching || {pearls: [], mnemonics: []},
        Expert_Panel_and_Teaching: reviewedResult.panel_discussion || reviewedResult.panel_notes || {},
        meta: {
          topic: reviewedResult.meta?.topic || topic,
          age: reviewedResult.meta?.demographics?.age || reviewedResult.meta?.age || '',
          sex: reviewedResult.meta?.demographics?.sex || reviewedResult.meta?.sex || '',
          setting: reviewedResult.meta?.geography_of_living || reviewedResult.meta?.setting || '',
          language,
          region,
          model,
          panelNote,
          reviewed_by_internal_panel: reviewedResult.meta?.reviewed_by_internal_panel || false,
          panel_review_timestamp: reviewedResult.meta?.panel_review_timestamp || null,
          panel_roles: reviewedResult.meta?.panel_roles || [],
          reference_validation: reviewedResult.meta?.reference_validation || null,
          quality_score: reviewedResult.meta?.quality_score || qualityScore,
          generator_version: reviewedResult.meta?.generator_version || 'unknown',
          quality_estimate: reviewedResult.meta?.quality_estimate
        }
      };
      
      return res.json({ ok: true, topic, case: transformed });
    } catch (err) {
      console.error('❌ /api/cases generation error:', err && err.stack ? err.stack : err);
      
      // v15.2.0: Return fallback case instead of complete failure
      console.log('🔄 Returning fallback case due to generation error');
      const fallback = createFallbackResponse('case', { topic, language, region });
      return res.json(fallback);
    }
  }));

  // Helper: extract category from topic (simple keyword matching)
  function extractCategory(topic) {
    const t = topic.toLowerCase();
    if (t.includes('heart') || t.includes('cardiac') || t.includes('mi')) return 'Cardiology';
    if (t.includes('stroke') || t.includes('seizure') || t.includes('neuro')) return 'Neurology';
    if (t.includes('lung') || t.includes('asthma') || t.includes('copd')) return 'Pulmonology';
    if (t.includes('gi') || t.includes('abdomen') || t.includes('liver')) return 'Gastroenterology';
    if (t.includes('kidney') || t.includes('renal')) return 'Nephrology';
    if (t.includes('diabetes') || t.includes('thyroid')) return 'Endocrinology';
    if (t.includes('infection') || t.includes('sepsis')) return 'Infectious Disease';
    if (t.includes('trauma') || t.includes('fracture')) return 'Trauma';
    return 'General Medicine';
  }

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
