# Admin quick snippets — one-line copy/paste

These are safe, copy/paste commands for an admin to trigger the `deploy.yml` workflow and to grant the minimal IAM roles the CI service account needs.

-- Trigger the workflow (run on an admin machine with GH CLI authenticated):

```bash
gh workflow run deploy.yml --repo Tazaai/medplat --ref main
```

-- Minimal GCP IAM grants (replace only if different; project and service account are filled from the repo):

```bash
PROJECT_ID="medplat-458911"
CI_SA="firebase-adminsdk-fbsvc@medplat-458911.iam.gserviceaccount.com"

gcloud config set project "$PROJECT_ID" --quiet

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$CI_SA" \
  --role="roles/cloudbuild.builds.builder" --quiet

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$CI_SA" \
  --role="roles/artifactregistry.writer" --quiet

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$CI_SA" \
  --role="roles/run.admin" --quiet

# Grant secret access (the workflow uses secret versions; this allows reading/adding versions)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$CI_SA" \
  --role="roles/secretmanager.secretAccessor" --quiet

# Optional: if the workflow needs to impersonate other service accounts
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$CI_SA" \
  --role="roles/iam.serviceAccountUser" --quiet
```

-- Quick verification once granted:

```bash
# show bindings for the SA
gcloud projects get-iam-policy "$PROJECT_ID" --format='json' | jq '.bindings[] | select(.members[]? | contains("'$CI_SA'"))'

# list secrets (should be accessible)
gcloud secrets list --project="$PROJECT_ID"

# fetch latest pipeline runs (admin GH CLI)
gh run list --repo Tazaai/medplat --workflow=deploy.yml --limit 5
```

If you prefer WIF, follow the WIF steps in `ci/ADMIN_CHECKLIST.md` (recommended) — this avoids storing long-lived SA JSON in secrets.

If you want, I can add a tiny `ci/run_admin_checks.sh` wrapper to run the verification commands automatically on an admin machine.
