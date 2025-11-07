#!/bin/bash
# Script to help configure Firebase web app keys

echo "🔥 Firebase Web App Configuration Helper"
echo "========================================"
echo ""
echo "📋 Current firebase.js configuration status:"
echo ""

# Check current config
if grep -q "placeholder-get-from-console" /workspaces/medplat/frontend/src/firebase.js; then
  echo "⚠️  Still using placeholder values"
else
  echo "✅ Firebase config appears to be set"
fi

echo ""
echo "📖 INSTRUCTIONS:"
echo ""
echo "1. Open Firebase Console (already open in browser):"
echo "   https://console.firebase.google.com/project/medplat-458911/settings/general"
echo ""
echo "2. Scroll to 'Your apps' section"
echo ""
echo "3. Look for an existing Web app OR click 'Add app' → Web (</> icon)"
echo ""
echo "4. Copy the firebaseConfig values shown"
echo ""
echo "5. Paste them below when prompted"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Do you have the Firebase config ready? (y/n): " ready

if [ "$ready" != "y" ]; then
  echo "⏸️  Exiting. Run this script again when ready."
  exit 0
fi

echo ""
echo "Enter the values from Firebase Console:"
echo ""

read -p "apiKey: " api_key
read -p "messagingSenderId: " messaging_sender_id
read -p "appId: " app_id

# Update firebase.js
cat > /workspaces/medplat/frontend/src/firebase.js << EOF
// frontend/src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase Web SDK configuration (from Firebase Console)
const firebaseConfig = {
  apiKey: "${api_key}",
  authDomain: "medplat-458911.firebaseapp.com",
  projectId: "medplat-458911",
  storageBucket: "medplat-458911.firebasestorage.app",
  messagingSenderId: "${messaging_sender_id}",
  appId: "${app_id}"
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
EOF

echo ""
echo "✅ Firebase config updated!"
echo ""
echo "📦 Next steps:"
echo "1. cd /workspaces/medplat/frontend"
echo "2. npm run build"
echo "3. Rebuild and redeploy Docker image"
echo ""
