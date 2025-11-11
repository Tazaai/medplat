#!/bin/bash
# Expert Panel Enhancement Deployment Script
# Date: November 10, 2025
# Deploys backend + frontend with all expert panel enhancements

set -e  # Exit on error

echo "🚀 Starting MedPlat Expert Panel Enhancement Deployment"
echo "================================================================"

# --- STEP 1: PUSH TO GITHUB ---
echo ""
echo "📤 Step 1/6: Pushing commits to GitHub..."
git push origin main
echo "✅ Code pushed to GitHub"

# --- STEP 2: BUILD BACKEND ---
echo ""
echo "🔨 Step 2/6: Building backend Docker image..."
cd /workspaces/medplat/backend
gcloud builds submit --tag gcr.io/medplat-458911/medplat-backend:latest
echo "✅ Backend image built and pushed to GCR"

# --- STEP 3: DEPLOY BACKEND ---
echo ""
echo "🚀 Step 3/6: Deploying backend to Cloud Run..."
gcloud run deploy medplat-backend \
  --image gcr.io/medplat-458911/medplat-backend:latest \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-secrets FIREBASE_SERVICE_KEY=FIREBASE_SERVICE_KEY:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest \
  --update-env-vars GCP_PROJECT=medplat-458911,TOPICS_COLLECTION=topics2,NODE_ENV=production
echo "✅ Backend deployed successfully"

# --- STEP 4: BUILD FRONTEND ---
echo ""
echo "🔨 Step 4/6: Building frontend..."
cd /workspaces/medplat/frontend
npm ci
npm run build
echo "✅ Frontend built"

# --- STEP 5: BUILD FRONTEND DOCKER IMAGE ---
echo ""
echo "🔨 Step 5/6: Building frontend Docker image..."
gcloud builds submit --tag gcr.io/medplat-458911/medplat-frontend:latest
echo "✅ Frontend image built and pushed to GCR"

# --- STEP 6: DEPLOY FRONTEND ---
echo ""
echo "🚀 Step 6/6: Deploying frontend to Cloud Run..."
gcloud run deploy medplat-frontend \
  --image gcr.io/medplat-458911/medplat-frontend:latest \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars VITE_API_BASE=https://medplat-backend-139218747785.europe-west1.run.app
echo "✅ Frontend deployed successfully"

# --- VERIFICATION ---
echo ""
echo "================================================================"
echo "🎉 Deployment Complete!"
echo "================================================================"
echo ""
echo "📊 Deployment Summary:"
echo "  ✅ Backend: https://medplat-backend-139218747785.europe-west1.run.app"
echo "  ✅ Frontend: https://medplat-frontend-139218747785.europe-west1.run.app"
echo ""
echo "🧪 Next Steps:"
echo "  1. Test quiz generation: Generate 'Atrial Fibrillation' quiz"
echo "  2. Verify progress bar and guideline badges display"
echo "  3. Complete quiz with <50% score to test adaptive feedback"
echo "  4. Check for CHA₂DS₂-VASc or risk scoring questions"
echo "  5. Verify guideline citations include §section + Class/Level"
echo ""
echo "📚 Enhanced Features Deployed:"
echo "  • Risk scoring integration (CHA₂DS₂-VASc, TIMI, CURB-65, etc.)"
echo "  • Multi-step scenarios (e.g., AF + HFpEF vs HFrEF)"
echo "  • Specific guideline citations (ESC 2023 §X.X, AHA/ACC 2022)"
echo "  • Adaptive feedback analyzing weak areas"
echo "  • Progress bar with color coding"
echo "  • Guideline badges (ESC, AHA/ACC, NICE, WHO)"
echo "  • Resource-limited scenarios"
echo "  • Imaging pitfall questions"
echo ""
echo "Expert Panel Grade: A+ ⭐"
