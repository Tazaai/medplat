# Setting Up GCP Access for GitHub Actions

This guide will help you configure Google Cloud Platform authentication for GitHub Actions so the deployment workflow can deploy to Cloud Run.

## Option 1: Service Account Key (Easier to Set Up)

### Step 1: Create a Service Account in GCP

1. Go to [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts?project=medplat-458911)
2. Click **"Create Service Account"**
3. Name it: `github-actions-deployer`
4. Description: `Service account for GitHub Actions deployments`
5. Click **"Create and Continue"**

### Step 2: Grant Required Permissions

Add these roles to the service account:
- **Cloud Run Admin** (`roles/run.admin`) - Deploy and manage Cloud Run services
- **Cloud Build Editor** (`roles/cloudbuild.builds.editor`) - Build container images
- **Service Account User** (`roles/iam.serviceAccountUser`) - Use service accounts
- **Secret Manager Secret Accessor** (`roles/secretmanager.secretAccessor`) - Access secrets
- **Storage Admin** (`roles/storage.admin`) - Push images to GCR

### Step 3: Create and Download Service Account Key

1. Click on the service account you just created
2. Go to **"Keys"** tab
3. Click **"Add Key"** → **"Create new key"**
4. Select **JSON** format
5. Click **"Create"** - This will download a JSON file

### Step 4: Add Secret to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add these secrets:

   **Secret Name:** `GCP_SA_KEY`
   **Value:** Paste the entire contents of the downloaded JSON file

   **Secret Name:** `GCP_PROJECT`
   **Value:** `medplat-458911`

   **Secret Name:** `OPENAI_API_KEY`
   **Value:** Your OpenAI API key

   **Secret Name:** `FIREBASE_SERVICE_KEY`
   **Value:** Your Firebase service account JSON (entire file contents)

## Option 2: Workload Identity Federation (More Secure, Recommended for Production)

This is more secure but requires more setup. See the [Workload Identity Guide](WORKLOAD_IDENTITY.md) for detailed instructions.

## Verify Secrets Are Set

After adding secrets, the GitHub Actions workflow will automatically:
1. ✅ Validate all required secrets are present
2. ✅ Authenticate to GCP using the service account
3. ✅ Deploy backend and frontend to Cloud Run

## Test the Setup

1. Push to main branch (or manually trigger the workflow)
2. Go to **Actions** tab in GitHub
3. Watch the deployment workflow run
4. Check that it successfully authenticates and deploys

## Troubleshooting

### Error: "Permission denied"
- Ensure the service account has all required roles listed above
- Verify the JSON key is correctly pasted into `GCP_SA_KEY` secret

### Error: "Secret not found"
- Double-check all required secrets are added:
  - `GCP_SA_KEY`
  - `GCP_PROJECT`
  - `OPENAI_API_KEY`
  - `FIREBASE_SERVICE_KEY`

### Error: "Build failed"
- Check Cloud Build logs in GCP Console
- Verify Dockerfile is correct
- Check that all dependencies are in package.json
