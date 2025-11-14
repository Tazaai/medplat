/**
 * Leaderboard API
 * Manages global, specialty, and regional rankings
 */

import express from 'express';
import { db } from '../firebaseClient.js';
import {
  calculateGlobalRankings,
  calculateSpecialtyRankings,
  calculateRegionalRankings,
  calculateWeeklyRankings,
  calculateRankChange,
  getTierBadge,
  getXpToNextTier
} from '../utils/ranking_engine.mjs';

const router = express.Router();

// In-memory cache for leaderboards (refreshed every 6 hours)
let leaderboardCache = {
  global: { data: null, lastUpdate: 0 },
  weekly: { data: null, lastUpdate: 0 },
  specialty: {},
  regional: {}
};

const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

// Health check
router.get('/health', async (req, res) => {
  res.json({
    ok: true,
    service: 'leaderboard',
    status: 'operational',
    cache_status: {
      global_cached: !!leaderboardCache.global.data,
      weekly_cached: !!leaderboardCache.weekly.data,
      last_global_update: leaderboardCache.global.lastUpdate ? new Date(leaderboardCache.global.lastUpdate).toISOString() : null
    }
  });
});

// Get global rankings
router.get('/global', async (req, res) => {
  try {
    const { period = 'all-time', limit = 100 } = req.query;
    const now = Date.now();

    // Check cache
    if (period === 'all-time') {
      if (leaderboardCache.global.data && (now - leaderboardCache.global.lastUpdate) < CACHE_TTL) {
        return res.json({
          ok: true,
          rankings: leaderboardCache.global.data.slice(0, parseInt(limit)),
          cached: true,
          cache_age_minutes: Math.round((now - leaderboardCache.global.lastUpdate) / 60000)
        });
      }
    }

    // Fetch users
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));

    let rankings;
    if (period === 'weekly') {
      // Get engagement events for weekly calculation
      const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      const engagementSnapshot = await db.collection('engagement_events')
        .where('timestamp', '>=', weekAgo.toISOString())
        .get();
      
      const engagementData = engagementSnapshot.docs.map(doc => doc.data());
      rankings = calculateWeeklyRankings(users, engagementData);

      // Cache weekly rankings
      leaderboardCache.weekly.data = rankings;
      leaderboardCache.weekly.lastUpdate = now;
    } else {
      rankings = calculateGlobalRankings(users);

      // Cache global rankings
      leaderboardCache.global.data = rankings;
      leaderboardCache.global.lastUpdate = now;
    }

    res.json({
      ok: true,
      rankings: rankings.slice(0, parseInt(limit)),
      total_users: users.length,
      cached: false
    });
  } catch (error) {
    console.error('Error fetching global rankings:', error);
    res.status(500).json({ error: 'Failed to fetch rankings' });
  }
});

// Get specialty-specific rankings
router.get('/specialty/:specialty', async (req, res) => {
  try {
    const { specialty } = req.params;
    const { limit = 100 } = req.query;
    const now = Date.now();

    // Check cache
    const cacheKey = specialty.toLowerCase();
    if (leaderboardCache.specialty[cacheKey] && 
        (now - leaderboardCache.specialty[cacheKey].lastUpdate) < CACHE_TTL) {
      return res.json({
        ok: true,
        specialty,
        rankings: leaderboardCache.specialty[cacheKey].data.slice(0, parseInt(limit)),
        cached: true
      });
    }

    // Fetch users for this specialty
    const snapshot = await db.collection('users')
      .where('specialty', '==', specialty)
      .get();

    const users = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));

    const rankings = calculateSpecialtyRankings(users, specialty);

    // Cache specialty rankings
    leaderboardCache.specialty[cacheKey] = {
      data: rankings,
      lastUpdate: now
    };

    res.json({
      ok: true,
      specialty,
      rankings: rankings.slice(0, parseInt(limit)),
      total_users: users.length,
      cached: false
    });
  } catch (error) {
    console.error('Error fetching specialty rankings:', error);
    res.status(500).json({ error: 'Failed to fetch specialty rankings' });
  }
});

// Get regional rankings
router.get('/region/:region', async (req, res) => {
  try {
    const { region } = req.params;
    const { limit = 100 } = req.query;
    const now = Date.now();

    // Check cache
    const cacheKey = region.toLowerCase();
    if (leaderboardCache.regional[cacheKey] && 
        (now - leaderboardCache.regional[cacheKey].lastUpdate) < CACHE_TTL) {
      return res.json({
        ok: true,
        region,
        rankings: leaderboardCache.regional[cacheKey].data.slice(0, parseInt(limit)),
        cached: true
      });
    }

    // Fetch users for this region
    const snapshot = await db.collection('users')
      .where('region', '==', region)
      .get();

    const users = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));

    const rankings = calculateRegionalRankings(users, region);

    // Cache regional rankings
    leaderboardCache.regional[cacheKey] = {
      data: rankings,
      lastUpdate: now
    };

    res.json({
      ok: true,
      region,
      rankings: rankings.slice(0, parseInt(limit)),
      total_users: users.length,
      cached: false
    });
  } catch (error) {
    console.error('Error fetching regional rankings:', error);
    res.status(500).json({ error: 'Failed to fetch regional rankings' });
  }
});

// Get user's position and tier
router.get('/user/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    // Get user data
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    // Get global rankings
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));

    const globalRankings = calculateGlobalRankings(users);
    const userRanking = globalRankings.find(r => r.uid === uid);

    if (!userRanking) {
      return res.status(404).json({ error: 'User ranking not found' });
    }

    // Get specialty ranking if user has specialty
    let specialtyRank = null;
    if (userData.specialty) {
      const specialtyRankings = calculateSpecialtyRankings(users, userData.specialty);
      const specialtyRanking = specialtyRankings.find(r => r.uid === uid);
      specialtyRank = specialtyRanking?.rank || null;
    }

    // Get tier info
    const tierBadge = getTierBadge(userRanking.tier);
    const nextTierInfo = getXpToNextTier(userData.xp || 0, userRanking.tier);

    // Get rank history for change calculation
    const historyDoc = await db.collection('leaderboard_history')
      .doc(uid)
      .get();

    let rankChange = { change: 0, direction: 'new' };
    if (historyDoc.exists) {
      const history = historyDoc.data();
      rankChange = calculateRankChange(userRanking.rank, history.previous_rank);
    }

    // Update rank history
    await db.collection('leaderboard_history').doc(uid).set({
      previous_rank: userRanking.rank,
      updated_at: new Date().toISOString()
    }, { merge: true });

    res.json({
      ok: true,
      user: {
        uid,
        display_name: userData.display_name,
        global_rank: userRanking.rank,
        specialty_rank: specialtyRank,
        xp: userData.xp || 0,
        streak: userData.streak || 0,
        percentile: userRanking.percentile,
        tier: userRanking.tier,
        tier_badge: tierBadge,
        specialty: userData.specialty,
        region: userData.region
      },
      rank_change: rankChange,
      next_tier: nextTierInfo,
      total_users: users.length
    });
  } catch (error) {
    console.error('Error fetching user ranking:', error);
    res.status(500).json({ error: 'Failed to fetch user ranking' });
  }
});

// Force cache refresh (admin only - add auth later)
router.post('/refresh', async (req, res) => {
  try {
    // Clear all caches
    leaderboardCache = {
      global: { data: null, lastUpdate: 0 },
      weekly: { data: null, lastUpdate: 0 },
      specialty: {},
      regional: {}
    };

    res.json({
      ok: true,
      message: 'Cache cleared, rankings will refresh on next request'
    });
  } catch (error) {
    console.error('Error refreshing cache:', error);
    res.status(500).json({ error: 'Failed to refresh cache' });
  }
});

// Get available specialties with user counts
router.get('/specialties', async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    const specialtyCounts = {};

    snapshot.docs.forEach(doc => {
      const specialty = doc.data().specialty;
      if (specialty) {
        specialtyCounts[specialty] = (specialtyCounts[specialty] || 0) + 1;
      }
    });

    const specialties = Object.entries(specialtyCounts)
      .map(([name, count]) => ({ name, user_count: count }))
      .sort((a, b) => b.user_count - a.user_count);

    res.json({
      ok: true,
      specialties
    });
  } catch (error) {
    console.error('Error fetching specialties:', error);
    res.status(500).json({ error: 'Failed to fetch specialties' });
  }
});

export default router;
