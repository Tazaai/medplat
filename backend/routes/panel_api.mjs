import express from 'express';
import OpenAI from 'openai';
import { initFirebase } from '../firebaseClient.js';
import { extractJSON } from '../generate_case_clinical.mjs';

export default function panelApi() {
  const router = express.Router();
  const fb = initFirebase();
  const firestore = fb && fb.firestore;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // POST /api/panel/review
  // body: { case_json: { ... }, case_id?: string }
  router.post('/review', async (req, res) => {
    try {
      const { case_json: caseJson, case_id: caseId } = req.body || {};
      if (!caseJson) return res.status(400).json({ ok: false, error: 'Missing case_json in body' });

      // Build a system prompt that instructs the model to act as a 12-member expert panel.
      const panelPrompt = `You are an EXPERT PANEL of 12 senior clinicians across multiple specialties.\n\nEach panelist should produce a short structured critique of the case using the schema below. Do not add extra commentary outside the JSON.\n\nPanel composition (12 members):\n1) Emergency Medicine consultant\n2) General Internist\n3) Pediatrician\n4) Obstetrics/Gynecology\n5) Cardiologist\n6) Neurologist\n7) Infectious Diseases specialist\n8) Pulmonologist\n9) Psychiatrist\n10) Pharmacologist/Toxicologist\n11) Radiologist\n12) Surgeon\n\nFor each reviewer produce: {"name":"Role Name","concise_comment":"...","issues":["..."],"confidence":0-100,"severity":0-10} \n\nThen produce a consensus object: {"summary":"...","recommended_actions":["..."],"overall_confidence":0-100} \n\nReturn EXACTLY a single top-level JSON object with keys: reviewers (array), consensus (object), schema_issues (array)\n\nBe concise, clinical, and strictly JSON. Do not include markdown fences.\n`;

      // Call the model (compatible with openai npm v3/v4 chat completion shape used elsewhere)
      const messages = [
        { role: 'system', content: panelPrompt },
        { role: 'user', content: JSON.stringify(caseJson, null, 2) },
      ];

      const response = await client.chat.completions.create({
        model: process.env.PANEL_MODEL || 'gpt-4o-mini',
        messages,
        temperature: 0.8,
        max_tokens: 2000,
      });

      const text = response?.choices?.[0]?.message?.content ?? response?.choices?.[0]?.text ?? JSON.stringify(response);

      // Try to extract JSON from the model response
      const parsed = extractJSON(text) || null;

      // Save review to Firestore under cases/{caseId}/reviews or create a new case if missing
      let saved = null;
      try {
        if (firestore) {
          let targetCaseId = caseId;
          if (!targetCaseId) {
            // create a new case doc
            const casesCol = firestore.collection(process.env.CASES_COLLECTION || 'cases');
            const newDoc = { ...(caseJson || {}), created_at: new Date().toISOString() };
            const r = await casesCol.add(newDoc);
            targetCaseId = r && r.id ? r.id : null;
          }

          if (targetCaseId) {
            const reviewsCol = firestore.collection(process.env.CASES_COLLECTION || 'cases').doc(targetCaseId).collection('reviews');
            const reviewDoc = {
              created_at: new Date().toISOString(),
              reviewer_output: parsed || text,
              raw_text: parsed ? null : text,
            };
            const reviewAdd = await reviewsCol.add(reviewDoc);
            // mark case as reviewed
            await firestore.collection(process.env.CASES_COLLECTION || 'cases').doc(targetCaseId).set({ reviewed: true, last_reviewed_at: new Date().toISOString() }, { merge: true });
            saved = { caseId: targetCaseId, reviewId: reviewAdd.id };
          }
        }
      } catch (saveErr) {
        console.warn('Failed to save review to Firestore:', saveErr && saveErr.message ? saveErr.message : saveErr);
      }

      return res.json({ ok: true, parsed, raw: text, saved });
    } catch (err) {
      console.error('/api/panel/review error:', err && err.stack ? err.stack : err);
      return res.status(500).json({ ok: false, error: err && err.message ? err.message : String(err) });
    }
  });

  return router;
}
