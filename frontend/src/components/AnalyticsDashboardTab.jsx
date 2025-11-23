import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BarChart3, Users, Trophy, BookOpen, TrendingUp, Download, Activity } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://medplat-backend-139218747785.europe-west1.run.app';

export default function AnalyticsDashboardTab({ uid, isAdmin }) {
  const [overview, setOverview] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [pathwayStats, setPathwayStats] = useState(null);
  const [leaderboardStats, setLeaderboardStats] = useState(null);
  const [examStats, setExamStats] = useState(null);
  const [activityTimeline, setActivityTimeline] = useState([]);
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    loadAllData();
  }, [isAdmin, timeRange]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadOverview(),
        loadUserStats(),
        loadPathwayStats(),
        loadLeaderboardStats(),
        loadExamStats(),
        loadActivityTimeline()
      ]);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOverview = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/analytics_dashboard/overview?range=${timeRange}`);
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      }
    } catch (err) {
      console.error('Failed to load overview:', err);
    }
  };

  const loadUserStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/analytics_dashboard/users`);
      if (res.ok) {
        const data = await res.json();
        setUserStats(data);
      }
    } catch (err) {
      console.error('Failed to load user stats:', err);
    }
  };

  const loadPathwayStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/analytics_dashboard/pathways`);
      if (res.ok) {
        const data = await res.json();
        setPathwayStats(data);
      }
    } catch (err) {
      console.error('Failed to load pathway stats:', err);
    }
  };

  const loadLeaderboardStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/analytics_dashboard/leaderboard_stats`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboardStats(data);
      }
    } catch (err) {
      console.error('Failed to load leaderboard stats:', err);
    }
  };

  const loadExamStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/analytics_dashboard/exam_stats`);
      if (res.ok) {
        const data = await res.json();
        setExamStats(data);
      }
    } catch (err) {
      console.error('Failed to load exam stats:', err);
    }
  };

  const loadActivityTimeline = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/analytics_dashboard/activity_timeline?granularity=day&range=${timeRange}`);
      if (res.ok) {
        const data = await res.json();
        setActivityTimeline(data.timeline || []);
      }
    } catch (err) {
      console.error('Failed to load activity timeline:', err);
    }
  };

  const exportData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/analytics_dashboard/export?format=csv`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `medplat-analytics-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Failed to export data:', err);
      alert('Failed to export data. Please try again.');
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Admin access required to view analytics dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <div className="p-4">Loading analytics...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header with controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-6 w-6" />
                <CardTitle>Analytics Dashboard</CardTitle>
              </div>
              <CardDescription>Platform performance metrics and insights</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={exportData} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Overview metrics */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold">{overview.total_users || 0}</p>
                {overview.user_growth && (
                  <Badge variant={overview.user_growth > 0 ? 'default' : 'secondary'} className="text-xs">
                    {overview.user_growth > 0 ? '+' : ''}{overview.user_growth}%
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold">{overview.active_users || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {overview.total_users > 0 ? Math.round((overview.active_users / overview.total_users) * 100) : 0}%
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total XP Earned</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{overview.total_xp?.toLocaleString() || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Quizzes Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{overview.quizzes_completed?.toLocaleString() || 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User engagement stats */}
      {userStats && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle className="text-lg">User Engagement</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Avg Session/User</p>
                <p className="text-2xl font-bold">{userStats.avg_sessions_per_user || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg XP/User</p>
                <p className="text-2xl font-bold">{Math.round(userStats.avg_xp_per_user || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Retention Rate</p>
                <p className="text-2xl font-bold">{userStats.retention_rate || 0}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">DAU/MAU Ratio</p>
                <p className="text-2xl font-bold">{userStats.dau_mau_ratio || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pathway performance */}
      {pathwayStats && pathwayStats.pathways && pathwayStats.pathways.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <CardTitle className="text-lg">Certification Pathways</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pathwayStats.pathways.map((pathway, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <p className="font-medium">{pathway.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {pathway.enrollments} enrolled · {pathway.completions} completed
                    </p>
                  </div>
                  <Badge>
                    {pathway.enrollments > 0 
                      ? Math.round((pathway.completions / pathway.enrollments) * 100) 
                      : 0}% completion
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard distribution */}
      {leaderboardStats && leaderboardStats.tier_distribution && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              <CardTitle className="text-lg">Leaderboard Tier Distribution</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(leaderboardStats.tier_distribution).map(([tier, count]) => {
                const total = Object.values(leaderboardStats.tier_distribution).reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? (count / total) * 100 : 0;
                
                return (
                  <div key={tier} className="flex justify-between items-center">
                    <span className="capitalize font-medium">{tier}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-16 text-right">
                        {count} ({Math.round(percentage)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exam track performance */}
      {examStats && examStats.tracks && examStats.tracks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <CardTitle className="text-lg">Exam Track Performance</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {examStats.tracks.map((track, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <p className="font-medium">{track.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {track.attempts} attempts · Avg: {Math.round(track.avg_score)}%
                    </p>
                  </div>
                  <Badge variant={track.avg_score >= 60 ? 'default' : 'secondary'}>
                    {Math.round(track.pass_rate)}% pass rate
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity timeline */}
      {activityTimeline.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <CardTitle className="text-lg">Activity Timeline</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activityTimeline.slice(0, 10).map((day, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{day.date}</span>
                  <div className="flex gap-4">
                    <span>{day.active_users} users</span>
                    <span>{day.quizzes_completed} quizzes</span>
                    <span className="font-medium">{day.xp_earned.toLocaleString()} XP</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
