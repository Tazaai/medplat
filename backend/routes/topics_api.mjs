// backend/routes/topics_api.mjs
import express from "express";
import { initFirebase } from "../firebaseClient.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const fb = initFirebase();
  const firestore = fb.firestore;
  const collectionName = process.env.TOPICS_COLLECTION || "topics2";
  let topics = [];

  try {
    const snapshot = await firestore.collection(collectionName).get();

    topics = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      ok: true,
      firestore_initialized: fb.initialized,
      count: topics.length,
      topics,
      collection_used: collectionName,
    });
  } catch (err) {
    console.error("🔥 Error fetching topics:", err.message);
    res.status(500).json({
      ok: false,
      firestore_initialized: fb.initialized,
      error: err.message,
      topics: [],
      collection_used: collectionName,
    });
  }
});

export default router;
