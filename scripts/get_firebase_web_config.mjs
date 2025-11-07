#!/usr/bin/env node
/**
 * Get Firebase Web App configuration
 * This script retrieves or displays the Firebase web app config needed for frontend
 */

import admin from "firebase-admin";

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_KEY || "{}");

if (!serviceAccount.project_id) {
  console.error("❌ FIREBASE_SERVICE_KEY not set or invalid");
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("✅ Firebase Admin initialized");
  console.log("\n📋 Firebase Web App Configuration:");
  console.log("==================================");
  console.log("Copy these values to frontend/src/firebase.js or set as build-time env vars:\n");
  
  console.log("const firebaseConfig = {");
  console.log(`  apiKey: "YOUR_WEB_API_KEY_FROM_CONSOLE",  // ⚠️ Get from Firebase Console`);
  console.log(`  authDomain: "${serviceAccount.project_id}.firebaseapp.com",`);
  console.log(`  projectId: "${serviceAccount.project_id}",`);
  console.log(`  storageBucket: "${serviceAccount.project_id}.firebasestorage.app",`);
  console.log(`  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",  // ⚠️ Get from Firebase Console`);
  console.log(`  appId: "YOUR_APP_ID"  // ⚠️ Get from Firebase Console`);
  console.log("};");
  
  console.log("\n\n🔗 To get the missing values:");
  console.log("1. Go to: https://console.firebase.google.com/project/medplat-458911/settings/general");
  console.log("2. Scroll to 'Your apps' section");
  console.log("3. If no web app exists, click 'Add app' → Web");
  console.log("4. Copy the apiKey, messagingSenderId, and appId values");
  console.log("\nNote: These are PUBLIC keys - safe to commit to the repository");
  
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
