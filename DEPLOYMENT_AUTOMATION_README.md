# MedPlat DevOps Agent - Deployment Automation

## 🚀 Quick Start

### Windows (PowerShell)
```powershell
.\deploy.ps1
```

### Linux/Mac (Bash)
```bash
chmod +x deploy.sh
./deploy.sh
```

## 📋 What It Does

### Automatic Steps

1. **Scans for Wrong URLs**
   - Blocks deployment if `us-central1` or `139218747785` found
   - Warns about incorrect URL patterns

2. **Frontend Deployment**
   - Sets `VITE_BACKEND_URL` and `VITE_API_BASE`
   - Updates `.env.production` file
   - Deletes `dist` and `node_modules`
   - Runs `npm install` and `npm run build`
   - Verifies build uses correct URL
   - Deploys with `--no-cache`

3. **Backend Deployment**
   - Deploys with `--no-cache`
   - Sets secrets and environment variables
   - Configures for europe-west1 region

4. **Verification**
   - Gets actual Cloud Run URLs
   - Verifies frontend points to correct backend
   - Runs health checks
   - Shows deployment summary

## ⚙️ Configuration

### Environment Variables Set
- `VITE_BACKEND_URL="https://medplat-backend-458911.europe-west1.run.app"`
- `VITE_API_BASE="https://medplat-backend-458911.europe-west1.run.app"`

### URLs Used
- **Backend**: `https://medplat-backend-458911.europe-west1.run.app`
- **Frontend**: `https://medplat-frontend-458911.europe-west1.run.app`
- **Region**: `europe-west1`

### Forbidden Patterns
- ❌ `us-central1`
- ❌ `139218747785`

## 🎯 Cursor Integration

The `.cursorrules` file tells Cursor to automatically run deployment when you type:
- "deploy"
- "build"
- "push"
- "update MedPlat"

## 📝 Manual Options

### Skip Frontend
```powershell
.\deploy.ps1 -SkipFrontend
```

### Skip Backend
```powershell
.\deploy.ps1 -SkipBackend
```

## ✅ Success Indicators

After deployment, you should see:
- ✅ No wrong URL patterns found
- ✅ Frontend deployed successfully
- ✅ Backend deployed successfully
- ✅ Health checks passing
- ✅ Actual Cloud Run URLs displayed

## ⚠️ Important Notes

1. **Browser Cache**: Always clear browser cache after deployment (Ctrl+Shift+R)
2. **URL Format**: Uses `medplat-backend-458911` (project ID), not project number
3. **No Cache**: All deployments use `--no-cache` flag
4. **Clean Build**: Always deletes `dist` and `node_modules` before building

## 🔧 Troubleshooting

### Deployment Fails
- Check GCP authentication: `gcloud auth list`
- Verify project: `gcloud config get-value project`
- Check secrets exist in Secret Manager

### Wrong URL Detected
- Script will warn and ask to continue
- Review files listed in warning
- Fix URLs before deploying

### Build Fails
- Check `frontend/package.json` is valid
- Verify Node.js version (18+)
- Check for syntax errors in code

