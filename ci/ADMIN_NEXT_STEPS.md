# Admin next steps to enable CI deploys for MedPlat

This file contains exact commands and checklist for a project administrator to enable the GitHub Actions -> GCP deploy flow. The repo agent can run the CI once these steps are applied.

IMPORTANT: Do not commit service account JSONs into the repo. These commands must be executed by a GCP admin (owner/editor) from a secure environment with gcloud CLI.

1) Identify the CI principal

From the local repository key you can find the GCP project and the service account used during local testing.

Project: medplat-458911
CI service account (example, adjust if different): firebase-adminsdk-fbsvc@medplat-458911.iam.gserviceaccount.com

2) Grant minimal IAM roles to the CI principal

Run as a GCP admin (replace PROJECT and SA as needed):

```bash
# variables (update if different)
PROJECT=medplat-458911
SA=firebase-adminsdk-fbsvc@medplat-458911.iam.gserviceaccount.com

# Cloud Build (submit & manage builds)
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member "serviceAccount:$SA" \
  --role roles/cloudbuild.builds.builder

# Artifact Registry (write images)
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member "serviceAccount:$SA" \
  --role roles/artifactregistry.writer

# Cloud Run (deploy/manage services)
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member "serviceAccount:$SA" \
  --role roles/run.admin

# Secret Manager (create/update secrets used by the workflow)
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member "serviceAccount:$SA" \
  --role roles/secretmanager.admin

# To allow the CI to impersonate or use other service accounts if needed
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member "serviceAccount:$SA" \
  --role roles/iam.serviceAccountUser
```

3) If you prefer Workload Identity Federation (WIF)

- Create or verify a Workload Identity Provider linked to GitHub Actions (OIDC). Ensure the provider's attribute filters match the repo (e.g. repository=Tazaai/medplat).
- Grant the same roles above to the target GCP service account that the OIDC provider will impersonate.

4) GitHub permissions to dispatch workflows

To allow programmatic workflow dispatch (gh workflow run or API dispatch), ensure the token used has repo/workflow permission. Recommended approaches:

- Create a short-lived GitHub PAT from an admin user with scope: repo, workflow, and use it in automation where needed.
- Or instruct a repo admin to manually trigger the workflow from the Actions UI (Workflows → select 'Deploy MedPlat' → Run workflow). This avoids token management.

5) Debugging & verification steps (admin)

After applying IAM bindings, trigger the workflow from the Actions UI. The agent will monitor and fetch logs automatically. If Cloud Build fails with PERMISSION_DENIED, re-run the IAM binding step and check audit logs for the failing principal.

6) Safety notes

- Never store JSON service account files in the repository. Use Secret Manager + GH Secrets.
- Limit roles to the minimum necessary for CI.

If you'd like, I can generate a one-shot script to run these gcloud commands (requires a gcloud admin session) or open a PR with these docs. 
