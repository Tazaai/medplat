// ~/medplat/backend/routes/topics_api.mjs
import express from "express";
import admin from "../firebase.mjs";

const router = express.Router();

const withTimeout = (p, ms = 8000, label = "operation") =>
  Promise.race([
    p,
    new Promise((_, r) =>
      setTimeout(() => r(new Error(`${label} timeout after ${ms}ms`)), ms)
    ),
  ]);

const norm = (s = "") => String(s || "").trim();
const nlang = (l = "en") =>
  (String(l || "en").trim().toLowerCase() || "en");

/**
 * Load topics or categories from Firestore.
 */
async function loadFromFirestore(area, lang) {
  if (!admin?.apps?.length) {
    console.warn("Firebase not initialized, skipping Firestore load.");
    return [];
  }
  const db = admin.firestore();
  const collectionsToTry = ["topics2", "topics"];

  for (const name of collectionsToTry) {
    try {
      const snap = await withTimeout(
        db.collection(name).where("lang", "==", lang).get(),
        6000,
        `firestore-${name}`
      );
      if (!snap.empty) {
        const arr = [];
        snap.forEach((doc) => {
          const d = doc.data() || {};
          if (area && norm(d.category) !== norm(area)) return;
          arr.push({ id: doc.id, ...d });
        });
        return arr;
      }
    } catch (e) {
      console.error(`[topics_api] Failed to read ${name}:`, e);
    }
  }
  return [];
}

// ---------- Routes ----------

// Explicit categories endpoint
router.post("/categories", async (req, res) => {
  try {
    const lang = nlang(req.body?.lang || req.query?.lang);
    const arr = await loadFromFirestore(null, lang);
    const categories = Array.from(
      new Set(arr.map((d) => d.category).filter(Boolean))
    ).sort();
    res.json({ ok: true, categories });
  } catch (e) {
    console.error("Error in /categories:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Main topics endpoint
router.post("/", async (req, res) => {
  try {
    const area = norm(req.body?.area || req.query?.area);
    const lang = nlang(req.body?.lang || req.query?.lang);

    // 🔑 Handle {"list":"categories"} here for frontend compatibility
    if (req.body?.list === "categories") {
      const arr = await loadFromFirestore(null, lang);
      const categories = Array.from(
        new Set(arr.map((d) => d.category).filter(Boolean))
      ).sort();
      return res.json({ ok: true, categories });
    }

    if (!area) {
      return res.json({ ok: true, topics: [] });
    }

    const arr = await loadFromFirestore(area, lang);
    const topics = arr.map((d) => ({
      id: d.id,
      topic: d.topic || d.id,
      category: d.category,
      lang: d.lang,
    }));
    res.json({ ok: true, topics });
  } catch (e) {
    console.error("Error in /:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
