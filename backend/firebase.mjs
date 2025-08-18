import admin from "firebase-admin";
import { initializeApp, getApps } from "firebase-admin/app";

// In a hosted environment like Cloud Run, the SDK is often auto-initialized.
// This check ensures we only initialize once and handles local dev cases.
if (!getApps().length) {
  try {
    console.log("Initializing Firebase Admin SDK...");
    initializeApp();
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (e) {
    console.error("Firebase Admin SDK initialization failed:", e);
  }
}

export default admin;