// Vitals Page - Tracks heart rate, blood pressure, hydration, and personalized targets
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard, Button, Modal, Input } from '../components/ui';
import { WaterButton } from '../components/WaterButton';
import { HeartFrame } from '../components/vitals/HeartFrame';
import { CircularGauge } from '../components/vitals/CircularGauge';
import { TimeThrottleLever } from '../components/vitals/TimeThrottleLever';
import { LuxuryVitalGauge } from '../components/vitals/LuxuryVitalGauge';
import { LiveVitalsDisplay } from '../components/LiveVitalsDisplay';
import { ECGWaveformChart } from '../components/ECGWaveformChart';
import { HRVMetricsPanel } from '../components/HRVMetricsPanel';
import { ECGAnalysisPanel } from '../components/ECGAnalysisPanel';
import { SpirometryDataEntry } from '../components/SpirometryDataEntry';
import { TreadmillDataEntry } from '../components/TreadmillDataEntry';
import { useWebSocket } from '../contexts/WebSocketContext';
import { filterECGSignal, estimateSignalQuality } from '../utils/ecgFiltering';
import {
  Activity,
  Heart,
  Plus,
  TrendingUp,
  TrendingDown,
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
  X,
  ChevronDown,
  ChevronUp,
  Sliders
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea, ComposedChart } from 'recharts';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import { VitalsSample, CreateVitalsInput, Patient, HydrationLog } from '../types';
import toast from 'react-hot-toast';
import { format, subDays, addDays, subMonths, addMonths } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

// Helper to convert empty/NaN values to undefined for optional number fields
const optionalNumber = z.preprocess(
  (val) => (val === '' || val === null || val === undefined || Number.isNaN(val) ? undefined : Number(val)),
  z.number()
).optional();

const vitalsSchema = z.object({
  timestamp: z.string().optional(), // Date/time for historical data entry
  bloodPressureSystolic: optionalNumber,
  bloodPressureDiastolic: optionalNumber,
  heartRate: optionalNumber,
  weight: optionalNumber,
  temperature: optionalNumber,
  oxygenSaturation: optionalNumber,
  bloodSugar: optionalNumber,
  hydrationStatus: optionalNumber,
  peakFlow: optionalNumber,
  respiratoryRate: optionalNumber,
  // HRV Metrics (Heart Rate Variability)
  sdnn: optionalNumber, // Standard Deviation of NN intervals (ms)
  rmssd: optionalNumber, // Root Mean Square of Successive Differences (ms)
  pnn50: optionalNumber, // Percentage of NN intervals > 50ms (%)
  // Exercise Capacity Metrics
  vo2Max: optionalNumber, // VO₂ Max (mL/kg/min)
  sixMinWalk: optionalNumber, // 6-Minute Walk Test distance (meters)
  hrRecovery: optionalNumber, // Heart Rate Recovery (bpm/min)
  // Advanced Cardiac Metrics
  ejectionFraction: optionalNumber, // Ejection Fraction (%)
  meanArterialPressure: optionalNumber, // MAP (mmHg)
  pulsePressure: optionalNumber, // Pulse Pressure (mmHg)
  bpVariability: optionalNumber, // BP Variability (SD)
  notes: z.string().optional(),
  symptoms: z.string().optional(),
  medicationsTaken: z.boolean().optional(),
  edema: z.string().optional(),
  edemaSeverity: z.enum(['none', 'mild', 'moderate', 'severe']).optional(),
  chestPain: z.boolean().optional(),
  chestPainSeverity: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || Number.isNaN(val) ? undefined : Number(val)),
    z.number().min(1).max(10)
  ).optional(),
  chestPainType: z.string().optional(),
  dyspnea: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || Number.isNaN(val) ? undefined : Number(val)),
    z.number().min(0).max(4)
  ).optional(),
  dyspneaTriggers: z.string().optional(),
  dizziness: z.boolean().optional(),
  dizzinessSeverity: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || Number.isNaN(val) ? undefined : Number(val)),
    z.number().min(1).max(10)
  ).optional(),
  dizzinessFrequency: z.string().optional(),
  energyLevel: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || Number.isNaN(val) ? undefined : Number(val)),
    z.number().min(1).max(10)
  ).optional(),
  stressLevel: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || Number.isNaN(val) ? undefined : Number(val)),
    z.number().min(1).max(10)
  ).optional(),
  anxietyLevel: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || Number.isNaN(val) ? undefined : Number(val)),
    z.number().min(1).max(10)
  ).optional(),
}).refine(
  (data) => {
    // Ensure at least one vital field is provided
    const vitalFields = [
      data.bloodPressureSystolic,
      data.bloodPressureDiastolic,
      data.heartRate,
      data.weight,
      data.temperature,
      data.oxygenSaturation,
      data.bloodSugar,
      data.hydrationStatus,
      data.peakFlow,
      data.respiratoryRate,
      data.sdnn,
      data.rmssd,
      data.pnn50,
      data.vo2Max,
      data.sixMinWalk,
      data.hrRecovery,
      data.ejectionFraction,
      data.meanArterialPressure,
      data.pulsePressure,
      data.bpVariability,
      data.chestPain,
      data.dyspnea,
      data.dizziness,
      data.energyLevel,
      data.stressLevel,
      data.anxietyLevel,
    ];
    return vitalFields.some((field) => field !== undefined && field !== null);
  },
  {
    message: 'Please fill out at least one vital field',
  }
);

type VitalsFormData = z.infer<typeof vitalsSchema>;

export function VitalsPage() {
  const { user } = useAuth(); // Access surgery date from user profile
  const navigate = useNavigate();
  const { latestHeartRate, latestVitals, latestECG, exerciseData, spirometryData } = useWebSocket(); // Listen for real-time heart rate updates, ECG, exercise, and spirometry data
  const [vitals, setVitals] = useState<VitalsSample[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'bp' | 'hr' | 'weight' | 'sugar' | 'temp' | 'hydration' | 'o2' | 'peakflow' | 'map' | 'bpvariability'>('bp');
  const [focusedField, setFocusedField] = useState<string | null>(null); // Track which gauge was clicked for modal focus
  const [patientData, setPatientData] = useState<Patient | null>(null);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null); // Co-Pilot: whose data to display (User ID, not patient ID)
  const [pilotUserId, setPilotUserId] = useState<number | null>(null); // Pilot: who is piloting (display only)
  const [hawkAlerts, setHawkAlerts] = useState<any[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<number[]>([]);
  const [hydrationLogs, setHydrationLogs] = useState<HydrationLog[]>([]);

  // Water card date selector
  const [waterCardDate, setWaterCardDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showWaterDatePicker, setShowWaterDatePicker] = useState(false);

  // Nuclear clock - update every second
  const [currentTime, setCurrentTime] = useState(new Date());

  // NEW: Garmin 3000 Cockpit Features
  const [selectedDevice, setSelectedDevice] = useState<'all' | 'samsung' | 'polar'>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'weight' | 'glucose' | 'pulse'>('overview');
  const [showMedicalTests, setShowMedicalTests] = useState(false);

  // Time period selections for Weight and Glucose journals
  const [weightTimePeriod, setWeightTimePeriod] = useState<'7d' | '30d' | 'surgery'>('7d');
  const [glucoseTimePeriod, setGlucoseTimePeriod] = useState<'7d' | '30d' | 'surgery'>('7d');
  const [pulseTimePeriod, setPulseTimePeriod] = useState<'7d' | '30d' | 'surgery'>('7d');

  // UNIFIED: Global time view for ALL charts
  const [globalTimeView, setGlobalTimeView] = useState<'7d' | '30d' | '90d' | 'surgery'>('surgery');
  const [throttleTargetDate, setThrottleTargetDate] = useState<Date | null>(null);

  // Historical readings collapse state
  const [isHistoricalReadingsExpanded, setIsHistoricalReadingsExpanded] = useState(false);

  // Chart collapse state
  const [isChartExpanded, setIsChartExpanded] = useState(false);

  // Metrics Command Center collapse state
  const [isMetricsExpanded, setIsMetricsExpanded] = useState(false);

  // Medical Grade Cardiac Diagnostics collapse state
  const [isCardiacDiagnosticsExpanded, setIsCardiacDiagnosticsExpanded] = useState(false);

  // Medical Test Modals state
  const [showECGModal, setShowECGModal] = useState(false);
  const [showTreadmillModal, setShowTreadmillModal] = useState(false);

  // Active test display within ACD-1000 (null = none, 'ecg', 'treadmill', 'spirometry')
  const [activeACD1000Test, setActiveACD1000Test] = useState<string | null>(null);

  // Real-time ECG buffer (accumulates waveform samples from Polar H10)
  const [ecgBuffer, setEcgBuffer] = useState<number[]>([]);
  const ECG_BUFFER_SIZE = 1300; // 10 seconds at 130 Hz
  const [showSpirometryModal, setShowSpirometryModal] = useState(false);

  // Polar H10 Live Streaming State
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingStatus, setStreamingStatus] = useState<'idle' | 'connecting' | 'streaming' | 'error'>('idle');
  const [streamError, setStreamError] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // 🫀 HRV Metrics State (from Polar H10 real-time data)
  const [hrvMetrics, setHrvMetrics] = useState<{
    sdnn?: number;
    rmssd?: number;
    pnn50?: number;
  }>({});

  // 🎥 ECG Recording State for cardiologist export
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<Date | null>(null);
  const [recordedEcgData, setRecordedEcgData] = useState<number[]>([]);
  const [recordedHrvData, setRecordedHrvData] = useState<{ sdnn?: number; rmssd?: number; pnn50?: number } | null>(null);
  const [applyNoiseFilter, setApplyNoiseFilter] = useState(true); // Enable filtering by default

  // 🎬 Replay State
  const [showReplayModal, setShowReplayModal] = useState(false);
  const [replayData, setReplayData] = useState<{ raw: number[], filtered: number[] } | null>(null);

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

  /**
   * UNIFIED DATE RANGE CALCULATOR
   * Calculates start and end dates for charts with 1-month buffers
   * Applied uniformly to all charts for consistent rendering
   */
  const calculateDateRange = (timeView: '7d' | '30d' | '90d' | 'surgery', surgeryDateStr?: string): { startDate: string; endDate: string } => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    console.log(`[DATE RANGE] Calculating for view: ${timeView}, surgeryDateStr: ${surgeryDateStr}`);

    switch (timeView) {
      case '7d':
        // 7 days: 1 month before (7 days ago) to 1 month after today
        startDate = subMonths(subDays(today, 7), 1);
        endDate = addMonths(today, 1);
        break;

      case '30d':
        // 30 days: 1 month before (30 days ago) to 1 month after today
        startDate = subMonths(subDays(today, 30), 1);
        endDate = addMonths(today, 1);
        break;

      case '90d':
        // 90 days: 1 month before (90 days ago) to 1 month after today
        startDate = subMonths(subDays(today, 90), 1);
        endDate = addMonths(today, 1);
        break;

      case 'surgery':
      default:
        if (surgeryDateStr) {
          // Surgery mode: 1 month before surgery to 1 month after today
          const surgery = new Date(surgeryDateStr);
          console.log(`[DATE RANGE] Surgery date parsed:`, surgery);
          console.log(`[DATE RANGE] Is valid date:`, !isNaN(surgery.getTime()));
          startDate = subMonths(surgery, 1);
          endDate = addMonths(today, 1);
          console.log(`[DATE RANGE] Surgery range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
        } else {
          // Fallback if no surgery date: last 3 months with 1-month buffer
          console.log(`[DATE RANGE] NO SURGERY DATE - using fallback`);
          startDate = subMonths(today, 4); // 3 months + 1 month buffer
          endDate = addMonths(today, 1);
        }
        break;
    }

    const result = {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    };
    console.log(`[DATE RANGE] Final range:`, result);
    return result;
  };

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

  // SMART HYDRATION CALCULATOR - Personalized based on patient factors
  const calculatePersonalizedHydrationTarget = (date: string = format(new Date(), 'yyyy-MM-dd')): number => {
    if (!patientData && !user) return 64; // Default fallback

    const patient = patientData || user;
    if (!patient) return 64; // If no patient data, return default
    let target = 64; // Base target in ounces

    // 1. WEIGHT-BASED CALCULATION (most important factor)
    const weightLbs = ('currentWeight' in patient ? patient.currentWeight : null) || ('startingWeight' in patient ? patient.startingWeight : null);
    if (weightLbs) {
      // Convert kg to lbs if needed
      const weight = ('weightUnit' in patient && patient.weightUnit === 'kg') ? weightLbs * 2.20462 : weightLbs;
      // Base formula: 0.5 oz per pound of body weight
      target = weight * 0.5;
      console.log(`[HYDRATION CALC] Weight: ${weight} lbs → Base target: ${target} oz`);
    }

    // 2. GENDER ADJUSTMENT
    if ('gender' in patient && patient.gender === 'male') {
      target *= 1.1; // Men need ~10% more
      console.log(`[HYDRATION CALC] Gender (male) → +10%: ${target} oz`);
    }

    // 3. AGE ADJUSTMENT
    if ('age' in patient && patient.age && (patient.age as number) >= 65) {
      // Same amount but will flag for reminders (no calculation change)
      console.log(`[HYDRATION CALC] Age 65+ → monitoring needed`);
    }

    // 4. EJECTION FRACTION (CRITICAL for cardiac patients!)
    // EF < 40% = Reduced (HFrEF) - STRICT fluid restriction
    // EF 40-49% = Mid-range (HFmrEF) - Moderate restriction
    // EF ≥ 50% = Preserved (HFpEF) - Normal hydration
    if ('ejectionFraction' in patient && patient.ejectionFraction !== undefined && patient.ejectionFraction !== null) {
      const ef = patient.ejectionFraction as number;

      if (ef < 40) {
        // Severely reduced EF - MAJOR restriction
        target = Math.min(target, 48); // Cap at 48 oz (1.5 liters)
        console.log(`[HYDRATION CALC] 🚨 CRITICAL: EF ${ef}% (HFrEF) → RESTRICTED to 48 oz MAX`);
      } else if (ef < 50) {
        // Mid-range EF - Moderate restriction
        target = Math.min(target, 64); // Cap at 64 oz (2 liters)
        console.log(`[HYDRATION CALC] ⚠️  EF ${ef}% (HFmrEF) → Limited to 64 oz`);
      } else {
        console.log(`[HYDRATION CALC] ✓ EF ${ef}% (HFpEF) → Normal hydration`);
      }
    }

    // 5. HEART FAILURE CHECK (also critical!)
    const hasHeartFailure = ('heartConditions' in patient && patient.heartConditions) ? (patient.heartConditions as string[]).some((condition: string) =>
      condition.toLowerCase().includes('heart failure') ||
      condition.toLowerCase().includes('chf') ||
      condition.toLowerCase().includes('congestive')
    ) : false;

    if (hasHeartFailure && !('ejectionFraction' in patient && patient.ejectionFraction)) {
      // CHF but no EF data - use conservative restriction
      target = Math.min(target, 64);
      console.log(`[HYDRATION CALC] ⚠️  HEART FAILURE (no EF data) → Capped at 64 oz`);
    }

    // 6. MEDICATIONS CHECK - Diuretics increase fluid needs!
    // Check medicationsAffectingHR field (may contain diuretic info)
    const hasDiuretics = ('medicationsAffectingHR' in patient && patient.medicationsAffectingHR) ? (patient.medicationsAffectingHR as string[]).some((med: string) =>
      med.toLowerCase().includes('lasix') ||
      med.toLowerCase().includes('furosemide') ||
      med.toLowerCase().includes('diuretic') ||
      med.toLowerCase().includes('bumetanide') ||
      med.toLowerCase().includes('torsemide') ||
      med.toLowerCase().includes('hydrochlorothiazide') ||
      med.toLowerCase().includes('hctz')
    ) : false;

    if (hasDiuretics && !hasHeartFailure) {
      // Diuretics WITHOUT heart failure = need MORE fluid to compensate
      target += 20; // Add 20 oz to compensate for diuretic fluid loss
      console.log(`[HYDRATION CALC] 💊 Diuretics detected → +20 oz compensation: ${target} oz`);
    } else if (hasDiuretics && hasHeartFailure) {
      console.log(`[HYDRATION CALC] 💊 Diuretics + CHF → Restriction maintained (doctor-managed)`);
    }

    // 7. SAFETY LIMITS
    target = Math.max(48, Math.min(target, 120)); // Keep between 48-120 oz

    const finalTarget = Math.round(target);
    console.log(`[HYDRATION CALC] ✅ Final personalized target: ${finalTarget} oz`);

    return finalTarget;
  };

  // DEBUG: Log surgery date source and value
  useEffect(() => {
    console.log('[SURGERY DATE DEBUG] ===================================');
    console.log('[SURGERY DATE DEBUG] patientData?.surgeryDate:', patientData?.surgeryDate);
    console.log('[SURGERY DATE DEBUG] user?.surgeryDate:', user?.surgeryDate);
    console.log('[SURGERY DATE DEBUG] Final surgeryDate:', surgeryDate);
    console.log('[SURGERY DATE DEBUG] User:', { id: user?.id, email: user?.email, name: user?.name });
    console.log('[SURGERY DATE DEBUG] Patient:', { id: patientData?.id, name: patientData?.name, userId: patientData?.userId });
    console.log('[SURGERY DATE DEBUG] ===================================');
  }, [surgeryDate, patientData, user]);

  useEffect(() => {
    loadVitals();
  }, [surgeryDate, selectedUserId, globalTimeView]); // Reload when surgery date, user, or time view changes

  // Load Hawk Alerts
  useEffect(() => {
    const loadHawkAlerts = async () => {
      try {
        const response = await api.getHAWKAlerts();
        setHawkAlerts(response.alerts || []);
      } catch (error) {
        console.error('Failed to load Hawk Alerts:', error);
      }
    };

    loadHawkAlerts();
  }, [vitals]); // Reload when vitals change

  // Listen for real-time heart rate updates from WebSocket
  // Throttle database reloads to every 30 seconds to prevent flickering and too many logs
  const lastReloadTime = useRef<number>(0);
  useEffect(() => {
    if (latestHeartRate?.data) {
      console.log('[VITALS-PAGE] Received real-time heart rate update:', latestHeartRate.data.heartRate, 'BPM');

      // 🫀 CRITICAL: Auto-detect Polar H10 and switch device filter
      if (latestHeartRate.data.source === 'polar_h10_live' || latestHeartRate.data.device?.includes('Polar H10')) {
        if (selectedDevice !== 'polar') {
          console.log('[AUTO-DETECT] 🫀 Polar H10 detected - switching to Polar device filter');
          setSelectedDevice('polar');
          toast.success('🫀 Polar H10 detected - Display switched to Polar data', { duration: 3000 });
        }
      }
      // Auto-detect Samsung
      else if (latestHeartRate.data.source === 'samsung' || latestHeartRate.data.device?.includes('Samsung')) {
        if (selectedDevice !== 'samsung') {
          console.log('[AUTO-DETECT] 📱 Samsung detected - switching to Samsung device filter');
          setSelectedDevice('samsung');
          toast.success('📱 Samsung Watch detected - Display switched to Samsung data', { duration: 3000 });
        }
      }

      // Only reload from database every 30 seconds to prevent flickering
      const now = Date.now();
      if (now - lastReloadTime.current > 30000) { // 30 seconds
        console.log('[VITALS-PAGE] Reloading vitals from database (30s throttle)');
        loadVitals();
        lastReloadTime.current = now;
      } else {
        console.log('[VITALS-PAGE] Skipping reload (throttled) - displaying live data only');
      }
    }
  }, [latestHeartRate, selectedDevice]);

  // 🫀 CRITICAL: Listen for HRV metrics from WebSocket (from Polar H10)
  useEffect(() => {
    console.log('[HRV-DEBUG] 🔍 latestVitals changed:', latestVitals);

    if (latestVitals?.data) {
      const vitals = latestVitals.data;
      console.log('[HRV-DEBUG] 🔍 Vitals data:', vitals);
      console.log('[HRV-DEBUG] 🔍 SDNN value:', vitals.sdnn, 'type:', typeof vitals.sdnn);
      console.log('[HRV-DEBUG] 🔍 RMSSD value:', vitals.rmssd, 'type:', typeof vitals.rmssd);
      console.log('[HRV-DEBUG] 🔍 PNN50 value:', vitals.pnn50, 'type:', typeof vitals.pnn50);

      // Extract HRV metrics if available
      if (vitals.sdnn !== undefined || vitals.rmssd !== undefined || vitals.pnn50 !== undefined) {
        console.log('[HRV] 🫀✅ Received real-time HRV metrics from WebSocket:', {
          sdnn: vitals.sdnn,
          rmssd: vitals.rmssd,
          pnn50: vitals.pnn50
        });

        setHrvMetrics({
          sdnn: vitals.sdnn,
          rmssd: vitals.rmssd,
          pnn50: vitals.pnn50
        });
      } else {
        console.log('[HRV-DEBUG] ⚠️ NO HRV metrics in vitals data');
      }
    } else {
      console.log('[HRV-DEBUG] ⚠️ latestVitals.data is null/undefined');
    }
  }, [latestVitals]);

  // Update nuclear clock every second - TEMPORARILY DISABLED for performance
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Changed from 1000ms (1 sec) to 60000ms (1 min) for better performance

    return () => clearInterval(timer);
  }, []);

  // Load Hydration Logs
  useEffect(() => {
    loadHydrationLogs();
  }, [surgeryDate, selectedUserId, globalTimeView]); // Reload when surgery date, user, or time view changes

  // Listen for global water button updates
  useEffect(() => {
    const handleHydrationUpdate = () => {
      console.log('[WATER] Global hydration-updated event received, reloading...');
      loadHydrationLogs();
    };

    window.addEventListener('hydration-updated', handleHydrationUpdate);
    return () => window.removeEventListener('hydration-updated', handleHydrationUpdate);
  }, [surgeryDate, selectedUserId, globalTimeView]);

  // Accumulate real-time ECG waveform data from WebSocket
  useEffect(() => {
    if (latestECG) {
      console.log('[ECG] New ECG data received from WebSocket:', latestECG);

      // 🫀 CRITICAL FIX: Backend sends "samples" not "ecgWaveform"
      // Handle ECG waveform array if available (from Polar H10 Web Bluetooth)
      if (latestECG.data?.samples && Array.isArray(latestECG.data.samples)) {
        console.log(`[ECG] ✅ Received ${latestECG.data.samples.length} ECG samples from backend`);
        setEcgBuffer(prev => {
          const newBuffer = [...prev, ...latestECG.data.samples];
          // Keep only last ECG_BUFFER_SIZE samples (rolling window)
          if (newBuffer.length > ECG_BUFFER_SIZE) {
            return newBuffer.slice(newBuffer.length - ECG_BUFFER_SIZE);
          }
          return newBuffer;
        });
      }
      // Fallback: Handle old format with ecgWaveform field name
      else if (latestECG.ecgWaveform && Array.isArray(latestECG.ecgWaveform)) {
        console.log(`[ECG] ✅ Received ${latestECG.ecgWaveform.length} ECG samples (legacy format)`);
        setEcgBuffer(prev => {
          const newBuffer = [...prev, ...latestECG.ecgWaveform];
          if (newBuffer.length > ECG_BUFFER_SIZE) {
            return newBuffer.slice(newBuffer.length - ECG_BUFFER_SIZE);
          }
          return newBuffer;
        });
      }
      // Handle single ECG value if available (backward compatibility)
      else if (latestECG.data?.value !== undefined && latestECG.data?.value !== null) {
        console.log(`[ECG] ✅ Received single ECG value: ${latestECG.data.value}mV`);
        setEcgBuffer(prev => {
          const newBuffer = [...prev, latestECG.data.value];
          if (newBuffer.length > ECG_BUFFER_SIZE) {
            return newBuffer.slice(newBuffer.length - ECG_BUFFER_SIZE);
          }
          return newBuffer;
        });
      } else {
        console.warn('[ECG] ⚠️ Received ECG data but no recognizable samples/value field:', latestECG);
      }
    }
  }, [latestECG]);

  // 🎥 Continuously update recorded data while recording is active
  useEffect(() => {
    if (isRecording && ecgBuffer.length > 0) {
      setRecordedEcgData([...ecgBuffer]); // Update with latest buffer
      setRecordedHrvData({
        sdnn: hrvMetrics.sdnn,
        rmssd: hrvMetrics.rmssd,
        pnn50: hrvMetrics.pnn50
      }); // Update HRV metrics
    }
  }, [isRecording, ecgBuffer, hrvMetrics]);

  const loadVitals = async () => {
    try {
      setIsLoading(true);

      // UNIFIED: Calculate date range with 1-month buffers
      const { startDate, endDate } = calculateDateRange(globalTimeView, surgeryDate);

      console.log(`[VitalsPage] Loading vitals for ${globalTimeView} view: ${startDate} to ${endDate}`);

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

      // Latest vital is provided by WebSocket hook (line 160)
      // No need to fetch separately - real-time updates handled automatically
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

  const loadHydrationLogs = async () => {
    try {
      // UNIFIED: Calculate date range with 1-month buffers
      const { startDate, endDate } = calculateDateRange(globalTimeView, surgeryDate);

      console.log(`[HYDRATION] Loading logs for ${globalTimeView} view: ${startDate} to ${endDate}`);

      const logs = await api.getHydrationLogs({
        startDate,
        endDate,
        userId: selectedUserId || undefined
      });

      console.log(`[HYDRATION] Loaded ${logs?.length || 0} hydration logs`);
      setHydrationLogs(logs || []);
    } catch (error) {
      console.error('[HYDRATION] Failed to load hydration logs:', error);
      setHydrationLogs([]);
    }
  };

  // Polar H10 Live Streaming Handlers
  const handleStartECGStream = async () => {
    try {
      setStreamingStatus('connecting');
      setStreamError(null);

      const response = await fetch('http://localhost:4000/api/polar-h10/start-stream', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setIsStreaming(true);
        setStreamingStatus('streaming');
        toast.success('🫀 Live ECG streaming started!');
      } else {
        setStreamingStatus('error');
        setStreamError(data.error || 'Failed to start streaming');
        toast.error('Failed to start ECG streaming');
      }
    } catch (error: any) {
      console.error('Error starting ECG stream:', error);
      setStreamingStatus('error');
      setStreamError(error.message);
      toast.error('Error starting ECG streaming');
    }
  };

  const handleStopECGStream = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/polar-h10/stop-stream', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setIsStreaming(false);
        setStreamingStatus('idle');
        toast.success('ECG streaming stopped');
      }
    } catch (error: any) {
      console.error('Error stopping ECG stream:', error);
      toast.error('Error stopping ECG streaming');
    }
  };

  const handleECGFileUpload = async (file: File) => {
    try {
      setUploadingFile(true);

      const formData = new FormData();
      formData.append('ecgFile', file);

      const response = await fetch('http://localhost:4000/api/ecg/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`✅ Imported ${data.samplesCount} ECG samples!`);
        // Refresh vitals display
        loadVitals();
      } else {
        toast.error('Failed to import ECG file');
      }
    } catch (error: any) {
      console.error('Error uploading ECG file:', error);
      toast.error('Error importing ECG file');
    } finally {
      setUploadingFile(false);
    }
  };

  // 🎥 Start recording ECG data for cardiologist
  const startRecording = () => {
    setIsRecording(true);
    setRecordingStartTime(new Date());
    setRecordedEcgData([...ecgBuffer]); // Copy current buffer
    setRecordedHrvData({
      sdnn: hrvMetrics.sdnn,
      rmssd: hrvMetrics.rmssd,
      pnn50: hrvMetrics.pnn50
    }); // Capture current HRV metrics
    toast.success('🎥 Recording started! Data will be captured for cardiologist review.');
    console.log('[RECORD] Started recording ECG and HRV data');
  };

  // 🎥 Stop recording and prepare export
  const stopRecording = () => {
    setIsRecording(false);
    const duration = recordingStartTime ? (new Date().getTime() - recordingStartTime.getTime()) / 1000 : 0;
    toast.success(`✅ Recording stopped! Captured ${duration.toFixed(1)}s of ECG data.`);
    console.log('[RECORD] Stopped recording. Duration:', duration, 'seconds');
  };

  // 🎬 Replay last 30 seconds with filtering comparison
  const replayLast30Seconds = () => {
    if (recordedEcgData.length === 0) {
      toast.error('No recorded data to replay. Please start recording first.');
      return;
    }

    // Get last 30 seconds (130 Hz * 30s = 3900 samples)
    const samplesFor30Sec = 130 * 30;
    const startIndex = Math.max(0, recordedEcgData.length - samplesFor30Sec);
    const last30SecData = recordedEcgData.slice(startIndex);

    // Create filtered version
    const filteredData = filterECGSignal(last30SecData, 130, {
      removeBaseline: true,
      removePowerline: true,
      removeSpikes: true,
      removeMuscleNoise: true,
      powerlineFreq: 60,
    });

    const signalQuality = estimateSignalQuality(last30SecData, filteredData);

    console.log('[REPLAY] Replaying last', (last30SecData.length / 130).toFixed(1), 'seconds');
    console.log('[REPLAY] Signal quality after filtering:', signalQuality.toFixed(1), 'dB');

    setReplayData({ raw: last30SecData, filtered: filteredData });
    setShowReplayModal(true);
  };

  // 📊 Export recorded ECG data for cardiologist (CSV format)
  const exportRecordingForCardiologist = () => {
    if (recordedEcgData.length === 0) {
      toast.error('No recorded data to export. Please start recording first.');
      return;
    }

    const patient = user;
    const timestamp = recordingStartTime || new Date();
    const durationSeconds = recordedEcgData.length / 130; // 130 Hz sampling rate

    // Apply noise filtering if enabled
    let exportData = recordedEcgData;
    let signalQuality = 0;

    if (applyNoiseFilter) {
      console.log('[EXPORT] Applying noise filtering to ECG data...');
      exportData = filterECGSignal(recordedEcgData, 130, {
        removeBaseline: true,
        removePowerline: true,
        removeSpikes: true,
        removeMuscleNoise: true,
        powerlineFreq: 60, // US standard (change to 50 for EU)
      });
      signalQuality = estimateSignalQuality(recordedEcgData, exportData);
      console.log('[EXPORT] Filtering complete. Signal quality:', signalQuality.toFixed(1), 'dB');
    }

    // Create CSV content with medical header
    let csvContent = '';
    csvContent += '# ECG Recording for Cardiologist Review\n';
    csvContent += `# Patient: ${patient?.name || 'Unknown'}\n`;
    csvContent += `# Email: ${patient?.email || 'N/A'}\n`;
    csvContent += `# Recording Date: ${timestamp.toLocaleString()}\n`;
    csvContent += `# Duration: ${durationSeconds.toFixed(2)} seconds\n`;
    csvContent += `# Sampling Rate: 130 Hz (Polar H10)\n`;
    csvContent += `# Total Samples: ${exportData.length}\n`;
    csvContent += `# Noise Filtering: ${applyNoiseFilter ? 'ENABLED' : 'DISABLED'}\n`;
    if (applyNoiseFilter) {
      csvContent += `# Signal Quality (SNR): ${signalQuality.toFixed(1)} dB\n`;
      csvContent += `# Filters Applied: Baseline removal, 60Hz powerline removal, spike removal, muscle noise removal\n`;
    }
    csvContent += '#\n';
    csvContent += '# HRV Metrics:\n';
    csvContent += `# SDNN (Standard Deviation NN intervals): ${recordedHrvData?.sdnn?.toFixed(2) || 'N/A'} ms\n`;
    csvContent += `# RMSSD (Root Mean Square of Successive Differences): ${recordedHrvData?.rmssd?.toFixed(2) || 'N/A'} ms\n`;
    csvContent += `# pNN50 (Percentage of NN intervals >50ms): ${recordedHrvData?.pnn50?.toFixed(2) || 'N/A'} %\n`;
    csvContent += '#\n';
    csvContent += 'Sample_Index,Time_Seconds,Voltage_mV\n';

    // Add ECG sample data
    exportData.forEach((voltage, index) => {
      const timeSeconds = (index / 130).toFixed(4);
      csvContent += `${index},${timeSeconds},${voltage.toFixed(6)}\n`;
    });

    // Create downloadable file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const filterSuffix = applyNoiseFilter ? '_FILTERED' : '_RAW';
    const filename = `ECG_Recording${filterSuffix}_${patient?.name?.replace(/\s+/g, '_')}_${timestamp.toISOString().split('T')[0]}_${timestamp.getHours()}-${timestamp.getMinutes()}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const filterStatus = applyNoiseFilter ? `(Filtered - SNR: ${signalQuality.toFixed(1)}dB)` : '(Raw - Unfiltered)';
    toast.success(`📊 ECG exported for cardiologist ${filterStatus}`);
    console.log('[EXPORT] Exported ECG recording:', filename, filterStatus);
  };

  const handleAddWater = async (ounces: number) => {
    try {
      // CRITICAL: Ensure integer math
      const ouncesInt = Math.round(ounces);
      console.log(`[WATER] Adding ${ouncesInt} oz for ${waterCardDate}...`);

      const existingLog = hydrationLogs.find(log => log.date === waterCardDate);

      if (existingLog) {
        // CRITICAL: Use integer math to avoid decimals
        const currentTotal = Math.round(existingLog.totalOunces || 0);
        const newTotal = currentTotal + ouncesInt;

        console.log(`[WATER] Updating existing log ${existingLog.id}: ${currentTotal} + ${ouncesInt} = ${newTotal}`);

        const updatedLog = await api.updateHydrationLog(existingLog.id, {
          totalOunces: newTotal,
        });

        console.log(`[WATER] Updated! New total: ${Math.round(updatedLog.totalOunces)} oz`);
        toast.success(`💧 +${ouncesInt} oz for ${format(new Date(waterCardDate), 'MMM dd')}! Total: ${Math.round(updatedLog.totalOunces)} oz`, {
          icon: '💧',
          style: {
            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            color: '#fff',
            fontWeight: 'bold',
          },
        });
      } else {
        // Create new log
        console.log(`[WATER] Creating new log for ${waterCardDate} with ${ouncesInt} oz`);
        const newLog = await api.createHydrationLog({
          date: waterCardDate,
          totalOunces: ouncesInt,
          userId: selectedUserId || user?.id,
        });
        console.log(`[WATER] Created! Total: ${Math.round(newLog.totalOunces)} oz`);
        toast.success(`💧 +${ouncesInt} oz for ${format(new Date(waterCardDate), 'MMM dd')}! Total: ${Math.round(newLog.totalOunces)} oz`, {
          icon: '💧',
          style: {
            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            color: '#fff',
            fontWeight: 'bold',
          },
        });
      }

      // Reload hydration logs to get fresh data
      await loadHydrationLogs();
    } catch (error) {
      console.error('[WATER] Failed to log water intake:', error);
      toast.error('Failed to log water intake');
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

  const handleDeleteVitalReading = async (vitalId: number, timestamp: string) => {
    // Confirm deletion
    const confirmDelete = window.confirm(`Are you sure you want to delete the vital reading from ${format(new Date(timestamp), 'MMM d, h:mm a')}? This action cannot be undone.`);

    if (!confirmDelete) {
      return;
    }

    try {
      await api.deleteVital(vitalId);
      toast.success('Vital reading deleted successfully');

      // Reload vitals data to reflect the deletion
      await loadVitals();
    } catch (error) {
      console.error('Failed to delete vital reading:', error);
      toast.error('Failed to delete vital reading');
    }
  };

  const getBloodPressureStatus = (systolic?: number, diastolic?: number) => {
    if (!systolic || !diastolic) return { status: 'Unknown', className: 'text-yellow-500' };
    if (systolic < 120 && diastolic < 80) return { status: 'Normal', className: 'text-green-500' };
    if (systolic < 130 && diastolic < 80) return { status: 'Elevated', className: 'text-yellow-500' };
    if (systolic < 140 || diastolic < 90) return { status: 'Stage 1 Hypertension', className: 'text-yellow-500' };
    return { status: 'Stage 2 Hypertension', className: 'text-red-500' };
  };

  // Filter vitals by selected device AND time range for CHARTS ONLY
  const filteredVitals = vitals.filter(v => {
    // Device filter
    let deviceMatch = true;
    if (selectedDevice === 'samsung') {
      deviceMatch = v.deviceId?.toLowerCase().includes('samsung') || v.source === 'device';
    } else if (selectedDevice === 'polar') {
      deviceMatch = v.deviceId?.toLowerCase().includes('polar');
    }

    // Time range filter based on globalTimeView - ALWAYS start from surgery date
    let timeMatch = true;
    const vitalDate = new Date(v.timestamp);

    if (surgeryDate) {
      const surgeryDateObj = new Date(surgeryDate);

      switch (globalTimeView) {
        case '7d':
          // Surgery date to 7 days after surgery
          const sevenDaysAfter = addDays(surgeryDateObj, 7);
          timeMatch = vitalDate >= surgeryDateObj && vitalDate <= sevenDaysAfter;
          break;
        case '30d':
          // Surgery date to 30 days after surgery
          const thirtyDaysAfter = addDays(surgeryDateObj, 30);
          timeMatch = vitalDate >= surgeryDateObj && vitalDate <= thirtyDaysAfter;
          break;
        case '90d':
          // Surgery date to 90 days after surgery
          const ninetyDaysAfter = addDays(surgeryDateObj, 90);
          timeMatch = vitalDate >= surgeryDateObj && vitalDate <= ninetyDaysAfter;
          break;
        case 'surgery':
          // 1 month before surgery to 3 months after surgery
          const oneMonthBefore = subMonths(surgeryDateObj, 1);
          const threeMonthsAfter = addMonths(surgeryDateObj, 3);
          timeMatch = vitalDate >= oneMonthBefore && vitalDate <= threeMonthsAfter;
          break;
      }
    } else {
      // Fallback if no surgery date: use current date ranges
      const now = new Date();
      switch (globalTimeView) {
        case '7d':
          timeMatch = vitalDate >= subDays(now, 7) && vitalDate <= now;
          break;
        case '30d':
          timeMatch = vitalDate >= subDays(now, 30) && vitalDate <= now;
          break;
        case '90d':
          timeMatch = vitalDate >= subDays(now, 90) && vitalDate <= now;
          break;
        case 'surgery':
          timeMatch = vitalDate >= subMonths(now, 3) && vitalDate <= now;
          break;
      }
    }

    return deviceMatch && timeMatch;
  });

  // ALWAYS use the absolute latest vitals for dashboard display (not filtered)
  // Priority: 1) WebSocket live data, 2) Most recent from database
  // This ensures "Last Vital Check" and vitals cards always show the most recent data
  // 🫀 CRITICAL: WebSocket sends { userId, timestamp, data }, so we need latestVitals.data
  // 🫀 CRITICAL FIX: Merge WebSocket data with database data to preserve HRV fields
  const dbLatest = vitals.length > 0 ? vitals[vitals.length - 1] : null;
  const filteredLatest = latestVitals?.data
    ? { ...dbLatest, ...latestVitals.data, sdnn: latestVitals.data.sdnn || dbLatest?.sdnn, rmssd: latestVitals.data.rmssd || dbLatest?.rmssd, pnn50: latestVitals.data.pnn50 || dbLatest?.pnn50 }
    : dbLatest;

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
    let dateKey = ''; // yyyy-MM-dd format for lookups
    try {
      if (v.timestamp) {
        const date = new Date(v.timestamp);
        if (!isNaN(date.getTime())) {
          dateStr = format(date, 'MMM dd, yyyy'); // Full calendar date for timeline
          dateKey = format(date, 'yyyy-MM-dd'); // Key for hydration log lookup
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

    // CRITICAL FIX: Find hydration log using yyyy-MM-dd format, not display format!
    const hydrationLog = hydrationLogs.find(log => log.date === dateKey);

    // DEBUG: Log hydration matching
    if (dateKey && hydrationLog) {
      console.log(`[CHART] Matched hydration for ${dateKey}: ${hydrationLog.totalOunces} oz`);
    }

    return {
      date: dateStr,
      systolic: v.bloodPressureSystolic,
      diastolic: v.bloodPressureDiastolic,
      heartRate: v.heartRate,
      weight: v.weight,
      bloodSugar: v.bloodSugar,
      temperature: v.temperature,
      hydration: v.hydrationStatus, // Keep old percentage for backward compatibility
      hydrationOunces: hydrationLog?.totalOunces,
      hydrationTarget: hydrationLog?.targetOunces,
      o2: v.oxygenSaturation,
      peakFlow: v.peakFlow,
      map: map,
      bpVariability: bpVariability,
    };
  });

  // DEBUG: Log chartData hydration values
  console.log('[CHART] chartData hydration values:', chartData.map(d => ({
    date: d.date,
    hydrationOunces: d.hydrationOunces,
    hydrationTarget: d.hydrationTarget
  })));
  console.log('[CHART] hydrationLogs:', hydrationLogs.map(log => ({ date: log.date, totalOunces: log.totalOunces })));

  // HYDRATION-SPECIFIC CHART DATA
  // Build chart data directly from hydration logs - ONLY show requested time period
  const hydrationChartData = (() => {
    const today = new Date();
    let start: Date;
    let end: Date = today;

    // Calculate DISPLAY range (not data fetch range)
    switch (globalTimeView) {
      case '7d':
        start = subDays(today, 7);
        break;
      case '30d':
        start = subDays(today, 30);
        break;
      case '90d':
        start = subDays(today, 90);
        break;
      case 'surgery':
      default:
        if (surgeryDate) {
          // Surgery view: FROM surgery date (Day 0) to today
          start = new Date(surgeryDate);
          end = today;
        } else {
          // Fallback: 90 days
          start = subDays(today, 90);
        }
        break;
    }

    // For surgery timeline: show complete date range from Day 0
    // For other views: only show dates with actual data
    let dateArray;

    if (globalTimeView === 'surgery' && surgeryDate) {
      // Surgery view: complete timeline from surgery date (Day 0) to today
      dateArray = [];
      let currentDate = new Date(start);

      while (currentDate <= end) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const log = hydrationLogs.find(l => l.date === dateStr);

        dateArray.push({
          date: format(currentDate, 'MMM dd, yyyy'),
          hydrationOunces: log ? Math.round(log.totalOunces || 0) : null,
          hydrationTarget: log?.targetOunces || null,
        });

        currentDate = addDays(currentDate, 1);
      }
      console.log(`[CHART] Surgery timeline: ${dateArray.length} days from Day 0 (${format(start, 'MMM dd, yyyy')}) to today`);
    } else {
      // Week/Month/90 days: only show dates with actual logged data
      dateArray = hydrationLogs
        .filter(log => {
          const logDate = new Date(log.date);
          return logDate >= start && logDate <= end;
        })
        .map(log => ({
          date: format(new Date(log.date), 'MMM dd, yyyy'),
          hydrationOunces: Math.round(log.totalOunces || 0),
          hydrationTarget: log.targetOunces,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      console.log(`[CHART] ${globalTimeView}: ${dateArray.length} dates with logged data`);
    }

    return dateArray;
  })();

  console.log('[CHART] hydrationChartData with full range:', hydrationChartData);

  // Fill in missing dates for ALL chart data (not just hydration) to ensure X-axis starts at surgery date
  const filledChartData = (() => {
    if (!surgeryDate) return chartData;

    // Determine date range based on globalTimeView
    let startDate: Date;
    let endDate: Date;
    const today = new Date();
    const surgeryDateObj = new Date(surgeryDate);

    switch (globalTimeView) {
      case '7d':
        startDate = surgeryDateObj;
        endDate = addDays(surgeryDateObj, 7);
        break;
      case '30d':
        startDate = surgeryDateObj;
        endDate = addDays(surgeryDateObj, 30);
        break;
      case '90d':
        startDate = surgeryDateObj;
        endDate = addDays(surgeryDateObj, 90);
        break;
      case 'surgery':
        startDate = subMonths(surgeryDateObj, 1);
        endDate = addMonths(surgeryDateObj, 3);
        break;
      default:
        return chartData;
    }

    // Create array with ALL dates in range
    const dateArray = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = format(currentDate, 'MMM dd, yyyy');

      // Find existing data for this date
      const existingData = chartData.find(d => d.date === dateStr);

      if (existingData) {
        dateArray.push(existingData);
      } else {
        // Add placeholder with null values
        dateArray.push({
          date: dateStr,
          systolic: null,
          diastolic: null,
          heartRate: null,
          weight: null,
          temp: null,
          hydration: null,
          o2: null,
          peakflow: null,
          map: null,
          bpVariability: null,
        });
      }

      currentDate = addDays(currentDate, 1);
    }

    console.log(`[CHART] Filled ${globalTimeView}: ${dateArray.length} total dates from ${format(startDate, 'MMM dd')} to ${format(endDate, 'MMM dd')}`);
    return dateArray;
  })();

  // Use hydration-specific chart data when hydration metric is selected
  const activeChartData = selectedMetric === 'hydration' ? hydrationChartData : filledChartData;

  // Smart Label Positioning Function - Avoids Data Point Collisions
  const getSmartLabelPosition = (yValue: number, dataKey: string | string[], threshold: number = 10): 'top' | 'bottom' => {
    if (!activeChartData || activeChartData.length === 0) return 'top';

    // Count points above and below the reference line
    let pointsAbove = 0;
    let pointsBelow = 0;

    activeChartData.forEach(dataPoint => {
      // Handle both single dataKey (string) and multiple dataKeys (array for BP)
      const dataKeys = Array.isArray(dataKey) ? dataKey : [dataKey];

      dataKeys.forEach(key => {
        const value = dataPoint[key];
        if (value !== null && value !== undefined && typeof value === 'number') {
          // Check if data point is near the reference line
          if (Math.abs(value - yValue) <= threshold) {
            // Point is close to the line, count its position
            if (value > yValue) {
              pointsAbove++;
            } else {
              pointsBelow++;
            }
          }
        }
      });
    });

    // Place label where there are FEWER data points to avoid collision
    // If equal or no nearby points, default to 'top'
    return pointsBelow < pointsAbove ? 'bottom' : 'top';
  };

  const bpStatus = getBloodPressureStatus(
    filteredLatest?.bloodPressureSystolic,
    filteredLatest?.bloodPressureDiastolic
  );

  // A380 COCKPIT CALCULATIONS
  const postOpWeek = surgeryDate ? Math.floor((new Date().getTime() - new Date(surgeryDate).getTime()) / (1000 * 60 * 60 * 24 * 7)) : null;
  const currentMAP = (filteredLatest?.bloodPressureSystolic && filteredLatest?.bloodPressureDiastolic)
    ? Math.round((filteredLatest.bloodPressureSystolic + 2 * filteredLatest.bloodPressureDiastolic) / 3)
    : null;
  const pulsePressure = (filteredLatest?.bloodPressureSystolic && filteredLatest?.bloodPressureDiastolic)
    ? filteredLatest.bloodPressureSystolic - filteredLatest.bloodPressureDiastolic
    : null;
  const latestBPVariability = chartData.length > 0 ? chartData[chartData.length - 1].bpVariability : null;
  // 🫀 CRITICAL: Filter to comprehensive vitals with HRV data (same as Historic Flight Data)
  const comprehensiveVitals = vitals.filter(v => v.sdnn || v.rmssd || v.pnn50);
  console.log('[HRV-GAUGE-DEBUG] 🔍 Data sources:');
  console.log('[HRV-GAUGE-DEBUG]   hrvMetrics:', hrvMetrics);
  console.log('[HRV-GAUGE-DEBUG]   comprehensiveVitals count:', comprehensiveVitals.length);
  console.log('[HRV-GAUGE-DEBUG]   comprehensiveVitals latest:', comprehensiveVitals.length > 0 ? comprehensiveVitals[comprehensiveVitals.length - 1] : null);
  console.log('[HRV-GAUGE-DEBUG]   filteredLatest:', filteredLatest);
  // 🫀 CRITICAL FIX: Prioritize LIVE WebSocket data (hrvMetrics) over database values for real-time gauge updates
  // Convert to numbers to handle string values from WebSocket/database
  const sdnnRaw = hrvMetrics.sdnn ?? ((comprehensiveVitals.length > 0 ? comprehensiveVitals[comprehensiveVitals.length - 1]?.sdnn : null) || filteredLatest?.sdnn);
  const rmssdRaw = hrvMetrics.rmssd ?? ((comprehensiveVitals.length > 0 ? comprehensiveVitals[comprehensiveVitals.length - 1]?.rmssd : null) || filteredLatest?.rmssd);
  const pnn50Raw = hrvMetrics.pnn50 ?? ((comprehensiveVitals.length > 0 ? comprehensiveVitals[comprehensiveVitals.length - 1]?.pnn50 : null) || filteredLatest?.pnn50);
  const sdnn = sdnnRaw != null ? Number(sdnnRaw) : null;
  const rmssd = rmssdRaw != null ? Number(rmssdRaw) : null;
  const pnn50 = pnn50Raw != null ? Number(pnn50Raw) : null;
  console.log('[HRV-GAUGE-DEBUG] 🫀 FINAL VALUES FOR GAUGES:', { sdnn, rmssd, pnn50 });
  const todayDate = format(new Date(), 'yyyy-MM-dd');
  const todayHydration = hydrationLogs.find(log => log.date === todayDate);
  const hydrationTarget = todayHydration?.targetOunces || calculatePersonalizedHydrationTarget();
  const hydrationActual = todayHydration?.totalOunces || 0;
  const restingHR = vitals.length > 0 ? Math.min(...vitals.filter(v => v.heartRate).map(v => v.heartRate!)) : null;
  const avgHR = vitals.length > 0 ? Math.round(vitals.filter(v => v.heartRate).map(v => v.heartRate!).reduce((a, b) => a + b, 0) / vitals.filter(v => v.heartRate).length) : null;
  const vo2Max = filteredLatest?.vo2Max || null;
  const sixMinWalk = filteredLatest?.sixMinWalk || null;
  const mets = null;
  const maxHR = null;
  const hrRecovery = filteredLatest?.hrRecovery || null;
  const ejectionFraction = filteredLatest?.ejectionFraction || null;

  // LUXURY GAUGE CALCULATIONS - Filter vitals by throttle position or globalTimeView
  const getLuxuryTimePeriodFilter = () => {
    // If throttle is providing a custom target date, use that
    if (throttleTargetDate && surgeryDate) {
      const surgeryDateObj = new Date(surgeryDate);
      return (v: VitalsSample) => {
        const vitalDate = new Date(v.timestamp);
        return vitalDate >= surgeryDateObj && vitalDate <= throttleTargetDate;
      };
    }

    // Otherwise use the preset time periods
    const now = new Date();
    const maxCutoffDate = subDays(now, 90); // App max is 90 days
    let cutoffDate: Date;

    if (globalTimeView === '7d') {
      cutoffDate = subDays(now, 7);
    } else if (globalTimeView === '30d') {
      cutoffDate = subDays(now, 30);
    } else if (globalTimeView === '90d') {
      cutoffDate = subDays(now, 90);
    } else {
      // 'surgery' - from surgery date OR 90 days ago, whichever is more recent
      if (surgeryDate) {
        const surgeryDateObj = new Date(surgeryDate);
        // If surgery is within 90 days, use surgery date
        // If surgery is older than 90 days, still cap at 90 days
        cutoffDate = surgeryDateObj > maxCutoffDate ? surgeryDateObj : maxCutoffDate;
      } else {
        // No surgery date - fallback to 90 days
        cutoffDate = maxCutoffDate;
      }
    }

    return (v: VitalsSample) => new Date(v.timestamp) >= cutoffDate;
  };

  const luxuryFilter = getLuxuryTimePeriodFilter();
  const filteredForLuxury = vitals.filter(v => {
    // Apply time period filter ONLY
    // 🫀 CRITICAL: Gauges should show data from ALL devices, not filtered by selectedDevice
    // This ensures gauges always display the most recent vitals regardless of chart filter
    if (!luxuryFilter(v)) return false;

    return true; // Show all devices for gauges
  });

  // DEBUG: Log filtered data range
  if (filteredForLuxury.length > 0) {
    const dates = filteredForLuxury.map(v => new Date(v.timestamp)).sort((a, b) => a.getTime() - b.getTime());
    console.log(`[LUXURY GAUGES] Filtered ${filteredForLuxury.length} vitals from ${dates[0].toLocaleDateString()} to ${dates[dates.length - 1].toLocaleDateString()}`);
    if (throttleTargetDate) {
      console.log(`[THROTTLE] Target date: ${throttleTargetDate.toLocaleDateString()}`);
    } else {
      console.log(`[TIME VIEW] Using globalTimeView: ${globalTimeView}`);
    }
  }

  // Calculate MOST RECENT within the time period (not absolute latest)
  const bpVitalsForRecent = filteredForLuxury.filter(v => v.bloodPressureSystolic && v.bloodPressureDiastolic)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const recentBP = bpVitalsForRecent.length > 0
    ? `${bpVitalsForRecent[0].bloodPressureSystolic}/${bpVitalsForRecent[0].bloodPressureDiastolic}`
    : null;

  const hrVitalsForRecent = filteredForLuxury.filter(v => v.heartRate)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  // Use live WebSocket data if available, otherwise use most recent database value
  const recentHR = latestHeartRate?.data?.heartRate ||
    (hrVitalsForRecent.length > 0 ? hrVitalsForRecent[0].heartRate! : null);

  const o2VitalsForRecent = filteredForLuxury.filter(v => v.oxygenSaturation)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const recentO2 = o2VitalsForRecent.length > 0 ? o2VitalsForRecent[0].oxygenSaturation! : null;

  const respVitalsForRecent = filteredForLuxury.filter(v => v.respiratoryRate)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const recentResp = respVitalsForRecent.length > 0 ? respVitalsForRecent[0].respiratoryRate! : null;

  // Calculate averages for the 4 luxury gauges
  const bpVitals = filteredForLuxury.filter(v => v.bloodPressureSystolic && v.bloodPressureDiastolic);
  const avgBPSystolic = bpVitals.length > 0
    ? Math.round(bpVitals.map(v => v.bloodPressureSystolic!).reduce((a, b) => a + b, 0) / bpVitals.length)
    : null;
  const avgBPDiastolic = bpVitals.length > 0
    ? Math.round(bpVitals.map(v => v.bloodPressureDiastolic!).reduce((a, b) => a + b, 0) / bpVitals.length)
    : null;
  const avgBP = avgBPSystolic && avgBPDiastolic ? `${avgBPSystolic}/${avgBPDiastolic}` : null;

  const hrVitals = filteredForLuxury.filter(v => v.heartRate);
  const avgHeartRate = hrVitals.length > 0
    ? Math.round(hrVitals.map(v => v.heartRate!).reduce((a, b) => a + b, 0) / hrVitals.length)
    : null;

  // Resting Heart Rate - Calculate from lowest 10% of readings (proxy for resting state)
  // Device data (Samsung/Polar) is included in hrVitals if available
  const restingHeartRate = hrVitals.length >= 5
    ? (() => {
        const sorted = [...hrVitals].sort((a, b) => a.heartRate! - b.heartRate!);
        const bottom10PercentCount = Math.max(3, Math.ceil(sorted.length * 0.1));
        const lowestReadings = sorted.slice(0, bottom10PercentCount);
        return Math.round(lowestReadings.map(v => v.heartRate!).reduce((a, b) => a + b, 0) / lowestReadings.length);
      })()
    : null;

  const o2Vitals = filteredForLuxury.filter(v => v.oxygenSaturation);
  const avgO2Saturation = o2Vitals.length > 0
    ? Math.round(o2Vitals.map(v => v.oxygenSaturation!).reduce((a, b) => a + b, 0) / o2Vitals.length)
    : null;

  const respVitals = filteredForLuxury.filter(v => v.respiratoryRate);
  const avgRespiratoryRate = respVitals.length > 0
    ? Math.round(respVitals.map(v => v.respiratoryRate!).reduce((a, b) => a + b, 0) / respVitals.length)
    : null;

  // Resting Blood Pressure - Calculate from lowest 10% of systolic readings (proxy for resting state)
  const restingBP = bpVitals.length >= 5
    ? (() => {
        const sorted = [...bpVitals].sort((a, b) => a.bloodPressureSystolic! - b.bloodPressureSystolic!);
        const bottom10PercentCount = Math.max(3, Math.ceil(sorted.length * 0.1));
        const lowestReadings = sorted.slice(0, bottom10PercentCount);
        const restingSystolic = Math.round(lowestReadings.map(v => v.bloodPressureSystolic!).reduce((a, b) => a + b, 0) / lowestReadings.length);
        const restingDiastolic = Math.round(lowestReadings.map(v => v.bloodPressureDiastolic!).reduce((a, b) => a + b, 0) / lowestReadings.length);
        return `${restingSystolic}/${restingDiastolic}`;
      })()
    : null;

  // MAX Heart Rate - Highest heart rate from current time period (all sources)
  const maxHeartRate = hrVitals.length > 0
    ? Math.max(...hrVitals.map(v => v.heartRate!))
    : null;

  // MAX Blood Pressure - Highest systolic/diastolic from current time period (all sources)
  const maxBP = bpVitals.length > 0
    ? (() => {
        const maxSystolic = Math.max(...bpVitals.map(v => v.bloodPressureSystolic!));
        const maxSystolicReading = bpVitals.find(v => v.bloodPressureSystolic === maxSystolic);
        return maxSystolicReading
          ? `${maxSystolicReading.bloodPressureSystolic}/${maxSystolicReading.bloodPressureDiastolic}`
          : null;
      })()
    : null;

  // DEBUG: Log calculated values for HR
  if (hrVitals.length > 0) {
    console.log(`[HEART RATE] Recent: ${recentHR}, Average: ${avgHeartRate}, Resting: ${restingHeartRate}, MAX: ${maxHeartRate} (from ${hrVitals.length} readings)`);
  }

  // DEBUG: Log calculated values for BP
  if (bpVitals.length > 0) {
    console.log(`[BLOOD PRESSURE] Recent: ${recentBP}, Average: ${avgBP}, Resting: ${restingBP}, MAX: ${maxBP} (from ${bpVitals.length} readings)`);
  }

  // Temperature calculations - Recent and Average
  const tempVitalsForRecent = filteredForLuxury.filter(v => v.temperature)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const recentTemp = tempVitalsForRecent.length > 0 ? tempVitalsForRecent[0].temperature! : null;

  const tempVitals = filteredForLuxury.filter(v => v.temperature);
  const avgTemperature = tempVitals.length > 0
    ? Math.round((tempVitals.map(v => v.temperature!).reduce((a, b) => a + b, 0) / tempVitals.length) * 10) / 10
    : null;

  // Blood Sugar calculations - Recent and Average
  const sugarVitalsForRecent = filteredForLuxury.filter(v => v.bloodSugar)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const recentBloodSugar = sugarVitalsForRecent.length > 0 ? sugarVitalsForRecent[0].bloodSugar! : null;

  const sugarVitals = filteredForLuxury.filter(v => v.bloodSugar);
  const avgBloodSugar = sugarVitals.length > 0
    ? Math.round(sugarVitals.map(v => v.bloodSugar!).reduce((a, b) => a + b, 0) / sugarVitals.length)
    : null;

  // A1C calculation from average blood sugar
  // Formula: A1C (%) = (Average Blood Glucose in mg/dL + 46.7) / 28.7
  const a1c = avgBloodSugar !== null
    ? Math.round(((avgBloodSugar + 46.7) / 28.7) * 10) / 10
    : null;

  // Weight calculations - Recent and Average
  const weightVitalsForRecent = filteredForLuxury.filter(v => v.weight)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const recentWeight = weightVitalsForRecent.length > 0 ? weightVitalsForRecent[0].weight! : null;

  const weightVitals = filteredForLuxury.filter(v => v.weight);
  const avgWeight = weightVitals.length > 0
    ? Math.round((weightVitals.map(v => v.weight!).reduce((a, b) => a + b, 0) / weightVitals.length) * 10) / 10
    : null;

  // Map globalTimeView or throttle position to timePeriod display string
  const getTimePeriodLabel = (): 'Wk' | '30d' | '60d' | 'ssd' => {
    // If throttle is providing custom date, calculate days and return appropriate label
    if (throttleTargetDate && surgeryDate) {
      const surgeryDateObj = new Date(surgeryDate);
      const days = Math.floor((throttleTargetDate.getTime() - surgeryDateObj.getTime()) / (1000 * 60 * 60 * 24));

      if (days <= 7) return 'Wk';
      if (days <= 30) return '30d';
      if (days <= 60) return '60d';
      return 'ssd';
    }

    // Otherwise use globalTimeView
    switch (globalTimeView) {
      case '7d': return 'Wk';
      case '30d': return '30d';
      case '90d': return '60d';
      case 'surgery': return 'ssd';
      default: return 'Wk';
    }
  };

  // Determine if latest readings are auto or manual
  const isBPAuto = filteredLatest?.source === 'device' || filteredLatest?.source === 'import';
  const isHRAuto = filteredLatest?.source === 'device' || filteredLatest?.source === 'import';
  const isO2Auto = filteredLatest?.source === 'device' || filteredLatest?.source === 'import';
  const isRespAuto = filteredLatest?.source === 'device' || filteredLatest?.source === 'import';
  const isTempAuto = filteredLatest?.source === 'device' || filteredLatest?.source === 'import';
  const isBloodSugarAuto = filteredLatest?.source === 'device' || filteredLatest?.source === 'import';
  const isWeightAuto = filteredLatest?.source === 'device' || filteredLatest?.source === 'import';

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

      {/* A380 COCKPIT LAYOUT */}
      <HeartFrame>
        {/* Cockpit Header with Water Intake Card on Right */}
        <div className="mb-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left: Title */}
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Vitals Command Center - A380 Cockpit</h1>
              <p className="text-gray-400">Comprehensive cardiac monitoring and analytics</p>
            </div>

            {/* Right: Hydration Gauge - Luxury Chronographic Design */}
            <div className="lg:ml-auto w-full flex justify-center lg:justify-end">
              <div style={{
                width: '240px',
                height: '240px',
                position: 'relative',
              }}>
                {/* Platinum Bezel - Outer Ring */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #E5E4E2 0%, #BCC6CC 30%, #98A2A8 50%, #BCC6CC 70%, #E5E4E2 100%)',
                  boxShadow: `
                    0 8px 32px rgba(0,0,0,0.6),
                    inset 0 2px 4px rgba(255,255,255,0.4),
                    inset 0 -2px 4px rgba(0,0,0,0.4)
                  `,
                  padding: '8px',
                }}>
                  {/* Bezel Inner Ring */}
                  <div style={{
                    position: 'absolute',
                    inset: '5px',
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.3)',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
                  }} />

                  {/* Gauge Face Background */}
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 35%, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)',
                    boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.8)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {/* Subtle Light Reflection */}
                    <div style={{
                      position: 'absolute',
                      top: '10%',
                      left: '10%',
                      width: '40%',
                      height: '40%',
                      background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
                      borderRadius: '50%',
                    }} />

                    {/* Target at 12 o'clock position */}
                    <div style={{
                      position: 'absolute',
                      top: '12%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      textAlign: 'center',
                    }}>
                      <div style={{
                        fontSize: '8px',
                        fontWeight: '600',
                        fontFamily: '"SF Pro Display", -apple-system, sans-serif',
                        letterSpacing: '1.2px',
                        color: '#D4AF37',
                        textShadow: '0 0 6px rgba(212, 175, 55, 0.6)',
                        marginBottom: '2px',
                      }}>
                        TARGET
                      </div>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        fontFamily: '"SF Pro Display", -apple-system, sans-serif',
                        color: '#D4AF37',
                        textShadow: '0 0 8px rgba(212, 175, 55, 0.6)',
                      }}>
                        {(() => {
                          const todayDate = format(new Date(), 'yyyy-MM-dd');
                          const selectedLog = hydrationLogs.find(log => log.date === todayDate);
                          const recommended = calculatePersonalizedHydrationTarget(todayDate);
                          return selectedLog?.targetOunces || recommended;
                        })()}
                      </div>
                      <div style={{
                        fontSize: '7px',
                        fontWeight: '600',
                        fontFamily: '"SF Pro Display", -apple-system, sans-serif',
                        color: '#D4AF37',
                        textShadow: '0 0 4px rgba(212, 175, 55, 0.4)',
                        opacity: 0.7,
                      }}>
                        oz
                      </div>
                    </div>

                    {/* Center: Consumed Amount */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                    }}>
                      {/* Droplet Icon */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        marginBottom: '4px',
                      }}>
                        <Droplet
                          className="h-8 w-8"
                          fill="#06b6d4"
                          style={{
                            color: '#06b6d4',
                            filter: 'drop-shadow(0 0 10px rgba(6, 182, 212, 0.8))',
                          }}
                        />
                      </div>

                      {/* Consumed Amount */}
                      <div style={{
                        fontSize: '32px',
                        fontWeight: '700',
                        fontFamily: '"SF Pro Display", -apple-system, sans-serif',
                        color: '#C0C0C0',
                        textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                        lineHeight: '1',
                      }}>
                        {(() => {
                          const todayDate = format(new Date(), 'yyyy-MM-dd');
                          const selectedLog = hydrationLogs.find(log => log.date === todayDate);
                          return Math.round(selectedLog?.totalOunces || 0);
                        })()}
                      </div>
                      <div style={{
                        fontSize: '10px',
                        fontWeight: '600',
                        fontFamily: '"SF Pro Display", -apple-system, sans-serif',
                        color: '#06b6d4',
                        textShadow: '0 0 6px rgba(6, 182, 212, 0.6)',
                        marginTop: '2px',
                      }}>
                        oz
                      </div>
                    </div>

                    {/* Bottom: Deficiency Display */}
                    <div style={{
                      position: 'absolute',
                      bottom: '15%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      textAlign: 'center',
                    }}>
                      {(() => {
                        const todayDate = format(new Date(), 'yyyy-MM-dd');
                        const selectedLog = hydrationLogs.find(log => log.date === todayDate);
                        const consumed = Math.round(selectedLog?.totalOunces || 0);
                        const target = selectedLog?.targetOunces || calculatePersonalizedHydrationTarget(todayDate);
                        const deficiency = target - consumed;

                        if (deficiency > 0) {
                          return (
                            <>
                              <div style={{
                                fontSize: '8px',
                                fontWeight: '600',
                                fontFamily: '"SF Pro Display", -apple-system, sans-serif',
                                letterSpacing: '1px',
                                color: '#ef4444',
                                textShadow: '0 0 6px rgba(239, 68, 68, 0.6)',
                              }}>
                                DEF
                              </div>
                              <div style={{
                                fontSize: '16px',
                                fontWeight: '700',
                                fontFamily: '"SF Pro Display", -apple-system, sans-serif',
                                color: '#ef4444',
                                textShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                              }}>
                                -{deficiency}
                              </div>
                            </>
                          );
                        } else if (deficiency < 0) {
                          return (
                            <>
                              <div style={{
                                fontSize: '8px',
                                fontWeight: '600',
                                fontFamily: '"SF Pro Display", -apple-system, sans-serif',
                                letterSpacing: '1px',
                                color: '#10b981',
                                textShadow: '0 0 6px rgba(16, 185, 129, 0.6)',
                              }}>
                                SURPLUS
                              </div>
                              <div style={{
                                fontSize: '16px',
                                fontWeight: '700',
                                fontFamily: '"SF Pro Display", -apple-system, sans-serif',
                                color: '#10b981',
                                textShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
                              }}>
                                +{Math.abs(deficiency)}
                              </div>
                            </>
                          );
                        } else {
                          return (
                            <div style={{
                              fontSize: '10px',
                              fontWeight: '700',
                              fontFamily: '"SF Pro Display", -apple-system, sans-serif',
                              letterSpacing: '1.2px',
                              color: '#10b981',
                              textShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
                            }}>
                              ✓ TARGET MET
                            </div>
                          );
                        }
                      })()}
                    </div>

                    {/* Progress Arc */}
                    <svg
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        transform: 'rotate(-90deg)',
                      }}
                    >
                      {/* Background Arc */}
                      <circle
                        cx="50%"
                        cy="50%"
                        r="42%"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="6"
                      />
                      {/* Progress Arc */}
                      <circle
                        cx="50%"
                        cy="50%"
                        r="42%"
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="6"
                        strokeLinecap="round"
                        style={{
                          strokeDasharray: '264',
                          strokeDashoffset: (() => {
                            const todayDate = format(new Date(), 'yyyy-MM-dd');
                            const selectedLog = hydrationLogs.find(log => log.date === todayDate);
                            const consumed = selectedLog?.totalOunces || 0;
                            const target = selectedLog?.targetOunces || calculatePersonalizedHydrationTarget(todayDate);
                            const percentage = Math.min((consumed / target) * 100, 100);
                            return 264 - (264 * percentage) / 100;
                          })(),
                          filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.8))',
                        }}
                      />
                    </svg>
                  </div>
                </div>

                {/* Label Below Gauge */}
                <div style={{
                  position: 'absolute',
                  bottom: '-30px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '10px',
                  fontWeight: '600',
                  color: '#C0C0C0',
                  fontFamily: 'Georgia, serif',
                  letterSpacing: '2px',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}>
                  HYDRATION MONITOR
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upper Level - Primary Flight Deck - Critical Vitals */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-blue-400 mb-6 flex items-center gap-3">
            <Activity className="h-6 w-6" />
            Primary Flight Deck - Critical Vitals
          </h2>

          {/* Pilot/Co-Pilot Row with Nuclear Clock */}
          <div className="relative grid grid-cols-3 gap-4 mb-4 items-center" style={{ paddingTop: '20px' }}>
            {/* Pilot - Left Side above BP Gauge */}
            <div className="flex flex-col items-center" style={{ marginRight: '78px' }}>
              <div style={{
                fontSize: '9px',
                fontWeight: '600',
                color: '#D4AF37',
                fontFamily: '"Montserrat", sans-serif',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                textShadow: '0 0 8px rgba(212, 175, 55, 0.6)',
                marginBottom: '4px'
              }}>
                PILOT
              </div>
              {user?.role === 'admin' || user?.role === 'therapist' ? (
                <select
                  value={pilotUserId || user?.id || 'admin'}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'admin' || parseInt(value) === user?.id) {
                      setPilotUserId(null);
                    } else {
                      setPilotUserId(parseInt(value));
                    }
                  }}
                  style={{
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: '#D4AF37',
                    background: 'rgba(0,0,0,0.6)',
                    border: '1px solid rgba(212, 175, 55, 0.4)',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontFamily: '"SF Pro Display", sans-serif',
                    cursor: 'pointer',
                    textShadow: '0 0 6px rgba(212, 175, 55, 0.4)',
                    boxShadow: '0 0 10px rgba(212, 175, 55, 0.2), inset 0 1px 2px rgba(255,255,255,0.1)',
                  }}
                >
                  <option value="admin" style={{ background: '#1a1a1a', color: '#ffffff', fontWeight: 'bold' }}>{user?.name || 'Admin/Therapist'}</option>
                  {allPatients
                    .filter(p => p.userId)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(patient => (
                      <option key={patient.id} value={patient.userId!} style={{ background: '#1a1a1a', color: '#ffffff', fontWeight: 'bold' }}>
                        {patient.name}
                      </option>
                    ))}
                </select>
              ) : (
                <div style={{
                  fontSize: '10px',
                  fontWeight: 'bold',
                  color: '#D4AF37',
                  fontFamily: '"SF Pro Display", sans-serif',
                  textShadow: '0 0 6px rgba(212, 175, 55, 0.4)',
                }}>
                  {user?.name}
                </div>
              )}
            </div>

            {/* Luxury Atomic Clock - Center */}
            <div className="flex flex-col items-center justify-center">
              {/* Record Vitals Button - Luxury Chronographic Theme */}
              <div className="mb-6 flex justify-center">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="group relative"
                  style={{
                    background: 'linear-gradient(135deg, #E5E4E2 0%, #BCC6CC 30%, #98A2A8 50%, #BCC6CC 70%, #E5E4E2 100%)',
                    borderRadius: '12px',
                    padding: '3px',
                    boxShadow: `
                      0 6px 20px rgba(0,0,0,0.5),
                      inset 0 2px 4px rgba(255,255,255,0.4),
                      inset 0 -2px 4px rgba(0,0,0,0.4)
                    `,
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `
                      0 8px 28px rgba(0,0,0,0.6),
                      inset 0 2px 4px rgba(255,255,255,0.5),
                      inset 0 -2px 4px rgba(0,0,0,0.5)
                    `;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = `
                      0 6px 20px rgba(0,0,0,0.5),
                      inset 0 2px 4px rgba(255,255,255,0.4),
                      inset 0 -2px 4px rgba(0,0,0,0.4)
                    `;
                  }}
                >
                  {/* Inner button face */}
                  <div style={{
                    background: 'radial-gradient(circle at 35% 35%, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)',
                    borderRadius: '10px',
                    padding: '12px 28px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)',
                  }}>
                    {/* Plus icon with gold accent */}
                    <Plus
                      className="h-5 w-5"
                      style={{
                        color: '#D4AF37',
                        filter: 'drop-shadow(0 0 4px rgba(212, 175, 55, 0.6))',
                      }}
                    />
                    {/* Text */}
                    <span style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      fontFamily: '"SF Pro Display", -apple-system, sans-serif',
                      letterSpacing: '1.2px',
                      color: '#C0C0C0',
                      textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                      textTransform: 'uppercase',
                    }}>
                      Record Vitals
                    </span>
                  </div>
                </button>
              </div>

              {/* Small Digital Display at Top */}
              <div style={{
                fontSize: '9px',
                fontWeight: '600',
                color: '#C0C0C0',
                fontFamily: '"SF Pro Display", -apple-system, sans-serif',
                letterSpacing: '1.5px',
                marginBottom: '8px',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                opacity: 0.8,
              }}>
                {format(currentTime, 'HH:mm:ss')} • {format(currentTime, 'MMM dd, yyyy')}
              </div>

              {/* Watch Container */}
              <div style={{
                width: '200px',
                height: '200px',
                position: 'relative',
              }}>
                {/* Platinum Bezel - Outer Ring */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #E5E4E2 0%, #BCC6CC 30%, #98A2A8 50%, #BCC6CC 70%, #E5E4E2 100%)',
                  boxShadow: `
                    0 8px 32px rgba(0,0,0,0.6),
                    inset 0 2px 4px rgba(255,255,255,0.4),
                    inset 0 -2px 4px rgba(0,0,0,0.4)
                  `,
                  padding: '6px',
                }}>
                  {/* Bezel Engravings */}
                  <div style={{
                    position: 'absolute',
                    inset: '3px',
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.3)',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
                  }} />

                  {/* Watch Face Background */}
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 35%, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)',
                    boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.8)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {/* Subtle Light Reflection */}
                    <div style={{
                      position: 'absolute',
                      top: '10%',
                      left: '10%',
                      width: '40%',
                      height: '40%',
                      background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
                      borderRadius: '50%',
                    }} />

                    {/* Hour Markers (Roman Numerals at 12, 3, 6, 9) */}
                    {[
                      { hour: 12, angle: 0, text: 'XII', distance: 72 },
                      { hour: 3, angle: 90, text: 'III', distance: 75 },
                      { hour: 6, angle: 180, text: 'VI', distance: 72 },
                      { hour: 9, angle: 270, text: 'IX', distance: 75 },
                    ].map(({ hour, angle, text, distance }) => (
                      <div
                        key={hour}
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: `rotate(${angle}deg) translateY(-${distance}px)`,
                          fontSize: '14px',
                          fontWeight: 'bold',
                          fontFamily: 'Georgia, serif',
                          color: '#D4AF37',
                          textShadow: '0 0 8px rgba(212, 175, 55, 0.6)',
                        }}
                      >
                        <div style={{
                          transform: `rotate(-${angle}deg) translateX(${angle === 0 ? '2.5px' : '0'})`,
                        }}>{text}</div>
                      </div>
                    ))}

                    {/* Hour Markers (Indices for other hours) */}
                    {[1, 2, 4, 5, 7, 8, 10, 11].map((hour) => {
                      const angle = (hour * 30) - 90;
                      const x = 94 + 68 * Math.cos((angle * Math.PI) / 180);
                      const y = 94 + 68 * Math.sin((angle * Math.PI) / 180);
                      return (
                        <div
                          key={hour}
                          style={{
                            position: 'absolute',
                            left: `${x}px`,
                            top: `${y}px`,
                            width: '4px',
                            height: '12px',
                            background: 'linear-gradient(180deg, #C0C0C0 0%, #808080 100%)',
                            transform: `rotate(${angle + 90}deg) translate(-50%, -50%)`,
                            transformOrigin: 'center',
                            borderRadius: '2px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.5)',
                          }}
                        />
                      );
                    })}

                    {/* Minute Markers */}
                    {Array.from({ length: 60 }).map((_, i) => {
                      if (i % 5 === 0) return null; // Skip hour positions
                      const angle = (i * 6) - 90;
                      const x = 94 + 78 * Math.cos((angle * Math.PI) / 180);
                      const y = 94 + 78 * Math.sin((angle * Math.PI) / 180);
                      return (
                        <div
                          key={i}
                          style={{
                            position: 'absolute',
                            left: `${x}px`,
                            top: `${y}px`,
                            width: '1px',
                            height: '4px',
                            background: 'rgba(192, 192, 192, 0.4)',
                            transform: `rotate(${angle + 90}deg) translate(-50%, -50%)`,
                            transformOrigin: 'center',
                          }}
                        />
                      );
                    })}

                    {/* Clock Hands */}
                    {(() => {
                      const hours = currentTime.getHours() % 12;
                      const minutes = currentTime.getMinutes();
                      const seconds = currentTime.getSeconds();
                      const milliseconds = currentTime.getMilliseconds();

                      const secondAngle = ((seconds + milliseconds / 1000) * 6) - 90;
                      const minuteAngle = ((minutes + seconds / 60) * 6) - 90;
                      const hourAngle = ((hours + minutes / 60) * 30) - 90;

                      return (
                        <>
                          {/* Hour Hand */}
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            width: '50px',
                            height: '6px',
                            background: 'linear-gradient(90deg, transparent 0%, #D4AF37 10%, #F4E6B8 50%, #D4AF37 90%, transparent 100%)',
                            transformOrigin: '15% center',
                            transform: `translate(-15%, -50%) rotate(${hourAngle}deg)`,
                            borderRadius: '3px',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
                            zIndex: 2,
                          }} />

                          {/* Minute Hand */}
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            width: '70px',
                            height: '4px',
                            background: 'linear-gradient(90deg, transparent 0%, #C0C0C0 10%, #E8E8E8 50%, #C0C0C0 90%, transparent 100%)',
                            transformOrigin: '15% center',
                            transform: `translate(-15%, -50%) rotate(${minuteAngle}deg)`,
                            borderRadius: '2px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.6)',
                            zIndex: 3,
                          }} />

                          {/* Second Hand */}
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            width: '80px',
                            height: '2px',
                            background: 'linear-gradient(90deg, transparent 0%, #ef4444 20%, #dc2626 50%, #ef4444 80%, transparent 100%)',
                            transformOrigin: '15% center',
                            transform: `translate(-15%, -50%) rotate(${secondAngle}deg)`,
                            borderRadius: '1px',
                            boxShadow: '0 1px 3px rgba(239, 68, 68, 0.6), 0 0 8px rgba(239, 68, 68, 0.4)',
                            zIndex: 4,
                            transition: 'transform 0.05s cubic-bezier(0.4, 0.0, 0.2, 1)',
                          }} />
                        </>
                      );
                    })()}

                    {/* Center Hub */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, #F4E6B8 0%, #D4AF37 50%, #A58F4D 100%)',
                      boxShadow: `
                        0 0 8px rgba(212, 175, 55, 0.6),
                        inset 0 1px 2px rgba(255,255,255,0.5),
                        inset 0 -1px 2px rgba(0,0,0,0.5)
                      `,
                      border: '1px solid rgba(255,255,255,0.3)',
                      zIndex: 5,
                    }}>
                      <div style={{
                        position: 'absolute',
                        inset: '3px',
                        borderRadius: '50%',
                        background: '#1a1a1a',
                        border: '1px solid rgba(212, 175, 55, 0.4)',
                      }} />
                    </div>

                    {/* Brand Name */}
                    <div style={{
                      position: 'absolute',
                      top: '38%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '8px',
                      fontWeight: '600',
                      fontFamily: 'Georgia, serif',
                      color: '#D4AF37',
                      letterSpacing: '2px',
                      textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                    }}>
                      CHRONOGRAPH
                    </div>

                    {/* Date Window */}
                    <div style={{
                      position: 'absolute',
                      top: '60%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '28px',
                      height: '16px',
                      background: '#ffffff',
                      border: '1px solid #808080',
                      borderRadius: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
                    }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 'bold',
                        fontFamily: 'Arial, sans-serif',
                        color: '#000000',
                      }}>
                        {format(currentTime, 'dd')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Watch Label */}
              <div style={{
                fontSize: '8px',
                fontWeight: '600',
                color: '#C0C0C0',
                fontFamily: 'Georgia, serif',
                letterSpacing: '2px',
                marginTop: '8px',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              }}>
                ATOMIC PRECISION
              </div>
            </div>

            {/* Co-Pilot (Being Monitored) - Right Side above HR Gauge */}
            <div className="flex flex-col items-center" style={{ marginLeft: '78px' }}>
              <div style={{
                fontSize: '9px',
                fontWeight: '600',
                color: '#D4AF37',
                fontFamily: '"Montserrat", sans-serif',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                textShadow: '0 0 8px rgba(212, 175, 55, 0.6)',
                marginBottom: '4px'
              }}>
                CO-PILOT
              </div>
              {user?.role === 'admin' || user?.role === 'therapist' ? (
                <select
                  value={selectedUserId || user?.id || 'admin'}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'admin' || parseInt(value) === user?.id) {
                      setSelectedUserId(null);
                    } else {
                      setSelectedUserId(parseInt(value));
                    }
                  }}
                  style={{
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: '#D4AF37',
                    background: 'rgba(0,0,0,0.6)',
                    border: '1px solid rgba(212, 175, 55, 0.4)',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontFamily: '"SF Pro Display", sans-serif',
                    cursor: 'pointer',
                    textShadow: '0 0 6px rgba(212, 175, 55, 0.4)',
                    boxShadow: '0 0 10px rgba(212, 175, 55, 0.2), inset 0 1px 2px rgba(255,255,255,0.1)',
                  }}
                >
                  {/* Admin/Therapist at top */}
                  <option value="admin" style={{ background: '#1a1a1a', color: '#ffffff', fontWeight: 'bold' }}>{user?.name || 'Admin/Therapist'}</option>
                  {/* All patients alphabetically */}
                  {allPatients
                    .filter(p => p.userId)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(patient => (
                      <option key={patient.id} value={patient.userId!} style={{ background: '#1a1a1a', color: '#ffffff', fontWeight: 'bold' }}>
                        {patient.name}
                      </option>
                    ))}
                </select>
              ) : (
                <div style={{
                  fontSize: '10px',
                  fontWeight: 'bold',
                  color: '#D4AF37',
                  fontFamily: '"SF Pro Display", sans-serif',
                  textShadow: '0 0 6px rgba(212, 175, 55, 0.4)',
                }}>
                  {user?.name}
                </div>
              )}
            </div>
          </div>

          {/* Top Row - BP and Heart Rate - Luxury $10,000 Watch Style */}
          <div className="grid grid-cols-2 gap-8 mb-8 justify-items-center" style={{ paddingTop: '40px' }}>
            <div style={{ marginRight: '156px', marginTop: '4px' }}>
              <LuxuryVitalGauge
                label="Blood Pressure"
                recentValue={recentBP}
                averageValue={avgBP}
                restingValue={restingBP}
                maxValue={maxBP}
                showRestingToggle={true}
                showMaxIndicator={true}
                unit="mmHg"
                min={80}
                max={180}
                targetMin={90}
                targetMax={140}
                size="large"
                color="#3b82f6"
                timePeriod={getTimePeriodLabel()}
                isAuto={isBPAuto}
                icon={<Heart className="h-6 w-6 text-blue-400" />}
                onManualClick={() => setIsModalOpen(true)}
              />
              {/* BP Trend Indicator - DEMO VERSION */}
              <div className="flex justify-center mt-2">
                <div className="px-3 py-1 rounded text-xs font-semibold" style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2))',
                  border: '1px solid rgba(34, 197, 94, 0.5)',
                  color: '#4ade80'
                }}>
                  Improving -6 vs last week
                </div>
              </div>
            </div>
            <div style={{ marginLeft: '156px', marginTop: '4px' }}>
              <LuxuryVitalGauge
                label="Heart Rate"
                recentValue={recentHR}
                averageValue={avgHeartRate}
                restingValue={restingHeartRate}
                maxValue={maxHeartRate}
                showRestingToggle={true}
                showMaxIndicator={true}
                unit="bpm"
                min={40}
                max={180}
                targetMin={60}
                targetMax={100}
                size="large"
                color="#ef4444"
                timePeriod={getTimePeriodLabel()}
                isAuto={isHRAuto}
                icon={<Activity className="h-6 w-6 text-red-400" />}
                onManualClick={() => setIsModalOpen(true)}
              />
              {/* HR Trend Indicator */}
              {filteredForLuxury.length >= 14 && (() => {
                const recentVitals = filteredForLuxury.slice(-7);
                const olderVitals = filteredForLuxury.slice(-14, -7);
                const validRecent = recentVitals.filter(v => v.heartRate);
                const validOlder = olderVitals.filter(v => v.heartRate);
                if (validRecent.length === 0 || validOlder.length === 0) return null;
                const recentAvg = validRecent.reduce((sum, v) => sum + (v.heartRate || 0), 0) / validRecent.length;
                const olderAvg = validOlder.reduce((sum, v) => sum + (v.heartRate || 0), 0) / validOlder.length;
                const diff = recentAvg - olderAvg;
                const isImproving = diff < -3;
                const isWorsening = diff > 3;
                if (!isImproving && !isWorsening) return null;

                return (
                  <div className="flex justify-center mt-2">
                    <div className="px-3 py-1 rounded text-xs font-semibold" style={{
                      background: isImproving
                        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2))'
                        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2))',
                      border: isImproving
                        ? '1px solid rgba(34, 197, 94, 0.5)'
                        : '1px solid rgba(239, 68, 68, 0.5)',
                      color: isImproving ? '#4ade80' : '#f87171'
                    }}>
                      {isImproving ? 'Improving' : 'Worsening'} {diff > 0 ? '+' : ''}{diff.toFixed(0)} bpm vs last week
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Advanced Cardiac Display - Primary Flight Display Toggle */}
            <div className="col-span-2 flex justify-center my-6">
              <button
                onClick={() => setShowMedicalTests(!showMedicalTests)}
                className="relative px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105"
                style={{
                  background: showMedicalTests
                    ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(99, 102, 241, 0.3))'
                    : 'linear-gradient(135deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.4))',
                  border: showMedicalTests
                    ? '2px solid rgba(96, 165, 250, 0.6)'
                    : '2px solid rgba(71, 85, 105, 0.5)',
                  boxShadow: showMedicalTests
                    ? '0 0 40px rgba(59, 130, 246, 0.5), inset 0 0 30px rgba(59, 130, 246, 0.1)'
                    : '0 0 10px rgba(59, 130, 246, 0.2), inset 0 1px 2px rgba(0, 0, 0, 0.3)',
                }}>

                {/* Status Indicator LED */}
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: showMedicalTests
                    ? 'radial-gradient(circle, #22c55e 0%, #16a34a 100%)'
                    : 'radial-gradient(circle, #64748b 0%, #475569 100%)',
                  boxShadow: showMedicalTests
                    ? '0 0 12px rgba(34, 197, 94, 0.8), inset 0 1px 2px rgba(255,255,255,0.3)'
                    : '0 0 4px rgba(100, 116, 139, 0.4)',
                  animation: showMedicalTests ? 'pulse 2s ease-in-out infinite' : 'none'
                }} />

                {/* Content */}
                <div className="flex flex-col items-center gap-2">
                  {/* Top Label */}
                  <div style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    fontFamily: '"Orbitron", "Rajdhani", monospace',
                    letterSpacing: '2px',
                    color: showMedicalTests ? '#60a5fa' : '#94a3b8',
                    textShadow: showMedicalTests
                      ? '0 0 12px rgba(96, 165, 250, 0.8)'
                      : 'none',
                    textTransform: 'uppercase'
                  }}>
                    Primary Flight Display
                  </div>

                  {/* Main Title with Heart Icon */}
                  <div className="flex items-center gap-3">
                    <Activity className="h-6 w-6" style={{
                      color: showMedicalTests ? '#ef4444' : '#64748b',
                      filter: showMedicalTests
                        ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.8))'
                        : 'none'
                    }} />
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '900',
                      fontFamily: '"Orbitron", "Rajdhani", monospace',
                      letterSpacing: '2px',
                      color: '#ffffff',
                      textShadow: showMedicalTests
                        ? '0 0 15px rgba(96, 165, 250, 0.8)'
                        : '0 2px 4px rgba(0, 0, 0, 0.8)'
                    }}>
                      ACD-1000
                    </div>
                    <Activity className="h-6 w-6" style={{
                      color: showMedicalTests ? '#ef4444' : '#64748b',
                      filter: showMedicalTests
                        ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.8))'
                        : 'none'
                    }} />
                  </div>

                  {/* Subtitle */}
                  <div style={{
                    fontSize: '9px',
                    fontWeight: '600',
                    fontFamily: '"Orbitron", "Rajdhani", monospace',
                    letterSpacing: '1.5px',
                    color: showMedicalTests ? '#93c5fd' : '#64748b',
                    textTransform: 'uppercase'
                  }}>
                    Advanced Cardiac Display
                  </div>

                  {/* Status Text */}
                  <div style={{
                    fontSize: '8px',
                    fontWeight: '600',
                    fontFamily: '"Orbitron", "Rajdhani", monospace',
                    letterSpacing: '1px',
                    color: showMedicalTests ? '#22c55e' : '#64748b',
                    textTransform: 'uppercase',
                    marginTop: '4px'
                  }}>
                    {showMedicalTests ? '● DISPLAY ACTIVE' : '○ DISPLAY STANDBY'}
                  </div>
                </div>
              </button>
            </div>

            <style>{`
              @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
              }
            `}</style>
          </div>

          {/* MEDICAL TESTS SECTION */}
          {showMedicalTests && (
            <div className="space-y-6" style={{
              transform: 'scale(0.9)',
              transformOrigin: 'top center',
              marginBottom: '-50px'
            }}>
              {/* Medical Provider Tests Section */}
              <GlassCard className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 opacity-10" style={{
                  background: 'radial-gradient(circle, rgba(99, 102, 241, 0.5) 0%, transparent 70%)'
                }}></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold flex items-center gap-3">
                        <Activity className="h-7 w-7" style={{
                          color: '#ef4444',
                          filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.8))'
                        }} />
                        <span style={{
                          fontFamily: '"Orbitron", "Rajdhani", monospace',
                          color: '#ffffff',
                          textShadow: '0 0 15px rgba(96, 165, 250, 0.6)',
                          letterSpacing: '2px'
                        }}>
                          Advanced Cardiac Display-ACD-1000
                        </span>
                      </h2>
                      <p className="text-sm text-gray-300 mt-1">Real-time ECG, EKG & Respiratory Flight Data</p>
                    </div>
                    <Button onClick={() => setIsModalOpen(true)} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Test Results
                    </Button>
                  </div>

                  {/* Real-Time Heart Rate Display - Polar H10 / Samsung Watch - Hidden when test active */}
                  {!activeACD1000Test && (
                    <div className="mb-8">
                      <LiveVitalsDisplay deviceType="polar" />
                    </div>
                  )}

                  {/* Medical-Grade Display Tabs - Ultra Premium */}
                  <div className="p-12 text-center">
                    <div className="flex justify-center items-center gap-6 mb-8">
                      {/* ECG/EKG Tab - Left */}
                      <div
                        onClick={() => setActiveACD1000Test(activeACD1000Test === 'ecg' ? null : 'ecg')}
                        className="relative group cursor-pointer transition-all duration-500 hover:scale-105" style={{
                        width: '280px',
                        height: '140px',
                        borderRadius: '50%/40%',
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.15))',
                        border: '3px solid transparent',
                        backgroundImage: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95)), linear-gradient(135deg, #ef4444, #dc2626, #b91c1c)',
                        backgroundOrigin: 'border-box',
                        backgroundClip: 'padding-box, border-box',
                        boxShadow: '0 0 40px rgba(239, 68, 68, 0.4), inset 0 0 30px rgba(239, 68, 68, 0.1), 0 8px 32px rgba(0,0,0,0.5)',
                        overflow: 'hidden'
                      }}>
                        {/* Animated scan line */}
                        <div className="absolute inset-0 opacity-30" style={{
                          background: 'linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.5), transparent)',
                          animation: 'scan 3s linear infinite',
                          transform: 'translateX(-100%)'
                        }}></div>

                        {/* Content */}
                        <div className="relative h-full flex flex-col items-center justify-center p-6">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-full" style={{
                              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(220, 38, 38, 0.3))',
                              boxShadow: '0 0 20px rgba(239, 68, 68, 0.6), inset 0 0 10px rgba(239, 68, 68, 0.3)'
                            }}>
                              <Heart className="h-6 w-6" style={{
                                color: '#fca5a5',
                                filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.8))'
                              }} />
                            </div>
                            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" style={{
                              boxShadow: '0 0 12px rgba(239, 68, 68, 1)'
                            }}></div>
                          </div>
                          <h3 className="text-xl font-black tracking-wider mb-1" style={{
                            fontFamily: '"Orbitron", "Rajdhani", monospace',
                            color: '#fca5a5',
                            textShadow: '0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.4)',
                            letterSpacing: '3px'
                          }}>
                            ECG / EKG
                          </h3>
                          <p className="text-xs uppercase tracking-widest" style={{
                            color: '#f87171',
                            textShadow: '0 0 10px rgba(239, 68, 68, 0.6)'
                          }}>
                            CARDIAC RHYTHM
                          </p>
                        </div>
                      </div>

                      {/* Treadmill/Stress Tab - Middle (Larger/Featured) */}
                      <div
                        onClick={() => setActiveACD1000Test(activeACD1000Test === 'treadmill' ? null : 'treadmill')}
                        className="relative group cursor-pointer transition-all duration-500 hover:scale-105" style={{
                        width: '320px',
                        height: '160px',
                        borderRadius: '50%/40%',
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.2))',
                        border: '4px solid transparent',
                        backgroundImage: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98)), linear-gradient(135deg, #3b82f6, #2563eb, #1d4ed8)',
                        backgroundOrigin: 'border-box',
                        backgroundClip: 'padding-box, border-box',
                        boxShadow: '0 0 60px rgba(59, 130, 246, 0.5), inset 0 0 40px rgba(59, 130, 246, 0.15), 0 12px 48px rgba(0,0,0,0.6)',
                        overflow: 'hidden'
                      }}>
                        {/* Premium badge */}
                        <div className="absolute top-2 right-4 px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest" style={{
                          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(16, 185, 129, 0.3))',
                          border: '2px solid rgba(34, 197, 94, 0.6)',
                          color: '#6ee7b7',
                          boxShadow: '0 0 15px rgba(34, 197, 94, 0.6)',
                          textShadow: '0 0 10px rgba(34, 197, 94, 0.8)'
                        }}>
                          PRIMARY
                        </div>

                        {/* Animated scan line */}
                        <div className="absolute inset-0 opacity-40" style={{
                          background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.6), transparent)',
                          animation: 'scan 2.5s linear infinite',
                          transform: 'translateX(-100%)'
                        }}></div>

                        {/* Content */}
                        <div className="relative h-full flex flex-col items-center justify-center p-6">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-3 rounded-full" style={{
                              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(37, 99, 235, 0.4))',
                              boxShadow: '0 0 30px rgba(59, 130, 246, 0.8), inset 0 0 15px rgba(59, 130, 246, 0.4)'
                            }}>
                              <TrendingUp className="h-7 w-7" style={{
                                color: '#93c5fd',
                                filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 1))'
                              }} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{
                                boxShadow: '0 0 15px rgba(59, 130, 246, 1)'
                              }}></div>
                              <div className="w-2 h-2 rounded-full bg-blue-300" style={{
                                boxShadow: '0 0 12px rgba(59, 130, 246, 0.8)'
                              }}></div>
                            </div>
                          </div>
                          <h3 className="text-2xl font-black tracking-wider mb-1" style={{
                            fontFamily: '"Orbitron", "Rajdhani", monospace',
                            color: '#93c5fd',
                            textShadow: '0 0 25px rgba(59, 130, 246, 1), 0 0 50px rgba(59, 130, 246, 0.5)',
                            letterSpacing: '4px'
                          }}>
                            TREADMILL
                          </h3>
                          <p className="text-sm uppercase tracking-widest font-bold" style={{
                            color: '#60a5fa',
                            textShadow: '0 0 15px rgba(59, 130, 246, 0.8)'
                          }}>
                            STRESS TEST
                          </p>
                        </div>
                      </div>

                      {/* Spirometry/Breathing Tab - Right */}
                      <div
                        onClick={() => setActiveACD1000Test(activeACD1000Test === 'spirometry' ? null : 'spirometry')}
                        className="relative group cursor-pointer transition-all duration-500 hover:scale-105" style={{
                        width: '280px',
                        height: '140px',
                        borderRadius: '50%/40%',
                        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(8, 145, 178, 0.15))',
                        border: '3px solid transparent',
                        backgroundImage: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95)), linear-gradient(135deg, #06b6d4, #0891b2, #0e7490)',
                        backgroundOrigin: 'border-box',
                        backgroundClip: 'padding-box, border-box',
                        boxShadow: '0 0 40px rgba(6, 182, 212, 0.4), inset 0 0 30px rgba(6, 182, 212, 0.1), 0 8px 32px rgba(0,0,0,0.5)',
                        overflow: 'hidden'
                      }}>
                        {/* Animated scan line */}
                        <div className="absolute inset-0 opacity-30" style={{
                          background: 'linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.5), transparent)',
                          animation: 'scan 3s linear infinite',
                          transform: 'translateX(-100%)'
                        }}></div>

                        {/* Content */}
                        <div className="relative h-full flex flex-col items-center justify-center p-6">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-full" style={{
                              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(8, 145, 178, 0.3))',
                              boxShadow: '0 0 20px rgba(6, 182, 212, 0.6), inset 0 0 10px rgba(6, 182, 212, 0.3)'
                            }}>
                              <Wind className="h-6 w-6" style={{
                                color: '#67e8f9',
                                filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.8))'
                              }} />
                            </div>
                            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" style={{
                              boxShadow: '0 0 12px rgba(6, 182, 212, 1)'
                            }}></div>
                          </div>
                          <h3 className="text-xl font-black tracking-wider mb-1" style={{
                            fontFamily: '"Orbitron", "Rajdhani", monospace',
                            color: '#67e8f9',
                            textShadow: '0 0 20px rgba(6, 182, 212, 0.8), 0 0 40px rgba(6, 182, 212, 0.4)',
                            letterSpacing: '3px'
                          }}>
                            SPIROMETRY
                          </h3>
                          <p className="text-xs uppercase tracking-widest" style={{
                            color: '#22d3ee',
                            textShadow: '0 0 10px rgba(6, 182, 212, 0.6)'
                          }}>
                            LUNG FUNCTION
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Add scan animation */}
                    <style>{`
                      @keyframes scan {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(200%); }
                      }
                    `}</style>

                    <p className="text-sm text-gray-500 mt-6 text-center" style={{
                      color: '#ffffff',
                      textShadow: '0 0 10px rgba(255, 255, 255, 0.5), 0 0 20px rgba(59, 130, 246, 0.3)'
                    }}>
                      Professional Medical Test Results Interface • Pulse Technology Precision
                    </p>

                    {/* ECG Test Display - Embedded in ACD-1000 */}
                    {activeACD1000Test === 'ecg' && (
                      <div className="mt-8 p-6 rounded-xl" style={{
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1))',
                        border: '2px solid rgba(239, 68, 68, 0.3)',
                        boxShadow: '0 0 30px rgba(239, 68, 68, 0.2)'
                      }}>
                        <div className="mb-4">
                          <h3 className="text-xl font-bold text-red-400 mb-2">ECG/EKG Live Monitor</h3>
                          <p className="text-sm text-gray-400">Real-time cardiac waveform analysis from Polar H10</p>
                        </div>

                        {/* ECG Waveform */}
                        <div className="bg-black/40 rounded-lg border border-red-500/20 p-4 mb-4">
                          {ecgBuffer.length === 0 ? (
                            <div className="text-center py-8">
                              <div className="mb-2 text-xs text-yellow-400 font-bold">
                                ⚠️ Waiting for ECG data...
                              </div>
                              <p className="text-sm text-gray-400">Connect Polar H10 and start streaming to see real-time ECG waveform</p>
                            </div>
                          ) : (
                            <>
                              <div className="mb-2 text-xs text-green-400 text-center font-bold">
                                ✅ LIVE: Displaying real-time ECG from Polar H10 ({ecgBuffer.length} samples)
                              </div>
                              <ECGWaveformChart ecgData={ecgBuffer} samplingRate={130} showRWaveMarkers={true} showGridlines={true} />
                            </>
                          )}
                        </div>

                        {/* HRV Metrics */}
                        <div className="bg-black/40 rounded-lg border border-purple-500/20 p-4 mb-4">
                          <HRVMetricsPanel
                            sdnn={sdnn}
                            rmssd={rmssd}
                            pnn50={pnn50}
                          />
                        </div>

                        {/* ECG Recording Controls for Cardiologist */}
                        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border-2 border-purple-500/30 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${isRecording ? 'bg-red-500/30 animate-pulse' : 'bg-purple-500/20'} border ${isRecording ? 'border-red-500/50' : 'border-purple-500/30'}`}>
                                <Activity className={`h-5 w-5 ${isRecording ? 'text-red-400' : 'text-purple-400'}`} />
                              </div>
                              <div>
                                <h3 className="text-md font-bold text-purple-400">
                                  {isRecording ? '🔴 RECORDING' : '📊 Cardiologist Export'}
                                </h3>
                                <p className="text-xs text-gray-400">
                                  {isRecording
                                    ? `Recording ECG + HRV metrics • ${recordedEcgData.length} samples captured`
                                    : 'Record ECG waveform and HRV metrics for medical review'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {!isRecording ? (
                                <button
                                  onClick={startRecording}
                                  disabled={ecgBuffer.length === 0}
                                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-red-400 font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                  START RECORDING
                                </button>
                              ) : (
                                <button
                                  onClick={stopRecording}
                                  className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 rounded-lg text-yellow-400 font-bold text-sm transition-all flex items-center gap-2"
                                >
                                  <div className="w-3 h-3 bg-yellow-500"></div>
                                  STOP RECORDING
                                </button>
                              )}

                              {recordedEcgData.length > 0 && !isRecording && (
                                <>
                                  <button
                                    onClick={replayLast30Seconds}
                                    className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg text-blue-400 font-bold text-sm transition-all flex items-center gap-2"
                                  >
                                    ▶️ REPLAY LAST 30s
                                  </button>
                                  <button
                                    onClick={exportRecordingForCardiologist}
                                    className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded-lg text-green-400 font-bold text-sm transition-all flex items-center gap-2"
                                  >
                                    📥 EXPORT FOR DOCTOR
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Noise Filtering Toggle */}
                          <div className="pt-3 border-t border-purple-500/20">
                            <label className="flex items-center gap-3 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={applyNoiseFilter}
                                onChange={(e) => setApplyNoiseFilter(e.target.checked)}
                                className="w-4 h-4 rounded border-2 border-blue-500/40 bg-blue-500/10 checked:bg-blue-500 checked:border-blue-500 transition-all cursor-pointer"
                              />
                              <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-blue-400" />
                                <span className="text-sm text-blue-300 group-hover:text-blue-200 transition-colors">
                                  Apply noise filtering for cleaner ECG export
                                </span>
                              </div>
                            </label>
                            <p className="text-xs text-gray-500 mt-1 ml-7">
                              Removes baseline wander, 60Hz powerline interference, spike artifacts, and muscle noise for easier interpretation by cardiologist
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Treadmill Test Display - Embedded in ACD-1000 */}
                    {activeACD1000Test === 'treadmill' && (
                      <div className="mt-8 p-6 rounded-xl" style={{
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.1))',
                        border: '2px solid rgba(59, 130, 246, 0.3)',
                        boxShadow: '0 0 30px rgba(59, 130, 246, 0.2)'
                      }}>
                        <div className="mb-4 flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-blue-400 mb-2 flex items-center gap-2">
                              🏃 Live Exercise Session
                              {exerciseData && (
                                <span className="px-2 py-1 rounded text-xs font-semibold bg-green-500 text-white animate-pulse">
                                  LIVE
                                </span>
                              )}
                            </h3>
                            <p className="text-sm text-gray-400">Real-time treadmill & exercise monitoring from Strava, Polar & Samsung</p>
                          </div>
                          <button
                            onClick={() => setActiveACD1000Test(null)}
                            className="px-3 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-sm"
                          >
                            Close
                          </button>
                        </div>

                        {!exerciseData ? (
                          <div className="text-center py-12">
                            <Activity className="h-16 w-16 text-blue-400/30 mx-auto mb-4" />
                            <p className="text-gray-400 mb-2">No active exercise session</p>
                            <p className="text-sm text-gray-500">Start an activity on Strava, Polar, or Samsung Health to see live data</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {/* Exercise Session Header */}
                            <div className="grid grid-cols-3 gap-4">
                              <div className="p-4 rounded-lg bg-white/5 border border-blue-500/30">
                                <div className="text-xs text-gray-400 mb-1">Duration</div>
                                <div className="text-2xl font-bold text-blue-400">
                                  {exerciseData.duration || '00:00'}
                                </div>
                              </div>
                              <div className="p-4 rounded-lg bg-white/5 border border-blue-500/30">
                                <div className="text-xs text-gray-400 mb-1">Distance</div>
                                <div className="text-2xl font-bold text-blue-400">
                                  {exerciseData.distance ? `${exerciseData.distance.toFixed(2)} mi` : '0.00 mi'}
                                </div>
                              </div>
                              <div className="p-4 rounded-lg bg-white/5 border border-blue-500/30">
                                <div className="text-xs text-gray-400 mb-1">Calories</div>
                                <div className="text-2xl font-bold text-blue-400">
                                  {exerciseData.calories || 0} kcal
                                </div>
                              </div>
                            </div>

                            {/* Heart Rate Display */}
                            <div className="p-4 rounded-lg bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30">
                              <div className="flex items-center justify-between mb-3">
                                <div className="text-sm font-semibold text-red-400">❤️ Heart Rate</div>
                                <div className="text-3xl font-bold text-red-400">
                                  {exerciseData.heartRate || filteredLatest?.heartRate || '--'} BPM
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-3 text-sm">
                                <div>
                                  <div className="text-xs text-gray-400">Avg HR</div>
                                  <div className="text-lg font-semibold text-orange-400">{exerciseData.avgHeartRate || '--'}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-400">Max HR</div>
                                  <div className="text-lg font-semibold text-red-400">{exerciseData.maxHeartRate || '--'}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-400">HR Zone</div>
                                  <div className="text-lg font-semibold text-yellow-400">
                                    {exerciseData.hrZone || 'Zone 3'}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Pace & Speed */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 rounded-lg bg-white/5 border border-blue-500/20">
                                <div className="text-xs text-gray-400 mb-2">🏃 Pace</div>
                                <div className="text-xl font-bold text-blue-300">
                                  {exerciseData.pace || '--:--'} /mi
                                </div>
                              </div>
                              <div className="p-4 rounded-lg bg-white/5 border border-blue-500/20">
                                <div className="text-xs text-gray-400 mb-2">⚡ Speed</div>
                                <div className="text-xl font-bold text-blue-300">
                                  {exerciseData.speed ? `${exerciseData.speed.toFixed(1)} mph` : '--'}
                                </div>
                              </div>
                            </div>

                            {/* Additional Metrics */}
                            {(exerciseData.elevation || exerciseData.incline || exerciseData.cadence) && (
                              <div className="grid grid-cols-3 gap-3 text-sm">
                                {exerciseData.elevation && (
                                  <div className="p-3 rounded bg-white/5">
                                    <div className="text-xs text-gray-400">Elevation</div>
                                    <div className="text-lg font-semibold text-green-400">{exerciseData.elevation} ft</div>
                                  </div>
                                )}
                                {exerciseData.incline && (
                                  <div className="p-3 rounded bg-white/5">
                                    <div className="text-xs text-gray-400">Incline</div>
                                    <div className="text-lg font-semibold text-purple-400">{exerciseData.incline}%</div>
                                  </div>
                                )}
                                {exerciseData.cadence && (
                                  <div className="p-3 rounded bg-white/5">
                                    <div className="text-xs text-gray-400">Cadence</div>
                                    <div className="text-lg font-semibold text-cyan-400">{exerciseData.cadence} spm</div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* VO2 & Recovery Status */}
                            <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/30">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <div className="text-xs text-gray-400 mb-1">VO₂ Estimate</div>
                                  <div className="text-xl font-bold text-purple-400">
                                    {exerciseData.vo2 ? `${exerciseData.vo2.toFixed(1)} ml/kg/min` : '--'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-400 mb-1">Recovery Status</div>
                                  <div className="text-xl font-bold text-green-400">
                                    {exerciseData.recoveryStatus || 'Good ✓'}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Data Source Indicator */}
                            <div className="text-center pt-4 border-t border-white/10">
                              <div className="text-xs text-gray-500">
                                Data source: {exerciseData.source || 'Strava/Polar/Samsung'} • Last updated: {new Date().toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Spirometry Test Display - Embedded in ACD-1000 */}
                    {activeACD1000Test === 'spirometry' && (
                      <div className="mt-8 p-6 rounded-xl" style={{
                        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(8, 145, 178, 0.1))',
                        border: '2px solid rgba(6, 182, 212, 0.3)',
                        boxShadow: '0 0 30px rgba(6, 182, 212, 0.2)'
                      }}>
                        <div className="mb-4 flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-cyan-400 mb-2 flex items-center gap-2">
                              🫁 Live Spirometry Test
                              {spirometryData && (
                                <span className="px-2 py-1 rounded text-xs font-semibold bg-green-500 text-white animate-pulse">
                                  LIVE
                                </span>
                              )}
                            </h3>
                            <p className="text-sm text-gray-400">Real-time lung function monitoring from MIR SmartOne / Spirobank Smart</p>
                          </div>
                          <button
                            onClick={() => setActiveACD1000Test(null)}
                            className="px-3 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-sm"
                          >
                            Close
                          </button>
                        </div>

                        {!spirometryData ? (
                          <div className="text-center py-12">
                            <Wind className="h-16 w-16 text-cyan-400/30 mx-auto mb-4" />
                            <p className="text-gray-400 mb-2">No active spirometry test</p>
                            <p className="text-sm text-gray-500">Connect MIR spirometer via Bluetooth to start streaming real-time test results</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {/* Test Results Header */}
                            <div className="grid grid-cols-3 gap-4">
                              <div className="p-4 rounded-lg bg-white/5 border border-cyan-500/30">
                                <div className="text-xs text-gray-400 mb-1">FEV1</div>
                                <div className="text-xs text-gray-500 mb-2">Forced Expiratory Vol @ 1s</div>
                                <div className="text-2xl font-bold text-cyan-400">
                                  {spirometryData.fev1 ? `${spirometryData.fev1.toFixed(2)} L` : '--'}
                                </div>
                                <div className="text-xs mt-1">
                                  <span className={spirometryData.fev1Percent >= 80 ? 'text-green-400' : 'text-yellow-400'}>
                                    {spirometryData.fev1Percent || '--'}% predicted
                                  </span>
                                </div>
                              </div>
                              <div className="p-4 rounded-lg bg-white/5 border border-cyan-500/30">
                                <div className="text-xs text-gray-400 mb-1">FVC</div>
                                <div className="text-xs text-gray-500 mb-2">Forced Vital Capacity</div>
                                <div className="text-2xl font-bold text-cyan-400">
                                  {spirometryData.fvc ? `${spirometryData.fvc.toFixed(2)} L` : '--'}
                                </div>
                                <div className="text-xs mt-1">
                                  <span className={spirometryData.fvcPercent >= 80 ? 'text-green-400' : 'text-yellow-400'}>
                                    {spirometryData.fvcPercent || '--'}% predicted
                                  </span>
                                </div>
                              </div>
                              <div className="p-4 rounded-lg bg-white/5 border border-cyan-500/30">
                                <div className="text-xs text-gray-400 mb-1">FEV1/FVC</div>
                                <div className="text-xs text-gray-500 mb-2">Ratio</div>
                                <div className="text-2xl font-bold text-cyan-400">
                                  {spirometryData.fev1FvcRatio ? `${(spirometryData.fev1FvcRatio * 100).toFixed(0)}%` : '--'}
                                </div>
                                <div className="text-xs mt-1">
                                  <span className={spirometryData.fev1FvcRatio >= 0.70 ? 'text-green-400' : 'text-yellow-400'}>
                                    {spirometryData.fev1FvcRatio >= 0.70 ? 'Normal ✓' : 'Below normal'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* PEF - Peak Expiratory Flow */}
                            <div className="p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-semibold text-cyan-400">Peak Expiratory Flow (PEF)</div>
                                <div className="text-3xl font-bold text-cyan-400">
                                  {spirometryData.pef || '--'} L/min
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <div>
                                  <span className="text-gray-400">Predicted: </span>
                                  <span className="text-gray-300">{spirometryData.pefPredicted || '--'} L/min</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Best: </span>
                                  <span className="text-green-400">{spirometryData.pefBest || spirometryData.pef || '--'} L/min</span>
                                </div>
                                <div>
                                  <span className={spirometryData.pefPercent >= 80 ? 'text-green-400 font-semibold' : 'text-yellow-400 font-semibold'}>
                                    {spirometryData.pefPercent || '--'}% {spirometryData.pefPercent >= 80 ? '🟢 GOOD' : '🟡 MODERATE'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Status Indicators */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 rounded-lg bg-white/5 border border-cyan-500/20">
                                <div className="text-xs text-gray-400 mb-2">📊 Test Quality</div>
                                <div className="text-lg font-semibold">
                                  <span className={
                                    spirometryData.quality === 'A' || spirometryData.quality === 'B'
                                      ? 'text-green-400'
                                      : 'text-yellow-400'
                                  }>
                                    Grade {spirometryData.quality || 'A'} - {
                                      spirometryData.quality === 'A' ? 'Excellent' :
                                      spirometryData.quality === 'B' ? 'Good' :
                                      spirometryData.quality === 'C' ? 'Acceptable' : 'Fair'
                                    }
                                  </span>
                                </div>
                              </div>
                              <div className="p-4 rounded-lg bg-white/5 border border-cyan-500/20">
                                <div className="text-xs text-gray-400 mb-2">🔄 Test Number</div>
                                <div className="text-lg font-semibold text-cyan-400">
                                  Attempt #{spirometryData.attemptNumber || 3}
                                </div>
                              </div>
                            </div>

                            {/* Overall Interpretation */}
                            <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/30">
                              <div className="text-sm font-semibold text-purple-400 mb-2">Clinical Interpretation</div>
                              <div className="text-white">
                                {spirometryData.interpretation ||
                                  (spirometryData.fev1Percent >= 80 && spirometryData.fvcPercent >= 80 && spirometryData.fev1FvcRatio >= 0.70
                                    ? '✅ Normal spirometry - No obstruction or restriction detected'
                                    : spirometryData.fev1FvcRatio < 0.70
                                    ? '⚠️ Obstructive pattern detected - Consider bronchodilator response test'
                                    : '⚠️ Abnormal values detected - Clinical correlation recommended'
                                  )
                                }
                              </div>
                            </div>

                            {/* 7-Day Trend */}
                            {spirometryData.trend && (
                              <div className="p-4 rounded-lg bg-white/5 border border-cyan-500/20">
                                <div className="text-sm font-semibold text-cyan-400 mb-2">📈 7-Day Trend (FEV1)</div>
                                <div className="flex items-center gap-2">
                                  {spirometryData.trendDirection === 'improving' ? (
                                    <>
                                      <TrendingUp className="h-5 w-5 text-green-400" />
                                      <span className="text-green-400 font-semibold">Improving</span>
                                      <span className="text-gray-400">+{spirometryData.trendChange}% vs last week</span>
                                    </>
                                  ) : spirometryData.trendDirection === 'declining' ? (
                                    <>
                                      <TrendingDown className="h-5 w-5 text-red-400" />
                                      <span className="text-red-400 font-semibold">Declining</span>
                                      <span className="text-gray-400">{spirometryData.trendChange}% vs last week</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-gray-400">●</span>
                                      <span className="text-gray-400 font-semibold">Stable</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Device Info */}
                            <div className="text-center pt-4 border-t border-white/10">
                              <div className="text-xs text-gray-500">
                                Device: {spirometryData.device || 'MIR Smart One'} • Test completed: {new Date().toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Second Row - O2 and Respiratory Rate - Luxury Watch Style */}
          <div className="grid grid-cols-2 gap-4 mb-8 justify-items-center" style={{ paddingTop: '40px' }}>
            <div style={{ marginRight: '96px' }}>
              <LuxuryVitalGauge
                label="O₂ Saturation"
                recentValue={recentO2}
                averageValue={avgO2Saturation}
                unit="%"
                min={80}
                max={100}
                targetMin={95}
                targetMax={100}
                size="medium"
                color="#06b6d4"
                timePeriod={getTimePeriodLabel()}
                isAuto={isO2Auto}
                icon={<Wind className="h-5 w-5 text-cyan-400" />}
                onManualClick={() => setIsModalOpen(true)}
              />
              {/* O2 Trend Indicator */}
              {filteredForLuxury.length >= 14 && (() => {
                const recentVitals = filteredForLuxury.slice(-7);
                const olderVitals = filteredForLuxury.slice(-14, -7);
                const validRecent = recentVitals.filter(v => v.oxygenSaturation);
                const validOlder = olderVitals.filter(v => v.oxygenSaturation);
                if (validRecent.length === 0 || validOlder.length === 0) return null;
                const recentAvg = validRecent.reduce((sum, v) => sum + (v.oxygenSaturation || 0), 0) / validRecent.length;
                const olderAvg = validOlder.reduce((sum, v) => sum + (v.oxygenSaturation || 0), 0) / validOlder.length;
                const diff = recentAvg - olderAvg;
                const isImproving = diff > 1;
                const isWorsening = diff < -1;
                if (!isImproving && !isWorsening) return null;

                return (
                  <div className="flex justify-center mt-2">
                    <div className="px-3 py-1 rounded text-xs font-semibold" style={{
                      background: isImproving
                        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2))'
                        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2))',
                      border: isImproving
                        ? '1px solid rgba(34, 197, 94, 0.5)'
                        : '1px solid rgba(239, 68, 68, 0.5)',
                      color: isImproving ? '#4ade80' : '#f87171'
                    }}>
                      {isImproving ? 'Improving' : 'Worsening'} {diff > 0 ? '+' : ''}{diff.toFixed(1)}% vs last week
                    </div>
                  </div>
                );
              })()}
            </div>
            <div style={{ marginLeft: '96px' }}>
              <LuxuryVitalGauge
                label="Respiratory Rate"
                recentValue={recentResp}
                averageValue={avgRespiratoryRate}
                unit="/min"
                min={8}
                max={30}
                targetMin={12}
                targetMax={20}
                size="medium"
                color="#22c55e"
                timePeriod={getTimePeriodLabel()}
                isAuto={isRespAuto}
                icon={<Pulse className="h-5 w-5 text-green-400" />}
                onManualClick={() => setIsModalOpen(true)}
              />
              {/* Respiratory Rate Trend Indicator */}
              {filteredForLuxury.length >= 14 && (() => {
                const recentVitals = filteredForLuxury.slice(-7);
                const olderVitals = filteredForLuxury.slice(-14, -7);
                const validRecent = recentVitals.filter(v => v.respiratoryRate);
                const validOlder = olderVitals.filter(v => v.respiratoryRate);
                if (validRecent.length === 0 || validOlder.length === 0) return null;
                const recentAvg = validRecent.reduce((sum, v) => sum + (v.respiratoryRate || 0), 0) / validRecent.length;
                const olderAvg = validOlder.reduce((sum, v) => sum + (v.respiratoryRate || 0), 0) / validOlder.length;
                const diff = recentAvg - olderAvg;
                const isImproving = diff < -2;
                const isWorsening = diff > 2;
                if (!isImproving && !isWorsening) return null;

                return (
                  <div className="flex justify-center mt-2">
                    <div className="px-3 py-1 rounded text-xs font-semibold" style={{
                      background: isImproving
                        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2))'
                        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2))',
                      border: isImproving
                        ? '1px solid rgba(34, 197, 94, 0.5)'
                        : '1px solid rgba(239, 68, 68, 0.5)',
                      color: isImproving ? '#4ade80' : '#f87171'
                    }}>
                      {isImproving ? 'Improving' : 'Worsening'} {diff > 0 ? '+' : ''}{diff.toFixed(1)}/min vs last week
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Center Section - Time Throttle + Dual Glass Displays */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-purple-400 mb-6 flex items-center gap-3">
            <BarChart3 className="h-6 w-6" />
            Flight Control - Trend Analysis
          </h2>

          {/* Time Throttle Lever with Temperature Gauge */}
          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_200px] gap-6 items-center mb-8">
            {/* Temperature Gauge - Left */}
            <div className="flex flex-col justify-center items-center">
              <LuxuryVitalGauge
                label="Temperature"
                recentValue={recentTemp}
                averageValue={avgTemperature}
                unit="°F"
                min={95}
                max={103}
                targetMin={97.8}
                targetMax={99.1}
                size="medium"
                color="#f97316"
                timePeriod={getTimePeriodLabel()}
                isAuto={isTempAuto}
                icon={<Thermometer className="h-5 w-5 text-orange-400" />}
                onManualClick={() => setIsModalOpen(true)}
              />
              {/* Temperature Trend Indicator */}
              {filteredForLuxury.length >= 14 && (() => {
                const recentVitals = filteredForLuxury.slice(-7);
                const olderVitals = filteredForLuxury.slice(-14, -7);
                const validRecent = recentVitals.filter(v => v.temperature);
                const validOlder = olderVitals.filter(v => v.temperature);
                if (validRecent.length === 0 || validOlder.length === 0) return null;
                const recentAvg = validRecent.reduce((sum, v) => sum + (v.temperature || 0), 0) / validRecent.length;
                const olderAvg = validOlder.reduce((sum, v) => sum + (v.temperature || 0), 0) / validOlder.length;
                const diff = recentAvg - olderAvg;
                const normalTemp = 98.6;
                const recentDistFromNormal = Math.abs(recentAvg - normalTemp);
                const olderDistFromNormal = Math.abs(olderAvg - normalTemp);
                const isImproving = recentDistFromNormal < olderDistFromNormal - 0.3;
                const isWorsening = recentDistFromNormal > olderDistFromNormal + 0.3;
                if (!isImproving && !isWorsening) return null;

                return (
                  <div className="flex justify-center mt-2">
                    <div className="px-3 py-1 rounded text-xs font-semibold" style={{
                      background: isImproving
                        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2))'
                        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2))',
                      border: isImproving
                        ? '1px solid rgba(34, 197, 94, 0.5)'
                        : '1px solid rgba(239, 68, 68, 0.5)',
                      color: isImproving ? '#4ade80' : '#f87171'
                    }}>
                      {isImproving ? 'Improving' : 'Worsening'} {diff > 0 ? '+' : ''}{diff.toFixed(1)}°F vs last week
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Time Throttle Lever - Center */}
            <div className="flex flex-col gap-4 items-center">
              {/* Post-Op Week Dial above throttle */}
              <div>
                <CircularGauge
                  value={postOpWeek}
                  label="Post-Op Week"
                  unit="weeks"
                  min={0}
                  max={52}
                  size="medium"
                  style="modern"
                  color="#6366f1"
                />
              </div>
              <TimeThrottleLever
                surgeryDate={surgeryDate}
                onTimeChange={(view, customDate) => {
                  setGlobalTimeView(view);
                  setThrottleTargetDate(customDate || null);
                }}
                currentView={globalTimeView}
              />
            </div>

            {/* Blood Sugar Gauge - Right */}
            <div className="flex justify-center items-center">
              <LuxuryVitalGauge
                label="Blood Sugar"
                subtitle={a1c !== null ? `A1C: ${a1c}%` : undefined}
                recentValue={recentBloodSugar}
                averageValue={avgBloodSugar}
                unit="mg/dL"
                min={50}
                max={200}
                targetMin={70}
                targetMax={130}
                size="medium"
                color="#eab308"
                timePeriod={getTimePeriodLabel()}
                isAuto={isBloodSugarAuto}
                icon={<Droplet className="h-5 w-5 text-yellow-400" />}
                onManualClick={() => setIsModalOpen(true)}
                defaultMode="average"
              />
            </div>
          </div>

          {/* Three-Column Layout: Side Gauges + Dual Glass Displays */}
          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_200px] gap-6 items-center">
            {/* Left Side - Empty */}
            <div className="flex flex-col gap-6 justify-center items-center">
            </div>

            {/* Center: Weight Gauge + Dual Glass Displays */}
            <div className="grid grid-cols-1 gap-6">
              {/* Weight Gauge Above Charts */}
              <div className="flex justify-center">
                <LuxuryVitalGauge
                  label="Weight"
                  recentValue={recentWeight}
                  averageValue={avgWeight}
                  unit="lbs"
                  min={100}
                  max={300}
                  size="medium"
                  color="#10b981"
                  timePeriod={getTimePeriodLabel()}
                  isAuto={isWeightAuto}
                  icon={<Weight className="h-5 w-5 text-green-400" />}
                  onManualClick={() => setIsModalOpen(true)}
                />
              </div>
            </div>

            {/* Right Side - Empty for now */}
            <div className="flex flex-col gap-6 justify-center items-center">
            </div>
          </div>
        </div>

        {/* Medical Grade Cardiac Diagnostic Panel */}
        <div className="mb-12">
          <div className="relative overflow-hidden rounded-2xl p-8 mb-8"
            style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(45, 55, 72, 0.98) 50%, rgba(30, 41, 59, 0.98) 100%)',
              backdropFilter: 'blur(20px)',
              border: '3px solid rgba(212, 175, 55, 0.7)',
              boxShadow: '0 0 80px rgba(212, 175, 55, 0.4), inset 0 0 80px rgba(212, 175, 55, 0.1), 0 8px 32px rgba(0,0,0,0.5)'
            }}>
            <div className="absolute inset-0 opacity-15" style={{
              backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(212, 175, 55, 0.5) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(251, 191, 36, 0.5) 0%, transparent 50%)',
            }}></div>

            {/* Cockpit-Style Collapsible Header Button */}
            <button
              onClick={() => setIsCardiacDiagnosticsExpanded(!isCardiacDiagnosticsExpanded)}
              className="w-full p-6 flex items-center justify-between group cursor-pointer transition-all duration-300 hover:bg-white/5 relative"
              style={{
                borderBottom: isCardiacDiagnosticsExpanded ? '2px solid rgba(212, 175, 55, 0.5)' : 'none'
              }}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl transition-all duration-300" style={{
                  background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.5), rgba(251, 191, 36, 0.5))',
                  boxShadow: isCardiacDiagnosticsExpanded ? '0 0 40px rgba(212, 175, 55, 0.7), inset 0 2px 4px rgba(255,255,255,0.2)' : '0 0 20px rgba(212, 175, 55, 0.4)'
                }}>
                  <Activity className="h-8 w-8" style={{
                    color: '#FCD34D',
                    filter: 'drop-shadow(0 0 8px rgba(252, 211, 77, 0.8))'
                  }} />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex items-center gap-1 px-3 py-1 rounded-full" style={{
                      background: 'rgba(34, 197, 94, 0.35)',
                      border: '2px solid rgba(34, 197, 94, 0.7)',
                      boxShadow: '0 0 20px rgba(34, 197, 94, 0.5)'
                    }}>
                      <div className="w-2 h-2 rounded-full bg-green-300 animate-pulse" style={{
                        boxShadow: '0 0 10px rgba(134, 239, 172, 1)'
                      }}></div>
                      <span className="text-xs font-bold" style={{
                        color: '#86EFAC',
                        textShadow: '0 0 8px rgba(134, 239, 172, 0.8)'
                      }}>LIVE</span>
                    </div>

                    {/* Streaming Device Indicator - Very Small Widget */}
                    {filteredLatest?.source === 'device' && filteredLatest?.deviceId && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded" style={{
                        background: 'rgba(6, 182, 212, 0.2)',
                        border: '1px solid rgba(6, 182, 212, 0.4)',
                        boxShadow: '0 0 8px rgba(6, 182, 212, 0.3)'
                      }}>
                        <span style={{
                          fontSize: '8px',
                          color: '#67E8F9',
                          fontWeight: '600',
                          fontFamily: 'monospace',
                          textShadow: '0 0 4px rgba(103, 232, 249, 0.6)',
                          letterSpacing: '0.3px'
                        }}>
                          {(() => {
                            const deviceId = filteredLatest.deviceId;
                            if (deviceId.includes('polar')) return '📡 Polar H10';
                            if (deviceId.includes('samsung')) return '📱 Samsung';
                            if (deviceId.includes('strava')) return '⌚ Strava';
                            return `📡 ${deviceId.split('_')[0].toUpperCase()}`;
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                  <h2 className="text-3xl font-bold tracking-wide" style={{
                    color: '#FCD34D',
                    fontFamily: '"SF Pro Display", sans-serif',
                    letterSpacing: '2px',
                    textShadow: '0 0 30px rgba(252, 211, 77, 0.9), 0 0 60px rgba(251, 191, 36, 0.5)'
                  }}>
                    MEDICAL GRADE CARDIAC DIAGNOSTICS
                  </h2>
                  <p className="text-xs uppercase tracking-widest mt-1" style={{
                    color: '#FDE68A',
                    textShadow: '0 0 10px rgba(253, 230, 138, 0.6)'
                  }}>
                    Advanced Hemodynamic & Autonomic Analysis
                  </p>
                </div>
              </div>

              {/* Chevron with Aerospace Styling */}
              <div className="flex items-center gap-3">
                <div className="text-xs font-mono uppercase tracking-widest" style={{
                  color: '#FCD34D',
                  textShadow: '0 0 12px rgba(252, 211, 77, 0.8)'
                }}>
                  {isCardiacDiagnosticsExpanded ? 'COLLAPSE' : 'EXPAND'}
                </div>
                <div className="p-2 rounded-lg transition-all duration-300" style={{
                  background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.3), rgba(251, 191, 36, 0.3))',
                  border: '2px solid rgba(212, 175, 55, 0.6)',
                  boxShadow: isCardiacDiagnosticsExpanded ? '0 0 25px rgba(212, 175, 55, 0.7)' : '0 0 15px rgba(212, 175, 55, 0.4)'
                }}>
                  {isCardiacDiagnosticsExpanded ? (
                    <ChevronUp className="h-6 w-6" style={{ color: '#FCD34D' }} />
                  ) : (
                    <ChevronDown className="h-6 w-6" style={{ color: '#FCD34D' }} />
                  )}
                </div>
              </div>
            </button>

            {/* Collapsible Content with Smooth Animation */}
            <div style={{
              maxHeight: isCardiacDiagnosticsExpanded ? '5000px' : '0',
              opacity: isCardiacDiagnosticsExpanded ? 1 : 0,
              overflow: 'hidden',
              transition: 'max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-in-out'
            }}>
              <div className="relative p-8">

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT PANEL - Autonomic Function */}
                <div className="relative overflow-hidden rounded-2xl p-6" style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.25))',
                  border: '2px solid rgba(16, 185, 129, 0.8)',
                  boxShadow: '0 8px 32px rgba(16, 185, 129, 0.45), inset 0 2px 8px rgba(16, 185, 129, 0.2), 0 0 60px rgba(16, 185, 129, 0.25)'
                }}>
                  {/* Holographic shine effect */}
                  <div className="absolute inset-0 opacity-40" style={{
                    background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)',
                    backgroundSize: '200% 200%',
                    animation: 'shimmer 3s infinite'
                  }}></div>

                  <div className="relative">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold uppercase tracking-wider" style={{
                        color: '#6EE7B7',
                        fontFamily: '"SF Pro Display", sans-serif',
                        textShadow: '0 0 20px rgba(110, 231, 183, 0.9), 0 0 40px rgba(16, 185, 129, 0.6)'
                      }}>
                        Autonomic Function
                      </h3>
                      <div className="flex items-center gap-1 px-2 py-1 rounded" style={{
                        background: 'rgba(16, 185, 129, 0.35)',
                        border: '2px solid rgba(16, 185, 129, 0.6)',
                        boxShadow: '0 0 15px rgba(16, 185, 129, 0.5)'
                      }}>
                        <Heart className="h-3 w-3 animate-pulse" style={{
                          color: '#6EE7B7',
                          filter: 'drop-shadow(0 0 6px rgba(110, 231, 183, 0.9))'
                        }} />
                        <span className="text-[10px] font-bold" style={{
                          color: '#A7F3D0',
                          textShadow: '0 0 8px rgba(167, 243, 208, 0.8)'
                        }}>HRV</span>
                      </div>
                    </div>

                    <div className="space-y-4 flex flex-col items-center">
                      <div className="w-full flex justify-center">
                        <CircularGauge
                          value={sdnn}
                          label="SDNN"
                          unit="ms"
                          min={0}
                          max={200}
                          targetMin={50}
                          targetMax={100}
                          size="small"
                          style="modern"
                          color="#10b981"
                          source={filteredLatest?.source}
                          deviceId={filteredLatest?.deviceId}
                          onClick={() => {
                            setFocusedField('sdnn');
                            setIsModalOpen(true);
                          }}
                        />
                      </div>
                      <div className="w-full flex justify-center">
                        <CircularGauge
                          value={rmssd}
                          label="RMSSD"
                          unit="ms"
                          min={0}
                          max={100}
                          targetMin={20}
                          targetMax={50}
                          size="small"
                          style="modern"
                          color="#059669"
                          source={filteredLatest?.source}
                          deviceId={filteredLatest?.deviceId}
                          onClick={() => {
                            setFocusedField('rmssd');
                            setIsModalOpen(true);
                          }}
                        />
                      </div>
                      <div className="w-full flex justify-center">
                        <CircularGauge
                          value={pnn50}
                          label="pNN50"
                          unit="%"
                          min={0}
                          max={60}
                          targetMin={10}
                          targetMax={40}
                          size="small"
                          style="modern"
                          color="#047857"
                          source={filteredLatest?.source}
                          deviceId={filteredLatest?.deviceId}
                          onClick={() => {
                            setFocusedField('pnn50');
                            setIsModalOpen(true);
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 p-3 rounded-lg" style={{
                      background: 'rgba(16, 185, 129, 0.25)',
                      border: '2px solid rgba(16, 185, 129, 0.4)',
                      boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
                    }}>
                      <p className="text-[10px] uppercase tracking-wide font-semibold text-center" style={{
                        color: '#A7F3D0',
                        textShadow: '0 0 8px rgba(167, 243, 208, 0.7)'
                      }}>
                        Parasympathetic Activity Monitor
                      </p>
                    </div>
                  </div>
                </div>

                {/* CENTER PANEL - Cardiac Function (PRIMARY) */}
                <div className="relative overflow-hidden rounded-2xl p-6" style={{
                  background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.3), rgba(251, 191, 36, 0.3))',
                  border: '3px solid rgba(212, 175, 55, 0.85)',
                  boxShadow: '0 12px 48px rgba(212, 175, 55, 0.55), inset 0 4px 12px rgba(212, 175, 55, 0.25), 0 0 80px rgba(212, 175, 55, 0.35)'
                }}>
                  {/* Enhanced holographic effect for primary panel */}
                  <div className="absolute inset-0 opacity-50" style={{
                    background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)',
                    backgroundSize: '200% 200%',
                    animation: 'shimmer 2s infinite'
                  }}></div>

                  <div className="relative">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold uppercase tracking-wider" style={{
                        color: '#FCD34D',
                        fontFamily: '"SF Pro Display", sans-serif',
                        textShadow: '0 0 25px rgba(252, 211, 77, 1), 0 0 50px rgba(251, 191, 36, 0.7)'
                      }}>
                        ★ Cardiac Function ★
                      </h3>
                      <div className="flex items-center gap-1 px-2 py-1 rounded" style={{
                        background: 'rgba(212, 175, 55, 0.45)',
                        border: '2px solid rgba(212, 175, 55, 0.8)',
                        boxShadow: '0 0 20px rgba(212, 175, 55, 0.6)'
                      }}>
                        <Activity className="h-3 w-3 animate-pulse" style={{
                          color: '#FCD34D',
                          filter: 'drop-shadow(0 0 6px rgba(252, 211, 77, 0.9))'
                        }} />
                        <span className="text-[10px] font-bold" style={{
                          color: '#FDE68A',
                          textShadow: '0 0 10px rgba(253, 230, 138, 0.8)'
                        }}>PRIMARY</span>
                      </div>
                    </div>

                    {/* EJECTION FRACTION - HERO GAUGE */}
                    <div className="mb-6 flex justify-center">
                      <div
                        style={{ width: '280px', height: '280px', position: 'relative', cursor: 'pointer' }}
                        onClick={() => {
                          setFocusedField('ejectionFraction');
                          setIsModalOpen(true);
                        }}
                      >
                        {/* Device Mode Indicator Badge */}
                        <div
                          className="group"
                          style={{
                            position: 'absolute',
                            top: '5px',
                            right: '5px',
                            zIndex: 10,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: '9999px',
                            border: `1px solid ${filteredLatest?.source === 'device' ? '#22c55e' : filteredLatest?.source === 'import' ? '#fbbf24' : '#60a5fa'}`,
                            backgroundColor: filteredLatest?.source === 'device' ? 'rgba(34, 197, 94, 0.15)' : filteredLatest?.source === 'import' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(96, 165, 250, 0.15)',
                            color: '#FFFFFF',
                            fontSize: '9px',
                            fontWeight: '900',
                            fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            textShadow: `0 0 12px ${filteredLatest?.source === 'device' ? '#22c55e' : filteredLatest?.source === 'import' ? '#fbbf24' : '#60a5fa'}, 0 0 24px ${filteredLatest?.source === 'device' ? '#22c55e' : filteredLatest?.source === 'import' ? '#fbbf24' : '#60a5fa'}80, 0 2px 4px rgba(0,0,0,0.8)`,
                            boxShadow: `0 0 16px ${filteredLatest?.source === 'device' ? '#22c55e' : filteredLatest?.source === 'import' ? '#fbbf24' : '#60a5fa'}50, inset 0 0 12px ${filteredLatest?.source === 'device' ? '#22c55e' : filteredLatest?.source === 'import' ? '#fbbf24' : '#60a5fa'}30`,
                            backdropFilter: 'blur(10px)',
                            animation: filteredLatest?.source === 'device' ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
                            transition: 'all 0.2s ease-in-out',
                          }}
                        >
                          <span style={{ fontSize: '10px' }}>
                            {filteredLatest?.source === 'device' ? '📡' : filteredLatest?.source === 'import' ? '📥' : '✍️'}
                          </span>
                          <span
                            className="opacity-0 group-hover:opacity-100 max-w-0 group-hover:max-w-[60px] overflow-hidden"
                            style={{
                              fontSize: '9px',
                              letterSpacing: '0.5px',
                              fontWeight: '900',
                              transition: 'all 0.3s ease-in-out',
                            }}
                          >
                            {filteredLatest?.source === 'device' ? (filteredLatest?.deviceId?.split('_')[0].toUpperCase() || 'AUTO') : filteredLatest?.source === 'import' ? 'IMPORT' : 'MANUAL'}
                          </span>
                        </div>

                        {/* Platinum Bezel - Extra Thick & Bright */}
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #F5F5F5 0%, #E0E0E0 15%, #C0C0C0 30%, #A8A8A8 45%, #C0C0C0 60%, #E0E0E0 75%, #F5F5F5 90%, #FFFFFF 100%)',
                          boxShadow: `0 16px 64px rgba(0,0,0,0.8), inset 0 6px 12px rgba(255,255,255,0.8), inset 0 -6px 12px rgba(0,0,0,0.6), 0 0 40px rgba(212, 175, 55, 0.4)`,
                          padding: '12px',
                        }}>
                          {/* Dark Face */}
                          <div style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle at 35% 35%, #3a3a3a 0%, #2a2a2a 30%, #1a1a1a 60%, #0a0a0a 100%)',
                            boxShadow: 'inset 0 8px 24px rgba(0,0,0,0.9), inset 0 0 50px rgba(212, 175, 55, 0.35)',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            {/* Label at top */}
                            <div style={{
                              position: 'absolute',
                              top: '15%',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              textAlign: 'center'
                            }}>
                              <div style={{
                                fontSize: '9px',
                                color: '#FCD34D',
                                fontFamily: '"SF Pro Display", sans-serif',
                                letterSpacing: '2px',
                                fontWeight: '700',
                                textShadow: '0 0 15px rgba(252, 211, 77, 1), 0 0 30px rgba(251, 191, 36, 0.8)'
                              }}>
                                EJECTION FRACTION
                              </div>
                              <div style={{
                                fontSize: '7px',
                                color: '#E5E5E5',
                                marginTop: '2px',
                                letterSpacing: '1px',
                                textShadow: '0 0 8px rgba(229, 229, 229, 0.7)'
                              }}>
                                LEFT VENTRICULAR
                              </div>
                            </div>

                            {/* Main value - HUGE LED display */}
                            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                              <div style={{
                                fontSize: '72px',
                                fontWeight: '700',
                                color: ejectionFraction === null ? '#666' :
                                       ejectionFraction < 40 ? '#ef4444' :
                                       ejectionFraction < 50 ? '#eab308' :
                                       '#10b981',
                                fontFamily: '"SF Pro Display", sans-serif',
                                textShadow: ejectionFraction === null ? 'none' :
                                           ejectionFraction < 40 ? '0 0 20px rgba(239, 68, 68, 0.9), 0 0 40px rgba(239, 68, 68, 0.6)' :
                                           ejectionFraction < 50 ? '0 0 20px rgba(234, 179, 8, 0.9), 0 0 40px rgba(234, 179, 8, 0.6)' :
                                           '0 0 20px rgba(16, 185, 129, 0.9), 0 0 40px rgba(16, 185, 129, 0.6)',
                                lineHeight: '1',
                                filter: ejectionFraction !== null ? 'drop-shadow(0 0 10px currentColor)' : 'none'
                              }}>
                                {ejectionFraction !== null ? ejectionFraction : '--'}
                              </div>
                              <div style={{
                                fontSize: '20px',
                                color: '#FCD34D',
                                fontWeight: '600',
                                marginTop: '4px',
                                textShadow: '0 0 15px rgba(252, 211, 77, 0.9), 0 0 30px rgba(251, 191, 36, 0.7)'
                              }}>
                                %
                              </div>
                            </div>

                            {/* Status at bottom */}
                            <div style={{
                              position: 'absolute',
                              bottom: '12%',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              textAlign: 'center'
                            }}>
                              <div style={{
                                fontSize: '10px',
                                fontWeight: '700',
                                color: ejectionFraction === null ? '#999' :
                                       ejectionFraction < 40 ? '#FCA5A5' :
                                       ejectionFraction < 50 ? '#FCD34D' :
                                       '#6EE7B7',
                                textShadow: ejectionFraction !== null ? '0 0 12px currentColor, 0 0 24px currentColor' : 'none',
                                letterSpacing: '1px'
                              }}>
                                {ejectionFraction === null ? 'NO DATA' :
                                 ejectionFraction < 40 ? 'HFrEF - REDUCED' :
                                 ejectionFraction < 50 ? 'HFmrEF - MID-RANGE' :
                                 'HFpEF - PRESERVED'}
                              </div>
                              <div style={{
                                fontSize: '7px',
                                color: '#E5E5E5',
                                marginTop: '2px',
                                textShadow: '0 0 8px rgba(229, 229, 229, 0.7)'
                              }}>
                                TARGET: 50-70%
                              </div>
                            </div>

                            {/* Progress ring */}
                            <svg style={{
                              position: 'absolute',
                              inset: '8px',
                              width: 'calc(100% - 16px)',
                              height: 'calc(100% - 16px)',
                              transform: 'rotate(-90deg)'
                            }}>
                              <circle
                                cx="50%"
                                cy="50%"
                                r="46%"
                                fill="none"
                                stroke="rgba(255,255,255,0.08)"
                                strokeWidth="4"
                              />
                              {ejectionFraction !== null && (
                                <circle
                                  cx="50%"
                                  cy="50%"
                                  r="46%"
                                  fill="none"
                                  stroke={ejectionFraction < 40 ? '#ef4444' :
                                         ejectionFraction < 50 ? '#eab308' :
                                         '#10b981'}
                                  strokeWidth="4"
                                  strokeLinecap="round"
                                  style={{
                                    strokeDasharray: '290',
                                    strokeDashoffset: 290 - (290 * Math.min(ejectionFraction / 80, 1)),
                                    filter: `drop-shadow(0 0 6px ${ejectionFraction < 40 ? '#ef4444' :
                                            ejectionFraction < 50 ? '#eab308' : '#10b981'})`
                                  }}
                                />
                              )}
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Secondary metrics in grid */}
                    <div className="grid grid-cols-3 gap-3">
                      <div style={{
                        padding: '14px',
                        borderRadius: '12px',
                        background: 'rgba(16, 185, 129, 0.3)',
                        border: '2px solid rgba(16, 185, 129, 0.6)',
                        textAlign: 'center',
                        boxShadow: '0 0 20px rgba(16, 185, 129, 0.35), inset 0 2px 4px rgba(16, 185, 129, 0.2)'
                      }}>
                        <div style={{
                          fontSize: '10px',
                          color: '#FFFFFF',
                          fontWeight: '900',
                          letterSpacing: '1.5px',
                          textShadow: '0 0 15px rgba(110, 231, 183, 1), 0 0 30px rgba(16, 185, 129, 0.8), 0 2px 4px rgba(0,0,0,0.8)',
                          filter: 'drop-shadow(0 0 10px rgba(110, 231, 183, 0.8))'
                        }}>MAP</div>
                        <div style={{
                          fontSize: '28px',
                          fontWeight: '900',
                          color: '#FFFFFF',
                          fontFamily: '"SF Pro Display", sans-serif',
                          textShadow: '0 0 20px rgba(110, 231, 183, 1), 0 0 40px rgba(16, 185, 129, 0.8), 0 2px 4px rgba(0,0,0,0.8)',
                          filter: 'drop-shadow(0 0 12px rgba(110, 231, 183, 0.9))',
                          marginTop: '4px',
                          marginBottom: '4px'
                        }}>
                          {currentMAP || '--'}
                        </div>
                        <div style={{
                          fontSize: '9px',
                          color: '#FFFFFF',
                          fontWeight: '700',
                          textShadow: '0 0 10px rgba(167, 243, 208, 0.9), 0 0 20px rgba(16, 185, 129, 0.6)'
                        }}>mmHg</div>
                      </div>

                      <div style={{
                        padding: '14px',
                        borderRadius: '12px',
                        background: 'rgba(59, 130, 246, 0.3)',
                        border: '2px solid rgba(59, 130, 246, 0.6)',
                        textAlign: 'center',
                        boxShadow: '0 0 20px rgba(59, 130, 246, 0.35), inset 0 2px 4px rgba(59, 130, 246, 0.2)'
                      }}>
                        <div style={{
                          fontSize: '10px',
                          color: '#FFFFFF',
                          fontWeight: '900',
                          letterSpacing: '1.5px',
                          textShadow: '0 0 15px rgba(147, 197, 253, 1), 0 0 30px rgba(59, 130, 246, 0.8), 0 2px 4px rgba(0,0,0,0.8)',
                          filter: 'drop-shadow(0 0 10px rgba(147, 197, 253, 0.8))'
                        }}>PULSE PP</div>
                        <div style={{
                          fontSize: '28px',
                          fontWeight: '900',
                          color: '#FFFFFF',
                          fontFamily: '"SF Pro Display", sans-serif',
                          textShadow: '0 0 20px rgba(147, 197, 253, 1), 0 0 40px rgba(59, 130, 246, 0.8), 0 2px 4px rgba(0,0,0,0.8)',
                          filter: 'drop-shadow(0 0 12px rgba(147, 197, 253, 0.9))',
                          marginTop: '4px',
                          marginBottom: '4px'
                        }}>
                          {pulsePressure || '--'}
                        </div>
                        <div style={{
                          fontSize: '9px',
                          color: '#FFFFFF',
                          fontWeight: '700',
                          textShadow: '0 0 10px rgba(191, 219, 254, 0.9), 0 0 20px rgba(59, 130, 246, 0.6)'
                        }}>mmHg</div>
                      </div>

                      <div style={{
                        padding: '14px',
                        borderRadius: '12px',
                        background: 'rgba(236, 72, 153, 0.3)',
                        border: '2px solid rgba(236, 72, 153, 0.6)',
                        textAlign: 'center',
                        boxShadow: '0 0 20px rgba(236, 72, 153, 0.35), inset 0 2px 4px rgba(236, 72, 153, 0.2)'
                      }}>
                        <div style={{
                          fontSize: '10px',
                          color: '#FFFFFF',
                          fontWeight: '900',
                          letterSpacing: '1.5px',
                          textShadow: '0 0 15px rgba(249, 168, 212, 1), 0 0 30px rgba(236, 72, 153, 0.8), 0 2px 4px rgba(0,0,0,0.8)',
                          filter: 'drop-shadow(0 0 10px rgba(249, 168, 212, 0.8))'
                        }}>BP VAR</div>
                        <div style={{
                          fontSize: '28px',
                          fontWeight: '900',
                          color: '#FFFFFF',
                          fontFamily: '"SF Pro Display", sans-serif',
                          textShadow: '0 0 20px rgba(249, 168, 212, 1), 0 0 40px rgba(236, 72, 153, 0.8), 0 2px 4px rgba(0,0,0,0.8)',
                          filter: 'drop-shadow(0 0 12px rgba(249, 168, 212, 0.9))',
                          marginTop: '4px',
                          marginBottom: '4px'
                        }}>
                          {latestBPVariability?.toFixed(1) || '--'}
                        </div>
                        <div style={{
                          fontSize: '9px',
                          color: '#FFFFFF',
                          fontWeight: '700',
                          textShadow: '0 0 10px rgba(251, 207, 232, 0.9), 0 0 20px rgba(236, 72, 153, 0.6)'
                        }}>SD</div>
                      </div>

                      {/* SpO2 (Oxygen Saturation) Gauge */}
                      <div style={{
                        padding: '14px',
                        borderRadius: '12px',
                        background: 'rgba(34, 197, 94, 0.3)',
                        border: '2px solid rgba(34, 197, 94, 0.6)',
                        textAlign: 'center',
                        boxShadow: '0 0 20px rgba(34, 197, 94, 0.35), inset 0 2px 4px rgba(34, 197, 94, 0.2)',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setFocusedField('oxygenSaturation');
                        setIsModalOpen(true);
                      }}
                      >
                        <div style={{
                          fontSize: '10px',
                          color: '#FFFFFF',
                          fontWeight: '900',
                          letterSpacing: '1.5px',
                          textShadow: '0 0 15px rgba(134, 239, 172, 1), 0 0 30px rgba(34, 197, 94, 0.8), 0 2px 4px rgba(0,0,0,0.8)',
                          filter: 'drop-shadow(0 0 10px rgba(134, 239, 172, 0.8))'
                        }}>SpO₂</div>
                        <div style={{
                          fontSize: '28px',
                          fontWeight: '900',
                          color: '#FFFFFF',
                          fontFamily: '"SF Pro Display", sans-serif',
                          textShadow: '0 0 20px rgba(134, 239, 172, 1), 0 0 40px rgba(34, 197, 94, 0.8), 0 2px 4px rgba(0,0,0,0.8)',
                          filter: 'drop-shadow(0 0 12px rgba(134, 239, 172, 0.9))',
                          marginTop: '4px',
                          marginBottom: '4px'
                        }}>
                          {filteredLatest?.oxygenSaturation || '--'}
                        </div>
                        <div style={{
                          fontSize: '9px',
                          color: '#FFFFFF',
                          fontWeight: '700',
                          textShadow: '0 0 10px rgba(167, 243, 208, 0.9), 0 0 20px rgba(34, 197, 94, 0.6)'
                        }}>%</div>
                        {/* Low SpO2 Alert */}
                        {filteredLatest?.oxygenSaturation && filteredLatest.oxygenSaturation < 90 && (
                          <div className="mt-2 flex items-center justify-center gap-1" style={{
                            fontSize: '8px',
                            color: '#FCA5A5',
                            fontWeight: '900',
                            textShadow: '0 0 10px rgba(252, 165, 165, 1)',
                            animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                          }}>
                            <AlertTriangle className="h-3 w-3" />
                            <span>LOW O₂</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 p-3 rounded-lg" style={{
                      background: 'rgba(212, 175, 55, 0.3)',
                      border: '2px solid rgba(212, 175, 55, 0.5)',
                      boxShadow: '0 0 20px rgba(212, 175, 55, 0.3)'
                    }}>
                      <p className="text-[10px] uppercase font-semibold text-center" style={{
                        color: '#FFFFFF',
                        fontWeight: '900',
                        letterSpacing: '0.8px',
                        textShadow: '0 0 20px rgba(252, 211, 77, 1), 0 0 40px rgba(245, 158, 11, 0.8), 0 0 60px rgba(217, 119, 6, 0.6), 0 2px 4px rgba(0,0,0,0.8)',
                        filter: 'drop-shadow(0 0 12px rgba(252, 211, 77, 0.9)) drop-shadow(0 0 24px rgba(245, 158, 11, 0.7))'
                      }}>
                        Hemodynamic & Oxygen Performance Analysis
                      </p>
                    </div>
                  </div>
                </div>

                {/* RIGHT PANEL - Exercise Capacity */}
                <div className="relative overflow-hidden rounded-2xl p-6" style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(99, 102, 241, 0.25))',
                  border: '2px solid rgba(139, 92, 246, 0.8)',
                  boxShadow: '0 8px 32px rgba(139, 92, 246, 0.45), inset 0 2px 8px rgba(139, 92, 246, 0.2), 0 0 60px rgba(139, 92, 246, 0.25)'
                }}>
                  {/* Holographic shine effect */}
                  <div className="absolute inset-0 opacity-40" style={{
                    background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)',
                    backgroundSize: '200% 200%',
                    animation: 'shimmer 3s infinite'
                  }}></div>

                  <div className="relative">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold uppercase tracking-wider" style={{
                        color: '#C4B5FD',
                        fontFamily: '"SF Pro Display", sans-serif',
                        textShadow: '0 0 20px rgba(196, 181, 253, 0.9), 0 0 40px rgba(139, 92, 246, 0.6)'
                      }}>
                        Exercise Capacity
                      </h3>
                      <div className="flex items-center gap-1 px-2 py-1 rounded" style={{
                        background: 'rgba(139, 92, 246, 0.35)',
                        border: '2px solid rgba(139, 92, 246, 0.6)',
                        boxShadow: '0 0 15px rgba(139, 92, 246, 0.5)'
                      }}>
                        <Activity className="h-3 w-3 animate-pulse" style={{
                          color: '#C4B5FD',
                          filter: 'drop-shadow(0 0 6px rgba(196, 181, 253, 0.9))'
                        }} />
                        <span className="text-[10px] font-bold" style={{
                          color: '#DDD6FE',
                          textShadow: '0 0 8px rgba(221, 214, 254, 0.8)'
                        }}>FUNCTIONAL</span>
                      </div>
                    </div>

                    <div className="space-y-4 flex flex-col items-center">
                      <div className="w-full flex justify-center">
                        <CircularGauge
                          value={vo2Max}
                          label="VO₂ Max"
                          unit="mL/kg/min"
                          min={15}
                          max={60}
                          targetMin={25}
                          targetMax={35}
                          size="small"
                          style="modern"
                          color="#a855f7"
                          source={filteredLatest?.source}
                          deviceId={filteredLatest?.deviceId}
                          onClick={() => {
                            setFocusedField('vo2Max');
                            setIsModalOpen(true);
                          }}
                        />
                      </div>
                      <div className="w-full flex justify-center">
                        <CircularGauge
                          value={sixMinWalk}
                          label="6-Min Walk"
                          unit="m"
                          min={200}
                          max={800}
                          targetMin={400}
                          targetMax={700}
                          size="small"
                          style="modern"
                          color="#8b5cf6"
                          source={filteredLatest?.source}
                          deviceId={filteredLatest?.deviceId}
                          onClick={() => {
                            setFocusedField('sixMinWalk');
                            setIsModalOpen(true);
                          }}
                        />
                      </div>
                      <div className="w-full flex justify-center">
                        <CircularGauge
                          value={hrRecovery}
                          label="HR Recovery"
                          unit="bpm/min"
                          min={5}
                          max={40}
                          targetMin={12}
                          targetMax={25}
                          size="small"
                          style="modern"
                          color="#a78bfa"
                          source={filteredLatest?.source}
                          deviceId={filteredLatest?.deviceId}
                          onClick={() => {
                            setFocusedField('hrRecovery');
                            setIsModalOpen(true);
                          }}
                        />
                      </div>
                      <div className="w-full flex justify-center">
                        <CircularGauge
                          value={filteredLatest?.peakFlow || null}
                          label="Peak Flow"
                          unit="L/min"
                          min={200}
                          max={700}
                          targetMin={400}
                          targetMax={600}
                          size="small"
                          style="modern"
                          color="#c084fc"
                          source={filteredLatest?.source}
                          deviceId={filteredLatest?.deviceId}
                          onClick={() => {
                            setFocusedField('peakFlow');
                            setIsModalOpen(true);
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 p-3 rounded-lg" style={{
                      background: 'rgba(139, 92, 246, 0.25)',
                      border: '2px solid rgba(139, 92, 246, 0.4)',
                      boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)'
                    }}>
                      <p className="text-[10px] uppercase tracking-wide font-semibold text-center" style={{
                        color: '#DDD6FE',
                        textShadow: '0 0 8px rgba(221, 214, 254, 0.7)'
                      }}>
                        Aerobic & Recovery Assessment
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              </div> {/* End relative p-8 */}
            </div> {/* End collapsible content wrapper */}
          </div>
        </div>
      </HeartFrame>

      {/* ADVANCED ANALYSIS JOURNALS - Luxury Spacecraft Command Panel */}
      <div className="relative overflow-hidden rounded-2xl p-8 mb-8" style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 50%, rgba(15, 23, 42, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        border: '2px solid rgba(96, 165, 250, 0.3)',
        boxShadow: '0 0 60px rgba(96, 165, 250, 0.2), inset 0 0 60px rgba(96, 165, 250, 0.05), 0 8px 32px rgba(0,0,0,0.3)'
      }}>
        {/* Animated background glow */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(139, 92, 246, 0.4) 0%, transparent 50%)',
        }}></div>

        <div className="relative">
          {/* Header with decorative lines */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"></div>
            <h3 className="text-sm font-bold tracking-[0.2em] uppercase" style={{
              background: 'linear-gradient(135deg, #60a5fa, #a78bfa, #60a5fa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 30px rgba(96, 165, 250, 0.5)',
              filter: 'drop-shadow(0 0 10px rgba(96, 165, 250, 0.3))'
            }}>
              ADVANCED ANALYSIS JOURNALS
            </h3>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"></div>
          </div>

          {/* Main Navigation Tabs - Premium Design */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { id: 'overview' as const, label: 'Overview', icon: Activity },
              { id: 'weight' as const, label: 'Weight Journal', icon: Weight },
              { id: 'glucose' as const, label: 'Glucose Journal', icon: Droplet },
              { id: 'pulse' as const, label: 'Heart Rate Journal', icon: Heart }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-5 py-2.5 rounded-xl font-black text-sm tracking-wide transition-all duration-300 hover:scale-105"
                style={activeTab === tab.id ? {
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(99, 102, 241, 0.4))',
                  border: '2px solid rgba(96, 165, 250, 0.6)',
                  boxShadow: '0 0 30px rgba(59, 130, 246, 0.5), inset 0 0 20px rgba(59, 130, 246, 0.15)',
                  color: '#ffffff',
                  textShadow: '0 0 15px rgba(96, 165, 250, 1), 0 0 30px rgba(96, 165, 250, 0.6)',
                  fontWeight: '900'
                } : {
                  background: 'rgba(30, 41, 59, 0.4)',
                  border: '1px solid rgba(71, 85, 105, 0.5)',
                  boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.3)',
                  color: '#e2e8f0',
                  fontWeight: '700'
                }}>
                <div className="flex items-center gap-2">
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </div>
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
            {/* Water intake card moved to A380 cockpit section */}
          </div>


          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

          {/* Chart Controls - Luxury Spacecraft Command Panel - COLLAPSIBLE */}
          <div className="relative overflow-hidden rounded-2xl mb-8" style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 50%, rgba(15, 23, 42, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(96, 165, 250, 0.3)',
            boxShadow: '0 0 60px rgba(96, 165, 250, 0.2), inset 0 0 60px rgba(96, 165, 250, 0.05), 0 8px 32px rgba(0,0,0,0.3)'
          }}>
            {/* Animated background glow */}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(139, 92, 246, 0.4) 0%, transparent 50%)',
            }}></div>

            {/* Cockpit-Style Collapsible Header Button */}
            <button
              onClick={() => setIsMetricsExpanded(!isMetricsExpanded)}
              className="w-full p-6 flex items-center justify-between group cursor-pointer transition-all duration-300 hover:bg-white/5 relative"
              style={{
                borderBottom: isMetricsExpanded ? '1px solid rgba(59, 130, 246, 0.3)' : 'none'
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="p-2 rounded-lg transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.3), rgba(168, 85, 247, 0.3))',
                    border: '1px solid rgba(96, 165, 250, 0.5)',
                    boxShadow: isMetricsExpanded
                      ? '0 0 20px rgba(96, 165, 250, 0.6)'
                      : '0 0 10px rgba(96, 165, 250, 0.3)'
                  }}
                >
                  <Sliders className="h-6 w-6 text-blue-300" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="px-2 py-0.5 rounded text-xs font-mono"
                      style={{
                        background: 'rgba(96, 165, 250, 0.2)',
                        border: '1px solid rgba(96, 165, 250, 0.4)',
                        color: '#60a5fa'
                      }}
                    >
                      CONTROLS
                    </div>
                  </div>
                  <h2
                    className="text-2xl font-bold tracking-wide mt-1"
                    style={{
                      color: '#ffffff',
                      textShadow: '0 0 20px rgba(96, 165, 250, 0.3)',
                      fontFamily: '"Orbitron", "Rajdhani", sans-serif'
                    }}
                  >
                    VITAL METRICS COMMAND CENTER
                  </h2>
                </div>
              </div>

              {/* Chevron with Aerospace Styling */}
              <div className="flex items-center gap-3">
                <div
                  className="text-xs font-mono uppercase tracking-widest"
                  style={{
                    color: '#60a5fa',
                    textShadow: '0 0 8px rgba(59, 130, 246, 0.6)'
                  }}
                >
                  {isMetricsExpanded ? 'COLLAPSE' : 'EXPAND'}
                </div>
                <div
                  className="p-2 rounded-lg transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.2), rgba(168, 85, 247, 0.2))',
                    border: '1px solid rgba(96, 165, 250, 0.4)',
                    boxShadow: isMetricsExpanded
                      ? '0 0 20px rgba(96, 165, 250, 0.5)'
                      : '0 0 10px rgba(96, 165, 250, 0.3)'
                  }}
                >
                  {isMetricsExpanded ? (
                    <ChevronUp className="h-6 w-6 text-blue-400" />
                  ) : (
                    <ChevronDown className="h-6 w-6 text-blue-400" />
                  )}
                </div>
              </div>
            </button>

            {/* Collapsible Content with Smooth Animation */}
            <div
              style={{
                maxHeight: isMetricsExpanded ? '3000px' : '0',
                opacity: isMetricsExpanded ? 1 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-in-out'
              }}
            >
              <div className="relative p-8">

              {/* Metric Selector Buttons - Premium Glass Design */}
              <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
                <button
                  onClick={() => setSelectedMetric('bp')}
                  className="px-4.5 py-2 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 hover:scale-105"
                  style={selectedMetric === 'bp' ? {
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(37, 99, 235, 0.9))',
                    border: '2px solid rgba(96, 165, 250, 0.8)',
                    boxShadow: '0 0 30px rgba(59, 130, 246, 0.6), inset 0 0 20px rgba(96, 165, 250, 0.3)',
                    color: '#ffffff',
                    textShadow: '0 0 20px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0,0,0,0.5)'
                  } : {
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(51, 65, 85, 0.6))',
                    border: '1px solid rgba(96, 165, 250, 0.3)',
                    color: '#93c5fd',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  Blood Pressure
                </button>
                <button
                  onClick={() => setSelectedMetric('hr')}
                  className="px-4.5 py-2 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 hover:scale-105"
                  style={selectedMetric === 'hr' ? {
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.9))',
                    border: '2px solid rgba(248, 113, 113, 0.8)',
                    boxShadow: '0 0 30px rgba(239, 68, 68, 0.6), inset 0 0 20px rgba(248, 113, 113, 0.3)',
                    color: '#ffffff',
                    textShadow: '0 0 20px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0,0,0,0.5)'
                  } : {
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(51, 65, 85, 0.6))',
                    border: '1px solid rgba(248, 113, 113, 0.3)',
                    color: '#fca5a5',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  Heart Rate
                </button>
                <button
                  onClick={() => setSelectedMetric('weight')}
                  className="px-4.5 py-2 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 hover:scale-105"
                  style={selectedMetric === 'weight' ? {
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.9))',
                    border: '2px solid rgba(52, 211, 153, 0.8)',
                    boxShadow: '0 0 30px rgba(16, 185, 129, 0.6), inset 0 0 20px rgba(52, 211, 153, 0.3)',
                    color: '#ffffff',
                    textShadow: '0 0 20px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0,0,0,0.5)'
                  } : {
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(51, 65, 85, 0.6))',
                    border: '1px solid rgba(52, 211, 153, 0.3)',
                    color: '#6ee7b7',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  Weight
                </button>
                <button
                  onClick={() => setSelectedMetric('sugar')}
                  className="px-4.5 py-2 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 hover:scale-105"
                  style={selectedMetric === 'sugar' ? {
                    background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.9), rgba(234, 88, 12, 0.9))',
                    border: '2px solid rgba(251, 146, 60, 0.8)',
                    boxShadow: '0 0 30px rgba(249, 115, 22, 0.6), inset 0 0 20px rgba(251, 146, 60, 0.3)',
                    color: '#ffffff',
                    textShadow: '0 0 20px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0,0,0,0.5)'
                  } : {
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(51, 65, 85, 0.6))',
                    border: '1px solid rgba(251, 146, 60, 0.3)',
                    color: '#fdba74',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  Blood Sugar
                </button>
                <button
                  onClick={() => setSelectedMetric('temp')}
                  className="px-4.5 py-2 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 hover:scale-105"
                  style={selectedMetric === 'temp' ? {
                    background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.9), rgba(194, 65, 12, 0.9))',
                    border: '2px solid rgba(251, 146, 60, 0.8)',
                    boxShadow: '0 0 30px rgba(234, 88, 12, 0.6), inset 0 0 20px rgba(251, 146, 60, 0.3)',
                    color: '#ffffff',
                    textShadow: '0 0 20px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0,0,0,0.5)'
                  } : {
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(51, 65, 85, 0.6))',
                    border: '1px solid rgba(251, 146, 60, 0.3)',
                    color: '#fdba74',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  Temperature
                </button>
                <button
                  onClick={() => setSelectedMetric('hydration')}
                  className="px-4.5 py-2 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 hover:scale-105"
                  style={selectedMetric === 'hydration' ? {
                    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.9), rgba(29, 78, 216, 0.9))',
                    border: '2px solid rgba(96, 165, 250, 0.8)',
                    boxShadow: '0 0 30px rgba(37, 99, 235, 0.6), inset 0 0 20px rgba(96, 165, 250, 0.3)',
                    color: '#ffffff',
                    textShadow: '0 0 20px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0,0,0,0.5)'
                  } : {
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(51, 65, 85, 0.6))',
                    border: '1px solid rgba(96, 165, 250, 0.3)',
                    color: '#93c5fd',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  Hydration
                </button>
                <button
                  onClick={() => setSelectedMetric('o2')}
                  className="px-4.5 py-2 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 hover:scale-105"
                  style={selectedMetric === 'o2' ? {
                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.9), rgba(8, 145, 178, 0.9))',
                    border: '2px solid rgba(34, 211, 238, 0.8)',
                    boxShadow: '0 0 30px rgba(6, 182, 212, 0.6), inset 0 0 20px rgba(34, 211, 238, 0.3)',
                    color: '#ffffff',
                    textShadow: '0 0 20px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0,0,0,0.5)'
                  } : {
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(51, 65, 85, 0.6))',
                    border: '1px solid rgba(34, 211, 238, 0.3)',
                    color: '#67e8f9',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  O₂ Sat
                </button>
                <button
                  onClick={() => setSelectedMetric('peakflow')}
                  className="px-4.5 py-2 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 hover:scale-105"
                  style={selectedMetric === 'peakflow' ? {
                    background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.9), rgba(4, 120, 87, 0.9))',
                    border: '2px solid rgba(52, 211, 153, 0.8)',
                    boxShadow: '0 0 30px rgba(5, 150, 105, 0.6), inset 0 0 20px rgba(52, 211, 153, 0.3)',
                    color: '#ffffff',
                    textShadow: '0 0 20px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0,0,0,0.5)'
                  } : {
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(51, 65, 85, 0.6))',
                    border: '1px solid rgba(52, 211, 153, 0.3)',
                    color: '#6ee7b7',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  Peak Flow
                </button>
                <button
                  onClick={() => setSelectedMetric('map')}
                  className="px-4.5 py-2 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 hover:scale-105"
                  style={selectedMetric === 'map' ? {
                    background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.9), rgba(126, 34, 206, 0.9))',
                    border: '2px solid rgba(168, 85, 247, 0.8)',
                    boxShadow: '0 0 30px rgba(147, 51, 234, 0.6), inset 0 0 20px rgba(168, 85, 247, 0.3)',
                    color: '#ffffff',
                    textShadow: '0 0 20px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0,0,0,0.5)'
                  } : {
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(51, 65, 85, 0.6))',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    color: '#c4b5fd',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  MAP
                </button>
                <button
                  onClick={() => setSelectedMetric('bpvariability')}
                  className="px-4.5 py-2 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 hover:scale-105"
                  style={selectedMetric === 'bpvariability' ? {
                    background: 'linear-gradient(135deg, rgba(219, 39, 119, 0.9), rgba(190, 24, 93, 0.9))',
                    border: '2px solid rgba(236, 72, 153, 0.8)',
                    boxShadow: '0 0 30px rgba(219, 39, 119, 0.6), inset 0 0 20px rgba(236, 72, 153, 0.3)',
                    color: '#ffffff',
                    textShadow: '0 0 20px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0,0,0,0.5)'
                  } : {
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(51, 65, 85, 0.6))',
                    border: '1px solid rgba(236, 72, 153, 0.3)',
                    color: '#f9a8d4',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  BP Variability
                </button>
              </div>

              {/* Surgery Date Timeline Info - Luxury Design */}
              <div className="flex items-center justify-between gap-4 px-6 py-4 rounded-xl mb-6" style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.15))',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                boxShadow: '0 0 20px rgba(59, 130, 246, 0.2), inset 0 0 20px rgba(59, 130, 246, 0.05)',
                backdropFilter: 'blur(10px)'
              }}>
                <div className="flex items-center gap-4">
                  {surgeryDate ? (
                    <>
                      <div className="p-2 rounded-lg" style={{
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(37, 99, 235, 0.3))',
                        boxShadow: '0 0 15px rgba(59, 130, 246, 0.4)'
                      }}>
                        <Calendar className="h-5 w-5 text-blue-300" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">
                          Surgery Date (Day 0)
                        </span>
                        <span className="text-sm font-bold text-white" style={{
                          textShadow: '0 0 10px rgba(96, 165, 250, 0.8)'
                        }}>
                          {format(new Date(surgeryDate), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <div className="h-8 w-px bg-gradient-to-b from-transparent via-blue-400/50 to-transparent mx-2"></div>
                      <span className="text-xs text-gray-300">
                        <span className="font-semibold text-blue-200">Timeline:</span>{' '}
                        {format(subMonths(new Date(surgeryDate), 1), 'MMM yyyy')} - {format(addMonths(new Date(), 1), 'MMM yyyy')}
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-yellow-400 animate-pulse" />
                      <span className="text-sm font-semibold text-yellow-300">
                        No surgery date set - Showing last 3 months
                      </span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => navigate('/profile')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all duration-300 hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.2))',
                    border: '1px solid rgba(96, 165, 250, 0.5)',
                    color: '#93c5fd',
                    boxShadow: '0 0 15px rgba(59, 130, 246, 0.3)'
                  }}
                  title="Edit surgery date in Profile"
                >
                  <Edit className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              {/* Time Range Selector - Premium Design */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <span className="text-sm font-bold uppercase tracking-[0.15em] mr-3" style={{
                  background: 'linear-gradient(135deg, #a78bfa, #c4b5fd)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  Time Range
                </span>
                <button
                  onClick={() => setGlobalTimeView('7d')}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 hover:scale-105"
                  style={globalTimeView === '7d' ? {
                    background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.9), rgba(126, 34, 206, 0.9))',
                    border: '2px solid rgba(168, 85, 247, 0.8)',
                    boxShadow: '0 0 30px rgba(147, 51, 234, 0.6), inset 0 0 20px rgba(168, 85, 247, 0.3)',
                    color: '#ffffff',
                    textShadow: '0 0 20px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0,0,0,0.5)'
                  } : {
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(51, 65, 85, 0.6))',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    color: '#c4b5fd',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  7 Days
                </button>
                <button
                  onClick={() => setGlobalTimeView('30d')}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 hover:scale-105"
                  style={globalTimeView === '30d' ? {
                    background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.9), rgba(126, 34, 206, 0.9))',
                    border: '2px solid rgba(168, 85, 247, 0.8)',
                    boxShadow: '0 0 30px rgba(147, 51, 234, 0.6), inset 0 0 20px rgba(168, 85, 247, 0.3)',
                    color: '#ffffff',
                    textShadow: '0 0 20px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0,0,0,0.5)'
                  } : {
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(51, 65, 85, 0.6))',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    color: '#c4b5fd',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  30 Days
                </button>
                <button
                  onClick={() => setGlobalTimeView('90d')}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 hover:scale-105"
                  style={globalTimeView === '90d' ? {
                    background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.9), rgba(126, 34, 206, 0.9))',
                    border: '2px solid rgba(168, 85, 247, 0.8)',
                    boxShadow: '0 0 30px rgba(147, 51, 234, 0.6), inset 0 0 20px rgba(168, 85, 247, 0.3)',
                    color: '#ffffff',
                    textShadow: '0 0 20px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0,0,0,0.5)'
                  } : {
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(51, 65, 85, 0.6))',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    color: '#c4b5fd',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  90 Days
                </button>
                <button
                  onClick={() => setGlobalTimeView('surgery')}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 hover:scale-105"
                  disabled={!surgeryDate}
                  style={globalTimeView === 'surgery' ? {
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(37, 99, 235, 0.9))',
                    border: '2px solid rgba(96, 165, 250, 0.8)',
                    boxShadow: '0 0 30px rgba(59, 130, 246, 0.6), inset 0 0 20px rgba(96, 165, 250, 0.3)',
                    color: '#ffffff',
                    textShadow: '0 0 20px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0,0,0,0.5)'
                  } : {
                    background: surgeryDate ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(51, 65, 85, 0.6))' : 'linear-gradient(135deg, rgba(17, 24, 39, 0.6), rgba(31, 41, 55, 0.6))',
                    border: surgeryDate ? '1px solid rgba(96, 165, 250, 0.3)' : '1px solid rgba(75, 85, 99, 0.3)',
                    color: surgeryDate ? '#93c5fd' : '#6b7280',
                    backdropFilter: 'blur(10px)',
                    cursor: surgeryDate ? 'pointer' : 'not-allowed',
                    opacity: surgeryDate ? 1 : 0.5
                  }}
                  title={surgeryDate ? 'Show surgery-based timeline' : 'No surgery date set'}
                >
                  {surgeryDate ? 'Surgery Timeline' : 'Surgery Timeline (N/A)'}
                </button>
              </div>
              </div> {/* End relative p-8 */}
            </div> {/* End collapsible content wrapper */}
          </div> {/* End VITAL METRICS COMMAND CENTER container */}

          {/* Chart Section - Collapsible */}
          <div className="relative overflow-hidden rounded-2xl mb-8" style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 50%, rgba(15, 23, 42, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(96, 165, 250, 0.3)',
            boxShadow: '0 0 60px rgba(96, 165, 250, 0.2), inset 0 0 60px rgba(96, 165, 250, 0.05), 0 8px 32px rgba(0,0,0,0.3)'
          }}>
            {/* Cockpit-Style Header Button */}
            <button
              onClick={() => setIsChartExpanded(!isChartExpanded)}
              className="w-full p-6 flex items-center justify-between group cursor-pointer transition-all duration-300 hover:bg-white/5"
              style={{
                borderBottom: isChartExpanded ? '1px solid rgba(59, 130, 246, 0.3)' : 'none'
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="p-2 rounded-lg transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(99, 102, 241, 0.3))',
                    border: '1px solid rgba(59, 130, 246, 0.5)',
                    boxShadow: isChartExpanded
                      ? '0 0 20px rgba(59, 130, 246, 0.6)'
                      : '0 0 10px rgba(59, 130, 246, 0.3)'
                  }}
                >
                  <TrendingUp className="h-6 w-6 text-blue-300" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="px-2 py-0.5 rounded text-xs font-mono"
                      style={{
                        background: 'rgba(59, 130, 246, 0.2)',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        color: '#60a5fa'
                      }}
                    >
                      CHART
                    </div>
                  </div>
                  <h2
                    className="text-2xl font-bold tracking-wide mt-1"
                    style={{
                      color: '#ffffff',
                      textShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
                      fontFamily: '"Orbitron", "Rajdhani", sans-serif'
                    }}
                  >
                    VITAL TRENDS VISUALIZATION
                  </h2>
                </div>
              </div>

              {/* Chevron with Aerospace Styling */}
              <div className="flex items-center gap-3">
                <div
                  className="text-xs font-mono uppercase tracking-widest"
                  style={{
                    color: '#60a5fa',
                    textShadow: '0 0 8px rgba(59, 130, 246, 0.6)'
                  }}
                >
                  {isChartExpanded ? 'COLLAPSE' : 'EXPAND'}
                </div>
                <div
                  className="p-2 rounded-lg transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.2))',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    boxShadow: isChartExpanded
                      ? '0 0 20px rgba(59, 130, 246, 0.5)'
                      : '0 0 10px rgba(59, 130, 246, 0.3)',
                    transform: isChartExpanded ? 'rotate(0deg)' : 'rotate(0deg)'
                  }}
                >
                  {isChartExpanded ? (
                    <ChevronUp className="h-6 w-6 text-blue-400" />
                  ) : (
                    <ChevronDown className="h-6 w-6 text-blue-400" />
                  )}
                </div>
              </div>
            </button>

            {/* Collapsible Content with Smooth Animation */}
            <div
              style={{
                maxHeight: isChartExpanded ? '2000px' : '0',
                opacity: isChartExpanded ? 1 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-in-out'
              }}
            >
              <div className="p-6">
                <GlassCard>
                  {/* Date Range Display - UNIFIED */}
                  <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg mb-4" style={{
              background: selectedMetric === 'hydration'
                ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(8, 145, 178, 0.15))'
                : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.1))',
              border: selectedMetric === 'hydration'
                ? '1px solid rgba(6, 182, 212, 0.4)'
                : '1px solid rgba(59, 130, 246, 0.3)',
            }}>
              <Calendar className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-semibold text-gray-300">
                {(() => {
                  const { startDate, endDate } = calculateDateRange(globalTimeView, surgeryDate);
                  const viewLabel =
                    globalTimeView === '7d' ? '7 days with 1-month buffer' :
                    globalTimeView === '30d' ? '30 days with 1-month buffer' :
                    globalTimeView === '90d' ? '90 days with 1-month buffer' :
                    surgeryDate ? '1 month pre-surgery to 1 month ahead' : 'Last 3 months with buffer';

                  return (
                    <>
                      Showing data from{' '}
                      <span className="text-blue-400 font-bold">
                        {format(new Date(startDate), 'MMM dd, yyyy')}
                      </span>
                      {' '}to{' '}
                      <span className="text-blue-400 font-bold">
                        {format(new Date(endDate), 'MMM dd, yyyy')}
                      </span>
                      {' '}({viewLabel})
                    </>
                  );
                })()}
              </span>
            </div>

            {/* Chart */}
            <div className="h-96">
              {activeChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {selectedMetric === 'bp' ? (
                    <AreaChart key={`bp-${globalTimeView}`} data={activeChartData}>
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

                      {/* Blood Pressure Zones - International Standards (AHA Guidelines) */}
                      {/* Systolic Zones */}
                      <ReferenceArea y1={180} y2={200} fill="#ef4444" fillOpacity={0.15} />
                      <ReferenceArea y1={140} y2={180} fill="#f97316" fillOpacity={0.12} />
                      <ReferenceArea y1={130} y2={140} fill="#eab308" fillOpacity={0.1} />
                      <ReferenceArea y1={90} y2={120} fill="#10b981" fillOpacity={0.1} />
                      <ReferenceArea y1={60} y2={90} fill="#eab308" fillOpacity={0.1} />

                      {/* Warning Lines - Smart Positioning to Avoid Data */}
                      <ReferenceLine y={180} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={2} label={{ value: '🚨 Hypertensive Crisis (180)', position: getSmartLabelPosition(180, ['systolic', 'diastolic'], 15), fill: '#ffffff', fontSize: 11, fontWeight: 'bold', style: { textShadow: '0 0 4px #000, 0 0 8px #ef4444, 1px 1px 2px #000' } }} />
                      <ReferenceLine y={140} stroke="#f97316" strokeDasharray="3 3" strokeWidth={2} label={{ value: '⚠ Stage 2 HTN (140)', position: getSmartLabelPosition(140, ['systolic', 'diastolic'], 15), fill: '#ffffff', fontSize: 11, fontWeight: 'bold', style: { textShadow: '0 0 4px #000, 0 0 8px #f97316, 1px 1px 2px #000' } }} />
                      <ReferenceLine y={130} stroke="#eab308" strokeDasharray="3 3" strokeWidth={2} label={{ value: '⚠ Stage 1 HTN (130)', position: getSmartLabelPosition(130, ['systolic', 'diastolic'], 15), fill: '#ffffff', fontSize: 11, fontWeight: 'bold', style: { textShadow: '0 0 4px #000, 0 0 8px #eab308, 1px 1px 2px #000' } }} />
                      <ReferenceLine y={120} stroke="#10b981" strokeDasharray="5 5" strokeWidth={3} label={{ value: '✓ Normal Systolic (120)', position: getSmartLabelPosition(120, ['systolic', 'diastolic'], 15), fill: '#ffffff', fontSize: 12, fontWeight: 'bold', style: { textShadow: '0 0 4px #000, 0 0 8px #10b981, 1px 1px 2px #000' } }} />
                      <ReferenceLine y={90} stroke="#eab308" strokeDasharray="3 3" strokeWidth={2} label={{ value: '⚠ Low Systolic (90)', position: getSmartLabelPosition(90, ['systolic', 'diastolic'], 15), fill: '#ffffff', fontSize: 11, fontWeight: 'bold', style: { textShadow: '0 0 4px #000, 0 0 8px #eab308, 1px 1px 2px #000' } }} />
                      <ReferenceLine y={80} stroke="#10b981" strokeDasharray="5 5" strokeWidth={3} label={{ value: '✓ Normal Diastolic (80)', position: getSmartLabelPosition(80, ['systolic', 'diastolic'], 15), fill: '#ffffff', fontSize: 12, fontWeight: 'bold', style: { textShadow: '0 0 4px #000, 0 0 8px #10b981, 1px 1px 2px #000' } }} />
                    </AreaChart>
                  ) : (
                    <LineChart key={`${selectedMetric}-${globalTimeView}`} data={activeChartData}>
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
                          selectedMetric === 'hydration' ? [0, 128] :
                          undefined
                        }
                        ticks={selectedMetric === 'hydration' ? [0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 120, 128] : undefined}
                        stroke={selectedMetric === 'hydration' ? '#10b981' : '#9ca3af'}
                        tick={{
                          fill: selectedMetric === 'hydration' ? '#10b981' : '#d1d5db',
                          fontSize: 12,
                          fontWeight: selectedMetric === 'hydration' ? 'bold' : 600
                        }}
                        tickLine={{ stroke: selectedMetric === 'hydration' ? '#10b981' : '#6b7280' }}
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
                          selectedMetric === 'hydration' ? 'hydrationOunces' :
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
                          selectedMetric === 'hydration' ? 'Water Intake (oz)' :
                          selectedMetric === 'peakflow' ? 'Peak Flow (L/min)' :
                          selectedMetric === 'map' ? 'Mean Arterial Pressure (mmHg)' :
                          selectedMetric === 'bpvariability' ? 'BP Variability (StdDev)' :
                          'O₂ Saturation (%)'
                        }
                        filter="url(#vitalsLineGlow)"
                      />

                      {/* Hydration Target Line */}
                      {selectedMetric === 'hydration' && (
                        <Line
                          type="monotone"
                          dataKey="hydrationTarget"
                          stroke="#10b981"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          name="Daily Target (oz)"
                        />
                      )}

                      {/* Hydration Reference Lines - PERSONALIZED */}
                      {selectedMetric === 'hydration' && (() => {
                        const personalTarget = calculatePersonalizedHydrationTarget();
                        const criticalLow = Math.round(personalTarget * 0.5); // 50% of target
                        const low = Math.round(personalTarget * 0.75); // 75% of target
                        const optimalMax = Math.round(personalTarget * 1.3); // 130% of target

                        return (
                          <>
                            {/* Colored zones as background areas */}
                            <ReferenceArea y1={0} y2={criticalLow} fill="#ef4444" fillOpacity={0.1} />
                            <ReferenceArea y1={criticalLow} y2={low} fill="#eab308" fillOpacity={0.1} />
                            <ReferenceArea y1={low} y2={optimalMax} fill="#10b981" fillOpacity={0.1} />

                            {/* Reference lines */}
                            <ReferenceLine
                              y={criticalLow}
                              stroke="#ef4444"
                              strokeDasharray="3 3"
                              strokeWidth={2}
                              label={{
                                value: `Critical Low (${criticalLow} oz)`,
                                position: 'insideTopRight',
                                fill: '#ef4444',
                                fontSize: 11,
                                fontWeight: 'bold'
                              }}
                            />
                            <ReferenceLine
                              y={low}
                              stroke="#eab308"
                              strokeDasharray="3 3"
                              strokeWidth={2}
                              label={{
                                value: `Low (${low} oz)`,
                                position: 'insideTopRight',
                                fill: '#eab308',
                                fontSize: 11,
                                fontWeight: 'bold'
                              }}
                            />
                            <ReferenceLine
                              y={personalTarget}
                              stroke="#10b981"
                              strokeDasharray="5 5"
                              strokeWidth={3}
                              label={{
                                value: `🎯 YOUR TARGET (${personalTarget} oz)`,
                                position: 'insideTopRight',
                                fill: '#10b981',
                                fontSize: 12,
                                fontWeight: 'bold'
                              }}
                            />
                            <ReferenceLine
                              y={optimalMax}
                              stroke="#3b82f6"
                              strokeDasharray="5 5"
                              strokeWidth={2}
                              label={{
                                value: `Max (${optimalMax} oz)`,
                                position: 'insideBottomRight',
                                fill: '#3b82f6',
                                fontSize: 11,
                                fontWeight: 'bold'
                              }}
                            />
                          </>
                        );
                      })()}

                      {/* Heart Rate - International Standards */}
                      {selectedMetric === 'hr' && (
                        <>
                          {/* Heart Rate Zones */}
                          <ReferenceArea y1={0} y2={40} fill="#ef4444" fillOpacity={0.15} />
                          <ReferenceArea y1={40} y2={60} fill="#eab308" fillOpacity={0.1} />
                          <ReferenceArea y1={60} y2={100} fill="#10b981" fillOpacity={0.1} />
                          <ReferenceArea y1={100} y2={120} fill="#eab308" fillOpacity={0.1} />
                          <ReferenceArea y1={120} y2={180} fill="#ef4444" fillOpacity={0.15} />

                          {/* Warning Lines - Smart Positioning */}
                          <ReferenceLine y={40} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={2} label={{ value: '🚨 Severe Bradycardia (40)', position: getSmartLabelPosition(40, 'heartRate', 10), fill: '#ffffff', fontSize: 11, fontWeight: 'bold', style: { textShadow: '0 0 4px #000, 0 0 8px #ef4444, 1px 1px 2px #000' } }} />
                          <ReferenceLine y={60} stroke="#eab308" strokeDasharray="3 3" strokeWidth={2} label={{ value: '⚠ Bradycardia (60)', position: getSmartLabelPosition(60, 'heartRate', 10), fill: '#ffffff', fontSize: 11, fontWeight: 'bold', style: { textShadow: '0 0 4px #000, 0 0 8px #eab308, 1px 1px 2px #000' } }} />
                          <ReferenceLine y={80} stroke="#10b981" strokeDasharray="5 5" strokeWidth={3} label={{ value: '✓ Optimal (60-100)', position: getSmartLabelPosition(80, 'heartRate', 10), fill: '#ffffff', fontSize: 12, fontWeight: 'bold', style: { textShadow: '0 0 4px #000, 0 0 8px #10b981, 1px 1px 2px #000' } }} />
                          <ReferenceLine y={100} stroke="#eab308" strokeDasharray="3 3" strokeWidth={2} label={{ value: '⚠ Tachycardia (100)', position: getSmartLabelPosition(100, 'heartRate', 10), fill: '#ffffff', fontSize: 11, fontWeight: 'bold', style: { textShadow: '0 0 4px #000, 0 0 8px #eab308, 1px 1px 2px #000' } }} />
                          <ReferenceLine y={120} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={2} label={{ value: '🚨 Severe Tachycardia (120)', position: getSmartLabelPosition(120, 'heartRate', 10), fill: '#ffffff', fontSize: 11, fontWeight: 'bold', style: { textShadow: '0 0 4px #000, 0 0 8px #ef4444, 1px 1px 2px #000' } }} />
                        </>
                      )}
                      {selectedMetric === 'sugar' && (
                        <>
                          {/* Blood Sugar Zones - International Standards */}
                          <ReferenceArea y1={0} y2={54} fill="#ef4444" fillOpacity={0.15} />
                          <ReferenceArea y1={54} y2={70} fill="#eab308" fillOpacity={0.1} />
                          <ReferenceArea y1={70} y2={100} fill="#10b981" fillOpacity={0.1} />
                          <ReferenceArea y1={100} y2={125} fill="#eab308" fillOpacity={0.1} />
                          <ReferenceArea y1={126} y2={300} fill="#ef4444" fillOpacity={0.15} />

                          {/* Danger Lines - Smart Positioning */}
                          <ReferenceLine y={54} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={2} label={{ value: '🚨 Critical Low (54)', position: getSmartLabelPosition(54, 'bloodSugar', 10), fill: '#ffffff', fontSize: 11, fontWeight: 'bold', style: { textShadow: '0 0 4px #000, 0 0 8px #ef4444, 1px 1px 2px #000' } }} />
                          <ReferenceLine y={70} stroke="#eab308" strokeDasharray="3 3" strokeWidth={2} label={{ value: '⚠ Low (70)', position: getSmartLabelPosition(70, 'bloodSugar', 10), fill: '#ffffff', fontSize: 11, fontWeight: 'bold', style: { textShadow: '0 0 4px #000, 0 0 8px #eab308, 1px 1px 2px #000' } }} />
                          <ReferenceLine y={100} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} label={{ value: '✓ Normal Max (100)', position: getSmartLabelPosition(100, 'bloodSugar', 10), fill: '#ffffff', fontSize: 12, fontWeight: 'bold', style: { textShadow: '0 0 4px #000, 0 0 8px #10b981, 1px 1px 2px #000' } }} />
                          <ReferenceLine y={125} stroke="#eab308" strokeDasharray="3 3" strokeWidth={2} label={{ value: '⚠ Pre-diabetic (125)', position: getSmartLabelPosition(125, 'bloodSugar', 10), fill: '#ffffff', fontSize: 11, fontWeight: 'bold', style: { textShadow: '0 0 4px #000, 0 0 8px #eab308, 1px 1px 2px #000' } }} />
                          <ReferenceLine y={126} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={2} label={{ value: '🚨 Diabetic (126)', position: getSmartLabelPosition(126, 'bloodSugar', 10), fill: '#ffffff', fontSize: 11, fontWeight: 'bold', style: { textShadow: '0 0 4px #000, 0 0 8px #ef4444, 1px 1px 2px #000' } }} />
                        </>
                      )}
                      {selectedMetric === 'temp' && (
                        <>
                          {/* Temperature Zones - International Standards */}
                          <ReferenceArea y1={90} y2={95} fill="#ef4444" fillOpacity={0.15} />
                          <ReferenceArea y1={95} y2={97} fill="#eab308" fillOpacity={0.1} />
                          <ReferenceArea y1={97} y2={99.5} fill="#10b981" fillOpacity={0.1} />
                          <ReferenceArea y1={99.5} y2={100.4} fill="#eab308" fillOpacity={0.1} />
                          <ReferenceArea y1={100.4} y2={103} fill="#f97316" fillOpacity={0.12} />
                          <ReferenceArea y1={103} y2={108} fill="#ef4444" fillOpacity={0.15} />

                          {/* Warning Lines - Smart Positioning */}
                          <ReferenceLine y={95} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={2} label={{ value: '🚨 Hypothermia (95)', position: getSmartLabelPosition(95, 'temperature', 3), fill: '#ffffff', fontSize: 11, fontWeight: 'bold', style: { textShadow: '0 0 4px #000, 0 0 8px #ef4444, 1px 1px 2px #000' } }} />
                          <ReferenceLine y={97} stroke="#eab308" strokeDasharray="3 3" strokeWidth={2} label={{ value: '⚠ Low (97)', position: getSmartLabelPosition(97, 'temperature', 3), fill: '#ffffff', fontSize: 11, fontWeight: 'bold', style: { textShadow: '0 0 4px #000, 0 0 8px #eab308, 1px 1px 2px #000' } }} />
                          <ReferenceLine y={98.6} stroke="#10b981" strokeDasharray="5 5" strokeWidth={3} label={{ value: '✓ Normal (98.6°F)', position: getSmartLabelPosition(98.6, 'temperature', 3), fill: '#ffffff', fontSize: 12, fontWeight: 'bold', style: { textShadow: '0 0 4px #000, 0 0 8px #10b981, 1px 1px 2px #000' } }} />
                          <ReferenceLine y={99.5} stroke="#eab308" strokeDasharray="3 3" strokeWidth={2} label={{ value: '⚠ Elevated (99.5)', position: getSmartLabelPosition(99.5, 'temperature', 3), fill: '#ffffff', fontSize: 11, fontWeight: 'bold', style: { textShadow: '0 0 4px #000, 0 0 8px #eab308, 1px 1px 2px #000' } }} />
                          <ReferenceLine y={100.4} stroke="#f97316" strokeDasharray="3 3" strokeWidth={2} label={{ value: '🔥 Fever (100.4)', position: getSmartLabelPosition(100.4, 'temperature', 3), fill: '#ffffff', fontSize: 11, fontWeight: 'bold', style: { textShadow: '0 0 4px #000, 0 0 8px #f97316, 1px 1px 2px #000' } }} />
                          <ReferenceLine y={103} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={2} label={{ value: '🚨 High Fever (103)', position: getSmartLabelPosition(103, 'temperature', 3), fill: '#ffffff', fontSize: 11, fontWeight: 'bold', style: { textShadow: '0 0 4px #000, 0 0 8px #ef4444, 1px 1px 2px #000' } }} />
                        </>
                      )}
                      {selectedMetric === 'o2' && (
                        <>
                          <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={2} label={{ value: 'Danger Low (90%)', position: 'insideTopRight', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
                          <ReferenceLine y={92} stroke="#eab308" strokeDasharray="3 3" strokeWidth={2} label={{ value: 'Moderate Low (92%)', position: 'insideTopRight', fill: '#eab308', fontSize: 10, fontWeight: 'bold' }} />
                          <ReferenceLine y={95} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'Normal Min (95%)', position: 'insideTopRight', fill: '#10b981', fontSize: 11, fontWeight: 'bold' }} />
                        </>
                      )}
                      {selectedMetric === 'peakflow' && (
                        <>
                          {/* Peak Flow Zones - International Standards (Adult) */}
                          <ReferenceArea y1={0} y2={250} fill="#ef4444" fillOpacity={0.15} />
                          <ReferenceArea y1={250} y2={400} fill="#eab308" fillOpacity={0.1} />
                          <ReferenceArea y1={400} y2={850} fill="#10b981" fillOpacity={0.1} />

                          {/* Warning Lines - Smart Positioning */}
                          <ReferenceLine y={250} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={2} label={{ value: '🚨 Red Zone (<250) - Medical Alert', position: getSmartLabelPosition(250, 'peakFlow', 50), fill: '#ffffff', fontSize: 11, fontWeight: 'bold', style: { textShadow: '0 0 4px #000, 0 0 8px #ef4444, 1px 1px 2px #000' } }} />
                          <ReferenceLine y={400} stroke="#eab308" strokeDasharray="3 3" strokeWidth={2} label={{ value: '⚠ Yellow Zone (250-400) - Caution', position: getSmartLabelPosition(400, 'peakFlow', 50), fill: '#ffffff', fontSize: 11, fontWeight: 'bold', style: { textShadow: '0 0 4px #000, 0 0 8px #eab308, 1px 1px 2px #000' } }} />
                          <ReferenceLine y={480} stroke="#10b981" strokeDasharray="5 5" strokeWidth={3} label={{ value: '✓ Green Zone (>400) - Normal', position: getSmartLabelPosition(480, 'peakFlow', 50), fill: '#ffffff', fontSize: 12, fontWeight: 'bold', style: { textShadow: '0 0 4px #000, 0 0 8px #10b981, 1px 1px 2px #000' } }} />
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
                    <p>
                      {selectedMetric === 'hydration'
                        ? 'No water intake logged for this period. Use the floating water button to add entries!'
                        : 'No vitals data available for this period'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
              </div>
            </div>
          </div>

          {/* Recent Vitals Table - High-End Spacecraft Collapsible Design */}
          <div
            className="relative overflow-hidden rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
              border: '2px solid rgba(59, 130, 246, 0.4)',
              boxShadow: '0 0 40px rgba(59, 130, 246, 0.2), inset 0 0 60px rgba(59, 130, 246, 0.05)'
            }}
          >
            {/* Cockpit-Style Header Button */}
            <button
              onClick={() => setIsHistoricalReadingsExpanded(!isHistoricalReadingsExpanded)}
              className="w-full p-6 flex items-center justify-between group cursor-pointer transition-all duration-300 hover:bg-white/5"
              style={{
                borderBottom: isHistoricalReadingsExpanded ? '1px solid rgba(59, 130, 246, 0.3)' : 'none'
              }}
            >
              <div className="flex items-center gap-4">
                {/* Aircraft Panel Indicator Light */}
                <div className="relative">
                  <div
                    className="w-4 h-4 rounded-full animate-pulse"
                    style={{
                      background: 'radial-gradient(circle, rgba(34, 197, 94, 1) 0%, rgba(34, 197, 94, 0.4) 70%)',
                      boxShadow: '0 0 20px rgba(34, 197, 94, 0.8), inset 0 0 8px rgba(255, 255, 255, 0.3)'
                    }}
                  ></div>
                  <div
                    className="absolute top-0 left-0 w-4 h-4 rounded-full animate-ping"
                    style={{
                      background: 'rgba(34, 197, 94, 0.4)'
                    }}
                  ></div>
                </div>

                {/* Aviation-Style Label */}
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs font-mono tracking-widest"
                      style={{
                        color: '#22c55e',
                        textShadow: '0 0 10px rgba(34, 197, 94, 0.5)',
                        letterSpacing: '0.15em'
                      }}
                    >
                      SYS-DATA-LOG
                    </span>
                    <div
                      className="px-2 py-0.5 rounded text-xs font-mono"
                      style={{
                        background: 'rgba(59, 130, 246, 0.2)',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        color: '#60a5fa'
                      }}
                    >
                      {vitals.length} REC
                    </div>
                  </div>
                  <h2
                    className="text-2xl font-bold tracking-wide mt-1"
                    style={{
                      color: '#ffffff',
                      textShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
                      fontFamily: '"Orbitron", "Rajdhani", sans-serif'
                    }}
                  >
                    HISTORICAL FLIGHT DATA
                  </h2>
                </div>
              </div>

              {/* Chevron with Aerospace Styling */}
              <div className="flex items-center gap-3">
                <div
                  className="text-xs font-mono uppercase tracking-widest"
                  style={{
                    color: '#60a5fa',
                    textShadow: '0 0 8px rgba(59, 130, 246, 0.6)'
                  }}
                >
                  {isHistoricalReadingsExpanded ? 'COLLAPSE' : 'EXPAND'}
                </div>
                <div
                  className="p-2 rounded-lg transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.2))',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    boxShadow: isHistoricalReadingsExpanded
                      ? '0 0 20px rgba(59, 130, 246, 0.5)'
                      : '0 0 10px rgba(59, 130, 246, 0.3)',
                    transform: isHistoricalReadingsExpanded ? 'rotate(0deg)' : 'rotate(0deg)'
                  }}
                >
                  {isHistoricalReadingsExpanded ? (
                    <ChevronUp className="h-6 w-6 text-blue-400" />
                  ) : (
                    <ChevronDown className="h-6 w-6 text-blue-400" />
                  )}
                </div>
              </div>
            </button>

            {/* Collapsible Content with Smooth Animation */}
            <div
              style={{
                maxHeight: isHistoricalReadingsExpanded ? '2000px' : '0',
                opacity: isHistoricalReadingsExpanded ? 1 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-in-out'
              }}
            >
              <div className="p-6">
                {/* Scanning Line Effect */}
                {isHistoricalReadingsExpanded && (
                  <div
                    className="absolute top-0 left-0 w-full h-0.5 opacity-50"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.8), transparent)',
                      animation: 'scan 3s linear infinite'
                    }}
                  ></div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      {/* Category Header Row */}
                      <tr style={{ borderBottom: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <th className="text-center py-2 px-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: '#60a5fa', opacity: 0.7, borderRight: '1px solid rgba(59, 130, 246, 0.15)' }}>TIME</th>
                        <th colSpan={5} className="text-center py-2 px-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: '#60a5fa', opacity: 0.7, borderRight: '1px solid rgba(59, 130, 246, 0.15)' }}>VITAL SIGNS</th>
                        <th colSpan={2} className="text-center py-2 px-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: '#10b981', opacity: 0.7, borderRight: '1px solid rgba(16, 185, 129, 0.15)' }}>METABOLIC</th>
                        <th className="text-center py-2 px-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: '#22c55e', opacity: 0.7, borderRight: '1px solid rgba(34, 197, 94, 0.15)' }}>PULMONARY</th>
                        <th colSpan={5} className="text-center py-2 px-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: '#34d399', opacity: 0.7, borderRight: '1px solid rgba(52, 211, 153, 0.15)' }}>HRV</th>
                        <th colSpan={4} className="text-center py-2 px-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: '#fbbf24', opacity: 0.7, borderRight: '1px solid rgba(251, 191, 36, 0.15)' }}>CARDIAC</th>
                        <th colSpan={3} className="text-center py-2 px-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: '#a78bfa', opacity: 0.7, borderRight: '1px solid rgba(167, 139, 250, 0.15)' }}>EXERCISE</th>
                        <th colSpan={2} className="text-center py-2 px-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: '#06b6d4', opacity: 0.7, borderRight: '1px solid rgba(6, 182, 212, 0.15)' }}>ECG</th>
                        <th colSpan={4} className="text-center py-2 px-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: '#60a5fa', opacity: 0.7, borderRight: '1px solid rgba(59, 130, 246, 0.15)' }}>METADATA</th>
                        <th className="text-center py-2 px-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: '#60a5fa', opacity: 0.7 }}>⚙</th>
                      </tr>

                      {/* Column Headers */}
                      <tr className="border-b" style={{ borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                        {/* TIME */}
                        <th className="text-left py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#60a5fa', borderRight: '1px solid rgba(59, 130, 246, 0.1)' }}>Date</th>

                        {/* VITAL SIGNS - Blue Theme */}
                        <th className="text-left py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#60a5fa' }}>BP</th>
                        <th className="text-left py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#60a5fa' }}>HR</th>
                        <th className="text-left py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#60a5fa' }}>Temp</th>
                        <th className="text-left py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#60a5fa' }}>O₂</th>
                        <th className="text-left py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#60a5fa', borderRight: '1px solid rgba(59, 130, 246, 0.1)' }}>RR</th>

                        {/* METABOLIC - Green Theme */}
                        <th className="text-left py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#10b981' }}>Weight</th>
                        <th className="text-left py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#10b981', borderRight: '1px solid rgba(16, 185, 129, 0.1)' }}>Sugar</th>

                        {/* PULMONARY - Green Theme */}
                        <th className="text-left py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#22c55e', borderRight: '1px solid rgba(34, 197, 94, 0.1)' }}>Peak</th>

                        {/* HRV - Emerald Theme */}
                        <th className="text-left py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#34d399', textShadow: '0 0 8px rgba(52, 211, 153, 0.5)' }}>HRV</th>
                        <th className="text-left py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#34d399', textShadow: '0 0 8px rgba(52, 211, 153, 0.5)' }}>SDNN</th>
                        <th className="text-left py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#34d399', textShadow: '0 0 8px rgba(52, 211, 153, 0.5)' }}>RMSSD</th>
                        <th className="text-left py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#34d399', textShadow: '0 0 8px rgba(52, 211, 153, 0.5)' }}>pNN50</th>
                        <th className="text-left py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#34d399', textShadow: '0 0 8px rgba(52, 211, 153, 0.5)', borderRight: '1px solid rgba(52, 211, 153, 0.1)' }}>RR-I</th>

                        {/* CARDIAC - Gold Theme */}
                        <th className="text-left py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#fbbf24', textShadow: '0 0 8px rgba(251, 191, 36, 0.5)' }}>EF%</th>
                        <th className="text-left py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#fbbf24', textShadow: '0 0 8px rgba(251, 191, 36, 0.5)' }}>MAP</th>
                        <th className="text-left py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#fbbf24', textShadow: '0 0 8px rgba(251, 191, 36, 0.5)' }}>PP</th>
                        <th className="text-left py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#fbbf24', textShadow: '0 0 8px rgba(251, 191, 36, 0.5)', borderRight: '1px solid rgba(251, 191, 36, 0.1)' }}>BP-V</th>

                        {/* EXERCISE - Purple Theme */}
                        <th className="text-left py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#a78bfa', textShadow: '0 0 8px rgba(167, 139, 250, 0.5)' }}>VO₂</th>
                        <th className="text-left py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#a78bfa', textShadow: '0 0 8px rgba(167, 139, 250, 0.5)' }}>6MW</th>
                        <th className="text-left py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#a78bfa', textShadow: '0 0 8px rgba(167, 139, 250, 0.5)', borderRight: '1px solid rgba(167, 139, 250, 0.1)' }}>HRR</th>

                        {/* ECG - Cyan Theme */}
                        <th className="text-left py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#06b6d4', textShadow: '0 0 8px rgba(6, 182, 212, 0.5)' }}>ECG-V</th>
                        <th className="text-left py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#06b6d4', textShadow: '0 0 8px rgba(6, 182, 212, 0.5)', borderRight: '1px solid rgba(6, 182, 212, 0.1)' }}>ECG#</th>

                        {/* METADATA - Blue/Gray Theme */}
                        <th className="text-left py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#60a5fa' }}>H₂O</th>
                        <th className="text-left py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#60a5fa' }}>Source</th>
                        <th className="text-left py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#60a5fa' }}>Device</th>
                        <th className="text-left py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#60a5fa', borderRight: '1px solid rgba(59, 130, 246, 0.1)' }}>Notes</th>

                        {/* ACTIONS */}
                        <th className="text-center py-3 px-3 text-xs font-mono uppercase tracking-wider" style={{ color: '#60a5fa' }}>⚙</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // 🫀 CRITICAL: Show comprehensive vitals first (with BP, weight, O2, temp, etc.)
                        // Don't show heartbeat-only records that flood the table
                        const comprehensiveVitals = vitals.filter(v =>
                          v.bloodPressureSystolic || v.weight || v.oxygenSaturation ||
                          v.temperature || v.bloodSugar || v.sdnn || v.rmssd || v.pnn50
                        );

                        // Show last 10 comprehensive vitals, or all vitals if < 10 comprehensive
                        const displayVitals = comprehensiveVitals.length >= 10
                          ? comprehensiveVitals.slice(-10)
                          : vitals.slice(-10);

                        return displayVitals.reverse();
                      })().map((vital, index) => (
                        <tr
                          key={vital.id}
                          className="border-b transition-all duration-200 hover:bg-blue-500/10"
                          style={{
                            borderColor: 'rgba(59, 130, 246, 0.15)',
                            animation: isHistoricalReadingsExpanded ? `fadeInRow 0.3s ease-out ${index * 0.05}s both` : 'none'
                          }}
                        >
                          {/* TIME CATEGORY */}
                          <td className="py-3 px-3 text-sm font-mono" style={{ color: '#e2e8f0', borderRight: '1px solid rgba(59, 130, 246, 0.1)' }}>
                            {format(new Date(vital.timestamp), 'MMM d, h:mm a')}
                          </td>

                          {/* VITAL SIGNS CATEGORY */}
                          <td className="py-3 px-3 text-sm font-mono font-semibold" style={{ color: '#3b82f6' }}>
                            {vital.bloodPressureSystolic && vital.bloodPressureDiastolic
                              ? `${vital.bloodPressureSystolic}/${vital.bloodPressureDiastolic}`
                              : '--'}
                          </td>
                          <td className="py-3 px-3 text-sm font-mono font-semibold" style={{ color: '#ef4444' }}>
                            {vital.heartRate || '--'}
                          </td>
                          <td className="py-3 px-3 text-sm font-mono font-semibold" style={{ color: '#f97316' }}>
                            {vital.temperature ? `${vital.temperature.toFixed(1)}°F` : '--'}
                          </td>
                          <td className="py-3 px-3 text-sm font-mono font-semibold" style={{ color: '#06b6d4' }}>
                            {vital.oxygenSaturation ? `${vital.oxygenSaturation}%` : '--'}
                          </td>
                          <td className="py-3 px-3 text-sm font-mono font-semibold" style={{ color: '#8b5cf6', borderRight: '1px solid rgba(59, 130, 246, 0.1)' }}>
                            {vital.respiratoryRate || '--'}
                          </td>

                          {/* METABOLIC CATEGORY */}
                          <td className="py-3 px-3 text-sm font-mono font-semibold" style={{ color: '#10b981' }}>
                            {vital.weight || '--'}
                          </td>
                          <td className="py-3 px-3 text-sm font-mono font-semibold" style={{ color: '#f59e0b', borderRight: '1px solid rgba(16, 185, 129, 0.1)' }}>
                            {vital.bloodSugar || '--'}
                          </td>

                          {/* PULMONARY CATEGORY */}
                          <td className="py-3 px-3 text-sm font-mono font-semibold" style={{ color: '#22c55e', borderRight: '1px solid rgba(34, 197, 94, 0.1)' }}>
                            {vital.peakFlow ? `${vital.peakFlow}` : '--'}
                          </td>

                          {/* HRV CATEGORY - Emerald Theme with Medical Ranges */}
                          {/* HRV General */}
                          <td className="py-3 px-3">
                            {(() => {
                              const value = vital.heartRateVariability;
                              if (!value) return <span className="text-gray-600 font-mono text-sm">--</span>;
                              const prev = index < vitals.slice(-10).reverse().length - 1 ? vitals.slice(-10).reverse()[index + 1].heartRateVariability : null;
                              const trend = prev ? (value > prev ? '↗' : value < prev ? '↘' : '→') : '';
                              // HRV ranges: <20 poor, 20-50 fair, 50-100 good, >100 excellent
                              const color = value < 20 ? '#ef4444' : value < 50 ? '#f59e0b' : value < 100 ? '#34d399' : '#22c55e';
                              const alert = value < 20 ? '⚠️' : '';
                              return (
                                <div className="flex items-center gap-1.5">
                                  {alert && <span className="text-red-500 animate-pulse">{alert}</span>}
                                  <span className="font-mono font-bold text-sm" style={{ color, textShadow: `0 0 8px ${color}80` }}>
                                    {value.toFixed(1)}ms
                                  </span>
                                  {trend && <span className="text-xs opacity-70">{trend}</span>}
                                </div>
                              );
                            })()}
                          </td>

                          {/* SDNN */}
                          <td className="py-3 px-3">
                            {(() => {
                              const value = vital.sdnn;
                              if (!value) return <span className="text-gray-600 font-mono text-sm">--</span>;
                              const prev = index < vitals.slice(-10).reverse().length - 1 ? vitals.slice(-10).reverse()[index + 1].sdnn : null;
                              const trend = prev ? (value > prev ? '↗' : value < prev ? '↘' : '→') : '';
                              // SDNN ranges: <50 poor, 50-100 fair, >100 good
                              const color = value < 30 ? '#ef4444' : value < 50 ? '#f59e0b' : value < 70 ? '#fbbf24' : value < 100 ? '#34d399' : '#22c55e';
                              const alert = value < 30 ? '⚠️' : '';
                              return (
                                <div className="flex items-center gap-1.5">
                                  {alert && <span className="text-red-500 animate-pulse">{alert}</span>}
                                  <span className="font-mono font-bold text-sm" style={{ color, textShadow: `0 0 8px ${color}80` }}>
                                    {value.toFixed(1)}
                                  </span>
                                  {trend && <span className="text-xs opacity-70">{trend}</span>}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-3">
                            {(() => {
                              const value = vital.rmssd;
                              if (!value) return <span className="text-gray-600 font-mono text-sm">--</span>;
                              const prev = index < vitals.slice(-10).reverse().length - 1 ? vitals.slice(-10).reverse()[index + 1].rmssd : null;
                              const trend = prev ? (value > prev ? '↗' : value < prev ? '↘' : '→') : '';
                              // RMSSD ranges: <15 poor, 15-25 fair, 25-35 good, >35 excellent
                              const color = value < 15 ? '#ef4444' : value < 20 ? '#f59e0b' : value < 25 ? '#fbbf24' : value < 35 ? '#34d399' : '#22c55e';
                              const alert = value < 15 ? '⚠️' : '';
                              return (
                                <div className="flex items-center gap-1.5">
                                  {alert && <span className="text-red-500 animate-pulse">{alert}</span>}
                                  <span className="font-mono font-bold text-sm" style={{ color, textShadow: `0 0 8px ${color}80` }}>
                                    {value.toFixed(1)}
                                  </span>
                                  {trend && <span className="text-xs opacity-70">{trend}</span>}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-3">
                            {(() => {
                              const value = vital.pnn50;
                              if (!value) return <span className="text-gray-600 font-mono text-sm">--</span>;
                              const prev = index < vitals.slice(-10).reverse().length - 1 ? vitals.slice(-10).reverse()[index + 1].pnn50 : null;
                              const trend = prev ? (value > prev ? '↗' : value < prev ? '↘' : '→') : '';
                              // pNN50 ranges: <5% poor, 5-15% fair, 15-25% good, >25% excellent
                              const color = value < 5 ? '#ef4444' : value < 10 ? '#f59e0b' : value < 15 ? '#fbbf24' : value < 25 ? '#34d399' : '#22c55e';
                              const alert = value < 5 ? '⚠️' : '';
                              return (
                                <div className="flex items-center gap-1.5">
                                  {alert && <span className="text-red-500 animate-pulse">{alert}</span>}
                                  <span className="font-mono font-bold text-sm" style={{ color, textShadow: `0 0 8px ${color}80` }}>
                                    {value.toFixed(1)}%
                                  </span>
                                  {trend && <span className="text-xs opacity-70">{trend}</span>}
                                </div>
                              );
                            })()}
                          </td>

                          {/* RR Interval (last HRV metric) */}
                          <td className="py-3 px-3 text-sm font-mono font-semibold" style={{ color: '#06b6d4', borderRight: '1px solid rgba(52, 211, 153, 0.1)' }}>
                            {vital.heartRateVariability ? `${vital.heartRateVariability.toFixed(0)}ms` : '--'}
                          </td>

                          {/* CARDIAC CATEGORY - Gold Theme with Medical Ranges */}
                          <td className="py-3 px-3">
                            {(() => {
                              const value = vital.ejectionFraction;
                              if (!value) return <span className="text-gray-600 font-mono text-sm">--</span>;
                              const prev = index < vitals.slice(-10).reverse().length - 1 ? vitals.slice(-10).reverse()[index + 1].ejectionFraction : null;
                              const trend = prev ? (value > prev ? '↗' : value < prev ? '↘' : '→') : '';
                              // EF ranges: <40% severe, 40-50% moderate, 50-70% normal, >70% high
                              const color = value < 35 ? '#dc2626' : value < 40 ? '#ef4444' : value < 50 ? '#f59e0b' : value <= 70 ? '#22c55e' : '#fbbf24';
                              const alert = value < 40 ? '🚨' : value > 75 ? '⚠️' : '';
                              return (
                                <div className="flex items-center gap-1.5">
                                  {alert && <span className="animate-pulse">{alert}</span>}
                                  <span className="font-mono font-bold text-sm" style={{ color, textShadow: `0 0 10px ${color}80` }}>
                                    {value.toFixed(1)}%
                                  </span>
                                  {trend && <span className="text-xs opacity-70">{trend}</span>}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-3">
                            {(() => {
                              const value = vital.meanArterialPressure;
                              if (!value) return <span className="text-gray-600 font-mono text-sm">--</span>;
                              const prev = index < vitals.slice(-10).reverse().length - 1 ? vitals.slice(-10).reverse()[index + 1].meanArterialPressure : null;
                              const trend = prev ? (value > prev ? '↗' : value < prev ? '↘' : '→') : '';
                              // MAP ranges: <60 low, 60-70 borderline, 70-100 normal, >110 high
                              const color = value < 60 ? '#ef4444' : value < 70 ? '#f59e0b' : value <= 100 ? '#22c55e' : value <= 110 ? '#fbbf24' : '#ef4444';
                              const alert = value < 60 || value > 110 ? '⚠️' : '';
                              return (
                                <div className="flex items-center gap-1.5">
                                  {alert && <span className="text-orange-500 animate-pulse">{alert}</span>}
                                  <span className="font-mono font-bold text-sm" style={{ color, textShadow: `0 0 8px ${color}80` }}>
                                    {value.toFixed(0)}
                                  </span>
                                  {trend && <span className="text-xs opacity-70">{trend}</span>}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-3">
                            {(() => {
                              const value = vital.pulsePressure;
                              if (!value) return <span className="text-gray-600 font-mono text-sm">--</span>;
                              const prev = index < vitals.slice(-10).reverse().length - 1 ? vitals.slice(-10).reverse()[index + 1].pulsePressure : null;
                              const trend = prev ? (value > prev ? '↗' : value < prev ? '↘' : '→') : '';
                              // PP ranges: <30 low, 30-40 normal, 40-60 wide, >60 very wide
                              const color = value < 25 ? '#ef4444' : value < 30 ? '#f59e0b' : value <= 50 ? '#22c55e' : value <= 60 ? '#fbbf24' : '#ef4444';
                              const alert = value < 25 || value > 60 ? '⚠️' : '';
                              return (
                                <div className="flex items-center gap-1.5">
                                  {alert && <span className="text-orange-500 animate-pulse">{alert}</span>}
                                  <span className="font-mono font-bold text-sm" style={{ color, textShadow: `0 0 8px ${color}80` }}>
                                    {value.toFixed(0)}
                                  </span>
                                  {trend && <span className="text-xs opacity-70">{trend}</span>}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-3" style={{ borderRight: '1px solid rgba(251, 191, 36, 0.1)' }}>
                            {(() => {
                              const value = vital.bpVariability;
                              if (!value) return <span className="text-gray-600 font-mono text-sm">--</span>;
                              const prev = index < vitals.slice(-10).reverse().length - 1 ? vitals.slice(-10).reverse()[index + 1].bpVariability : null;
                              const trend = prev ? (value > prev ? '↗' : value < prev ? '↘' : '→') : '';
                              // BP Variability: <10 excellent, 10-15 good, 15-25 acceptable, >25 concerning
                              const color = value < 10 ? '#22c55e' : value < 15 ? '#34d399' : value < 25 ? '#fbbf24' : '#ef4444';
                              const alert = value > 25 ? '⚠️' : '';
                              return (
                                <div className="flex items-center gap-1.5">
                                  {alert && <span className="text-orange-500 animate-pulse">{alert}</span>}
                                  <span className="font-mono font-bold text-sm" style={{ color, textShadow: `0 0 8px ${color}80` }}>
                                    {value.toFixed(1)}
                                  </span>
                                  {trend && <span className="text-xs opacity-70">{trend}</span>}
                                </div>
                              );
                            })()}
                          </td>

                          {/* EXERCISE CATEGORY - Purple Theme with Medical Ranges */}
                          <td className="py-3 px-3">
                            {(() => {
                              const value = vital.vo2Max;
                              if (!value) return <span className="text-gray-600 font-mono text-sm">--</span>;
                              const prev = index < vitals.slice(-10).reverse().length - 1 ? vitals.slice(-10).reverse()[index + 1].vo2Max : null;
                              const trend = prev ? (value > prev ? '↗' : value < prev ? '↘' : '→') : '';
                              // VO2 Max: <20 poor, 20-30 fair, 30-40 good, >40 excellent
                              const color = value < 20 ? '#ef4444' : value < 25 ? '#f59e0b' : value < 30 ? '#fbbf24' : value < 40 ? '#a78bfa' : '#8b5cf6';
                              const alert = value < 20 ? '⚠️' : '';
                              return (
                                <div className="flex items-center gap-1.5">
                                  {alert && <span className="text-red-500 animate-pulse">{alert}</span>}
                                  <span className="font-mono font-bold text-sm" style={{ color, textShadow: `0 0 8px ${color}80` }}>
                                    {value.toFixed(1)}
                                  </span>
                                  {trend && <span className="text-xs opacity-70">{trend}</span>}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-3">
                            {(() => {
                              const value = vital.sixMinWalk;
                              if (!value) return <span className="text-gray-600 font-mono text-sm">--</span>;
                              const prev = index < vitals.slice(-10).reverse().length - 1 ? vitals.slice(-10).reverse()[index + 1].sixMinWalk : null;
                              const trend = prev ? (value > prev ? '↗' : value < prev ? '↘' : '→') : '';
                              // 6MW: <300m poor, 300-450m fair, 450-550m good, >550m excellent
                              const color = value < 300 ? '#ef4444' : value < 400 ? '#f59e0b' : value < 500 ? '#fbbf24' : value < 550 ? '#a78bfa' : '#8b5cf6';
                              const alert = value < 300 ? '⚠️' : '';
                              return (
                                <div className="flex items-center gap-1.5">
                                  {alert && <span className="text-red-500 animate-pulse">{alert}</span>}
                                  <span className="font-mono font-bold text-sm" style={{ color, textShadow: `0 0 8px ${color}80` }}>
                                    {value.toFixed(0)}m
                                  </span>
                                  {trend && <span className="text-xs opacity-70">{trend}</span>}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-3" style={{ borderRight: '1px solid rgba(167, 139, 250, 0.1)' }}>
                            {(() => {
                              const value = vital.hrRecovery;
                              if (!value) return <span className="text-gray-600 font-mono text-sm">--</span>;
                              const prev = index < vitals.slice(-10).reverse().length - 1 ? vitals.slice(-10).reverse()[index + 1].hrRecovery : null;
                              const trend = prev ? (value > prev ? '↗' : value < prev ? '↘' : '→') : '';
                              // HR Recovery: <12 poor, 12-20 fair, 20-25 good, >25 excellent
                              const color = value < 12 ? '#ef4444' : value < 15 ? '#f59e0b' : value < 20 ? '#fbbf24' : value < 25 ? '#a78bfa' : '#8b5cf6';
                              const alert = value < 12 ? '⚠️' : '';
                              return (
                                <div className="flex items-center gap-1.5">
                                  {alert && <span className="text-red-500 animate-pulse">{alert}</span>}
                                  <span className="font-mono font-bold text-sm" style={{ color, textShadow: `0 0 8px ${color}80` }}>
                                    {value.toFixed(0)}
                                  </span>
                                  {trend && <span className="text-xs opacity-70">{trend}</span>}
                                </div>
                              );
                            })()}
                          </td>

                          {/* ECG CATEGORY - Cyan Theme */}
                          {/* ECG Waveform Value */}
                          <td className="py-3 px-3 text-sm font-mono font-semibold" style={{ color: '#06b6d4' }}>
                            {(() => {
                              // Extract ECG value from notes field if present
                              const ecgMatch = vital.notes?.match(/ECG waveform value: ([-\d.]+)V/);
                              return ecgMatch ? `${parseFloat(ecgMatch[1]).toFixed(3)}V` : '--';
                            })()}
                          </td>

                          {/* ECG Sample Count */}
                          <td className="py-3 px-3 text-sm font-mono font-semibold" style={{ color: '#06b6d4', borderRight: '1px solid rgba(6, 182, 212, 0.1)' }}>
                            --
                          </td>

                          {/* METADATA CATEGORY - Blue Theme */}
                          {/* Hydration */}
                          <td className="py-3 px-3 text-sm font-mono font-semibold" style={{ color: '#3b82f6' }}>
                            {vital.hydrationStatus ? `${vital.hydrationStatus}%` : '--'}
                          </td>

                          {/* Source */}
                          <td className="py-3 px-3 text-sm font-mono" style={{ color: '#60a5fa' }}>
                            {(() => {
                              const source = vital.source || 'manual';
                              // Unified colors matching gauge display: device=#22c55e, import=#fbbf24, manual=#60a5fa
                              const badgeColor = source === 'device' ? '#22c55e' : source === 'import' ? '#fbbf24' : '#60a5fa';
                              return (
                                <span className="px-2 py-1 rounded text-xs font-semibold" style={{
                                  background: `${badgeColor}20`,
                                  color: badgeColor,
                                  border: `1px solid ${badgeColor}50`
                                }}>
                                  {source.toUpperCase()}
                                </span>
                              );
                            })()}
                          </td>

                          {/* Device ID */}
                          <td className="py-3 px-3 text-sm font-mono" style={{ color: '#60a5fa' }}>
                            {(() => {
                              const deviceId = vital.deviceId;
                              if (!deviceId) return <span className="text-gray-600">--</span>;
                              // Shorten device IDs for display
                              if (deviceId.includes('polar')) return <span className="text-cyan-400">Polar H10</span>;
                              if (deviceId.includes('samsung')) return <span className="text-purple-400">Samsung</span>;
                              if (deviceId.includes('strava')) return <span className="text-orange-400">Strava</span>;
                              return <span className="text-xs">{deviceId.substring(0, 12)}...</span>;
                            })()}
                          </td>

                          {/* Notes */}
                          <td className="py-3 px-3 text-sm" style={{ color: '#cbd5e1', borderRight: '1px solid rgba(59, 130, 246, 0.1)' }}>
                            {vital.notes || '--'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleDeleteVitalReading(vital.id, vital.timestamp)}
                              className="p-2 rounded-lg transition-all duration-200"
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#ef4444'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                e.currentTarget.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.4)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                              title="Delete reading"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {vitals.length === 0 && (
                    <p
                      className="text-center py-12 font-mono uppercase tracking-widest"
                      style={{
                        color: '#60a5fa',
                        textShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
                      }}
                    >
                      NO DATA RECORDS AVAILABLE
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Add scanning animation keyframes */}
          <style>
            {`
              @keyframes scan {
                0% { top: 0; }
                100% { top: 100%; }
              }
              @keyframes fadeInRow {
                from {
                  opacity: 0;
                  transform: translateX(-20px);
                }
                to {
                  opacity: 1;
                  transform: translateX(0);
                }
              }
            `}
          </style>

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

                        let firstWeightKg = (patientData && patientData.weightUnit === 'kg') ? firstWeight : firstWeight * 0.453592;
                        let lastWeightKg = (patientData && patientData.weightUnit === 'kg') ? lastWeight : lastWeight * 0.453592;

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
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-6">
                <div className="p-3 rounded-xl" style={{
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

                <div className="p-3 rounded-xl" style={{
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

                <div className="p-3 rounded-xl" style={{
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

                <div className="p-3 rounded-xl" style={{
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(147, 51, 234, 0.1))',
                  border: '1px solid rgba(168, 85, 247, 0.2)'
                }}>
                  <p className="text-xs text-purple-300 font-semibold mb-1">PERIOD READINGS</p>
                  <p className="text-3xl font-bold text-white">
                    {filteredGlucoseVitals.length}
                  </p>
                </div>

                <div className="p-3 rounded-xl" style={{
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
                <div className="p-3 rounded-xl" style={{
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

          {/* Reorganized to match visual layout on vitals page */}
          <div className="space-y-6">
            {/* Top Row - Primary Vitals (matches page layout) */}
            <div>
              <h3 className="font-bold text-base mb-3" style={{ color: 'var(--accent)' }}>📊 Primary Vitals</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>Blood Pressure</label>
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
                </div>

                <Input
                  label="Heart Rate (bpm)"
                  type="number"
                  placeholder="60-100"
                  icon={<Heart className="h-5 w-5" />}
                  {...register('heartRate', { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Second Row - Respiratory (matches page layout) */}
            <div>
              <h3 className="font-bold text-base mb-3" style={{ color: 'var(--accent)' }}>🫁 Respiratory Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="O₂ Saturation (%)"
                  type="number"
                  placeholder="95-100"
                  icon={<Wind className="h-5 w-5" />}
                  {...register('oxygenSaturation', { valueAsNumber: true })}
                />

                <Input
                  label="Respiratory Rate (/min)"
                  type="number"
                  placeholder="12-20"
                  icon={<Pulse className="h-5 w-5" />}
                  {...register('respiratoryRate', { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Third Row - Temperature & Blood Sugar (matches page layout) */}
            <div>
              <h3 className="font-bold text-base mb-3" style={{ color: 'var(--accent)' }}>🌡️ Metabolic Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Temperature (°F)"
                  type="number"
                  step="0.1"
                  placeholder="98.6"
                  icon={<Thermometer className="h-5 w-5" />}
                  {...register('temperature', { valueAsNumber: true })}
                />

                <Input
                  label="Blood Sugar (mg/dL)"
                  type="number"
                  placeholder="70-100"
                  icon={<Droplet className="h-5 w-5" />}
                  {...register('bloodSugar', { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Hydration, Weight, Peak Flow (matches page layout) */}
            <div>
              <h3 className="font-bold text-base mb-3" style={{ color: 'var(--accent)' }}>⚖️ Body Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Hydration Status (%)"
                  type="number"
                  placeholder="0-100"
                  icon={<Droplet className="h-5 w-5" />}
                  {...register('hydrationStatus', { valueAsNumber: true })}
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

              <div className="mt-4">
                <Input
                  label="Peak Flow (L/min)"
                  type="number"
                  placeholder="300-700"
                  icon={<Wind className="h-5 w-5" />}
                  {...register('peakFlow', { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>

          {/* Advanced Cardiac Metrics Section */}
          <div className="p-4 rounded-lg" style={{
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1), rgba(251, 191, 36, 0.1))',
            border: '2px solid rgba(212, 175, 55, 0.3)'
          }}>
            <div className="flex items-center gap-3 mb-4">
              <Heart className="h-5 w-5 text-yellow-400" />
              <h3 className="font-bold text-yellow-400">⭐ Advanced Cardiac Metrics</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* HRV Metrics Column */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-emerald-400">HRV Metrics (Heart Rate Variability)</h4>

                <Input
                  label="SDNN (ms)"
                  type="number"
                  placeholder="50-100"
                  icon={<Activity className="h-5 w-5" />}
                  {...register('sdnn', { valueAsNumber: true })}
                />

                <Input
                  label="RMSSD (ms)"
                  type="number"
                  placeholder="20-50"
                  icon={<Activity className="h-5 w-5" />}
                  {...register('rmssd', { valueAsNumber: true })}
                />

                <Input
                  label="pNN50 (%)"
                  type="number"
                  placeholder="10-40"
                  icon={<Activity className="h-5 w-5" />}
                  {...register('pnn50', { valueAsNumber: true })}
                />

                <h4 className="font-semibold text-sm text-purple-400 mt-6">Exercise Capacity</h4>

                <Input
                  label="VO₂ Max (mL/kg/min)"
                  type="number"
                  placeholder="25-35"
                  icon={<TrendingUp className="h-5 w-5" />}
                  {...register('vo2Max', { valueAsNumber: true })}
                />

                <Input
                  label="6-Min Walk (meters)"
                  type="number"
                  placeholder="400-700"
                  icon={<Activity className="h-5 w-5" />}
                  {...register('sixMinWalk', { valueAsNumber: true })}
                />

                <Input
                  label="HR Recovery (bpm/min)"
                  type="number"
                  placeholder="12-25"
                  icon={<Heart className="h-5 w-5" />}
                  {...register('hrRecovery', { valueAsNumber: true })}
                />
              </div>

              {/* Cardiac Function Column */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-amber-400">Cardiac Function</h4>

                <Input
                  label="Ejection Fraction (%)"
                  type="number"
                  placeholder="50-70"
                  icon={<Heart className="h-5 w-5" />}
                  {...register('ejectionFraction', { valueAsNumber: true })}
                />

                <Input
                  label="MAP (mmHg)"
                  type="number"
                  placeholder="70-100"
                  icon={<Activity className="h-5 w-5" />}
                  {...register('meanArterialPressure', { valueAsNumber: true })}
                />

                <Input
                  label="Pulse Pressure (mmHg)"
                  type="number"
                  placeholder="30-50"
                  icon={<Activity className="h-5 w-5" />}
                  {...register('pulsePressure', { valueAsNumber: true })}
                />

                <Input
                  label="BP Variability (SD)"
                  type="number"
                  step="0.1"
                  placeholder="< 25"
                  icon={<BarChart3 className="h-5 w-5" />}
                  {...register('bpVariability', { valueAsNumber: true })}
                />
              </div>
            </div>

            <p className="text-xs mt-4" style={{ color: 'var(--muted)' }}>
              💡 Tip: These advanced metrics are typically obtained from physician testing (echocardiograms, stress tests, HRV monitors, etc.)
            </p>
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

      {/* ECG/EKG Live Data Modal - Enhanced with Full Cardiac Analysis */}
      {showECGModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setShowECGModal(false)}
        >
          <div className="max-w-5xl w-full my-8" onClick={(e) => e.stopPropagation()}>
            <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border-2 border-red-500/30 shadow-2xl shadow-red-500/20">
              {/* Close Button - Enhanced visibility */}
              <button
                onClick={() => setShowECGModal(false)}
                className="absolute top-4 right-4 z-10 p-3 rounded-lg bg-red-500/80 hover:bg-red-600 transition-all border-2 border-white/30 shadow-lg shadow-red-500/50"
                title="Close ECG Monitor"
              >
                <X className="h-6 w-6 text-white" />
              </button>

              {/* Modal Header */}
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                    <Activity className="h-8 w-8 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      🫀 Life-Critical Cardiac Monitoring
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">
                      Real-time ECG waveform, HRV metrics, arrhythmia detection, and ST segment analysis
                    </p>
                  </div>
                </div>
              </div>

              {/* Live Connection Status & Streaming Controls */}
              <div className="px-6 py-4 space-y-4">
                <LiveVitalsDisplay />

                {/* Streaming Control Panel */}
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/30 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-blue-400">Polar H10 Live Streaming</h4>
                      <p className="text-xs text-gray-400 mt-1">
                        Stream ECG directly from your Polar H10 via Bluetooth
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {streamingStatus === 'streaming' && (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                          <span className="text-xs text-green-400 font-bold">LIVE</span>
                        </div>
                      )}
                      {!isStreaming ? (
                        <button
                          onClick={handleStartECGStream}
                          disabled={streamingStatus === 'connecting'}
                          className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          <Activity className="h-4 w-4" />
                          {streamingStatus === 'connecting' ? 'Connecting...' : 'Start Live Stream'}
                        </button>
                      ) : (
                        <button
                          onClick={handleStopECGStream}
                          className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-all flex items-center gap-2"
                        >
                          <X className="h-4 w-4" />
                          Stop Stream
                        </button>
                      )}
                    </div>
                  </div>

                  {streamError && (
                    <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                      <p className="text-xs text-red-400">❌ {streamError}</p>
                    </div>
                  )}

                  {/* File Upload Zone */}
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-xs text-gray-400 mb-2">Or import ECG file from third-party app:</p>
                    <div
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (file) handleECGFileUpload(file);
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      className="border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-lg p-6 text-center cursor-pointer transition-all"
                    >
                      <input
                        type="file"
                        id="ecgFileInput"
                        accept=".hrv,.csv,.txt"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleECGFileUpload(file);
                        }}
                        className="hidden"
                      />
                      <label htmlFor="ecgFileInput" className="cursor-pointer">
                        {uploadingFile ? (
                          <div className="text-blue-400">
                            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                            <p className="text-sm font-bold">Uploading...</p>
                          </div>
                        ) : (
                          <>
                            <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm font-bold text-gray-300">Drop ECG file here or click to browse</p>
                            <p className="text-xs text-gray-500 mt-1">Supports .HRV, .CSV, .TXT files</p>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* ECG Recording Controls for Cardiologist */}
              <div className="px-6 py-4">
                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border-2 border-purple-500/30 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isRecording ? 'bg-red-500/30 animate-pulse' : 'bg-purple-500/20'} border ${isRecording ? 'border-red-500/50' : 'border-purple-500/30'}`}>
                        <Activity className={`h-5 w-5 ${isRecording ? 'text-red-400' : 'text-purple-400'}`} />
                      </div>
                      <div>
                        <h3 className="text-md font-bold text-purple-400">
                          {isRecording ? '🔴 RECORDING' : '📊 Cardiologist Export'}
                        </h3>
                        <p className="text-xs text-gray-400">
                          {isRecording
                            ? `Recording ECG + HRV metrics • ${recordedEcgData.length} samples captured`
                            : 'Record ECG waveform and HRV metrics for medical review'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isRecording ? (
                        <button
                          onClick={startRecording}
                          disabled={ecgBuffer.length === 0}
                          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-red-400 font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          START RECORDING
                        </button>
                      ) : (
                        <button
                          onClick={stopRecording}
                          className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 rounded-lg text-yellow-400 font-bold text-sm transition-all flex items-center gap-2"
                        >
                          <div className="w-3 h-3 bg-yellow-500"></div>
                          STOP RECORDING
                        </button>
                      )}

                      {recordedEcgData.length > 0 && !isRecording && (
                        <button
                          onClick={exportRecordingForCardiologist}
                          className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded-lg text-green-400 font-bold text-sm transition-all flex items-center gap-2"
                        >
                          📥 EXPORT FOR DOCTOR
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ECG Waveform Visualization - Real-time from Polar H10 */}
              <div className="px-6 py-4">
                <div className="bg-black/40 rounded-lg border border-red-500/20 p-4">
                  {ecgBuffer.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="mb-2 text-xs text-yellow-400 font-bold">
                        ⚠️ Waiting for ECG data...
                      </div>
                      <p className="text-sm text-gray-400">Connect Polar H10 and start streaming to see real-time ECG waveform</p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-2 text-xs text-green-400 text-center font-bold">
                        ✅ LIVE: Displaying real-time ECG from Polar H10 ({ecgBuffer.length} samples)
                      </div>
                      <ECGWaveformChart ecgData={ecgBuffer} samplingRate={130} showRWaveMarkers={true} showGridlines={true} />
                    </>
                  )}
                </div>
              </div>

              {/* HRV Metrics Panel - Real-time data */}
              <div className="px-6 py-4">
                <div className="bg-black/40 rounded-lg border border-purple-500/20 p-4">
                  {sdnn || rmssd || pnn50 ? (
                    <div className="mb-2 text-xs text-green-400 text-center font-bold">
                      ✅ LIVE: Real-time HRV from Polar H10 (SDNN: {sdnn?.toFixed(1) || '--'}ms, RMSSD: {rmssd?.toFixed(1) || '--'}ms, pNN50: {pnn50?.toFixed(1) || '--'}%)
                    </div>
                  ) : (
                    <div className="mb-2 text-xs text-yellow-400 text-center font-bold">
                      ⚠️ Waiting for HRV data... (Connect Polar H10 and wait ~30 seconds for metrics)
                    </div>
                  )}
                  <HRVMetricsPanel
                    sdnn={sdnn}
                    rmssd={rmssd}
                    pnn50={pnn50}
                  />
                </div>
              </div>

              {/* ECG Analysis Panel - Real-time analysis */}
              <div className="px-6 py-4">
                <div className="bg-black/40 rounded-lg border border-blue-500/20 p-4">
                  {ecgBuffer.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="mb-2 text-xs text-yellow-400 font-bold">
                        ⚠️ Waiting for ECG data for analysis...
                      </div>
                      <p className="text-sm text-gray-400">Connect Polar H10 to see real-time cardiac analysis</p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-2 text-xs text-green-400 text-center font-bold">
                        ✅ LIVE: Analyzing real-time ECG from Polar H10
                      </div>
                      <ECGAnalysisPanel ecgData={ecgBuffer} samplingRate={130} autoAnalyze={true} />
                    </>
                  )}
                </div>
              </div>

              {/* Connection Instructions */}
              <div className="px-6 pb-6">
                <div className="p-4 bg-gradient-to-r from-red-500/10 to-purple-500/10 rounded-lg border border-red-500/30">
                  <div className="flex items-start gap-3">
                    <Activity className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-red-400 mb-2">
                        To Start Life-Critical Monitoring:
                      </h4>
                      <ol className="text-xs text-gray-300 space-y-1 list-decimal list-inside">
                        <li>Put on your Polar H10 chest strap (wet the electrodes first)</li>
                        <li>Click "Connect to Polar H10 (Real Heart Rate)" button above</li>
                        <li>Select your Polar H10 device from the browser's Bluetooth picker</li>
                        <li>Watch real-time ECG waveform, HRV metrics, and cardiac analysis appear automatically</li>
                      </ol>
                      <p className="text-xs text-gray-400 mt-3 italic">
                        💡 All data is automatically saved to database and broadcast to all connected displays via WebSocket
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <p className="text-xs text-gray-400 text-center">
                    Don't have a Polar H10? Connect via{' '}
                    <button
                      onClick={() => {
                        setShowECGModal(false);
                        navigate('/devices');
                      }}
                      className="text-red-400 hover:text-red-300 underline font-semibold"
                    >
                      My Devices
                    </button>
                    {' '}or use Samsung Galaxy Watch 8 for heart rate monitoring
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Treadmill Test Entry Modal */}
      <TreadmillDataEntry
        isOpen={showTreadmillModal}
        onClose={() => setShowTreadmillModal(false)}
      />

      {/* Spirometry Test Entry Modal */}
      <SpirometryDataEntry
        isOpen={showSpirometryModal}
        onClose={() => setShowSpirometryModal(false)}
      />

      {/* ECG Replay Modal - Compare Filtered vs Raw */}
      {showReplayModal && replayData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-7xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl shadow-2xl border-2 border-blue-500/30">
            {/* Close Button */}
            <button
              onClick={() => setShowReplayModal(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-red-500/80 hover:bg-red-600 transition-all border-2 border-white/30"
            >
              <X className="h-5 w-5 text-white" />
            </button>

            {/* Header */}
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Activity className="h-7 w-7 text-blue-400" />
                ECG Replay - Filtering Comparison
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Last 30 seconds • {replayData.raw.length} samples @ 130 Hz • Compare raw vs filtered waveforms
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Raw ECG */}
              <div className="bg-black/40 rounded-lg border-2 border-yellow-500/30 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
                    <Activity className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-yellow-400">RAW ECG Signal (Unfiltered)</h3>
                    <p className="text-xs text-gray-400">Original data from Polar H10 with all noise and artifacts</p>
                  </div>
                </div>
                <ECGWaveformChart
                  ecgData={replayData.raw}
                  samplingRate={130}
                  showRWaveMarkers={true}
                  showGridlines={true}
                  width={1200}
                  height={300}
                />
              </div>

              {/* Filtered ECG */}
              <div className="bg-black/40 rounded-lg border-2 border-green-500/30 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-green-500/20 border border-green-500/30">
                    <Filter className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-green-400">FILTERED ECG Signal (Cleaned)</h3>
                    <p className="text-xs text-gray-400">
                      Noise removed: Baseline wander, 60Hz powerline, spike artifacts, muscle noise
                    </p>
                  </div>
                </div>
                <ECGWaveformChart
                  ecgData={replayData.filtered}
                  samplingRate={130}
                  showRWaveMarkers={true}
                  showGridlines={true}
                  width={1200}
                  height={300}
                />
              </div>

              {/* Signal Quality Info */}
              <div className="bg-blue-500/10 rounded-lg border border-blue-500/30 p-4">
                <div className="flex items-center gap-2 text-sm text-blue-300">
                  <Activity className="h-4 w-4" />
                  <strong>Notice:</strong> The filtered signal preserves QRS complexes (sharp cardiac spikes) while removing background noise for easier medical interpretation.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
