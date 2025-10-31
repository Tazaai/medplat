# MedPlat scripts

This folder contains lightweight helper scripts used by the repository for local development and CI.

Files
- `seed_topics.mjs` - (idempotent) seeds sample topics into Firestore `topics2` when `FIREBASE_SERVICE_KEY` is present.
- `delete_seeded_topics.mjs` - deletes the seeded topics.
- `post_deploy_smoke_test.mjs` - Node-based smoke test that validates backend root, POST `/api/topics`, and frontend root. Writes artifacts into `./tmp`.
- `run_smoke_local.sh` - small wrapper that ensures `./tmp` exists then runs `post_deploy_smoke_test.mjs` and pipes output to `tmp/smoke-output-local.txt`.
- `test_openai.mjs` - quick OpenAI key validation helper.
- `setup_gcp_artifact_repo.sh` - idempotent helper to ensure Artifact Registry repo exists and grant IAM roles to a CI service account.

Quick local smoke test

Use the wrapper so the `tmp` directory exists before piping output to `tee`:

```bash
./scripts/run_smoke_local.sh \
  "https://medplat-frontend-2pr2rrffwq-ew.a.run.app" \
  "https://medplat-frontend-139218747785.europe-west1.run.app" \
  "https://medplat-backend-2pr2rrffwq-ew.a.run.app" \
  "https://medplat-backend-139218747785.europe-west1.run.app"
```

This will create `./tmp` and write `tmp/smoke-output-local.txt` as well as timestamped `tmp/smoke-*.log` and `tmp/smoke-*.json` files.

Seeding topics (local)

If you have a service account JSON for Firebase, set it into `FIREBASE_SERVICE_KEY` (or `GOOGLE_APPLICATION_CREDENTIALS`) and run the seeder:

```bash
node scripts/seed_topics.mjs
```

CI / Workflows

- The repository contains workflows that run the smoke test after deploy and upload the `./tmp` artifacts. The smoke script already creates `./tmp` when it writes artifacts; the `run_smoke_local.sh` helper ensures `tmp` exists for piping in shells.

Security

- Do not commit service account JSONs. Use GitHub Secrets (`FIREBASE_SERVICE_KEY`, `GCP_SA_KEY`, `OPENAI_API_KEY`) and Workload Identity where possible.
# Seeding & scripts

This folder contains small helper scripts for seeding and local testing.

scripts/seed_topics.js
- Seeds the Firestore collection configured by `TOPICS_COLLECTION` (defaults to `topics2`) using the `FIREBASE_SERVICE_KEY` environment variable.
- The script is conservative: it only runs when `FIREBASE_SERVICE_KEY` is present, and will not overwrite existing documents with deterministic IDs.

Usage (local):

```bash
# create a service account key (see below) and download medplat-seeder-key.json
export FIREBASE_SERVICE_KEY="$(jq -c . medplat-seeder-key.json)"
export TOPICS_COLLECTION=topics2
node scripts/seed_topics.js
```

Create service account (Cloud Shell):

```bash
PROJECT_ID="medplat-458911" # replace with your project id
SA_NAME="medplat-seeder"
gcloud iam service-accounts create "$SA_NAME" --project="$PROJECT_ID" --display-name="MedPlat seeder account"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:${SA_EMAIL}" --role="roles/datastore.user"
gcloud iam service-accounts keys create ./medplat-seeder-key.json --project="$PROJECT_ID" --iam-account="$SA_EMAIL"
```

CI / GitHub Actions
- There's a manual workflow at `.github/workflows/seed_topics.yml` that can be triggered from the Actions UI. Add the `FIREBASE_SERVICE_KEY` secret to your repository and then trigger the workflow.

Security notes
- Never commit service account JSON keys. Use GitHub Secrets and Secret Manager in CI.
- The seed workflow is `workflow_dispatch` and will abort if `FIREBASE_SERVICE_KEY` is not present.
