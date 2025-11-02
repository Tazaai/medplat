# Deploy & Admin Instructions

This PR contains the automated CI changes and a readiness report so a project admin can review, grant the required IAM roles, and trigger the production deploy safely.

What this PR includes
- The updated `deploy.yml` workflow (auth via `credentials_json`, tolerant Secret Manager steps).
- `agent.md` (generated readiness report) — please include this content in the PR description when merging.

Why: The GitHub runner in the automation environment cannot create workflow_dispatch events for this repo (403). This PR provides a clear, auditable admin flow so an authorized person can grant IAM roles and run the workflow from the GitHub UI or a local GH CLI configured with appropriate permissions.

Recommended IAM changes (run as a project owner or admin):

Replace these variables before running the commands:

- `PROJECT_ID` — your GCP project id
- `SA_EMAIL` — service account email (the one whose JSON is in `GCP_SA_KEY` secret)

```bash
# Example:
PROJECT_ID=your-gcp-project-id
SA_EMAIL=service-account@${PROJECT_ID}.iam.gserviceaccount.com

# Grant Secret Manager admin (create/add versions)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" --role="roles/secretmanager.admin"

# Allow Cloud Build submissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" --role="roles/cloudbuild.builds.builder"

# Allow pushing to Artifact Registry
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" --role="roles/artifactregistry.writer"

# Allow Cloud Run deployment
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" --role="roles/run.admin"

# Allow using service accounts when deploying
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" --role="roles/iam.serviceAccountUser"

# Enable required APIs
gcloud services enable secretmanager.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com run.googleapis.com --project=$PROJECT_ID
```

How to trigger the deployment (admin paths)

Option A — GitHub UI (recommended):
1. Go to the repository → Actions → "Deploy MedPlat (Local-First → Cloud Run)".
2. Click "Run workflow", choose `main` and run.
3. Wait for the run to complete. If successful the workflow will print the Backend/Frontend URLs and run post-deploy smoke tests.

Option B — Local GH CLI (admin machine with a PAT that has `repo`, `workflow` scopes):
```bash
# Run the workflow
gh workflow run deploy.yml --ref main

# Find the run id and fetch logs when complete
gh run list --workflow="deploy.yml" --limit 5
gh run view <id> --log > deploy-run-<id>.log
```

Notes & safety
- Never store service account JSON in the repo. Keep it only in GitHub Secrets. Example to set secret locally (on admin machine):
  gh secret set GCP_SA_KEY --body "$(cat ~/Downloads/medplat-...json)"
- The workflow now accepts the service-account JSON via `credentials_json` and will write a credentials file internally; no local files are committed.
- If you prefer Workload Identity Federation (WIF), we can switch the workflow to use WIF — that requires setting `WORKLOAD_IDENTITY_PROVIDER` and `WORKLOAD_IDENTITY_SERVICE_ACCOUNT` secrets and minimal project config.

Logs & artifacts
- Automated-run logs (from earlier attempts) are saved in the workspace under `tmp/` by the automation agent for traceability. See `/workspaces/medplat/tmp/` in the development container.

If you'd like I can: open this PR now (below), then monitor the run and fetch logs once you trigger it in UI. If you prefer I can also create a smaller PR that only adds `agent.md` and the instructions.

— Automation agent
