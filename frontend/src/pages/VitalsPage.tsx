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
  AlertCircle,
  Edit,
  Trash2,
  X
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea, ComposedChart } from 'recharts';
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
  peakFlow: z.number().optional(),
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
  const [selectedMetric, setSelectedMetric] = useState<'bp' | 'hr' | 'weight' | 'sugar' | 'temp' | 'hydration' | 'o2' | 'peakflow' | 'map' | 'bpvariability'>('bp');
  const [patientData, setPatientData] = useState<Patient | null>(null);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null); // User ID, not patient ID
  const [hawkAlerts, setHawkAlerts] = useState<any[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<number[]>([]);

  // NEW: Garmin 3000 Cockpit Features
  const [selectedDevice, setSelectedDevice] = useState<'all' | 'samsung' | 'polar'>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'weight' | 'glucose' | 'pulse' | 'medical'>('overview');

  // Time period selections for Weight and Glucose journals
  const [weightTimePeriod, setWeightTimePeriod] = useState<'7d' | '30d' | 'surgery'>('7d');
  const [glucoseTimePeriod, setGlucoseTimePeriod] = useState<'7d' | '30d' | 'surgery'>('7d');
  const [pulseTimePeriod, setPulseTimePeriod] = useState<'7d' | '30d' | 'surgery'>('7d');

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
        if (selectedUserId) {
          // Admin/Therapist viewing a specific patient
          const selectedPatient = allPatients.find(p => p.userId === selectedUserId);
          if (selectedPatient) {
            setPatientData(selectedPatient);
            console.log('[VitalsPage] Selected patient:', selectedPatient.name, 'userId:', selectedUserId);
          }
        } else {
          // Loading own patient profile
          const result = await api.checkPatientProfile();
          if (result.hasProfile && result.patient) {
            setPatientData(result.patient);
            console.log('[VitalsPage] Loaded own patient profile');
          }
        }
      } catch (error) {
        console.error('Failed to load patient data:', error);
      }
    };

    if (user) {
      loadPatientData();
    }
  }, [user, selectedUserId, allPatients]);

  // Load all patients if user is admin/therapist
  useEffect(() => {
    const loadAllPatients = async () => {
      if (user?.role === 'admin' || user?.role === 'therapist') {
        try {
          const response = await api.getPatients();
          const patientsList = response.data || response;
          setAllPatients(patientsList);
          console.log('[VitalsPage] Loaded patients for selection:', patientsList.length);
          console.log('[VitalsPage] Patient data:', patientsList.map(p => ({
            id: p.id,
            userId: p.userId,
            name: p.name
          })));
        } catch (error) {
          console.error('Failed to load patients list:', error);
        }
      }
    };

    loadAllPatients();
  }, [user?.role]);

  // Determine surgery date from patient profile first, fall back to user
  const surgeryDate = patientData?.surgeryDate || user?.surgeryDate;

  useEffect(() => {
    loadVitals();
  }, [surgeryDate, selectedUserId]); // Reload when surgery date or selected user changes

  // Load Hawk Alerts
  useEffect(() => {
    const loadHawkAlerts = async () => {
      try {
        const response = await api.getHawkAlerts();
        setHawkAlerts(response.alerts || []);
      } catch (error) {
        console.error('Failed to load Hawk Alerts:', error);
      }
    };

    loadHawkAlerts();
  }, [vitals]); // Reload when vitals change

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
      console.log('[VitalsPage] Fetching vitals for userId:', selectedUserId || user?.id);
      const vitalsData = await api.getVitals({
        startDate,
        endDate,
        userId: selectedUserId || undefined
      });
      console.log('[VitalsPage] Fetched', vitalsData.length, 'vitals records');

      // Sort chronologically: oldest (left) to newest (right)
      const sortedData = vitalsData.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setVitals(sortedData);

      // Handle latest vital separately - 404 is OK (means no vitals yet)
      try {
        const latest = await api.getLatestVital(selectedUserId || undefined);
        setLatestVitals(latest);
        console.log('[VitalsPage] Latest vital:', latest ? 'found' : 'none');
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

  const handleDeleteWeightEntry = async (vitalId: number) => {
    // Confirm deletion
    const confirmDelete = window.confirm('Are you sure you want to delete this weight entry? This action cannot be undone.');

    if (!confirmDelete) {
      return;
    }

    try {
      await api.deleteVital(vitalId);
      toast.success('Weight entry deleted successfully');

      // Reload vitals data to reflect the deletion
      await loadVitals();
    } catch (error) {
      console.error('Failed to delete weight entry:', error);
      toast.error('Failed to delete weight entry');
    }
  };

  const handleDeleteGlucoseEntry = async (vitalId: number) => {
    // Confirm deletion
    const confirmDelete = window.confirm('Are you sure you want to delete this glucose entry? This action cannot be undone.');

    if (!confirmDelete) {
      return;
    }

    try {
      await api.deleteVital(vitalId);
      toast.success('Glucose entry deleted successfully');

      // Reload vitals data to reflect the deletion
      await loadVitals();
    } catch (error) {
      console.error('Failed to delete glucose entry:', error);
      toast.error('Failed to delete glucose entry');
    }
  };

  const handleDeletePulseEntry = async (vitalId: number) => {
    // Confirm deletion
    const confirmDelete = window.confirm('Are you sure you want to delete this heart rate entry? This action cannot be undone.');

    if (!confirmDelete) {
      return;
    }

    try {
      await api.deleteVital(vitalId);
      toast.success('Heart rate entry deleted successfully');

      // Reload vitals data to reflect the deletion
      await loadVitals();
    } catch (error) {
      console.error('Failed to delete heart rate entry:', error);
      toast.error('Failed to delete heart rate entry');
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

  // Helper function to filter vitals by time period
  const getTimePeriodFilter = (period: '7d' | '30d' | 'surgery') => {
    const now = new Date();
    let cutoffDate: Date;

    if (period === '7d') {
      cutoffDate = subDays(now, 7);
    } else if (period === '30d') {
      cutoffDate = subDays(now, 30);
    } else {
      // 'surgery' - up to 90 days from surgery date
      if (surgeryDate) {
        const surgeryDateObj = new Date(surgeryDate);
        const ninetyDaysAfterSurgery = addDays(surgeryDateObj, 90);
        // Use surgery date as cutoff, but cap at 90 days
        cutoffDate = surgeryDateObj;
        // Only show data up to 90 days after surgery
        if (now > ninetyDaysAfterSurgery) {
          return (v: VitalsSample) => {
            const vDate = new Date(v.timestamp);
            return vDate >= cutoffDate && vDate <= ninetyDaysAfterSurgery;
          };
        }
      } else {
        // Fallback to 90 days if no surgery date
        cutoffDate = subDays(now, 90);
      }
    }

    return (v: VitalsSample) => new Date(v.timestamp) >= cutoffDate;
  };

  // Filter weight data by selected time period
  const weightTimePeriodFilter = getTimePeriodFilter(weightTimePeriod);
  const filteredWeightVitals = vitals.filter(v => v.weight && weightTimePeriodFilter(v));

  // Filter glucose data by selected time period
  const glucoseTimePeriodFilter = getTimePeriodFilter(glucoseTimePeriod);
  const filteredGlucoseVitals = vitals.filter(v => v.bloodSugar && glucoseTimePeriodFilter(v));

  // Filter pulse/heart rate data by selected time period
  const pulseTimePeriodFilter = getTimePeriodFilter(pulseTimePeriod);
  const filteredPulseVitals = vitals.filter(v => v.heartRate && pulseTimePeriodFilter(v));

  // Prepare chart data for Weight Journal with BMI and ideal weight calculations
  const weightChartData = filteredWeightVitals.map(v => {
    const date = format(new Date(v.timestamp), 'MMM dd');
    const actualWeight = v.weight!;

    let bmi: number | undefined;
    let idealWeight: number | undefined;

    if (patientData?.height) {
      // Convert height to meters
      let heightInMeters: number;
      if (patientData.heightUnit === 'cm') {
        heightInMeters = patientData.height / 100;
      } else {
        // Assume inches
        heightInMeters = patientData.height * 0.0254;
      }

      // Convert weight to kg
      let weightInKg: number;
      if (patientData.weightUnit === 'kg') {
        weightInKg = actualWeight;
      } else {
        // Assume lbs
        weightInKg = actualWeight * 0.453592;
      }

      // Calculate BMI = weight(kg) / height(m)^2
      bmi = weightInKg / (heightInMeters * heightInMeters);

      // Calculate ideal weight at BMI 22.5 (middle of healthy range)
      const idealWeightKg = 22.5 * (heightInMeters * heightInMeters);

      // Convert ideal weight back to user's preferred unit
      if (patientData.weightUnit === 'kg') {
        idealWeight = idealWeightKg;
      } else {
        idealWeight = idealWeightKg / 0.453592; // Convert to lbs
      }
    }

    return {
      date,
      weight: actualWeight,
      bmi: bmi ? parseFloat(bmi.toFixed(1)) : undefined,
      idealWeight: idealWeight ? parseFloat(idealWeight.toFixed(1)) : undefined
    };
  });

  // Prepare chart data for Glucose Journal
  const glucoseChartData = filteredGlucoseVitals.map(v => ({
    date: format(new Date(v.timestamp), 'MMM dd'),
    bloodSugar: v.bloodSugar
  }));

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

    // Calculate MAP if BP data exists
    const map = (v.bloodPressureSystolic && v.bloodPressureDiastolic)
      ? Math.round((v.bloodPressureSystolic + 2 * v.bloodPressureDiastolic) / 3)
      : undefined;

    // Calculate BP Variability (rolling standard deviation over last 7 readings)
    let bpVariability: number | undefined = undefined;
    if (v.bloodPressureSystolic) {
      const idx = filteredVitals.indexOf(v);
      const startIdx = Math.max(0, idx - 6);
      const recentReadings = filteredVitals
        .slice(startIdx, idx + 1)
        .filter(rv => rv.bloodPressureSystolic)
        .map(rv => rv.bloodPressureSystolic!);

      if (recentReadings.length >= 3) {
        const avg = recentReadings.reduce((sum, r) => sum + r, 0) / recentReadings.length;
        const variance = recentReadings.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / recentReadings.length;
        bpVariability = Math.round(Math.sqrt(variance) * 10) / 10; // Round to 1 decimal
      }
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
      peakFlow: v.peakFlow,
      map: map,
      bpVariability: bpVariability,
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

      {/* HAWK ALERT BANNER */}
      {hawkAlerts.length > 0 && (
        <div className="space-y-3">
          {hawkAlerts.map((alert, index) => {
            // Skip if dismissed
            if (dismissedAlerts.includes(index)) return null;

            const severityColor = alert.severity === 'danger' ? '#ef4444' : '#f59e0b';
            const severityBg = alert.severity === 'danger'
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.15))'
              : 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.15))';
            const severityBorder = alert.severity === 'danger' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)';
            const icon = alert.severity === 'danger' ? '🚨' : '⚠️';

            return (
              <div
                key={index}
                className="relative overflow-hidden rounded-2xl p-6"
                style={{
                  background: severityBg,
                  border: `2px solid ${severityBorder}`,
                  boxShadow: `0 0 30px ${severityColor}20`,
                }}
              >
                {/* Dismiss Button */}
                <button
                  onClick={() => setDismissedAlerts([...dismissedAlerts, index])}
                  className="absolute top-4 right-4 p-2 rounded-lg transition-all hover:bg-white/10"
                  title="Dismiss alert"
                >
                  <X className="h-5 w-5 text-gray-400 hover:text-white" />
                </button>

                <div className="flex items-start gap-4">
                  {/* Hawk Icon */}
                  <div className="flex-shrink-0 text-5xl">
                    🦅
                  </div>

                  {/* Alert Content */}
                  <div className="flex-1 pr-8">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{icon}</span>
                      <h3 className="text-xl font-bold text-white">
                        {alert.message}
                      </h3>
                      <span
                        className="px-3 py-1 rounded-full text-xs font-bold uppercase"
                        style={{
                          backgroundColor: severityColor + '40',
                          color: severityColor,
                          border: `1px solid ${severityColor}`,
                        }}
                      >
                        {alert.severity}
                      </span>
                    </div>

                    {/* Medication Names */}
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-gray-300 mb-1">Medications Involved:</p>
                      <div className="flex flex-wrap gap-2">
                        {alert.medicationNames.map((med: string, i: number) => (
                          <span
                            key={i}
                            className="px-3 py-1 rounded-lg text-sm font-semibold"
                            style={{
                              backgroundColor: 'rgba(59, 130, 246, 0.2)',
                              color: '#93c5fd',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                            }}
                          >
                            {med}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Recommendation */}
                    <p className="text-gray-200 mb-4 leading-relaxed">
                      {alert.recommendation}
                    </p>

                    {/* Action Button */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => navigate('/medications')}
                        className="px-4 py-2 rounded-lg font-semibold text-sm transition-all"
                        style={{
                          backgroundColor: 'rgba(59, 130, 246, 0.2)',
                          color: '#93c5fd',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                        }}
                      >
                        Review Medications
                      </button>
                      <span className="text-xs text-gray-400 self-center">
                        Detected: {new Date(alert.detectedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
          <div className="relative flex items-start justify-between mb-6">
            {/* Left: Patient Badge + Dropdown (stacked) */}
            <div className="flex flex-col items-center gap-2 z-10">
              {/* Patient Identifier Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full font-semibold text-sm"
                style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2))',
                  border: '2px solid rgba(34, 197, 94, 0.5)',
                  boxShadow: '0 0 15px rgba(34, 197, 94, 0.3)'
                }}>
                <Heart className="h-4 w-4 text-green-400" />
                <span className="text-green-300">
                  {patientData?.name || patientData?.firstName || user?.name || 'Current User'}
                </span>
                <span className="text-green-400/60 ml-1">
                  ({(selectedUserId && selectedUserId !== user?.id) ? 'Patient' : (user?.role === 'therapist' || user?.role === 'admin') ? 'Admin/Therapist' : 'Patient'})
                </span>
              </div>

              {/* Patient Selector - Only for Admin/Therapist */}
              {(user?.role === 'admin' || user?.role === 'therapist') && allPatients.length > 0 && (
                <select
                  value={selectedUserId || 'my-vitals'}
                  onChange={(e) => {
                    const value = e.target.value;
                    console.log('[VitalsPage] Dropdown changed to:', value);
                    if (value === 'my-vitals') {
                      setSelectedUserId(null);
                    } else {
                      const userId = Number(value);
                      const patient = allPatients.find(p => p.userId === userId);
                      console.log('[VitalsPage] Selected patient:', patient?.name, 'userId:', userId);
                      setSelectedUserId(userId);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg font-semibold text-sm border-2 transition-all cursor-pointer"
                  style={{
                    background: 'rgba(31, 41, 55, 0.8)',
                    borderColor: 'rgba(59, 130, 246, 0.5)',
                    color: 'rgb(147, 197, 253)'
                  }}
                >
                  <option value="my-vitals">My Vitals</option>
                  <optgroup label="Patients">
                    {allPatients
                      .filter(p => p.userId) // Only show patients with linked user accounts
                      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                      .map(patient => (
                        <option key={patient.id} value={patient.userId}>
                          {patient.name || `Patient ${patient.id}`}
                        </option>
                      ))}
                  </optgroup>
                </select>
              )}
            </div>

            {/* Center: Title (absolutely positioned to true center) */}
            <div className="absolute left-1/2 top-0 transform -translate-x-1/2 flex items-center gap-4">
              <div className="p-3 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.2))',
                  boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)'
                }}>
                <Activity className="h-8 w-8 text-blue-400" />
              </div>
              <div className="flex flex-col items-center">
                <h1 className="text-3xl font-bold text-white whitespace-nowrap" style={{ textShadow: '0 0 20px rgba(59, 130, 246, 0.5)' }}>
                  Vitals Command Center
                </h1>
                <p className="text-sm text-blue-300/80">Medical-Grade Monitoring System</p>
              </div>
            </div>

            {/* Right: Record Button */}
            <div className="z-10">
              <Button onClick={() => setIsModalOpen(true)} className="group">
                <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                Record Vitals
              </Button>
            </div>
          </div>

          {/* Device Filter Tabs - Garmin Style */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-blue-300/60 text-sm font-semibold">
              <Filter className="h-4 w-4" />
              <span>DEVICE SOURCE</span>
            </div>
            <div className="flex gap-2">
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
          <div className="flex justify-center gap-2 mt-4">
            {[
              { id: 'overview' as const, label: 'Overview', icon: Activity },
              { id: 'weight' as const, label: 'Weight Journal', icon: Weight },
              { id: 'glucose' as const, label: 'Glucose Journal', icon: Droplet },
              { id: 'pulse' as const, label: 'Pulse Monitor', icon: Heart },
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

        {/* NEW: Low Oxygen Alert (SpO2 <90%) */}
        {filteredLatest?.oxygenSaturation && filteredLatest.oxygenSaturation < 90 && (
          <div
            className="relative overflow-hidden rounded-2xl p-6 mb-6"
            style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2))',
              border: '3px solid rgba(239, 68, 68, 0.6)',
              boxShadow: '0 0 40px rgba(239, 68, 68, 0.3)',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 p-3 rounded-full bg-red-500/30 animate-pulse">
                <Wind className="h-7 w-7 text-red-300" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-red-300 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-6 w-6 animate-pulse" />
                  🚨 CRITICAL: Low Oxygen Saturation
                </h3>
                <p className="text-white text-lg mb-4">
                  Current SpO2: <strong className="text-red-300 text-2xl">{filteredLatest.oxygenSaturation}%</strong>
                  <span className="text-red-400 ml-3">(Normal: 95-100%)</span>
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="p-4 rounded-lg bg-red-500/20 border-2 border-red-500/40">
                    <p className="text-base font-bold text-red-200 mb-2">⚠️ IMMEDIATE ACTIONS:</p>
                    <ul className="text-sm text-gray-200 space-y-2">
                      <li>• Sit upright or elevate head of bed</li>
                      <li>• Take slow, deep breaths</li>
                      <li>• Use prescribed oxygen if available</li>
                      <li>• Avoid physical exertion</li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-lg bg-red-600/30 border-2 border-red-500/50">
                    <p className="text-base font-bold text-red-100 mb-2">🚨 CALL 911 IF:</p>
                    <ul className="text-sm text-gray-100 space-y-2 font-semibold">
                      <li>• SpO2 remains below 90% for more than 5 minutes</li>
                      <li>• Experiencing chest pain or pressure</li>
                      <li>• Severe shortness of breath</li>
                      <li>• Confusion or drowsiness</li>
                      <li>• Bluish lips or fingernails</li>
                    </ul>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-4 italic">
                  SpO2 below 90% is a medical emergency for cardiac patients. Do not ignore this warning.
                </p>
              </div>
            </div>
          </div>
        )}

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

        {/* NEW: Peak Flow Meter */}
        {filteredLatest?.peakFlow && (
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
                <p className="text-sm font-bold mb-1">Peak Flow</p>
                <p className="text-2xl font-bold font-bold">
                  {filteredLatest.peakFlow || '--'} <span className="text-sm">L/min</span>
                </p>
                <p className={`text-sm font-bold mt-1 ${
                  !filteredLatest?.peakFlow
                    ? 'text-yellow-500'
                    : filteredLatest.peakFlow < 200
                    ? 'text-red-500'
                    : filteredLatest.peakFlow < 400
                    ? 'text-yellow-500'
                    : filteredLatest.peakFlow < 600
                    ? 'text-green-400'
                    : 'text-cyan-400'
                }`}>
                  {!filteredLatest?.peakFlow
                    ? 'Unknown'
                    : filteredLatest.peakFlow < 200
                    ? 'Critical'
                    : filteredLatest.peakFlow < 400
                    ? 'Low'
                    : filteredLatest.peakFlow < 600
                    ? 'Normal'
                    : 'Excellent'}
                </p>
                <p className="text-xs mt-1">Normal: 400-600 L/min</p>
              </div>
              <Wind className="h-8 w-8 text-green-500" />
            </div>
          </GlassCard>
        )}
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

      {/* NEW: Fever Pattern Detection Alert */}
      {(() => {
        const tempReadings = filteredVitals.filter(v => v.temperature).sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        if (tempReadings.length < 2) return null;

        // Check for consecutive fever readings (>100.4°F)
        let consecutiveFeverCount = 0;
        let maxConsecutive = 0;
        let latestFeverTemp = 0;

        for (let i = 0; i < tempReadings.length; i++) {
          if (tempReadings[i].temperature! >= 100.4) {
            consecutiveFeverCount++;
            latestFeverTemp = tempReadings[i].temperature!;
            maxConsecutive = Math.max(maxConsecutive, consecutiveFeverCount);
          } else {
            consecutiveFeverCount = 0;
          }
        }

        if (maxConsecutive < 2) return null;

        return (
          <div
            className="relative overflow-hidden rounded-2xl p-6 mb-6"
            style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.15))',
              border: '2px solid rgba(239, 68, 68, 0.4)',
              boxShadow: '0 0 30px rgba(239, 68, 68, 0.2)'
            }}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 p-3 rounded-full bg-red-500/20">
                <Thermometer className="h-6 w-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-red-400 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Fever Pattern Detected
                </h3>
                <p className="text-white mb-3">
                  <strong>{maxConsecutive} consecutive readings</strong> above 100.4°F detected.
                  Latest temperature: <strong>{latestFeverTemp.toFixed(1)}°F</strong>
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-sm font-semibold text-red-300 mb-1">⚠️ Action Needed:</p>
                    <ul className="text-xs text-gray-300 space-y-1">
                      <li>• Monitor temperature every 2-4 hours</li>
                      <li>• Stay hydrated</li>
                      <li>• Rest and avoid strenuous activity</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-sm font-semibold text-red-300 mb-1">🚨 Seek Medical Attention If:</p>
                    <ul className="text-xs text-gray-300 space-y-1">
                      <li>• Temperature exceeds 103°F</li>
                      <li>• Fever lasts more than 3 days</li>
                      <li>• Accompanied by chest pain or breathing difficulty</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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

      {/* NEW: Mean Arterial Pressure (MAP) */}
      {(() => {
        // Get latest reading that has BP data (same approach as BP Variability)
        const latestBP = filteredVitals.filter(v => v.bloodPressureSystolic && v.bloodPressureDiastolic).slice(-1)[0];
        if (!latestBP) return null;

        const systolic = latestBP.bloodPressureSystolic!;
        const diastolic = latestBP.bloodPressureDiastolic!;
        const map = Math.round((systolic + 2 * diastolic) / 3);

        return (
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold mb-1">Mean Arterial Pressure (MAP)</p>
                <p className={`text-3xl font-bold ${
                  map < 70 ? 'text-red-400' :
                  map >= 70 && map <= 100 ? 'text-green-400' :
                  map > 100 && map <= 110 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {map}
                  <span className="text-sm ml-1">mmHg</span>
                </p>
                <p className={`text-sm font-bold mt-1 ${
                  map < 70 ? 'text-red-400' :
                  map >= 70 && map <= 100 ? 'text-green-400' :
                  map > 100 && map <= 110 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {map < 70 ? 'Low' :
                   map >= 70 && map <= 100 ? 'Normal' :
                   map > 100 && map <= 110 ? 'Elevated' :
                   'High'}
                </p>
                <p className="text-xs mt-1">Normal: 70-100 mmHg</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Heart className={`h-8 w-8 ${
                  map < 70 || map > 110 ? 'text-red-400' :
                  map >= 70 && map <= 100 ? 'text-green-400' :
                  'text-yellow-400'
                }`} />
                <div className={`text-xs font-bold px-3 py-1 rounded-full ${
                  map < 70 || map > 110 ? 'bg-red-500 text-white' :
                  map >= 70 && map <= 100 ? 'bg-green-500 text-white' :
                  'bg-yellow-500 text-black'
                }`}>
                  MAP
                </div>
              </div>
            </div>
          </GlassCard>
        );
      })()}

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
            <button
              onClick={() => setSelectedMetric('peakflow')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedMetric === 'peakflow'
                  ? 'bg-green-600'
                  : 'glass-button font-bold'
              }`}
            >
              Peak Flow
            </button>
            <button
              onClick={() => setSelectedMetric('map')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedMetric === 'map'
                  ? 'bg-purple-600'
                  : 'glass-button font-bold'
              }`}
            >
              MAP
            </button>
            <button
              onClick={() => setSelectedMetric('bpvariability')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedMetric === 'bpvariability'
                  ? 'bg-pink-600'
                  : 'glass-button font-bold'
              }`}
            >
              BP Variability
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
                      selectedMetric === 'o2' ? [85, 105] :
                      selectedMetric === 'peakflow' ? [0, 850] :
                      selectedMetric === 'map' ? [40, 140] :
                      selectedMetric === 'bpvariability' ? [0, 30] :
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
                      selectedMetric === 'peakflow' ? 'peakFlow' :
                      selectedMetric === 'map' ? 'map' :
                      selectedMetric === 'bpvariability' ? 'bpVariability' :
                      'o2'
                    }
                    stroke={
                      selectedMetric === 'hr' ? '#ef4444' :
                      selectedMetric === 'weight' ? '#10b981' :
                      selectedMetric === 'sugar' ? '#f97316' :
                      selectedMetric === 'temp' ? '#ea580c' :
                      selectedMetric === 'hydration' ? '#3b82f6' :
                      selectedMetric === 'peakflow' ? '#22c55e' :
                      selectedMetric === 'map' ? '#9333ea' :
                      selectedMetric === 'bpvariability' ? '#ec4899' :
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
                            selectedMetric === 'peakflow' ? '#22c55e' :
                            selectedMetric === 'map' ? '#9333ea' :
                            selectedMetric === 'bpvariability' ? '#ec4899' :
                            '#06b6d4'
                    }}
                    activeDot={{ r: 9, strokeWidth: 3 }}
                    name={
                      selectedMetric === 'hr' ? 'Heart Rate (bpm)' :
                      selectedMetric === 'weight' ? 'Weight (lbs)' :
                      selectedMetric === 'sugar' ? 'Blood Sugar (mg/dL)' :
                      selectedMetric === 'temp' ? 'Temperature (°F)' :
                      selectedMetric === 'hydration' ? 'Hydration (%)' :
                      selectedMetric === 'peakflow' ? 'Peak Flow (L/min)' :
                      selectedMetric === 'map' ? 'Mean Arterial Pressure (mmHg)' :
                      selectedMetric === 'bpvariability' ? 'BP Variability (StdDev)' :
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
                  {selectedMetric === 'peakflow' && (
                    <>
                      <ReferenceLine y={400} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'Normal Min (400)', position: 'insideTopRight', fill: '#10b981', fontSize: 11, fontWeight: 'bold' }} />
                      <ReferenceLine y={600} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'Normal Max (600)', position: 'insideBottomRight', fill: '#10b981', fontSize: 11, fontWeight: 'bold' }} />
                    </>
                  )}
                  {selectedMetric === 'map' && (
                    <>
                      <ReferenceLine y={60} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={2} label={{ value: 'Danger Low (60)', position: 'insideTopRight', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
                      <ReferenceLine y={65} stroke="#eab308" strokeDasharray="3 3" strokeWidth={2} label={{ value: 'Moderate Low (65)', position: 'insideTopRight', fill: '#eab308', fontSize: 10, fontWeight: 'bold' }} />
                      <ReferenceLine y={70} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'Normal Min (70)', position: 'insideTopRight', fill: '#10b981', fontSize: 11, fontWeight: 'bold' }} />
                      <ReferenceLine y={100} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'Normal Max (100)', position: 'insideBottomRight', fill: '#10b981', fontSize: 11, fontWeight: 'bold' }} />
                      <ReferenceLine y={110} stroke="#eab308" strokeDasharray="3 3" strokeWidth={2} label={{ value: 'Moderate High (110)', position: 'insideBottomRight', fill: '#eab308', fontSize: 10, fontWeight: 'bold' }} />
                      <ReferenceLine y={120} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={2} label={{ value: 'Danger High (120)', position: 'insideBottomRight', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
                    </>
                  )}
                  {selectedMetric === 'bpvariability' && (
                    <>
                      <ReferenceLine y={10} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'Good (<10)', position: 'insideTopRight', fill: '#10b981', fontSize: 11, fontWeight: 'bold' }} />
                      <ReferenceLine y={15} stroke="#eab308" strokeDasharray="3 3" strokeWidth={2} label={{ value: 'Moderate (15)', position: 'insideBottomRight', fill: '#eab308', fontSize: 10, fontWeight: 'bold' }} />
                      <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={2} label={{ value: 'Danger High (20)', position: 'insideBottomRight', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
                    </>
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
                <th className="text-left py-2 px-2 text-sm font-medium font-bold">Peak Flow</th>
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
                  <td className="py-2 px-2 text-sm">{vital.peakFlow ? `${vital.peakFlow} L/min` : '--'}</td>
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

              {/* Time Period Toggle */}
              <div className="flex justify-center mb-6">
                <div className="inline-flex gap-2 p-1 rounded-xl" style={{
                  background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.8), rgba(17, 24, 39, 0.8))',
                  border: '1px solid rgba(59, 130, 246, 0.3)'
                }}>
                  <button
                    onClick={() => setWeightTimePeriod('7d')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      weightTimePeriod === '7d'
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    7 Days
                  </button>
                  <button
                    onClick={() => setWeightTimePeriod('30d')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      weightTimePeriod === '30d'
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    30 Days
                  </button>
                  <button
                    onClick={() => setWeightTimePeriod('surgery')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      weightTimePeriod === 'surgery'
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Since Surgery
                  </button>
                </div>
              </div>

              {/* Weight Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <div className="p-4 rounded-xl" style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.1))',
                  border: '1px solid rgba(59, 130, 246, 0.2)'
                }}>
                  <p className="text-xs text-blue-300 font-semibold mb-1">CURRENT WEIGHT</p>
                  <p className="text-3xl font-bold text-white">
                    {(() => {
                      // Use latest weight from filtered period, or overall latest if no filtered data
                      const currentWeight = filteredWeightVitals.length > 0
                        ? filteredWeightVitals[filteredWeightVitals.length - 1].weight
                        : latestVitals?.weight;
                      return currentWeight || '--';
                    })()} <span className="text-lg text-gray-400">lbs</span>
                  </p>
                </div>

                <div className="p-4 rounded-xl" style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))',
                  border: '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                  <p className="text-xs text-green-300 font-semibold mb-1">PERIOD CHANGE</p>
                  <p className="text-3xl font-bold text-white">
                    {(() => {
                      if (filteredWeightVitals.length < 2) return '--';
                      const firstWeight = filteredWeightVitals[0].weight!; // Oldest in period
                      const lastWeight = filteredWeightVitals[filteredWeightVitals.length - 1].weight!; // Newest in period
                      const change = lastWeight - firstWeight;
                      return `${change > 0 ? '+' : ''}${change.toFixed(1)}`;
                    })()} <span className="text-lg text-gray-400">lbs</span>
                  </p>
                </div>

                <div className="p-4 rounded-xl" style={{
                  background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.1), rgba(249, 115, 22, 0.1))',
                  border: '1px solid rgba(251, 146, 60, 0.2)'
                }}>
                  <p className="text-xs text-orange-300 font-semibold mb-1">AVERAGE</p>
                  <p className="text-3xl font-bold text-white">
                    {(() => {
                      if (filteredWeightVitals.length === 0) return '--';
                      const avg = filteredWeightVitals.reduce((sum, v) => sum + (v.weight || 0), 0) / filteredWeightVitals.length;
                      return avg.toFixed(1);
                    })()} <span className="text-lg text-gray-400">lbs</span>
                  </p>
                </div>

                <div className="p-4 rounded-xl" style={{
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(147, 51, 234, 0.1))',
                  border: '1px solid rgba(168, 85, 247, 0.2)'
                }}>
                  <p className="text-xs text-purple-300 font-semibold mb-1">PERIOD READINGS</p>
                  <p className="text-3xl font-bold text-white">
                    {filteredWeightVitals.length}
                  </p>
                </div>

                <div className="p-4 rounded-xl" style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(21, 128, 61, 0.1))',
                  border: '1px solid rgba(34, 197, 94, 0.2)'
                }}>
                  <p className="text-xs text-emerald-300 font-semibold mb-1">TREND</p>
                  <p className="text-lg font-bold text-white">
                    {(() => {
                      if (filteredWeightVitals.length < 2) return 'N/A';
                      const firstWeight = filteredWeightVitals[0].weight!; // Oldest in period
                      const lastWeight = filteredWeightVitals[filteredWeightVitals.length - 1].weight!; // Newest in period
                      const change = lastWeight - firstWeight;
                      console.log('[Weight Trend] First:', firstWeight, 'Last:', lastWeight, 'Change:', change);
                      if (Math.abs(change) < 0.5) return 'Stable';
                      return change > 0 ? '↑ Gaining' : '↓ Losing';
                    })()}
                  </p>
                </div>
              </div>

              {/* BMI Metrics */}
              {patientData?.height && filteredWeightVitals.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
                  {/* Current BMI */}
                  <div className="p-3 rounded-xl" style={{
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1))',
                    border: '1px solid rgba(245, 158, 11, 0.2)'
                  }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#f59e0b' }}>CURRENT BMI</p>
                    <p className="text-2xl font-bold text-white">
                      {(() => {
                        const currentWeight = filteredWeightVitals.length > 0
                          ? filteredWeightVitals[filteredWeightVitals.length - 1].weight
                          : latestVitals?.weight;

                        if (!currentWeight || !patientData?.height) return '--';

                        let heightInMeters: number;
                        if (patientData.heightUnit === 'cm') {
                          heightInMeters = patientData.height / 100;
                        } else {
                          heightInMeters = patientData.height * 0.0254;
                        }

                        let weightInKg: number;
                        if (patientData.weightUnit === 'kg') {
                          weightInKg = currentWeight;
                        } else {
                          weightInKg = currentWeight * 0.453592;
                        }

                        const bmi = weightInKg / (heightInMeters * heightInMeters);
                        return bmi.toFixed(1);
                      })()}
                    </p>
                  </div>

                  {/* Period Change BMI */}
                  <div className="p-3 rounded-xl" style={{
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1))',
                    border: '1px solid rgba(245, 158, 11, 0.2)'
                  }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#f59e0b' }}>PERIOD CHANGE</p>
                    <p className="text-2xl font-bold text-white">
                      {(() => {
                        if (filteredWeightVitals.length < 2 || !patientData?.height) return '--';

                        let heightInMeters: number;
                        if (patientData.heightUnit === 'cm') {
                          heightInMeters = patientData.height / 100;
                        } else {
                          heightInMeters = patientData.height * 0.0254;
                        }

                        const firstWeight = filteredWeightVitals[0].weight!;
                        const lastWeight = filteredWeightVitals[filteredWeightVitals.length - 1].weight!;

                        let firstWeightKg = patientData.weightUnit === 'kg' ? firstWeight : firstWeight * 0.453592;
                        let lastWeightKg = patientData.weightUnit === 'kg' ? lastWeight : lastWeight * 0.453592;

                        const firstBMI = firstWeightKg / (heightInMeters * heightInMeters);
                        const lastBMI = lastWeightKg / (heightInMeters * heightInMeters);
                        const change = lastBMI - firstBMI;

                        return `${change > 0 ? '+' : ''}${change.toFixed(1)}`;
                      })()}
                    </p>
                  </div>

                  {/* Average BMI */}
                  <div className="p-3 rounded-xl" style={{
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1))',
                    border: '1px solid rgba(245, 158, 11, 0.2)'
                  }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#f59e0b' }}>AVERAGE</p>
                    <p className="text-2xl font-bold text-white">
                      {(() => {
                        if (filteredWeightVitals.length === 0 || !patientData?.height) return '--';

                        let heightInMeters: number;
                        if (patientData.heightUnit === 'cm') {
                          heightInMeters = patientData.height / 100;
                        } else {
                          heightInMeters = patientData.height * 0.0254;
                        }

                        const avgWeight = filteredWeightVitals.reduce((sum, v) => sum + (v.weight || 0), 0) / filteredWeightVitals.length;

                        let weightInKg: number;
                        if (patientData.weightUnit === 'kg') {
                          weightInKg = avgWeight;
                        } else {
                          weightInKg = avgWeight * 0.453592;
                        }

                        const bmi = weightInKg / (heightInMeters * heightInMeters);
                        return bmi.toFixed(1);
                      })()}
                    </p>
                  </div>

                  {/* Period Readings */}
                  <div className="p-3 rounded-xl" style={{
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1))',
                    border: '1px solid rgba(245, 158, 11, 0.2)'
                  }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#f59e0b' }}>PERIOD READINGS</p>
                    <p className="text-2xl font-bold text-white">
                      {filteredWeightVitals.length}
                    </p>
                  </div>

                  {/* BMI Status */}
                  <div className="p-3 rounded-xl" style={{
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1))',
                    border: '1px solid rgba(245, 158, 11, 0.2)'
                  }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#f59e0b' }}>STATUS</p>
                    <p className="text-lg font-bold text-white">
                      {(() => {
                        const currentWeight = filteredWeightVitals.length > 0
                          ? filteredWeightVitals[filteredWeightVitals.length - 1].weight
                          : latestVitals?.weight;

                        if (!currentWeight || !patientData?.height) return '--';

                        let heightInMeters: number;
                        if (patientData.heightUnit === 'cm') {
                          heightInMeters = patientData.height / 100;
                        } else {
                          heightInMeters = patientData.height * 0.0254;
                        }

                        let weightInKg: number;
                        if (patientData.weightUnit === 'kg') {
                          weightInKg = currentWeight;
                        } else {
                          weightInKg = currentWeight * 0.453592;
                        }

                        const bmi = weightInKg / (heightInMeters * heightInMeters);

                        if (bmi < 18.5) return 'Underweight';
                        if (bmi < 25) return 'Healthy';
                        if (bmi < 30) return 'Overweight';
                        return 'Obese';
                      })()}
                    </p>
                  </div>
                </div>
              )}

              {/* Summary Text */}
              <div className="mb-6 p-4 rounded-xl" style={{
                background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.6), rgba(17, 24, 39, 0.6))',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}>
                <p className="text-sm text-gray-300">
                  {(() => {
                    if (filteredWeightVitals.length === 0) {
                      return `No weight data recorded for ${
                        weightTimePeriod === '7d' ? 'the last 7 days' :
                        weightTimePeriod === '30d' ? 'the last 30 days' :
                        'the period since surgery'
                      }.`;
                    }
                    const firstWeight = filteredWeightVitals[0].weight!; // Oldest in period
                    const lastWeight = filteredWeightVitals[filteredWeightVitals.length - 1].weight!; // Newest in period
                    const change = lastWeight - firstWeight;
                    const avg = filteredWeightVitals.reduce((sum, v) => sum + (v.weight || 0), 0) / filteredWeightVitals.length;
                    const periodName =
                      weightTimePeriod === '7d' ? '7 days' :
                      weightTimePeriod === '30d' ? '30 days' :
                      'since surgery';

                    if (Math.abs(change) < 0.5) {
                      return `Your weight has remained stable over ${periodName} at an average of ${avg.toFixed(1)} lbs with ${filteredWeightVitals.length} readings.`;
                    }
                    const changeVerb = change > 0 ? 'gained' : 'lost';
                    return `You have ${changeVerb} ${Math.abs(change).toFixed(1)} lbs over ${periodName}, averaging ${avg.toFixed(1)} lbs across ${filteredWeightVitals.length} readings.`;
                  })()}
                </p>
              </div>

              {/* Weight Chart with BMI and Ideal Weight */}
              <div className="h-96">
                {filteredWeightVitals.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={weightChartData}>
                      <defs>
                        <linearGradient id="actualWeightGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="idealWeightGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="#059669" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="bmiGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="#d97706" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                      <XAxis
                        dataKey="date"
                        stroke="#9ca3af"
                        tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }}
                      />
                      {/* Left Y-Axis for Weight (Blue) */}
                      <YAxis
                        yAxisId="weight"
                        domain={[0, 320]}
                        ticks={[0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320]}
                        stroke="#3b82f6"
                        tick={{ fill: '#3b82f6', fontSize: 11, fontWeight: 600 }}
                        label={{
                          value: 'Weight (lbs)',
                          angle: -90,
                          position: 'insideLeft',
                          fill: '#3b82f6',
                          fontSize: 13,
                          fontWeight: 'bold',
                          offset: 10
                        }}
                      />
                      {/* Right Y-Axis for BMI (Orange) */}
                      <YAxis
                        yAxisId="bmi"
                        orientation="right"
                        domain={[0, 50]}
                        ticks={[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50]}
                        stroke="#f59e0b"
                        tick={{ fill: '#f59e0b', fontSize: 12, fontWeight: 600 }}
                        label={{
                          value: 'BMI',
                          angle: -90,
                          position: 'insideRight',
                          fill: '#f59e0b',
                          fontSize: 13,
                          fontWeight: 'bold',
                          offset: 25
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))',
                          border: '2px solid #3b82f6',
                          borderRadius: '12px',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                          backdropFilter: 'blur(10px)',
                          color: '#fff'
                        }}
                        formatter={(value: any, name: string) => {
                          if (name === 'Actual Weight') return [`${value} lbs`, name];
                          if (name === 'Ideal Weight') return [`${value} lbs`, name];
                          if (name === 'BMI') return [value, name];
                          return [value, name];
                        }}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="line"
                      />
                      {/* Actual Weight Line (Blue) */}
                      <Line
                        yAxisId="weight"
                        type="monotone"
                        dataKey="weight"
                        stroke="#3b82f6"
                        strokeWidth={4}
                        dot={{ r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 9, strokeWidth: 3 }}
                        name="Actual Weight"
                      />
                      {/* Ideal Weight Line (Green) */}
                      {patientData?.height && (
                        <Line
                          yAxisId="weight"
                          type="monotone"
                          dataKey="idealWeight"
                          stroke="#10b981"
                          strokeWidth={3}
                          strokeDasharray="5 5"
                          dot={false}
                          name="Ideal Weight"
                        />
                      )}
                      {/* BMI Line (Orange) */}
                      {patientData?.height && (
                        <Line
                          yAxisId="bmi"
                          type="monotone"
                          dataKey="bmi"
                          stroke="#f59e0b"
                          strokeWidth={3}
                          dot={{ r: 5, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 8, strokeWidth: 3 }}
                          name="BMI"
                        />
                      )}
                      {/* BMI Threshold Labels */}
                      {patientData?.height && (
                        <>
                          {/* BMI 18.5 - Underweight threshold */}
                          <ReferenceLine
                            yAxisId="bmi"
                            y={18.5}
                            stroke="#ef4444"
                            strokeWidth={2}
                            label={{
                              value: 'Underweight',
                              position: 'right',
                              fill: '#ef4444',
                              fontSize: 9,
                              fontWeight: 'bold',
                              offset: 5
                            }}
                          />

                          {/* BMI 30 - Overweight threshold */}
                          <ReferenceLine
                            yAxisId="bmi"
                            y={30}
                            stroke="#ef4444"
                            strokeWidth={2}
                            label={{
                              value: 'Overweight',
                              position: 'insideBottomRight',
                              fill: '#ef4444',
                              fontSize: 9,
                              fontWeight: 'bold',
                              offset: 5
                            }}
                          />
                        </>
                      )}
                    </ComposedChart>
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
                        <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: '#f59e0b' }}>BMI</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Change</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Notes</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vitals.filter(v => v.weight).slice(-20).reverse().map((vital, index, arr) => {
                        const prevVital = arr[index + 1];
                        const prevWeight = prevVital?.weight;
                        const change = prevWeight ? vital.weight! - prevWeight : 0;

                        // Calculate rate of change per week
                        let changeColor = 'text-gray-400';
                        if (prevWeight && prevVital) {
                          const timeDiffMs = new Date(vital.timestamp).getTime() - new Date(prevVital.timestamp).getTime();
                          const timeDiffWeeks = timeDiffMs / (1000 * 60 * 60 * 24 * 7);
                          const changePerWeek = timeDiffWeeks > 0 ? Math.abs(change) / timeDiffWeeks : 0;

                          // Calculate BMI to determine if overweight or underweight
                          let isOverweight = false;
                          let isUnderweight = false;
                          if (patientData?.height) {
                            let heightInMeters: number;
                            if (patientData.heightUnit === 'cm') {
                              heightInMeters = patientData.height / 100;
                            } else {
                              heightInMeters = patientData.height * 0.0254;
                            }
                            let weightInKg = vital.weight! * 0.453592;
                            const bmi = weightInKg / (heightInMeters * heightInMeters);
                            isOverweight = bmi >= 25;
                            isUnderweight = bmi < 18.5;
                          }

                          // Color logic based on rate and direction
                          if (changePerWeek > 3.5) {
                            // Rapid change - dangerous (red)
                            changeColor = 'text-red-400';
                          } else if (changePerWeek > 2) {
                            // Moderate change - concerning (yellow)
                            changeColor = 'text-yellow-400';
                          } else {
                            // Small change - check if it's in the right direction
                            const losingWeight = change < 0;
                            const gainingWeight = change > 0;

                            if ((losingWeight && isOverweight) || (gainingWeight && isUnderweight)) {
                              // Good direction (green)
                              changeColor = 'text-green-400';
                            } else if (Math.abs(change) < 0.5) {
                              // Stable (gray)
                              changeColor = 'text-gray-400';
                            } else {
                              // Wrong direction (default white)
                              changeColor = 'text-white';
                            }
                          }
                        }

                        return (
                          <tr key={vital.id} className="border-b border-gray-800 hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4 text-sm">{format(new Date(vital.timestamp), 'MMM d, yyyy h:mm a')}</td>
                            <td className="py-3 px-4 text-sm font-semibold">{vital.weight} lbs</td>
                            <td className="py-3 px-4 text-sm font-semibold" style={{ color: '#f59e0b' }}>
                              {(() => {
                                if (!patientData?.height || !vital.weight) return '--';

                                let heightInMeters: number;
                                if (patientData.heightUnit === 'cm') {
                                  heightInMeters = patientData.height / 100;
                                } else {
                                  heightInMeters = patientData.height * 0.0254;
                                }

                                let weightInKg: number;
                                if (patientData.weightUnit === 'kg') {
                                  weightInKg = vital.weight;
                                } else {
                                  weightInKg = vital.weight * 0.453592;
                                }

                                const bmi = weightInKg / (heightInMeters * heightInMeters);
                                return bmi.toFixed(1);
                              })()}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {prevWeight ? (
                                <span className={changeColor}>
                                  {change > 0 ? '+' : ''}{change.toFixed(1)} lbs
                                </span>
                              ) : (
                                <span className="text-gray-600">--</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-400">{vital.notes || '--'}</td>
                            <td className="py-3 px-4 text-sm">
                              <button
                                onClick={() => handleDeleteWeightEntry(vital.id)}
                                className="text-red-400 hover:text-red-300 transition-colors p-1 rounded hover:bg-red-400/10"
                                title="Delete entry"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
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

              {/* Time Period Toggle */}
              <div className="flex justify-center mb-6">
                <div className="inline-flex gap-2 p-1 rounded-xl" style={{
                  background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.8), rgba(17, 24, 39, 0.8))',
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}>
                  <button
                    onClick={() => setGlucoseTimePeriod('7d')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      glucoseTimePeriod === '7d'
                        ? 'bg-red-500 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    7 Days
                  </button>
                  <button
                    onClick={() => setGlucoseTimePeriod('30d')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      glucoseTimePeriod === '30d'
                        ? 'bg-red-500 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    30 Days
                  </button>
                  <button
                    onClick={() => setGlucoseTimePeriod('surgery')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      glucoseTimePeriod === 'surgery'
                        ? 'bg-red-500 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Since Surgery
                  </button>
                </div>
              </div>

              {/* Glucose Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
                  <p className="text-xs text-blue-300 font-semibold mb-1">PERIOD AVERAGE</p>
                  <p className="text-3xl font-bold text-white">
                    {(() => {
                      if (filteredGlucoseVitals.length === 0) return '--';
                      const avg = filteredGlucoseVitals.reduce((sum, v) => sum + (v.bloodSugar || 0), 0) / filteredGlucoseVitals.length;
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
                      const total = filteredGlucoseVitals.length;
                      if (total === 0) return '--';
                      const inRange = filteredGlucoseVitals.filter(v => v.bloodSugar && v.bloodSugar >= 70 && v.bloodSugar < 100).length;
                      return Math.round((inRange / total) * 100);
                    })()} <span className="text-lg text-gray-400">%</span>
                  </p>
                </div>

                <div className="p-4 rounded-xl" style={{
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(147, 51, 234, 0.1))',
                  border: '1px solid rgba(168, 85, 247, 0.2)'
                }}>
                  <p className="text-xs text-purple-300 font-semibold mb-1">PERIOD READINGS</p>
                  <p className="text-3xl font-bold text-white">
                    {filteredGlucoseVitals.length}
                  </p>
                </div>

                <div className="p-4 rounded-xl" style={{
                  background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.1), rgba(249, 115, 22, 0.1))',
                  border: '1px solid rgba(251, 146, 60, 0.2)'
                }}>
                  <p className="text-xs text-orange-300 font-semibold mb-1">HIGH READINGS</p>
                  <p className="text-3xl font-bold text-white">
                    {(() => {
                      const total = filteredGlucoseVitals.length;
                      if (total === 0) return '--';
                      const high = filteredGlucoseVitals.filter(v => v.bloodSugar && v.bloodSugar >= 126).length;
                      return Math.round((high / total) * 100);
                    })()} <span className="text-lg text-gray-400">%</span>
                  </p>
                </div>

                {/* NEW: Estimated A1C Metric */}
                <div className="p-4 rounded-xl" style={{
                  background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(219, 39, 119, 0.1))',
                  border: '1px solid rgba(236, 72, 153, 0.2)'
                }}>
                  <p className="text-xs text-pink-300 font-semibold mb-1">EST. A1C (90-DAY)</p>
                  <p className="text-3xl font-bold text-white">
                    {(() => {
                      // Get 90-day average glucose for A1C estimation
                      const ninetyDaysAgo = subDays(new Date(), 90);
                      const last90DaysVitals = vitals.filter(v =>
                        v.bloodSugar && new Date(v.timestamp) >= ninetyDaysAgo
                      );

                      if (last90DaysVitals.length === 0) return '--';

                      const avg = last90DaysVitals.reduce((sum, v) => sum + (v.bloodSugar || 0), 0) / last90DaysVitals.length;
                      // Formula: Estimated A1C = (Average Glucose + 46.7) / 28.7
                      const estimatedA1C = (avg + 46.7) / 28.7;
                      return estimatedA1C.toFixed(1);
                    })()} <span className="text-lg text-gray-400">%</span>
                  </p>
                  <p className={`text-xs mt-1 font-semibold ${(() => {
                    const ninetyDaysAgo = subDays(new Date(), 90);
                    const last90DaysVitals = vitals.filter(v =>
                      v.bloodSugar && new Date(v.timestamp) >= ninetyDaysAgo
                    );

                    if (last90DaysVitals.length === 0) return 'text-gray-400';

                    const avg = last90DaysVitals.reduce((sum, v) => sum + (v.bloodSugar || 0), 0) / last90DaysVitals.length;
                    const estimatedA1C = (avg + 46.7) / 28.7;

                    if (estimatedA1C < 5.7) return 'text-green-400';
                    if (estimatedA1C < 6.5) return 'text-yellow-400';
                    return 'text-red-400';
                  })()}`}>
                    {(() => {
                      const ninetyDaysAgo = subDays(new Date(), 90);
                      const last90DaysVitals = vitals.filter(v =>
                        v.bloodSugar && new Date(v.timestamp) >= ninetyDaysAgo
                      );

                      if (last90DaysVitals.length === 0) return 'Need 90 days';

                      const avg = last90DaysVitals.reduce((sum, v) => sum + (v.bloodSugar || 0), 0) / last90DaysVitals.length;
                      const estimatedA1C = (avg + 46.7) / 28.7;

                      if (estimatedA1C < 5.7) return '✓ Normal';
                      if (estimatedA1C < 6.5) return '⚠ Pre-diabetic';
                      return '🚨 Diabetic';
                    })()}
                  </p>
                </div>
              </div>

              {/* Summary Text */}
              <div className="mb-6 p-4 rounded-xl" style={{
                background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.6), rgba(17, 24, 39, 0.6))',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}>
                <p className="text-sm text-gray-300">
                  {(() => {
                    if (filteredGlucoseVitals.length === 0) {
                      return `No glucose data recorded for ${
                        glucoseTimePeriod === '7d' ? 'the last 7 days' :
                        glucoseTimePeriod === '30d' ? 'the last 30 days' :
                        'the period since surgery'
                      }.`;
                    }
                    const avg = filteredGlucoseVitals.reduce((sum, v) => sum + (v.bloodSugar || 0), 0) / filteredGlucoseVitals.length;
                    const inRange = filteredGlucoseVitals.filter(v => v.bloodSugar && v.bloodSugar >= 70 && v.bloodSugar < 100).length;
                    const high = filteredGlucoseVitals.filter(v => v.bloodSugar && v.bloodSugar >= 126).length;
                    const inRangePercent = Math.round((inRange / filteredGlucoseVitals.length) * 100);
                    const highPercent = Math.round((high / filteredGlucoseVitals.length) * 100);
                    const periodName =
                      glucoseTimePeriod === '7d' ? '7 days' :
                      glucoseTimePeriod === '30d' ? '30 days' :
                      'since surgery';

                    let statusText = '';
                    if (avg < 100) {
                      statusText = 'excellent control';
                    } else if (avg < 126) {
                      statusText = 'pre-diabetic range';
                    } else {
                      statusText = 'elevated levels';
                    }

                    return `Your average blood glucose over ${periodName} is ${Math.round(avg)} mg/dL (${statusText}). ${inRangePercent}% of readings are in the normal range (70-100 mg/dL), and ${highPercent}% are elevated (≥126 mg/dL) across ${filteredGlucoseVitals.length} readings.`;
                  })()}
                </p>
              </div>

              {/* Glucose Chart */}
              <div className="h-96">
                {filteredGlucoseVitals.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={glucoseChartData}>
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
                      <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" opacity={0.5} />
                      <XAxis dataKey="date" stroke="#d1d5db" tick={{ fill: '#f3f4f6', fontSize: 13, fontWeight: 700 }} />
                      <YAxis domain={[0, 300]} stroke="#d1d5db" tick={{ fill: '#f3f4f6', fontSize: 13, fontWeight: 700 }} />
                      <Tooltip
                        contentStyle={{
                          background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))',
                          border: '2px solid #f97316',
                          borderRadius: '12px',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                          backdropFilter: 'blur(10px)',
                          color: '#fff'
                        }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                      />
                      <Legend wrapperStyle={{ color: '#f3f4f6' }} />
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

                      {/* Danger Zone: Severe Hypoglycemia (<60 mg/dL) - RED with ⚠️ */}
                      <ReferenceLine
                        y={60}
                        stroke="#dc2626"
                        strokeWidth={3}
                        strokeDasharray="3 3"
                        label={{
                          value: '⚠️ DANGER: Severe Hypoglycemia (60)',
                          position: 'insideTopLeft',
                          fill: '#fef2f2',
                          fontSize: 12,
                          fontWeight: 'bold',
                          style: {
                            background: '#dc2626',
                            padding: '4px 8px',
                            borderRadius: '4px'
                          }
                        }}
                      />

                      {/* Hypoglycemia Risk (<70 mg/dL) - RED */}
                      <ReferenceLine
                        y={70}
                        stroke="#ef4444"
                        strokeDasharray="5 5"
                        strokeWidth={2.5}
                        label={{
                          value: 'Hypoglycemia Risk (70)',
                          position: 'insideTopRight',
                          fill: '#fef2f2',
                          fontSize: 12,
                          fontWeight: 'bold'
                        }}
                      />

                      {/* Normal Range (70-100 mg/dL) - GREEN */}
                      <ReferenceLine
                        y={100}
                        stroke="#10b981"
                        strokeDasharray="5 5"
                        strokeWidth={2.5}
                        label={{
                          value: 'Normal Max (100)',
                          position: 'insideBottomRight',
                          fill: '#f0fdf4',
                          fontSize: 12,
                          fontWeight: 'bold'
                        }}
                      />

                      {/* Pre-Diabetic Zone (126 mg/dL) - YELLOW */}
                      <ReferenceLine
                        y={126}
                        stroke="#eab308"
                        strokeDasharray="5 5"
                        strokeWidth={2.5}
                        label={{
                          value: 'Pre-Diabetic (126)',
                          position: 'insideBottomRight',
                          fill: '#fefce8',
                          fontSize: 12,
                          fontWeight: 'bold'
                        }}
                      />

                      {/* Diabetic Threshold (180 mg/dL) - RED */}
                      <ReferenceLine
                        y={180}
                        stroke="#ef4444"
                        strokeDasharray="5 5"
                        strokeWidth={2.5}
                        label={{
                          value: 'Diabetic Danger (180)',
                          position: 'insideBottomRight',
                          fill: '#fef2f2',
                          fontSize: 12,
                          fontWeight: 'bold'
                        }}
                      />

                      {/* Critical Hyperglycemia (>240 mg/dL) - RED with ⚠️ */}
                      <ReferenceLine
                        y={240}
                        stroke="#dc2626"
                        strokeWidth={3}
                        strokeDasharray="3 3"
                        label={{
                          value: '⚠️ DANGER: Critical Hyperglycemia (240)',
                          position: 'insideBottomLeft',
                          fill: '#fef2f2',
                          fontSize: 12,
                          fontWeight: 'bold',
                          style: {
                            background: '#dc2626',
                            padding: '4px 8px',
                            borderRadius: '4px'
                          }
                        }}
                      />
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
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Actions</th>
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
                          <td className="py-3 px-4 text-sm">
                            <button
                              onClick={() => handleDeleteGlucoseEntry(vital.id)}
                              className="text-red-400 hover:text-red-300 transition-colors p-1 rounded hover:bg-red-400/10"
                              title="Delete entry"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
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

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 🫀 PULSE / HEART RATE MONITORING - WORLD-CLASS ANALYTICS      */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'pulse' && (
        <div className="space-y-8 animate-fadeIn">

          {/* PULSE HAWK ALERTS - Top Priority */}
          {hawkAlerts.filter(alert => alert.type === 'bradycardia' || alert.type === 'tachycardia').map((alert, index) => {
            if (dismissedAlerts.includes(index)) return null;

            return (
              <div
                key={index}
                className={`relative overflow-hidden rounded-2xl p-6 ${
                  alert.severity === 'danger'
                    ? 'bg-gradient-to-br from-red-900/40 via-red-800/30 to-red-900/40 border-2 border-red-500/50'
                    : 'bg-gradient-to-br from-yellow-900/40 via-yellow-800/30 to-yellow-900/40 border-2 border-yellow-500/50'
                } shadow-2xl`}
                style={{
                  animation: alert.severity === 'danger' ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
                }}
              >
                {/* Dismiss Button */}
                <button
                  onClick={() => setDismissedAlerts([...dismissedAlerts, index])}
                  className="absolute top-4 right-4 p-2 rounded-lg transition-all hover:bg-white/10 z-10"
                  title="Dismiss alert"
                >
                  <X className="h-5 w-5 text-gray-400 hover:text-white" />
                </button>

                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`p-4 rounded-full ${
                    alert.severity === 'danger' ? 'bg-red-500/20' : 'bg-yellow-500/20'
                  }`}>
                    <Heart className={`h-8 w-8 ${
                      alert.severity === 'danger' ? 'text-red-400 animate-pulse' : 'text-yellow-400'
                    }`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pr-8">
                    <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                      {alert.severity === 'danger' ? '🚨' : '⚠️'}
                      {alert.type === 'bradycardia' ? '🐢 Slow Heart Rate Detected' : '⚡ Rapid Heart Rate Detected'}
                    </h3>
                    <p className="text-lg text-gray-200 mb-4">{alert.message}</p>

                    {/* Medications Involved */}
                    <div className="bg-black/30 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-bold text-yellow-400 mb-2">💊 Medications Involved:</h4>
                      <div className="flex flex-wrap gap-2">
                        {alert.medicationNames.map((med, i) => (
                          <span key={i} className="px-3 py-1 bg-white/10 rounded-full text-sm text-white border border-white/20">
                            {med}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Recommendation */}
                    <div className={`p-4 rounded-lg ${
                      alert.severity === 'danger' ? 'bg-red-500/20 border border-red-500/30' : 'bg-yellow-500/20 border border-yellow-500/30'
                    }`}>
                      <p className="text-sm text-gray-200">{alert.recommendation}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* ═══════════════════════════════════════════ */}
          {/* 5 ADVANCED PULSE METRICS PANEL              */}
          {/* ═══════════════════════════════════════════ */}

          {/* Time Period Toggle for Pulse/Heart Rate */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex gap-2 p-1 rounded-xl" style={{
              background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.8), rgba(17, 24, 39, 0.8))',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              <button
                onClick={() => setPulseTimePeriod('7d')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  pulseTimePeriod === '7d'
                    ? 'bg-red-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setPulseTimePeriod('30d')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  pulseTimePeriod === '30d'
                    ? 'bg-red-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setPulseTimePeriod('surgery')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  pulseTimePeriod === 'surgery'
                    ? 'bg-red-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Since Surgery
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">

            {/* Metric 1: Current Heart Rate */}
            <GlassCard className="relative overflow-hidden group hover:scale-105 transition-transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <Activity className="h-8 w-8 text-red-400 animate-pulse" />
                  <span className="text-xs font-bold text-gray-400">CURRENT</span>
                </div>
                <p className="text-4xl font-black text-white mb-2">
                  {filteredLatest?.heartRate || '--'}
                  <span className="text-lg text-gray-400 ml-2">bpm</span>
                </p>
                <p className="text-sm font-bold text-gray-300">Heart Rate</p>
                {filteredLatest?.heartRate && (
                  <div className={`mt-3 px-3 py-1 rounded-full text-xs font-bold inline-block ${
                    filteredLatest.heartRate < 50 ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                    filteredLatest.heartRate < 60 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
                    filteredLatest.heartRate <= 100 ? 'bg-green-500/20 text-green-400 border border-green-500/50' :
                    filteredLatest.heartRate <= 120 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' :
                    'bg-red-500/20 text-red-400 border border-red-500/50'
                  }`}>
                    {filteredLatest.heartRate < 50 ? '🔴 CRITICAL LOW' :
                     filteredLatest.heartRate < 60 ? '🟡 BRADYCARDIA' :
                     filteredLatest.heartRate <= 100 ? '🟢 NORMAL' :
                     filteredLatest.heartRate <= 120 ? '🟠 ELEVATED' :
                     '🔴 TACHYCARDIA'}
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Metric 2: Resting HR */}
            <GlassCard className="relative overflow-hidden group hover:scale-105 transition-transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <Heart className="h-8 w-8 text-blue-400" />
                  <span className="text-xs font-bold text-gray-400">
                    {pulseTimePeriod === '7d' ? '7-DAY MIN' : pulseTimePeriod === '30d' ? '30-DAY MIN' : 'PERIOD MIN'}
                  </span>
                </div>
                <p className="text-4xl font-black text-white mb-2">
                  {filteredPulseVitals.length > 0 ? Math.min(...filteredPulseVitals.map(v => v.heartRate!)) : '--'}
                  <span className="text-lg text-gray-400 ml-2">bpm</span>
                </p>
                <p className="text-sm font-bold text-gray-300">Resting HR</p>
                <p className="text-xs text-gray-500 mt-2">
                  Lowest HR in {pulseTimePeriod === '7d' ? 'last 7 days' : pulseTimePeriod === '30d' ? 'last 30 days' : 'period'}
                </p>
              </div>
            </GlassCard>

            {/* Metric 3: Average HR */}
            <GlassCard className="relative overflow-hidden group hover:scale-105 transition-transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp className="h-8 w-8 text-purple-400" />
                  <span className="text-xs font-bold text-gray-400">AVG</span>
                </div>
                <p className="text-4xl font-black text-white mb-2">
                  {(() => {
                    if (filteredPulseVitals.length === 0) return '--';
                    const avg = filteredPulseVitals.reduce((sum, v) => sum + (v.heartRate || 0), 0) / filteredPulseVitals.length;
                    return Math.round(avg);
                  })()}
                  <span className="text-lg text-gray-400 ml-2">bpm</span>
                </p>
                <p className="text-sm font-bold text-gray-300">
                  {pulseTimePeriod === '7d' ? '7-Day' : pulseTimePeriod === '30d' ? '30-Day' : 'Period'} Avg
                </p>
                <p className="text-xs text-gray-500 mt-2">Average heart rate</p>
              </div>
            </GlassCard>

            {/* Metric 4: HRV Score */}
            <GlassCard className="relative overflow-hidden group hover:scale-105 transition-transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <Zap className="h-8 w-8 text-green-400" />
                  <span className="text-xs font-bold text-gray-400">HRV</span>
                </div>
                <p className="text-4xl font-black text-white mb-2">
                  {filteredLatest?.heartRateVariability || '--'}
                  <span className="text-lg text-gray-400 ml-2">ms</span>
                </p>
                <p className="text-sm font-bold text-gray-300">Heart Rate Variability</p>
                {filteredLatest?.heartRateVariability && (
                  <div className={`mt-3 px-3 py-1 rounded-full text-xs font-bold inline-block ${
                    filteredLatest.heartRateVariability < 20 ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                    filteredLatest.heartRateVariability < 50 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
                    filteredLatest.heartRateVariability < 100 ? 'bg-green-500/20 text-green-400 border border-green-500/50' :
                    'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                  }`}>
                    {filteredLatest.heartRateVariability < 20 ? 'POOR' :
                     filteredLatest.heartRateVariability < 50 ? 'FAIR' :
                     filteredLatest.heartRateVariability < 100 ? 'GOOD' :
                     'EXCELLENT'}
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Metric 5: Target Zone Compliance */}
            <GlassCard className="relative overflow-hidden group hover:scale-105 transition-transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <AlertTriangle className="h-8 w-8 text-yellow-400" />
                  <span className="text-xs font-bold text-gray-400">SAFETY</span>
                </div>
                <p className="text-4xl font-black text-white mb-2">
                  {(() => {
                    if (filteredPulseVitals.length === 0 || !patientData) return '--';
                    const targetMin = patientData.targetHeartRateMin || 60;
                    const targetMax = patientData.targetHeartRateMax || 100;
                    const inZone = filteredPulseVitals.filter(v =>
                      v.heartRate! >= targetMin && v.heartRate! <= targetMax
                    );
                    return Math.round((inZone.length / filteredPulseVitals.length) * 100);
                  })()}
                  <span className="text-lg text-gray-400 ml-2">%</span>
                </p>
                <p className="text-sm font-bold text-gray-300">In Safe Zone</p>
                <p className="text-xs text-gray-500 mt-2">
                  {pulseTimePeriod === '7d' ? 'Last 7 days' : pulseTimePeriod === '30d' ? 'Last 30 days' : 'Period'} compliance
                </p>
              </div>
            </GlassCard>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MULTI-ZONE HEART RATE CHART - PREMIUM 3D VISUALIZATION        */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <GlassCard className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black bg-gradient-to-r from-red-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                🫀 Heart Rate Zones - Advanced {pulseTimePeriod === '7d' ? '7-Day' : pulseTimePeriod === '30d' ? '30-Day' : 'Post-Surgery'} Analysis
              </h2>
            </div>

            <ResponsiveContainer width="100%" height={500}>
              <ComposedChart data={(() => {
                const chartData = filteredPulseVitals.map(v => ({
                  date: format(new Date(v.timestamp), 'MMM dd HH:mm'),
                  heartRate: v.heartRate,
                  hrv: v.heartRateVariability
                }));
                return chartData;
              })()}>

                {/* Premium Grid */}
                <defs>
                  {/* Gradient for Heart Rate Area */}
                  <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                    <stop offset="50%" stopColor="#f97316" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2} />
                  </linearGradient>
                  {/* Gradient for HRV Line */}
                  <linearGradient id="hrvGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.8} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  stroke="#9ca3af"
                  tick={{ fill: '#f3f4f6', fontSize: 11, fontWeight: 700 }}
                  angle={-25}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  domain={[40, 180]}
                  stroke="#9ca3af"
                  tick={{ fill: '#f3f4f6', fontSize: 13, fontWeight: 700 }}
                  label={{
                    value: 'Heart Rate (bpm)',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#f3f4f6',
                    fontWeight: 700,
                    fontSize: 14
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.98)',
                    border: '2px solid rgba(59, 130, 246, 0.5)',
                    borderRadius: '16px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(59, 130, 246, 0.3)',
                    padding: '16px'
                  }}
                  labelStyle={{
                    color: '#f3f4f6',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    marginBottom: '8px'
                  }}
                  itemStyle={{
                    color: '#d1d5db',
                    fontSize: '13px'
                  }}
                />
                <Legend
                  wrapperStyle={{
                    paddingTop: '20px'
                  }}
                  iconType="circle"
                />

                {/* ══════════════════════════════════════════════════════════════ */}
                {/* PROGRESSIVE HEART RATE ZONE SHADING - GRADIENT RISK SYSTEM   */}
                {/* ══════════════════════════════════════════════════════════════ */}

                {/* CRITICAL BRADYCARDIA ZONE (40-50 bpm) - Dark Red */}
                <ReferenceArea
                  y1={40}
                  y2={50}
                  fill="#dc2626"
                  fillOpacity={0.25}
                  stroke="none"
                />

                {/* SEVERE BRADYCARDIA ZONE (50-55 bpm) - Medium Red */}
                <ReferenceArea
                  y1={50}
                  y2={55}
                  fill="#ef4444"
                  fillOpacity={0.18}
                  stroke="none"
                />

                {/* BRADYCARDIA WARNING ZONE (55-60 bpm) - Faint Red to Yellow */}
                <ReferenceArea
                  y1={55}
                  y2={60}
                  fill="#fbbf24"
                  fillOpacity={0.12}
                  stroke="none"
                />

                {/* HEALTHY ZONE (60-100 bpm) - Green */}
                <ReferenceArea
                  y1={60}
                  y2={100}
                  fill="#10b981"
                  fillOpacity={0.15}
                  stroke="#10b981"
                  strokeOpacity={0.4}
                  strokeWidth={2}
                  label={{
                    value: '✅ HEALTHY ZONE (60-100 bpm)',
                    position: 'insideTop',
                    fill: '#d1fae5',
                    fontSize: 14,
                    fontWeight: 'bold',
                    style: {
                      textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(16, 185, 129, 0.6)'
                    }
                  }}
                />

                {/* TACHYCARDIA WARNING ZONE (100-110 bpm) - Faint Yellow */}
                <ReferenceArea
                  y1={100}
                  y2={110}
                  fill="#fbbf24"
                  fillOpacity={0.12}
                  stroke="none"
                />

                {/* ELEVATED TACHYCARDIA ZONE (110-120 bpm) - Medium Yellow */}
                <ReferenceArea
                  y1={110}
                  y2={120}
                  fill="#f59e0b"
                  fillOpacity={0.18}
                  stroke="none"
                />

                {/* SEVERE TACHYCARDIA ZONE (120-140 bpm) - Faint to Medium Red */}
                <ReferenceArea
                  y1={120}
                  y2={140}
                  fill="#ef4444"
                  fillOpacity={0.18}
                  stroke="none"
                />

                {/* CRITICAL TACHYCARDIA ZONE (140-180 bpm) - Dark Red */}
                <ReferenceArea
                  y1={140}
                  y2={180}
                  fill="#dc2626"
                  fillOpacity={0.25}
                  stroke="none"
                />

                {/* ══════════════════════════════════════════ */}
                {/* DANGER ZONE REFERENCE LINES               */}
                {/* ══════════════════════════════════════════ */}

                {/* Critical Bradycardia Zone (<50 bpm) */}
                <ReferenceLine
                  y={50}
                  stroke="#dc2626"
                  strokeWidth={4}
                  strokeDasharray="4 4"
                  label={{
                    value: '⚠️ CRITICAL BRADYCARDIA (50 bpm)',
                    position: 'insideTopLeft',
                    fill: '#fef2f2',
                    fontSize: 13,
                    fontWeight: 'bold',
                    style: {
                      textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(220, 38, 38, 0.6)'
                    }
                  }}
                />

                {/* Bradycardia Warning (60 bpm) */}
                <ReferenceLine
                  y={60}
                  stroke="#f59e0b"
                  strokeWidth={3}
                  strokeDasharray="6 4"
                  label={{
                    value: '🟡 Bradycardia Risk (60 bpm)',
                    position: 'insideTopRight',
                    fill: '#fef3c7',
                    fontSize: 12,
                    fontWeight: 'bold',
                    style: { textShadow: '0 2px 6px rgba(0,0,0,0.8)' }
                  }}
                />

                {/* Safe Zone Lower Bound */}
                {patientData?.targetHeartRateMin && (
                  <ReferenceLine
                    y={patientData.targetHeartRateMin}
                    stroke="#10b981"
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    label={{
                      value: `🟢 Target Min (${patientData.targetHeartRateMin} bpm)`,
                      position: 'insideBottomLeft',
                      fill: '#d1fae5',
                      fontSize: 11,
                      fontWeight: 'bold'
                    }}
                  />
                )}

                {/* Safe Zone Upper Bound */}
                {patientData?.targetHeartRateMax && (
                  <ReferenceLine
                    y={patientData.targetHeartRateMax}
                    stroke="#10b981"
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    label={{
                      value: `🟢 Target Max (${patientData.targetHeartRateMax} bpm)`,
                      position: 'insideBottomRight',
                      fill: '#d1fae5',
                      fontSize: 11,
                      fontWeight: 'bold'
                    }}
                  />
                )}

                {/* Patient's Maximum Safe HR */}
                {patientData?.maxHeartRate && (
                  <ReferenceLine
                    y={patientData.maxHeartRate}
                    stroke="#ef4444"
                    strokeWidth={3}
                    strokeDasharray="6 4"
                    label={{
                      value: `🔴 Max Safe HR (${patientData.maxHeartRate} bpm)`,
                      position: 'insideTopRight',
                      fill: '#fef2f2',
                      fontSize: 12,
                      fontWeight: 'bold',
                      style: { textShadow: '0 2px 6px rgba(0,0,0,0.8)' }
                    }}
                  />
                )}

                {/* Critical Tachycardia (120 bpm) */}
                <ReferenceLine
                  y={120}
                  stroke="#dc2626"
                  strokeWidth={4}
                  strokeDasharray="4 4"
                  label={{
                    value: '⚠️ CRITICAL TACHYCARDIA (120 bpm)',
                    position: 'insideBottomLeft',
                    fill: '#fef2f2',
                    fontSize: 13,
                    fontWeight: 'bold',
                    style: {
                      textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(220, 38, 38, 0.6)'
                    }
                  }}
                />

                {/* ══════════════════════════════════════════ */}
                {/* DATA VISUALIZATION LAYERS                */}
                {/* ══════════════════════════════════════════ */}

                {/* Heart Rate Area Chart with Premium Gradient */}
                <Area
                  type="monotone"
                  dataKey="heartRate"
                  stroke="#ef4444"
                  strokeWidth={4}
                  fill="url(#hrGradient)"
                  dot={{
                    r: 7,
                    fill: '#ef4444',
                    strokeWidth: 3,
                    stroke: '#fff',
                    style: {
                      filter: 'drop-shadow(0 2px 8px rgba(239, 68, 68, 0.6))'
                    }
                  }}
                  activeDot={{
                    r: 10,
                    fill: '#dc2626',
                    strokeWidth: 4,
                    stroke: '#fff',
                    style: {
                      filter: 'drop-shadow(0 0 12px rgba(239, 68, 68, 1))',
                      cursor: 'pointer'
                    }
                  }}
                  name="Heart Rate (bpm)"
                  animationDuration={2000}
                  animationEasing="ease-in-out"
                />

                {/* HRV Overlay Line - Only show if HRV data exists (not provided by Strava) */}
                {vitals.some(v => v.heartRateVariability && v.heartRateVariability > 0) && (
                  <Line
                    type="monotone"
                    dataKey="hrv"
                    stroke="url(#hrvGradient)"
                    strokeWidth={3}
                    strokeDasharray="8 4"
                    dot={{
                      r: 5,
                      fill: '#10b981',
                      strokeWidth: 2,
                      stroke: '#fff',
                      style: { filter: 'drop-shadow(0 2px 6px rgba(16, 185, 129, 0.6))' }
                    }}
                    activeDot={{
                      r: 8,
                      fill: '#059669',
                      strokeWidth: 3,
                      stroke: '#fff'
                    }}
                    name="HRV (ms)"
                    opacity={0.75}
                    animationDuration={2000}
                    animationEasing="ease-in-out"
                    yAxisId="right"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>

            {/* Premium Zone Legend with 3D Effects */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-red-500/10 to-red-500/5 border border-red-500/30">
                <div className="w-5 h-5 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
                <div>
                  <span className="text-sm font-bold text-red-400">Critical Zones</span>
                  <p className="text-xs text-gray-400">&lt;50 bpm, &gt;120 bpm</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-orange-500/5 border border-orange-500/30">
                <div className="w-5 h-5 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50" />
                <div>
                  <span className="text-sm font-bold text-orange-400">Warning Zones</span>
                  <p className="text-xs text-gray-400">50-60 bpm</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/30">
                <div className="w-5 h-5 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
                <div>
                  <span className="text-sm font-bold text-green-400">Safe Target Zone</span>
                  <p className="text-xs text-gray-400">{patientData?.targetHeartRateMin || 60}-{patientData?.targetHeartRateMax || 100} bpm</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/5 border border-blue-500/30">
                <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/50" />
                <div>
                  <span className="text-sm font-bold text-blue-400">HRV Trend</span>
                  <p className="text-xs text-gray-400">Higher = Better Recovery</p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* HEART RATE HISTORY TABLE                                       */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <GlassCard className="p-8">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Activity className="h-6 w-6 text-red-400" />
              Heart Rate History
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Heart Rate</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Source</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Notes</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vitals.filter(v => v.heartRate).slice(-20).reverse().map((vital) => {
                    const hr = vital.heartRate!;
                    let statusBadge = {
                      text: 'Normal',
                      className: 'bg-green-500/20 text-green-400'
                    };

                    if (hr < 50) {
                      statusBadge = { text: 'Critical Low', className: 'bg-red-500/20 text-red-400' };
                    } else if (hr < 60) {
                      statusBadge = { text: 'Bradycardia', className: 'bg-yellow-500/20 text-yellow-400' };
                    } else if (hr > 120) {
                      statusBadge = { text: 'Critical High', className: 'bg-red-500/20 text-red-400' };
                    } else if (hr > 100) {
                      statusBadge = { text: 'Tachycardia', className: 'bg-orange-500/20 text-orange-400' };
                    }

                    return (
                      <tr key={vital.id} className="border-b border-gray-800 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 text-sm">{format(new Date(vital.timestamp), 'MMM d, yyyy h:mm a')}</td>
                        <td className="py-3 px-4 text-sm font-semibold">{hr} bpm</td>
                        <td className="py-3 px-4 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${statusBadge.className}`}>
                            {statusBadge.text}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span className="text-gray-400">{vital.source || 'Manual'}</span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-400">{vital.notes || '--'}</td>
                        <td className="py-3 px-4 text-sm">
                          <button
                            onClick={() => handleDeletePulseEntry(vital.id)}
                            className="text-red-400 hover:text-red-300 transition-colors p-1 rounded hover:bg-red-400/10"
                            title="Delete entry"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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

              <Input
                label="Peak Flow (L/min)"
                type="number"
                placeholder="300-700"
                icon={<Wind className="h-5 w-5" />}
                {...register('peakFlow', { valueAsNumber: true })}
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
