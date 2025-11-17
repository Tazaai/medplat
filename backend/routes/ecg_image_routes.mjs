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
    const { category = 'arrhythmias', diagnosis, limit = 6 } = req.query;
    
    console.log(`ECG Images Request: category=${category}, diagnosis=${diagnosis}, limit=${limit}`);
    
    // Import the database to get multiple images
    const { ECG_IMAGE_DATABASE } = await import('../utils/ecg_image_pipeline.mjs');
    
    let filteredImages = ECG_IMAGE_DATABASE;
    
    // Filter by category if specified
    if (category && category !== 'all') {
      filteredImages = filteredImages.filter(ecg => ecg.category === category);
    }
    
    // Filter by diagnosis if specified
    if (diagnosis) {
      filteredImages = filteredImages.filter(ecg => 
        ecg.diagnosis.toLowerCase().includes(diagnosis.toLowerCase())
      );
    }
    
    // Limit results
    const limitNum = Math.min(parseInt(limit) || 6, 20); // Max 20 images
    const selectedImages = filteredImages.slice(0, limitNum);
    
    // Format images for frontend
    const images = selectedImages.map(ecg => ({
      id: ecg.id,
      url: ecg.url,
      title: ecg.diagnosis,
      category: ecg.category,
      description: ecg.description
    }));
    
    // Add fallback images if we don't have enough
    while (images.length < 3) {
      const fallbackIndex = images.length + 1;
      images.push({
        id: `fallback_${fallbackIndex}`,
        url: `/api/ecg/images/placeholder/${fallbackIndex}`,
        title: `AI-powered ECG learning #${fallbackIndex}`,
        category: category,
        description: 'Educational ECG example for learning purposes'
      });
    }

    res.json({
      success: true,
      images,
      total: images.length,
      category: category,
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

/**
 * GET /api/ecg/images/placeholder/:id
 * Returns placeholder SVG ECG images for fallback
 */
router.get('/images/placeholder/:id', async (req, res) => {
  // CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  try {
    const { id } = req.params;
    
    // Generate simple ECG placeholder SVG
    const placeholderSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="600" height="400" fill="#f8f9fa" stroke="#dee2e6" stroke-width="1"/>
  <g stroke="#6c757d" stroke-width="1" fill="none">
    <!-- Grid lines -->
    <defs>
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" stroke="#e9ecef" stroke-width="0.5"/>
      </pattern>
    </defs>
    <rect width="600" height="400" fill="url(#grid)"/>
    
    <!-- ECG rhythm line -->
    <path d="M50 200 L100 200 L105 180 L110 220 L115 160 L120 200 L170 200 L175 180 L180 220 L185 160 L190 200 L240 200 L245 180 L250 220 L255 160 L260 200 L310 200 L315 180 L320 220 L325 160 L330 200 L380 200 L385 180 L390 220 L395 160 L400 200 L450 200 L455 180 L460 220 L465 160 L470 200 L520 200 L525 180 L530 220 L535 160 L540 200 L590 200" stroke="#dc3545" stroke-width="2"/>
  </g>
  
  <!-- Labels -->
  <text x="300" y="50" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="#495057">ECG Placeholder #${id}</text>
  <text x="300" y="380" text-anchor="middle" font-family="Arial" font-size="12" fill="#6c757d">AI-powered ECG learning - Educational use only</text>
</svg>`;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(placeholderSvg);
    
  } catch (error) {
    console.error('ECG Placeholder API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate placeholder ECG',
      details: error.message
    });
  }
});

export default router;