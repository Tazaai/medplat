// frontend/src/components/POCUSModule.jsx — Phase 8 M1: POCUS/Ultrasound Interpretation Module
import { useState, useEffect } from 'react';
import { API_BASE } from '../config';
import './POCUSModule.css';

export default function POCUSModule({ user }) {
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
			const res = await fetch(`${API_BASE}/api/pocus/categories`);
			const data = await res.json();
			setCategories(data.categories || []);
		} catch (error) {
			console.error('Failed to load POCUS categories:', error);
		}
	}

	async function loadCasesByCategory(categoryId) {
		setLoading(true);
		try {
			const res = await fetch(`${API_BASE}/api/pocus/list?category=${categoryId}`);
			const data = await res.json();
			setCases(data.cases || []);
			setSelectedCategory(categoryId);
		} catch (error) {
			console.error('Failed to load POCUS cases:', error);
		} finally {
			setLoading(false);
		}
	}

	async function startQuiz(caseItem) {
		setLoading(true);
		try {
			const res = await fetch(`${API_BASE}/api/pocus/mcq/generate`, {
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
			console.error('Failed to generate POCUS quiz:', error);
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
			<div className="pocus-module">
				<div className="pocus-header">
					<h1>🔊 POCUS Interpretation Module</h1>
					<p>Point-of-Care Ultrasound training with validated cases (FAST, Lung, Cardiac, Vascular)</p>
				</div>

				<div className="pocus-stats">
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
			<div className="pocus-module">
				<button className="back-button" onClick={handleBackToCategories}>
					← Back to Categories
				</button>

				<h2>{selectedCategory.toUpperCase()} Ultrasound Cases</h2>

				{loading ? (
					<div className="loading">Loading POCUS cases...</div>
				) : (
					<div className="case-grid">
						{cases.map(c => (
							<div key={c.id} className="pocus-case-card">
								<img src={c.image_url} alt={c.title} className="pocus-preview" />
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
			<div className="pocus-module">
				<div className="quiz-container">
					<h2>POCUS Interpretation Quiz</h2>
					<div className="pocus-image-container">
						<img src={quiz.image_url} alt="Ultrasound" className="pocus-full" />
						{quiz.video_url && (
							<a href={quiz.video_url} target="_blank" rel="noopener noreferrer" className="video-link">
								📹 View Video Clip
							</a>
						)}
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
			<div className="pocus-module">
				<div className="explanation-container">
					<div className={`result-banner ${isCorrect ? 'correct' : 'incorrect'}`}>
						{isCorrect ? '✅ Correct!' : '❌ Incorrect'}
						{isCorrect && <span className="xp-badge">+{quiz.xp_reward} XP</span>}
					</div>

					<div className="pocus-image-container">
						<img src={quiz.image_url} alt="Ultrasound" className="pocus-full" />
						{quiz.video_url && (
							<a href={quiz.video_url} target="_blank" rel="noopener noreferrer" className="video-link">
								📹 View Video Clip
							</a>
						)}
					</div>

					<div className="explanation-section">
						<h3>Diagnosis: {selectedCase.diagnosis}</h3>

						<div className="explanation-text">
							<h4>Explanation:</h4>
							<p>{quiz.explanation}</p>
						</div>

						<div className="key-features">
							<h4>Key Ultrasound Features:</h4>
							<ul>
								{quiz.key_features.map((feature, idx) => (
									<li key={idx}>{feature}</li>
								))}
							</ul>
						</div>

						{quiz.views && (
							<div className="views-info">
								<h4>Standard Views:</h4>
								<ul>
									{quiz.views.map((view, idx) => (
										<li key={idx}>{view}</li>
									))}
								</ul>
							</div>
						)}

						<div className="clinical-info">
							<h4>Clinical Context:</h4>
							<p>{quiz.clinical_context}</p>
						</div>

						<div className="management-info">
							<h4>Management:</h4>
							<p>{quiz.management}</p>
						</div>

						<button className="next-button" onClick={handleNextCase}>
							Next Case →
						</button>
					</div>
				</div>
			</div>
		);
	}

	return <div className="pocus-module">Loading...</div>;
}
