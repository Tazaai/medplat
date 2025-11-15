// frontend/src/components/ECGExamMode.jsx — Phase 11: ECG Certification Exam
// Timed 20-question certification exam with downloadable certificate

import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../config';
import './ECGExamMode.css';

export default function ECGExamMode() {
	const [examState, setExamState] = useState('ready'); // ready | active | completed
	const [exam, setExam] = useState(null);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [answers, setAnswers] = useState({});
	const [timeRemaining, setTimeRemaining] = useState(1200); // 20 minutes in seconds
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [result, setResult] = useState(null);
	
	const timerRef = useRef(null);
	
	// Load user level from localStorage
	const getUserLevel = () => {
		try {
			const progress = JSON.parse(localStorage.getItem('ecg_progress'));
			if (!progress || !progress.xpEarned) return 1;
			
			// Same leveling logic as ECGModule
			const xp = progress.xpEarned;
			if (xp < 100) return 1;
			if (xp < 250) return 2;
			if (xp < 500) return 3;
			if (xp < 800) return 4;
			if (xp < 1200) return 5;
			if (xp < 1700) return 6;
			if (xp < 2300) return 7;
			if (xp < 3000) return 8;
			if (xp < 4000) return 9;
			return 10;
		} catch {
			return 1;
		}
	};
	
	// Start exam
	const startExam = async () => {
		setLoading(true);
		setError(null);
		
		try {
			const userLevel = getUserLevel();
			const response = await fetch(`${API_BASE}/api/ecg/exam`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ user_level: userLevel })
			});
			
			if (!response.ok) {
				throw new Error(`Failed to generate exam: ${response.statusText}`);
			}
			
			const data = await response.json();
			
			if (!data.success || !data.exam) {
				throw new Error('Invalid exam data received');
			}
			
			setExam(data.exam);
			setExamState('active');
			setTimeRemaining(data.exam.time_limit_minutes * 60);
			setCurrentQuestionIndex(0);
			setAnswers({});
			
		} catch (err) {
			console.error('❌ Failed to start exam:', err);
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};
	
	// Timer countdown
	useEffect(() => {
		if (examState === 'active' && timeRemaining > 0) {
			timerRef.current = setInterval(() => {
				setTimeRemaining(prev => {
					if (prev <= 1) {
						submitExam(); // Auto-submit when time runs out
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
			
			return () => {
				if (timerRef.current) clearInterval(timerRef.current);
			};
		}
	}, [examState, timeRemaining]);
	
	// Format time as MM:SS
	const formatTime = (seconds) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	};
	
	// Select answer
	const selectAnswer = (questionId, selectedOption) => {
		setAnswers(prev => ({
			...prev,
			[questionId]: selectedOption
		}));
	};
	
	// Navigate to next question
	const nextQuestion = () => {
		if (currentQuestionIndex < exam.questions.length - 1) {
			setCurrentQuestionIndex(prev => prev + 1);
		}
	};
	
	// Submit exam
	const submitExam = () => {
		if (timerRef.current) clearInterval(timerRef.current);
		
		// Grade exam
		const questions = exam.questions;
		let correct = 0;
		const breakdown = {};
		
		questions.forEach(q => {
			const userAnswer = answers[q.question_id];
			const isCorrect = userAnswer === q.correct_answer;
			
			if (isCorrect) correct++;
			
			breakdown[q.question_id] = {
				question: q.question,
				user_answer: userAnswer || 'No answer',
				correct_answer: q.correct_answer,
				is_correct: isCorrect,
				explanation: q.explanation,
				difficulty: q.difficulty,
				category: q.category
			};
		});
		
		const score = (correct / questions.length) * 100;
		const passed = score >= exam.passing_score;
		
		setResult({
			score,
			correct,
			total: questions.length,
			passed,
			breakdown,
			timestamp: new Date().toISOString()
		});
		
		setExamState('completed');
		
		// Save to localStorage
		if (passed) {
			const certifications = JSON.parse(localStorage.getItem('ecg_certifications') || '[]');
			certifications.push({
				id: exam.id,
				score,
				correct,
				total: questions.length,
				timestamp: new Date().toISOString()
			});
			localStorage.setItem('ecg_certifications', JSON.stringify(certifications));
		}
	};
	
	// Download certificate
	const downloadCertificate = () => {
		const canvas = document.createElement('canvas');
		canvas.width = 800;
		canvas.height = 600;
		const ctx = canvas.getContext('2d');
		
		// Background
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, 800, 600);
		
		// Border
		ctx.strokeStyle = '#667eea';
		ctx.lineWidth = 10;
		ctx.strokeRect(20, 20, 760, 560);
		
		// Title
		ctx.fillStyle = '#2c3e50';
		ctx.font = 'bold 48px Arial';
		ctx.textAlign = 'center';
		ctx.fillText('ECG Mastery Certificate', 400, 100);
		
		// Subtitle
		ctx.font = '24px Arial';
		ctx.fillStyle = '#7f8c8d';
		ctx.fillText('This certifies that', 400, 160);
		
		// Name placeholder
		ctx.font = 'bold 36px Arial';
		ctx.fillStyle = '#667eea';
		ctx.fillText('ECG Learner', 400, 220);
		
		// Achievement text
		ctx.font = '20px Arial';
		ctx.fillStyle = '#2c3e50';
		ctx.fillText('has successfully completed the', 400, 270);
		ctx.fillText('MedPlat ECG Certification Exam', 400, 300);
		
		// Score
		ctx.font = 'bold 32px Arial';
		ctx.fillStyle = '#2ecc71';
		ctx.fillText(`Score: ${result.score.toFixed(1)}% (${result.correct}/${result.total})`, 400, 360);
		
		// Date
		ctx.font = '18px Arial';
		ctx.fillStyle = '#7f8c8d';
		const date = new Date(result.timestamp).toLocaleDateString();
		ctx.fillText(`Issued: ${date}`, 400, 420);
		
		// Exam ID
		ctx.font = '14px Arial';
		ctx.fillText(`Exam ID: ${exam.id}`, 400, 460);
		
		// Footer
		ctx.font = 'italic 16px Arial';
		ctx.fillText('MedPlat — Clinical Learning Platform', 400, 540);
		
		// Download
		const link = document.createElement('a');
		link.download = `MedPlat_ECG_Certificate_${date.replace(/\//g, '-')}.png`;
		link.href = canvas.toDataURL();
		link.click();
	};
	
	// Render: Ready screen
	if (examState === 'ready') {
		return (
			<div className="ecg-exam-mode">
				<div className="exam-ready-screen">
					<div className="exam-icon">🎓</div>
					<h1>ECG Certification Exam</h1>
					<p className="exam-subtitle">Test your ECG interpretation mastery</p>
					
					<div className="exam-info-grid">
						<div className="info-card">
							<div className="info-icon">📝</div>
							<div className="info-label">Questions</div>
							<div className="info-value">20</div>
						</div>
						<div className="info-card">
							<div className="info-icon">⏱️</div>
							<div className="info-label">Time Limit</div>
							<div className="info-value">20 min</div>
						</div>
						<div className="info-card">
							<div className="info-icon">✅</div>
							<div className="info-label">Passing Score</div>
							<div className="info-value">70%</div>
						</div>
						<div className="info-card">
							<div className="info-icon">🏆</div>
							<div className="info-label">Reward</div>
							<div className="info-value">Certificate</div>
						</div>
					</div>
					
					<div className="exam-instructions">
						<h3>Instructions</h3>
						<ul>
							<li>Answer all 20 mixed-difficulty questions</li>
							<li>You have 20 minutes to complete the exam</li>
							<li>Each question is worth 5 points (100 total)</li>
							<li>No backward navigation — commit to each answer</li>
							<li>Passing score: 70% (14/20 correct)</li>
							<li>Downloadable certificate upon passing</li>
						</ul>
					</div>
					
					{error && (
						<div className="error-message">
							<div className="error-icon">⚠️</div>
							<p>{error}</p>
						</div>
					)}
					
					<button 
						onClick={startExam} 
						disabled={loading}
						className="start-exam-btn"
					>
						{loading ? 'Generating Exam...' : 'Start Certification Exam'}
					</button>
				</div>
			</div>
		);
	}
	
	// Render: Active exam
	if (examState === 'active' && exam) {
		const currentQ = exam.questions[currentQuestionIndex];
		const answered = answers[currentQ.question_id] !== undefined;
		const isLastQuestion = currentQuestionIndex === exam.questions.length - 1;
		
		return (
			<div className="ecg-exam-mode">
				<div className="exam-header">
					<div className="exam-progress">
						Question {currentQuestionIndex + 1} / {exam.questions.length}
					</div>
					<div className={`exam-timer ${timeRemaining < 300 ? 'warning' : ''}`}>
						⏱️ {formatTime(timeRemaining)}
					</div>
				</div>
				
				<div className="progress-bar">
					<div 
						className="progress-fill" 
						style={{ width: `${((currentQuestionIndex + 1) / exam.questions.length) * 100}%` }}
					/>
				</div>
				
				<div className="exam-question-card">
					<div className="question-meta">
						<span className="difficulty-badge">{currentQ.difficulty}</span>
						<span className="category-badge">{currentQ.category}</span>
					</div>
					
					<h2 className="question-text">{currentQ.question}</h2>
					
					<div className="options-list">
						{currentQ.options.map((option, idx) => {
							const isSelected = answers[currentQ.question_id] === option;
							return (
								<button
									key={idx}
									onClick={() => selectAnswer(currentQ.question_id, option)}
									className={`option-btn ${isSelected ? 'selected' : ''}`}
								>
									<span className="option-letter">{String.fromCharCode(65 + idx)}</span>
									<span className="option-text">{option}</span>
									{isSelected && <span className="check-icon">✓</span>}
								</button>
							);
						})}
					</div>
					
					<div className="question-actions">
						{isLastQuestion ? (
							<button 
								onClick={submitExam} 
								disabled={!answered}
								className="submit-exam-btn"
							>
								Submit Exam
							</button>
						) : (
							<button 
								onClick={nextQuestion} 
								disabled={!answered}
								className="next-question-btn"
							>
								Next Question →
							</button>
						)}
					</div>
				</div>
			</div>
		);
	}
	
	// Render: Completed exam
	if (examState === 'completed' && result) {
		return (
			<div className="ecg-exam-mode">
				<div className="exam-result-screen">
					<div className={`result-icon ${result.passed ? 'passed' : 'failed'}`}>
						{result.passed ? '🎉' : '📚'}
					</div>
					
					<h1>{result.passed ? 'Congratulations!' : 'Keep Learning'}</h1>
					<p className="result-subtitle">
						{result.passed 
							? 'You have successfully passed the ECG Certification Exam!' 
							: 'You did not pass this time, but every attempt is progress.'}
					</p>
					
					<div className="score-display">
						<div className="score-circle">
							<svg width="200" height="200">
								<circle
									cx="100"
									cy="100"
									r="90"
									fill="none"
									stroke="#ecf0f1"
									strokeWidth="10"
								/>
								<circle
									cx="100"
									cy="100"
									r="90"
									fill="none"
									stroke={result.passed ? '#2ecc71' : '#e74c3c'}
									strokeWidth="10"
									strokeDasharray={`${(result.score / 100) * 565} 565`}
									transform="rotate(-90 100 100)"
								/>
								<text
									x="100"
									y="100"
									textAnchor="middle"
									dominantBaseline="middle"
									fontSize="48"
									fontWeight="bold"
									fill={result.passed ? '#2ecc71' : '#e74c3c'}
								>
									{result.score.toFixed(0)}%
								</text>
								<text
									x="100"
									y="130"
									textAnchor="middle"
									fontSize="16"
									fill="#7f8c8d"
								>
									{result.correct}/{result.total} correct
								</text>
							</svg>
						</div>
					</div>
					
					{result.passed && (
						<button onClick={downloadCertificate} className="download-cert-btn">
							📥 Download Certificate
						</button>
					)}
					
					<div className="result-breakdown">
						<h3>Exam Review</h3>
						<div className="breakdown-list">
							{exam.questions.map((q, idx) => {
								const answerData = result.breakdown[q.question_id];
								return (
									<div key={q.question_id} className={`review-item ${answerData.is_correct ? 'correct' : 'incorrect'}`}>
										<div className="review-header">
											<span className="question-number">Q{idx + 1}</span>
											<span className={`result-badge ${answerData.is_correct ? 'correct' : 'incorrect'}`}>
												{answerData.is_correct ? '✓ Correct' : '✗ Incorrect'}
											</span>
										</div>
										<p className="review-question">{answerData.question}</p>
										<div className="review-answers">
											<p><strong>Your answer:</strong> {answerData.user_answer}</p>
											{!answerData.is_correct && (
												<p className="correct-answer"><strong>Correct answer:</strong> {answerData.correct_answer}</p>
											)}
										</div>
										{answerData.explanation && (
											<div className="review-explanation">
												<strong>Explanation:</strong> {answerData.explanation}
											</div>
										)}
									</div>
								);
							})}
						</div>
					</div>
					
					<button onClick={() => { setExamState('ready'); setResult(null); }} className="retry-exam-btn">
						{result.passed ? 'Take Another Exam' : 'Try Again'}
					</button>
				</div>
			</div>
		);
	}
	
	return null;
}
