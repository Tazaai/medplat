# 🚀 Deploy Now - Step by Step Guide

## Part 1: Commit and Push to Trigger Deployment

Run these commands in your terminal:

```powershell
cd C:\Users\qubad\medplat

# Check current branch
git branch

# If not on main, switch to main
git checkout main

# Add all changes
git add .

# Commit
git commit -m "Deploy backend and frontend - trigger GitHub Actions"

# Push to main (this triggers the deployment)
git push origin main
```

## Part 2: Set Up GCP Access for GitHub Actions

### Quick Setup (Service Account Key Method)

1. **Go to Google Cloud Console:**
   - https://console.cloud.google.com/iam-admin/serviceaccounts?project=medplat-458911

2. **Create Service Account:**
   - Click "Create Service Account"
   - Name: `github-actions-deployer`
   - Click "Create and Continue"

3. **Grant Permissions:**
   Add these roles:
   - `Cloud Run Admin`
   - `Cloud Build Editor`
   - `Service Account User`
   - `Secret Manager Secret Accessor`
   - `Storage Admin`
   
   Click "Continue" → "Done"

4. **Create Key:**
   - Click on the service account you just created
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key"
   - Select "JSON"
   - Click "Create" (downloads a JSON file)

5. **Add Secrets to GitHub:**
   - Go to: https://github.com/YOUR_USERNAME/medplat/settings/secrets/actions
   - Click "New repository secret" for each:

   **Secret 1:**
   - Name: `GCP_SA_KEY`
   - Value: Paste the entire contents of the downloaded JSON file

   **Secret 2:**
   - Name: `GCP_PROJECT`
   - Value: `medplat-458911`

   **Secret 3:**
   - Name: `OPENAI_API_KEY`
   - Value: Your OpenAI API key

   **Secret 4:**
   - Name: `FIREBASE_SERVICE_KEY`
   - Value: Your Firebase service account JSON (entire file contents)

## Part 3: Monitor Deployment

After pushing to main:

1. **GitHub Actions:**
   - Go to: https://github.com/YOUR_USERNAME/medplat/actions
   - Click on the running workflow "Deploy MedPlat"
   - Watch the deployment progress in real-time

2. **Cloud Build:**
   - https://console.cloud.google.com/cloud-build/builds?project=medplat-458911

3. **Cloud Run:**
   - https://console.cloud.google.com/run?project=medplat-458911

## What Happens Next

The GitHub Actions workflow will:
1. ✅ Validate all secrets are present
2. ✅ Authenticate to GCP
3. ✅ Build backend container → Deploy to Cloud Run
4. ✅ Build frontend container → Deploy to Cloud Run
5. ✅ Run health checks
6. ✅ Show you the deployment URLs

## Troubleshooting

If deployment fails:
- Check GitHub Actions logs for specific errors
- Verify all 4 secrets are added correctly
- Ensure service account has all required permissions
- Check Cloud Build logs in GCP Console
