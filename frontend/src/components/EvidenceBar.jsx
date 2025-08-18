// ~/medplat/frontend/src/components/EvidenceBar.jsx
const IconPlaceholder = () => (<svg width="16" height="16" style={{background:"#ccc"}}></svg>);
import React from "react";

export default function EvidenceBar({ evidence = {} }) {
  if (!evidence || Object.keys(evidence).length === 0) {
    return null;
  }

  const renderSection = (label, content) => {
    if (!content) return null;
    return (
      <div className="mb-3">
        <h4 className="font-semibold text-gray-800 mb-1">{label}</h4>
        <p className="text-gray-700 text-sm">{content}</p>
      </div>
    );
  };

  const renderTestPerformance = (tests) => {
    if (!Array.isArray(tests) || tests.length === 0) return null;
    return (
      <div className="mb-3">
        <h4 className="font-semibold text-gray-800 mb-1">
          Key Test Performance
        </h4>
        <ul className="list-disc pl-5 text-gray-700 text-sm">
          {tests.map((t, idx) => (
            <li key={idx}>
              <span className="font-medium">{t.test}</span>: Sensitivity {t.sensitivity}, Specificity {t.specificity} ({t.notes})
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="mt-4 border rounded-lg p-4 bg-gray-50 shadow-sm">
      <h3 className="text-lg font-semibold mb-3 flex items-center">
        {/* Inline SVG icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 mr-2 text-purple-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M12 6a9 9 0 110 12 9 9 0 010-12z"
          />
        </svg>
        Evidence & Statistics
      </h3>

      {renderSection("Prevalence", evidence.prevalence)}
      {renderSection("Incidence", evidence.incidence)}
      {renderTestPerformance(evidence.key_test_performance)}
      {renderSection("Prognosis", evidence.prognosis)}
      {renderSection("Biphasic Reaction Rate", evidence.biphasic_reaction_rate)}
      {renderSection("Recommended Observation Time", evidence.recommended_observation_time)}
    </div>
  );
}
