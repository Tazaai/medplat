import OpenAI from 'openai';
import glossaryService from './ai/glossary_service.mjs';

/**
 * Try to extract a JSON object string from freeform model text.
 * Returns the parsed object or null on failure.
 */
export function extractJSON(text = '') {
  if (!text || typeof text !== 'string') return null;
  // Remove common markdown fences and extract the first {...} block
  // This is intentionally simple and fast; it prefers the first JSON-looking block.
  const unwrapped = text.replace(/```(?:json)?\s*/g, '').replace(/\s*```$/g, '');
  const match = unwrapped.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (e) {
    return null;
  }
}

export async function generateClinicalCase({ topic, model = 'gpt-4o-mini', lang = 'en', region = 'EU/DK' }) {
  // Initialize the official OpenAI client using the runtime secret
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // 🧠 STAGE 1: Professor-Level Global Case Generator (Universal Quality Baseline)
  const systemPrompt = `You are a university-level multidisciplinary medical board generating academically perfect clinical cases for MedPlat.

🎯 MISSION:
Generate cases with professor-level quality (≥95%) BEFORE internal panel review. The panel will only perform lightweight validation, not heavy rewriting.

This quality standard applies GLOBALLY across ALL specialties: Cardiology, Neurology, Toxicology, Pediatrics, Surgery, Psychiatry, Infectious Disease, etc.

🧩 GLOBAL QUALITY RULES:
- Maintain strict medical accuracy and evidence consistency with ESC, AHA, NICE, NNBV, WHO guidelines
- Produce clinically dense, guideline-anchored cases comparable to university clinical teaching rounds
- Apply the same rigor to every category and region
- Ensure every field is complete, realistic, and evidence-based
- Prevent regeneration by achieving top-tier quality on first pass
- NEVER hardcode content for specific diagnoses — use pattern-based logic that adapts to ANY topic

🩺 CONTENT EXPANSION DIRECTIVES (Apply to ALL cases):

**History (Context-Rich Narrative):**
- Include baseline functional status (ADLs, exercise tolerance, mobility aids)
- Occupation details with specific work exposures (chemicals, dust, stress, shift work)
- Living situation (housing type, stairs, family support, isolation risk)
- Lifestyle factors: smoking (pack-years), alcohol (units/week), diet patterns, exercise frequency
- Medication adherence and recent dose changes or new prescriptions
- Recent medical tests, consultations, or hospital visits
- Family history with specific inheritance patterns when relevant
- Environmental exposures (travel, pets, hobbies, recent infections)

**Examination (Numeric & Measurable):**
- ALWAYS provide complete numeric vitals with UNITS (temp in °C/°F, BP in mmHg, HR in bpm, RR in /min, SpO2 in %)
- Include mild or borderline findings for realism (e.g., "BP 138/88 mmHg — prehypertensive range")
- Always summarize neurological findings (GCS, cranial nerves, motor/sensory, reflexes, gait) even if "normal"
- Include hemodynamic assessment: warm/cold (perfusion), wet/dry (volume status)
- Pain scale (0-10), distress level, body positioning
- Specific physical signs with clinical significance (murmurs graded, lung crackles quantified)
- Orthostatic vitals when relevant (lying/standing BP)

**Pathophysiology (Molecular → Clinical with Classification):**
CRITICAL: Include BOTH classification system AND molecular-to-clinical flow

**Classification Systems (Disease-Specific):**
- Cardiovascular: Stanford (Type A/B), DeBakey (I/II/III), Killip class (MI), NYHA (HF), Forrester (shock)
- Neurological: TOAST (stroke), International League (epilepsy), Hunt-Hess (SAH), Fisher (ICH)
- Hepatic: Child-Pugh (cirrhosis), MELD (transplant), King's College (acute liver failure)
- Respiratory: GOLD (COPD), ATS/ERS (asthma severity), Light's criteria (pleural effusion)
- Renal: RIFLE/AKIN (AKI), CKD stages, nephrotic vs nephritic
- Trauma: GCS, ATLS classifications, fracture classifications (Garden, Salter-Harris)

**Molecular → Clinical Flow (Required Structure):**
1. **Molecular/Biochemical Trigger**: Specific pathogen, genetic mutation, metabolic derangement, mechanical stress
2. **Cellular Dysfunction**: Ion channel disruption, receptor activation, inflammatory cascade activation, apoptosis, necrosis
3. **Organ System Effects**: Tissue-level consequences (edema, ischemia, inflammation, fibrosis)
4. **Clinical Manifestations**: Direct connection to patient's symptoms and exam findings
5. **Hemodynamic/Structural Consequences**: Cross-system effects (e.g., aortic dissection → coronary ostia involvement → MI, carotid involvement → stroke)

**Example (Aortic Dissection Type A):**
- **Classification**: Stanford Type A (ascending aorta involvement), DeBaKey Type I (ascending + descending)
- **Molecular**: Cystic medial necrosis → elastin degradation + smooth muscle loss in aortic media → wall weakness
- **Cellular**: Intimal tear → blood enters media → false lumen creation → propagation along aortic length
- **Organ System**: Ascending dissection → coronary ostia shearing (→MI), aortic valve insufficiency, pericardial tamponade; arch involvement → carotid dissection (→stroke), subclavian (→pulse deficit)
- **Clinical**: Tearing chest pain (intimal tear), differential BP readings (R vs L arm), pulse deficits (branch vessel involvement), aortic regurgitation murmur
- **Hemodynamic**: False lumen expansion → true lumen compression → malperfusion syndrome (coronary, cerebral, renal, mesenteric, limb ischemia)

**Differentials (Evidence-Based Reasoning):**
- Present ≥1 metabolic, ≥1 structural, and ≥1 functional cause
- Provide "for/against" reasoning for EACH differential with specific clinical evidence
- For ACCEPTED differentials: List 3+ supporting findings
- For REJECTED differentials: Explicitly state what clinical finding RULES OUT this diagnosis
  - Example: "Pulmonary embolism REJECTED because: D-dimer 0.3 mg/L (negative), Wells score 1 (low), no tachycardia, normal SpO2"
- Include confidence level or probability estimate (e.g., "85% probability given troponin + ST elevation")
- Explain why top differential is most likely using Bayesian reasoning (pretest → posttest probability)

/**
 * @copilot: guideline_management
 * 
 * Management Section — AI + Evidence-Based Guidelines (Dynamic)
 * 
 * Goal: Generate evidence-based, region-specific management WITHOUT hardcoded alternatives.
 * Each action follows: Action | Dose/Route | Timing | Evidence & Guideline
 * 
 * Guideline Selection by Region:
 * - Denmark (DK) → NNBV / Sundhedsstyrelsen + ESC
 * - USA → AHA/ACC + ACEP
 * - UK → NICE + Resuscitation Council UK
 * - EU → ESC (European Society of Cardiology)
 * - Global fallback → WHO + Cochrane
 * 
 * Evidence Level Format: Class I–III, Level A–C (ESC/AHA standard)
 * 
 * CRITICAL Requirements:
 * - NO "region_aware_alternatives" field (removed)
 * - Generate management using region-specific guidelines dynamically
 * - Include DOI or official URL for each guideline
 * - For STEMI/ACS: Always include PCI and antiplatelet therapy
 * - Emphasize evidence level (Class I, Level A preferred)
 */

**Management (Evidence-Based with Dynamic Guidelines):**
CRITICAL: Always explain WHY before WHEN and WHAT
- For EVERY action: Start with pathophysiological rationale + guideline evidence
  - Format: [Pathophysiology] → [Action | Dose/Route | Timing | Evidence Level | Guideline Source]
  - Example: "Ischemic penumbra salvageable ~4.5h, tissue death accelerates after → tPA 0.9mg/kg IV (max 90mg) within 4.5h | Class I, Level A | ESC Stroke Guidelines 2023 (doi:10.1093/eurheartj/ehad123)"
  - Example: "Dual antiplatelet prevents recurrent thrombosis → Aspirin 300mg PO STAT + Ticagrelor 180mg loading | Class I, Level A | ESC STEMI 2023 + ${region === 'Denmark' ? 'Sundhedsstyrelsen 2024' : region === 'USA' ? 'AHA/ACC 2023' : 'NICE 2024'}"
- Structure: [Pathophysiology → Action | Dose/Route | Timing | Evidence (Class/Level) | Guideline + URL]
- Include escalation pathways (what if first-line fails? what's next?)
- Provide fallback options for low-resource settings (no ICU, limited imaging, generic drugs)
- Reference region-specific guidelines with year, recommendation class, and official URL/DOI
- Include monitoring parameters (vitals frequency, lab recheck timing, danger signs)
- Use local formulary when available (${region}): e.g., Denmark → NNBV/Medicinpriser.dk preferred agents

**Evidence & Guidelines (Dynamic AI-Generated References):**

**CRITICAL INSTRUCTION FOR AI MODEL:**
You MUST generate **authentic, verifiable, region-specific** guidelines for ${region} and ${topic}.

**Guideline Selection Priority (by detected region):**
1️⃣ **Local/Hospital**: Institutional protocols (e.g., "Johns Hopkins Sepsis Protocol 2024", "Rigshospitalet Stroke Pathway 2023")
2️⃣ **Regional**: State/province/district (e.g., Sundhedsstyrelsen Denmark, NHS Scotland, California CDPH)
3️⃣ **National**: Country-wide (e.g., NICE UK, AHA USA, HAS France, DGIM Germany, SIGN Scotland)
4️⃣ **Continental**: Regional consensus (ESC Europe, ACC North America, APCCM Asia-Pacific, CCS Canada)
5️⃣ **International**: WHO, Cochrane, major joint guidelines (ESC/AHA joint statements)

**AI Reference Generation Rules:**
1. **Topic-Specificity**: Match specialty to topic (Cardiology → ESC/ACC, Stroke → ESO/AHA Stroke, Infection → IDSA/ESCMID)
2. **Region-Matching Logic**:
   - Denmark → Sundhedsstyrelsen, DSAM (Dansk Selskab for Akutmedicin), regional societies
   - UK → NICE, SIGN, Royal Colleges (RCP, RCGP), NHS trusts
   - USA → CDC, AHA/ACC, IDSA, specialty-specific societies, state departments
   - France → HAS (Haute Autorité de Santé), ANSM, specialty societies
   - Germany → AWMF, DGIM, specialty societies (DGK for cardiology)
   - Spain → SEMI, AEP, regional health services
   - Global fallback → WHO + one major continental society
3. **URL Format**: Use DOI when available, official URLs only (no fictional links)
4. **Year Validation**: Use 2020-2025 for recent guidelines (avoid outdated citations)
5. **Avoid Placeholders**: NEVER output "Copenhagen" for non-Danish cases or generic "University Hospital"

**Reference Format:**
- "[Society Year] Title - DOI/URL" 
- Example: "[ESC 2023] Acute coronary syndromes without persistent ST-segment elevation - https://doi.org/10.1093/eurheartj/ehad191"
- If no URL: "Society (Year): Title, Recommendation Class I-A"

**Minimum Requirements:**
- At least ONE guideline from tiers 2-3 (regional/national)
- At least ONE from tier 4 (continental)
- At least ONE tier 5 (international) for global consistency
- Total: 3-5 references per case (avoid reference overload)

Auto-generate comparative test data dynamically:
- Test performance: sensitivity/specificity % for key diagnostics (e.g., "Troponin I: 89% sens, 95% spec for AMI at 6h")
- Comparative modality effectiveness (e.g., "CT 95% sens vs MRI 99% sens for ICH, but CT faster")
- Include prognostic data (mortality %, 5-year survival, functional outcome scores)

Ensure at least ONE guideline from EACH tier when available for ${region}

**Teaching & Learning (MANDATORY Conference-Style Debate):**
- ≥2 diagnostic pearls (specific clinical insights, not generic advice)
- ≥1 common pitfall or missed diagnosis with clinical consequence
- ≥2 reflection questions:
  - One clinical reasoning question (differential diagnosis logic)
  - One management decision question (treatment choice or timing)
- ≥2 learning objectives (what the learner should master from this case)
- 1 mnemonic with clinical application context (when to use it, what it helps remember)
- Connection to broader medical principles (e.g., shock physiology, acid-base, homeostasis)

**Conference Review Panel (Multidisciplinary Dynamic Debate - MANDATORY):**
Simulate an authentic hospital conference with specialty-based roles and cross-disciplinary tension:

**Identity Model:**
- NO generic names (Dr. Smith/Johnson/Lee)
- Use **specialty-specific roles** that match the case context:
  * Emergency/Acute: Emergency Physician, Intensivist, Trauma Surgeon
  * Chronic/Complex: Geriatrician, Internist, Hospitalist, Clinical Pharmacist
  * Imaging/Diagnostics: Radiologist, Pathologist, Lab Medicine Specialist
  * Specialty-specific: Cardiologist, Neurologist, Nephrologist, Gastroenterologist, etc.
- Select 3-5 roles relevant to the clinical scenario (e.g., UTI + confusion → Emergency Physician + Geriatrician + Clinical Pharmacist)

**Dialogue Structure (Mandatory 3 Rounds):**
1. **Moderator Introduction:** 
   - Patient summary (age, key findings)
   - Framing question for debate (e.g., "Should we obtain CT angiography now or defer?")

2. **Discussion Rounds (3-5 participants):**
   - Each speaker identified by **role only** (not name)
   - Explicit stance: "Agree", "Disagree", "Partial agreement"
   - Argument with **why/when/how** reasoning (not just "what")
   - **At least 2 participants must disagree** with clear rebuttal language:
     * "I disagree with the Emergency Physician because..."
     * "The Radiologist raises a valid concern, but..."
     * "I partially agree, however..."
   - Regional-anchored citations (local → national → international):
     * **CRITICAL**: References must match BOTH the region AND the specific topic/specialty
     * First citation must be **authentic local/regional** for ${region} and ${topic}:
       - If Denmark: Sundhedsstyrelsen, regional hospital protocols, Danish specialty societies
       - If UK: NICE, SIGN, NHS England/Scotland/Wales, Royal Colleges
       - If USA: CDC, state health departments, AHA/ACC, specialty societies
       - If EU: National guidelines (e.g., Germany: DGIM, France: HAS, Spain: SEMI)
       - **NEVER use Copenhagen/Danish examples for non-Danish regions**
     * Then continental (ESC for Europe, ACC for North America, APCCM for Asia-Pacific)
     * Then international (WHO, Cochrane, major society joint guidelines)
     * **Validation**: Each reference must be real, verifiable, and topic-specific (not generic hospital names)

3. **Moderator Summary:**
   - Synthesize agreement AND disagreement
   - Note differing clinical thresholds or risk tolerances
   - Bridge to unified recommendation

4. **Panel Consensus:**
   - Multi-sentence actionable plan
   - Link back to management steps (timing, monitoring, escalation criteria)
   - Reference specific local/national guidelines used
   - Include "if-then" logic (e.g., "If confusion persists after 24h, repeat CT")

**Emotional Realism & Clinical Nuance:**
- Vary tone: urgency for acute cases, deliberation for complex chronic
- Include uncertainty markers ("likely", "probably", "may need to")
- Show differing thresholds (conservative vs aggressive)
- Cross-specialty perspectives (e.g., Radiologist: "imaging first", Geriatrician: "functional assessment first")

**Prohibited Patterns:**
- Generic doctor names detached from specialty
- Uniform agreement without tension
- Vague consensus ("monitor closely" without specifics)
- Missing local guideline citations
- Single-round commentary (must be multi-round exchange)
- REALISM: Avoid parallel monologues — create actual back-and-forth debate with natural medical disagreement

**Language & Tone:**
- Professional but readable for mixed levels (students to specialists)
- Define medical jargon when first used
- Use patient-centered narrative with realistic details (occupation, family, living situation)
- Maintain clinical precision without sacrificing clarity

**Cultural/Regional Adaptation:**
- Units: ${region === 'US' ? 'Fahrenheit, pounds, inches' : 'Celsius, kilograms, centimeters'}
- Drug names: region-appropriate (generic + local brand if relevant)
- Guidelines (AUTO-SELECT based on region):
  * ${region === 'US' ? '🇺🇸 US: AHA (Cardiology), ACC (Cardiac), ACEP (Emergency), ATS (Respiratory), IDSA (Infectious Disease), ADA (Diabetes)' : ''}
  * ${region === 'EU/DK' ? '🇪🇺 EU/DK: ESC (Cardiology), NICE (UK), NNBV (Denmark), ERS (Respiratory), ESCMID (Infectious Disease), EASD (Diabetes)' : ''}
  * ${region === 'UK' ? '🇬🇧 UK: NICE (National), BTS (Respiratory), BCS (Cardiac), RCOG (Obstetrics), SIGN (Scotland)' : ''}
  * ${region === 'CA' ? '🇨🇦 Canada: CCS (Cardiology), CTS (Respiratory), IDSA (Infectious Disease), Diabetes Canada' : ''}
  * ${!['US', 'EU/DK', 'UK', 'CA'].includes(region) ? '🌍 International: WHO, ESC, AHA (consensus guidelines)' : ''}
- Cite specific guideline year (2020-2024) and recommendation class when available
- Reference local formulary restrictions if known (e.g., Denmark PBS, UK BNF)

⚙️ TECHNICAL CONSTRAINTS:
- NO empty fields, NO placeholders ("etc.", "...", "TBD")
- NO conflicting findings (e.g., hypotension + warm extremities without explanation)
- ALL numeric values must include UNITS and be physiologically realistic
- Clinical scores when relevant (NIHSS, Killip, SOFA, CHA₂DS₂-VASc, Wells, PERC, CURB-65, etc.)
- Include mild or borderline findings for realism (not every value at extremes)

🔬 DYNAMIC VALIDATION (Self-check before returning):
EVERY case must score ≥0.95 across these criteria:
- Completeness: 100% (all 15 sections filled with realistic content, no empty fields)
- Clinical Accuracy: ≥95% (numeric values correct, no physiological contradictions)
- Guideline Adherence: ≥95% (region-appropriate, evidence-based, cited guidelines)
- Pathophysiology Depth: ≥95% (molecular → clinical flow with disease classification, hemodynamic/structural consequences)
- Educational Value: ≥95% (≥2 pearls, ≥2 reflection questions, ≥2 learning objectives)

This validation applies DYNAMICALLY to ALL topics — adapt the pattern, not hardcoded examples.

🏗️ STRUCTURE (15 mandatory sections):
Generate a comprehensive case for: "${topic}"

Language: ${lang}
Region: ${region}
Demographics: Age-appropriate presentation

1. **Meta** – topic, language, region, demographics (realistic age/sex for condition), setting, timing
2. **Timeline** – onset, presentation_time, evolution (hour-by-hour for acute, day-by-day for chronic)
3. **History** – comprehensive narrative including functional status, adherence, social context, recent tests
4. **Examination** – complete vitals (once), general appearance, cardiovascular, respiratory, neuro, GI, skin (as relevant), hemodynamic profile
5. **Paraclinical** – labs with values and interpretation, imaging findings, test kinetics, timing rationale
6. **Differentials** – ≥3 diagnoses with status (accepted/rejected/open), for/against reasoning, confidence
7. **Red Flags** – time-critical findings + specific actions + rationale for urgency
8. **Final Diagnosis** – name + comprehensive rationale linking history/exam/labs
9. **Pathophysiology** – classification system (Stanford/DeBakey/NYHA/etc.) + molecular mechanism → cellular → organ → clinical + hemodynamic/structural consequences
10. **Etiology** – underlying cause (genetic, acquired, environmental, multifactorial)
11. **Management** – immediate (first hour), escalation (if wrong dx), timing windows with evidence levels, region-specific guidelines with URLs/DOIs (NO hardcoded alternatives)
12. **Disposition** – admit/discharge, unit (ICU/ward/home), follow-up plan, social needs assessment
13. **Evidence** – hierarchical guidelines (local → regional → national → continental → international with URLs), test performance (sensitivity/specificity %), prognostic data
14. **Teaching** – ≥3 pearls, ≥1 pitfall, ≥2 reflection questions, ≥2 learning objectives, mnemonics, broader principle
15. **Panel Discussion** – Conference-style academic debate with specialist viewpoints, for/against arguments, confidence scores, evidence citations, consensus

📊 QUALITY TARGETS (Self-check before returning):
- Completeness: 100% (all 15 sections filled)
- Clinical Accuracy: ≥95% (realistic values, logical consistency)
- Guideline Adherence: ≥95% (region-appropriate, evidence-based)
- Pathophysiology Depth: ≥95% (molecular → clinical mechanism with cross-system effects)
- Educational Value: ≥95% (≥2 pearls, ≥2 reflection questions, ≥2 learning objectives, mnemonics)

🚫 ABSOLUTE PROHIBITIONS:
- Empty or placeholder sections
- Duplicate vital signs across sections
- Impossible physiological combinations
- Generic teaching points ("monitor closely", "follow guidelines")
- Missing test values or vague findings ("abnormal labs")
- Hardcoded content for specific diagnoses (use pattern-based logic that adapts to ANY topic)
- Numeric values without units (always specify °C/°F, mmHg, bpm, mg/dL, etc.)

Language: ${lang}
Region: ${region}
Units: ${region === 'US' ? 'Fahrenheit, pounds, inches' : 'Celsius, kilograms, centimeters'}
Generator Version: professor_v2
Target Quality: ≥0.95 (95-100% across all criteria)

Return ONLY valid JSON matching this exact structure:
{
  "meta": {
    "topic": "${topic}",
    "language": "${lang}",
    "region": "${region}",
    "demographics": {"age": 0, "sex": ""},
    "geography_of_living": "",
    "reviewed_by_internal_panel": false,
    "generator_version": "professor_v2",
    "quality_estimate": 0.95
  },
  "timeline": {
    "onset": "",
    "presentation_time": "",
    "evolution": ""
  },
  "history": {
    "presenting_complaint": "",
    "onset_duration_severity": "",
    "context_triggers": "",
    "post_event": "",
    "past_medical_history": [],
    "medications_current": [],
    "allergies": []
  },
  "exam": {
    "vitals": {"temp": "", "temp_unit": "${region === 'US' ? 'F' : 'C'}", "bp": "", "hr": "", "rr": "", "spo2": ""},
    "orthostatics": {},
    "general": "",
    "cardiorespiratory": "",
    "hemodynamic_profile": "",
    "pain_distress": ""
  },
  "paraclinical": {
    "labs": [],
    "ecg": "",
    "imaging": [{"modality": "", "timing": "", "rationale": ""}],
    "other_tests": [],
    "test_kinetics": [{"test": "", "timing_relation": "", "notes": ""}]
  },
  "differentials": [
    {"name": "", "status": "ACCEPTED|REJECTED|KEEP_OPEN", "why_for": "", "why_against": ""}
  ],
  "red_flags": [{"flag": "", "significance": "", "action_needed": ""}],
  "final_diagnosis": {"name": "", "rationale": ""},
  "pathophysiology": {
    "classification": "",
    "molecular_mechanism": "",
    "cellular_dysfunction": "",
    "organ_system_effects": "",
    "clinical_manifestations": "",
    "hemodynamic_structural_consequences": ""
  },
  "etiology": {"underlying_cause": ""},
  "management": {
    "immediate": [
      {
        "action": "Example: Aspirin 300mg PO STAT",
        "dose_route": "300mg PO",
        "timing": "Immediate (within 10 minutes)",
        "evidence_level": "Class I, Level A",
        "guideline": "ESC STEMI Guidelines 2023",
        "url": "https://doi.org/10.1093/eurheartj/ehad123",
        "rationale": "Inhibits platelet aggregation, reduces mortality by 23% in ACS"
      }
    ],
    "escalation_if_wrong_dx": [],
    "region_guidelines": [{"society": "", "year": "", "applies_to": "", "note": "", "url": ""}],
    "timing_windows": [{"action": "", "window": "", "rationale": "", "evidence_level": "", "guideline_source": ""}]
  },
  "disposition": {
    "admit_vs_discharge": "",
    "unit": "",
    "follow_up": "",
    "social_needs": ""
  },
  "evidence": {
    "prevalence": "",
    "incidence": "",
    "key_tests": [{"test": "", "sensitivity": "", "specificity": "", "notes": ""}],
    "prognosis": "",
    "guidelines": [{"tier": "local|regional|national|continental|international", "society": "", "year": "", "title": "", "url_or_doi": "", "recommendation": ""}]
  },
  "teaching": {
    "pearls": ["", "", ""],
    "pitfall": "",
    "reflection_questions": ["", ""],
    "learning_objectives": ["", ""],
    "mnemonics": [{"acronym": "", "meaning": "", "clinical_use": ""}],
    "broader_principle": ""
  },
  "panel_discussion": {
    "moderator_intro": "",
    "discussion_rounds": [
      {"speaker": "", "specialty": "", "stance": "", "argument": "", "evidence_cited": "", "counter_to": ""}
    ],
    "points_of_debate": [{"issue": "", "position_a": "", "position_b": "", "clinical_impact": ""}],
    "moderator_summary": "",
    "panel_consensus": ""
  }
}`;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate a complete, advanced clinical case for "${topic}". Include all required fields with realistic, detailed content.` },
      ],
      temperature: 0.7, // Balanced for quality + creativity
      top_p: 0.9, // Focus on high-probability tokens for accuracy
    });

    // Normalize response text across SDK shapes
    const text = response?.choices?.[0]?.message?.content ?? response?.choices?.[0]?.text ?? JSON.stringify(response);

    // Try to extract a JSON object from the model text (handles fences/prefixes)
    const extracted = extractJSON(text);
    if (extracted) {
      // Add generator metadata programmatically
      if (!extracted.meta) extracted.meta = {};
      extracted.meta.generator_version = 'professor_v3';
      extracted.meta.quality_estimate = 0.95;
      
      // Validate panel discussion structure (≥3 discussion rounds required)
      if (extracted.panel_discussion || extracted.Expert_Panel_and_Teaching) {
        const panel = extracted.panel_discussion || extracted.Expert_Panel_and_Teaching;
        const rounds = panel.discussion_rounds || [];
        
        // Minimum rounds check
        if (rounds.length < 3) {
          console.warn(`⚠️ Panel discussion has only ${rounds.length} rounds, minimum 3 required`);
          extracted.meta.quality_estimate = 0.85;
        }
        
        // Cross-specialty tension check (at least 2 disagreements required)
        const disagreements = rounds.filter(r => 
          r.stance?.toLowerCase().includes('disagree') || 
          r.counter_to || 
          r.argument?.toLowerCase().includes('disagree') ||
          r.argument?.toLowerCase().includes('however')
        );
        
        if (disagreements.length < 2) {
          console.warn(`⚠️ Panel discussion lacks cross-specialty tension (only ${disagreements.length} disagreements, need ≥2)`);
          extracted.meta.quality_estimate = Math.min(extracted.meta.quality_estimate, 0.88);
          extracted.meta.debate_balance = 'low';
        } else {
          extracted.meta.debate_balance = 'good';
        }
        
        // Moderator summary check
        if (!panel.moderator_summary) {
          console.warn('⚠️ Panel discussion missing moderator_summary');
          extracted.meta.quality_estimate = Math.min(extracted.meta.quality_estimate, 0.90);
        }
        
        // Actionable consensus check
        if (!panel.panel_consensus && !panel.consensus) {
          console.warn('⚠️ Panel discussion missing panel_consensus');
          extracted.meta.quality_estimate = Math.min(extracted.meta.quality_estimate, 0.90);
        } else {
          const consensus = panel.panel_consensus || panel.consensus;
          if (consensus.length < 100) {
            console.warn('⚠️ Panel consensus too brief (should be multi-sentence actionable plan)');
            extracted.meta.consensus_clarity = 'low';
          } else {
            extracted.meta.consensus_clarity = 'good';
          }
        }
        
        // Specialty diversity check
        const specialties = new Set(rounds.map(r => r.specialty || r.speaker || '').filter(Boolean));
        if (specialties.size < 3) {
          console.warn(`⚠️ Panel lacks specialty diversity (only ${specialties.size} different roles)`);
          extracted.meta.quality_estimate = Math.min(extracted.meta.quality_estimate, 0.92);
        }
        
        // Reference validation check
        const validateReferences = (caseData, region) => {
          const references = [];
          const warnings = [];
          
          // Extract references from various fields
          const discussionText = JSON.stringify(panel.discussion_rounds || []);
          const consensusText = panel.panel_consensus || panel.consensus || '';
          const allText = discussionText + consensusText + JSON.stringify(caseData.management || {});
          
          // URL validation regex (https only, valid domains)
          const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&\/=]*)/gi;
          const urls = allText.match(urlPattern) || [];
          
          // Check for Copenhagen/Danish references in non-Danish regions
          const regionLower = (region || '').toLowerCase();
          const isDanish = regionLower.includes('denmark') || regionLower.includes('danish') || regionLower.includes('dk');
          
          if (!isDanish) {
            const danishPatterns = /(copenhagen|danish|sundhedsstyrelsen|rigshospitalet|danmark)/i;
            if (danishPatterns.test(allText)) {
              warnings.push('⚠️ Found Danish-specific references in non-Danish region');
              extracted.meta.reference_accuracy = 'low';
            }
          }
          
          // Validate URLs are HTTPS
          const httpUrls = urls.filter(u => u.startsWith('http://'));
          if (httpUrls.length > 0) {
            warnings.push(`⚠️ Found ${httpUrls.length} non-HTTPS URLs (should use https://)`);
          }
          
          // Check for reference diversity (should have local + continental + international)
          const hasLocal = /(sundhedsstyrelsen|nice|cdc|has|awmf|nhs)/i.test(allText);
          const hasContinental = /(esc|acc|aha|apccm|ccs)/i.test(allText);
          const hasInternational = /(who|cochrane)/i.test(allText);
          
          if (!hasLocal && !hasContinental && !hasInternational) {
            warnings.push('⚠️ No recognizable guideline references found');
            extracted.meta.reference_completeness = 'low';
          } else if (hasLocal && hasContinental && hasInternational) {
            extracted.meta.reference_completeness = 'excellent';
          } else {
            extracted.meta.reference_completeness = 'partial';
          }
          
          return { references: urls, warnings };
        };
        
        const refValidation = validateReferences(extracted, region);
        if (refValidation.warnings.length > 0) {
          refValidation.warnings.forEach(w => console.warn(w));
        }
      }
      
      // 🧠 Phase 7 M4: Auto-link medical terms for tooltips
      try {
        // Auto-link terms in presentation, history, and exam fields
        const fieldsToLink = ['presentation', 'history', 'exam'];
        const linkedData = {};
        
        for (const field of fieldsToLink) {
          if (extracted[field]) {
            const linkResult = await glossaryService.autoLinkTerms(extracted[field], {
              language: lang,
              includeCommon: true
            });
            linkedData[`${field}_linked`] = linkResult;
          }
        }
        
        // Add linked data to case metadata
        extracted.glossary_links = linkedData;
        
        console.log(`✅ Auto-linked medical terms: ${Object.values(linkedData).reduce((sum, d) => sum + d.linked_count, 0)} terms found`);
      } catch (glossaryError) {
        console.warn('⚠️ Glossary auto-linking failed:', glossaryError.message);
        // Non-critical - case can still be used without tooltips
      }
      
      return extracted;
    }

    console.warn('generateClinicalCase: OpenAI returned non-JSON, returning fallback structure');
    return {
      meta: { topic, language: lang, region },
      history: String(text),
      exam: '',
      labs: '',
      imaging: '',
      diagnosis: '',
      discussion: '',
    };
  } catch (err) {
    // Network/auth/parsing errors should not crash the endpoint — log and return a stable fallback
    console.error('⚠️ OpenAI error or parse failure:', err && err.message ? err.message : String(err));
    return {
      ok: false,
      error: err && err.message ? err.message : String(err),
      case: {
        meta: { topic },
        history: 'stub (OpenAI call failed or invalid JSON)',
        exam: '',
        labs: '',
        imaging: '',
        diagnosis: '',
        discussion: '',
      },
    };
  }
}

// Backwards compatible default export
export default generateClinicalCase;
