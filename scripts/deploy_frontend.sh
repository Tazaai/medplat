#!/usr/bin/env bash
set -euo pipefail
# Deploy the frontend to Cloud Run using gcloud. This script assumes
# - gcloud is installed and authenticated
# - you have a GCP project set in gcloud config
# - the repo's CI secrets or env provide VITE_API_BASE and other env vars

IMAGE_NAME="gcr.io/$(gcloud config get-value project)/medplat-frontend:latest"
FRONTEND_DIR="frontend"

echo "Building Docker image for frontend and pushing to ${IMAGE_NAME}"
gcloud builds submit "$FRONTEND_DIR" --tag "$IMAGE_NAME"

echo "Deploying to Cloud Run (service: medplat-frontend)"
gcloud run deploy medplat-frontend --image "$IMAGE_NAME" --region europe-west1 --platform managed --allow-unauthenticated

echo "Frontend deployed to Cloud Run."
