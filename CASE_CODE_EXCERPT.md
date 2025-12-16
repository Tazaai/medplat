# Case Code Excerpts - Differential Diagnosis Issue

## 1. Prompt That Generates Differentials (case_api.mjs:471-472)

```javascript
// backend/routes/case_api.mjs, lines 471-472
ALWAYS include finalDiagnosis and differentialDiagnosis fields, even if empty strings/arrays.
DifferentialDiagnosis: Return concise diagnosis names only (e.g., "Acute MI", "Aortic Dissection"). 
For each differential, provide: 1) one supporting clue, 2) one reason it is less likely than final diagnosis. 
Keep each to one line.
```

**Issue**: Contradictory instruction - says "names only" but asks for supporting/against info.

## 2. How Differentials Are Stored (case_api.mjs:513-522)

```javascript
// backend/routes/case_api.mjs, lines 513-522
// Always set differential_diagnoses (default to empty array if missing)
if (Array.isArray(parsed.differentialDiagnosis)) {
  updateFields.differential_diagnoses = parsed.differentialDiagnosis;
} else if (Array.isArray(parsed.differential_diagnoses)) {
  updateFields.differential_diagnoses = parsed.differential_diagnoses;
} else if (Array.isArray(parsed.Differential_Diagnoses)) {
  updateFields.differential_diagnoses = parsed.Differential_Diagnoses;
} else {
  updateFields.differential_diagnoses = [];
}
```

**Issue**: Stores whatever format AI returns (often plain strings).

## 3. Repair Function (case_post_processor.mjs:159-170)

```javascript
// backend/utils/case_post_processor.mjs, lines 159-170
function repairMissingDifferentialEvidence(diffs, caseData) {
  return diffs.map(d => {
    if (typeof d === 'string') return { name: d, justification: 'no_raw' };
    const name = d.name || d.diagnosis || 'Unknown';
    const hasAny = d.supporting || d.justification || d.clue;
    if (!hasAny) {
      const h = caseData.history?.slice(0,150) || '';
      d.justification = `Based on case: ${h}`;
    }
    return d;
  });
}
```

**Issue**: Sets `justification: 'no_raw'` for plain strings, which is not useful.

## 4. Normalization Function - String Processing (case_post_processor.mjs:373-414)

```javascript
// backend/utils/case_post_processor.mjs, lines 373-414
cleaned.differential_diagnoses = cleaned.differential_diagnoses.map((item) => {
  if (typeof item === 'string') {
    // Clean paraclinical bleed-through first
    const cleanedItem = cleanParaclinicalBleed(item);
    const name = cleanedItem.split(/[:\-–—]/)[0].trim();
    let justification = parseJustification(cleanedItem);
    
    // Extract "for" reasoning from justification or generate from case evidence
    let forReasoning = '';
    if (justification && !justification.toLowerCase().includes('reasoning provided')) {
      // Use existing justification as "for" reasoning
      forReasoning = justification;  // ❌ Uses 'no_raw' here if repair function set it
    } else {
      // Generate "for" reasoning from case evidence
      const specificClues = extractSpecificClues(name);
      if (specificClues.length > 0) {
        forReasoning = specificClues.join('. ');
      } else {
        // Fallback: try to find relevant context clues
        const nameLower = name.toLowerCase();
        const clues = [];
        if (contextText.includes(nameLower)) {
          clues.push('Findings consistent with clinical presentation');
        }
        if (paraclinicalText.includes(nameLower.split(' ')[0])) {
          clues.push('Paraclinical data supports consideration');
        }
        forReasoning = clues.length > 0 
          ? clues.join('. ') 
          : 'Clinical presentation supports consideration.';
      }
    }
    
    // Generate "against" reasoning
    const againstReasoning = generateAgainstReasoning(name, finalDiagnosis);
    
    return {
      name,
      for: forReasoning || 'Clinical presentation supports consideration.',
      against: againstReasoning,
    };
  }
  // ... object processing continues
});
```

**Issue**: Line 382 check doesn't filter out `'no_raw'`, so it gets used as `forReasoning`.

## 5. Normalization Function - Object Processing (case_post_processor.mjs:415-480)

```javascript
// backend/utils/case_post_processor.mjs, lines 415-480
if (typeof item === 'object' && item !== null) {
  // Clean paraclinical bleed-through from name and other fields
  let rawName = item.name || item.diagnosis || item.label || '';
  rawName = cleanParaclinicalBleed(String(rawName));
  const name = rawName.trim();
  
  let rawSupporting = item.supporting || item.supporting_clue || item.clue || item.for || '';
  rawSupporting = cleanParaclinicalBleed(String(rawSupporting));
  const supporting = rawSupporting.trim();
  
  let rawLessLikely = item.less_likely || item.lessLikely || item.reason || item.why_less_likely || item.against || '';
  rawLessLikely = cleanParaclinicalBleed(String(rawLessLikely));
  const lessLikely = rawLessLikely.trim();
  
  let rawJustification = item.justification || '';
  rawJustification = cleanParaclinicalBleed(String(rawJustification));
  
  // Extract "for" reasoning from existing fields
  let forReasoning = '';
  if (supporting) {
    forReasoning = supporting;
  } else if (rawJustification && !rawJustification.toLowerCase().includes('reasoning provided')) {
    // Use justification as "for" if it doesn't look generic
    if (!rawJustification.toLowerCase().includes('less likely') && 
        !rawJustification.toLowerCase().includes('against')) {
      forReasoning = rawJustification;  // ❌ Uses 'no_raw' here too
    }
  }
  
  // If no "for" reasoning found, generate from case evidence
  if (!forReasoning) {
    const specificClues = extractSpecificClues(name);
    // ... fallback logic
  }
  
  // Extract "against" reasoning from existing fields or generate
  let againstReasoning = '';
  if (lessLikely) {
    againstReasoning = lessLikely;
  } else if (rawJustification && rawJustification.toLowerCase().includes('less likely')) {
    // Extract "against" from justification if it contains "less likely"
    const againstMatch = rawJustification.match(/less likely[^.]*\.?/i);
    if (againstMatch) {
      againstReasoning = againstMatch[0].trim();
    }
  }
  
  // If no "against" reasoning found, generate from case evidence
  if (!againstReasoning) {
    againstReasoning = generateAgainstReasoning(name, finalDiagnosis);
  }
  
  return {
    name: String(name || '').trim(),
    for: forReasoning || 'Clinical presentation supports consideration.',
    against: againstReasoning,
  };
}
```

**Issue**: Line 436 check also doesn't filter out `'no_raw'` placeholder.

## Data Flow Example

### Input (from AI):
```json
{
  "differentialDiagnosis": [
    "Aortic Dissection",
    "Pulmonary Embolism"
  ]
}
```

### After Repair Function:
```json
{
  "differential_diagnoses": [
    { "name": "Aortic Dissection", "justification": "no_raw" },
    { "name": "Pulmonary Embolism", "justification": "no_raw" }
  ]
}
```

### After Normalization (Current - WRONG):
```json
{
  "differential_diagnoses": [
    { 
      "name": "Aortic Dissection", 
      "for": "no_raw",  // ❌ Placeholder used as reasoning
      "against": "Lacks key features typically seen in this diagnosis." 
    },
    { 
      "name": "Pulmonary Embolism", 
      "for": "no_raw",  // ❌ Placeholder used as reasoning
      "against": "Lacks key features typically seen in this diagnosis." 
    }
  ]
}
```

### Expected Output (After Fix):
```json
{
  "differential_diagnoses": [
    { 
      "name": "Aortic Dissection", 
      "for": "Sudden tearing chest pain with BP differential between arms suggests aortic involvement.",
      "against": "Lacks widened mediastinum on imaging and absence of pulse deficit." 
    },
    { 
      "name": "Pulmonary Embolism", 
      "for": "Acute dyspnea and chest pain in context of risk factors.",
      "against": "Absence of DVT signs and normal D-dimer argues against PE." 
    }
  ]
}
```

