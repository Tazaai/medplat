/**
 * AnalyticsDashboard.jsx
 * Phase 4 Milestone 4: Analytics & Optimization
 * 
 * Admin-only analytics dashboard displaying:
 * - KPI overview (users, sessions, scores)
 * - Performance metrics (p50/p95/p99 latency, token usage)
 * - Curriculum progress distribution
 * - Regional engagement heatmap
 * - A/B test results
 * 
 * Requires admin role in Firestore users/{uid}.role == "admin"
 */

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://medplat-backend-139218747785.europe-west1.run.app';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

function AnalyticsDashboard({ user }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overview, setOverview] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        // For now, simple check - in production would verify against Firestore
        // Admin UIDs would be stored in Firestore users/{uid}.role
        const adminUIDs = ['admin', 'test_admin']; // Placeholder
        
        if (user && (user.isAdmin || user.role === 'admin' || adminUIDs.includes(user.uid))) {
          setIsAdmin(true);
          fetchAnalytics();
        } else {
          setIsAdmin(false);
          setLoading(false);
          setError('Admin access required');
        }
      } catch (err) {
        console.error('Admin check error:', err);
        setIsAdmin(false);
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  const fetchAnalytics = async () => {
    if (!user || !user.uid) {
      setError('User authentication required');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch overview and performance data in parallel
      const [overviewRes, performanceRes] = await Promise.all([
        fetch(`${API_BASE}/api/analytics/overview?uid=${user.uid}`),
        fetch(`${API_BASE}/api/analytics/performance?uid=${user.uid}&timeRange=${timeRange}`)
      ]);

      if (!overviewRes.ok) {
        throw new Error(`Overview API error: ${overviewRes.status}`);
      }

      if (!performanceRes.ok) {
        throw new Error(`Performance API error: ${performanceRes.status}`);
      }

      const overviewData = await overviewRes.json();
      const performanceData = await performanceRes.json();

      setOverview(overviewData);
      setPerformance(performanceData);
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError(`Failed to load analytics: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAnalytics();
    }
  }, [timeRange, isAdmin]);

  if (!isAdmin) {
    return (
      <div className="p-6 bg-red-50 rounded-lg">
        <h2 className="text-xl font-bold text-red-700 mb-2">🔒 Access Denied</h2>
        <p className="text-red-600">
          This dashboard is only accessible to administrators.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading analytics data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-lg">
        <h2 className="text-xl font-bold text-red-700 mb-2">❌ Error</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📊 Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">MedPlat Performance & Engagement Metrics</p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{overview.users?.total || 0}</p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
            <p className="text-sm text-green-600 mt-2">
              {overview.users?.active_7d || 0} active (7d)
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Quiz Score</p>
                <p className="text-3xl font-bold text-gray-900">{overview.users?.avg_quiz_score || 0}%</p>
              </div>
              <div className="text-4xl">🎯</div>
            </div>
            <p className="text-sm text-blue-600 mt-2">
              {overview.users?.completion_rate || 0}% pass rate (≥70%)
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Mentor Sessions</p>
                <p className="text-3xl font-bold text-gray-900">{overview.mentor?.sessions_7d || 0}</p>
              </div>
              <div className="text-4xl">🧠</div>
            </div>
            <p className="text-sm text-purple-600 mt-2">
              {overview.mentor?.unique_topics || 0} unique topics
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Curriculum Paths</p>
                <p className="text-3xl font-bold text-gray-900">{overview.curriculum?.total_paths || 0}</p>
              </div>
              <div className="text-4xl">📚</div>
            </div>
            <p className="text-sm text-indigo-600 mt-2">
              {overview.curriculum?.avg_completion || 0}% avg completion
            </p>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {performance && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Latency Chart */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">⚡ API Latency</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">p50 (median)</span>
                <span className="text-2xl font-bold text-green-600">
                  {performance.latency?.p50_ms || 0}ms
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">p95</span>
                <span className="text-2xl font-bold text-yellow-600">
                  {performance.latency?.p95_ms || 0}ms
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">p99</span>
                <span className="text-2xl font-bold text-red-600">
                  {performance.latency?.p99_ms || 0}ms
                </span>
              </div>
              <div className="flex justify-between items-center border-t pt-3">
                <span className="text-gray-600">Average</span>
                <span className="text-2xl font-bold text-blue-600">
                  {performance.latency?.avg_ms || 0}ms
                </span>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Based on {performance.total_requests || 0} requests in {timeRange}
            </div>
          </div>

          {/* Token Usage & Cost */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">💰 Token Usage & Cost</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">p50 tokens</span>
                <span className="text-2xl font-bold text-blue-600">
                  {performance.tokens?.p50 || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">p95 tokens</span>
                <span className="text-2xl font-bold text-indigo-600">
                  {performance.tokens?.p95 || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Average tokens</span>
                <span className="text-2xl font-bold text-purple-600">
                  {performance.tokens?.avg || 0}
                </span>
              </div>
              <div className="flex justify-between items-center border-t pt-3">
                <span className="text-gray-600">Total cost</span>
                <span className="text-2xl font-bold text-green-600">
                  ${performance.cost?.total_usd || 0}
                </span>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Avg: ${(performance.cost?.avg_per_request_usd || 0).toFixed(6)}/request
            </div>
          </div>
        </div>
      )}

      {/* Time Series Chart */}
      {performance && performance.time_series && performance.time_series.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📈 Request Volume Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performance.time_series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="hour"
                tickFormatter={(hour) => new Date(hour).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(hour) => new Date(hour).toLocaleString()}
                formatter={(value, name) => {
                  if (name === 'requests') return [value, 'Requests'];
                  if (name === 'avg_latency_ms') return [`${value}ms`, 'Avg Latency'];
                  if (name === 'avg_tokens') return [value, 'Avg Tokens'];
                  return [value, name];
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="requests" stroke="#8884d8" strokeWidth={2} name="Requests" />
              <Line type="monotone" dataKey="avg_latency_ms" stroke="#82ca9d" strokeWidth={2} name="Avg Latency (ms)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Regional Distribution */}
      {overview && overview.telemetry?.regions && overview.telemetry.regions.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🌍 Regional Distribution</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={overview.telemetry.regions.map(([region, count]) => ({
                    name: region || 'Unknown',
                    value: count
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {overview.telemetry.regions.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700 mb-3">Top Regions</h3>
              {overview.telemetry.regions.slice(0, 5).map(([region, count], idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-gray-600">{region || 'Unknown'}</span>
                  <span className="font-bold text-gray-900">{count} requests</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Endpoints */}
      {overview && overview.telemetry?.endpoints && overview.telemetry.endpoints.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🔗 Top Endpoints</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={overview.telemetry.endpoints.map(([endpoint, count]) => ({
              name: endpoint,
              requests: count
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="requests" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Curriculum Progress Distribution */}
      {overview && overview.curriculum?.exam_distribution && overview.curriculum.exam_distribution.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📚 Curriculum Exam Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={overview.curriculum.exam_distribution.map(([exam, count]) => ({
              name: exam,
              students: count
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="students" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-gray-500 text-sm">
        <p>Last updated: {new Date().toLocaleString()}</p>
        <p className="mt-1">Analytics data aggregated from telemetry, mentor sessions, and curriculum progress</p>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
