# 🧠 MedPlat Professor-V3 Conference Engine — Copilot Development Guide

### 🎯 Purpose

Create the next-generation global, dynamic, multidisciplinary debate engine that runs automatically for every topic, specialty, and region, replacing the static "Dr. Name" dialogues with authentic, context-aware conference discussions. All improvements must be global and dynamic — never hard-coded or limited to a single case.

---

## 🚧 Scope Clarifications

### ❌ Exclude / Defer

| Role | Action |
|------|--------|
| Medical Student / USMLE Expert | Move to the gamification module (MCQ & learning analytics) — not part of case generation. |
| Digital Marketing Expert | Temporarily disabled — to be re-added during business/UX phase. |

---

## 🏗️ Core Objectives

1. **Dynamic Conference Debate Generator**

   - JSON schema →

     ```json
     {
       "moderator_intro": "...",
       "discussion_rounds": [
         { 
           "specialty": "Emergency Physician", 
           "speaker": "Emergency Physician",
           "stance": "Agree", 
           "argument": "...", 
           "counter": "...", 
           "evidence": "..." 
         }
       ],
       "moderator_summary": "...",
       "panel_consensus": "..."
     }
     ```

   - Each debate must contain ≥ 2 disagreements and ≥ 1 rebuttal.
   - Roles derive automatically from case specialty and section type (e.g., Cardiology case → Cardiologist, Radiologist, Pharmacologist).
   - **Specialty diversity**: ≥ 3 distinct specialties required.

2. **Region-Aware Guideline Anchoring**

   - Always cite guidelines in order: Local → National → Continental → WHO.
   - Distinguish between differing guideline years or grades (I-A / II-B etc.).
   - Regional context must be injected into case generation (`meta.region`).

3. **Cross-Specialty Reasoning**

   - Blend input from ≥ 3 fields.
   - Moderator introduces, specialists debate, moderator synthesizes.
   - **Required pattern**: At least one round must include explicit rebuttal/counter-argument.

4. **Resource Adaptation**

   - Add `"resource_setting": "low" | "medium" | "high"` to scale diagnostics and interventions.

5. **Primary-Care Perspective**

   - Auto-include a short GP/triage line in all acute-care topics.

6. **Frontend Rendering**

   - Replace static names with `{round.specialty || round.speaker}`.
   - Use alternating "speech bubble" layout.
   - Display `moderator_summary` + `panel_consensus` at end.
   - **Remove all "External Expert Panel Review" UI blocks globally**.
   - Show cross-specialty tension badge when ≥ 2 disagreements detected.
   - Highlight disagreements with visual indicators (⚡ icon, yellow background).

7. **Validation Rules**

   - Regenerate if:
     - `discussion_rounds.length < 3`
     - `disagreements < 2` (count stance='Disagree' or similar)
     - `specialty_diversity < 3` (unique specialties)
     - `panel_consensus.length < 100` characters
     - Missing `moderator_intro` or `moderator_summary`

8. **Educational Scoring Weights**

   - `clinical_depth 20%`, `debate_balance 10%`, `consensus_clarity 10%`.
   - Metadata fields: `debate_balance`, `consensus_clarity` auto-computed.

---

## ⚙️ Technical Instructions

### Backend (`backend/generate_case_clinical.mjs`)

**Current State:**
- Lines ~140-188: Prompt defines specialty-based identity model.
- Lines ~390-441: Validation logic checks cross-specialty tension, diversity, consensus length.

**Required Changes:**
1. Ensure prompt explicitly forbids generic names (no "Dr. Smith", "Dr. Johnson").
2. Enforce 3-round minimum with mandatory disagreement structure.
3. Add JSON parse retry logic with exponential backoff.
4. Inject regional context from `options.region` into prompt.
5. Compute and add `meta.debate_balance` and `meta.consensus_clarity` flags.

**Key Code Patterns:**
```javascript
// Validation example
if (panel.discussion_rounds.length < 3) {
  validationErrors.push('Insufficient discussion rounds (minimum 3)');
}

const disagreements = panel.discussion_rounds.filter(r => 
  r.stance?.toLowerCase().includes('disagree')
).length;

if (disagreements < 2) {
  validationErrors.push('Insufficient disagreements (minimum 2)');
}
```

### Frontend (`frontend/src/components/ProfessionalCaseDisplay.jsx`)

**Current State:**
- Component extracts panel data from `caseData.Expert_Panel_and_Teaching` or `caseData.panel_discussion`.
- Renders `moderatorIntro`, `discussionRounds`, `pointsOfDebate`, `moderatorSummary`, `panelConsensus`.

**Required Changes:**
1. **Fix variable references**: Use `pointsOfDebate` (not `debates`), `panelConsensus` (not `consensus`).
2. **Role-first display**: Render `{round.specialty || round.speaker}` prominently.
3. **Remove External Panel Review**: Delete any imports/components for external review UI.
4. **Visual indicators**:
   - Cross-specialty tension badge when ≥ 2 disagreements.
   - Highlight disagreement rounds with ⚡ icon and `bg-yellow-50` class.
   - Rebuttal rounds get `border-l-4 border-orange-400` accent.

**Key Code Patterns:**
```jsx
// Safe variable extraction
const pointsOfDebate = panelData?.points_of_debate || panelData?.Points_of_Debate || [];
const panelConsensus = panelData?.panel_consensus || panelData?.Final_Consensus || '';

// Role-first rendering
<p className="font-semibold text-blue-800">
  {round.specialty || round.speaker}
</p>

// Disagreement highlighting
{round.stance?.toLowerCase().includes('disagree') && (
  <span className="ml-2 text-yellow-600">⚡ Disagreement</span>
)}
```

### Frontend (`frontend/src/components/CaseView.jsx`)

**Current State:**
- Handles case generation, selection, normalization.
- Renders either `<ProfessionalCaseDisplay />` or `<Level2CaseLogic />` based on gamify toggle.
- Contains legacy `renderPanel()` and `renderBookCase()` fallback renderers.

**Required Changes:**
1. **No changes needed** — component already passes `caseData` to `ProfessionalCaseDisplay`.
2. **Optional**: Remove `renderPanel()` function if fully migrating to `ProfessionalCaseDisplay`.

### Testing

**Required Tests:**
1. **Schema validation test** (`backend/test/professor-v3-schema.test.js`):
   ```javascript
   test('generated case has valid professor-v3 structure', () => {
     expect(panel.discussion_rounds.length).toBeGreaterThanOrEqual(3);
     expect(panel.moderator_intro).toBeDefined();
     expect(panel.panel_consensus.length).toBeGreaterThanOrEqual(100);
   });
   ```

2. **Regression test** across specialties:
   - Run generation for: Neurology, Cardiology, Respiratory, Infectious Disease, Emergency.
   - Assert: ≥ 3 discussion_rounds, ≥ 2 disagreements, ≥ 3 unique specialties, panel_consensus ≥ 100 chars.

3. **Local smoke test**:
   ```bash
   bash test_backend_local.sh
   ```

---

## 🌍 Design Principle

Every improvement must scale automatically to all cases, topics, regions, and models without any static text or hard-coded examples.

---

## 🚀 Implementation Workflow (Git Commands for Copilot)

### Step 1: Create Feature Branch
```bash
git checkout -b feat/professor-v3-conference-engine
```

### Step 2: Make Code Changes
Follow the technical instructions above for backend and frontend edits.

### Step 3: Run Local Validation
```bash
# Generate diagnostics
bash review_report.sh

# Run backend smoke tests
bash test_backend_local.sh

# Build frontend to verify no compile errors
cd frontend && npm run build && cd ..
```

### Step 4: Commit Changes
```bash
git add backend/generate_case_clinical.mjs
git add frontend/src/components/ProfessionalCaseDisplay.jsx
git add docs/PROFESSOR_V3_CONFERENCE_ENGINE.md
git add backend/test/professor-v3-schema.test.js  # if created

git commit -m "feat: implement professor-v3 global conference engine

- Replace generic doctor names with specialty-based roles
- Add validation: ≥3 rounds, ≥2 disagreements, ≥3 specialties
- Frontend: role-first display, cross-specialty tension badge
- Remove External Expert Panel Review UI
- Add regional guideline anchoring (local→national→continental→WHO)

Closes #<issue-number>
Ref: docs/PROFESSOR_V3_CONFERENCE_ENGINE.md"
```

### Step 5: Push and Create Draft PR
```bash
git push -u origin feat/professor-v3-conference-engine

# Create draft PR using GitHub CLI
gh pr create \
  --title "feat: Professor-V3 Global Conference Engine" \
  --body "## 🧠 Professor-V3 Conference Engine Implementation

### Changes
- ✅ Backend: specialty-based prompt + validation (≥3 rounds, ≥2 disagreements, ≥3 specialties)
- ✅ Frontend: role-first rendering, cross-specialty tension badge, remove external review UI
- ✅ Regional guideline anchoring (local→national→continental→WHO)
- ✅ Documentation: \`docs/PROFESSOR_V3_CONFERENCE_ENGINE.md\`

### Validation
- \`bash review_report.sh\` — passed
- \`bash test_backend_local.sh\` — passed
- Frontend build — clean (no errors)

### Testing Checklist
- [ ] Regression test across 5 specialties (Neuro, Cardio, Resp, Infectious, Emergency)
- [ ] Verify ≥2 disagreements in all generated cases
- [ ] Confirm panel_consensus ≥100 chars
- [ ] Visual QA: cross-specialty badge, disagreement highlights
- [ ] Confirm no 'Dr. Name' generic references

### Documentation
See \`docs/PROFESSOR_V3_CONFERENCE_ENGINE.md\` for complete implementation guide.

---
**Note:** This is a draft PR. Please run full regression tests before marking ready for review." \
  --draft \
  --base main
```

### Step 6: Verify PR Link
```bash
# Get PR URL
gh pr view --web
```

---

## 🏁 Expected Outcome

- Global, multidisciplinary debates in all generated cases.
- Contextual specialist roles instead of generic names.
- Clear disagreement → rebuttal → moderated consensus flow.
- Fully integrated with regional guideline logic.
- Gamification and marketing modules remain independent.
- **Draft PR opened** with full documentation and validation results.

---

## 📋 Acceptance Criteria

| Criterion | Requirement | Validation Method |
|-----------|-------------|-------------------|
| Discussion Rounds | ≥ 3 rounds per case | Backend validation + test |
| Disagreements | ≥ 2 disagreements per case | Count stance='Disagree' |
| Specialty Diversity | ≥ 3 unique specialties | Count unique `specialty` fields |
| Panel Consensus | ≥ 100 characters | String length check |
| No Generic Names | Zero "Dr. Smith" references | Grep search + manual review |
| Regional Anchoring | Local→National→Continental→WHO citations | Manual case review |
| Frontend Variables | No `debates` or `consensus` undefined errors | Browser console + build |
| External Review UI | Completely removed | Visual QA |

---

*This file serves as the **authoritative Copilot instruction** for implementing the professor-v3 conference engine. When Copilot sees this guide, it should execute the full workflow including code changes, validation, git operations, and PR creation.*
