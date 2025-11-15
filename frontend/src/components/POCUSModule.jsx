// frontend/src/components/POCUSModule.jsx — Phase 8 M1: POCUS Interpretation Module
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
	const [answered, setAnswered] = useState(false);
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
			setAnswered(false);
			setShowExplanation(false);
		} catch (error) {
			console.error('Failed to generate POCUS quiz:', error);
		} finally {
			setLoading(false);
		}
	}

	function handleAnswerSelect(optionLabel) {
		if (answered) return; // Lock after answer submitted
		
		setSelectedAnswer(optionLabel);
		setAnswered(true);
		
		// Immediate scoring (3 points correct, 0 wrong - matches Level2 pattern)
		const isCorrect = optionLabel === quiz.correct_answer;
		if (isCorrect) {
			setScore(score + 3);
			setXpEarned(xpEarned + quiz.xp_reward);
		}
		
		// Show explanation immediately
		setShowExplanation(true);
	}

	function handleNextCase() {
		setSelectedCase(null);
		setQuiz(null);
		setCurrentQuestionIndex(0);
		setSelectedAnswer(null);
		setAnswered(false);
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
					<h1>📊 POCUS Interpretation Module</h1>
					<p>Master POCUS interpretation with validated cases from LITFL and educational resources</p>
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

				<h2>{selectedCategory.toUpperCase()} POCUSs</h2>

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

	// Render quiz view (with immediate feedback)
	if (quiz) {
		const isCorrect = selectedAnswer === quiz.correct_answer;
		
		return (
			<div className="pocus-module">
				<div className="quiz-container">
					<div className="quiz-header">
						<button className="back-button" onClick={handleBackToCategories}>← Back</button>
						<div className="quiz-stats">
							<span className="stat">Score: <strong>{score}</strong></span>
							<span className="stat">XP: <strong>{xpEarned}</strong></span>
						</div>
					</div>
					
\t\t\t\t\t{/* POCUS Image/Video - Prominent Display */}\n\t\t\t\t\t<div className=\"pocus-image-container\">\n\t\t\t\t\t\t<img src={quiz.image_url} alt=\"Ultrasound\" className=\"pocus-full\" />\n\t\t\t\t\t\t{quiz.video_url && (\n\t\t\t\t\t\t\t<a href={quiz.video_url} target=\"_blank\" rel=\"noopener noreferrer\" className=\"video-link\">\n\t\t\t\t\t\t\t\t📹 View Video Clip\n\t\t\t\t\t\t\t</a>\n\t\t\t\t\t\t)}\n\t\t\t\t\t</div>					<div className="question-section">
						<p className="question-stem">{quiz.question_stem || 'What is the most likely diagnosis?'}</p>

						<div className="options-grid">
							{quiz.options.map(opt => {
								const isSelected = selectedAnswer === opt.label;
								const isCorrectOption = opt.label === quiz.correct_answer;
								
								return (
									<button
										key={opt.label}
										className={`option-button ${
											isSelected && answered
												? isCorrectOption ? 'correct' : 'incorrect'
												: isSelected ? 'selected' : ''
										} ${answered && isCorrectOption ? 'show-correct' : ''}`}
										onClick={() => handleAnswerSelect(opt.label)}
										disabled={answered}
									>
										<span className="option-label">{opt.label}</span>
										<span className="option-text">{opt.text}</span>
										{answered && isCorrectOption && <span className="checkmark">✓</span>}
									</button>
								);
							})}
						</div>
						
						{/* Immediate Feedback - Show after answer selected */}
						{showExplanation && (
							<div className="explanation-section">
								<div className={`result-banner ${isCorrect ? 'correct' : 'incorrect'}`}>
									{isCorrect ? '✅ Correct!' : '❌ Incorrect'}
									{isCorrect && <span className="xp-badge">+{quiz.xp_reward} XP</span>}
								</div>

								<div className="correct-answer-section">
									<h4>✓ Correct Answer:</h4>
									<p className="diagnosis-highlight">{selectedCase.diagnosis}</p>
								</div>

								<div className="explanation-text">
									<h4>📖 Explanation:</h4>
									<p>{quiz.explanation}</p>
								</div>

								<div className="key-features">
									<h4>🔑 Key POCUS Features:</h4>
									<ul>
										{quiz.key_features?.map((feature, idx) => (
											<li key={idx}>{feature}</li>
										)) || []}
									</ul>
								</div>

								<div className="clinical-info">
									<h4>🏥 Clinical Context:</h4>
									<p>{quiz.clinical_context}</p>
								</div>

								<div className="management-info">
									<h4>💊 Management:</h4>
									<p>{quiz.management}</p>
								</div>

								<button className="next-button" onClick={handleNextCase}>
									Next POCUS →
								</button>
							</div>
						)}
					</div>
				</div>
			</div>
		);
	}



	return <div className="pocus-module">Loading...</div>;
}
