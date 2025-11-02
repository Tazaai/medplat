# Copilot — CaseView.jsx Review Instruction

You can copy-paste the exact message below into GitHub Copilot Chat to review `frontend/src/components/CaseView.jsx`.

---

### 🧠 **Instruction for Copilot (CaseView.jsx Review)**

> **You are reviewing `frontend/src/components/CaseView.jsx` for MedPlat.**
> Your role is to act as a professional React + frontend reviewer — *not to rewrite, only to inspect and suggest.*
>
> **Focus areas:**
>
> 1. ⚙️ **Imports & dependencies**
>
>    * Check if all imports exist and are used (`lucide-react`, `jsPDF`, `recharts`, `Level2CaseLogic`).
>    * Confirm that `API_BASE` from `../config` is consistent with other frontend components.
> 2. ⚛️ **React logic**
>
>    * Verify hooks usage (`useEffect`, `useRef`) for missing dependency arrays or stale state.
>    * Ensure functions like `generateCase()`, `saveCase()`, and `copyToClipboard()` handle errors safely.
> 3. 🎨 **Rendering**
>
>    * Confirm the JSX structure is accessible and efficient (no missing `key` props, valid semantic tags).
>    * Suggest lightweight optimizations (e.g., memoization or splitting `renderBookCase` into smaller subcomponents).
> 4. 🌍 **API integration**
>
>    * Check that all fetch calls use `${API_BASE}` correctly and error handling is adequate.
>    * Verify `POST` payloads match backend expectations (especially `/api/dialog` and `/api/topics/search`).
> 5. 🧩 **UI/UX**
>
>    * Suggest improvements for readability, reusability, or responsive design (Tailwind).
>    * Point out any repetitive state logic (like area/topic/language) that could be modularized.
> 6. 🧠 **Output format**
>
>    * Provide a **short overall summary** (“Healthy, performant, small refinements suggested”)
>    * Then a **bullet list** of precise suggestions — each max one line, referencing file + line if possible.
>
> **Do not rewrite code** — only explain improvements or confirm that the component is production-ready.

---

Optional automation note:

If you'd like Copilot to auto-run this on every frontend PR for this file, trigger a workflow on PRs that touch:

```yaml
on:
  pull_request:
    paths:
      - "frontend/src/components/CaseView.jsx"
```

And instruct Copilot to: “Run the **CaseView.jsx Review** using the expert checklist in `COPILOT_CASEVIEW_REVIEW.md`.”

---

Do not modify files automatically; report findings and suggested one-line fixes.
