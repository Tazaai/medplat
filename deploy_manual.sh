#!/bin/bash
# Manual deployment script for MedPlat
# Run this from a machine with gcloud permissions

set -e

echo "=== MEDPLAT MANUAL DEPLOYMENT ==="
echo ""

# --- BACKEND ---
echo "🚀 Step 1/4: Building and deploying backend..."
cd backend

echo "Building backend Docker image..."
gcloud builds submit --tag gcr.io/medplat-458911/medplat-backend:latest

echo "Deploying backend to Cloud Run..."
gcloud run deploy medplat-backend \
  --image gcr.io/medplat-458911/medplat-backend:latest \
  --region europe-west1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-secrets FIREBASE_SERVICE_KEY=FIREBASE_SERVICE_KEY:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest \
  --update-env-vars GCP_PROJECT=medplat-458911,TOPICS_COLLECTION=topics2,NODE_ENV=production \
  --project medplat-458911

BACKEND_URL=$(gcloud run services describe medplat-backend --region=europe-west1 --project=medplat-458911 --format='value(status.url)')
echo "✅ Backend deployed: $BACKEND_URL"

# --- FRONTEND ---
echo ""
echo "🎨 Step 2/4: Building frontend..."
cd ../frontend

echo "Installing dependencies..."
npm ci

echo "Building frontend..."
npm run build

echo "Building frontend Docker image..."
gcloud builds submit --tag gcr.io/medplat-458911/medplat-frontend:latest

echo "Deploying frontend to Cloud Run..."
gcloud run deploy medplat-frontend \
  --image gcr.io/medplat-458911/medplat-frontend:latest \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars VITE_API_BASE=$BACKEND_URL \
  --project medplat-458911

FRONTEND_URL=$(gcloud run services describe medplat-frontend --region=europe-west1 --project=medplat-458911 --format='value(status.url)')
echo "✅ Frontend deployed: $FRONTEND_URL"

# --- VERIFICATION ---
echo ""
echo "🧪 Step 3/4: Verifying deployment..."
echo "Testing backend CORS..."
curl -I "$BACKEND_URL/api/topics2/categories" 2>&1 | grep -i "access-control" || echo "Backend may still be starting..."

echo ""
echo "✅ Step 4/4: Deployment complete!"
echo ""
echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo ""
echo "Test CORS:"
echo "  curl -I $BACKEND_URL/api/topics2/categories"
echo ""
echo "Expected: Access-Control-Allow-Origin: *"

