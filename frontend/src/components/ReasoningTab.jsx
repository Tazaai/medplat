// frontend/src/components/ReasoningTab.jsx — Phase 7 M1: AI Reasoning Engine UI
// Interactive differential diagnosis builder with Bayesian analysis

import React, { useState } from 'react';
import DifferentialBuilder from './DifferentialBuilder';
import BayesianCalculator from './BayesianCalculator';
import MultiStepCase from './MultiStepCase';
import ReasoningInsights from './ReasoningInsights';
import './ReasoningTab.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://medplat-backend-139218747785.europe-west1.run.app';

export default function ReasoningTab({ caseData }) {
	const [activeSubTab, setActiveSubTab] = useState('differential');
	const [expertDifferential, setExpertDifferential] = useState(null);
	const [studentDifferentials, setStudentDifferentials] = useState([]);
	const [comparisonResult, setComparisonResult] = useState(null);
	const [reasoningAnalysis, setReasoningAnalysis] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	// Generate expert differential
	const handleGenerateExpertDifferential = async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetch(`${BACKEND_URL}/api/reasoning/differential`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					case_data: caseData || {
						chief_complaint: 'Chest pain',
						history: { duration: '2 hours', quality: 'crushing', radiation: 'left arm' },
						vitals: { hr: 95, bp: '145/90', rr: 22, spo2: 96 },
					},
					student_differentials: studentDifferentials,
				}),
			});

			const data = await response.json();
			if (data.success) {
				setExpertDifferential(data);
			} else {
				setError(data.error || 'Failed to generate differential');
			}
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	// Compare student vs expert differentials
	const handleCompareDifferentials = async () => {
		if (studentDifferentials.length === 0 || !expertDifferential) {
			setError('Please add student differentials and generate expert differential first');
			return;
		}

		setLoading(true);
		setError(null);
		try {
			const response = await fetch(`${BACKEND_URL}/api/reasoning/compare_differentials`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					student_differentials: studentDifferentials,
					expert_differentials: expertDifferential.expert_differentials,
				}),
			});

			const data = await response.json();
			if (data.success) {
				setComparisonResult(data);
			} else {
				setError(data.error || 'Failed to compare differentials');
			}
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	// Analyze reasoning pattern
	const handleAnalyzeReasoning = async (reasoningData) => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetch(`${BACKEND_URL}/api/reasoning/analyze_pattern`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reasoning_data: reasoningData }),
			});

			const data = await response.json();
			if (data.success) {
				setReasoningAnalysis(data);
			} else {
				setError(data.error || 'Failed to analyze reasoning');
			}
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="reasoning-tab">
			<div className="reasoning-header">
				<h2>🧠 Clinical Reasoning Engine</h2>
				<p>Master diagnostic thinking through AI-powered differential diagnosis and Bayesian analysis</p>
			</div>

			{/* Sub-navigation */}
			<div className="reasoning-subnav">
				<button
					className={activeSubTab === 'differential' ? 'active' : ''}
					onClick={() => setActiveSubTab('differential')}
				>
					📋 Differential Builder
				</button>
				<button
					className={activeSubTab === 'bayesian' ? 'active' : ''}
					onClick={() => setActiveSubTab('bayesian')}
				>
					📊 Bayesian Calculator
				</button>
				<button
					className={activeSubTab === 'multistep' ? 'active' : ''}
					onClick={() => setActiveSubTab('multistep')}
				>
					🎯 Multi-Step Cases
				</button>
				<button
					className={activeSubTab === 'insights' ? 'active' : ''}
					onClick={() => setActiveSubTab('insights')}
				>
					💡 Reasoning Insights
				</button>
			</div>

			{/* Error display */}
			{error && (
				<div className="error-banner">
					❌ {error}
				</div>
			)}

			{/* Loading spinner */}
			{loading && (
				<div className="loading-spinner">
					<div className="spinner"></div>
					<p>Analyzing clinical reasoning...</p>
				</div>
			)}

			{/* Content area */}
			<div className="reasoning-content">
				{activeSubTab === 'differential' && (
					<DifferentialBuilder
						caseData={caseData}
						studentDifferentials={studentDifferentials}
						setStudentDifferentials={setStudentDifferentials}
						expertDifferential={expertDifferential}
						onGenerateExpert={handleGenerateExpertDifferential}
						onCompare={handleCompareDifferentials}
						comparisonResult={comparisonResult}
						loading={loading}
					/>
				)}

				{activeSubTab === 'bayesian' && (
					<BayesianCalculator backendUrl={BACKEND_URL} />
				)}

				{activeSubTab === 'multistep' && (
					<MultiStepCase
						backendUrl={BACKEND_URL}
						onAnalyzeReasoning={handleAnalyzeReasoning}
					/>
				)}

				{activeSubTab === 'insights' && (
					<ReasoningInsights
						reasoningAnalysis={reasoningAnalysis}
						comparisonResult={comparisonResult}
					/>
				)}
			</div>

			{/* Help section */}
			<div className="reasoning-help">
				<h3>📚 How to Use</h3>
				<ul>
					<li><strong>Differential Builder:</strong> Build your differential diagnosis and compare with expert AI</li>
					<li><strong>Bayesian Calculator:</strong> Calculate post-test probabilities using Bayes' theorem</li>
					<li><strong>Multi-Step Cases:</strong> Work through progressive disclosure cases with real-time feedback</li>
					<li><strong>Reasoning Insights:</strong> Identify cognitive biases and improve your diagnostic patterns</li>
				</ul>
			</div>
		</div>
	);
}
