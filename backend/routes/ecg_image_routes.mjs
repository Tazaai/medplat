/**
 * ECG Image API Routes (Phase B - v15.0.0)
 * Provides curated ECG images for educational purposes
 */

import express from 'express';
import { 
  fetchECGImageUrl, 
  getECGCategories, 
  searchECGDatabase,
  ECG_DATABASE_COUNT 
} from '../utils/ecg_image_pipeline.mjs';

const router = express.Router();

/**
 * GET /api/ecg/images
 * Fetch ECG image by category or diagnosis
 * Query params:
 * - category: ECG category (normal, arrhythmia, acute_coronary, etc.)
 * - diagnosis: Specific diagnosis filter (optional)
 */
router.get('/images', async (req, res) => {
  // CORS headers for frontend access
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  try {
    const { category = 'normal', diagnosis } = req.query;
    
    console.log(`ECG Image Request: category=${category}, diagnosis=${diagnosis}`);
    
    const result = fetchECGImageUrl(category, diagnosis);
    
    // Ensure we have proper fallback
    const ecgData = result.data || result.fallback || {
      image_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8dGV4dCB4PSIyMDAiIHk9IjEwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxNiI+RUNHIEltYWdlIFBsYWNlaG9sZGVyPC90ZXh0Pgo8L3N2Zz4K',
      diagnosis: 'ECG Image Unavailable',
      description: 'Placeholder ECG image for educational purposes'
    };

    res.json({
      success: true,
      data: ecgData,
      database_info: {
        total_images: ECG_DATABASE_COUNT,
        requested_category: category,
        requested_diagnosis: diagnosis
      }
    });

  } catch (error) {
    console.error('ECG Image API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ECG image',
      details: error.message
    });
  }
});

/**
 * GET /api/ecg/image/:id
 * Fetch specific ECG image by ID
 */
router.get('/image/:id', async (req, res) => {
  // CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  try {
    const { id } = req.params;
    console.log(`ECG Image ID Request: ${id}`);
    
    // Import the database to search by ID
    const { ECG_IMAGE_DATABASE } = await import('../utils/ecg_image_pipeline.mjs');
    const ecgImage = ECG_IMAGE_DATABASE.find(ecg => ecg.id === id);
    
    if (!ecgImage) {
      return res.status(404).json({
        success: false,
        error: 'ECG image not found',
        id: id
      });
    }
    
    res.json({
      success: true,
      data: {
        image_url: ecgImage.url,
        diagnosis: ecgImage.diagnosis,
        description: ecgImage.description,
        measurements: {
          heart_rate: ecgImage.heart_rate,
          pr_interval: ecgImage.pr_interval,
          qrs_duration: ecgImage.qrs_duration,
          qt_interval: ecgImage.qt_interval
        },
        metadata: {
          category: ecgImage.category,
          license: ecgImage.license,
          source: ecgImage.source,
          ecg_id: ecgImage.id
        }
      }
    });

  } catch (error) {
    console.error('ECG Image ID API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ECG image by ID',
      details: error.message
    });
  }
});

/**
 * GET /api/ecg/categories
 * Get all available ECG categories with counts
 */
router.get('/categories', async (req, res) => {
  // CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  try {
    const categories = getECGCategories();
    
    res.json({
      success: true,
      data: {
        categories: categories,
        total_categories: categories.length,
        total_images: ECG_DATABASE_COUNT
      }
    });

  } catch (error) {
    console.error('ECG Categories API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ECG categories',
      details: error.message
    });
  }
});

/**
 * GET /api/ecg/search
 * Search ECG database by keywords
 * Query params:
 * - q: Search query string
 */
router.get('/search', async (req, res) => {
  // CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  try {
    const { q: query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query parameter "q" is required'
      });
    }

    const results = searchECGDatabase(query);
    
    res.json({
      success: true,
      data: {
        query: query,
        results: results,
        total_matches: results.length,
        total_database: ECG_DATABASE_COUNT
      }
    });

  } catch (error) {
    console.error('ECG Search API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search ECG database',
      details: error.message
    });
  }
});

/**
 * GET /api/ecg/random
 * Get random ECG image for study practice
 */
router.get('/random', async (req, res) => {
  try {
    // Get random ECG from any category
    const result = fetchECGImageUrl();
    
    res.json({
      success: true,
      data: result.data || result.fallback,
      database_info: {
        total_images: ECG_DATABASE_COUNT,
        selection_method: 'random'
      }
    });

  } catch (error) {
    console.error('ECG Random API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch random ECG image',
      details: error.message
    });
  }
});

export default router;