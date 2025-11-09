// ~/medplat/frontend/src/components/ProfessionalCaseDisplay.jsx
// World-class medical case display - Netflix-level UX, UpToDate-level professionalism

import React, { useState } from "react";
import {
  User, Clock, Heart, Activity, Thermometer, Wind, Droplets,
  Stethoscope, TestTube, Brain, Target, Shield, BookOpen,
  AlertTriangle, CheckCircle2, TrendingUp, Award, ExternalLink
} from "lucide-react";

// Conference Panel Discussion Component (Moderator-Led Academic Debate)
function ConferencePanelDisplay({ panelData }) {
  if (!panelData) return null;

  // Extract conference panel structure (professor_v3_dynamic with specialty-based roles)
  const moderatorIntro = panelData?.moderator_intro || '';
  const discussionRounds = panelData?.discussion_rounds || [];
  const pointsOfDebate = panelData?.points_of_debate || [];
  const moderatorSummary = panelData?.moderator_summary || '';
  const panelConsensus = panelData?.panel_consensus || '';
  
  // Detect cross-specialty tension (≥2 disagreements for educational value)
  const disagreementCount = discussionRounds.filter(r => 
    r.stance?.toLowerCase().includes('disagree') || 
    r.counter_to || 
    r.argument?.toLowerCase().includes('disagree') ||
    r.argument?.toLowerCase().includes('however')
  ).length;
  
  const hasCrossSpecialtyTension = disagreementCount >= 2;
  const uniqueSpecialties = new Set(discussionRounds.map(r => r.specialty || r.speaker)).size;

  // Color palette for different speakers (alternating for visual variety)
  const speakerColors = [
    { bg: 'bg-gradient-to-br from-blue-50 to-indigo-50', border: 'border-blue-400', text: 'text-blue-900' },
    { bg: 'bg-gradient-to-br from-purple-50 to-pink-50', border: 'border-purple-400', text: 'text-purple-900' },
    { bg: 'bg-gradient-to-br from-green-50 to-emerald-50', border: 'border-green-400', text: 'text-green-900' },
    { bg: 'bg-gradient-to-br from-orange-50 to-amber-50', border: 'border-orange-400', text: 'text-orange-900' },
    { bg: 'bg-gradient-to-br from-teal-50 to-cyan-50', border: 'border-teal-400', text: 'text-teal-900' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-6 h-6 text-indigo-600" />
        <h4 className="text-xl font-bold text-indigo-900">🎓 Conference Review Panel (Academic Debate)</h4>
      </div>

      {/* Quality Indicators (Cross-Specialty Tension Badge) */}
      {hasCrossSpecialtyTension && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-400 rounded-xl p-4 shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚔️</span>
            <div>
              <h6 className="font-bold text-red-900 text-lg">Cross-Specialty Debate Detected</h6>
              <p className="text-sm text-red-800">
                {disagreementCount} active disagreements across {uniqueSpecialties} specialties — educational depth validated
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Moderator Introduction */}
      {moderatorIntro && (
        <div className="p-5 bg-gradient-to-r from-gray-100 to-slate-100 border-l-4 border-slate-600 rounded-xl shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <User className="w-5 h-5 text-slate-700" />
            <h5 className="text-lg font-bold text-slate-900">Moderator:</h5>
          </div>
          <p className="text-gray-800 leading-relaxed italic">{moderatorIntro}</p>
        </div>
      )}

      {/* Discussion Rounds (Role-Based Speech Bubbles with Cross-Specialty Tension) */}
      {discussionRounds.length > 0 && (
        <div className="space-y-4">
          <h5 className="font-semibold text-gray-900 text-lg">Multidisciplinary Discussion:</h5>
          {discussionRounds.map((round, idx) => {
            const colorScheme = speakerColors[idx % speakerColors.length];
            const isDisagreement = round.stance?.toLowerCase().includes('disagree');
            const isAgreement = round.stance?.toLowerCase().includes('agree') && !isDisagreement;
            const hasRebuttal = round.counter_to || round.argument?.toLowerCase().includes('disagree') || round.argument?.toLowerCase().includes('however');
            
            // Extract role (use specialty field, or parse from speaker)
            const role = round.specialty || round.speaker || 'Specialist';

            return (
              <div key={idx} className={`p-4 ${colorScheme.bg} border-2 ${colorScheme.border} rounded-xl shadow-md hover:shadow-lg transition-all ${hasRebuttal ? 'border-l-4 border-l-red-500' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full ${colorScheme.border.replace('border-', 'bg-')} flex items-center justify-center text-white font-bold text-lg shadow-md`}>
                      {role[0]}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <span className={`text-lg font-bold ${colorScheme.text}`}>
                        {role}
                      </span>
                      {round.stance && (
                        <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                          isDisagreement ? 'bg-red-600 text-white animate-pulse-subtle' : 
                          isAgreement ? 'bg-green-600 text-white' : 
                          'bg-amber-600 text-white'
                        }`}>
                          {round.stance}
                        </span>
                      )}
                    </div>
                    
                    {/* Highlight disagreement phrases */}
                    <p className={`text-gray-800 mb-3 leading-relaxed ${isDisagreement ? 'font-medium' : ''}`}>
                      {round.argument}
                    </p>
                    
                    {/* Counter-argument indicator with red emphasis */}
                    {round.counter_to && (
                      <p className="text-sm text-red-800 font-semibold italic border-l-4 border-red-500 pl-3 mb-2 bg-red-50 py-2 rounded-r">
                        ↩️ Responds to: {round.counter_to}
                      </p>
                    )}
                    
                    {/* Evidence citation with regional context */}
                    {round.evidence_cited && (
                      <p className="text-sm text-indigo-700 italic border-l-2 border-indigo-400 pl-3 mt-2 bg-indigo-50 py-1.5 rounded-r">
                        📚 Evidence: {round.evidence_cited}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Points of Debate (Explicit Clinical Controversies) */}
      {pointsOfDebate.length > 0 && (
        <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-600 rounded-xl shadow-md">
          <h5 className="text-lg font-bold text-amber-900 mb-3">⚖️ Key Points of Debate:</h5>
          {pointsOfDebate.map((debate, idx) => (
            <div key={idx} className="mb-4 last:mb-0 bg-white rounded-lg p-4">
              <p className="font-bold text-amber-900 mb-2">{debate.issue}</p>
              <div className="ml-4 space-y-2">
                <p className="text-gray-800 border-l-2 border-green-400 pl-3">
                  <span className="font-semibold text-green-700">Position A:</span> {debate.position_a || debate.viewpoint_a}
                </p>
                <p className="text-gray-800 border-l-2 border-red-400 pl-3">
                  <span className="font-semibold text-red-700">Position B:</span> {debate.position_b || debate.viewpoint_b}
                </p>
                {debate.clinical_impact && (
                  <p className="text-sm text-gray-700 italic mt-2 border-t pt-2">
                    🎯 Clinical Impact: {debate.clinical_impact}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Moderator Summary (Synthesis of Debate) */}
      {moderatorSummary && (
        <div className="p-5 bg-gradient-to-r from-slate-100 to-gray-100 border-l-4 border-slate-600 rounded-xl shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <User className="w-5 h-5 text-slate-700" />
            <h5 className="text-lg font-bold text-slate-900">Moderator Summary:</h5>
          </div>
          <p className="text-gray-800 leading-relaxed">{moderatorSummary}</p>
        </div>
      )}

      {/* Panel Consensus (Final Unified Recommendation) */}
      {panelConsensus && (
        <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500 rounded-xl shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 className="w-7 h-7 text-green-600" />
            <h5 className="text-xl font-bold text-green-900">Panel Consensus:</h5>
          </div>
          <p className="text-lg text-gray-900 leading-relaxed font-medium">{panelConsensus}</p>
        </div>
      )}
    </div>
  );
}


// Classification Badge Component (Stanford Type A/B, NYHA, Killip, TOAST, etc.)
function ClassificationBadge({ classification }) {
  if (!classification) return null;

  // Extract classification type and severity
  const getClassificationStyle = (text) => {
    const lower = text.toLowerCase();
    
    // Stanford Classification (Aortic Dissection)
    if (lower.includes('stanford type a') || lower.includes('type a')) {
      return { bg: 'bg-gradient-to-r from-red-600 to-red-700', text: 'Stanford Type A', icon: '🚨', severity: 'CRITICAL' };
    }
    if (lower.includes('stanford type b') || lower.includes('type b')) {
      return { bg: 'bg-gradient-to-r from-orange-500 to-orange-600', text: 'Stanford Type B', icon: '⚠️', severity: 'HIGH' };
    }
    
    // NYHA Classification (Heart Failure)
    if (lower.includes('nyha iv') || lower.includes('class iv')) {
      return { bg: 'bg-gradient-to-r from-red-600 to-red-700', text: 'NYHA Class IV', icon: '🫀', severity: 'SEVERE' };
    }
    if (lower.includes('nyha iii') || lower.includes('class iii')) {
      return { bg: 'bg-gradient-to-r from-orange-500 to-orange-600', text: 'NYHA Class III', icon: '🫀', severity: 'MODERATE-SEVERE' };
    }
    if (lower.includes('nyha ii') || lower.includes('class ii')) {
      return { bg: 'bg-gradient-to-r from-yellow-500 to-yellow-600', text: 'NYHA Class II', icon: '🫀', severity: 'MILD' };
    }
    if (lower.includes('nyha i') || lower.includes('class i')) {
      return { bg: 'bg-gradient-to-r from-green-500 to-green-600', text: 'NYHA Class I', icon: '🫀', severity: 'MINIMAL' };
    }
    
    // Killip Classification (MI/Cardiogenic Shock)
    if (lower.includes('killip iv')) {
      return { bg: 'bg-gradient-to-r from-purple-700 to-purple-800', text: 'Killip Class IV', icon: '💔', severity: 'CARDIOGENIC SHOCK' };
    }
    if (lower.includes('killip iii')) {
      return { bg: 'bg-gradient-to-r from-red-600 to-red-700', text: 'Killip Class III', icon: '💔', severity: 'PULMONARY EDEMA' };
    }
    
    // TOAST Classification (Stroke)
    if (lower.includes('toast')) {
      return { bg: 'bg-gradient-to-r from-blue-600 to-indigo-700', text: text.slice(0, 50), icon: '🧠', severity: 'STROKE TYPE' };
    }
    
    // Hunt-Hess (Subarachnoid Hemorrhage)
    if (lower.includes('hunt') && lower.includes('hess')) {
      const grade = lower.match(/grade ([ivx]+)/)?.[1] || '';
      const severity = grade.includes('v') || grade.includes('iv') ? 'CRITICAL' : 'HIGH';
      const color = severity === 'CRITICAL' ? 'from-red-700 to-red-800' : 'from-orange-600 to-orange-700';
      return { bg: `bg-gradient-to-r ${color}`, text: text.slice(0, 50), icon: '🩸', severity };
    }
    
    // Child-Pugh (Cirrhosis)
    if (lower.includes('child') && (lower.includes('pugh') || lower.includes('class'))) {
      if (lower.includes('class c')) {
        return { bg: 'bg-gradient-to-r from-red-600 to-red-700', text: 'Child-Pugh C', icon: '🫀', severity: 'SEVERE' };
      }
      if (lower.includes('class b')) {
        return { bg: 'bg-gradient-to-r from-orange-500 to-orange-600', text: 'Child-Pugh B', icon: '🫀', severity: 'MODERATE' };
      }
      if (lower.includes('class a')) {
        return { bg: 'bg-gradient-to-r from-green-500 to-green-600', text: 'Child-Pugh A', icon: '🫀', severity: 'MILD' };
      }
    }
    
    // GOLD (COPD)
    if (lower.includes('gold')) {
      const grade = lower.match(/gold ([1-4]|[ivx]+)/i)?.[1] || '';
      if (grade === '4' || grade.toLowerCase() === 'iv') {
        return { bg: 'bg-gradient-to-r from-red-600 to-red-700', text: 'GOLD Stage 4', icon: '🫁', severity: 'VERY SEVERE' };
      }
      if (grade === '3' || grade.toLowerCase() === 'iii') {
        return { bg: 'bg-gradient-to-r from-orange-500 to-orange-600', text: 'GOLD Stage 3', icon: '🫁', severity: 'SEVERE' };
      }
    }
    
    // Default
    return { bg: 'bg-gradient-to-r from-blue-600 to-indigo-700', text: text.slice(0, 60), icon: '📋', severity: 'CLASSIFIED' };
  };

  const style = getClassificationStyle(classification);

  return (
    <div className={`${style.bg} text-white px-6 py-3 rounded-lg shadow-xl inline-flex items-center gap-3 animate-fade-in`}>
      <span className="text-2xl">{style.icon}</span>
      <div>
        <div className="text-xs font-bold uppercase tracking-wider opacity-90">{style.severity}</div>
        <div className="text-lg font-bold">{style.text}</div>
      </div>
    </div>
  );
}

// Vital Signs Card with Icons and Abnormal Value Flagging
function VitalSignsCard({ vitals, objectiveFindings }) {
  const [signs, setSigns] = useState(null);

  React.useEffect(() => {
    // Extract vital signs from text or structured data
    const extractedSigns = {};
    
    if (vitals && typeof vitals === 'object') {
      extractedSigns.bp = vitals.BP || vitals.blood_pressure || vitals['Blood Pressure'];
      extractedSigns.hr = vitals.HR || vitals.heart_rate || vitals['Heart Rate'];
      extractedSigns.rr = vitals.RR || vitals.respiratory_rate || vitals['Respiratory Rate'];
      extractedSigns.temp = vitals.Temperature || vitals.Temp || vitals.temperature;
      extractedSigns.spo2 = vitals.SpO2 || vitals.O2 || vitals.oxygen_saturation;
    } else {
      // Parse from text
      const text = (vitals || objectiveFindings || '').toString();
      
      const bpMatch = text.match(/BP[:\s]+(\d{2,3}\/\d{2,3})/i) || text.match(/blood pressure[:\s]+(\d{2,3}\/\d{2,3})/i);
      if (bpMatch) extractedSigns.bp = bpMatch[1];
      
      const hrMatch = text.match(/HR[:\s]+(\d{2,3})/i) || text.match(/heart rate[:\s]+(\d{2,3})/i);
      if (hrMatch) extractedSigns.hr = hrMatch[1];
      
      const rrMatch = text.match(/RR[:\s]+(\d{1,2})/i) || text.match(/respiratory rate[:\s]+(\d{1,2})/i);
      if (rrMatch) extractedSigns.rr = rrMatch[1];
      
      const tempMatch = text.match(/temp[erature]*[:\s]+([\d.]+)/i);
      if (tempMatch) extractedSigns.temp = tempMatch[1];
      
      const spo2Match = text.match(/SpO2[:\s]+(\d{2,3})/i) || text.match(/O2[:\s]+(\d{2,3})/i);
      if (spo2Match) extractedSigns.spo2 = spo2Match[1];
    }
    
    setSigns(extractedSigns);
  }, [vitals, objectiveFindings]);

  if (!signs || Object.keys(signs).filter(k => signs[k]).length === 0) return null;

  const isAbnormal = (key, value) => {
    if (!value) return false;
    const numVal = parseFloat(value);
    
    switch(key) {
      case 'hr':
        return numVal < 60 || numVal > 100;
      case 'rr':
        return numVal < 12 || numVal > 20;
      case 'temp':
        return numVal < 36.1 || numVal > 37.2;
      case 'spo2':
        return numVal < 95;
      case 'bp':
        const [sys, dia] = value.split('/').map(v => parseInt(v));
        return sys > 140 || sys < 90 || dia > 90 || dia < 60;
      default:
        return false;
    }
  };

  const vitalConfig = {
    bp: { icon: Heart, label: 'Blood Pressure', unit: 'mmHg', color: 'text-red-600' },
    hr: { icon: Activity, label: 'Heart Rate', unit: 'bpm', color: 'text-pink-600' },
    rr: { icon: Wind, label: 'Respiratory Rate', unit: '/min', color: 'text-blue-600' },
    temp: { icon: Thermometer, label: 'Temperature', unit: '°C', color: 'text-orange-600' },
    spo2: { icon: Droplets, label: 'SpO2', unit: '%', color: 'text-cyan-600' }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      {Object.entries(signs).filter(([_, v]) => v).map(([key, value]) => {
        const config = vitalConfig[key];
        if (!config) return null;
        
        const abnormal = isAbnormal(key, value);
        const Icon = config.icon;
        
        return (
          <div 
            key={key}
            className={`p-4 rounded-lg border-2 transition-all duration-200 ${
              abnormal 
                ? 'bg-red-50 border-red-400 shadow-lg' 
                : 'bg-white border-gray-200 hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-5 h-5 ${abnormal ? 'text-red-600' : config.color}`} />
              {abnormal && <AlertTriangle className="w-4 h-4 text-red-600" />}
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-600 mt-1">
              {config.label}
              {abnormal && <span className="ml-1 text-red-600 font-semibold">⚠️ Abnormal</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Professional Section Card
function SectionCard({ title, icon: Icon, children, highlight = false, defaultOpen = true, badge = null }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`mb-4 rounded-xl border-2 transition-all duration-300 ${
      highlight 
        ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg' 
        : 'border-gray-200 bg-white shadow-md hover:shadow-lg'
    }`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-6 py-4 flex items-center justify-between rounded-t-xl transition-all ${
          highlight 
            ? 'bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200' 
            : 'bg-gray-50 hover:bg-gray-100'
        }`}
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className={`w-6 h-6 ${highlight ? 'text-blue-700' : 'text-gray-700'}`} />}
          <h3 className={`text-xl font-bold ${highlight ? 'text-blue-900' : 'text-gray-900'}`}>
            {title}
          </h3>
          {badge && <span className="ml-2">{badge}</span>}
        </div>
        <div className="flex items-center gap-2">
          {isOpen ? (
            <span className="text-sm font-semibold text-gray-600">▼ Collapse</span>
          ) : (
            <span className="text-sm font-semibold text-gray-600">▶ Expand</span>
          )}
        </div>
      </button>
      {isOpen && (
        <div className="px-6 py-5 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

// Recursive Content Renderer with Enhanced Formatting
function renderContent(value, level = 0) {
  if (value == null || value === "") return <i className="text-gray-400">Not specified</i>;

  if (Array.isArray(value)) {
    return (
      <ul className="list-disc ml-6 space-y-2">
        {value.map((item, idx) => (
          <li key={idx} className="text-gray-800 leading-relaxed">{renderContent(item, level + 1)}</li>
        ))}
      </ul>
    );
  }

  if (typeof value === "object") {
    return (
      <div className="space-y-3">
        {Object.entries(value).map(([k, v], idx) => (
          <div key={idx} className="border-l-4 border-blue-300 pl-4 py-1">
            <strong className="text-blue-900 font-semibold">{k.replace(/_/g, " ")}:</strong>{" "}
            <span className="text-gray-800">{renderContent(v, level + 1)}</span>
          </div>
        ))}
      </div>
    );
  }

  return <span className="text-gray-800 leading-relaxed">{String(value)}</span>;
}

// Main Professional Case Display Component
export default function ProfessionalCaseDisplay({ caseData }) {
  if (!caseData) return null;

  const pathophysiology = caseData.Pathophysiology || caseData.pathophysiology;
  const classification = pathophysiology?.classification;

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 text-white rounded-2xl shadow-2xl p-8 animate-fade-in">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-4">{caseData.Topic}</h1>
            
            {/* Patient Demographics */}
            <div className="flex flex-wrap gap-4 text-lg mb-4">
              {caseData.meta?.age && (
                <div className="flex items-center gap-2 bg-white bg-opacity-20 rounded-lg px-4 py-2">
                  <User className="w-5 h-5" />
                  <span>{caseData.meta.age} years</span>
                </div>
              )}
              {caseData.meta?.sex && (
                <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2">
                  {caseData.meta.sex}
                </div>
              )}
              {caseData.meta?.region && (
                <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2">
                  📍 {caseData.meta.region}
                </div>
              )}
            </div>

            {/* Quality Badge */}
            {caseData.meta?.reviewed_by_internal_panel && (
              <div className="inline-flex items-center gap-2 bg-green-500 text-white rounded-full px-5 py-2 shadow-lg">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">✅ Expert-Validated (Quality ≥95%)</span>
              </div>
            )}
          </div>

          {/* Classification Badge */}
          {classification && (
            <div className="ml-4">
              <ClassificationBadge classification={classification} />
            </div>
          )}
        </div>
      </div>

      {/* Chief Complaint */}
      {caseData.Chief_Complaint && (
        <SectionCard title="Chief Complaint" icon={AlertTriangle} defaultOpen={true} highlight={true}>
          <div className="text-lg font-medium text-gray-900 bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
            "{renderContent(caseData.Chief_Complaint)}"
          </div>
        </SectionCard>
      )}

      {/* Timeline */}
      {caseData.Timeline && (
        <SectionCard title="Timeline & Onset" icon={Clock} defaultOpen={true}>
          <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
            {renderContent(caseData.Timeline)}
          </div>
        </SectionCard>
      )}

      {/* Patient History */}
      <SectionCard title="Patient History" icon={BookOpen} defaultOpen={true}>
        {renderContent(caseData.History_Full || caseData.Patient_History)}
      </SectionCard>

      {/* Physical Examination with Vital Signs */}
      <SectionCard title="Physical Examination" icon={Stethoscope} defaultOpen={true}>
        <VitalSignsCard 
          vitals={caseData.Vitals} 
          objectiveFindings={caseData.Objective_Findings || caseData.Exam_Full} 
        />
        {renderContent(caseData.Exam_Full || caseData.Objective_Findings)}
      </SectionCard>

      {/* Paraclinical Investigations */}
      <SectionCard title="Paraclinical Investigations" icon={TestTube} defaultOpen={true}>
        {renderContent(caseData.Paraclinical_Investigations)}
      </SectionCard>

      {/* Differential Diagnoses */}
      <SectionCard title="Differential Diagnoses" icon={Brain} defaultOpen={true}>
        {Array.isArray(caseData.Differential_Diagnoses) ? (
          <div className="space-y-3">
            {caseData.Differential_Diagnoses.map((diff, idx) => (
              <div 
                key={idx} 
                className={`p-4 rounded-lg border-l-4 ${
                  diff.status === 'ACCEPTED' ? 'bg-green-50 border-green-500' :
                  diff.status === 'REJECTED' ? 'bg-red-50 border-red-500' :
                  'bg-gray-50 border-gray-400'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-bold text-gray-900">{diff.name || diff}</h4>
                  {diff.status && (
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      diff.status === 'ACCEPTED' ? 'bg-green-200 text-green-900' :
                      diff.status === 'REJECTED' ? 'bg-red-200 text-red-900' :
                      'bg-yellow-200 text-yellow-900'
                    }`}>
                      {diff.status}
                    </span>
                  )}
                </div>
                {diff.why_for && (
                  <p className="text-sm text-green-700 mb-1">
                    <strong>✓ Supporting:</strong> {diff.why_for}
                  </p>
                )}
                {diff.why_against && (
                  <p className="text-sm text-red-700">
                    <strong>✗ Against:</strong> {diff.why_against}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : renderContent(caseData.Differential_Diagnoses)}
      </SectionCard>

      {/* Red Flags */}
      {caseData.Red_Flags && caseData.Red_Flags.length > 0 && (
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl shadow-2xl p-6 animate-pulse-subtle">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-8 h-8" />
            <h3 className="text-2xl font-bold">🚨 RED FLAGS - Immediate Actions Required</h3>
          </div>
          <ul className="space-y-3">
            {caseData.Red_Flags.map((flag, idx) => (
              <li key={idx} className="bg-white text-red-900 rounded-lg p-4 font-semibold border-l-4 border-red-800">
                {typeof flag === 'string' ? flag : (
                  <div>
                    <div className="font-bold text-lg">{flag.flag || flag.name}</div>
                    {flag.significance && <p className="text-sm text-red-700 mt-1">{flag.significance}</p>}
                    {flag.action_needed && <p className="text-sm font-bold text-red-800 mt-2">→ {flag.action_needed}</p>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pathophysiology with Classification Highlight */}
      {pathophysiology && Object.keys(pathophysiology).length > 0 && (
        <SectionCard 
          title="Pathophysiology" 
          icon={TrendingUp} 
          defaultOpen={true}
          badge={classification && <ClassificationBadge classification={classification} />}
        >
          <div className="space-y-4">
            {pathophysiology.classification && (
              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-300">
                <h4 className="font-bold text-blue-900 mb-2">Classification:</h4>
                <p className="text-lg text-blue-800 font-semibold">{pathophysiology.classification}</p>
              </div>
            )}
            {pathophysiology.molecular_mechanism && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Molecular Mechanism:</h4>
                <p className="text-gray-800">{pathophysiology.molecular_mechanism}</p>
              </div>
            )}
            {pathophysiology.cellular_dysfunction && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Cellular Dysfunction:</h4>
                <p className="text-gray-800">{pathophysiology.cellular_dysfunction}</p>
              </div>
            )}
            {pathophysiology.organ_system_effects && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Organ System Effects:</h4>
                <p className="text-gray-800">{pathophysiology.organ_system_effects}</p>
              </div>
            )}
            {pathophysiology.clinical_manifestations && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Clinical Manifestations:</h4>
                <p className="text-gray-800">{pathophysiology.clinical_manifestations}</p>
              </div>
            )}
            {pathophysiology.hemodynamic_structural_consequences && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Hemodynamic/Structural Consequences:</h4>
                <p className="text-gray-800">{pathophysiology.hemodynamic_structural_consequences}</p>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* Final Diagnosis */}
      <SectionCard title="Final Diagnosis" icon={Target} defaultOpen={true} highlight={true}>
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border-2 border-green-400">
          <div className="flex items-center gap-3 mb-3">
            <Award className="w-8 h-8 text-green-700" />
            <h3 className="text-2xl font-bold text-green-900">
              {caseData.Final_Diagnosis?.Diagnosis}
            </h3>
          </div>
          {caseData.Final_Diagnosis?.Rationale && (
            <p className="text-gray-800 leading-relaxed">{caseData.Final_Diagnosis.Rationale}</p>
          )}
        </div>
      </SectionCard>

      {/* Management */}
      <SectionCard title="Management" icon={Shield} defaultOpen={true} highlight={true}>
        {renderContent(caseData.Management_Full || caseData.Management)}
      </SectionCard>

      {/* Conference Panel Discussion (Dynamic Academic Debate) */}
      {(caseData.panel_discussion || caseData.Expert_Panel_and_Teaching) && (
        <SectionCard 
          title="Conference Review Panel" 
          icon={Activity} 
          defaultOpen={true}
          highlight={true}
        >
          <ConferencePanelDisplay 
            panelData={caseData.panel_discussion || caseData.Expert_Panel_and_Teaching} 
          />
        </SectionCard>
      )}

      {/* Evidence & References */}
      {caseData.Evidence_and_References && (
        <SectionCard title="Evidence & Clinical Guidelines" icon={BookOpen}>
          {renderContent(caseData.Evidence_and_References)}
        </SectionCard>
      )}
    </div>
  );
}
