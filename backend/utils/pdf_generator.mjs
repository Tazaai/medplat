/**
 * Certificate PDF Generator
 * Creates professional medical education certificates
 */

import PDFDocument from 'pdfkit';
import { Storage } from '@google-cloud/storage';
import fs from 'fs';

const storage = new Storage();
const BUCKET_NAME = process.env.CERTIFICATE_BUCKET || 'medplat-certificates';

/**
 * Generate certificate PDF and upload to Cloud Storage
 */
export async function generateCertificatePDF(certificate, userData, pathwayData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 50,
      info: {
        Title: `MedPlat Certificate - ${pathwayData.name}`,
        Author: 'MedPlat',
        Subject: 'Certificate of Completion'
      }
    });
    
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('error', reject);
    
    // Border
    doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
       .lineWidth(2)
       .stroke('#2C3E50');
    
    // Header
    doc.fontSize(28)
       .font('Helvetica-Bold')
       .fillColor('#2C3E50')
       .text('MedPlat', { align: 'center' })
       .moveDown(0.5);
    
    doc.fontSize(18)
       .font('Helvetica')
       .fillColor('#34495E')
       .text('Certificate of Completion', { align: 'center' })
       .moveDown(2);
    
    // Body
    doc.fontSize(14)
       .font('Helvetica')
       .fillColor('#2C3E50')
       .text('This certifies that', { align: 'center' })
       .moveDown(0.5);
    
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .fillColor('#1ABC9C')
       .text(userData.display_name || 'Medical Professional', { align: 'center' })
       .moveDown(1);
    
    doc.fontSize(14)
       .font('Helvetica')
       .fillColor('#2C3E50')
       .text('has successfully completed the', { align: 'center' })
       .moveDown(0.5);
    
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .fillColor('#3498DB')
       .text(pathwayData.name, { align: 'center' })
       .moveDown(1.5);
    
    // Requirements
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#34495E')
       .text('Requirements Met:', { align: 'center' })
       .moveDown(0.3);
    
    const requirements = [
      `${pathwayData.requirements.topics_mastered} topics mastered`,
      `${pathwayData.requirements.xp_required.toLocaleString()} XP earned`,
      `${(pathwayData.requirements.quiz_accuracy_min * 100)}% quiz accuracy`,
      `${pathwayData.requirements.streak_days_min}-day learning streak`
    ];
    
    requirements.forEach(req => {
      doc.fontSize(11)
         .text(`✓ ${req}`, { align: 'center' })
         .moveDown(0.2);
    });
    
    doc.moveDown(1);
    
    // Date and verification
    const issueDate = new Date(certificate.issued_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    doc.fontSize(11)
       .fillColor('#7F8C8D')
       .text(`Issued: ${issueDate}`, { align: 'center' })
       .moveDown(0.3);
    
    doc.fontSize(10)
       .text(`Verification Code: ${certificate.verification_code}`, { align: 'center' })
       .moveDown(0.3);
    
    doc.fontSize(9)
       .fillColor('#95A5A6')
       .text('Verify at: https://medplat.app/verify', { align: 'center' });
    
    // Footer
    doc.fontSize(8)
       .moveDown(2)
       .fillColor('#BDC3C7')
       .text('MedPlat - Evidence-Based Medical Education', { align: 'center' })
       .text('Aligned with ESC, AHA, NICE, and ACCP Guidelines', { align: 'center' });
    
    doc.end();
    
    doc.on('end', async () => {
      try {
        const pdfBuffer = Buffer.concat(buffers);
        const filename = `${certificate.verification_code}.pdf`;
        
        // Upload to Cloud Storage
        const bucket = storage.bucket(BUCKET_NAME);
        const file = bucket.file(`certificates/${filename}`);
        
        await file.save(pdfBuffer, {
          contentType: 'application/pdf',
          metadata: {
            cacheControl: 'public, max-age=31536000',
            metadata: {
              uid: certificate.uid,
              pathway: certificate.pathway_id,
              issued: certificate.issued_at
            }
          }
        });
        
        await file.makePublic();
        
        const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/certificates/${filename}`;
        resolve(publicUrl);
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Generate unique verification code
 */
export function generateVerificationCode() {
  const prefix = 'MEDP';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Verify pathway requirements are met
 */
export async function verifyPathwayRequirements(db, uid, pathwayId, pathwayData) {
  const missing = [];
  
  // Get user stats
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    return { met: false, missing: ['User not found'] };
  }
  
  const user = userDoc.data();
  const requirements = pathwayData.requirements;
  
  // Check XP
  if ((user.xp || 0) < requirements.xp_required) {
    missing.push(`Need ${requirements.xp_required - (user.xp || 0)} more XP`);
  }
  
  // Check streak
  if ((user.streak || 0) < requirements.streak_days_min) {
    missing.push(`Need ${requirements.streak_days_min - (user.streak || 0)} more days in streak`);
  }
  
  // Check quiz accuracy
  const totalQuizzes = user.quizzes_completed || 0;
  const correctAnswers = user.correct_answers || 0;
  const accuracy = totalQuizzes > 0 ? correctAnswers / totalQuizzes : 0;
  
  if (accuracy < requirements.quiz_accuracy_min) {
    missing.push(`Need ${((requirements.quiz_accuracy_min - accuracy) * 100).toFixed(1)}% higher accuracy`);
  }
  
  // Check quiz count
  if (totalQuizzes < requirements.quizzes_completed_min) {
    missing.push(`Need ${requirements.quizzes_completed_min - totalQuizzes} more quizzes`);
  }
  
  // Check topics mastered
  const topicsMastered = user.topics_mastered || 0;
  if (topicsMastered < requirements.topics_mastered) {
    missing.push(`Need ${requirements.topics_mastered - topicsMastered} more topics mastered`);
  }
  
  return {
    met: missing.length === 0,
    missing
  };
}
