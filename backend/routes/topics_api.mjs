// backend/routes/topics_api.mjs
import express from "express";
import { initFirebase } from "../firebaseClient.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Load fallback topics data
let fallbackTopics = [];
try {
  const fallbackPath = path.join(__dirname, '../data/new_topics_global.json');
  const fallbackContent = fs.readFileSync(fallbackPath, 'utf8');
  fallbackTopics = JSON.parse(fallbackContent);
  console.log(`✅ Loaded ${fallbackTopics.length} fallback topics`);
} catch (error) {
  console.warn('⚠️ Could not load fallback topics:', error.message);
}

router.get("/", async (req, res) => {
  const fb = initFirebase();
  const firestore = fb.firestore;
  const collectionName = process.env.TOPICS_COLLECTION || "topics2";
  let topics = [];

  try {
    if (fb.initialized) {
      const snapshot = await firestore.collection(collectionName).get();
      topics = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    }
    
    // Use fallback if Firestore not available or empty
    if (!fb.initialized || topics.length === 0) {
      topics = fallbackTopics.map((topic, index) => ({
        id: `fallback_${index}`,
        ...topic
      }));
    }

    res.json({
      ok: true,
      firestore_initialized: fb.initialized,
      count: topics.length,
      topics,
      collection_used: fb.initialized ? collectionName : 'fallback_data',
    });
  } catch (err) {
    console.error("🔥 Error fetching topics:", err.message);
    // Return fallback data on error
    const fallbackTopicsWithId = fallbackTopics.map((topic, index) => ({
      id: `fallback_${index}`,
      ...topic
    }));
    
    res.json({
      ok: true,
      firestore_initialized: false,
      error: err.message,
      topics: fallbackTopicsWithId,
      count: fallbackTopicsWithId.length,
      collection_used: 'fallback_data',
    });
  }
});

// GET /api/topics/categories - extract unique categories from topics2
router.post("/categories", async (req, res) => {
  const fb = initFirebase();
  const firestore = fb.firestore;
  const collectionName = process.env.TOPICS_COLLECTION || "topics2";
  const categoriesSet = new Set();

  try {
    let topics = [];
    
    if (fb.initialized) {
      const snapshot = await firestore.collection(collectionName).get();
      topics = snapshot.docs.map(doc => doc.data());
    }
    
    // Use fallback if Firestore not available or empty
    if (!fb.initialized || topics.length === 0) {
      topics = fallbackTopics;
    }

    topics.forEach((topic) => {
      const category = topic.category;
      if (category) categoriesSet.add(category);
    });

    const categories = Array.from(categoriesSet).sort();

    res.json({
      ok: true,
      categories,
      count: categories.length,
      source: fb.initialized ? 'firestore' : 'fallback',
    });
  } catch (err) {
    console.error("🔥 Error fetching categories:", err.message);
    // Extract categories from fallback data
    fallbackTopics.forEach((topic) => {
      if (topic.category) categoriesSet.add(topic.category);
    });
    
    const categories = Array.from(categoriesSet).sort();
    
    res.json({
      ok: true,
      categories,
      count: categories.length,
      source: 'fallback',
      error: err.message,
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
