# System-Level Case Generation Fixes - Implementation Plan

**Date:** 2025-01-27  
**Status:** 📋 **PLANNING PHASE**

---

## Executive Summary

This document outlines a comprehensive system-level refactoring plan based on quality analysis of case generation output. The goal is to fix **systemic issues** that affect all cases across all specialties, not just individual case fixes.

**Key Problems Identified:**
1. Template leakage across domains (cardiac templates in stroke cases)
2. Guideline cascade not domain-aware
3. Serialization bugs (`[object Object]` everywhere)
4. Polluted complication library
5. Generic thresholds & algorithms
6. Reasoning chain contamination
7. Useless differential diagnosis metadata
8. Missing social & disposition logic
9. LMIC block issues

---

## Implementation Strategy

### Phase 1: Schema & Serialization (Foundation)
**Priority: CRITICAL** - Blocks all other improvements

### Phase 2: Domain Routing Layer
**Priority: HIGH** - Prevents template leakage

### Phase 3: Guideline Registry System
**Priority: HIGH** - Domain-aware guidelines

### Phase 4: Content Libraries (Complications, Thresholds, Algorithms)
**Priority: MEDIUM** - Quality improvements

### Phase 5: Reasoning & Metadata Cleanup
**Priority: MEDIUM** - Quality improvements

---

## Phase 1: Schema & Serialization Fixes

### 1.1 Create Strict Schema Definitions

**File:** `backend/intelligence_core/schemas/`

Create schema files:
- `medication_schema.mjs`
- `guideline_schema.mjs`
- `complication_schema.mjs`
- `threshold_schema.mjs`
- `algorithm_schema.mjs`
- `differential_schema.mjs`
- `disposition_schema.mjs`

### 1.2 Medication Schema

```javascript
// backend/intelligence_core/schemas/medication_schema.mjs

export const MEDICATION_SCHEMA = {
  name: "string (required)",
  class: "string (required)",
  mechanism: "string (required)",
  standard_dose: "string (required)",
  renal_adjustment: "string (optional)",
  hepatic_adjustment: "string (optional)",
  major_contraindications: "array of strings (required)",
  monitoring: "array of strings (required)",
  lmic_alternative: "string (optional)"
};

export function validateMedication(med) {
  if (!med || typeof med !== 'object') return null;
  
  // Enforce schema
  return {
    name: String(med.name || ""),
    class: String(med.class || ""),
    mechanism: String(med.mechanism || ""),
    standard_dose: String(med.standard_dose || ""),
    renal_adjustment: String(med.renal_adjustment || ""),
    hepatic_adjustment: String(med.hepatic_adjustment || ""),
    major_contraindications: Array.isArray(med.major_contraindications) 
      ? med.major_contraindications.map(String)
      : [],
    monitoring: Array.isArray(med.monitoring)
      ? med.monitoring.map(String)
      : [],
    lmic_alternative: String(med.lmic_alternative || "")
  };
}

export function serializeMedication(med) {
  const validated = validateMedication(med);
  if (!validated || !validated.name) return null;
  
  // Return as structured string (never raw object)
  let result = `**${validated.name}** (${validated.class})\n`;
  result += `Mechanism: ${validated.mechanism}\n`;
  result += `Dose: ${validated.standard_dose}\n`;
  if (validated.renal_adjustment) {
    result += `Renal adjustment: ${validated.renal_adjustment}\n`;
  }
  if (validated.hepatic_adjustment) {
    result += `Hepatic adjustment: ${validated.hepatic_adjustment}\n`;
  }
  if (validated.major_contraindications.length > 0) {
    result += `Contraindications: ${validated.major_contraindications.join(", ")}\n`;
  }
  if (validated.monitoring.length > 0) {
    result += `Monitoring: ${validated.monitoring.join(", ")}\n`;
  }
  if (validated.lmic_alternative) {
    result += `LMIC alternative: ${validated.lmic_alternative}\n`;
  }
  return result;
}
```

### 1.3 Guideline Schema

```javascript
// backend/intelligence_core/schemas/guideline_schema.mjs

export const GUIDELINE_SCHEMA = {
  name: "string (required)",
  body: "string (required)",
  year: "number (required)",
  region: "string (required)",
  tier: "local|regional|national|continental|international (required)",
  domain: "neuro|cardio|id|trauma|general (required)",
  condition_group: "string (optional)",
  strength: "string (optional)",
  url_or_doi: "string (optional)"
};

export function validateGuideline(guideline) {
  if (!guideline || typeof guideline !== 'object') return null;
  
  const validTiers = ['local', 'regional', 'national', 'continental', 'international'];
  const validDomains = ['neuro', 'cardio', 'id', 'trauma', 'general'];
  
  return {
    name: String(guideline.name || ""),
    body: String(guideline.body || ""),
    year: Number(guideline.year) || new Date().getFullYear(),
    region: String(guideline.region || ""),
    tier: validTiers.includes(guideline.tier) ? guideline.tier : 'international',
    domain: validDomains.includes(guideline.domain) ? guideline.domain : 'general',
    condition_group: String(guideline.condition_group || ""),
    strength: String(guideline.strength || ""),
    url_or_doi: String(guideline.url_or_doi || "")
  };
}

export function serializeGuideline(guideline) {
  const validated = validateGuideline(guideline);
  if (!validated || !validated.name) return null;
  
  let result = `**${validated.name}** (${validated.body}, ${validated.year})\n`;
  if (validated.strength) {
    result += `Strength: ${validated.strength}\n`;
  }
  if (validated.url_or_doi) {
    result += `Reference: ${validated.url_or_doi}\n`;
  }
  return result;
}
```

### 1.4 Serialization Helper

**File:** `backend/intelligence_core/serialization_helper.mjs`

```javascript
// Universal serialization helper to prevent [object Object] bugs

import { validateMedication, serializeMedication } from './schemas/medication_schema.mjs';
import { validateGuideline, serializeGuideline } from './schemas/guideline_schema.mjs';

export function serializeValue(value) {
  if (value === null || value === undefined) return "";
  
  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(item => serializeValue(item)).filter(Boolean).join("\n\n");
  }
  
  // Handle objects
  if (typeof value === 'object') {
    // Try medication schema first
    const med = serializeMedication(value);
    if (med) return med;
    
    // Try guideline schema
    const guideline = serializeGuideline(value);
    if (guideline) return guideline;
    
    // Generic object serialization (fallback)
    return JSON.stringify(value, null, 2);
  }
  
  // Handle primitives
  return String(value);
}

export function serializeForDisplay(data) {
  // Recursively serialize all object values
  if (Array.isArray(data)) {
    return data.map(serializeForDisplay);
  }
  
  if (typeof data === 'object' && data !== null) {
    const serialized = {};
    for (const [key, value] of Object.entries(data)) {
      serialized[key] = serializeForDisplay(value);
    }
    return serialized;
  }
  
  return data;
}
```

---

## Phase 2: Domain Routing Layer

### 2.1 Domain Classifier Enhancement

**File:** `backend/intelligence_core/domain_classifier.mjs`

Add domain routing:
- `primary_domain` (neuro, cardio, resp, trauma, id, etc.)
- `subdomain` (ischemic_stroke, acs, sepsis, etc.)

### 2.2 Domain-Aware Content Router

**File:** `backend/intelligence_core/domain_router.mjs`

```javascript
// Route management templates, complications, guidelines by domain

export function getDomainForTopic(topic, category) {
  // Enhanced domain detection
  const topicLower = (topic || "").toLowerCase();
  const categoryLower = (category || "").toLowerCase();
  
  // Neuro domain
  if (topicLower.includes('stroke') || topicLower.includes('seizure') || 
      topicLower.includes('tia') || topicLower.includes('meningitis')) {
    return { primary: 'neuro', subdomain: extractNeuroSubdomain(topicLower) };
  }
  
  // Cardio domain
  if (topicLower.includes('mi') || topicLower.includes('acs') ||
      topicLower.includes('heart failure') || topicLower.includes('arrhythmia')) {
    return { primary: 'cardio', subdomain: extractCardioSubdomain(topicLower) };
  }
  
  // ID domain
  if (topicLower.includes('sepsis') || topicLower.includes('infection') ||
      categoryLower.includes('infectious')) {
    return { primary: 'id', subdomain: extractIDSubdomain(topicLower) };
  }
  
  // Default
  return { primary: 'general', subdomain: topicLower };
}

export function shouldIncludeContent(contentType, domain, topic) {
  // Prevent cross-domain leakage
  const domainRules = {
    neuro: {
      allowed_management: ['stroke', 'seizure', 'neurological'],
      forbidden: ['cardiac_arrest', 'acs', 'mi', 'vfib']
    },
    cardio: {
      allowed_management: ['acs', 'mi', 'heart_failure', 'arrhythmia'],
      forbidden: ['stroke_management', 'seizure']
    }
  };
  
  const rules = domainRules[domain.primary];
  if (!rules) return true; // General domain allows all
  
  // Check if content belongs to this domain
  const contentLower = String(contentType).toLowerCase();
  
  // Block forbidden content
  if (rules.forbidden?.some(forbidden => contentLower.includes(forbidden))) {
    return false;
  }
  
  return true;
}
```

---

## Phase 3: Guideline Registry System

### 3.1 Guideline Registry Structure

**File:** `backend/intelligence_core/guideline_registry.mjs`

```javascript
// Domain-aware guideline registry

const GUIDELINE_REGISTRY = {
  neuro: {
    stroke: {
      dk: [
        { name: "Danish Stroke Society Guidelines", body: "Danish Stroke Society", year: 2023, tier: "national" }
      ],
      us: [
        { name: "AHA/ASA Stroke Guidelines", body: "AHA/ASA", year: 2023, tier: "national" }
      ],
      international: [
        { name: "WHO Stroke Guidelines", body: "WHO", year: 2022, tier: "international" }
      ]
    }
  },
  cardio: {
    acs: {
      dk: [
        { name: "Danish Cardiology Society ACS Guidelines", body: "DCS", year: 2023, tier: "national" }
      ],
      us: [
        { name: "AHA/ACC ACS Guidelines", body: "AHA/ACC", year: 2023, tier: "national" }
      ]
    }
  }
};

export function getGuidelinesForDomain(domain, conditionGroup, region) {
  const domainGuidelines = GUIDELINE_REGISTRY[domain.primary];
  if (!domainGuidelines) return [];
  
  const conditionGuidelines = domainGuidelines[conditionGroup];
  if (!conditionGuidelines) return [];
  
  // Return guidelines for region + international
  const regional = conditionGuidelines[region] || [];
  const international = conditionGuidelines.international || [];
  
  return [...regional, ...international];
}
```

---

## Phase 4: Content Libraries

### 4.1 Domain-Specific Complication Libraries

**File:** `backend/intelligence_core/complications/`

Create per-domain files:
- `neuro_complications.mjs`
- `cardio_complications.mjs`
- `id_complications.mjs`
- `general_complications.mjs`

### 4.2 Threshold Schema

**File:** `backend/intelligence_core/schemas/threshold_schema.mjs`

```javascript
export const THRESHOLD_SCHEMA = {
  decision: "string (required)",
  parameter: "string (required)",
  cutoff: "string (required)",
  context: "string (required)",
  region_tag: "string (optional)",
  guideline_source: "string (optional)"
};
```

---

## Phase 5: Reasoning & Metadata

### 5.1 Differential Diagnosis Tiering

**File:** `backend/intelligence_core/differential_tiering.mjs`

```javascript
export const DIFFERENTIAL_TIER_SYSTEM = {
  tier_1: "very likely",
  tier_2: "plausible but less likely",
  tier_3: "must-not-miss / rare but dangerous"
};

export function assignDifferentialTier(diagnosis, context) {
  // Logic to assign tier based on probability and urgency
}
```

### 5.2 Disposition Module

**File:** `backend/intelligence_core/disposition_module.mjs`

```javascript
export function generateDisposition(history, cognitiveStatus, supportSystem, region) {
  return {
    need_rehab_referral: Boolean,
    home_support_required: "daily|weekly|none",
    driving_restrictions: Boolean,
    follow_up_specialty: String
  };
}
```

---

## Implementation Checklist

- [ ] Phase 1.1: Create schema definition files
- [ ] Phase 1.2: Implement medication schema validation & serialization
- [ ] Phase 1.3: Implement guideline schema validation & serialization
- [ ] Phase 1.4: Create universal serialization helper
- [ ] Phase 1.5: Integrate serialization into case generation pipeline
- [ ] Phase 2.1: Enhance domain classifier with primary_domain + subdomain
- [ ] Phase 2.2: Create domain router with content filtering
- [ ] Phase 2.3: Integrate domain router into case generation
- [ ] Phase 3.1: Create guideline registry structure
- [ ] Phase 3.2: Implement domain-aware guideline lookup
- [ ] Phase 3.3: Integrate registry into guideline generation
- [ ] Phase 4.1: Create domain-specific complication libraries
- [ ] Phase 4.2: Implement threshold schema
- [ ] Phase 4.3: Create algorithm schema
- [ ] Phase 5.1: Implement differential tiering system
- [ ] Phase 5.2: Create disposition module
- [ ] Phase 5.3: Clean up reasoning chain generation

---

## Next Steps

1. Start with Phase 1 (Schema & Serialization) - this is the foundation
2. Test serialization fixes on a few cases
3. Move to Phase 2 (Domain Routing) to prevent template leakage
4. Continue with remaining phases

---

**Status:** Ready to begin Phase 1 implementation

