/**
 * Paraclinical Formatter
 * Converts raw JSON lab/imaging objects into clean grouped bullet lists
 * Frontend-only formatting - no backend changes required
 */

import React from 'react';

/**
 * Format labs object into grouped bullet lists (JSX)
 * @param {Object|string} labs - Raw labs object or string
 * @returns {JSX.Element|string} - Formatted JSX with grouped bullet lists or string fallback
 */
export function formatLabs(labs) {
  if (!labs) return null;
  
  // If already a formatted string, return as-is
  if (typeof labs === 'string') {
    return <div className="whitespace-pre-wrap text-sm">{labs}</div>;
  }
  
  // If not an object, return empty
  if (typeof labs !== 'object' || Array.isArray(labs)) {
    return null;
  }

  // Group labs by category (order matters - more specific first, exact matches before partial)
  const categoryDefinitions = [
    // Exact category names first (highest priority)
    { name: 'Complete Blood Count (CBC)', keywords: ['cbc'], exact: true },
    { name: 'Basic Metabolic Panel (BMP)', keywords: ['bmp'], exact: true },
    { name: 'Comprehensive Metabolic Panel (CMP)', keywords: ['cmp'], exact: true },
    
    // Then specific lab values (order: most specific first)
    { name: 'Complete Blood Count (CBC)', keywords: ['hemoglobin', 'hb', 'hgb', 'wbc', 'white_blood_cell', 'platelet', 'plt', 'hematocrit', 'hct', 'mcv', 'mch', 'mchc', 'rdw'], exact: false },
    { name: 'Basic Metabolic Panel (BMP)', keywords: ['sodium', 'na', 'potassium', 'k', 'chloride', 'cl', 'bicarbonate', 'hco3', 'bun', 'urea', 'creatinine', 'creat', 'glucose', 'gluc', 'calcium', 'ca'], exact: false },
    { name: 'Comprehensive Metabolic Panel (CMP)', keywords: ['phosphorus', 'phos', 'magnesium', 'mg', 'albumin', 'alb', 'total_protein', 'tp', 'bilirubin', 'bili', 'ast', 'alt', 'alkaline_phosphatase', 'alp'], exact: false },
    { name: 'Lipid Profile', keywords: ['cholesterol', 'chol', 'triglyceride', 'tg', 'hdl', 'ldl'], exact: false },
    { name: 'Cardiac Markers', keywords: ['troponin', 'trop', 'ck_mb', 'ck-mb', 'bnp', 'nt_probnp', 'nt-probnp', 'probnp'], exact: false },
    { name: 'Coagulation', keywords: ['pt', 'prothrombin_time', 'inr', 'ptt', 'aptt', 'd_dimer', 'd-dimer', 'fibrinogen'], exact: false },
    { name: 'Inflammatory Markers', keywords: ['crp', 'c_reactive_protein', 'esr', 'sed_rate', 'procalcitonin', 'pct'], exact: false },
  ];

  const categorized = {};

  // Helper to safely convert value to string (prevents [object Object])
  const safeValueToString = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
      return value.map(v => safeValueToString(v)).filter(v => v).join(', ');
    }
    if (typeof value === 'object') {
      // Try common object properties first
      if (value.text) return safeValueToString(value.text);
      if (value.value) return safeValueToString(value.value);
      if (value.label) return safeValueToString(value.label);
      if (value.name) return safeValueToString(value.name);
      // If it's an object with meaningful keys, format it
      const entries = Object.entries(value).filter(([k, v]) => v != null && v !== '');
      if (entries.length > 0) {
        return entries.map(([k, v]) => `${k}: ${safeValueToString(v)}`).join(', ');
      }
      return '';
    }
    return String(value);
  };

  // Categorize labs
  for (const [key, value] of Object.entries(labs)) {
    const stringValue = safeValueToString(value);
    if (!stringValue || stringValue === '[object Object]' || stringValue.includes('[object Object]')) continue;
    
    const keyLower = key.toLowerCase();
    let categorized_flag = false;
    
    // Try exact matches first, then partial matches (order matters)
    for (const category of categoryDefinitions) {
      const matches = category.exact 
        ? category.keywords.some(kw => keyLower === kw.toLowerCase())
        : category.keywords.some(kw => keyLower.includes(kw.toLowerCase()));
      
      if (matches) {
        if (!categorized[category.name]) categorized[category.name] = [];
        categorized[category.name].push({ key, value: stringValue });
        categorized_flag = true;
        break; // Stop at first match (order matters)
      }
    }
    
    if (!categorized_flag) {
      if (!categorized['Other Labs']) categorized['Other Labs'] = [];
      categorized['Other Labs'].push({ key, value: stringValue });
    }
  }

  // Build JSX with proper bullet lists
  const sections = [];
  for (const [category, items] of Object.entries(categorized)) {
    // Filter out items with empty or invalid values
    const validItems = items.filter(item => {
      const value = item.value || '';
      return value && !value.includes('[object Object]') && value.trim() !== '';
    });
    
    if (validItems.length > 0) {
      sections.push(
        <div key={category} className="mb-4">
          <h5 className="font-semibold text-gray-800 mb-2 text-sm">{category}</h5>
          <ul className="list-disc list-inside space-y-1 ml-2">
            {validItems.map((item, idx) => {
              const formattedKey = item.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              const formattedValue = item.value || '';
              return (
                <li key={`${item.key}-${idx}`} className="text-gray-700 text-sm">
                  <span className="font-medium">{formattedKey}:</span> {formattedValue}
                </li>
              );
            })}
          </ul>
        </div>
      );
    }
  }

  if (sections.length === 0) return null;

  return <div className="space-y-3">{sections}</div>;
}

/**
 * Format imaging object into grouped bullet lists (JSX)
 * @param {Object|string} imaging - Raw imaging object or string
 * @returns {JSX.Element|string} - Formatted JSX with grouped bullet lists or string fallback
 */
export function formatImaging(imaging) {
  if (!imaging) return null;
  
  // If already a formatted string, return as-is
  if (typeof imaging === 'string') {
    return <div className="whitespace-pre-wrap text-sm">{imaging}</div>;
  }
  
  // If not an object, return empty
  if (typeof imaging !== 'object' || Array.isArray(imaging)) {
    return null;
  }

  // Group imaging by modality (order matters - more specific first)
  const modalityDefinitions = [
    // Exact modality names first (highest priority)
    { name: 'CT Scans', keywords: ['cta', 'ctp'], exact: true },
    { name: 'MRI', keywords: ['mra', 'mrv'], exact: true },
    // Then specific imaging types
    { name: 'CT Scans', keywords: ['ct', 'computed_tomography', 'ct_chest', 'ct_abdomen', 'ct_head', 'ct_brain', 'ct_scan'], exact: false },
    { name: 'MRI', keywords: ['mri', 'magnetic_resonance', 'mri_brain', 'mri_spine', 'mri_scan'], exact: false },
    { name: 'Ultrasound', keywords: ['us', 'ultrasound', 'ultrasonography', 'echo', 'echocardiography', 'doppler'], exact: false },
    { name: 'X-Ray', keywords: ['xray', 'x_ray', 'x-ray', 'chest_xray', 'cxr', 'plain_film', 'radiograph'], exact: false },
  ];

  const categorized = {};

  // Helper to safely convert value to string (prevents [object Object])
  const safeValueToString = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
      return value.map(v => safeValueToString(v)).filter(v => v).join(', ');
    }
    if (typeof value === 'object') {
      // Try common object properties first
      if (value.text) return safeValueToString(value.text);
      if (value.value) return safeValueToString(value.value);
      if (value.label) return safeValueToString(value.label);
      if (value.name) return safeValueToString(value.name);
      // If it's an object with meaningful keys, format it
      const entries = Object.entries(value).filter(([k, v]) => v != null && v !== '');
      if (entries.length > 0) {
        return entries.map(([k, v]) => `${k}: ${safeValueToString(v)}`).join(', ');
      }
      return '';
    }
    return String(value);
  };

  // Categorize imaging
  for (const [key, value] of Object.entries(imaging)) {
    const stringValue = safeValueToString(value);
    if (!stringValue || stringValue === '[object Object]' || stringValue.includes('[object Object]')) continue;
    
    const keyLower = key.toLowerCase();
    let categorized_flag = false;
    
    // Try exact matches first, then partial matches (order matters)
    for (const modality of modalityDefinitions) {
      const matches = modality.exact
        ? modality.keywords.some(kw => keyLower === kw.toLowerCase())
        : modality.keywords.some(kw => keyLower.includes(kw.toLowerCase()));
      
      if (matches) {
        if (!categorized[modality.name]) categorized[modality.name] = [];
        categorized[modality.name].push({ key, value: stringValue });
        categorized_flag = true;
        break; // Stop at first match (order matters)
      }
    }
    
    if (!categorized_flag) {
      if (!categorized['Other Imaging']) categorized['Other Imaging'] = [];
      categorized['Other Imaging'].push({ key, value: stringValue });
    }
  }

  // Build JSX with proper bullet lists
  const sections = [];
  for (const [modality, items] of Object.entries(categorized)) {
    // Filter out items with empty or invalid values
    const validItems = items.filter(item => {
      const value = item.value || '';
      return value && !value.includes('[object Object]') && value.trim() !== '';
    });
    
    if (validItems.length > 0) {
      sections.push(
        <div key={modality} className="mb-4">
          <h5 className="font-semibold text-gray-800 mb-2 text-sm">{modality}</h5>
          <ul className="list-disc list-inside space-y-1 ml-2">
            {validItems.map((item, idx) => {
              const formattedKey = item.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              const formattedValue = item.value || '';
              return (
                <li key={`${item.key}-${idx}`} className="text-gray-700 text-sm">
                  <span className="font-medium">{formattedKey}:</span> {formattedValue}
                </li>
              );
            })}
          </ul>
        </div>
      );
    }
  }

  if (sections.length === 0) return null;

  return <div className="space-y-3">{sections}</div>;
}

/**
 * Format entire paraclinical object
 * @param {Object} paraclinical - Raw paraclinical object
 * @returns {Object} - Formatted paraclinical object with formatted labs and imaging (JSX)
 */
export function formatParaclinical(paraclinical) {
  if (!paraclinical || typeof paraclinical !== 'object') {
    return paraclinical;
  }

  const formatted = { ...paraclinical };

  // Format labs if present (returns JSX)
  if (paraclinical.labs) {
    formatted.labs = formatLabs(paraclinical.labs);
  }

  // Format imaging if present (returns JSX)
  if (paraclinical.imaging) {
    formatted.imaging = formatImaging(paraclinical.imaging);
  }

  return formatted;
}

