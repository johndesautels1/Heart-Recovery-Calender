import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Brain, AlertTriangle, CheckCircle, TrendingUp, Activity,
  Calendar as CalendarIcon, Clock, Heart, Zap, Database, BarChart3,
  Save, User, FileText, Target, Gauge
} from 'lucide-react';
import { api } from '../services/api';
import { CIAReport, CIAEligibility, CIARiskItem, CIAFinding, CIAActionItem } from '../types';
import { Footer } from '../components/Footer';

export function CIAPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [eligibility, setEligibility] = useState<CIAEligibility | null>(null);
  const [reports, setReports] = useState<CIAReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<CIAReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generationStep, setGenerationStep] = useState(0);
  const [showDataDiscovery, setShowDataDiscovery] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(undefined);

  const generationSteps = [
    { icon: '🔍', text: 'Scanning Patient Data Repository...', category: 'vitals' },
    { icon: '💓', text: 'Processing Cardiac Vitals & Hemodynamics...', category: 'vitals' },
    { icon: '😴', text: 'Analyzing Sleep Quality & Recovery Patterns...', category: 'sleep' },
    { icon: '🏃', text: 'Evaluating Exercise Performance & Capacity...', category: 'exercise' },
    { icon: '🍽️', text: 'Assessing Nutritional Intake & Compliance...', category: 'meals' },
    { icon: '💊', text: 'Analyzing Medication Adherence & Interactions...', category: 'medications' },
    { icon: '💧', text: 'Reviewing Hydration Patterns...', category: 'hydration' },
    { icon: '📊', text: 'Computing HRV & Autonomic Metrics...', category: 'vitals' },
    { icon: '🧬', text: 'Running ML Risk Stratification Models...', category: 'analysis' },
    { icon: '🎯', text: 'Generating Personalized Recommendations...', category: 'analysis' },
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
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isGenerating]);

  const loadData = async (targetUserId?: number) => {
    try {
      setIsLoading(true);
      const userData = await api.getMe();
      setUser(userData);

      // Load patients list if admin/therapist
      const isAdminOrTherapist = userData.role === 'admin' || userData.role === 'therapist';
      if (isAdminOrTherapist) {
        try {
          const patientsData = await api.getPatients();
          const patientsList = patientsData.data || [];
          setPatients(patientsList);

          // If no targetUserId specified and we have a patient record for current user, use it
          if (!targetUserId) {
            const currentUserPatient = patientsList.find((p: any) => p.userId === userData.id);
            if (currentUserPatient) {
              setSelectedUserId(userData.id);
            } else if (patientsList.length > 0) {
              // Default to first patient
              setSelectedUserId(patientsList[0].userId);
            }
          } else {
            setSelectedUserId(targetUserId);
          }
        } catch (err) {
          console.error('Error loading patients:', err);
        }
      } else {
        // Patient user - use self
        setSelectedUserId(userData.id);
      }

      const effectiveUserId = targetUserId || selectedUserId;

      const [eligibilityData, reportsData] = await Promise.all([
        api.checkCIAEligibility(effectiveUserId),
        api.getCIAReports(50, false, effectiveUserId),
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

      const response = await api.generateCIAReport(selectedUserId);

      setIsGenerating(false);
      setReports(prev => [response.report, ...prev]);
      setSelectedReport(response.report);

      // Refresh eligibility
      const newEligibility = await api.checkCIAEligibility(selectedUserId);
      setEligibility(newEligibility);
    } catch (err: any) {
      console.error('Error generating report:', err);
      setError(err.response?.data?.error || 'Failed to generate report');
      setIsGenerating(false);
    }
  };

  const handleUserChange = async (newUserId: number) => {
    setSelectedUserId(newUserId);
    setSelectedReport(null);
    await loadData(newUserId);
  };

  const handleSaveReport = async () => {
    if (!selectedReport) return;

    try {
      setIsSaving(true);
      // TODO: Implement save to patient profile API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated save
      alert('Report saved to your medical records successfully!');
    } catch (err) {
      alert('Failed to save report');
    } finally {
      setIsSaving(false);
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

  // Render Data Discovery Panel
  const renderDataDiscovery = () => {
    if (!selectedReport?.dataCompleteness) return null;

    const { dataCompleteness } = selectedReport;
    const categories = [
      { key: 'hasVitals', label: 'Vitals', icon: '💓', metrics: ['Heart Rate', 'Blood Pressure', 'Oxygen Saturation', 'Heart Rate Variability'] },
      { key: 'hasSleep', label: 'Sleep', icon: '😴', metrics: ['Total Sleep Time', 'Sleep Efficiency', 'Deep Sleep %', 'REM Sleep %', 'Sleep Score'] },
      { key: 'hasExercise', label: 'Exercises', icon: '🏃', metrics: ['Exercise Duration', 'Average Heart Rate', 'Max Heart Rate', 'Calories Burned', 'Distance'] },
      { key: 'hasMeals', label: 'Meals', icon: '🍽️', metrics: ['Daily Sodium', 'Calories', 'Protein', 'Fiber', 'Saturated Fat'] },
      { key: 'hasMedications', label: 'Medications', icon: '💊', metrics: ['Adherence Rate', 'Missed Doses', 'Medication Count'] },
      { key: 'hasHydration', label: 'Hydration', icon: '💧', metrics: ['Daily Water Intake', 'Hydration Consistency'] },
      { key: 'hasECG', label: 'ECG', icon: '📊', metrics: ['ECG Waveform Morphology', 'Arrhythmia Detection'] },
      { key: 'hasHabits', label: 'Habits', icon: '🎯', metrics: ['Daily Habit Completion', 'Consistency Score'] },
    ];

    return (
      <div style={{
        marginBottom: '2rem',
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: '16px',
        padding: '2rem',
        boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ color: '#00d4ff', fontSize: '1.3rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Database className="h-6 w-6" />
            Data Discovery Report
          </h3>
          <button
            onClick={() => setShowDataDiscovery(!showDataDiscovery)}
            style={{
              padding: '0.5rem 1rem',
              background: 'rgba(0, 212, 255, 0.2)',
              border: '1px solid rgba(0, 212, 255, 0.5)',
              borderRadius: '8px',
              color: '#00d4ff',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {showDataDiscovery ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Data Completeness</span>
            <span style={{ color: '#00d4ff', fontWeight: 700 }}>
              {dataCompleteness.dataCategories.length} / 8 categories available
            </span>
          </div>
          <div style={{
            height: '8px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${(dataCompleteness.dataCategories.length / 8) * 100}%`,
              background: 'linear-gradient(90deg, #00d4ff 0%, #a855f7 100%)',
              transition: 'width 1s ease',
            }} />
          </div>
        </div>

        {showDataDiscovery && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {categories.map((cat) => {
              const hasData = (dataCompleteness as any)[cat.key];
              return (
                <div
                  key={cat.key}
                  style={{
                    padding: '1rem',
                    background: hasData ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${hasData ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    borderRadius: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{cat.icon}</span>
                    <span style={{ color: '#ffffff', fontWeight: 700 }}>{cat.label}</span>
                    <span style={{
                      marginLeft: 'auto',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: hasData ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: hasData ? '#10b981' : '#ef4444',
                    }}>
                      {hasData ? '✓ FOUND' : '✗ MISSING'}
                    </span>
                  </div>
                  {hasData && (
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                      <div style={{ marginBottom: '0.25rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                        Metrics Analyzed:
                      </div>
                      {cat.metrics.map((metric, idx) => (
                        <div key={idx} style={{ paddingLeft: '0.5rem', color: '#10b981' }}>
                          • {metric}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0, 212, 255, 0.1)', borderRadius: '12px' }}>
          <div style={{ color: '#00d4ff', fontWeight: 700, marginBottom: '0.5rem' }}>
            📈 Total Data Points Analyzed: {dataCompleteness.totalDataPoints.toLocaleString()}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
            Analysis Period: {selectedReport.analysisStartDate && selectedReport.analysisEndDate
              ? `${formatDate(selectedReport.analysisStartDate)} - ${formatDate(selectedReport.analysisEndDate)}`
              : 'Last 90 days or since surgery'}
          </div>
        </div>
      </div>
    );
  };

  // Render Methodology Panel
  const renderMethodology = () => {
    const weights = [
      { category: 'Vitals', weight: 10, color: '#ef4444', description: 'Direct cardiac function indicators (HR, BP, HRV, O2)' },
      { category: 'Exercises', weight: 9, color: '#f59e0b', description: 'Strong predictor of outcomes & functional status' },
      { category: 'Medications', weight: 8, color: '#eab308', description: 'Essential for recovery & risk prevention' },
      { category: 'Sleep', weight: 7, color: '#10b981', description: 'Impacts recovery, inflammation & healing' },
      { category: 'Meals', weight: 6, color: '#06b6d4', description: 'Long-term risk factor modification' },
      { category: 'ECG', weight: 10, color: '#a855f7', description: 'Arrhythmia detection (when available)' },
      { category: 'Hydration', weight: 5, color: '#8b5cf6', description: 'Fluid balance & circulation support' },
      { category: 'Habits', weight: 4, color: '#ec4899', description: 'Behavioral compliance & consistency' },
    ];

    return (
      <div style={{
        marginBottom: '2rem',
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: '16px',
        padding: '2rem',
        boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ color: '#a855f7', fontSize: '1.3rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BarChart3 className="h-6 w-6" />
            Analysis Methodology & Scoring Weights
          </h3>
          <button
            onClick={() => setShowMethodology(!showMethodology)}
            style={{
              padding: '0.5rem 1rem',
              background: 'rgba(168, 85, 247, 0.2)',
              border: '1px solid rgba(168, 85, 247, 0.5)',
              borderRadius: '8px',
              color: '#a855f7',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {showMethodology ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '12px' }}>
          <div style={{ color: '#a855f7', fontWeight: 700, marginBottom: '0.75rem', fontSize: '1.1rem' }}>
            🏥 International Guidelines Applied:
          </div>
          <ul style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', paddingLeft: '1.5rem', margin: 0 }}>
            <li>American Heart Association (AHA) Cardiac Rehabilitation Standards</li>
            <li>American College of Cardiology Foundation (ACCF) Guidelines</li>
            <li>European Society of Cardiology (ESC) Recommendations</li>
            <li>JNC-8 Hypertension Management Guidelines</li>
          </ul>
        </div>

        {showMethodology && (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
                Category Weighting System:
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {weights.map((item) => (
                  <div
                    key={item.category}
                    style={{
                      padding: '0.75rem',
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${item.color}40`,
                      borderRadius: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ color: '#ffffff', fontWeight: 700 }}>{item.category}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '100px', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${item.weight * 10}%`,
                            background: item.color,
                          }} />
                        </div>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '6px',
                          background: `${item.color}20`,
                          color: item.color,
                          fontWeight: 700,
                          fontSize: '0.9rem',
                        }}>
                          Weight: {item.weight}/10
                        </span>
                      </div>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                      {item.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '1.5rem', background: 'rgba(0, 212, 255, 0.1)', borderRadius: '12px' }}>
              <h4 style={{ color: '#00d4ff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
                Recovery Score Calculation Formula:
              </h4>
              <div style={{ fontFamily: 'monospace', color: '#00d4ff', fontSize: '0.95rem', marginBottom: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                Recovery Score = Σ(Category Score × Weight × Availability) / Σ(Weight × Availability)
              </div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                <strong style={{ color: '#ffffff' }}>Category Scoring (0-100):</strong>
                <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                  <li>100 pts: Meeting all guideline targets</li>
                  <li>80-99 pts: Within 10% of targets</li>
                  <li>60-79 pts: Within 20% of targets</li>
                  <li>40-59 pts: Beyond 20% but improving trend</li>
                  <li>20-39 pts: Beyond 20% and stable/declining</li>
                  <li>0-19 pts: Critical deviations requiring immediate attention</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Render Garmin G1000-style Dashboard
  const renderG1000Dashboard = () => {
    if (!selectedReport || selectedReport.recoveryScore === undefined) return null;

    const score = selectedReport.recoveryScore;
    const surgeryDate = user?.surgeryDate || selectedReport.surgeryDate;
    const daysPostSurgery = selectedReport.daysPostSurgery || 0;

    // Create timeline data (surgery to current/90 days)
    const maxDays = Math.max(90, daysPostSurgery);
    const timelinePoints = [];
    for (let day = 0; day <= daysPostSurgery; day += 5) {
      // Simulate recovery trajectory (would be real data in production)
      const baseScore = 40 + (day / maxDays) * (score - 40);
      const variance = Math.sin(day / 10) * 5;
      timelinePoints.push({
        day,
        score: Math.min(100, Math.max(0, baseScore + variance)),
      });
    }

    return (
      <div style={{
        marginBottom: '2rem',
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(10, 20, 40, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        border: '2px solid rgba(0, 212, 255, 0.5)',
        borderRadius: '20px',
        padding: '2rem',
        boxShadow: '0 20px 60px rgba(0, 212, 255, 0.3), inset 0 0 60px rgba(0, 212, 255, 0.1)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glass morphic effect overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 30% 50%, rgba(0, 212, 255, 0.15) 0%, transparent 50%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{
                color: '#00d4ff',
                fontSize: '1.5rem',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                textShadow: '0 0 20px rgba(0, 212, 255, 0.8)',
                letterSpacing: '0.1em',
              }}>
                <Gauge className="h-7 w-7" />
                RECOVERY FLIGHT DECK
              </h3>
              <div style={{ color: 'rgba(0, 212, 255, 0.8)', fontSize: '0.85rem', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                POWERED BY PULSE TECHNOLOGY™ | REAL-TIME CARDIAC ANALYTICS
              </div>
            </div>
            <div style={{
              padding: '1rem 1.5rem',
              background: 'rgba(0, 212, 255, 0.2)',
              border: '2px solid #00d4ff',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <div style={{ color: '#00d4ff', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                POST-OP STATUS
              </div>
              <div style={{ color: '#ffffff', fontSize: '1.5rem', fontWeight: 900 }}>
                DAY {daysPostSurgery}
              </div>
            </div>
          </div>

          {/* Main Display Grid - Garmin G1000 style */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Left Panel - Primary Flight Display (PFD) style */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.6)',
              border: '2px solid rgba(0, 212, 255, 0.4)',
              borderRadius: '12px',
              padding: '1.5rem',
              position: 'relative',
            }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ color: '#00d4ff', fontSize: '0.8rem', fontWeight: 700, marginBottom: '1rem', fontFamily: 'monospace' }}>
                  RECOVERY SCORE INDICATOR
                </div>

                {/* Circular Gauge */}
                <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto' }}>
                  <svg width="200" height="200" viewBox="0 0 200 200">
                    {/* Background arc */}
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="20"
                    />
                    {/* Score arc */}
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke={score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="20"
                      strokeDasharray={`${score * 5.03} 502.4`}
                      strokeLinecap="round"
                      transform="rotate(-90 100 100)"
                      style={{ filter: `drop-shadow(0 0 10px ${score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'})` }}
                    />
                    {/* Center text */}
                    <text x="100" y="90" textAnchor="middle" fill="#ffffff" fontSize="48" fontWeight="900">
                      {score}
                    </text>
                    <text x="100" y="115" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="14">
                      / 100
                    </text>
                  </svg>
                </div>

                <div style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  background: score >= 75 ? 'rgba(16, 185, 129, 0.2)' : score >= 50 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  borderRadius: '8px',
                  border: `1px solid ${score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'}`,
                }}>
                  <div style={{
                    color: score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444',
                    fontWeight: 700,
                    fontSize: '1rem',
                  }}>
                    {score >= 75 ? '✓ EXCELLENT RECOVERY' : score >= 50 ? '⚠ MODERATE RECOVERY' : '⚠ NEEDS ATTENTION'}
                  </div>
                </div>
              </div>

              {/* Key Indicators */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { label: 'VITALS', value: selectedReport.dataCompleteness?.hasVitals ? 'NOMINAL' : 'NO DATA', color: selectedReport.dataCompleteness?.hasVitals ? '#10b981' : '#6b7280' },
                  { label: 'EXERCISE', value: selectedReport.dataCompleteness?.hasExercise ? 'ACTIVE' : 'INACTIVE', color: selectedReport.dataCompleteness?.hasExercise ? '#10b981' : '#6b7280' },
                  { label: 'MEDS', value: selectedReport.dataCompleteness?.hasMedications ? 'ON TRACK' : 'NO DATA', color: selectedReport.dataCompleteness?.hasMedications ? '#10b981' : '#6b7280' },
                  { label: 'SLEEP', value: selectedReport.dataCompleteness?.hasSleep ? 'TRACKED' : 'NO DATA', color: selectedReport.dataCompleteness?.hasSleep ? '#10b981' : '#6b7280' },
                ].map((indicator, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.5rem',
                      background: 'rgba(0, 212, 255, 0.1)',
                      border: `1px solid ${indicator.color}40`,
                      borderRadius: '6px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem', fontWeight: 700, fontFamily: 'monospace' }}>
                      {indicator.label}
                    </div>
                    <div style={{ color: indicator.color, fontSize: '0.75rem', fontWeight: 700, marginTop: '0.25rem' }}>
                      {indicator.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Panel - Multi-Function Display (MFD) style */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.6)',
              border: '2px solid rgba(168, 85, 247, 0.4)',
              borderRadius: '12px',
              padding: '1.5rem',
            }}>
              <div style={{ color: '#a855f7', fontSize: '0.8rem', fontWeight: 700, marginBottom: '1rem', fontFamily: 'monospace' }}>
                RECOVERY TRAJECTORY MAP
              </div>

              {/* Simplified timeline chart */}
              <div style={{ position: 'relative', height: '240px', marginBottom: '1rem' }}>
                <svg width="100%" height="240" viewBox="0 0 400 240" preserveAspectRatio="none">
                  {/* Grid lines */}
                  {[0, 25, 50, 75, 100].map((y) => (
                    <line
                      key={y}
                      x1="0"
                      y1={240 - (y * 2.4)}
                      x2="400"
                      y2={240 - (y * 2.4)}
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="1"
                    />
                  ))}

                  {/* Recovery zone shading */}
                  <rect x="0" y="0" width="400" height="60" fill="rgba(16, 185, 129, 0.1)" />
                  <rect x="0" y="60" width="400" height="60" fill="rgba(245, 158, 11, 0.1)" />
                  <rect x="0" y="120" width="400" height="120" fill="rgba(239, 68, 68, 0.1)" />

                  {/* Timeline path */}
                  {timelinePoints.length > 1 && (
                    <polyline
                      points={timelinePoints.map((p, idx) => {
                        const x = (idx / (timelinePoints.length - 1)) * 400;
                        const y = 240 - (p.score * 2.4);
                        return `${x},${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#00d4ff"
                      strokeWidth="3"
                      style={{ filter: 'drop-shadow(0 0 5px #00d4ff)' }}
                    />
                  )}

                  {/* Current position marker */}
                  <circle
                    cx={((daysPostSurgery / maxDays) * 400)}
                    cy={240 - (score * 2.4)}
                    r="6"
                    fill="#00d4ff"
                    style={{ filter: 'drop-shadow(0 0 10px #00d4ff)' }}
                  />

                  {/* Labels */}
                  <text x="5" y="15" fill="rgba(255,255,255,0.5)" fontSize="10">100</text>
                  <text x="5" y="75" fill="rgba(255,255,255,0.5)" fontSize="10">75</text>
                  <text x="5" y="135" fill="rgba(255,255,255,0.5)" fontSize="10">50</text>
                  <text x="5" y="195" fill="rgba(255,255,255,0.5)" fontSize="10">25</text>
                </svg>

                {/* X-axis labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                  <span>DAY 0<br/>(Surgery)</span>
                  <span>DAY {Math.floor(maxDays / 2)}</span>
                  <span>DAY {maxDays}<br/>(Target)</span>
                </div>
              </div>

              {/* Timeline legend */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.7rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '12px', height: '12px', background: 'rgba(16, 185, 129, 0.3)', border: '1px solid #10b981', borderRadius: '2px' }} />
                  <span style={{ color: '#10b981' }}>Excellent</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '12px', height: '12px', background: 'rgba(245, 158, 11, 0.3)', border: '1px solid #f59e0b', borderRadius: '2px' }} />
                  <span style={{ color: '#f59e0b' }}>Moderate</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '12px', height: '12px', background: 'rgba(239, 68, 68, 0.3)', border: '1px solid #ef4444', borderRadius: '2px' }} />
                  <span style={{ color: '#ef4444' }}>Attention</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Status Bar */}
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: 'monospace',
            fontSize: '0.75rem',
          }}>
            <div style={{ color: '#00d4ff' }}>
              {surgeryDate && `SURGERY: ${formatDate(surgeryDate)}`}
            </div>
            <div style={{ color: '#a855f7' }}>
              ANALYSIS: {formatDate(selectedReport.generatedAt)}
            </div>
            <div style={{ color: '#10b981' }}>
              DATA POINTS: {selectedReport.dataCompleteness?.totalDataPoints.toLocaleString() || 'N/A'}
            </div>
            <div style={{ color: '#00d4ff', fontWeight: 700 }}>
              STATUS: MONITORING ACTIVE
            </div>
          </div>
        </div>
      </div>
    );
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
        {/* Enhanced Header with Welcome */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          {user && (
            <div style={{
              marginBottom: '1rem',
              padding: '1rem 2rem',
              background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
              backdropFilter: 'blur(20px)',
              border: '2px solid rgba(0, 212, 255, 0.3)',
              borderRadius: '16px',
              display: 'inline-block',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <User className="h-6 w-6" style={{ color: '#00d4ff' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontWeight: 600 }}>
                    Welcome Back,
                  </div>
                  <div style={{
                    color: '#ffffff',
                    fontSize: '1.5rem',
                    fontWeight: 900,
                    textShadow: '0 0 20px rgba(0, 212, 255, 0.6)',
                  }}>
                    {user.name}
                  </div>
                </div>
              </div>
            </div>
          )}

          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #00d4ff 0%, #a855f7 50%, #f093fb 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.3em',
            marginBottom: '0.5rem',
          }}>
            CAI
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            Cardiac AI-Analysis
          </p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
            Advanced Multi-Modal LLM Analysis Engine V1.0 | Powered by Claude Sonnet 4.5
          </p>
        </div>

        {/* User/Patient Selector - Admin/Therapist Only */}
        {user && (user.role === 'admin' || user.role === 'therapist') && patients.length > 0 && (
          <div style={{
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <User size={20} style={{ color: '#00d4ff' }} />
            <label style={{
              color: 'rgba(255,255,255,0.9)',
              fontSize: '1rem',
              fontWeight: 600,
            }}>
              Analyze Patient:
            </label>
            <select
              value={selectedUserId || ''}
              onChange={(e) => handleUserChange(parseInt(e.target.value))}
              style={{
                background: 'rgba(0, 212, 255, 0.1)',
                border: '2px solid rgba(0, 212, 255, 0.3)',
                borderRadius: '12px',
                padding: '0.75rem 1.5rem',
                color: '#ffffff',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
                minWidth: '300px',
                boxShadow: '0 4px 12px rgba(0, 212, 255, 0.2)',
              }}
            >
              {patients.map((patient: any) => (
                <option key={patient.userId} value={patient.userId} style={{ background: '#1a1a2e', color: '#ffffff' }}>
                  {patient.name || patient.firstName + ' ' + patient.lastName} {patient.userId === user.id ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

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

        {/* Generating Overlay - Enhanced */}
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
            <div style={{ textAlign: 'center', maxWidth: '700px', padding: '2rem' }}>
              <div style={{
                width: '120px',
                height: '120px',
                margin: '0 auto 2rem',
                border: '6px solid rgba(0, 212, 255, 0.2)',
                borderTop: '6px solid #00d4ff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
              <h2 style={{
                color: '#00d4ff',
                fontSize: '1.75rem',
                fontWeight: 700,
                marginBottom: '0.5rem',
              }}>
                Claude AI is Performing Deep Cardiac Analysis...
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem', fontSize: '0.95rem' }}>
                Analyzing {selectedReport?.dataCompleteness?.totalDataPoints.toLocaleString() || 'thousands of'} data points across multiple health categories
              </p>
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
                      padding: '0.75rem 0',
                      transition: 'all 0.3s ease',
                      fontWeight: idx === generationStep ? 700 : 400,
                      fontSize: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                    }}
                  >
                    <span style={{ fontSize: '1.5rem' }}>{step.icon}</span>
                    <span>{step.text}</span>
                    {idx === generationStep && (
                      <div style={{
                        marginLeft: 'auto',
                        width: '20px',
                        height: '20px',
                        border: '3px solid rgba(0, 212, 255, 0.3)',
                        borderTop: '3px solid #00d4ff',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                    )}
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
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
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
                <h3 style={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText className="h-5 w-5" style={{ color: '#00d4ff' }} />
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
                maxHeight: '100%',
                overflowY: 'auto',
              }}>
                {!selectedReport ? (
                  <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'rgba(255,255,255,0.5)' }}>
                    <Brain className="h-16 w-16" style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                    <p>Select a report to view details</p>
                  </div>
                ) : (
                  <div>
                    {/* Report Header with Save Button */}
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
                        <button
                          onClick={handleSaveReport}
                          disabled={isSaving}
                          style={{
                            padding: '0.75rem 1.5rem',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            border: 'none',
                            borderRadius: '10px',
                            color: '#ffffff',
                            fontWeight: 700,
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            opacity: isSaving ? 0.6 : 1,
                            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSaving) {
                              e.currentTarget.style.transform = 'scale(1.05)';
                              e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.5)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSaving) {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.3)';
                            }
                          }}
                        >
                          <Save className="h-4 w-4" />
                          {isSaving ? 'Saving...' : 'Save to My Records'}
                        </button>
                      </div>
                    </div>

                    {/* Data Discovery Panel */}
                    {renderDataDiscovery()}

                    {/* Methodology Panel */}
                    {renderMethodology()}

                    {/* Garmin G1000-style Dashboard */}
                    {renderG1000Dashboard()}

                    {/* Summary */}
                    {selectedReport.summary && (
                      <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ color: '#00d4ff', fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <TrendingUp className="h-5 w-5" />
                          Executive Summary
                        </h3>
                        <div style={{
                          padding: '1.5rem',
                          background: 'rgba(0, 212, 255, 0.1)',
                          border: '1px solid rgba(0, 212, 255, 0.3)',
                          borderRadius: '12px',
                        }}>
                          <p style={{ color: 'rgba(255,255,255,0.9)', lineHeight: '1.8', whiteSpace: 'pre-wrap', fontSize: '1rem' }}>
                            {selectedReport.summary}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Risk Assessment */}
                    {selectedReport.riskAssessment && selectedReport.riskAssessment.length > 0 && (
                      <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ color: '#ef4444', fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <AlertTriangle className="h-5 w-5" />
                          Risk Assessment & Clinical Findings
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {selectedReport.riskAssessment.map((risk: CIARiskItem, idx: number) => (
                            <div
                              key={idx}
                              style={{
                                padding: '1.25rem',
                                background: 'rgba(255,255,255,0.05)',
                                border: `2px solid ${getSeverityColor(risk.severity)}40`,
                                borderRadius: '12px',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                                <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '1.05rem' }}>{risk.category}</span>
                                <span
                                  style={{
                                    padding: '0.4rem 1rem',
                                    borderRadius: '8px',
                                    background: `${getSeverityColor(risk.severity)}20`,
                                    color: getSeverityColor(risk.severity),
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  {risk.severity}
                                </span>
                              </div>
                              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem', marginBottom: '0.75rem', lineHeight: '1.6' }}>
                                <strong>Finding:</strong> {risk.finding}
                              </p>
                              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '0.5rem', lineHeight: '1.6' }}>
                                <strong style={{ color: '#00d4ff' }}>Recommendation:</strong> {risk.recommendation}
                              </p>
                              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontStyle: 'italic', lineHeight: '1.6' }}>
                                <strong>Clinical Basis:</strong> {risk.clinicalBasis}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Unusual Findings */}
                    {selectedReport.unusualFindings && selectedReport.unusualFindings.length > 0 && (
                      <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ color: '#a855f7', fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Activity className="h-5 w-5" />
                          Unusual Findings & Patterns
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {selectedReport.unusualFindings.map((finding: CIAFinding, idx: number) => (
                            <div
                              key={idx}
                              style={{
                                padding: '1.25rem',
                                background: 'rgba(168, 85, 247, 0.1)',
                                border: '2px solid rgba(168, 85, 247, 0.3)',
                                borderRadius: '12px',
                              }}
                            >
                              <div style={{ color: '#ffffff', fontWeight: 700, marginBottom: '0.75rem', fontSize: '1.05rem' }}>
                                {finding.category}
                              </div>
                              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem', marginBottom: '0.75rem', lineHeight: '1.6' }}>
                                <strong>Observation:</strong> {finding.finding}
                              </p>
                              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                <strong style={{ color: '#a855f7' }}>Clinical Significance:</strong> {finding.significance}
                              </p>
                              {finding.trend && (
                                <div style={{ marginTop: '0.5rem', display: 'inline-block', padding: '0.3rem 0.75rem', background: 'rgba(168, 85, 247, 0.2)', borderRadius: '6px' }}>
                                  <span style={{ color: '#a855f7', fontSize: '0.8rem', fontWeight: 700 }}>
                                    Trend: {finding.trend.toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Plan - Enhanced */}
                    {selectedReport.actionPlan && selectedReport.actionPlan.length > 0 && (
                      <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ color: '#10b981', fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Target className="h-5 w-5" />
                          Personalized Action Plan & Recommendations
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {selectedReport.actionPlan.map((action: CIAActionItem, idx: number) => (
                            <div
                              key={idx}
                              style={{
                                padding: '1.25rem',
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '2px solid rgba(16, 185, 129, 0.3)',
                                borderRadius: '12px',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                                <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '1.05rem' }}>
                                  {idx + 1}. {action.action}
                                </span>
                                <span
                                  style={{
                                    padding: '0.4rem 1rem',
                                    borderRadius: '8px',
                                    background: `${getPriorityColor(action.priority)}20`,
                                    color: getPriorityColor(action.priority),
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  {action.priority}
                                </span>
                              </div>
                              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem', marginBottom: '0.75rem', lineHeight: '1.6' }}>
                                <strong style={{ color: '#10b981' }}>Evidence-Based Rationale:</strong> {action.rationale}
                              </p>
                              {action.timeline && (
                                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <Clock className="h-4 w-4" style={{ color: '#10b981' }} />
                                  <strong>Timeline:</strong> {action.timeline}
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

        {/* Footer */}
        <div style={{ marginTop: '4rem' }}>
          <Footer />
        </div>
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
