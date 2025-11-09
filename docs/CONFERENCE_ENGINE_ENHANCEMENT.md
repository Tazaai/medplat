# 🧠 MedPlat Conference Engine Enhancement Guide

**Purpose:** Elevate academic panel discussions from "functional" to "publication-quality grand rounds"

## 📋 Implementation Status

### ✅ Completed Modules

1. **Reference Validation** (`backend/utils/validateReferences.mjs`)
   - Validates URLs against verified guideline registries (ESC, NICE, AHA/ACC, Sundhedsstyrelsen)
   - Detects fabricated patterns ("Copenhagen University Hospital protocol", placeholders)
   - Provides fallback verified references for common topics
   - Usage: `await validateReferences(caseData.evidence, region)`

2. **Panel Role Enrichment** (`backend/utils/panelRoles.mjs`)
   - Dynamically selects 5-7 expert roles based on topic/category
   - Maps specialties to appropriate experts (e.g., ACS → Interventional Cardiology, Pharmacology, ICU)
   - Includes universal roles (GP, Ethics, Pharmacology, Radiology)
   - Usage: `getPanelRoles(topic, category, {minRoles: 5, maxRoles: 7})`

### 🔧 Integration Points

#### In `backend/routes/internal_panel_api.mjs` or `generate_case_clinical.mjs`:

```javascript
import { validateReferences, getFallbackReferences } from '../utils/validateReferences.mjs';
import { getPanelRoles, getRoleExpertise } from '../utils/panelRoles.mjs';

// 1. Get dynamic panel roles
const panelRoles = getPanelRoles(topic, category, {
  minRoles: 5,
  maxRoles: 7,
  includeGP: true,
  includePharmacology: true,
  includeEthics: topic.includes('end-of-life') || topic.includes('ethics')
});

// 2. Generate case with enriched panel
const caseData = await generateCase({topic, model, lang, region, panelRoles});

// 3. Validate and fix references
const refValidation = await validateReferences(caseData.evidence, region);
if (refValidation.stats.fabricated > 0) {
  // Replace with fallback verified references
  caseData.evidence = getFallbackReferences(topic, region);
  caseData.meta.reference_validation = 'fallback_applied';
}

// 4. Add validation metadata
caseData.meta.panel_roles = panelRoles;
caseData.meta.reference_validation = refValidation.stats;
```

---

## 🎯 Quality Targets (Conference Realism)

| Metric | Current | Target | Implementation |
|--------|---------|--------|----------------|
| **Panel diversity** | 3 roles | ≥5 roles | ✅ `panelRoles.mjs` |
| **Disagreement depth** | 1-2 points | ≥3 points | 🔄 AI prompt enhancement |
| **Reference authenticity** | ~60% | 100% | ✅ `validateReferences.mjs` |
| **Guideline hierarchy** | Mixed | Local→Regional→Global | 🔄 Region detection |
| **Consensus synthesis** | Short | Structured moderator summary | 🔄 AI prompt template |
| **Evidence grading** | None | Class I-A/B/C notation | 🔄 ESC/AHA format |

---

## 🧩 Next Integration Steps

### 1. Integrate into Internal Panel API

**File:** `backend/routes/internal_panel_api.mjs`

```javascript
// ADD AT TOP
import { validateReferences, getFallbackReferences } from '../utils/validateReferences.mjs';
import { getPanelRoles, getRoleExpertise } from '../utils/panelRoles.mjs';

// MODIFY PANEL REVIEW FUNCTION
router.post('/', async (req, res) => {
  const { topic, caseData, category, region } = req.body;
  
  // Get enriched panel
  const roles = getPanelRoles(topic, category);
  
  // Build panel prompt with role expertise
  const panelPrompt = roles.map(role => 
    `${role} (${getRoleExpertise(role)})`
  ).join('\n');
  
  // Generate panel discussion (existing OpenAI call)
  const discussion = await generatePanelDiscussion(caseData, panelPrompt);
  
  // Validate references
  const refCheck = await validateReferences(discussion.evidence, region);
  if (refCheck.stats.fabricated > 0) {
    discussion.evidence = getFallbackReferences(topic, region);
  }
  
  res.json({ 
    ok: true, 
    case: discussion, 
    meta: {
      panel_roles: roles,
      reference_validation: refCheck.stats
    }
  });
});
```

### 2. Enhance AI Prompt for Debate Depth

**File:** `backend/generate_case_clinical.mjs` or panel prompt template

```javascript
const PANEL_DISCUSSION_PROMPT = `
You are moderating a clinical grand round with the following expert panel:
${panelRoles.join(', ')}

Generate a realistic academic debate with:
- AT LEAST 3 disagreement points (label as 🟨 DEBATE)
- Each expert's perspective based on their specialty
- Evidence citations for each position (Class I/II/III, Level A/B/C)
- Final moderator synthesis paragraph (label as 🟩 CONSENSUS)

Format:
**Disagreement 1: [Topic]**
- ${role1}: [Position + Evidence]
- ${role2}: [Counter-position + Evidence]

**Disagreement 2: [Topic]**
...

**🟩 Moderator Consensus:**
[Synthesis paragraph integrating all viewpoints]
`;
```

### 3. Regional Guideline Hierarchy

**File:** `backend/utils/regionGuidelines.mjs` (to be created)

```javascript
export function getGuidelineHierarchy(region, topic) {
  const hierarchies = {
    DK: {
      local: 'Sundhedsstyrelsen',
      regional: 'Nordic Guidelines',
      continental: 'ESC/ERS',
      global: 'WHO'
    },
    UK: {
      local: 'NICE',
      regional: 'SIGN',
      continental: 'ESC',
      global: 'WHO'
    },
    US: {
      local: 'AHA/ACC',
      regional: 'CHEST/ACCP',
      continental: 'AHA/ACC',
      global: 'WHO'
    }
  };
  
  return hierarchies[region] || hierarchies.US;
}
```

---

## 🧪 Testing Requirements

**File:** `tests/test_conference_enhancement.mjs`

```javascript
import { getPanelRoles } from '../backend/utils/panelRoles.mjs';
import { validateReferences } from '../backend/utils/validateReferences.mjs';

describe('Conference Engine Enhancement', () => {
  test('Panel has ≥5 diverse roles', () => {
    const roles = getPanelRoles('Acute Coronary Syndrome', 'Cardiology');
    assert(roles.length >= 5);
    assert(roles.includes('Clinical Pharmacology'));
  });
  
  test('References are validated', async () => {
    const refs = [
      'ESC 2023 - https://escardio.org/guidelines',
      'Copenhagen University Hospital protocol 2024' // fabricated
    ];
    const result = await validateReferences(refs, 'EU');
    assert(result.stats.fabricated === 1);
  });
  
  test('Debate has ≥3 disagreements', async () => {
    const caseData = await generateCase({topic: 'Sepsis', model: 'gpt-4o-mini'});
    const debates = caseData.panel_discussion.disagreements;
    assert(debates.length >= 3);
  });
});
```

---

## 📊 Frontend Display Enhancements

**File:** `frontend/src/components/CaseView.jsx`

### Add Debate Timeline View

```jsx
function DebateTimeline({ disagreements }) {
  return (
    <div className="space-y-4">
      {disagreements.map((debate, idx) => (
        <div key={idx} className="border-l-4 border-yellow-500 pl-4">
          <h4 className="font-bold">🟨 Debate {idx + 1}: {debate.topic}</h4>
          {debate.positions.map((pos, i) => (
            <div key={i} className="ml-4 my-2">
              <strong>{pos.role}:</strong> {pos.view}
              {pos.evidence && <a href={pos.evidence} className="text-blue-600 ml-2">[source]</a>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

### Add Consensus Marker

```jsx
{consensus && (
  <div className="border-l-4 border-green-500 pl-4 bg-green-50 p-3 rounded">
    <h4 className="font-bold">🟩 Expert Consensus</h4>
    <p>{consensus}</p>
  </div>
)}
```

---

## 🔄 Rollout Plan

1. **Phase 1 (Current):** ✅ Core modules created
2. **Phase 2:** Integrate into `internal_panel_api.mjs`
3. **Phase 3:** Update AI prompts for debate depth
4. **Phase 4:** Add frontend timeline view
5. **Phase 5:** Add comprehensive tests
6. **Phase 6:** Enable in production with feature flag

---

## 📚 Future Enhancements

- **Resource Adaptation:** Auto-detect low-resource settings and adjust recommendations
- **Evidence Grading:** Automatic Class I-A/B/C labeling per ESC/AHA standards
- **Glossary Integration:** Link pathophysiology terms to existing glossary
- **Teaching Summary:** Auto-generate "Key Takeaways" table
- **Interactive Debate:** Allow users to vote on expert positions

---

**Last Updated:** November 9, 2025  
**Status:** Core modules ready for integration  
**Next Step:** Integrate `panelRoles` and `validateReferences` into `internal_panel_api.mjs`
