// ~/medplat/frontend/src/components/glossary/useGlossary.jsx
const IconPlaceholder = () => (<svg width="16" height="16" style={{background:"#ccc"}}></svg>);
import React from "react";
import GlossaryPopover from "./GlossaryPopover.jsx";
import { GLOSSARY } from "./glossary_data.js";

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build a matcher for all synonyms → canonical entries.
 * Longer terms first to avoid partial overlaps.
 */
function buildIndex(glossary) {
  const map = new Map(); // synonym(lower) -> entry
  const allSyns = [];

  Object.values(glossary).forEach((entry) => {
    (entry.synonyms || [entry.title]).forEach((syn) => {
      if (!syn) return;
      const key = syn.toLowerCase();
      if (!map.has(key)) {
        map.set(key, entry);
        allSyns.push(syn);
      }
    });
  });

  // Sort by length DESC to prefer multi-word matches
  allSyns.sort((a, b) => b.length - a.length);

  // Word boundaries with Unicode letters
  const pattern = `(?<![\\p{L}])(${allSyns.map(escapeRegExp).join("|")})(?![\\p{L}])`;
  const regex = new RegExp(pattern, "giu");

  return { map, regex };
}

/**
 * useGlossary – returns a <GlossaryText> component that wraps known terms.
 */
export function useGlossary(customGlossary) {
  const glossary = customGlossary || GLOSSARY;
  const { map, regex } = React.useMemo(() => buildIndex(glossary), [glossary]);

  function renderNodes(text) {
    if (typeof text !== "string" || !text) return [text];

    const nodes = [];
    let lastIndex = 0;

    for (const match of text.matchAll(regex)) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      const found = match[0];

      if (start > lastIndex) nodes.push(text.slice(lastIndex, start));

      const entry = map.get(found.toLowerCase());
      nodes.push(
        <GlossaryPopover key={`${start}-${end}-${found}`} term={found} entry={entry}>
          {found}
        </GlossaryPopover>
      );

      lastIndex = end;
    }

    if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
    return nodes;
  }

  function GlossaryText({ text, className }) {
    return <span className={className}>{renderNodes(text)}</span>;
  }

  return { GlossaryText };
}
