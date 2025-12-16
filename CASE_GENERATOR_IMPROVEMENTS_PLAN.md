# Case Generator Improvements - Implementation Plan

## Critical Issues to Address

### 1. **Complication Lists Mix Unrelated Syndromes**
- Problem: Generic emergency pool includes cross-domain items (malignant hyperthermia, serotonin syndrome, sepsis) in non-relevant cases
- Solution: Domain-aware complication filtering, condition-specific templates

### 2. **Reasoning Chain Hallucinated Logic**
- Problem: Includes findings not present (altered mental status, ACS chest-pain logic when absent)
- Solution: Case-grounded validation, remove hallucinated steps

### 3. **Irrelevant Guidelines in Cascade**
- Problem: Mental health, sepsis, antimicrobial guidelines appearing for cardiology cases
- Solution: Domain-based guideline routing with strict filtering

### 4. **[object Object] Leakage**
- Problem: Pharmacology, WHO, LMIC sections show raw objects instead of readable text
- Solution: Enhanced serialization, schema validation, frontend rendering fixes

### 5. **Empty Boilerplate Teaching Sections**
- Problem: Crucial concepts, pitfalls, pearls effectively empty
- Solution: Mandatory content validation, tie to case elements

### 6. **Generic Complications from Emergency Pool**
- Problem: Not condition-specific, duplicates across domains
- Solution: Per-domain complication sets with filtering

### 7. **Placeholder Differentials**
- Problem: "See case analysis" instead of real entities
- Solution: Schema enforcement, validation checks

### 8. **Generic ABC Reasoning Chain**
- Problem: Duplicated numbering, weak linkage to case domain
- Solution: Domain-aware reasoning, case-grounded validation

### 9. **Unlinked Diagnostic Metrics**
- Problem: Global sensitivity/specificity without test/modality reference
- Solution: Explicit test linkage in metrics

### 10. **Wrong Guidelines for Specialty**
- Problem: Generic organizations regardless of specialty
- Solution: Specialty-aware guideline routing

## Implementation Strategy

### Phase 1: Enhanced Prompt Engineering
- Add strict rules to system prompt
- Domain-aware filtering instructions
- Schema enforcement requirements
- Validation checks

### Phase 2: Domain Filtering Engines
- Improve complication engine filtering
- Enhance guideline routing
- Add reasoning validation

### Phase 3: Serialization Fixes
- Use existing schemas more comprehensively
- Add validation hooks
- Fix frontend rendering

### Phase 4: Validation & Testing
- Add CI checks for placeholders
- Test for [object Object] leakage
- Validate domain-specific content

