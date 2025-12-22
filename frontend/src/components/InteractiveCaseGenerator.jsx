// Interactive Multi-Step Case Generator
// Uses new /api/case endpoints for modular case generation

import React, { useState } from 'react';
import { API_BASE } from '../config.js';
import { safeRender } from '../utils/safeRender';

export default function InteractiveCaseGenerator() {
  const [caseId, setCaseId] = useState(null);
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userQuestion, setUserQuestion] = useState('');
  const [questionAnswer, setQuestionAnswer] = useState(null);

  const slugifyTopic = (value) => {
    if (typeof value !== 'string') return 'case';
    const slug = value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return slug || 'case';
  };

  const buildCaseContextPayload = () => {
    if (caseData?.case_context && typeof caseData.case_context === 'object') {
      return caseData.case_context;
    }

    const meta = caseData?.meta || {};
    const topic = meta.topic || caseData?.topic || '';
    const paraclinical =
      caseData?.paraclinical && typeof caseData.paraclinical === 'object'
        ? caseData.paraclinical
        : { labs: '', imaging: '' };

    return {
      topic_slug: slugifyTopic(topic),
      final_diagnosis: caseData?.final_diagnosis || '',
      demographics: {
        topic,
        category: meta.category || caseData?.category || '',
        age: meta.age || '',
        sex: meta.sex || '',
        setting: meta.setting || '',
      },
      history: caseData?.history || '',
      exam: caseData?.physical_exam || '',
      paraclinical: {
        labs: paraclinical.labs || '',
        imaging: paraclinical.imaging || '',
      },
      risk: caseData?.risk || '',
      stability: caseData?.stability || '',
    };
  };

  const getExpandPayload = (endpoint) => ({
    caseId,
    case_id: caseId,
    requested_section: endpoint,
    full_case_context: buildCaseContextPayload(),
  });

  // Initialize case
  const handleInit = async () => {
    const topic = prompt('Enter case topic:');
    const category = prompt('Enter category (optional):') || 'General Practice';
    
    if (!topic) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/case/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, category }),
      });

      const data = await response.json();
      // Support both new format (success + data) and old format (ok + case)
      const isSuccess = data.success || data.ok;
      if (isSuccess) {
        setCaseId(data.caseId || data.data?.caseId);
        setCaseData(data.data || data.case);
      } else {
        setError(data.error || 'Failed to initialize case');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate history
  const handleGenerateHistory = async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/case/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId }),
      });

      const data = await response.json();
      // Support both new format (success + data) and old format (ok + case)
      const isSuccess = data.success || data.ok;
      if (isSuccess) {
        setCaseData(data.data || data.case || caseData);
      } else {
        setError(data.error || 'Failed to generate history');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate exam
  const handleGenerateExam = async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/case/exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId }),
      });

      const data = await response.json();
      if (data.ok) {
        setCaseData(data.case);
      } else {
        setError(data.error || 'Failed to generate exam');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate paraclinical
  const handleGenerateParaclinical = async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/case/paraclinical`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId }),
      });

      const data = await response.json();
      if (data.ok) {
        setCaseData(data.case);
      } else {
        setError(data.error || 'Failed to generate paraclinical');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Expand pathophysiology
  const handleExpandPathophysiology = async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/case/expand/pathophysiology`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...getExpandPayload('pathophysiology') }),
      });

      const data = await response.json();
      if (data.ok) {
        setCaseData(data.case);
      } else {
        setError(data.error || 'Failed to generate pathophysiology');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Expand management
  const handleExpandManagement = async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/case/expand/management`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...getExpandPayload('management') }),
      });

      const data = await response.json();
      if (data.ok) {
        setCaseData(data.case);
      } else {
        setError(data.error || 'Failed to generate management');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Expand expert panel
  const handleExpandExpertPanel = async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/case/expand/expert_panel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...getExpandPayload('expert_panel') }),
      });

      const data = await response.json();
      if (data.ok) {
        setCaseData(data.case);
      } else {
        setError(data.error || 'Failed to generate expert conference');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Ask focused question
  const handleAskQuestion = async () => {
    if (!caseId || !userQuestion.trim()) return;
    setLoading(true);
    setError(null);
    setQuestionAnswer(null);
    try {
      const response = await fetch(`${API_BASE}/api/case/expand/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...getExpandPayload('question'), userQuestion }),
      });

      const data = await response.json();
      // Support both new format (success + data) and old format (ok + answer)
      const isSuccess = data.success || data.ok;
      if (isSuccess) {
        setQuestionAnswer(data.data?.answer || data.answer);
        setUserQuestion('');
      } else {
        setError(data.error || 'Failed to answer question');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="interactive-case-generator" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>Interactive Case Generator</h2>
      
      {error && (
        <div style={{ padding: '10px', background: '#fee', color: '#c00', marginBottom: '20px', borderRadius: '4px' }}>
          Error: {error}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleInit} 
          disabled={loading}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {caseId ? '🔄 Reinitialize Case' : '🚀 Initialize Case'}
        </button>
      </div>

      {caseId && (
        <div style={{ marginBottom: '20px', padding: '10px', background: '#f0f0f0', borderRadius: '4px' }}>
          <strong>Case ID:</strong> {caseId}
        </div>
      )}

      {caseId && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '20px' }}>
          <button onClick={handleGenerateHistory} disabled={loading} style={{ padding: '10px', cursor: loading ? 'not-allowed' : 'pointer' }}>
            📝 Generate History
          </button>
          <button onClick={handleGenerateExam} disabled={loading} style={{ padding: '10px', cursor: loading ? 'not-allowed' : 'pointer' }}>
            🩺 Generate Exam
          </button>
          <button onClick={handleGenerateParaclinical} disabled={loading} style={{ padding: '10px', cursor: loading ? 'not-allowed' : 'pointer' }}>
            🔬 Generate Labs/Imaging
          </button>
          <button onClick={handleExpandPathophysiology} disabled={loading} style={{ padding: '10px', cursor: loading ? 'not-allowed' : 'pointer' }}>
            🧬 Show Pathophysiology
          </button>
          <button onClick={handleExpandManagement} disabled={loading} style={{ padding: '10px', cursor: loading ? 'not-allowed' : 'pointer' }}>
            💊 Show Management
          </button>
          <button onClick={handleExpandExpertPanel} disabled={loading} style={{ padding: '10px', cursor: loading ? 'not-allowed' : 'pointer' }}>
            👥 Show Expert Conference Discussion
          </button>
        </div>
      )}

      {caseId && (
        <div style={{ marginBottom: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '4px' }}>
          <h3>Ask Focused Question</h3>
          <textarea
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
            placeholder="e.g., 'CT vs MRI sensitivity for this case?' or 'What is CTA sensitivity?'"
            style={{ width: '100%', minHeight: '80px', padding: '10px', marginBottom: '10px', fontSize: '14px' }}
          />
          <button 
            onClick={handleAskQuestion} 
            disabled={loading || !userQuestion.trim()}
            style={{ padding: '10px 20px', cursor: (loading || !userQuestion.trim()) ? 'not-allowed' : 'pointer' }}
          >
            ❓ Ask Question
          </button>
          {questionAnswer && (
            <div style={{ marginTop: '15px', padding: '10px', background: '#e8f5e9', borderRadius: '4px' }}>
              <strong>Answer:</strong>
              <p style={{ marginTop: '5px' }}>{questionAnswer}</p>
            </div>
          )}
        </div>
      )}

      {caseData && (
        <div style={{ marginTop: '30px' }}>
          <h3>Case Data</h3>
          
          {/* Display Expert Conference if available */}
          {caseData.expertConference && (
            <div style={{ marginBottom: '20px', padding: '15px', background: '#f0f7ff', border: '1px solid #4a90e2', borderRadius: '4px' }}>
              <h4 style={{ marginTop: 0, color: '#2c5aa0' }}>👥 Expert Conference Discussion</h4>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#333' }}>
                {caseData.expertConference}
              </div>
            </div>
          )}
          
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '4px', padding: '15px', maxHeight: '600px', overflow: 'auto' }}>
            <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {safeRender(JSON.stringify(caseData, null, 2))}
            </pre>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div>Loading...</div>
        </div>
      )}
    </div>
  );
}
