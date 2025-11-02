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
