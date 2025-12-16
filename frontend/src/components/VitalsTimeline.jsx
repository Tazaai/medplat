// frontend/src/components/VitalsTimeline.jsx
// Enhanced Vitals Timeline - Text-Based Visualizations

import React from 'react';

// Helper function to determine if vital is normal/abnormal
function getVitalStatus(value, type) {
  if (!value) return { status: 'unknown', color: 'gray' };
  
  // Parse numeric values
  const num = parseFloat(value);
  if (isNaN(num)) return { status: 'unknown', color: 'gray' };
  
  switch (type) {
    case 'hr':
      if (num < 60) return { status: 'low', color: 'blue' };
      if (num > 100) return { status: 'high', color: 'red' };
      return { status: 'normal', color: 'green' };
    case 'bp_sys':
      if (num < 90) return { status: 'low', color: 'red' };
      if (num > 140) return { status: 'high', color: 'orange' };
      return { status: 'normal', color: 'green' };
    case 'temp':
      if (num < 36.0) return { status: 'low', color: 'blue' };
      if (num > 38.0) return { status: 'high', color: 'red' };
      return { status: 'normal', color: 'green' };
    case 'spo2':
      if (num < 95) return { status: 'low', color: 'red' };
      return { status: 'normal', color: 'green' };
    case 'rr':
      if (num < 12) return { status: 'low', color: 'blue' };
      if (num > 20) return { status: 'high', color: 'orange' };
      return { status: 'normal', color: 'green' };
    default:
      return { status: 'normal', color: 'gray' };
  }
}

// Text-based bar visualization
function renderTextBar(value, type, label) {
  const status = getVitalStatus(value, type);
  const num = parseFloat(value) || 0;
  
  // Create visual bar using text characters
  let barLength = 0;
  if (type === 'hr') barLength = Math.min(30, Math.max(0, (num - 40) / 2));
  else if (type === 'bp_sys') barLength = Math.min(30, Math.max(0, (num - 60) / 3));
  else if (type === 'temp') barLength = Math.min(30, Math.max(0, (num - 35) * 10));
  else if (type === 'spo2') barLength = Math.min(30, Math.max(0, (num - 85) * 3));
  else if (type === 'rr') barLength = Math.min(30, Math.max(0, (num - 8) * 1.5));
  
  const bar = '█'.repeat(Math.round(barLength));
  const empty = '░'.repeat(30 - Math.round(barLength));
  
  const colorClasses = {
    normal: 'text-green-600',
    low: 'text-blue-600',
    high: type === 'hr' || type === 'temp' || type === 'spo2' ? 'text-red-600' : 'text-orange-600',
    unknown: 'text-gray-400'
  };
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{label}:</span>
        <span className={`font-bold ${colorClasses[status.status]}`}>
          {value} {type === 'temp' ? '°C' : type === 'spo2' ? '%' : type === 'hr' ? 'bpm' : type === 'rr' ? '/min' : ''}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-mono ${colorClasses[status.status]}`}>
          {bar}{empty}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          status.status === 'normal' ? 'bg-green-100 text-green-700' :
          status.status === 'low' ? 'bg-blue-100 text-blue-700' :
          status.status === 'high' ? 'bg-red-100 text-red-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {status.status.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

export default function VitalsTimeline({ vitals = [], currentTime = 0 }) {
  if (!vitals || vitals.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-500">No vital signs timeline available for this simulation</p>
      </div>
    );
  }
  
  // Filter vitals up to current time
  const visibleVitals = vitals.filter(v => !v.time || v.time <= currentTime || currentTime === 0);
  
  if (visibleVitals.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-500">Vital signs will appear as the simulation progresses</p>
      </div>
    );
  }
  
  // Get most recent vital
  const latestVital = visibleVitals[visibleVitals.length - 1];
  
  return (
    <div className="bg-white rounded-lg shadow-md border-2 border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">📊 Vital Signs Monitor</h3>
        {latestVital.time !== undefined && (
          <span className="text-sm font-semibold text-gray-600">
            T+{latestVital.time || 0} minutes
          </span>
        )}
      </div>
      
      {/* Current Vital Signs - Detailed View */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-5 mb-4 border border-blue-200">
        <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Current Status</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {latestVital.bp && (
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              {renderTextBar(latestVital.bp.split('/')[0], 'bp_sys', 'Blood Pressure')}
              <p className="text-xs text-gray-500 mt-1">{latestVital.bp} mmHg</p>
            </div>
          )}
          {latestVital.hr && (
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              {renderTextBar(latestVital.hr, 'hr', 'Heart Rate')}
            </div>
          )}
          {latestVital.temp && (
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              {renderTextBar(latestVital.temp, 'temp', 'Temperature')}
            </div>
          )}
          {latestVital.spo2 && (
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              {renderTextBar(latestVital.spo2, 'spo2', 'SpO₂')}
            </div>
          )}
          {latestVital.rr && (
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              {renderTextBar(latestVital.rr, 'rr', 'Respiratory Rate')}
            </div>
          )}
        </div>
        {latestVital.notes && (
          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="text-sm text-gray-700 italic">📝 {latestVital.notes}</p>
          </div>
        )}
      </div>
      
      {/* Timeline History */}
      {visibleVitals.length > 1 && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Timeline History</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {visibleVitals.map((vital, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-lg border ${
                  index === visibleVitals.length - 1 
                    ? 'bg-blue-50 border-blue-300' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-700">
                    T+{vital.time || index * 15} min
                  </span>
                  {index === visibleVitals.length - 1 && (
                    <span className="text-xs px-2 py-0.5 bg-blue-500 text-white rounded-full font-semibold">
                      CURRENT
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                  {vital.bp && (
                    <div>
                      <span className="text-gray-500">BP:</span>
                      <span className="font-semibold text-gray-700 ml-1">{vital.bp}</span>
                    </div>
                  )}
                  {vital.hr && (
                    <div>
                      <span className="text-gray-500">HR:</span>
                      <span className="font-semibold text-gray-700 ml-1">{vital.hr} bpm</span>
                    </div>
                  )}
                  {vital.temp && (
                    <div>
                      <span className="text-gray-500">Temp:</span>
                      <span className="font-semibold text-gray-700 ml-1">{vital.temp}°C</span>
                    </div>
                  )}
                  {vital.spo2 && (
                    <div>
                      <span className="text-gray-500">SpO₂:</span>
                      <span className="font-semibold text-gray-700 ml-1">{vital.spo2}%</span>
                    </div>
                  )}
                  {vital.rr && (
                    <div>
                      <span className="text-gray-500">RR:</span>
                      <span className="font-semibold text-gray-700 ml-1">{vital.rr} /min</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Trend Indicators (Text-based) */}
      {visibleVitals.length >= 2 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Trend Analysis</h4>
          <div className="space-y-1 text-xs text-gray-600">
            {latestVital.hr && visibleVitals[visibleVitals.length - 2]?.hr && (
              <p>
                HR: {parseFloat(latestVital.hr) > parseFloat(visibleVitals[visibleVitals.length - 2].hr) 
                  ? '↗️ Increasing' 
                  : parseFloat(latestVital.hr) < parseFloat(visibleVitals[visibleVitals.length - 2].hr)
                  ? '↘️ Decreasing'
                  : '→ Stable'}
              </p>
            )}
            {latestVital.bp && visibleVitals[visibleVitals.length - 2]?.bp && (
              <p>
                BP: {parseFloat(latestVital.bp.split('/')[0]) > parseFloat(visibleVitals[visibleVitals.length - 2].bp.split('/')[0])
                  ? '↗️ Increasing'
                  : parseFloat(latestVital.bp.split('/')[0]) < parseFloat(visibleVitals[visibleVitals.length - 2].bp.split('/')[0])
                  ? '↘️ Decreasing'
                  : '→ Stable'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
