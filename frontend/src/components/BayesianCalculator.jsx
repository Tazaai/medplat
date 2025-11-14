// frontend/src/components/BayesianCalculator.jsx — Bayesian probability calculator

import React, { useState } from 'react';

export default function BayesianCalculator({ backendUrl }) {
	const [priorProbability, setPriorProbability] = useState(0.3);
	const [sensitivity, setSensitivity] = useState(0.9);
	const [specificity, setSpecificity] = useState(0.95);
	const [testPositive, setTestPositive] = useState(true);
	const [result, setResult] = useState(null);
	const [loading, setLoading] = useState(false);

	const handleCalculate = async () => {
		setLoading(true);
		try {
			const response = await fetch(`${backendUrl}/api/reasoning/bayesian_calculate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					prior_probability: priorProbability,
					sensitivity,
					specificity,
					test_positive: testPositive,
				}),
			});

			const data = await response.json();
			setResult(data);
		} catch (error) {
			console.error('Bayesian calculation error:', error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="bayesian-calculator">
			<h3>📊 Bayesian Probability Calculator</h3>
			<p>Calculate post-test probability using Bayes' theorem</p>

			<div className="calculator-form">
				<div className="form-group">
					<label>Pre-test Probability (Prior): {(priorProbability * 100).toFixed(0)}%</label>
					<input
						type="range"
						min="0"
						max="1"
						step="0.01"
						value={priorProbability}
						onChange={(e) => setPriorProbability(parseFloat(e.target.value))}
					/>
					<p className="help-text">
						Based on clinical presentation, prevalence, or risk assessment
					</p>
				</div>

				<div className="form-group">
					<label>Test Sensitivity: {(sensitivity * 100).toFixed(0)}%</label>
					<input
						type="range"
						min="0"
						max="1"
						step="0.01"
						value={sensitivity}
						onChange={(e) => setSensitivity(parseFloat(e.target.value))}
					/>
					<p className="help-text">True positive rate (how often test detects disease when present)</p>
				</div>

				<div className="form-group">
					<label>Test Specificity: {(specificity * 100).toFixed(0)}%</label>
					<input
						type="range"
						min="0"
						max="1"
						step="0.01"
						value={specificity}
						onChange={(e) => setSpecificity(parseFloat(e.target.value))}
					/>
					<p className="help-text">True negative rate (how often test is negative when disease absent)</p>
				</div>

				<div className="form-group">
					<label>Test Result</label>
					<div className="radio-group">
						<label>
							<input
								type="radio"
								checked={testPositive}
								onChange={() => setTestPositive(true)}
							/>
							Positive
						</label>
						<label>
							<input
								type="radio"
								checked={!testPositive}
								onChange={() => setTestPositive(false)}
							/>
							Negative
						</label>
					</div>
				</div>

				<button onClick={handleCalculate} disabled={loading} className="btn-calculate">
					🧮 Calculate Post-Test Probability
				</button>
			</div>

			{result && (
				<div className="calculation-result">
					<h4>📈 Results</h4>
					<div className="result-stats">
						<div className="result-item">
							<span className="result-label">Pre-test Probability:</span>
							<span className="result-value">{(result.prior_probability * 100).toFixed(1)}%</span>
						</div>
						<div className="result-item">
							<span className="result-label">Likelihood Ratio:</span>
							<span className="result-value">{result.likelihood_ratio.toFixed(2)}</span>
						</div>
						<div className="result-item highlight">
							<span className="result-label">Post-test Probability:</span>
							<span className="result-value">{(result.post_probability * 100).toFixed(1)}%</span>
						</div>
						<div className="result-item">
							<span className="result-label">Change:</span>
							<span className={`result-value ${result.change > 0 ? 'positive' : 'negative'}`}>
								{result.change > 0 ? '+' : ''}{(result.change * 100).toFixed(1)}%
							</span>
						</div>
					</div>

					<div className="interpretation">
						<h5>💡 Interpretation</h5>
						<p><strong>{result.interpretation}</strong></p>
						
						{result.likelihood_ratio > 10 && (
							<p className="lr-interpretation">
								🔥 Very strong positive test (LR &gt; 10) - substantially increases disease probability
							</p>
						)}
						{result.likelihood_ratio > 5 && result.likelihood_ratio <= 10 && (
							<p className="lr-interpretation">
								✅ Strong positive test (LR 5-10) - significantly increases disease probability
							</p>
						)}
						{result.likelihood_ratio < 0.1 && (
							<p className="lr-interpretation">
								🔥 Very strong negative test (LR &lt; 0.1) - substantially decreases disease probability
							</p>
						)}
						{result.likelihood_ratio < 0.2 && result.likelihood_ratio >= 0.1 && (
							<p className="lr-interpretation">
								✅ Strong negative test (LR 0.1-0.2) - significantly decreases disease probability
							</p>
						)}
					</div>

					<div className="clinical-guidance">
						<h5>🎯 Clinical Guidance</h5>
						{result.post_probability > 0.9 ? (
							<p>Diagnosis highly likely (&gt;90%). Consider proceeding with treatment.</p>
						) : result.post_probability < 0.1 ? (
							<p>Diagnosis highly unlikely (&lt;10%). Consider alternative diagnoses.</p>
						) : (
							<p>Diagnosis still uncertain ({(result.post_probability * 100).toFixed(0)}%). Consider additional testing or clinical judgment.</p>
						)}
					</div>
				</div>
			)}

			{/* Example scenarios */}
			<div className="example-scenarios">
				<h4>📚 Example Scenarios</h4>
				<div className="scenario-grid">
					<div className="scenario-card" onClick={() => {
						setPriorProbability(0.1);
						setSensitivity(0.99);
						setSpecificity(0.4);
						setTestPositive(true);
					}}>
						<h5>D-dimer for PE</h5>
						<p>High sensitivity (99%), low specificity (40%)</p>
						<p className="scenario-note">Good rule-out test when negative</p>
					</div>
					<div className="scenario-card" onClick={() => {
						setPriorProbability(0.3);
						setSensitivity(0.85);
						setSpecificity(0.99);
						setTestPositive(true);
					}}>
						<h5>Troponin for MI</h5>
						<p>High sensitivity (85%), high specificity (99%)</p>
						<p className="scenario-note">Excellent rule-in when positive</p>
					</div>
					<div className="scenario-card" onClick={() => {
						setPriorProbability(0.5);
						setSensitivity(0.6);
						setSpecificity(0.6);
						setTestPositive(true);
					}}>
						<h5>Low-value Test</h5>
						<p>Moderate sensitivity and specificity (60%)</p>
						<p className="scenario-note">Minimal impact on probability</p>
					</div>
				</div>
			</div>
		</div>
	);
}
