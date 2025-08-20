import express from "express";
import { getFirestore } from "firebase-admin/firestore";

const router = express.Router();
const db = getFirestore();

router.post("/", async (req, res) => {
  const { userId, caseId, text, mcqs, scoreLog, timestamp } = req.body;
  if (!userId || !mcqs || !scoreLog) {
    return res.status(400).json({ error: "Missing data" });
  }

  try {
    await db.collection("savedCasesLevel2").add({
      userId,
      caseId,
      text,
      mcqs,
      scoreLog,
      savedAt: timestamp || new Date().toISOString()
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Save case failed:", err.message);
    res.status(500).json({ error: "Failed to save case" });
  }
});

export default () => router;
