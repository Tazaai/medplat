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

/**
 * ===== PHASE 7 M5: ADVANCED SOCIAL FEATURES =====
 */

/**
 * POST /api/social/friends/add
 * Send friend request
 * Body: { from_uid, to_uid }
 */
router.post('/friends/add', async (req, res) => {
  try {
    const { from_uid, to_uid } = req.body;

    if (!from_uid || !to_uid) {
      return res.status(400).json({ ok: false, error: 'from_uid and to_uid required' });
    }

    if (from_uid === to_uid) {
      return res.status(400).json({ ok: false, error: 'Cannot add yourself as friend' });
    }

    const db = req.app.locals.db;

    // Check if request already exists
    const existingQuery = await db.collection('friend_requests')
      .where('from_uid', '==', from_uid)
      .where('to_uid', '==', to_uid)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      return res.status(400).json({ ok: false, error: 'Friend request already sent' });
    }

    // Create friend request
    const requestRef = await db.collection('friend_requests').add({
      from_uid,
      to_uid,
      status: 'pending',
      created_at: Timestamp.now()
    });

    res.json({
      ok: true,
      request_id: requestRef.id,
      message: 'Friend request sent'
    });
  } catch (err) {
    console.error('Error sending friend request:', err);
    res.status(500).json({ ok: false, error: 'Failed to send friend request' });
  }
});

/**
 * POST /api/social/friends/accept
 * Accept friend request
 * Body: { request_id, uid }
 */
router.post('/friends/accept', async (req, res) => {
  try {
    const { request_id, uid } = req.body;

    if (!request_id || !uid) {
      return res.status(400).json({ ok: false, error: 'request_id and uid required' });
    }

    const db = req.app.locals.db;
    const requestRef = db.collection('friend_requests').doc(request_id);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return res.status(404).json({ ok: false, error: 'Friend request not found' });
    }

    const requestData = requestDoc.data();

    if (requestData.to_uid !== uid) {
      return res.status(403).json({ ok: false, error: 'Unauthorized' });
    }

    if (requestData.status !== 'pending') {
      return res.status(400).json({ ok: false, error: 'Request already processed' });
    }

    // Update request status
    await requestRef.update({
      status: 'accepted',
      accepted_at: Timestamp.now()
    });

    // Create friendship (bidirectional)
    const batch = db.batch();

    const friendship1Ref = db.collection('friendships').doc();
    batch.set(friendship1Ref, {
      user_uid: requestData.from_uid,
      friend_uid: requestData.to_uid,
      created_at: Timestamp.now()
    });

    const friendship2Ref = db.collection('friendships').doc();
    batch.set(friendship2Ref, {
      user_uid: requestData.to_uid,
      friend_uid: requestData.from_uid,
      created_at: Timestamp.now()
    });

    await batch.commit();

    res.json({
      ok: true,
      message: 'Friend request accepted'
    });
  } catch (err) {
    console.error('Error accepting friend request:', err);
    res.status(500).json({ ok: false, error: 'Failed to accept friend request' });
  }
});

/**
 * GET /api/social/friends/list/:uid
 * Get user's friends
 */
router.get('/friends/list/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const db = req.app.locals.db;

    const friendshipsQuery = await db.collection('friendships')
      .where('user_uid', '==', uid)
      .get();

    const friends = friendshipsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      ok: true,
      count: friends.length,
      friends
    });
  } catch (err) {
    console.error('Error getting friends:', err);
    res.status(500).json({ ok: false, error: 'Failed to get friends' });
  }
});

/**
 * POST /api/social/challenges/create
 * Create peer challenge
 * Body: { creator_uid, opponent_uid, challenge_type, specialty?, difficulty?, question_count? }
 */
router.post('/challenges/create', async (req, res) => {
  try {
    const {
      creator_uid,
      opponent_uid,
      challenge_type = 'quiz_duel',
      specialty,
      difficulty = 'intermediate',
      question_count = 10
    } = req.body;

    if (!creator_uid || !opponent_uid) {
      return res.status(400).json({ ok: false, error: 'creator_uid and opponent_uid required' });
    }

    const db = req.app.locals.db;

    const challengeData = {
      creator_uid,
      opponent_uid,
      challenge_type,
      specialty: specialty || null,
      difficulty,
      question_count,
      status: 'pending',
      created_at: Timestamp.now(),
      expires_at: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 days
      creator_score: null,
      opponent_score: null,
      winner_uid: null
    };

    const challengeRef = await db.collection('peer_challenges').add(challengeData);

    res.json({
      ok: true,
      challenge_id: challengeRef.id,
      challenge: challengeData,
      message: 'Challenge created'
    });
  } catch (err) {
    console.error('Error creating challenge:', err);
    res.status(500).json({ ok: false, error: 'Failed to create challenge' });
  }
});

/**
 * POST /api/social/challenges/accept
 * Accept peer challenge
 * Body: { challenge_id, uid }
 */
router.post('/challenges/accept', async (req, res) => {
  try {
    const { challenge_id, uid } = req.body;

    if (!challenge_id || !uid) {
      return res.status(400).json({ ok: false, error: 'challenge_id and uid required' });
    }

    const db = req.app.locals.db;
    const challengeRef = db.collection('peer_challenges').doc(challenge_id);
    const challengeDoc = await challengeRef.get();

    if (!challengeDoc.exists) {
      return res.status(404).json({ ok: false, error: 'Challenge not found' });
    }

    const challengeData = challengeDoc.data();

    if (challengeData.opponent_uid !== uid) {
      return res.status(403).json({ ok: false, error: 'Unauthorized' });
    }

    if (challengeData.status !== 'pending') {
      return res.status(400).json({ ok: false, error: 'Challenge already processed' });
    }

    await challengeRef.update({
      status: 'active',
      accepted_at: Timestamp.now()
    });

    res.json({
      ok: true,
      message: 'Challenge accepted',
      challenge: { id: challenge_id, ...challengeData }
    });
  } catch (err) {
    console.error('Error accepting challenge:', err);
    res.status(500).json({ ok: false, error: 'Failed to accept challenge' });
  }
});

/**
 * POST /api/social/challenges/submit
 * Submit challenge result
 * Body: { challenge_id, uid, score, time_taken }
 */
router.post('/challenges/submit', async (req, res) => {
  try {
    const { challenge_id, uid, score, time_taken } = req.body;

    if (!challenge_id || !uid || score === undefined) {
      return res.status(400).json({ ok: false, error: 'challenge_id, uid, and score required' });
    }

    const db = req.app.locals.db;
    const challengeRef = db.collection('peer_challenges').doc(challenge_id);
    const challengeDoc = await challengeRef.get();

    if (!challengeDoc.exists) {
      return res.status(404).json({ ok: false, error: 'Challenge not found' });
    }

    const challengeData = challengeDoc.data();

    if (challengeData.creator_uid !== uid && challengeData.opponent_uid !== uid) {
      return res.status(403).json({ ok: false, error: 'Unauthorized' });
    }

    const updateData = {};
    const isCreator = challengeData.creator_uid === uid;

    if (isCreator) {
      updateData.creator_score = score;
      updateData.creator_time = time_taken;
    } else {
      updateData.opponent_score = score;
      updateData.opponent_time = time_taken;
    }

    // Check if challenge is complete
    const bothCompleted = (isCreator && challengeData.opponent_score !== null) ||
                          (!isCreator && challengeData.creator_score !== null);

    if (bothCompleted) {
      const creatorScore = isCreator ? score : challengeData.creator_score;
      const opponentScore = isCreator ? challengeData.opponent_score : score;

      if (creatorScore > opponentScore) {
        updateData.winner_uid = challengeData.creator_uid;
      } else if (opponentScore > creatorScore) {
        updateData.winner_uid = challengeData.opponent_uid;
      } else {
        updateData.winner_uid = 'tie';
      }

      updateData.status = 'completed';
      updateData.completed_at = Timestamp.now();
    }

    await challengeRef.update(updateData);

    res.json({
      ok: true,
      message: 'Score submitted',
      challenge_complete: bothCompleted,
      winner: updateData.winner_uid || null
    });
  } catch (err) {
    console.error('Error submitting challenge:', err);
    res.status(500).json({ ok: false, error: 'Failed to submit challenge' });
  }
});

/**
 * GET /api/social/challenges/user/:uid
 * Get user's challenges
 */
router.get('/challenges/user/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { status } = req.query;

    const db = req.app.locals.db;

    let query1 = db.collection('peer_challenges').where('creator_uid', '==', uid);
    let query2 = db.collection('peer_challenges').where('opponent_uid', '==', uid);

    if (status) {
      query1 = query1.where('status', '==', status);
      query2 = query2.where('status', '==', status);
    }

    const [challenges1, challenges2] = await Promise.all([
      query1.get(),
      query2.get()
    ]);

    const challenges = [
      ...challenges1.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      ...challenges2.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    ];

    // Sort by creation date
    challenges.sort((a, b) => b.created_at.toMillis() - a.created_at.toMillis());

    res.json({
      ok: true,
      count: challenges.length,
      challenges
    });
  } catch (err) {
    console.error('Error getting challenges:', err);
    res.status(500).json({ ok: false, error: 'Failed to get challenges' });
  }
});

/**
 * POST /api/social/activity/post
 * Post activity to feed
 * Body: { uid, activity_type, content, metadata? }
 */
router.post('/activity/post', async (req, res) => {
  try {
    const { uid, activity_type, content, metadata } = req.body;

    if (!uid || !activity_type || !content) {
      return res.status(400).json({ ok: false, error: 'uid, activity_type, and content required' });
    }

    const db = req.app.locals.db;

    const activityData = {
      uid,
      activity_type,
      content,
      metadata: metadata || {},
      created_at: Timestamp.now(),
      like_count: 0,
      comment_count: 0
    };

    const activityRef = await db.collection('activity_feed').add(activityData);

    res.json({
      ok: true,
      activity_id: activityRef.id,
      activity: activityData
    });
  } catch (err) {
    console.error('Error posting activity:', err);
    res.status(500).json({ ok: false, error: 'Failed to post activity' });
  }
});

/**
 * GET /api/social/activity/feed/:uid
 * Get activity feed for user (friends + own activities)
 */
router.get('/activity/feed/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { limit = 20 } = req.query;

    const db = req.app.locals.db;

    // Get user's friends
    const friendshipsQuery = await db.collection('friendships')
      .where('user_uid', '==', uid)
      .get();

    const friendUids = friendshipsQuery.docs.map(doc => doc.data().friend_uid);
    friendUids.push(uid); // Include own activities

    // Get recent activities from friends + self
    const activitiesQuery = await db.collection('activity_feed')
      .where('uid', 'in', friendUids.slice(0, 10)) // Firestore 'in' limit is 10
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit))
      .get();

    const activities = activitiesQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      ok: true,
      count: activities.length,
      activities
    });
  } catch (err) {
    console.error('Error getting activity feed:', err);
    res.status(500).json({ ok: false, error: 'Failed to get activity feed' });
  }
});

/**
 * GET /api/social/leaderboard/group/:groupId
 * Get study group leaderboard
 */
router.get('/leaderboard/group/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { metric = 'xp', period = 'all_time' } = req.query;

    const db = req.app.locals.db;

    // Get group members
    const groupDoc = await db.collection('study_groups').doc(groupId).get();

    if (!groupDoc.exists) {
      return res.status(404).json({ ok: false, error: 'Group not found' });
    }

    const groupData = groupDoc.data();
    const members = groupData.members || [];

    // Calculate leaderboard (placeholder - would query user stats)
    const leaderboard = members.map((uid, index) => ({
      rank: index + 1,
      uid,
      score: Math.floor(Math.random() * 10000), // Placeholder
      metric
    }));

    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard.forEach((entry, index) => entry.rank = index + 1);

    res.json({
      ok: true,
      group_id: groupId,
      metric,
      period,
      leaderboard
    });
  } catch (err) {
    console.error('Error getting group leaderboard:', err);
    res.status(500).json({ ok: false, error: 'Failed to get group leaderboard' });
  }
});

/**
 * POST /api/social/notifications/send
 * Send notification to user
 * Body: { to_uid, type, title, message, data? }
 */
router.post('/notifications/send', async (req, res) => {
  try {
    const { to_uid, type, title, message, data } = req.body;

    if (!to_uid || !type || !title || !message) {
      return res.status(400).json({ ok: false, error: 'to_uid, type, title, and message required' });
    }

    const db = req.app.locals.db;

    const notificationData = {
      to_uid,
      type,
      title,
      message,
      data: data || {},
      read: false,
      created_at: Timestamp.now()
    };

    const notificationRef = await db.collection('notifications').add(notificationData);

    res.json({
      ok: true,
      notification_id: notificationRef.id,
      notification: notificationData
    });
  } catch (err) {
    console.error('Error sending notification:', err);
    res.status(500).json({ ok: false, error: 'Failed to send notification' });
  }
});

/**
 * GET /api/social/notifications/:uid
 * Get user's notifications
 */
router.get('/notifications/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { unread_only = false, limit = 20 } = req.query;

    const db = req.app.locals.db;

    let query = db.collection('notifications')
      .where('to_uid', '==', uid)
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit));

    if (unread_only === 'true') {
      query = query.where('read', '==', false);
    }

    const notificationsQuery = await query.get();

    const notifications = notificationsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const unreadCount = notifications.filter(n => !n.read).length;

    res.json({
      ok: true,
      count: notifications.length,
      unread_count: unreadCount,
      notifications
    });
  } catch (err) {
    console.error('Error getting notifications:', err);
    res.status(500).json({ ok: false, error: 'Failed to get notifications' });
  }
});

/**
 * POST /api/social/notifications/mark-read
 * Mark notification as read
 * Body: { notification_id }
 */
router.post('/notifications/mark-read', async (req, res) => {
  try {
    const { notification_id } = req.body;

    if (!notification_id) {
      return res.status(400).json({ ok: false, error: 'notification_id required' });
    }

    const db = req.app.locals.db;
    const notificationRef = db.collection('notifications').doc(notification_id);

    await notificationRef.update({
      read: true,
      read_at: Timestamp.now()
    });

    res.json({
      ok: true,
      message: 'Notification marked as read'
    });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ ok: false, error: 'Failed to mark notification as read' });
  }
});

export default router;
