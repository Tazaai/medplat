import React from "react";

export default function CaseEditor({ caseData, onChange }) {
  return (
    <div>
      <h3>Edit Case</h3>
      <textarea
        value={caseData || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-64 p-2 border rounded"
      />
    </div>
  );
}
