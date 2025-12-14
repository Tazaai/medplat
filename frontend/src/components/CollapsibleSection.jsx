// Generic collapsible section component with smooth transitions
import React, { useState } from 'react';

export default function CollapsibleSection({ 
  title, 
  children, 
  defaultExpanded = true, 
  icon: Icon,
  highlight = false,
  defaultOpen = defaultExpanded 
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${highlight ? 'border-blue-300 shadow-md' : 'border-gray-200'} overflow-hidden transition-all duration-200`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left flex items-center gap-3 p-4 hover:bg-gray-50 transition-all duration-200 ${
          highlight ? 'bg-blue-50' : ''
        }`}
        style={{ cursor: 'pointer' }}
      >
        <span className={`text-gray-500 text-sm transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
          ▶
        </span>
        {Icon && <Icon className="w-5 h-5 text-gray-600" />}
        <span className={`font-semibold flex-1 ${highlight ? 'text-blue-900' : 'text-gray-800'}`}>
          {title}
        </span>
      </button>
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[10000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-4 pt-2">
          {children}
        </div>
      </div>
    </div>
  );
}
