// Conference Panel Display Component - showcases expert panel, debates, and reference validation
import React, { useState } from 'react';
import { Users, CheckCircle, AlertCircle, ExternalLink, MessageSquare } from 'lucide-react';

export default function ConferencePanel({ caseData }) {
  const [expandedDebate, setExpandedDebate] = useState(null);
  
  if (!caseData?.meta) return null;

  const {
    panel_roles = [],
    reference_validation = null,
    quality_score = 0,
    reviewed_by_internal_panel = false,
    panel_review_timestamp = null
  } = caseData.meta;

  const panel = caseData.Expert_Panel_and_Teaching || caseData.panel_discussion || {};
  
  // Parse panel data if it's a string
  let panelData = panel;
  if (typeof panel === 'string') {
    try {
      panelData = JSON.parse(panel);
    } catch {
      panelData = {};
    }
  }

  const disagreements = panelData?.Disagreements || panelData?.disagreements || [];
  const consensus = panelData?.Final_Consensus || panelData?.consensus;

  // Extract guidelines from evidence section
  const guidelines = Array.isArray(caseData.Evidence_and_References?.guidelines) 
    ? caseData.Evidence_and_References.guidelines 
    : [];

  return (
    <div className="space-y-6 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-indigo-200">
      
      {/* Quality Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-full font-semibold text-sm ${
            quality_score >= 0.95 
              ? 'bg-green-100 text-green-800 border border-green-300'
              : quality_score >= 0.85
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
              : 'bg-gray-100 text-gray-800 border border-gray-300'
          }`}>
            {reviewed_by_internal_panel ? '✅ Expert Panel Reviewed' : '📝 Draft'}
          </div>
          <div className="text-sm text-gray-600">
            Quality Score: <span className="font-bold text-indigo-600">
              {(quality_score * 100).toFixed(1)}%
            </span>
          </div>
        </div>
        {panel_review_timestamp && (
          <div className="text-xs text-gray-500">
            Reviewed: {new Date(panel_review_timestamp).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Panel Composition */}
      {panel_roles.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-800">
              Expert Panel Composition ({panel_roles.length} members)
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {panel_roles.map((role, idx) => (
              <div
                key={idx}
                className="px-3 py-2 bg-white rounded-md shadow-sm border border-indigo-100 text-sm text-gray-700 hover:shadow-md transition-shadow"
              >
                👤 {role}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reference Validation Status */}
      {reference_validation && (
        <div className="bg-white rounded-lg p-4 border border-indigo-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-800">Reference Validation</h3>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {reference_validation.total || 0}
              </div>
              <div className="text-xs text-gray-600">Total Citations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {reference_validation.verified || 0}
              </div>
              <div className="text-xs text-gray-600">✅ Verified</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {reference_validation.fabricated || 0}
              </div>
              <div className="text-xs text-gray-600">⚠️ Fabricated</div>
            </div>
          </div>

          {/* Verified Guidelines */}
          {guidelines.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">📚 Clinical Guidelines:</h4>
              {guidelines.map((guideline, idx) => {
                // Extract URL if present
                const urlMatch = typeof guideline === 'string' 
                  ? guideline.match(/(https?:\/\/[^\s]+)/)
                  : null;
                const guidelineText = typeof guideline === 'string'
                  ? guideline.replace(urlMatch?.[0] || '', '').trim()
                  : JSON.stringify(guideline);
                
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 bg-green-50 rounded border border-green-200 text-sm"
                  >
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-gray-700">{guidelineText}</span>
                      {urlMatch && (
                        <a
                          href={urlMatch[0]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Debate Timeline */}
      {disagreements.length > 0 && (
        <div className="bg-white rounded-lg p-4 border border-amber-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-gray-800">
              Conference Debates ({disagreements.length})
            </h3>
          </div>
          
          <div className="space-y-3">
            {disagreements.map((debate, idx) => {
              const isExpanded = expandedDebate === idx;
              const issue = debate.Issue || debate.issue || debate.topic || `Debate ${idx + 1}`;
              const opinions = debate.Opinions || debate.opinions || [];
              
              return (
                <div
                  key={idx}
                  className="border border-amber-200 rounded-lg overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setExpandedDebate(isExpanded ? null : idx)}
                    className="w-full px-4 py-3 bg-amber-50 hover:bg-amber-100 text-left flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-amber-600 font-bold">🟨 DEBATE {idx + 1}:</span>
                      <span className="font-semibold text-gray-800">{issue}</span>
                    </div>
                    <span className="text-amber-600">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </button>
                  
                  {isExpanded && (
                    <div className="p-4 bg-white space-y-3">
                      {opinions.map((opinion, opIdx) => (
                        <div
                          key={opIdx}
                          className="pl-4 border-l-4 border-indigo-300 py-2"
                        >
                          <div className="font-semibold text-indigo-700 text-sm mb-1">
                            {opinion.Role || opinion.role || `Expert ${opIdx + 1}`}
                          </div>
                          <div className="text-gray-700 text-sm">
                            {opinion.View || opinion.view || opinion.position}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Final Consensus */}
      {consensus && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-600 font-bold">🟩 CONSENSUS</span>
          </div>
          <p className="text-gray-800 leading-relaxed">
            {typeof consensus === 'string' ? consensus : JSON.stringify(consensus)}
          </p>
        </div>
      )}
    </div>
  );
}
