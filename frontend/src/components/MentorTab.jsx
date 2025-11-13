import React, { useState, useEffect } from 'react';

/**
 * MentorTab Component
 * 
 * Provides AI-powered personalized tutoring with weak-area remediation.
 * Features:
 * - Ask clinical questions to AI mentor
 * - Get personalized advice based on weak areas
 * - Receive remediation plans with suggested topics
 * - Track mentor session history
 * 
 * Phase 4 Milestone 2: AI Mentor Mode
 */
function MentorTab({ uid, currentTopic }) {
	const [question, setQuestion] = useState('');
	const [response, setResponse] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [sessionHistory, setSessionHistory] = useState([]);
	const [showHistory, setShowHistory] = useState(false);

	// Fetch session history on mount
	useEffect(() => {
		if (uid) {
			fetchSessionHistory();
		}
	}, [uid]);

	const fetchSessionHistory = async () => {
		try {
			const res = await fetch(`/api/mentor/progress/${uid}`);
			if (res.ok) {
				const data = await res.json();
				setSessionHistory(data.sessions || []);
			}
		} catch (err) {
			console.error('Failed to fetch session history:', err);
		}
	};

	const askMentor = async () => {
		if (!question.trim()) {
			setError('Please enter a question');
			return;
		}

		setLoading(true);
		setError(null);
		setResponse(null);

		try {
			const res = await fetch('/api/mentor/session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					uid,
					topic: currentTopic || 'General',
					userQuestion: question
				})
			});

			if (!res.ok) {
				throw new Error(`HTTP ${res.status}: ${res.statusText}`);
			}

			const data = await res.json();
			setResponse(data);
			setQuestion(''); // Clear input after successful submission
			
			// Refresh session history
			fetchSessionHistory();
		} catch (err) {
			console.error('Mentor API error:', err);
			setError(`Failed to get mentor response: ${err.message}`);
		} finally {
			setLoading(false);
		}
	};

	const handleKeyPress = (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			askMentor();
		}
	};

	return (
		<div className="mentor-tab" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
			<div className="mentor-header" style={{ marginBottom: '20px' }}>
				<h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
					🧠 Ask Your AI Mentor
				</h2>
				<p style={{ color: '#666', fontSize: '14px' }}>
					Get personalized tutoring based on your weak areas and learning history
				</p>
			</div>

			{/* Question Input */}
			<div className="mentor-input-section" style={{ marginBottom: '30px' }}>
				<textarea
					value={question}
					onChange={(e) => setQuestion(e.target.value)}
					onKeyPress={handleKeyPress}
					placeholder="Ask a clinical question (e.g., 'How do I interpret CHA₂DS₂-VASc score in atrial fibrillation?')"
					style={{
						width: '100%',
						minHeight: '100px',
						padding: '12px',
						fontSize: '14px',
						border: '2px solid #e0e0e0',
						borderRadius: '8px',
						resize: 'vertical',
						fontFamily: 'inherit'
					}}
				/>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
					<button
						onClick={askMentor}
						disabled={loading || !question.trim()}
						style={{
							padding: '10px 24px',
							fontSize: '16px',
							fontWeight: 'bold',
							color: 'white',
							backgroundColor: loading ? '#ccc' : '#007bff',
							border: 'none',
							borderRadius: '6px',
							cursor: loading ? 'not-allowed' : 'pointer',
							transition: 'background-color 0.2s'
						}}
					>
						{loading ? '🤔 Thinking...' : '💬 Ask Mentor'}
					</button>
					<button
						onClick={() => setShowHistory(!showHistory)}
						style={{
							padding: '10px 20px',
							fontSize: '14px',
							color: '#007bff',
							backgroundColor: 'transparent',
							border: '1px solid #007bff',
							borderRadius: '6px',
							cursor: 'pointer'
						}}
					>
						{showHistory ? 'Hide History' : 'Show History'} ({sessionHistory.length})
					</button>
				</div>
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

			{/* Mentor Response */}
			{response && (
				<div className="mentor-response" style={{
					padding: '20px',
					backgroundColor: '#f8f9fa',
					border: '2px solid #007bff',
					borderRadius: '8px',
					marginBottom: '30px'
				}}>
					<h3 style={{ marginTop: 0, color: '#007bff' }}>
						💡 Mentor's Advice
					</h3>
					<div style={{
						backgroundColor: 'white',
						padding: '15px',
						borderRadius: '6px',
						marginBottom: '20px',
						lineHeight: '1.6'
					}}>
						{response.advice}
					</div>

					{response.remediationPlan && (
						<div className="remediation-plan">
							<h4 style={{ color: '#28a745' }}>📚 Remediation Plan</h4>
							
							{response.remediationPlan.suggestedTopics && response.remediationPlan.suggestedTopics.length > 0 && (
								<div style={{ marginBottom: '15px' }}>
									<strong>Suggested Topics to Review:</strong>
									<ul style={{ marginTop: '8px' }}>
										{response.remediationPlan.suggestedTopics.map((topic, idx) => (
											<li key={idx} style={{ marginBottom: '5px' }}>{topic}</li>
										))}
									</ul>
								</div>
							)}

							{response.remediationPlan.learningPath && response.remediationPlan.learningPath.length > 0 && (
								<div style={{ marginBottom: '15px' }}>
									<strong>Recommended Learning Path:</strong>
									<ol style={{ marginTop: '8px' }}>
										{response.remediationPlan.learningPath.map((step, idx) => (
											<li key={idx} style={{ marginBottom: '5px' }}>{step}</li>
										))}
									</ol>
								</div>
							)}

							{response.remediationPlan.estimatedTimeMinutes && (
								<div style={{
									padding: '10px',
									backgroundColor: '#e7f3ff',
									borderRadius: '4px',
									fontSize: '14px'
								}}>
									⏱️ Estimated time: {response.remediationPlan.estimatedTimeMinutes} minutes
								</div>
							)}
						</div>
					)}

					<div style={{
						marginTop: '15px',
						paddingTop: '15px',
						borderTop: '1px solid #dee2e6',
						fontSize: '12px',
						color: '#666'
					}}>
						Session ID: {response.sessionId} | {new Date().toLocaleString()}
					</div>
				</div>
			)}

			{/* Session History */}
			{showHistory && (
				<div className="session-history" style={{
					padding: '20px',
					backgroundColor: '#fff',
					border: '1px solid #dee2e6',
					borderRadius: '8px'
				}}>
					<h3 style={{ marginTop: 0 }}>📜 Session History</h3>
					{sessionHistory.length === 0 ? (
						<p style={{ color: '#666' }}>No previous sessions yet. Ask your first question above!</p>
					) : (
						<div>
							{sessionHistory.slice(0, 10).map((session, idx) => (
								<div key={idx} style={{
									padding: '12px',
									marginBottom: '10px',
									backgroundColor: '#f8f9fa',
									borderLeft: '3px solid #007bff',
									borderRadius: '4px'
								}}>
									<div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
										{session.topic || 'General'}
									</div>
									<div style={{ fontSize: '13px', color: '#666' }}>
										{new Date(session.timestamp).toLocaleString()}
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{/* Usage Tips */}
			<div className="mentor-tips" style={{
				marginTop: '30px',
				padding: '15px',
				backgroundColor: '#fff9e6',
				border: '1px solid #ffe066',
				borderRadius: '6px',
				fontSize: '14px'
			}}>
				<strong>💡 Tips for best results:</strong>
				<ul style={{ marginTop: '8px', marginBottom: 0 }}>
					<li>Be specific about what you're struggling with</li>
					<li>Ask about clinical reasoning, not just facts</li>
					<li>Use the mentor to clarify complex concepts</li>
					<li>Follow up on the suggested remediation topics</li>
				</ul>
			</div>
		</div>
	);
}

export default MentorTab;
