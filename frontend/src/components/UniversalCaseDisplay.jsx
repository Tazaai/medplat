// Universal Case Display - Clean, professional layout for universal JSON structure
import React, { useState } from "react";
import { transformCaseForDisplay } from "../utils/caseTransformer";
import { safeRenderJSX } from "../utils/safeRender";
import CollapsibleSection from "./CollapsibleSection";
import { annotateVital, annotateLab } from "../utils/clinicalAnnotations";
import { formatParaclinical, formatLabs, formatImaging } from "../utils/paraclinicalFormatter";

const STAGE_B_UNAVAILABLE_NOTE = "On-demand expansion currently unavailable for this case.";

export default function UniversalCaseDisplay({ 
  caseData,
  showExpert = false,
  showTeaching = false,
  showDeepEvidence = false,
  showStability = false,
  showRisk = false,
  showConsistency = false,
  paraclinicalExpanded = false,
  onParaclinicalToggle = null,
  loadingParaclinical = false,
  paraclinicalLoaded = false
}) {
  if (!caseData) return null;

  // Transform case data for improved display (applies all global improvements)
  const transformedCase = transformCaseForDisplay(caseData);

  // Format paraclinical sections (frontend-only formatting)
  const formattedParaclinical = transformedCase.paraclinical 
    ? formatParaclinical(transformedCase.paraclinical)
    : {};

  // Extract data from universal structure
  const {
    meta = {},
    history = "",
    physical_exam = "",
    paraclinical = formattedParaclinical,
    differential_diagnoses = [],
    final_diagnosis = "",
    management = {},
    red_flags = [],
    red_flag_hierarchy = {},
    key_points = [],
    expert_conference = "",
    pathophysiology = "",
    pathophysiology_detail = {},
    reasoning_chain = [],
    counterfactuals = "",
    crucial_concepts = "",
    common_pitfalls = "",
    exam_notes = "",
    exam_pearls = "",
    comparison_tables = "",
    next_best_step_algorithms = "",
    guidelines = {},
    mcqs = [],
    clinical_risk_assessment = "",
    next_diagnostic_steps = "",
    bedside_vs_advanced = "",
    comorbidity_reasoning = "",
  } = transformedCase;

  // Extract stratified differentials if available
  const differentialsStratified = transformedCase.differential_diagnoses_stratified;
  const expertConferenceStructured = transformedCase.expert_conference_structured;

  // Helper to extract reason for presentation from history
  const getReasonForPresentation = () => {
    if (meta.reason_for_presentation || meta.presenting_complaint) {
      return meta.reason_for_presentation || meta.presenting_complaint;
    }
    // Try to extract from history if it starts with common patterns
    if (history && typeof history === 'string') {
      const firstSentence = history.split(/[.!?]/)[0].trim();
      if (firstSentence.length < 100) {
        return firstSentence;
      }
    }
    return null;
  };

  // Helper to safely convert values to strings (prevents [object Object] rendering)
  const safeString = (value) => {
    if (value == null) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) return value.map(safeString).join(", ");
    if (typeof value === "object") {
      if (value.text) return safeString(value.text);
      if (value.value) return safeString(value.value);
      if (value.label) return safeString(value.label);
      if (value.name) return safeString(value.name);
      if (value.diagnosis) return safeString(value.diagnosis);
      return JSON.stringify(value); // Fallback for unexpected objects
    }
    return String(value);
  };

  // Helper to render text content
  const renderText = (text) => {
    if (!text || text === "") return <span className="text-gray-400 italic">Not provided</span>;
    return <p className="text-gray-800 leading-relaxed whitespace-pre-wrap my-2">{safeRenderJSX(text)}</p>;
  };

  // Helper to render array content with proper serialization
  const renderArray = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) {
      return null; // Return null to hide empty sections
    }
    
    // Serialize objects properly to prevent [object Object]
    const serializeItem = (item) => {
      if (typeof item === 'string') return item;
      if (typeof item === 'object' && item !== null) {
        // Handle medication objects
        if (item.name || item.medication) {
          const name = item.name || item.medication;
          const parts = [name];
          if (item.class) parts.push(`(${item.class})`);
          if (item.dose) parts.push(`- Dose: ${item.dose}`);
          if (item.mechanism) parts.push(`Mechanism: ${item.mechanism}`);
          return parts.join(' ');
        }
        // Handle guideline objects
        if (item.title || item.society) {
          const parts = [];
          if (item.society) parts.push(item.society);
          if (item.year) parts.push(`(${item.year})`);
          if (item.title) parts.push(item.title);
          return parts.join(' ');
        }
        // Fallback: try to extract meaningful fields
        return JSON.stringify(item);
      }
      return String(item);
    };
    
    return (
      <ul className="list-disc list-inside text-gray-800 leading-relaxed pl-0 my-2 space-y-2">
        {arr.map((item, idx) => (
          <li key={idx} className="leading-relaxed">{serializeItem(item)}</li>
        ))}
      </ul>
    );
  };

  // Helper to safely render differential diagnosis items (handles both string and object formats)
  const renderDifferentialItem = (item, idx) => {
    // Handle string format (legacy)
    if (typeof item === "string") {
      return (
        <li key={idx} className="leading-relaxed">{item}</li>
      );
    }

    // Handle invalid/null items
    if (!item || typeof item !== "object") {
      return null;
    }

    // Handle object format: { diagnosis, FOR, AGAINST, tier?, name?, label? }
    const name = safeString(item.diagnosis || item.name || item.label || "");
    
    if (!name) {
      // Fallback if no name found
      return null;
    }

    const forText = safeString(item.FOR || "");
    const againstText = safeString(item.AGAINST || "");
    const justificationText = safeString(item.justification || "");

    return (
      <li key={idx} className="space-y-1">
        {name && <strong className="text-gray-900">{name}</strong>}
        {forText && (
          <div className="text-sm text-gray-700 ml-2">
            <span className="font-semibold">For:</span> {forText}
          </div>
        )}
        {againstText && (
          <div className="text-sm text-gray-700 ml-2">
            <span className="font-semibold">Against:</span> {againstText}
          </div>
        )}
        {justificationText && !forText && !againstText && (
          <div className="text-xs text-gray-600 ml-2">({justificationText})</div>
        )}
      </li>
    );
  };

  // Helper to render physical examination with vital sign annotations
  const renderPhysicalExam = (physical_exam, ageYearsOrNull) => {
    if (!physical_exam) {
      return <span className="text-gray-400 italic">Not provided</span>;
    }
    
    // If it's a string (free-text), render as-is
    if (typeof physical_exam === "string") {
      return <div className="whitespace-pre-wrap">{safeRenderJSX(physical_exam)}</div>;
    }
    
    // If it's an object, render structured with vital annotations
    if (typeof physical_exam === "object" && !Array.isArray(physical_exam)) {
      const vitalKeys = ['heart_rate', 'hr', 'respiratory_rate', 'rr', 'blood_pressure', 'bp', 
                         'blood_pressure_systolic', 'bp_systolic', 'blood_pressure_diastolic', 'bp_diastolic',
                         'temperature', 'temp', 'spo2', 'oxygen_saturation'];
      
      const examKeys = Object.keys(physical_exam);
      const vitalEntries = [];
      const nonVitalEntries = [];
      
      examKeys.forEach(key => {
        const keyLower = key.toLowerCase();
        const isVital = vitalKeys.some(vk => keyLower.includes(vk.toLowerCase()) || vk.toLowerCase().includes(keyLower));
        
        if (isVital) {
          vitalEntries.push({ key, value: physical_exam[key] });
        } else {
          nonVitalEntries.push({ key, value: physical_exam[key] });
        }
      });
      
      return (
        <div className="space-y-3">
          {/* Vitals section */}
          {vitalEntries.length > 0 && (
            <div className="mb-4 pb-3 border-b border-gray-200">
              <h4 className="font-semibold text-gray-700 mb-2 text-sm">Vital Signs:</h4>
              <div className="flex flex-col gap-2">
                {vitalEntries.map(({ key, value }) => {
                  const rawValue = safeRenderJSX(value);
                  try {
                    const annotated = annotateVital(key, rawValue, ageYearsOrNull);
                    const statusColor = annotated.status === 'normal' ? 'text-green-700' : 
                                       annotated.status === 'high' ? 'text-red-700' : 
                                       annotated.status === 'low' ? 'text-orange-700' : 'text-gray-700';
                    return (
                      <div key={key} className="pl-2 border-l-2 border-blue-300">
                        <div className="font-medium text-gray-700 text-sm mb-1">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                        </div>
                        <div className={`leading-relaxed text-sm ${statusColor}`}>
                          {annotated.display}
                        </div>
                      </div>
                    );
                  } catch (err) {
                    // Fail gracefully - return raw value
                    return (
                      <div key={key} className="pl-2 border-l-2 border-blue-300">
                        <div className="font-medium text-gray-700 text-sm mb-1">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                        </div>
                        <div className="text-gray-800 leading-relaxed text-sm">
                          {rawValue}
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          )}
          
          {/* Non-vital exam findings */}
          {nonVitalEntries.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-2 text-sm">Examination Findings:</h4>
              <div className="flex flex-col gap-2">
                {nonVitalEntries.map(({ key, value }) => (
                  <div key={key} className="pl-2 border-l-2 border-gray-300">
                    <div className="font-medium text-gray-700 text-sm mb-1">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                    </div>
                    <div className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm">
                      {safeRenderJSX(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    
    // Fallback for arrays or other types
    return <div className="whitespace-pre-wrap">{safeRenderJSX(physical_exam)}</div>;
  };

  // Helper to render paraclinical object (uses frontend formatter for clean grouped bullet lists)
  const renderParaclinical = (paraclinical) => {
    const isEffectivelyEmpty = !paraclinical || 
      Object.keys(paraclinical).length === 0 ||
      paraclinical.status === "not_provided" ||
      (!paraclinical.labs && !paraclinical.imaging) ||
      (Array.isArray(paraclinical.labs) && paraclinical.labs.length === 0 && Array.isArray(paraclinical.imaging) && paraclinical.imaging.length === 0);

    if (isEffectivelyEmpty) {
      return <span className="text-gray-400 italic">Not provided</span>;
    }
    
    // Format labs using frontend formatter (returns JSX)
    const formattedLabs = formatLabs(paraclinical.labs);
    
    // Format imaging using frontend formatter (returns JSX)
    const formattedImaging = formatImaging(paraclinical.imaging);
    
    if (!formattedLabs && !formattedImaging) {
      return <span className="text-gray-400 italic">Not provided</span>;
    }
    
    return (
      <div className="flex flex-col gap-4">
        {formattedLabs && (
          <div>
            <h4 className="font-semibold text-gray-700 mb-3 text-sm">Laboratory Results:</h4>
            <div className="text-gray-800 bg-gray-50 p-4 rounded border-l-4 border-green-400">
              {formattedLabs}
            </div>
          </div>
        )}
        {formattedImaging && (
          <div>
            <h4 className="font-semibold text-gray-700 mb-3 text-sm">Imaging:</h4>
            <div className="text-gray-800 bg-gray-50 p-4 rounded border-l-4 border-blue-400">
              {formattedImaging}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Helper to render management object - IMPROVED with proper subheadings and spacing
  // Ensures all values are renderable (arrays of strings, never objects)
  const renderManagement = (management) => {
    if (!management || typeof management !== "object") {
      return <span className="text-gray-400 italic">Not provided</span>;
    }
    
    // Helper to safely render text (expects array of strings from transformer)
    const renderText = (text) => {
      if (!text) return null;
      // If it's an array (from transformer), render as bullet list
      if (Array.isArray(text)) {
        if (text.length === 0) return null;
        return (
          <ul className="list-disc list-inside space-y-1">
            {text.map((item, idx) => (
              <li key={idx} className="text-gray-800">
                {typeof item === 'string' ? item : String(item)}
              </li>
            ))}
          </ul>
        );
      }
      // Fallback for string (legacy format)
      if (typeof text === 'string') {
        // Split by newlines if multi-line
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length > 1) {
          return (
            <ul className="list-disc list-inside space-y-1">
              {lines.map((line, idx) => (
                <li key={idx} className="text-gray-800">{line}</li>
              ))}
            </ul>
          );
        }
        return <span className="text-gray-800">{text}</span>;
      }
      // Fallback: convert to string
      return <span className="text-gray-800">{String(text)}</span>;
    };
    
    return (
      <div className="flex flex-col gap-6">
        {management.initial && (
          <div>
            <h4 className="text-lg font-semibold mb-2 text-gray-800">Initial Management</h4>
            <div className="text-gray-800 leading-relaxed prose prose-neutral max-w-none max-w-prose">
              {renderText(management.initial)}
            </div>
          </div>
        )}
        {management.definitive && (
          <div>
            <h4 className="text-lg font-semibold mb-2 text-gray-800">Definitive Management</h4>
            <div className="text-gray-800 leading-relaxed prose prose-neutral max-w-none max-w-prose">
              {renderText(management.definitive)}
            </div>
          </div>
        )}
        {management.escalation && (
          <div>
            <h4 className="text-lg font-semibold mb-2 text-gray-800">Escalation Criteria</h4>
            <div className="text-gray-800 leading-relaxed prose prose-neutral max-w-none max-w-prose">
              {renderText(management.escalation)}
            </div>
          </div>
        )}
        {management.interventions && (
          <div>
            <h4 className="text-lg font-semibold mb-2 text-gray-800">Interventions</h4>
            <div className="text-gray-800 leading-relaxed prose prose-neutral max-w-none max-w-prose">
              {renderText(management.interventions)}
            </div>
          </div>
        )}
        {management.disposition && (
          <div>
            <h4 className="text-lg font-semibold mb-2 text-gray-800">Disposition</h4>
            <div className="text-gray-800 leading-relaxed prose prose-neutral max-w-none max-w-prose">
              {renderText(management.disposition)}
            </div>
          </div>
        )}
        {!management.initial && !management.definitive && !management.escalation && !management.interventions && !management.disposition && (
          <span className="text-gray-400 italic">Not provided</span>
        )}
      </div>
    );
  };

  // Helper to render guidelines - FULLY DYNAMIC with Tailwind cards
  const renderGuidelines = (guidelines) => {
    if (!guidelines || typeof guidelines !== "object") {
      return null;
    }

    // Define guideline tiers with priority cascade: Local → National → Continental → USA → Global (WHO)
    // This reflects the universal guideline priority hierarchy
    const guidelineTiers = [
      { key: "local", label: "Local Guidelines", icon: "🏥", priority: 1, description: "Highest priority: Local institutional or regional guidelines" },
      { key: "national", label: "National Guidelines", icon: "📑", priority: 2, description: "Second priority: Country-specific guidelines" },
      { key: "continental", label: "Continental Guidelines", icon: "🌐", priority: 3, description: "Third priority: Regional/continental guidelines" },
      { key: "usa", label: "US Guidelines", icon: "🦅", priority: 4, description: "Fourth priority: US-specific guidelines" },
      { key: "international", label: "Global Guidelines (WHO)", icon: "📘", priority: 5, description: "Fallback: International/WHO guidelines" },
    ];

    // Only show tiers that have content
    const tiersWithContent = guidelineTiers.filter(tier => {
      const tierData = guidelines[tier.key];
      return Array.isArray(tierData) && tierData.length > 0;
    });

    if (tiersWithContent.length === 0) return null;

    return (
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
        <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-gray-900">
          <span>📚</span>
          <span>Clinical Guidelines</span>
        </h3>
        <div className="mb-3 p-2 bg-blue-50 rounded-lg border-l-4 border-blue-500">
          <p className="text-xs text-blue-800 font-medium">
            <strong>Guideline Priority Cascade:</strong> Local → National → Continental → USA → Global (WHO)
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {tiersWithContent.map((tier) => {
            const tierData = guidelines[tier.key];
            if (!Array.isArray(tierData) || tierData.length === 0) return null;

            return (
              <div key={tier.key} className="bg-gray-50 rounded-lg p-4 space-y-2 border-l-4 border-blue-400">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-800 mb-2 text-sm flex items-center gap-2">
                    <span className="text-base">{tier.icon}</span>
                    <span>{tier.label}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Priority {tier.priority}</span>
                  </h4>
                </div>
                {tier.description && (
                  <p className="text-xs text-gray-600 mb-2 italic">{tier.description}</p>
                )}
                <ul className="list-disc list-inside text-gray-800 leading-relaxed pl-0 whitespace-pre-wrap space-y-1">
                  {tierData.map((guideline, idx) => (
                    <li key={idx} className="leading-relaxed whitespace-pre-wrap">{String(guideline)}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Get region for display (hide if unspecified)
  const displayRegion = meta.region_guideline_source && meta.region_guideline_source !== 'unspecified' 
    ? meta.region_guideline_source 
    : null;

  // Check for clinical urgency (e.g., STEMI, acute conditions)
  const clinicalUrgency = meta.clinical_urgency || meta.urgency || null;
  const isUrgent = clinicalUrgency && (
    clinicalUrgency.toLowerCase().includes('stemi') ||
    clinicalUrgency.toLowerCase().includes('acute') ||
    clinicalUrgency.toLowerCase().includes('emergency') ||
    clinicalUrgency.toLowerCase().includes('critical')
  );

  const reasonForPresentation = getReasonForPresentation();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
      {/* Case Header - IMPROVED with reason for presentation, final diagnosis badge, and better metadata */}
      <div className="bg-white rounded-lg shadow-md p-4 max-w-3xl mx-auto relative">
        {/* Global Development Framework Review Badge - Top-left */}
        <div className="absolute top-3 left-3">
          <span className="bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 border border-purple-300 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <span>🌐</span>
            <span>Reviewed by Global Development Framework</span>
          </span>
        </div>
        {reasonForPresentation && (
          <p className="text-sm text-gray-600 text-center mb-2 font-medium pt-8">
            {reasonForPresentation}
          </p>
        )}
        {/* Format topic title - convert snake_case to Title Case, show slug if different */}
        {(() => {
          const topicSlug = meta.topic || "";
          const topicSlugLower = topicSlug.toLowerCase();
          // Check if topic is in snake_case format
          const isSnakeCase = /^[a-z]+(_[a-z]+)+$/.test(topicSlugLower);
          let humanReadableTitle = topicSlug;
          let displaySlug = null;
          
          if (isSnakeCase) {
            // Convert snake_case to Title Case
            humanReadableTitle = topicSlug
              .split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
            displaySlug = topicSlug; // Keep original slug for display
          } else {
            // Already human-readable, but ensure Title Case
            humanReadableTitle = topicSlug
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
          }
          
          return (
            <>
              <h2 className="text-3xl font-bold text-center mb-1 text-gray-900 pt-8">
                {humanReadableTitle || "Clinical Case"}
              </h2>
              {displaySlug && displaySlug !== humanReadableTitle && (
                <p className="text-xs text-gray-400 text-center mb-2">
                  {displaySlug}
                </p>
              )}
            </>
          );
        })()}
        {final_diagnosis && (
          <div className="flex justify-center mt-2 mb-3">
            <span className="bg-blue-100 text-blue-800 border border-blue-300 px-4 py-1.5 rounded-full text-sm font-semibold">
              Final Diagnosis: {final_diagnosis}
            </span>
          </div>
        )}
        {isUrgent && (
          <div className="flex justify-center mt-2 mb-3">
            <span className="bg-red-100 text-red-800 border border-red-300 px-3 py-1 rounded-full text-sm font-semibold">
              {clinicalUrgency}
            </span>
          </div>
        )}
        <div className="text-sm text-gray-600 flex justify-center gap-4 mt-2 flex-wrap items-center">
          {meta.age && meta.sex && (
            <span className="flex items-center gap-1.5 font-medium">
              <span className="text-base">👤</span>
              <span>{meta.age} / {meta.sex}</span>
            </span>
          )}
          {meta.category && (
            <span className="flex items-center gap-1.5 font-medium">
              <span className="text-base">🩺</span>
              <span>{meta.category}</span>
            </span>
          )}
          {meta.setting && (
            <span className="flex items-center gap-1.5 font-medium">
              <span className="text-base">🏥</span>
              <span>{meta.setting}</span>
            </span>
          )}
          {displayRegion && (
            <span className="flex items-center gap-1.5 font-medium">
              <span className="text-base">🌍</span>
              <span>Region: {displayRegion}</span>
              <span className="text-xs text-gray-500">(Guideline cascade: Local → National → Continental → USA → WHO)</span>
            </span>
          )}
          {meta.disease_subtype && (
            <span className="flex items-center gap-1.5 font-medium">
              <span className="text-base">🏷️</span>
              <span>Subtype: {meta.disease_subtype}</span>
            </span>
          )}
          {meta.severity_grade && (
            <span className="flex items-center gap-1.5 font-medium">
              <span className="text-base">📊</span>
              <span>Severity: {meta.severity_grade}</span>
            </span>
          )}
          {meta.temporal_phase && (
            <span className="flex items-center gap-1.5 font-medium">
              <span className="text-base">⏱️</span>
              <span>Phase: {meta.temporal_phase}</span>
            </span>
          )}
        </div>
        {/* Primary and Secondary Diagnoses */}
        {(meta.primary_diagnosis || (meta.secondary_diagnoses && meta.secondary_diagnoses.length > 0)) && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            {meta.primary_diagnosis && (
              <div className="text-center mb-2">
                <span className="text-xs font-semibold text-gray-600">Primary:</span>
                <span className="ml-2 text-sm font-bold text-blue-700">{meta.primary_diagnosis}</span>
              </div>
            )}
            {meta.secondary_diagnoses && meta.secondary_diagnoses.length > 0 && (
              <div className="text-center">
                <span className="text-xs font-semibold text-gray-600">Secondary:</span>
                <span className="ml-2 text-sm text-gray-700">{meta.secondary_diagnoses.join(", ")}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 1. History */}
      {history && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
          <CollapsibleSection title="📜 History" defaultExpanded={true}>
            <div className="prose prose-neutral max-w-none">
              {renderText(history)}
            </div>
          </CollapsibleSection>
        </div>
      )}

      {/* 2. Physical Examination */}
      {physical_exam && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
          <CollapsibleSection title="🩺 Physical Examination" defaultExpanded={true}>
            <div className="prose prose-neutral max-w-none">
              {renderPhysicalExam(physical_exam, meta.age || null)}
            </div>
          </CollapsibleSection>
        </div>
      )}

      {/* 3. Paraclinical Investigations - Always render section, fetch on toggle */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto" key="paraclinical-section">
        <CollapsibleSection 
          title="🧪 Paraclinical Investigations" 
          defaultExpanded={paraclinicalExpanded}
          sectionKey="paraclinical"
          onToggle={onParaclinicalToggle}
        >
          <div className="prose prose-neutral max-w-none">
            {loadingParaclinical ? (
              <div className="flex items-center gap-2 text-gray-600">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <span>Loading paraclinical data...</span>
              </div>
            ) : paraclinicalLoaded && paraclinicalExpanded ? (
              // Only render when both loaded AND expanded (user explicitly clicked)
              paraclinical && Object.keys(paraclinical).length > 0 && paraclinical.status !== "not_provided"
                ? renderParaclinical(paraclinical)
                : <div className="text-gray-500 italic">Not provided</div>
            ) : null}
          </div>
        </CollapsibleSection>
      </div>

      {/* 3a. Diagnostic Evidence */}
      {paraclinical?.diagnostic_evidence && Object.keys(paraclinical.diagnostic_evidence).length > 0 && (
        (() => {
          const diagEv = paraclinical.diagnostic_evidence;
          const hasContent = Object.values(diagEv).some(v => v && v !== "");
          if (!hasContent) return null;
          return (
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-3 max-w-3xl mx-auto">
              <CollapsibleSection title="📈 Diagnostic Evidence Metrics" defaultExpanded={true}>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {diagEv.sensitivity && (
                  <div>
                    <span className="font-semibold text-gray-700">Sensitivity:</span>
                    <span className="ml-2 text-gray-800">{safeRenderJSX(diagEv.sensitivity)}</span>
                  </div>
                )}
                {diagEv.specificity && (
                  <div>
                    <span className="font-semibold text-gray-700">Specificity:</span>
                    <span className="ml-2 text-gray-800">{safeRenderJSX(diagEv.specificity)}</span>
                  </div>
                )}
                {diagEv.ppv && (
                  <div>
                    <span className="font-semibold text-gray-700">PPV:</span>
                    <span className="ml-2 text-gray-800">{safeRenderJSX(diagEv.ppv)}</span>
                  </div>
                )}
                {diagEv.npv && (
                  <div>
                    <span className="font-semibold text-gray-700">NPV:</span>
                    <span className="ml-2 text-gray-800">{safeRenderJSX(diagEv.npv)}</span>
                  </div>
                )}
                {diagEv.likelihood_ratios && (
                  <div className="col-span-2">
                    <span className="font-semibold text-gray-700">Likelihood Ratios:</span>
                    <span className="ml-2 text-gray-800">{safeRenderJSX(diagEv.likelihood_ratios)}</span>
                  </div>
                )}
              </div>
              {diagEv.diagnostic_traps && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h4 className="font-semibold text-orange-700 mb-1 text-sm">Diagnostic Traps:</h4>
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">{safeRenderJSX(diagEv.diagnostic_traps)}</div>
                </div>
              )}
              {diagEv.imaging_misses && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h4 className="font-semibold text-orange-700 mb-1 text-sm">Imaging Pitfalls:</h4>
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">{safeRenderJSX(diagEv.imaging_misses)}</div>
                </div>
              )}
              </CollapsibleSection>
            </div>
          );
        })()
      )}

      {/* 3b. Bedside vs Advanced Diagnostics */}
      {bedside_vs_advanced && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
          <CollapsibleSection title="⚖️ Bedside vs Advanced Diagnostics" defaultExpanded={true}>
            <div className="prose prose-neutral max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
              {renderText(bedside_vs_advanced)}
            </div>
          </CollapsibleSection>
        </div>
      )}

      {/* 4. Differential Diagnoses - STRATIFIED */}
      {(differentialsStratified || differential_diagnoses?.length > 0) && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
          <CollapsibleSection title="🔍 Differential Diagnoses" defaultExpanded={true}>
          {differentialsStratified ? (
            <div className="space-y-4">
              {differentialsStratified.critical_life_threatening?.length > 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                  <h4 className="font-bold text-red-900 mb-2 text-sm">🚨 Critical Life-Threatening</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {differentialsStratified.critical_life_threatening.map((diff, idx) => {
                      const name = safeString(diff.name || diff.diagnosis || "");
                      const forText = safeString(diff.FOR || "");
                      const againstText = safeString(diff.AGAINST || "");
                      const justificationText = safeString(diff.justification || "");
                      return (
                        <li key={idx} className="text-red-800 space-y-1">
                          {name && <strong>{name}</strong>}
                          {forText && (
                            <div className="text-xs text-red-700 ml-2">
                              <span className="font-semibold">For:</span> {forText}
                            </div>
                          )}
                          {againstText && (
                            <div className="text-xs text-red-700 ml-2">
                              <span className="font-semibold">Against:</span> {againstText}
                            </div>
                          )}
                          {justificationText && !forText && !againstText && (
                            <span className="text-xs text-red-600 ml-2">({justificationText})</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {differentialsStratified.urgent_mimics?.length > 0 && (
                <div className="bg-orange-50 border-l-4 border-orange-500 p-3 rounded">
                  <h4 className="font-bold text-orange-900 mb-2 text-sm">⚠️ Urgent Mimics</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {differentialsStratified.urgent_mimics.map((diff, idx) => {
                      const name = safeString(diff.name || diff.diagnosis || "");
                      const forText = safeString(diff.FOR || "");
                      const againstText = safeString(diff.AGAINST || "");
                      const justificationText = safeString(diff.justification || "");
                      return (
                        <li key={idx} className="text-orange-800 space-y-1">
                          {name && <strong>{name}</strong>}
                          {forText && (
                            <div className="text-xs text-orange-700 ml-2">
                              <span className="font-semibold">For:</span> {forText}
                            </div>
                          )}
                          {againstText && (
                            <div className="text-xs text-orange-700 ml-2">
                              <span className="font-semibold">Against:</span> {againstText}
                            </div>
                          )}
                          {justificationText && !forText && !againstText && (
                            <span className="text-xs text-orange-600 ml-2">({justificationText})</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {differentialsStratified.common_causes?.length > 0 && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                  <h4 className="font-bold text-blue-900 mb-2 text-sm">📋 Common Causes</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {differentialsStratified.common_causes.map((diff, idx) => {
                      const name = safeString(diff.name || diff.diagnosis || "");
                      const forText = safeString(diff.FOR || "");
                      const againstText = safeString(diff.AGAINST || "");
                      const justificationText = safeString(diff.justification || "");
                      return (
                        <li key={idx} className="text-blue-800 space-y-1">
                          {name && <strong>{name}</strong>}
                          {forText && (
                            <div className="text-xs text-blue-700 ml-2">
                              <span className="font-semibold">For:</span> {forText}
                            </div>
                          )}
                          {againstText && (
                            <div className="text-xs text-blue-700 ml-2">
                              <span className="font-semibold">Against:</span> {againstText}
                            </div>
                          )}
                          {justificationText && !forText && !againstText && (
                            <span className="text-xs text-blue-600 ml-2">({justificationText})</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {differentialsStratified.benign_causes?.length > 0 && (
                <div className="bg-gray-50 border-l-4 border-gray-400 p-3 rounded">
                  <h4 className="font-bold text-gray-900 mb-2 text-sm">✓ Benign Causes</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {differentialsStratified.benign_causes.map((diff, idx) => {
                      const name = safeString(diff.name || diff.diagnosis || "");
                      const forText = safeString(diff.FOR || "");
                      const againstText = safeString(diff.AGAINST || "");
                      const justificationText = safeString(diff.justification || "");
                      return (
                        <li key={idx} className="text-gray-800 space-y-1">
                          {name && <strong>{name}</strong>}
                          {forText && (
                            <div className="text-xs text-gray-700 ml-2">
                              <span className="font-semibold">For:</span> {forText}
                            </div>
                          )}
                          {againstText && (
                            <div className="text-xs text-gray-700 ml-2">
                              <span className="font-semibold">Against:</span> {againstText}
                            </div>
                          )}
                          {justificationText && !forText && !againstText && (
                            <span className="text-xs text-gray-600 ml-2">({justificationText})</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <ul className="list-disc list-inside text-gray-800 leading-relaxed pl-0 my-2 space-y-2">
              {Array.isArray(differential_diagnoses) &&
                differential_diagnoses.map(renderDifferentialItem)}
            </ul>
          )}
          </CollapsibleSection>
        </div>
      )}

      {/* 5. Final Diagnosis */}
      {final_diagnosis && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
          <CollapsibleSection title="✅ Final Diagnosis" defaultExpanded={true}>
            <div className="prose prose-neutral max-w-none">
              {renderText(final_diagnosis)}
            </div>
          </CollapsibleSection>
        </div>
      )}

      {/* 6. Management - IMPROVED with Initial/Definitive split and better spacing */}
      {management && Object.keys(management).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
          {/* Stability, Risk, Consistency badges */}
          {(transformedCase.stability || transformedCase.risk || transformedCase.consistency) && (
            <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-gray-200">
              {transformedCase.stability && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                  Stability: {safeRenderJSX(transformedCase.stability).substring(0, 50)}
                </span>
              )}
              {transformedCase.risk && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                  Risk: {safeRenderJSX(transformedCase.risk).substring(0, 30)}
                </span>
              )}
              {transformedCase.consistency && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  Consistency: {safeRenderJSX(transformedCase.consistency).substring(0, 40)}
                </span>
              )}
            </div>
          )}
          <CollapsibleSection title="💊 Management" defaultExpanded={true}>
            <div className="prose prose-neutral max-w-none">
              {renderManagement(management)}
            </div>
          </CollapsibleSection>
        </div>
      )}

      {/* 6a. Treatment Thresholds */}
      {management?.treatment_thresholds && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-blue-900">
            <span className="text-base">🎯</span>
            <span>Treatment Thresholds</span>
          </h3>
          <div className="prose prose-neutral max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
            {renderText(management.treatment_thresholds)}
          </div>
        </div>
      )}

      {/* 6b. Complications - Toggleable View with Prioritization */}
      {management?.complications && (
        (() => {
          const comp = management.complications;
          const hasContent = (comp.immediate && comp.immediate.length > 0) ||
                           (comp.early && comp.early.length > 0) ||
                           (comp.late && comp.late.length > 0);
          if (!hasContent) return null;
          
          // Count total complications for compact view
          const totalComplications = (comp.immediate?.length || 0) + 
                                    (comp.early?.length || 0) + 
                                    (comp.late?.length || 0);
          const showCompactView = totalComplications > 10; // Show compact view if >10 complications
          
          return (
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-3 max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold flex items-center gap-2 text-red-900">
                  <span className="text-base">⚠️</span>
                  <span>Complications</span>
                </h3>
                {showCompactView && (
                  <span className="text-xs text-gray-500">
                    {totalComplications} total complications
                  </span>
                )}
              </div>
              {comp.immediate && comp.immediate.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-700 mb-1 text-sm">Immediate (within hours):</h4>
                  {renderArray(comp.immediate)}
                </div>
              )}
              {comp.early && comp.early.length > 0 && (
                <div>
                  <h4 className="font-semibold text-orange-700 mb-1 text-sm">Early (days to weeks):</h4>
                  {renderArray(comp.early)}
                </div>
              )}
              {comp.late && comp.late.length > 0 && (
                <div>
                  <h4 className="font-semibold text-yellow-700 mb-1 text-sm">Late (weeks to months):</h4>
                  {renderArray(comp.late)}
                </div>
              )}
            </div>
          );
        })()
      )}

      {/* 6c. Pharmacology */}
      {management?.pharmacology && (
        (() => {
          const pharm = management.pharmacology;
          const hasContent = (pharm.key_drugs && pharm.key_drugs.length > 0) ||
                           pharm.mechanisms_of_action || pharm.dosing_adjustments ||
                           pharm.contraindicated_medications || pharm.stepwise_escalation ||
                           pharm.drug_disease_interactions;
          if (!hasContent) return null;
          return (
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-4 max-w-3xl mx-auto">
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-green-900">
                <span className="text-base">💉</span>
                <span>Pharmacology</span>
              </h3>
              {pharm.key_drugs && pharm.key_drugs.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1 text-sm">Key Medications:</h4>
                  {renderArray(pharm.key_drugs)}
                </div>
              )}
              {pharm.mechanisms_of_action && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1 text-sm">Mechanisms of Action:</h4>
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">{pharm.mechanisms_of_action}</div>
                </div>
              )}
              {pharm.dosing_adjustments && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1 text-sm">Dosing Adjustments:</h4>
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">{pharm.dosing_adjustments}</div>
                </div>
              )}
              {pharm.contraindicated_medications && (
                <div>
                  <h4 className="font-semibold text-red-700 mb-1 text-sm">Contraindicated Medications:</h4>
                  <div className="text-red-800 leading-relaxed whitespace-pre-wrap">{pharm.contraindicated_medications}</div>
                </div>
              )}
              {pharm.stepwise_escalation && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1 text-sm">Stepwise Treatment Escalation:</h4>
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">{pharm.stepwise_escalation}</div>
                </div>
              )}
              {pharm.drug_disease_interactions && (
                <div>
                  <h4 className="font-semibold text-orange-700 mb-1 text-sm">Drug-Disease Interactions:</h4>
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">{pharm.drug_disease_interactions}</div>
                </div>
              )}
            </div>
          );
        })()
      )}

      {/* 6d. Comorbidity-Aware Reasoning */}
      {comorbidity_reasoning && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-purple-900">
            <span className="text-base">🔄</span>
            <span>Comorbidity-Aware Reasoning</span>
          </h3>
          <div className="prose prose-neutral max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
            {renderText(comorbidity_reasoning)}
          </div>
        </div>
      )}

      {/* 7. Red Flags - UPGRADED with stronger alert styling and better contrast */}
      {red_flags && red_flags.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-red-900">
            <span className="text-base">🚨</span>
            <span>Red Flags</span>
          </h3>
          <div className="prose prose-neutral max-w-none text-red-800 font-medium">
            {renderArray(red_flags)}
          </div>
        </div>
      )}

      {/* 7a. Red Flag Hierarchy - Only render if present */}
      {(() => {
        // Skip silently if missing
        if (!red_flag_hierarchy || typeof red_flag_hierarchy !== 'object' || Object.keys(red_flag_hierarchy).length === 0) {
          return null;
        }
        
        const hierarchy = red_flag_hierarchy;
        const critical = hierarchy.critical || [];
        const important = hierarchy.important || [];
        const rareDangerous = hierarchy.rare_dangerous || [];
        
        // Skip silently if all tiers are empty
        if (critical.length === 0 && important.length === 0 && rareDangerous.length === 0) {
          return null;
        }
        
        return (
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-4 max-w-3xl mx-auto">
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-red-900">
              <span className="text-base">🚨</span>
              <span>Red Flag Hierarchy</span>
            </h3>
            <div className="space-y-4">
              {/* Critical tier - ALWAYS SHOW */}
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                <h4 className="font-bold text-red-900 mb-2 text-sm">🔴 Critical (Immediate Life-Threatening)</h4>
                {critical.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {critical.map((flag, idx) => (
                      <li key={idx} className="text-red-800">{safeString(flag)}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-red-700 text-sm italic">No critical red flags identified</p>
                )}
              </div>
              
              {/* Important tier - ALWAYS SHOW */}
              <div className="bg-orange-50 border-l-4 border-orange-500 p-3 rounded">
                <h4 className="font-bold text-orange-900 mb-2 text-sm">🟠 Important (Urgent Hours)</h4>
                {important.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {important.map((flag, idx) => (
                      <li key={idx} className="text-orange-800">{safeString(flag)}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-orange-700 text-sm italic">No important red flags identified</p>
                )}
              </div>
              
              {/* Rare-Dangerous tier - ALWAYS SHOW */}
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
                <h4 className="font-bold text-yellow-900 mb-2 text-sm">🟡 Rare-Dangerous (Uncommon but Serious)</h4>
                {rareDangerous.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {rareDangerous.map((flag, idx) => (
                      <li key={idx} className="text-yellow-800">{safeString(flag)}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-yellow-700 text-sm italic">No rare-dangerous red flags identified</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 8. Key Points - UPGRADED with educational highlight styling */}
      {key_points && key_points.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-blue-900">
            <span className="text-base">💡</span>
            <span>Key Points</span>
          </h3>
          <div className="prose prose-neutral max-w-none text-blue-800">
            {renderArray(key_points)}
          </div>
        </div>
      )}

      {/* 9. Pathophysiology - Only render if present */}
      {(() => {
        const hasPathophysiology = pathophysiology || (pathophysiology_detail && Object.keys(pathophysiology_detail).length > 0);
        // Skip silently if missing
        if (!hasPathophysiology) {
          return null;
        }
        
        return (
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
            <CollapsibleSection title="🧬 Pathophysiology" defaultExpanded={true}>
              <div className="prose prose-neutral max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
                {renderText(pathophysiology)}
              </div>
            </CollapsibleSection>
          </div>
        );
      })()}

      {/* 9a. Pathophysiology Detail - Only render if present */}
      {pathophysiology_detail && Object.keys(pathophysiology_detail).length > 0 && (
        (() => {
          const hasContent = Object.values(pathophysiology_detail).some(v => v && v !== "");
          if (!hasContent) return null;
          
          return (
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-4 max-w-3xl mx-auto">
              <CollapsibleSection title="🔬 Detailed Pathophysiology" defaultExpanded={true}>
                <div className="space-y-4">
                  {pathophysiology_detail.cellular_molecular && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1 text-sm">Cellular & Molecular Mechanisms:</h4>
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">{safeRenderJSX(pathophysiology_detail.cellular_molecular)}</div>
                </div>
              )}
              {pathophysiology_detail.organ_microanatomy && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1 text-sm">Organ-Specific Microanatomy:</h4>
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">{safeRenderJSX(pathophysiology_detail.organ_microanatomy)}</div>
                </div>
              )}
              {pathophysiology_detail.mechanistic_links && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1 text-sm">Mechanistic Links:</h4>
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">{safeRenderJSX(pathophysiology_detail.mechanistic_links)}</div>
                </div>
              )}
              {pathophysiology_detail.compensatory_pathways && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1 text-sm">Compensatory Pathways:</h4>
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">{safeRenderJSX(pathophysiology_detail.compensatory_pathways)}</div>
                </div>
              )}
              {pathophysiology_detail.text_diagrams && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1 text-sm">Pathway Diagram:</h4>
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap font-mono text-sm bg-gray-50 p-3 rounded">{safeRenderJSX(pathophysiology_detail.text_diagrams)}</div>
                </div>
              )}
                </div>
              </CollapsibleSection>
            </div>
          );
        })()
      )}

      {/* 10. Reasoning Chain (Stepwise) */}
      {/* REQUIRED: Normalize step numbering, remove duplicates, hide if empty */}
      {reasoning_chain && Array.isArray(reasoning_chain) && reasoning_chain.length > 0 && (() => {
        // REQUIRED: Normalize step numbering - remove duplicated prefixes
        const normalizedSteps = reasoning_chain
          .filter((step, idx, arr) => {
            // Remove duplicates
            if (idx > 0) {
              const prevStep = String(arr[idx - 1]).toLowerCase().replace(/^step\s+\d+[.:]\s*/gi, '').trim();
              const currentStep = String(step).toLowerCase().replace(/^step\s+\d+[.:]\s*/gi, '').trim();
              if (prevStep === currentStep && prevStep.length > 10) return false; // Remove duplicate
            }
            // Remove empty or placeholder steps
            const stepStr = String(step).trim();
            if (stepStr.length < 5 || stepStr.toLowerCase().includes('[object object]')) return false;
            return true;
          })
          .map((step, idx) => {
            // REQUIRED: Normalize to single consistent numbering
            const stepStr = String(step);
            // Remove all existing numbering patterns
            const cleaned = stepStr
              .replace(/^Step\s+\d+[.:]\s*/gi, '')
              .replace(/^\d+[.:]\s*/g, '')
              .replace(/^\(\d+\)\s*/g, '')
              .replace(/^\[\d+\]\s*/g, '')
              .trim();
            // Apply consistent numbering
            return cleaned;
          });
        
        return normalizedSteps.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
            <CollapsibleSection title="🔗 Stepwise Reasoning Chain" defaultExpanded={true}>
              <div className="prose prose-neutral max-w-none text-gray-800">
                <ol className="list-decimal list-inside space-y-3 pl-0">
                  {normalizedSteps.map((step, idx) => (
                    <li key={idx} className="leading-relaxed mb-2">
                      <span className="font-semibold text-cyan-900">Step {idx + 1}:</span>{" "}
                      <span className="text-gray-800">{safeString(step)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </CollapsibleSection>
          </div>
        ) : null;
      })()}

      {/* 11. Counterfactuals (Why Not Other Diagnoses?) */}
      {counterfactuals && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-amber-900">
            <span className="text-base">❓</span>
            <span>Why Not Other Diagnoses?</span>
          </h3>
          <div className="prose prose-neutral max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
            {renderText(counterfactuals)}
          </div>
        </div>
      )}

      {/* 12. Crucial Concepts */}
      {crucial_concepts && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-emerald-900">
            <span className="text-base">🎯</span>
            <span>Crucial Concepts</span>
          </h3>
          <div className="prose prose-neutral max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
            {renderText(crucial_concepts)}
          </div>
        </div>
      )}

      {/* 13. Common Pitfalls */}
      {common_pitfalls && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-orange-900">
            <span className="text-base">⚠️</span>
            <span>Common Pitfalls</span>
          </h3>
          <div className="prose prose-neutral max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
            {renderText(common_pitfalls)}
          </div>
        </div>
      )}

      {/* 14. Exam Pearls */}
      {exam_pearls && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-yellow-900">
            <span className="text-base">💎</span>
            <span>Exam Pearls</span>
          </h3>
          <div className="prose prose-neutral max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
            {renderText(exam_pearls)}
          </div>
        </div>
      )}

      {/* 15. Exam Notes */}
      {exam_notes && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-lime-900">
            <span className="text-base">📝</span>
            <span>Exam Notes</span>
          </h3>
          <div className="prose prose-neutral max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
            {renderText(exam_notes)}
          </div>
        </div>
      )}

      {/* 15a. Stability - Render based on loaded state, not content */}
      {showStability && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
          <CollapsibleSection title="⚖️ Stability Assessment" defaultExpanded={true}>
            <div className="prose prose-neutral max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
              {transformedCase.stability && typeof transformedCase.stability === 'string' && transformedCase.stability.trim().length > 0
                ? safeRenderJSX(transformedCase.stability)
                : <span className="text-gray-400 italic">Not provided</span>
              }
            </div>
          </CollapsibleSection>
        </div>
      )}

      {/* 15b. Risk - Render based on loaded state, not content */}
      {showRisk && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
          <CollapsibleSection title="⚠️ Risk Assessment" defaultExpanded={true}>
            <div className="prose prose-neutral max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
              {transformedCase.risk && typeof transformedCase.risk === 'string' && transformedCase.risk.trim().length > 0
                ? safeRenderJSX(transformedCase.risk)
                : <span className="text-gray-400 italic">Not provided</span>
              }
            </div>
          </CollapsibleSection>
        </div>
      )}

      {/* 15c. Consistency - Render based on loaded state, not content */}
      {showConsistency && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
          <CollapsibleSection title="✓ Consistency Check" defaultExpanded={true}>
            <div className="prose prose-neutral max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
              {transformedCase.consistency && typeof transformedCase.consistency === 'string' && transformedCase.consistency.trim().length > 0
                ? safeRenderJSX(transformedCase.consistency)
                : <span className="text-gray-400 italic">Not provided</span>
              }
            </div>
          </CollapsibleSection>
        </div>
      )}

      {/* 15d. Teaching Mode - ALWAYS render when showTeaching is true, regardless of content */}
      {showTeaching && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
          <CollapsibleSection title="🎓 Teaching Mode" defaultExpanded={true}>
            {(() => {
              const hasStructuredTeaching = (transformedCase.key_concepts?.length > 0 || 
                                             transformedCase.clinical_pearls?.length > 0 || 
                                             transformedCase.common_pitfalls?.length > 0);
              const hasStringTeaching = transformedCase.teaching && typeof transformedCase.teaching === 'string' && transformedCase.teaching.trim().length > 0;
              
              // Always render something - never return null
              if (hasStructuredTeaching) {
                return (
                  <div className="space-y-4">
                    {transformedCase.key_concepts?.length > 0 ? (
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">Key Concepts</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          {transformedCase.key_concepts.map((concept, idx) => (
                            <li key={idx}>{safeRenderJSX(concept)}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {transformedCase.clinical_pearls?.length > 0 ? (
                      <div>
                        <h4 className="font-semibold text-green-800 mb-2">Clinical Pearls</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          {transformedCase.clinical_pearls.map((pearl, idx) => (
                            <li key={idx}>{safeRenderJSX(pearl)}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {transformedCase.common_pitfalls?.length > 0 ? (
                      <div>
                        <h4 className="font-semibold text-orange-800 mb-2">Common Pitfalls</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          {transformedCase.common_pitfalls.map((pitfall, idx) => (
                            <li key={idx}>{safeRenderJSX(pitfall)}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                );
              } else if (hasStringTeaching) {
                return (
                  <div className="prose prose-neutral max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {safeRenderJSX(transformedCase.teaching)}
                  </div>
                );
              } else {
                // Always show something - never hide the section
                return <span className="text-gray-400 italic">Not provided</span>;
              }
            })()}
          </CollapsibleSection>
        </div>
      )}

      {/* 15e. Deep Evidence Mode - Render based on loaded state, not content */}
      {showDeepEvidence && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
          <CollapsibleSection title="🔍 Deep Evidence Mode" defaultExpanded={true}>
            <div className="prose prose-neutral max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
              {transformedCase.deepEvidence && typeof transformedCase.deepEvidence === 'string' && transformedCase.deepEvidence.trim().length > 0
                ? safeRenderJSX(transformedCase.deepEvidence)
                : <span className="text-gray-400 italic">Not provided</span>
              }
            </div>
          </CollapsibleSection>
        </div>
      )}

      {/* 16. Expert Conference Discussion - ALWAYS render when showExpert is true, regardless of content */}
      {showExpert && (
        <div className="bg-white rounded-xl shadow-sm p-4 max-w-3xl mx-auto">
          <CollapsibleSection title="👥 Expert Conference Discussion" defaultExpanded={true}>
            {(() => {
              // Also check for expertConference (from expand endpoint)
              const expertConf = transformedCase.expertConference || expert_conference;
              const hasExpertConference = expertConferenceStructured || 
                (expertConf && 
                 ((typeof expertConf === 'string' && expertConf.trim().length > 0) ||
                  (typeof expertConf === 'object' && Object.keys(expertConf).length > 0)));
              
              // Always render something - never return null or hide
              if (!hasExpertConference) {
                return <span className="text-gray-400 italic">Not provided</span>;
              }
              
              return expertConferenceStructured ? (
            <div className="space-y-4">
              {expertConferenceStructured.discussion && (
                <div className="prose prose-neutral max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {expertConferenceStructured.discussion}
                </div>
              )}
              {expertConferenceStructured.agreement_points?.length > 0 && (
                <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                  <h4 className="font-bold text-green-900 mb-2 text-sm">✅ Points of Agreement</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {expertConferenceStructured.agreement_points.map((point, idx) => (
                      <li key={idx} className="text-green-800">{point}</li>
                    ))}
                  </ul>
                </div>
              )}
              {expertConferenceStructured.disagreement_points?.length > 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
                  <h4 className="font-bold text-yellow-900 mb-2 text-sm">⚖️ Points of Disagreement</h4>
                  <div className="space-y-3">
                    {expertConferenceStructured.disagreement_points.map((disagreement, idx) => (
                      <div key={idx} className="border-l-2 border-yellow-400 pl-3">
                        <strong className="text-yellow-900">{disagreement.topic || `Disagreement ${idx + 1}`}</strong>
                        <div className="text-sm text-yellow-800 mt-1">
                          {disagreement.specialist_1 && <p><strong>Position 1:</strong> {disagreement.specialist_1}</p>}
                          {disagreement.specialist_2 && <p><strong>Position 2:</strong> {disagreement.specialist_2}</p>}
                          {disagreement.evidence && <p className="text-xs italic mt-1">Evidence: {disagreement.evidence}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {expertConferenceStructured.conclusion && (
                <div className="bg-indigo-50 border-l-4 border-indigo-500 p-3 rounded">
                  <h4 className="font-bold text-indigo-900 mb-2 text-sm">📝 Conclusion</h4>
                  <p className="text-indigo-800">{expertConferenceStructured.conclusion}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="prose prose-neutral max-w-none text-gray-800 leading-relaxed">
              {(() => {
                // Post-process Expert Conference string for better presentation
                const expertText = safeRenderJSX(expertConf);
                if (typeof expertText !== 'string') {
                  return <div className="whitespace-pre-wrap">{expertText}</div>;
                }
                
                // Split by doctor patterns and consensus
                const lines = expertText.split(/\n/);
                const processed = [];
                let currentBlock = [];
                
                lines.forEach((line, idx) => {
                  const trimmed = line.trim();
                  
                  // Check for doctor patterns: "Dr A", "Dr B", "Dr C", "Dr D", "Consensus"
                  if (/^Dr\s+[A-D](\s*[:\-\(])?/i.test(trimmed) || /^Consensus[:\-]?/i.test(trimmed)) {
                    // Save previous block if exists
                    if (currentBlock.length > 0) {
                      processed.push(
                        <div key={`block-${processed.length}`} className="mb-3 pl-3 border-l-2 border-indigo-300">
                          <div className="whitespace-pre-wrap">{currentBlock.join('\n')}</div>
                        </div>
                      );
                      currentBlock = [];
                    }
                    // Start new block with doctor name
                    currentBlock.push(trimmed);
                  } else if (trimmed.length > 0) {
                    currentBlock.push(trimmed);
                  } else if (currentBlock.length > 0) {
                    // Empty line - save current block
                    processed.push(
                      <div key={`block-${processed.length}`} className="mb-3 pl-3 border-l-2 border-indigo-300">
                        <div className="whitespace-pre-wrap">{currentBlock.join('\n')}</div>
                      </div>
                    );
                    currentBlock = [];
                  }
                });
                
                // Save last block
                if (currentBlock.length > 0) {
                  processed.push(
                    <div key={`block-${processed.length}`} className="mb-3 pl-3 border-l-2 border-indigo-300">
                      <div className="whitespace-pre-wrap">{currentBlock.join('\n')}</div>
                    </div>
                  );
                }
                
                // If no doctor patterns found, return original
                if (processed.length === 0) {
                  return <div className="whitespace-pre-wrap">{expertText}</div>;
                }
                
                return <div>{processed}</div>;
              })()}
            </div>
          );
            })()}
          </CollapsibleSection>
        </div>
      )}

      {/* 17. Guidelines - Only render if present */}
      {(() => {
        // Skip silently if missing
        if (!guidelines || typeof guidelines !== 'object') {
          return null;
        }
        const guidelineTiers = ['local', 'national', 'continental', 'usa', 'international'];
        let hasAnyGuideline = false;
        guidelineTiers.forEach(tier => {
          if (Array.isArray(guidelines[tier]) && guidelines[tier].length > 0) {
            hasAnyGuideline = true;
          }
        });
        if (!hasAnyGuideline) {
          return null; // Hide empty guideline cascade
        }
        return renderGuidelines(guidelines);
      })()}

      {/* 17a. Guideline Versions */}
      {guidelines?.versions && Object.keys(guidelines.versions).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-blue-900">
            <span className="text-base">📅</span>
            <span>Guideline Versions & Years</span>
          </h3>
          <div className="text-sm text-gray-800 space-y-1">
            {Object.entries(guidelines.versions).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="font-semibold capitalize">{key}:</span>
                <span>{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 17b. LMIC Alternatives - Only render if present */}
      {(() => {
        // Skip silently if missing (LMIC removed from system)
        if (!guidelines?.lmic_alternatives || !Array.isArray(guidelines.lmic_alternatives) || guidelines.lmic_alternatives.length === 0) {
          return null;
        }
        
        return (
          <div className="bg-amber-50 border-l-4 border-amber-500 rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-amber-200 text-amber-900 px-2 py-1 rounded text-xs font-bold">LMIC FALLBACK</span>
              <h3 className="text-xl font-bold flex items-center gap-2 text-amber-900">
                <span className="text-base">🌍</span>
                <span>Low-Resource (LMIC) Alternatives</span>
              </h3>
            </div>
            <p className="text-sm text-amber-800 mb-2 italic">
              These alternatives are provided for Low- and Middle-Income Countries (LMIC) where standard resources may not be available.
            </p>
            <div className="prose prose-neutral max-w-none text-gray-800">
              {/* Render as bullet-style readable text */}
              <ul className="list-disc list-inside space-y-2">
                {guidelines.lmic_alternatives.map((alt, idx) => (
                  <li key={idx} className="text-gray-800">
                    {typeof alt === 'string' ? alt : (
                      <div className="space-y-1">
                        {alt.resource_level && <span className="font-semibold">Resource Level: {alt.resource_level}</span>}
                        {alt.intervention && <div>Intervention: {alt.intervention}</div>}
                        {alt.trigger && <div>Trigger: {alt.trigger}</div>}
                        {alt.action && <div>Action: {alt.action}</div>}
                        {alt.monitoring && <div>Monitoring: {alt.monitoring}</div>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })()}

      {/* 17c. Antibiotic Resistance Logic */}
      {guidelines?.antibiotic_resistance_logic && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-red-900">
            <span className="text-base">🦠</span>
            <span>Region-Specific Antibiotic Resistance Logic</span>
          </h3>
          <div className="prose prose-neutral max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
            {renderText(guidelines.antibiotic_resistance_logic)}
          </div>
        </div>
      )}

      {/* 18. Clinical Risk Assessment */}
      {clinical_risk_assessment && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-gray-900">
            <span className="text-base">📊</span>
            <span>Clinical Risk Assessment</span>
          </h3>
          <div className="prose prose-neutral max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
            {renderText(clinical_risk_assessment)}
          </div>
        </div>
      )}

      {/* 19. Next Diagnostic Steps */}
      {next_diagnostic_steps && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-gray-900">
            <span className="text-base">🔬</span>
            <span>Next Diagnostic Steps</span>
          </h3>
          <div className="prose prose-neutral max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
            {renderText(next_diagnostic_steps)}
          </div>
        </div>
      )}

      {/* 19a. Comparison Tables */}
      {comparison_tables && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-indigo-900">
            <span className="text-base">📊</span>
            <span>Comparison Tables</span>
          </h3>
          <div className="prose prose-neutral max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap font-mono text-sm bg-gray-50 p-3 rounded">
            {renderText(comparison_tables)}
          </div>
        </div>
      )}

      {/* 19b. Next-Best-Step Algorithms */}
      {next_best_step_algorithms && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-cyan-900">
            <span className="text-base">🔄</span>
            <span>Next-Best-Step Algorithms</span>
          </h3>
          <div className="prose prose-neutral max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap font-mono text-sm bg-gray-50 p-3 rounded">
            {renderText(next_best_step_algorithms)}
          </div>
        </div>
      )}

      {/* MCQs (only show if present) */}
      {mcqs && Array.isArray(mcqs) && mcqs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2 max-w-3xl mx-auto">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-gray-900">
            <span className="text-base">❓</span>
            <span>Multiple Choice Questions ({mcqs.length})</span>
          </h3>
          <div className="flex flex-col gap-4">
            {mcqs.map((mcq, idx) => (
              <div key={idx} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                <p className="font-semibold text-gray-900 mb-2 text-base">
                  {idx + 1}. {mcq.question || mcq.stem || "Question"}
                </p>
                {mcq.choices && Array.isArray(mcq.choices) && (
                  <ul className="list-disc list-inside text-gray-800 leading-relaxed pl-4 mb-2">
                    {mcq.choices.map((choice, cIdx) => (
                      <li key={cIdx} className="mb-1">{choice}</li>
                    ))}
                  </ul>
                )}
                {mcq.correct && (
                  <p className="mt-2 text-green-700 font-semibold text-sm">
                    Correct Answer: {mcq.correct}
                  </p>
                )}
                {mcq.explanation && (
                  <p className="mt-2 text-gray-600 text-sm italic">
                    {mcq.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
