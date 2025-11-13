/**
 * panel_api.mjs
 * 
 * Phase 5: Global AI Mentor Network - External Development Panel API
 * 
 * Provides endpoints for panel members to submit feedback and for admins to
 * generate consensus reports. Part of the quality governance system ensuring
 * clinical accuracy, educational effectiveness, and global inclusivity.
 * 
 * Features:
 * - Panel member feedback submission (POST /submit)
 * - Feedback retrieval by review cycle (GET /feedback)
 * - Automated consensus report generation (POST /consensus)
 * - Consensus report retrieval (GET /consensus/:cycle)
 * - Action item tracking
 * 
 * Panel Composition (17 members):
 * - Medical Student, Medical Doctor
 * - 3 Specialists, Clinical Pharmacist
 * - 2 GPs, 2 Emergency Medicine
 * - Field Researcher, 1-2 Radiologists
 * - Professor, AI Expert, USMLE Expert
 * - Web Developer, Competitor Voice, Business Consultant, Marketing Expert
 * 
 * Authorization:
 * - Panel members: Can submit feedback
 * - Admins: Full access to all endpoints
 */

import { Router } from 'express';
import { db } from '../firebaseClient.js';
import { logEngagementEvent } from '../telemetry/telemetry_logger.mjs';
import admin from 'firebase-admin';

const router = Router();
const FieldValue = admin.firestore.FieldValue;

// ========================================
// HELPER: Authorization Checks
// ========================================
async function isAdmin(uid) {
  if (!uid) return false;
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) return false;
    const userData = userDoc.data();
    return userData.role === 'admin' || userData.isAdmin === true;
  } catch (err) {
    console.error('❌ Admin check error:', err);
    return false;
  }
}

async function isPanelMember(uid) {
  if (!uid) return false;
  try {
    const panelDoc = await db.collection('panel_members').doc(uid).get();
    return panelDoc.exists && panelDoc.data().status === 'active';
  } catch (err) {
    console.error('❌ Panel member check error:', err);
    return false;
  }
}

// ========================================
// ENDPOINT: Health Check
// ========================================
router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'panel',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

// ========================================
// ENDPOINT: Submit Panel Feedback
// POST /api/panel/submit
// Authorization: Panel members only
// ========================================
router.post('/submit', async (req, res) => {
  try {
    const { uid } = req.query;
    
    // Authorization check
    const adminAccess = await isAdmin(uid);
    const panelAccess = await isPanelMember(uid);
    
    if (!adminAccess && !panelAccess) {
      return res.status(403).json({
        ok: false,
        error: 'Unauthorized. Panel member access required.'
      });
    }
    
    const {
      review_cycle,
      feedback_category,
      case_id,
      ratings,
      priority,
      comments,
      suggested_action
    } = req.body;
    
    // Validation
    if (!review_cycle || !feedback_category || !ratings || !priority) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: review_cycle, feedback_category, ratings, priority'
      });
    }
    
    // Get panel member info
    const panelMemberDoc = await db.collection('panel_members').doc(uid).get();
    const panelMemberData = panelMemberDoc.exists ? panelMemberDoc.data() : {};
    
    // Generate feedback ID
    const feedbackId = `fb_${review_cycle.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create feedback document
    const feedbackData = {
      feedback_id: feedbackId,
      reviewer_id: uid,
      reviewer_role: panelMemberData.role || 'Panel Member',
      reviewer_name: panelMemberData.name || 'Anonymous',
      timestamp: FieldValue.serverTimestamp(),
      review_cycle: review_cycle,
      feedback_category: feedback_category,
      case_id: case_id || null,
      ratings: {
        clinical: ratings.clinical || 0,
        educational: ratings.educational || 0,
        ux: ratings.ux || 0
      },
      priority: priority, // 'high' | 'medium' | 'low'
      comments: comments || '',
      suggested_action: suggested_action || '',
      status: 'open', // 'open' | 'in_progress' | 'resolved' | 'archived'
      assigned_to: null,
      resolved_at: null,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp()
    };
    
    // Store in Firestore
    await db.collection('panel_feedback').doc(feedbackId).set(feedbackData);
    
    // Log telemetry
    await logEngagementEvent({
      uid,
      event_type: 'panel_feedback_submitted',
      endpoint: 'panel_api.submit',
      metadata: {
        feedback_id: feedbackId,
        review_cycle,
        feedback_category,
        priority,
        reviewer_role: panelMemberData.role
      }
    }).catch(err => console.warn('⚠️ Telemetry logging failed:', err.message));
    
    res.json({
      ok: true,
      feedback_id: feedbackId,
      message: 'Feedback submitted successfully. Thank you for your contribution!'
    });
    
  } catch (error) {
    console.error('❌ Panel feedback submission error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to submit feedback',
      details: error.message
    });
  }
});

// ========================================
// ENDPOINT: Get Feedback by Review Cycle
// GET /api/panel/feedback?cycle=Q4_2025
// Authorization: Admin only
// ========================================
router.get('/feedback', async (req, res) => {
  try {
    const { uid, cycle, category, priority, status } = req.query;
    
    // Authorization check
    const adminAccess = await isAdmin(uid);
    if (!adminAccess) {
      return res.status(403).json({
        ok: false,
        error: 'Unauthorized. Admin access required.'
      });
    }
    
    // Build query
    let query = db.collection('panel_feedback');
    
    if (cycle) {
      query = query.where('review_cycle', '==', cycle);
    }
    if (category) {
      query = query.where('feedback_category', '==', category);
    }
    if (priority) {
      query = query.where('priority', '==', priority);
    }
    if (status) {
      query = query.where('status', '==', status);
    }
    
    // Execute query
    const feedbackSnap = await query.orderBy('timestamp', 'desc').limit(500).get();
    
    const feedbackList = [];
    feedbackSnap.forEach(doc => {
      feedbackList.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json({
      ok: true,
      review_cycle: cycle || 'all',
      total_feedback: feedbackList.length,
      feedback: feedbackList
    });
    
  } catch (error) {
    console.error('❌ Feedback retrieval error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to retrieve feedback',
      details: error.message
    });
  }
});

// ========================================
// ENDPOINT: Generate Consensus Report
// POST /api/panel/consensus
// Authorization: Admin only
// ========================================
router.post('/consensus', async (req, res) => {
  try {
    const { uid } = req.query;
    const { review_cycle } = req.body;
    
    // Authorization check
    const adminAccess = await isAdmin(uid);
    if (!adminAccess) {
      return res.status(403).json({
        ok: false,
        error: 'Unauthorized. Admin access required.'
      });
    }
    
    if (!review_cycle) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required field: review_cycle'
      });
    }
    
    console.log(`🔄 Generating consensus report for ${review_cycle}...`);
    
    // Fetch all feedback for this review cycle
    const feedbackSnap = await db.collection('panel_feedback')
      .where('review_cycle', '==', review_cycle)
      .where('status', '!=', 'archived')
      .get();
    
    if (feedbackSnap.empty) {
      return res.status(404).json({
        ok: false,
        error: `No feedback found for review cycle: ${review_cycle}`
      });
    }
    
    // Aggregate themes
    const themes = {};
    const actionItems = [];
    let totalClinicalRating = 0;
    let totalEducationalRating = 0;
    let totalUxRating = 0;
    let ratingCount = 0;
    
    feedbackSnap.forEach(doc => {
      const data = doc.data();
      const cat = data.feedback_category;
      
      // Initialize theme category if not exists
      if (!themes[cat]) {
        themes[cat] = {
          count: 0,
          priorities: [],
          issues: [],
          avg_clinical: 0,
          avg_educational: 0,
          avg_ux: 0,
          rating_count: 0
        };
      }
      
      // Aggregate data
      themes[cat].count++;
      themes[cat].priorities.push(data.priority);
      themes[cat].issues.push({
        text: data.comments,
        case_id: data.case_id,
        reviewer: data.reviewer_role
      });
      
      // Ratings
      if (data.ratings) {
        themes[cat].avg_clinical += data.ratings.clinical || 0;
        themes[cat].avg_educational += data.ratings.educational || 0;
        themes[cat].avg_ux += data.ratings.ux || 0;
        themes[cat].rating_count++;
        
        totalClinicalRating += data.ratings.clinical || 0;
        totalEducationalRating += data.ratings.educational || 0;
        totalUxRating += data.ratings.ux || 0;
        ratingCount++;
      }
      
      // High-priority action items
      if (data.priority === 'high' && data.suggested_action) {
        actionItems.push({
          id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          priority: 'high',
          description: data.suggested_action,
          feedback_id: data.feedback_id,
          case_id: data.case_id,
          category: data.feedback_category,
          reviewer_role: data.reviewer_role,
          status: 'open',
          created_at: new Date().toISOString()
        });
      }
    });
    
    // Calculate averages
    Object.keys(themes).forEach(cat => {
      if (themes[cat].rating_count > 0) {
        themes[cat].avg_clinical /= themes[cat].rating_count;
        themes[cat].avg_educational /= themes[cat].rating_count;
        themes[cat].avg_ux /= themes[cat].rating_count;
      }
      
      // Calculate average priority
      const highCount = themes[cat].priorities.filter(p => p === 'high').length;
      const mediumCount = themes[cat].priorities.filter(p => p === 'medium').length;
      const lowCount = themes[cat].priorities.filter(p => p === 'low').length;
      
      if (highCount > mediumCount && highCount > lowCount) {
        themes[cat].avg_priority = 'high';
      } else if (mediumCount > lowCount) {
        themes[cat].avg_priority = 'medium';
      } else {
        themes[cat].avg_priority = 'low';
      }
      
      // Top issues (most mentioned)
      const issueFrequency = {};
      themes[cat].issues.forEach(issue => {
        const key = issue.text.substring(0, 50); // First 50 chars as key
        issueFrequency[key] = (issueFrequency[key] || 0) + 1;
      });
      
      themes[cat].top_issues = Object.entries(issueFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([issue, count]) => ({ issue, count }));
    });
    
    // Calculate overall averages
    const overallRatings = {
      clinical: ratingCount > 0 ? (totalClinicalRating / ratingCount).toFixed(1) : 0,
      educational: ratingCount > 0 ? (totalEducationalRating / ratingCount).toFixed(1) : 0,
      ux: ratingCount > 0 ? (totalUxRating / ratingCount).toFixed(1) : 0
    };
    
    // Build consensus markdown report
    const consensusMarkdown = buildConsensusMarkdown({
      review_cycle,
      generated_at: new Date().toISOString(),
      total_feedback: feedbackSnap.size,
      overall_ratings: overallRatings,
      themes,
      action_items: actionItems
    });
    
    // Upload to Firebase Storage
    const bucket = admin.storage().bucket();
    const fileName = `panel_consensus/${review_cycle}_Consensus.md`;
    const file = bucket.file(fileName);
    
    await file.save(consensusMarkdown, {
      contentType: 'text/markdown',
      metadata: {
        review_cycle: review_cycle,
        generated_at: new Date().toISOString(),
        total_feedback: feedbackSnap.size
      }
    });
    
    const [reportUrl] = await file.getSignedUrl({
      action: 'read',
      expires: '03-01-2030' // Long-lived URL
    });
    
    // Store consensus metadata in Firestore
    const consensusId = review_cycle.toLowerCase().replace(/\s+/g, '_');
    await db.collection('panel_consensus').doc(consensusId).set({
      review_cycle,
      consensus_id: consensusId,
      generated_at: FieldValue.serverTimestamp(),
      total_feedback: feedbackSnap.size,
      overall_ratings: overallRatings,
      themes,
      action_items: actionItems,
      report_url: reportUrl,
      status: 'published'
    });
    
    console.log(`✅ Consensus report generated for ${review_cycle}: ${reportUrl}`);
    
    // Log telemetry
    await logEngagementEvent({
      uid,
      event_type: 'consensus_report_generated',
      endpoint: 'panel_api.consensus',
      metadata: {
        review_cycle,
        total_feedback: feedbackSnap.size,
        action_items_count: actionItems.length,
        consensus_id: consensusId
      }
    }).catch(err => console.warn('⚠️ Telemetry logging failed:', err.message));
    
    res.json({
      ok: true,
      consensus_id: consensusId,
      review_cycle,
      total_feedback: feedbackSnap.size,
      overall_ratings: overallRatings,
      themes,
      action_items: actionItems,
      report_url: reportUrl,
      message: `Consensus report generated successfully for ${review_cycle}`
    });
    
  } catch (error) {
    console.error('❌ Consensus generation error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to generate consensus report',
      details: error.message
    });
  }
});

// ========================================
// ENDPOINT: Get Consensus Report
// GET /api/panel/consensus/:cycle
// Authorization: Panel members and admins
// ========================================
router.get('/consensus/:cycle', async (req, res) => {
  try {
    const { uid } = req.query;
    const { cycle } = req.params;
    
    // Authorization check
    const adminAccess = await isAdmin(uid);
    const panelAccess = await isPanelMember(uid);
    
    if (!adminAccess && !panelAccess) {
      return res.status(403).json({
        ok: false,
        error: 'Unauthorized. Panel member or admin access required.'
      });
    }
    
    const consensusId = cycle.toLowerCase().replace(/\s+/g, '_');
    const consensusDoc = await db.collection('panel_consensus').doc(consensusId).get();
    
    if (!consensusDoc.exists) {
      return res.status(404).json({
        ok: false,
        error: `No consensus report found for cycle: ${cycle}`
      });
    }
    
    res.json({
      ok: true,
      ...consensusDoc.data()
    });
    
  } catch (error) {
    console.error('❌ Consensus retrieval error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to retrieve consensus report',
      details: error.message
    });
  }
});

// ========================================
// HELPER: Build Consensus Markdown Report
// ========================================
function buildConsensusMarkdown({ review_cycle, generated_at, total_feedback, overall_ratings, themes, action_items }) {
  let markdown = `# 🌍 MedPlat External Development Panel — Consensus Report\n\n`;
  markdown += `> **Review Cycle:** ${review_cycle}  \n`;
  markdown += `> **Generated:** ${new Date(generated_at).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}  \n`;
  markdown += `> **Total Feedback:** ${total_feedback}  \n\n`;
  
  markdown += `---\n\n`;
  markdown += `## 📊 Overall Ratings\n\n`;
  markdown += `| Category     | Average Rating |\n`;
  markdown += `|--------------|----------------|\n`;
  markdown += `| Clinical     | ${overall_ratings.clinical}/10 |\n`;
  markdown += `| Educational  | ${overall_ratings.educational}/10 |\n`;
  markdown += `| UX           | ${overall_ratings.ux}/10 |\n\n`;
  
  markdown += `---\n\n`;
  markdown += `## 🎯 Themes Identified\n\n`;
  
  Object.entries(themes).forEach(([category, data]) => {
    markdown += `### ${category.replace(/_/g, ' ').toUpperCase()}\n\n`;
    markdown += `- **Feedback Count:** ${data.count}\n`;
    markdown += `- **Average Priority:** ${data.avg_priority}\n`;
    markdown += `- **Clinical Rating:** ${data.avg_clinical.toFixed(1)}/10\n`;
    markdown += `- **Educational Rating:** ${data.avg_educational.toFixed(1)}/10\n`;
    markdown += `- **UX Rating:** ${data.avg_ux.toFixed(1)}/10\n\n`;
    
    if (data.top_issues && data.top_issues.length > 0) {
      markdown += `**Top Issues:**\n`;
      data.top_issues.forEach(issue => {
        markdown += `- ${issue.issue} (${issue.count} mentions)\n`;
      });
      markdown += `\n`;
    }
  });
  
  markdown += `---\n\n`;
  markdown += `## 🛠️ Action Items (High Priority)\n\n`;
  
  if (action_items.length === 0) {
    markdown += `*No high-priority action items identified.*\n\n`;
  } else {
    markdown += `| ID | Description | Category | Reviewer Role | Status |\n`;
    markdown += `|----|-------------|----------|---------------|--------|\n`;
    action_items.forEach(item => {
      markdown += `| ${item.id.substring(0, 12)} | ${item.description} | ${item.category} | ${item.reviewer_role} | ${item.status} |\n`;
    });
    markdown += `\n`;
  }
  
  markdown += `---\n\n`;
  markdown += `## 📅 Next Steps\n\n`;
  markdown += `1. Review and assign high-priority action items to development teams\n`;
  markdown += `2. Schedule follow-up meeting to discuss implementation timelines\n`;
  markdown += `3. Track progress in GitHub Projects board\n`;
  markdown += `4. Plan next review cycle\n\n`;
  
  markdown += `---\n\n`;
  markdown += `**Report Generated By:** MedPlat Panel API  \n`;
  markdown += `**Status:** Published  \n`;
  markdown += `**Access:** Panel Members & Admins  \n`;
  
  return markdown;
}

export default router;
