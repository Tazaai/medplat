import express from "express";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const router = express.Router();
const db = getFirestore();

// POST /api/comments -> { ok:true }
router.post("/", async (req, res) => {
  try {
    const { caseId, text, user } = req.body || {};
    if (!caseId || !text) return res.status(400).json({ ok: false, error: "caseId_and_text_required" });
    await db.collection("comments").add({
      caseId,
      text,
      user: user || null,
      createdAt: FieldValue.serverTimestamp(),
    });
    res.json({ ok: true });
  } catch (e) {
    console.error("comment error:", e);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

export default router;
