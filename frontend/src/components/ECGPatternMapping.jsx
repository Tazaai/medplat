// frontend/src/components/ECGPatternMapping.jsx — Phase 8 M2: ECG Pattern Analysis
import './ECGPatternMapping.css';

export default function ECGPatternMapping({ ecgCase }) {
	if (!ecgCase) return null;

	// Extract pattern data from key_features or generate from case data
	const patterns = extractPatterns(ecgCase);

	return (
		<div className="ecg-pattern-mapping">
			<h4>🔬 ECG Pattern Analysis</h4>
			
			<div className="pattern-grid">
				<div className="pattern-item">
					<span className="pattern-label">Rhythm:</span>
					<span className="pattern-value">{patterns.rhythm}</span>
				</div>
				
				<div className="pattern-item">
					<span className="pattern-label">Rate:</span>
					<span className="pattern-value">{patterns.rate}</span>
				</div>
				
				<div className="pattern-item">
					<span className="pattern-label">Axis:</span>
					<span className="pattern-value">{patterns.axis}</span>
				</div>
				
				<div className="pattern-item">
					<span className="pattern-label">Intervals:</span>
					<span className="pattern-value">{patterns.intervals}</span>
				</div>
				
				<div className="pattern-item">
					<span className="pattern-label">ST/T Changes:</span>
					<span className="pattern-value">{patterns.st_t_changes}</span>
				</div>
				
				<div className="pattern-item">
					<span className="pattern-label">QRS Morphology:</span>
					<span className="pattern-value">{patterns.qrs_morphology}</span>
				</div>
			</div>
			
			{patterns.key_findings && patterns.key_findings.length > 0 && (
				<div className="pattern-summary">
					<strong>Key Findings:</strong>
					<ul>
						{patterns.key_findings.map((finding, idx) => (
							<li key={idx}>{finding}</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}

/**
 * Extract pattern data from ECG case
 * Uses key_features array and diagnosis to infer patterns
 */
function extractPatterns(ecgCase) {
	const { key_features = [], diagnosis = '', title = '', category = '' } = ecgCase;
	
	// Initialize pattern object
	const patterns = {
		rhythm: 'Regular',
		rate: 'Normal (60-100 bpm)',
		axis: 'Normal',
		intervals: 'Normal',
		st_t_changes: 'None',
		qrs_morphology: 'Normal',
		key_findings: []
	};
	
	// Parse key_features for specific patterns
	key_features.forEach(feature => {
		const lower = feature.toLowerCase();
		
		// Rhythm patterns
		if (lower.includes('irregular')) {
			patterns.rhythm = feature.includes('irregularly irregular') 
				? 'Irregularly irregular' 
				: 'Irregular';
		} else if (lower.includes('regular')) {
			patterns.rhythm = 'Regular';
		}
		
		// Rate patterns
		if (lower.includes('bradycardia') || lower.includes('<60') || lower.includes('slow')) {
			patterns.rate = 'Bradycardia (<60 bpm)';
		} else if (lower.includes('tachycardia') || lower.includes('>100') || lower.includes('fast')) {
			patterns.rate = 'Tachycardia (>100 bpm)';
		}
		
		// Axis patterns
		if (lower.includes('left axis') || lower.includes('lad')) {
			patterns.axis = 'Left axis deviation';
		} else if (lower.includes('right axis') || lower.includes('rad')) {
			patterns.axis = 'Right axis deviation';
		}
		
		// Interval patterns
		if (lower.includes('prolonged pr') || lower.includes('pr interval')) {
			patterns.intervals = 'Prolonged PR interval';
		} else if (lower.includes('prolonged qt') || lower.includes('qt interval')) {
			patterns.intervals = 'Prolonged QT interval';
		} else if (lower.includes('short pr')) {
			patterns.intervals = 'Short PR interval (consider WPW)';
		}
		
		// ST/T changes
		if (lower.includes('st elevation') || lower.includes('ste')) {
			patterns.st_t_changes = 'ST elevation';
		} else if (lower.includes('st depression') || lower.includes('std')) {
			patterns.st_t_changes = 'ST depression';
		} else if (lower.includes('t wave inversion') || lower.includes('inverted t')) {
			patterns.st_t_changes = 'T wave inversion';
		}
		
		// QRS morphology
		if (lower.includes('wide qrs') || lower.includes('broad qrs')) {
			patterns.qrs_morphology = 'Wide QRS (≥120ms)';
		} else if (lower.includes('narrow qrs')) {
			patterns.qrs_morphology = 'Narrow QRS (<120ms)';
		} else if (lower.includes('delta wave')) {
			patterns.qrs_morphology = 'Delta wave present (WPW)';
		}
		
		// Add to key findings if significant
		if (lower.includes('p wave') || lower.includes('absent p') || lower.includes('no p')) {
			patterns.key_findings.push(feature);
		}
	});
	
	// Add diagnosis-based patterns
	if (diagnosis.toLowerCase().includes('af') || diagnosis.toLowerCase().includes('atrial fib')) {
		patterns.rhythm = 'Irregularly irregular';
		patterns.key_findings.push('No visible P waves (fibrillatory waves)');
	}
	
	if (diagnosis.toLowerCase().includes('flutter')) {
		patterns.rhythm = 'Regular or irregular (depends on AV block)';
		patterns.key_findings.push('Flutter waves (sawtooth pattern)');
	}
	
	if (diagnosis.toLowerCase().includes('block')) {
		patterns.key_findings.push('Conduction abnormality detected');
	}
	
	// Category-specific defaults
	if (category === 'ischemia') {
		if (!patterns.st_t_changes || patterns.st_t_changes === 'None') {
			patterns.st_t_changes = 'See ECG for ST/T changes';
		}
	}
	
	return patterns;
}
