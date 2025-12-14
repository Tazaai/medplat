/**
 * VoiceRecorder.jsx
 * Phase 7 M3: Voice recording component with microphone access
 * 
 * Features:
 * - Real-time audio visualization
 * - Recording controls (start/stop/pause)
 * - Automatic transcription on stop
 * - Voice command detection
 * - Medical term recognition
 */

import React, { useState, useRef, useEffect } from 'react';
import './VoiceRecorder.css';
import { API_BASE } from '../config';

const VoiceRecorder = ({ onTranscript, onCommand, language = 'en-US' }) => {
	const [isRecording, setIsRecording] = useState(false);
	const [isPaused, setIsPaused] = useState(false);
	const [audioLevel, setAudioLevel] = useState(0);
	const [duration, setDuration] = useState(0);
	const [isTranscribing, setIsTranscribing] = useState(false);
	const [error, setError] = useState(null);

	const mediaRecorderRef = useRef(null);
	const audioChunksRef = useRef([]);
	const audioContextRef = useRef(null);
	const analyserRef = useRef(null);
	const animationFrameRef = useRef(null);
	const durationIntervalRef = useRef(null);

	// Initialize audio visualization
	const setupAudioVisualization = (stream) => {
		const audioContext = new (window.AudioContext || window.webkitAudioContext)();
		const analyser = audioContext.createAnalyser();
		const microphone = audioContext.createMediaStreamSource(stream);

		analyser.fftSize = 256;
		microphone.connect(analyser);

		audioContextRef.current = audioContext;
		analyserRef.current = analyser;

		// Start visualization loop
		visualize();
	};

	// Visualize audio levels
	const visualize = () => {
		if (!analyserRef.current) return;

		const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
		analyserRef.current.getByteFrequencyData(dataArray);

		// Calculate average volume
		const sum = dataArray.reduce((a, b) => a + b, 0);
		const average = sum / dataArray.length;
		setAudioLevel(Math.min(average / 128, 1)); // Normalize to 0-1

		animationFrameRef.current = requestAnimationFrame(visualize);
	};

	// Start recording
	const startRecording = async () => {
		try {
			setError(null);

			// Request microphone access
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					sampleRate: 16000
				}
			});

			// Setup MediaRecorder
			const mediaRecorder = new MediaRecorder(stream, {
				mimeType: 'audio/webm;codecs=opus'
			});

			audioChunksRef.current = [];

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					audioChunksRef.current.push(event.data);
				}
			};

			mediaRecorder.onstop = async () => {
				const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
				await transcribeAudio(audioBlob);

				// Clean up
				stream.getTracks().forEach(track => track.stop());
			};

			mediaRecorder.start();
			mediaRecorderRef.current = mediaRecorder;

			// Setup visualization
			setupAudioVisualization(stream);

			// Start duration timer
			setDuration(0);
			durationIntervalRef.current = setInterval(() => {
				setDuration(prev => prev + 1);
			}, 1000);

			setIsRecording(true);
			setIsPaused(false);
		} catch (err) {
			console.error('[VoiceRecorder] Start error:', err);
			setError(err.message === 'Permission denied' 
				? 'Microphone access denied. Please allow microphone access in browser settings.'
				: `Failed to start recording: ${err.message}`
			);
		}
	};

	// Stop recording
	const stopRecording = () => {
		if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
			mediaRecorderRef.current.stop();
			setIsRecording(false);
			setIsPaused(false);

			// Clear duration timer
			if (durationIntervalRef.current) {
				clearInterval(durationIntervalRef.current);
				durationIntervalRef.current = null;
			}

			// Stop visualization
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
				animationFrameRef.current = null;
			}

			// Close audio context
			if (audioContextRef.current) {
				audioContextRef.current.close();
				audioContextRef.current = null;
			}
		}
	};

	// Pause/resume recording
	const togglePause = () => {
		if (!mediaRecorderRef.current) return;

		if (isPaused) {
			mediaRecorderRef.current.resume();
			setIsPaused(false);
		} else {
			mediaRecorderRef.current.pause();
			setIsPaused(true);
		}
	};

	// Transcribe audio via backend
	const transcribeAudio = async (audioBlob) => {
		try {
			setIsTranscribing(true);

			const formData = new FormData();
			formData.append('audio', audioBlob, 'recording.webm');
			formData.append('language', language);
			formData.append('encoding', 'WEBM_OPUS');

			const apiUrl = API_BASE;
			const response = await fetch(`${apiUrl}/api/voice/transcribe`, {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.success) {
				// Call transcript callback
				if (onTranscript) {
					onTranscript({
						text: result.transcript,
						confidence: result.confidence,
						language: result.language,
						wordTimings: result.wordTimings
					});
				}

				// Call command callback if voice command detected
				if (result.command && result.command.type !== 'dictation' && onCommand) {
					onCommand(result.command);
				}
			} else {
				setError(`Transcription failed: ${result.error}`);
			}
		} catch (err) {
			console.error('[VoiceRecorder] Transcription error:', err);
			setError(`Transcription failed: ${err.message}`);
		} finally {
			setIsTranscribing(false);
		}
	};

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			stopRecording();
		};
	}, []);

	// Format duration as MM:SS
	const formatDuration = (seconds) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	return (
		<div className="voice-recorder">
			{/* Audio visualization */}
			<div className="audio-visualizer">
				<div 
					className="audio-level-bar" 
					style={{ 
						width: `${audioLevel * 100}%`,
						backgroundColor: isRecording ? (isPaused ? '#fbbf24' : '#10b981') : '#6b7280'
					}}
				/>
			</div>

			{/* Recording controls */}
			<div className="recording-controls">
				{!isRecording ? (
					<button 
						className="record-button start"
						onClick={startRecording}
						disabled={isTranscribing}
						aria-label="Start recording"
					>
						<svg className="icon" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
							<path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
						</svg>
						{isTranscribing ? 'Transcribing...' : 'Start Recording'}
					</button>
				) : (
					<>
						<button 
							className="record-button pause"
							onClick={togglePause}
							aria-label={isPaused ? 'Resume' : 'Pause'}
						>
							{isPaused ? (
								<svg className="icon" viewBox="0 0 24 24" fill="currentColor">
									<path d="M8 5v14l11-7z"/>
								</svg>
							) : (
								<svg className="icon" viewBox="0 0 24 24" fill="currentColor">
									<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>
								</svg>
							)}
							{isPaused ? 'Resume' : 'Pause'}
						</button>

						<button 
							className="record-button stop"
							onClick={stopRecording}
							aria-label="Stop recording"
						>
							<svg className="icon" viewBox="0 0 24 24" fill="currentColor">
								<rect x="6" y="6" width="12" height="12"/>
							</svg>
							Stop
						</button>

						<span className="duration">{formatDuration(duration)}</span>
					</>
				)}
			</div>

			{/* Status indicator */}
			{isRecording && (
				<div className={`status-indicator ${isPaused ? 'paused' : 'recording'}`}>
					<span className="status-dot" />
					{isPaused ? 'Paused' : 'Recording'}
				</div>
			)}

			{/* Transcribing indicator */}
			{isTranscribing && (
				<div className="transcribing-indicator">
					<div className="spinner" />
					Processing speech...
				</div>
			)}

			{/* Error message */}
			{error && (
				<div className="error-message">
					<svg className="error-icon" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
					</svg>
					{error}
				</div>
			)}
		</div>
	);
};

export default VoiceRecorder;
