### 🧩 GitHub Copilot – Deployment and Secret Management Guide

Purpose:
Ensure Copilot, CI, and human developers always use the correct backend URL (`BACKEND_BASE`) when building or deploying MedPlat frontend.

---

1) Pre-Build Checklist

Before Copilot or CI runs any build, ensure required secrets exist:

secrets:
  OPENAI_API_KEY: required
  FIREBASE_SERVICE_KEY: required
  GCP_PROJECT: required
  GCP_SA_KEY: required
  BACKEND_BASE: required   # example: https://medplat-backend-139218747785.europe-west1.run.app

Copilot/CI must verify `BACKEND_BASE` exists before starting the frontend build. If missing:
- Pause the build
- Post a comment or log: "❌ Missing BACKEND_BASE secret. Please add it in GitHub → Settings → Actions → Secrets."

2) Frontend Build Step (automated by CI)

# Inject backend base into Vite
export VITE_API_BASE="$BACKEND_BASE"

npm ci --prefix frontend
npm run build --prefix frontend

Expected output: built frontend in `frontend/dist` where all API calls point to the correct Cloud Run backend URL.

3) Cloud Run Manual Redeploy (if needed)

If CI is unavailable or Copilot triggers a local redeploy:

gcloud builds submit frontend --tag gcr.io/$GCP_PROJECT/medplat-frontend:latest

gcloud run deploy medplat-frontend \
  --image gcr.io/$GCP_PROJECT/medplat-frontend:latest \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars "VITE_API_BASE=$BACKEND_BASE"

4) Copilot Behavior (Autonomous Rules)

Copilot must:

1. Check `BACKEND_BASE` before building or deploying frontend.
2. If undefined, ask developer or CI to set it via:

gh secret set BACKEND_BASE -b "https://medplat-backend-139218747785.europe-west1.run.app"

3. After build, confirm:
   - `/api/topics` returns JSON (HTTP 200).
   - Frontend shows correct topic count (>1000).
   - CORS headers are valid.

4. Log a diagnostic summary as a PR comment using `peter-evans/create-or-update-comment`.

5) Fallback Commands for Developers

If Copilot or CI cannot run workflows (403 error), use the fallback:

# Trigger a build manually
git checkout main
git pull origin main
git commit --allow-empty -m "ci: trigger frontend build with BACKEND_BASE"
git push origin main

6) Security Note

Never expose or paste PATs or service keys into chat or logs. If any are exposed, revoke immediately:
https://github.com/settings/tokens

✅ Copilot Goal: Maintain automated, reproducible, and secure deployment pipelines — always using the correct dynamic backend endpoint and ensuring the frontend reflects real topics from Firebase (`topics2`).

---

### 🤖 GitHub Copilot Operational Directives (MedPlat)

Purpose:
Define how Copilot should act automatically in this repository to ensure smooth CI/CD, secret handling, and backend–frontend synchronization.

---

#### 🧩 Core Behavior Rules

1. **Never ask repeated questions.**
   If the repo context defines a known fix (e.g., `BACKEND_BASE`, `VITE_API_BASE`, or missing secrets), **apply the documented step automatically** and log the change in the PR body.

2. **Respect system files.**

   * `PROJECT_GUIDE.md` and `GITHUB_COPILOT_GUIDE.md` are *read-only reference files*.
   * Copilot must never overwrite or auto-edit them unless commit message explicitly includes:
     `"Authorized edit – Copilot system file update"`

3. **Use structured commit messages.**

   ```
   docs: update Copilot config (non-breaking)
   fix(ci): add BACKEND_BASE validation
   chore: rebuild frontend artifact after secret update
   ```

4. **During CI runs:**

   * Ensure `BACKEND_BASE` secret exists.
   * Export `VITE_API_BASE=$BACKEND_BASE` before building frontend.
   * Verify `/api/topics` responds with valid JSON (>1000 topics).
   * Post a PR comment summarizing the result (`peter-evans/create-or-update-comment@v4`).

5. **For workflow dispatch errors (403):**

   * Do *not* retry indefinitely.
   * Log `Permission Denied (403)` and suggest using manual admin command:

     ```bash
     gh secret set BACKEND_BASE -b "<backend-url>"
     gh workflow run e2e-smoke.yml --ref main
     ```

6. **When backend redeployment is needed:**

   * Run:

     ```bash
     gcloud builds submit backend --tag gcr.io/$GCP_PROJECT/medplat-backend:latest
     gcloud run deploy medplat-backend \
       --image gcr.io/$GCP_PROJECT/medplat-backend:latest \
       --region europe-west1 \
       --allow-unauthenticated
     ```
   * Then verify:
     `curl -sS "$BACKEND_BASE/api/topics" | jq .ok`

7. **For new branches:**

   * Always name feature branches using this pattern:
     `feat/<short-topic>` or `fix/<short-topic>`.
   * After push, automatically open a PR with a clear body, example:

     ```
     Adds feature for backend/AI improvements.
     Follows PROJECT_GUIDE.md and GITHUB_COPILOT_GUIDE.md conventions.
     ```

---

#### 🔐 Security Expectations

* Never request or store personal access tokens (PATs) or service keys.
* If a secret appears in logs, redact and flag immediately.
* Always prefer GitHub UI for secret management (Actions → Secrets).
* Log any manual overrides in CI summary as:
  `"Manual secret injection detected — validated ✅"`

---

#### ✅ Copilot’s Goals

* Maintain **seamless backend–frontend synchronization**.
* Prevent **VITE_API_BASE** or **BACKEND_BASE** mismatches.
* Guarantee **secure, autonomous deployments** using only validated secrets.
* Keep all documentation **human-readable, audit-ready, and reproducible**.

Once merged, Copilot and CI will use these directives automatically.
