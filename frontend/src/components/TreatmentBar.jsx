// ~/medplat/frontend/src/components/TreatmentBar.jsx
const IconPlaceholder = () => (<svg width="16" height="16" style={{background:"#ccc"}}></svg>);
import React from "react";

export default function TreatmentBar({ treatments = [] }) {
  if (!Array.isArray(treatments) || treatments.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border rounded-lg p-4 bg-gray-50 shadow-sm">
      <h3 className="text-lg font-semibold mb-3 flex items-center">
        {/* Inline SVG icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 mr-2 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-3 -3v6m9 -3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Treatment Principles
      </h3>
      <ul className="space-y-2">
        {treatments.map((t, idx) => (
          <li
            key={idx}
            className="border-b last:border-none pb-2 last:pb-0"
          >
            <button
              className="w-full text-left font-medium text-blue-600 hover:underline"
              onClick={() => {
                const el = document.getElementById(`treatment-details-${idx}`);
                if (el) el.classList.toggle("hidden");
              }}
            >
              {t.title || `Treatment Step ${idx + 1}`}
            </button>
            <div
              id={`treatment-details-${idx}`}
              className="hidden mt-1 text-gray-700"
            >
              {t.details}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
