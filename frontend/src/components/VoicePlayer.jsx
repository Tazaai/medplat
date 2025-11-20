/**
 * VoicePlayer.jsx
 * Phase 7 M3: Text-to-speech player component
 * 
 * Features:
 * - Play synthesized speech from text
 * - Playback controls (play/pause/stop)
 * - Speed control (0.5x - 2x)
 * - Progress visualization
 * - Multi-language voice support
 */

import React, { useState, useRef, useEffect } from 'react';
import './VoicePlayer.css';

const VoicePlayer = ({ text, language = 'en-US', autoPlay = false }) => {
	const [isPlaying, setIsPlaying] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [progress, setProgress] = useState(0);
	const [speed, setSpeed] = useState(1.0);
	const [error, setError] = useState(null);

	const audioRef = useRef(null);
	const audioUrlRef = useRef(null);
	const progressIntervalRef = useRef(null);

	// Synthesize speech from text
	const synthesizeSpeech = async () => {
		try {
			setIsLoading(true);
			setError(null);

			const apiUrl = process.env.REACT_APP_BACKEND_URL || 'https://medplat-backend-139218747785.us-central1.run.app';
			const response = await fetch(`${apiUrl}/api/voice/synthesize`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					text: text,
					language: language,
					speakingRate: speed
				})
			});

			const result = await response.json();

			if (result.success) {
				// Convert base64 to audio blob
				const audioData = Uint8Array.from(atob(result.audio), c => c.charCodeAt(0));
				const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
				
				// Revoke previous URL if exists
				if (audioUrlRef.current) {
					URL.revokeObjectURL(audioUrlRef.current);
				}

				// Create audio URL
				const audioUrl = URL.createObjectURL(audioBlob);
				audioUrlRef.current = audioUrl;

				// Load audio
				if (audioRef.current) {
					audioRef.current.src = audioUrl;
					audioRef.current.load();

					if (autoPlay) {
						await audioRef.current.play();
						setIsPlaying(true);
						startProgressTracking();
					}
				}
			} else {
				setError(`Speech synthesis failed: ${result.error}`);
			}
		} catch (err) {
			console.error('[VoicePlayer] Synthesis error:', err);
			setError(`Failed to synthesize speech: ${err.message}`);
		} finally {
			setIsLoading(false);
		}
	};

	// Play/pause audio
	const togglePlayback = async () => {
		if (!audioRef.current) return;

		if (isPlaying) {
			audioRef.current.pause();
			setIsPlaying(false);
			stopProgressTracking();
		} else {
			// If no audio loaded, synthesize first
			if (!audioRef.current.src) {
				await synthesizeSpeech();
			} else {
				await audioRef.current.play();
				setIsPlaying(true);
				startProgressTracking();
			}
		}
	};

	// Stop playback
	const stopPlayback = () => {
		if (!audioRef.current) return;

		audioRef.current.pause();
		audioRef.current.currentTime = 0;
		setIsPlaying(false);
		setProgress(0);
		stopProgressTracking();
	};

	// Change playback speed
	const changeSpeed = (newSpeed) => {
		setSpeed(newSpeed);
		if (audioRef.current) {
			audioRef.current.playbackRate = newSpeed;
		}
	};

	// Track playback progress
	const startProgressTracking = () => {
		progressIntervalRef.current = setInterval(() => {
			if (audioRef.current) {
				const progressPercent = (audioRef.current.currentTime / audioRef.current.duration) * 100;
				setProgress(progressPercent || 0);
			}
		}, 100);
	};

	const stopProgressTracking = () => {
		if (progressIntervalRef.current) {
			clearInterval(progressIntervalRef.current);
			progressIntervalRef.current = null;
		}
	};

	// Handle audio end
	const handleAudioEnded = () => {
		setIsPlaying(false);
		setProgress(100);
		stopProgressTracking();

		// Reset to beginning after a short delay
		setTimeout(() => {
			if (audioRef.current) {
				audioRef.current.currentTime = 0;
				setProgress(0);
			}
		}, 500);
	};

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			stopProgressTracking();
			if (audioUrlRef.current) {
				URL.revokeObjectURL(audioUrlRef.current);
			}
		};
	}, []);

	// Auto-synthesize if autoPlay is enabled
	useEffect(() => {
		if (autoPlay && text) {
			synthesizeSpeech();
		}
	}, []); // Only on mount

	return (
		<div className="voice-player">
			<audio 
				ref={audioRef}
				onEnded={handleAudioEnded}
				onError={(e) => setError('Audio playback error')}
			/>

			{/* Progress bar */}
			<div className="playback-progress">
				<div 
					className="progress-fill"
					style={{ width: `${progress}%` }}
				/>
			</div>

			{/* Controls */}
			<div className="playback-controls">
				<button 
					className="control-button play-pause"
					onClick={togglePlayback}
					disabled={isLoading || !text}
					aria-label={isPlaying ? 'Pause' : 'Play'}
				>
					{isLoading ? (
						<div className="spinner-small" />
					) : isPlaying ? (
						<svg className="icon" viewBox="0 0 24 24" fill="currentColor">
							<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>
						</svg>
					) : (
						<svg className="icon" viewBox="0 0 24 24" fill="currentColor">
							<path d="M8 5v14l11-7z"/>
						</svg>
					)}
				</button>

				<button 
					className="control-button stop"
					onClick={stopPlayback}
					disabled={!isPlaying}
					aria-label="Stop"
				>
					<svg className="icon" viewBox="0 0 24 24" fill="currentColor">
						<rect x="6" y="6" width="12" height="12"/>
					</svg>
				</button>

				{/* Speed controls */}
				<div className="speed-controls">
					<label className="speed-label">Speed:</label>
					<div className="speed-buttons">
						{[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(s => (
							<button
								key={s}
								className={`speed-button ${speed === s ? 'active' : ''}`}
								onClick={() => changeSpeed(s)}
								disabled={isLoading}
							>
								{s}x
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Loading indicator */}
			{isLoading && (
				<div className="loading-indicator">
					<div className="spinner" />
					Generating speech...
				</div>
			)}

			{/* Error message */}
			{error && (
				<div className="player-error">
					<svg className="error-icon" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
					</svg>
					{error}
				</div>
			)}
		</div>
	);
};

export default VoicePlayer;
