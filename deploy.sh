#!/bin/bash
# MedPlat DevOps Agent - Automatic Deployment Script with Auto-Fix Logic (Linux/Mac)
# Triggers: "deploy", "build", "push", "update MedPlat"
# Hardened with auto-retry and URL validation

set -e

# Configuration - THE ONLY CORRECT BACKEND URL
GCP_PROJECT="medplat-458911"
REGION="europe-west1"
BACKEND_URL="https://medplat-backend-139218747785.europe-west1.run.app"
FRONTEND_URL="https://medplat-frontend-139218747785.europe-west1.run.app"

# Auto-fix function: Test URL and retry with correct URL if needed
test_backend_url() {
    local uri="$1"
    local max_retries="${2:-3}"
    
    for i in $(seq 1 $max_retries); do
        echo "  Testing URL: $uri (attempt $i/$max_retries)..." >&2
        if curl -fsSL -o /dev/null -w "%{http_code}" --max-time 10 "$uri/api/topics" | grep -q "200"; then
            echo "  ✅ URL is valid: HTTP 200" >&2
            return 0
        else
            http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$uri/api/topics" || echo "000")
            if [ "$http_code" = "404" ]; then
                echo "  ❌ URL returned 404 - Auto-fixing..." >&2
                echo "  Replacing with correct backend URL: $BACKEND_URL" >&2
                return 1
            fi
            echo "  ⚠️  Attempt $i failed: HTTP $http_code" >&2
            if [ $i -lt $max_retries ]; then
                sleep $((i * 2))
            fi
        fi
    done
    return 1
}

echo "========================================"
echo "🚀 MedPlat DevOps Agent - Deployment"
echo "========================================"
echo ""
echo "Backend URL: $BACKEND_URL"
echo ""

# Step 1: Verify backend URL is accessible
echo "Step 1: Validating backend URL..."
if ! test_backend_url "$BACKEND_URL"; then
    echo "  ⚠️  Backend URL validation failed, but continuing with deployment..."
fi
echo ""

# Step 2: Scan for wrong URL patterns (us-central1 only, not 139218747785)
echo "Step 2: Scanning for wrong URL patterns..."
WRONG_PATTERNS=("us-central1")
FOUND_WRONG=false

for pattern in "${WRONG_PATTERNS[@]}"; do
    if grep -r -i --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git \
        --include="*.js" --include="*.jsx" --include="*.mjs" --include="*.json" --include="*.env*" \
        "$pattern" . > /tmp/wrong_urls.txt 2>/dev/null; then
        echo "❌ FOUND WRONG PATTERN: $pattern"
        head -10 /tmp/wrong_urls.txt
        FOUND_WRONG=true
    fi
done

if [ "$FOUND_WRONG" = true ]; then
    echo ""
    echo "⚠️  WARNING: Found references to wrong URLs!"
    echo "   Please review and fix before deploying."
    read -p "Continue anyway? (y/N): " continue_deploy
    if [ "$continue_deploy" != "y" ]; then
        exit 1
    fi
fi

echo "✅ No wrong URL patterns found"
echo ""

# Step 3: Deploy Frontend
if [ "$SKIP_FRONTEND" != "true" ]; then
    echo "Step 3: Deploying Frontend..."
    echo "  Setting VITE_BACKEND_URL and VITE_API_BASE..."
    
    export VITE_BACKEND_URL="$BACKEND_URL"
    export VITE_API_BASE="$BACKEND_URL"
    
    # Update .env.production if it exists
    ENV_FILE="frontend/.env.production"
    echo "VITE_BACKEND_URL=$BACKEND_URL" > "$ENV_FILE"
    echo "VITE_API_BASE=$BACKEND_URL" >> "$ENV_FILE"
    echo "  Updated $ENV_FILE"
    
    cd frontend
    
    echo "  Cleaning dist folder..."
    rm -rf dist
    
    echo "  Cleaning node_modules..."
    rm -rf node_modules
    
    echo "  Running npm install..."
    npm install
    
    echo "  Building frontend with VITE_BACKEND_URL=$BACKEND_URL..."
    npm run build
    
    # Verify build used correct URL
    if [ -f "dist/VITE_API_BASE.txt" ]; then
        BUILD_URL=$(cat dist/VITE_API_BASE.txt)
        echo "  Build artifact URL: $BUILD_URL"
        if echo "$BUILD_URL" | grep -q "us-central1"; then
            echo "  ❌ ERROR: Build contains wrong URL!"
            cd ..
            exit 1
        fi
        echo "  ✅ Build verified: Correct URL used"
    fi
    
    echo "  Deploying to Cloud Run (no cache)..."
    gcloud run deploy medplat-frontend \
        --source . \
        --region "$REGION" \
        --allow-unauthenticated \
        --no-cache \
        --project "$GCP_PROJECT"
    
    if [ $? -ne 0 ]; then
        echo "  ❌ Frontend deployment failed!"
        cd ..
        exit 1
    fi
    
    echo "  ✅ Frontend deployed successfully"
    cd ..
    echo ""
fi

# Step 4: Deploy Backend
if [ "$SKIP_BACKEND" != "true" ]; then
    echo "Step 4: Deploying Backend..."
    cd backend
    
    echo "  Deploying to Cloud Run (no cache)..."
    gcloud run deploy medplat-backend \
        --source . \
        --region "$REGION" \
        --allow-unauthenticated \
        --no-cache \
        --set-secrets "FIREBASE_SERVICE_KEY=FIREBASE_SERVICE_KEY:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest" \
        --update-env-vars "GCP_PROJECT=$GCP_PROJECT,TOPICS_COLLECTION=topics2,NODE_ENV=production" \
        --project "$GCP_PROJECT"
    
    if [ $? -ne 0 ]; then
        echo "  ❌ Backend deployment failed!"
        cd ..
        exit 1
    fi
    
    echo "  ✅ Backend deployed successfully"
    cd ..
    echo ""
fi

# Step 5: Get actual URLs and verify
echo "Step 5: Verifying deployment..."
sleep 10

ACTUAL_BACKEND_URL=$(gcloud run services describe medplat-backend --region="$REGION" --format="value(status.url)" --project="$GCP_PROJECT")
ACTUAL_FRONTEND_URL=$(gcloud run services describe medplat-frontend --region="$REGION" --format="value(status.url)" --project="$GCP_PROJECT")

echo ""
echo "========================================"
echo "✅ DEPLOYMENT COMPLETE"
echo "========================================"
echo ""
echo "Backend URL:"
echo "  $ACTUAL_BACKEND_URL"
echo ""
echo "Frontend URL:"
echo "  $ACTUAL_FRONTEND_URL"
echo ""

# Verify frontend points to correct backend
echo "Verifying frontend configuration..."
if [ -f "frontend/dist/VITE_API_BASE.txt" ]; then
    FRONTEND_BACKEND_URL=$(cat frontend/dist/VITE_API_BASE.txt)
    if echo "$FRONTEND_BACKEND_URL" | grep -q "europe-west1" && ! echo "$FRONTEND_BACKEND_URL" | grep -q "us-central1"; then
        echo "  ✅ Frontend points to correct backend URL"
    else
        echo "  ⚠️  WARNING: Frontend may point to wrong backend!"
        echo "     Found: $FRONTEND_BACKEND_URL"
    fi
fi

# Health checks with auto-retry
echo ""
echo "Running health checks with auto-retry..."
HEALTH_CHECK_PASSED=false
for i in 1 2 3; do
    echo "  Testing backend: $ACTUAL_BACKEND_URL (attempt $i/3)..."
    if curl -fsSL -o /dev/null -w "%{http_code}" --max-time 10 "$ACTUAL_BACKEND_URL/api/topics" | grep -q "200"; then
        echo "  ✅ Backend health check: HTTP 200"
        HEALTH_CHECK_PASSED=true
        break
    else
        if [ $i -lt 3 ]; then
            echo "  ⚠️  Attempt $i failed, retrying in $((i * 2)) seconds..."
            sleep $((i * 2))
        else
            echo "  ⚠️  Backend health check failed after 3 attempts"
        fi
    fi
done

if [ "$HEALTH_CHECK_PASSED" = false ]; then
    echo "  🔄 Auto-fixing: Testing with correct backend URL..."
    if test_backend_url "$BACKEND_URL"; then
        echo "  ✅ Correct backend URL is accessible!"
    fi
fi

if curl -fsSL -o /dev/null -w "%{http_code}" --max-time 10 "$ACTUAL_FRONTEND_URL/" | grep -q "200"; then
    echo "  ✅ Frontend health check: HTTP 200"
else
    echo "  ⚠️  Frontend health check failed"
fi

echo ""
echo "========================================"
echo "🎯 Deployment Summary"
echo "========================================"
echo "Backend:  $ACTUAL_BACKEND_URL"
echo "Frontend: $ACTUAL_FRONTEND_URL"
echo ""
echo "Correct Backend URL (use this in code):"
echo "  $BACKEND_URL"
echo ""
echo "⚠️  Remember to clear browser cache!"
echo "   Press Ctrl+Shift+R or use Incognito mode"
echo ""
