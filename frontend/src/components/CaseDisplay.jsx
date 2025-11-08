// ~/medplat/frontend/src/components/CaseDisplay.jsx
import React, { useState } from "react";
import {
  ChevronDown, 
  ChevronUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Stethoscope,
  Activity,
  TestTube,
  Brain,
  Shield,
  BookOpen,
  Calendar,
  Target
} from "lucide-react";

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false, highlight = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`mb-4 rounded-lg border ${highlight ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'} shadow-sm`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 flex items-center justify-between ${highlight ? 'bg-blue-100 hover:bg-blue-200' : 'bg-gray-50 hover:bg-gray-100'} rounded-t-lg transition-colors`}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`w-5 h-5 ${highlight ? 'text-blue-600' : 'text-gray-600'}`} />}
          <h3 className={`font-semibold text-lg ${highlight ? 'text-blue-900' : 'text-gray-900'}`}>
            {title}
          </h3>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      {isOpen && (
        <div className="px-4 py-3">
          {children}
        </div>
      )}
    </div>
  );
}

function RedFlagsList({ redFlags }) {
  if (!redFlags || redFlags.length === 0) return null;

  return (
    <div className="mb-4 p-4 bg-rose-50 border-l-4 border-rose-600 rounded-lg shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-6 h-6 text-rose-700" />
        <h4 className="font-bold text-rose-900 text-lg">⚠️ RED FLAGS - Immediate Actions Required</h4>
      </div>
      <ul className="space-y-2">
        {redFlags.map((flag, idx) => (
          <li key={idx} className="text-rose-900 bg-white rounded p-2 border border-rose-200">
            {typeof flag === 'string' ? (
              <span className="font-medium">• {flag}</span>
            ) : (
              <div>
                <strong className="text-rose-800">• {flag.flag || flag.name}</strong>
                {flag.significance && <p className="ml-4 text-sm text-rose-700 mt-1">Significance: {flag.significance}</p>}
                {flag.action_needed && <p className="ml-4 text-sm italic text-rose-800 mt-1 font-medium">→ Action: {flag.action_needed}</p>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TeachingPearls({ teaching }) {
  if (!teaching || (!teaching.pearls?.length && !teaching.mnemonics?.length)) return null;

  return (
    <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="w-5 h-5 text-green-600" />
        <h4 className="font-bold text-green-900">🩺 Teaching Points</h4>
      </div>
      
      {teaching.pearls && teaching.pearls.length > 0 && (
        <div className="mb-3">
          <h5 className="font-semibold text-green-800 mb-1">Clinical Pearls:</h5>
          <ul className="space-y-1">
            {teaching.pearls.map((pearl, idx) => (
              <li key={idx} className="text-green-900 text-sm">💎 {pearl}</li>
            ))}
          </ul>
        </div>
      )}

      {teaching.mnemonics && teaching.mnemonics.length > 0 && (
        <div>
          <h5 className="font-semibold text-green-800 mb-1">Mnemonics:</h5>
          {teaching.mnemonics.map((mnemonic, idx) => (
            <div key={idx} className="text-sm text-green-900 mb-2">
              {typeof mnemonic === 'string' ? (
                <span>🧠 {mnemonic}</span>
              ) : (
                <div>
                  <strong>🧠 {mnemonic.acronym}</strong> - {mnemonic.meaning}
                  {mnemonic.clinical_use && <p className="ml-4 italic">{mnemonic.clinical_use}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TimingWindows({ windows }) {
  if (!windows || windows.length === 0) return null;

  return (
    <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-4 h-4 text-orange-600" />
        <h5 className="font-semibold text-orange-900">⏱️ Critical Timing Windows</h5>
      </div>
      <ul className="space-y-1 text-sm">
        {windows.map((window, idx) => (
          <li key={idx} className="text-orange-900">
            <strong>{window.action}:</strong> {window.window}
            {window.rationale && <span className="text-orange-700 ml-2">({window.rationale})</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CaseDisplay({ caseData }) {
  if (!caseData) return null;

  const renderContent = (value) => {
    if (value == null || value === "") return <i className="text-gray-400">Not specified</i>;
    if (Array.isArray(value)) {
      return (
        <ul className="list-disc ml-6 space-y-1">
          {value.map((item, idx) => (
            <li key={idx}>{renderContent(item)}</li>
          ))}
        </ul>
      );
    }
    if (typeof value === "object") {
      return (
        <ul className="list-disc ml-6 space-y-1">
          {Object.entries(value).map(([k, v], idx) => (
            <li key={idx}>
              <strong>{k.replace(/_/g, " ")}:</strong> {renderContent(v)}
            </li>
          ))}
        </ul>
      );
    }
    return <span>{String(value)}</span>;
  };

  const isValidated = caseData.meta?.reviewed_by_internal_panel;

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header with Validation Badge */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold mb-3">{caseData.Topic}</h2>
        {isValidated && (
          <div className="flex items-center gap-2 bg-green-100 text-green-800 rounded-full px-4 py-2 w-fit shadow-sm">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-semibold">✅ Validated by Internal Expert Panel</span>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          {caseData.meta?.age && <span>👤 {caseData.meta.age} years old</span>}
          {caseData.meta?.sex && <span>{caseData.meta.sex}</span>}
          {caseData.meta?.region && <span>📍 {caseData.meta.region}</span>}
        </div>
      </div>

      {/* Timeline */}
      {caseData.Timeline && (
        <CollapsibleSection title="Timeline & Onset" icon={Clock} defaultOpen={true}>
          {renderContent(caseData.Timeline)}
        </CollapsibleSection>
      )}

      {/* History */}
      <CollapsibleSection title="Patient History" icon={Stethoscope} defaultOpen={true}>
        {caseData.History_Full ? renderContent(caseData.History_Full) : renderContent(caseData.Patient_History)}
        <TeachingPearls teaching={caseData.Teaching} />
      </CollapsibleSection>

      {/* Examination */}
      <CollapsibleSection title="Physical Examination" icon={Activity}>
        {caseData.Vitals && Object.keys(caseData.Vitals).length > 0 && (
          <div className="mb-3 p-2 bg-gray-50 rounded">
            <h5 className="font-semibold mb-1">Vital Signs:</h5>
            {renderContent(caseData.Vitals)}
          </div>
        )}
        {caseData.Exam_Full ? renderContent(caseData.Exam_Full) : renderContent(caseData.Objective_Findings)}
      </CollapsibleSection>

      {/* Investigations */}
      <CollapsibleSection title="Paraclinical Investigations" icon={TestTube}>
        {renderContent(caseData.Paraclinical_Investigations)}
      </CollapsibleSection>

      {/* Differentials */}
      <CollapsibleSection title="Differential Diagnoses" icon={Brain}>
        {caseData.Differential_Diagnoses && caseData.Differential_Diagnoses.length > 0 ? (
          <ul className="space-y-2">
            {caseData.Differential_Diagnoses.map((diff, idx) => (
              <li key={idx} className="border-l-4 border-gray-300 pl-3">
                <div className="font-semibold">
                  {diff.name}
                  {diff.status && (
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded ${
                      diff.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                      diff.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {diff.status}
                    </span>
                  )}
                </div>
                {diff.why_for && <p className="text-sm text-green-700 mt-1">✓ For: {diff.why_for}</p>}
                {diff.why_against && <p className="text-sm text-red-700">✗ Against: {diff.why_against}</p>}
              </li>
            ))}
          </ul>
        ) : renderContent(caseData.Differential_Diagnoses)}
      </CollapsibleSection>

      {/* Red Flags */}
      {caseData.Red_Flags && caseData.Red_Flags.length > 0 && (
        <RedFlagsList redFlags={caseData.Red_Flags} />
      )}

      {/* Final Diagnosis */}
      <CollapsibleSection title="Final Diagnosis" icon={Target} defaultOpen={true} highlight={true}>
        <div className="text-lg">
          <strong className="text-blue-900">{caseData.Final_Diagnosis?.Diagnosis}</strong>
          {caseData.Final_Diagnosis?.Rationale && (
            <p className="mt-2 text-gray-700">{caseData.Final_Diagnosis.Rationale}</p>
          )}
        </div>
      </CollapsibleSection>

      {/* Management */}
      <CollapsibleSection title="Management" icon={Shield} defaultOpen={true} highlight={true}>
        {caseData.Management_Full?.timing_windows && <TimingWindows windows={caseData.Management_Full.timing_windows} />}
        {caseData.Management_Full ? renderContent(caseData.Management_Full) : renderContent(caseData.Management)}
      </CollapsibleSection>

      {/* Pathophysiology */}
      {caseData.Pathophysiology && Object.keys(caseData.Pathophysiology).length > 0 && (
        <CollapsibleSection title="Pathophysiology">
          {renderContent(caseData.Pathophysiology)}
        </CollapsibleSection>
      )}

      {/* Disposition */}
      {caseData.Disposition && Object.keys(caseData.Disposition).length > 0 && (
        <CollapsibleSection title="Disposition & Follow-up" icon={Calendar}>
          {renderContent(caseData.Disposition)}
        </CollapsibleSection>
      )}

      {/* Evidence */}
      {caseData.Evidence_and_References && Object.keys(caseData.Evidence_and_References).length > 0 && (
        <CollapsibleSection title="Evidence & References">
          {renderContent(caseData.Evidence_and_References)}
        </CollapsibleSection>
      )}

      {/* Expert Panel Notes */}
      {caseData.Expert_Panel_and_Teaching && Object.keys(caseData.Expert_Panel_and_Teaching).length > 0 && (
        <CollapsibleSection title="Expert Panel Perspectives">
          {renderContent(caseData.Expert_Panel_and_Teaching)}
        </CollapsibleSection>
      )}
    </div>
  );
}
