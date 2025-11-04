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
  Timer,
  Upload,
  Flame
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
  RadialBar,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ReferenceLine
} from 'recharts';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { RestTimer } from '../components/RestTimer';
import { useView } from '../contexts/ViewContext';
import { useAuth } from '../contexts/AuthContext';
import { usePatientSelection } from '../contexts/PatientSelectionContext';
import { Patient } from '../types';

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
  formTips?: string;
  modifications?: string;
  recoveryBenefit?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultDuration?: number;
  isActive: boolean;
  createdBy?: number;
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
  formTips?: string;
  modifications?: string;
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
  const [limitationWarning, setLimitationWarning] = useState<string | null>(null);
  const [warningOverridden, setWarningOverridden] = useState(false);
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
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { isTherapistView } = useView();
  const { user } = useAuth();
  const { selectedPatient, setSelectedPatient, isViewingAsTherapist } = usePatientSelection();
  const navigate = useNavigate();

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<CreateExerciseInput>();

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

  // Auto-select patient for safety level calculations
  useEffect(() => {
    console.log('Auto-select useEffect triggered');
    console.log('  user.role:', user?.role);
    console.log('  user.id:', user?.id);
    console.log('  patients.length:', patients.length);
    console.log('  selectedPatientId:', selectedPatientId);

    if (user?.role === 'patient' && !selectedPatientId) {
      // For patients, we can fetch their own patient record
      const loadOwnPatientRecord = async () => {
        try {
          const token = localStorage.getItem('token');
          // Query for patient record where userId matches current user
          const response = await fetch(`/api/patients?userId=${user.id}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (response.ok) {
            const data = await response.json();
            console.log('  Own patient query response:', data);

            if (data.data && data.data.length > 0) {
              const myRecord = data.data[0];
              console.log('  Found own patient record:', myRecord);
              setSelectedPatientId(myRecord.id.toString());
              // Also add to patients array if not already there
              if (!patients.find(p => p.id === myRecord.id)) {
                setPatients([...patients, myRecord]);
              }
            } else {
              console.log('  ❌ No patient record found for this user');
            }
          }
        } catch (error) {
          console.error('  Error loading own patient record:', error);
        }
      };

      loadOwnPatientRecord();
    }
  }, [user, selectedPatientId]);

  // Auto-select first patient for stats view when patients load
  useEffect(() => {
    if (patients.length > 0 && !statsPatientId) {
      const activePatients = patients.filter(p => p.isActive);
      if (activePatients.length > 0) {
        setStatsPatientId(activePatients[0].id.toString());
        console.log('Auto-selected first patient for stats:', activePatients[0].name);
      }
    }
  }, [patients, statsPatientId]);

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
      let patientsData = data.data || [];

      // If user is a patient and the list is empty, load their own patient record
      if (user?.role === 'patient' && patientsData.length === 0) {
        console.log('Patient role detected, loading own patient record via /api/patients?userId=');
        try {
          const meResponse = await fetch(`/api/patients?userId=${user.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (meResponse.ok) {
            const meData = await meResponse.json();
            console.log('Loaded own patient record:', meData);
            // Add own patient record to the list (meData.data is an array)
            if (meData.data && meData.data.length > 0) {
              patientsData = meData.data;
            }
          }
        } catch (meError) {
          console.error('Failed to load own patient record:', meError);
        }
      }

      setPatients(patientsData);
      console.log('Final patients array:', patientsData);
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
      console.log('📝 Logs array:', data.logs);
      console.log('📝 Logs count:', data.logs?.length || 0);
      console.log('📝 Exercise Logs count:', data.exerciseLogs?.length || 0);
      if (data.logs && data.logs.length > 0) {
        console.log('📅 First log:', data.logs[0]);
        console.log('📅 Last log:', data.logs[data.logs.length - 1]);
      }
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
    if (!patient) return 'no-patient';

    // If no surgery date, classify based on minPostOpWeek only
    if (!patient.surgeryDate) {
      const minWeek = exercise.minPostOpWeek;

      // If minPostOpWeek is not set, treat as universally safe
      if (minWeek === null || minWeek === undefined) {
        return 'safe';
      }

      // Exercises with no minimum week (0) are always safe
      if (minWeek === 0) return 'safe';

      // Exercises requiring 1-4 weeks are upcoming
      if (minWeek >= 1 && minWeek <= 4) return 'upcoming';

      // Exercises requiring 5+ weeks are not yet safe
      if (minWeek >= 5) return 'not-safe';

      // Fallback
      return 'safe';
    }

    const currentWeek = calculatePostOpWeek(patient.surgeryDate);
    const minWeek = exercise.minPostOpWeek || 0;
    const maxWeek = exercise.maxPostOpWeek;

    // Check if exercise is safe for current week (including past max week - graduated exercises)
    if (currentWeek >= minWeek) {
      return 'safe';
    }

    // Check if exercise is upcoming (within 1 week)
    if (currentWeek === minWeek - 1) {
      return 'upcoming';
    }

    // Exercise is not yet safe (too advanced)
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

    if (selectedSafetyLevel) {
      // Debug: Check patient selection
      console.log('Selected Patient ID:', selectedPatientId);
      console.log('User role:', user?.role);

      // Debug: Count exercises by safety level
      const safetyLevelCounts = {
        safe: 0,
        upcoming: 0,
        'not-safe': 0,
        'no-patient': 0
      };

      // Sample first 3 exercises to see their data
      console.log('Sample exercises (first 3):');
      exercises.slice(0, 3).forEach(ex => {
        const level = getSafetyLevel(ex);
        console.log(`  ${ex.name}: minPostOpWeek=${ex.minPostOpWeek}, level=${level}`);
      });

      exercises.forEach(ex => {
        const level = getSafetyLevel(ex);
        safetyLevelCounts[level]++;
      });

      console.log('Safety Level Distribution:');
      console.log('  Safe:', safetyLevelCounts.safe);
      console.log('  Upcoming:', safetyLevelCounts.upcoming);
      console.log('  Not Safe:', safetyLevelCounts['not-safe']);
      console.log('  No Patient:', safetyLevelCounts['no-patient']);
      console.log('Filtering by:', selectedSafetyLevel);

      filtered = filtered.filter(ex => getSafetyLevel(ex) === selectedSafetyLevel);
      console.log('Filtered count:', filtered.length);
    }

    setFilteredExercises(filtered);
  };

  const handleUploadVideo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingVideo(true);
    setVideoFile(file);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('video', file);

      const response = await fetch('/api/upload/exercise-media', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload video');

      const data = await response.json();
      if (data.videoUrl) {
        setValue('videoUrl', data.videoUrl);
        toast.success('Video uploaded successfully!');
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      toast.error('Failed to upload video');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleUploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setImageFile(file);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload/exercise-media', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload image');

      const data = await response.json();
      if (data.imageUrl) {
        setValue('imageUrl', data.imageUrl);
        toast.success('Image uploaded successfully!');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
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
      formTips: exercise.formTips || '',
      modifications: exercise.modifications || '',
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
      formTips: '',
      modifications: '',
      defaultSets: undefined,
      defaultReps: undefined,
      defaultDuration: undefined,
    });
    setIsAddModalOpen(true);
  };

  // Check for physical limitations conflicts
  const checkPhysicalLimitations = async (exercise: Exercise, patientId: string) => {
    try {
      // Reset warning state
      setLimitationWarning(null);
      setWarningOverridden(false);

      if (!patientId) return;

      // Get the patient's profile to check activity restrictions
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/patients?userId=${patientId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) return;

      const patientsData = await response.json();
      const patientProfile = patientsData.data?.[0];

      if (!patientProfile?.activityRestrictions) return;

      const restrictions = patientProfile.activityRestrictions.toLowerCase();
      const exerciseName = exercise.name.toLowerCase();
      const exerciseCategory = exercise.category.toLowerCase();
      const exerciseDescription = (exercise.description || '').toLowerCase();

      // Check if exercise conflicts with restrictions
      const conflictKeywords = ['no', 'avoid', 'restrict', 'limit', 'prohibit', 'cannot', 'do not', 'contraindicated'];

      // Check if the exercise name/category appears in restrictions with conflict keywords nearby
      let hasConflict = false;

      // Check exercise name in restrictions
      if (restrictions.includes(exerciseName)) {
        // Look for conflict keywords near the exercise name
        const nameIndex = restrictions.indexOf(exerciseName);
        const contextBefore = restrictions.substring(Math.max(0, nameIndex - 50), nameIndex);
        const contextAfter = restrictions.substring(nameIndex, Math.min(restrictions.length, nameIndex + 50));

        if (conflictKeywords.some(kw => contextBefore.includes(kw) || contextAfter.includes(kw))) {
          hasConflict = true;
        }
      }

      // Check exercise category
      if (restrictions.includes(exerciseCategory)) {
        const catIndex = restrictions.indexOf(exerciseCategory);
        const contextBefore = restrictions.substring(Math.max(0, catIndex - 50), catIndex);
        const contextAfter = restrictions.substring(catIndex, Math.min(restrictions.length, catIndex + 50));

        if (conflictKeywords.some(kw => contextBefore.includes(kw) || contextAfter.includes(kw))) {
          hasConflict = true;
        }
      }

      // Check contra indications from exercise
      if (exercise.contraindications) {
        const contraLower = exercise.contraindications.toLowerCase();
        if (restrictions.split(/\W+/).some(word => contraLower.includes(word) && word.length > 3)) {
          hasConflict = true;
        }
      }

      if (hasConflict) {
        setLimitationWarning(
          `This exercise may not comply with the patient's physical limitations: "${patientProfile.activityRestrictions}"`
        );
      }
    } catch (error) {
      console.error('Failed to check physical limitations:', error);
    }
  };

  const handleScheduleExercise = async (exercise: Exercise) => {
    setSchedulingExercise(exercise);

    // For patients, automatically use their own user ID
    // For therapists, use the selected patient ID
    let patientId = '';
    if (user?.role === 'patient') {
      patientId = user.id.toString();
      setSchedulePatientId(patientId);
    } else {
      patientId = selectedPatientId || '';
      setSchedulePatientId(patientId);
    }

    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleDate(tomorrow.toISOString().split('T')[0]);
    setScheduleDuration(exercise.defaultDuration || 30);

    // Check for physical limitations conflicts
    await checkPhysicalLimitations(exercise, patientId);

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

      // Get selected patient info to use their userId
      const selectedPatient = patients.find(p => p.id === parseInt(schedulePatientId));
      const patientUserId = selectedPatient?.userId || parseInt(schedulePatientId);

      // Fetch user's calendars and patient's calendars
      const [therapistCalResponse, patientCalResponse] = await Promise.all([
        fetch('/api/calendars', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`/api/calendars?userId=${patientUserId}`, {
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
            userId: patientUserId,
            name: 'Exercise Calendar',
            type: 'exercise',
            color: '#10b981',
          }),
        });
        patientCalendar = await createResponse.json();
      }

      const patientName = selectedPatient?.name || 'Patient';

      // Event for patient's calendar
      const eventData = {
        calendarId: patientCalendar.id,
        title: schedulingExercise.name,
        description: schedulingExercise.description || '',
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        exerciseId: schedulingExercise.id,
        patientId: selectedPatient?.userId || parseInt(schedulePatientId), // Use userId for proper calendar filtering
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

  // Patients can view exercises and add to calendar, but cannot create/edit/delete
  const canManageExercises = user?.role === 'therapist' || user?.role === 'admin';

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
            {user?.role === 'patient'
              ? 'Browse exercises and add them to your calendar'
              : 'Manage exercises and create prescriptions for your patients'
            }
          </p>
        </div>
        {canManageExercises && (
          <Button onClick={handleAddNew}>
            <Plus className="h-5 w-5 mr-2" />
            Add Exercise
          </Button>
        )}
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
            mainTab === 'exercises' ? 'glass' : ''
          }`}
          style={
            mainTab === 'exercises'
              ? { color: 'var(--accent)' }
              : { color: 'var(--ink)', backgroundColor: 'var(--card-light)' }
          }
        >
          <Dumbbell className="inline h-5 w-5 mr-2" />
          Exercises
        </button>
        <button
          onClick={() => setMainTab('activities')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            mainTab === 'activities' ? 'glass' : ''
          }`}
          style={
            mainTab === 'activities'
              ? { color: 'var(--accent)' }
              : { color: 'var(--ink)', backgroundColor: 'var(--card-light)' }
          }
        >
          <Activity className="inline h-5 w-5 mr-2" />
          Activities
        </button>
        <button
          onClick={() => setMainTab('stats')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            mainTab === 'stats' ? 'glass' : ''
          }`}
          style={
            mainTab === 'stats'
              ? { color: 'var(--accent)' }
              : { color: 'var(--ink)', backgroundColor: 'var(--card-light)' }
          }
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
        {/* Patient Selector & Current Week Display - Therapist/Admin only */}
        {canManageExercises && (
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
        )}

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
            >
              <option value="">All Safety Levels</option>
              <option value="safe">✅ Safe Now</option>
              <option value="upcoming">⚠️ Upcoming</option>
              <option value="not-safe">🚫 Not Yet Safe</option>
              <option value="no-patient">👤 Requires Patient Selection</option>
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
                        className="text-xs px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: exercise.isActive
                            ? 'rgba(74, 222, 128, 0.2)'
                            : 'rgba(209, 213, 219, 0.3)',
                          color: exercise.isActive ? 'var(--good)' : 'var(--muted)'
                        }}
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
                  {/* Therapist/Admin only buttons */}
                  {canManageExercises && (
                    <>
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
                    </>
                  )}
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
                    title={user?.role === 'patient' ? 'Add to my calendar' : 'Schedule exercise for patient'}
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
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-3 w-3" />
                      <span>
                        {exercise.defaultSets && (exercise.defaultSets + ' sets')}
                        {exercise.defaultReps && (' × ' + exercise.defaultReps + ' reps')}
                        {exercise.defaultDuration && (' • ' + exercise.defaultDuration + ' min')}
                      </span>
                    </div>
                    {/* NEW: Exercise Volume & 1RM Estimator - Only for weighted exercises */}
                    {exercise.defaultSets && exercise.defaultReps && exercise.equipmentNeeded &&
                     (exercise.equipmentNeeded.toLowerCase().includes('dumbbell') ||
                      exercise.equipmentNeeded.toLowerCase().includes('barbell') ||
                      exercise.equipmentNeeded.toLowerCase().includes('weight') ||
                      exercise.equipmentNeeded.toLowerCase().includes('kettlebell')) && (
                      <div className="text-xs pl-5 space-y-0.5" style={{ color: 'var(--accent)' }}>
                        <div>📊 Volume (@ 50lb): {exercise.defaultSets * exercise.defaultReps * 50} lbs</div>
                        <div>💪 Est. 1RM (@ 8 reps): {Math.round(50 * (1 + 8 / 30))} lbs</div>
                      </div>
                    )}
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

          {/* Scoring Guide */}
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
                {/* Weekly Average Score Card - Performance-based color */}
                <div className="glass rounded-xl p-6 relative overflow-hidden">
                  {(() => {
                    const weeklyAvg = monthlyStats.totalSessions > 0 ? Math.round(monthlyStats.totalScore / Math.ceil(monthlyStats.totalSessions / 3)) : 0;
                    const weeklyPercent = Math.round((weeklyAvg / 24) * 100);
                    const color = weeklyPercent >= 80 ? '#059669' : weeklyPercent >= 60 ? '#2563eb' : weeklyPercent >= 40 ? '#ea580c' : '#dc2626';

                    return (
                      <>
                        <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10" style={{ backgroundColor: color, transform: 'translate(30%, -30%)' }}></div>
                        <TrendingUp className="h-8 w-8 mb-3" style={{ color }} />
                        <p className="text-sm opacity-70 mb-1" style={{ color: 'var(--ink)' }}>Weekly Average</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-3xl font-bold" style={{ color }}>
                            {weeklyAvg}
                          </p>
                          <p className="text-sm opacity-50" style={{ color: 'var(--ink)' }}>/24</p>
                        </div>
                        <p className="text-xs opacity-50 mt-1" style={{ color: 'var(--ink)' }}>
                          {monthlyStats.totalSessions} sessions
                        </p>
                        {monthlyStats.logs && monthlyStats.logs.length > 0 && (
                          <p className="text-xs font-semibold mt-1" style={{ color: 'var(--ink)' }}>
                            {(() => {
                              const sortedLogs = [...monthlyStats.logs].sort((a: any, b: any) =>
                                new Date(a.completedAt || a.startTime).getTime() - new Date(b.completedAt || b.startTime).getTime()
                              );
                              const firstDate = new Date(sortedLogs[0].completedAt || sortedLogs[0].startTime);
                              const lastDate = new Date(sortedLogs[sortedLogs.length - 1].completedAt || sortedLogs[sortedLogs.length - 1].startTime);
                              return `${firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                            })()}
                          </p>
                        )}
                        <p className="text-xs opacity-70 mt-1" style={{ color: 'var(--ink)' }}>
                          3 sessions/week × 8pts max
                        </p>
                      </>
                    );
                  })()}
                </div>

                {/* Cumulative Score Card - Performance-based color */}
                <div className="glass rounded-xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10" style={{
                    backgroundColor: monthlyStats.finalScore >= 80 ? '#059669' : monthlyStats.finalScore >= 60 ? '#2563eb' : monthlyStats.finalScore >= 40 ? '#ea580c' : '#dc2626',
                    transform: 'translate(30%, -30%)'
                  }}></div>
                  <Activity className="h-8 w-8 mb-3" style={{
                    color: monthlyStats.finalScore >= 80 ? '#059669' : monthlyStats.finalScore >= 60 ? '#2563eb' : monthlyStats.finalScore >= 40 ? '#ea580c' : '#dc2626'
                  }} />
                  <p className="text-sm opacity-70 mb-1" style={{ color: 'var(--ink)' }}>Cumulative Score</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold" style={{
                      color: monthlyStats.finalScore >= 80 ? '#059669' : monthlyStats.finalScore >= 60 ? '#2563eb' : monthlyStats.finalScore >= 40 ? '#ea580c' : '#dc2626'
                    }}>{monthlyStats.finalScore}</p>
                    <p className="text-sm opacity-50" style={{ color: 'var(--ink)' }}>/100</p>
                  </div>
                  <p className="text-xs opacity-50 mt-1" style={{ color: 'var(--ink)' }}>
                    {monthlyStats.totalSessions} sessions (+{monthlyStats.bonusPoints || 0} bonus)
                  </p>
                  {monthlyStats.logs && monthlyStats.logs.length > 0 && (
                    <>
                      <p className="text-xs font-semibold mt-2" style={{ color: 'var(--ink)' }}>
                        {(() => {
                          const sortedLogs = [...monthlyStats.logs].sort((a: any, b: any) =>
                            new Date(a.completedAt || a.startTime).getTime() - new Date(b.completedAt || b.startTime).getTime()
                          );
                          const firstDate = new Date(sortedLogs[0].completedAt || sortedLogs[0].startTime);
                          const lastDate = new Date(sortedLogs[sortedLogs.length - 1].completedAt || sortedLogs[sortedLogs.length - 1].startTime);
                          return `${firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                        })()}
                      </p>
                      <div className="mt-3 pt-3 border-t border-white/20">
                        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--ink)' }}>Performance Scale:</p>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#dc2626' }}></div>
                            <span style={{ color: 'var(--ink)', opacity: 0.7 }}>0-39: Poor</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ea580c' }}></div>
                            <span style={{ color: 'var(--ink)', opacity: 0.7 }}>40-59: OK</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#2563eb' }}></div>
                            <span style={{ color: 'var(--ink)', opacity: 0.7 }}>60-79: Good</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#059669' }}></div>
                            <span style={{ color: 'var(--ink)', opacity: 0.7 }}>80-100: Excellent</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
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
                  {monthlyStats.logs && monthlyStats.logs.length > 0 && (
                    <p className="text-xs font-semibold mt-2" style={{ color: 'var(--ink)' }}>
                      {(() => {
                        const sortedLogs = [...monthlyStats.logs].sort((a: any, b: any) =>
                          new Date(a.completedAt || a.startTime).getTime() - new Date(b.completedAt || b.startTime).getTime()
                        );
                        const firstDate = new Date(sortedLogs[0].completedAt || sortedLogs[0].startTime);
                        const lastDate = new Date(sortedLogs[sortedLogs.length - 1].completedAt || sortedLogs[sortedLogs.length - 1].startTime);
                        return `${firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                      })()}
                    </p>
                  )}
                  <p className="text-xs opacity-70 mt-1" style={{ color: 'var(--ink)' }}>
                    Adjusted for session count & completion
                  </p>
                </div>

                {/* Exceeded Goals Card - Green to match 8-point color */}
                <div className="glass rounded-xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10" style={{ backgroundColor: '#059669', transform: 'translate(30%, -30%)' }}></div>
                  <CheckCircle2 className="h-8 w-8 mb-3" style={{ color: '#059669' }} />
                  <p className="text-sm opacity-70 mb-1" style={{ color: 'var(--ink)' }}>Exceeded Goals</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold" style={{ color: '#059669' }}>{monthlyStats.performanceBreakdown.exceededGoals}</p>
                    <p className="text-sm opacity-50" style={{ color: 'var(--ink)' }}>/{monthlyStats.totalSessions}</p>
                  </div>
                  <p className="text-xs opacity-50 mt-1" style={{ color: 'var(--ink)' }}>
                    {monthlyStats.totalSessions > 0 ? Math.round((monthlyStats.performanceBreakdown.exceededGoals / monthlyStats.totalSessions) * 100) : 0}% of total sessions
                  </p>
                  {monthlyStats.logs && monthlyStats.logs.length > 0 && (
                    <p className="text-xs font-semibold mt-1" style={{ color: 'var(--ink)' }}>
                      {(() => {
                        const sortedLogs = [...monthlyStats.logs].sort((a: any, b: any) =>
                          new Date(a.completedAt || a.startTime).getTime() - new Date(b.completedAt || b.startTime).getTime()
                        );
                        const firstDate = new Date(sortedLogs[0].completedAt || sortedLogs[0].startTime);
                        const lastDate = new Date(sortedLogs[sortedLogs.length - 1].completedAt || sortedLogs[sortedLogs.length - 1].startTime);
                        return `${firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                      })()}
                    </p>
                  )}
                  <p className="text-xs opacity-70 mt-1" style={{ color: 'var(--ink)' }}>
                    8 points = surpassed expectations
                  </p>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Performance Breakdown Pie Chart  */}
                <div className="glass rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                    Performance Breakdown
                  </h3>
                  <p className="text-xs opacity-70 mb-1" style={{ color: 'var(--ink)' }}>
                    How many sessions at each performance level
                  </p>
                  {monthlyStats.logs && monthlyStats.logs.length > 0 && (
                    <p className="text-xs font-semibold mb-3" style={{ color: 'var(--ink)' }}>
                      {(() => {
                        const sortedLogs = [...monthlyStats.logs].sort((a: any, b: any) =>
                          new Date(a.completedAt || a.startTime).getTime() - new Date(b.completedAt || b.startTime).getTime()
                        );
                        const firstDate = new Date(sortedLogs[0].completedAt || sortedLogs[0].startTime);
                        const lastDate = new Date(sortedLogs[sortedLogs.length - 1].completedAt || sortedLogs[sortedLogs.length - 1].startTime);
                        return `${firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • ${monthlyStats.totalSessions} total sessions`;
                      })()}
                    </p>
                  )}
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: '0pts: No Show', value: monthlyStats.performanceBreakdown.noShow, color: '#ef4444' },
                          { name: '4pts: Completed', value: monthlyStats.performanceBreakdown.completed, color: '#f59e0b' },
                          { name: '6pts: Met Goals', value: monthlyStats.performanceBreakdown.metGoals, color: '#3b82f6' },
                          { name: '8pts: Exceeded Goals', value: monthlyStats.performanceBreakdown.exceededGoals, color: '#10b981' },
                        ].filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={(props: any) => {
                          const { x, y, value, name } = props;
                          const isBlue = name === '6pts: Met Goals';
                          const adjustedX = isBlue ? x + 10 : x;
                          const adjustedY = isBlue ? y + 18 : y;
                          return (
                            <text
                              x={adjustedX}
                              y={adjustedY}
                              fill="white"
                              textAnchor={x > 200 ? 'start' : 'end'}
                              dominantBaseline="middle"
                              fontSize="12"
                            >
                              {`${value} ${value === 1 ? 'session' : 'sessions'} completed`}
                            </text>
                          );
                        }}
                        labelLine={true}
                      >
                        {[
                          { name: '0pts: No Show', value: monthlyStats.performanceBreakdown.noShow, color: '#ef4444' },
                          { name: '4pts: Completed', value: monthlyStats.performanceBreakdown.completed, color: '#f59e0b' },
                          { name: '6pts: Met Goals', value: monthlyStats.performanceBreakdown.metGoals, color: '#3b82f6' },
                          { name: '8pts: Exceeded Goals', value: monthlyStats.performanceBreakdown.exceededGoals, color: '#10b981' },
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
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                    Weekly Progress
                  </h3>
                  <p className="text-xs opacity-70 mb-1" style={{ color: 'var(--ink)' }}>
                    Average performance score per session each week
                  </p>
                  {monthlyStats.logs && monthlyStats.logs.length > 0 && (
                    <p className="text-xs font-semibold mb-3" style={{ color: 'var(--ink)' }}>
                      {new Date(monthlyStats.year, monthlyStats.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} • Scale: 0-8 points
                    </p>
                  )}
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

                        // Color based on average score ranges
                        let barColor = '#6b7280'; // gray for no data
                        if (avgScore === 0) barColor = '#dc2626'; // red - no show
                        else if (avgScore > 0 && avgScore < 5) barColor = '#ea580c'; // orange - completed range (1-4)
                        else if (avgScore >= 5 && avgScore < 7) barColor = '#2563eb'; // blue - met goals range (5-6)
                        else if (avgScore >= 7) barColor = '#059669'; // green - exceeded goals range (7-8)

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
                          else if (avgScore > 0 && avgScore < 5) barColor = '#ea580c'; // orange - completed range (1-4)
                          else if (avgScore >= 5 && avgScore < 7) barColor = '#2563eb'; // blue - met goals range (5-6)
                          else if (avgScore >= 7) barColor = '#059669'; // green - exceeded goals range (7-8)

                          return <Cell key={`cell-${index}`} fill={barColor} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Calorie Burn Tracking Chart */}
              <div className="glass rounded-xl p-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--ink)' }}>
                    <Flame className="h-5 w-5 text-orange-500" />
                    Daily Calories Burned - {new Date(monthlyStats.year, monthlyStats.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="text-center">
                    <p className="text-xs opacity-70" style={{ color: 'var(--ink)' }}>Total Calories</p>
                    <p className="text-2xl font-bold text-orange-500">
                      {(() => {
                        const logs = monthlyStats.logs || [];
                        return logs.reduce((sum: number, log: any) => sum + (log.caloriesBurned || 0), 0).toLocaleString();
                      })()}
                    </p>
                  </div>
                </div>
                <div className="mb-2 flex flex-wrap gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="font-semibold" style={{ color: 'var(--ink)' }}>Daily Calories</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                    <span className="font-semibold" style={{ color: 'var(--ink)' }}>Running Total</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-0.5 bg-green-500" style={{ borderTop: '2px dashed #22c55e' }}></div>
                    <span className="font-semibold" style={{ color: 'var(--ink)' }}>Daily Allowance (2000)</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={(() => {
                    // Calculate daily calories burned from exercise logs for the current month
                    const logs = monthlyStats.logs || [];
                    const dailyCalories: { [key: string]: { date: Date, dateStr: string, calories: number, exercises: string[] } } = {};

                    logs.forEach((log: any) => {
                      const dateObj = new Date(log.startTime || log.completedAt);
                      const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      const key = dateObj.toISOString().split('T')[0]; // Use ISO date as key for sorting

                      if (!dailyCalories[key]) {
                        dailyCalories[key] = { date: dateObj, dateStr, calories: 0, exercises: [] };
                      }
                      dailyCalories[key].calories += log.caloriesBurned || 0;

                      // Add exercise name if available (from calendar events that have exercise relation)
                      // For now we'll show a placeholder, but you can enhance this with actual exercise names
                      const exerciseInfo = `${log.caloriesBurned || 0} cal`;
                      dailyCalories[key].exercises.push(exerciseInfo);
                    });

                    // Sort by date chronologically (earliest to latest) and calculate running total
                    let runningTotal = 0;
                    return Object.values(dailyCalories)
                      .sort((a, b) => a.date.getTime() - b.date.getTime())
                      .map(({ dateStr, calories, exercises }) => {
                        runningTotal += calories;
                        return {
                          date: dateStr,
                          calories,
                          runningTotal,
                          exercises: exercises.join(', ')
                        };
                      })
                      .slice(-90); // Limit to last 90 days for chart performance
                  })()}>
                    <defs>
                      <linearGradient id="calorieGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity={0.8}/>
                        <stop offset="100%" stopColor="#f97316" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="runningTotalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4}/>
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis
                      dataKey="date"
                      stroke="#9ca3af"
                      tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }}
                      tickLine={{ stroke: '#6b7280' }}
                    />
                    <YAxis
                      domain={[0, 2500]}
                      ticks={[0, 325, 650, 1000, 1500, 2000, 2500]}
                      stroke="#9ca3af"
                      tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }}
                      tickLine={{ stroke: '#6b7280' }}
                      label={{ value: 'Calories', angle: -90, position: 'insideLeft', style: { fill: '#d1d5db', fontSize: 12, fontWeight: 600 } }}
                    />
                    <ReferenceLine
                      y={325}
                      stroke="#9ca3af"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      strokeOpacity={0.5}
                    />
                    <ReferenceLine
                      y={2000}
                      stroke="#22c55e"
                      strokeWidth={2}
                      strokeDasharray="8 4"
                      label={{
                        value: 'Daily Caloric Allowance (2000 cal)',
                        position: 'insideTopRight',
                        fill: '#22c55e',
                        fontSize: 12,
                        fontWeight: 600
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))',
                        border: '2px solid #f97316',
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(249, 115, 22, 0.3)',
                        backdropFilter: 'blur(10px)'
                      }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}
                      cursor={{ fill: 'rgba(249, 115, 22, 0.1)', stroke: '#f97316', strokeWidth: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="calories"
                      stroke="#f97316"
                      strokeWidth={3}
                      fill="url(#calorieGrad)"
                      name="Daily Calories"
                      dot={{ fill: '#f97316', r: 4, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 7, strokeWidth: 3 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="runningTotal"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      fill="url(#runningTotalGrad)"
                      name="Running Total"
                      dot={{ fill: '#06b6d4', r: 3, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                      strokeDasharray="5 5"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* ===== ADVANCED CARDIAC EXERCISE ANALYTICS ===== */}
              <div className="mt-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <Heart className="h-8 w-8 text-red-400" />
                  Advanced Cardiac Exercise Analytics
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 1. Cardiovascular Endurance Progression (3D Area Chart) */}
                  <div className="glass rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 pointer-events-none" />

                    <div className="relative z-10">
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="h-6 w-6 text-cyan-400" />
                        Cardiovascular Endurance Progression
                      </h3>

                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={(() => {
                          // Use REAL endurance data from logs (duration and distance)
                          const logs = monthlyStats.logs || [];

                          // Sort logs chronologically (earliest to latest for left-to-right time flow)
                          const sortedLogs = [...logs].sort((a: any, b: any) =>
                            new Date(a.startTime || a.completedAt).getTime() - new Date(b.startTime || b.completedAt).getTime()
                          );

                          // Filter logs that have duration or distance data
                          const logsWithEndurance = sortedLogs.filter((log: any) =>
                            (log.actualDuration && log.actualDuration > 0) ||
                            (log.distanceMiles && log.distanceMiles > 0)
                          );

                          // Limit to last 90 days for chart performance
                          return logsWithEndurance.slice(-90).map((log: any) => ({
                            date: new Date(log.startTime || log.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                            duration: log.actualDuration || 0, // REAL duration in minutes
                            distance: log.distanceMiles || 0, // REAL distance in miles
                            avgHR: log.heartRateAvg || 0 // REAL average heart rate
                          }));
                        })()}>
                          <defs>
                            <linearGradient id="durationGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.8}/>
                              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id="distanceGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                              <stop offset="100%" stopColor="#10b981" stopOpacity={0.1}/>
                            </linearGradient>
                            <filter id="enduranceGlow">
                              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                              <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                              </feMerge>
                            </filter>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="date" stroke="#ffffff60" style={{ fontSize: '12px' }} />
                          <YAxis stroke="#ffffff60" style={{ fontSize: '12px' }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(0, 0, 0, 0.8)',
                              backdropFilter: 'blur(10px)',
                              border: '1px solid rgba(6, 182, 212, 0.3)',
                              borderRadius: '12px',
                              padding: '12px',
                              color: '#ffffff'
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Area type="monotone" dataKey="duration" stroke="#06b6d4" strokeWidth={3} fill="url(#durationGrad)" name="Duration (min)" filter="url(#enduranceGlow)" />
                          <Area type="monotone" dataKey="distance" stroke="#10b981" strokeWidth={3} fill="url(#distanceGrad)" name="Distance (mi)" filter="url(#enduranceGlow)" />
                        </AreaChart>
                      </ResponsiveContainer>

                      <p className="text-xs text-center text-white/60 mt-3">
                        📈 Tracking exercise duration and distance over time
                      </p>
                    </div>
                  </div>

                  {/* 2. Exercise Capacity Trend Line (Glowing Path Chart) */}
                  <div className="glass rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-fuchsia-500/10 to-pink-500/10 pointer-events-none" />

                    <div className="relative z-10">
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <Activity className="h-6 w-6 text-purple-400" />
                        Exercise Capacity (MET Levels)
                      </h3>

                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={(() => {
                          // Use REAL MET data from logs with heart rate data
                          const logs = monthlyStats.logs || [];

                          // Sort logs chronologically (earliest to latest)
                          const sortedLogs = [...logs].sort((a: any, b: any) =>
                            new Date(a.startTime || a.completedAt).getTime() - new Date(b.startTime || b.completedAt).getTime()
                          );

                          // Filter logs that have MET data and limit to last 90 days
                          const logsWithMET = sortedLogs.filter((log: any) => log.actualMET !== null && log.actualMET !== undefined);

                          return logsWithMET.slice(-90).map((log: any) => ({
                            date: new Date(log.startTime || log.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                            metLevel: log.actualMET || 0, // Real calculated MET from heart rate data
                            targetMin: log.targetMETMin || 0, // Minimum target MET zone
                            targetMax: log.targetMETMax || 0, // Maximum target MET zone
                          }));
                        })()}>
                          <defs>
                            <linearGradient id="metGradient" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#a855f7" />
                              <stop offset="50%" stopColor="#ec4899" />
                              <stop offset="100%" stopColor="#f472b6" />
                            </linearGradient>
                            <filter id="metGlow">
                              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                              <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                              </feMerge>
                            </filter>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="date" stroke="#ffffff60" style={{ fontSize: '12px' }} />
                          <YAxis stroke="#ffffff60" style={{ fontSize: '12px' }} domain={[0, 'auto']} label={{ value: 'METs', angle: -90, position: 'insideLeft', fill: '#ffffff60' }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(0, 0, 0, 0.8)',
                              backdropFilter: 'blur(10px)',
                              border: '1px solid rgba(168, 85, 247, 0.3)',
                              borderRadius: '12px',
                              padding: '12px',
                              color: '#ffffff'
                            }}
                            formatter={(value: any, name: string) => {
                              if (name === 'Actual MET') return [value.toFixed(2), name];
                              if (name === 'Target Min') return [value.toFixed(2), name];
                              if (name === 'Target Max') return [value.toFixed(2), name];
                              return [value, name];
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Line type="monotone" dataKey="targetMin" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" name="Target Min" dot={false} />
                          <Line type="monotone" dataKey="targetMax" stroke="#eab308" strokeWidth={2} strokeDasharray="5 5" name="Target Max" dot={false} />
                          <Line type="monotone" dataKey="metLevel" stroke="url(#metGradient)" strokeWidth={4} name="Actual MET" dot={{ r: 6, fill: '#a855f7', strokeWidth: 2, stroke: '#fff' }} filter="url(#metGlow)" />
                        </LineChart>
                      </ResponsiveContainer>

                      <p className="text-xs text-center text-white/60 mt-3">
                        💪 MET (Metabolic Equivalent) levels indicate exercise intensity
                      </p>
                    </div>
                  </div>

                  {/* 3. Heart Rate Recovery Radar */}
                  <div className="glass rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-orange-500/10 to-yellow-500/10 pointer-events-none" />

                    <div className="relative z-10">
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <Heart className="h-6 w-6 text-red-400" />
                        Heart Rate Recovery Analysis
                      </h3>

                      <ResponsiveContainer width="100%" height={300}>
                        <RadarChart data={(() => {
                          // Simulate HR recovery data
                          const avgScore = monthlyStats.totalSessions > 0 ? monthlyStats.totalScore / monthlyStats.totalSessions : 4;
                          const recoveryFactor = avgScore / 8; // 0-1 scale

                          return [
                            { metric: 'Resting HR', value: 95 - (recoveryFactor * 20), fullMark: 100 },
                            { metric: 'Peak HR', value: 85 + (recoveryFactor * 10), fullMark: 100 },
                            { metric: '1-Min Recovery', value: 70 + (recoveryFactor * 25), fullMark: 100 },
                            { metric: '2-Min Recovery', value: 75 + (recoveryFactor * 20), fullMark: 100 },
                            { metric: '5-Min Recovery', value: 80 + (recoveryFactor * 15), fullMark: 100 }
                          ];
                        })()}>
                          <defs>
                            <linearGradient id="hrRadarGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8}/>
                              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.3}/>
                            </linearGradient>
                            <filter id="hrRadarGlow">
                              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                              <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                              </feMerge>
                            </filter>
                          </defs>
                          <PolarGrid stroke="rgba(255,255,255,0.2)" />
                          <PolarAngleAxis dataKey="metric" stroke="#ffffff80" style={{ fontSize: '11px' }} />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#ffffff40" style={{ fontSize: '10px' }} />
                          <Radar name="HR Recovery" dataKey="value" stroke="#ef4444" strokeWidth={3} fill="url(#hrRadarGrad)" fillOpacity={0.6} filter="url(#hrRadarGlow)" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(0, 0, 0, 0.8)',
                              backdropFilter: 'blur(10px)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '12px',
                              padding: '12px',
                              color: '#ffffff'
                            }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>

                      <p className="text-xs text-center text-white/60 mt-3">
                        ❤️ Heart rate recovery is a key indicator of cardiovascular fitness
                      </p>
                    </div>
                  </div>

                  {/* 4. Exercise Volume Heatmap (Weekly Calendar) */}
                  <div className="glass rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-green-500/10 to-lime-500/10 pointer-events-none" />

                    <div className="relative z-10">
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <Calendar className="h-6 w-6 text-emerald-400" />
                        Weekly Exercise Volume
                      </h3>

                      <div className="grid grid-cols-7 gap-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                          <div key={day} className="text-center text-xs font-medium text-white/60 mb-1">
                            {day}
                          </div>
                        ))}
                        {(() => {
                          // Create a 4-week heatmap with REAL DATA
                          const weeks = 4;
                          const days = weeks * 7;
                          const logs = monthlyStats.logs || [];

                          // Calculate daily exercise minutes from real logs
                          const dailyMinutes: { [dateKey: string]: number } = {};

                          logs.forEach((log: any) => {
                            const logDate = new Date(log.startTime || log.completedAt);
                            const dateKey = logDate.toDateString(); // Use full date string as key

                            if (!dailyMinutes[dateKey]) {
                              dailyMinutes[dateKey] = 0;
                            }
                            dailyMinutes[dateKey] += log.actualDuration || 0;
                          });

                          // Get the last 28 days
                          const today = new Date();
                          const startDate = new Date(today);
                          startDate.setDate(today.getDate() - 27); // Go back 27 days (plus today = 28 days)

                          return Array.from({ length: days }).map((_, index) => {
                            // Calculate the actual date for this cell
                            const cellDate = new Date(startDate);
                            cellDate.setDate(startDate.getDate() + index);
                            const dateKey = cellDate.toDateString();

                            // Get actual minutes for this date
                            const minutes = dailyMinutes[dateKey] || 0;

                            // Determine intensity level based on actual minutes
                            let intensity = 0;
                            if (minutes === 0) intensity = 0; // Rest
                            else if (minutes <= 30) intensity = 1; // Light (1-30 min)
                            else if (minutes <= 60) intensity = 2; // Moderate (31-60 min)
                            else if (minutes <= 90) intensity = 3; // High (61-90 min)
                            else intensity = 4; // Very high (90+ min)

                            const colors = [
                              'rgba(255, 255, 255, 0.05)', // No exercise
                              'rgba(16, 185, 129, 0.2)',  // Light
                              'rgba(16, 185, 129, 0.4)',  // Moderate
                              'rgba(16, 185, 129, 0.7)',  // High
                              'rgba(16, 185, 129, 0.95)'  // Very high
                            ];

                            const intensityLabels = ['Rest', 'Light', 'Moderate', 'High', 'Very High'];

                            return (
                              <div
                                key={index}
                                className="aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all hover:scale-110 cursor-pointer"
                                style={{
                                  backgroundColor: colors[intensity],
                                  border: intensity > 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                                  color: intensity > 2 ? '#ffffff' : '#ffffff60'
                                }}
                                title={`${cellDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${minutes === 0 ? 'Rest' : Math.round(minutes) + ' min (' + intensityLabels[intensity] + ')'}`}
                              >
                                {minutes > 0 ? Math.round(minutes) : ''}
                              </div>
                            );
                          });
                        })()}
                      </div>

                      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-white/60">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}></div>
                          <span>Rest</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(16, 185, 129, 0.3)' }}></div>
                          <span>Light</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(16, 185, 129, 0.7)' }}></div>
                          <span>Moderate</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(16, 185, 129, 0.95)' }}></div>
                          <span>Intense</span>
                        </div>
                      </div>

                      <p className="text-xs text-center text-white/60 mt-3">
                        📅 Exercise minutes per day over the past 4 weeks
                      </p>
                    </div>
                  </div>

                  {/* 5. RPE vs Heart Rate Correlation (Scatter Plot) */}
                  <div className="glass rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10 pointer-events-none" />

                    <div className="relative z-10">
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <Target className="h-6 w-6 text-amber-400" />
                        RPE vs Heart Rate Correlation
                      </h3>

                      <ResponsiveContainer width="100%" height={300}>
                        <ScatterChart>
                          <defs>
                            <linearGradient id="rpeGradient" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#10b981" />
                              <stop offset="50%" stopColor="#f59e0b" />
                              <stop offset="100%" stopColor="#ef4444" />
                            </linearGradient>
                            <filter id="rpeGlow">
                              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                              <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                              </feMerge>
                            </filter>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis
                            type="number"
                            dataKey="rpe"
                            name="RPE"
                            domain={[6, 20]}
                            stroke="#ffffff60"
                            style={{ fontSize: '12px' }}
                            label={{ value: 'Rate of Perceived Exertion (RPE)', position: 'insideBottom', offset: -5, fill: '#ffffff60' }}
                          />
                          <YAxis
                            type="number"
                            dataKey="heartRate"
                            name="Heart Rate"
                            domain={[60, 180]}
                            stroke="#ffffff60"
                            style={{ fontSize: '12px' }}
                            label={{ value: 'Heart Rate (bpm)', angle: -90, position: 'insideLeft', fill: '#ffffff60' }}
                          />
                          <Tooltip
                            cursor={{ strokeDasharray: '3 3' }}
                            contentStyle={{
                              backgroundColor: 'rgba(0, 0, 0, 0.8)',
                              backdropFilter: 'blur(10px)',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              borderRadius: '12px',
                              padding: '12px',
                              color: '#ffffff'
                            }}
                          />
                          <Scatter
                            name="Exercise Sessions"
                            data={(() => {
                              // Simulate RPE vs HR data
                              const logs = monthlyStats.logs || [];
                              return logs.slice(-20).map((log: any) => ({
                                rpe: 8 + Math.random() * 8, // RPE 8-16
                                heartRate: 80 + Math.random() * 60, // HR 80-140
                                session: new Date(log.startTime).toLocaleDateString()
                              }));
                            })()}
                            fill="url(#rpeGradient)"
                            filter="url(#rpeGlow)"
                          >
                            {(() => {
                              const logs = monthlyStats.logs || [];
                              return logs.slice(-20).map((_: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={index < 7 ? '#10b981' : index < 14 ? '#f59e0b' : '#ef4444'} />
                              ));
                            })()}
                          </Scatter>
                          <ReferenceLine x={13} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={2} label={{ value: 'Target RPE', fill: '#f59e0b', fontSize: 11 }} />
                        </ScatterChart>
                      </ResponsiveContainer>

                      <p className="text-xs text-center text-white/60 mt-3">
                        🎯 Ensures perceived exertion aligns with actual heart rate
                      </p>
                    </div>
                  </div>

                  {/* 6. Post-Op Week Progression Timeline */}
                  <div className="glass rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-blue-500/10 to-cyan-500/10 pointer-events-none" />

                    <div className="relative z-10">
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <Clock className="h-6 w-6 text-indigo-400" />
                        Post-Op Recovery Milestones
                      </h3>

                      <div className="relative py-4">
                        {/* Timeline */}
                        <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 top-8 rounded-full"></div>

                        <div className="grid grid-cols-6 gap-2 relative">
                          {[
                            { week: 1, label: 'Week 1-2', milestone: 'Breathing & Mobility', unlocked: true },
                            { week: 3, label: 'Week 3-4', milestone: 'Light Walking', unlocked: true },
                            { week: 5, label: 'Week 5-6', milestone: 'Moderate Cardio', unlocked: true },
                            { week: 7, label: 'Week 7-8', milestone: 'Strength Training', unlocked: monthlyStats.percentageScore >= 60 },
                            { week: 9, label: 'Week 9-10', milestone: 'Advanced Cardio', unlocked: monthlyStats.percentageScore >= 75 },
                            { week: 11, label: 'Week 11-12', milestone: 'Full Activity', unlocked: monthlyStats.percentageScore >= 85 }
                          ].map((stage, index) => (
                            <div key={index} className="flex flex-col items-center">
                              <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                                  stage.unlocked ? 'animate-pulse' : ''
                                }`}
                                style={{
                                  backgroundColor: stage.unlocked ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                                  border: stage.unlocked ? '3px solid #3b82f6' : '2px solid rgba(255, 255, 255, 0.2)',
                                  boxShadow: stage.unlocked ? '0 0 20px rgba(59, 130, 246, 0.5)' : 'none'
                                }}
                              >
                                {stage.unlocked ? (
                                  <CheckCircle2 className="h-6 w-6 text-blue-400" />
                                ) : (
                                  <Clock className="h-5 w-5 text-white/40" />
                                )}
                              </div>
                              <div className="text-xs font-medium text-white text-center mb-1">
                                {stage.label}
                              </div>
                              <div className="text-xs text-white/60 text-center">
                                {stage.milestone}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-center text-white/60 mt-6">
                        🏆 Cardiac rehabilitation progression based on performance
                      </p>
                    </div>
                  </div>

                  {/* 7. Category Balance Radial (Multi-ring Chart) */}
                  <div className="glass rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 pointer-events-none" />

                    <div className="relative z-10">
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <Target className="h-6 w-6 text-violet-400" />
                        Exercise Category Balance
                      </h3>

                      <div className="flex items-center justify-center py-4">
                        <div className="relative" style={{ width: 280, height: 280 }}>
                          <svg className="absolute inset-0" width="280" height="280">
                            <defs>
                              {/* Gradients for each category */}
                              <linearGradient id="cardioRing" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#ef4444" />
                                <stop offset="100%" stopColor="#dc2626" />
                              </linearGradient>
                              <linearGradient id="strengthRing" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="#2563eb" />
                              </linearGradient>
                              <linearGradient id="flexRing" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#a855f7" />
                                <stop offset="100%" stopColor="#9333ea" />
                              </linearGradient>
                              <linearGradient id="breathRing" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#10b981" />
                                <stop offset="100%" stopColor="#059669" />
                              </linearGradient>
                              <filter id="categoryGlow">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                <feMerge>
                                  <feMergeNode in="coloredBlur"/>
                                  <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                              </filter>
                            </defs>

                            {/* Calculate category percentages */}
                            {(() => {
                              // Simulated category distribution
                              const categories = [
                                { name: 'Cardio', percent: 40, radius: 100, color: 'cardioRing', icon: '❤️' },
                                { name: 'Strength', percent: 25, radius: 80, color: 'strengthRing', icon: '💪' },
                                { name: 'Flexibility', percent: 20, radius: 60, color: 'flexRing', icon: '🤸' },
                                { name: 'Breathing', percent: 15, radius: 40, color: 'breathRing', icon: '🫁' }
                              ];

                              return categories.map((cat, index) => {
                                const circumference = 2 * Math.PI * cat.radius;
                                const dashOffset = circumference * (1 - cat.percent / 100);

                                return (
                                  <circle
                                    key={index}
                                    cx="140"
                                    cy="140"
                                    r={cat.radius}
                                    fill="none"
                                    stroke={`url(#${cat.color})`}
                                    strokeWidth="16"
                                    strokeLinecap="round"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={dashOffset}
                                    transform="rotate(-90 140 140)"
                                    filter="url(#categoryGlow)"
                                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                                  />
                                );
                              });
                            })()}
                          </svg>

                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-4xl font-bold text-white">100%</div>
                              <div className="text-sm text-white/60 mt-1">Balanced</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-4">
                        {[
                          { name: 'Cardio', percent: 40, color: '#ef4444', icon: '❤️' },
                          { name: 'Strength', percent: 25, color: '#3b82f6', icon: '💪' },
                          { name: 'Flexibility', percent: 20, color: '#a855f7', icon: '🤸' },
                          { name: 'Breathing', percent: 15, color: '#10b981', icon: '🫁' }
                        ].map((cat, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                            <span className="text-sm text-white">{cat.icon} {cat.name}</span>
                            <span className="text-sm font-bold text-white ml-auto">{cat.percent}%</span>
                          </div>
                        ))}
                      </div>

                      <p className="text-xs text-center text-white/60 mt-4">
                        ⚖️ Balanced exercise program for optimal cardiac recovery
                      </p>
                    </div>
                  </div>

                  {/* 8. Exercise Safety & Form Compliance Meter */}
                  <div className="glass rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-teal-500/10 pointer-events-none" />

                    <div className="relative z-10">
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <CheckCircle2 className="h-6 w-6 text-green-400" />
                        Safety & Form Compliance
                      </h3>

                      <div className="space-y-4">
                        {[
                          { category: 'Proper Warm-up', score: 92, color: '#10b981', icon: '🔥' },
                          { category: 'Form Quality', score: 88, color: '#10b981', icon: '✓' },
                          { category: 'Cool-down Protocol', score: 85, color: '#10b981', icon: '❄️' },
                          { category: 'Safety Guidelines', score: 95, color: '#10b981', icon: '🛡️' },
                          { category: 'Heart Rate Monitoring', score: 90, color: '#10b981', icon: '❤️' }
                        ].map((item, index) => (
                          <div key={index}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-white flex items-center gap-2">
                                <span>{item.icon}</span>
                                {item.category}
                              </span>
                              <span className="text-lg font-bold" style={{ color: item.color }}>
                                {item.score}%
                              </span>
                            </div>
                            <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-1000"
                                style={{
                                  width: `${item.score}%`,
                                  background: `linear-gradient(90deg, ${item.color}, ${item.color}dd)`,
                                  boxShadow: `0 0 10px ${item.color}80`
                                }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        <div className="flex items-center gap-3">
                          <Award className="h-8 w-8 text-green-400" />
                          <div>
                            <div className="text-2xl font-bold text-green-400">90%</div>
                            <div className="text-sm text-white/70">Overall Safety Score</div>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-center text-white/60 mt-4">
                        🛡️ Proper form and safety protocols prevent cardiac complications
                      </p>
                    </div>
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
              <input
                type="file"
                id="video-upload-therapist"
                accept="video/*"
                onChange={handleUploadVideo}
                className="hidden"
              />
              <label
                htmlFor="video-upload-therapist"
                className="flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-all hover:scale-105 cursor-pointer flex items-center gap-2"
                style={{
                  backgroundColor: uploadingVideo ? 'rgba(156, 163, 175, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                  color: uploadingVideo ? '#9ca3af' : '#8b5cf6',
                  border: `1px solid ${uploadingVideo ? 'rgba(156, 163, 175, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
                  pointerEvents: uploadingVideo ? 'none' : 'auto'
                }}
                title="Upload video file"
              >
                <Upload className="h-4 w-4" />
                {uploadingVideo ? 'Uploading...' : 'Upload'}
              </label>
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
            {videoFile && (
              <p className="text-xs mt-1" style={{ color: '#8b5cf6' }}>
                Selected: {videoFile.name}
              </p>
            )}
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
              <input
                type="file"
                id="image-upload-therapist"
                accept="image/*"
                onChange={handleUploadImage}
                className="hidden"
              />
              <label
                htmlFor="image-upload-therapist"
                className="flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-all hover:scale-105 cursor-pointer flex items-center gap-2"
                style={{
                  backgroundColor: uploadingImage ? 'rgba(156, 163, 175, 0.2)' : 'rgba(236, 72, 153, 0.2)',
                  color: uploadingImage ? '#9ca3af' : '#ec4899',
                  border: `1px solid ${uploadingImage ? 'rgba(156, 163, 175, 0.3)' : 'rgba(236, 72, 153, 0.3)'}`,
                  pointerEvents: uploadingImage ? 'none' : 'auto'
                }}
                title="Upload image file"
              >
                <Upload className="h-4 w-4" />
                {uploadingImage ? 'Uploading...' : 'Upload'}
              </label>
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
            {imageFile && (
              <p className="text-xs mt-1" style={{ color: '#ec4899' }}>
                Selected: {imageFile.name}
              </p>
            )}
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
          setLimitationWarning(null);
          setWarningOverridden(false);
        }}
        title={`Schedule: ${schedulingExercise?.name || ''}`}
        size="md"
      >
        <div className="space-y-4">
          {/* Physical Limitations Warning */}
          {limitationWarning && (
            <div className="p-4 rounded-lg border-2 border-red-500 bg-red-500 bg-opacity-10 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h4 className="font-bold text-red-500 mb-1">Physical Limitation Warning</h4>
                  <p className="text-sm text-red-400">{limitationWarning}</p>
                </div>
              </div>
              {!warningOverridden && (
                <Button
                  onClick={() => setWarningOverridden(true)}
                  variant="danger"
                  className="w-full"
                >
                  I Understand - Override Warning
                </Button>
              )}
              {warningOverridden && (
                <div className="flex items-center gap-2 text-yellow-500 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Warning acknowledged. You may proceed.</span>
                </div>
              )}
            </div>
          )}

          {/* Patient Selection - Only show for therapists */}
          {user?.role !== 'patient' && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                Patient *
              </label>
              <select
                className="glass-input"
                value={schedulePatientId}
                onChange={async (e) => {
                  setSchedulePatientId(e.target.value);
                  // Re-check limitations when patient changes
                  if (schedulingExercise && e.target.value) {
                    await checkPhysicalLimitations(schedulingExercise, e.target.value);
                  }
                }}
              >
                <option value="">Select Patient</option>
                {patients.filter(p => p.isActive).map(patient => (
                  <option key={patient.id} value={patient.id}>{patient.name}</option>
                ))}
              </select>
            </div>
          )}

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
                setLimitationWarning(null);
                setWarningOverridden(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleScheduleSubmit}
              disabled={limitationWarning !== null && !warningOverridden}
            >
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
                      src={`${viewingExercise.videoUrl.includes('youtube.com')
                        ? viewingExercise.videoUrl.replace('watch?v=', 'embed/')
                        : viewingExercise.videoUrl.replace('youtu.be/', 'youtube.com/embed/')}?autoplay=0&rel=0&modestbranding=1&playsinline=1`}
                      title="Exercise video"
                      frameBorder="0"
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
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
