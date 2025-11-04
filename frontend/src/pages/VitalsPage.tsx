import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard, Button, Modal, Input } from '../components/ui';
import {
  Activity,
  Heart,
  Plus,
  TrendingUp,
  Droplet,
  Thermometer,
  Wind,
  Weight,
  Calendar,
  Smartphone,
  Watch,
  Filter,
  BarChart3,
  Zap,
  Activity as Pulse,
  AlertTriangle,
  Edit
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import { VitalsSample, CreateVitalsInput, Patient } from '../types';
import toast from 'react-hot-toast';
import { format, subDays, addDays, subMonths, addMonths } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

const vitalsSchema = z.object({
  timestamp: z.string().optional(), // Date/time for historical data entry
  bloodPressureSystolic: z.number().optional(),
  bloodPressureDiastolic: z.number().optional(),
  heartRate: z.number().optional(),
  weight: z.number().optional(),
  temperature: z.number().optional(),
  oxygenSaturation: z.number().optional(),
  bloodSugar: z.number().optional(),
  hydrationStatus: z.number().optional(),
  notes: z.string().optional(),
  symptoms: z.string().optional(),
  medicationsTaken: z.boolean().optional(),
  edema: z.string().optional(),
  edemaSeverity: z.enum(['none', 'mild', 'moderate', 'severe']).optional(),
  chestPain: z.boolean().optional(),
  chestPainSeverity: z.number().min(1).max(10).optional(),
  chestPainType: z.string().optional(),
  dyspnea: z.number().min(0).max(4).optional(),
  dyspneaTriggers: z.string().optional(),
  dizziness: z.boolean().optional(),
  dizzinessSeverity: z.number().min(1).max(10).optional(),
  dizzinessFrequency: z.string().optional(),
  energyLevel: z.number().min(1).max(10).optional(),
  stressLevel: z.number().min(1).max(10).optional(),
  anxietyLevel: z.number().min(1).max(10).optional(),
});

type VitalsFormData = z.infer<typeof vitalsSchema>;

export function VitalsPage() {
  const { user } = useAuth(); // Access surgery date from user profile
  const navigate = useNavigate();
  const [vitals, setVitals] = useState<VitalsSample[]>([]);
  const [latestVitals, setLatestVitals] = useState<VitalsSample | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'bp' | 'hr' | 'weight' | 'sugar' | 'temp' | 'hydration' | 'o2'>('bp');
  const [patientData, setPatientData] = useState<Patient | null>(null);

  // NEW: Garmin 3000 Cockpit Features
  const [selectedDevice, setSelectedDevice] = useState<'all' | 'samsung' | 'polar'>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'weight' | 'glucose' | 'medical'>('overview');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VitalsFormData>({
    resolver: zodResolver(vitalsSchema),
    defaultValues: {
      medicationsTaken: true,
    },
  });

  // Load patient data (contains surgery date from patient profile)
  useEffect(() => {
    const loadPatientData = async () => {
      try {
        const result = await api.checkPatientProfile();
        if (result.hasProfile && result.patient) {
          setPatientData(result.patient);
        }
      } catch (error) {
        console.error('Failed to load patient data:', error);
      }
    };

    if (user) {
      loadPatientData();
    }
  }, [user]);

  // Determine surgery date from patient profile first, fall back to user
  const surgeryDate = patientData?.surgeryDate || user?.surgeryDate;

  useEffect(() => {
    loadVitals();
  }, [surgeryDate]); // Reload when surgery date changes

  const loadVitals = async () => {
    try {
      setIsLoading(true);

      // Calculate date range based on surgery date with buffers
      let startDate: string;
      let endDate: string;

      if (surgeryDate) {
        // If surgery date exists: 1 month before surgery to 1 month after today
        const surgery = new Date(surgeryDate);
        startDate = format(subMonths(surgery, 1), 'yyyy-MM-dd');
        endDate = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
      } else {
        // Fallback: show last 3 months if no surgery date
        startDate = format(subMonths(new Date(), 3), 'yyyy-MM-dd');
        endDate = format(new Date(), 'yyyy-MM-dd');
      }

      // Fetch vitals data - Sort by timestamp ascending (oldest to newest) for left-to-right charts
      const vitalsData = await api.getVitals({ startDate, endDate });
      // Sort chronologically: oldest (left) to newest (right)
      const sortedData = vitalsData.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setVitals(sortedData);

      // Handle latest vital separately - 404 is OK (means no vitals yet)
      try {
        const latest = await api.getLatestVital();
        setLatestVitals(latest);
      } catch (error: any) {
        if (error?.response?.status === 404) {
          // No vitals recorded yet - this is fine, just set to null
          setLatestVitals(null);
          console.log('[Vitals] No vitals data recorded yet');
        } else {
          // Other errors should be thrown and handled by outer catch
          throw error;
        }
      }
    } catch (error) {
      console.error('Failed to load vitals:', error);
      toast.error('Failed to load vitals data');
    } finally {
      setIsLoading(false);
    }
  };

  // Sync vitals to patient profile (2-way sync)
  const syncVitalsToProfile = async (vital: VitalsSample) => {
    try {
      // Get the patient profile for the current user
      const patientsResponse = await fetch(
        `http://localhost:4000/api/patients?userId=${vital.userId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!patientsResponse.ok) return;

      const patientsData = await patientsResponse.json();
      const patientProfile = patientsData.data?.[0];

      if (!patientProfile) return;

      // Update patient profile with latest vitals
      const updates: any = {};

      // Sync weight
      if (vital.weight !== undefined && vital.weight !== null) {
        updates.currentWeight = vital.weight;
      }

      // Sync resting heart rate (use lowest value as resting HR)
      if (vital.heartRate !== undefined && vital.heartRate !== null) {
        if (!patientProfile.restingHeartRate || vital.heartRate < patientProfile.restingHeartRate) {
          updates.restingHeartRate = vital.heartRate;
        }
      }

      // Sync baseline blood pressure
      if (vital.bloodPressureSystolic && vital.bloodPressureDiastolic) {
        updates.baselineBpSystolic = vital.bloodPressureSystolic;
        updates.baselineBpDiastolic = vital.bloodPressureDiastolic;
      }

      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        await fetch(`http://localhost:4000/api/patients/${patientProfile.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            ...patientProfile,
            ...updates
          })
        });

        console.log('✓ Synced vitals to profile:', updates);
      }
    } catch (error) {
      console.error('Failed to sync vitals to profile:', error);
    }
  };

  const onSubmit = async (data: VitalsFormData) => {
    try {
      setIsLoading(true);
      // Use user-provided timestamp for historical data entry, otherwise use current time
      const timestamp = data.timestamp
        ? new Date(data.timestamp).toISOString()
        : new Date().toISOString();

      const newVital = await api.createVital({
        ...data,
        timestamp,
        source: 'manual',
      } as CreateVitalsInput);

      setVitals([...vitals, newVital]);
      setLatestVitals(newVital);

      // Sync to profile in real-time
      await syncVitalsToProfile(newVital);

      toast.success('Vitals recorded successfully');
      setIsModalOpen(false);
      reset();
    } catch (error) {
      console.error('Failed to record vitals:', error);
      toast.error('Failed to record vitals');
    } finally {
      setIsLoading(false);
    }
  };

  const getBloodPressureStatus = (systolic?: number, diastolic?: number) => {
    if (!systolic || !diastolic) return { status: 'Unknown', className: 'text-yellow-500' };
    if (systolic < 120 && diastolic < 80) return { status: 'Normal', className: 'text-green-500' };
    if (systolic < 130 && diastolic < 80) return { status: 'Elevated', className: 'text-yellow-500' };
    if (systolic < 140 || diastolic < 90) return { status: 'Stage 1 Hypertension', className: 'text-yellow-500' };
    return { status: 'Stage 2 Hypertension', className: 'text-red-500' };
  };

  // Filter vitals by selected device for CHARTS ONLY
  const filteredVitals = vitals.filter(v => {
    if (selectedDevice === 'all') return true;
    if (selectedDevice === 'samsung') return v.deviceId?.toLowerCase().includes('samsung') || v.source === 'device';
    if (selectedDevice === 'polar') return v.deviceId?.toLowerCase().includes('polar');
    return true;
  });

  // ALWAYS use the absolute latest vitals for dashboard display (not filtered)
  // This ensures "Last Vital Check" and vitals cards always show the most recent data
  const filteredLatest = latestVitals;

  // Use ALL vitals for surgery-date-based timeline (with proper date range from backend)
  // Use FILTERED vitals for charts so device filter works
  const chartData = filteredVitals.map(v => {
    // Safely handle invalid timestamps - Use FULL calendar dates for timeline
    let dateStr = 'N/A';
    try {
      if (v.timestamp) {
        const date = new Date(v.timestamp);
        if (!isNaN(date.getTime())) {
          dateStr = format(date, 'MMM dd, yyyy'); // Full calendar date for timeline
        }
      }
    } catch (error) {
      console.error('Invalid timestamp in vitals data:', v.timestamp);
    }

    return {
      date: dateStr,
      systolic: v.bloodPressureSystolic,
      diastolic: v.bloodPressureDiastolic,
      heartRate: v.heartRate,
      weight: v.weight,
      bloodSugar: v.bloodSugar,
      temperature: v.temperature,
      hydration: v.hydrationStatus,
      o2: v.oxygenSaturation,
    };
  });

  const bpStatus = getBloodPressureStatus(
    filteredLatest?.bloodPressureSystolic,
    filteredLatest?.bloodPressureDiastolic
  );

  return (
    <div className="space-y-6">
      {/* Loading Overlay - Prevents rendering issues during data transitions */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="glass rounded-2xl p-8 flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-400 border-t-transparent"></div>
            <p className="text-white font-semibold">Loading vitals data...</p>
          </div>
        </div>
      )}

      {/* GARMIN 3000 COCKPIT HEADER */}
      <div className="relative overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 50%, rgba(15, 23, 42, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          boxShadow: '0 0 60px rgba(59, 130, 246, 0.15), inset 0 0 60px rgba(59, 130, 246, 0.05)'
        }}>
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(99, 102, 241, 0.3) 0%, transparent 50%)',
        }}></div>

        <div className="relative p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.2))',
                  boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)'
                }}>
                <Activity className="h-8 w-8 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white" style={{ textShadow: '0 0 20px rgba(59, 130, 246, 0.5)' }}>
                  Vitals Command Center
                </h1>
                <p className="text-sm text-blue-300/80">Medical-Grade Monitoring System</p>
              </div>
            </div>
            <Button onClick={() => setIsModalOpen(true)} className="group">
              <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
              Record Vitals
            </Button>
          </div>

          {/* Device Filter Tabs - Garmin Style */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-blue-300/60 text-sm font-semibold">
              <Filter className="h-4 w-4" />
              <span>DEVICE SOURCE</span>
            </div>
            <div className="flex gap-2 flex-1">
              {[
                { id: 'all' as const, icon: BarChart3, label: 'All Devices', color: 'blue' },
                { id: 'samsung' as const, icon: Smartphone, label: 'Samsung Health', color: 'cyan' },
                { id: 'polar' as const, icon: Watch, label: 'Polar H10', color: 'purple' }
              ].map(device => (
                <button
                  key={device.id}
                  onClick={() => setSelectedDevice(device.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 ${
                    selectedDevice === device.id
                      ? 'text-white shadow-lg'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                  style={{
                    background: selectedDevice === device.id
                      ? `linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(99, 102, 241, 0.3))`
                      : 'rgba(255, 255, 255, 0.05)',
                    border: selectedDevice === device.id
                      ? '1px solid rgba(59, 130, 246, 0.5)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: selectedDevice === device.id
                      ? '0 0 20px rgba(59, 130, 246, 0.3), inset 0 0 20px rgba(59, 130, 246, 0.1)'
                      : 'none'
                  }}>
                  <device.icon className="h-4 w-4" />
                  {device.label}
                  {selectedDevice === device.id && (
                    <Zap className="h-3 w-3 text-yellow-400 animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Main Navigation Tabs */}
          <div className="flex gap-2 mt-4">
            {[
              { id: 'overview' as const, label: 'Overview', icon: Activity },
              { id: 'weight' as const, label: 'Weight Journal', icon: Weight },
              { id: 'glucose' as const, label: 'Glucose Journal', icon: Droplet },
              { id: 'medical' as const, label: 'Medical Tests', icon: Heart }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                style={{
                  background: activeTab === tab.id
                    ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(99, 102, 241, 0.25))'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: activeTab === tab.id
                    ? '1px solid rgba(59, 130, 246, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.05)',
                  boxShadow: activeTab === tab.id
                    ? '0 0 20px rgba(59, 130, 246, 0.2), inset 0 0 20px rgba(59, 130, 246, 0.05)'
                    : 'none'
                }}>
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <>
          {/* NEW: Last Vital Check Banner */}
          {latestVitals && latestVitals.timestamp && (() => {
            try {
              const date = new Date(latestVitals.timestamp);
              if (isNaN(date.getTime())) return null; // Invalid date

              const hoursSince = (new Date().getTime() - date.getTime()) / (1000 * 60 * 60);

              return (
                <div className="glass rounded-xl p-4 border-l-4" style={{ borderColor: 'var(--accent)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                      <div>
                        <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
                          Last Vital Check
                        </p>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>
                          {format(date, 'MMMM d, yyyy')} at {format(date, 'h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs font-bold px-3 py-1 rounded-full" style={{
                      backgroundColor: 'rgba(99, 102, 241, 0.1)',
                      color: 'var(--accent)'
                    }}>
                      {hoursSince < 24 ? `${Math.round(hoursSince)}h ago` : `${Math.round(hoursSince / 24)}d ago`}
                    </div>
                  </div>
                </div>
              );
            } catch (error) {
              console.error('Invalid timestamp in latest vitals:', latestVitals.timestamp);
              return null;
            }
          })()}

      {/* Latest Vitals Cards with Device Badges */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <GlassCard className="relative">
          {/* Device Badge */}
          {filteredLatest && (
            <div className="absolute top-3 right-3">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${
                filteredLatest.deviceId?.toLowerCase().includes('samsung') ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                filteredLatest.deviceId?.toLowerCase().includes('polar') ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                'bg-gray-500/20 text-gray-300 border border-gray-500/30'
              }`}>
                {filteredLatest.deviceId?.toLowerCase().includes('samsung') ? (
                  <><Smartphone className="h-3 w-3" /> Samsung</>
                ) : filteredLatest.deviceId?.toLowerCase().includes('polar') ? (
                  <><Watch className="h-3 w-3" /> Polar</>
                ) : (
                  <>✋ Manual</>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1">Blood Pressure</p>
              <p className="text-2xl font-bold font-bold">
                {filteredLatest?.bloodPressureSystolic || '--'}/
                {filteredLatest?.bloodPressureDiastolic || '--'}
              </p>
              <p className={`text-sm font-bold mt-1 ${bpStatus.className}`}>{bpStatus.status}</p>
              <p className="text-xs mt-1">Normal: &lt;120/80</p>
            </div>
            <Heart className="h-8 w-8 text-red-500" />
          </div>
        </GlassCard>

        <GlassCard className="relative">
          {filteredLatest && (
            <div className="absolute top-3 right-3">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${
                filteredLatest.deviceId?.toLowerCase().includes('samsung') ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                filteredLatest.deviceId?.toLowerCase().includes('polar') ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                'bg-gray-500/20 text-gray-300 border border-gray-500/30'
              }`}>
                {filteredLatest.deviceId?.toLowerCase().includes('samsung') ? (
                  <><Smartphone className="h-3 w-3" /> Samsung</>
                ) : filteredLatest.deviceId?.toLowerCase().includes('polar') ? (
                  <><Watch className="h-3 w-3" /> Polar</>
                ) : (
                  <>✋ Manual</>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1">Heart Rate</p>
              <p className="text-2xl font-bold font-bold">
                {filteredLatest?.heartRate || '--'} <span className="text-sm">bpm</span>
              </p>
              <p className={`text-sm font-bold mt-1 ${
                !filteredLatest?.heartRate
                  ? 'text-yellow-500'
                  : filteredLatest.heartRate < 60 || filteredLatest.heartRate > 100
                  ? 'text-red-500'
                  : 'text-white'
              }`}>
                {!filteredLatest?.heartRate
                  ? 'Unknown'
                  : filteredLatest.heartRate < 60
                  ? 'Low'
                  : filteredLatest.heartRate > 100
                  ? 'High'
                  : 'Normal'}
              </p>
              <p className="text-xs mt-1">Normal: 60-100</p>
            </div>
            <Activity className="h-8 w-8 text-red-500" />
          </div>
        </GlassCard>

        <GlassCard className="relative">
          {filteredLatest && (
            <div className="absolute top-3 right-3">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${
                filteredLatest.deviceId?.toLowerCase().includes('samsung') ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                filteredLatest.deviceId?.toLowerCase().includes('polar') ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                'bg-gray-500/20 text-gray-300 border border-gray-500/30'
              }`}>
                {filteredLatest.deviceId?.toLowerCase().includes('samsung') ? (
                  <><Smartphone className="h-3 w-3" /> Samsung</>
                ) : filteredLatest.deviceId?.toLowerCase().includes('polar') ? (
                  <><Watch className="h-3 w-3" /> Polar</>
                ) : (
                  <>✋ Manual</>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1">Temperature</p>
              <p className="text-2xl font-bold font-bold">
                {filteredLatest?.temperature ? `${filteredLatest.temperature.toFixed(1)}` : '--'} <span className="text-sm">°F</span>
              </p>
              <p className={`text-sm font-bold mt-1 ${
                !filteredLatest?.temperature
                  ? 'text-yellow-500'
                  : filteredLatest.temperature < 97.0 || filteredLatest.temperature > 99.0
                  ? 'text-red-500'
                  : 'text-white'
              }`}>
                {!filteredLatest?.temperature
                  ? 'Unknown'
                  : filteredLatest.temperature < 97.0
                  ? 'Low'
                  : filteredLatest.temperature > 99.0
                  ? 'High'
                  : 'Normal'}
              </p>
              <p className="text-xs mt-1">Normal: 97-99°F</p>
            </div>
            <Thermometer className="h-8 w-8 text-orange-500" />
          </div>
        </GlassCard>

        <GlassCard className="relative">
          {filteredLatest && (
            <div className="absolute top-3 right-3">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${
                filteredLatest.deviceId?.toLowerCase().includes('samsung') ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                filteredLatest.deviceId?.toLowerCase().includes('polar') ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                'bg-gray-500/20 text-gray-300 border border-gray-500/30'
              }`}>
                {filteredLatest.deviceId?.toLowerCase().includes('samsung') ? (
                  <><Smartphone className="h-3 w-3" /> Samsung</>
                ) : filteredLatest.deviceId?.toLowerCase().includes('polar') ? (
                  <><Watch className="h-3 w-3" /> Polar</>
                ) : (
                  <>✋ Manual</>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1">Weight</p>
              <p className="text-2xl font-bold font-bold">
                {filteredLatest?.weight || '--'} <span className="text-sm">lbs</span>
              </p>
              <p className={`text-sm font-bold mt-1 ${!filteredLatest?.weight ? 'text-yellow-500' : 'text-white'}`}>
                {!filteredLatest?.weight ? 'Unknown' : 'Recorded'}
              </p>
              <p className="text-xs mt-1">Track trends</p>
            </div>
            <Weight className="h-8 w-8 text-blue-500" />
          </div>
        </GlassCard>

        {/* NEW: Weekly Weight Change */}
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1">Weekly Weight Change</p>
              <p className="text-2xl font-bold font-bold">
                {(() => {
                  if (!latestVitals?.weight || vitals.length < 2) return '--';
                  const sevenDaysAgo = subDays(new Date(), 7);
                  const oldWeights = vitals.filter(v => v.weight && new Date(v.timestamp) <= sevenDaysAgo);
                  if (oldWeights.length === 0) return '--';
                  const oldWeight = oldWeights[oldWeights.length - 1].weight!;
                  const change = latestVitals.weight - oldWeight;
                  return `${change > 0 ? '+' : ''}${change.toFixed(1)}`;
                })()} <span className="text-sm">lbs</span>
              </p>
              <p className={`text-sm font-bold mt-1 ${(() => {
                if (!latestVitals?.weight || vitals.length < 2) return 'text-yellow-500';
                const sevenDaysAgo = subDays(new Date(), 7);
                const oldWeights = vitals.filter(v => v.weight && new Date(v.timestamp) <= sevenDaysAgo);
                if (oldWeights.length === 0) return 'text-yellow-500';
                const oldWeight = oldWeights[oldWeights.length - 1].weight!;
                const change = latestVitals.weight - oldWeight;
                return Math.abs(change) < 0.5 ? 'text-white' : change > 0 ? 'text-yellow-500' : 'text-green-500';
              })()}`}>
                {(() => {
                  if (!latestVitals?.weight || vitals.length < 2) return 'Not enough data';
                  const sevenDaysAgo = subDays(new Date(), 7);
                  const oldWeights = vitals.filter(v => v.weight && new Date(v.timestamp) <= sevenDaysAgo);
                  if (oldWeights.length === 0) return 'Not enough data';
                  const oldWeight = oldWeights[oldWeights.length - 1].weight!;
                  const change = latestVitals.weight - oldWeight;
                  return Math.abs(change) < 0.5 ? 'Stable' : change > 0 ? 'Gained' : 'Lost';
                })()}
              </p>
              <p className="text-xs mt-1">Last 7 days</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </GlassCard>

        <GlassCard className="relative">
          {filteredLatest && (
            <div className="absolute top-3 right-3">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${
                filteredLatest.deviceId?.toLowerCase().includes('samsung') ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                filteredLatest.deviceId?.toLowerCase().includes('polar') ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                'bg-gray-500/20 text-gray-300 border border-gray-500/30'
              }`}>
                {filteredLatest.deviceId?.toLowerCase().includes('samsung') ? (
                  <><Smartphone className="h-3 w-3" /> Samsung</>
                ) : filteredLatest.deviceId?.toLowerCase().includes('polar') ? (
                  <><Watch className="h-3 w-3" /> Polar</>
                ) : (
                  <>✋ Manual</>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1">Blood Sugar</p>
              <p className="text-2xl font-bold font-bold">
                {filteredLatest?.bloodSugar || '--'} <span className="text-sm">mg/dL</span>
              </p>
              <p className={`text-sm font-bold mt-1 ${
                !filteredLatest?.bloodSugar
                  ? 'text-yellow-500'
                  : filteredLatest.bloodSugar >= 126 || filteredLatest.bloodSugar < 60
                  ? 'text-red-500'
                  : filteredLatest.bloodSugar >= 100
                  ? 'text-yellow-500'
                  : 'text-white'
              }`}>
                {!filteredLatest?.bloodSugar
                  ? 'Unknown'
                  : filteredLatest.bloodSugar < 100
                  ? 'Normal'
                  : filteredLatest.bloodSugar < 126
                  ? 'Pre-diabetic'
                  : 'High'}
              </p>
              <p className="text-xs mt-1">Normal: 70-100</p>
            </div>
            <Droplet className="h-8 w-8 text-red-500" />
          </div>
        </GlassCard>

        <GlassCard className="relative">
          {filteredLatest && (
            <div className="absolute top-3 right-3">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${
                filteredLatest.deviceId?.toLowerCase().includes('samsung') ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                filteredLatest.deviceId?.toLowerCase().includes('polar') ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                'bg-gray-500/20 text-gray-300 border border-gray-500/30'
              }`}>
                {filteredLatest.deviceId?.toLowerCase().includes('samsung') ? (
                  <><Smartphone className="h-3 w-3" /> Samsung</>
                ) : filteredLatest.deviceId?.toLowerCase().includes('polar') ? (
                  <><Watch className="h-3 w-3" /> Polar</>
                ) : (
                  <>✋ Manual</>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1">Hydration</p>
              <p className="text-2xl font-bold font-bold">
                {filteredLatest?.hydrationStatus || '--'} <span className="text-sm">%</span>
              </p>
              <p className={`text-sm font-bold mt-1 ${
                !filteredLatest?.hydrationStatus
                  ? 'text-yellow-500'
                  : filteredLatest.hydrationStatus < 50
                  ? 'text-red-500'
                  : filteredLatest.hydrationStatus < 70
                  ? 'text-yellow-500'
                  : 'text-white'
              }`}>
                {!filteredLatest?.hydrationStatus
                  ? 'Unknown'
                  : filteredLatest.hydrationStatus < 50
                  ? 'Dehydrated'
                  : filteredLatest.hydrationStatus < 70
                  ? 'Low'
                  : 'Good'}
              </p>
              <p className="text-xs mt-1">Target: 70-100%</p>
            </div>
            <Droplet className="h-8 w-8 text-blue-500" />
          </div>
        </GlassCard>

        {/* NEW: Oxygen Saturation */}
        <GlassCard className="relative">
          {filteredLatest && (
            <div className="absolute top-3 right-3">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${
                filteredLatest.deviceId?.toLowerCase().includes('samsung') ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                filteredLatest.deviceId?.toLowerCase().includes('polar') ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                'bg-gray-500/20 text-gray-300 border border-gray-500/30'
              }`}>
                {filteredLatest.deviceId?.toLowerCase().includes('samsung') ? (
                  <><Smartphone className="h-3 w-3" /> Samsung</>
                ) : filteredLatest.deviceId?.toLowerCase().includes('polar') ? (
                  <><Watch className="h-3 w-3" /> Polar</>
                ) : (
                  <>✋ Manual</>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1">O₂ Saturation</p>
              <p className="text-2xl font-bold font-bold">
                {filteredLatest?.oxygenSaturation || '--'} <span className="text-sm">%</span>
              </p>
              <p className={`text-sm font-bold mt-1 ${
                !filteredLatest?.oxygenSaturation
                  ? 'text-yellow-500'
                  : filteredLatest.oxygenSaturation < 90
                  ? 'text-red-500'
                  : filteredLatest.oxygenSaturation < 95
                  ? 'text-yellow-500'
                  : 'text-white'
              }`}>
                {!filteredLatest?.oxygenSaturation
                  ? 'Unknown'
                  : filteredLatest.oxygenSaturation < 90
                  ? 'Critical'
                  : filteredLatest.oxygenSaturation < 95
                  ? 'Low'
                  : 'Normal'}
              </p>
              <p className="text-xs mt-1">Normal: 95-100%</p>
            </div>
            <Wind className="h-8 w-8 text-cyan-500" />
          </div>
        </GlassCard>
      </div>

      {/* NEW: Resting Heart Rate & 7-Day Average - ALWAYS use unfiltered vitals data */}
      {vitals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold mb-1">Resting Heart Rate</p>
                <p className="text-3xl font-bold font-bold">
                  {(() => {
                    // Use unfiltered vitals to get absolute latest data
                    const recentVitals = vitals.slice(-7);
                    const validHRs = recentVitals.filter(v => v.heartRate);
                    if (validHRs.length === 0) return '--';
                    const minHR = Math.min(...validHRs.map(v => v.heartRate || 0));
                    return minHR;
                  })()} <span className="text-sm">bpm</span>
                </p>
                <p className={`text-sm font-bold mt-1 ${(() => {
                  const recentVitals = vitals.slice(-7);
                  const validHRs = recentVitals.filter(v => v.heartRate);
                  if (validHRs.length === 0) return 'text-yellow-500';
                  const minHR = Math.min(...validHRs.map(v => v.heartRate || 0));
                  return minHR < 60 ? 'text-yellow-500' : minHR > 100 ? 'text-red-500' : 'text-white';
                })()}`}>
                  {(() => {
                    const recentVitals = vitals.slice(-7);
                    const validHRs = recentVitals.filter(v => v.heartRate);
                    if (validHRs.length === 0) return 'No data';
                    const minHR = Math.min(...validHRs.map(v => v.heartRate || 0));
                    if (minHR < 60) return 'Athletic/Low';
                    if (minHR > 100) return 'Elevated';
                    return 'Normal';
                  })()}
                </p>
                <p className="text-xs mt-1">Lowest in last 7 days</p>
              </div>
              <Heart className="h-8 w-8 text-pink-500" />
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold mb-1">7-Day Average Heart Rate</p>
              <p className="text-3xl font-bold font-bold">
                {(() => {
                  // Use unfiltered vitals to get absolute latest data
                  const recentVitals = vitals.slice(-7);
                  const validHRs = recentVitals.filter(v => v.heartRate);
                  if (validHRs.length === 0) return '--';
                  const avg = validHRs.reduce((sum, v) => sum + (v.heartRate || 0), 0) / validHRs.length;
                  return Math.round(avg);
                })()} <span className="text-sm">bpm</span>
              </p>
              <p className={`text-sm font-bold mt-1 ${(() => {
                // Use unfiltered vitals to get absolute latest data
                const recentVitals = vitals.slice(-7);
                const validHRs = recentVitals.filter(v => v.heartRate);
                if (validHRs.length === 0) return 'text-yellow-500';
                const avg = validHRs.reduce((sum, v) => sum + (v.heartRate || 0), 0) / validHRs.length;
                return avg < 60 || avg > 100 ? 'text-red-500' : 'text-white';
              })()}`}>
                {(() => {
                  const recentVitals = vitals.slice(-7);
                  const validHRs = recentVitals.filter(v => v.heartRate);
                  if (validHRs.length === 0) return 'No data';
                  const avg = validHRs.reduce((sum, v) => sum + (v.heartRate || 0), 0) / validHRs.length;
                  if (avg < 60) return 'Below normal';
                  if (avg > 100) return 'Above normal';
                  return 'Normal range';
                })()}
              </p>
              <p className="text-xs mt-1">Last {(() => {
                const recentVitals = vitals.slice(-7);
                return recentVitals.filter(v => v.heartRate).length;
              })()} readings</p>
            </div>
              <Activity className="h-8 w-8 text-red-500" />
            </div>
          </GlassCard>
        </div>
      )}

      {/* NEW: Blood Pressure Trend */}
      {filteredVitals.length >= 7 && (
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1">Blood Pressure Trend</p>
              <p className={`text-3xl font-bold ${(() => {
                const recentVitals = filteredVitals.slice(-7);
                const olderVitals = filteredVitals.slice(-14, -7);
                const validRecent = recentVitals.filter(v => v.bloodPressureSystolic && v.bloodPressureDiastolic);
                const validOlder = olderVitals.filter(v => v.bloodPressureSystolic && v.bloodPressureDiastolic);
                if (validRecent.length === 0 || validOlder.length === 0) return 'text-white';
                const recentAvg = validRecent.reduce((sum, v) => sum + (v.bloodPressureSystolic || 0), 0) / validRecent.length;
                const olderAvg = validOlder.reduce((sum, v) => sum + (v.bloodPressureSystolic || 0), 0) / validOlder.length;
                const diff = recentAvg - olderAvg;
                return diff < -5 ? 'text-green-400' : diff > 5 ? 'text-red-400' : 'text-yellow-400';
              })()}`}>
                {(() => {
                  const recentVitals = filteredVitals.slice(-7);
                  const olderVitals = filteredVitals.slice(-14, -7);
                  const validRecent = recentVitals.filter(v => v.bloodPressureSystolic && v.bloodPressureDiastolic);
                  const validOlder = olderVitals.filter(v => v.bloodPressureSystolic && v.bloodPressureDiastolic);
                  if (validRecent.length === 0 || validOlder.length === 0) return 'No data';
                  const recentAvg = validRecent.reduce((sum, v) => sum + (v.bloodPressureSystolic || 0), 0) / validRecent.length;
                  const olderAvg = validOlder.reduce((sum, v) => sum + (v.bloodPressureSystolic || 0), 0) / validOlder.length;
                  const diff = recentAvg - olderAvg;
                  if (diff < -5) return 'Improving';
                  if (diff > 5) return 'Rising';
                  return 'Stable';
                })()}
              </p>
              <p className="text-xs mt-1">
                {(() => {
                  const recentVitals = filteredVitals.slice(-7);
                  const olderVitals = filteredVitals.slice(-14, -7);
                  const validRecent = recentVitals.filter(v => v.bloodPressureSystolic && v.bloodPressureDiastolic);
                  const validOlder = olderVitals.filter(v => v.bloodPressureSystolic && v.bloodPressureDiastolic);
                  if (validRecent.length === 0 || validOlder.length === 0) return 'Need more data';
                  const recentAvg = validRecent.reduce((sum, v) => sum + (v.bloodPressureSystolic || 0), 0) / validRecent.length;
                  const olderAvg = validOlder.reduce((sum, v) => sum + (v.bloodPressureSystolic || 0), 0) / validOlder.length;
                  const diff = recentAvg - olderAvg;
                  return `${diff > 0 ? '+' : ''}${diff.toFixed(0)} mmHg vs last week`;
                })()}
              </p>
            </div>
            <TrendingUp className={`h-8 w-8 ${(() => {
              const recentVitals = filteredVitals.slice(-7);
              const olderVitals = filteredVitals.slice(-14, -7);
              const validRecent = recentVitals.filter(v => v.bloodPressureSystolic && v.bloodPressureDiastolic);
              const validOlder = olderVitals.filter(v => v.bloodPressureSystolic && v.bloodPressureDiastolic);
              if (validRecent.length === 0 || validOlder.length === 0) return 'text-gray-500';
              const recentAvg = validRecent.reduce((sum, v) => sum + (v.bloodPressureSystolic || 0), 0) / validRecent.length;
              const olderAvg = validOlder.reduce((sum, v) => sum + (v.bloodPressureSystolic || 0), 0) / validOlder.length;
              const diff = recentAvg - olderAvg;
              return diff < -5 ? 'text-green-400' : diff > 5 ? 'text-red-400' : 'text-yellow-400';
            })()}`} />
          </div>
        </GlassCard>
      )}

      {/* NEW: Hydration Goal Tracker */}
      {filteredLatest?.hydrationStatus && (
        <GlassCard>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-bold mb-2">Daily Hydration Goal</p>
              <div className="w-full bg-gray-700 rounded-full h-4">
                <div
                  className={`h-4 rounded-full transition-all ${
                    filteredLatest.hydrationStatus >= 70 ? 'bg-green-500' :
                    filteredLatest.hydrationStatus >= 50 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(filteredLatest.hydrationStatus, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs mt-2">
                {filteredLatest.hydrationStatus}% of recommended daily intake
              </p>
            </div>
            <div className="ml-4 text-right">
              <p className="text-3xl font-bold font-bold">{filteredLatest.hydrationStatus}%</p>
              <p className={`text-xs font-bold px-3 py-1 rounded-full mt-1 ${
                filteredLatest.hydrationStatus >= 70 ? 'bg-green-500 text-white' :
                filteredLatest.hydrationStatus >= 50 ? 'bg-yellow-500 text-black' :
                'bg-red-500 text-white'
              }`}>
                {filteredLatest.hydrationStatus >= 70 ? 'Well Hydrated' :
                 filteredLatest.hydrationStatus >= 50 ? 'Moderate' :
                 'Dehydrated'}
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* NEW: Average Body Temperature */}
      {filteredVitals.length > 0 && filteredVitals.filter(v => v.temperature).length > 0 && (
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1">Average Body Temperature</p>
              <p className={`text-3xl font-bold ${(() => {
                const temps = filteredVitals.filter(v => v.temperature).map(v => v.temperature!);
                const avg = temps.reduce((sum, t) => sum + t, 0) / temps.length;
                if (avg >= 99.5) return 'text-red-400';
                if (avg >= 98.0 && avg <= 99.0) return 'text-green-400';
                return 'text-yellow-400';
              })()}`}>
                {(() => {
                  const temps = filteredVitals.filter(v => v.temperature).map(v => v.temperature!);
                  const avg = temps.reduce((sum, t) => sum + t, 0) / temps.length;
                  return avg.toFixed(1);
                })()}°F
              </p>
              <p className="text-xs mt-1">
                Based on {filteredVitals.filter(v => v.temperature).length} readings
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Thermometer className={`h-8 w-8 ${(() => {
                const temps = filteredVitals.filter(v => v.temperature).map(v => v.temperature!);
                const avg = temps.reduce((sum, t) => sum + t, 0) / temps.length;
                if (avg >= 99.5) return 'text-red-400';
                if (avg >= 98.0 && avg <= 99.0) return 'text-green-400';
                return 'text-yellow-400';
              })()}`} />
              <div className={`text-xs font-bold px-3 py-1 rounded-full ${(() => {
                const temps = filteredVitals.filter(v => v.temperature).map(v => v.temperature!);
                const avg = temps.reduce((sum, t) => sum + t, 0) / temps.length;
                if (avg >= 99.5) return 'bg-red-500 text-white';
                if (avg >= 98.0 && avg <= 99.0) return 'bg-green-500 text-white';
                return 'bg-yellow-500 text-black';
              })()}`}>
                {(() => {
                  const temps = filteredVitals.filter(v => v.temperature).map(v => v.temperature!);
                  const avg = temps.reduce((sum, t) => sum + t, 0) / temps.length;
                  if (avg >= 99.5) return 'Elevated';
                  if (avg >= 98.0 && avg <= 99.0) return 'Normal';
                  return 'Low';
                })()}
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* NEW: Blood Pressure Variability */}
      {filteredVitals.length >= 3 && filteredVitals.filter(v => v.bloodPressureSystolic).length >= 3 && (
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1">Blood Pressure Variability</p>
              <p className={`text-3xl font-bold ${(() => {
                const readings = filteredVitals.filter(v => v.bloodPressureSystolic).map(v => v.bloodPressureSystolic!);
                const avg = readings.reduce((sum, r) => sum + r, 0) / readings.length;
                const variance = readings.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / readings.length;
                const stdDev = Math.sqrt(variance);
                if (stdDev <= 10) return 'text-green-400';
                if (stdDev <= 15) return 'text-yellow-400';
                return 'text-red-400';
              })()}`}>
                {(() => {
                  const readings = filteredVitals.filter(v => v.bloodPressureSystolic).map(v => v.bloodPressureSystolic!);
                  const avg = readings.reduce((sum, r) => sum + r, 0) / readings.length;
                  const variance = readings.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / readings.length;
                  const stdDev = Math.sqrt(variance);
                  if (stdDev <= 10) return 'Low';
                  if (stdDev <= 15) return 'Moderate';
                  return 'High';
                })()}
              </p>
              <p className="text-xs mt-1">
                {(() => {
                  const readings = filteredVitals.filter(v => v.bloodPressureSystolic).map(v => v.bloodPressureSystolic!);
                  const avg = readings.reduce((sum, r) => sum + r, 0) / readings.length;
                  const variance = readings.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / readings.length;
                  const stdDev = Math.sqrt(variance);
                  return `±${stdDev.toFixed(1)} mmHg variation`;
                })()}
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Activity className={`h-8 w-8 ${(() => {
                const readings = filteredVitals.filter(v => v.bloodPressureSystolic).map(v => v.bloodPressureSystolic!);
                const avg = readings.reduce((sum, r) => sum + r, 0) / readings.length;
                const variance = readings.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / readings.length;
                const stdDev = Math.sqrt(variance);
                if (stdDev <= 10) return 'text-green-400';
                if (stdDev <= 15) return 'text-yellow-400';
                return 'text-red-400';
              })()}`} />
              <div className={`text-xs font-bold px-3 py-1 rounded-full ${(() => {
                const readings = filteredVitals.filter(v => v.bloodPressureSystolic).map(v => v.bloodPressureSystolic!);
                const avg = readings.reduce((sum, r) => sum + r, 0) / readings.length;
                const variance = readings.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / readings.length;
                const stdDev = Math.sqrt(variance);
                if (stdDev <= 10) return 'bg-green-500 text-white';
                if (stdDev <= 15) return 'bg-yellow-500 text-black';
                return 'bg-red-500 text-white';
              })()}`}>
                {(() => {
                  const readings = filteredVitals.filter(v => v.bloodPressureSystolic).map(v => v.bloodPressureSystolic!);
                  const avg = readings.reduce((sum, r) => sum + r, 0) / readings.length;
                  const variance = readings.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / readings.length;
                  const stdDev = Math.sqrt(variance);
                  if (stdDev <= 10) return 'Consistent';
                  if (stdDev <= 15) return 'Variable';
                  return 'Very Variable';
                })()}
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Chart Controls */}
      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedMetric('bp')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedMetric === 'bp' 
                  ? 'bg-blue-500' 
                  : 'glass-button font-bold'
              }`}
            >
              Blood Pressure
            </button>
            <button
              onClick={() => setSelectedMetric('hr')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedMetric === 'hr' 
                  ? 'bg-red-500' 
                  : 'glass-button font-bold'
              }`}
            >
              Heart Rate
            </button>
            <button
              onClick={() => setSelectedMetric('weight')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedMetric === 'weight' 
                  ? 'bg-green-500' 
                  : 'glass-button font-bold'
              }`}
            >
              Weight
            </button>
            <button
              onClick={() => setSelectedMetric('sugar')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedMetric === 'sugar'
                  ? 'bg-orange-500'
                  : 'glass-button font-bold'
              }`}
            >
              Blood Sugar
            </button>
            <button
              onClick={() => setSelectedMetric('temp')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedMetric === 'temp'
                  ? 'bg-orange-600'
                  : 'glass-button font-bold'
              }`}
            >
              Temperature
            </button>
            <button
              onClick={() => setSelectedMetric('hydration')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedMetric === 'hydration'
                  ? 'bg-blue-600'
                  : 'glass-button font-bold'
              }`}
            >
              Hydration
            </button>
            <button
              onClick={() => setSelectedMetric('o2')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedMetric === 'o2'
                  ? 'bg-cyan-500'
                  : 'glass-button font-bold'
              }`}
            >
              O₂ Sat
            </button>
          </div>

          {/* Surgery Date Timeline Info */}
          <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-lg" style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.1))',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            <div className="flex items-center gap-3">
              {surgeryDate ? (
                <>
                  <Calendar className="h-4 w-4 text-blue-400" />
                  <span className="text-xs text-blue-300">
                    <strong>Surgery Date (Day 0):</strong> {format(new Date(surgeryDate), 'MMM dd, yyyy')}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    Timeline: {format(subMonths(new Date(surgeryDate), 1), 'MMM yyyy')} - {format(addMonths(new Date(), 1), 'MMM yyyy')}
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  <span className="text-xs text-yellow-300">
                    No surgery date set - Showing last 3 months
                  </span>
                </>
              )}
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-all hover:bg-blue-500/20"
              style={{ color: 'rgba(96, 165, 250, 1)' }}
              title="Edit surgery date in Profile"
            >
              <Edit className="h-3 w-3" />
              Edit
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="h-96">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {selectedMetric === 'bp' ? (
                <AreaChart data={chartData}>
                  <defs>
                    {/* Enhanced 3D gradients for blood pressure */}
                    <linearGradient id="systolic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f87171" stopOpacity={0.9}/>
                      <stop offset="50%" stopColor="#ef4444" stopOpacity={0.5}/>
                      <stop offset="100%" stopColor="#dc2626" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="diastolic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.9}/>
                      <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.5}/>
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0.1}/>
                    </linearGradient>
                    {/* Glow filter for areas */}
                    <filter id="vitalsAreaGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  {/* Surgery Date Reference Line (Day 0) */}
                  {surgeryDate && (
                    <ReferenceLine
                      x={format(new Date(surgeryDate), 'MMM dd, yyyy')}
                      stroke="#fbbf24"
                      strokeWidth={3}
                      strokeDasharray="5 5"
                      label={{
                        value: 'Surgery (Day 0)',
                        position: 'top',
                        fill: '#fbbf24',
                        fontSize: 12,
                        fontWeight: 'bold'
                      }}
                    />
                  )}
                  <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 10, fontWeight: 600 }} tickLine={{ stroke: '#6b7280' }} angle={-45} textAnchor="end" height={80} />
                  <YAxis domain={[60, 200]} stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }} tickLine={{ stroke: '#6b7280' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))',
                      border: '2px solid #60a5fa',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(96, 165, 250, 0.3)',
                      backdropFilter: 'blur(10px)'
                    }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}
                    cursor={{ fill: 'rgba(96, 165, 250, 0.1)', stroke: '#60a5fa', strokeWidth: 2 }}
                  />
                  <Legend iconType="circle" />
                  <Area
                    type="monotone"
                    dataKey="systolic"
                    stroke="#ef4444"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#systolic)"
                    name="Systolic"
                    filter="url(#vitalsAreaGlow)"
                    dot={{ r: 5, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 7, strokeWidth: 3 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="diastolic"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#diastolic)"
                    name="Diastolic"
                    filter="url(#vitalsAreaGlow)"
                    dot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 7, strokeWidth: 3 }}
                  />

                  {/* Normal Range Reference Lines for Blood Pressure */}
                  <ReferenceLine y={120} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'Normal Systolic (120)', position: 'insideTopRight', fill: '#10b981', fontSize: 11, fontWeight: 'bold' }} />
                  <ReferenceLine y={80} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'Normal Diastolic (80)', position: 'insideBottomRight', fill: '#10b981', fontSize: 11, fontWeight: 'bold' }} />
                </AreaChart>
              ) : (
                <LineChart data={chartData}>
                  <defs>
                    {/* Glow filter for lines */}
                    <filter id="vitalsLineGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }} tickLine={{ stroke: '#6b7280' }} />
                  <YAxis
                    domain={
                      selectedMetric === 'hr' ? [0, 180] :
                      selectedMetric === 'weight' ? [0, 320] :
                      selectedMetric === 'sugar' ? [0, 300] :
                      selectedMetric === 'temp' ? [90, 108] :
                      selectedMetric === 'o2' ? [50, 100] :
                      undefined
                    }
                    stroke="#9ca3af"
                    tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }}
                    tickLine={{ stroke: '#6b7280' }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))',
                      border: '2px solid #60a5fa',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(96, 165, 250, 0.3)',
                      backdropFilter: 'blur(10px)'
                    }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}
                    cursor={{ fill: 'rgba(96, 165, 250, 0.1)', stroke: '#60a5fa', strokeWidth: 2 }}
                  />
                  <Legend iconType="circle" />
                  <Line
                    type="monotone"
                    dataKey={
                      selectedMetric === 'hr' ? 'heartRate' :
                      selectedMetric === 'weight' ? 'weight' :
                      selectedMetric === 'sugar' ? 'bloodSugar' :
                      selectedMetric === 'temp' ? 'temperature' :
                      selectedMetric === 'hydration' ? 'hydration' :
                      'o2'
                    }
                    stroke={
                      selectedMetric === 'hr' ? '#ef4444' :
                      selectedMetric === 'weight' ? '#10b981' :
                      selectedMetric === 'sugar' ? '#f97316' :
                      selectedMetric === 'temp' ? '#ea580c' :
                      selectedMetric === 'hydration' ? '#3b82f6' :
                      '#06b6d4'
                    }
                    strokeWidth={4}
                    dot={{
                      r: 6,
                      strokeWidth: 2,
                      stroke: '#fff',
                      fill: selectedMetric === 'hr' ? '#ef4444' :
                            selectedMetric === 'weight' ? '#10b981' :
                            selectedMetric === 'sugar' ? '#f97316' :
                            selectedMetric === 'temp' ? '#ea580c' :
                            selectedMetric === 'hydration' ? '#3b82f6' :
                            '#06b6d4'
                    }}
                    activeDot={{ r: 9, strokeWidth: 3 }}
                    name={
                      selectedMetric === 'hr' ? 'Heart Rate (bpm)' :
                      selectedMetric === 'weight' ? 'Weight (lbs)' :
                      selectedMetric === 'sugar' ? 'Blood Sugar (mg/dL)' :
                      selectedMetric === 'temp' ? 'Temperature (°F)' :
                      selectedMetric === 'hydration' ? 'Hydration (%)' :
                      'O₂ Saturation (%)'
                    }
                    filter="url(#vitalsLineGlow)"
                  />

                  {/* Normal Range Reference Lines */}
                  {selectedMetric === 'hr' && (
                    <>
                      <ReferenceLine y={60} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'Normal Min (60)', position: 'insideTopRight', fill: '#10b981', fontSize: 11, fontWeight: 'bold' }} />
                      <ReferenceLine y={100} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'Normal Max (100)', position: 'insideBottomRight', fill: '#10b981', fontSize: 11, fontWeight: 'bold' }} />
                    </>
                  )}
                  {selectedMetric === 'sugar' && (
                    <>
                      <ReferenceLine y={70} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'Normal Min (70)', position: 'insideTopRight', fill: '#10b981', fontSize: 11, fontWeight: 'bold' }} />
                      <ReferenceLine y={100} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'Normal Max (100)', position: 'insideBottomRight', fill: '#10b981', fontSize: 11, fontWeight: 'bold' }} />
                    </>
                  )}
                  {selectedMetric === 'temp' && (
                    <ReferenceLine y={98.6} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'Normal (98.6°F)', position: 'insideTopRight', fill: '#10b981', fontSize: 11, fontWeight: 'bold' }} />
                  )}
                  {selectedMetric === 'o2' && (
                    <ReferenceLine y={95} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'Normal Min (95%)', position: 'insideTopRight', fill: '#10b981', fontSize: 11, fontWeight: 'bold' }} />
                  )}
                </LineChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full font-bold">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-3 font-bold" />
                <p>No vitals data available for this period</p>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Recent Vitals Table */}
      <GlassCard>
        <h2 className="text-xl font-semibold font-bold mb-4">Recent Readings</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 text-sm font-medium font-bold">Date</th>
                <th className="text-left py-2 px-2 text-sm font-medium font-bold">BP</th>
                <th className="text-left py-2 px-2 text-sm font-medium font-bold">HR</th>
                <th className="text-left py-2 px-2 text-sm font-medium font-bold">Temp</th>
                <th className="text-left py-2 px-2 text-sm font-medium font-bold">Weight</th>
                <th className="text-left py-2 px-2 text-sm font-medium font-bold">O₂</th>
                <th className="text-left py-2 px-2 text-sm font-medium font-bold">Sugar</th>
                <th className="text-left py-2 px-2 text-sm font-medium font-bold">Hydration</th>
                <th className="text-left py-2 px-2 text-sm font-medium font-bold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {vitals.slice(-10).reverse().map((vital) => (
                <tr key={vital.id} className="border-b border-gray-100 hover:bg-white/30">
                  <td className="py-2 px-2 text-sm">
                    {format(new Date(vital.timestamp), 'MMM d, h:mm a')}
                  </td>
                  <td className="py-2 px-2 text-sm">
                    {vital.bloodPressureSystolic && vital.bloodPressureDiastolic
                      ? `${vital.bloodPressureSystolic}/${vital.bloodPressureDiastolic}`
                      : '--'}
                  </td>
                  <td className="py-2 px-2 text-sm">{vital.heartRate || '--'}</td>
                  <td className="py-2 px-2 text-sm">{vital.temperature ? `${vital.temperature.toFixed(1)}°F` : '--'}</td>
                  <td className="py-2 px-2 text-sm">{vital.weight || '--'}</td>
                  <td className="py-2 px-2 text-sm">{vital.oxygenSaturation ? `${vital.oxygenSaturation}%` : '--'}</td>
                  <td className="py-2 px-2 text-sm">{vital.bloodSugar || '--'}</td>
                  <td className="py-2 px-2 text-sm">{vital.hydrationStatus ? `${vital.hydrationStatus}%` : '--'}</td>
                  <td className="py-2 px-2 text-sm font-bold">{vital.notes || '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {vitals.length === 0 && (
            <p className="text-center py-8 font-bold">No vitals recorded yet</p>
          )}
        </div>
      </GlassCard>

        </>
      )}

      {/* WEIGHT JOURNAL TAB */}
      {activeTab === 'weight' && (
        <div className="space-y-6">
          {/* Weight Journal Section */}
          <GlassCard className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 opacity-10" style={{
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.5) 0%, transparent 70%)'
            }}></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Weight className="h-7 w-7 text-blue-400" />
                    Weight Tracking Journal
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">Monitor your weight trends and changes over time</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Log Weight
                </Button>
              </div>

              {/* Weight Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-xl" style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.1))',
                  border: '1px solid rgba(59, 130, 246, 0.2)'
                }}>
                  <p className="text-xs text-blue-300 font-semibold mb-1">CURRENT WEIGHT</p>
                  <p className="text-3xl font-bold text-white">
                    {latestVitals?.weight || '--'} <span className="text-lg text-gray-400">lbs</span>
                  </p>
                </div>

                <div className="p-4 rounded-xl" style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))',
                  border: '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                  <p className="text-xs text-green-300 font-semibold mb-1">7-DAY CHANGE</p>
                  <p className="text-3xl font-bold text-white">
                    {(() => {
                      if (!latestVitals?.weight || vitals.length < 2) return '--';
                      const sevenDaysAgo = subDays(new Date(), 7);
                      const oldWeights = vitals.filter(v => v.weight && new Date(v.timestamp) <= sevenDaysAgo);
                      if (oldWeights.length === 0) return '--';
                      const oldWeight = oldWeights[oldWeights.length - 1].weight!;
                      const change = latestVitals.weight - oldWeight;
                      return `${change > 0 ? '+' : ''}${change.toFixed(1)}`;
                    })()} <span className="text-lg text-gray-400">lbs</span>
                  </p>
                </div>

                <div className="p-4 rounded-xl" style={{
                  background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.1), rgba(249, 115, 22, 0.1))',
                  border: '1px solid rgba(251, 146, 60, 0.2)'
                }}>
                  <p className="text-xs text-orange-300 font-semibold mb-1">30-DAY CHANGE</p>
                  <p className="text-3xl font-bold text-white">
                    {(() => {
                      if (!latestVitals?.weight || vitals.length < 2) return '--';
                      const thirtyDaysAgo = subDays(new Date(), 30);
                      const oldWeights = vitals.filter(v => v.weight && new Date(v.timestamp) <= thirtyDaysAgo);
                      if (oldWeights.length === 0) return '--';
                      const oldWeight = oldWeights[oldWeights.length - 1].weight!;
                      const change = latestVitals.weight - oldWeight;
                      return `${change > 0 ? '+' : ''}${change.toFixed(1)}`;
                    })()} <span className="text-lg text-gray-400">lbs</span>
                  </p>
                </div>

                <div className="p-4 rounded-xl" style={{
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(147, 51, 234, 0.1))',
                  border: '1px solid rgba(168, 85, 247, 0.2)'
                }}>
                  <p className="text-xs text-purple-300 font-semibold mb-1">TOTAL READINGS</p>
                  <p className="text-3xl font-bold text-white">
                    {vitals.filter(v => v.weight).length}
                  </p>
                </div>
              </div>

              {/* Weight Chart */}
              <div className="h-96">
                {vitals.filter(v => v.weight).length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <defs>
                        <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="#059669" stopOpacity={0.1}/>
                        </linearGradient>
                        <filter id="weightGlow">
                          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                      <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }} />
                      <YAxis domain={[0, 320]} stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }} />
                      <Tooltip
                        contentStyle={{
                          background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))',
                          border: '2px solid #10b981',
                          borderRadius: '12px',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                          backdropFilter: 'blur(10px)'
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="#10b981"
                        strokeWidth={4}
                        fill="url(#weightGradient)"
                        dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 9, strokeWidth: 3 }}
                        name="Weight (lbs)"
                        filter="url(#weightGlow)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <Weight className="h-16 w-16 mx-auto mb-4 opacity-30" />
                      <p className="text-lg">No weight data recorded yet</p>
                      <p className="text-sm mt-2">Start logging your weight to see trends</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Weight History Table */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Weight History</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Date</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Weight</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Change</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vitals.filter(v => v.weight).slice(-20).reverse().map((vital, index, arr) => {
                        const prevWeight = arr[index + 1]?.weight;
                        const change = prevWeight ? vital.weight! - prevWeight : 0;
                        return (
                          <tr key={vital.id} className="border-b border-gray-800 hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4 text-sm">{format(new Date(vital.timestamp), 'MMM d, yyyy h:mm a')}</td>
                            <td className="py-3 px-4 text-sm font-semibold">{vital.weight} lbs</td>
                            <td className="py-3 px-4 text-sm">
                              {prevWeight ? (
                                <span className={change > 0 ? 'text-yellow-400' : change < 0 ? 'text-green-400' : 'text-gray-400'}>
                                  {change > 0 ? '+' : ''}{change.toFixed(1)} lbs
                                </span>
                              ) : (
                                <span className="text-gray-600">--</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-400">{vital.notes || '--'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* GLUCOSE JOURNAL TAB */}
      {activeTab === 'glucose' && (
        <div className="space-y-6">
          {/* Glucose Journal Section */}
          <GlassCard className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 opacity-10" style={{
              background: 'radial-gradient(circle, rgba(239, 68, 68, 0.5) 0%, transparent 70%)'
            }}></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Droplet className="h-7 w-7 text-red-400" />
                    Blood Glucose Journal
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">Track your blood sugar levels throughout the day</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Log Glucose
                </Button>
              </div>

              {/* Glucose Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-xl" style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1))',
                  border: '1px solid rgba(239, 68, 68, 0.2)'
                }}>
                  <p className="text-xs text-red-300 font-semibold mb-1">LATEST READING</p>
                  <p className="text-3xl font-bold text-white">
                    {latestVitals?.bloodSugar || '--'} <span className="text-lg text-gray-400">mg/dL</span>
                  </p>
                  <p className={`text-xs mt-1 font-semibold ${
                    !latestVitals?.bloodSugar ? 'text-gray-400' :
                    latestVitals.bloodSugar < 100 ? 'text-green-400' :
                    latestVitals.bloodSugar < 126 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {!latestVitals?.bloodSugar ? 'No data' :
                     latestVitals.bloodSugar < 100 ? '✓ Normal' :
                     latestVitals.bloodSugar < 126 ? '⚠ Pre-diabetic' : '🚨 High'}
                  </p>
                </div>

                <div className="p-4 rounded-xl" style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.1))',
                  border: '1px solid rgba(59, 130, 246, 0.2)'
                }}>
                  <p className="text-xs text-blue-300 font-semibold mb-1">7-DAY AVERAGE</p>
                  <p className="text-3xl font-bold text-white">
                    {(() => {
                      const recent = vitals.filter(v => v.bloodSugar).slice(-7);
                      if (recent.length === 0) return '--';
                      const avg = recent.reduce((sum, v) => sum + (v.bloodSugar || 0), 0) / recent.length;
                      return Math.round(avg);
                    })()} <span className="text-lg text-gray-400">mg/dL</span>
                  </p>
                </div>

                <div className="p-4 rounded-xl" style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(21, 128, 61, 0.1))',
                  border: '1px solid rgba(34, 197, 94, 0.2)'
                }}>
                  <p className="text-xs text-green-300 font-semibold mb-1">IN RANGE (70-100)</p>
                  <p className="text-3xl font-bold text-white">
                    {(() => {
                      const total = vitals.filter(v => v.bloodSugar).length;
                      if (total === 0) return '--';
                      const inRange = vitals.filter(v => v.bloodSugar && v.bloodSugar >= 70 && v.bloodSugar < 100).length;
                      return Math.round((inRange / total) * 100);
                    })()} <span className="text-lg text-gray-400">%</span>
                  </p>
                </div>

                <div className="p-4 rounded-xl" style={{
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(147, 51, 234, 0.1))',
                  border: '1px solid rgba(168, 85, 247, 0.2)'
                }}>
                  <p className="text-xs text-purple-300 font-semibold mb-1">TOTAL READINGS</p>
                  <p className="text-3xl font-bold text-white">
                    {vitals.filter(v => v.bloodSugar).length}
                  </p>
                </div>
              </div>

              {/* Glucose Chart */}
              <div className="h-96">
                {vitals.filter(v => v.bloodSugar).length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <defs>
                        <linearGradient id="glucoseGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f97316" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="#ea580c" stopOpacity={0.1}/>
                        </linearGradient>
                        <filter id="glucoseGlow">
                          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                      <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }} />
                      <YAxis domain={[0, 300]} stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }} />
                      <Tooltip
                        contentStyle={{
                          background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))',
                          border: '2px solid #f97316',
                          borderRadius: '12px',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                          backdropFilter: 'blur(10px)'
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="bloodSugar"
                        stroke="#f97316"
                        strokeWidth={4}
                        fill="url(#glucoseGradient)"
                        dot={{ r: 6, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 9, strokeWidth: 3 }}
                        name="Blood Sugar (mg/dL)"
                        filter="url(#glucoseGlow)"
                      />

                      {/* Normal Range Reference Lines for Glucose */}
                      <ReferenceLine y={70} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'Normal Min (70)', position: 'insideTopRight', fill: '#10b981', fontSize: 11, fontWeight: 'bold' }} />
                      <ReferenceLine y={100} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'Normal Max (100)', position: 'insideBottomRight', fill: '#10b981', fontSize: 11, fontWeight: 'bold' }} />
                      <ReferenceLine y={126} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'Pre-diabetic (126)', position: 'insideBottomRight', fill: '#ef4444', fontSize: 11, fontWeight: 'bold' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <Droplet className="h-16 w-16 mx-auto mb-4 opacity-30" />
                      <p className="text-lg">No glucose data recorded yet</p>
                      <p className="text-sm mt-2">Start logging your blood sugar levels</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Glucose History Table */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Glucose History</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Date</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Glucose</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vitals.filter(v => v.bloodSugar).slice(-20).reverse().map((vital) => (
                        <tr key={vital.id} className="border-b border-gray-800 hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4 text-sm">{format(new Date(vital.timestamp), 'MMM d, yyyy h:mm a')}</td>
                          <td className="py-3 px-4 text-sm font-semibold">{vital.bloodSugar} mg/dL</td>
                          <td className="py-3 px-4 text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              vital.bloodSugar! < 100 ? 'bg-green-500/20 text-green-400' :
                              vital.bloodSugar! < 126 ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {vital.bloodSugar! < 100 ? 'Normal' :
                               vital.bloodSugar! < 126 ? 'Pre-diabetic' : 'High'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-400">{vital.notes || '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* MEDICAL TESTS TAB */}
      {activeTab === 'medical' && (
        <div className="space-y-6">
          {/* Medical Provider Tests Section */}
          <GlassCard className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 opacity-10" style={{
              background: 'radial-gradient(circle, rgba(99, 102, 241, 0.5) 0%, transparent 70%)'
            }}></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Heart className="h-7 w-7 text-purple-400" />
                    Advanced Cardiac Metrics
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">Medical provider test results and clinical measurements</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Test Results
                </Button>
              </div>

              {/* Coming Soon Placeholder */}
              <div className="p-12 text-center">
                <div className="inline-block p-6 rounded-2xl mb-6" style={{
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))',
                  border: '2px solid rgba(99, 102, 241, 0.3)',
                  boxShadow: '0 0 40px rgba(99, 102, 241, 0.2)'
                }}>
                  <Activity className="h-16 w-16 text-purple-400 mx-auto" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Advanced Cardiac Metrics Section</h3>
                <p className="text-gray-400 max-w-2xl mx-auto mb-6">
                  This section will display professional medical test results including:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto text-left">
                  <div className="p-4 rounded-xl" style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-400" />
                      Treadmill Stress Tests
                    </h4>
                    <p className="text-sm text-gray-400">Exercise capacity, heart rate response, blood pressure during exercise</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                      <Wind className="h-5 w-5 text-cyan-400" />
                      Spirometry / Breathing Tests
                    </h4>
                    <p className="text-sm text-gray-400">Lung function, FEV1, FVC, breathing capacity measurements</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                      <Heart className="h-5 w-5 text-red-400" />
                      ECG / EKG Results
                    </h4>
                    <p className="text-sm text-gray-400">Electrical activity of the heart, rhythm analysis, QT interval</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                      <Activity className="h-5 w-5 text-purple-400" />
                      Clinical Lab Work
                    </h4>
                    <p className="text-sm text-gray-400">Blood panels, cardiac biomarkers, BNP, troponin levels</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-8">
                  Manual data entry interface for healthcare provider test results
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Record Vitals Modal - Available for all tabs */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          reset();
        }}
        title="Record Vitals"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Historical Data Entry - Date/Time Picker */}
          <div className="p-4 rounded-lg" style={{
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.1))',
            border: '2px solid rgba(251, 191, 36, 0.3)'
          }}>
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="h-5 w-5 text-yellow-400" />
              <h3 className="font-bold text-yellow-400">📅 Date & Time (for historical data)</h3>
            </div>
            <Input
              label="Recording Date & Time"
              type="datetime-local"
              {...register('timestamp')}
              defaultValue={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
              icon={<Calendar className="h-5 w-5" />}
            />
            <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
              💡 Tip: Change this date to log historical vitals data from past days (e.g., backfilling data since surgery)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h3 className="font-medium font-bold">Blood Pressure</h3>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Systolic"
                  type="number"
                  placeholder="120"
                  {...register('bloodPressureSystolic', { valueAsNumber: true })}
                />
                <Input
                  label="Diastolic"
                  type="number"
                  placeholder="80"
                  {...register('bloodPressureDiastolic', { valueAsNumber: true })}
                />
              </div>

              <Input
                label="Heart Rate (bpm)"
                type="number"
                placeholder="60-100"
                icon={<Heart className="h-5 w-5" />}
                {...register('heartRate', { valueAsNumber: true })}
              />

              <Input
                label="Weight (lbs)"
                type="number"
                step="0.1"
                placeholder="Enter weight"
                icon={<Weight className="h-5 w-5" />}
                {...register('weight', { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-4">
              <h3 className="font-medium font-bold">Other Metrics</h3>

              <Input
                label="Temperature (°F)"
                type="number"
                step="0.1"
                placeholder="98.6"
                icon={<Thermometer className="h-5 w-5" />}
                {...register('temperature', { valueAsNumber: true })}
              />

              <Input
                label="O₂ Saturation (%)"
                type="number"
                placeholder="95-100"
                icon={<Wind className="h-5 w-5" />}
                {...register('oxygenSaturation', { valueAsNumber: true })}
              />

              <Input
                label="Blood Sugar (mg/dL)"
                type="number"
                placeholder="70-100"
                icon={<Droplet className="h-5 w-5" />}
                {...register('bloodSugar', { valueAsNumber: true })}
              />

              <Input
                label="Hydration Status (%)"
                type="number"
                placeholder="0-100"
                icon={<Droplet className="h-5 w-5" />}
                {...register('hydrationStatus', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium font-bold">
              Symptoms (optional)
            </label>
            <textarea
              className="glass-input"
              rows={2}
              placeholder="Any symptoms to note?"
              {...register('symptoms')}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium font-bold">
              Notes (optional)
            </label>
            <textarea
              className="glass-input"
              rows={2}
              placeholder="Additional notes"
              {...register('notes')}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="medicationsTaken"
              className="rounded border-gray-300"
              {...register('medicationsTaken')}
            />
            <label htmlFor="medicationsTaken" className="text-sm font-bold">
              Medications taken as prescribed
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isLoading}>
              Record Vitals
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
