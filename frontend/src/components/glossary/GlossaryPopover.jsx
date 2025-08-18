// ~/medplat/frontend/src/components/glossary/GlossaryPopover.jsx
const IconPlaceholder = () => (<svg width="16" height="16" style={{background:"#ccc"}}></svg>);
import React, { useState, useRef, useEffect } from "react";

export default function GlossaryPopover({ term, entry, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onEsc(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <span ref={ref} className="relative inline">
      <button
        type="button"
        className="inline-flex items-center rounded-full border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Definition: ${entry?.title || term}`}
      >
        {children}
      </button>

      {open && (
        <div
          className="absolute z-50 mt-2 w-80 max-w-[80vw] rounded-2xl border border-gray-200 bg-white p-4 text-sm shadow-xl"
          role="dialog"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <div className="font-semibold text-gray-900 mb-1">
            {entry?.title || term}
          </div>
          {entry?.summary && (
            <p className="text-gray-700 mb-2">{entry.summary}</p>
          )}
          {entry?.formula && entry.formula !== "—" && (
            <p className="text-xs text-gray-600">
              <span className="font-medium">Formula:</span> {entry.formula}
            </p>
          )}
          {entry?.note && (
            <p className="text-xs text-gray-600 mt-1">{entry.note}</p>
          )}
        </div>
      )}
    </span>
  );
}
