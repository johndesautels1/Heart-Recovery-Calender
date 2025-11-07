// Vitals Page - Tracks heart rate, blood pressure, hydration, and personalized targets
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard, Button, Modal, Input } from '../components/ui';
import { WaterButton } from '../components/WaterButton';
import { HeartFrame } from '../components/vitals/HeartFrame';
import { CircularGauge } from '../components/vitals/CircularGauge';
import { TimeThrottleLever } from '../components/vitals/TimeThrottleLever';
import { LuxuryVitalGauge } from '../components/vitals/LuxuryVitalGauge';
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
import { VitalsSample, CreateVitalsInput, Patient, HydrationLog } from '../types';
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
  respiratoryRate: z.number().optional(),
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
  const [vitals, setVitals] = useState<VitalsSample[]>([]);
  const [latestVitals, setLatestVitals] = useState<VitalsSample | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'bp' | 'hr' | 'weight' | 'sugar' | 'temp' | 'hydration' | 'o2' | 'peakflow' | 'map' | 'bpvariability'>('bp');
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
  const [activeTab, setActiveTab] = useState<'overview' | 'weight' | 'glucose' | 'pulse' | 'medical'>('overview');

  // Time period selections for Weight and Glucose journals
  const [weightTimePeriod, setWeightTimePeriod] = useState<'7d' | '30d' | 'surgery'>('7d');
  const [glucoseTimePeriod, setGlucoseTimePeriod] = useState<'7d' | '30d' | 'surgery'>('7d');
  const [pulseTimePeriod, setPulseTimePeriod] = useState<'7d' | '30d' | 'surgery'>('7d');

  // UNIFIED: Global time view for ALL charts
  const [globalTimeView, setGlobalTimeView] = useState<'7d' | '30d' | '90d' | 'surgery'>('surgery');
  const [throttleTargetDate, setThrottleTargetDate] = useState<Date | null>(null);

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
    let target = 64; // Base target in ounces

    // 1. WEIGHT-BASED CALCULATION (most important factor)
    const weightLbs = patient.currentWeight || patient.startingWeight;
    if (weightLbs) {
      // Convert kg to lbs if needed
      const weight = patient.weightUnit === 'kg' ? weightLbs * 2.20462 : weightLbs;
      // Base formula: 0.5 oz per pound of body weight
      target = weight * 0.5;
      console.log(`[HYDRATION CALC] Weight: ${weight} lbs → Base target: ${target} oz`);
    }

    // 2. GENDER ADJUSTMENT
    if (patient.gender === 'male') {
      target *= 1.1; // Men need ~10% more
      console.log(`[HYDRATION CALC] Gender (male) → +10%: ${target} oz`);
    }

    // 3. AGE ADJUSTMENT
    if (patient.age && patient.age >= 65) {
      // Same amount but will flag for reminders (no calculation change)
      console.log(`[HYDRATION CALC] Age 65+ → monitoring needed`);
    }

    // 4. EJECTION FRACTION (CRITICAL for cardiac patients!)
    // EF < 40% = Reduced (HFrEF) - STRICT fluid restriction
    // EF 40-49% = Mid-range (HFmrEF) - Moderate restriction
    // EF ≥ 50% = Preserved (HFpEF) - Normal hydration
    if (patient.ejectionFraction !== undefined && patient.ejectionFraction !== null) {
      const ef = patient.ejectionFraction;

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
    const hasHeartFailure = patient.heartConditions?.some(condition =>
      condition.toLowerCase().includes('heart failure') ||
      condition.toLowerCase().includes('chf') ||
      condition.toLowerCase().includes('congestive')
    );

    if (hasHeartFailure && !patient.ejectionFraction) {
      // CHF but no EF data - use conservative restriction
      target = Math.min(target, 64);
      console.log(`[HYDRATION CALC] ⚠️  HEART FAILURE (no EF data) → Capped at 64 oz`);
    }

    // 6. MEDICATIONS CHECK - Diuretics increase fluid needs!
    // Check medicationsAffectingHR field (may contain diuretic info)
    const hasDiuretics = patient.medicationsAffectingHR?.some(med =>
      med.toLowerCase().includes('lasix') ||
      med.toLowerCase().includes('furosemide') ||
      med.toLowerCase().includes('diuretic') ||
      med.toLowerCase().includes('bumetanide') ||
      med.toLowerCase().includes('torsemide') ||
      med.toLowerCase().includes('hydrochlorothiazide') ||
      med.toLowerCase().includes('hctz')
    );

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
        const response = await api.getHawkAlerts();
        setHawkAlerts(response.alerts || []);
      } catch (error) {
        console.error('Failed to load Hawk Alerts:', error);
      }
    };

    loadHawkAlerts();
  }, [vitals]); // Reload when vitals change

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

  // Use hydration-specific chart data when hydration metric is selected
  const activeChartData = selectedMetric === 'hydration' ? hydrationChartData : chartData;

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
  const sdnn = null;
  const rmssd = null;
  const pnn50 = null;
  const todayDate = format(new Date(), 'yyyy-MM-dd');
  const todayHydration = hydrationLogs.find(log => log.date === todayDate);
  const hydrationTarget = todayHydration?.targetOunces || calculatePersonalizedHydrationTarget();
  const hydrationActual = todayHydration?.totalOunces || 0;
  const restingHR = vitals.length > 0 ? Math.min(...vitals.filter(v => v.heartRate).map(v => v.heartRate!)) : null;
  const avgHR = vitals.length > 0 ? Math.round(vitals.filter(v => v.heartRate).map(v => v.heartRate!).reduce((a, b) => a + b, 0) / vitals.filter(v => v.heartRate).length) : null;
  const vo2Max = null;
  const sixMinWalk = null;
  const mets = null;
  const maxHR = null;
  const hrRecovery = null;
  const ejectionFraction = patientData?.ejectionFraction || null;

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
  const filteredForLuxury = vitals.filter(luxuryFilter);

  // Calculate MOST RECENT within the time period (not absolute latest)
  const bpVitalsForRecent = filteredForLuxury.filter(v => v.bloodPressureSystolic && v.bloodPressureDiastolic)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const recentBP = bpVitalsForRecent.length > 0
    ? `${bpVitalsForRecent[0].bloodPressureSystolic}/${bpVitalsForRecent[0].bloodPressureDiastolic}`
    : null;

  const hrVitalsForRecent = filteredForLuxury.filter(v => v.heartRate)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const recentHR = hrVitalsForRecent.length > 0 ? hrVitalsForRecent[0].heartRate! : null;

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
        {/* Cockpit Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Vitals Command Center - A380 Cockpit</h1>
            <p className="text-gray-400">Comprehensive cardiac monitoring and analytics</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="group">
            <Plus className="h-5 w-5 mr-2" />
            Record Vitals
          </Button>
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
                showRestingToggle={true}
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
            </div>
            <div style={{ marginLeft: '156px', marginTop: '4px' }}>
              <LuxuryVitalGauge
                label="Heart Rate"
                recentValue={recentHR}
                averageValue={avgHeartRate}
                restingValue={restingHeartRate}
                showRestingToggle={true}
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
            </div>
          </div>

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
            <div className="flex justify-center items-center">
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

              {/* Blood Pressure Chart */}
              <div className="glass-card p-6 rounded-2xl" style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))',
                border: '2px solid rgba(59, 130, 246, 0.4)',
                boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)'
              }}>
                <h3 className="text-lg font-bold text-blue-400 mb-4">Blood Pressure Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#3b82f6" domain={[0, 200]} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                    <Legend />
                    {surgeryDate && (
                      <ReferenceLine x={format(new Date(surgeryDate), 'MMM dd, yyyy')} stroke="#fbbf24" strokeWidth={2} label="Day 0" />
                    )}
                    <Area type="monotone" dataKey="systolic" stroke="#3b82f6" fill="url(#colorSystolic)" name="Systolic" />
                    <Area type="monotone" dataKey="diastolic" stroke="#60a5fa" fill="url(#colorDiastolic)" name="Diastolic" />
                    <defs>
                      <linearGradient id="colorSystolic" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorDiastolic" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Heart Rate / Pulse Chart */}
              <div className="glass-card p-6 rounded-2xl" style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))',
                border: '2px solid rgba(239, 68, 68, 0.4)',
                boxShadow: '0 0 30px rgba(239, 68, 68, 0.3)'
              }}>
                <h3 className="text-lg font-bold text-red-400 mb-4">Heart Rate / Pulse</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#ef4444" domain={[40, 180]} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                    <Legend />
                    {surgeryDate && (
                      <ReferenceLine x={format(new Date(surgeryDate), 'MMM dd, yyyy')} stroke="#fbbf24" strokeWidth={2} label="Day 0" />
                    )}
                    <Line type="monotone" dataKey="heartRate" stroke="#ef4444" strokeWidth={2} name="Heart Rate (bpm)" />
                    <defs>
                      <linearGradient id="colorHeartRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Oxygen Saturation Chart */}
              <div className="glass-card p-6 rounded-2xl" style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))',
                border: '2px solid rgba(6, 182, 212, 0.4)',
                boxShadow: '0 0 30px rgba(6, 182, 212, 0.3)'
              }}>
                <h3 className="text-lg font-bold text-cyan-400 mb-4">Oxygen Saturation (SpO₂)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#06b6d4" domain={[85, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                    <Legend />
                    <Line type="monotone" dataKey="o2" stroke="#06b6d4" strokeWidth={2} name="O₂ Sat (%)" />
                    <defs>
                      <linearGradient id="colorO2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Weight Chart */}
              <div className="glass-card p-6 rounded-2xl" style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))',
                border: '2px solid rgba(16, 185, 129, 0.4)',
                boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)'
              }}>
                <h3 className="text-lg font-bold text-emerald-400 mb-4">Weight Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#10b981" />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                    <Legend />
                    <Area type="monotone" dataKey="weight" stroke="#10b981" fill="url(#colorWeight)" name="Weight (lbs)" />
                    <defs>
                      <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right Side - Empty for now */}
            <div className="flex flex-col gap-6 justify-center items-center">
            </div>
          </div>
        </div>

        {/* Lower Level - Advanced Analytics */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-emerald-400 mb-6 flex items-center gap-3">
            <Zap className="h-6 w-6" />
            Lower Deck - Advanced Analytics
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left - Performance Metrics */}
            <div className="glass-card p-6 rounded-2xl" style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(99, 102, 241, 0.15))',
              border: '2px solid rgba(139, 92, 246, 0.4)'
            }}>
              <h3 className="text-lg font-bold text-purple-400 mb-4">Performance Metrics</h3>
              <div className="grid grid-cols-2 gap-4">
                <CircularGauge value={vo2Max} label="VO₂ Max" unit="mL/kg/min" min={15} max={60} targetMin={25} targetMax={35} size="small" style="modern" color="#a855f7" />
                <CircularGauge value={sixMinWalk} label="6-Min Walk" unit="m" min={200} max={800} targetMin={400} targetMax={700} size="small" style="modern" color="#8b5cf6" />
                <CircularGauge value={mets} label="METs" unit="METs" min={1} max={15} targetMin={5} targetMax={8} size="small" style="modern" color="#7c3aed" />
                <CircularGauge value={restingHR} label="Resting HR" unit="bpm" min={40} max={100} targetMin={50} targetMax={70} size="small" style="luxury" color="#D4AF37" />
                <CircularGauge value={maxHR} label="Max HR" unit="bpm" min={100} max={200} size="small" style="modern" color="#c084fc" />
                <CircularGauge value={hrRecovery} label="HR Recovery" unit="bpm/min" min={5} max={40} targetMin={12} targetMax={25} size="small" style="modern" color="#a78bfa" />
              </div>
            </div>

            {/* Right - HRV Analytics */}
            <div className="glass-card p-6 rounded-2xl" style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15))',
              border: '2px solid rgba(16, 185, 129, 0.4)'
            }}>
              <h3 className="text-lg font-bold text-emerald-400 mb-4">HRV Analytics</h3>
              <div className="grid grid-cols-2 gap-4">
                <CircularGauge value={sdnn} label="SDNN" unit="ms" min={0} max={200} targetMin={50} targetMax={100} size="small" style="modern" color="#10b981" />
                <CircularGauge value={rmssd} label="RMSSD" unit="ms" min={0} max={100} targetMin={20} targetMax={50} size="small" style="modern" color="#059669" />
                <CircularGauge value={pnn50} label="pNN50" unit="%" min={0} max={60} targetMin={10} targetMax={40} size="small" style="modern" color="#047857" />
                <CircularGauge value={currentMAP} label="MAP" unit="mmHg" min={50} max={130} targetMin={70} targetMax={100} size="small" style="modern" color="#34d399" />
                <CircularGauge value={pulsePressure} label="Pulse Pressure" unit="mmHg" min={20} max={100} targetMin={40} targetMax={60} size="small" style="modern" color="#6ee7b7" />
                <CircularGauge value={latestBPVariability} label="BP Variability" unit="mmHg SD" min={0} max={30} size="small" style="modern" color="#a7f3d0" />
              </div>
            </div>

            {/* Specialty Gauges */}
            <div className="glass-card p-6 rounded-2xl" style={{
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.15))',
              border: '2px solid rgba(251, 191, 36, 0.4)'
            }}>
              <h3 className="text-lg font-bold text-amber-400 mb-4">Specialty Metrics</h3>
              <div className="flex flex-col gap-4">
                <CircularGauge value={ejectionFraction} label="Ejection Fraction" unit="%" min={20} max={80} targetMin={50} targetMax={70} size="medium" style="luxury" color="#D4AF37" />
                <CircularGauge value={filteredLatest?.peakFlow || null} label="Peak Flow" unit="L/min" min={200} max={700} targetMin={400} targetMax={600} size="medium" style="modern" color="#22c55e" />
                <CircularGauge value={hydrationActual} label="Hydration" unit={`${hydrationActual}/${hydrationTarget} oz`} min={0} max={hydrationTarget} size="medium" style="modern" color="#3b82f6" />
              </div>
            </div>
          </div>
        </div>
      </HeartFrame>

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

              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold">Water Intake</p>
                <Droplet className="h-8 w-8 text-blue-500" />
              </div>

              {/* Date Display - Centered Below Header */}
              <div className="flex justify-center mb-3">
                <div
                  className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-lg px-3 py-1.5 border-2 border-purple-500 cursor-pointer hover:border-purple-400 transition-all"
                  style={{
                    boxShadow: '0 2px 10px rgba(168, 85, 247, 0.4)'
                  }}
                  onClick={() => setShowWaterDatePicker(!showWaterDatePicker)}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-300" />
                    <span className="text-purple-200 font-bold text-sm">
                      {format(new Date(waterCardDate), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <p className="text-purple-300 text-xs text-center mt-0.5 font-semibold">
                    {waterCardDate === format(new Date(), 'yyyy-MM-dd') ? '✨ Today' : '📜 Historic Entry'}
                  </p>
                </div>
              </div>

              {/* Date Picker */}
              {showWaterDatePicker && (
                <div className="flex justify-center mb-3">
                  <input
                    type="date"
                    value={waterCardDate}
                    onChange={(e) => {
                      setWaterCardDate(e.target.value);
                      toast.success(`Date set to: ${format(new Date(e.target.value), 'MMM dd, yyyy')}`, {
                        duration: 2000,
                      });
                    }}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full bg-purple-950 text-white px-4 py-3 rounded-xl text-base font-bold border-2 border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-500 focus:border-purple-300"
                    style={{
                      colorScheme: 'dark',
                      fontSize: '16px',
                    }}
                  />
                </div>
              )}

              {/* Recommended Target Display */}
              <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-xl p-3 mb-3 border border-cyan-500/30">
                <div className="text-center">
                  <p className="text-xs text-cyan-300 mb-1 font-semibold">🎯 RECOMMENDED FOR YOU</p>
                  <p className="text-2xl font-bold text-cyan-400">
                    {calculatePersonalizedHydrationTarget(waterCardDate)} oz
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Based on weight, gender, ejection fraction & medications</p>
                </div>
              </div>

              {/* Target and Current Intake Display */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">YOUR TARGET</p>
                  <p className="text-2xl font-bold" style={{ color: '#10b981' }}>
                    {(() => {
                      const selectedLog = hydrationLogs.find(log => log.date === waterCardDate);
                      const recommended = calculatePersonalizedHydrationTarget(waterCardDate);
                      return selectedLog?.targetOunces ? `${selectedLog.targetOunces} oz` : `${recommended} oz`;
                    })()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">CONSUMED</p>
                  <p className="text-2xl font-bold" style={{
                    color: (() => {
                      const selectedLog = hydrationLogs.find(log => log.date === waterCardDate);
                      const consumed = selectedLog?.totalOunces || 0;
                      const personalTarget = calculatePersonalizedHydrationTarget(waterCardDate);

                      // Dynamic zones based on personal target
                      if (consumed < personalTarget * 0.5) return '#ef4444'; // < 50% = critical red
                      if (consumed < personalTarget * 0.75) return '#eab308'; // < 75% = yellow
                      if (consumed > personalTarget * 1.3) return '#3b82f6'; // > 130% = blue (too much)
                      return '#10b981'; // 75-130% = green
                    })()
                  }}>
                    {(() => {
                      const selectedLog = hydrationLogs.find(log => log.date === waterCardDate);
                      return selectedLog ? `${selectedLog.totalOunces} oz` : '0 oz';
                    })()}
                  </p>
                </div>
              </div>

              {/* Quick Add Buttons */}
              <div className="grid grid-cols-5 gap-2 mt-4">
                {[4, 8, 16, 32].map((oz) => (
                  <button
                    key={oz}
                    onClick={() => handleAddWater(oz)}
                    className="px-3 py-2 rounded-lg font-bold text-white transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                      boxShadow: '0 2px 8px rgba(6, 182, 212, 0.4)',
                    }}
                  >
                    +{oz}
                  </button>
                ))}
                <button
                  onClick={() => {
                    const custom = prompt('Enter custom amount (oz):');
                    if (custom && !isNaN(parseInt(custom))) {
                      handleAddWater(parseInt(custom));
                    }
                  }}
                  className="px-3 py-2 rounded-lg font-bold text-white transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)',
                  }}
                >
                  +?
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={async () => {
                    const recommended = calculatePersonalizedHydrationTarget(waterCardDate);
                    const target = prompt(`Set daily target (oz):\n\n💡 Recommended for you: ${recommended} oz\n(Based on your profile)`, String(recommended));
                    if (target && !isNaN(parseInt(target))) {
                      const targetInt = parseInt(target);
                      try {
                        const existingLog = hydrationLogs.find(log => log.date === waterCardDate);
                        if (existingLog) {
                          await api.updateHydrationLog(existingLog.id, { targetOunces: targetInt });
                        } else {
                          await api.createHydrationLog({
                            date: waterCardDate,
                            totalOunces: 0,
                            targetOunces: targetInt,
                            userId: selectedUserId || user?.id,
                          });
                        }
                        toast.success(`Target set to ${targetInt} oz for ${format(new Date(waterCardDate), 'MMM dd')}`);
                        await loadHydrationLogs();
                      } catch (error) {
                        toast.error('Failed to set target');
                      }
                    }
                  }}
                  className="px-3 py-2 rounded-lg font-bold text-white text-sm transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
                  }}
                >
                  Set Target
                </button>
                <button
                  onClick={async () => {
                    const selectedLog = hydrationLogs.find(log => log.date === waterCardDate);
                    if (!selectedLog) {
                      toast.error('No data to delete');
                      return;
                    }
                    if (window.confirm(`Delete water data for ${format(new Date(waterCardDate), 'MMM dd, yyyy')}?`)) {
                      try {
                        await api.deleteHydrationLog(selectedLog.id);
                        toast.success('Water data deleted');
                        await loadHydrationLogs();
                      } catch (error) {
                        toast.error('Failed to delete data');
                      }
                    }
                  }}
                  className="px-3 py-2 rounded-lg font-bold text-white text-sm transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                  }}
                >
                  Delete Date
                </button>
              </div>
            </GlassCard>
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

          {/* NEW: 7-Day Average Heart Rate - ALWAYS use unfiltered vitals data */}
          {vitals.length > 0 && (
            <div className="grid grid-cols-1 gap-4">
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

            {/* UNIFIED TIME VIEW SELECTOR */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-sm font-semibold text-gray-400 mr-2">Time Range:</span>
              <button
                onClick={() => setGlobalTimeView('7d')}
                className={`px-4 py-2 rounded-lg transition-all font-bold text-sm ${
                  globalTimeView === '7d'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                    : 'glass-button hover:bg-purple-600/20'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setGlobalTimeView('30d')}
                className={`px-4 py-2 rounded-lg transition-all font-bold text-sm ${
                  globalTimeView === '30d'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                    : 'glass-button hover:bg-purple-600/20'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setGlobalTimeView('90d')}
                className={`px-4 py-2 rounded-lg transition-all font-bold text-sm ${
                  globalTimeView === '90d'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                    : 'glass-button hover:bg-purple-600/20'
                }`}
              >
                90 Days
              </button>
              <button
                onClick={() => setGlobalTimeView('surgery')}
                className={`px-4 py-2 rounded-lg transition-all font-bold text-sm ${
                  globalTimeView === 'surgery'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                    : 'glass-button hover:bg-blue-600/20'
                }`}
                disabled={!surgeryDate}
                title={surgeryDate ? 'Show surgery-based timeline' : 'No surgery date set'}
              >
                {surgeryDate ? 'Surgery Timeline' : 'Surgery Timeline (N/A)'}
              </button>
            </div>

            {/* Surgery Date Display (Day 0) - UNIFIED */}
            {surgeryDate && globalTimeView === 'surgery' && (
              <div className="flex items-center justify-center gap-3 px-4 py-3 rounded-lg mb-4" style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.2))',
                border: '2px solid rgba(59, 130, 246, 0.5)',
                boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
              }}>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/30 border border-blue-400">
                  <Activity className="h-5 w-5 text-blue-300" />
                  <span className="text-blue-200 font-bold text-sm">DAY 0</span>
                </div>
                <span className="text-sm font-semibold text-gray-200">
                  Surgery Date:{' '}
                  <span className="text-blue-300 font-bold text-base">
                    {format(new Date(surgeryDate), 'MMM dd, yyyy')}
                  </span>
                </span>
              </div>
            )}

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
                    <AreaChart data={activeChartData}>
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
                    <LineChart data={activeChartData}>
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
                        <>
                          <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={2} label={{ value: 'Danger Low (90%)', position: 'insideTopRight', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
                          <ReferenceLine y={92} stroke="#eab308" strokeDasharray="3 3" strokeWidth={2} label={{ value: 'Moderate Low (92%)', position: 'insideTopRight', fill: '#eab308', fontSize: 10, fontWeight: 'bold' }} />
                          <ReferenceLine y={95} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'Normal Min (95%)', position: 'insideTopRight', fill: '#10b981', fontSize: 11, fontWeight: 'bold' }} />
                        </>
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
                    <th className="text-center py-2 px-2 text-sm font-medium font-bold">Actions</th>
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
                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={() => handleDeleteVitalReading(vital.id, vital.timestamp)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-500 hover:text-red-400 transition-all"
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

              <Input
                label="Respiratory Rate (/min)"
                type="number"
                placeholder="12-20"
                icon={<Pulse className="h-5 w-5" />}
                {...register('respiratoryRate', { valueAsNumber: true })}
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
