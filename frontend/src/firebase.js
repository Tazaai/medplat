// frontend/src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase Web SDK configuration
// ⚠️ TODO: Get these values from Firebase Console → Project Settings → Your Apps → Web App
// These are PUBLIC keys - safe to expose in client code (they identify the project, not authenticate)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "placeholder-get-from-console",
  authDomain: "medplat-458911.firebaseapp.com",
  projectId: "medplat-458911",
  storageBucket: "medplat-458911.firebasestorage.app",
  messagingSenderId: "139218747785",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "placeholder-get-from-console"
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
