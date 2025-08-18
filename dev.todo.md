# ✅ MedPlat Dev TODO – Level 1 Gamification (Finalization – July 25, 2025)

## ✅ Completed
- [x] Level 1 partial reveal logic works in `GeneratedCase.jsx`
- [x] "Show Full Case" button cleanly reveals remaining sections
- [x] Backend `gamify_api.mjs` upgraded:
  - Section tagging (II.b, III, IV, etc.)
  - Includes support for: history, risk, exposure, family, labs, imaging, differential, diagnosis, treatment
  - Prompt templates structured with scores (1–10)
- [x] GPT-based case generator polished in `generate_case_clinical.mjs`
- [x] GPT grammar + professional tone improvement working
- [x] Language translation working

## 🛠️ In Progress
- [ ] Add ✓ and ✗ icons beside choices (UX feedback already works, style pending)
- [ ] Add score log summary at end of Level 1 session
- [ ] Highlight section context (e.g., 🧠 Diagnosis, 💊 Treatment, 🔍 Labs)
- [ ] Prevent AI "empty response" edge case in frontend
- [ ] Polish frontend button UI + layout spacing

## 🔜 Next: Level 1 Enhancements
- [ ] Map paragraphs directly to section types in frontend
- [ ] Add basic animations (e.g. button press, transition)
- [ ] Store per-question score log (in memory, or Firebase later)
- [ ] Feedback screen with final score, correct % at end of session

## 📦 Ready for Level 2 (Post-Level 1)
- [ ] Generate Level 2 case on same topic with more complexity (labs, escalation decisions, diagnostics)
- [ ] Level 2 is triggered manually after Level 1 completed
- [ ] AI generates new case (same topic) using a different prompt template
- [ ] Allow retry or challenge mode

## 🧪 Testing / Debug Notes
- Backend: Cloud Run URL for gamify = `/api/gamify/`
- Model: GPT-4, temperature 0.7
- Endpoint tested: ✅ working
- Case tested: Paragraph detection + prompt generation confirmed

---

# 🧠 Developer Notes

- Keep core logic in `GeneratedCase.jsx`, reuse prompt fetching
- Do **not** overwrite existing prompt templates or AI wording unless improving context
- Only backend infer type for now. Optional: pass `type` from frontend in future
- `medContext` support works, keep it in final version

---

## 🧠 LEVEL 2 – Diagnostic & Treatment Gamification (Started July 25)

### Backend Goals:
- [ ] Detect advanced sections: imaging, labs, differentials, diagnosis, treatment
- [ ] Improve MCQ quality using:
  - Guidelines (ESC, AHA, NICE)
  - Options like CT/MR/LP with rationale
  - Timing (e.g. PCI/tPA windows)
  - Doses, durations, contraindications
- [ ] Provide reasoning behind each choice (explanation text)
- [ ] Score weightings: best (+++), acceptable (++), wrong (–)
- [ ] Localized logic (based on language or region)

### Frontend Goals:
- [x] Add `Level2CaseLogic.jsx`
- [ ] Display each section with step-by-step challenge logic
- [ ] Support multi-question chains (Why → When → What)
- [ ] Retry mode if user answers wrong
- [ ] Expandable answer explanations
- [ ] Show per-step references (if available)

### UX & Design
- [ ] Dynamic per-case logic: less risk/family, more diagnostics/treatment
- [ ] Timeline or scoring bar for session
- [ ] Firebase logging support for score / steps
- [ ] Optional reference summary at end

---

✅ Last updated: 2025-07-25
🧑‍💻 Maintainer: QZ (rahpodcast2022)
