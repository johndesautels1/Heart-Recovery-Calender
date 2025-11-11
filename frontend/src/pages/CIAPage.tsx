import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, AlertTriangle, CheckCircle, TrendingUp, Activity, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { api } from '../services/api';
import { CIAReport, CIAEligibility, CIARiskItem, CIAFinding, CIAActionItem } from '../types';

export function CIAPage() {
  const navigate = useNavigate();
  const [eligibility, setEligibility] = useState<CIAEligibility | null>(null);
  const [reports, setReports] = useState<CIAReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<CIAReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generationStep, setGenerationStep] = useState(0);

  const generationSteps = [
    '🫀 Processing Basic Vitals & Hemodynamics...',
    '📊 Analyzing ECG/EKG Waveform Morphology...',
    '🧬 Evaluating Biomarkers & Lab Results...',
    '📈 Computing HRV & Autonomic Metrics...',
    '🔬 Running ML Risk Stratification Models...',
    '💊 Analyzing Medication Interactions...',
    '🎯 Generating Personalized Recommendations...',
  ];

  useEffect(() => {
    // Hide navbar for full immersion
    const navbar = document.querySelector('nav');
    if (navbar) {
      (navbar as HTMLElement).style.display = 'none';
    }

    loadData();

    return () => {
      const navbar = document.querySelector('nav');
      if (navbar) {
        (navbar as HTMLElement).style.display = '';
      }
    };
  }, []);

  useEffect(() => {
    // Animate generation steps
    if (isGenerating) {
      const interval = setInterval(() => {
        setGenerationStep(prev => (prev + 1) % generationSteps.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isGenerating]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [eligibilityData, reportsData] = await Promise.all([
        api.checkCIAEligibility(),
        api.getCIAReports(50, false),
      ]);
      setEligibility(eligibilityData);
      setReports(reportsData.reports);

      // Auto-select most recent completed report
      const latestReport = reportsData.reports.find(r => r.status === 'completed');
      if (latestReport) {
        setSelectedReport(latestReport);
      }
    } catch (err: any) {
      console.error('Error loading CIA data:', err);
      setError(err.response?.data?.error || 'Failed to load CIA data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!eligibility?.eligible) return;

    try {
      setIsGenerating(true);
      setGenerationStep(0);
      setError(null);

      const response = await api.generateCIAReport();

      setIsGenerating(false);
      setReports(prev => [response.report, ...prev]);
      setSelectedReport(response.report);

      // Refresh eligibility
      const newEligibility = await api.checkCIAEligibility();
      setEligibility(newEligibility);
    } catch (err: any) {
      console.error('Error generating report:', err);
      setError(err.response?.data?.error || 'Failed to generate report');
      setIsGenerating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#eab308';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'immediate': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#eab308';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      overflow: 'auto',
      background: '#000',
    }}>
      {/* Background Layers */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f172a 100%)',
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 20% 50%, rgba(0, 212, 255, 0.1) 0%, transparent 50%),
                      radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.1) 0%, transparent 50%),
                      radial-gradient(circle at 40% 20%, rgba(240, 147, 251, 0.1) 0%, transparent 50%)`,
          animation: 'float-gradient 20s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(100, 220, 255, 0.04) 0%, transparent 1%),
            radial-gradient(circle at 35% 45%, rgba(168, 85, 247, 0.025) 0%, transparent 0.3%),
            radial-gradient(circle at 65% 55%, rgba(240, 147, 251, 0.025) 0%, transparent 0.4%),
            radial-gradient(circle at 25% 60%, rgba(0, 212, 255, 0.02) 0%, transparent 0.5%),
            radial-gradient(circle at 75% 40%, rgba(168, 85, 247, 0.02) 0%, transparent 0.6%),
            radial-gradient(circle at 15% 35%, rgba(240, 147, 251, 0.015) 0%, transparent 0.4%),
            radial-gradient(circle at 85% 65%, rgba(0, 212, 255, 0.015) 0%, transparent 0.5%),
            radial-gradient(circle at 50% 50%, transparent 15%, rgba(100, 220, 255, 0.005) 15.2%, transparent 15.4%),
            radial-gradient(circle at 50% 50%, transparent 25%, rgba(168, 85, 247, 0.004) 25.2%, transparent 25.4%),
            radial-gradient(circle at 50% 50%, transparent 38%, rgba(240, 147, 251, 0.003) 38.2%, transparent 38.4%)
          `,
          animation: 'celestial-rotation 120s linear infinite',
        }} />
      </div>

      {/* Floating Back Button */}
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 10000,
          padding: '12px 20px',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.15) 100%)',
          backdropFilter: 'blur(20px)',
          border: '2px solid rgba(255,255,255,0.3)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 40px rgba(37, 99, 235, 0.2)',
          color: '#ffffff',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 60px rgba(37, 99, 235, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 40px rgba(37, 99, 235, 0.2)';
        }}
      >
        <ArrowLeft className="h-5 w-5" style={{ filter: 'drop-shadow(0 0 8px rgba(37, 99, 235, 0.8))' }} />
        <span style={{ textShadow: '0 0 15px rgba(59, 130, 246, 0.8), 0 2px 4px rgba(0, 0, 0, 1)' }}>
          Back to Dashboard
        </span>
      </button>

      {/* Main Content */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1400px', margin: '0 auto', padding: '80px 20px 40px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #00d4ff 0%, #a855f7 50%, #f093fb 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.3em',
            marginBottom: '0.5rem',
          }}>
            CIA
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            Cardiac Intelligence AI-Analysis
          </p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
            Advanced Multi-Modal LLM Analysis Engine V1.0
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            marginBottom: '2rem',
            padding: '1rem 1.5rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            color: '#ef4444',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div style={{
              width: '60px',
              height: '60px',
              border: '4px solid rgba(0, 212, 255, 0.2)',
              borderTop: '4px solid #00d4ff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem',
            }} />
            <p style={{ color: 'rgba(255,255,255,0.7)' }}>Loading CIA System...</p>
          </div>
        )}

        {/* Generating Overlay */}
        {isGenerating && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(20px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{ textAlign: 'center', maxWidth: '600px', padding: '2rem' }}>
              <div style={{
                width: '100px',
                height: '100px',
                margin: '0 auto 2rem',
                border: '6px solid rgba(0, 212, 255, 0.2)',
                borderTop: '6px solid #00d4ff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
              <h2 style={{
                color: '#00d4ff',
                fontSize: '1.5rem',
                fontWeight: 700,
                marginBottom: '1.5rem',
              }}>
                Claude AI is Performing Deep Cardiac Analysis...
              </h2>
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '1.5rem',
              }}>
                {generationSteps.map((step, idx) => (
                  <div
                    key={idx}
                    style={{
                      color: idx === generationStep ? '#00d4ff' : 'rgba(255,255,255,0.4)',
                      padding: '0.5rem 0',
                      transition: 'all 0.3s ease',
                      fontWeight: idx === generationStep ? 600 : 400,
                    }}
                  >
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Not Loading */}
        {!isLoading && !isGenerating && (
          <>
            {/* Eligibility & Generate Button */}
            <div style={{
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: '16px',
              padding: '2rem',
              marginBottom: '2rem',
              boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ color: '#ffffff', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Brain className="h-6 w-6" style={{ color: '#00d4ff' }} />
                    Report Generation Status
                  </h3>
                  {eligibility?.eligible ? (
                    <p style={{ color: '#10b981', fontSize: '0.95rem' }}>
                      ✓ You are eligible to generate a new CIA report
                      {eligibility.daysSinceSurgery && ` (${eligibility.daysSinceSurgery} days post-surgery)`}
                    </p>
                  ) : (
                    <div>
                      <p style={{ color: '#f59e0b', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                        ⚠ {eligibility?.reason}
                      </p>
                      {eligibility?.nextEligibleDate && (
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                          Next eligible date: {formatDate(eligibility.nextEligibleDate)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleGenerateReport}
                  disabled={!eligibility?.eligible}
                  style={{
                    padding: '12px 24px',
                    background: eligibility?.eligible
                      ? 'linear-gradient(135deg, #00d4ff 0%, #a855f7 100%)'
                      : 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: eligibility?.eligible ? 'pointer' : 'not-allowed',
                    opacity: eligibility?.eligible ? 1 : 0.5,
                    boxShadow: eligibility?.eligible ? '0 4px 20px rgba(0, 212, 255, 0.4)' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (eligibility?.eligible) {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 6px 30px rgba(0, 212, 255, 0.6)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (eligibility?.eligible) {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 212, 255, 0.4)';
                    }
                  }}
                >
                  🧬 Generate New CIA Report
                </button>
              </div>
            </div>

            {/* Reports List & Selected Report */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
              {/* Reports Sidebar */}
              <div style={{
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)',
                maxHeight: '800px',
                overflowY: 'auto',
              }}>
                <h3 style={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
                  Previous Reports
                </h3>
                {reports.length === 0 ? (
                  <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '2rem 0' }}>
                    No reports generated yet
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {reports.map((report) => (
                      <div
                        key={report.id}
                        onClick={() => setSelectedReport(report)}
                        style={{
                          padding: '1rem',
                          background: selectedReport?.id === report.id
                            ? 'rgba(0, 212, 255, 0.15)'
                            : 'rgba(255,255,255,0.05)',
                          border: selectedReport?.id === report.id
                            ? '1px solid rgba(0, 212, 255, 0.5)'
                            : '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedReport?.id !== report.id) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedReport?.id !== report.id) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                          <span style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.9rem' }}>
                            Report #{report.id}
                          </span>
                          {report.status === 'completed' && report.recoveryScore !== undefined && (
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '8px',
                              background: report.recoveryScore >= 75
                                ? 'rgba(16, 185, 129, 0.2)'
                                : report.recoveryScore >= 50
                                ? 'rgba(245, 158, 11, 0.2)'
                                : 'rgba(239, 68, 68, 0.2)',
                              color: report.recoveryScore >= 75
                                ? '#10b981'
                                : report.recoveryScore >= 50
                                ? '#f59e0b'
                                : '#ef4444',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                            }}>
                              {report.recoveryScore}/100
                            </span>
                          )}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <CalendarIcon className="h-3 w-3" />
                          {formatDate(report.generatedAt)}
                        </div>
                        {report.daysPostSurgery && (
                          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                            Day {report.daysPostSurgery} post-surgery
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Report Details */}
              <div style={{
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: '16px',
                padding: '2rem',
                boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)',
                maxHeight: '800px',
                overflowY: 'auto',
              }}>
                {!selectedReport ? (
                  <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'rgba(255,255,255,0.5)' }}>
                    <Brain className="h-16 w-16" style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                    <p>Select a report to view details</p>
                  </div>
                ) : (
                  <div>
                    {/* Report Header */}
                    <div style={{ marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                        <div>
                          <h2 style={{ color: '#ffffff', fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                            CIA Report #{selectedReport.id}
                          </h2>
                          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <CalendarIcon className="h-4 w-4" />
                              {formatDate(selectedReport.generatedAt)}
                            </span>
                            {selectedReport.daysPostSurgery && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Clock className="h-4 w-4" />
                                Day {selectedReport.daysPostSurgery} post-surgery
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedReport.recoveryScore !== undefined && (
                          <div style={{ textAlign: 'center' }}>
                            <div style={{
                              width: '100px',
                              height: '100px',
                              borderRadius: '50%',
                              background: `conic-gradient(${
                                selectedReport.recoveryScore >= 75 ? '#10b981' :
                                selectedReport.recoveryScore >= 50 ? '#f59e0b' : '#ef4444'
                              } ${selectedReport.recoveryScore * 3.6}deg, rgba(255,255,255,0.1) 0deg)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                            }}>
                              <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                background: 'rgba(0,0,0,0.8)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}>
                                <span style={{ color: '#ffffff', fontSize: '1.75rem', fontWeight: 900 }}>
                                  {selectedReport.recoveryScore}
                                </span>
                                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>
                                  / 100
                                </span>
                              </div>
                            </div>
                            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 600 }}>
                              Recovery Score
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Data Completeness */}
                      {selectedReport.dataCompleteness && (
                        <div style={{ marginTop: '1rem' }}>
                          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                            <strong>Data Sources Analyzed:</strong> {selectedReport.dataCompleteness.dataCategories.join(', ')}
                          </p>
                          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                            Total Data Points: {selectedReport.dataCompleteness.totalDataPoints.toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Summary */}
                    {selectedReport.summary && (
                      <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ color: '#00d4ff', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <TrendingUp className="h-5 w-5" />
                          Executive Summary
                        </h3>
                        <p style={{ color: 'rgba(255,255,255,0.9)', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                          {selectedReport.summary}
                        </p>
                      </div>
                    )}

                    {/* Risk Assessment */}
                    {selectedReport.riskAssessment && selectedReport.riskAssessment.length > 0 && (
                      <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ color: '#ef4444', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <AlertTriangle className="h-5 w-5" />
                          Risk Assessment
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {selectedReport.riskAssessment.map((risk: CIARiskItem, idx: number) => (
                            <div
                              key={idx}
                              style={{
                                padding: '1rem',
                                background: 'rgba(255,255,255,0.05)',
                                border: `1px solid ${getSeverityColor(risk.severity)}40`,
                                borderRadius: '12px',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                <span style={{ color: '#ffffff', fontWeight: 700 }}>{risk.category}</span>
                                <span
                                  style={{
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '8px',
                                    background: `${getSeverityColor(risk.severity)}20`,
                                    color: getSeverityColor(risk.severity),
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  {risk.severity}
                                </span>
                              </div>
                              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                {risk.finding}
                              </p>
                              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                ℹ️ {risk.recommendation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Unusual Findings */}
                    {selectedReport.unusualFindings && selectedReport.unusualFindings.length > 0 && (
                      <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ color: '#a855f7', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Activity className="h-5 w-5" />
                          Unusual Findings
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {selectedReport.unusualFindings.map((finding: CIAFinding, idx: number) => (
                            <div
                              key={idx}
                              style={{
                                padding: '1rem',
                                background: 'rgba(168, 85, 247, 0.1)',
                                border: '1px solid rgba(168, 85, 247, 0.3)',
                                borderRadius: '12px',
                              }}
                            >
                              <div style={{ color: '#ffffff', fontWeight: 700, marginBottom: '0.5rem' }}>
                                {finding.category}
                              </div>
                              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                {finding.finding}
                              </p>
                              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                                <strong>Significance:</strong> {finding.significance}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Plan */}
                    {selectedReport.actionPlan && selectedReport.actionPlan.length > 0 && (
                      <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ color: '#10b981', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <CheckCircle className="h-5 w-5" />
                          Action Plan
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {selectedReport.actionPlan.map((action: CIAActionItem, idx: number) => (
                            <div
                              key={idx}
                              style={{
                                padding: '1rem',
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                borderRadius: '12px',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                <span style={{ color: '#ffffff', fontWeight: 700 }}>
                                  {idx + 1}. {action.action}
                                </span>
                                <span
                                  style={{
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '8px',
                                    background: `${getPriorityColor(action.priority)}20`,
                                    color: getPriorityColor(action.priority),
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  {action.priority}
                                </span>
                              </div>
                              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                {action.rationale}
                              </p>
                              {action.timeline && (
                                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                                  ⏱️ Timeline: {action.timeline}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes float-gradient {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-20px, -20px) scale(1.05); }
          66% { transform: translate(20px, -10px) scale(0.95); }
        }

        @keyframes celestial-rotation {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(0, 212, 255, 0.5);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 212, 255, 0.7);
        }
      `}</style>
    </div>
  );
}
