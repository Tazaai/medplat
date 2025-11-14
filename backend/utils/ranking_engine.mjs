/**
 * Ranking Engine
 * Calculates user rankings, tiers, and leaderboard positions
 */

/**
 * Calculate global rankings based on XP
 */
export function calculateGlobalRankings(users) {
  if (!users || users.length === 0) {
    return [];
  }

  // Sort users by XP descending, then by streak as tiebreaker
  const sorted = [...users].sort((a, b) => {
    if (b.xp !== a.xp) return b.xp - a.xp;
    return (b.streak || 0) - (a.streak || 0);
  });

  // Assign ranks and calculate tiers
  return sorted.map((user, index) => {
    const rank = index + 1;
    const percentile = ((sorted.length - rank) / sorted.length) * 100;
    const tier = calculateTier(percentile, user.xp);

    return {
      uid: user.uid,
      display_name: user.display_name || 'Anonymous',
      rank,
      xp: user.xp || 0,
      streak: user.streak || 0,
      percentile: Math.round(percentile * 10) / 10,
      tier,
      specialty: user.specialty || 'General'
    };
  });
}

/**
 * Calculate specialty-specific rankings
 */
export function calculateSpecialtyRankings(users, specialty) {
  const filtered = users.filter(u => u.specialty === specialty);
  return calculateGlobalRankings(filtered);
}

/**
 * Calculate regional rankings
 */
export function calculateRegionalRankings(users, region) {
  const filtered = users.filter(u => u.region === region);
  return calculateGlobalRankings(filtered);
}

/**
 * Calculate tier based on percentile and XP
 */
export function calculateTier(percentile, xp = 0) {
  // Diamond: Top 1% AND at least 50,000 XP
  if (percentile >= 99 && xp >= 50000) return 'Diamond';
  
  // Platinum: Top 5% AND at least 25,000 XP
  if (percentile >= 95 && xp >= 25000) return 'Platinum';
  
  // Gold: Top 15% AND at least 10,000 XP
  if (percentile >= 85 && xp >= 10000) return 'Gold';
  
  // Silver: Top 40% AND at least 5,000 XP
  if (percentile >= 60 && xp >= 5000) return 'Silver';
  
  // Bronze: Everyone else with at least 1,000 XP
  if (xp >= 1000) return 'Bronze';
  
  // Unranked: Less than 1,000 XP
  return 'Unranked';
}

/**
 * Get tier badge emoji
 */
export function getTierBadge(tier) {
  const badges = {
    'Diamond': '💎',
    'Platinum': '🏆',
    'Gold': '🥇',
    'Silver': '🥈',
    'Bronze': '🥉',
    'Unranked': '⚪'
  };
  return badges[tier] || '⚪';
}

/**
 * Calculate XP required for next tier
 */
export function getXpToNextTier(currentXp, currentTier) {
  const tierThresholds = {
    'Unranked': 1000,
    'Bronze': 5000,
    'Silver': 10000,
    'Gold': 25000,
    'Platinum': 50000,
    'Diamond': Infinity
  };

  const nextTiers = {
    'Unranked': 'Bronze',
    'Bronze': 'Silver',
    'Silver': 'Gold',
    'Gold': 'Platinum',
    'Platinum': 'Diamond',
    'Diamond': null
  };

  const nextTier = nextTiers[currentTier];
  if (!nextTier) return { nextTier: null, xpRequired: 0 };

  const xpRequired = tierThresholds[nextTier] - currentXp;
  return {
    nextTier,
    xpRequired: Math.max(0, xpRequired)
  };
}

/**
 * Calculate weekly rankings with decay factor
 * Recent activity weighted more heavily
 */
export function calculateWeeklyRankings(users, engagementData) {
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;

  const scoredUsers = users.map(user => {
    // Get user's engagement events from last week
    const userEvents = engagementData.filter(e => 
      e.uid === user.uid && 
      (now - new Date(e.timestamp).getTime()) <= oneWeek
    );

    // Calculate weekly score with recency weighting
    let weeklyScore = 0;
    userEvents.forEach(event => {
      const age = now - new Date(event.timestamp).getTime();
      const recencyFactor = 1 - (age / oneWeek); // 1.0 for today, 0.0 for 7 days ago
      weeklyScore += (event.xp_earned || 10) * (0.5 + 0.5 * recencyFactor);
    });

    return {
      ...user,
      weekly_score: Math.round(weeklyScore),
      weekly_events: userEvents.length
    };
  });

  // Sort by weekly score
  return scoredUsers
    .sort((a, b) => b.weekly_score - a.weekly_score)
    .map((user, index) => ({
      uid: user.uid,
      display_name: user.display_name || 'Anonymous',
      rank: index + 1,
      weekly_score: user.weekly_score,
      weekly_events: user.weekly_events,
      specialty: user.specialty || 'General'
    }));
}

/**
 * Get user's rank change since last period
 */
export function calculateRankChange(currentRank, previousRank) {
  if (!previousRank) return { change: 0, direction: 'new' };
  
  const change = previousRank - currentRank; // Positive = improved rank
  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'same';
  
  return {
    change: Math.abs(change),
    direction
  };
}

/**
 * Calculate percentile rank
 */
export function calculatePercentile(rank, totalUsers) {
  if (totalUsers === 0) return 0;
  return Math.round(((totalUsers - rank) / totalUsers) * 100 * 10) / 10;
}
