import React from "react";

export default function CaseList({ cases, onSelect }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Available Cases</h3>
      <ul className="list-disc pl-6">
        {cases.map((c, i) => (
          <li key={i} className="cursor-pointer text-blue-600 hover:underline" onClick={() => onSelect(c)}>
            {c.topic}
          </li>
        ))}
      </ul>
    </div>
  );
}
