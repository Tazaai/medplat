# MedPlat Deployment Standard

## Overview
This document defines the standard deployment process for MedPlat to Google Cloud Run.

## Standard Configuration

### Registry
- **Use GCR (Google Container Registry)**: `gcr.io/medplat-458911/`
- **NOT Artifact Registry**: Avoid `europe-west1-docker.pkg.dev` (causes VPC-SC issues)

### Secret Names
Secrets in Google Secret Manager must use these exact names:
- `FIREBASE_SERVICE_KEY` (not `medplat-firebase-key`)
- `OPENAI_API_KEY` (not `medplat-openai-key`)

### Regions
- **Cloud Run**: `europe-west1`
- **Cloud Build**: `global` (default)

## Manual Deployment (Verified Working)

### Backend

```bash
cd backend

# Build and push to GCR
gcloud builds submit --tag gcr.io/medplat-458911/medplat-backend:latest

# Deploy with secret bindings
gcloud run deploy medplat-backend \
  --image gcr.io/medplat-458911/medplat-backend:latest \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-secrets FIREBASE_SERVICE_KEY=FIREBASE_SERVICE_KEY:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest \
  --update-env-vars GCP_PROJECT=medplat-458911,TOPICS_COLLECTION=topics2,NODE_ENV=production
```

**Result**: https://medplat-backend-139218747785.europe-west1.run.app

### Frontend

```bash
cd frontend

# Build with backend URL
VITE_API_BASE=https://medplat-backend-139218747785.europe-west1.run.app npm ci
VITE_API_BASE=https://medplat-backend-139218747785.europe-west1.run.app npm run build

# Build and push to GCR
gcloud builds submit --tag gcr.io/medplat-458911/medplat-frontend:latest

# Deploy
gcloud run deploy medplat-frontend \
  --image gcr.io/medplat-458911/medplat-frontend:latest \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars VITE_API_BASE=https://medplat-backend-139218747785.europe-west1.run.app
```

**Result**: https://medplat-frontend-139218747785.europe-west1.run.app

## GitHub Actions Workflow

The `.github/workflows/deploy.yml` is now configured to use this standard:

1. **Configure GCR** (not Artifact Registry)
   ```yaml
   - name: 🐳 Configure Docker for GCR
     run: gcloud auth configure-docker gcr.io
   ```

2. **Use correct secret names**
   ```yaml
   --set-secrets "FIREBASE_SERVICE_KEY=FIREBASE_SERVICE_KEY:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest"
   ```

3. **Build with GCR tags**
   ```bash
   gcloud builds submit --tag gcr.io/$GCP_PROJECT/medplat-backend:latest
   ```

## Verification

After deployment, verify:

```bash
# Backend health
curl https://medplat-backend-139218747785.europe-west1.run.app/
# Expected: {"status":"MedPlat OK","pid":1}

# Topics API
curl https://medplat-backend-139218747785.europe-west1.run.app/api/topics | jq '.ok, (.topics | length)'
# Expected: true, 1115

# Frontend
curl -I https://medplat-frontend-139218747785.europe-west1.run.app/
# Expected: HTTP/2 200
```

## Common Issues

### ❌ VPC-SC Error with Artifact Registry
**Symptom**: `gcloud builds submit` shows VPC-SC warnings and workflow fails
**Solution**: Use GCR (`gcr.io`) instead of Artifact Registry (`europe-west1-docker.pkg.dev`)

### ❌ Secret Not Found
**Symptom**: `Secret "medplat-openai-key" not found`
**Solution**: Use exact secret names: `OPENAI_API_KEY` and `FIREBASE_SERVICE_KEY`

### ❌ Frontend Can't Connect to Backend
**Symptom**: Frontend shows API errors
**Solution**: Ensure `VITE_API_BASE` is set during build (not at runtime)

## Architecture Notes

- **Backend**: Node 18, Express, Firebase Admin, OpenAI API
- **Frontend**: React + Vite, served via `serve` package on port 8080
- **Secrets**: Bound via Cloud Run `--set-secrets` (read from Secret Manager)
- **Build Time**: ~45s backend, ~1m30s frontend

## Last Successful Deployment

- **Date**: 2025-11-09 15:29 UTC
- **Backend Revision**: `medplat-backend-01004-dc4`
- **Frontend Revision**: `medplat-frontend-00330-hpw`
- **Commit**: `cf56015` (Professor-V3 release)

---

**Maintained by**: MedPlat DevOps
**Last Updated**: November 9, 2025
