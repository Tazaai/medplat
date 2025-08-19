import React from "react";

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
