// frontend/src/components/DifferentialBuilder.jsx — Differential diagnosis builder component

import React, { useState } from 'react';

export default function DifferentialBuilder({
	caseData,
	studentDifferentials,
	setStudentDifferentials,
	expertDifferential,
	onGenerateExpert,
	onCompare,
	comparisonResult,
	loading,
}) {
	const [newDiagnosis, setNewDiagnosis] = useState('');
	const [newProbability, setNewProbability] = useState(0.5);

	const handleAddDiagnosis = () => {
		if (!newDiagnosis.trim()) return;

		setStudentDifferentials([
			...studentDifferentials,
			{
				diagnosis: newDiagnosis,
				probability: newProbability,
			},
		]);

		setNewDiagnosis('');
		setNewProbability(0.5);
	};

	const handleRemoveDiagnosis = (index) => {
		setStudentDifferentials(studentDifferentials.filter((_, i) => i !== index));
	};

	return (
		<div className="differential-builder">
			<div className="builder-section">
				<h3>🎓 Your Differential Diagnosis</h3>

				{/* Input form */}
				<div className="diagnosis-input">
					<input
						type="text"
						placeholder="Enter diagnosis (e.g., STEMI, PE, Pneumonia)"
						value={newDiagnosis}
						onChange={(e) => setNewDiagnosis(e.target.value)}
						onKeyPress={(e) => e.key === 'Enter' && handleAddDiagnosis()}
					/>
					<div className="probability-slider">
						<label>Probability: {(newProbability * 100).toFixed(0)}%</label>
						<input
							type="range"
							min="0"
							max="1"
							step="0.05"
							value={newProbability}
							onChange={(e) => setNewProbability(parseFloat(e.target.value))}
						/>
					</div>
					<button onClick={handleAddDiagnosis} disabled={!newDiagnosis.trim()}>
						➕ Add Diagnosis
					</button>
				</div>

				{/* Student's differential list */}
				{studentDifferentials.length > 0 && (
					<div className="diagnosis-list">
						<h4>Your Differentials ({studentDifferentials.length})</h4>
						{studentDifferentials.map((diff, index) => {
							// Safely convert diagnosis to string
							const safeString = (value) => {
								if (value == null) return "";
								if (typeof value === "string") return value;
								if (typeof value === "number" || typeof value === "boolean") return String(value);
								if (Array.isArray(value)) return value.map(safeString).join(", ");
								if (typeof value === "object") {
									if (value.text) return safeString(value.text);
									if (value.value) return safeString(value.value);
									if (value.label || value.name || value.diagnosis) return safeString(value.label || value.name || value.diagnosis);
									return JSON.stringify(value);
								}
								return String(value);
							};
							const diagnosisText = safeString(diff.diagnosis || "");
							return (
							<div key={index} className="diagnosis-item">
									<span className="diagnosis-name">{diagnosisText}</span>
								<span className="diagnosis-probability">
									{(diff.probability * 100).toFixed(0)}%
								</span>
								<button onClick={() => handleRemoveDiagnosis(index)}>❌</button>
							</div>
							);
						})}
					</div>
				)}

				{/* Action buttons */}
				<div className="action-buttons">
					<button
						onClick={onGenerateExpert}
						disabled={loading}
						className="btn-primary"
					>
						🤖 Generate Expert Differential
					</button>
					{studentDifferentials.length > 0 && expertDifferential && (
						<button
							onClick={onCompare}
							disabled={loading}
							className="btn-secondary"
						>
							📊 Compare My Differential
						</button>
					)}
				</div>
			</div>

			{/* Expert differential display */}
			{expertDifferential && (
				<div className="builder-section expert-section">
					<h3>👨‍⚕️ Expert Differential Diagnosis</h3>
					<div className="expert-differentials">
						{expertDifferential.expert_differentials?.map((diff, index) => (
							<div key={index} className="expert-diagnosis-item">
								<div className="diagnosis-header">
									<span className="rank">#{index + 1}</span>
									<span className="diagnosis-name">{diff.condition}</span>
									<span className="probability">
										{(diff.probability * 100).toFixed(1)}%
									</span>
								</div>
								<div className="diagnosis-details">
									<p><strong>Reasoning:</strong> {diff.reasoning}</p>
									<p><strong>Supporting:</strong> {diff.supporting_findings?.join(', ')}</p>
									{diff.contradicting_findings?.length > 0 && (
										<p><strong>Against:</strong> {diff.contradicting_findings.join(', ')}</p>
									)}
									<p><strong>Next Step:</strong> {diff.next_step}</p>
									{diff.red_flags && (
										<p className="red-flags">
											<strong>⚠️ Red Flags:</strong> {diff.red_flags.join(', ')}
										</p>
									)}
								</div>
							</div>
						))}
					</div>

					{/* Expert feedback */}
					{expertDifferential.feedback && (
						<div className="expert-feedback">
							<h4>💬 Expert Feedback</h4>
							<p>{expertDifferential.feedback}</p>
							{expertDifferential.student_score !== undefined && (
								<div className="score-badge">
									Score: {expertDifferential.student_score}/100
								</div>
							)}
						</div>
					)}
				</div>
			)}

			{/* Comparison results */}
			{comparisonResult && (
				<div className="builder-section comparison-section">
					<h3>📈 Comparison Analysis</h3>
					<div className="comparison-stats">
						<div className="stat-box">
							<div className="stat-value">{comparisonResult.overall_score}/100</div>
							<div className="stat-label">Overall Score</div>
						</div>
						<div className="stat-box">
							<div className="stat-value">{comparisonResult.overlap_score}%</div>
							<div className="stat-label">Overlap</div>
						</div>
						<div className="stat-box">
							<div className="stat-value">{comparisonResult.ranking_accuracy}%</div>
							<div className="stat-label">Ranking Accuracy</div>
						</div>
						<div className="stat-box">
							<div className="stat-value">{comparisonResult.performance_level}</div>
							<div className="stat-label">Performance</div>
						</div>
					</div>

					{/* Critical misses */}
					{comparisonResult.critical_misses?.length > 0 && (
						<div className="critical-misses">
							<h4>⚠️ Critical Misses</h4>
							{comparisonResult.critical_misses.map((miss, index) => {
								// Safely convert diagnosis to string
								const safeString = (value) => {
									if (value == null) return "";
									if (typeof value === "string") return value;
									if (typeof value === "number" || typeof value === "boolean") return String(value);
									if (Array.isArray(value)) return value.map(safeString).join(", ");
									if (typeof value === "object") {
										if (value.text) return safeString(value.text);
										if (value.value) return safeString(value.value);
										if (value.label || value.name || value.diagnosis) return safeString(value.label || value.name || value.diagnosis);
										return JSON.stringify(value);
									}
									return String(value);
								};
								const diagnosisText = safeString(miss.diagnosis || "");
								const whyCriticalText = safeString(miss.why_critical || "");
								const teachingPointText = safeString(miss.teaching_point || "");
								return (
								<div key={index} className="miss-item">
										{diagnosisText && <strong>{diagnosisText}</strong>} (Expert: {(miss.expert_probability * 100).toFixed(0)}%)
										{whyCriticalText && <p>{whyCriticalText}</p>}
										{teachingPointText && <p className="teaching-point"><em>{teachingPointText}</em></p>}
								</div>
								);
							})}
						</div>
					)}

					{/* Strengths */}
					{comparisonResult.strengths?.length > 0 && (
						<div className="strengths">
							<h4>✅ Strengths</h4>
							<ul>
								{comparisonResult.strengths.map((strength, index) => (
									<li key={index}>{strength}</li>
								))}
							</ul>
						</div>
					)}

					{/* Areas for improvement */}
					{comparisonResult.areas_for_improvement?.length > 0 && (
						<div className="improvements">
							<h4>📚 Areas for Improvement</h4>
							<ul>
								{comparisonResult.areas_for_improvement.map((area, index) => (
									<li key={index}>{area}</li>
								))}
							</ul>
						</div>
					)}

					{/* Recommended study */}
					{comparisonResult.recommended_study?.length > 0 && (
						<div className="recommended-study">
							<h4>📖 Recommended Study Topics</h4>
							<ul>
								{comparisonResult.recommended_study.map((topic, index) => (
									<li key={index}>{topic}</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
