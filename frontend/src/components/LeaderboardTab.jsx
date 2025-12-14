import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Trophy, Medal, Award, TrendingUp, Users, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { API_BASE } from '../config';

const TIER_BADGES = {
  diamond: { emoji: '💎', label: 'Diamond', color: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  platinum: { emoji: '🏆', label: 'Platinum', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  gold: { emoji: '🥇', label: 'Gold', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  silver: { emoji: '🥈', label: 'Silver', color: 'bg-slate-100 text-slate-800 border-slate-300' },
  bronze: { emoji: '🥉', label: 'Bronze', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  unranked: { emoji: '⚪', label: 'Unranked', color: 'bg-gray-100 text-gray-800 border-gray-300' }
};

export default function LeaderboardTab({ uid }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [userPosition, setUserPosition] = useState(null);
  const [specialties, setSpecialties] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('all-time');
  const [selectedSpecialty, setSelectedSpecialty] = useState('global');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
    loadSpecialties();
  }, [selectedPeriod, selectedSpecialty]);

  useEffect(() => {
    if (uid) {
      loadUserPosition();
    }
  }, [uid]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      let url;
      
      if (selectedSpecialty === 'global') {
        url = `${API_BASE}/api/leaderboard/global?period=${selectedPeriod}&limit=100`;
      } else {
        url = `${API_BASE}/api/leaderboard/specialty/${selectedSpecialty}?limit=100`;
      }

      const res = await fetch(url);
      const data = await res.json();
      
      if (data.ok) {
        setLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPosition = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/leaderboard/user/${uid}`);
      const data = await res.json();
      
      if (data.ok) {
        setUserPosition(data.position);
      }
    } catch (err) {
      console.error('Failed to load user position:', err);
    }
  };

  const loadSpecialties = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/leaderboard/specialties`);
      const data = await res.json();
      
      if (data.ok) {
        setSpecialties(data.specialties || []);
      }
    } catch (err) {
      console.error('Failed to load specialties:', err);
    }
  };

  const getTierBadge = (tier) => {
    const badge = TIER_BADGES[tier] || TIER_BADGES.unranked;
    return badge;
  };

  const getRankDisplay = (rank) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-orange-600" />;
    return <span className="text-muted-foreground font-mono">#{rank}</span>;
  };

  const getRankChangeIcon = (change) => {
    if (!change || change === 'same') return null;
    if (change === 'up') return <TrendingUp className="h-4 w-4 text-green-600" />;
    return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Leaderboard</h2>
          <p className="text-muted-foreground">
            Compete with clinicians worldwide
          </p>
        </div>
        <Trophy className="h-12 w-12 text-amber-500" />
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-time">All Time</SelectItem>
              <SelectItem value="weekly">This Week</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select specialty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">🌍 Global</SelectItem>
            {specialties.map((spec) => (
              <SelectItem key={spec.specialty} value={spec.specialty}>
                {spec.specialty} ({spec.user_count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* User Position Card */}
      {userPosition && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-blue-600" />
              Your Position
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Rank</div>
                <div className="text-2xl font-bold flex items-center gap-2">
                  {getRankDisplay(userPosition.rank)}
                  {getRankChangeIcon(userPosition.rank_change)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Tier</div>
                <div className="flex items-center gap-2">
                  <Badge className={getTierBadge(userPosition.tier).color}>
                    {getTierBadge(userPosition.tier).emoji} {getTierBadge(userPosition.tier).label}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total XP</div>
                <div className="text-2xl font-bold">{userPosition.xp?.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Percentile</div>
                <div className="text-2xl font-bold">{userPosition.percentile?.toFixed(1)}%</div>
              </div>
            </div>
            {userPosition.xp_to_next_tier && (
              <div className="mt-4 text-sm text-muted-foreground">
                {userPosition.xp_to_next_tier.toLocaleString()} XP to next tier
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top {leaderboard.length} Clinicians</CardTitle>
          <CardDescription>
            {selectedPeriod === 'weekly' ? 'This week\'s' : 'All-time'} rankings
            {selectedSpecialty !== 'global' && ` in ${selectedSpecialty}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {leaderboard.map((user, index) => {
              const tierBadge = getTierBadge(user.tier);
              const isCurrentUser = uid && user.uid === uid;

              return (
                <div
                  key={user.uid}
                  className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                    isCurrentUser 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Rank */}
                  <div className="w-12 flex items-center justify-center">
                    {getRankDisplay(user.rank)}
                  </div>

                  {/* User Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {isCurrentUser ? 'You' : `User ${user.uid.substring(0, 8)}`}
                      </span>
                      <Badge variant="outline" className={tierBadge.color}>
                        {tierBadge.emoji} {tierBadge.label}
                      </Badge>
                    </div>
                    {user.specialty && (
                      <div className="text-sm text-muted-foreground">{user.specialty}</div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="text-right">
                    <div className="font-bold text-lg">{user.xp?.toLocaleString()} XP</div>
                    <div className="text-sm text-muted-foreground">
                      {user.percentile?.toFixed(1)}th percentile
                    </div>
                  </div>

                  {/* Rank Change */}
                  {user.rank_change && (
                    <div className="w-8">
                      {getRankChangeIcon(user.rank_change)}
                    </div>
                  )}
                </div>
              );
            })}

            {leaderboard.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No leaderboard data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
