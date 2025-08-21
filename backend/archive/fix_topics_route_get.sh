#!/bin/bash

ROUTE_FILE="routes/topics_api.mjs"

echo "🔧 Replacing topics API to use GET method..."

cat > "$ROUTE_FILE" << 'INNER'
import express from "express";
import { getTopics } from "../firebaseClient.js";

const router = express.Router();

router.get("/api/topics", async (req, res) => {
  try {
    const { lang, collection } = req.query;
    if (!lang || !collection) {
      return res.status(400).json({ error: "Missing lang or collection in query" });
    }

    const topics = await getTopics(lang, collection);
    res.json(topics);
  } catch (err) {
    console.error("Failed to fetch topics:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
INNER

echo "✅ topics_api.mjs updated to GET."
echo "🚀 Now test with:"
echo "curl 'http://localhost:8080/api/topics?lang=en&collection=topics'"
