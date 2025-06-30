import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import admin from "firebase-admin";
import fs from "fs";
import topicsApi from "./routes/topics_api.mjs";

dotenv.config();

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// === FIREBASE SETUP ===
const serviceAccountPath = "/secrets/serviceAccountKey.json";
let serviceAccount = null;

if (!fs.existsSync(serviceAccountPath)) {
  console.warn("❗ Secret not found at " + serviceAccountPath);
} else {
  try {
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log("✅ Firebase initialized");
  } catch (e) {
    console.error("❌ Firebase init error:", e.message);
  }
}

const db = admin.apps.length ? admin.firestore() : null;
if (!db) {
  console.warn("⚠️ Firestore DB not initialized.");
}

// === ROUTES ===
app.get("/", (req, res) => {
  console.log("✅ Received GET /");
  res.send("Backend is working!");
});

app.use("/api/topics", topicsApi(db));

// === MAIN /api/dialog handler ===
(async () => {
  try {
    const { default: generateCase } = await import("./generate_case_openai.mjs");

    app.post("/api/dialog", async (req, res) => {
      try {
        const userMessage = req.body.userMessage || "Generate a clinical case";
        const lang = req.body.lang || "da";

        const prompt = `Generate ONLY the patient's subjective history (anamnesis) for this clinical case:\n${userMessage}\nDo NOT include objective findings, labs, differential diagnoses, or treatment.\nALSO return: { "aiReply": "...", "objectives": [...] }`;

        const gptRaw = await generateCase(prompt, lang);

        let result = "";
        let objectives = [];

        try {
          const parsed = JSON.parse(gptRaw);
          result = typeof parsed.aiReply === "string"
            ? parsed.aiReply
            : parsed.aiReply?.history || "";
          objectives = parsed.objectives || parsed.aiReply?.objectives || [];
        } catch (e) {
          console.error("⚠️ Failed to parse GPT JSON:", e.message);
          result = gptRaw;
        }

        res.json({ aiReply: result, objectives });
      } catch (error) {
        console.error("❌ /api/dialog error:", error.message);
        res.status(500).json({ aiReply: null, error: error.message });
      }
    });

    const port = process.env.PORT || 8080;
    app.listen(port, "0.0.0.0", () => {
      console.log(`🚀 Server running at http://0.0.0.0:${port}`);
    });
  } catch (err) {
    console.error("❌ Failed to import generate_case_openai.mjs:", err);
  }
})();
