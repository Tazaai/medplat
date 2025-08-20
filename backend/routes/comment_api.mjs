import express from "express";

export default function commentApi(db) {
  const router = express.Router();

  router.post("/", async (req, res) => {
    try {
      const { caseId, text, user } = req.body || {};
      if (!caseId || !text || !user) {
        return res.status(400).json({ error: "Missing fields in request body" });
      }

      const commentRef = db.collection("comments").doc();
      await commentRef.set({
        caseId,
        text,
        user,
        timestamp: new Date().toISOString()
      });

      res.status(200).json({ success: true, id: commentRef.id });
    } catch (err) {
      console.error("❌ Error in /api/comments:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  return router;
}
