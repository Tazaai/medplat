// backend/routes/guidelines_api.mjs
// Phase 3: Dynamic 4-tier guideline cascade API
import express from 'express';
import { db } from '../firebaseClient.js';

const router = express.Router();

// Static guideline registry (fallback when Firestore is unavailable)
const GUIDELINE_REGISTRY = {
  Denmark: {
    'Atrial Fibrillation': {
      local: [
        {
          society: 'Sundhedsstyrelsen',
          year: 2024,
          title: 'National klinisk retningslinje for behandling af atrieflimren',
          doi_or_url: 'https://www.sst.dk/da/udgivelser/2024/nkr-atrieflimren',
          recommendation: 'Antikoagulation anbefales ved CHA₂DS₂-VASc ≥2',
          class: 'I',
          level: 'A'
        }
      ],
      national: [
        {
          society: 'Danish Society of Cardiology',
          year: 2023,
          title: 'Guidelines for Management of Atrial Fibrillation',
          doi_or_url: 'https://nbv.cardio.dk/af',
          recommendation: 'Follow ESC guidelines with local adaptations',
          class: 'I',
          level: 'A'
        }
      ],
      regional: [
        {
          society: 'ESC',
          year: 2023,
          title: '2023 ESC Guidelines for Atrial Fibrillation Management',
          doi_or_url: 'doi:10.1093/eurheartj/ehad194',
          recommendation: 'Anticoagulation for CHA₂DS₂-VASc ≥2 (males) or ≥3 (females)',
          class: 'I',
          level: 'A'
        }
      ],
      international: [
        {
          society: 'AHA/ACC',
          year: 2023,
          title: '2023 ACC/AHA/ACCP/HRS Guideline for AF',
          doi_or_url: 'doi:10.1161/CIR.0000000000001193',
          recommendation: 'Oral anticoagulation for CHA₂DS₂-VASc ≥2',
          class: 'I',
          level: 'A'
        },
        {
          society: 'WHO',
          year: 2022,
          title: 'Global Guidelines on Cardiovascular Disease Prevention',
          doi_or_url: 'https://www.who.int/publications/i/item/9789240045064',
          recommendation: 'Evidence-based management of atrial fibrillation',
          class: 'I',
          level: 'A'
        }
      ]
    }
  },
  'United States': {
    'Atrial Fibrillation': {
      local: [],
      national: [
        {
          society: 'AHA/ACC',
          year: 2023,
          title: '2023 ACC/AHA/ACCP/HRS Guideline for AF',
          doi_or_url: 'doi:10.1161/CIR.0000000000001193',
          recommendation: 'Oral anticoagulation for CHA₂DS₂-VASc ≥2',
          class: 'I',
          level: 'A'
        }
      ],
      regional: [],
      international: [
        {
          society: 'ESC',
          year: 2023,
          title: '2023 ESC Guidelines for Atrial Fibrillation Management',
          doi_or_url: 'doi:10.1093/eurheartj/ehad194',
          recommendation: 'Anticoagulation for CHA₂DS₂-VASc ≥2 (males) or ≥3 (females)',
          class: 'I',
          level: 'A'
        }
      ]
    }
  },
  global: {
    'Atrial Fibrillation': {
      local: [],
      national: [],
      regional: [],
      international: [
        {
          society: 'WHO',
          year: 2022,
          title: 'Global Guidelines on Cardiovascular Disease Prevention',
          doi_or_url: 'https://www.who.int/publications/i/item/9789240045064',
          recommendation: 'Evidence-based management of atrial fibrillation',
          class: 'I',
          level: 'A'
        }
      ]
    }
  }
};

// POST /api/guidelines/fetch
router.post('/fetch', async (req, res) => {
  const { topic, region } = req.body;

  if (!topic) {
    return res.status(400).json({ ok: false, error: 'Topic is required' });
  }

  try {
    // Try Firestore first (soft fail)
    if (db) {
      try {
        const docId = `${region || 'global'}_${topic.replace(/\s+/g, '_')}`;
        const docRef = db.collection('guideline_registry').doc(docId);
        const doc = await docRef.get();

        if (doc.exists) {
          const data = doc.data();
          return res.json({ ok: true, guidelines: data.tiers || data });
        }
      } catch (firestoreErr) {
        console.warn('Firestore unavailable, using static registry:', firestoreErr.message);
      }
    }

    // Fallback to static registry
    const regionKey = region || 'global';
    const guidelines = GUIDELINE_REGISTRY[regionKey]?.[topic] || GUIDELINE_REGISTRY.global[topic] || {
      local: [],
      national: [],
      regional: [],
      international: []
    };

    res.json({ ok: true, guidelines });
  } catch (err) {
    console.error('Guideline fetch error:', err);
    
    // Graceful fallback
    const regionKey = region || 'global';
    const guidelines = GUIDELINE_REGISTRY[regionKey]?.[topic] || GUIDELINE_REGISTRY.global[topic] || {
      local: [],
      national: [],
      regional: [],
      international: []
    };

    res.json({ ok: true, guidelines, warning: 'Using static guideline registry' });
  }
});

export default router;
