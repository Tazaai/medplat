/**
 * Social Features API - Phase 6 M5
 * Study groups, challenges, achievements, social sharing
 */

import { Router } from 'express';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

const router = Router();

/**
 * GET /api/social/health
 * Health check
 */
router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'social',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/social/groups/create
 * Create study group
 * Body: { name, description, creator_uid, specialty?, max_members? }
 */
router.post('/groups/create', async (req, res) => {
  try {
    const { name, description, creator_uid, specialty, max_members } = req.body;

    if (!name || !creator_uid) {
      return res.status(400).json({ ok: false, error: 'name and creator_uid are required' });
    }

    const db = req.app.locals.db;
    const groupData = {
      name,
      description: description || '',
      creator_uid,
      specialty: specialty || null,
      max_members: max_members || 50,
      member_count: 1,
      members: [creator_uid],
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
      status: 'active'
    };

    const groupRef = await db.collection('study_groups').add(groupData);

    res.json({
      ok: true,
      group: {
        id: groupRef.id,
        ...groupData
      }
    });
  } catch (err) {
    console.error('Error creating group:', err);
    res.status(500).json({ ok: false, error: 'Failed to create study group' });
  }
});

/**
 * POST /api/social/groups/:id/join
 * Join study group
 * Body: { uid }
 */
router.post('/groups/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ ok: false, error: 'uid is required' });
    }

    const db = req.app.locals.db;
    const groupRef = db.collection('study_groups').doc(id);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return res.status(404).json({ ok: false, error: 'Study group not found' });
    }

    const group = groupDoc.data();

    if (group.members.includes(uid)) {
      return res.status(400).json({ ok: false, error: 'Already a member' });
    }

    if (group.member_count >= group.max_members) {
      return res.status(400).json({ ok: false, error: 'Group is full' });
    }

    await groupRef.update({
      members: FieldValue.arrayUnion(uid),
      member_count: FieldValue.increment(1),
      updated_at: Timestamp.now()
    });

    res.json({ ok: true, message: 'Joined group successfully' });
  } catch (err) {
    console.error('Error joining group:', err);
    res.status(500).json({ ok: false, error: 'Failed to join group' });
  }
});

/**
 * GET /api/social/groups
 * List study groups
 * Query: specialty?, limit?, offset?
 */
router.get('/groups', async (req, res) => {
  try {
    const { specialty, limit = 20, offset = 0 } = req.query;
    const db = req.app.locals.db;

    let query = db.collection('study_groups')
      .where('status', '==', 'active')
      .orderBy('created_at', 'desc');

    if (specialty) {
      query = query.where('specialty', '==', specialty);
    }

    const snapshot = await query.limit(parseInt(limit)).offset(parseInt(offset)).get();
    const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({ ok: true, groups });
  } catch (err) {
    console.error('Error listing groups:', err);
    res.status(500).json({ ok: false, error: 'Failed to list study groups' });
  }
});

/**
 * GET /api/social/groups/:id
 * Get group details
 */
router.get('/groups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;

    const groupDoc = await db.collection('study_groups').doc(id).get();
    if (!groupDoc.exists) {
      return res.status(404).json({ ok: false, error: 'Study group not found' });
    }

    res.json({ ok: true, group: { id: groupDoc.id, ...groupDoc.data() } });
  } catch (err) {
    console.error('Error getting group:', err);
    res.status(500).json({ ok: false, error: 'Failed to get study group' });
  }
});

/**
 * POST /api/social/challenges/create
 * Create challenge
 * Body: { title, description, creator_uid, challenge_type, target_value, duration_days, specialty? }
 */
router.post('/challenges/create', async (req, res) => {
  try {
    const { title, description, creator_uid, challenge_type, target_value, duration_days, specialty } = req.body;

    if (!title || !creator_uid || !challenge_type || !target_value || !duration_days) {
      return res.status(400).json({ ok: false, error: 'title, creator_uid, challenge_type, target_value, and duration_days are required' });
    }

    const db = req.app.locals.db;
    const startDate = Timestamp.now();
    const endDate = Timestamp.fromMillis(Date.now() + duration_days * 24 * 60 * 60 * 1000);

    const challengeData = {
      title,
      description: description || '',
      creator_uid,
      challenge_type, // xp_sprint | quiz_marathon | accuracy_challenge | streak_challenge
      target_value,
      duration_days,
      specialty: specialty || null,
      start_date: startDate,
      end_date: endDate,
      participants: [creator_uid],
      participant_count: 1,
      status: 'active',
      created_at: Timestamp.now()
    };

    const challengeRef = await db.collection('challenges').add(challengeData);

    // Create participant record
    await db.collection('challenge_participants').add({
      challenge_id: challengeRef.id,
      uid: creator_uid,
      progress: 0,
      rank: 1,
      joined_at: Timestamp.now()
    });

    res.json({
      ok: true,
      challenge: {
        id: challengeRef.id,
        ...challengeData
      }
    });
  } catch (err) {
    console.error('Error creating challenge:', err);
    res.status(500).json({ ok: false, error: 'Failed to create challenge' });
  }
});

/**
 * POST /api/social/challenges/:id/join
 * Join challenge
 * Body: { uid }
 */
router.post('/challenges/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ ok: false, error: 'uid is required' });
    }

    const db = req.app.locals.db;
    const challengeRef = db.collection('challenges').doc(id);
    const challengeDoc = await challengeRef.get();

    if (!challengeDoc.exists) {
      return res.status(404).json({ ok: false, error: 'Challenge not found' });
    }

    const challenge = challengeDoc.data();

    if (challenge.participants.includes(uid)) {
      return res.status(400).json({ ok: false, error: 'Already participating' });
    }

    if (challenge.status !== 'active') {
      return res.status(400).json({ ok: false, error: 'Challenge is not active' });
    }

    await challengeRef.update({
      participants: FieldValue.arrayUnion(uid),
      participant_count: FieldValue.increment(1)
    });

    // Create participant record
    await db.collection('challenge_participants').add({
      challenge_id: id,
      uid,
      progress: 0,
      rank: challenge.participant_count + 1,
      joined_at: Timestamp.now()
    });

    res.json({ ok: true, message: 'Joined challenge successfully' });
  } catch (err) {
    console.error('Error joining challenge:', err);
    res.status(500).json({ ok: false, error: 'Failed to join challenge' });
  }
});

/**
 * GET /api/social/challenges
 * List active challenges
 * Query: specialty?, status?, limit?
 */
router.get('/challenges', async (req, res) => {
  try {
    const { specialty, status = 'active', limit = 20 } = req.query;
    const db = req.app.locals.db;

    let query = db.collection('challenges')
      .where('status', '==', status)
      .orderBy('created_at', 'desc');

    if (specialty) {
      query = query.where('specialty', '==', specialty);
    }

    const snapshot = await query.limit(parseInt(limit)).get();
    const challenges = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({ ok: true, challenges });
  } catch (err) {
    console.error('Error listing challenges:', err);
    res.status(500).json({ ok: false, error: 'Failed to list challenges' });
  }
});

/**
 * GET /api/social/challenges/:id/leaderboard
 * Get challenge leaderboard
 */
router.get('/challenges/:id/leaderboard', async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;

    const participantsQuery = await db.collection('challenge_participants')
      .where('challenge_id', '==', id)
      .orderBy('progress', 'desc')
      .limit(100)
      .get();

    const leaderboard = participantsQuery.docs.map((doc, index) => ({
      rank: index + 1,
      ...doc.data()
    }));

    res.json({ ok: true, leaderboard });
  } catch (err) {
    console.error('Error getting challenge leaderboard:', err);
    res.status(500).json({ ok: false, error: 'Failed to get challenge leaderboard' });
  }
});

/**
 * POST /api/social/achievements/unlock
 * Unlock achievement
 * Body: { uid, achievement_id }
 */
router.post('/achievements/unlock', async (req, res) => {
  try {
    const { uid, achievement_id } = req.body;

    if (!uid || !achievement_id) {
      return res.status(400).json({ ok: false, error: 'uid and achievement_id are required' });
    }

    const db = req.app.locals.db;

    // Check if already unlocked
    const existingQuery = await db.collection('user_achievements')
      .where('uid', '==', uid)
      .where('achievement_id', '==', achievement_id)
      .get();

    if (!existingQuery.empty) {
      return res.status(400).json({ ok: false, error: 'Achievement already unlocked' });
    }

    // Unlock achievement
    await db.collection('user_achievements').add({
      uid,
      achievement_id,
      unlocked_at: Timestamp.now()
    });

    res.json({ ok: true, message: 'Achievement unlocked' });
  } catch (err) {
    console.error('Error unlocking achievement:', err);
    res.status(500).json({ ok: false, error: 'Failed to unlock achievement' });
  }
});

/**
 * GET /api/social/achievements
 * Get user achievements
 * Query: uid
 */
router.get('/achievements', async (req, res) => {
  try {
    const { uid } = req.query;

    if (!uid) {
      return res.status(400).json({ ok: false, error: 'uid is required' });
    }

    const db = req.app.locals.db;
    const achievementsQuery = await db.collection('user_achievements')
      .where('uid', '==', uid)
      .orderBy('unlocked_at', 'desc')
      .get();

    const achievements = achievementsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ ok: true, achievements });
  } catch (err) {
    console.error('Error getting achievements:', err);
    res.status(500).json({ ok: false, error: 'Failed to get achievements' });
  }
});

/**
 * POST /api/social/share
 * Create shareable content
 * Body: { uid, share_type, content }
 * share_type: certificate | achievement | score | streak
 */
router.post('/share', async (req, res) => {
  try {
    const { uid, share_type, content } = req.body;

    if (!uid || !share_type || !content) {
      return res.status(400).json({ ok: false, error: 'uid, share_type, and content are required' });
    }

    const db = req.app.locals.db;
    
    // Generate share token
    const shareToken = `${share_type}-${uid}-${Date.now()}`;
    
    const shareData = {
      uid,
      share_type,
      content,
      share_token: shareToken,
      created_at: Timestamp.now(),
      view_count: 0
    };

    const shareRef = await db.collection('shared_content').add(shareData);

    // Generate share URL
    const shareUrl = `https://medplat-frontend-139218747785.europe-west1.run.app/share/${shareToken}`;

    res.json({
      ok: true,
      share: {
        id: shareRef.id,
        share_token: shareToken,
        share_url: shareUrl
      }
    });
  } catch (err) {
    console.error('Error creating share:', err);
    res.status(500).json({ ok: false, error: 'Failed to create shareable content' });
  }
});

/**
 * GET /api/social/share/:token
 * Get shared content
 */
router.get('/share/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const db = req.app.locals.db;

    const shareQuery = await db.collection('shared_content')
      .where('share_token', '==', token)
      .limit(1)
      .get();

    if (shareQuery.empty) {
      return res.status(404).json({ ok: false, error: 'Shared content not found' });
    }

    const shareDoc = shareQuery.docs[0];
    const shareData = shareDoc.data();

    // Increment view count
    await shareDoc.ref.update({
      view_count: FieldValue.increment(1)
    });

    res.json({
      ok: true,
      share: {
        id: shareDoc.id,
        ...shareData,
        view_count: (shareData.view_count || 0) + 1
      }
    });
  } catch (err) {
    console.error('Error getting shared content:', err);
    res.status(500).json({ ok: false, error: 'Failed to get shared content' });
  }
});

export default router;
