#!/usr/bin/env bash
# Minimal helper to configure Workload Identity for GitHub Actions
# Run this from a machine with gcloud and the right permissions.
# Usage: ./scripts/setup_workload_identity.sh PROJECT_ID GITHUB_ORG REPO_NAME

set -euo pipefail

if [ "$#" -lt 3 ]; then
  echo "Usage: $0 <GCP_PROJECT> <GITHUB_ORG> <REPO_NAME>"
  exit 2
fi

GCP_PROJECT=$1
GITHUB_ORG=$2
REPO_NAME=$3

WIF_PROVIDER_ID="github-medplat-provider"
WORKLOAD_IDENTITY_POOL="github-pool"
FULL_PROVIDER_NAME="projects/${GCP_PROJECT}/locations/global/workloadIdentityPools/${WORKLOAD_IDENTITY_POOL}/providers/${WIF_PROVIDER_ID}"
SA_EMAIL="medplat-deployer@${GCP_PROJECT}.iam.gserviceaccount.com"

echo "This script will create a workload identity pool + provider and allow GitHub Actions to impersonate ${SA_EMAIL}."
echo
echo "Commands to be run (copy/paste or run with gcloud):"
echo
echo "# 1) Create workload identity pool"
echo gcloud iam workload-identity-pools create "${WORKLOAD_IDENTITY_POOL}" --project="${GCP_PROJECT}" --location="global" --display-name="GitHub Actions pool for MedPlat"
echo
echo "# 2) Create provider that trusts GitHub repo"
echo gcloud iam workload-identity-pools providers create-oidc "${WIF_PROVIDER_ID}" \\
echo "  --project="${GCP_PROJECT}" --location="global" --workload-identity-pool="${WORKLOAD_IDENTITY_POOL}" \\
echo "  --display-name="GitHub Actions provider" \\
echo "  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \\
echo "  --issuer="https://token.actions.githubusercontent.com" \\
echo "  --allowed-audiences="https://github.com/${GITHUB_ORG}/${REPO_NAME}"
echo
echo "# 3) Create service account (if needed)"
echo gcloud iam service-accounts create medplat-deployer --project="${GCP_PROJECT}" --display-name="MedPlat CI deployer"
echo
echo "# 4) Allow the service account to be impersonated by identities from the provider"
echo gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
echo "  --project="${GCP_PROJECT}" \
echo "  --role="roles/iam.workloadIdentityUser" \
echo "  --member="principalSet://iam.googleapis.com/${FULL_PROVIDER_NAME}"
echo
echo "# 5) Grant minimal roles to the service account"
echo gcloud projects add-iam-policy-binding "${GCP_PROJECT}" --member="serviceAccount:${SA_EMAIL}" --role="roles/secretmanager.admin"
echo gcloud projects add-iam-policy-binding "${GCP_PROJECT}" --member="serviceAccount:${SA_EMAIL}" --role="roles/run.admin"
echo gcloud projects add-iam-policy-binding "${GCP_PROJECT}" --member="serviceAccount:${SA_EMAIL}" --role="roles/cloudbuild.builds.editor"
echo
echo "# After running the commands above: set these GitHub secrets in the repository:"
echo "# WORKLOAD_IDENTITY_PROVIDER=projects/${GCP_PROJECT}/locations/global/workloadIdentityPools/${WORKLOAD_IDENTITY_POOL}/providers/${WIF_PROVIDER_ID}"
echo "# WORKLOAD_IDENTITY_SERVICE_ACCOUNT=${SA_EMAIL}"

echo
echo "Done. If you want, run these commands now (they will be printed) or copy them to a root shell with appropriate permissions."
