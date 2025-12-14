// Specialty-Nuance Layer - Adds domain-specific high-acuity details
// Universal, domain-triggered - NO hardcoded diagnoses

/**
 * Apply specialty-level nuance for high-acuity domains
 * @param {Array<string>} domains - Detected domains
 * @param {Object} finalCase - Final case data
 * @returns {Object} Case with specialty nuance applied
 */
export function applySpecialtyNuance(domains, finalCase) {
  const nuanced = JSON.parse(JSON.stringify(finalCase));
  const domainSet = new Set(domains);
  
  // Neurology nuance
  if (domainSet.has("neurology")) {
    nuanced.meta.neurology_nuance = {
      stroke_algorithm: "ESO (European Stroke Organisation) stroke algorithm",
      tpa_decision: "tPA/tenecteplase decision based on: time window, contraindications, NIHSS score",
      bp_targets: "BP targets: <185/110 for tPA eligibility, <220/120 for non-tPA",
      nihss_integration: "NIHSS score guides severity assessment and treatment decisions"
    };
    
    if (!nuanced.management.stroke_protocol) {
      nuanced.management.stroke_protocol = "Follow ESO stroke protocol: time-based management, imaging-based decisions, tPA/mechanical thrombectomy when indicated";
    }
  }
  
  // OB/GYN nuance
  if (domainSet.has("obgyn")) {
    nuanced.meta.obgyn_nuance = {
      acog_variation: "ACOG guidelines vary by trimester: early pregnancy (<20 weeks) vs late pregnancy (≥20 weeks)",
      hemorrhage_scoring: "Hemorrhage scoring: Class I-IV based on blood loss and hemodynamic status",
      ectopic_risk: "Ectopic pregnancy risk scoring: risk factors, β-hCG levels, ultrasound findings",
      ultrasound_fallback: "In LMIC settings: clinical diagnosis and β-hCG trends when ultrasound unavailable"
    };
    
    if (!nuanced.management.obstetric_protocol) {
      nuanced.management.obstetric_protocol = "Follow ACOG protocols: maternal resuscitation priority, fetal monitoring when stable, consider gestational age";
    }
  }
  
  // Toxicology nuance
  if (domainSet.has("toxicology")) {
    nuanced.meta.toxicology_nuance = {
      toxidrome_recognition: "Recognize toxidromes: anticholinergic, cholinergic, opioid, sympathomimetic, sedative-hypnotic",
      antidote_escalation: "Antidote escalation: naloxone for opioids, flumazenil for benzodiazepines (if indicated), atropine for organophosphates",
      airway_protection: "Airway protection rules: GCS <8, respiratory depression, inability to protect airway → intubation",
      agitation_balance: "Agitation vs sedation balance: avoid over-sedation, use restraints only when necessary, monitor for withdrawal"
    };
    
    if (!nuanced.management.toxicology_protocol) {
      nuanced.management.toxicology_protocol = "Toxicology protocol: decontamination, supportive care, specific antidotes, monitoring for complications";
    }
  }
  
  // Trauma nuance
  if (domainSet.has("trauma")) {
    nuanced.meta.trauma_nuance = {
      atls_survey: "ATLS primary survey: ABCDE (Airway, Breathing, Circulation, Disability, Exposure)",
      secondary_survey: "ATLS secondary survey: head-to-toe examination after primary stabilization",
      shock_classification: "Shock classification: Class I-IV based on blood loss percentage and hemodynamic response",
      mechanism_red_flags: "Mechanism-specific red flags: high-energy trauma, penetrating injury, falls >6 feet, motor vehicle accidents"
    };
    
    if (!nuanced.management.trauma_protocol) {
      nuanced.management.trauma_protocol = "ATLS protocol: primary survey, resuscitation, secondary survey, definitive care";
    }
  }
  
  // Infectious Disease nuance
  if (domainSet.has("infectious")) {
    nuanced.meta.infectious_nuance = {
      surviving_sepsis: "Surviving Sepsis Campaign guidelines: 1-hour bundle, early antibiotics, fluid resuscitation",
      lmic_sepsis_fallback: "LMIC sepsis fallback: clinical diagnosis when cultures unavailable, WHO Essential Medicines antibiotics",
      qsofa_scoring: "qSOFA scoring: altered mental status, SBP ≤100, RR ≥22 (≥2 = high risk)",
      sirs_criteria: "SIRS criteria: temperature, heart rate, respiratory rate, WBC (≥2 = SIRS)"
    };
    
    if (!nuanced.management.sepsis_protocol) {
      nuanced.management.sepsis_protocol = "Sepsis protocol: early recognition, source control, antibiotics, fluid resuscitation, vasopressors if needed";
    }
  }
  
  // Pulmonary/ARDS nuance
  if (domainSet.has("respiratory")) {
    nuanced.meta.respiratory_nuance = {
      berlin_definition: "ARDS Berlin definition: acute onset, bilateral infiltrates, not fully explained by cardiac failure, P/F ratio classification",
      ventilatory_strategies: "Ventilatory strategies: low tidal volume (6ml/kg), PEEP titration, prone positioning if severe",
      oxygenation_algorithm: "High-acuity oxygenation algorithm: nasal cannula → high-flow → CPAP/BiPAP → mechanical ventilation"
    };
    
    if (!nuanced.management.respiratory_protocol) {
      nuanced.management.respiratory_protocol = "Respiratory protocol: oxygen therapy, bronchodilators if indicated, consider mechanical ventilation if severe";
    }
  }
  
  // Cardiology nuance
  if (domainSet.has("cardiology")) {
    nuanced.meta.cardiology_nuance = {
      grace_timi_integration: "GRACE/TIMI risk scores guide management intensity and predict outcomes",
      vt_vs_svt: "VT vs SVT differentiation: wide vs narrow QRS, regularity, response to adenosine",
      hemodynamic_stability: "Hemodynamic stability logic: stable → medical management, unstable → cardioversion/defibrillation"
    };
    
    if (!nuanced.management.cardiac_protocol) {
      nuanced.management.cardiac_protocol = "Cardiac protocol: assess stability, apply risk scores, initiate appropriate antiplatelet/anticoagulation, consider revascularization";
    }
  }
  
  return nuanced;
}

