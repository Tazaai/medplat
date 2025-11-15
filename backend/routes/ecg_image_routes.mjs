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
 * GET /api/ecg/image
 * Fetch ECG image by category or diagnosis
 * Query params:
 * - category: ECG category (normal, arrhythmia, acute_coronary, etc.)
 * - diagnosis: Specific diagnosis filter (optional)
 */
router.get('/image', async (req, res) => {
  try {
    const { category = 'normal', diagnosis } = req.query;
    
    console.log(`ECG Image Request: category=${category}, diagnosis=${diagnosis}`);
    
    const result = fetchECGImageUrl(category, diagnosis);
    
    res.json({
      success: true,
      data: result.data || result.fallback,
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
 * GET /api/ecg/categories
 * Get all available ECG categories with counts
 */
router.get('/categories', async (req, res) => {
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