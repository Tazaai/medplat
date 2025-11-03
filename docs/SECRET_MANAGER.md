# Secret Manager: Mounting service account JSON into Cloud Run

This document explains the recommended, secure way to provide Firebase/Google credentials to the backend using Secret Manager and Cloud Run.

1) Create the secret (one-time):

```bash
# from repository root
gcloud secrets create medplat-service-key \
  --data-file=backend/serviceAccountKey.json \
  --replication-policy="automatic"
```

2) Deploy the backend with the secret mounted at `/app/serviceAccountKey.json`:

```bash
gcloud run deploy medplat-backend \
  --image gcr.io/$GCP_PROJECT/medplat-backend \
  --region europe-west1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "GOOGLE_APPLICATION_CREDENTIALS=/app/serviceAccountKey.json" \
  --set-secrets "/app/serviceAccountKey.json=medplat-service-key:latest"
```

3) Notes and best practices

- Do NOT commit the service account JSON to the repository. Use Secret Manager and/or Workload Identity.
- Rotate the secret periodically and update the secret version; Cloud Run will read the latest version when the container restarts.
- Prefer Workload Identity (attach a service account to the Cloud Run service) for long-term production setups.
- For local development use the `keys/serviceAccountKey.json` only if you understand the security implications; avoid committing it.
