// frontend/src/components/ECGModule.jsx — Phase 8 M1: ECG Interpretation Module
import { useState, useEffect } from 'react';
import { API_BASE } from '../config';
import './ECGModule.css';

export default function ECGModule({ user }) {
	const [categories, setCategories] = useState([]);
	const [selectedCategory, setSelectedCategory] = useState(null);
	const [cases, setCases] = useState([]);
	const [selectedCase, setSelectedCase] = useState(null);
	const [quiz, setQuiz] = useState(null);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [selectedAnswer, setSelectedAnswer] = useState(null);
	const [showExplanation, setShowExplanation] = useState(false);
	const [score, setScore] = useState(0);
	const [xpEarned, setXpEarned] = useState(0);
	const [loading, setLoading] = useState(false);

	// Load categories on mount
	useEffect(() => {
		loadCategories();
	}, []);

	async function loadCategories() {
		try {
			const res = await fetch(`${API_BASE}/api/ecg/categories`);
			const data = await res.json();
			setCategories(data.categories || []);
		} catch (error) {
			console.error('Failed to load ECG categories:', error);
		}
	}

	async function loadCasesByCategory(categoryId) {
		setLoading(true);
		try {
			const res = await fetch(`${API_BASE}/api/ecg/list?category=${categoryId}`);
			const data = await res.json();
			setCases(data.cases || []);
			setSelectedCategory(categoryId);
		} catch (error) {
			console.error('Failed to load ECG cases:', error);
		} finally {
			setLoading(false);
		}
	}

	async function startQuiz(caseItem) {
		setLoading(true);
		try {
			const res = await fetch(`${API_BASE}/api/ecg/mcq/generate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					case_id: caseItem.id,
					include_explanation: true
				})
			});
			const mcq = await res.json();
			setSelectedCase(caseItem);
			setQuiz(mcq);
			setCurrentQuestionIndex(0);
			setSelectedAnswer(null);
			setShowExplanation(false);
		} catch (error) {
			console.error('Failed to generate ECG quiz:', error);
		} finally {
			setLoading(false);
		}
	}

	function handleAnswerSelect(optionLabel) {
		setSelectedAnswer(optionLabel);
	}

	function handleSubmitAnswer() {
		if (!selectedAnswer || !quiz) return;

		const isCorrect = selectedAnswer === quiz.correct_answer;
		if (isCorrect) {
			setScore(score + 1);
			setXpEarned(xpEarned + quiz.xp_reward);
		}
		setShowExplanation(true);
	}

	function handleNextCase() {
		setSelectedCase(null);
		setQuiz(null);
		setCurrentQuestionIndex(0);
		setSelectedAnswer(null);
		setShowExplanation(false);
	}

	function handleBackToCategories() {
		setSelectedCategory(null);
		setCases([]);
		setSelectedCase(null);
		setQuiz(null);
	}

	// Render category selection
	if (!selectedCategory) {
		return (
			<div className="ecg-module">
				<div className="ecg-header">
					<h1>📊 ECG Interpretation Module</h1>
					<p>Master ECG interpretation with validated cases from LITFL and educational resources</p>
				</div>

				<div className="ecg-stats">
					<div className="stat-card">
						<span className="stat-value">{score}</span>
						<span className="stat-label">Correct</span>
					</div>
					<div className="stat-card">
						<span className="stat-value">{xpEarned}</span>
						<span className="stat-label">XP Earned</span>
					</div>
				</div>

				<div className="category-grid">
					{categories.map(cat => (
						<div
							key={cat.id}
							className="category-card"
							onClick={() => loadCasesByCategory(cat.id)}
						>
							<h3>{cat.name}</h3>
							<p>{cat.description}</p>
						</div>
					))}
				</div>
			</div>
		);
	}

	// Render case list
	if (!selectedCase) {
		return (
			<div className="ecg-module">
				<button className="back-button" onClick={handleBackToCategories}>
					← Back to Categories
				</button>

				<h2>{selectedCategory.toUpperCase()} ECGs</h2>

				{loading ? (
					<div className="loading">Loading ECG cases...</div>
				) : (
					<div className="case-grid">
						{cases.map(c => (
							<div key={c.id} className="ecg-case-card">
								<img src={c.image_url} alt={c.title} className="ecg-preview" />
								<h3>{c.title}</h3>
								<div className="case-meta">
									<span className={`difficulty difficulty-${c.difficulty}`}>
										{c.difficulty}
									</span>
									<span className="category">{c.category}</span>
								</div>
								<button
									className="start-quiz-button"
									onClick={() => startQuiz(c)}
								>
									Start Quiz
								</button>
							</div>
						))}
					</div>
				)}
			</div>
		);
	}

	// Render quiz view
	if (quiz && !showExplanation) {
		return (
			<div className="ecg-module">
				<div className="quiz-container">
					<h2>ECG Interpretation Quiz</h2>
					<div className="ecg-image-container">
						<img src={quiz.image_url} alt="ECG" className="ecg-full" />
					</div>

					<div className="question-section">
						<p className="question-stem">{quiz.question_stem}</p>

						<div className="options-grid">
							{quiz.options.map(opt => (
								<button
									key={opt.label}
									className={`option-button ${selectedAnswer === opt.label ? 'selected' : ''}`}
									onClick={() => handleAnswerSelect(opt.label)}
								>
									<span className="option-label">{opt.label}</span>
									<span className="option-text">{opt.text}</span>
								</button>
							))}
						</div>

						<button
							className="submit-button"
							onClick={handleSubmitAnswer}
							disabled={!selectedAnswer}
						>
							Submit Answer
						</button>
					</div>
				</div>
			</div>
		);
	}

	// Render explanation view
	if (showExplanation) {
		const isCorrect = selectedAnswer === quiz.correct_answer;

		return (
			<div className="ecg-module">
				<div className="explanation-container">
					<div className={`result-banner ${isCorrect ? 'correct' : 'incorrect'}`}>
						{isCorrect ? '✅ Correct!' : '❌ Incorrect'}
						{isCorrect && <span className="xp-badge">+{quiz.xp_reward} XP</span>}
					</div>

					<div className="ecg-image-container">
						<img src={quiz.image_url} alt="ECG" className="ecg-full" />
					</div>

					<div className="explanation-section">
						<h3>Diagnosis: {selectedCase.diagnosis}</h3>

						<div className="explanation-text">
							<h4>Explanation:</h4>
							<p>{quiz.explanation}</p>
						</div>

						<div className="key-features">
							<h4>Key ECG Features:</h4>
							<ul>
								{quiz.key_features.map((feature, idx) => (
									<li key={idx}>{feature}</li>
								))}
							</ul>
						</div>

						<div className="clinical-info">
							<h4>Clinical Context:</h4>
							<p>{quiz.clinical_context}</p>
						</div>

						<div className="management-info">
							<h4>Management:</h4>
							<p>{quiz.management}</p>
						</div>

						<button className="next-button" onClick={handleNextCase}>
							Next ECG →
						</button>
					</div>
				</div>
			</div>
		);
	}

	return <div className="ecg-module">Loading...</div>;
}
