## Admin checklist — quick actions to finish the deploy

This file is a short, copy-paste ready checklist for an authorized admin to grant the required IAM roles and run the `deploy.yml` workflow. Paste these commands into a terminal where `gcloud` and `gh` are configured for an account with project-owner and repo/workflow permissions.

Replace PROJECT_ID and SA_EMAIL before running.

1) Set variables

```bash
PROJECT_ID=your-gcp-project-id
SA_EMAIL=service-account@${PROJECT_ID}.iam.gserviceaccount.com
```

2) Grant minimal IAM roles needed by the CI service account

```bash
# Secret Manager (create and add versions)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" --role="roles/secretmanager.admin"

# Cloud Build (submit builds)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" --role="roles/cloudbuild.builds.builder"

# Artifact Registry (push images)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" --role="roles/artifactregistry.writer"

# Cloud Run (deploy)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" --role="roles/run.admin"

# Allow the workflow to impersonate / use service accounts when deploying
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" --role="roles/iam.serviceAccountUser"

# Enable required APIs
gcloud services enable secretmanager.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com run.googleapis.com --project=$PROJECT_ID
```

3) Trigger the workflow (GitHub UI or GH CLI)

Option A: GitHub UI — Repository → Actions → "Deploy MedPlat (Local-First → Cloud Run)" → Run workflow on `main`.

Option B: GH CLI (on admin machine)

```bash
# from repository clone
gh workflow run deploy.yml --ref main

# list recent runs and find the run id
gh run list --workflow="deploy.yml" --limit 5

# fetch logs once run completes (replace <id>)
gh run view <id> --log > /tmp/deploy-run-<id>.log
```

4) Hand-off to automation agent

- After triggering, either attach the run id here or let the agent poll the repository (if the agent has permission). The easiest is to paste the run id in the PR or open a quick comment in PR #31 with the run id.

If you want the agent to download logs automatically, run the helper script in `scripts/` from an admin machine and it will place logs under `/workspaces/medplat/tmp/` in the devcontainer after `scp` or similar.

— Admin checklist

---

Optional: Workload Identity Federation (recommended long-term)

If you prefer not to store a service account JSON in GitHub Secrets, configure Workload Identity Federation (WIF) so GitHub Actions can impersonate a service account via OIDC. The workflow supports WIF when the secrets `WORKLOAD_IDENTITY_PROVIDER` and `WORKLOAD_IDENTITY_SERVICE_ACCOUNT` are set.

High-level steps (run as a GCP project owner):

```bash
# 1) Create a service account (if not already created)
gcloud iam service-accounts create gha-medplat-sa --project=$PROJECT_ID --display-name="GH Actions deploy SA"

# 2) Grant the same roles to this SA as above (secretmanager.admin, cloudbuild.builds.builder, artifactregistry.writer, run.admin, iam.serviceAccountUser)
SA_EMAIL=gha-medplat-sa@${PROJECT_ID}.iam.gserviceaccount.com
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:${SA_EMAIL}" --role="roles/secretmanager.admin"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:${SA_EMAIL}" --role="roles/cloudbuild.builds.builder"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:${SA_EMAIL}" --role="roles/artifactregistry.writer"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:${SA_EMAIL}" --role="roles/run.admin"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:${SA_EMAIL}" --role="roles/iam.serviceAccountUser"

# 3) Create a Workload Identity Provider linked to GitHub Actions OIDC
# Replace ORGANIZATION and REPO accordingly, or use the full provider id returned.
gcloud iam workload-identity-pools create "github-pool" --project="$PROJECT_ID" --location="global" --display-name="GitHub Actions Pool" || true

WORKLOAD_POOL_ID=$(gcloud iam workload-identity-pools describe github-pool --project=$PROJECT_ID --location=global --format='value(name)')

gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="$PROJECT_ID" --location="global" --workload-identity-pool="github-pool" \
  --display-name="GitHub OIDC" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --allowed-audiences="api://GitHubActions" \
  --attribute-mapping="google.subject=assertion.sub" || true

# 4) Allow the provider to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WORKLOAD_POOL_ID}/attribute.repository/${GITHUB_REPOSITORY}" --project=$PROJECT_ID || true

# 5) Configure GitHub Secrets (set these values in repo Settings → Secrets → Actions)
# WORKLOAD_IDENTITY_PROVIDER should be the full resource name of the provider, e.g.: "projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider"
# WORKLOAD_IDENTITY_SERVICE_ACCOUNT should be the SA email: gha-medplat-sa@PROJECT_ID.iam.gserviceaccount.com
gh secret set WORKLOAD_IDENTITY_PROVIDER --body "$WORKLOAD_IDENTITY_PROVIDER"
gh secret set WORKLOAD_IDENTITY_SERVICE_ACCOUNT --body "$SA_EMAIL"
```

Notes:
- The workflow will choose WIF auth when `WORKLOAD_IDENTITY_PROVIDER` and `WORKLOAD_IDENTITY_SERVICE_ACCOUNT` are present (the validate step already detects this). Using WIF is preferred because it avoids placing JSON keys in GitHub Secrets and is easier to rotate.
- If you run into permission issues with the provider principal, ensure the `attribute.repository` mapping matches the GitHub repository slug (`owner/repo`) or use a looser principal binding for initial tests.
