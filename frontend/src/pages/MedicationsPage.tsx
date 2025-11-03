import React, { useState, useEffect } from 'react';
import { GlassCard, Button, Modal, Input, Select } from '../components/ui';
import {
  Pill,
  Plus,
  Edit,
  Trash2,
  Clock,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Bell,
  BellOff,
  BarChart3,
  Trophy,
  Award,
  DollarSign,
  Activity,
  TrendingUp,
  Target,
  Zap
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import { Medication, CreateMedicationInput, MedicationLog, VitalsSample } from '../types';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { usePatientSelection } from '../contexts/PatientSelectionContext';
import { format, subDays, parseISO, getDaysInMonth, startOfMonth, endOfMonth } from 'date-fns';
import { MedicationAutocomplete } from '../components/MedicationAutocomplete';
import { SideEffectWarnings } from '../components/SideEffectWarnings';
import { type MedicationInfo, STANDARD_FREQUENCIES, STANDARD_TIMES_OF_DAY } from '../data/medicationDatabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const medicationSchema = z.object({
  name: z.string().min(1, 'Medication name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  prescribedBy: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  timeOfDay: z.string().optional(),
  instructions: z.string().optional(),
  sideEffects: z.string().optional(),
  reminderEnabled: z.boolean().optional(),
  // NEW: Additional tracking fields
  effectiveness: z.preprocess(
    (val) => (val === null || val === undefined || (typeof val === 'number' && isNaN(val)) || val === '') ? undefined : val,
    z.number().min(1).max(5).optional()
  ),
  isOTC: z.boolean().optional(),
  monthlyCost: z.preprocess(
    (val) => (val === null || val === undefined || (typeof val === 'number' && isNaN(val)) || val === '') ? undefined : val,
    z.number().min(0).optional()
  ),
});

type MedicationFormData = z.infer<typeof medicationSchema>;

export function MedicationsPage() {
  const { user } = useAuth();
  const { selectedPatient, setSelectedPatient, isViewingAsTherapist } = usePatientSelection();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [activeMeds, setActiveMeds] = useState<Medication[]>([]);
  const [inactiveMeds, setInactiveMeds] = useState<Medication[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'active' | 'inactive'>('active');
  const [activeTab, setActiveTab] = useState<'medications' | 'adherence'>('medications');
  const [allPatients, setAllPatients] = useState<Patient[]>([]);

  // Adherence data
  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>([]);
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });

  // Autocomplete state
  const [medicationName, setMedicationName] = useState('');
  const [selectedMedicationInfo, setSelectedMedicationInfo] = useState<MedicationInfo | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<MedicationFormData>({
    resolver: zodResolver(medicationSchema),
    defaultValues: {
      reminderEnabled: true,
      startDate: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    loadMedications();
  }, [selectedPatient]); // Reload when selected patient changes

  // Load all patients for therapists
  useEffect(() => {
    const loadPatients = async () => {
      if (user?.role === 'therapist') {
        try {
          const patients = await api.getPatients();
          setAllPatients(patients);
        } catch (error) {
          console.error('Failed to load patients:', error);
        }
      }
    };
    loadPatients();
  }, [user]);

  const loadMedications = async () => {
    try {
      setIsLoading(true);
      // Use selected patient's userId if viewing as therapist, otherwise use own user ID
      const userId = isViewingAsTherapist && selectedPatient?.userId ? selectedPatient.userId : user?.id;
      const medsData = await api.getMedications(false, userId);
      setMedications(medsData);
      setActiveMeds(medsData.filter(m => m.isActive));
      setInactiveMeds(medsData.filter(m => !m.isActive));
    } catch (error) {
      console.error('Failed to load medications:', error);
      toast.error('Failed to load medications');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdherenceData = async () => {
    try {
      setIsLoading(true);
      const userId = isViewingAsTherapist && selectedPatient?.userId ? selectedPatient.userId : user?.id;
      const logsData = await api.getMedicationLogs({
        startDate: dateRange.start,
        endDate: dateRange.end,
        userId
      });
      setMedicationLogs(logsData);
    } catch (error) {
      console.error('Failed to load adherence data:', error);
      toast.error('Failed to load adherence data');
    } finally {
      setIsLoading(false);
    }
  };

  // Load adherence data when tab or date range changes
  useEffect(() => {
    if (activeTab === 'adherence') {
      loadAdherenceData();
    }
  }, [activeTab, dateRange]);

  const onSubmit = async (data: MedicationFormData) => {
    try {
      setIsLoading(true);

      console.log('Form data being submitted:', data);

      if (editingMed) {
        const updated = await api.updateMedication(editingMed.id, data);
        setMedications(medications.map(m => m.id === updated.id ? updated : m));
        toast.success('Medication updated successfully');
      } else {
        const newMedData = {
          ...data,
          isActive: true,
          // Always include userId: therapist uses selectedPatient, patient uses own user
          userId: isViewingAsTherapist && selectedPatient?.userId ? selectedPatient.userId : user?.id
        } as CreateMedicationInput & { userId?: number };

        console.log('Creating medication with data:', newMedData);

        const newMed = await api.createMedication(newMedData);
        setMedications([...medications, newMed]);
        toast.success('Medication added successfully');
      }

      loadMedications();
      setIsModalOpen(false);
      reset();
      setEditingMed(null);
      setMedicationName('');
      setSelectedMedicationInfo(null);
    } catch (error: any) {
      console.error('Failed to save medication:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      toast.error(error.response?.data?.error || 'Failed to save medication');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (medication: Medication) => {
    setEditingMed(medication);
    setValue('name', medication.name);
    setValue('dosage', medication.dosage);
    setValue('frequency', medication.frequency);
    setValue('prescribedBy', medication.prescribedBy || '');
    setValue('startDate', medication.startDate.split('T')[0]);
    setValue('endDate', medication.endDate ? medication.endDate.split('T')[0] : '');
    setValue('timeOfDay', medication.timeOfDay || '');
    setValue('instructions', medication.instructions || '');
    setValue('sideEffects', medication.sideEffects || '');
    setValue('reminderEnabled', medication.reminderEnabled);
    setIsModalOpen(true);
  };

  const handleDelete = async (medication: Medication) => {
    if (!window.confirm('Are you sure you want to delete this medication?')) return;
    
    try {
      await api.deleteMedication(medication.id);
      setMedications(medications.filter(m => m.id !== medication.id));
      loadMedications();
      toast.success('Medication deleted successfully');
    } catch (error) {
      console.error('Failed to delete medication:', error);
      toast.error('Failed to delete medication');
    }
  };

  const handleToggleActive = async (medication: Medication) => {
    try {
      const updated = await api.toggleMedicationActive(medication.id);
      setMedications(medications.map(m => m.id === updated.id ? updated : m));
      loadMedications();
      toast.success(`Medication ${updated.isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Failed to toggle medication status:', error);
      toast.error('Failed to toggle medication status');
    }
  };

  const displayedMeds = 
    viewMode === 'active' ? activeMeds :
    viewMode === 'inactive' ? inactiveMeds :
    medications;

  const MedicationCard = ({ medication }: { medication: Medication }) => {
    // 7. Get sparkline data for this medication
    const sparklineData = activeTab === 'medications' ? getSparklineData(medication.id) : [];
    const hasSparklineData = sparklineData.length > 0;

    return (
    <GlassCard className="relative">
      {!medication.isActive && (
        <div className="absolute top-3 right-3">
          <span className="px-2 py-1 text-xs font-bold bg-gray-100 text-gray-600 rounded-full">
            Inactive
          </span>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold" style={{ color: '#ffffff' }}>{medication.name}</h3>
            <p className="font-bold" style={{ color: '#ffffff' }}>{medication.dosage}</p>
            {/* 7. Mini Sparkline */}
            {hasSparklineData && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-6 flex items-end gap-0.5">
                  {sparklineData.map((point, idx) => (
                    <div
                      key={idx}
                      className="flex-1 rounded-t transition-all duration-200"
                      style={{
                        height: point.value === 1 ? '100%' : '20%',
                        backgroundColor: point.value === 1 ? '#10b981' : '#ef4444',
                        opacity: 0.8,
                        boxShadow: point.value === 1 ? '0 0 4px rgba(16, 185, 129, 0.6)' : 'none'
                      }}
                      title={point.value === 1 ? 'Taken' : 'Missed'}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-gray-400">Last 7</span>
              </div>
            )}
          </div>
          <Pill className="h-8 w-8 text-purple-500" />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center font-bold" style={{ color: '#ffffff' }}>
            <Clock className="h-4 w-4 mr-2" />
            {medication.frequency}
            {medication.timeOfDay && ` • ${medication.timeOfDay}`}
          </div>

          {medication.prescribedBy && (
            <div className="flex items-center font-bold" style={{ color: '#ffffff' }}>
              <User className="h-4 w-4 mr-2" />
              Dr. {medication.prescribedBy}
            </div>
          )}

          <div className="flex items-center font-bold" style={{ color: '#ffffff' }}>
            <Calendar className="h-4 w-4 mr-2" />
            Started {format(new Date(medication.startDate), 'MMM d, yyyy')}
            {medication.endDate && (
              <span> • Ends {format(new Date(medication.endDate), 'MMM d, yyyy')}</span>
            )}
          </div>

          {/* NEW: Days Remaining */}
          {medication.endDate && medication.isActive && (
            <div className="flex items-center">
              <div className={`text-xs font-bold px-3 py-1 rounded-full ${(() => {
                const daysLeft = Math.ceil((new Date(medication.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                if (daysLeft < 0) return 'bg-gray-600 text-white';
                if (daysLeft <= 7) return 'bg-red-500 text-white';
                if (daysLeft <= 14) return 'bg-yellow-500 text-black';
                return 'bg-green-500 text-white';
              })()}`}>
                {(() => {
                  const daysLeft = Math.ceil((new Date(medication.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  if (daysLeft < 0) return 'Expired';
                  if (daysLeft === 0) return 'Ends today';
                  if (daysLeft === 1) return '1 day left';
                  return `${daysLeft} days left`;
                })()}
              </div>
            </div>
          )}

          <div className="flex items-center">
            {medication.reminderEnabled ? (
              <div className="flex items-center font-bold" style={{ color: '#ffffff' }}>
                <Bell className="h-4 w-4 mr-2" />
                Reminders enabled
              </div>
            ) : (
              <div className="flex items-center font-bold" style={{ color: '#ffffff' }}>
                <BellOff className="h-4 w-4 mr-2" />
                Reminders disabled
              </div>
            )}
          </div>
        </div>

        {medication.instructions && (
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs font-bold" style={{ color: '#ffffff' }}>
              <span className="font-bold">Instructions:</span> {medication.instructions}
            </p>
          </div>
        )}

        {medication.sideEffects && (
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
            <p className="text-xs font-bold" style={{ color: '#ffffff' }}>
              <span className="font-bold">Side effects:</span> {medication.sideEffects}
            </p>
          </div>
        )}

        <div className="flex justify-between pt-3 border-t border-gray-200">
          <Button
            size="sm"
            variant={medication.isActive ? 'secondary' : 'success'}
            onClick={() => handleToggleActive(medication)}
          >
            {medication.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="glass"
              onClick={() => handleEdit(medication)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleDelete(medication)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </GlassCard>
    );
  };

  // ==================== MEDICATION ADHERENCE SCORING ====================
  // Group medication logs by date
  const logsByDate = medicationLogs.reduce((acc, log) => {
    const dateStr = format(parseISO(log.scheduledTime), 'yyyy-MM-dd');
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(log);
    return acc;
  }, {} as Record<string, MedicationLog[]>);

  // Helper function to get adherence color based on daily adherence rate
  const getAdherenceColor = (adherenceRate: number) => {
    if (adherenceRate >= 100) return '#10b981'; // Green - All taken
    if (adherenceRate >= 50) return '#3b82f6';  // Blue - Partial
    if (adherenceRate > 0) return '#f59e0b';    // Orange - Few taken
    return '#ef4444';                            // Red - None taken
  };

  const getAdherenceCategory = (adherenceRate: number) => {
    if (adherenceRate >= 100) return 'All Taken';
    if (adherenceRate >= 50) return 'Mostly Taken';
    if (adherenceRate > 0) return 'Partially Taken';
    return 'Missed';
  };

  const getAdherencePoints = (adherenceRate: number) => {
    if (adherenceRate >= 100) return 3; // Perfect
    if (adherenceRate >= 50) return 2;  // Good
    if (adherenceRate > 0) return 1;    // Some effort
    return 0;                            // None
  };

  // Calculate monthly medication score
  const calculateMonthlyAdherenceScore = () => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const daysInCurrentMonth = getDaysInMonth(now);

    // Get dates in current month that have logs
    const monthDates = Object.keys(logsByDate).filter(dateStr => {
      const date = parseISO(dateStr);
      return date >= monthStart && date <= monthEnd;
    });

    // Calculate base score
    let baseScore = 0;
    monthDates.forEach(dateStr => {
      const dayLogs = logsByDate[dateStr];
      const totalDoses = dayLogs.length;
      const takenDoses = dayLogs.filter(log => log.status === 'taken').length;
      const adherenceRate = totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 0;

      baseScore += getAdherencePoints(adherenceRate);
    });

    // Check for perfect attendance (all days logged)
    const allDaysLogged = monthDates.length === daysInCurrentMonth;
    let bonusPoints = 0;

    if (allDaysLogged) {
      bonusPoints = daysInCurrentMonth === 30 ? 10 : 7; // 10 for 30-day month, 7 for 31-day month
    }

    const totalScore = baseScore + bonusPoints;
    const maxPossibleScore = (daysInCurrentMonth * 3) + (daysInCurrentMonth === 30 ? 10 : 7);

    return {
      totalScore,
      baseScore,
      bonusPoints,
      maxPossibleScore,
      daysLogged: monthDates.length,
      daysInMonth: daysInCurrentMonth,
      isPerfect: allDaysLogged,
    };
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

    if (percentage >= 90) return { bg: 'bg-gradient-to-br from-green-500 to-emerald-600', text: 'text-white', border: 'border-green-400' };
    if (percentage >= 75) return { bg: 'bg-gradient-to-br from-blue-500 to-cyan-600', text: 'text-white', border: 'border-blue-400' };
    if (percentage >= 50) return { bg: 'bg-gradient-to-br from-yellow-500 to-orange-500', text: 'text-white', border: 'border-yellow-400' };
    if (percentage >= 25) return { bg: 'bg-gradient-to-br from-orange-500 to-red-500', text: 'text-white', border: 'border-orange-400' };
    return { bg: 'bg-gradient-to-br from-red-600 to-red-800', text: 'text-white', border: 'border-red-500' };
  };

  const adherenceScore = calculateMonthlyAdherenceScore();
  const scoreColor = getScoreColor(adherenceScore.totalScore, adherenceScore.maxPossibleScore);

  // Prepare chart data - one bar per date (limit to 90 days for performance)
  const chartData = Object.keys(logsByDate)
    .sort()
    .slice(-90)
    .map(dateStr => {
      const dayLogs = logsByDate[dateStr];
      const totalDoses = dayLogs.length;
      const takenDoses = dayLogs.filter(log => log.status === 'taken').length;
      const adherenceRate = totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 0;

      return {
        date: format(parseISO(dateStr), 'MMM d'),
        adherenceRate,
        takenCount: takenDoses,
        totalCount: totalDoses,
        fill: getAdherenceColor(adherenceRate),
      };
    });

  // Calculate adherence distribution for pie chart
  const adherenceCategories = chartData.reduce((acc, day) => {
    const category = getAdherenceCategory(day.adherenceRate);
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const adherenceCategoryData = Object.entries(adherenceCategories).map(([category, count]) => {
    let color = '#6b7280';
    if (category === 'All Taken') color = '#10b981';
    else if (category === 'Mostly Taken') color = '#3b82f6';
    else if (category === 'Partially Taken') color = '#f59e0b';
    else if (category === 'Missed') color = '#ef4444';

    return {
      name: category,
      value: count,
      color,
    };
  });

  // ==================== NEW VISUALIZATION DATA ====================

  // 1. Radial Progress Data - Overall adherence percentage
  const overallAdherencePercentage = adherenceScore.maxPossibleScore > 0
    ? (adherenceScore.totalScore / adherenceScore.maxPossibleScore) * 100
    : 0;

  // 2. Medication Timeline Data - Gantt chart data
  const timelineData = medications.map(med => {
    const start = new Date(med.startDate);
    const end = med.endDate ? new Date(med.endDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now if no end
    const now = new Date();
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

    return {
      id: med.id,
      name: med.name,
      startDate: med.startDate,
      endDate: med.endDate,
      start,
      end,
      progress,
      isActive: med.isActive,
      isOTC: med.isOTC,
    };
  }).sort((a, b) => a.start.getTime() - b.start.getTime());

  // 3. Cost Trend Data - Monthly costs over last 6 months
  const generateCostTrendData = () => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subDays(new Date(), i * 30);
      const monthStr = format(date, 'MMM yyyy');
      const monthCost = activeMeds.reduce((sum, med) => {
        const medStart = new Date(med.startDate);
        if (medStart <= date) {
          return sum + (med.monthlyCost || 0);
        }
        return sum;
      }, 0);
      months.push({ month: monthStr, cost: monthCost });
    }
    return months;
  };
  const costTrendData = generateCostTrendData();

  // 4. Stacked Area Chart Data - Individual medication adherence over time
  const stackedAdherenceData = (() => {
    // Group logs by medication ID and date
    const medLogs: Record<number, Record<string, { taken: number; total: number }>> = {};

    medicationLogs.forEach(log => {
      if (!medLogs[log.medicationId]) medLogs[log.medicationId] = {};
      const dateStr = format(parseISO(log.scheduledTime), 'MMM d');
      if (!medLogs[log.medicationId][dateStr]) {
        medLogs[log.medicationId][dateStr] = { taken: 0, total: 0 };
      }
      medLogs[log.medicationId][dateStr].total++;
      if (log.status === 'taken') medLogs[log.medicationId][dateStr].taken++;
    });

    // Get all unique dates
    const allDates = Array.from(new Set(medicationLogs.map(log => format(parseISO(log.scheduledTime), 'MMM d'))));

    return allDates.sort().slice(-14).map(date => {
      const dayData: any = { date };
      activeMeds.slice(0, 5).forEach(med => { // Limit to 5 meds for readability
        const logs = medLogs[med.id]?.[date];
        dayData[med.name] = logs ? (logs.taken / logs.total) * 100 : 0;
      });
      return dayData;
    });
  })();

  // 5. Heatmap Calendar Data - Daily adherence for current month
  const heatmapData = (() => {
    const now = new Date();
    const daysInMonth = getDaysInMonth(now);
    const monthStart = startOfMonth(now);
    const data = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(monthStart);
      date.setDate(day);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayLogs = logsByDate[dateStr] || [];
      const totalDoses = dayLogs.length;
      const takenDoses = dayLogs.filter(log => log.status === 'taken').length;
      const adherenceRate = totalDoses > 0 ? (takenDoses / totalDoses) * 100 : null;

      data.push({
        day,
        date: format(date, 'MMM d'),
        adherenceRate,
        takenCount: takenDoses,
        totalCount: totalDoses,
        dayOfWeek: format(date, 'EEE'),
      });
    }
    return data;
  })();

  // 6. Effectiveness Radar Data - Multi-dimensional medication performance
  const radarData = activeMeds
    .filter(med => med.effectiveness)
    .slice(0, 3) // Show top 3 medications
    .map(med => {
      // Calculate adherence for this specific medication
      const medLogs = medicationLogs.filter(log => log.medicationId === med.id);
      const takenCount = medLogs.filter(log => log.status === 'taken').length;
      const adherence = medLogs.length > 0 ? (takenCount / medLogs.length) * 100 : 0;

      return {
        medication: med.name.length > 15 ? med.name.substring(0, 15) + '...' : med.name,
        effectiveness: (med.effectiveness || 0) * 20, // Scale to 100
        adherence: adherence,
        costValue: 100 - Math.min(100, ((med.monthlyCost || 0) / 100) * 100), // Inverse: lower cost = higher score
        sideEffects: med.sideEffects ? 30 : 100, // Inverse: fewer side effects = higher score
      };
    });

  // 7. Per-Medication Sparkline Data
  const getSparklineData = (medicationId: number) => {
    const medLogs = medicationLogs
      .filter(log => log.medicationId === medicationId)
      .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime())
      .slice(-7); // Last 7 doses

    return medLogs.map(log => ({
      value: log.status === 'taken' ? 1 : 0,
    }));
  };

  // 8. Circular Progress Rings Data - Per medication adherence
  const medicationRingsData = activeMeds.slice(0, 6).map(med => {
    const medLogs = medicationLogs.filter(log => log.medicationId === med.id);
    const takenCount = medLogs.filter(log => log.status === 'taken').length;
    const adherence = medLogs.length > 0 ? (takenCount / medLogs.length) * 100 : 0;

    return {
      id: med.id,
      name: med.name.length > 12 ? med.name.substring(0, 12) + '...' : med.name,
      adherence,
      takenCount,
      totalCount: medLogs.length,
      color: adherence >= 90 ? '#10b981' : adherence >= 75 ? '#3b82f6' : adherence >= 50 ? '#f59e0b' : '#ef4444',
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" style={{ color: '#ffffff' }}>Medications</h1>
        <Button onClick={() => {
          reset({
            reminderEnabled: true,
            startDate: new Date().toISOString().split('T')[0],
          });
          setEditingMed(null);
          setIsModalOpen(true);
        }}>
          <Plus className="h-5 w-5 mr-2" />
          Add Medication
        </Button>
      </div>

      {/* Patient Selection Dropdown for Therapists */}
      {user?.role === 'therapist' && (
        <div className="glass rounded-xl p-4 border-2" style={{ borderColor: 'var(--accent)' }}>
          <div className="flex items-center space-x-4">
            <User className="h-6 w-6" style={{ color: 'var(--accent)' }} />
            <div className="flex-1">
              <label className="block text-sm font-bold mb-2" style={{ color: 'var(--muted)' }}>
                Viewing Medications For:
              </label>
              <select
                value={selectedPatient?.id || 'own'}
                onChange={(e) => {
                  if (e.target.value === 'own') {
                    setSelectedPatient(null);
                  } else {
                    const patient = allPatients.find(p => p.id === parseInt(e.target.value));
                    setSelectedPatient(patient || null);
                  }
                }}
                className="w-full px-4 py-2 rounded-lg border-2 border-white/20 bg-white/10 backdrop-blur-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none font-bold text-white"
              >
                <option value="own" style={{ color: '#1e293b', fontWeight: 700, backgroundColor: '#ffffff' }}>
                  📋 My Own Medications
                </option>
                {allPatients.map(patient => (
                  <option
                    key={patient.id}
                    value={patient.id}
                    style={{ color: '#1e293b', fontWeight: 700, backgroundColor: '#ffffff' }}
                  >
                    👤 {patient.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="flex space-x-2">
        <button
          onClick={() => setActiveTab('medications')}
          className={`px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2 ${
            activeTab === 'medications'
              ? 'bg-purple-500'
              : 'glass-button'
          }`}
          style={{ color: '#ffffff' }}
        >
          <Pill className="h-5 w-5" />
          My Medications
        </button>
        <button
          onClick={() => setActiveTab('adherence')}
          className={`px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2 ${
            activeTab === 'adherence'
              ? 'bg-blue-500'
              : 'glass-button'
          }`}
          style={{ color: '#ffffff' }}
        >
          <BarChart3 className="h-5 w-5" />
          Adherence & Stats
        </button>
      </div>

      {/* Medications Tab Content */}
      {activeTab === 'medications' && (
        <>
          {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1" style={{ color: '#ffffff' }}>Total Medications</p>
              <p className="text-3xl font-bold" style={{ color: '#ffffff' }}>{medications.length}</p>
            </div>
            <Pill className="h-8 w-8 text-purple-500" />
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1" style={{ color: '#ffffff' }}>Active</p>
              <p className="text-3xl font-bold" style={{ color: '#ffffff' }}>{activeMeds.length}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1" style={{ color: '#ffffff' }}>With Reminders</p>
              <p className="text-3xl font-bold" style={{ color: '#ffffff' }}>
                {medications.filter(m => m.reminderEnabled).length}
              </p>
            </div>
            <Bell className="h-8 w-8 text-blue-500" />
          </div>
        </GlassCard>

        {/* NEW: OTC Medications Count */}
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1" style={{ color: '#ffffff' }}>OTC/Supplements</p>
              <p className="text-3xl font-bold" style={{ color: '#ffffff' }}>
                {medications.filter(m => m.isOTC).length}
              </p>
            </div>
            <Award className="h-8 w-8 text-orange-500" />
          </div>
        </GlassCard>

        {/* NEW: Monthly Cost */}
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1" style={{ color: '#ffffff' }}>Monthly Cost</p>
              <p className="text-3xl font-bold" style={{ color: '#ffffff' }}>
                ${activeMeds.reduce((sum, med) => sum + (med.monthlyCost || 0), 0).toFixed(0)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-400" />
          </div>
        </GlassCard>
      </div>

      {/* NEW: Recently Started Medications */}
      {medications.length > 0 && (
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1" style={{ color: '#ffffff' }}>Recently Started (Last 30 Days)</p>
              <p className={`text-3xl font-bold ${(() => {
                const thirtyDaysAgo = subDays(new Date(), 30);
                const recentCount = medications.filter(m => new Date(m.startDate) >= thirtyDaysAgo).length;
                if (recentCount === 0) return 'text-green-400';
                if (recentCount <= 2) return 'text-yellow-400';
                return 'text-red-400';
              })()}`}>
                {(() => {
                  const thirtyDaysAgo = subDays(new Date(), 30);
                  return medications.filter(m => new Date(m.startDate) >= thirtyDaysAgo).length;
                })()}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                {(() => {
                  const thirtyDaysAgo = subDays(new Date(), 30);
                  const recentCount = medications.filter(m => new Date(m.startDate) >= thirtyDaysAgo).length;
                  if (recentCount === 0) return 'No recent changes';
                  if (recentCount === 1) return '1 new medication';
                  return `${recentCount} new medications`;
                })()}
              </p>
            </div>
            <div className={`text-xs font-bold px-4 py-2 rounded-full ${(() => {
              const thirtyDaysAgo = subDays(new Date(), 30);
              const recentCount = medications.filter(m => new Date(m.startDate) >= thirtyDaysAgo).length;
              if (recentCount === 0) return 'bg-green-500 text-white';
              if (recentCount <= 2) return 'bg-yellow-500 text-black';
              return 'bg-red-500 text-white';
            })()}`}>
              {(() => {
                const thirtyDaysAgo = subDays(new Date(), 30);
                const recentCount = medications.filter(m => new Date(m.startDate) >= thirtyDaysAgo).length;
                if (recentCount === 0) return 'Stable';
                if (recentCount <= 2) return 'Some Changes';
                return 'Many Changes';
              })()}
            </div>
          </div>
        </GlassCard>
      )}

      {/* NEW: Prescription vs OTC Split */}
      {activeMeds.length > 0 && (
        <GlassCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>Prescription</p>
                  <p className="text-2xl font-bold" style={{ color: '#ffffff' }}>
                    {activeMeds.filter(m => !m.isOTC).length}
                  </p>
                </div>
              </div>
              <div className="h-12 w-px bg-gray-600"></div>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-orange-400" />
                <div>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>OTC/Supplements</p>
                  <p className="text-2xl font-bold" style={{ color: '#ffffff' }}>
                    {activeMeds.filter(m => m.isOTC).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-sm font-bold px-4 py-2 rounded-full" style={{
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              color: 'var(--accent)'
            }}>
              {((activeMeds.filter(m => !m.isOTC).length / activeMeds.length) * 100).toFixed(0)}% Prescription
            </div>
          </div>
        </GlassCard>
      )}

      {/* NEW: Average Effectiveness */}
      {activeMeds.filter(m => m.effectiveness).length > 0 && (
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1" style={{ color: '#ffffff' }}>Average Medication Effectiveness</p>
              <p className="text-3xl font-bold" style={{ color: '#ffffff' }}>
                {(() => {
                  const rated = activeMeds.filter(m => m.effectiveness);
                  const avg = rated.reduce((sum, m) => sum + (m.effectiveness || 0), 0) / rated.length;
                  return avg.toFixed(1);
                })()}⭐
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                Based on {activeMeds.filter(m => m.effectiveness).length} rated medication(s)
              </p>
            </div>
            <div className={`text-xs font-bold px-4 py-2 rounded-full ${(() => {
              const rated = activeMeds.filter(m => m.effectiveness);
              const avg = rated.reduce((sum, m) => sum + (m.effectiveness || 0), 0) / rated.length;
              if (avg >= 4) return 'bg-green-500 text-white';
              if (avg >= 3) return 'bg-yellow-500 text-black';
              return 'bg-red-500 text-white';
            })()}`}>
              {(() => {
                const rated = activeMeds.filter(m => m.effectiveness);
                const avg = rated.reduce((sum, m) => sum + (m.effectiveness || 0), 0) / rated.length;
                if (avg >= 4) return 'Very Effective';
                if (avg >= 3) return 'Moderately Effective';
                return 'Low Effectiveness';
              })()}
            </div>
          </div>
        </GlassCard>
      )}

      {/* View Mode Tabs */}
      <div className="flex space-x-2">
        <button
          onClick={() => setViewMode('active')}
          className={`px-4 py-2 rounded-lg font-bold transition-all ${
            viewMode === 'active'
              ? 'bg-purple-500'
              : 'glass-button'
          }`}
          style={{ color: '#ffffff' }}
        >
          Active ({activeMeds.length})
        </button>
        <button
          onClick={() => setViewMode('inactive')}
          className={`px-4 py-2 rounded-lg font-bold transition-all ${
            viewMode === 'inactive'
              ? 'bg-gray-500'
              : 'glass-button'
          }`}
          style={{ color: '#ffffff' }}
        >
          Inactive ({inactiveMeds.length})
        </button>
        <button
          onClick={() => setViewMode('all')}
          className={`px-4 py-2 rounded-lg font-bold transition-all ${
            viewMode === 'all'
              ? 'bg-blue-500'
              : 'glass-button'
          }`}
          style={{ color: '#ffffff' }}
        >
          All ({medications.length})
        </button>
      </div>

      {/* Medications Grid */}
      {displayedMeds.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedMeds.map((medication) => (
            <MedicationCard key={medication.id} medication={medication} />
          ))}
        </div>
      ) : (
        <GlassCard>
          <div className="text-center py-12">
            <Pill className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="font-bold" style={{ color: '#ffffff' }}>
              {viewMode === 'active'
                ? 'No active medications'
                : viewMode === 'inactive'
                ? 'No inactive medications'
                : 'No medications added yet'}
            </p>
            {viewMode !== 'all' && (
              <Button
                className="mt-4"
                onClick={() => {
                  reset({
                    reminderEnabled: true,
                    startDate: new Date().toISOString().split('T')[0],
                  });
                  setEditingMed(null);
                  setIsModalOpen(true);
                }}
              >
                Add your first medication
              </Button>
            )}
          </div>
        </GlassCard>
      )}

        </>
      )}

      {/* Adherence & Stats Tab Content */}
      {activeTab === 'adherence' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* 1. NEW: Radial Progress "Adherence Clock" */}
            <GlassCard className="flex items-center justify-center p-6">
              <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
                {/* Background Circle */}
                <svg className="absolute inset-0" width="160" height="160">
                  <defs>
                    <linearGradient id="radialBg" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#374151" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#1f2937" stopOpacity={0.3} />
                    </linearGradient>
                    <linearGradient id="radialProgress" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={overallAdherencePercentage >= 90 ? '#10b981' : overallAdherencePercentage >= 75 ? '#3b82f6' : overallAdherencePercentage >= 50 ? '#f59e0b' : '#ef4444'} stopOpacity={1} />
                      <stop offset="100%" stopColor={overallAdherencePercentage >= 90 ? '#059669' : overallAdherencePercentage >= 75 ? '#2563eb' : overallAdherencePercentage >= 50 ? '#d97706' : '#dc2626'} stopOpacity={1} />
                    </linearGradient>
                    <filter id="radialGlow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  {/* Background ring */}
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="url(#radialBg)"
                    strokeWidth="12"
                  />
                  {/* Progress ring */}
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="url(#radialProgress)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 70}`}
                    strokeDashoffset={`${2 * Math.PI * 70 * (1 - overallAdherencePercentage / 100)}`}
                    transform="rotate(-90 80 80)"
                    filter="url(#radialGlow)"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                {/* Center content */}
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <Target className="h-6 w-6 mb-1 text-purple-400" />
                  <div className="text-2xl font-bold text-white">
                    {Math.round(overallAdherencePercentage)}%
                  </div>
                  <div className="text-xs text-gray-300 mt-1">Adherence</div>
                </div>
              </div>
            </GlassCard>

            {/* Medication Score Card */}
            <div className={`${scoreColor.bg} ${scoreColor.text} rounded-xl p-4 shadow-lg border-2 ${scoreColor.border} transform hover:scale-105 transition-transform duration-300`}>
              <div className="flex items-center justify-center gap-3">
                <Trophy className="h-8 w-8" />
                <div className="text-center">
                  <div className="text-sm font-semibold opacity-90">Medication Score</div>
                  <div className="text-3xl font-bold">
                    {adherenceScore.totalScore}
                    <span className="text-lg opacity-75">/{adherenceScore.maxPossibleScore}</span>
                  </div>
                  <div className="text-xs opacity-80 mt-1">
                    {adherenceScore.daysLogged}/{adherenceScore.daysInMonth} days
                    {adherenceScore.isPerfect && (
                      <span className="ml-2">
                        <Award className="inline h-4 w-4 animate-pulse" />
                      </span>
                    )}
                  </div>
                  {adherenceScore.isPerfect && (
                    <div className="text-xs font-semibold mt-1 animate-pulse">
                      Perfect Month! +{adherenceScore.bonusPoints} Bonus
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 8. NEW: Circular Progress Rings - Per Medication Adherence */}
            <GlassCard className="p-4">
              <h4 className="text-sm font-bold text-white mb-3 text-center">Current Month by Medication</h4>
              <div className="flex flex-wrap gap-3 justify-center">
                {medicationRingsData.slice(0, 3).map(med => (
                  <div key={med.id} className="flex flex-col items-center">
                    <div className="relative flex items-center justify-center" style={{ width: 60, height: 60 }}>
                      <svg className="absolute inset-0" width="60" height="60">
                        <circle
                          cx="30"
                          cy="30"
                          r="25"
                          fill="none"
                          stroke="#374151"
                          strokeWidth="5"
                          opacity={0.3}
                        />
                        <circle
                          cx="30"
                          cy="30"
                          r="25"
                          fill="none"
                          stroke={med.color}
                          strokeWidth="5"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 25}`}
                          strokeDashoffset={`${2 * Math.PI * 25 * (1 - med.adherence / 100)}`}
                          transform="rotate(-90 30 30)"
                          className="transition-all duration-500"
                        />
                      </svg>
                      <div className="absolute text-xs font-bold text-white">
                        {Math.round(med.adherence)}%
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300 mt-1 text-center max-w-[60px] truncate">{med.name}</div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Date Range Selector */}
          <GlassCard>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Date Range</h3>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="glass-input"
                />
                <span className="text-white self-center">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="glass-input"
                />
              </div>
            </div>
          </GlassCard>

          {/* Charts */}
          {chartData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlassCard>
                <h3 className="text-lg font-semibold text-white mb-4">Medication Adherence Trend</h3>
                <div className="mb-2 flex flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10b981' }}></div>
                    <span className="text-white">All Taken (100%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
                    <span className="text-white">Mostly Taken (50-99%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
                    <span className="text-white">Partially Taken (1-49%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }}></div>
                    <span className="text-white">Missed (0%)</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <defs>
                      {/* 3D Bar gradients for adherence */}
                      <linearGradient id="medBarGradientGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={1}/>
                        <stop offset="50%" stopColor="#10b981" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#059669" stopOpacity={1}/>
                      </linearGradient>
                      <linearGradient id="medBarGradientYellow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fde047" stopOpacity={1}/>
                        <stop offset="50%" stopColor="#facc15" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#eab308" stopOpacity={1}/>
                      </linearGradient>
                      <linearGradient id="medBarGradientOrange" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity={1}/>
                        <stop offset="50%" stopColor="#f59e0b" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#d97706" stopOpacity={1}/>
                      </linearGradient>
                      <linearGradient id="medBarGradientRed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f87171" stopOpacity={1}/>
                        <stop offset="50%" stopColor="#ef4444" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#dc2626" stopOpacity={1}/>
                      </linearGradient>
                      {/* 3D shadow filter */}
                      <filter id="medBarShadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                        <feOffset dx="0" dy="4" result="offsetblur"/>
                        <feComponentTransfer>
                          <feFuncA type="linear" slope="0.5"/>
                        </feComponentTransfer>
                        <feMerge>
                          <feMergeNode/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }} tickLine={{ stroke: '#6b7280' }} />
                    <YAxis stroke="#9ca3af" domain={[0, 100]} tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }} tickLine={{ stroke: '#6b7280' }} />
                    <Tooltip
                      contentStyle={{
                        background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))',
                        border: '2px solid #a855f7',
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(168, 85, 247, 0.3)',
                        backdropFilter: 'blur(10px)'
                      }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}
                      cursor={{ fill: 'rgba(168, 85, 247, 0.1)' }}
                      formatter={(value, name, props: any) => {
                        if (name === 'adherenceRate') {
                          const entry = props.payload;
                          return [`${(value as number).toFixed(0)}% (${entry.takenCount}/${entry.totalCount})`, 'Adherence'];
                        }
                        return [value, name];
                      }}
                    />
                    <Bar dataKey="adherenceRate" name="Adherence" radius={[8, 8, 0, 0]} barSize={35} filter="url(#medBarShadow)">
                      {chartData.map((entry, index) => {
                        const rate = entry.adherenceRate;
                        const gradientId = rate >= 80 ? 'medBarGradientGreen' :
                                           rate >= 50 ? 'medBarGradientYellow' :
                                           rate >= 1 ? 'medBarGradientOrange' :
                                           'medBarGradientRed';
                        return (
                          <Cell key={`cell-${index}`} fill={`url(#${gradientId})`} stroke={entry.fill} strokeWidth={2} />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>

              {adherenceCategoryData.length > 0 && (
                <GlassCard>
                  <h3 className="text-lg font-semibold text-white mb-4">Adherence Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <defs>
                        {/* 3D pie slice gradients */}
                        <radialGradient id="medPieGradientGreen">
                          <stop offset="0%" stopColor="#34d399" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#059669" stopOpacity={1}/>
                        </radialGradient>
                        <radialGradient id="medPieGradientYellow">
                          <stop offset="0%" stopColor="#fde047" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#eab308" stopOpacity={1}/>
                        </radialGradient>
                        <radialGradient id="medPieGradientOrange">
                          <stop offset="0%" stopColor="#fbbf24" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#d97706" stopOpacity={1}/>
                        </radialGradient>
                        <radialGradient id="medPieGradientRed">
                          <stop offset="0%" stopColor="#f87171" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#dc2626" stopOpacity={1}/>
                        </radialGradient>
                        {/* 3D shadow for pie */}
                        <filter id="medPieShadow" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
                          <feOffset dx="0" dy="4" result="offsetblur"/>
                          <feComponentTransfer>
                            <feFuncA type="linear" slope="0.4"/>
                          </feComponentTransfer>
                          <feMerge>
                            <feMergeNode/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      <Pie
                        data={adherenceCategoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={{
                          stroke: '#9ca3af',
                          strokeWidth: 2
                        }}
                        label={({ name, percent }: any) => `${name}: ${((percent as number) * 100).toFixed(0)}%`}
                        outerRadius={90}
                        innerRadius={20}
                        fill="#8884d8"
                        dataKey="value"
                        paddingAngle={2}
                        filter="url(#medPieShadow)"
                      >
                        {adherenceCategoryData.map((entry, index) => {
                          const gradientId = entry.name.includes('Fully') ? 'medPieGradientGreen' :
                                             entry.name.includes('Mostly') ? 'medPieGradientYellow' :
                                             entry.name.includes('Partially') ? 'medPieGradientOrange' :
                                             'medPieGradientRed';
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={`url(#${gradientId})`}
                              stroke={entry.color}
                              strokeWidth={3}
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))',
                          border: '2px solid #a855f7',
                          borderRadius: '12px',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(168, 85, 247, 0.3)',
                          backdropFilter: 'blur(10px)'
                        }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </GlassCard>
              )}
            </div>
          ) : (
            <GlassCard>
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-white font-bold">No adherence data available for the selected date range</p>
                <p className="text-gray-400 mt-2">
                  Log medication doses from the calendar or dashboard to track adherence
                </p>
              </div>
            </GlassCard>
          )}

          {/* ========== NEW VISUALIZATIONS ========== */}

          {/* 3. Cost Trend Line Chart & 4. Stacked Area Chart */}
          {chartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 3. Cost Trend */}
              {costTrendData.some(d => d.cost > 0) && (
                <GlassCard>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                    <h3 className="text-lg font-semibold text-white">Monthly Medication Costs</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={costTrendData}>
                      <defs>
                        <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                        </linearGradient>
                        <filter id="costShadow">
                          <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                          <feOffset dx="0" dy="2" result="offsetblur"/>
                          <feComponentTransfer>
                            <feFuncA type="linear" slope="0.5"/>
                          </feComponentTransfer>
                          <feMerge>
                            <feMergeNode/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                      <XAxis dataKey="month" stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 11, fontWeight: 600 }} />
                      <YAxis stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }} />
                      <Tooltip
                        contentStyle={{
                          background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))',
                          border: '2px solid #10b981',
                          borderRadius: '12px',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                          backdropFilter: 'blur(10px)'
                        }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                        formatter={(value: any) => [`$${value}`, 'Cost']}
                      />
                      <Line
                        type="monotone"
                        dataKey="cost"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                        activeDot={{ r: 7 }}
                        filter="url(#costShadow)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </GlassCard>
              )}

              {/* 4. Stacked Area Chart - Multi-Med Adherence */}
              {stackedAdherenceData.length > 0 && activeMeds.length > 1 && (
                <GlassCard>
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="h-5 w-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Adherence by Medication</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={stackedAdherenceData}>
                      <defs>
                        {activeMeds.slice(0, 5).map((med, idx) => {
                          const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
                          return (
                            <linearGradient key={med.id} id={`areaGradient${idx}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={colors[idx]} stopOpacity={0.8}/>
                              <stop offset="95%" stopColor={colors[idx]} stopOpacity={0.1}/>
                            </linearGradient>
                          );
                        })}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                      <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 11 }} />
                      <YAxis stroke="#9ca3af" domain={[0, 100]} tick={{ fill: '#d1d5db', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))',
                          border: '2px solid #a855f7',
                          borderRadius: '12px',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                          backdropFilter: 'blur(10px)'
                        }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                        formatter={(value: any) => [`${value.toFixed(0)}%`, '']}
                      />
                      {activeMeds.slice(0, 5).map((med, idx) => {
                        const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
                        return (
                          <Area
                            key={med.id}
                            type="monotone"
                            dataKey={med.name}
                            stackId="1"
                            stroke={colors[idx]}
                            fill={`url(#areaGradient${idx})`}
                            strokeWidth={2}
                          />
                        );
                      })}
                    </AreaChart>
                  </ResponsiveContainer>
                </GlassCard>
              )}
            </div>
          )}

          {/* 5. Heatmap Calendar - Daily Adherence */}
          {heatmapData.some(d => d.adherenceRate !== null) && (
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Monthly Adherence Calendar</h3>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {heatmapData.map((day) => {
                  const getColor = (rate: number | null) => {
                    if (rate === null) return 'rgba(55, 65, 81, 0.3)'; // No data
                    if (rate >= 100) return '#10b981'; // Perfect
                    if (rate >= 75) return '#3b82f6';  // Good
                    if (rate >= 50) return '#f59e0b';  // Fair
                    return '#ef4444'; // Poor
                  };

                  return (
                    <div
                      key={day.day}
                      className="relative aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 hover:shadow-lg group"
                      style={{
                        backgroundColor: getColor(day.adherenceRate),
                        boxShadow: day.adherenceRate !== null ? '0 0 10px rgba(0,0,0,0.3)' : 'none'
                      }}
                      title={`${day.date}: ${day.adherenceRate !== null ? `${day.adherenceRate.toFixed(0)}% (${day.takenCount}/${day.totalCount})` : 'No data'}`}
                    >
                      <span className="text-xs font-bold text-white">{day.day}</span>
                      {day.adherenceRate === 100 && (
                        <Zap className="h-3 w-3 text-yellow-300 animate-pulse absolute -top-1 -right-1" />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
                  <span className="text-gray-300">Poor (&lt;50%)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
                  <span className="text-gray-300">Fair (50-74%)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
                  <span className="text-gray-300">Good (75-99%)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }}></div>
                  <span className="text-gray-300">Perfect (100%)</span>
                </div>
              </div>
            </GlassCard>
          )}

          {/* 2. Medication Timeline & 6. Effectiveness Radar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 2. Medication Timeline (Horizontal Gantt) */}
            {timelineData.length > 0 && (
              <GlassCard>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-white">Medication Timeline</h3>
                </div>
                <div className="space-y-3">
                  {timelineData.slice(0, 6).map((med) => (
                    <div key={med.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-white truncate flex-1">{med.name}</span>
                        <span className="text-gray-400 text-xs">
                          {format(med.start, 'MMM yyyy')} - {med.endDate ? format(med.end, 'MMM yyyy') : 'Ongoing'}
                        </span>
                      </div>
                      <div className="relative h-6 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${med.progress}%`,
                            background: med.isActive
                              ? 'linear-gradient(90deg, #8b5cf6, #a855f7)'
                              : 'linear-gradient(90deg, #6b7280, #9ca3af)',
                            boxShadow: med.isActive ? '0 0 10px rgba(168, 85, 247, 0.5)' : 'none'
                          }}
                        >
                          <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                        </div>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                          {Math.round(med.progress)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* 6. Effectiveness Radar Chart */}
            {radarData.length > 0 && (
              <GlassCard>
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-5 w-5 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-white">Medication Performance</h3>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={[
                    { subject: 'Effectiveness', A: radarData[0]?.effectiveness || 0, B: radarData[1]?.effectiveness || 0, C: radarData[2]?.effectiveness || 0 },
                    { subject: 'Adherence', A: radarData[0]?.adherence || 0, B: radarData[1]?.adherence || 0, C: radarData[2]?.adherence || 0 },
                    { subject: 'Value', A: radarData[0]?.costValue || 0, B: radarData[1]?.costValue || 0, C: radarData[2]?.costValue || 0 },
                    { subject: 'Tolerability', A: radarData[0]?.sideEffects || 0, B: radarData[1]?.sideEffects || 0, C: radarData[2]?.sideEffects || 0 },
                  ]}>
                    <defs>
                      <linearGradient id="radarGradient1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                      </linearGradient>
                      <linearGradient id="radarGradient2">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      </linearGradient>
                      <linearGradient id="radarGradient3">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#9ca3af' }} />
                    {radarData[0] && <Radar name={radarData[0].medication} dataKey="A" stroke="#8b5cf6" fill="url(#radarGradient1)" strokeWidth={2} />}
                    {radarData[1] && <Radar name={radarData[1].medication} dataKey="B" stroke="#3b82f6" fill="url(#radarGradient2)" strokeWidth={2} />}
                    {radarData[2] && <Radar name={radarData[2].medication} dataKey="C" stroke="#10b981" fill="url(#radarGradient3)" strokeWidth={2} />}
                    <Tooltip
                      contentStyle={{
                        background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))',
                        border: '2px solid #a855f7',
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                        backdropFilter: 'blur(10px)'
                      }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center mt-2 text-xs">
                  {radarData.map((med, idx) => {
                    const colors = ['#8b5cf6', '#3b82f6', '#10b981'];
                    return (
                      <div key={idx} className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: colors[idx] }}></div>
                        <span className="text-gray-300">{med.medication}</span>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            )}
          </div>
        </>
      )}

      {/* Add/Edit Medication Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          reset();
          setEditingMed(null);
          setMedicationName('');
          setSelectedMedicationInfo(null);
        }}
        title={editingMed ? 'Edit Medication' : 'Add Medication'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit, (errors) => {
          console.error('Form validation errors:', errors);
          console.log('Current form values:', {
            name: medicationName,
            dosage: document.querySelector('select[name="dosage"], input[name="dosage"]')?.value,
            frequency: document.querySelector('select[name="frequency"]')?.value,
            startDate: document.querySelector('input[name="startDate"]')?.value
          });
          toast.error('Please fill in all required fields');
        })} className="space-y-4">
          {/* Medication Name Autocomplete */}
          <MedicationAutocomplete
            value={medicationName}
            onChange={(value) => {
              setMedicationName(value);
              setValue('name', value, { shouldValidate: true, shouldDirty: true });
            }}
            onMedicationSelect={(medInfo) => {
              setSelectedMedicationInfo(medInfo);
            }}
            error={errors.name?.message}
          />

          {/* Side Effect Warnings - Show after medication is selected */}
          {selectedMedicationInfo && (
            <SideEffectWarnings medication={selectedMedicationInfo} />
          )}

          {/* Dosage Selection - Dynamic based on selected medication */}
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: '#ffffff' }}>
              Dosage *
            </label>
            {selectedMedicationInfo && selectedMedicationInfo.commonDosages.length > 0 ? (
              <select
                {...register('dosage')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cobalt-500 focus:border-cobalt-500 outline-none font-bold bg-white"
                style={{ color: '#000000' }}
              >
                <option value="">Select dosage...</option>
                {selectedMedicationInfo.commonDosages.map((dosage) => (
                  <option key={dosage} value={dosage}>
                    {dosage}
                  </option>
                ))}
                <option value="custom">Custom dosage...</option>
              </select>
            ) : (
              <input
                type="text"
                {...register('dosage')}
                placeholder="e.g., 81mg"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cobalt-500 focus:border-cobalt-500 outline-none font-bold"
                style={{ color: '#000000' }}
              />
            )}
            {errors.dosage?.message && (
              <p className="mt-1 text-sm text-red-600 font-bold">{errors.dosage.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Frequency"
              error={errors.frequency?.message}
              options={[
                { value: 'Once daily', label: 'Once daily' },
                { value: 'Twice daily', label: 'Twice daily' },
                { value: 'Three times daily', label: 'Three times daily' },
                { value: 'Four times daily', label: 'Four times daily' },
                { value: 'Every 4 hours', label: 'Every 4 hours' },
                { value: 'Every 6 hours', label: 'Every 6 hours' },
                { value: 'Every 8 hours', label: 'Every 8 hours' },
                { value: 'Every 12 hours', label: 'Every 12 hours' },
                { value: 'As needed', label: 'As needed' },
                { value: 'Weekly', label: 'Weekly' },
                { value: 'Monthly', label: 'Monthly' },
              ]}
              {...register('frequency')}
            />

            <Select
              label="Time of Day (optional)"
              options={[
                { value: '', label: 'Not specified' },
                { value: 'Morning', label: 'Morning' },
                { value: 'Noon', label: 'Noon' },
                { value: 'Evening', label: 'Evening' },
                { value: 'Bedtime', label: 'Bedtime' },
                { value: 'With breakfast', label: 'With breakfast' },
                { value: 'With lunch', label: 'With lunch' },
                { value: 'With dinner', label: 'With dinner' },
                { value: 'Before meals', label: 'Before meals' },
                { value: 'After meals', label: 'After meals' },
              ]}
              {...register('timeOfDay')}
            />
          </div>

          <Input
            label="Prescribed By (optional)"
            placeholder="Doctor's name"
            icon={<User className="h-5 w-5" />}
            {...register('prescribedBy')}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              error={errors.startDate?.message}
              {...register('startDate')}
            />

            <Input
              label="End Date (optional)"
              type="date"
              hint="Leave blank for ongoing medication"
              {...register('endDate')}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold" style={{ color: '#ffffff' }}>
              Instructions (optional)
            </label>
            <textarea
              className="glass-input"
              rows={2}
              placeholder="e.g., Take with food, avoid alcohol"
              {...register('instructions')}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold" style={{ color: '#ffffff' }}>
              Side Effects to Watch (optional)
            </label>
            <textarea
              className="glass-input"
              rows={2}
              placeholder="e.g., May cause dizziness, nausea"
              {...register('sideEffects')}
            />
          </div>

          {/* NEW: Effectiveness Rating */}
          <div className="space-y-2">
            <label className="block text-sm font-bold" style={{ color: '#ffffff' }}>
              Effectiveness Rating (optional)
            </label>
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <label key={star} className="cursor-pointer">
                  <input
                    type="radio"
                    value={star}
                    {...register('effectiveness', { valueAsNumber: true })}
                    className="sr-only peer"
                  />
                  <span className="text-2xl peer-checked:text-yellow-400 text-gray-400 hover:text-yellow-300">
                    ⭐
                  </span>
                </label>
              ))}
              <span className="text-xs ml-2" style={{ color: '#ffffff', opacity: 0.7 }}>
                How well is it working?
              </span>
            </div>
          </div>

          {/* NEW: Monthly Cost */}
          <Input
            label="Monthly Cost (optional)"
            type="number"
            placeholder="0.00"
            step="0.01"
            min="0"
            hint="Track medication expenses"
            {...register('monthlyCost', { valueAsNumber: true })}
          />

          {/* NEW: OTC/Supplement Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isOTC"
              className="rounded border-gray-300"
              {...register('isOTC')}
            />
            <label htmlFor="isOTC" className="text-sm font-bold" style={{ color: '#ffffff' }}>
              This is an over-the-counter medication or supplement
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="reminderEnabled"
              className="rounded border-gray-300"
              {...register('reminderEnabled')}
            />
            <label htmlFor="reminderEnabled" className="text-sm font-bold" style={{ color: '#ffffff' }}>
              Enable reminders for this medication
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                reset();
                setEditingMed(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isLoading}>
              {editingMed ? 'Update Medication' : 'Add Medication'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
