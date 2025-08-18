import React from "react";
const IconPlaceholder = () => (<svg width="16" height="16" style={{background:"#ccc"}}></svg>);

export default function CaseList({ cases = [] }) {
  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-2">Available Cases</h2>
      <ul>
        {cases.map((c, i) => (
          <li key={i} className="mb-1">🔹 {c.topic}</li>
        ))}
      </ul>
    </div>
  );
}
