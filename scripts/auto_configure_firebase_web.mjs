#!/usr/bin/env node
/**
 * Auto-configure Firebase Web App
 * Creates or retrieves Firebase web app config and updates firebase.js
 */

import { execSync } from "child_process";
import { writeFileSync } from "fs";

const PROJECT_ID = "medplat-458911";

console.log("🔥 Firebase Web App Auto-Configuration");
console.log("=====================================\n");

try {
  // Try to list existing Firebase web apps
  console.log("📋 Checking for existing Firebase web apps...");
  
  const result = execSync(
    `gcloud firebase apps list --project=${PROJECT_ID} --format=json 2>/dev/null || echo "[]"`,
    { encoding: "utf-8" }
  );
  
  const apps = JSON.parse(result);
  const webApp = apps.find(app => app.platform === "WEB");
  
  if (webApp) {
    console.log(`✅ Found existing web app: ${webApp.displayName || webApp.appId}`);
    console.log(`   App ID: ${webApp.appId}\n`);
  } else {
    console.log("⚠️  No web app found");
    console.log("ℹ️  Manual steps required:");
    console.log("   1. Go to: https://console.firebase.google.com/project/medplat-458911/settings/general");
    console.log("   2. Scroll to 'Your apps'");
    console.log("   3. Click 'Add app' → Web");
    console.log("   4. Name it 'MedPlat Web'");
    console.log("   5. Copy the config values\n");
  }
  
  // Try to get web app config using Firebase API
  console.log("🔍 Attempting to retrieve web app configuration...");
  
  const configResult = execSync(
    `gcloud firebase apps describe ${webApp?.appId || "auto"} --project=${PROJECT_ID} --format=json 2>/dev/null || echo "{}"`,
    { encoding: "utf-8" }
  );
  
  const config = JSON.parse(configResult);
  
  if (config.apiKey) {
    console.log("✅ Retrieved Firebase web config!");
    
    const firebaseJsContent = `// frontend/src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase Web SDK configuration (auto-configured)
const firebaseConfig = {
  apiKey: "${config.apiKey}",
  authDomain: "${PROJECT_ID}.firebaseapp.com",
  projectId: "${PROJECT_ID}",
  storageBucket: "${config.storageBucket || PROJECT_ID + '.firebasestorage.app'}",
  messagingSenderId: "${config.messagingSenderId || 'auto'}",
  appId: "${config.appId}"
};

// Initialize Firebase app
let app;
let db;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log("✅ Firebase initialized for score tracking");
} catch (error) {
  console.warn("⚠️ Firebase initialization failed (score tracking disabled):", error.message);
  // Create a mock db object that silently fails
  db = {
    collection: () => ({
      doc: () => ({
        set: () => Promise.resolve(),
      }),
    }),
  };
}

export { db };
`;
    
    writeFileSync("/workspaces/medplat/frontend/src/firebase.js", firebaseJsContent);
    console.log("✅ Updated frontend/src/firebase.js");
    console.log("\n📦 Next: rebuild and redeploy frontend");
    
  } else {
    console.log("\n⚠️  Could not auto-retrieve config");
    console.log("📖 Manual configuration required:");
    console.log("   Run: ./scripts/configure_firebase_web.sh");
  }
  
} catch (error) {
  console.error("❌ Error:", error.message);
  console.log("\n📖 Fallback: Manual configuration");
  console.log("   1. Open: https://console.firebase.google.com/project/medplat-458911/settings/general");
  console.log("   2. Find/create Web app");
  console.log("   3. Run: ./scripts/configure_firebase_web.sh");
  process.exit(1);
}
