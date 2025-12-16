// backend/routes/topics2_api.mjs
// Topics2 API - Firestore collection management

import express from 'express';
import { initFirebase } from '../firebaseClient.js';

const router = express.Router();
const fb = initFirebase();
const db = fb.firestore;
const COLLECTION_NAME = 'topics2';

function requireAdminKey(req, res, next) {
  const adminKey = process.env.ADMIN_DEBUG_KEY;
  if (!adminKey) {
    return res.status(403).json({
      ok: false,
      error: 'Admin key is not configured for admin topics endpoints'
    });
  }
  if (req.headers['x-admin-key'] !== adminKey) {
    return res.status(403).json({
      ok: false,
      error: 'Forbidden: invalid admin key'
    });
  }
  next();
}

// Helper: Add timeout to Firestore queries
async function firestoreQueryWithTimeout(queryPromise, timeoutMs = 3000) {
  return Promise.race([
    queryPromise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Firestore query timeout')), timeoutMs)
    )
  ]);
}

// GET /api/topics2 - Return all documents from Firestore collection "topics2"
router.get('/', async (req, res) => {
  try {
    // Fast fallback if Firestore not initialized
    if (!fb.initialized) {
      return res.json({ ok: true, topics: [], count: 0 });
    }
    
    const snapshot = await firestoreQueryWithTimeout(db.collection(COLLECTION_NAME).get(), 3000);
    const topics = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      ok: true,
      topics,
      count: topics.length
    });
  } catch (err) {
    console.error('Error fetching topics2:', err);
    // Fast fallback on error/timeout
    res.json({ ok: true, topics: [], count: 0 });
  }
});

// POST /api/topics2 - Alias of GET for frontend compatibility
router.post('/', async (req, res) => {
  try {
    // Fast fallback if Firestore not initialized
    if (!fb.initialized) {
      return res.json({ ok: true, topics: [], count: 0 });
    }
    
    const snapshot = await firestoreQueryWithTimeout(db.collection(COLLECTION_NAME).get(), 3000);
    const topics = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      ok: true,
      topics,
      count: topics.length
    });
  } catch (err) {
    console.error('Error fetching topics2:', err);
    // Fast fallback on error/timeout
    res.json({ ok: true, topics: [], count: 0 });
  }
});

// GET /api/topics2/categories - Group topics2 by category
router.get('/categories', async (req, res) => {
  try {
    // Fast fallback if Firestore not initialized
    if (!fb.initialized) {
      return res.json({ ok: true, categories: {}, categoryCount: 0, totalTopics: 0 });
    }
    
    const snapshot = await firestoreQueryWithTimeout(db.collection(COLLECTION_NAME).get(), 3000);
    const grouped = {};
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const category = data.category || 'Uncategorized';
      
      if (!grouped[category]) {
        grouped[category] = [];
      }
      
      grouped[category].push({
        id: doc.id,
        ...data
      });
    });
    
    res.json({
      ok: true,
      categories: grouped,
      categoryCount: Object.keys(grouped).length,
      totalTopics: snapshot.docs.length
    });
  } catch (err) {
    console.error('Error fetching topics2 categories:', err);
    // Fast fallback on error/timeout
    res.json({ ok: true, categories: {}, categoryCount: 0, totalTopics: 0 });
  }
});

// POST /api/topics2/categories - Alias of GET for frontend compatibility
router.post('/categories', async (req, res) => {
  try {
    // Fast fallback if Firestore not initialized
    if (!fb.initialized) {
      return res.json({ ok: true, categories: {}, categoryCount: 0, totalTopics: 0 });
    }
    
    const snapshot = await firestoreQueryWithTimeout(db.collection(COLLECTION_NAME).get(), 3000);
    const grouped = {};
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const category = data.category || 'Uncategorized';
      
      if (!grouped[category]) {
        grouped[category] = [];
      }
      
      grouped[category].push({
        id: doc.id,
        ...data
      });
    });
    
    res.json({
      ok: true,
      categories: grouped,
      categoryCount: Object.keys(grouped).length,
      totalTopics: snapshot.docs.length
    });
  } catch (err) {
    console.error('Error fetching topics2 categories:', err);
    // Fast fallback on error/timeout
    res.json({ ok: true, categories: {}, categoryCount: 0, totalTopics: 0 });
  }
});

// POST /api/topics2/search - Search topics by category
router.post('/search', async (req, res) => {
  try {
    // Fast fallback if Firestore not initialized
    if (!fb.initialized) {
      return res.json({ ok: true, topics: [] });
    }
    
    const { category } = req.body;
    
    if (!category) {
      return res.status(400).json({
        ok: false,
        error: 'Category parameter is required'
      });
    }
    
    const snapshot = await firestoreQueryWithTimeout(
      db.collection(COLLECTION_NAME).where('category', '==', category).get(),
      3000
    );
    
    const topics = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      ok: true,
      topics,
      count: topics.length,
      category
    });
  } catch (err) {
    console.error('Error searching topics2:', err);
    // Fast fallback on error/timeout
    res.json({ ok: true, topics: [] });
  }
});

// GET /api/admin/topics2/find-invalid - Scan topics2 for invalid documents
router.get('/find-invalid', requireAdminKey, async (req, res) => {
  try {
    const snapshot = await db.collection(COLLECTION_NAME).get();
    const invalid = [];
    const topicMap = new Map();
    const idMap = new Map();
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const docId = doc.id;
      const errors = [];
      
      // Check missing fields
      if (!data.id || typeof data.id !== 'string') {
        errors.push('missing:id');
      }
      if (!data.topic || typeof data.topic !== 'string') {
        errors.push('missing:topic');
      }
      if (!data.category || typeof data.category !== 'string') {
        errors.push('missing:category');
      }
      
      // Check malformed id (should be snake_case)
      if (data.id) {
        const isValidId = /^[a-z0-9_]+$/.test(data.id);
        if (!isValidId) {
          errors.push('malformed:id');
        }
      }
      
      // Track duplicates by topic name
      if (data.topic) {
        const topicKey = data.topic.toLowerCase().trim();
        if (!topicMap.has(topicKey)) {
          topicMap.set(topicKey, []);
        }
        topicMap.get(topicKey).push({
          docId,
          id: data.id,
          category: data.category
        });
      }
      
      // Track ID collisions
      if (data.id) {
        if (!idMap.has(data.id)) {
          idMap.set(data.id, []);
        }
        idMap.get(data.id).push({
          docId,
          topic: data.topic,
          category: data.category
        });
      }
      
      if (errors.length > 0) {
        invalid.push({
          docId,
          id: data.id || 'N/A',
          topic: data.topic || 'N/A',
          category: data.category || 'N/A',
          errors
        });
      }
    });
    
    // Find duplicates (topics with same name)
    const duplicates = [];
    topicMap.forEach((docs, topicName) => {
      if (docs.length > 1) {
        duplicates.push({
          topic: topicName,
          count: docs.length,
          documents: docs
        });
      }
    });
    
    // Find ID collisions (same id used by multiple documents)
    const idCollisions = [];
    idMap.forEach((docs, id) => {
      if (docs.length > 1) {
        idCollisions.push({
          id,
          count: docs.length,
          documents: docs
        });
      }
    });
    
    res.json({
      ok: true,
      report: {
        totalDocuments: snapshot.docs.length,
        invalidDocuments: invalid,
        invalidCount: invalid.length,
        duplicates,
        duplicateCount: duplicates.length,
        idCollisions,
        idCollisionCount: idCollisions.length
      }
    });
  } catch (err) {
    console.error('Error finding invalid topics2:', err);
    res.status(500).json({
      ok: false,
      error: err.message || 'Failed to find invalid topics2'
    });
  }
});

// GET /api/admin/topics2/diagnostics - Return summary statistics
router.get('/diagnostics', requireAdminKey, async (req, res) => {
  try {
    const snapshot = await db.collection(COLLECTION_NAME).get();
    const categories = new Set();
    const topicSet = new Set();
    const idSet = new Set();
    let emptyFields = 0;
    const fieldStats = {
      missing_id: 0,
      missing_topic: 0,
      missing_category: 0,
      missing_keywords: 0
    };
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Track categories
      if (data.category) {
        categories.add(data.category);
      }
      
      // Track topics
      if (data.topic) {
        topicSet.add(data.topic.toLowerCase().trim());
      }
      
      // Track IDs
      if (data.id) {
        idSet.add(data.id);
      }
      
      // Count empty/missing fields
      if (!data.id || !data.topic || !data.category || !data.keywords) {
        emptyFields++;
      }
      
      if (!data.id) fieldStats.missing_id++;
      if (!data.topic) fieldStats.missing_topic++;
      if (!data.category) fieldStats.missing_category++;
      if (!data.keywords) fieldStats.missing_keywords++;
    });
    
    // Find duplicates
    const topicMap = new Map();
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.topic) {
        const topicKey = data.topic.toLowerCase().trim();
        if (!topicMap.has(topicKey)) {
          topicMap.set(topicKey, 0);
        }
        topicMap.set(topicKey, topicMap.get(topicKey) + 1);
      }
    });
    
    const duplicates = Array.from(topicMap.entries())
      .filter(([_, count]) => count > 1)
      .map(([topic, count]) => ({ topic, count }));
    
    // Find ID collisions
    const idMap = new Map();
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.id) {
        if (!idMap.has(data.id)) {
          idMap.set(data.id, 0);
        }
        idMap.set(data.id, idMap.get(data.id) + 1);
      }
    });
    
    const idCollisions = Array.from(idMap.entries())
      .filter(([_, count]) => count > 1)
      .map(([id, count]) => ({ id, count }));
    
    res.json({
      ok: true,
      summary: {
        totalDocuments: snapshot.docs.length,
        distinctCategories: categories.size,
        categoryList: Array.from(categories).sort(),
        distinctTopics: topicSet.size,
        distinctIds: idSet.size,
        duplicates: {
          count: duplicates.length,
          topics: duplicates
        },
        idCollisions: {
          count: idCollisions.length,
          ids: idCollisions
        },
        emptyFields: {
          count: emptyFields,
          breakdown: fieldStats
        }
      }
    });
  } catch (err) {
    console.error('Error getting topics2 diagnostics:', err);
    res.status(500).json({
      ok: false,
      error: err.message || 'Failed to get topics2 diagnostics'
    });
  }
});

// GET /api/admin/topics2/suggest-missing-topics - Suggest missing topics based on semantic similarity
router.get('/suggest-missing-topics', requireAdminKey, async (req, res) => {
  try {
    const snapshot = await db.collection(COLLECTION_NAME).get();
    
    // Get existing categories and topics
    const existingCategories = new Set();
    const existingTopics = new Set();
    const topicsByCategory = new Map();
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.category) {
        existingCategories.add(data.category);
        if (!topicsByCategory.has(data.category)) {
          topicsByCategory.set(data.category, new Set());
        }
        if (data.topic) {
          existingTopics.add(data.topic.toLowerCase().trim());
          topicsByCategory.get(data.category).add(data.topic.toLowerCase().trim());
        }
      }
    });
    
    // Standard MedPlat categories (from system)
    const systemCategories = [
      'Infectious Diseases',
      'Public Health',
      'Psychiatry',
      'Radiology',
      'Addiction Medicine',
      'Endocrinology',
      'Education',
      'Telemedicine',
      'Cardiology',
      'Neurology',
      'Emergency Medicine',
      'General Practice',
      'Pediatrics',
      'Obstetrics and Gynecology',
      'Surgery',
      'Oncology',
      'Dermatology',
      'Ophthalmology',
      'Orthopedics',
      'Urology',
      'Gastroenterology',
      'Pulmonology',
      'Nephrology',
      'Rheumatology',
      'Hematology'
    ];
    
    // Find missing categories
    const missingCategories = systemCategories.filter(cat => !existingCategories.has(cat));
    
    // Generate topic suggestions based on category
    const categoryTopicSuggestions = {
      'Cardiology': ['Atrial Fibrillation', 'Heart Failure', 'Hypertension', 'Acute Coronary Syndrome', 'Cardiac Arrhythmias'],
      'Neurology': ['Stroke', 'Epilepsy', 'Migraine', 'Parkinson Disease', 'Multiple Sclerosis'],
      'Emergency Medicine': ['Trauma', 'Shock', 'Cardiac Arrest', 'Anaphylaxis', 'Sepsis'],
      'General Practice': ['Diabetes Mellitus', 'Hypertension', 'Depression', 'Anxiety', 'Asthma'],
      'Pediatrics': ['Fever in Children', 'Respiratory Infections', 'Growth Disorders', 'Developmental Delays'],
      'Obstetrics and Gynecology': ['Pregnancy Complications', 'Menstrual Disorders', 'Pelvic Inflammatory Disease'],
      'Surgery': ['Appendicitis', 'Cholecystitis', 'Hernia', 'Bowel Obstruction'],
      'Oncology': ['Breast Cancer', 'Lung Cancer', 'Colorectal Cancer', 'Leukemia'],
      'Dermatology': ['Eczema', 'Psoriasis', 'Skin Infections', 'Melanoma'],
      'Ophthalmology': ['Glaucoma', 'Cataracts', 'Retinal Detachment', 'Conjunctivitis'],
      'Orthopedics': ['Fractures', 'Osteoarthritis', 'Rheumatoid Arthritis', 'Osteoporosis'],
      'Urology': ['Urinary Tract Infections', 'Kidney Stones', 'Prostate Disorders', 'Bladder Cancer'],
      'Gastroenterology': ['Gastroenteritis', 'Peptic Ulcer Disease', 'Inflammatory Bowel Disease', 'Liver Disease'],
      'Pulmonology': ['Asthma', 'COPD', 'Pneumonia', 'Pulmonary Embolism'],
      'Nephrology': ['Acute Kidney Injury', 'Chronic Kidney Disease', 'Nephrotic Syndrome', 'Dialysis'],
      'Rheumatology': ['Rheumatoid Arthritis', 'Systemic Lupus Erythematosus', 'Gout', 'Fibromyalgia'],
      'Hematology': ['Anemia', 'Thrombocytopenia', 'Leukemia', 'Hemophilia']
    };
    
    const suggestions = {};
    
    // For missing categories, suggest standard topics
    missingCategories.forEach(category => {
      if (categoryTopicSuggestions[category]) {
        suggestions[category] = categoryTopicSuggestions[category].filter(topic => 
          !existingTopics.has(topic.toLowerCase().trim())
        );
      }
    });
    
    // For existing categories, suggest additional common topics
    existingCategories.forEach(category => {
      if (categoryTopicSuggestions[category]) {
        const existingInCategory = topicsByCategory.get(category) || new Set();
        const suggested = categoryTopicSuggestions[category].filter(topic => 
          !existingTopics.has(topic.toLowerCase().trim()) && 
          !existingInCategory.has(topic.toLowerCase().trim())
        );
        if (suggested.length > 0) {
          suggestions[category] = suggested;
        }
      }
    });
    
    res.json({
      ok: true,
      suggestions,
      missingCategories,
      existingCategories: Array.from(existingCategories).sort(),
      totalSuggestions: Object.values(suggestions).reduce((sum, arr) => sum + arr.length, 0)
    });
  } catch (err) {
    console.error('Error suggesting missing topics:', err);
    res.status(500).json({
      ok: false,
      error: err.message || 'Failed to suggest missing topics'
    });
  }
});

export default router;
