#!/usr/bin/env bash
set -euo pipefail
# scripts/setup_gcp_artifact_repo.sh
# Automated helper to enable Artifact Registry, create `medplat` repo, and grant IAM
# Usage:
#   PROJECT_ID=your-project-id SA_EMAIL=service-account@PROJECT.iam.gserviceaccount.com \
#     bash scripts/setup_gcp_artifact_repo.sh

if [ -z "${PROJECT_ID:-}" ] || [ -z "${SA_EMAIL:-}" ]; then
  echo "Usage: PROJECT_ID=... SA_EMAIL=... bash $0"
  exit 1
fi

echo "Setting gcloud project to $PROJECT_ID"
gcloud config set project "$PROJECT_ID"

echo "Enabling Artifact Registry API..."
gcloud services enable artifactregistry.googleapis.com --project "$PROJECT_ID"

echo "Checking for existing repository 'medplat' in europe-west1..."
if gcloud artifacts repositories list --location=europe-west1 --project="$PROJECT_ID" --format='value(name)' | grep -q '^medplat$'; then
  echo "Repository 'medplat' already exists."
else
  echo "Creating repository 'medplat'..."
  gcloud artifacts repositories create medplat \
    --repository-format=docker \
    --location=europe-west1 \
    --description="MedPlat Docker repo" \
    --project="$PROJECT_ID"
  echo "Repository created."
fi

echo "Granting Artifact Registry writer role to $SA_EMAIL on project $PROJECT_ID"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/artifactregistry.writer"

echo "Done. The service account $SA_EMAIL can now upload to the medplat repo in $PROJECT_ID (europe-west1)."
