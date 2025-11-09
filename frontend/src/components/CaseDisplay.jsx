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
  Target,
  ExternalLink,
  Building2,
  MapPin,
  Globe2
} from "lucide-react";

// Tier badge component with icons and colors
function TierBadge({ tier }) {
  const tiers = {
    local: { emoji: "🏥", label: "Local/Hospital", color: "bg-gray-100 text-gray-800 border-gray-300" },
    regional: { emoji: "📍", label: "Regional", color: "bg-blue-100 text-blue-800 border-blue-300" },
    national: { emoji: "🏛️", label: "National", color: "bg-green-100 text-green-800 border-green-300" },
    continental: { emoji: "🌍", label: "Continental", color: "bg-purple-100 text-purple-800 border-purple-300" },
    international: { emoji: "🌐", label: "International", color: "bg-orange-100 text-orange-800 border-orange-300" }
  };

  const tierInfo = tiers[tier?.toLowerCase()] || tiers.international;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${tierInfo.color}`}>
      <span>{tierInfo.emoji}</span>
      <span>{tierInfo.label}</span>
    </span>
  );
}

// Enhanced guidelines display with tier hierarchy
function GuidelinesSection({ guidelines }) {
  if (!guidelines || guidelines.length === 0) return null;

  const sortedGuidelines = [...guidelines].sort((a, b) => {
    const tierOrder = { local: 1, regional: 2, national: 3, continental: 4, international: 5 };
    return (tierOrder[a.tier?.toLowerCase()] || 5) - (tierOrder[b.tier?.toLowerCase()] || 5);
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-5 h-5 text-blue-600" />
        <h4 className="font-semibold text-gray-900">📋 Clinical Guidelines (Hierarchical)</h4>
      </div>
      {sortedGuidelines.map((guideline, idx) => (
        <div key={idx} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start gap-2 mb-2">
            <TierBadge tier={guideline.tier} />
            <div className="flex-1">
              <div className="font-semibold text-gray-900">
                {guideline.society} {guideline.year && `(${guideline.year})`}
              </div>
              <div className="text-sm text-gray-700 mt-1">{guideline.title}</div>
              {guideline.recommendation && (
                <div className="text-xs text-gray-600 mt-1 italic">
                  Recommendation: {guideline.recommendation}
                </div>
              )}
            </div>
          </div>
          {guideline.url_or_doi && (
            <a
              href={guideline.url_or_doi.startsWith('http') ? guideline.url_or_doi : `https://doi.org/${guideline.url_or_doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline mt-2"
            >
              <ExternalLink className="w-3 h-3" />
              <span>View guideline</span>
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

// Enhanced conference-style panel discussion display
function ConferencePanelDisplay({ panelData }) {
  if (!panelData || (!panelData.specialist_viewpoints && !panelData.conference_format)) return null;

  const viewpoints = panelData.specialist_viewpoints || [];
  const debates = panelData.points_of_debate || [];
  const consensus = panelData.consensus || "";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-5 h-5 text-indigo-600" />
        <h4 className="font-semibold text-gray-900">🎓 Medical Conference Panel Discussion</h4>
      </div>

      {/* Specialist Viewpoints */}
      {viewpoints.length > 0 && (
        <div className="space-y-3">
          <h5 className="font-medium text-gray-800 text-sm">Expert Viewpoints:</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {viewpoints.map((view, idx) => (
              <div key={idx} className="p-3 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-indigo-900">{view.specialty}</span>
                  {view.confidence && (
                    <span className="text-xs px-2 py-1 bg-indigo-200 text-indigo-800 rounded-full font-medium">
                      {view.confidence} confident
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-800 mb-2">{view.argument}</p>
                {view.evidence_cited && (
                  <p className="text-xs text-indigo-700 italic">
                    📚 Evidence: {view.evidence_cited}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Points of Debate */}
      {debates.length > 0 && (
        <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded">
          <h5 className="font-semibold text-amber-900 mb-2">⚖️ Points of Debate:</h5>
          {debates.map((debate, idx) => (
            <div key={idx} className="mb-3 last:mb-0">
              <p className="font-medium text-amber-900">{debate.issue}</p>
              <div className="ml-4 mt-2 space-y-1 text-sm">
                <p className="text-amber-800">
                  <span className="font-medium">Viewpoint A:</span> {debate.viewpoint_a}
                </p>
                <p className="text-amber-800">
                  <span className="font-medium">Viewpoint B:</span> {debate.viewpoint_b}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Consensus */}
      {consensus && (
        <div className="p-4 bg-green-50 border-l-4 border-green-600 rounded">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h5 className="font-semibold text-green-900">Panel Consensus:</h5>
          </div>
          <p className="text-gray-800">{consensus}</p>
        </div>
      )}
    </div>
  );
}

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
  const [isExpanded, setIsExpanded] = React.useState(true);
  
  if (!teaching || (!teaching.pearls?.length && !teaching.mnemonics?.length && !teaching.pitfall && !teaching.reflection_question)) return null;

  const hasContent = teaching.pearls?.length > 0 || teaching.mnemonics?.length > 0 || teaching.pitfall || teaching.reflection_question;
  if (!hasContent) return null;

  return (
    <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-lg shadow-sm">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left hover:bg-green-100 p-2 rounded transition-colors"
      >
        <BookOpen className="w-5 h-5 text-green-600" />
        <h4 className="font-bold text-green-900 flex-1">🩺 Teaching & Learning Points</h4>
        <span className="text-sm text-green-700">
          {isExpanded ? '▼ Collapse' : '▶ Expand'}
        </span>
      </button>
      
      {isExpanded && (
        <div className="mt-3 space-y-4">
          {/* Clinical Pearls */}
          {teaching.pearls && teaching.pearls.length > 0 && (
            <div className="bg-white p-3 rounded border border-green-200">
              <h5 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                💎 Clinical Pearls
              </h5>
              <ul className="space-y-2">
                {teaching.pearls.map((pearl, idx) => (
                  <li key={idx} className="text-green-900 text-sm pl-4 border-l-2 border-green-300">
                    {pearl}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Common Pitfall */}
          {teaching.pitfall && (
            <div className="bg-orange-50 p-3 rounded border border-orange-300">
              <h5 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                ⚠️ Common Pitfall
              </h5>
              <p className="text-orange-900 text-sm italic pl-4 border-l-2 border-orange-400">
                {teaching.pitfall}
              </p>
            </div>
          )}

          {/* Reflection Question */}
          {teaching.reflection_question && (
            <div className="bg-blue-50 p-3 rounded border border-blue-300">
              <h5 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                🤔 Reflection Question
              </h5>
              <p className="text-blue-900 text-sm font-medium pl-4 border-l-2 border-blue-400">
                {teaching.reflection_question}
              </p>
            </div>
          )}

          {/* Mnemonics */}
          {teaching.mnemonics && teaching.mnemonics.length > 0 && (
            <div className="bg-purple-50 p-3 rounded border border-purple-300">
              <h5 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                🧠 Mnemonics
              </h5>
              <div className="space-y-2">
                {teaching.mnemonics.map((mnemonic, idx) => (
                  <div key={idx} className="text-sm text-purple-900 pl-4 border-l-2 border-purple-400">
                    {typeof mnemonic === 'string' ? (
                      <span>{mnemonic}</span>
                    ) : (
                      <div>
                        <strong className="text-purple-800">{mnemonic.acronym}</strong> — {mnemonic.meaning}
                        {mnemonic.clinical_use && (
                          <p className="ml-2 mt-1 text-xs italic text-purple-700">
                            Clinical use: {mnemonic.clinical_use}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
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

// Panel Discussion Component - Medical Conference Style
function PanelDiscussion({ caseData }) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [discussion, setDiscussion] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

  const fetchDiscussion = async () => {
    if (discussion) {
      // Already loaded, just toggle
      setIsExpanded(!isExpanded);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/panel-discussion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseData,
          focus: 'differentials'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch panel discussion: ${response.statusText}`);
      }

      const data = await response.json();
      setDiscussion(data.discussion);
      setIsExpanded(true);
    } catch (err) {
      console.error('Panel discussion error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 mb-4">
      <button
        onClick={fetchDiscussion}
        disabled={loading}
        className="w-full p-4 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 border-2 border-indigo-300 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🩺</span>
            <div className="text-left">
              <h3 className="font-bold text-indigo-900">View Internal Panel Discussion</h3>
              <p className="text-sm text-indigo-700">Medical conference-style debate on differentials</p>
            </div>
          </div>
          {loading ? (
            <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <span className="text-indigo-700 font-semibold">
              {isExpanded ? '▼ Collapse' : '▶ Load Discussion'}
            </span>
          )}
        </div>
      </button>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          ⚠️ {error}
        </div>
      )}

      {isExpanded && discussion && (
        <div className="mt-4 space-y-4 bg-white p-4 border-2 border-indigo-200 rounded-lg">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-indigo-200">
            <span className="text-xl">🏥</span>
            <h4 className="font-bold text-indigo-900">Medical Conference Discussion</h4>
          </div>

          {/* Differentials Discussion */}
          {discussion.differentials_discussion && discussion.differentials_discussion.map((diff, idx) => (
            <div key={idx} className="border border-gray-300 rounded-lg overflow-hidden">
              {/* Diagnosis Header */}
              <div className={`p-3 font-bold ${
                diff.status === 'ACCEPTED' ? 'bg-green-100 text-green-900' :
                diff.status === 'REJECTED' ? 'bg-red-100 text-red-900' :
                'bg-yellow-100 text-yellow-900'
              }`}>
                <div className="flex items-center justify-between">
                  <span>{diff.diagnosis}</span>
                  <span className="text-sm font-semibold px-2 py-1 bg-white bg-opacity-50 rounded">
                    {diff.status}
                  </span>
                </div>
              </div>

              {/* Arguments FOR */}
              {diff.arguments_for && diff.arguments_for.length > 0 && (
                <div className="p-4 bg-green-50">
                  <h5 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                    <span>✅</span>
                    <span>Arguments FOR</span>
                  </h5>
                  <div className="space-y-3">
                    {diff.arguments_for.map((arg, argIdx) => (
                      <div key={argIdx} className="bg-white p-3 rounded border-l-4 border-green-500">
                        <div className="font-semibold text-green-900 mb-1">
                          {arg.speaker} ({arg.specialty})
                          {arg.confidence && (
                            <span className="ml-2 text-xs px-2 py-1 bg-green-100 rounded">
                              Confidence: {arg.confidence}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-800 mb-2">{arg.argument}</p>
                        {arg.supporting_evidence && (
                          <p className="text-xs text-green-700 italic">
                            Evidence: {arg.supporting_evidence}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Arguments AGAINST */}
              {diff.arguments_against && diff.arguments_against.length > 0 && (
                <div className="p-4 bg-red-50">
                  <h5 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                    <span>❌</span>
                    <span>Arguments AGAINST</span>
                  </h5>
                  <div className="space-y-3">
                    {diff.arguments_against.map((arg, argIdx) => (
                      <div key={argIdx} className="bg-white p-3 rounded border-l-4 border-red-500">
                        <div className="font-semibold text-red-900 mb-1">
                          {arg.speaker} ({arg.specialty})
                        </div>
                        <p className="text-sm text-gray-800 mb-2">{arg.argument}</p>
                        {arg.contradicting_evidence && (
                          <p className="text-xs text-red-700 italic mb-1">
                            Contradicting: {arg.contradicting_evidence}
                          </p>
                        )}
                        {arg.alternative_explanation && (
                          <p className="text-xs text-orange-700 italic">
                            Alternative: {arg.alternative_explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Consensus */}
              {diff.consensus && (
                <div className="p-3 bg-gray-100 border-t border-gray-300">
                  <p className="text-sm text-gray-800">
                    <strong className="text-gray-900">Panel Consensus:</strong> {diff.consensus}
                  </p>
                </div>
              )}
            </div>
          ))}

          {/* Teaching Insights */}
          {discussion.teaching_insights && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-300 rounded-lg">
              <h5 className="font-bold text-blue-900 mb-3">📚 Teaching Insights</h5>
              
              {discussion.teaching_insights.clinical_pearls && discussion.teaching_insights.clinical_pearls.length > 0 && (
                <div className="mb-3">
                  <h6 className="font-semibold text-blue-800 mb-1">Clinical Pearls:</h6>
                  <ul className="list-disc ml-5 space-y-1 text-sm text-blue-900">
                    {discussion.teaching_insights.clinical_pearls.map((pearl, idx) => (
                      <li key={idx}>{pearl}</li>
                    ))}
                  </ul>
                </div>
              )}

              {discussion.teaching_insights.diagnostic_pitfalls && discussion.teaching_insights.diagnostic_pitfalls.length > 0 && (
                <div className="mb-3">
                  <h6 className="font-semibold text-orange-800 mb-1">Diagnostic Pitfalls:</h6>
                  <ul className="list-disc ml-5 space-y-1 text-sm text-orange-900">
                    {discussion.teaching_insights.diagnostic_pitfalls.map((pitfall, idx) => (
                      <li key={idx}>{pitfall}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Final Consensus */}
          {discussion.final_consensus && (
            <div className="mt-4 p-4 bg-indigo-50 border-2 border-indigo-400 rounded-lg">
              <h5 className="font-bold text-indigo-900 mb-2">🏁 Final Panel Consensus</h5>
              <p className="text-sm text-indigo-900 mb-2">
                <strong>Agreed Diagnosis:</strong> {discussion.final_consensus.agreed_diagnosis}
              </p>
              {discussion.final_consensus.confidence_level && (
                <p className="text-sm text-indigo-800 mb-2">
                  <strong>Confidence:</strong> {discussion.final_consensus.confidence_level}
                </p>
              )}
              {discussion.final_consensus.recommended_next_steps && discussion.final_consensus.recommended_next_steps.length > 0 && (
                <div className="mt-2">
                  <strong className="text-sm text-indigo-900">Recommended Next Steps:</strong>
                  <ul className="list-disc ml-5 mt-1 space-y-1 text-sm text-indigo-800">
                    {discussion.final_consensus.recommended_next_steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
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
        <CollapsibleSection title="Evidence & References" icon={Shield} defaultOpen={true}>
          {/* Guidelines with tier badges */}
          {caseData.Evidence_and_References.guidelines && (
            <GuidelinesSection guidelines={caseData.Evidence_and_References.guidelines} />
          )}
          
          {/* Other evidence content */}
          <div className="mt-4">
            {renderContent(caseData.Evidence_and_References)}
          </div>
        </CollapsibleSection>
      )}

      {/* Expert Panel Notes - Conference Style */}
      {caseData.Expert_Panel_and_Teaching && Object.keys(caseData.Expert_Panel_and_Teaching).length > 0 && (
        <CollapsibleSection title="Expert Panel Discussion" icon={Activity} highlight={true} defaultOpen={true}>
          <ConferencePanelDisplay panelData={caseData.Expert_Panel_and_Teaching} />
        </CollapsibleSection>
      )}

      {/* Panel Discussion - Medical Conference Style (Optional, User-Requested) */}
      <PanelDiscussion caseData={caseData} />
    </div>
  );
}
