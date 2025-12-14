// Modern Case Display with Collapsible Sections
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { formatParaclinical } from '../utils/paraclinicalFormatter';
import {
  Clock,
  User,
  FileText,
  Stethoscope,
  FlaskConical,
  GitBranch,
  Pill,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

// Collapsible section component
function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-start text-left font-normal hover:bg-slate-50 h-7 px-2 py-1"
      >
        {Icon && <Icon size={12} className="mr-1.5 text-blue-600" />}
        <span className="flex-1 text-xs">{title}</span>
        {isOpen ? (
          <ChevronDown size={12} className="text-slate-400" />
        ) : (
          <ChevronRight size={12} className="text-slate-400" />
        )}
      </Button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 px-3 py-2 bg-slate-50 rounded-md border border-slate-100"
          >
            <div className="text-sm text-slate-700 leading-relaxed">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Recursive content renderer
function renderContent(value) {
  if (value == null || value === "") return <span className="text-slate-400 italic">Not specified</span>;

  if (Array.isArray(value)) {
    return (
      <ul className="list-disc ml-5 space-y-1">
        {value.map((item, idx) => (
          <li key={idx}>{renderContent(item)}</li>
        ))}
      </ul>
    );
  }

  if (typeof value === "object") {
    return (
      <div className="space-y-2">
        {Object.entries(value).map(([k, v], idx) => (
          <div key={idx} className="flex gap-2">
            <strong className="text-slate-600 min-w-32">{k.replace(/_/g, " ")}:</strong>
            <span className="flex-1">{renderContent(v)}</span>
          </div>
        ))}
      </div>
    );
  }

  return <span>{String(value)}</span>;
}

export default function ModernCaseDisplay({ caseData }) {
  if (!caseData) return null;

  const c = caseData;
  const meta = c.meta || {};

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header Card */}
      <Card className="shadow-md border-blue-100">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-blue-900">
                {c.Topic || c.Final_Diagnosis?.Diagnosis || 'Clinical Case'}
              </h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <User size={14} />
                  <span>{meta.age || 'N/A'} years, {meta.sex || 'N/A'}</span>
                </div>
                {meta.region && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1">
                      🌍 {meta.region}
                    </span>
                  </>
                )}
                {meta.quality_score && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="font-semibold text-blue-600">
                      {(meta.quality_score * 100).toFixed(0)}% Quality
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {meta.reviewed_by_internal_panel && (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  Expert Validated
                </Badge>
              )}
              {meta.panel_roles && meta.panel_roles.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {meta.panel_roles.length} Panel Members
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Clinical Sections */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          {/* Timeline */}
          {c.Timeline && (
            <CollapsibleSection title="Timeline & Onset" icon={Clock} defaultOpen={true}>
              {renderContent(c.Timeline)}
            </CollapsibleSection>
          )}

          {/* Patient History */}
          {c.Patient_History && (
            <CollapsibleSection title="Patient History" icon={FileText} defaultOpen={true}>
              {renderContent(c.Patient_History)}
            </CollapsibleSection>
          )}

          {/* Physical Examination */}
          {c.Objective_Findings && (
            <CollapsibleSection title="Physical Examination" icon={Stethoscope}>
              {renderContent(c.Objective_Findings)}
            </CollapsibleSection>
          )}

          {/* Investigations */}
          {c.Paraclinical_Investigations && (
            <CollapsibleSection title="Paraclinical Investigations" icon={FlaskConical}>
              {(() => {
                // Format paraclinical data if it's an object with labs/imaging
                const paraclinicalData = c.Paraclinical_Investigations || c.paraclinical;
                if (paraclinicalData && typeof paraclinicalData === 'object' && (paraclinicalData.labs || paraclinicalData.imaging)) {
                  const formatted = formatParaclinical(paraclinicalData);
                  return (
                    <div className="space-y-4">
                      {formatted.labs && (
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-3 text-sm">Laboratory Results:</h4>
                          <div className="text-gray-800 bg-gray-50 p-4 rounded border-l-4 border-green-400">
                            {formatted.labs}
                          </div>
                        </div>
                      )}
                      {formatted.imaging && (
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-3 text-sm">Imaging:</h4>
                          <div className="text-gray-800 bg-gray-50 p-4 rounded border-l-4 border-blue-400">
                            {formatted.imaging}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
                return renderContent(paraclinicalData || c.Paraclinical_Investigations);
              })()}
            </CollapsibleSection>
          )}

          {/* Differential Diagnoses */}
          {c.Differential_Diagnoses && (
            <CollapsibleSection title="Differential Diagnoses" icon={GitBranch}>
              {renderContent(c.Differential_Diagnoses)}
            </CollapsibleSection>
          )}

          {/* Final Diagnosis */}
          {c.Final_Diagnosis && (
            <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={18} className="text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900">Final Diagnosis</p>
                  <p className="text-sm text-blue-800 mt-1">
                    {c.Final_Diagnosis.Diagnosis || renderContent(c.Final_Diagnosis)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Management */}
          {c.Management && (
            <CollapsibleSection title="Management Plan" icon={Pill}>
              {renderContent(c.Management)}
            </CollapsibleSection>
          )}

          {/* Teaching Points */}
          {c.Teaching && (
            <CollapsibleSection title="Teaching Points" icon={GraduationCap}>
              {renderContent(c.Teaching)}
            </CollapsibleSection>
          )}

          {/* References */}
          {c.Evidence_and_References && c.Evidence_and_References.guidelines && (
            <CollapsibleSection title="Clinical Guidelines" icon={ExternalLink}>
              <div className="space-y-2">
                {c.Evidence_and_References.guidelines.map((guideline, idx) => {
                  const urlMatch = typeof guideline === 'string' 
                    ? guideline.match(/(https?:\/\/[^\s]+)/)
                    : null;
                  const text = typeof guideline === 'string'
                    ? guideline.replace(urlMatch?.[0] || '', '').trim()
                    : JSON.stringify(guideline);
                  
                  return (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 size={14} className="text-green-600 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-slate-700">{text}</span>
                        {urlMatch && (
                          <a
                            href={urlMatch[0]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-blue-600 hover:underline inline-flex items-center gap-1"
                          >
                            <ExternalLink size={12} />
                            View
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
