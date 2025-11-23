#!/bin/bash
# Delete the wrong frontend service in us-central1
# Run this from a machine with gcloud permissions

set -e

echo "=== DELETING WRONG FRONTEND SERVICE ==="
echo ""
echo "This will delete: medplat-frontend in us-central1"
echo "The correct frontend is in europe-west1 and will NOT be affected."
echo ""

# Delete the wrong frontend
echo "Deleting medplat-frontend from us-central1..."
gcloud run services delete medplat-frontend \
  --region=us-central1 \
  --project=medplat-458911 \
  --quiet

echo "✅ Deleted medplat-frontend from us-central1"
echo ""
echo "Verifying correct frontend still exists in europe-west1..."
gcloud run services describe medplat-frontend \
  --region=europe-west1 \
  --project=medplat-458911 \
  --format="value(status.url)" && echo "✅ Correct frontend exists in europe-west1"

