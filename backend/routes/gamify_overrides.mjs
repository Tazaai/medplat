// ~/medplat/backend/routes/gamify_overrides.mjs
// Global, specialty-agnostic overrides. Keep core route separate.

// === System prompt appendix (global) ===
export const SYSTEM_APPEND = `
DOMAIN GUARD (GENERAL):
- Stay strictly within the Topic and the domain implied by CASE CONTENT.
- Do not introduce unrelated domains unless they truly appear in CASE CONTENT.
- If the case is non-organ (disaster, ethics, psychiatry, etc.), keep items in that domain.

GROUNDING:
- For each item, include a short "context" that quotes/uses 6–12 words actually present in CASE CONTENT.
- If a critical detail is missing, ask for it rather than invent it.

EXPLANATIONS (CHOICE-LEVEL):
- Provide short explanations for A, B, and C.
- For the best option, say why it beats the second-best alternative.
- For wrong/partial options, give one concise limitation (timing, safety, evidence).

EVIDENCE:
- Include quantitative data when reasonable (sens/spec, LR, NNT/ARR, time windows, complication %).

FORMAT:
- Output ONLY a JSON array of items, no markdown fences.
- Exactly 3 choices (A/B/C) and one best answer (A|B|C).
`;

// --- Lightweight, broad domain keywords (clinical + non-clinical) ---
const DOMAIN = {
  cardio: ["chest","coronary","angina","stemi","nstemi","mi","ischemia","ecg","troponin","pci","thrombolysis"],
  resp: ["dyspnea","wheeze","pneumonia","pleuritic","pe","pulmonary embol","pneumothorax","spirometry"],
  neuro: ["stroke","tia","seizure","hemiparesis","aphasia","nihss","ct head","tpa","gcs"],
  gi: ["abdominal","abdomen","ruq","rlq","luq","llq","periton","appendic","ileus","bowel","biliary","gallbladder","pancreat"],
  renal: ["ckd","egfr","hyperkalemia","hematuria","pyelo","nephrolithiasis","renal colic"],
  endo: ["dka","hhs","hypoglycemia","thyroid","adrenal","cortisol","pituitary"],
  heme_onc: ["anemia","thrombocyt","leukemia","lymphoma","neutropenia","chemotherapy"],
  msk: ["fracture","sprain","dislocation","compartment","rhabdo"],
  derm: ["rash","urticaria","erythema","dermatitis","cellulitis"],
  obgyn: ["pregnancy","obstetric","preeclampsia","postpartum","ectopic","pelvic"],
  psych: ["depression","mania","psychosis","suicide","anxiety","ptsd","substance use"],
  id: ["sepsis","bacteremia","meningitis","pneumonia","uti","mrsa","esbl","antibiotic"],
  tox: ["overdose","intoxication","poisoning","antidote"],
  oph: ["vision","retinal","glaucoma","uveitis"],
  ent: ["otitis","sinusitis","epistaxis","stridor"],
  ethics: ["consent","capacity","confidentiality","autonomy","beneficence","nonmaleficence","justice"],
  disaster: ["triage","mass casualty","incident command","decon","hot zone","cbrn","hazmat"],
  general: ["vitals","ews","triage","monitoring","airway","breathing","circulation","disability","exposure"]
};

// --- helpers ---
function tokenize(s = "") {
  return String(s).toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(w => w.length >= 3);
}
function jaccard(aSet, bSet) {
  const inter = new Set([...aSet].filter(x => bSet.has(x)));
  const uni = new Set([...aSet, ...bSet]);
  return uni.size ? inter.size / uni.size : 0;
}
function inferDomainsFromText(text = "") {
  const t = String(text).toLowerCase();
  const hits = new Set();
  for (const [name, kws] of Object.entries(DOMAIN)) {
    if (kws.some(k => t.includes(k))) hits.add(name);
  }
  if (!hits.size) hits.add("general");
  return hits;
}
function blobFromItem(item = {}) {
  return [
    item.type, item.section, item.context, item.paragraph, item.stem,
    ...(Array.isArray(item.choices) ? item.choices : []),
    item.answer,
    ...(item.explanation ? Object.values(item.explanation) : [])
  ].join(" ");
}

// Soft anchor: require some overlap between item paragraph and CASE CONTENT.
function anchorOK(paragraph = "", lowerSource = "") {
  const p = String(paragraph).toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const toks = Array.from(new Set(p.split(/\s+/).filter(w => w.length >= 4)));
  if (toks.length === 0) return true; // allow very short snippets
  const hits = toks.filter(w => lowerSource.includes(w)).length;
  const need = Math.min(3, Math.ceil(toks.length * 0.25)); // ≥3 or ≥25%
  return hits >= need;
}

// Post-parse hook: keep items grounded + apply universal nudges.
// ctx = { text }
export function afterParse(list, ctx = {}) {
  const source = String(ctx.text || "");
  const lower = source.toLowerCase();
  const srcTokens = new Set(tokenize(source));
  const srcDomains = inferDomainsFromText(source);

  // 1) Grounding anchor
  let out = (list || []).filter(q =>
    anchorOK(q.paragraph || q.context || q.prompt || "", lower)
  );

  // 2) Domain guard with tolerance for "general"/"ethics"
  out = out.filter(q => {
    const blob = blobFromItem(q).toLowerCase();
    const itemDomains = inferDomainsFromText(blob);
    const relaxed = new Set(itemDomains);
    relaxed.delete("general"); relaxed.delete("ethics");
    if (!relaxed.size) return true; // allow generic overlays
    const overlap = [...relaxed].some(d => srcDomains.has(d));
    if (overlap) return true;
    const sim = jaccard(new Set(tokenize(blob)), srcTokens);
    return sim >= 0.06; // weak relatedness fallback
  });

  // 3) Example global nuance
  if (/\b(appendectom(y|ies)|appendicectomy|previous appendectomy|prior appendectomy|appendix removed)\b/i.test(lower)) {
    out = out.map((q, i) => {
      const sec = String(q.section || "");
      const lateSlot = (i === 8 || i === 9); // Q9–Q10
      if (lateSlot && /diagnos|differential/i.test(sec)) {
        const rp = Array.isArray(q.rationalePanel) ? q.rationalePanel.slice(0, 3) : [];
        if (!rp.some(x => /stump appendicitis/i.test(String(x)))) {
          rp.unshift("Include stump appendicitis in late differential when prior appendectomy is present.");
        }
        return { ...q, rationalePanel: rp.slice(0, 3) };
      }
      return q;
    });
  }

  // 4) Final trim (safety)
  if (out.length > 12) out = out.slice(0, 12);
  return out;
}
