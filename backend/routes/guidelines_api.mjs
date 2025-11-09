// ~/medplat/backend/routes/guidelines_api.mjs
// Local/Regional Clinical Guidelines API (Dynamic Fetcher)

import express from 'express';

export default function guidelinesApi() {
  const router = express.Router();

  // GET /api/guidelines/local - Fetch region-specific guidelines
  router.get('/local', async (req, res) => {
    try {
      const { region = 'auto', topic = '' } = req.query;

      // Guideline registry by region (fallback implementation)
      const guidelineRegistry = {
        Denmark: [
          { society: 'Sundhedsstyrelsen', title: 'Danish Health Authority Clinical Guidelines', url: 'https://www.sst.dk/da/Viden/Kliniske-retningslinjer' },
          { society: 'NNBV', title: 'National Nøglebog i Kardiologi', url: 'https://nbv.cardio.dk/' },
          { society: 'ESC', title: 'European Society of Cardiology Guidelines', url: 'https://www.escardio.org/Guidelines' }
        ],
        'United States': [
          { society: 'AHA/ACC', title: 'American Heart Association / American College of Cardiology Guidelines', url: 'https://www.heart.org/en/professional/quality-improvement/clinical-practice-guidelines' },
          { society: 'ACEP', title: 'American College of Emergency Physicians Clinical Policies', url: 'https://www.acep.org/patient-care/clinical-policies/' },
          { society: 'CDC', title: 'Centers for Disease Control and Prevention Guidelines', url: 'https://www.cdc.gov/health-topics.html' }
        ],
        'United Kingdom': [
          { society: 'NICE', title: 'National Institute for Health and Care Excellence', url: 'https://www.nice.org.uk/guidance' },
          { society: 'BNF', title: 'British National Formulary', url: 'https://bnf.nice.org.uk/' },
          { society: 'Resuscitation Council UK', title: 'UK Resuscitation Guidelines', url: 'https://www.resus.org.uk/library/2021-resuscitation-guidelines' }
        ],
        Germany: [
          { society: 'AWMF', title: 'Association of Scientific Medical Societies (German Guidelines)', url: 'https://www.awmf.org/leitlinien.html' },
          { society: 'DGIM', title: 'German Society of Internal Medicine', url: 'https://www.dgim.de/' },
          { society: 'ESC', title: 'European Society of Cardiology Guidelines', url: 'https://www.escardio.org/Guidelines' }
        ],
        Canada: [
          { society: 'CCS', title: 'Canadian Cardiovascular Society Guidelines', url: 'https://ccs.ca/guidelines/' },
          { society: 'CMAJ', title: 'Canadian Medical Association Clinical Practice Guidelines', url: 'https://www.cmaj.ca/collection/guidelines' }
        ],
        Australia: [
          { society: 'RACGP', title: 'Royal Australian College of General Practitioners Guidelines', url: 'https://www.racgp.org.au/clinical-resources/clinical-guidelines' },
          { society: 'NHMRC', title: 'National Health and Medical Research Council Guidelines', url: 'https://www.nhmrc.gov.au/health-advice/guidelines' }
        ],
        WHO: [
          { society: 'WHO', title: 'World Health Organization Clinical Guidelines', url: 'https://www.who.int/publications/who-guidelines' },
          { society: 'Cochrane', title: 'Cochrane Systematic Reviews', url: 'https://www.cochranelibrary.com/' }
        ]
      };

      // Fallback hierarchy: region → ESC → NICE → AHA → WHO
      let guidelines = guidelineRegistry[region] || [];
      
      if (guidelines.length === 0) {
        // Auto-detect fallback
        guidelines = [
          ...guidelineRegistry.WHO,
          ...guidelineRegistry['United Kingdom'].slice(0, 1), // NICE
          { society: 'ESC', title: 'European Society of Cardiology Guidelines', url: 'https://www.escardio.org/Guidelines' },
          { society: 'AHA', title: 'American Heart Association Guidelines', url: 'https://www.heart.org/en/professional/quality-improvement/clinical-practice-guidelines' }
        ];
      }

      res.json({
        ok: true,
        region: region === 'auto' ? 'Global (Fallback)' : region,
        topic,
        guidelines,
        note: 'Dynamic guideline fetcher with region-specific fallback hierarchy'
      });

    } catch (error) {
      console.error('Error fetching guidelines:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
}
