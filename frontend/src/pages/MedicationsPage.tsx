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
  Award
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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
  effectiveness: z.number().min(1).max(5).optional(),
  isOTC: z.boolean().optional(),
  monthlyCost: z.number().min(0).optional(),
});

type MedicationFormData = z.infer<typeof medicationSchema>;

export function MedicationsPage() {
  const { user } = useAuth();
  const { selectedPatient, isViewingAsTherapist } = usePatientSelection();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [activeMeds, setActiveMeds] = useState<Medication[]>([]);
  const [inactiveMeds, setInactiveMeds] = useState<Medication[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'active' | 'inactive'>('active');
  const [activeTab, setActiveTab] = useState<'medications' | 'adherence'>('medications');

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

  const loadMedications = async () => {
    try {
      setIsLoading(true);
      // Use selected patient's userId if viewing as therapist, otherwise use own data
      const userId = isViewingAsTherapist && selectedPatient?.userId ? selectedPatient.userId : undefined;
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
      const userId = isViewingAsTherapist && selectedPatient?.userId ? selectedPatient.userId : undefined;
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
          // Include userId if therapist is adding for a selected patient
          ...(isViewingAsTherapist && selectedPatient?.userId && { userId: selectedPatient.userId })
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

  const MedicationCard = ({ medication }: { medication: Medication }) => (
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
          <div>
            <h3 className="text-lg font-bold" style={{ color: '#ffffff' }}>{medication.name}</h3>
            <p className="font-bold" style={{ color: '#ffffff' }}>{medication.dosage}</p>
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

  // Prepare chart data - one bar per date
  const chartData = Object.keys(logsByDate)
    .sort()
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

      {/* Patient Selection Banner */}
      {isViewingAsTherapist && selectedPatient && (
        <div className="glass rounded-xl p-4 border-2" style={{ borderColor: 'var(--accent)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <User className="h-6 w-6" style={{ color: 'var(--accent)' }} />
              <div>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Viewing medications for:</p>
                <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{selectedPatient.name}</p>
              </div>
            </div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>
              Therapist View
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>

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
            <div></div>

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

            <div></div>
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
                          return [`${value.toFixed(0)}% (${entry.takenCount}/${entry.totalCount})`, 'Adherence'];
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
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Medication Name Autocomplete */}
          <MedicationAutocomplete
            value={medicationName}
            onChange={(value) => {
              setMedicationName(value);
              setValue('name', value);
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
