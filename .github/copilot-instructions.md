# 🤖 **MedPlat – Copilot Operational Guide (Phase 4)**

> **Location:** `.github/copilot-instructions.md`  
> **Last Updated:** 2025-11-12  
> **Base:** v3.0.0 | **Target:** v4.0.0 (AI Mentor + Curriculum Builder)

---

## ⚙️ 1. Scope of Work

Copilot develops only within:
`feature/phase4-ai-mentor`

Use the Phase 4 documentation as the **single source of truth**:

```
docs/COPILOT_PHASE4_GUIDE.md
PHASE4_PLAN.md
PHASE4_QUICK_REFERENCE.md
docs/EXTERNAL_PANEL_GUIDE_FOR_COPILOT.md
docs/COPILOT_MASTER_GUIDE.md
PHASE3_OPERATIONS_GUIDE.md
```

Do **not** edit, rename, or duplicate these files.

---

## ⚠️ 2. Non-Production Reference Notice

The file
`docs/EXTERNAL_PANEL_GUIDE_FOR_COPILOT.md`
is **NOT** executable or deployable code.

It exists **only** to teach Copilot about MedPlat's global development philosophy:

* 17-member External Development Panel composition
* Clinical reasoning and guideline hierarchy
* Gamification × academic-rigor balance (Duolingo + UpToDate)
* Inclusivity across 30 languages & resource settings
* AI behavior and safety metrics

Copilot must:

* ✅ *Read and understand* these principles
* 🚫 *Never* insert this text, structure, or wording into runtime code
* 🚫 *Never* generate production logic directly referencing this file

---

## 🧠 3. Behavior Model

When generating code or documentation:

1. **Preserve Phase 3 stability** — all regression tests (\`validate_phase3.sh\`) must pass.
2. **Implement Phase 4 milestones** sequentially per \`COPILOT_PHASE4_GUIDE.md\`.
3. **Honor governance** rules from \`COPILOT_MASTER_GUIDE.md\`.
4. **Reflect panel philosophy** in reasoning depth, UX clarity, and inclusivity — *without quoting it.*

---

## 🧩 4. Phase 4 Milestones

| # | Milestone                | Key Tasks                                                            | Target Weeks |
| - | ------------------------ | -------------------------------------------------------------------- | ------------ |
| 1 | Infrastructure           | Firestore guideline seeding · CI/CD auto-routing · Telemetry logging | 1–4          |
| 2 | AI Mentor Mode           | Personalized sessions · Weak-area plans · Progress tracking          | 5–6          |
| 3 | Curriculum Builder       | Exam paths · Topic progression · Certification output                | 7            |
| 4 | Analytics & Optimization | Admin dashboard · Model tuning · A/B testing                         | 8            |

---

## 📊 5. Development Standards

**Clinical Depth**

* Always include ≥ 3 differentials and risk scores (CHA₂DS₂-VASc, HEART, CURB-65).
* Fetch guidelines dynamically (local → national → regional → international).
* Keep evidence references structured (Class I/II/III; Level A/B/C).

**Educational Philosophy**

* Use Duolingo-style XP, streaks, and motivation loops.
* Combine with UpToDate-level evidence and professional language.
* Support personas: 🎓 Student · 📝 USMLE · 👨‍⚕️ Doctor.
* Apply adaptive difficulty (≈ 60% weak areas / 40% new topics).

**Global Inclusivity**

* Ensure translations and units auto-adapt to user locale.
* Respect local medication availability and guidelines.
* Handle high-/low-resource mode gracefully.

**Quality Metrics**

* DAU +20% by v4.0.0
* 7-day streak retention ≥ 60%
* Quiz completion ≥ 75%
* Guideline alignment ≥ 95% (ESC/AHA/NICE)

---

## 🧭 6. External Development Panel Context (Read-Only)

Seventeen experts provide cross-specialty governance:
Medical Student, Medical Doctor, 3 Specialists, Pharmacist, 2 GPs, 2 Emergency Physicians, Field Researcher, 1-2 Radiologists, Professor of Medicine, AI-Coding Expert, USMLE Expert, Web Developer, Competitor Voice, Business Consultant, Marketing Expert.

Their reviews focus on:

* Clinical logic and reasoning patterns
* Educational progression and UX clarity
* AI architecture reliability
* Global adaptability

Output:
\`[Global Consensus Summary] → Themes · Scope · Priority · Responsibility\`

---

## 🔒 7. Quality Gates (Before Merge)

* ✅ \`validate_phase3.sh\` passes 10/10
* ✅ New endpoints return expected JSON
* ✅ Telemetry shows no latency regression
* ✅ Docs updated (PHASE4_PLAN.md checklist)
* ✅ External Panel review recorded

---

## 🚀 8. Autonomous Execution Flow

\`\`\`bash
# Example command sequence
"Implement Firestore guidelines seeding per COPILOT_PHASE4_GUIDE.md"
# Copilot steps:
# 1. Create backend/setup/seed_guidelines.js
# 2. Update guidelines_api.mjs (Firestore + static fallback)
# 3. Run validate_phase3.sh
# 4. Commit: 'Phase4 M1: Firestore guideline seeding – validated 10/10'
\`\`\`

Copilot then continues Milestone 2→4 automatically, tagging:

\`\`\`
v4.0.0-alpha → v4.0.0-beta → v4.0.0
\`\`\`

---

## ✅ 9. End State

When Phase 4 completes:

* All new infrastructure self-maintains
* AI Mentor Mode and Curriculum Builder operational
* Analytics dashboard live
* Regression tests 100% passing
* External Panel consensus approved

---

