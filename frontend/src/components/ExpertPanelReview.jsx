// ~/medplat/frontend/src/components/ExpertPanelReview.jsx
import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Users, AlertCircle, CheckCircle } from "lucide-react";
import { API_BASE } from "../config";

export default function ExpertPanelReview({ caseData }) {
  const [loading, setLoading] = useState(false);
  const [panelData, setPanelData] = useState(null);
  const [error, setError] = useState(null);
  const [expandedReviewers, setExpandedReviewers] = useState({});

  // External panel is MANUAL ONLY - no auto-load
  // This component is for developers to manually request external panel review
  // (Internal panel review happens automatically on backend - invisible to users)

  const parseAndSetReview = (reviewText) => {
    let parsedReview = reviewText;
    if (typeof parsedReview === 'string') {
      try {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = parsedReview.match(/```json\s*([\s\S]*?)\s*```/) || 
                         parsedReview.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          parsedReview = JSON.parse(jsonMatch[1]);
        } else {
          parsedReview = JSON.parse(parsedReview);
        }
      } catch (e) {
        // If not valid JSON, display as text
        parsedReview = { rawReview: parsedReview };
      }
    }
    setPanelData(parsedReview);
  };

  const fetchPanelReview = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/expert-panel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          topic: caseData?.Topic || caseData?.meta?.topic || "Unknown",
          language: caseData?.meta?.language || "en",
          region: caseData?.meta?.region || "EU/DK",
          caseData 
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Panel review failed");
      }

      parseAndSetReview(data.review || data.parsed || data);
    } catch (err) {
      setError(err.message || "Failed to fetch panel review");
      console.error("Panel review error:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleReviewer = (index) => {
    setExpandedReviewers((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const getSeverityColor = (severity) => {
    if (severity >= 8) return "text-red-600 bg-red-50";
    if (severity >= 5) return "text-orange-600 bg-orange-50";
    return "text-green-600 bg-green-50";
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return "text-green-600";
    if (confidence >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  if (!caseData) {
    return (
      <div className="p-4 bg-gray-50 rounded border border-gray-200">
        <p className="text-gray-500">Generate a case first to request expert panel review</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Request Panel Review Button */}
      {!panelData && (
        <button
          onClick={fetchPanelReview}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Users size={20} />
          {loading ? "Requesting Expert Panel Review..." : "Request Expert Panel Review"}
        </button>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <div>
              <p className="font-semibold text-blue-900">Consulting Expert Panel...</p>
              <p className="text-sm text-blue-700">
                12 senior clinicians are reviewing your case (this may take 30-60 seconds)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle size={20} />
            <p className="font-semibold">Review Request Failed</p>
          </div>
          <p className="text-sm text-red-700 mt-1">{error}</p>
          <button
            onClick={fetchPanelReview}
            className="mt-3 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Panel Review Results */}
      {panelData && (
        <div className="space-y-4">
          {/* Global Consensus */}
          {panelData.consensus && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="text-blue-600" size={24} />
                <h3 className="text-lg font-bold text-blue-900">Global Consensus</h3>
              </div>
              <p className="text-gray-800 mb-3">{panelData.consensus.summary}</p>
              
              {panelData.consensus.recommended_actions && panelData.consensus.recommended_actions.length > 0 && (
                <div className="mt-3">
                  <p className="font-semibold text-sm text-gray-700 mb-2">Recommended Actions:</p>
                  <ul className="list-disc ml-5 space-y-1 text-sm text-gray-700">
                    {panelData.consensus.recommended_actions.map((action, idx) => (
                      <li key={idx}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {panelData.consensus.overall_confidence != null && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">Consensus Confidence:</span>
                  <span className={`font-bold ${getConfidenceColor(panelData.consensus.overall_confidence)}`}>
                    {panelData.consensus.overall_confidence}%
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Individual Reviewer Cards */}
          {panelData.reviewers && panelData.reviewers.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Users size={20} />
                Expert Panel Reviews ({panelData.reviewers.length})
              </h3>
              
              {panelData.reviewers.map((reviewer, index) => {
                const isExpanded = expandedReviewers[index];
                const severity = reviewer.severity || 0;
                const confidence = reviewer.confidence || 0;

                return (
                  <div
                    key={index}
                    className="border rounded-lg shadow-sm bg-white overflow-hidden"
                  >
                    {/* Reviewer Header */}
                    <button
                      onClick={() => toggleReviewer(index)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getSeverityColor(severity)}`}></div>
                        <span className="font-semibold text-gray-800">{reviewer.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">
                          Confidence: <span className={`font-semibold ${getConfidenceColor(confidence)}`}>{confidence}%</span>
                        </span>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </button>

                    {/* Reviewer Details (Collapsible) */}
                    {isExpanded && (
                      <div className="px-4 py-3 bg-gray-50 border-t space-y-3">
                        {reviewer.concise_comment && (
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">Comment:</p>
                            <p className="text-sm text-gray-800">{reviewer.concise_comment}</p>
                          </div>
                        )}

                        {reviewer.issues && reviewer.issues.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">Issues Identified:</p>
                            <ul className="list-disc ml-5 space-y-1 text-sm text-gray-700">
                              {reviewer.issues.map((issue, idx) => (
                                <li key={idx}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Severity:</span>
                            <span className={`px-2 py-1 rounded font-semibold ${getSeverityColor(severity)}`}>
                              {severity}/10
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Schema Issues (if any) */}
          {panelData.schema_issues && panelData.schema_issues.length > 0 && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="font-semibold text-yellow-900 mb-2">Schema Issues Detected:</p>
              <ul className="list-disc ml-5 space-y-1 text-sm text-yellow-800">
                {panelData.schema_issues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Raw Review Display (fallback for text-only responses) */}
          {panelData.rawReview && (
            <div className="p-4 bg-gray-100 rounded-lg border border-gray-300">
              <h3 className="font-bold text-gray-800 mb-3">Expert Panel Review:</h3>
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                {panelData.rawReview}
              </pre>
            </div>
          )}

          {/* Reset Button */}
          <button
            onClick={() => {
              setPanelData(null);
              setExpandedReviewers({});
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-sm"
          >
            Request New Review
          </button>
        </div>
      )}
    </div>
  );
}
