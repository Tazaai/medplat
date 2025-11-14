// frontend/src/components/LanguageSelector.jsx - Global language selector

import React, { useState, useEffect } from 'react';
import './LanguageSelector.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

export default function LanguageSelector({ currentLanguage, onLanguageChange }) {
	const [languages, setLanguages] = useState([]);
	const [isOpen, setIsOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');

	useEffect(() => {
		fetchLanguages();
	}, []);

	const fetchLanguages = async () => {
		try {
			const response = await fetch(`${BACKEND_URL}/api/translation/languages`);
			const data = await response.json();

			if (data.success) {
				setLanguages(data.languages);
			}
		} catch (error) {
			console.error('Failed to fetch languages:', error);
			// Fallback to basic list
			setLanguages([
				{ code: 'en', name: 'English', native: 'English', rtl: false },
				{ code: 'es', name: 'Spanish', native: 'Español', rtl: false },
				{ code: 'fr', name: 'French', native: 'Français', rtl: false },
				{ code: 'ar', name: 'Arabic', native: 'العربية', rtl: true },
				{ code: 'zh', name: 'Chinese (Simplified)', native: '简体中文', rtl: false },
			]);
		}
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
