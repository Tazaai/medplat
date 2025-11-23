# 🚀 MedPlat Deployment Instructions

## ✅ Code Status: READY FOR DEPLOYMENT

All code fixes are complete:
- ✅ CORS middleware at top: `Access-Control-Allow-Origin: *`
- ✅ Route `/api/topics2/categories`: Defined and exported
- ✅ Frontend build: Fixed (lib/utils.js exists)
- ✅ Region: All references use `europe-west1`
- ✅ All syntax: Valid

---

## 📋 Step-by-Step Deployment

### Step 1: Delete Wrong Frontend Service (us-central1)

**⚠️ IMPORTANT:** Delete the duplicate frontend in `us-central1` before deploying.

```bash
bash delete_wrong_frontend.sh
```

Or manually:
```bash
gcloud run services delete medplat-frontend \
  --region=us-central1 \
  --project=medplat-458911 \
  --quiet
```

---

### Step 2: Deploy Backend + Frontend

**Option A: Automated Loop (Recommended)**
```bash
bash auto_deploy_loop.sh
```
This will:
- Validate code
- Build and deploy backend
- Build and deploy frontend
- Test CORS automatically
- Retry until successful (max 5 attempts)

**Option B: Manual Deployment**
```bash
bash deploy_manual.sh
```

**Option C: Manual Commands**
```bash
# Backend
cd backend
gcloud builds submit --tag gcr.io/medplat-458911/medplat-backend:latest
gcloud run deploy medplat-backend \
  --image gcr.io/medplat-458911/medplat-backend:latest \
  --region europe-west1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-secrets FIREBASE_SERVICE_KEY=FIREBASE_SERVICE_KEY:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest \
  --update-env-vars GCP_PROJECT=medplat-458911,TOPICS_COLLECTION=topics2,NODE_ENV=production \
  --project medplat-458911

# Frontend
cd ../frontend
npm ci && npm run build
gcloud builds submit --tag gcr.io/medplat-458911/medplat-frontend:latest
gcloud run deploy medplat-frontend \
  --image gcr.io/medplat-458911/medplat-frontend:latest \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars VITE_API_BASE=https://medplat-backend-139218747785.europe-west1.run.app \
  --project medplat-458911
```

---

## 🧪 Verification

After deployment, verify:

### 1. Backend CORS Test
```bash
curl -I https://medplat-backend-139218747785.europe-west1.run.app/api/topics2/categories
```

**Expected output:**
```
HTTP/2 200
access-control-allow-origin: *
access-control-allow-methods: GET,POST,OPTIONS
access-control-allow-headers: Content-Type,Authorization
```

### 2. Frontend Test
1. Open: https://medplat-frontend-139218747785.europe-west1.run.app
2. Click: "Choose Area → Choose Topic"
3. Verify: Topics load without CORS errors
4. Check browser console: No CORS or network errors

---

## 📍 Service URLs

- **Backend:** https://medplat-backend-139218747785.europe-west1.run.app
- **Frontend:** https://medplat-frontend-139218747785.europe-west1.run.app

Both services are in **europe-west1** region.

---

## 🔧 Configuration

### Backend Settings
- Region: `europe-west1`
- Port: `8080`
- CORS: `Access-Control-Allow-Origin: *`
- Collection: `topics2`

### Frontend Settings
- Region: `europe-west1`
- Environment: `VITE_API_BASE=https://medplat-backend-139218747785.europe-west1.run.app`

---

## ❌ Troubleshooting

### If CORS still fails:
1. Verify backend CORS middleware is at top of `backend/index.js`
2. Check backend is deployed (not old version)
3. Verify frontend `VITE_API_BASE` points to correct backend URL

### If deployment fails:
1. Check gcloud permissions
2. Verify secrets exist in Secret Manager:
   - `FIREBASE_SERVICE_KEY`
   - `OPENAI_API_KEY`
3. Check Cloud Build logs

### If frontend can't connect:
1. Verify `VITE_API_BASE` environment variable is set
2. Check backend URL is correct
3. Verify both services are in same region (`europe-west1`)

---

## 📝 Notes

- All scripts require gcloud authentication
- VM may not have permissions - run from local machine or CI/CD
- GitHub Actions workflow also deploys automatically on push to `main`

