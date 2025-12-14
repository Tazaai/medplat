/**
 * Clinical Annotations Utility
 * Provides normal ranges and status tags for vitals and labs without API calls.
 * Frontend-only post-processing for improved clinical readability.
 */

/**
 * Annotate a vital sign with normal range and status
 * @param {string} name - Vital sign name (e.g., 'heart_rate', 'hr', 'blood_pressure')
 * @param {string} rawValue - Raw value string (e.g., '110 bpm', '120/80 mmHg')
 * @param {number|null} ageYearsOrNull - Patient age in years, or null if unknown
 * @returns {{display: string, status: 'normal'|'high'|'low'|'unknown'}}
 */
export function annotateVital(name, rawValue, ageYearsOrNull) {
  if (!name || !rawValue) {
    return { display: rawValue || '', status: 'unknown' };
  }

  // Age guard: only apply ranges if age between 16 and 75
  if (ageYearsOrNull !== null && (ageYearsOrNull < 16 || ageYearsOrNull > 75)) {
    return { display: rawValue, status: 'unknown' };
  }

  const nameLower = name.toLowerCase().replace(/_/g, '');
  const valueStr = String(rawValue).trim();

  // Extract leading numeric value (ignore units)
  const numericMatch = valueStr.match(/^(\d+\.?\d*)/);
  if (!numericMatch) {
    return { display: rawValue, status: 'unknown' };
  }

  const numericValue = parseFloat(numericMatch[1]);

  // Heart Rate / HR
  if (nameLower.includes('heartrate') || nameLower.includes('hr') || nameLower === 'heartrate') {
    const normalMin = 60;
    const normalMax = 100;
    let status = 'normal';
    if (numericValue < normalMin) status = 'low';
    else if (numericValue > normalMax) status = 'high';
    return {
      display: `${valueStr} (N ${normalMin}–${normalMax}, ${status})`,
      status
    };
  }
  
  // Respiratory Rate / RR
  if (nameLower.includes('respiratoryrate') || nameLower.includes('rr') || nameLower === 'respiratoryrate') {
    const normalMin = 12;
    const normalMax = 20;
    let status = 'normal';
    if (numericValue < normalMin) status = 'low';
    else if (numericValue > normalMax) status = 'high';
    return {
      display: `${valueStr} (N ${normalMin}–${normalMax}, ${status})`,
      status
    };
  }
  
  // Blood Pressure (systolic/diastolic)
  if (nameLower.includes('bloodpressure') || nameLower.includes('bp') || nameLower === 'bloodpressure') {
    // Try to parse systolic/diastolic (e.g., "120/80", "120/80 mmHg")
    const bpMatch = valueStr.match(/(\d+)\s*[/-]\s*(\d+)/);
    if (bpMatch) {
      const systolic = parseInt(bpMatch[1]);
      const diastolic = parseInt(bpMatch[2]);
      const sysNormalMin = 90;
      const sysNormalMax = 140;
      const diaNormalMin = 60;
      const diaNormalMax = 90;
      
      let sysStatus = 'normal';
      if (systolic < sysNormalMin) sysStatus = 'low';
      else if (systolic > sysNormalMax) sysStatus = 'high';
      
      let diaStatus = 'normal';
      if (diastolic < diaNormalMin) diaStatus = 'low';
      else if (diastolic > diaNormalMax) diaStatus = 'high';
        
      const overallStatus = (sysStatus !== 'normal' || diaStatus !== 'normal') ? 
        (sysStatus === 'high' || diaStatus === 'high' ? 'high' : 'low') : 'normal';
        
        return {
        display: `${valueStr} (N ${sysNormalMin}–${sysNormalMax}/${diaNormalMin}–${diaNormalMax}, ${overallStatus})`,
        status: overallStatus
        };
      }
    // Single value (systolic only)
    const normalMin = 90;
    const normalMax = 140;
    let status = 'normal';
    if (numericValue < normalMin) status = 'low';
    else if (numericValue > normalMax) status = 'high';
    return {
      display: `${valueStr} (N ${normalMin}–${normalMax}, ${status})`,
      status
    };
  }

  // Systolic BP
  if (nameLower.includes('systolic') || nameLower.includes('bpsystolic')) {
    const normalMin = 90;
    const normalMax = 140;
    let status = 'normal';
    if (numericValue < normalMin) status = 'low';
    else if (numericValue > normalMax) status = 'high';
    return {
      display: `${valueStr} (N ${normalMin}–${normalMax}, ${status})`,
      status
    };
  }

  // Diastolic BP
  if (nameLower.includes('diastolic') || nameLower.includes('bpdiastolic')) {
    const normalMin = 60;
    const normalMax = 90;
    let status = 'normal';
    if (numericValue < normalMin) status = 'low';
    else if (numericValue > normalMax) status = 'high';
    return {
      display: `${valueStr} (N ${normalMin}–${normalMax}, ${status})`,
      status
    };
  }
  
  // Temperature / Temp
  if (nameLower.includes('temperature') || nameLower.includes('temp') || nameLower === 'temperature') {
    // Assume Celsius if no unit specified
    const normalMin = 36.1;
    const normalMax = 37.2;
  let status = 'normal';
    if (numericValue < normalMin) status = 'low';
    else if (numericValue > normalMax) status = 'high';
    return {
      display: `${valueStr} (N ${normalMin}–${normalMax}°C, ${status})`,
      status
    };
  }

  // SpO2 / Oxygen Saturation
  if (nameLower.includes('spo2') || nameLower.includes('oxygensaturation') || nameLower.includes('saturation')) {
    const normalMin = 95;
    const normalMax = 100;
    let status = 'normal';
    if (numericValue < normalMin) status = 'low';
  return {
      display: `${valueStr} (N ${normalMin}–${normalMax}%, ${status})`,
      status
  };
  }

  // Unknown vital sign
  return { display: rawValue, status: 'unknown' };
}

/**
 * Annotate a lab value with normal range and status
 * @param {string} name - Lab analyte name (e.g., 'hemoglobin', 'hb', 'sodium')
 * @param {string} rawValue - Raw value string (e.g., '14.5 g/dL', '140 mmol/L')
 * @param {number|null} ageYearsOrNull - Patient age in years, or null if unknown
 * @returns {{display: string, status: 'normal'|'high'|'low'|'unknown'}}
 */
export function annotateLab(name, rawValue, ageYearsOrNull) {
  if (!name || !rawValue) {
    return { display: rawValue || '', status: 'unknown' };
  }

  // Age guard: only apply ranges if age between 16 and 75
  if (ageYearsOrNull !== null && (ageYearsOrNull < 16 || ageYearsOrNull > 75)) {
    return { display: rawValue, status: 'unknown' };
  }

  const nameLower = name.toLowerCase().replace(/_/g, '');
  const valueStr = String(rawValue).trim();

  // Extract leading numeric value (ignore units)
  const numericMatch = valueStr.match(/^(\d+\.?\d*)/);
  if (!numericMatch) {
    return { display: rawValue, status: 'unknown' };
  }

  const numericValue = parseFloat(numericMatch[1]);

  // Hemoglobin / Hb
  if (nameLower.includes('hemoglobin') || nameLower === 'hb' || nameLower === 'hgb') {
    const normalMin = 12.0; // g/dL (female lower bound)
    const normalMax = 17.0; // g/dL (male upper bound)
    let status = 'normal';
    if (numericValue < normalMin) status = 'low';
    else if (numericValue > normalMax) status = 'high';
    return {
      display: `${valueStr} (N ${normalMin}–${normalMax} g/dL, ${status})`,
      status
    };
  }

  // Hematocrit / Hct
  if (nameLower.includes('hematocrit') || nameLower === 'hct') {
    const normalMin = 36; // % (female lower bound)
    const normalMax = 52; // % (male upper bound)
    let status = 'normal';
    if (numericValue < normalMin) status = 'low';
    else if (numericValue > normalMax) status = 'high';
    return {
      display: `${valueStr} (N ${normalMin}–${normalMax}%, ${status})`,
      status
    };
  }

  // WBC / White Blood Cell
  if (nameLower.includes('whitebloodcell') || nameLower === 'wbc' || nameLower.includes('leukocyte')) {
    const normalMin = 4.0;
    const normalMax = 11.0;
    let status = 'normal';
    if (numericValue < normalMin) status = 'low';
    else if (numericValue > normalMax) status = 'high';
    return {
      display: `${valueStr} (N ${normalMin}–${normalMax} ×10³/μL, ${status})`,
      status
    };
  }
  
  // Platelets
  if (nameLower.includes('platelet')) {
    const normalMin = 150;
    const normalMax = 450;
    let status = 'normal';
    if (numericValue < normalMin) status = 'low';
    else if (numericValue > normalMax) status = 'high';
    return {
      display: `${valueStr} (N ${normalMin}–${normalMax} ×10³/μL, ${status})`,
      status
    };
  }

  // Sodium / Na
  if (nameLower === 'sodium' || nameLower === 'na') {
    const normalMin = 135;
    const normalMax = 145;
    let status = 'normal';
    if (numericValue < normalMin) status = 'low';
    else if (numericValue > normalMax) status = 'high';
    return {
      display: `${valueStr} (N ${normalMin}–${normalMax} mmol/L, ${status})`,
      status
    };
  }

  // Potassium / K
  if (nameLower === 'potassium' || nameLower === 'k') {
    const normalMin = 3.5;
    const normalMax = 5.0;
    let status = 'normal';
    if (numericValue < normalMin) status = 'low';
    else if (numericValue > normalMax) status = 'high';
    return {
      display: `${valueStr} (N ${normalMin}–${normalMax} mmol/L, ${status})`,
      status
    };
  }

  // Creatinine
  if (nameLower.includes('creatinine')) {
    const normalMin = 0.6;
    const normalMax = 1.2;
    let status = 'normal';
    if (numericValue < normalMin) status = 'low';
    else if (numericValue > normalMax) status = 'high';
    return {
      display: `${valueStr} (N ${normalMin}–${normalMax} mg/dL, ${status})`,
      status
    };
  }

  // BUN / Blood Urea Nitrogen
  if (nameLower === 'bun' || nameLower.includes('bloodureanitrogen') || nameLower.includes('urea')) {
    const normalMin = 7;
    const normalMax = 20;
    let status = 'normal';
    if (numericValue < normalMin) status = 'low';
    else if (numericValue > normalMax) status = 'high';
    return {
      display: `${valueStr} (N ${normalMin}–${normalMax} mg/dL, ${status})`,
      status
    };
  }
  
  // Glucose / Fasting Glucose
  if (nameLower.includes('glucose') || nameLower === 'glucose') {
    const normalMin = 70;
    const normalMax = 100; // Fasting
    let status = 'normal';
    if (numericValue < normalMin) status = 'low';
    else if (numericValue > normalMax) status = 'high';
    return {
      display: `${valueStr} (N ${normalMin}–${normalMax} mg/dL fasting, ${status})`,
      status
    };
  }
  
  // Hemoglobin A1c / HbA1c
  if (nameLower.includes('hba1c') || nameLower.includes('hemoglobina1c') || nameLower === 'a1c') {
    const normalMin = 4.0;
    const normalMax = 5.6;
  let status = 'normal';
    if (numericValue < normalMin) status = 'low';
    else if (numericValue > normalMax) status = 'high';
    return {
      display: `${valueStr} (N ${normalMin}–${normalMax}%, ${status})`,
      status
    };
  }

  // Troponin I
  if (nameLower.includes('troponin')) {
    // Troponin is typically elevated in pathology; normal is very low
    const normalMax = 0.04; // ng/mL (varies by assay)
    let status = 'normal';
    if (numericValue > normalMax) status = 'high';
    return {
      display: `${valueStr} (elevated if >${normalMax} ng/mL, ${status})`,
      status: numericValue > normalMax ? 'high' : 'normal'
    };
  }
  
  // BNP / Brain Natriuretic Peptide
  if (nameLower === 'bnp' || nameLower.includes('brainnatriureticpeptide') || nameLower.includes('natriuretic')) {
    const normalMax = 100; // pg/mL
    let status = 'normal';
    if (numericValue > normalMax) status = 'high';
    return {
      display: `${valueStr} (N <${normalMax} pg/mL, ${status})`,
      status: numericValue > normalMax ? 'high' : 'normal'
    };
  }

  // TSH / Thyroid Stimulating Hormone
  if (nameLower === 'tsh' || nameLower.includes('thyroidstimulatinghormone')) {
    const normalMin = 0.4;
    const normalMax = 4.0;
    let status = 'normal';
    if (numericValue < normalMin) status = 'low';
    else if (numericValue > normalMax) status = 'high';
  return {
      display: `${valueStr} (N ${normalMin}–${normalMax} mIU/L, ${status})`,
      status
  };
  }

  // Unknown lab analyte
  return { display: rawValue, status: 'unknown' };
}
