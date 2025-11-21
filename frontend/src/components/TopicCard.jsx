import React from "react";

export default function TopicCard({ title, description, icon, color, onClick, selected }) {
  return (
    <button
      className={`rounded-xl bg-white p-5 shadow hover:shadow-lg transition transform hover:-translate-y-1 border-2 ${selected ? 'border-blue-500' : 'border-transparent'} focus:outline-none w-full h-full`}
      style={{ borderColor: color, boxShadow: selected ? `0 0 0 3px ${color}33` : undefined }}
      onClick={onClick}
      aria-pressed={selected}
    >
      <div className="flex items-center mb-2">
        <span className="text-2xl mr-2" aria-hidden>{icon}</span>
        <span className="font-semibold text-base" style={{ color }}>{title}</span>
      </div>
      <div className="text-gray-500 text-xs min-h-[2em]">{description}</div>
    </button>
  );
}
