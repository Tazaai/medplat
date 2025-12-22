// Generic collapsible section component with smooth transitions
import React, { useState, useRef, useEffect } from 'react';

export default function CollapsibleSection({ 
  title, 
  children, 
  defaultExpanded = true, 
  icon: Icon,
  highlight = false,
  defaultOpen = defaultExpanded,
  sectionKey, // Optional key to isolate state per section
  onToggle // Optional external toggle handler for controlled state
}) {
  // Use ref to track if this is first mount - prevents state reset on parent re-renders
  const isFirstMount = useRef(true);
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  
  // If external toggle handler provided, use controlled state (defaultOpen becomes controlled value)
  // Otherwise use internal state (uncontrolled mode)
  const isOpen = onToggle !== undefined && onToggle !== null 
    ? defaultOpen  // Controlled: use defaultOpen prop as current state value
    : internalIsOpen;  // Uncontrolled: use internal state
  
  // Handle toggle - either controlled or uncontrolled
  const handleToggle = () => {
    if (onToggle) {
      // Controlled: notify parent of new state
      onToggle(!isOpen);
    } else {
      // Uncontrolled: update internal state
      setInternalIsOpen(!internalIsOpen);
    }
  };
  
  // Sync internal state with defaultOpen only in uncontrolled mode
  // In controlled mode, parent manages state via onToggle
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    // Only update internal state if:
    // 1. We're in uncontrolled mode (no onToggle)
    // 2. defaultOpen prop explicitly changed
    // This prevents Paraclinical from auto-opening when other sections expand
    if (!onToggle && defaultOpen !== internalIsOpen) {
      setInternalIsOpen(defaultOpen);
    }
  }, [defaultOpen, onToggle, internalIsOpen]);

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${highlight ? 'border-blue-300 shadow-md' : 'border-gray-200'} overflow-hidden transition-all duration-200`}>
      <button
        onClick={handleToggle}
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
