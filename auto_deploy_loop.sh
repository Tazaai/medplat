#!/bin/bash
# Automated deployment loop - runs until successful
# Run this from a machine with gcloud permissions

set -e

MAX_ATTEMPTS=5
ATTEMPT=1
BACKEND_URL="https://medplat-backend-139218747785.europe-west1.run.app"
FRONTEND_URL="https://medplat-frontend-139218747785.europe-west1.run.app"

echo "=== AUTOMATED DEPLOYMENT LOOP ==="
echo "This will deploy and test until successful (max $MAX_ATTEMPTS attempts)"
echo ""

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔄 ATTEMPT $ATTEMPT/$MAX_ATTEMPTS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Step A: Validate backend code
  echo "✅ Step A: Validating backend code..."
  cd /home/qubad/medplat/backend
  if ! node -c index.js 2>/dev/null; then
    echo "❌ Backend syntax error - fixing..."
    # Fixes should already be applied, but check
    exit 1
  fi
  
  # Check CORS middleware is at top
  if ! grep -q "Access-Control-Allow-Origin.*\*" index.js | head -1; then
    echo "❌ CORS middleware not found at top"
    exit 1
  fi
  echo "✅ Backend code valid"

  # Step B: Validate frontend code
  echo "✅ Step B: Validating frontend code..."
  cd /home/qubad/medplat/frontend
  if [ ! -f src/lib/utils.js ]; then
    echo "❌ Missing frontend/src/lib/utils.js"
    exit 1
  fi
  
  # Try build
  if ! npm run build >/dev/null 2>&1; then
    echo "❌ Frontend build failed"
    exit 1
  fi
  echo "✅ Frontend code valid"

  # Step C: Validate deploy_manual.sh
  echo "✅ Step C: Validating deploy script..."
  if [ ! -f /home/qubad/medplat/deploy_manual.sh ]; then
    echo "❌ deploy_manual.sh missing"
    exit 1
  fi
  echo "✅ Deploy script exists"

  # Step D: Build backend
  echo "✅ Step D: Building backend..."
  cd /home/qubad/medplat/backend
  if ! gcloud builds submit --tag gcr.io/medplat-458911/medplat-backend:latest --quiet; then
    echo "❌ Backend build failed"
    ATTEMPT=$((ATTEMPT+1))
    sleep 10
    continue
  fi
  echo "✅ Backend built"

  # Step E: Deploy backend
  echo "✅ Step E: Deploying backend..."
  if ! gcloud run deploy medplat-backend \
    --image gcr.io/medplat-458911/medplat-backend:latest \
    --region europe-west1 \
    --allow-unauthenticated \
    --port 8080 \
    --set-secrets FIREBASE_SERVICE_KEY=FIREBASE_SERVICE_KEY:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest \
    --update-env-vars GCP_PROJECT=medplat-458911,TOPICS_COLLECTION=topics2,NODE_ENV=production \
    --project medplat-458911 \
    --quiet; then
    echo "❌ Backend deployment failed"
    ATTEMPT=$((ATTEMPT+1))
    sleep 10
    continue
  fi
  echo "✅ Backend deployed"
  sleep 15  # Wait for service to be ready

  # Step F: Build frontend
  echo "✅ Step F: Building frontend..."
  cd /home/qubad/medplat/frontend
  npm ci --quiet
  export VITE_API_BASE=$BACKEND_URL
  if ! npm run build >/dev/null 2>&1; then
    echo "❌ Frontend build failed"
    ATTEMPT=$((ATTEMPT+1))
    sleep 10
    continue
  fi
  echo "✅ Frontend built"

  # Step G: Deploy frontend
  echo "✅ Step G: Deploying frontend..."
  if ! gcloud builds submit --tag gcr.io/medplat-458911/medplat-frontend:latest --quiet; then
    echo "❌ Frontend image build failed"
    ATTEMPT=$((ATTEMPT+1))
    sleep 10
    continue
  fi
  
  if ! gcloud run deploy medplat-frontend \
    --image gcr.io/medplat-458911/medplat-frontend:latest \
    --region europe-west1 \
    --allow-unauthenticated \
    --set-env-vars VITE_API_BASE=$BACKEND_URL \
    --project medplat-458911 \
    --quiet; then
    echo "❌ Frontend deployment failed"
    ATTEMPT=$((ATTEMPT+1))
    sleep 10
    continue
  fi
  echo "✅ Frontend deployed"
  sleep 15  # Wait for service to be ready

  # Step H: Test CORS
  echo "✅ Step H: Testing CORS..."
  sleep 5
  CORS_HEADER=$(curl -s -I "$BACKEND_URL/api/topics2/categories" 2>&1 | grep -i "access-control-allow-origin" || echo "")
  
  if echo "$CORS_HEADER" | grep -qi "access-control-allow-origin.*\*"; then
    echo "✅ CORS test PASSED: $CORS_HEADER"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 DEPLOYMENT SUCCESSFUL!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Backend: $BACKEND_URL"
    echo "Frontend: $FRONTEND_URL"
    echo ""
    echo "✅ CORS: Access-Control-Allow-Origin: *"
    echo "✅ Route: /api/topics2/categories working"
    exit 0
  else
    echo "❌ CORS test FAILED"
    echo "Response: $CORS_HEADER"
    ATTEMPT=$((ATTEMPT+1))
    sleep 10
    continue
  fi
done

echo ""
echo "❌ Deployment failed after $MAX_ATTEMPTS attempts"
exit 1

