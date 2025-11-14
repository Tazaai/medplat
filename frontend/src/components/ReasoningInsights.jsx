// frontend/src/components/ReasoningInsights.jsx — Reasoning pattern analysis and insights

import React from 'react';

export default function ReasoningInsights({ reasoningAnalysis, comparisonResult }) {
	if (!reasoningAnalysis && !comparisonResult) {
		return (
			<div className="reasoning-insights">
				<h3>💡 Reasoning Insights</h3>
				<p>Complete a differential diagnosis comparison or multi-step case to see your reasoning insights.</p>
				<div className="insights-placeholder">
					<div className="placeholder-card">
						<h4>🧠 Reasoning Pattern Analysis</h4>
						<p>Understand your cognitive approach to diagnosis</p>
					</div>
					<div className="placeholder-card">
						<h4>⚠️ Cognitive Bias Detection</h4>
						<p>Identify and mitigate common diagnostic biases</p>
					</div>
					<div className="placeholder-card">
						<h4>📈 Performance Tracking</h4>
						<p>Monitor your diagnostic accuracy over time</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="reasoning-insights">
			<h3>💡 Your Reasoning Insights</h3>

			{/* Reasoning pattern analysis */}
			{reasoningAnalysis && (
				<div className="insight-section">
					<h4>🧠 Reasoning Pattern Analysis</h4>
					<div className="insight-stats">
						<div className="stat-box">
							<div className="stat-label">Primary Pattern</div>
							<div className="stat-value">{reasoningAnalysis.primary_pattern}</div>
						</div>
						<div className="stat-box">
							<div className="stat-label">System Type</div>
							<div className="stat-value">{reasoningAnalysis.system_type}</div>
						</div>
						<div className="stat-box">
							<div className="stat-label">Reasoning Score</div>
							<div className="stat-value">{reasoningAnalysis.reasoning_score}/100</div>
						</div>
					</div>

					{reasoningAnalysis.expert_comment && (
						<div className="expert-comment">
							<h5>👨‍⚕️ Expert Assessment</h5>
							<p>{reasoningAnalysis.expert_comment}</p>
						</div>
					)}

					{/* Cognitive biases */}
					{reasoningAnalysis.biases_detected?.length > 0 && (
						<div className="biases-section">
							<h5>⚠️ Cognitive Biases Detected</h5>
							{reasoningAnalysis.biases_detected.map((bias, index) => (
								<div key={index} className="bias-card">
									<h6>{bias.bias}</h6>
									<p><strong>Evidence:</strong> {bias.evidence}</p>
									<p><strong>How to mitigate:</strong> {bias.mitigation}</p>
								</div>
							))}
						</div>
					)}

					{/* Strengths */}
					{reasoningAnalysis.strengths?.length > 0 && (
						<div className="strengths-section">
							<h5>✅ Your Strengths</h5>
							<ul>
								{reasoningAnalysis.strengths.map((strength, index) => (
									<li key={index}>{strength}</li>
								))}
							</ul>
						</div>
					)}

					{/* Areas for improvement */}
					{reasoningAnalysis.improvements?.length > 0 && (
						<div className="improvements-section">
							<h5>📚 Areas for Improvement</h5>
							<ul>
								{reasoningAnalysis.improvements.map((improvement, index) => (
									<li key={index}>{improvement}</li>
								))}
							</ul>
						</div>
					)}

					{/* Recommendations */}
					{reasoningAnalysis.recommendations?.length > 0 && (
						<div className="recommendations-section">
							<h5>📖 Learning Resources</h5>
							<ul>
								{reasoningAnalysis.recommendations.map((rec, index) => (
									<li key={index}>{rec}</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}

			{/* Comparison insights */}
			{comparisonResult && (
				<div className="insight-section">
					<h4>📊 Diagnostic Performance</h4>
					<div className="performance-summary">
						<div className="perf-stat">
							<span className="perf-label">Overall Performance:</span>
							<span className={`perf-badge ${getPerformanceClass(comparisonResult.performance_level)}`}>
								{comparisonResult.performance_level}
							</span>
						</div>
						<div className="perf-stat">
							<span className="perf-label">Overall Score:</span>
							<span className="perf-value">{comparisonResult.overall_score}/100</span>
						</div>
						<div className="perf-stat">
							<span className="perf-label">Differential Overlap:</span>
							<span className="perf-value">{comparisonResult.overlap_score}%</span>
						</div>
					</div>

					{comparisonResult.feedback && (
						<div className="detailed-feedback">
							<h5>💬 Detailed Feedback</h5>
							<p>{comparisonResult.feedback}</p>
						</div>
					)}
				</div>
			)}

			{/* General tips */}
			<div className="insight-section tips-section">
				<h4>💡 Tips for Better Diagnostic Reasoning</h4>
				<div className="tips-grid">
					<div className="tip-card">
						<h5>🎯 Use System 2 Thinking</h5>
						<p>Slow down for complex cases. Use deliberate, analytical reasoning instead of pattern recognition alone.</p>
					</div>
					<div className="tip-card">
						<h5>📋 Generate Broad Differentials</h5>
						<p>List 5-10 diagnoses before narrowing down. Include "must not miss" life-threatening conditions.</p>
					</div>
					<div className="tip-card">
						<h5>🔄 Update with Bayesian Reasoning</h5>
						<p>Consciously update probabilities as new information emerges. Ask "How does this change my assessment?"</p>
					</div>
					<div className="tip-card">
						<h5>⚠️ Watch for Biases</h5>
						<p>Common traps: anchoring (fixating on first impression), premature closure, confirmation bias.</p>
					</div>
					<div className="tip-card">
						<h5>🎓 Learn Pattern Recognition</h5>
						<p>Build mental libraries of classic presentations through cases and reading.</p>
					</div>
					<div className="tip-card">
						<h5>🤔 Metacognition</h5>
						<p>Reflect on your reasoning process. What worked? What could improve? Learn from mistakes.</p>
					</div>
				</div>
			</div>
		</div>
	);
}

function getPerformanceClass(level) {
	switch (level) {
		case 'Excellent':
			return 'excellent';
		case 'Good':
			return 'good';
		case 'Fair':
			return 'fair';
		case 'Needs Improvement':
			return 'needs-improvement';
		default:
			return '';
	}
}
