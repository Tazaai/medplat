// /home/rahpodcast2022/medplat/frontend/src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

// ✅ Your updated Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyD8MIIrhra69EY2A6zItzhCo0OVvYRyS6I",  // ✅ Updated key
  authDomain: "medplat-458911.firebaseapp.com",
  projectId: "medplat-458911",
  storageBucket: "medplat-458911.appspot.com",       // ✅ Fixed: was wrong before
  messagingSenderId: "139218747785",
  appId: "1:139218747785:web:54bacc6377436815a46158"
};

// ✅ Initialize Firebase app
const app = initializeApp(firebaseConfig);

// ✅ Export Firestore (used for database reads/writes)
export const db = getFirestore(app);

// ✅ Export Auth instance
export const auth = getAuth(app);

// ✅ Enable anonymous login
signInAnonymously(auth).catch((error) => {
  console.error("❌ Anonymous login failed:", error.message);
});
