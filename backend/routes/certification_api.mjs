/**
 * Certification API
 * Manages learning pathways and certificate issuance
 */

import express from 'express';
import { db } from '../firebaseClient.js';
import { generateCertificatePDF, generateVerificationCode, verifyPathwayRequirements } from '../utils/pdf_generator.mjs';
import { logEngagementEvent } from '../telemetry/telemetry_logger.mjs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pathwaysData = JSON.parse(readFileSync(join(__dirname, '../data/pathways.json'), 'utf8'));

const router = express.Router();

// Health check
router.get('/health', async (req, res) => {
  res.json({
    ok: true,
    service: 'certification',
    status: 'operational',
    pathways_available: Object.keys(pathwaysData).length
  });
});

// Get all available pathways
router.get('/pathways', async (req, res) => {
  try {
    const pathways = Object.values(pathwaysData);
    res.json({ ok: true, pathways });
  } catch (error) {
    console.error('Error fetching pathways:', error);
    res.status(500).json({ error: 'Failed to fetch pathways' });
  }
});

// Get specific pathway
router.get('/pathways/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pathway = pathwaysData[id];
    
    if (!pathway) {
      return res.status(404).json({ error: 'Pathway not found' });
    }
    
    res.json({ ok: true, pathway });
  } catch (error) {
    console.error('Error fetching pathway:', error);
    res.status(500).json({ error: 'Failed to fetch pathway' });
  }
});

// Enroll in pathway
router.post('/enroll', async (req, res) => {
  try {
    const { uid, pathway_id } = req.body;
    
    if (!uid || !pathway_id) {
      return res.status(400).json({ error: 'Missing uid or pathway_id' });
    }
    
    const pathway = pathwaysData[pathway_id];
    if (!pathway) {
      return res.status(404).json({ error: 'Pathway not found' });
    }
    
    // Check if already enrolled
    const existingSnapshot = await db.collection('pathway_enrollments')
      .where('uid', '==', uid)
      .where('pathway_id', '==', pathway_id)
      .where('status', '==', 'active')
      .get();
    
    if (!existingSnapshot.empty) {
      return res.status(400).json({ error: 'Already enrolled in this pathway' });
    }
    
    // Create enrollment
    const enrollment = {
      uid,
      pathway_id,
      enrolled_at: new Date().toISOString(),
      progress: 0,
      topics_completed: 0,
      quizzes_completed: 0,
      current_xp: 0,
      current_accuracy: 0,
      status: 'active'
    };
    
    const docRef = await db.collection('pathway_enrollments').add(enrollment);
    
    await logEngagementEvent({
      uid,
      event_type: 'pathway_enrolled',
      payload: { 
        pathway_id,
        pathway_name: pathway.name
      }
    });
    
    res.json({ 
      ok: true, 
      enrollment: { ...enrollment, id: docRef.id }
    });
  } catch (error) {
    console.error('Error enrolling in pathway:', error);
    res.status(500).json({ error: 'Failed to enroll in pathway' });
  }
});

// Get user's pathway progress
router.get('/progress', async (req, res) => {
  try {
    const { uid, pathway_id } = req.query;
    
    if (!uid) {
      return res.status(400).json({ error: 'Missing uid' });
    }
    
    let query = db.collection('pathway_enrollments').where('uid', '==', uid);
    
    if (pathway_id) {
      query = query.where('pathway_id', '==', pathway_id);
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return res.json({ ok: true, enrollments: [] });
    }
    
    const enrollments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({ ok: true, enrollments });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Update pathway progress
router.post('/progress/update', async (req, res) => {
  try {
    const { uid, pathway_id, progress_data } = req.body;
    
    if (!uid || !pathway_id) {
      return res.status(400).json({ error: 'Missing uid or pathway_id' });
    }
    
    const snapshot = await db.collection('pathway_enrollments')
      .where('uid', '==', uid)
      .where('pathway_id', '==', pathway_id)
      .where('status', '==', 'active')
      .get();
    
    if (snapshot.empty) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    
    const docId = snapshot.docs[0].id;
    const currentData = snapshot.docs[0].data();
    
    // Calculate new progress percentage
    const pathway = pathwaysData[pathway_id];
    const requirements = pathway.requirements;
    
    const progressPercent = Math.min(100, Math.round(
      ((progress_data.topics_completed || currentData.topics_completed || 0) / requirements.topics_mastered) * 30 +
      ((progress_data.current_xp || currentData.current_xp || 0) / requirements.xp_required) * 30 +
      ((progress_data.current_accuracy || currentData.current_accuracy || 0) / requirements.quiz_accuracy_min) * 20 +
      ((progress_data.quizzes_completed || currentData.quizzes_completed || 0) / requirements.quizzes_completed_min) * 20
    ));
    
    const updateData = {
      ...progress_data,
      progress: progressPercent,
      last_updated: new Date().toISOString()
    };
    
    await db.collection('pathway_enrollments').doc(docId).update(updateData);
    
    res.json({ ok: true, progress: progressPercent });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Complete pathway and issue certificate
router.post('/complete', async (req, res) => {
  try {
    const { uid, pathway_id } = req.body;
    
    if (!uid || !pathway_id) {
      return res.status(400).json({ error: 'Missing uid or pathway_id' });
    }
    
    const pathway = pathwaysData[pathway_id];
    if (!pathway) {
      return res.status(404).json({ error: 'Pathway not found' });
    }
    
    // Verify requirements
    const verification = await verifyPathwayRequirements(db, uid, pathway_id, pathway);
    
    if (!verification.met) {
      return res.status(400).json({ 
        error: 'Requirements not met',
        missing: verification.missing
      });
    }
    
    // Check if already certified
    const existingCert = await db.collection('certifications')
      .where('uid', '==', uid)
      .where('pathway_id', '==', pathway_id)
      .where('status', '==', 'valid')
      .get();
    
    if (!existingCert.empty) {
      return res.status(400).json({ error: 'Already certified for this pathway' });
    }
    
    // Generate verification code
    const verification_code = generateVerificationCode();
    
    // Get user data
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();
    
    // Create certificate record
    const certificate = {
      uid,
      pathway_id,
      pathway_name: pathway.name,
      specialty: pathway.specialty,
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + pathway.certification_valid_years * 365 * 24 * 60 * 60 * 1000).toISOString(),
      verification_code,
      status: 'valid'
    };
    
    const certDoc = await db.collection('certifications').add(certificate);
    
    // Generate PDF
    let pdf_url;
    try {
      pdf_url = await generateCertificatePDF(certificate, userData, pathway);
    } catch (pdfError) {
      console.error('PDF generation failed:', pdfError);
      pdf_url = null;
    }
    
    // Update certificate with PDF URL
    if (pdf_url) {
      await certDoc.update({ pdf_url });
    }
    
    // Update enrollment status
    const enrollmentSnapshot = await db.collection('pathway_enrollments')
      .where('uid', '==', uid)
      .where('pathway_id', '==', pathway_id)
      .where('status', '==', 'active')
      .get();
    
    if (!enrollmentSnapshot.empty) {
      await enrollmentSnapshot.docs[0].ref.update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      });
    }
    
    await logEngagementEvent({
      uid,
      event_type: 'certificate_issued',
      payload: { 
        pathway_id,
        pathway_name: pathway.name,
        verification_code
      }
    });
    
    res.json({ 
      ok: true, 
      certificate: {
        ...certificate,
        id: certDoc.id,
        pdf_url
      }
    });
  } catch (error) {
    console.error('Error completing pathway:', error);
    res.status(500).json({ error: 'Failed to complete pathway' });
  }
});

// Verify certificate
router.get('/verify/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    const snapshot = await db.collection('certifications')
      .where('verification_code', '==', code)
      .get();
    
    if (snapshot.empty) {
      return res.status(404).json({ 
        ok: false,
        valid: false,
        error: 'Certificate not found' 
      });
    }
    
    const cert = snapshot.docs[0].data();
    const now = new Date();
    const expiresAt = new Date(cert.expires_at);
    const isExpired = now > expiresAt;
    const isValid = cert.status === 'valid' && !isExpired;
    
    res.json({ 
      ok: true,
      valid: isValid,
      certificate: {
        pathway_name: cert.pathway_name,
        specialty: cert.specialty,
        issued_at: cert.issued_at,
        expires_at: cert.expires_at,
        expired: isExpired,
        status: cert.status
      }
    });
  } catch (error) {
    console.error('Error verifying certificate:', error);
    res.status(500).json({ error: 'Failed to verify certificate' });
  }
});

// List user certificates
router.get('/list', async (req, res) => {
  try {
    const { uid } = req.query;
    
    if (!uid) {
      return res.status(400).json({ error: 'Missing uid' });
    }
    
    const snapshot = await db.collection('certifications')
      .where('uid', '==', uid)
      .orderBy('issued_at', 'desc')
      .get();
    
    const certificates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({ ok: true, certificates });
  } catch (error) {
    console.error('Error listing certificates:', error);
    res.status(500).json({ error: 'Failed to list certificates' });
  }
});

export default router;
