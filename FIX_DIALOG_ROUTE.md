# Fix /api/dialog 404 Error

## Problem
The `/api/dialog` endpoint returns 404. The route exists in `backend/routes/dialog_api.mjs` but is not accessible.

## Steps to Fix

### 1. Check Backend Logs
```bash
# View recent Cloud Run logs for medplat-backend
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=medplat-backend" --limit 50 --format json --project medplat-458911
```

Look for:
- `❌ Failed to import dialog_api.mjs` errors
- `❌ Could not mount ./routes/dialog_api.mjs` errors
- Any stack traces related to `dialog_api.mjs`

### 2. Verify dialog_api.mjs Export
Check that `backend/routes/dialog_api.mjs` exports correctly:
- Should export: `export default function dialogApi() { ... return router; }`
- The function should return an Express router

### 3. Test Import Locally (if possible)
```bash
cd backend
node -e "import('./routes/dialog_api.mjs').then(m => console.log('Import OK:', !!m.default)).catch(e => console.error('Import FAILED:', e.message))"
```

### 4. Check normalizeRouter Function
In `backend/index.js`, verify `normalizeRouter` handles function exports:
- Line ~106: `if (typeof router === 'function') router = router();`
- This should call `dialogApi()` to get the router

### 5. Verify Route Mounting
In `backend/index.js` around line 255:
- Check if `dialogRouter` is truthy before mounting
- Add debug logging:
```javascript
console.log('dialogMod type:', typeof dialogMod);
console.log('dialogMod keys:', dialogMod ? Object.keys(dialogMod) : 'null');
console.log('dialogRouter:', dialogRouter);
```

### 6. Rebuild and Redeploy
```bash
cd backend
gcloud builds submit --tag gcr.io/medplat-458911/medplat-backend:latest .
gcloud run deploy medplat-backend \
  --image gcr.io/medplat-458911/medplat-backend:latest \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-secrets "FIREBASE_SERVICE_KEY=FIREBASE_SERVICE_KEY:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest" \
  --update-env-vars "GCP_PROJECT=medplat-458911,TOPICS_COLLECTION=topics2,NODE_ENV=production,FRONTEND_ORIGIN=https://medplat-frontend-139218747785.europe-west1.run.app" \
  --port 8080
```

### 7. Test the Endpoint
```bash
# Test POST /api/dialog
curl -X POST https://medplat-backend-139218747785.europe-west1.run.app/api/dialog \
  -H "Content-Type: application/json" \
  -d '{"topic":"Test","category":"Cardiology"}' \
  -v
```

Expected: 200 OK or 400 Bad Request (not 404)

## Common Issues

1. **Import fails silently**: Check if `dialogMod` is null in the results array
2. **Function not called**: `normalizeRouter` might not be calling `dialogApi()`
3. **Router not mounted**: Check if `dialogRouter` is null/undefined
4. **Syntax error in dialog_api.mjs**: Check for unclosed braces, missing imports

## Expected Output
After fix, backend logs should show:
- `✅ Mounted /api/dialog -> ./routes/dialog_api.mjs`
- No import errors for `dialog_api.mjs`
- POST requests to `/api/dialog` return 200 or 400 (not 404)

