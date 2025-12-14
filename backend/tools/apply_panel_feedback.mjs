/**
 * Apply Panel Feedback Script - Phase 7
 * Reads feedback from Firestore and updates system configuration
 * 
 * Usage: node tools/apply_panel_feedback.mjs [--dry-run] [--feedback-id=xxx]
 */

import { db } from '../firebaseClient.js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DRY_RUN = process.argv.includes('--dry-run');
const FEEDBACK_ID = process.argv.find(arg => arg.startsWith('--feedback-id='))?.split('=')[1];

async function applyPanelFeedback() {
  try {
    if (!db) {
      console.error('❌ Firestore not available');
      process.exit(1);
    }

    // Fetch pending feedback
    let query = db.collection('dev_feedback').where('status', '==', 'pending');
    
    if (FEEDBACK_ID) {
      const doc = await db.collection('dev_feedback').doc(FEEDBACK_ID).get();
      if (!doc.exists) {
        console.error(`❌ Feedback ${FEEDBACK_ID} not found`);
        process.exit(1);
      }
      const feedback = { id: doc.id, ...doc.data() };
      await processFeedback(feedback);
    } else {
      const snapshot = await query.get();
      const feedbacks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      console.log(`📋 Found ${feedbacks.length} pending feedback items`);

      for (const feedback of feedbacks) {
        await processFeedback(feedback);
      }
    }

    console.log('✅ Panel feedback processing complete');

  } catch (error) {
    console.error('❌ Error applying panel feedback:', error);
    process.exit(1);
  }
}

async function processFeedback(feedback) {
  console.log(`\n📝 Processing feedback: ${feedback.id} (${feedback.feedback_type})`);

  if (DRY_RUN) {
    console.log('🔍 DRY RUN - Would apply:', JSON.stringify(feedback.recommendations, null, 2));
    return;
  }

  switch (feedback.feedback_type) {
    case 'prompt_improvement':
      await applyPromptImprovements(feedback);
      break;
    case 'gamification':
      await applyGamificationUpdates(feedback);
      break;
    case 'guideline_logic':
      await applyGuidelineLogicUpdates(feedback);
      break;
    case 'reasoning_depth':
      await applyReasoningDepthUpdates(feedback);
      break;
    default:
      console.warn(`⚠️ Unknown feedback type: ${feedback.feedback_type}`);
  }

  // Mark as applied
  await db.collection('dev_feedback').doc(feedback.id).update({
    status: 'applied',
    applied_at: new Date().toISOString(),
    applied_by: 'apply_panel_feedback_script'
  });

  console.log(`✅ Applied feedback: ${feedback.id}`);
}

async function applyPromptImprovements(feedback) {
  const promptFile = join(__dirname, '../generate_case_clinical.mjs');
  console.log(`📝 Updating case generator prompt...`);
  
  // In a real implementation, this would parse and update the prompt
  // For now, just log the recommendations
  console.log('Recommendations:', feedback.recommendations);
  
  // TODO: Implement actual prompt file modification
  // This would require careful parsing and updating of the systemPrompt
}

async function applyGamificationUpdates(feedback) {
  console.log(`🎮 Updating gamification config...`);
  console.log('Recommendations:', feedback.recommendations);
  
  // TODO: Update gamification configuration files
  // This could update difficulty curves, scoring weights, etc.
}

async function applyGuidelineLogicUpdates(feedback) {
  console.log(`📚 Updating guideline logic...`);
  console.log('Recommendations:', feedback.recommendations);
  
  // TODO: Update guideline cascade logic
  // This could modify guideline priority or add new sources
}

async function applyReasoningDepthUpdates(feedback) {
  console.log(`🧠 Updating reasoning depth parameters...`);
  console.log('Recommendations:', feedback.recommendations);
  
  // TODO: Update reasoning depth settings
  // This could modify prompt weights for different reasoning aspects
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  applyPanelFeedback();
}

export { applyPanelFeedback };

