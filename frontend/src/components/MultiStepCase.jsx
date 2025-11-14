// frontend/src/components/MultiStepCase.jsx — Multi-step case with progressive disclosure

import React, { useState } from 'react';

export default function MultiStepCase({ backendUrl, onAnalyzeReasoning }) {
	const [caseData, setCaseData] = useState(null);
	const [currentStep, setCurrentStep] = useState(0);
	const [userAnswers, setUserAnswers] = useState([]);
	const [loading, setLoading] = useState(false);

	// Generate new multi-step case
	const handleGenerateCase = async () => {
		setLoading(true);
		try {
			const response = await fetch(`${backendUrl}/api/reasoning/multi_step_case`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					specialty: 'General Medicine',
					difficulty: 'Intermediate',
					topic: 'Any',
				}),
			});

			const data = await response.json();
			if (data.success) {
				setCaseData(data);
				setCurrentStep(0);
				setUserAnswers([]);
			}
		} catch (error) {
			console.error('Error generating case:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleStepAnswer = (answer) => {
		setUserAnswers([...userAnswers, {
			step: currentStep,
			answer,
			timestamp: Date.now(),
		}]);
	};

	const handleNextStep = () => {
		if (currentStep < (caseData?.steps?.length || 0) - 1) {
			setCurrentStep(currentStep + 1);
		}
	};

	const handleFinishCase = () => {
		const timeTaken = (Date.now() - (userAnswers[0]?.timestamp || Date.now())) / 1000;
		onAnalyzeReasoning({
			case_id: caseData.case_id,
			steps: userAnswers,
			final_diagnosis: caseData.final_diagnosis,
			time_taken: timeTaken,
		});
	};

	if (!caseData) {
		return (
			<div className="multistep-case">
				<h3>🎯 Multi-Step Clinical Cases</h3>
				<p>Work through progressive disclosure cases to improve diagnostic reasoning</p>
				<button onClick={handleGenerateCase} disabled={loading} className="btn-primary">
					🚀 Start New Case
				</button>
			</div>
		);
	}

	const step = caseData.steps[currentStep];

	return (
		<div className="multistep-case">
			<div className="case-header">
				<h3>📋 {caseData.specialty} Case</h3>
				<div className="case-progress">
					Step {currentStep + 1} of {caseData.steps.length}
					<div className="progress-bar">
						<div
							className="progress-fill"
							style={{ width: `${((currentStep + 1) / caseData.steps.length) * 100}%` }}
						/>
					</div>
				</div>
			</div>

			<div className="step-content">
				<h4>{step.title}</h4>
				<div className="step-info">
					<p>{step.content}</p>
					
					{step.available_information && (
						<div className="clinical-info">
							<h5>Clinical Information:</h5>
							<pre>{JSON.stringify(step.available_information, null, 2)}</pre>
						</div>
					)}
				</div>

				<div className="step-question">
					<h5>❓ {step.question}</h5>
					<textarea
						placeholder="Enter your answer..."
						onChange={(e) => handleStepAnswer(e.target.value)}
						rows={4}
					/>
				</div>

				{step.next_actions && (
					<div className="next-actions">
						<h5>Possible Actions:</h5>
						<ul>
							{step.next_actions.map((action, index) => (
								<li key={index}>{action}</li>
							))}
						</ul>
					</div>
				)}
			</div>

			<div className="step-navigation">
				<button
					onClick={handleNextStep}
					disabled={currentStep === caseData.steps.length - 1}
					className="btn-secondary"
				>
					Next Step →
				</button>
				{currentStep === caseData.steps.length - 1 && (
					<button onClick={handleFinishCase} className="btn-primary">
						✅ Finish & Analyze
					</button>
				)}
			</div>
		</div>
	);
}
