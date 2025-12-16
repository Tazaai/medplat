# Differential Diagnosis "For/Against" Missing Issue Report

## Problem Statement

Differential diagnoses are appearing without "for" and "against" arguments, showing only:
- `Aortic Dissection(No justification provided)`
- `Pulmonary Embolism(No justification provided)`
- `Pneumothorax(No justification provided)`
- `Pericarditis(No justification provided)`

## Root Cause Analysis

### 1. **Prompt Contradiction in Case Generation** (`backend/routes/case_api.mjs:472`)

The prompt for generating differential diagnoses contains a contradiction:

```javascript
// Line 472 in case_api.mjs
"DifferentialDiagnosis: Return concise diagnosis names only (e.g., "Acute MI", "Aortic Dissection"). 
For each differential, provide: 1) one supporting clue, 2) one reason it is less likely than final diagnosis. 
Keep each to one line."
```

**Problem**: The prompt says "Return concise diagnosis names only" but then asks for supporting clue and reason. This contradiction causes the AI to return plain strings like `["Aortic Dissection", "Pulmonary Embolism"]` without structured data.

**Expected Format**: The prompt should request structured objects with `name`, `supporting`, and `against` fields, not plain strings.

### 2. **Repair Function Issue** (`backend/utils/case_post_processor.mjs:159-170`)

The `repairMissingDifferentialEvidence` function converts plain strings to objects but uses a placeholder:

```javascript
if (typeof d === 'string') return { name: d, justification: 'no_raw' };
```

**Problem**: The value `'no_raw'` is not a meaningful justification. When this reaches the normalization function, it's treated as valid justification text, resulting in poor output.

### 3. **Normalization Function Logic Gap** (`backend/utils/case_post_processor.mjs:373-414`)

When processing objects with `justification: 'no_raw'`:

1. Line 382 checks: `if (justification && !justification.toLowerCase().includes('reasoning provided'))`
   - This passes because `'no_raw'` doesn't contain "reasoning provided"
   - So `'no_raw'` gets used as `forReasoning` (line 384)

2. The fallback logic (lines 386-403) should generate reasoning from case evidence, but it only triggers if justification is empty or contains "reasoning provided"

**Problem**: The check on line 382 doesn't filter out placeholder values like `'no_raw'`, causing them to be used as actual reasoning.

### 4. **Missing Evidence Extraction**

When differentials come in as plain strings without any case context:
- `extractSpecificClues()` (line 181-236) tries to find clues in history/exam/paraclinical
- If the diagnosis name doesn't appear in the case text, it returns empty array
- Fallback (lines 391-402) generates generic text like "Findings consistent with clinical presentation"
- But if case history is empty or doesn't contain diagnosis keywords, even this fails

## Code Flow Analysis

### Current Flow:
1. **Generation** (`case_api.mjs:472`): Prompt asks for "names only" → AI returns strings
2. **Storage** (`case_api.mjs:514-522`): Strings stored as-is in `differential_diagnoses` array
3. **Repair** (`case_post_processor.mjs:184`): Converts strings to `{name: "...", justification: 'no_raw'}`
4. **Normalization** (`case_post_processor.mjs:373`): Processes objects but uses `'no_raw'` as justification
5. **Output**: Shows "(No justification provided)" or similar placeholder text

### Expected Flow:
1. **Generation**: Prompt should request structured format: `[{name: "...", supporting: "...", against: "..."}]`
2. **Storage**: Store structured objects directly
3. **Repair**: Only repair if fields are missing, not if entire structure is missing
4. **Normalization**: Extract/generate proper for/against reasoning from case evidence
5. **Output**: Show meaningful clinical reasoning

## Specific Code Locations

### Issue 1: Prompt Format
**File**: `backend/routes/case_api.mjs`
**Line**: 472
**Current**: 
```javascript
"DifferentialDiagnosis: Return concise diagnosis names only (e.g., "Acute MI", "Aortic Dissection"). For each differential, provide: 1) one supporting clue, 2) one reason it is less likely than final diagnosis. Keep each to one line."
```

**Problem**: Contradictory instructions - asks for "names only" but also asks for supporting/against info.

### Issue 2: Repair Function Placeholder
**File**: `backend/utils/case_post_processor.mjs`
**Line**: 161
**Current**:
```javascript
if (typeof d === 'string') return { name: d, justification: 'no_raw' };
```

**Problem**: `'no_raw'` is not a useful justification value.

### Issue 3: Normalization Check
**File**: `backend/utils/case_post_processor.mjs`
**Line**: 382
**Current**:
```javascript
if (justification && !justification.toLowerCase().includes('reasoning provided')) {
  forReasoning = justification; // Uses 'no_raw' here!
}
```

**Problem**: Doesn't filter out placeholder values like `'no_raw'`, `'no justification'`, etc.

## Example Case Data Showing Issue

```json
{
  "differential_diagnoses": [
    "Aortic Dissection",
    "Pulmonary Embolism", 
    "Pneumothorax",
    "Pericarditis"
  ]
}
```

After repair:
```json
{
  "differential_diagnoses": [
    { "name": "Aortic Dissection", "justification": "no_raw" },
    { "name": "Pulmonary Embolism", "justification": "no_raw" },
    { "name": "Pneumothorax", "justification": "no_raw" },
    { "name": "Pericarditis", "justification": "no_raw" }
  ]
}
```

After normalization (current behavior):
```json
{
  "differential_diagnoses": [
    { 
      "name": "Aortic Dissection", 
      "for": "no_raw",  // ❌ Wrong!
      "against": "Lacks key features typically seen in this diagnosis." 
    }
  ]
}
```

## Recommended Fixes (For ChatGPT Review)

### Fix 1: Update Prompt to Request Structured Format
Change the prompt in `case_api.mjs:472` to explicitly request structured objects:

```javascript
"DifferentialDiagnosis: Return array of objects, each with:
- name: diagnosis name (e.g., "Acute MI")
- supporting: one key finding that supports this diagnosis
- against: one reason this is less likely than the final diagnosis

Format: [{\"name\": \"...\", \"supporting\": \"...\", \"against\": \"...\"}]"
```

### Fix 2: Improve Repair Function
Update `repairMissingDifferentialEvidence` to handle `'no_raw'` placeholder:

```javascript
if (typeof d === 'string') {
  // Don't set placeholder - let normalization generate from case evidence
  return { name: d }; // No justification field
}
```

### Fix 3: Filter Placeholder Values in Normalization
Update the check in `normalizeDifferentials` to filter out placeholder values:

```javascript
const PLACEHOLDER_VALUES = ['no_raw', 'no justification', 'not provided', 'n/a', 'none'];
if (justification && 
    !PLACEHOLDER_VALUES.includes(justification.toLowerCase().trim()) &&
    !justification.toLowerCase().includes('reasoning provided')) {
  forReasoning = justification;
} else {
  // Generate from case evidence
  const specificClues = extractSpecificClues(name);
  // ... rest of fallback logic
}
```

### Fix 4: Enhance Evidence Extraction
Improve `extractSpecificClues()` to work even when diagnosis name doesn't appear verbatim in case text by:
- Using semantic matching (e.g., "aortic dissection" matches "dissection", "aorta")
- Extracting related findings (e.g., chest pain → consider cardiac causes)
- Using case context more intelligently

## Testing Recommendations

1. Test with cases where differentials come as plain strings
2. Test with cases where differentials come as objects but missing fields
3. Test with cases where case history doesn't contain diagnosis keywords
4. Verify that "for" and "against" reasoning is always generated and meaningful
5. Ensure no placeholder text like "no_raw" or "No justification provided" appears in output

## Summary

The root cause is a **three-part problem**:
1. **Prompt contradiction** causes AI to return plain strings instead of structured data
2. **Repair function** uses placeholder value `'no_raw'` that gets treated as real justification
3. **Normalization function** doesn't filter out placeholder values before using them

The fix requires updating all three components to ensure differential diagnoses always have meaningful "for" and "against" reasoning generated from case evidence.

