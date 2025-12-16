# 🔧 Setting Up Google Cloud SDK in Cursor

## Quick Setup

### Option 1: If gcloud is Already Installed

Run this in your terminal (in Cursor or PowerShell):

```powershell
cd C:\Users\qubad\medplat
powershell -ExecutionPolicy Bypass -File .\setup_gcloud.ps1
```

This script will:
- ✅ Find gcloud if it's installed
- ✅ Add it to PATH for current session
- ✅ Check authentication
- ✅ Set default project to `medplat-458911`
- ✅ Add to PowerShell profile for persistence

### Option 2: Install Google Cloud SDK

If gcloud is not installed, download and install it:

1. **Download Installer:**
   - Go to: https://cloud.google.com/sdk/docs/install
   - Or download directly: https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe

2. **Run Installer:**
   - Double-click the installer
   - Follow the installation wizard
   - **Important:** Make sure "Add to PATH" is checked during installation

3. **Restart Cursor** after installation

4. **Authenticate:**
   ```powershell
   gcloud auth login
   ```

5. **Set Project:**
   ```powershell
   gcloud config set project medplat-458911
   ```

### Option 3: Install via PowerShell (Automated)

Run this in PowerShell (as Administrator):

```powershell
# Download installer
$installer = "$env:TEMP\GoogleCloudSDKInstaller.exe"
(New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", $installer)

# Run installer (silent install)
Start-Process -FilePath $installer -ArgumentList "/S" -Wait

# Add to PATH (current session)
$gcloudPath = "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin"
$env:PATH = "$gcloudPath;$env:PATH"

# Verify installation
gcloud --version

# Authenticate
gcloud auth login

# Set project
gcloud config set project medplat-458911
```

## Verify Installation

After setup, test that gcloud works:

```powershell
# Check version
gcloud --version

# Check authentication
gcloud auth list

# Check project
gcloud config get-value project
```

Expected output:
- Version: Google Cloud SDK [version number]
- Auth: Your email address (active)
- Project: medplat-458911

## Make it Permanent in Cursor

To ensure gcloud is always available in Cursor sessions, add this to your PowerShell profile:

1. **Find your profile path:**
   ```powershell
   $PROFILE.CurrentUserAllHosts
   ```

2. **Edit the profile:**
   ```powershell
   notepad $PROFILE.CurrentUserAllHosts
   ```

3. **Add this line:**
   ```powershell
   $env:PATH = "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin;$env:PATH"
   ```

4. **Save and restart Cursor**

## Test Deployment

Once gcloud is set up, you can deploy:

```powershell
cd C:\Users\qubad\medplat
powershell -ExecutionPolicy Bypass -File .\deploy_success_method.ps1
```

## Troubleshooting

### "gcloud: command not found"
- gcloud is not in PATH
- Solution: Run `setup_gcloud.ps1` or add gcloud bin directory to PATH manually

### "You do not currently have an active account selected"
- Run: `gcloud auth login`

### "Project not set"
- Run: `gcloud config set project medplat-458911`

### "Permission denied"
- Your account needs proper GCP permissions
- Ensure you're logged in with the correct account: `gcloud auth list`

## Common Installation Locations

gcloud is typically installed at:
- `%LOCALAPPDATA%\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd`
- `%ProgramFiles%\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd`

If you find it elsewhere, add that path to your PATH environment variable.
