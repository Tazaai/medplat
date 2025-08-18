import express from "express";
import admin from "../firebaseClient.js";

export default function () {
  const router = express.Router();

  router.options("*", (_, res) => {
    res.set({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Origin, Content-Type, Accept",
    });
    res.sendStatus(200);
  });

  const handler = async (req, res) => {
    try {
      const db = admin.firestore();
      const area = req.body?.area || req.query?.area || "EM";
      const colName = area === "EM" ? "topics" : "topics2";
      const colRef = db.collection(colName);
      const snap = await colRef.get();
      const topics = [];
      snap.forEach(doc => topics.push({ id: doc.id, ...doc.data() }));
      res.set("Access-Control-Allow-Origin", "*");
      res.json(topics);
    } catch (err) {
      console.error("❌ Failed to get topics:", err);
      res.status(500).json({ error: "Failed to get topics" });
    }
  };

  router.post("/", handler);
  router.get("/", handler);

  return router;
}
