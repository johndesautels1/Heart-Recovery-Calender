import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Dumbbell,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  Heart,
  Activity,
  Video,
  Image as ImageIcon,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  Info,
  ExternalLink,
  TrendingUp,
  Award,
  Target,
  User,
  Timer
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { RestTimer } from '../components/RestTimer';
import { useView } from '../contexts/ViewContext';
import { useAuth } from '../contexts/AuthContext';
import { usePatientSelection } from '../contexts/PatientSelectionContext';

interface Exercise {
  id: number;
  name: string;
  description?: string;
  category: string;
  difficulty: string;
  equipmentNeeded?: string;
  videoUrl?: string;
  imageUrl?: string;
  minPostOpWeek?: number;
  maxPostOpWeek?: number;
  contraindications?: string;
  instructions?: string;
  recoveryBenefit?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultDuration?: number;
  isActive: boolean;
  createdBy?: number;
}

interface Patient {
  id: number;
  name: string;
  surgeryDate?: string;
  isActive: boolean;
}

interface MonthlyStats {
  month: number;
  year: number;
  totalSessions: number;
  totalScore: number;
  bonusPoints: number;
  finalScore: number;
  percentageScore: number;
  maxPossibleScore: number;
  pointsPerSession: number;
  performanceBreakdown: {
    noShow: number;
    completed: number;
    metGoals: number;
    exceededGoals: number;
  };
  weeklyStats: Record<number, { sessions: number; score: number }>;
  logs: any[];
}

type SafetyLevel = 'safe' | 'upcoming' | 'not-safe' | 'no-patient';

interface CreateExerciseInput {
  name: string;
  description?: string;
  category: string;
  difficulty: string;
  equipmentNeeded?: string;
  videoUrl?: string;
  imageUrl?: string;
  minPostOpWeek?: number;
  maxPostOpWeek?: number;
  contraindications?: string;
  instructions?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultDuration?: number;
}

const categories = [
  { value: 'upper_body', label: 'Upper Body', icon: '💪' },
  { value: 'lower_body', label: 'Lower Body', icon: '🦵' },
  { value: 'cardio', label: 'Cardio', icon: '❤️' },
  { value: 'flexibility', label: 'Flexibility', icon: '🤸' },
  { value: 'balance', label: 'Balance', icon: '⚖️' },
  { value: 'breathing', label: 'Breathing', icon: '🫁' },
  { value: 'core', label: 'Core', icon: '🎯' },
];

const difficulties = [
  { value: 'beginner', label: 'Beginner', color: 'green' },
  { value: 'intermediate', label: 'Intermediate', color: 'yellow' },
  { value: 'advanced', label: 'Advanced', color: 'red' },
];

type MainTab = 'exercises' | 'activities' | 'stats';

// Helper function to categorize exercises as activities vs structured exercises
const isActivity = (exercise: Exercise): boolean => {
  const activityKeywords = [
    'Tennis', 'Pickleball', 'Cycling', 'Hiking', 'Dancing', 'Golf',
    'Kayaking', 'Bowling', 'Swimming', 'Water Aerobics', 'Group Exercise Class',
    'Jogging', 'Running', 'Sports'
  ];

  return activityKeywords.some(keyword =>
    exercise.name.toLowerCase().includes(keyword.toLowerCase())
  );
};

export function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [selectedSafetyLevel, setSelectedSafetyLevel] = useState<string>('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [schedulingExercise, setSchedulingExercise] = useState<Exercise | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleDuration, setScheduleDuration] = useState(30);
  const [schedulePatientId, setSchedulePatientId] = useState('');
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [viewingExercise, setViewingExercise] = useState<Exercise | null>(null);
  const [isRestTimerOpen, setIsRestTimerOpen] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>('exercises');
  const [statsPatientId, setStatsPatientId] = useState<string>('');
  const [statsMonth, setStatsMonth] = useState<number>(new Date().getMonth() + 1);
  const [statsYear, setStatsYear] = useState<number>(new Date().getFullYear());
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [isCreateLogModalOpen, setIsCreateLogModalOpen] = useState(false);
  const [newLogDate, setNewLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [newLogScore, setNewLogScore] = useState<number>(8);
  const [newLogNotes, setNewLogNotes] = useState('');
  const { isTherapistView } = useView();
  const { user } = useAuth();
  const { selectedPatient, setSelectedPatient, isViewingAsTherapist } = usePatientSelection();
  const navigate = useNavigate();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<CreateExerciseInput>();

  useEffect(() => {
    loadExercises();
    loadPatients();
  }, []);

  useEffect(() => {
    filterExercises();
  }, [exercises, searchTerm, selectedCategory, selectedDifficulty, selectedSafetyLevel, selectedPatientId, mainTab]);

  useEffect(() => {
    if (mainTab === 'stats' && statsPatientId) {
      loadMonthlyStats();
    }
  }, [mainTab, statsPatientId, statsMonth, statsYear]);

  const loadExercises = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/exercises', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load exercises');

      const data = await response.json();
      setExercises(data.data || []);
    } catch (error) {
      console.error('Error loading exercises:', error);
      toast.error('Failed to load exercises');
    } finally {
      setLoading(false);
    }
  };

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
      setPatients(data.data || []);
    } catch (error) {
      console.error('Error loading patients:', error);
      toast.error('Failed to load patients');
    }
  };

  const loadMonthlyStats = async () => {
    if (!statsPatientId) return;

    setLoadingStats(true);
    try {
      const token = localStorage.getItem('token');
      const url = `/api/events/stats/monthly?patientId=${statsPatientId}&year=${statsYear}&month=${statsMonth}`;
      console.log('📊 Loading stats from:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Stats API error:', response.status, errorData);
        throw new Error('Failed to load monthly stats');
      }

      const data = await response.json();
      console.log('✅ Stats data received:', data);
      console.log('📈 Total Sessions:', data.totalSessions);
      console.log('🎯 Performance Breakdown:', data.performanceBreakdown);
      console.log('📅 Weekly Stats:', data.weeklyStats);
      setMonthlyStats(data);
    } catch (error) {
      console.error('Error loading monthly stats:', error);
      toast.error('Failed to load monthly statistics');
      setMonthlyStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  const calculatePostOpWeek = (surgeryDate: string): number => {
    const surgery = new Date(surgeryDate);
    const today = new Date();
    const diffTime = today.getTime() - surgery.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1; // Week 1 starts on day 0
  };

  const getSafetyLevel = (exercise: Exercise): SafetyLevel => {
    if (!selectedPatientId) return 'no-patient';

    const patient = patients.find(p => p.id === parseInt(selectedPatientId));
    if (!patient || !patient.surgeryDate) return 'no-patient';

    const currentWeek = calculatePostOpWeek(patient.surgeryDate);
    const minWeek = exercise.minPostOpWeek || 0;
    const maxWeek = exercise.maxPostOpWeek;

    // Check if exercise is past its max week
    if (maxWeek !== null && maxWeek !== undefined && currentWeek > maxWeek) {
      return 'not-safe';
    }

    // Check if exercise is safe for current week
    if (currentWeek >= minWeek) {
      return 'safe';
    }

    // Check if exercise is upcoming (within 1 week)
    if (currentWeek === minWeek - 1) {
      return 'upcoming';
    }

    // Exercise is not yet safe
    return 'not-safe';
  };

  const getSafetyLevelColor = (level: SafetyLevel) => {
    switch (level) {
      case 'safe': return { bg: '#10b98120', border: '#10b981', text: '#10b981', label: 'Safe Now' };
      case 'upcoming': return { bg: '#f59e0b20', border: '#f59e0b', text: '#f59e0b', label: 'Upcoming (Next Week)' };
      case 'not-safe': return { bg: '#ef444420', border: '#ef4444', text: '#ef4444', label: 'Not Yet Safe' };
      case 'no-patient': return { bg: '#6b728020', border: '#6b7280', text: '#6b7280', label: 'Select Patient' };
    }
  };

  const filterExercises = () => {
    let filtered = exercises;

    // Filter by main tab (exercises vs activities)
    if (mainTab === 'exercises') {
      filtered = filtered.filter(ex => !isActivity(ex));
    } else if (mainTab === 'activities') {
      filtered = filtered.filter(ex => isActivity(ex));
    }

    if (searchTerm) {
      filtered = filtered.filter(ex =>
        ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(ex => ex.category === selectedCategory);
    }

    if (selectedDifficulty) {
      filtered = filtered.filter(ex => ex.difficulty === selectedDifficulty);
    }

    if (selectedSafetyLevel && selectedPatientId) {
      filtered = filtered.filter(ex => getSafetyLevel(ex) === selectedSafetyLevel);
    }

    setFilteredExercises(filtered);
  };

  const onSubmit = async (data: CreateExerciseInput) => {
    try {
      const token = localStorage.getItem('token');
      const url = editingExercise
        ? `/api/exercises/${editingExercise.id}`
        : '/api/exercises';
      const method = editingExercise ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to save exercise');

      toast.success(editingExercise ? 'Exercise updated successfully' : 'Exercise added successfully');
      setIsAddModalOpen(false);
      setEditingExercise(null);
      reset();
      await loadExercises();
    } catch (error) {
      console.error('Error saving exercise:', error);
      toast.error('Failed to save exercise');
    }
  };

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    reset({
      name: exercise.name,
      description: exercise.description || '',
      category: exercise.category,
      difficulty: exercise.difficulty,
      equipmentNeeded: exercise.equipmentNeeded || '',
      videoUrl: exercise.videoUrl || '',
      imageUrl: exercise.imageUrl || '',
      minPostOpWeek: exercise.minPostOpWeek,
      maxPostOpWeek: exercise.maxPostOpWeek,
      contraindications: exercise.contraindications || '',
      instructions: exercise.instructions || '',
      defaultSets: exercise.defaultSets,
      defaultReps: exercise.defaultReps,
      defaultDuration: exercise.defaultDuration,
    });
    setIsAddModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this exercise?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/exercises/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete exercise');

      toast.success('Exercise deleted successfully');
      await loadExercises();
    } catch (error) {
      console.error('Error deleting exercise:', error);
      toast.error('Failed to delete exercise');
    }
  };

  const handleToggleActive = async (exercise: Exercise) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/exercises/${exercise.id}/toggle-active`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to toggle exercise status');

      toast.success('Exercise ' + (exercise.isActive ? 'deactivated' : 'activated') + ' successfully');
      await loadExercises();
    } catch (error) {
      console.error('Error toggling exercise status:', error);
      toast.error('Failed to update exercise status');
    }
  };

  const handleAddNew = () => {
    setEditingExercise(null);
    reset({
      name: '',
      description: '',
      category: 'cardio',
      difficulty: 'beginner',
      equipmentNeeded: '',
      videoUrl: '',
      imageUrl: '',
      minPostOpWeek: undefined,
      maxPostOpWeek: undefined,
      contraindications: '',
      instructions: '',
      defaultSets: undefined,
      defaultReps: undefined,
      defaultDuration: undefined,
    });
    setIsAddModalOpen(true);
  };

  const handleScheduleExercise = (exercise: Exercise) => {
    setSchedulingExercise(exercise);
    setSchedulePatientId(selectedPatientId || '');
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleDate(tomorrow.toISOString().split('T')[0]);
    setScheduleDuration(exercise.defaultDuration || 30);
    setIsScheduleModalOpen(true);
  };

  const handleViewInfo = (exercise: Exercise) => {
    setViewingExercise(exercise);
    setIsInfoModalOpen(true);
  };

  const handleScheduleSubmit = async () => {
    if (!schedulingExercise || !scheduleDate || !schedulePatientId) {
      toast.error('Please select a patient and date');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // Combine date and time
      const startDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
      const endDateTime = new Date(startDateTime.getTime() + scheduleDuration * 60000);

      // Fetch user's calendars and patient's calendars
      const [therapistCalResponse, patientCalResponse] = await Promise.all([
        fetch('/api/calendars', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`/api/calendars?userId=${schedulePatientId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      const therapistCals = await therapistCalResponse.json();
      const patientCals = await patientCalResponse.json();

      // Find or create exercise calendars
      let therapistCalendar = therapistCals.data?.find((c: any) => c.type === 'exercise');
      let patientCalendar = patientCals.data?.find((c: any) => c.type === 'exercise');

      // Create therapist calendar if not exists
      if (!therapistCalendar) {
        const createResponse = await fetch('/api/calendars', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: 'Exercise Calendar',
            type: 'exercise',
            color: '#10b981',
          }),
        });
        therapistCalendar = await createResponse.json();
      }

      // Create patient calendar if not exists
      if (!patientCalendar) {
        const createResponse = await fetch('/api/calendars', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: parseInt(schedulePatientId),
            name: 'Exercise Calendar',
            type: 'exercise',
            color: '#10b981',
          }),
        });
        patientCalendar = await createResponse.json();
      }

      // Create event ONLY on patient's calendar
      const patientName = patients.find(p => p.id === parseInt(schedulePatientId))?.name || 'Patient';

      // Event for patient's calendar
      const eventData = {
        calendarId: patientCalendar.id,
        title: schedulingExercise.name,
        description: schedulingExercise.description || '',
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        exerciseId: schedulingExercise.id,
        patientId: parseInt(schedulePatientId),
        status: 'scheduled',
      };

      // Create the event
      await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(eventData),
      });

      toast.success(
        (t) => (
          <div className="flex flex-col space-y-2">
            <span>Exercise "{schedulingExercise.name}" scheduled for {patientName}</span>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                navigate('/calendar');
              }}
              className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
            >
              View in Calendar →
            </button>
          </div>
        ),
        { duration: 6000 }
      );
      setIsScheduleModalOpen(false);
      setSchedulingExercise(null);
    } catch (error) {
      console.error('Error scheduling exercise:', error);
      toast.error('Failed to schedule exercise');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '#10b981';
      case 'intermediate': return '#f59e0b';
      case 'advanced': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getCategoryIcon = (category: string) => {
    return categories.find(c => c.value === category)?.icon || '🏃';
  };

  // Only therapists and admins can access this page
  if (user?.role !== 'therapist' && user?.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="glass rounded-xl p-12 text-center">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--ink)' }}>Therapist/Admin Access Only</h3>
          <p style={{ color: 'var(--ink)' }} className="opacity-70">
            Only therapists and administrators can access the Exercise Library
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-xl" style={{ color: 'var(--ink)' }}>Loading exercises...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gradient mb-2">Exercise Library</h1>
          <p style={{ color: 'var(--ink)' }} className="text-sm">
            Manage exercises and create prescriptions for your patients
          </p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="h-5 w-5 mr-2" />
          Add Exercise
        </Button>
      </div>

      {/* Patient Selection Banner */}
      {isViewingAsTherapist && selectedPatient && (
        <div className="glass rounded-xl p-4 border-2 mb-6" style={{ borderColor: 'var(--accent)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <User className="h-6 w-6" style={{ color: 'var(--accent)' }} />
              <div>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Viewing exercises for:</p>
                <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{selectedPatient.name}</p>
              </div>
            </div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>
              Therapist View
            </div>
          </div>
        </div>
      )}

      {/* Main Tabs */}
      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => setMainTab('exercises')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            mainTab === 'exercises'
              ? 'glass text-white'
              : 'bg-white/5 hover:bg-white/10'
          }`}
          style={mainTab === 'exercises' ? { color: 'var(--accent)' } : { color: 'var(--ink)' }}
        >
          <Dumbbell className="inline h-5 w-5 mr-2" />
          Exercises
        </button>
        <button
          onClick={() => setMainTab('activities')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            mainTab === 'activities'
              ? 'glass text-white'
              : 'bg-white/5 hover:bg-white/10'
          }`}
          style={mainTab === 'activities' ? { color: 'var(--accent)' } : { color: 'var(--ink)' }}
        >
          <Activity className="inline h-5 w-5 mr-2" />
          Activities
        </button>
        <button
          onClick={() => setMainTab('stats')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            mainTab === 'stats'
              ? 'glass text-white'
              : 'bg-white/5 hover:bg-white/10'
          }`}
          style={mainTab === 'stats' ? { color: 'var(--accent)' } : { color: 'var(--ink)' }}
        >
          <CheckCircle2 className="inline h-5 w-5 mr-2" />
          Stats & Progress
        </button>
      </div>

      {/* Show Filters and Exercise List for exercises/activities tabs */}
      {mainTab !== 'stats' && (
        <div>
          {/* Filters */}
          <div className="glass rounded-xl p-6 mb-6">
        {/* Patient Selector & Current Week Display */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
            Select Patient (for safety color-coding)
          </label>
          <div className="flex items-center space-x-4">
            <select
              className="glass-input flex-1"
              value={selectedPatientId}
              onChange={(e) => {
                const patientId = e.target.value;
                setSelectedPatientId(patientId);
                // Update context to sync the "viewing exercises for" banner
                if (patientId) {
                  const patient = patients.find(p => p.id === parseInt(patientId));
                  if (patient) {
                    setSelectedPatient(patient);
                  }
                } else {
                  setSelectedPatient(null);
                }
              }}
            >
              <option value="">No Patient Selected</option>
              {patients.filter(p => p.isActive).map(patient => (
                <option key={patient.id} value={patient.id}>{patient.name}</option>
              ))}
            </select>
            {selectedPatientId && patients.find(p => p.id === parseInt(selectedPatientId))?.surgeryDate && (
              <div className="flex items-center space-x-2 px-4 py-2 rounded-lg" style={{ backgroundColor: 'var(--accent)' + '20' }}>
                <Heart className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
                  Week {calculatePostOpWeek(patients.find(p => p.id === parseInt(selectedPatientId))!.surgeryDate!)} Post-Op
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5" style={{ color: 'var(--accent)' }} />
            <input
              type="text"
              placeholder="Search exercises..."
              className="glass-input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              className="glass-input"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <select
              className="glass-input"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
            >
              <option value="">All Difficulties</option>
              {difficulties.map(diff => (
                <option key={diff.value} value={diff.value}>{diff.label}</option>
              ))}
            </select>
          </div>

          {/* Safety Level Filter */}
          <div>
            <select
              className="glass-input"
              value={selectedSafetyLevel}
              onChange={(e) => setSelectedSafetyLevel(e.target.value)}
              disabled={!selectedPatientId}
            >
              <option value="">All Safety Levels</option>
              <option value="safe">✅ Safe Now</option>
              <option value="upcoming">⚠️ Upcoming</option>
              <option value="not-safe">🚫 Not Yet Safe</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-4 text-sm" style={{ color: 'var(--ink)', opacity: 0.7 }}>
          Showing {filteredExercises.length} of {exercises.length} exercises
          {selectedPatientId && (
            <span className="ml-2">
              (Safety color-coding enabled for {patients.find(p => p.id === parseInt(selectedPatientId))?.name})
            </span>
          )}
        </div>
      </div>

      {/* Exercise Grid */}
      {filteredExercises.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Dumbbell className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--accent)' }} />
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--ink)' }}>No exercises found</h3>
          <p style={{ color: 'var(--ink)' }} className="mb-6 opacity-70">
            {searchTerm || selectedCategory || selectedDifficulty
              ? 'Try adjusting your filters'
              : 'Add your first exercise to get started'}
          </p>
          {!searchTerm && !selectedCategory && !selectedDifficulty && (
            <Button onClick={handleAddNew}>
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Exercise
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExercises.map((exercise) => {
            const safetyLevel = getSafetyLevel(exercise);
            const safetyColors = getSafetyLevelColor(safetyLevel);

            return (
              <div
                key={exercise.id}
                className="glass rounded-xl p-6 hover:scale-[1.02] transition-transform relative"
                style={{
                  borderLeft: selectedPatientId ? `4px solid ${safetyColors.border}` : undefined,
                }}
              >
              {/* Safety Level Badge */}
              {selectedPatientId && (
                <div
                  className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: safetyColors.bg,
                    color: safetyColors.text,
                  }}
                >
                  {safetyLevel === 'safe' && '✅ Safe'}
                  {safetyLevel === 'upcoming' && '⚠️ Next Week'}
                  {safetyLevel === 'not-safe' && '🚫 Not Yet'}
                </div>
              )}

              {/* Exercise Header */}
              <div className="flex items-start justify-between mb-4 mt-12">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-full glass flex items-center justify-center text-2xl">
                    {getCategoryIcon(exercise.category)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>{exercise.name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span
                        className="text-xs px-2 py-1 rounded-full font-medium"
                        style={{
                          backgroundColor: getDifficultyColor(exercise.difficulty) + '20',
                          color: getDifficultyColor(exercise.difficulty),
                        }}
                      >
                        {exercise.difficulty}
                      </span>
                      <span
                        className={'text-xs px-2 py-1 rounded-full ' + (exercise.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700')}
                      >
                        {exercise.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-0.5 -mr-1">
                  <button
                    onClick={() => setIsRestTimerOpen(true)}
                    className="p-1 rounded-lg hover:bg-orange-500/20 transition-colors"
                    title="Start rest timer"
                  >
                    <Timer className="h-3.5 w-3.5 text-orange-500" />
                  </button>
                  <button
                    onClick={() => handleDelete(exercise.id)}
                    className="p-1 rounded-lg hover:bg-red-500/20 transition-colors"
                    title="Delete exercise"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                  </button>
                  <button
                    onClick={() => handleEdit(exercise)}
                    className="p-1 rounded-lg hover:bg-white/20 transition-colors"
                    title="Edit exercise"
                  >
                    <Edit2 className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
                  </button>
                  <button
                    onClick={() => handleViewInfo(exercise)}
                    className="p-1 rounded-lg hover:bg-blue-500/20 transition-colors"
                    title="View exercise details"
                  >
                    <Info className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
                  </button>
                  <button
                    onClick={() => handleScheduleExercise(exercise)}
                    className="p-1 rounded-lg hover:bg-green-500/20 transition-colors"
                    title="Schedule exercise for patient"
                  >
                    <Calendar className="h-3.5 w-3.5" style={{ color: '#10b981' }} />
                  </button>
                  <button
                    onClick={() => navigate('/calendar')}
                    className="p-1 rounded-lg hover:bg-purple-500/20 transition-colors"
                    title="Go to calendar"
                  >
                    <ExternalLink className="h-3.5 w-3.5" style={{ color: '#a855f7' }} />
                  </button>
                </div>
              </div>

              {/* Category Badge */}
              <div className="mb-3">
                <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(96, 165, 250, 0.1)', color: 'var(--accent)' }}>
                  {categories.find(c => c.value === exercise.category)?.label}
                </span>
              </div>

              {/* Description */}
              {exercise.description && (
                <p className="text-sm mb-4" style={{ color: 'var(--ink)', opacity: 0.8 }}>
                  {exercise.description.length > 120 ? exercise.description.substring(0, 120) + '...' : exercise.description}
                </p>
              )}

              {/* Metadata */}
              <div className="space-y-2 mb-4 text-xs" style={{ color: 'var(--ink)', opacity: 0.7 }}>
                {exercise.equipmentNeeded && (
                  <div className="flex items-center space-x-2">
                    <Dumbbell className="h-3 w-3" />
                    <span>{exercise.equipmentNeeded}</span>
                  </div>
                )}
                {(exercise.minPostOpWeek !== null || exercise.maxPostOpWeek !== null) && (
                  <div className="flex items-center space-x-2">
                    <Activity className="h-3 w-3" />
                    <span>
                      Week {exercise.minPostOpWeek || '0'} - {exercise.maxPostOpWeek || '∞'}
                    </span>
                  </div>
                )}
                {(exercise.defaultSets || exercise.defaultReps || exercise.defaultDuration) && (
                  <div className="flex items-center space-x-2">
                    <Clock className="h-3 w-3" />
                    <span>
                      {exercise.defaultSets && (exercise.defaultSets + ' sets')}
                      {exercise.defaultReps && (' × ' + exercise.defaultReps + ' reps')}
                      {exercise.defaultDuration && (' • ' + exercise.defaultDuration + ' min')}
                    </span>
                  </div>
                )}
              </div>

              {/* Media Icons */}
              <div className="flex items-center space-x-2 mb-4">
                {exercise.videoUrl && (
                  <div className="flex items-center space-x-1 text-xs" style={{ color: 'var(--accent)' }}>
                    <Video className="h-4 w-4" />
                    <span>Video</span>
                  </div>
                )}
                {exercise.imageUrl && (
                  <div className="flex items-center space-x-1 text-xs" style={{ color: 'var(--accent)' }}>
                    <ImageIcon className="h-4 w-4" />
                    <span>Image</span>
                  </div>
                )}
              </div>

              {/* Contraindications Warning */}
              {exercise.contraindications && (
                <div className="p-2 rounded-lg mb-4" style={{ backgroundColor: '#ffffff' }}>
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-600">
                      {exercise.contraindications.length > 80 ? exercise.contraindications.substring(0, 80) + '...' : exercise.contraindications}
                    </p>
                  </div>
                </div>
              )}

              {/* Toggle Active Button */}
              <button
                onClick={() => handleToggleActive(exercise)}
                className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                style={{
                  backgroundColor: exercise.isActive ? '#ffffff' : 'rgba(16, 185, 129, 0.1)',
                  color: exercise.isActive ? '#dc2626' : '#10b981',
                }}
              >
                {exercise.isActive ? (
                  <>
                    <XCircle className="h-4 w-4" />
                    <span>Deactivate</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Activate</span>
                  </>
                )}
              </button>
              </div>
            );
          })}
        </div>
      )}
      </div>
      )}

      {/* Stats & Progress Tab */}
      {mainTab === 'stats' && (
        <div className="space-y-6">
          {/* Patient and Date Selector */}
          <div className="glass rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                  Select Patient *
                </label>
                <select
                  className="glass-input"
                  value={statsPatientId}
                  onChange={(e) => setStatsPatientId(e.target.value)}
                >
                  <option value="">Choose a patient...</option>
                  {patients.filter(p => p.isActive).map(patient => (
                    <option key={patient.id} value={patient.id}>{patient.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                  Month
                </label>
                <select
                  className="glass-input"
                  value={statsMonth}
                  onChange={(e) => setStatsMonth(parseInt(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>
                      {new Date(2000, month - 1, 1).toLocaleDateString('en-US', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                  Year
                </label>
                <select
                  className="glass-input"
                  value={statsYear}
                  onChange={(e) => setStatsYear(parseInt(e.target.value))}
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* No Patient Selected State */}
          {!statsPatientId && (
            <div className="glass rounded-xl p-12 text-center">
              <Target className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--accent)' }} />
              <h3 className="text-2xl font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                Select a Patient to View Stats
              </h3>
              <p style={{ color: 'var(--ink)' }} className="opacity-70 mb-6">
                Choose a patient from the dropdown above to view their exercise performance statistics
              </p>
              <div className="glass rounded-lg p-6 max-w-2xl mx-auto text-left" style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)' }}>
                <h4 className="font-semibold mb-3" style={{ color: '#a855f7' }}>
                  📊 What Stats Show
                </h4>
                <p className="text-sm mb-3" style={{ color: 'var(--ink)' }}>
                  This tab displays performance statistics for <strong>Exercise Logs</strong> - these are different from calendar events or patient data.
                </p>
                <p className="text-sm" style={{ color: 'var(--ink)' }}>
                  Exercise logs track how well patients perform in their therapy sessions with scores of 0 (no show), 4 (completed), 6 (met goals), or 8 (exceeded goals).
                </p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loadingStats && statsPatientId && (
            <div className="glass rounded-xl p-12 text-center">
              <div className="flex items-center justify-center space-x-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
                <span style={{ color: 'var(--ink)' }}>Loading statistics...</span>
              </div>
            </div>
          )}

          {/* Stats Display */}
          {!loadingStats && statsPatientId && monthlyStats && (
            <>
              {/* Summary Cards Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Weekly Score Card */}
                <div className="glass rounded-xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10" style={{ backgroundColor: '#ea580c', transform: 'translate(30%, -30%)' }}></div>
                  <TrendingUp className="h-8 w-8 mb-3" style={{ color: '#ea580c' }} />
                  <p className="text-sm opacity-70 mb-1" style={{ color: 'var(--ink)' }}>Weekly Score</p>
                  <p className="text-3xl font-bold" style={{ color: '#ea580c' }}>
                    {monthlyStats.totalSessions > 0 ? Math.round(monthlyStats.totalScore / Math.ceil(monthlyStats.totalSessions / 3)) : 0}
                  </p>
                  <p className="text-xs opacity-50 mt-1" style={{ color: 'var(--ink)' }}>
                    Average per week
                  </p>
                </div>

                {/* Cumulative Score Card */}
                <div className="glass rounded-xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10" style={{ backgroundColor: '#2563eb', transform: 'translate(30%, -30%)' }}></div>
                  <Activity className="h-8 w-8 mb-3" style={{ color: '#2563eb' }} />
                  <p className="text-sm opacity-70 mb-1" style={{ color: 'var(--ink)' }}>Cumulative Score</p>
                  <p className="text-3xl font-bold" style={{ color: '#2563eb' }}>{monthlyStats.totalScore}</p>
                  <p className="text-xs opacity-50 mt-1" style={{ color: 'var(--ink)' }}>
                    {monthlyStats.totalSessions} sessions
                  </p>
                </div>

                {/* Percentage Score Card - Color based on performance */}
                <div className="glass rounded-xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10" style={{
                    backgroundColor: monthlyStats.percentageScore >= 80 ? '#059669' : monthlyStats.percentageScore >= 60 ? '#2563eb' : monthlyStats.percentageScore >= 40 ? '#ea580c' : '#dc2626',
                    transform: 'translate(30%, -30%)'
                  }}></div>
                  <Award className="h-8 w-8 mb-3" style={{
                    color: monthlyStats.percentageScore >= 80 ? '#059669' : monthlyStats.percentageScore >= 60 ? '#2563eb' : monthlyStats.percentageScore >= 40 ? '#ea580c' : '#dc2626'
                  }} />
                  <p className="text-sm opacity-70 mb-1" style={{ color: 'var(--ink)' }}>Percentage Score</p>
                  <p className="text-3xl font-bold" style={{
                    color: monthlyStats.percentageScore >= 80 ? '#059669' : monthlyStats.percentageScore >= 60 ? '#2563eb' : monthlyStats.percentageScore >= 40 ? '#ea580c' : '#dc2626'
                  }}>{monthlyStats.percentageScore}%</p>
                  <p className="text-xs opacity-50 mt-1" style={{ color: 'var(--ink)' }}>
                    {monthlyStats.finalScore}/{monthlyStats.maxPossibleScore} points
                  </p>
                </div>

                {/* Exceeded Goals Card - Green to match 8-point color */}
                <div className="glass rounded-xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10" style={{ backgroundColor: '#059669', transform: 'translate(30%, -30%)' }}></div>
                  <CheckCircle2 className="h-8 w-8 mb-3" style={{ color: '#059669' }} />
                  <p className="text-sm opacity-70 mb-1" style={{ color: 'var(--ink)' }}>Exceeded Goals</p>
                  <p className="text-3xl font-bold" style={{ color: '#059669' }}>{monthlyStats.performanceBreakdown.exceededGoals}</p>
                  <p className="text-xs opacity-50 mt-1" style={{ color: 'var(--ink)' }}>
                    8 pts sessions
                  </p>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Performance Breakdown Pie Chart */}
                <div className="glass rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--ink)' }}>
                    Performance Breakdown
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Exceeded Goals (8 pts)', value: monthlyStats.performanceBreakdown.exceededGoals, color: '#10b981' },
                          { name: 'Met Goals (6 pts)', value: monthlyStats.performanceBreakdown.metGoals, color: '#3b82f6' },
                          { name: 'Completed (4 pts)', value: monthlyStats.performanceBreakdown.completed, color: '#f59e0b' },
                          { name: 'No Show (0 pts)', value: monthlyStats.performanceBreakdown.noShow, color: '#ef4444' },
                        ].filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={(entry) => `${entry.value}`}
                      >
                        {[
                          { name: 'Exceeded Goals (8 pts)', value: monthlyStats.performanceBreakdown.exceededGoals, color: '#10b981' },
                          { name: 'Met Goals (6 pts)', value: monthlyStats.performanceBreakdown.metGoals, color: '#3b82f6' },
                          { name: 'Completed (4 pts)', value: monthlyStats.performanceBreakdown.completed, color: '#f59e0b' },
                          { name: 'No Show (0 pts)', value: monthlyStats.performanceBreakdown.noShow, color: '#ef4444' },
                        ].filter(item => item.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: '#ffffff'
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Weekly Progress Bar Chart */}
                <div className="glass rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--ink)' }}>
                    Weekly Progress
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={Object.entries(monthlyStats.weeklyStats).map(([week, data]) => {
                        const avgScore = data.sessions > 0 ? Math.round(data.score / data.sessions) : 0;
                        const weekNum = parseInt(week);
                        const year = monthlyStats.year;
                        const month = monthlyStats.month;

                        // Calculate start and end dates for this week
                        const startDay = (weekNum - 1) * 7 + 1;
                        const endDay = Math.min(weekNum * 7, new Date(year, month, 0).getDate());
                        const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short' });
                        const dateRange = `${monthName} ${startDay}-${endDay}`;

                        // Color based on average score
                        let barColor = '#6b7280'; // gray for no data
                        if (avgScore === 0) barColor = '#dc2626'; // red - no show
                        else if (avgScore === 4) barColor = '#ea580c'; // orange - completed
                        else if (avgScore === 6) barColor = '#2563eb'; // blue - met goals
                        else if (avgScore === 8) barColor = '#059669'; // green - exceeded goals

                        return {
                          week: dateRange,
                          sessions: data.sessions,
                          score: data.score,
                          avgScore,
                          fill: barColor
                        };
                      })}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="week" stroke="#ffffff80" />
                      <YAxis stroke="#ffffff80" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: '#ffffff'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="score" name="Total Points" radius={[8, 8, 0, 0]}>
                        {Object.entries(monthlyStats.weeklyStats).map(([week, data], index) => {
                          const avgScore = data.sessions > 0 ? Math.round(data.score / data.sessions) : 0;
                          let barColor = '#6b7280'; // gray for no data
                          if (avgScore === 0) barColor = '#dc2626'; // red - no show
                          else if (avgScore === 4) barColor = '#ea580c'; // orange - completed
                          else if (avgScore === 6) barColor = '#2563eb'; // blue - met goals
                          else if (avgScore === 8) barColor = '#059669'; // green - exceeded goals

                          return <Cell key={`cell-${index}`} fill={barColor} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Score Gauge */}
              <div className="glass rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--ink)' }}>
                  Monthly Performance Score
                </h3>
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={250}>
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="60%"
                      outerRadius="90%"
                      barSize={30}
                      data={[{
                        name: 'Score',
                        value: monthlyStats.percentageScore,
                        fill: monthlyStats.percentageScore >= 80 ? '#10b981' : monthlyStats.percentageScore >= 60 ? '#3b82f6' : monthlyStats.percentageScore >= 40 ? '#f59e0b' : '#ef4444'
                      }]}
                      startAngle={180}
                      endAngle={0}
                    >
                      <RadialBar
                        background
                        dataKey="value"
                        cornerRadius={15}
                      />
                      <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ fontSize: '48px', fontWeight: 'bold', fill: '#ffffff' }}
                      >
                        {monthlyStats.percentageScore}%
                      </text>
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center justify-center space-x-8 mt-6">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
                      <span className="text-sm" style={{ color: 'var(--ink)' }}>0-39%</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
                      <span className="text-sm" style={{ color: 'var(--ink)' }}>40-59%</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
                      <span className="text-sm" style={{ color: 'var(--ink)' }}>60-79%</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
                      <span className="text-sm" style={{ color: 'var(--ink)' }}>80-100%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Level Legend */}
              <div className="glass rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--ink)' }}>
                  Scoring Guide
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444' }}>
                    <div className="flex items-center space-x-2 mb-2">
                      <XCircle className="h-5 w-5" style={{ color: '#ef4444' }} />
                      <span className="font-semibold" style={{ color: '#ef4444' }}>No Show</span>
                    </div>
                    <p className="text-2xl font-bold mb-1" style={{ color: '#ef4444' }}>0 pts</p>
                    <p className="text-xs opacity-70" style={{ color: 'var(--ink)' }}>
                      Patient did not attend session
                    </p>
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', borderLeft: '4px solid #f59e0b' }}>
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle2 className="h-5 w-5" style={{ color: '#f59e0b' }} />
                      <span className="font-semibold" style={{ color: '#f59e0b' }}>Completed</span>
                    </div>
                    <p className="text-2xl font-bold mb-1" style={{ color: '#f59e0b' }}>4 pts</p>
                    <p className="text-xs opacity-70" style={{ color: 'var(--ink)' }}>
                      Completed the session
                    </p>
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderLeft: '4px solid #3b82f6' }}>
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="h-5 w-5" style={{ color: '#3b82f6' }} />
                      <span className="font-semibold" style={{ color: '#3b82f6' }}>Met Goals</span>
                    </div>
                    <p className="text-2xl font-bold mb-1" style={{ color: '#3b82f6' }}>6 pts</p>
                    <p className="text-xs opacity-70" style={{ color: 'var(--ink)' }}>
                      Achieved therapist goals
                    </p>
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderLeft: '4px solid #10b981' }}>
                    <div className="flex items-center space-x-2 mb-2">
                      <Award className="h-5 w-5" style={{ color: '#10b981' }} />
                      <span className="font-semibold" style={{ color: '#10b981' }}>Exceeded</span>
                    </div>
                    <p className="text-2xl font-bold mb-1" style={{ color: '#10b981' }}>8 pts</p>
                    <p className="text-xs opacity-70" style={{ color: 'var(--ink)' }}>
                      Surpassed expectations
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* No Data State */}
          {!loadingStats && statsPatientId && monthlyStats && monthlyStats.totalSessions === 0 && (
            <div className="glass rounded-xl p-12 text-center">
              <Activity className="h-16 w-16 mx-auto mb-4 opacity-50" style={{ color: 'var(--accent)' }} />
              <h3 className="text-2xl font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                No Exercise Logs Found
              </h3>
              <p style={{ color: 'var(--ink)' }} className="opacity-70 mb-4">
                No exercise sessions found for {patients.find(p => p.id === parseInt(statsPatientId))?.name} in {new Date(statsYear, statsMonth - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
              <div className="glass rounded-lg p-6 max-w-2xl mx-auto text-left" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                <h4 className="font-semibold mb-3 flex items-center" style={{ color: 'var(--accent)' }}>
                  <Info className="h-5 w-5 mr-2" />
                  How to Add Exercise Sessions
                </h4>
                <ol className="space-y-2 text-sm" style={{ color: 'var(--ink)' }}>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">1.</span>
                    <span>Go to the Calendar and create exercise events for your patient</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">2.</span>
                    <span>After the session, open the event and add a performance score:</span>
                  </li>
                  <li className="ml-6 text-xs opacity-80">
                    • <strong>0 points</strong> = Patient no show<br />
                    • <strong>4 points</strong> = Completed session<br />
                    • <strong>6 points</strong> = Met goals<br />
                    • <strong>8 points</strong> = Exceeded goals
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">3.</span>
                    <span>Stats will automatically appear here!</span>
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingExercise(null);
          reset();
        }}
        title={editingExercise ? 'Edit Exercise' : 'Add New Exercise'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
              Exercise Name *
            </label>
            <input
              type="text"
              className="glass-input"
              placeholder="e.g., Walking, Arm Raises"
              {...register('name', { required: 'Exercise name is required' })}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                Category *
              </label>
              <select
                className="glass-input"
                {...register('category', { required: 'Category is required' })}
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                ))}
              </select>
              {errors.category && (
                <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                Difficulty *
              </label>
              <select
                className="glass-input"
                {...register('difficulty', { required: 'Difficulty is required' })}
              >
                {difficulties.map(diff => (
                  <option key={diff.value} value={diff.value}>{diff.label}</option>
                ))}
              </select>
              {errors.difficulty && (
                <p className="text-red-500 text-sm mt-1">{errors.difficulty.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
              Description
            </label>
            <textarea
              className="glass-input"
              rows={3}
              placeholder="Brief description of the exercise..."
              {...register('description')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
              Equipment Needed
            </label>
            <input
              type="text"
              className="glass-input"
              placeholder="e.g., Dumbbells, Resistance Band"
              {...register('equipmentNeeded')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                Min Post-Op Week
              </label>
              <input
                type="number"
                className="glass-input"
                min="0"
                placeholder="e.g., 1"
                {...register('minPostOpWeek', { valueAsNumber: true })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                Max Post-Op Week
              </label>
              <input
                type="number"
                className="glass-input"
                min="0"
                placeholder="e.g., 12 (leave empty for no limit)"
                {...register('maxPostOpWeek', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                Default Sets
              </label>
              <input
                type="number"
                className="glass-input"
                min="1"
                placeholder="e.g., 3"
                {...register('defaultSets', { valueAsNumber: true })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                Default Reps
              </label>
              <input
                type="number"
                className="glass-input"
                min="1"
                placeholder="e.g., 10"
                {...register('defaultReps', { valueAsNumber: true })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                Duration (min)
              </label>
              <input
                type="number"
                className="glass-input"
                min="1"
                placeholder="e.g., 15"
                {...register('defaultDuration', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
              Video URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                className="glass-input flex-1"
                placeholder="https://youtube.com/watch?v=..."
                {...register('videoUrl')}
              />
              {watch('videoUrl') && (
                <a
                  href={watch('videoUrl')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-all hover:scale-105"
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    color: '#3b82f6',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}
                  title="Open video in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
              Image URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                className="glass-input flex-1"
                placeholder="https://example.com/image.jpg"
                {...register('imageUrl')}
              />
              {watch('imageUrl') && (
                <a
                  href={watch('imageUrl')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-all hover:scale-105"
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    color: '#3b82f6',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}
                  title="Open image in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
              Instructions
            </label>
            <textarea
              className="glass-input"
              rows={4}
              placeholder="Step-by-step instructions..."
              {...register('instructions')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
              Contraindications / Warnings
            </label>
            <textarea
              className="glass-input"
              rows={2}
              placeholder="Medical contraindications or warnings..."
              {...register('contraindications')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#3b82f6' }}>
              Form Tips & Technique
            </label>
            <textarea
              className="glass-input"
              rows={3}
              placeholder="Tips for proper form and technique..."
              {...register('formTips')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#a855f7' }}>
              Exercise Modifications
            </label>
            <textarea
              className="glass-input"
              rows={3}
              placeholder="Modifications for different abilities or limitations..."
              {...register('modifications')}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="glass"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingExercise(null);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingExercise ? 'Update Exercise' : 'Add Exercise'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Schedule Exercise Modal */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setSchedulingExercise(null);
        }}
        title={`Schedule: ${schedulingExercise?.name || ''}`}
        size="md"
      >
        <div className="space-y-4">
          {/* Patient Selection */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
              Patient *
            </label>
            <select
              className="glass-input"
              value={schedulePatientId}
              onChange={(e) => setSchedulePatientId(e.target.value)}
            >
              <option value="">Select Patient</option>
              {patients.filter(p => p.isActive).map(patient => (
                <option key={patient.id} value={patient.id}>{patient.name}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
              Date *
            </label>
            <input
              type="date"
              className="glass-input"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
            />
          </div>

          {/* Time */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
              Time *
            </label>
            <input
              type="time"
              className="glass-input"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
              Duration (minutes)
            </label>
            <input
              type="number"
              className="glass-input"
              value={scheduleDuration}
              onChange={(e) => setScheduleDuration(parseInt(e.target.value))}
              min="5"
              step="5"
            />
          </div>

          {/* Exercise Info */}
          {schedulingExercise && (
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(96, 165, 250, 0.1)' }}>
              <p className="text-sm" style={{ color: 'var(--ink)', opacity: 0.8 }}>
                <strong>Category:</strong> {schedulingExercise.category}
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--ink)', opacity: 0.8 }}>
                <strong>Difficulty:</strong> {schedulingExercise.difficulty}
              </p>
              {schedulingExercise.description && (
                <p className="text-sm mt-2" style={{ color: 'var(--ink)', opacity: 0.8 }}>
                  {schedulingExercise.description}
                </p>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="glass"
              onClick={() => {
                setIsScheduleModalOpen(false);
                setSchedulingExercise(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleScheduleSubmit}>
              Schedule Exercise
            </Button>
          </div>
        </div>
      </Modal>

      {/* Exercise Info Modal */}
      <Modal
        isOpen={isInfoModalOpen}
        onClose={() => {
          setIsInfoModalOpen(false);
          setViewingExercise(null);
        }}
        title={viewingExercise?.name || 'Exercise Details'}
        size="lg"
      >
        {viewingExercise && (
          <div className="space-y-6">
            {/* Header with category and difficulty */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 rounded-full glass flex items-center justify-center text-2xl">
                  {getCategoryIcon(viewingExercise.category)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className="text-xs px-3 py-1 rounded-full font-medium"
                      style={{
                        backgroundColor: getDifficultyColor(viewingExercise.difficulty) + '20',
                        color: getDifficultyColor(viewingExercise.difficulty),
                      }}
                    >
                      {viewingExercise.difficulty}
                    </span>
                    <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ backgroundColor: 'rgba(96, 165, 250, 0.1)', color: 'var(--accent)' }}>
                      {categories.find(c => c.value === viewingExercise.category)?.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {viewingExercise.description && (
              <div>
                <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>Description</h4>
                <p className="text-sm" style={{ color: 'var(--ink)', opacity: 0.8 }}>
                  {viewingExercise.description}
                </p>
              </div>
            )}

            {/* Recovery Benefit */}
            {viewingExercise.recoveryBenefit && (
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                <div className="flex items-start space-x-2">
                  <Heart className="h-5 w-5 mt-0.5" style={{ color: '#22c55e' }} />
                  <div>
                    <h4 className="text-sm font-semibold mb-1" style={{ color: '#22c55e' }}>Recovery Benefit</h4>
                    <p className="text-sm" style={{ color: 'var(--ink)', opacity: 0.8 }}>
                      {viewingExercise.recoveryBenefit}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            {viewingExercise.instructions && (
              <div>
                <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>Instructions</h4>
                <p className="text-sm whitespace-pre-line" style={{ color: 'var(--ink)', opacity: 0.8 }}>
                  {viewingExercise.instructions}
                </p>
              </div>
            )}

            {/* Equipment Needed */}
            {viewingExercise.equipmentNeeded && (
              <div>
                <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>Equipment Needed</h4>
                <div className="flex items-center space-x-2">
                  <Dumbbell className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                  <span className="text-sm" style={{ color: 'var(--ink)', opacity: 0.8 }}>
                    {viewingExercise.equipmentNeeded}
                  </span>
                </div>
              </div>
            )}

            {/* Default Sets/Reps/Duration */}
            {(viewingExercise.defaultSets || viewingExercise.defaultReps || viewingExercise.defaultDuration) && (
              <div>
                <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>Recommended</h4>
                <div className="flex flex-wrap gap-4">
                  {viewingExercise.defaultSets && (
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                      <span className="text-sm" style={{ color: 'var(--ink)', opacity: 0.8 }}>
                        {viewingExercise.defaultSets} sets
                      </span>
                    </div>
                  )}
                  {viewingExercise.defaultReps && (
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                      <span className="text-sm" style={{ color: 'var(--ink)', opacity: 0.8 }}>
                        {viewingExercise.defaultReps} reps
                      </span>
                    </div>
                  )}
                  {viewingExercise.defaultDuration && (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                      <span className="text-sm" style={{ color: 'var(--ink)', opacity: 0.8 }}>
                        {viewingExercise.defaultDuration} minutes
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Post-Op Week Range */}
            {(viewingExercise.minPostOpWeek !== null || viewingExercise.maxPostOpWeek !== null) && (
              <div>
                <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>Recommended Post-Op Timeframe</h4>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                  <span className="text-sm" style={{ color: 'var(--ink)', opacity: 0.8 }}>
                    Week {viewingExercise.minPostOpWeek || 0}
                    {viewingExercise.maxPostOpWeek ? ` - ${viewingExercise.maxPostOpWeek}` : '+'}
                  </span>
                </div>
              </div>
            )}

            {/* Contraindications */}
            {viewingExercise.contraindications && (
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#ffffff' }}>
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 mt-0.5" style={{ color: '#ef4444' }} />
                  <div>
                    <h4 className="text-sm font-semibold mb-1" style={{ color: '#ef4444' }}>Contraindications & Warnings</h4>
                    <p className="text-sm" style={{ color: '#dc2626' }}>
                      {viewingExercise.contraindications}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Form Tips */}
            {viewingExercise.formTips && (
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="h-5 w-5 mt-0.5" style={{ color: '#3b82f6' }} />
                  <div>
                    <h4 className="text-sm font-semibold mb-1" style={{ color: '#3b82f6' }}>Form Tips & Technique</h4>
                    <p className="text-sm whitespace-pre-line" style={{ color: 'var(--ink)', opacity: 0.8 }}>
                      {viewingExercise.formTips}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Modifications */}
            {viewingExercise.modifications && (
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)' }}>
                <div className="flex items-start space-x-2">
                  <Activity className="h-5 w-5 mt-0.5" style={{ color: '#a855f7' }} />
                  <div>
                    <h4 className="text-sm font-semibold mb-1" style={{ color: '#a855f7' }}>Exercise Modifications</h4>
                    <p className="text-sm whitespace-pre-line" style={{ color: 'var(--ink)', opacity: 0.8 }}>
                      {viewingExercise.modifications}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Embedded Video Player */}
            {viewingExercise.videoUrl && (
              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>Exercise Video</h4>
                <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
                  {viewingExercise.videoUrl.includes('youtube.com') || viewingExercise.videoUrl.includes('youtu.be') ? (
                    <iframe
                      width="100%"
                      height="315"
                      src={viewingExercise.videoUrl.includes('youtube.com')
                        ? viewingExercise.videoUrl.replace('watch?v=', 'embed/')
                        : viewingExercise.videoUrl.replace('youtu.be/', 'youtube.com/embed/')}
                      title="Exercise video"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full"
                    />
                  ) : (
                    <video
                      controls
                      className="w-full"
                      style={{ maxHeight: '400px' }}
                    >
                      <source src={viewingExercise.videoUrl} />
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>
                <div className="mt-2">
                  <a
                    href={viewingExercise.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-sm hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--accent)' }}
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Open in new tab</span>
                  </a>
                </div>
              </div>
            )}

            {/* Image */}
            {viewingExercise.imageUrl && (
              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>Exercise Image</h4>
                <div className="rounded-lg overflow-hidden">
                  <img
                    src={viewingExercise.imageUrl}
                    alt={viewingExercise.name}
                    className="w-full h-auto"
                    style={{ maxHeight: '400px', objectFit: 'contain' }}
                  />
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end pt-4 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
              <Button
                onClick={() => {
                  setIsInfoModalOpen(false);
                  setViewingExercise(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Rest Timer */}
      {isRestTimerOpen && (
        <RestTimer
          onClose={() => setIsRestTimerOpen(false)}
          defaultSeconds={90}
        />
      )}
    </div>
  );
}
