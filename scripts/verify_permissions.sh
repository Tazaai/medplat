#!/bin/bash
# Verify VM and Service Account permissions for MedPlat deployment
# Run this script to check if all required permissions are in place

set -e

GCP_PROJECT=${GCP_PROJECT:-$(gcloud config get-value project 2>/dev/null || echo "")}

if [ -z "$GCP_PROJECT" ]; then
  echo "❌ GCP_PROJECT not set. Please set it or configure gcloud default project."
  exit 1
fi

echo "🔍 Verifying permissions for project: $GCP_PROJECT"
echo "=================================================="
echo ""

# Get current user/VM service account
CURRENT_USER=$(gcloud config get-value account 2>/dev/null || echo "unknown")
echo "Current authenticated user: $CURRENT_USER"
echo ""

# Check VM service account (if running on GCE/Cloud Shell)
VM_SA=$(curl -s -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email 2>/dev/null || echo "not-on-gce")
if [ "$VM_SA" != "not-on-gce" ]; then
  echo "VM Service Account: $VM_SA"
  echo "Checking VM permissions..."
  
  # Check for Owner or Editor role
  VM_ROLES=$(gcloud projects get-iam-policy "$GCP_PROJECT" \
    --flatten="bindings[].members" \
    --format="value(bindings.role)" \
    --filter="bindings.members:serviceAccount:$VM_SA" 2>/dev/null || echo "")
  
  if echo "$VM_ROLES" | grep -qE "(roles/owner|roles/editor)"; then
    echo "✅ VM has Owner or Editor role"
  else
    echo "⚠️  VM does not have Owner or Editor role"
    echo "   Current roles: $VM_ROLES"
    echo "   To fix: gcloud projects add-iam-policy-binding $GCP_PROJECT \\"
    echo "     --member=\"serviceAccount:$VM_SA\" \\"
    echo "     --role=\"roles/editor\""
  fi
  echo ""
fi

# Check GitHub Actions service account (from secrets or common names)
echo "Checking GitHub Actions deployment service account..."
echo ""

# Common service account names to check
SA_NAMES=(
  "medplat-deployer@${GCP_PROJECT}.iam.gserviceaccount.com"
  "firebase-adminsdk-fbsvc@${GCP_PROJECT}.iam.gserviceaccount.com"
)

REQUIRED_ROLES=(
  "roles/run.admin"
  "roles/iam.serviceAccountUser"
  "roles/artifactregistry.admin"
  "roles/storage.admin"
)

for SA in "${SA_NAMES[@]}"; do
  # Check if service account exists
  if gcloud iam service-accounts describe "$SA" --project="$GCP_PROJECT" >/dev/null 2>&1; then
    echo "Found service account: $SA"
    echo "Checking required roles..."
    
    SA_ROLES=$(gcloud projects get-iam-policy "$GCP_PROJECT" \
      --flatten="bindings[].members" \
      --format="value(bindings.role)" \
      --filter="bindings.members:serviceAccount:$SA" 2>/dev/null || echo "")
    
    MISSING_ROLES=()
    for ROLE in "${REQUIRED_ROLES[@]}"; do
      if echo "$SA_ROLES" | grep -q "$ROLE"; then
        echo "  ✅ $ROLE"
      else
        echo "  ❌ Missing: $ROLE"
        MISSING_ROLES+=("$ROLE")
      fi
    done
    
    if [ ${#MISSING_ROLES[@]} -eq 0 ]; then
      echo ""
      echo "✅ All required roles are present for $SA"
    else
      echo ""
      echo "⚠️  Missing roles for $SA. To fix, run:"
      for ROLE in "${MISSING_ROLES[@]}"; do
        echo "  gcloud projects add-iam-policy-binding $GCP_PROJECT \\"
        echo "    --member=\"serviceAccount:$SA\" \\"
        echo "    --role=\"$ROLE\""
      done
    fi
    echo ""
  fi
done

echo "=================================================="
echo "✅ Permission verification complete"
echo ""
echo "Note: If using Workload Identity Federation, the service account"
echo "      may be different. Check GitHub Actions secrets for:"
echo "      - WORKLOAD_IDENTITY_SERVICE_ACCOUNT"
echo "      - GCP_SA_KEY (service account email in the JSON)"

