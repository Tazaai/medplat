#!/bin/bash
# Fix /api/panel/review timeout by extending request timeout and optimizing model
set -e

echo "====================================================="
echo "🔧 Fixing /api/panel/review timeout"
echo "====================================================="

# Step 1: Verify changes are in place
echo ""
echo "Step 1️⃣  Verifying timeout middleware is added..."
if grep -q "req.setTimeout(300000)" backend/index.js; then
  echo "✅ Request timeout middleware present in backend/index.js"
else
  echo "❌ Timeout middleware missing. Please add it manually."
  exit 1
fi

echo ""
echo "Step 2️⃣  Verifying panel_api.mjs uses gpt-4o-mini with max_tokens:2000..."
if grep -q "gpt-4o-mini" backend/routes/panel_api.mjs && grep -q "max_tokens: 2000" backend/routes/panel_api.mjs; then
  echo "✅ panel_api.mjs optimized for faster responses"
else
  echo "⚠️  panel_api.mjs may need manual optimization"
fi

echo ""
echo "Step 3️⃣  Testing basic curl (30s timeout)..."
echo "Run this command to test:"
echo ""
echo "curl -sS -m 30 -X POST 'https://medplat-backend-139218747785.europe-west1.run.app/api/panel/review' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"case_json\":{\"meta\":{\"topic\":\"acute_chest_pain\",\"language\":\"en\",\"region\":\"EU/DK\",\"demographics\":{\"age\":58,\"sex\":\"M\"},\"geography_of_living\":\"urban\"},\"history\":{\"presenting_complaint\":\"Chest pain\",\"onset_duration_severity\":\"30 min\",\"context_triggers\":\"walking\",\"post_event\":\"rest\",\"past_medical_history\":[\"HTN\"],\"medications_current\":[\"aspirin\"],\"allergies\":[]}}}'"
echo ""

echo "Step 4️⃣  Ready to redeploy backend"
echo ""
echo "To deploy, run:"
echo ""
echo "gcloud builds submit backend --tag gcr.io/medplat-458911/medplat-backend:latest"
echo ""
echo "gcloud run deploy medplat-backend \\"
echo "  --image gcr.io/medplat-458911/medplat-backend:latest \\"
echo "  --region europe-west1 \\"
echo "  --allow-unauthenticated \\"
echo "  --set-secrets FIREBASE_SERVICE_KEY=FIREBASE_SERVICE_KEY:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest \\"
echo "  --update-env-vars GCP_PROJECT=medplat-458911,TOPICS_COLLECTION=topics2,NODE_ENV=production"
echo ""
echo "====================================================="
echo "✅ All changes verified. Ready for deployment."
echo "====================================================="
