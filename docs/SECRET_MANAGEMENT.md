# Secret Management and Stable Deployments

## 🔐 Secret Persistence Strategy

### Problem
Previously, the CI/CD workflow would create new secret versions on every deployment, which could:
- Overwrite working secrets with corrupted data
- Cause Firebase initialization failures
- Break production deployments

### Solution
**Secrets are now permanent and only created once.**

#### Current Working Versions (Nov 7, 2025)
- `medplat-firebase-key`: version **86** ✅
- `medplat-openai-key`: version **84** ✅

These versions are **locked** and will not be overwritten by CI/CD.

## 🏷️ Stable Image Tags

### Current Stable Images
```bash
# Backend (working with Firebase + 1115 topics)
gcr.io/medplat-458911/medplat-backend:stable
# SHA: 021bf135958cea50a1cb276621e532f76664587d935b8c14577bd154ff1c215d

# Frontend (React 18.3.1 + Vite 5.3.1 + serve)
gcr.io/medplat-458911/medplat-frontend:stable
# SHA: ded363749d591a5d280b26c605a0abc849f752f750fc7a4df4b79563561450b0
```

### Deployment URLs
- **Backend**: https://medplat-backend-139218747785.europe-west1.run.app
- **Frontend**: https://medplat-frontend-139218747785.europe-west1.run.app

## 📋 How to Update Secrets

### When Needed
Only update secrets when:
- Rotating keys for security
- Fixing a corrupted secret
- Changing GCP project or Firebase project

### Manual Update Process
```bash
# 1. Ensure you have the valid key files
ls -la firebase_key.json

# 2. Run the update script
./scripts/update_secrets.sh

# 3. Verify the new version
gcloud secrets versions list medplat-firebase-key --limit=3

# 4. Test locally first
npm run --prefix backend test

# 5. Redeploy to pick up new secret
gcloud run services update medplat-backend \
  --region=europe-west1 \
  --update-env-vars="REFRESH=$(date +%s)"
```

### Automated CI/CD Behavior
The deployment workflow (`.github/workflows/deploy.yml`) will:
- ✅ Check if secrets exist
- ✅ Use existing secret versions (never overwrite)
- ❌ NOT create new versions on every deploy
- ❌ NOT replace working secrets

## 🚀 Rollback to Stable

If a deployment breaks, rollback to stable images:

```bash
# Backend rollback
gcloud run deploy medplat-backend \
  --image gcr.io/medplat-458911/medplat-backend:stable \
  --region europe-west1

# Frontend rollback
gcloud run deploy medplat-frontend \
  --image gcr.io/medplat-458911/medplat-frontend:stable \
  --region europe-west1
```

## 🔍 Verification Commands

```bash
# Check Firebase secret is valid
gcloud secrets versions access latest --secret=medplat-firebase-key | jq -r '.project_id'
# Expected: medplat-458911

# Check backend has Firebase initialized
curl -s https://medplat-backend-139218747785.europe-west1.run.app/api/topics | jq '{ok, firestore_initialized, count}'
# Expected: {"ok": true, "firestore_initialized": true, "count": 1115}

# Check frontend serves React app
curl -I https://medplat-frontend-139218747785.europe-west1.run.app
# Expected: HTTP/2 200
```

## 📝 Update Checklist

Before any deployment:
- [ ] Verify secrets are valid: `gcloud secrets versions access latest --secret=medplat-firebase-key | jq .project_id`
- [ ] Test backend locally: `cd backend && npm test`
- [ ] Check CI/CD workflow preserves secrets (no `versions add` in logs)
- [ ] Tag stable images after successful deployment
- [ ] Update this document with new stable versions

## 🏗️ Creating New Stable Tags

After a successful deployment:

```bash
# Pull latest images
docker pull gcr.io/medplat-458911/medplat-backend:latest
docker pull gcr.io/medplat-458911/medplat-frontend:latest

# Tag as stable
docker tag gcr.io/medplat-458911/medplat-backend:latest gcr.io/medplat-458911/medplat-backend:stable
docker tag gcr.io/medplat-458911/medplat-frontend:latest gcr.io/medplat-458911/medplat-frontend:stable

# Push stable tags
docker push gcr.io/medplat-458911/medplat-backend:stable
docker push gcr.io/medplat-458911/medplat-frontend:stable

# Update this document with new SHA digests
```

---

**Last Updated**: November 7, 2025  
**Maintainer**: MedPlat DevOps Team
