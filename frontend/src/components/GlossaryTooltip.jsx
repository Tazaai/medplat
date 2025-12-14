/**
 * GlossaryTooltip - Interactive medical term tooltip
 * Phase 7 M4 - Case Study Mode
 * 
 * Features:
 * - Hover to show definition preview
 * - Click to expand full details
 * - Pronunciation audio playback (via TTS)
 * - Multi-language translation support
 * - Related terms navigation
 */

import React, { useState, useEffect, useRef } from 'react';
import './GlossaryTooltip.css';

const GlossaryTooltip = ({ 
  termId, 
  term, 
  children, 
  language = 'en',
  onAudioPlay 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [termData, setTermData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [relatedTerms, setRelatedTerms] = useState([]);
  
  const tooltipRef = useRef(null);
  const audioRef = useRef(null);

  // Fetch term details when hovered
  useEffect(() => {
    if (isHovered && !termData && termId) {
      fetchTermData();
    }
  }, [isHovered, termId]);

  // Fetch related terms when expanded
  useEffect(() => {
    if (isExpanded && relatedTerms.length === 0 && termId) {
      fetchRelatedTerms();
    }
  }, [isExpanded, termId]);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpanded]);

  const fetchTermData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const backendUrl = import.meta.env.VITE_API_BASE || import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
      const response = await fetch(`${backendUrl}/api/glossary/term/${termId}?language=${language}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch term data');
      }

      const data = await response.json();
      setTermData(data);
    } catch (err) {
      console.error('Glossary fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRelatedTerms = async () => {
    try {
      const backendUrl = import.meta.env.VITE_API_BASE || import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
      const response = await fetch(`${backendUrl}/api/glossary/related/${termId}?limit=5`);
      
      if (response.ok) {
        const data = await response.json();
        setRelatedTerms(data.related_terms || []);
      }
    } catch (err) {
      console.error('Related terms fetch error:', err);
    }
  };

  const handlePronunciation = async () => {
    if (!termData) return;

    setAudioPlaying(true);
    if (onAudioPlay) onAudioPlay(termId);

    try {
      const backendUrl = import.meta.env.VITE_API_BASE || import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
      const response = await fetch(`${backendUrl}/api/voice/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: termData.term,
          language: language,
          voice_type: 'neural'
        })
      });

      if (!response.ok) throw new Error('TTS failed');

      const data = await response.json();
      
      // Decode base64 audio and play
      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audio_content), c => c.charCodeAt(0))],
        { type: 'audio/mp3' }
      );
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }
    } catch (err) {
      console.error('Pronunciation error:', err);
    }
  };

  const handleAudioEnded = () => {
    setAudioPlaying(false);
  };

  const renderPreviewTooltip = () => {
    if (!isHovered || isExpanded) return null;

    return (
      <div className="glossary-tooltip-preview">
        {isLoading && <div className="tooltip-loading">Loading...</div>}
        {error && <div className="tooltip-error">Failed to load</div>}
        {termData && (
          <>
            <div className="tooltip-term-name">{termData.term}</div>
            <div className="tooltip-pronunciation">{termData.pronunciation}</div>
            <div className="tooltip-definition-preview">
              {termData.definition.substring(0, 120)}...
            </div>
            <div className="tooltip-click-hint">Click for details</div>
          </>
        )}
      </div>
    );
  };

  const renderExpandedDetails = () => {
    if (!isExpanded || !termData) return null;

    return (
      <div className="glossary-tooltip-expanded" ref={tooltipRef}>
        <div className="tooltip-header">
          <div className="tooltip-header-left">
            <h3>{termData.term}</h3>
            <span className="tooltip-full-name">{termData.full_name}</span>
          </div>
          <button 
            className="tooltip-close"
            onClick={() => setIsExpanded(false)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="tooltip-pronunciation-section">
          <span className="pronunciation-text">{termData.pronunciation}</span>
          <button
            className={`pronunciation-btn ${audioPlaying ? 'playing' : ''}`}
            onClick={handlePronunciation}
            disabled={audioPlaying}
          >
            {audioPlaying ? '🔊 Playing...' : '🔊 Pronounce'}
          </button>
        </div>

        <div className="tooltip-definition">
          <strong>Definition:</strong>
          <p>{termData.definition}</p>
        </div>

        {language !== 'en' && termData.translation && (
          <div className="tooltip-translation">
            <strong>Translation ({language}):</strong>
            <p>{termData.translation}</p>
          </div>
        )}

        <div className="tooltip-metadata">
          <div className="tooltip-meta-item">
            <strong>Specialty:</strong> {termData.specialty.join(', ')}
          </div>
          <div className="tooltip-meta-item">
            <strong>Difficulty:</strong> 
            <span className={`difficulty-badge ${termData.difficulty}`}>
              {termData.difficulty}
            </span>
          </div>
          {termData.icd10 && termData.icd10.length > 0 && (
            <div className="tooltip-meta-item">
              <strong>ICD-10:</strong> {termData.icd10.join(', ')}
            </div>
          )}
        </div>

        {termData.clinical_pearls && (
          <div className="tooltip-clinical-pearls">
            <strong>💡 Clinical Pearl:</strong>
            <p>{termData.clinical_pearls}</p>
          </div>
        )}

        {termData.example_usage && (
          <div className="tooltip-example">
            <strong>Example Usage:</strong>
            <p className="example-text">{termData.example_usage}</p>
          </div>
        )}

        {relatedTerms.length > 0 && (
          <div className="tooltip-related">
            <strong>Related Terms:</strong>
            <div className="related-terms-list">
              {relatedTerms.map(related => (
                <button
                  key={related.id}
                  className="related-term-btn"
                  onClick={() => {
                    setTermData(null);
                    setRelatedTerms([]);
                    fetchTermData(); // Will re-fetch with new termId if component supports it
                  }}
                >
                  {related.term}
                </button>
              ))}
            </div>
          </div>
        )}

        {termData.tags && termData.tags.length > 0 && (
          <div className="tooltip-tags">
            {termData.tags.map(tag => (
              <span key={tag} className="tag-badge">{tag}</span>
            ))}
          </div>
        )}

        <audio
          ref={audioRef}
          onEnded={handleAudioEnded}
          style={{ display: 'none' }}
        />
      </div>
    );
  };

  return (
    <span className="glossary-tooltip-wrapper">
      <span
        className="glossary-term-highlight"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {children || term}
      </span>
      {renderPreviewTooltip()}
      {renderExpandedDetails()}
    </span>
  );
};

export default GlossaryTooltip;
