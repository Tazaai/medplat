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
