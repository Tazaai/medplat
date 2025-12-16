import express from 'express';
import { initFirebase } from '../firebaseClient.js';

const router = express.Router();

// ✅ DYNAMIC-ONLY: Categories loaded from Firestore, not static JSON
const db = initFirebase().firestore;

const ADMIN_KEY_HEADER = 'x-admin-key';
const ADMIN_KEY_VALUE = process.env.ADMIN_DEBUG_KEY;

function requireAdminKey(req, res, next) {
  if (!ADMIN_KEY_VALUE) {
    return res.status(403).json({ ok: false, message: 'Admin key is not configured' });
  }
  if (req.headers[ADMIN_KEY_HEADER] !== ADMIN_KEY_VALUE) {
    return res.status(403).json({ ok: false, message: 'Forbidden: missing or invalid admin key' });
  }
  next();
}

// Get approved categories dynamically from Firestore
async function getApprovedCategories() {
  try {
    const snapshot = await db.collection('topics2').get();
    const categories = [...new Set(snapshot.docs.map(doc => doc.data().category).filter(Boolean))];
    return categories;
  } catch (e) {
    console.warn('Could not load categories from Firestore:', e.message);
    return [];
  }
}


// --- Strict schema for topics2 ---
// ✅ NO lang, NO difficulty, NO area - removed from structure
const TOPIC_SCHEMA = {
  id: 'string',
  topic: 'string',
  category: 'string',
  keywords: 'object',
};

function toSnakeCase(str) {
  return str && str.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
}

function toTitleCase(str) {
  return str && str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

// ✅ Validate topic document (NO lang, NO difficulty, NO area)
function validateTopic(doc, approvedCategories) {
  const errors = [];
  if (!doc.id || typeof doc.id !== 'string') errors.push('missing:id');
  if (!doc.topic || typeof doc.topic !== 'string') errors.push('missing:topic');
  if (!doc.category || typeof doc.category !== 'string') errors.push('missing:category');
  if (!doc.keywords || typeof doc.keywords !== 'object' || Array.isArray(doc.keywords)) {
    errors.push('missing:keywords');
  }
  if (doc.keywords && !doc.keywords.topic) errors.push('missing:keywords.topic');
  // ✅ Check for removed fields (should not exist)
  if ('lang' in doc) errors.push('invalid:lang_field_present');
  if ('difficulty' in doc) errors.push('invalid:difficulty_field_present');
  if ('area' in doc) errors.push('invalid:area_field_present');
  if (doc.keywords && 'lang' in doc.keywords) errors.push('invalid:keywords_lang_field_present');
  // Validate category
  if (doc.category && !approvedCategories.includes(doc.category)) errors.push('invalid:category');
  return errors;
}

function sanitizeTopic(doc, approvedCategories) {
  // Remove extra fields, fix names, fill defaults, validate category
  let t = { ...doc };
  // ✅ Remove removed fields if present
  if ('lang' in t) delete t.lang;
  if ('difficulty' in t) delete t.difficulty;
  if ('area' in t) delete t.area;
  // Fix wrong field names
  if (t.name && !t.topic) t.topic = t.name;
  // Remove unknown fields (only keep: id, topic, category, keywords)
  Object.keys(t).forEach(k => {
    if (!(k in TOPIC_SCHEMA)) delete t[k];
  });
  // Add missing fields
  if (!t.id && t.topic) t.id = toSnakeCase(t.topic);
  if (!t.topic && t.id) t.topic = t.id.replace(/_/g, ' ');
  if (!t.category) t.category = '';
  // Fix keywords - MUST be object with topic key
  if (!t.keywords || typeof t.keywords !== 'object' || Array.isArray(t.keywords)) {
    t.keywords = { topic: t.topic };
  }
  if (!t.keywords.topic) t.keywords.topic = t.topic;
  // ✅ Remove lang from keywords if present
  if (t.keywords && 'lang' in t.keywords) delete t.keywords.lang;
  // Enforce id = snake_case(topic)
  if (t.topic) t.id = toSnakeCase(t.topic);
  // Validate category
  if (!approvedCategories.includes(t.category)) return { error: 'Invalid category', doc: t };
  return t;
}

// ------------------------
// ADMIN ROUTES (topics2)
// ------------------------

// Sanitize one topic by id (strict schema) - ✅ DYNAMIC-ONLY
  router.post('/admin/topics2/sanitizeOne', requireAdminKey, async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ ok: false, message: 'Missing id', details: {} });
    try {
      const approvedCategories = await getApprovedCategories();
      const ref = db.collection('topics2').doc(id);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ ok: false, message: 'Not found', details: {} });
      const orig = snap.data();
      const sanitized = sanitizeTopic(orig, approvedCategories);
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

  // Find all invalid topics (detailed reasons) - ✅ DYNAMIC-ONLY
  router.post('/admin/topics2/find-invalid', requireAdminKey, async (req, res) => {
    try {
      const approvedCategories = await getApprovedCategories();
      const snapshot = await db.collection('topics2').get();
      const invalid = [];
      snapshot.docs.forEach(docSnap => {
        const d = docSnap.data();
        const errors = validateTopic(d, approvedCategories);
        if (errors.length > 0) {
          invalid.push({ id: d.id, errors, doc: d });
        }
      });
      res.json({ ok: true, message: 'Invalid topics fetched', details: { invalid } });
    } catch (err) {
      res.status(500).json({ ok: false, message: err.message, details: {} });
    }
  });

  // ✅ DYNAMIC-ONLY: Suggest missing topics per specialty
  router.post('/admin/topics2/suggest-missing-topics', requireAdminKey, async (req, res) => {
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

  // ✅ DYNAMIC-ONLY: Approve new category (Firestore-based, no static JSON)
  router.post('/admin/topics2/approve-category', requireAdminKey, async (req, res) => {
    const { category } = req.body;
    if (!category) return res.status(400).json({ ok: false, message: 'Missing category', details: {} });
    try {
      // Categories are now managed dynamically via Firestore topics2 collection
      // No need to write to static JSON files
      console.log('[ADMIN ACTION]', 'approve-category', category, '(dynamic - no static file)');
      res.json({ ok: true, message: 'Category approved (dynamic)', details: { added: category, note: 'Categories managed via Firestore' } });
    } catch (err) {
      res.status(500).json({ ok: false, message: err.message, details: {} });
    }
  });

  // ✅ DYNAMIC-ONLY: Diagnostics route: scan topics2 for duplicates, missing fields, and categories
  router.post('/admin/topics2/diagnostics', requireAdminKey, async (req, res) => {
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
        // ✅ NO lang field - removed from structure
        ['category','topic','difficulty','keywords'].forEach(f => {
          if (!d[f]) missingFields.push({ id: d.id, missing: f });
        });
        if (d.category) {
          foundCategories.add(d.category);
          categoryCounts[d.category] = (categoryCounts[d.category] || 0) + 1;
        }
      });
      const categoriesFound = Array.from(foundCategories).sort();
      // ✅ DYNAMIC-ONLY: No STANDARD_CATEGORIES - categories come from Firestore
      const categoriesWithNoTopics = [];
      const categoriesMissing = [];
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
  router.post('/admin/topics2/delete', requireAdminKey, async (req, res) => {
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

  // Preview changes for admin: how many will be fixed, invalid, deleted, unapproved, suggested - ✅ DYNAMIC-ONLY
  router.post('/admin/topics2/preview-changes', requireAdminKey, async (req, res) => {
    try {
      const approvedCategories = await getApprovedCategories();
      const snapshot = await db.collection('topics2').get();
      let fixCount = 0, invalidCount = 0, deleteCount = 0;
      let unapprovedCategories = new Set();
      let missingFieldsCount = 0;
      const invalid = [];
      snapshot.docs.forEach(docSnap => {
        const d = docSnap.data();
        const errors = validateTopic(d, approvedCategories);
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
      if (ADMIN_KEY_VALUE) {
        try {
          const adminBase = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 8080}`;
          const suggRes = await fetch(`${adminBase}/api/admin/topics2/suggest-missing-topics`, {
            headers: {
              [ADMIN_KEY_HEADER]: ADMIN_KEY_VALUE
            }
          });
          const suggData = await suggRes.json();
          suggestions = suggData.details?.suggestions || {};
        } catch {}
      }
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
router.post('/admin/topics2/delete', requireAdminKey, async (req, res) => {
  const { id } = req.body;
  try {
    await db.collection('topics2').doc(id).delete();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Add missing Acute Medicine topics
router.post('/admin/topics2/add-missing-acute', requireAdminKey, async (req, res) => {
  // ✅ NO lang field - removed from structure
  const list = [
    { id:'bradycardia_pacing', category:'Acute Medicine', topic:'Bradycardia – Pacemaker Indications', difficulty:'intermediate', keywords:{ topic:'Bradycardia Pacemaker' }},
    { id:'bradycardia_urgent', category:'Acute Medicine', topic:'Severe Bradycardia – Emergency Management', difficulty:'intermediate', keywords:{ topic:'Acute Bradycardia' }},
    { id:'af_dc_conversion', category:'Acute Medicine', topic:'Atrial Fibrillation – When to DC Convert', difficulty:'intermediate', keywords:{ topic:'AF DC conversion' }},
    { id:'af_watch_wait', category:'Acute Medicine', topic:'Atrial Fibrillation – Watch & Wait Strategy', difficulty:'intermediate', keywords:{ topic:'AF watch wait' }},
    { id:'pacemaker_contra', category:'Acute Medicine', topic:'Pacemaker Contraindications', difficulty:'advanced', keywords:{ topic:'Pacemaker contraindications' }}
  ];

  const batch = db.batch();
  list.forEach(t => {
    batch.set(db.collection('topics2').doc(t.id), t);
  });
  await batch.commit();
  res.json({ ok:true, added:list.length });
});

// Add empty category placeholder
router.post('/admin/topics2/add-category', requireAdminKey, async (req, res) => {
  const { category } = req.body;
  if (!category) return res.status(400).json({ ok: false, error: 'Missing category' });
  const id = `${category.replace(/\s+/g, '_').toLowerCase()}_placeholder`;
  // ✅ NO lang field - removed from structure
  const doc = {
    id,
    topic: `${category} Placeholder`,
    category,
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
router.post('/admin/topics2/sanitize', requireAdminKey, async (req, res) => {
  try {
    const snapshot = await db.collection('topics2').get();
    const batch = db.batch();
    const testPatterns = [/test_/i, /temp_/i, /random_/i, /sample_/i, /dummy_topic/i, /example_topic/i, /unknown_disease__X/i];
    const placeholderPatterns = [/\*\*\*/, /placeholder/i];
    // ✅ DYNAMIC-ONLY: Get categories from Firestore, not static list
    const approvedCategories = await getApprovedCategories();
    const standardSet = new Set(approvedCategories);
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
      // ✅ Remove lang field if present
      if ('lang' in d) { delete d.lang; changed = true; }
      // trim whitespace (NO lang field)
      ['topic','category','difficulty'].forEach(f => { if (d[f]) { const t = d[f].trim(); if (d[f] !== t) { d[f] = t; changed = true; } } });
      // keywords
      if (!d.keywords || !d.keywords.topic) { d.keywords = { topic: d.topic }; changed = true; }
      // normalize category
      if (d.category && !standardSet.has(d.category)) {
        // Try to match ignoring case/whitespace
        const match = approvedCategories.find(cat => cat.toLowerCase() === d.category.toLowerCase().trim());
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

// ✅ DYNAMIC-ONLY: GET /api/topics2 - Get all topics (simple GET endpoint)
router.get('/', async (req, res) => {
  try {
    const snap = await db.collection('topics2').get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ topics: data });
  } catch (err) {
    console.error('topics2 GET error:', err);
    res.status(500).json({ error: 'Failed to load topics2' });
  }
});

// ✅ DYNAMIC-ONLY: POST /api/topics2 - Main endpoint to get topics from Firestore
// When no category is specified, returns both categories and topics
router.post('/', async (req, res) => {
  try {
    const { category, area } = req.body || {};
    // ✅ NO language parameter - lang field removed from structure
    let query = db.collection('topics2');
    
    if (category) {
      query = query.where('category', '==', category);
    }
    if (area) {
      query = query.where('area', '==', area);
    }
    
    const snapshot = await query.get();
    const topics = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // If no category filter, also return categories list for frontend compatibility
    const response = { ok: true, topics, count: topics.length };
    if (!category && !area) {
      // Extract unique categories from all topics
      const categories = [...new Set(topics.map(t => t.category).filter(Boolean))];
      response.categories = categories;
    }
    
    res.json(response);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ✅ DYNAMIC-ONLY: POST /api/topics2/search - Search/filter topics (alias for root endpoint)
router.post('/search', async (req, res) => {
  try {
    const { category, area } = req.body || {};
    // ✅ NO language parameter - lang field removed from structure
    let query = db.collection('topics2');
    
    if (category) {
      query = query.where('category', '==', category);
    }
    if (area) {
      query = query.where('area', '==', area);
    }
    
    const snapshot = await query.get();
    const topics = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({ ok: true, topics, count: topics.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ✅ DYNAMIC-ONLY: GET /api/topics2/categories - Get all categories from Firestore
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

// ✅ DYNAMIC-ONLY: POST /api/topics2/categories - Get all categories from Firestore (frontend compatibility)
router.post('/categories', async (req, res) => {
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
