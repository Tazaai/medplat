// Specialty-Light Domain Nuance Module
// Enhances reasoning and teaching quality for "light domains"
// Universal, domain-triggered - NO hardcoded diagnoses

/**
 * Apply light specialty nuance for non-high-acuity domains
 * @param {Array<string>} domains - Detected domains
 * @param {Object} finalCase - Final case data
 * @returns {Object} Case with light specialty nuance applied
 */
export function applyLightSpecialtyNuance(domains, finalCase) {
  const nuanced = JSON.parse(JSON.stringify(finalCase));
  const domainSet = new Set(domains);
  
  // Dermatology nuance
  if (domainSet.has("dermatology")) {
    nuanced.meta.dermatology_light_nuance = {
      teaching_pearls: [
        "Primary vs secondary skin lesions: morphology guides diagnosis",
        "Distribution pattern (flexural, extensor, generalized) is key to differential",
        "History of triggers (allergens, medications, infections) essential"
      ],
      common_pitfalls: [
        "Avoid treating all rashes as allergic without considering infectious causes",
        "Don't miss systemic diseases presenting with skin findings (vasculitis, connective tissue disorders)"
      ],
      differential_branches: [
        "Inflammatory: eczema, psoriasis, contact dermatitis",
        "Infectious: bacterial (impetigo, cellulitis), viral (herpes, varicella), fungal (tinea)",
        "Autoimmune: pemphigus, bullous pemphigoid, vasculitis",
        "Systemic: drug reactions, connective tissue disease"
      ],
      decision_algorithm: "1) Identify lesion type (macule, papule, vesicle, bulla), 2) Assess distribution, 3) Review history for triggers, 4) Consider systemic symptoms, 5) Order targeted tests if needed",
      lab_imaging_reasoning: "Skin biopsy for definitive diagnosis in unclear cases. Dermoscopy for pigmented lesions. Blood work if systemic disease suspected.",
      cross_domain_links: "Consider endocrine (diabetes, thyroid), infectious (HIV, hepatitis), and autoimmune connections"
    };
    
    if (!nuanced.common_pitfalls || nuanced.common_pitfalls.trim() === '') {
      nuanced.common_pitfalls = nuanced.meta.dermatology_light_nuance.common_pitfalls.join("; ");
    }
  }
  
  // Hematology nuance
  if (domainSet.has("hematology")) {
    nuanced.meta.hematology_light_nuance = {
      teaching_pearls: [
        "Complete blood count (CBC) with differential is the cornerstone of hematologic diagnosis",
        "Peripheral smear morphology often provides diagnostic clues",
        "Bone marrow examination when cytopenias are unexplained"
      ],
      common_pitfalls: [
        "Don't ignore isolated cytopenias - may indicate serious underlying disease",
        "Avoid attributing all anemia to iron deficiency without confirming"
      ],
      differential_branches: [
        "Anemia: microcytic (iron deficiency, thalassemia), normocytic (hemolytic, chronic disease), macrocytic (B12/folate deficiency, MDS)",
        "Leukocytosis: infection, inflammation, malignancy, stress response",
        "Thrombocytopenia: immune (ITP), consumptive (DIC), production failure (bone marrow disorders)",
        "Pancytopenia: bone marrow failure, infiltrative disease, severe B12/folate deficiency"
      ],
      decision_algorithm: "1) Review CBC with differential, 2) Examine peripheral smear, 3) Assess reticulocyte count, 4) Consider iron studies/B12/folate, 5) Bone marrow if indicated",
      lab_imaging_reasoning: "Peripheral smear essential. Iron studies for microcytic anemia. B12/folate for macrocytic. Bone marrow biopsy for pancytopenia or suspected malignancy.",
      cross_domain_links: "Consider nutritional deficiencies, autoimmune conditions, infections (HIV, hepatitis), and solid organ malignancies"
    };
  }
  
  // Psychiatry (non-acute) nuance
  if (domainSet.has("psychiatry") && !nuanced.meta?.high_acuity?.is_high_acuity) {
    nuanced.meta.psychiatry_light_nuance = {
      teaching_pearls: [
        "Psychiatric diagnosis requires ruling out medical/neurological causes",
        "Substance use history is critical - many psychiatric presentations are substance-related",
        "Functional assessment (ADLs, work, relationships) guides treatment intensity"
      ],
      common_pitfalls: [
        "Don't diagnose primary psychiatric illness without excluding medical causes (thyroid, B12, infections)",
        "Avoid polypharmacy - start with one medication, assess response before adding others"
      ],
      differential_branches: [
        "Primary psychiatric: mood disorders, anxiety disorders, psychotic disorders, personality disorders",
        "Medical mimics: thyroid disorders, vitamin deficiencies, infections, neurological conditions",
        "Substance-related: intoxication, withdrawal, substance-induced disorders",
        "Adjustment disorders: stress-related, time-limited"
      ],
      decision_algorithm: "1) Rule out medical causes (labs, imaging if indicated), 2) Assess substance use, 3) Evaluate functional impairment, 4) Consider psychotherapy vs pharmacotherapy, 5) Monitor response",
      lab_imaging_reasoning: "Basic labs (CBC, CMP, TSH, B12) to rule out medical causes. Neuroimaging only if neurological signs present. Drug screening if substance use suspected.",
      cross_domain_links: "Consider endocrine (thyroid), neurological (seizures, dementia), infectious (HIV, syphilis), and substance use connections"
    };
  }
  
  // Endocrine mild cases nuance
  if (domainSet.has("endocrine") && nuanced.meta?.severity_grade && !nuanced.meta.severity_grade.toLowerCase().includes("severe")) {
    nuanced.meta.endocrine_light_nuance = {
      teaching_pearls: [
        "Endocrine disorders often present with non-specific symptoms",
        "Hormone levels must be interpreted in clinical context (timing, medications, stress)",
        "Screening vs diagnostic testing - know when each is appropriate"
      ],
      common_pitfalls: [
        "Don't treat abnormal labs without clinical correlation",
        "Avoid missing secondary causes of endocrine dysfunction"
      ],
      differential_branches: [
        "Thyroid: hyperthyroidism, hypothyroidism, thyroiditis, nodules",
        "Diabetes: type 1, type 2, prediabetes, gestational",
        "Adrenal: Cushing's, Addison's, pheochromocytoma",
        "Pituitary: adenomas, hypopituitarism, hyperprolactinemia"
      ],
      decision_algorithm: "1) Clinical suspicion based on symptoms, 2) Order appropriate hormone levels, 3) Consider dynamic testing if needed, 4) Assess for secondary causes, 5) Initiate treatment if indicated",
      lab_imaging_reasoning: "Hormone levels (TSH, free T4, cortisol, glucose, HbA1c). Imaging (ultrasound for thyroid, CT/MRI for pituitary/adrenal) if mass suspected.",
      cross_domain_links: "Consider cardiovascular (thyroid heart disease), neurological (pituitary tumors), autoimmune (Hashimoto's, Graves'), and metabolic connections"
    };
  }
  
  // Nephrology mild cases nuance
  if (domainSet.has("renal") && nuanced.meta?.severity_grade && !nuanced.meta.severity_grade.toLowerCase().includes("severe")) {
    nuanced.meta.nephrology_light_nuance = {
      teaching_pearls: [
        "Urinalysis is the cornerstone of nephrology diagnosis",
        "Serum creatinine and eGFR guide chronic kidney disease staging",
        "Proteinuria quantification (spot vs 24-hour) affects management"
      ],
      common_pitfalls: [
        "Don't ignore asymptomatic proteinuria or hematuria",
        "Avoid attributing all kidney disease to diabetes/hypertension without workup"
      ],
      differential_branches: [
        "Acute kidney injury: prerenal (volume depletion), intrinsic (ATN, glomerulonephritis), postrenal (obstruction)",
        "Chronic kidney disease: diabetes, hypertension, glomerular disease, polycystic kidney disease",
        "Glomerular disease: nephrotic (minimal change, FSGS), nephritic (IgA, post-infectious)",
        "Tubular disorders: RTA, Fanconi syndrome"
      ],
      decision_algorithm: "1) Assess volume status, 2) Review urinalysis, 3) Calculate eGFR, 4) Quantify proteinuria, 5) Consider kidney biopsy if indicated",
      lab_imaging_reasoning: "Urinalysis essential. Serum creatinine, eGFR, electrolytes. 24-hour urine for protein/creatinine clearance. Renal ultrasound for structure. Biopsy for glomerular disease.",
      cross_domain_links: "Consider cardiovascular (hypertension, heart failure), endocrine (diabetes), autoimmune (SLE, vasculitis), and infectious (post-streptococcal) connections"
    };
  }
  
  return nuanced;
}

