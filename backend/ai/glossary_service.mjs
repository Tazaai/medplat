/**
 * Medical Glossary Service - Phase 7 M4
 * Dual-purpose: 1) Case study tooltips, 2) Gamification quizzes
 * 
 * Features:
 * - Term lookup and auto-linking for clinical cases
 * - Quiz question generation with difficulty-based selection
 * - Multi-language support (9 languages)
 * - Specialty and tag filtering
 * - XP rewards for quiz performance
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GLOSSARY_PATH = path.join(__dirname, '../data/medical_glossary.json');

let glossaryCache = null;
let lastLoadTime = 0;
const CACHE_DURATION = 3600000; // 1 hour

/**
 * Load glossary from JSON file with caching
 */
async function loadGlossary() {
  const now = Date.now();
  if (glossaryCache && (now - lastLoadTime < CACHE_DURATION)) {
    return glossaryCache;
  }

  try {
    const data = await fs.readFile(GLOSSARY_PATH, 'utf-8');
    glossaryCache = JSON.parse(data);
    lastLoadTime = now;
    console.log(`✅ Loaded ${glossaryCache.terms.length} medical terms`);
    return glossaryCache;
  } catch (error) {
    console.error('❌ Failed to load glossary:', error);
    throw new Error('Glossary not available');
  }
}

/**
 * Get term by ID
 */
export async function getTermById(termId) {
  const glossary = await loadGlossary();
  const term = glossary.terms.find(t => t.id === termId);
  
  if (!term) {
    throw new Error(`Term not found: ${termId}`);
  }
  
  return term;
}

/**
 * Search terms by keyword (case-insensitive)
 */
export async function searchTerms(query, options = {}) {
  const {
    language = 'en',
    specialty = null,
    difficulty = null,
    limit = 50
  } = options;

  const glossary = await loadGlossary();
  const lowerQuery = query.toLowerCase();

  let results = glossary.terms.filter(term => {
    // Match term name, full name, or definition
    const termMatch = term.term.toLowerCase().includes(lowerQuery);
    const fullNameMatch = term.full_name.toLowerCase().includes(lowerQuery);
    const defMatch = term.definition.toLowerCase().includes(lowerQuery);
    
    return termMatch || fullNameMatch || defMatch;
  });

  // Apply filters
  if (specialty) {
    results = results.filter(t => t.specialty.includes(specialty));
  }
  if (difficulty) {
    results = results.filter(t => t.difficulty === difficulty);
  }

  // Sort by relevance (exact match > starts with > contains)
  results.sort((a, b) => {
    const aExact = a.term.toLowerCase() === lowerQuery ? 3 : 0;
    const bExact = b.term.toLowerCase() === lowerQuery ? 3 : 0;
    const aStarts = a.term.toLowerCase().startsWith(lowerQuery) ? 2 : 0;
    const bStarts = b.term.toLowerCase().startsWith(lowerQuery) ? 2 : 0;
    const aContains = a.term.toLowerCase().includes(lowerQuery) ? 1 : 0;
    const bContains = b.term.toLowerCase().includes(lowerQuery) ? 1 : 0;
    
    return (bExact + bStarts + bContains) - (aExact + aStarts + aContains);
  });

  return results.slice(0, limit).map(term => ({
    id: term.id,
    term: term.term,
    full_name: term.full_name,
    definition: term.definition,
    pronunciation: term.pronunciation,
    specialty: term.specialty,
    difficulty: term.difficulty,
    translation: language !== 'en' ? term.translations[language] : null
  }));
}

/**
 * Auto-link medical terms in case text
 * Finds medical terms in text and returns positions for tooltip rendering
 */
export async function autoLinkTerms(text, options = {}) {
  const { language = 'en', includeCommon = true } = options;
  
  const glossary = await loadGlossary();
  const links = [];

  // Filter terms that should be linked in cases
  let linkableTerms = glossary.terms.filter(t => t.common_in_cases);
  
  // Sort by term length (longest first to avoid partial matches)
  linkableTerms.sort((a, b) => b.term.length - a.term.length);

  // Find all occurrences of medical terms
  const textLower = text.toLowerCase();
  
  for (const term of linkableTerms) {
    const searchTerm = term.term.toLowerCase();
    let startIndex = 0;
    
    while (true) {
      const index = textLower.indexOf(searchTerm, startIndex);
      if (index === -1) break;
      
      // Check if it's a whole word (not part of another word)
      const beforeChar = index > 0 ? text[index - 1] : ' ';
      const afterChar = index + searchTerm.length < text.length ? text[index + searchTerm.length] : ' ';
      const isWholeWord = /\W/.test(beforeChar) && /\W/.test(afterChar);
      
      if (isWholeWord) {
        // Check if this position is already linked (avoid overlaps)
        const overlaps = links.some(link => 
          (index >= link.start && index < link.end) ||
          (index + searchTerm.length > link.start && index + searchTerm.length <= link.end)
        );
        
        if (!overlaps) {
          links.push({
            term_id: term.id,
            term: term.term,
            start: index,
            end: index + searchTerm.length,
            definition: term.definition,
            translation: language !== 'en' ? term.translations[language] : null,
            pronunciation: term.pronunciation
          });
        }
      }
      
      startIndex = index + 1;
    }
  }

  // Sort links by position
  links.sort((a, b) => a.start - b.start);

  return {
    original_text: text,
    linked_count: links.length,
    links: links
  };
}

/**
 * Generate quiz questions from glossary
 * Dual-purpose: gamification mode with XP rewards
 */
export async function generateQuiz(options = {}) {
  const {
    count = 10,
    difficulty = null,
    specialty = null,
    language = 'en',
    exclude_terms = []
  } = options;

  const glossary = await loadGlossary();

  // Filter eligible quiz terms
  let eligibleTerms = glossary.terms.filter(t => t.quiz_eligible);
  
  if (difficulty) {
    eligibleTerms = eligibleTerms.filter(t => t.difficulty === difficulty);
  }
  if (specialty) {
    eligibleTerms = eligibleTerms.filter(t => t.specialty.includes(specialty));
  }
  if (exclude_terms.length > 0) {
    eligibleTerms = eligibleTerms.filter(t => !exclude_terms.includes(t.id));
  }

  // Shuffle and select
  const shuffled = eligibleTerms.sort(() => 0.5 - Math.random());
  const selectedTerms = shuffled.slice(0, Math.min(count, shuffled.length));

  // Generate questions (multiple question types)
  const questions = selectedTerms.map(term => {
    const questionType = selectQuestionType(term);
    
    switch (questionType) {
      case 'definition':
        return generateDefinitionQuestion(term, glossary.terms, language);
      case 'term_matching':
        return generateTermMatchingQuestion(term, glossary.terms, language);
      case 'pronunciation':
        return generatePronunciationQuestion(term, glossary.terms);
      case 'clinical_usage':
        return generateClinicalUsageQuestion(term, glossary.terms, language);
      default:
        return generateDefinitionQuestion(term, glossary.terms, language);
    }
  });

  return {
    quiz_id: generateQuizId(),
    question_count: questions.length,
    difficulty: difficulty || 'mixed',
    specialty: specialty || 'mixed',
    language: language,
    questions: questions,
    max_xp: calculateMaxXP(questions),
    time_limit_seconds: questions.length * 60 // 1 minute per question
  };
}

/**
 * Select question type based on term properties
 */
function selectQuestionType(term) {
  const types = ['definition', 'term_matching'];
  
  if (term.pronunciation && Math.random() > 0.7) {
    types.push('pronunciation');
  }
  if (term.example_usage && Math.random() > 0.6) {
    types.push('clinical_usage');
  }
  
  return types[Math.floor(Math.random() * types.length)];
}

/**
 * Generate definition question (most common)
 */
function generateDefinitionQuestion(term, allTerms, language) {
  // Get 3 distractors from same specialty/difficulty
  const distractors = allTerms
    .filter(t => t.id !== term.id && t.specialty.some(s => term.specialty.includes(s)))
    .sort(() => 0.5 - Math.random())
    .slice(0, 3)
    .map(t => ({
      text: t.definition,
      is_correct: false
    }));

  const options = [
    { text: term.definition, is_correct: true },
    ...distractors
  ].sort(() => 0.5 - Math.random());

  return {
    question_id: `${term.id}_def`,
    type: 'definition',
    question: `What is the definition of ${term.term} (${term.full_name})?`,
    term_id: term.id,
    term: term.term,
    options: options,
    difficulty: term.difficulty,
    xp_value: calculateQuestionXP(term.difficulty),
    hints: [
      `This term is used in ${term.specialty.join(', ')}`,
      term.clinical_pearls || `Consider the clinical context`
    ]
  };
}

/**
 * Generate term matching question
 */
function generateTermMatchingQuestion(term, allTerms, language) {
  // Show definition, ask for term
  const distractors = allTerms
    .filter(t => t.id !== term.id && t.difficulty === term.difficulty)
    .sort(() => 0.5 - Math.random())
    .slice(0, 3)
    .map(t => ({
      text: t.term,
      is_correct: false
    }));

  const options = [
    { text: term.term, is_correct: true },
    ...distractors
  ].sort(() => 0.5 - Math.random());

  return {
    question_id: `${term.id}_match`,
    type: 'term_matching',
    question: `Which term matches this definition: "${term.definition}"`,
    term_id: term.id,
    options: options,
    difficulty: term.difficulty,
    xp_value: calculateQuestionXP(term.difficulty),
    hints: [
      `Pronunciation: ${term.pronunciation}`,
      `Specialty: ${term.specialty.join(', ')}`
    ]
  };
}

/**
 * Generate pronunciation question
 */
function generatePronunciationQuestion(term, allTerms) {
  const distractors = allTerms
    .filter(t => t.id !== term.id && t.pronunciation)
    .sort(() => 0.5 - Math.random())
    .slice(0, 3)
    .map(t => ({
      text: t.pronunciation,
      is_correct: false
    }));

  const options = [
    { text: term.pronunciation, is_correct: true },
    ...distractors
  ].sort(() => 0.5 - Math.random());

  return {
    question_id: `${term.id}_pron`,
    type: 'pronunciation',
    question: `How is "${term.term}" pronounced?`,
    term_id: term.id,
    term: term.term,
    options: options,
    difficulty: term.difficulty,
    xp_value: calculateQuestionXP(term.difficulty),
    hints: [`Full name: ${term.full_name}`]
  };
}

/**
 * Generate clinical usage question
 */
function generateClinicalUsageQuestion(term, allTerms, language) {
  // Create a fill-in-the-blank from example usage
  const usage = term.example_usage;
  const termInUsage = usage.replace(new RegExp(term.term, 'gi'), '____');

  const distractors = allTerms
    .filter(t => t.id !== term.id && t.specialty.some(s => term.specialty.includes(s)))
    .sort(() => 0.5 - Math.random())
    .slice(0, 3)
    .map(t => ({
      text: t.term,
      is_correct: false
    }));

  const options = [
    { text: term.term, is_correct: true },
    ...distractors
  ].sort(() => 0.5 - Math.random());

  return {
    question_id: `${term.id}_usage`,
    type: 'clinical_usage',
    question: `Fill in the blank: ${termInUsage}`,
    term_id: term.id,
    options: options,
    difficulty: term.difficulty,
    xp_value: calculateQuestionXP(term.difficulty) + 5, // Bonus for clinical context
    hints: [
      `Definition: ${term.definition.substring(0, 80)}...`,
      `Specialty: ${term.specialty.join(', ')}`
    ]
  };
}

/**
 * Calculate XP for question based on difficulty
 */
function calculateQuestionXP(difficulty) {
  const xpMap = {
    beginner: 10,
    intermediate: 20,
    advanced: 35,
    expert: 50
  };
  return xpMap[difficulty] || 15;
}

/**
 * Calculate max XP for entire quiz
 */
function calculateMaxXP(questions) {
  return questions.reduce((sum, q) => sum + q.xp_value, 0);
}

/**
 * Generate unique quiz ID
 */
function generateQuizId() {
  return `quiz_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Grade quiz submission
 */
export async function gradeQuiz(quizId, answers, userId) {
  // answers format: { question_id: selected_option_index }
  const glossary = await loadGlossary();
  
  let correctCount = 0;
  let totalXP = 0;
  const results = [];

  for (const [questionId, selectedIndex] of Object.entries(answers)) {
    const termId = questionId.split('_')[0] + '_' + questionId.split('_')[1];
    const term = glossary.terms.find(t => t.id === termId);
    
    if (!term) continue;

    // Reconstruct question to check answer
    // In production, questions should be stored temporarily
    // For now, we'll validate based on term definition
    const isCorrect = validateAnswer(questionId, selectedIndex, term);
    
    if (isCorrect) {
      correctCount++;
      const xp = calculateQuestionXP(term.difficulty);
      totalXP += xp;
      results.push({
        question_id: questionId,
        correct: true,
        xp_earned: xp
      });
    } else {
      results.push({
        question_id: questionId,
        correct: false,
        xp_earned: 0,
        correct_answer: term.definition
      });
    }
  }

  const accuracy = (correctCount / Object.keys(answers).length) * 100;
  const perfectionBonus = accuracy === 100 ? 50 : 0;
  const speedBonus = 0; // Would calculate based on time taken

  return {
    quiz_id: quizId,
    user_id: userId,
    total_questions: Object.keys(answers).length,
    correct_answers: correctCount,
    accuracy: accuracy.toFixed(1),
    xp_earned: totalXP + perfectionBonus + speedBonus,
    perfection_bonus: perfectionBonus,
    speed_bonus: speedBonus,
    results: results,
    performance_tier: getPerformanceTier(accuracy),
    streak_eligible: accuracy >= 70
  };
}

/**
 * Validate answer (simplified - should use cached questions)
 */
function validateAnswer(questionId, selectedIndex, term) {
  // Placeholder - in production, compare against stored question
  return Math.random() > 0.3; // 70% correct rate for demo
}

/**
 * Get performance tier based on accuracy
 */
function getPerformanceTier(accuracy) {
  if (accuracy >= 95) return 'master';
  if (accuracy >= 85) return 'expert';
  if (accuracy >= 75) return 'proficient';
  if (accuracy >= 60) return 'competent';
  return 'developing';
}

/**
 * Get related terms
 */
export async function getRelatedTerms(termId, limit = 5) {
  const term = await getTermById(termId);
  const glossary = await loadGlossary();

  if (!term.related_terms || term.related_terms.length === 0) {
    return [];
  }

  const related = term.related_terms
    .map(id => glossary.terms.find(t => t.id === id))
    .filter(t => t !== undefined)
    .slice(0, limit);

  return related.map(t => ({
    id: t.id,
    term: t.term,
    full_name: t.full_name,
    definition: t.definition.substring(0, 150) + '...',
    specialty: t.specialty
  }));
}

/**
 * Get terms by specialty
 */
export async function getTermsBySpecialty(specialty, options = {}) {
  const { difficulty = null, limit = 100 } = options;
  
  const glossary = await loadGlossary();
  let terms = glossary.terms.filter(t => t.specialty.includes(specialty));

  if (difficulty) {
    terms = terms.filter(t => t.difficulty === difficulty);
  }

  return terms.slice(0, limit).map(t => ({
    id: t.id,
    term: t.term,
    full_name: t.full_name,
    definition: t.definition,
    difficulty: t.difficulty,
    tags: t.tags
  }));
}

/**
 * Get glossary statistics
 */
export async function getGlossaryStats() {
  const glossary = await loadGlossary();

  const specialtyCounts = {};
  const difficultyCounts = {};
  const tagCounts = {};

  glossary.terms.forEach(term => {
    term.specialty.forEach(s => {
      specialtyCounts[s] = (specialtyCounts[s] || 0) + 1;
    });
    
    difficultyCounts[term.difficulty] = (difficultyCounts[term.difficulty] || 0) + 1;
    
    term.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  return {
    total_terms: glossary.terms.length,
    languages: glossary.metadata.languages.length,
    specialties: Object.keys(specialtyCounts).length,
    quiz_eligible: glossary.terms.filter(t => t.quiz_eligible).length,
    common_in_cases: glossary.terms.filter(t => t.common_in_cases).length,
    by_specialty: specialtyCounts,
    by_difficulty: difficultyCounts,
    top_tags: Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }))
  };
}

export default {
  getTermById,
  searchTerms,
  autoLinkTerms,
  generateQuiz,
  gradeQuiz,
  getRelatedTerms,
  getTermsBySpecialty,
  getGlossaryStats
};
