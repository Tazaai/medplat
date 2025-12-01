# MedPlat Project Master Plan

## Hybrid Gamification v2.0 (Unified Engine)

BEGIN_WORK

GOAL:

Implement Hybrid Gamification v2.0 across the entire MedPlat system.

This must be universal, dynamic, geolocation-aware, and integrated into the existing backend + frontend without breaking current production.

CORE OBJECTIVE:

Upgrade MedPlat into one engine that supports:

1) Classic full case mode  

2) Gamified MCQ mode  

3) Interactive Simulation mode  

All dynamically generated from ONE unified case-generation system using GPT-4o-mini + internal panel.

=======================

PHASE 1 — BACKEND CORE

=======================

1. Update generate_case_clinical.mjs schema:

   - Add fields:

     * simulation_steps[]

     * interaction_points[]

     * vitals_timeline[]

     * branching_logic{}

     * xp_rewards{}

     * user_levels

     * mentor_explanations

     * mcq_pack[]

   - These must be generated in ONE GPT call.

2. Update system prompt:

   - Always high-level specialist reasoning.

   - No beginner mode.

   - Fully dynamic per topic.

   - Fully region-aware (geolocation only).

   - Language = UI only.

   - Guidelines cascade: local → national → continental → US → global.

3. Internal panel:

   - Ensure 8–10 reviewers.

   - Add panel checks for:

       * branching logic consistency

       * vitals progression correctness

       * MCQ quality (difficulty spectrum)

       * simulation safety rules

   - Panel output merges all corrections back into refined_case.

4. Create new module:

   backend/intelligence_core/interactive_engine.mjs

   - Functions:

       * buildSimulation(case)

       * buildBranching(case)

       * buildVitals(case)

       * buildInteractionPoints(case)

   - Should only refine/structure, not generate text.

5. Extend dialog_api.mjs:

   - Add mode:

       * mode: "classic" | "gamified" | "simulation"

   - Default: classic

   - Return only the relevant UI subset based on mode.

   - Keep internal panel hidden (metadata only in logs).

=======================

PHASE 2 — FRONTEND (React)

=======================

1. Add components:

   * SimulationMode.jsx

   * BranchingDecision.jsx

   * VitalsTimeline.jsx

   * XPBar.jsx

   * LevelBadge.jsx

   * MentorWindow.jsx

2. Update CaseView.jsx:

   - Add mode selector.

   - When mode=simulation → render SimulationMode

   - When mode=gamified → use existing MCQ engine + XP + mentor feedback

   - When mode=classic → show full case

3. Add gamification store:

   frontend/src/state/gamificationStore.js

   - Fields:

       * xp

       * streak

       * level

       * completed_cases

       * specialty_progress

4. Add UI:

   * Global XP bar (top-right)

   * Streak indicator

   * Specialty progress graph

5. Improve Next-Best-Step interactions:

   - When simulation mode:

       * user selects step

       * backend returns updated branch segment

       * vitals update live

=======================

PHASE 3 — FIREBASE

=======================

1. Add collection:

   gamification_stats

   - xp

   - level

   - streak

   - specialty

2. No changes to topics2.

=======================

PHASE 4 — VALIDATION

=======================

1. Add backend test script:

   scripts/test_hybrid_engine.sh

   - Generate 5 cases top specialties

   - Validate schema for simulation + branching

   - Validate region guidelines

   - Validate internal panel corrections

2. Add frontend cypress test:

   * Opens Simulation Mode

   * Triggers branching

   * XP increments

=======================

PHASE 5 — RULES

=======================

- Do NOT break existing Classic or Gamified modes.

- Must remain fully dynamic.

- No static guidelines.

- No case-specific patches.

- No ECG or radiology images.

- Everything text-based.

- Must run fully on gpt-4o-mini.

=======================

EXECUTE:

Implement all modifications above across backend and frontend.

Refactor code as needed.

Ensure compatibility with existing production.

No steps may be skipped.

END_WORK

