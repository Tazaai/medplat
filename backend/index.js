// ~/medplat/backend/index.js
import express from "express";
import cors from "cors";
import admin from "firebase-admin";

import topicsApi from "./routes/topics_api.mjs";
import dialogApi from "./routes/dialog_api.mjs";
import gamifyApi from "./routes/gamify_api.mjs";
import casesApi from "./routes/cases_api.mjs";

const app = express();
app.set("trust proxy", true);

// ✅ Allow both Cloud Run frontend + Codespaces frontend origins
const allowedOrigins = [
  "https://medplat-frontend-458911.europe-west1.run.app",   // Cloud Run frontend
  "https://super-zebra-g46xvpxqjrv5cwqg4-5173.app.github.dev", // Codespaces port 5173
  "https://super-zebra-g46xvpxqjrv5cwqg4-5174.app.github.dev", // Codespaces port 5174
];

const corsOptions = {
  origin(origin, cb) {
    // allow server-to-server or curl with no origin
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error("❌ Not allowed by CORS: " + origin));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Origin", "Accept"],
  credentials: true,
};

app.use(cors({ origin: true, credentials: true }));
app.options("*", cors(corsOptions));
app.use(express.json());

// ✅ Firebase Admin init (idempotent)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}
const db = admin.firestore();

// ✅ Health
app.get("/", (_req, res) => res.send("✅ MedPlat backend is running"));
app.get("/ping", (_req, res) =>
  res.json({ ok: true, service: "backend", time: new Date().toISOString() })
);

// ✅ API Routes
app.use("/api/topics", topicsApi(db));
app.use("/api/dialog", dialogApi(db));   // includes /location now
app.use("/api/gamify", gamifyApi);
app.use("/api/cases", casesApi());

// ✅ Global error guard
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

// ✅ Cloud Run port binding
const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ MedPlat backend running on port ${port}`);
});
