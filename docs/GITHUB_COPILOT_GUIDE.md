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
