import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  UserCircle2,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Dumbbell,
  FileText,
  Plus,
  Eye,
  Clock,
  Activity
} from 'lucide-react';
import { Patient, PostOpWeekResponse } from '../types';
import { Button } from '../components/ui/Button';
import { format, parseISO, subDays } from 'date-fns';

type ComplianceStatus = 'excellent' | 'warning' | 'poor' | 'unknown';
type TabType = 'patients' | 'exercises' | 'templates';

interface PatientWithCompliance extends Patient {
  complianceStatus: ComplianceStatus;
  nextAppointment?: string;
  recentEvents: number;
  completionRate: number;
}

export function PatientsPage() {
  const [patients, setPatients] = useState<PatientWithCompliance[]>([]);
  const [postOpData, setPostOpData] = useState<Record<number, PostOpWeekResponse>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('patients');
  const navigate = useNavigate();

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/patients', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load patients');

      const data = await response.json();

      // Enhance patients with mock compliance data
      // TODO: Replace with real data from backend
      const enhancedPatients: PatientWithCompliance[] = (data.data || []).map((patient: Patient) => {
        // Mock compliance calculation
        const random = Math.random();
        let complianceStatus: ComplianceStatus;
        let completionRate: number;

        if (random > 0.7) {
          complianceStatus = 'excellent';
          completionRate = 85 + Math.random() * 15;
        } else if (random > 0.4) {
          complianceStatus = 'warning';
          completionRate = 60 + Math.random() * 25;
        } else if (random > 0.2) {
          complianceStatus = 'poor';
          completionRate = 30 + Math.random() * 30;
        } else {
          complianceStatus = 'unknown';
          completionRate = 0;
        }

        return {
          ...patient,
          complianceStatus,
          completionRate: Math.round(completionRate),
          recentEvents: Math.floor(Math.random() * 10) + 1,
          nextAppointment: patient.surgeryDate ? format(new Date(), 'yyyy-MM-dd') : undefined,
        };
      });

      setPatients(enhancedPatients);

      // Load post-op week data
      for (const patient of enhancedPatients) {
        if (patient.surgeryDate) {
          loadPostOpWeek(patient.id);
        }
      }
    } catch (error) {
      console.error('Error loading patients:', error);
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const loadPostOpWeek = async (patientId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/patients/${patientId}/post-op-week`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      setPostOpData(prev => ({ ...prev, [patientId]: data }));
    } catch (error) {
      console.error(`Error loading post-op week for patient ${patientId}:`, error);
    }
  };

  const getComplianceColor = (status: ComplianceStatus) => {
    switch (status) {
      case 'excellent':
        return {
          bg: 'rgba(16, 185, 129, 0.1)',
          border: '#10b981',
          text: '#10b981',
          icon: CheckCircle2,
          label: 'Excellent Compliance'
        };
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.1)',
          border: '#f59e0b',
          text: '#f59e0b',
          icon: AlertTriangle,
          label: 'Needs Attention'
        };
      case 'poor':
        return {
          bg: 'rgba(239, 68, 68, 0.1)',
          border: '#ef4444',
          text: '#ef4444',
          icon: XCircle,
          label: 'Poor Compliance'
        };
      default:
        return {
          bg: 'rgba(107, 114, 128, 0.1)',
          border: '#6b7280',
          text: '#6b7280',
          icon: Activity,
          label: 'No Data'
        };
    }
  };

  const viewPatientCalendar = (patientId: number) => {
    // TODO: Navigate to detailed patient calendar view
    toast.info('Patient calendar view coming soon!');
  };

  const getPostOpDisplay = (patientId: number) => {
    const data = postOpData[patientId];
    if (!data) return null;

    if (data.isPreSurgery) {
      return (
        <span className="text-xs" style={{ color: '#60a5fa' }}>
          Pre-Op ({Math.abs(data.daysSinceSurgery || 0)}d until surgery)
        </span>
      );
    }

    return (
      <span className="text-xs" style={{ color: '#10b981' }}>
        Week {data.postOpWeek} ({data.daysSinceSurgery}d post-op)
      </span>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-xl" style={{ color: 'var(--ink)' }}>Loading patients...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gradient mb-2">Patient Management</h1>
        <p style={{ color: 'var(--ink)' }} className="text-sm">
          Monitor patient compliance and manage calendar-based recovery programs
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="glass rounded-xl p-2 mb-6 inline-flex space-x-2">
        <button
          onClick={() => setActiveTab('patients')}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
            activeTab === 'patients' ? 'bg-white/30' : 'hover:bg-white/10'
          }`}
          style={{ color: activeTab === 'patients' ? 'var(--accent)' : 'var(--ink)' }}
        >
          <UserCircle2 className="h-5 w-5" />
          <span>My Patients</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('exercises');
            navigate('/exercises');
          }}
          className="px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:bg-white/10 flex items-center space-x-2"
          style={{ color: 'var(--ink)' }}
        >
          <Dumbbell className="h-5 w-5" />
          <span>Exercise Library</span>
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
            activeTab === 'templates' ? 'bg-white/30' : 'hover:bg-white/10'
          }`}
          style={{ color: activeTab === 'templates' ? 'var(--accent)' : 'var(--ink)' }}
        >
          <FileText className="h-5 w-5" />
          <span>Event Templates</span>
        </button>
      </div>

      {/* My Patients Tab */}
      {activeTab === 'patients' && (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: 'var(--ink)', opacity: 0.7 }}>Total Patients</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{patients.length}</p>
                </div>
                <UserCircle2 className="h-8 w-8" style={{ color: 'var(--accent)', opacity: 0.3 }} />
              </div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: 'var(--ink)', opacity: 0.7 }}>Excellent</p>
                  <p className="text-2xl font-bold text-green-600">
                    {patients.filter(p => p.complianceStatus === 'excellent').length}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600 opacity-30" />
              </div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: 'var(--ink)', opacity: 0.7 }}>Needs Attention</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {patients.filter(p => p.complianceStatus === 'warning').length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-600 opacity-30" />
              </div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: 'var(--ink)', opacity: 0.7 }}>Poor Compliance</p>
                  <p className="text-2xl font-bold text-red-600">
                    {patients.filter(p => p.complianceStatus === 'poor').length}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-600 opacity-30" />
              </div>
            </div>
          </div>

          {/* Patient Cards */}
          {patients.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <UserCircle2 className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--accent)' }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--ink)' }}>No patients yet</h3>
              <p style={{ color: 'var(--ink)' }} className="mb-6 opacity-70">
                Patients will sync from the master app automatically
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {patients.map((patient) => {
                const compliance = getComplianceColor(patient.complianceStatus);
                const ComplianceIcon = compliance.icon;

                return (
                  <div
                    key={patient.id}
                    className="glass rounded-xl overflow-hidden hover:scale-[1.02] transition-transform"
                  >
                    {/* Traffic Light Banner */}
                    <div
                      className="px-6 py-3 flex items-center justify-between"
                      style={{
                        backgroundColor: compliance.bg,
                        borderBottom: `2px solid ${compliance.border}`
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <ComplianceIcon className="h-5 w-5" style={{ color: compliance.text }} />
                        <span className="font-medium text-sm" style={{ color: compliance.text }}>
                          {compliance.label}
                        </span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: compliance.text }}>
                        {patient.completionRate}%
                      </span>
                    </div>

                    {/* Patient Info */}
                    <div className="p-6">
                      {/* Name and Status */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-12 w-12 rounded-full glass flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(96, 165, 250, 0.1)' }}>
                            <UserCircle2 className="h-7 w-7" style={{ color: 'var(--accent)' }} />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                              {patient.name}
                            </h3>
                            {patient.surgeryDate && postOpData[patient.id] && (
                              <div>{getPostOpDisplay(patient.id)}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick Metrics */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                          <div className="flex items-center space-x-2 mb-1">
                            <CalendarIcon className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                            <span className="text-xs" style={{ color: 'var(--ink)', opacity: 0.7 }}>Events</span>
                          </div>
                          <p className="text-lg font-bold" style={{ color: 'var(--ink)' }}>
                            {patient.recentEvents}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                          <div className="flex items-center space-x-2 mb-1">
                            <TrendingUp className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                            <span className="text-xs" style={{ color: 'var(--ink)', opacity: 0.7 }}>Rate</span>
                          </div>
                          <p className="text-lg font-bold" style={{ color: 'var(--ink)' }}>
                            {patient.completionRate}%
                          </p>
                        </div>
                      </div>

                      {/* Next Appointment */}
                      {patient.nextAppointment && (
                        <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: 'rgba(96, 165, 250, 0.1)' }}>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                            <div>
                              <p className="text-xs" style={{ color: 'var(--ink)', opacity: 0.7 }}>Next Session</p>
                              <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
                                {format(new Date(patient.nextAppointment), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Button */}
                      <Button
                        onClick={() => viewPatientCalendar(patient.id)}
                        fullWidth
                        variant="glass"
                        className="flex items-center justify-center space-x-2"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View Calendar</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Event Templates Tab */}
      {activeTab === 'templates' && (
        <div className="glass rounded-xl p-12 text-center">
          <FileText className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--accent)' }} />
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--ink)' }}>Event Templates</h3>
          <p style={{ color: 'var(--ink)' }} className="mb-6 opacity-70">
            Quick event templates for scheduling coming soon!
          </p>
          <Button>
            <Plus className="h-5 w-5 mr-2" />
            Create Template
          </Button>
        </div>
      )}
    </div>
  );
}
