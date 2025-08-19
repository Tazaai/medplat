import express from "express";
import { getFirestore } from "firebase-admin/firestore";

const router = express.Router();
const db = getFirestore();

// POST /api/topics/categories  -> { ok:true, categories:string[] }
router.post("/categories", async (req, res) => {
  try {
    const lang = (req.body && req.body.lang) || null;
    const snap = await db.collection("topics2").select("category", "lang").get();
    const set = new Set();
    snap.forEach(doc => {
      const d = doc.data() || {};
      if (!d.category) return;
      if (!lang || d.lang === lang) set.add(String(d.category));
    });
    const categories = Array.from(set).sort((a, b) => a.localeCompare(b));
    res.json({ ok: true, categories });
  } catch (e) {
    console.error("categories error:", e);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

// POST /api/topics  -> { ok:true, topics:[{id,topic}] }
router.post("/", async (req, res) => {
  try {
    const { area, lang } = req.body || {};
    if (!area) return res.status(400).json({ ok: false, error: "area_required" });

    let q = db.collection("topics2").where("category", "==", area);
    // lang is optional; filter client-side to avoid missing index
    const snap = await q.get();

    const out = [];
    snap.forEach(doc => {
      const d = doc.data() || {};
      if (lang && d.lang && d.lang !== lang) return;
      const id = String(d.id || doc.id || "").trim();
      const topic = String(d.topic || d.id || doc.id || "").trim();
      if (!topic) return;
      out.push({ id: id || topic.replace(/\s+/g, "_").toLowerCase(), topic });
    });

    out.sort((a, b) => String(a.topic).localeCompare(String(b.topic)));
    res.json({ ok: true, topics: out });
  } catch (e) {
    console.error("topics error:", e);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

export default router;
