// frontend/src/components/AdminECGAnalytics.jsx — Phase 12: Admin Analytics Dashboard
// Real-time analytics for ECG module usage, progress, and weaknesses

import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';
import './AdminECGAnalytics.css';
import {
	BarChart,
	Bar,
	LineChart,
	Line,
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

export default function AdminECGAnalytics() {
	const [usage, setUsage] = useState(null);
	const [progress, setProgress] = useState(null);
	const [weaknesses, setWeaknesses] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [activeTab, setActiveTab] = useState('usage'); // usage | progress | weaknesses
	
	// Load analytics data
	useEffect(() => {
		loadAnalytics();
	}, []);
	
	const loadAnalytics = async () => {
		setLoading(true);
		setError(null);
		
		try {
			const [usageRes, progressRes, weaknessesRes] = await Promise.all([
				fetch(`${API_BASE}/api/ecg/admin/usage`),
				fetch(`${API_BASE}/api/ecg/admin/progress`),
				fetch(`${API_BASE}/api/ecg/admin/weaknesses`)
			]);
			
			if (!usageRes.ok || !progressRes.ok || !weaknessesRes.ok) {
				throw new Error('Failed to load analytics data');
			}
			
			const usageData = await usageRes.json();
			const progressData = await progressRes.json();
			const weaknessesData = await weaknessesRes.json();
			
			setUsage(usageData.usage);
			setProgress(progressData.progress);
			setWeaknesses(weaknessesData.weaknesses);
			
		} catch (err) {
			console.error('❌ Failed to load analytics:', err);
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};
	
	// Render: Loading state
	if (loading) {
		return (
			<div className="admin-ecg-analytics">
				<div className="loading-state">
					<div className="spinner" />
					<p>Loading analytics...</p>
				</div>
			</div>
		);
	}
	
	// Render: Error state
	if (error) {
		return (
			<div className="admin-ecg-analytics">
				<div className="error-state">
					<div className="error-icon">⚠️</div>
					<p>Failed to load analytics: {error}</p>
					<button onClick={loadAnalytics} className="retry-btn">Retry</button>
				</div>
			</div>
		);
	}
	
	// Render: Main dashboard
	return (
		<div className="admin-ecg-analytics">
			<div className="dashboard-header">
				<h1>📊 ECG Module Analytics</h1>
				<button onClick={loadAnalytics} className="refresh-btn">🔄 Refresh</button>
			</div>
			
			{/* Tab Navigation */}
			<div className="analytics-tabs">
				<button
					onClick={() => setActiveTab('usage')}
					className={activeTab === 'usage' ? 'active' : ''}
				>
					📈 Usage Stats
				</button>
				<button
					onClick={() => setActiveTab('progress')}
					className={activeTab === 'progress' ? 'active' : ''}
				>
					🎯 Progress Trends
				</button>
				<button
					onClick={() => setActiveTab('weaknesses')}
					className={activeTab === 'weaknesses' ? 'active' : ''}
				>
					🔍 Weak Areas
				</button>
			</div>
			
			{/* Usage Tab */}
			{activeTab === 'usage' && usage && (
				<div className="analytics-content">
					<div className="stats-grid">
						<div className="stat-card">
							<div className="stat-icon">👥</div>
							<div className="stat-value">{usage.total_users.toLocaleString()}</div>
							<div className="stat-label">Total Users</div>
						</div>
						<div className="stat-card">
							<div className="stat-icon">📅</div>
							<div className="stat-value">{usage.active_last_7_days.toLocaleString()}</div>
							<div className="stat-label">Active (7 days)</div>
						</div>
						<div className="stat-card">
							<div className="stat-icon">🎯</div>
							<div className="stat-value">{usage.total_sessions.toLocaleString()}</div>
							<div className="stat-label">Total Sessions</div>
						</div>
						<div className="stat-card">
							<div className="stat-icon">⏱️</div>
							<div className="stat-value">{usage.avg_session_duration_minutes.toFixed(1)} min</div>
							<div className="stat-label">Avg Session</div>
						</div>
						<div className="stat-card">
							<div className="stat-icon">📝</div>
							<div className="stat-value">{usage.total_cases_attempted.toLocaleString()}</div>
							<div className="stat-label">Cases Attempted</div>
						</div>
						<div className="stat-card">
							<div className="stat-icon">✅</div>
							<div className="stat-value">{usage.total_quizzes_completed.toLocaleString()}</div>
							<div className="stat-label">Quizzes Completed</div>
						</div>
						<div className="stat-card">
							<div className="stat-icon">🎓</div>
							<div className="stat-value">{usage.total_exams_taken}</div>
							<div className="stat-label">Exams Taken</div>
						</div>
						<div className="stat-card">
							<div className="stat-icon">🏆</div>
							<div className="stat-value">{usage.exam_pass_rate.toFixed(1)}%</div>
							<div className="stat-label">Exam Pass Rate</div>
						</div>
					</div>
					
					<div className="charts-row">
						<div className="chart-card">
							<h3>Popular Categories</h3>
							<ResponsiveContainer width="100%" height={300}>
								<BarChart data={usage.most_popular_categories}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="category" />
									<YAxis />
									<Tooltip />
									<Bar dataKey="sessions" fill="#667eea" />
								</BarChart>
							</ResponsiveContainer>
						</div>
						
						<div className="chart-card">
							<h3>Difficulty Distribution</h3>
							<ResponsiveContainer width="100%" height={300}>
								<PieChart>
									<Pie
										data={Object.entries(usage.difficulty_distribution).map(([key, value]) => ({
											name: key,
											value
										}))}
										cx="50%"
										cy="50%"
										labelLine={false}
										label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
										outerRadius={100}
										fill="#8884d8"
										dataKey="value"
									>
										{Object.keys(usage.difficulty_distribution).map((entry, index) => (
											<Cell key={`cell-${index}`} fill={['#667eea', '#764ba2', '#f093fb', '#4facfe'][index % 4]} />
										))}
									</Pie>
									<Tooltip />
								</PieChart>
							</ResponsiveContainer>
						</div>
					</div>
					
					<div className="chart-card">
						<h3>Peak Usage Hours</h3>
						<ResponsiveContainer width="100%" height={250}>
							<LineChart data={usage.peak_usage_hours}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="hour" label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5 }} />
								<YAxis label={{ value: 'Sessions', angle: -90, position: 'insideLeft' }} />
								<Tooltip />
								<Legend />
								<Line type="monotone" dataKey="sessions" stroke="#667eea" strokeWidth={2} />
							</LineChart>
						</ResponsiveContainer>
					</div>
				</div>
			)}
			
			{/* Progress Tab */}
			{activeTab === 'progress' && progress && (
				<div className="analytics-content">
					<div className="stats-grid">
						<div className="stat-card">
							<div className="stat-icon">📊</div>
							<div className="stat-value">{progress.avg_level.toFixed(1)}</div>
							<div className="stat-label">Avg Level</div>
						</div>
						<div className="stat-card">
							<div className="stat-icon">⭐</div>
							<div className="stat-value">{progress.avg_xp.toLocaleString()}</div>
							<div className="stat-label">Avg XP</div>
						</div>
						<div className="stat-card">
							<div className="stat-icon">🎯</div>
							<div className="stat-value">{progress.certification_stats.avg_score.toFixed(1)}%</div>
							<div className="stat-label">Avg Exam Score</div>
						</div>
						<div className="stat-card">
							<div className="stat-icon">⏱️</div>
							<div className="stat-value">{progress.certification_stats.avg_time_minutes.toFixed(1)} min</div>
							<div className="stat-label">Avg Exam Time</div>
						</div>
					</div>
					
					<div className="charts-row">
						<div className="chart-card">
							<h3>Level Distribution</h3>
							<ResponsiveContainer width="100%" height={300}>
								<BarChart data={progress.level_distribution}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="level" />
									<YAxis />
									<Tooltip />
									<Bar dataKey="users" fill="#764ba2" />
								</BarChart>
							</ResponsiveContainer>
						</div>
						
						<div className="chart-card">
							<h3>Accuracy by Category</h3>
							<ResponsiveContainer width="100%" height={300}>
								<BarChart 
									data={Object.entries(progress.avg_accuracy_by_category).map(([key, value]) => ({
										category: key,
										accuracy: value
									}))}
								>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="category" />
									<YAxis domain={[0, 100]} />
									<Tooltip />
									<Bar dataKey="accuracy" fill="#2ecc71" />
								</BarChart>
							</ResponsiveContainer>
						</div>
					</div>
					
					<div className="chart-card">
						<h3>Streak Distribution</h3>
						<ResponsiveContainer width="100%" height={250}>
							<BarChart 
								data={Object.entries(progress.streak_distribution).map(([key, value]) => ({
									range: key,
									users: value
								}))}
							>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="range" />
								<YAxis />
								<Tooltip />
								<Bar dataKey="users" fill="#f093fb" />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
			)}
			
			{/* Weaknesses Tab */}
			{activeTab === 'weaknesses' && weaknesses && (
				<div className="analytics-content">
					<div className="chart-card">
						<h3>Weak Areas by Category</h3>
						<ResponsiveContainer width="100%" height={300}>
							<BarChart data={weaknesses.by_category}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="category" />
								<YAxis yAxisId="left" orientation="left" stroke="#e74c3c" />
								<YAxis yAxisId="right" orientation="right" stroke="#3498db" />
								<Tooltip />
								<Legend />
								<Bar yAxisId="left" dataKey="avg_accuracy" fill="#e74c3c" name="Avg Accuracy %" />
								<Bar yAxisId="right" dataKey="users_struggling" fill="#3498db" name="Users Struggling" />
							</BarChart>
						</ResponsiveContainer>
					</div>
					
					<div className="tables-row">
						<div className="table-card">
							<h3>Most Failed Questions</h3>
							<table>
								<thead>
									<tr>
										<th>ID</th>
										<th>Diagnosis</th>
										<th>Failure Rate</th>
									</tr>
								</thead>
								<tbody>
									{weaknesses.most_failed_questions.map(q => (
										<tr key={q.question_id}>
											<td>{q.question_id}</td>
											<td>{q.diagnosis}</td>
											<td className="failure-rate">{q.failure_rate.toFixed(1)}%</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						
						<div className="table-card">
							<h3>Difficulty Performance</h3>
							<table>
								<thead>
									<tr>
										<th>Level</th>
										<th>Avg Accuracy</th>
										<th>Completion</th>
									</tr>
								</thead>
								<tbody>
									{Object.entries(weaknesses.by_difficulty).map(([level, data]) => (
										<tr key={level}>
											<td>{level}</td>
											<td>{data.avg_accuracy.toFixed(1)}%</td>
											<td>{data.completion_rate.toFixed(1)}%</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
					
					<div className="recommendations-card">
						<h3>📌 Improvement Recommendations</h3>
						<ul>
							{weaknesses.improvement_recommendations.map((rec, idx) => (
								<li key={idx}>{rec}</li>
							))}
						</ul>
					</div>
				</div>
			)}
		</div>
	);
}
