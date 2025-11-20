// frontend/src/components/LanguageSelector.jsx - Global language selector

import React, { useState, useEffect } from 'react';
import './LanguageSelector.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://medplat-backend-139218747785.us-central1.run.app';

export default function LanguageSelector({ currentLanguage, onLanguageChange }) {
	// Static high-quality language list - API is optional enhancement only
	const [languages, setLanguages] = useState([
		{ code: 'en', name: 'English', native: 'English', rtl: false, region: 'Global' },
		{ code: 'es', name: 'Spanish', native: 'Español', rtl: false, region: 'EU/LATAM' },
		{ code: 'fr', name: 'French', native: 'Français', rtl: false, region: 'EU/Africa' },
		{ code: 'de', name: 'German', native: 'Deutsch', rtl: false, region: 'EU' },
		{ code: 'it', name: 'Italian', native: 'Italiano', rtl: false, region: 'EU' },
		{ code: 'pt', name: 'Portuguese', native: 'Português', rtl: false, region: 'EU/LATAM' },
		{ code: 'ar', name: 'Arabic', native: 'العربية', rtl: true, region: 'MENA' },
		{ code: 'zh', name: 'Chinese', native: '中文', rtl: false, region: 'Asia' },
		{ code: 'ja', name: 'Japanese', native: '日本語', rtl: false, region: 'Asia' },
		{ code: 'ko', name: 'Korean', native: '한국어', rtl: false, region: 'Asia' },
		{ code: 'hi', name: 'Hindi', native: 'हिन्दी', rtl: false, region: 'Asia' },
		{ code: 'ru', name: 'Russian', native: 'Русский', rtl: false, region: 'EU/Asia' }
	]);
	const [isOpen, setIsOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');

	useEffect(() => {
		// API fetch is optional enhancement - UI works without it
		const timer = setTimeout(() => {
			fetchLanguages();
		}, 500); // Delay to prioritize critical rendering
		
		return () => clearTimeout(timer);
	}, []);

	const fetchLanguages = async () => {
		// DISABLED: Translation API not available
		// try {
		// 	// Add timeout to prevent hanging
		// 	const controller = new AbortController();
		// 	const timeoutId = setTimeout(() => controller.abort(), 3000);
		// 	
		// 	const response = await fetch(`${BACKEND_URL}/api/translation/languages`, {
		// 		signal: controller.signal
		// 	});
		// 	
		// 	clearTimeout(timeoutId);
		// 	
		// 	if (!response.ok) {
		// 		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		// 	}
		// 	
		// 	const data = await response.json();

		// 	if (data.success && data.languages) {
		// 		setLanguages(data.languages);
		// 	} else {
		// 		throw new Error('Invalid response format');
		// 	}
		// } catch (error) {
		// 	console.warn('Language API unavailable, using static languages:', error.message);
		// 	// Static languages already loaded, no need to update
		// }
		console.log('Using static language list - Translation API disabled');
	};

	const getCurrentLanguageInfo = () => {
		return languages.find((lang) => lang.code === currentLanguage) || languages[0] || { code: 'en', native: 'English' };
	};

	const filteredLanguages = languages.filter(
		(lang) =>
			lang.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			lang.native.toLowerCase().includes(searchTerm.toLowerCase()) ||
			lang.code.toLowerCase().includes(searchTerm.toLowerCase())
	);

	const handleLanguageSelect = (languageCode) => {
		onLanguageChange(languageCode);
		setIsOpen(false);
		setSearchTerm('');

		// Save to localStorage
		localStorage.setItem('medplat_language', languageCode);

		// Apply RTL if needed
		const selectedLang = languages.find((l) => l.code === languageCode);
		if (selectedLang) {
			document.documentElement.dir = selectedLang.rtl ? 'rtl' : 'ltr';
			document.documentElement.lang = languageCode;
		}
	};

	const currentLang = getCurrentLanguageInfo();

	return (
		<div className="language-selector">
			<button className="language-button" onClick={() => setIsOpen(!isOpen)} title="Change Language">
				<span className="language-icon">🌐</span>
				<span className="language-code">{currentLang.native}</span>
				<span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
			</button>

			{isOpen && (
				<div className="language-dropdown">
					<div className="language-search">
						<input
							type="text"
							placeholder="Search languages..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							autoFocus
						/>
					</div>

					<div className="language-list">
						{filteredLanguages.map((lang) => (
							<button
								key={lang.code}
								className={`language-option ${lang.code === currentLanguage ? 'active' : ''} ${lang.rtl ? 'rtl' : ''}`}
								onClick={() => handleLanguageSelect(lang.code)}
							>
								<span className="language-native">{lang.native}</span>
								<span className="language-name">{lang.name}</span>
								{lang.rtl && <span className="rtl-badge">RTL</span>}
								{lang.code === currentLanguage && <span className="check-mark">✓</span>}
							</button>
						))}

						{filteredLanguages.length === 0 && (
							<div className="no-results">
								No languages found for "{searchTerm}"
							</div>
						)}
					</div>

					<div className="language-footer">
						<p>
							{languages.length} languages supported
							<br />
							<small>Medical terms preserved in English</small>
						</p>
					</div>
				</div>
			)}

			{isOpen && <div className="language-overlay" onClick={() => setIsOpen(false)} />}
		</div>
	);
}
