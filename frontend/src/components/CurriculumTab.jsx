import React, { useState, useEffect } from 'react';

/**
 * CurriculumTab Component
 * 
 * Adaptive exam path builder for USMLE, MRCP, FRCA, and regional certifications.
 * Features:
 * - Generate personalized study roadmaps based on weak areas
 * - Track progress through curriculum modules
 * - Display timeline and completion status
 * - Support region-specific exam paths
 * 
 * Phase 4 Milestone 3: Curriculum Builder
 */
function CurriculumTab({ uid, currentTopic }) {
	const [curriculum, setCurriculum] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [showGenerator, setShowGenerator] = useState(false);

	// Form state for curriculum generation
	const [examType, setExamType] = useState('USMLE');
	const [targetWeeks, setTargetWeeks] = useState(12);
	const [region, setRegion] = useState('unspecified');
	const [language, setLanguage] = useState('en');

	// Load existing curriculum on mount
	useEffect(() => {
		if (uid) {
			loadCurriculum();
		}
	}, [uid]);

	const loadCurriculum = async () => {
		try {
			const res = await fetch(`/api/curriculum/${uid}`);
			if (res.ok) {
				const data = await res.json();
				if (data.activeCurriculum) {
					setCurriculum(data.activeCurriculum);
				}
			}
		} catch (err) {
			console.error('Failed to load curriculum:', err);
		}
	};

	const generateCurriculum = async () => {
		if (!uid) {
			setError('User ID is required');
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const res = await fetch('/api/curriculum/path', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					uid,
					examType,
					targetWeeks: parseInt(targetWeeks),
					region,
					language
				})
			});

			if (!res.ok) {
				throw new Error(`HTTP ${res.status}: ${res.statusText}`);
			}

			const data = await res.json();
			setCurriculum(data.curriculum);
			setShowGenerator(false);
		} catch (err) {
			console.error('Curriculum generation error:', err);
			setError(`Failed to generate curriculum: ${err.message}`);
		} finally {
			setLoading(false);
		}
	};

	const updateProgress = async (moduleIndex) => {
		if (!curriculum || !curriculum.sessionId) return;

		try {
			const res = await fetch(`/api/curriculum/${uid}/${curriculum.sessionId}/progress`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					moduleIndex,
					completed: true
				})
			});

			if (res.ok) {
				const data = await res.json();
				setCurriculum(prev => ({
					...prev,
					progress: data.progress,
					completedModules: [...(prev.completedModules || []), moduleIndex]
				}));
			}
		} catch (err) {
			console.error('Progress update failed:', err);
		}
	};

	const examTypeOptions = [
		{ value: 'USMLE', label: 'USMLE (United States)' },
		{ value: 'MRCP', label: 'MRCP (United Kingdom)' },
		{ value: 'FRCA', label: 'FRCA (Anaesthetics)' },
		{ value: 'DK_NATIONAL', label: 'Danish National Exam' }
	];

	const regionOptions = [
		{ value: 'unspecified', label: 'Global / Unspecified' },
		{ value: 'Denmark', label: 'Denmark' },
		{ value: 'United Kingdom', label: 'United Kingdom' },
		{ value: 'United States', label: 'United States' },
		{ value: 'Germany', label: 'Germany' },
		{ value: 'France', label: 'France' },
		{ value: 'Australia', label: 'Australia' }
	];

	return (
		<div className="curriculum-tab" style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
			<div className="curriculum-header" style={{ marginBottom: '20px' }}>
				<h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
					📚 My Study Curriculum
				</h2>
				<p style={{ color: '#666', fontSize: '14px' }}>
					Adaptive exam paths tailored to your weak areas and target timeline
				</p>
			</div>

			{/* Error Display */}
			{error && (
				<div style={{
					padding: '15px',
					marginBottom: '20px',
					backgroundColor: '#fee',
					border: '1px solid #fcc',
					borderRadius: '6px',
					color: '#c00'
				}}>
					⚠️ {error}
				</div>
			)}

			{/* No Curriculum - Show Generator Button */}
			{!curriculum && !showGenerator && (
				<div style={{
					padding: '40px',
					textAlign: 'center',
					backgroundColor: '#f8f9fa',
					borderRadius: '8px',
					border: '2px dashed #dee2e6'
				}}>
					<h3>No Active Curriculum</h3>
					<p style={{ color: '#666', marginBottom: '20px' }}>
						Create a personalized study plan based on your target exam and timeline
					</p>
					<button
						onClick={() => setShowGenerator(true)}
						style={{
							padding: '12px 24px',
							fontSize: '16px',
							fontWeight: 'bold',
							color: 'white',
							backgroundColor: '#28a745',
							border: 'none',
							borderRadius: '6px',
							cursor: 'pointer'
						}}
					>
						📚 Generate My Curriculum
					</button>
				</div>
			)}

			{/* Curriculum Generator Form */}
			{showGenerator && (
				<div style={{
					padding: '20px',
					backgroundColor: '#fff',
					border: '2px solid #007bff',
					borderRadius: '8px',
					marginBottom: '20px'
				}}>
					<h3>📝 Create Your Study Plan</h3>

					<div style={{ marginTop: '20px' }}>
						<label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
							Target Exam:
						</label>
						<select
							value={examType}
							onChange={(e) => setExamType(e.target.value)}
							style={{
								width: '100%',
								padding: '8px',
								fontSize: '14px',
								border: '1px solid #dee2e6',
								borderRadius: '4px'
							}}
						>
							{examTypeOptions.map(opt => (
								<option key={opt.value} value={opt.value}>{opt.label}</option>
							))}
						</select>
					</div>

					<div style={{ marginTop: '15px' }}>
						<label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
							Study Duration (weeks):
						</label>
						<input
							type="number"
							value={targetWeeks}
							onChange={(e) => setTargetWeeks(e.target.value)}
							min="4"
							max="52"
							style={{
								width: '100%',
								padding: '8px',
								fontSize: '14px',
								border: '1px solid #dee2e6',
								borderRadius: '4px'
							}}
						/>
						<small style={{ color: '#666' }}>Recommended: 8-16 weeks</small>
					</div>

					<div style={{ marginTop: '15px' }}>
						<label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
							Region (for guideline focus):
						</label>
						<select
							value={region}
							onChange={(e) => setRegion(e.target.value)}
							style={{
								width: '100%',
								padding: '8px',
								fontSize: '14px',
								border: '1px solid #dee2e6',
								borderRadius: '4px'
							}}
						>
							{regionOptions.map(opt => (
								<option key={opt.value} value={opt.value}>{opt.label}</option>
							))}
						</select>
					</div>

					<div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
						<button
							onClick={generateCurriculum}
							disabled={loading}
							style={{
								flex: 1,
								padding: '10px',
								fontSize: '16px',
								fontWeight: 'bold',
								color: 'white',
								backgroundColor: loading ? '#ccc' : '#28a745',
								border: 'none',
								borderRadius: '6px',
								cursor: loading ? 'not-allowed' : 'pointer'
							}}
						>
							{loading ? '⏳ Generating...' : '✨ Generate Curriculum'}
						</button>
						<button
							onClick={() => setShowGenerator(false)}
							style={{
								padding: '10px 20px',
								fontSize: '14px',
								color: '#666',
								backgroundColor: '#fff',
								border: '1px solid #dee2e6',
								borderRadius: '6px',
								cursor: 'pointer'
							}}
						>
							Cancel
						</button>
					</div>
				</div>
			)}

			{/* Active Curriculum Display */}
			{curriculum && (
				<div className="curriculum-content">
					{/* Header with Progress */}
					<div style={{
						padding: '20px',
						backgroundColor: '#e7f3ff',
						borderRadius: '8px',
						marginBottom: '20px'
					}}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
							<div>
								<h3 style={{ margin: 0 }}>
									{curriculum.examType === 'USMLE' && '🇺🇸 USMLE'}
									{curriculum.examType === 'MRCP' && '🇬🇧 MRCP'}
									{curriculum.examType === 'FRCA' && '💉 FRCA'}
									{curriculum.examType === 'DK_NATIONAL' && '🇩🇰 Danish National Exam'}
									{' '}Study Plan
								</h3>
								<p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
									{curriculum.targetWeeks} weeks • {curriculum.region || 'Global'}
								</p>
							</div>
							<div style={{ textAlign: 'right' }}>
								<div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
									{curriculum.progress || 0}%
								</div>
								<div style={{ fontSize: '12px', color: '#666' }}>
									{curriculum.completedModules?.length || 0} / {curriculum.modules?.length || curriculum.totalWeeks} modules
								</div>
							</div>
						</div>

						{/* Progress Bar */}
						<div style={{
							marginTop: '15px',
							height: '10px',
							backgroundColor: '#dee2e6',
							borderRadius: '5px',
							overflow: 'hidden'
						}}>
							<div style={{
								height: '100%',
								width: `${curriculum.progress || 0}%`,
								backgroundColor: '#28a745',
								transition: 'width 0.3s ease'
							}} />
						</div>
					</div>

					{/* Weak Areas Addressed */}
					{curriculum.weakAreasAddressed && curriculum.weakAreasAddressed.length > 0 && (
						<div style={{
							padding: '15px',
							backgroundColor: '#fff3cd',
							border: '1px solid #ffc107',
							borderRadius: '6px',
							marginBottom: '20px'
						}}>
							<strong>🎯 Focus Areas (from your weak topics):</strong>
							<div style={{ marginTop: '8px' }}>
								{curriculum.weakAreasAddressed.map((topic, idx) => (
									<span key={idx} style={{
										display: 'inline-block',
										padding: '4px 8px',
										marginRight: '5px',
										marginTop: '5px',
										backgroundColor: '#fff',
										border: '1px solid #ffc107',
										borderRadius: '4px',
										fontSize: '12px'
									}}>
										{topic}
									</span>
								))}
							</div>
						</div>
					)}

					{/* Modules/Weeks List */}
					<div className="modules-list">
						<h4>📅 Weekly Study Modules</h4>
						{curriculum.modules && curriculum.modules.map((module, idx) => {
							const isCompleted = curriculum.completedModules?.includes(idx);
							
							return (
								<div key={idx} style={{
									padding: '15px',
									marginBottom: '10px',
									backgroundColor: isCompleted ? '#d4edda' : '#fff',
									border: `2px solid ${isCompleted ? '#28a745' : '#dee2e6'}`,
									borderRadius: '6px',
									transition: 'all 0.2s'
								}}>
									<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
										<div style={{ flex: 1 }}>
											<div style={{ fontWeight: 'bold', fontSize: '16px' }}>
												{isCompleted && '✅ '}
												Week {module.week || idx + 1}: {module.title}
											</div>
											<div style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
												{module.focus}
											</div>
											{module.topics && module.topics.length > 0 && (
												<div style={{ marginTop: '8px' }}>
													<strong style={{ fontSize: '13px' }}>Topics:</strong>
													<ul style={{ marginTop: '4px', marginLeft: '20px' }}>
														{module.topics.map((topic, topicIdx) => (
															<li key={topicIdx} style={{ fontSize: '13px' }}>{topic}</li>
														))}
													</ul>
												</div>
											)}
											{module.estimatedHours && (
												<div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
													⏱️ Estimated: {module.estimatedHours} hours
												</div>
											)}
										</div>
										{!isCompleted && (
											<button
												onClick={() => updateProgress(idx)}
												style={{
													padding: '6px 12px',
													fontSize: '13px',
													color: 'white',
													backgroundColor: '#007bff',
													border: 'none',
													borderRadius: '4px',
													cursor: 'pointer',
													marginLeft: '10px'
												}}
											>
												Mark Complete
											</button>
										)}
									</div>
								</div>
							);
						})}
					</div>

					{/* Milestones */}
					{curriculum.milestones && curriculum.milestones.length > 0 && (
						<div style={{ marginTop: '20px' }}>
							<h4>🎯 Assessment Milestones</h4>
							{curriculum.milestones.map((milestone, idx) => (
								<div key={idx} style={{
									padding: '12px',
									marginBottom: '8px',
									backgroundColor: '#f8f9fa',
									border: '1px solid #dee2e6',
									borderRadius: '6px',
									fontSize: '14px'
								}}>
									<strong>Week {milestone.week}:</strong> {milestone.title}
									{milestone.type === 'final_exam' && ' 🎓'}
								</div>
							))}
						</div>
					)}

					{/* Actions */}
					<div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
						<button
							onClick={() => setShowGenerator(true)}
							style={{
								padding: '10px 20px',
								fontSize: '14px',
								color: '#007bff',
								backgroundColor: 'white',
								border: '1px solid #007bff',
								borderRadius: '6px',
								cursor: 'pointer'
							}}
						>
							🔄 Generate New Plan
						</button>
					</div>
				</div>
			)}

			{/* Info Box */}
			<div style={{
				marginTop: '30px',
				padding: '15px',
				backgroundColor: '#fff9e6',
				border: '1px solid #ffe066',
				borderRadius: '6px',
				fontSize: '14px'
			}}>
				<strong>💡 How it works:</strong>
				<ul style={{ marginTop: '8px', marginBottom: 0, marginLeft: '20px' }}>
					<li>AI analyzes your weak areas and learning history</li>
					<li>Generates a progressive study roadmap for your target exam</li>
					<li>Integrates region-specific guidelines and clinical standards</li>
					<li>Tracks your progress and adapts recommendations</li>
					<li>Linked to mentor sessions and weekly progress reports</li>
				</ul>
			</div>
		</div>
	);
}

export default CurriculumTab;
