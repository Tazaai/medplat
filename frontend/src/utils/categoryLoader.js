// ✅ DYNAMIC-ONLY: POST-only category loader utility
// Never use GET for categories - always POST

import { API_BASE } from '../config';

/**
 * Load categories from Firestore via POST /api/topics2
 * @returns {Promise<string[]>} Array of category names
 */
export async function loadCategories() {
  try {
    const response = await fetch(`${API_BASE}/api/topics2/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    // Extract categories from topics if categories field not present
    if (data.categories && Array.isArray(data.categories)) {
      return data.categories;
    }
    if (data.topics && Array.isArray(data.topics)) {
      return [...new Set(data.topics.map(t => t.category).filter(Boolean))];
    }
    return [];
  } catch (error) {
    console.error('Failed to load categories:', error);
    return [];
  }
}

/**
 * Load categories with filtering and sorting
 * @param {Object} options - Filter options
 * @param {boolean} options.hidePlaceholders - Filter out placeholder categories
 * @param {boolean} options.sort - Sort categories alphabetically
 * @returns {Promise<string[]>} Array of filtered and sorted category names
 */
export async function loadCategoriesFiltered(options = {}) {
  const { hidePlaceholders = false, sort = false } = options;
  
  const categories = await loadCategories();
  
  let filtered = categories;
  if (hidePlaceholders) {
    filtered = categories.filter(cat => !/placeholder/i.test(cat));
  }
  
  if (sort) {
    filtered = [...filtered].sort((a, b) => a.localeCompare(b));
  }
  
  return filtered;
}

