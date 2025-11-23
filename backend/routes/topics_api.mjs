import express from 'express';
import { initFirebase } from '../firebaseClient.js';
import fs from 'fs';

const router = express.Router();
const CATEGORIES_PATH = process.env.CATEGORIES_PATH || './backend/data/categories.json';
let APPROVED_CATEGORIES = [];
try {
  APPROVED_CATEGORIES = JSON.parse(fs.readFileSync(CATEGORIES_PATH, 'utf8'));
} catch (e) {
  APPROVED_CATEGORIES = [];
}

const db = initFirebase().firestore;


// --- Strict schema for topics2 ---
const TOPIC_SCHEMA = {
  id: 'string',
  topic: 'string',
  category: 'string',
  difficulty: 'string',
  lang: 'string',
  area: 'string|null',
  keywords: 'object',
};

function toSnakeCase(str) {
  return str && str.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
}

function toTitleCase(str) {
  return str && str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function sanitizeTopic(doc, approvedCategories) {
  // Remove extra fields, fix names, fill defaults, validate category
  let t = { ...doc };
  // Fix wrong field names
  if (t.name && !t.topic) t.topic = t.name;
  // Remove unknown fields
  Object.keys(t).forEach(k => {
    if (!(k in TOPIC_SCHEMA)) delete t[k];
  });
  // Add missing fields
  if (!t.id && t.topic) t.id = toSnakeCase(t.topic);
  if (!t.topic && t.id) t.topic = t.id.replace(/_/g, ' ');
  if (!t.category) t.category = '';
  if (!t.difficulty) t.difficulty = 'intermediate';
  if (!t.lang) t.lang = 'en';
  if (!('area' in t)) t.area = null;
  if (!t.keywords || typeof t.keywords !== 'object') t.keywords = { topic: t.topic, lang: 'en' };
  if (!t.keywords.topic) t.keywords.topic = t.topic;
  if (!t.keywords.lang) t.keywords.lang = 'en';
  // Enforce id = snake_case(topic)
  if (t.topic) t.id = toSnakeCase(t.topic);
  // Validate category
  if (!approvedCategories.includes(t.category)) return { error: 'Invalid category', doc: t };
  // Difficulty
  if (!['beginner','intermediate','advanced'].includes(t.difficulty)) t.difficulty = 'intermediate';
  // Area
  return t;
}

// ------------------------
// ADMIN ROUTES (topics2)
// ------------------------

// Sanitize one topic by id (strict schema)
  router.post('/admin/topics2/sanitizeOne', async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ ok: false, message: 'Missing id', details: {} });
    try {
      const ref = db.collection('topics2').doc(id);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ ok: false, message: 'Not found', details: {} });
      const orig = snap.data();
      const sanitized = sanitizeTopic(orig, APPROVED_CATEGORIES);
      if (sanitized.error) {
        return res.status(400).json({ ok: false, message: sanitized.error, details: { doc: sanitized.doc } });
      }
      await ref.set(sanitized);
      console.log('[ADMIN ACTION]', 'sanitizeOne', id);
      res.json({ ok: true, message: 'Topic sanitized', details: { sanitized } });
    } catch (err) {
      res.status(500).json({ ok: false, message: err.message, details: {} });
    }
  });

  // Find all invalid topics (detailed reasons)
  router.get('/admin/topics2/find-invalid', async (req, res) => {
    try {
      const snapshot = await db.collection('topics2').get();
      const invalid = [];
      snapshot.docs.forEach(docSnap => {
        const d = docSnap.data();
        const errors = validateTopic(d, APPROVED_CATEGORIES);
        if (errors.length > 0) {
          invalid.push({ id: d.id, errors, doc: d });
        }
      });
      res.json({ ok: true, message: 'Invalid topics fetched', details: { invalid } });
    } catch (err) {
      res.status(500).json({ ok: false, message: err.message, details: {} });
    }
  });

  // Suggest missing topics per specialty (static example)
  router.get('/admin/topics2/suggest-missing-topics', async (req, res) => {
    try {
      const suggestions = {
        Cardiology: ["Acute Myocardial Infarction", "Atrial Fibrillation", "Heart Failure"],
        Pulmonology: ["Asthma", "COPD", "Pulmonary Embolism"],
        Neurology: ["Stroke", "Epilepsy", "Multiple Sclerosis"],
        InfectiousDiseases: ["Sepsis", "HIV", "Tuberculosis"]
      };
      res.json({ ok: true, message: 'Suggestions ready', details: { suggestions } });
    } catch (err) {
      res.status(500).json({ ok: false, message: err.message, details: {} });
    }
  });

  // Admin-protected: approve new category (adds to categories.json)
  router.post('/admin/topics2/approve-category', async (req, res) => {
    const { category } = req.body;
    if (!category) return res.status(400).json({ ok: false, message: 'Missing category', details: {} });
    try {
      let cats = [];
      try {
        cats = JSON.parse(fs.readFileSync(CATEGORIES_PATH, 'utf8'));
      } catch (e) { cats = []; }
      if (cats.includes(category)) return res.json({ ok: true, message: 'Category already approved', details: { already: true } });
      cats.push(category);
      fs.writeFileSync(CATEGORIES_PATH, JSON.stringify(cats, null, 2));
      APPROVED_CATEGORIES = cats;
      console.log('[ADMIN ACTION]', 'approve-category', category);
      res.json({ ok: true, message: 'Category approved', details: { added: category } });
    } catch (err) {
      res.status(500).json({ ok: false, message: err.message, details: {} });
    }
  });

  // Diagnostics route: scan topics2 for duplicates, missing fields, and categories
  router.get('/admin/topics2/diagnostics', async (req, res) => {
    try {
      const snapshot = await db.collection('topics2').get();
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const categories = {};
      const duplicates = [];
      const missingFields = [];
      const foundCategories = new Set();
      const categoryCounts = {};
      docs.forEach(d => {
        const norm = d.topic?.trim().toLowerCase();
        if (!categories[norm]) categories[norm] = 0;
        categories[norm]++;
        if (categories[norm] > 1) duplicates.push(d);
        ['category','topic','lang','difficulty','keywords'].forEach(f => {
          if (!d[f]) missingFields.push({ id: d.id, missing: f });
        });
        if (d.category) {
          foundCategories.add(d.category);
          categoryCounts[d.category] = (categoryCounts[d.category] || 0) + 1;
        }
      });
      const categoriesFound = Array.from(foundCategories).sort();
      const categoriesWithNoTopics = STANDARD_CATEGORIES.filter(cat => !categoryCounts[cat]);
      const categoriesMissing = STANDARD_CATEGORIES.filter(cat => !foundCategories.has(cat));
      res.json({
        ok: true,
        message: 'Diagnostics complete',
        details: {
          total: docs.length,
          duplicates,
          missingFields,
          categories: categoriesFound,
          categoriesFound,
          categoriesMissing,
          categoriesWithNoTopics
        }
      });
    } catch (err) {
      res.status(500).json({ ok: false, message: err.message, details: {} });
    }
  });

  // Admin delete topic by id
  router.post('/admin/topics2/delete', async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ ok: false, message: 'Missing id', details: {} });
    try {
      await db.collection('topics2').doc(id).delete();
      console.log('[ADMIN ACTION]', 'delete', id);
      res.json({ ok: true, message: 'Topic deleted', details: { id } });
    } catch (err) {
      res.status(500).json({ ok: false, message: err.message, details: {} });
    }
  });

  // Preview changes for admin: how many will be fixed, invalid, deleted, unapproved, suggested
  router.get('/admin/topics2/preview-changes', async (req, res) => {
    try {
      const snapshot = await db.collection('topics2').get();
      let fixCount = 0, invalidCount = 0, deleteCount = 0;
      let unapprovedCategories = new Set();
      let missingFieldsCount = 0;
      const invalid = [];
      snapshot.docs.forEach(docSnap => {
        const d = docSnap.data();
        const errors = validateTopic(d, APPROVED_CATEGORIES);
        if (errors.length > 0) {
          invalidCount++;
          invalid.push({ id: d.id, errors });
          if (errors.some(e => e.startsWith('missing:'))) missingFieldsCount++;
          if (errors.includes('invalid:category')) unapprovedCategories.add(d.category);
          if (errors.includes('orphan:topic')) deleteCount++;
          else fixCount++;
        }
      });
      // Get suggested topics
      let suggestions = {};
      try {
        const suggRes = await fetch('http://localhost:3000/api/admin/topics2/suggest-missing-topics');
        const suggData = await suggRes.json();
        suggestions = suggData.details?.suggestions || {};
      } catch {}
      res.json({
        ok: true,
        message: 'Preview of changes ready.',
        details: {
          fixCount,
          invalidCount,
          deleteCount,
          missingFieldsCount,
          unapprovedCategories: Array.from(unapprovedCategories),
          suggestedTopics: suggestions,
          invalid
        }
      });
    } catch (err) {
      res.status(500).json({ ok: false, message: 'Failed to preview changes', details: { error: err.message } });
    }
  });

// Admin delete topic by id
router.post('/admin/topics2/delete', async (req, res) => {
  const { id } = req.body;
  try {
    await db.collection('topics2').doc(id).delete();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Add missing Acute Medicine topics
router.post('/admin/topics2/add-missing-acute', async (req, res) => {
  const list = [
    { id:'bradycardia_pacing', category:'Acute Medicine', topic:'Bradycardia – Pacemaker Indications', difficulty:'intermediate', lang:'en', keywords:{ topic:'Bradycardia Pacemaker' }},
    { id:'bradycardia_urgent', category:'Acute Medicine', topic:'Severe Bradycardia – Emergency Management', difficulty:'intermediate', lang:'en', keywords:{ topic:'Acute Bradycardia' }},
    { id:'af_dc_conversion', category:'Acute Medicine', topic:'Atrial Fibrillation – When to DC Convert', difficulty:'intermediate', lang:'en', keywords:{ topic:'AF DC conversion' }},
    { id:'af_watch_wait', category:'Acute Medicine', topic:'Atrial Fibrillation – Watch & Wait Strategy', difficulty:'intermediate', lang:'en', keywords:{ topic:'AF watch wait' }},
    { id:'pacemaker_contra', category:'Acute Medicine', topic:'Pacemaker Contraindications', difficulty:'advanced', lang:'en', keywords:{ topic:'Pacemaker contraindications' }}
  ];

  const batch = db.batch();
  list.forEach(t => {
    batch.set(db.collection('topics2').doc(t.id), t);
  });
  await batch.commit();
  res.json({ ok:true, added:list.length });
});

// Add empty category placeholder
router.post('/admin/topics2/add-category', async (req, res) => {
  const { category } = req.body;
  if (!category) return res.status(400).json({ ok: false, error: 'Missing category' });
  const id = `${category.replace(/\s+/g, '_').toLowerCase()}_placeholder`;
  const doc = {
    id,
    topic: `${category} Placeholder`,
    category,
    lang: 'en',
    difficulty: 'basic',
    keywords: { topic: category }
  };
  try {
    await db.collection('topics2').doc(id).set(doc);
    res.json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Sanitize all topics2 documents
router.post('/admin/topics2/sanitize', async (req, res) => {
  try {
    const snapshot = await db.collection('topics2').get();
    const batch = db.batch();
    const testPatterns = [/test_/i, /temp_/i, /random_/i, /sample_/i, /dummy_topic/i, /example_topic/i, /unknown_disease__X/i];
    const placeholderPatterns = [/\*\*\*/, /placeholder/i];
    const standardSet = new Set(STANDARD_CATEGORIES);
    let removed = 0, updated = 0;
    for (const doc of snapshot.docs) {
      let d = doc.data();
      let remove = false;
      // Remove test-injected topics
      if (testPatterns.some(p => p.test(d.id))) remove = true;
      if (placeholderPatterns.some(p => p.test(d.topic))) remove = true;
      if (remove) {
        batch.delete(doc.ref);
        removed++;
        continue;
      }
      // Sanitize fields
      let changed = false;
      // snake_case id
      const snake = (s) => s && s.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
      const newId = snake(d.id || d.topic);
      if (d.id !== newId) { d.id = newId; changed = true; }
      // trim whitespace
      ['topic','category','lang','difficulty'].forEach(f => { if (d[f]) { const t = d[f].trim(); if (d[f] !== t) { d[f] = t; changed = true; } } });
      // lang always en
      if (d.lang !== 'en') { d.lang = 'en'; changed = true; }
      // keywords
      if (!d.keywords || !d.keywords.topic) { d.keywords = { topic: d.topic }; changed = true; }
      // normalize category
      if (d.category && !standardSet.has(d.category)) {
        // Try to match ignoring case/whitespace
        const match = STANDARD_CATEGORIES.find(cat => cat.toLowerCase() === d.category.toLowerCase().trim());
        if (match) { d.category = match; changed = true; }
      }
      if (changed) {
        batch.set(doc.ref, d);
        updated++;
      }
    }
    await batch.commit();
    res.json({ ok: true, removed, updated });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET all categories from topics2
router.get('/categories', async (req, res) => {
  try {
    const snapshot = await db.collection('topics2').get();
    const categories = [
      ...new Set(
        snapshot.docs.map(doc => doc.data().category).filter(Boolean)
      )
    ];
    res.json({ ok: true, categories });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET topics inside selected category
router.post('/topics2/search', async (req, res) => {
  const { category } = req.body;
  try {
    const snapshot = await db.collection('topics2')
      .where('category', '==', category)
      .get();
    const topics = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json({ ok: true, topics });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ADMIN: add new category
router.post('/topics2/admin/add-category', async (req, res) => {
  const { category } = req.body;
  if (!category) return res.status(400).json({ ok: false });
  res.json({ ok: true, category });
});

// ADMIN: rename category
router.post('/topics2/admin/rename-category', async (req, res) => {
  const { oldName, newName } = req.body;
  try {
    const docs = await db.collection('topics2')
      .where('category', '==', oldName).get();
    const batch = db.batch();
    docs.forEach(doc => batch.update(doc.ref, { category: newName }));
    await batch.commit();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ADMIN: delete category
router.post('/topics2/admin/delete-category', async (req, res) => {
  const { category } = req.body;
  try {
    const docs = await db.collection('topics2')
      .where('category', '==', category).get();
    const batch = db.batch();
    docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ADMIN: update topic
router.post('/topics2/admin/update-topic', async (req, res) => {
  const { id, data } = req.body;
  try {
    await db.collection('topics2').doc(id).update(data);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ADMIN: delete topic
router.post('/topics2/admin/delete-topic', async (req, res) => {
  const { id } = req.body;
  try {
    await db.collection('topics2').doc(id).delete();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
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
