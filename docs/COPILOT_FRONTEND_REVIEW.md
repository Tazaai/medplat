# Copilot Frontend Review — MedPlat

Purpose
-------
This document is a ready-to-use Copilot / AI reviewer prompt and checklist for reviewing and optimizing the MedPlat frontend (React + Vite).

How to use
---------
- Paste the contents of the "Copilot Review Task" block below into Copilot or any AI assistant to create a targeted PR or review comments for frontend changes.
- Use this file as an anchor in PR descriptions to instruct Copilot or reviewers what to validate.

Copilot Review Task
-------------------
```markdown
# 🧭 Copilot Review Task – MedPlat Frontend

Goal: Review and optimize frontend code for consistency and matching with backend data.

Focus:
1. Verify React routes and components correctly render:
   - `CaseView.jsx`
   - `Level2CaseLogic.jsx`
   - `DialogChat.jsx`
   - `App.jsx` / router config

2. Confirm API base (`VITE_API_BASE`) is injected correctly and used consistently.
   - `/api/topics` → GET and POST both supported by backend
   - `/api/dialog` → check model and language parameters
   - `/api/gamify` → gamified MCQs, payload shape

3. Check build entry files:
   - `main.jsx` mounts `App`.
   - No mismatched imports (e.g., `./components/...` paths).

4. Confirm dynamic rendering:
   - `CaseView.jsx` displays topics and loads cases dynamically.
   - Gamification toggle switches correctly to `Level2CaseLogic`.

5. Ensure no redundant console logs, unused imports, or missing dependency arrays in `useEffect`.

Output:
- List inconsistencies or mismatches between frontend and backend API paths.
- Suggest cleanup or modern React optimizations (lazy loading, Suspense, error boundaries).
- Provide a minimal PR checklist of recommended edits and tests to run locally.
```

Repository-specific notes
-------------------------
- Frontend build-time API base: `VITE_API_BASE` must be set at build time. CI currently prefers `BACKEND_BASE` secret and falls back to a known deployed backend URL. When testing locally, set `VITE_API_BASE` prior to `npm run build`.
- Backend topics endpoints: prefer `GET /api/topics` for a full listing and `/api/topics/search` for filtered queries.
- Local dev: the backend's `firebaseClient.js` provides a noop Firestore fallback when `FIREBASE_SERVICE_KEY` is not present — tests that rely on Firestore should set that env or be run with the noop expectations.

Suggested PR template snippet
-----------------------------
When opening a frontend PR that asks Copilot to review, include this snippet in the PR description to instruct the reviewer/AI:

```
Please run the Copilot Frontend Review (docs/COPILOT_FRONTEND_REVIEW.md) focusing on:
- API contract checks for `/api/topics` and `/api/topics/search`
- VITE_API_BASE usage and build wiring
- Component correctness: CaseView, Level2CaseLogic, DialogChat
- Any missing tests or fixable lint issues
```

Quick manual checks (commands)
----------------------------
Build locally with a real backend URL:

```bash
export VITE_API_BASE="https://medplat-backend-139218747785.europe-west1.run.app"
npm --prefix frontend ci
npm --prefix frontend run build
```

Run the smoke test (after deploy):

```bash
bash scripts/run_smoke_local.sh "https://medplat-frontend-139218747785.europe-west1.run.app" "https://medplat-backend-139218747785.europe-west1.run.app"
```

Follow-ups and automation
------------------------
- Optional: add a CI job that runs a lightweight Copilot prompt (via actions/github-script) on frontend PRs and posts a suggested checklist — treat AI suggestions as advisory only.
- Keep `docs/COPILOT_FRONTEND_REVIEW.md` up to date if APIs or component names change.

Maintainers: add this file to PRs when requesting an AI review for frontend changes.
