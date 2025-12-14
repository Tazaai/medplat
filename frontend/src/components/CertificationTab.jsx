import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Award, BookOpen, Target, TrendingUp, Download, ExternalLink, CheckCircle2 } from 'lucide-react';
import CertificationDisplay from './CertificationDisplay'; // Phase 7: New certification system
import { API_BASE } from '../config';

export default function CertificationTab({ uid }) {
  const [pathways, setPathways] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPathway, setSelectedPathway] = useState(null);
  const [viewMode, setViewMode] = useState('phase7'); // 'phase7' or 'pathways'

  useEffect(() => {
    if (uid) {
      loadData();
    }
  }, [uid]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load available pathways
      const pathwaysRes = await fetch(`${API_BASE}/api/certification/pathways`);
      const pathwaysData = await pathwaysRes.json();
      if (pathwaysData.ok) {
        setPathways(pathwaysData.pathways);
      }

      // Load user's certificates
      const certsRes = await fetch(`${API_BASE}/api/certification/list?uid=${uid}`);
      const certsData = await certsRes.json();
      if (certsData.ok) {
        setCertificates(certsData.certificates);
      }

      // Load enrollments (check progress for each pathway)
      const enrollmentPromises = pathwaysData.pathways?.map(async (pathway) => {
        const progressRes = await fetch(`${API_BASE}/api/certification/progress?uid=${uid}&pathway_id=${pathway.id}`);
        const progressData = await progressRes.json();
        return progressData.ok ? progressData.progress : null;
      });
      
      const enrollmentResults = await Promise.all(enrollmentPromises || []);
      setEnrollments(enrollmentResults.filter(e => e !== null));
      
    } catch (err) {
      console.error('Failed to load certification data:', err);
    } finally {
      setLoading(false);
    }
  };

  const enrollInPathway = async (pathwayId) => {
    try {
      const res = await fetch(`${API_BASE}/api/certification/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, pathway_id: pathwayId })
      });
      
      const data = await res.json();
      if (data.ok) {
        await loadData(); // Reload data
      } else {
        alert(data.error || 'Failed to enroll');
      }
    } catch (err) {
      console.error('Enrollment failed:', err);
      alert('Failed to enroll in pathway');
    }
  };

  const completePathway = async (pathwayId) => {
    try {
      const res = await fetch(`${API_BASE}/api/certification/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, pathway_id: pathwayId })
      });
      
      const data = await res.json();
      if (data.ok) {
        alert('🎉 Certification issued! Check your certificates below.');
        await loadData();
      } else {
        alert(`Requirements not met:\n${data.missing?.join('\n') || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Completion failed:', err);
      alert('Failed to issue certificate');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Loading pathways...</div>
      </div>
    );
  }

  const getEnrollment = (pathwayId) => {
    return enrollments.find(e => e.pathway_id === pathwayId);
  };

  const getCertificate = (pathwayId) => {
    return certificates.find(c => c.pathway_id === pathwayId);
  };

  return (
    <div className="space-y-6">
      {/* Header with view mode toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Certifications</h2>
          <p className="text-muted-foreground">
            Earn professional certifications by mastering specialty tracks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'phase7' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('phase7')}
          >
            Phase 7 Certifications
          </Button>
          <Button
            variant={viewMode === 'pathways' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('pathways')}
          >
            Certification Pathways
          </Button>
        </div>
      </div>

      {/* Phase 7 Certification Display */}
      {viewMode === 'phase7' && <CertificationDisplay />}

      {/* Certification Pathways (Legacy) */}
      {viewMode === 'pathways' && (
        <>
      {/* Earned Certificates */}
      {certificates.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-600" />
              Your Certificates ({certificates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {certificates.map((cert) => (
                <div key={cert.id} className="bg-white p-4 rounded-lg border border-amber-200 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <h4 className="font-semibold">{cert.pathway_name}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Issued: {new Date(cert.issued_at).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <code className="bg-slate-100 px-2 py-1 rounded">{cert.verification_code}</code>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" variant="outline" onClick={() => window.open(cert.pdf_url, '_blank')}>
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => window.open(`${API_BASE}/api/certification/verify/${cert.verification_code}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Verify
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Pathways */}
      <div className="grid gap-6 md:grid-cols-2">
        {pathways.map((pathway) => {
          const enrollment = getEnrollment(pathway.id);
          const certificate = getCertificate(pathway.id);
          const isEnrolled = enrollment !== undefined;
          const isCompleted = certificate !== undefined;

          return (
            <Card key={pathway.id} className={isCompleted ? 'border-green-200' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {pathway.name}
                      {isCompleted && <Badge variant="success" className="ml-2">Certified</Badge>}
                      {isEnrolled && !isCompleted && <Badge variant="secondary">In Progress</Badge>}
                    </CardTitle>
                    <CardDescription>{pathway.description}</CardDescription>
                  </div>
                  <BookOpen className="h-8 w-8 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Requirements */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Topics Mastered</span>
                    <span className="font-medium">{pathway.requirements.topics_mastered}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">XP Required</span>
                    <span className="font-medium">{pathway.requirements.xp_required.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Min Accuracy</span>
                    <span className="font-medium">{(pathway.requirements.quiz_accuracy_min * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Streak Days</span>
                    <span className="font-medium">{pathway.requirements.streak_days_min} days</span>
                  </div>
                </div>

                {/* Progress */}
                {isEnrolled && !isCompleted && enrollment && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Progress</span>
                      <span className="text-muted-foreground">{enrollment.progress_percentage}%</span>
                    </div>
                    <Progress value={enrollment.progress_percentage} className="h-2" />
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {!isEnrolled && !isCompleted && (
                    <Button 
                      className="w-full" 
                      onClick={() => enrollInPathway(pathway.id)}
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Enroll
                    </Button>
                  )}
                  {isEnrolled && !isCompleted && (
                    <>
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setSelectedPathway(pathway)}
                      >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        View Progress
                      </Button>
                      <Button 
                        className="flex-1"
                        onClick={() => completePathway(pathway.id)}
                      >
                        <Award className="h-4 w-4 mr-2" />
                        Request Certificate
                      </Button>
                    </>
                  )}
                  {isCompleted && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.open(certificate.pdf_url, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Certificate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {pathways.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Award className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">No pathways available</p>
          </CardContent>
        </Card>
      )}
        </>
      )}
    </div>
  );
}
