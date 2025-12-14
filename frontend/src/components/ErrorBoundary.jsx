// frontend/src/components/ErrorBoundary.jsx — Phase 13: Global Error Handler
// Catches React errors and displays fallback UI

import React from 'react';

class ErrorBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false, error: null, errorInfo: null };
	}
	
	static getDerivedStateFromError(error) {
		return { hasError: true };
	}
	
	componentDidCatch(error, errorInfo) {
		// DIAGNOSTIC PATCH: Enhanced error logging for production debugging
		const errorDetails = {
			message: error?.message || error?.toString() || 'Unknown error',
			name: error?.name || 'Error',
			stack: error?.stack || 'No stack trace',
			componentStack: errorInfo?.componentStack || 'No component stack',
			fullError: error,
			fullErrorInfo: errorInfo,
			timestamp: new Date().toISOString(),
			url: window.location.href,
			userAgent: navigator.userAgent
		};

		// Log to console with clear markers for production debugging
		console.error('========================================');
		console.error('🔴 FRONTEND_ERROR_BOUNDARY_TRIGGERED');
		console.error('========================================');
		console.error('Error Message:', errorDetails.message);
		console.error('Error Name:', errorDetails.name);
		console.error('Error Stack:', errorDetails.stack);
		console.error('Component Stack:', errorDetails.componentStack);
		console.error('Full Error Object:', error);
		console.error('Full Error Info:', errorInfo);
		console.error('URL:', errorDetails.url);
		console.error('Timestamp:', errorDetails.timestamp);
		console.error('========================================');

		// Also log as a single object for easier inspection
		console.error('FRONTEND_ERROR_DETAILS:', JSON.stringify(errorDetails, null, 2));

		this.setState({ error, errorInfo });
		
		// Log to telemetry with full details
		if (window.navigator.onLine) {
			try {
				fetch('/api/telemetry/event', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						eventType: 'engagement_event',
						data: {
							uid: 'anonymous',
							event: 'error_boundary_triggered',
							error: errorDetails.message,
							errorName: errorDetails.name,
							stack: errorDetails.stack,
							componentStack: errorDetails.componentStack,
							url: errorDetails.url,
							timestamp: errorDetails.timestamp
						}
					})
				}).catch(() => {}); // Silent fail
			} catch {}
		}
	}
	
	render() {
		if (this.state.hasError) {
			return (
				<div style={styles.container}>
					<div style={styles.card}>
						<div style={styles.icon}>⚠️</div>
						<h1 style={styles.title}>Oops! Something went wrong</h1>
						<p style={styles.subtitle}>
							We've encountered an unexpected error. Don't worry, your progress is safe.
						</p>
						
						<div style={styles.actions}>
							<button 
								style={styles.primaryBtn}
								onClick={() => window.location.reload()}
							>
								Reload Page
							</button>
							<button 
								style={styles.secondaryBtn}
								onClick={() => {
									this.setState({ hasError: false, error: null, errorInfo: null });
								}}
							>
								Try Again
							</button>
						</div>
						
						{/* DIAGNOSTIC PATCH: Always show error details in production for debugging */}
						{this.state.error && (
							<details style={styles.details} open={true}>
								<summary style={styles.summary}>🔍 Error Details (Diagnostic Mode)</summary>
								<pre style={styles.errorText}>
									<strong>Error Message:</strong> {this.state.error?.message || this.state.error?.toString() || 'Unknown error'}
									{'\n\n'}
									<strong>Error Name:</strong> {this.state.error?.name || 'Error'}
									{'\n\n'}
									<strong>Error Stack:</strong>
									{'\n'}{this.state.error?.stack || 'No stack trace available'}
									{'\n\n'}
									<strong>Component Stack:</strong>
									{'\n'}{this.state.errorInfo?.componentStack || 'No component stack available'}
								</pre>
							</details>
						)}
					</div>
				</div>
			);
		}
		
		return this.props.children;
	}
}

const styles = {
	container: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		minHeight: '100vh',
		background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
		padding: '20px'
	},
	card: {
		background: 'white',
		borderRadius: '16px',
		padding: '40px',
		maxWidth: '600px',
		textAlign: 'center',
		boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
	},
	icon: {
		fontSize: '4rem',
		marginBottom: '20px'
	},
	title: {
		fontSize: '2rem',
		color: '#2c3e50',
		marginBottom: '10px'
	},
	subtitle: {
		fontSize: '1.1rem',
		color: '#7f8c8d',
		marginBottom: '30px',
		lineHeight: '1.6'
	},
	actions: {
		display: 'flex',
		gap: '15px',
		justifyContent: 'center',
		marginBottom: '20px'
	},
	primaryBtn: {
		background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
		color: 'white',
		border: 'none',
		padding: '12px 30px',
		borderRadius: '8px',
		fontSize: '1rem',
		fontWeight: '600',
		cursor: 'pointer',
		transition: 'transform 0.2s ease'
	},
	secondaryBtn: {
		background: '#ecf0f1',
		color: '#2c3e50',
		border: 'none',
		padding: '12px 30px',
		borderRadius: '8px',
		fontSize: '1rem',
		fontWeight: '600',
		cursor: 'pointer',
		transition: 'transform 0.2s ease'
	},
	details: {
		textAlign: 'left',
		marginTop: '20px',
		padding: '15px',
		background: '#f8f9fa',
		borderRadius: '8px'
	},
	summary: {
		cursor: 'pointer',
		fontWeight: '600',
		color: '#667eea',
		marginBottom: '10px'
	},
	errorText: {
		fontSize: '0.85rem',
		color: '#e74c3c',
		overflow: 'auto',
		maxHeight: '200px'
	}
};

export default ErrorBoundary;
