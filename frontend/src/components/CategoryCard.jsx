import React from "react";

export default function CategoryCard({ title, description, icon, color, onClick, selected }) {
  return (
    <button
      className={`rounded-xl bg-white p-6 shadow-md hover:shadow-xl transition transform hover:-translate-y-1 border-2 ${selected ? 'border-blue-500' : 'border-transparent'} focus:outline-none w-full h-full`}
      style={{ borderColor: color, boxShadow: selected ? `0 0 0 3px ${color}33` : undefined }}
      onClick={onClick}
      aria-pressed={selected}
    >
      <div className="flex items-center mb-2">
        <span className="text-3xl mr-3" aria-hidden>{icon}</span>
        <span className="font-bold text-lg" style={{ color }}>{title}</span>
      </div>
      <div className="text-gray-600 text-sm min-h-[2.5em]">{description}</div>
    </button>
  );
}
