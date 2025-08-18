import React from "react";

export default function CaseSearch({ onSearch }) {
  const [term, setTerm] = React.useState("");

  const handleSearch = () => {
    if (term.trim()) {
      onSearch(term.trim());
    }
  };

  return (
    <div className="mb-4">
      <input
        type="text"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search for a case..."
        className="p-2 border rounded mr-2"
      />
      <button onClick={handleSearch} className="bg-blue-600 text-white px-4 py-2 rounded">
        Search
      </button>
    </div>
  );
}
