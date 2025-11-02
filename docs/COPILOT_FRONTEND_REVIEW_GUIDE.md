# Copilot Frontend Review – MedPlat (Expert Guide)

Use this file as the authoritative prompt you can paste into GitHub Copilot Chat or include as a PR comment to focus AI reviewers on the frontend code only.

---

### 🧠 Copilot Frontend Review – MedPlat

Goal: Review and optimize the React frontend for correctness, consistency, and build health — no backend or documentation context.

---

🎯 What to Do

1. Read only code under `frontend/**`.
2. Check:

   - Import paths → are all relative imports correct (`./components/...` etc.)?
   - API base usage → all calls use `import.meta.env.VITE_API_BASE` or a consistent `VITE_API_BASE` constant.
   - React render flow → `App.jsx`, `main.jsx`, and `CaseView.jsx` mount properly.
   - `CaseView.jsx` loads topics and cases dynamically from `/api/topics` and `/api/dialog`.
   - `Level2CaseLogic.jsx` handles gamification logic without runtime errors.
   - `DialogChat.jsx` uses async fetch safely with error handling.

3. Detect:

   - Unused imports, dead code, duplicated components.
   - `useEffect` hooks missing dependency arrays.
   - Inconsistent casing in file names (`CaseView.jsx` vs `caseview.jsx`).
   - Missing keys in `.map()` render loops.
   - Any console warnings that could appear in build or runtime.

4. Run (mentally or via code):

   - `npm --prefix frontend run build`
   - `npm --prefix frontend run lint`
   - Confirm no warnings or JSX syntax errors.

5. Suggest improvements:

   - Simplify component structure if possible.
   - Lazy-load large components with `React.lazy()` if beneficial.
   - Ensure Tailwind classes follow best practices and no redundant inline styles.
   - If a prop is passed but unused, remove it.

---

📋 Deliverables

When done, produce:

- ✅ A summary paragraph of frontend health.
- 🪶 A bullet list of issues or inconsistencies.
- 🧩 Recommended fixes (short code suggestions if needed).

Do not alter files automatically unless the user confirms.

---

You can paste this as the opening message to GitHub Copilot Chat or include it as a PR comment. Keep the scope strictly limited to `frontend/**` files and the build.

---

Quick commands (for maintainers)

```bash
# Build locally with VITE_API_BASE set to the deployed backend URL
export VITE_API_BASE="https://medplat-backend-139218747785.europe-west1.run.app"
npm --prefix frontend ci
npm --prefix frontend run build

# Run local lint
npm --prefix frontend run lint || true
```

---

If you'd like this applied automatically, add a CI job that runs on PRs touching `frontend/**` and posts this file as a PR comment (this repository already contains such a workflow `copilot_frontend_review.yml`).
