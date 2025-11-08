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

// POST /api/topics/custom-search - fuzzy search with missing topic suggestions
router.post("/custom-search", async (req, res) => {
  const fb = initFirebase();
  const firestore = fb.firestore;
  const collectionName = process.env.TOPICS_COLLECTION || "topics2";
  
  try {
    const { query, category } = req.body || {};
    if (!query || query.length < 2) {
      return res.status(400).json({ ok: false, error: "Query too short (min 2 chars)" });
    }

    const snapshot = await firestore.collection(collectionName).get();
    const allTopics = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const queryLower = query.toLowerCase();
    
    // Fuzzy matching: exact match, starts with, contains, word boundary
    const matches = allTopics
      .map((topic) => {
        const topicLower = (topic.topic || "").toLowerCase();
        const categoryLower = (topic.category || "").toLowerCase();
        
        let score = 0;
        if (topicLower === queryLower) score = 100; // exact match
        else if (topicLower.startsWith(queryLower)) score = 80; // starts with
        else if (topicLower.includes(queryLower)) score = 60; // contains
        else if (topicLower.split(" ").some(word => word.startsWith(queryLower))) score = 50; // word start
        else if (categoryLower.includes(queryLower)) score = 30; // category match
        
        // Category filter
        if (category && topic.category !== category) score = 0;
        
        return { ...topic, matchScore: score };
      })
      .filter((t) => t.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 20); // top 20 results

    const hasExactMatch = matches.some((m) => m.matchScore === 100);
    
    // Suggest missing topic if no exact match
    const suggestion = !hasExactMatch ? {
      isSuggestion: true,
      topic: `"${query}" (not in database - generate custom case)`,
      category: category || "Custom",
      description: "This topic is not in our database. You can still generate a case for it."
    } : null;

    res.json({
      ok: true,
      matches,
      count: matches.length,
      query,
      exactMatch: hasExactMatch,
      suggestion
    });

  } catch (err) {
    console.error("🔥 Error in custom search:", err.message);
    res.status(500).json({
      ok: false,
      error: err.message,
      matches: [],
    });
  }
});

export default router;
