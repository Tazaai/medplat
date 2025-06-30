import React from "react";

export default function AISuggestionBox({ suggestions }) {
  return (
    <div className="bg-yellow-100 p-4 rounded">
      <h4 className="font-semibold mb-2">AI Suggestions</h4>
      <ul className="list-disc pl-6">
        {suggestions.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </div>
  );
}
