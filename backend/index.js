import express from "express";
import cors from "cors";
import "./firebase.mjs";

import topicsApi from "./routes/topics_api.mjs";
import dialogApi from "./routes/dialog_api.mjs";
import gamifyApi from "./routes/gamify_api.mjs";
import commentApi from "./routes/comment_api.mjs";

const app = express();
app.set("trust proxy", true);

const allowed = new Set([
  process.env.FRONTEND_ORIGIN || "https://medplat-frontend-139218747785.europe-west1.run.app",
  "http://localhost:5173",
]);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    cb(null, allowed.has(origin));
  },
}));
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "medplat-backend", env: process.env.NODE_ENV || "production", allowedOrigins: Array.from(allowed) });
});
app.get("/favicon.ico", (_req, res) => res.sendStatus(204));

app.use("/api/topics", topicsApi);     // POST /api/topics/categories, POST /api/topics
app.use("/api/gamify", gamifyApi);     // POST /api/gamify
app.use("/api/comments", commentApi);  // POST /api/comments
app.use("/api", dialogApi);            // POST /api/dialog

app.all("/api/*", (_req, res) => res.status(404).json({ ok: false, error: "Not found" }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("listening", PORT));
export default app;