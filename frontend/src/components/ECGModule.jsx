// frontend/src/components/ECGModule.jsx — Phase 8 M1+M2+M3: ECG Interpretation with Adaptive Difficulty
import { useState, useEffect, useMemo, useCallback } from 'react';
import { API_BASE } from '../config';
import ECGPatternMapping from './ECGPatternMapping';
import './ECGModule.css';

export default function ECGModule({ user }) {
	const [categories, setCategories] = useState([]);
	const [selectedCategory, setSelectedCategory] = useState(null);
	const [categoryFilter, setCategoryFilter] = useState(null);
	const [cases, setCases] = useState([]);
	const [selectedCase, setSelectedCase] = useState(null);
	const [quiz, setQuiz] = useState(null);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [selectedAnswer, setSelectedAnswer] = useState(null);
	const [answered, setAnswered] = useState(false);
	const [showExplanation, setShowExplanation] = useState(false);
	const [score, setScore] = useState(0);
	const [wrongCount, setWrongCount] = useState(0);
	const [xpEarned, setXpEarned] = useState(0);
	const [loading, setLoading] = useState(false);
	
	// v15.0.2: ECG Image Pipeline State
	const [ecgImages, setEcgImages] = useState({});
	const [imageLoading, setImageLoading] = useState(false);
	const [imageError, setImageError] = useState(null);
	
	// Phase 8 M2: Adaptive difficulty tracking
	const [userLevel, setUserLevel] = useState(1);
	const [unlockedDifficulties, setUnlockedDifficulties] = useState(['beginner']);
	const [performanceByCategory, setPerformanceByCategory] = useState({});
	const [weakCategories, setWeakCategories] = useState([]);
	
	// Phase 8 M2.3: Micro-logic polish (UI-only intelligence)
	const [questionStartTime, setQuestionStartTime] = useState(null);
	const [elapsedTime, setElapsedTime] = useState(0);
	const [repeatedMistakes, setRepeatedMistakes] = useState([]);
	const [currentStreak, setCurrentStreak] = useState(0);
	const [confidenceLevel, setConfidenceLevel] = useState('building'); // building | confident | expert
	
	// Phase 8 M3: Module completion features
	const [recentECGs, setRecentECGs] = useState([]);
	const [showReviewScreen, setShowReviewScreen] = useState(false);
	const [colorBlindMode, setColorBlindMode] = useState(false);
	const [showXPPopup, setShowXPPopup] = useState(false);

	// Load categories on mount
	useEffect(() => {
		loadCategories();
		loadUserProgress();
	}, []);
	
	// Phase 8 M2: Calculate user level based on score
	useEffect(() => {
		const newLevel = Math.floor(score / 3) + 1; // 3 XP per correct = 1 level
		setUserLevel(newLevel);
		
		// Update unlocked difficulties based on level
		const unlocked = ['beginner'];
		if (newLevel >= 5) unlocked.push('intermediate');
		if (newLevel >= 10) unlocked.push('advanced');
		if (newLevel >= 15) unlocked.push('expert');
		setUnlockedDifficulties(unlocked);
	}, [score]);
	
	// Phase 8 M2.3: Timer effect (updates every second during quiz)
	useEffect(() => {
		if (quiz && !answered && questionStartTime) {
			const interval = setInterval(() => {
				const elapsed = Math.floor((Date.now() - (questionStartTime || Date.now())) / 1000);
				setElapsedTime(Math.max(0, elapsed)); // Ensure non-negative
			}, 1000);
			return () => clearInterval(interval);
		}
	}, [quiz, answered, questionStartTime]);

	async function loadCategories() {
		try {
			const res = await fetch(`${API_BASE}/api/ecg/categories`);
			const data = await res.json();
			setCategories(data.categories || []);
		} catch (error) {
			console.error('Failed to load ECG categories:', error);
		}
	}

	// v15.0.2: Enhanced ECG Image Fetching
	async function fetchECGImage(category = 'normal', diagnosis = null) {
		setImageLoading(true);
		setImageError(null);
		
		try {
			const params = new URLSearchParams({ category });
			if (diagnosis) params.append('diagnosis', diagnosis);
			
			const response = await fetch(`${API_BASE}/api/ecg/images?${params}`);
			
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			
			const result = await response.json();
			
			if (result.success && result.data) {
				setEcgImages(prev => ({
					...prev,
					[category]: result.data
				}));
				return result.data;
			} else {
				throw new Error(result.error || 'Failed to fetch ECG image');
			}
		} catch (error) {
			console.error('ECG Image fetch error:', error);
			setImageError(error.message);
			
			// Return fallback image data
			return {
				image_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCBmaWxsPSIjZWNmMGYxIiB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIvPjx0ZXh0IHg9IjQwMCIgeT0iMzAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjN2Y4YzhkIiBmb250LXNpemU9IjIwIj5FQ0cgSW1hZ2UgVW5hdmFpbGFibGU8L3RleHQ+PC9zdmc+Cg==',
				diagnosis: 'ECG Image Unavailable',
				description: 'Fallback ECG placeholder - backend connection issue'
			};
		} finally {
			setImageLoading(false);
		}
	}
	
	// Phase 8 M2: Load user progress from localStorage
	function loadUserProgress() {
		try {
			const saved = localStorage.getItem('ecg_progress');
			if (saved) {
				const progress = JSON.parse(saved);
				setScore(progress.score || 0);
				setWrongCount(progress.wrongCount || 0);
				setXpEarned(progress.xpEarned || 0);
				setPerformanceByCategory(progress.performanceByCategory || {});
				setRepeatedMistakes(progress.repeatedMistakes || []);
				setCurrentStreak(progress.currentStreak || 0);
				
				// Calculate weak categories (accuracy < 60%)
				const weak = [];
				Object.entries(progress.performanceByCategory || {}).forEach(([cat, perf]) => {
					const total = perf.correct + perf.wrong;
					if (total === 0) return; // Safeguard: skip if no attempts
					
					const accuracy = perf.correct / total;
					if (accuracy < 0.6 && total >= 3) {
						weak.push(cat);
					}
				});
				setWeakCategories(weak);
			}
		} catch (error) {
			console.warn('Failed to load progress:', error);
		}
	}
	
	// Phase 8 M2: Save user progress to localStorage
	function saveUserProgress() {
		try {
			const progress = {
				score,
				wrongCount,
				xpEarned,
				performanceByCategory,
				lastUpdated: new Date().toISOString()
			};
			localStorage.setItem('ecg_progress', JSON.stringify(progress));
		} catch (error) {
			console.warn('Failed to save progress:', error);
		}
	}
	
	// Phase 8 M2: Update category performance
	function updateCategoryPerformance(category, correct) {
		setPerformanceByCategory(prev => {
			const current = prev[category] || { correct: 0, wrong: 0 };
			const updated = {
				...prev,
				[category]: {
					correct: current.correct + (correct ? 1 : 0),
					wrong: current.wrong + (correct ? 0 : 1)
				}
			};
			
			// Recalculate weak categories
			const weak = [];
			Object.entries(updated).forEach(([cat, perf]) => {
				const total = perf.correct + perf.wrong;
				if (total === 0) return; // Safeguard: skip if no attempts
				
				const accuracy = perf.correct / total;
				if (accuracy < 0.6 && total >= 3) {
					weak.push(cat);
				}
			});
			setWeakCategories(weak);
			
			return updated;
		});
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
			
			// v15.0.2: Fetch ECG image for the case
			const ecgImageData = await fetchECGImage(caseItem.category || 'normal', mcq.diagnosis);
			
			// Enhance quiz with ECG image data
			const enhancedMcq = {
				...mcq,
				image_url: ecgImageData.image_url,
				ecg_metadata: ecgImageData
			};
			
			setSelectedCase(caseItem);
			setQuiz(enhancedMcq);
			setCurrentQuestionIndex(0);
			setSelectedAnswer(null);
			setAnswered(false);
			setShowExplanation(false);
			setQuestionStartTime(Date.now()); // Start timer
			setElapsedTime(0);
			
			// Phase 8 M3: Scroll to top on new question
			window.scrollTo({ top: 0, behavior: 'smooth' });
		} catch (error) {
			console.error('Failed to generate ECG quiz:', error);
		} finally {
			setLoading(false);
		}
	}

	function handleAnswerSelect(optionLabel) {
		if (answered) return; // Lock after answer submitted
		
		setSelectedAnswer(optionLabel);
		setAnswered(true);
		
		// Calculate time taken
		if (questionStartTime) {
			const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000);
			setElapsedTime(timeTaken);
		}
		
		// Immediate scoring (3 points correct, 0 wrong - matches Level2 pattern)
		const isCorrect = optionLabel === quiz.correct_answer;
		if (isCorrect) {
			setScore(score + 3);
			setXpEarned(xpEarned + quiz.xp_reward);
			const newStreak = currentStreak + 1;
			setCurrentStreak(newStreak);
			
			// Phase 8 M3: Show XP popup animation
			setShowXPPopup(true);
			setTimeout(() => setShowXPPopup(false), 2000);
			
			// Update confidence based on streak
			if (newStreak >= 10) setConfidenceLevel('expert');
			else if (newStreak >= 5) setConfidenceLevel('confident');
			else setConfidenceLevel('building');
		} else {
			setWrongCount(wrongCount + 1);
			setCurrentStreak(0); // Reset streak
			setConfidenceLevel('building');
			
			// Track repeated mistakes (same case ID)
			const caseId = selectedCase?.id;
			if (caseId && !repeatedMistakes.includes(caseId)) {
				setRepeatedMistakes([...repeatedMistakes, caseId]);
			}
		}
		
		// Phase 8 M2: Track category performance for weak-area targeting
		const category = quiz.category || selectedCase?.category || 'unknown';
		updateCategoryPerformance(category, isCorrect);
		saveUserProgress();
		
		// Phase 8 M3: Add to recent ECGs for review
		addToRecentECGs(selectedCase, isCorrect);
		
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
	
	// Phase 8 M2.3: ECG Tip of the Day (static tips, cycled by day) - Memoized for performance
	const ecgTipOfDay = useMemo(() => {
		const tips = [
			"Always check the calibration! A standard ECG is 10mm/mV and 25mm/s.",
			"P waves before every QRS? Think sinus rhythm. No P waves? Consider AF or junctional.",
			"ST elevation >1mm in 2+ contiguous leads = STEMI until proven otherwise.",
			"Wide QRS (>120ms) suggests bundle branch block or ventricular origin.",
			"Prolonged QT (>440ms men, >460ms women) increases torsades risk.",
			"Hyperkalemia: Tall peaked T waves → PR prolongation → Wide QRS → Sine wave.",
			"Hypothermia: Look for Osborn (J) waves at the QRS-ST junction.",
			"Digitalis effect: Downsloping ST depression (Salvador Dalí moustache).",
			"Wellens syndrome: Biphasic T waves in V2-V3 = critical LAD stenosis.",
			"Delta wave + short PR + wide QRS = WPW syndrome (pre-excitation)."
		];
		const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
		return tips[dayOfYear % tips.length];
	}, []);
	
	// Phase 8 M3: Image preloading for next ECG
	const preloadNextImage = useCallback((imageUrl) => {
		if (imageUrl) {
			const img = new Image();
			img.src = imageUrl;
		}
	}, []);
	
	// Phase 8 M3: Frontend fallback recommendation generator
	const getFallbackRecommendation = useCallback(() => {
		const difficulties = unlockedDifficulties;
		const recommended_difficulty = difficulties[difficulties.length - 1] || 'beginner';
		
		// Pick from weak categories if available, otherwise random
		let recommended_category = null;
		if (weakCategories.length > 0 && Math.random() < 0.6) {
			recommended_category = weakCategories[Math.floor(Math.random() * weakCategories.length)];
		}
		
		// Get 3 random case IDs from current cases
		const availableCases = cases.filter(c => 
			unlockedDifficulties.includes(c.difficulty) &&
			(!recommended_category || c.category === recommended_category)
		);
		
		const recommendedIds = availableCases
			.sort(() => Math.random() - 0.5)
			.slice(0, 3)
			.map(c => c.id);
		
		return {
			recommended_difficulty,
			recommended_category,
			recommended_ids: recommendedIds.length >= 3 ? recommendedIds : null,
			reason: weakCategories.includes(recommended_category)
				? `Focusing on weak area: ${recommended_category}`
				: 'Exploring new topics'
		};
	}, [cases, unlockedDifficulties, weakCategories]);
	
	// Phase 8 M3: Reset all progress with confirmation
	function resetProgress() {
		if (!window.confirm('⚠️ This will reset ALL your ECG progress. Continue?')) return;
		if (!window.confirm('Last chance! This cannot be undone.')) return;
		
		try {
			localStorage.removeItem('ecg_progress');
			setScore(0);
			setWrongCount(0);
			setXpEarned(0);
			setPerformanceByCategory({});
			setRepeatedMistakes([]);
			setCurrentStreak(0);
			setUserLevel(1);
			setUnlockedDifficulties(['beginner']);
			setWeakCategories([]);
			setRecentECGs([]);
			alert('✅ Progress reset successfully!');
		} catch (error) {
			console.error('Failed to reset progress:', error);
			alert('❌ Failed to reset progress. Please try again.');
		}
	}
	
	// Phase 8 M3: Track recent ECGs for review
	function addToRecentECGs(caseItem, isCorrect) {
		const recent = [
			{ case: caseItem, correct: isCorrect, timestamp: Date.now() },
			...recentECGs.slice(0, 4) // Keep last 5
		];
		setRecentECGs(recent);
		try {
			localStorage.setItem('ecg_recent', JSON.stringify(recent));
		} catch (error) {
			console.warn('Failed to save recent ECGs:', error);
		}
	}

	// v15.0.3: Show loading state for mastery session
	if (sessionLoading) {
		return (
			<div className="ecg-module">
				<div className="ecg-compact-header">
					<span className="mode-badge">ECG Mastery Mode</span>
					<span className="version-badge">v15.0.3</span>
				</div>
				<div className="ecg-loading-state">
					<div className="loading-spinner"></div>
					<h3>Loading ECG Mastery Session...</h3>
					<p>Preparing 8 ECG cases with AI-generated questions and explanations</p>
				</div>
			</div>
		);
	}

	// Phase 8 M3: Render review screen
	if (showReviewScreen) {
		return (
			<div className="ecg-module">
				<div className="ecg-compact-header">
					<span className="mode-badge">Review Last 5 ECGs</span>
					<button className="header-btn" onClick={() => setShowReviewScreen(false)}>← Back</button>
					<span className="version-badge">v15.0.3</span>
				</div>
				
				<div className="review-screen">
					{recentECGs.length === 0 ? (
						<div className="empty-state">
							<p>No recent ECGs yet. Start practicing to see your history here!</p>
						</div>
					) : (
						<div className="review-list">
							{recentECGs.map((item, idx) => (
								<div key={idx} className={`review-item ${item.correct ? 'correct' : 'incorrect'}`}>
									<div className="review-icon">{item.correct ? '✅' : '❌'}</div>
									<div className="review-details">
										<h4>{item.case?.title || 'Unknown Case'}</h4>
										<p>{item.case?.diagnosis || 'No diagnosis'}</p>
										<span className="review-time">{new Date(item.timestamp).toLocaleString()}</span>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		);
	}

	// Render category selection
	if (!selectedCategory) {
		return (
			<div className="ecg-module">
			{/* Phase 8 M3: Compact Header */}
			<div className="ecg-compact-header">
				<span className="mode-badge">ECG Mastery Mode</span>
				<div className="header-actions">
					<button 
						className="header-btn" 
						onClick={() => setShowReviewScreen(!showReviewScreen)}
						title="Review Last 5 ECGs"
					>
						📋 Review
					</button>
					<button 
						className="header-btn ai-mentor" 
						onClick={() => {
							// Save current progress before navigating
							saveUserProgress();
							// Navigate to ECG Mentor Plan (assumes CaseView tab system)
							window.dispatchEvent(new CustomEvent('switchToTab', { detail: 'ecg_mentor' }));
						}}
						title="Get AI-Generated Study Plan"
					>
						💬 AI Study Plan
					</button>
					<button 
						className="header-btn" 
						onClick={() => setColorBlindMode(!colorBlindMode)}
						title="Toggle Color-Blind Friendly Mode"
					>
						{colorBlindMode ? '🎨' : '👁️'}
					</button>
					<button 
						className="header-btn danger" 
						onClick={resetProgress}
						title="Reset All Progress"
					>
						🔄 Reset
					</button>
				</div>
				<span className="version-badge">v15.0.3</span>
			</div>				<div className="ecg-header">
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
				
				{/* Phase 8 M2: Weak Area Notification */}
			{weakCategories.length > 0 && (
				<div className="weak-area-banner">
					<span className="weak-icon">⚠️</span>
					<div className="weak-content">
						<strong>Weak Areas Detected: <span className="info-tooltip" title="Weak areas are identified when accuracy < 60% after 3 or more attempts in a category.">ℹ️</span></strong>
						<span className="weak-list">{weakCategories.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}</span>
					</div>
									<span className="weak-tip">Practice more in these categories to improve!</span>
			</div>
			)}

			{/* Phase 8 M2.3: ECG Tip of the Day */}
			<div className="ecg-tip-of-day">
				<h4>💡 ECG Tip of the Day</h4>
				<p>{ecgTipOfDay}</p>
			</div>
			
			{/* Phase 8 M2.3: Confidence Meter */}
			{currentStreak > 0 && (
				<div className="confidence-meter">
					<div className="confidence-header">
						<span className="confidence-icon">
							{confidenceLevel === 'expert' ? '🏆' : confidenceLevel === 'confident' ? '⭐' : '📈'}
						</span>
						<span className="confidence-label">
							{confidenceLevel === 'expert' ? 'Expert Level' : confidenceLevel === 'confident' ? 'Confident' : 'Building Confidence'}
						</span>
						<span className="confidence-streak">{currentStreak} streak</span>
					</div>
					<div className="confidence-bar">
						<div 
							className={`confidence-fill confidence-${confidenceLevel}`}
							style={{width: `${Math.min((currentStreak / 10) * 100, 100)}%`}}
						></div>
					</div>
				</div>
			)}

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
				
				{/* v15.0.3: Footer */}
				<div className="ecg-footer">
					<span>MedPlat · AI-powered ECG mastery training</span>
				</div>
			</div>
		);
	}

	// Render case list
	if (!selectedCase) {
		// Client-side category filter
		const filteredCases = categoryFilter 
			? cases.filter(c => c.category === categoryFilter)
			: cases;
		
		return (
			<div className="ecg-module">
				<button className="back-button" onClick={handleBackToCategories}>
					← Back to Categories
				</button>

				<h2>{selectedCategory.toUpperCase()} ECGs</h2>
				
				{/* Category Filter Bar */}
				<div className="category-filter-bar">
					<button 
						className={`filter-button ${!categoryFilter ? 'active' : ''}`}
						onClick={() => setCategoryFilter(null)}
					>
						All
					</button>
					<button 
						className={`filter-button ${categoryFilter === 'arrhythmias' ? 'active' : ''}`}
						onClick={() => setCategoryFilter('arrhythmias')}
					>
						Arrhythmias
					</button>
					<button 
						className={`filter-button ${categoryFilter === 'blocks' ? 'active' : ''}`}
						onClick={() => setCategoryFilter('blocks')}
					>
						Blocks
					</button>
					<button 
						className={`filter-button ${categoryFilter === 'ischemia' ? 'active' : ''}`}
						onClick={() => setCategoryFilter('ischemia')}
					>
						Ischemia
					</button>
					<button 
						className={`filter-button ${categoryFilter === 'electrolyte' ? 'active' : ''}`}
						onClick={() => setCategoryFilter('electrolyte')}
					>
						Electrolyte
					</button>
					<button 
						className={`filter-button ${categoryFilter === 'congenital' ? 'active' : ''}`}
						onClick={() => setCategoryFilter('congenital')}
					>
						Congenital
					</button>
				</div>

			{loading ? (
				<div className="loading">Loading ECG cases...</div>
			) : (
				<div className="case-grid">
					{filteredCases.map(c => {
						// Phase 8 M2: Check if case is unlocked based on difficulty
						const isLocked = !unlockedDifficulties.includes(c.difficulty);
						const reqLevel = c.difficulty === 'beginner' ? 1 : 
											c.difficulty === 'intermediate' ? 5 :
											c.difficulty === 'advanced' ? 10 : 15;
						
						return (
							<div key={c.id} className={`ecg-case-card ${isLocked ? 'locked' : ''}`}>
								<img 
					src={c.image_url || `${API_BASE}/api/ecg/images?category=${c.category || 'normal'}`}
					alt={c.title} 
					className="ecg-preview"
					onError={(e) => {
						e.target.onerror = null;
						e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGV4dCB4PSIxMDAiIHk9IjUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjEyIj5FQ0cgUHJldmlldyBVbmF2YWlsYWJsZTwvdGV4dD48L3N2Zz4K';
					}}
				/>
								{isLocked && <div className="lock-overlay">🔒 Level {reqLevel}</div>}
								<h3>{c.title}</h3>
								<div className="case-meta">
									<span className={`difficulty difficulty-${c.difficulty}`}>
										{c.difficulty}
									</span>
									<span className="category">{c.category}</span>
								</div>
								<button
									className="start-quiz-button"
									onClick={() => !isLocked && startQuiz(c)}
									disabled={isLocked}
								>
									{isLocked ? `🔒 Reach Level ${reqLevel}` : 'Start Quiz'}
								</button>
							</div>
						);
					})}
					</div>
				)}
			</div>
		);
	}

	// Render quiz view (with immediate feedback)
	if (quiz) {
		const isCorrect = selectedAnswer === quiz.correct_answer;
		
		return (
		<div className="ecg-module">
			<div className="quiz-container">
			{/* Phase 8 M3: XP Popup Animation */}
			{showXPPopup && (
				<div className="xp-popup">
					+{quiz.xp_reward} XP! 🎉
				</div>
			)}
			
			<div className="quiz-header">
				{/* v15.0.3: Mastery Session Progress */}
				{masterSession && (
					<div className="mastery-session-header">
						<span className="session-badge">📊 ECG Mastery Session</span>
						<span className="case-progress">Case {currentCaseIndex + 1} of {masterSession.cases.length}</span>
						<button className="new-session-btn" onClick={() => loadMasterySession()} title="Start New Session">
							🔄 New Session
						</button>
					</div>
				)}
				
				{!masterSession && (
					<button className="back-button" onClick={handleBackToCategories}>← Back</button>
				)}
				
				{/* Mini Progress Bar - Phase 8 M1.5 */}
					<div className="mini-progress-bar">
						<div 
							className="progress-segment correct" 
							style={{width: `${(Math.floor(score/3) / (Math.floor(score/3) + wrongCount + 1)) * 100}%`}}
						></div>
						<div 
							className="progress-segment wrong" 
							style={{width: `${(wrongCount / (Math.floor(score/3) + wrongCount + 1)) * 100}%`}}
						></div>
					</div>
					
				<div className="quiz-stats">
					<span className="stat">Level: <strong>{userLevel}</strong></span>
					<span className="stat">Score: <strong>{score} XP ⭐</strong></span>
					<span className="stat">Correct: <strong>{Math.floor(score / 3)}</strong> | Wrong: <strong>{wrongCount}</strong></span>
					{/* Phase 8 M2.3: Mini-timer (visual only) */}
					{!answered && questionStartTime && (
						<span className="stat timer">⏱️ <strong>{elapsedTime}s</strong></span>
					)}
				</div>
				
				{/* Phase 8 M2.3: Repeated Mistake Warning */}
				{repeatedMistakes.includes(selectedCase?.id) && (
					<div className="repeated-mistake-warning">
						<span className="warning-icon">🔁</span>
						<span className="warning-text">You've answered this case incorrectly before — review carefully!</span>
					</div>
				)}					{/* Phase 8 M2: Difficulty Unlock Progress */}
					<div className="difficulty-unlocks">
						{['beginner', 'intermediate', 'advanced', 'expert'].map((diff, idx) => {
							const reqLevel = idx === 0 ? 1 : idx === 1 ? 5 : idx === 2 ? 10 : 15;
							const isUnlocked = unlockedDifficulties.includes(diff);
							const progress = isUnlocked ? 100 : Math.min((userLevel / reqLevel) * 100, 99);
							
						return (
							<div 
								key={diff} 
								className={`unlock-badge ${isUnlocked ? 'unlocked' : 'locked'}`} 
								title={`${diff.charAt(0).toUpperCase() + diff.slice(1)} - ${isUnlocked ? 'Unlocked!' : `Level ${reqLevel} required (${Math.floor(progress)}% progress)`}`}
							>
								<span className="unlock-icon">{isUnlocked ? '🔓' : '🔒'}</span>
								<span className="unlock-label">{diff.charAt(0).toUpperCase()}</span>
								{!isUnlocked && <div className="unlock-progress" style={{width: `${progress}%`}}></div>}
							</div>
						);
						})}
					</div>
			</div>				{/* ECG Image - Prominent Display */}
			<div className="ecg-image-container">
				{imageLoading ? (
					<div className="ecg-image-loading">
						<div className="loading-spinner"></div>
						<p>Loading ECG image...</p>
					</div>
				) : (
					<>
						<img 
							src={quiz.image_url || `${API_BASE}/api/ecg/images?category=${quiz.category || 'normal'}`} 
							alt={quiz.ecg_metadata?.diagnosis || "ECG"} 
							className="ecg-full"
							onError={(e) => {
								e.target.onerror = null;
								// Enhanced fallback with actual ECG placeholder
								e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCBmaWxsPSIjZWNmMGYxIiB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIvPjx0ZXh0IHg9IjQwMCIgeT0iMzAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjN2Y4YzhkIiBmb250LXNpemU9IjIwIj5FQ0cgSW1hZ2UgVW5hdmFpbGFibGU8L3RleHQ+PC9zdmc+Cg==';
							}}
						/>
						{imageError && (
							<div className="image-error-banner">
								⚠️ Image loading error: {imageError}
							</div>
						)}
					</>
				)}
				<div className="ecg-quality-indicator">
					{quiz.ecg_metadata?.description || "Normal quality | Good P waves visible"}
				</div>
				
				{/* Key Features from Library */}
				{quiz.key_features && quiz.key_features.length > 0 && (
					<div className="key-features-box">
						<h4>🔍 Key ECG Features:</h4>
						<ul>
							{quiz.key_features.map((feature, idx) => (
								<li key={idx}>{feature}</li>
							))}
						</ul>
					</div>
				)}
				
				{/* Clinical Context from Library */}
				{quiz.clinical_context && (
					<div className="clinical-context-box">
						<h4>📋 Clinical Context:</h4>
						<p>{quiz.clinical_context}</p>
					</div>
				)}
				
			{/* Phase 8 M2: ECG Pattern Mapping */}
			<ECGPatternMapping ecgCase={selectedCase} />
			
			{/* Phase 8 M3: Clinical Correlation Microcard */}
			{quiz.key_features && quiz.key_features.length > 0 && (
				<div className="clinical-correlation-microcard">
					<h5>💡 What This Pattern Often Means</h5>
					<p className="correlation-text">
						{quiz.key_features.slice(0, 2).join('. ')}. 
						{quiz.clinical_context ? ` Clinical correlation: ${quiz.clinical_context.slice(0, 100)}...` : ''}
					</p>
				</div>
			)}
		</div>				<div className="question-section">
					<p className="question-stem">{quiz.question_stem || 'What is the most likely diagnosis?'}</p>						<div className="options-grid">
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
							<div className={`result-banner ${isCorrect ? 'correct' : 'incorrect'} ${colorBlindMode ? 'colorblind' : ''}`}>
								{isCorrect ? '✅ Correct!' : '❌ Incorrect'}
								{isCorrect && <span className="xp-badge">+{quiz.xp_reward} XP</span>}
							</div>								<div className="correct-answer-section">
									<h4>✓ Correct Answer:</h4>
									<p className="diagnosis-highlight">{selectedCase.diagnosis}</p>
								</div>

					<div className="explanation-text">
						<h4>📈 ECG Explanation:</h4>
						<p>{quiz.explanation}</p>
					</div>								<div className="key-features">
									<h4>🔑 Key ECG Features:</h4>
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

						{/* Phase 8 M3: Button group with learning path */}
						<div className="quiz-actions">
							<button className="next-button next-case-button" onClick={handleNextCase}>
								Next ECG →
							</button>
							
							<button 
								className="continue-learning-button" 
								onClick={() => {
									const recommendation = getFallbackRecommendation();
									if (recommendation.recommended_ids && recommendation.recommended_ids.length > 0) {
										const nextCase = cases.find(c => c.id === recommendation.recommended_ids[0]);
										if (nextCase) {
											startQuiz(nextCase);
										}
									} else {
										// If no recommendations, just pick next unlocked case
										const nextUnlockedCase = cases.find(c => unlockedDifficulties.includes(c.difficulty));
										if (nextUnlockedCase) startQuiz(nextUnlockedCase);
									}
								}}
								title="Get recommended ECG based on your performance"
							>
								🎯 Continue Learning Path
							</button>
						</div>
					</div>
						)}
					</div>
				</div>
			</div>
		);
	}



	return <div className="ecg-module">Loading...</div>;
}
