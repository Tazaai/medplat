const GLOSSARY_DATA = {
  "ECG": {
    label: "Electrocardiogram",
    short: "Records the heart’s electrical activity",
    details: `• Indications: Syncope, chest pain, arrhythmias\n
• Interpretation: Look for rate, rhythm, axis, ST changes\n
• Sensitivity: High for arrhythmias, low for structural problems\n
• Pearl: Always correlate clinically!`
  },
  "LP": {
    label: "Lumbar Puncture",
    short: "Spinal tap to collect CSF",
    details: `• Indications: Suspected meningitis, SAH (if CT negative)\n
• Best timing: Within first 12h for highest RBC detection (SAH)\n
• Contraindications: Elevated ICP, bleeding disorders\n
• Risks: Headache, herniation if ICP not ruled out`
  },
  "CT": {
    label: "Computed Tomography",
    short: "Cross-sectional imaging using X-rays",
    details: `• Indications: Trauma, stroke, headache, suspected bleeding\n
• Sensitivity: High for blood (SAH) in first 6h\n
• Pearl: Always check for contrast use in protocol\n
• Risks: Radiation, contrast nephropathy`
  }
};

export default GLOSSARY_DATA;
