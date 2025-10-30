Workload Identity setup (short)
================================

Purpose: enable GitHub Actions to authenticate to GCP without long-lived keys by using Workload Identity Federation (recommended).

Quick commands (run as a GCP admin):

1) Create pool + provider (adjust PROJECT/ORG/REPO):

gcloud iam workload-identity-pools create github-pool --project=PROJECT_ID --location=global --display-name="GitHub Actions pool"

gcloud iam workload-identity-pools providers create-oidc github-medplat-provider \
  --project=PROJECT_ID --location=global --workload-identity-pool=github-pool \
  --issuer="https://token.actions.githubusercontent.com" \
  --allowed-audiences="https://github.com/ORG/REPO" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository"

2) Create service account and allow impersonation:

gcloud iam service-accounts create medplat-deployer --project=PROJECT_ID --display-name="MedPlat CI deployer"

gcloud iam service-accounts add-iam-policy-binding medplat-deployer@PROJECT_ID.iam.gserviceaccount.com \
  --project=PROJECT_ID --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_ID/locations/global/workloadIdentityPools/github-pool/providers/github-medplat-provider"

3) Give minimal roles (Secret Manager, Cloud Run, Cloud Build):

gcloud projects add-iam-policy-binding PROJECT_ID --member="serviceAccount:medplat-deployer@PROJECT_ID.iam.gserviceaccount.com" --role="roles/secretmanager.admin"
gcloud projects add-iam-policy-binding PROJECT_ID --member="serviceAccount:medplat-deployer@PROJECT_ID.iam.gserviceaccount.com" --role="roles/run.admin"
gcloud projects add-iam-policy-binding PROJECT_ID --member="serviceAccount:medplat-deployer@PROJECT_ID.iam.gserviceaccount.com" --role="roles/cloudbuild.builds.editor"

4) Add these GitHub secrets in repository settings → Secrets → Actions:

WORKLOAD_IDENTITY_PROVIDER=projects/PROJECT_ID/locations/global/workloadIdentityPools/github-pool/providers/github-medplat-provider
WORKLOAD_IDENTITY_SERVICE_ACCOUNT=medplat-deployer@PROJECT_ID.iam.gserviceaccount.com

Notes: prefer Workload Identity. Only use a service-account JSON (GCP_SA_KEY) as a last resort.
