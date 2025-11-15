/**
 * ECG Academy Dropdown (Phase A - v15.0.0)
 * 
 * Unified dropdown interface replacing individual ECG tabs:
 * - ECG Mastery
 * - ECG Study Plan  
 * - ECG Curriculum
 * - ECG Certification
 * - ECG Analytics
 */

import React, { useState } from 'react';
import './ECGAcademyDropdown.css';

const ECGAcademyDropdown = ({ activeECGTab, onECGTabChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const ecgOptions = [
    { id: 'mastery', label: '📊 ECG Mastery', description: 'Interactive ECG interpretation training' },
    { id: 'study_plan', label: '🧠 ECG Study Plan', description: 'Personalized ECG learning path' },
    { id: 'curriculum', label: '📚 ECG Curriculum', description: 'Structured ECG education modules' },
    { id: 'certification', label: '🎓 ECG Certification', description: 'ECG competency examinations' },
    { id: 'analytics', label: '📊 ECG Analytics', description: 'ECG learning performance insights' }
  ];

  const activeOption = ecgOptions.find(opt => opt.id === activeECGTab) || ecgOptions[0];

  const handleOptionSelect = (optionId) => {
    onECGTabChange(optionId);
    setIsOpen(false);
  };

  return (
    <div className="ecg-academy-dropdown">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`ecg-dropdown-trigger ${isOpen ? 'open' : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="dropdown-label">
          {activeOption.label}
        </span>
        <span className={`dropdown-arrow ${isOpen ? 'rotated' : ''}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="ecg-dropdown-menu" role="menu">
          {ecgOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => handleOptionSelect(option.id)}
              className={`ecg-dropdown-option ${activeECGTab === option.id ? 'active' : ''}`}
              role="menuitem"
            >
              <div className="option-content">
                <div className="option-label">{option.label}</div>
                <div className="option-description">{option.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Close dropdown when clicking outside */}
      {isOpen && (
        <div 
          className="dropdown-backdrop" 
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default ECGAcademyDropdown;