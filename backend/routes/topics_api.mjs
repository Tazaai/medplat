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

// GET /api/topics/categories - extract unique categories from topics2
router.post("/categories", async (req, res) => {
  const fb = initFirebase();
  const firestore = fb.firestore;
  const collectionName = process.env.TOPICS_COLLECTION || "topics2";

  try {
    const snapshot = await firestore.collection(collectionName).get();
    const categoriesSet = new Set();

    snapshot.docs.forEach((doc) => {
      const category = doc.data().category;
      if (category) categoriesSet.add(category);
    });

    const categories = Array.from(categoriesSet).sort();

    res.json({
      ok: true,
      categories,
      count: categories.length,
    });
  } catch (err) {
    console.error("🔥 Error fetching categories:", err.message);
    res.status(500).json({
      ok: false,
      error: err.message,
      categories: [],
    });
  }
});

// POST /api/topics/search - filter topics by category (area)
router.post("/search", async (req, res) => {
  const fb = initFirebase();
  const firestore = fb.firestore;
  const collectionName = process.env.TOPICS_COLLECTION || "topics2";
  const { area } = req.body;

  try {
    const snapshot = await firestore.collection(collectionName).get();
    let topics = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((t) => !area || t.category === area)
      .sort((a, b) => (a.topic || "").localeCompare(b.topic || ""));

    res.json({
      ok: true,
      topics,
      count: topics.length,
      filtered_by: area || "none",
    });
  } catch (err) {
    console.error("🔥 Error searching topics:", err.message);
    res.status(500).json({
      ok: false,
      error: err.message,
      topics: [],
    });
  }
});

export default router;
