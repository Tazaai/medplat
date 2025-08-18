// ~/medplat/backend/index.js
import express from "express";
import cors from "cors";
import "./firebase.mjs"; // Initialize Firebase Admin SDK

import topicsApi from "./routes/topics_api.mjs";
import dialogApi from "./routes/dialog_api.mjs";
import gamifyApi from "./routes/gamify_api.mjs";
import caseGenerate from "./routes/case_generate.mjs"; // JSON case generator route
// import commentApi from "./routes/comment_api.mjs"; // optional

const app = express();
app.set("trust proxy", true);

// ---------- CORS ----------
const DEFAULT_ALLOWED = [
  "https://medplat-frontend-139218747785.europe-west1.run.app",
  "http://localhost:5173",
];

const ENV_ALLOWED = (process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  ...(ENV_ALLOWED.length ? ENV_ALLOWED : DEFAULT_ALLOWED),
]);

app.use(
  cors({
    origin(origin, cb) {
      // allow same-origin/no-origin (curl, health checks)
      if (!origin) return cb(null, true);
      if (allowedOrigins.has(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: "GET,POST,PUT,PATCH,DELETE,OPTIONS", // Explicitly define allowed methods
  })
);

// ---------- Body parsing ----------
app.use(express.json({ limit: "4mb" }));
app.use(express.urlencoded({ extended: true, limit: "4mb" }));

// ---------- Health ----------
app.get("/healthz", (_req, res) => res.status(200).send("ok"));
app.get("/", (_req, res) =>
  res.status(200).json({
    ok: true,
    service: "medplat-backend",
    env: process.env.NODE_ENV || "development",
    allowedOrigins: Array.from(allowedOrigins),
  })
);

// ---------- API routes ----------
// topicsApi expects to be mounted at /api/topics (router handles "/")
app.use("/api/topics", topicsApi);

// dialogApi defines POST "/dialog" internally, so mount at "/api" to expose "/api/dialog"
app.use("/api", dialogApi);

// gamifyApi typically defines "/" routes; mounting at "/api/gamify" exposes "/api/gamify"
app.use("/api/gamify", gamifyApi);

// caseGenerate defines "/cases/generate"; mounting at "/api" exposes "/api/cases/generate"
app.use("/api", caseGenerate);

// app.use("/api/comments", commentApi); // if present

// 404 for unknown API routes
app.all("/api/*", (_req, res) => res.status(404).json({ error: "Not found" }));

// ---------- Error handler ----------
app.use((err, _req, res, _next) => {
  console.error("[Server Error]", err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal Server Error" });
});

// ---------- Start server ----------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 medplat-backend listening on ${PORT}`));
