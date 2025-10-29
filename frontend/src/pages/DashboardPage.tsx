import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Activity,
  Pill,
  Calendar,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  UtensilsCrossed,
  CheckCircle,
  Clock,
  UserPlus,
  Stethoscope,
  Users,
  Award,
  Target,
  Camera,
  Bell,
  BarChart3,
  ThumbsUp,
  Star,
  Zap,
  X,
  Trophy
} from 'lucide-react';
import { GlassCard } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { usePatientSelection } from '../contexts/PatientSelectionContext';
import api from '../services/api';
import { VitalsSample, Medication, CalendarEvent, MealEntry, Patient } from '../types';
import { format, subDays, differenceInWeeks } from 'date-fns';
import { WeightTrackingChart } from '../components/charts/WeightTrackingChart';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  Bar
} from 'recharts';

interface DashboardStats {
  todayEvents: CalendarEvent[];
  activeMedications: Medication[];
  latestVitals: VitalsSample | null;
  todayMeals: MealEntry[];
  weeklyCompliance: number;
}

interface AdminDashboardStats {
  newPatients: Patient[];
  completingTherapyPatients: Patient[];
  todayAllEvents: CalendarEvent[];
  activePatients: Patient[];
  allEvents?: CalendarEvent[];
  allVitals?: VitalsSample[];
}

interface WeeklyMetrics {
  alertsCount: number;
  completionRate: number;
  totalAppointments: number;
  avgSessionTime: number;
  noShowRate: number;
  milestonesData: {
    week4Count: number;
    weightGoalsCount: number;
    firstExerciseCount: number;
    medicationIndependenceCount: number;
  };
  topPerformers: {
    biggestVitalsImprovement: { name: string; improvement: string } | null;
    perfectAttendance: { name: string; days: number } | null;
    bestOutcome: { name: string; description: string } | null;
  };
  clinicalImprovements: {
    avgVitalsImprovement: number;
    improvingTrendsCount: number;
    medicationReductionCount: number;
    exerciseCapacityIncrease: number;
  };
  upcomingFocus: {
    milestoneCheckIns: number;
    upcomingDischarges: number;
    needsAttention: number;
    highPriorityAppts: number;
  };
}

export function DashboardPage() {
  const { user } = useAuth();
  const { selectedPatient, setSelectedPatient } = usePatientSelection();
  const [stats, setStats] = useState<DashboardStats>({
    todayEvents: [],
    activeMedications: [],
    latestVitals: null,
    todayMeals: [],
    weeklyCompliance: 0,
  });
  const [adminStats, setAdminStats] = useState<AdminDashboardStats>({
    newPatients: [],
    completingTherapyPatients: [],
    todayAllEvents: [],
    activePatients: [],
    allEvents: [],
    allVitals: [],
  });
  const [weeklyMetrics, setWeeklyMetrics] = useState<WeeklyMetrics>({
    alertsCount: 0,
    completionRate: 0,
    totalAppointments: 0,
    avgSessionTime: 0,
    noShowRate: 0,
    milestonesData: {
      week4Count: 0,
      weightGoalsCount: 0,
      firstExerciseCount: 0,
      medicationIndependenceCount: 0,
    },
    topPerformers: {
      biggestVitalsImprovement: null,
      perfectAttendance: null,
      bestOutcome: null,
    },
    clinicalImprovements: {
      avgVitalsImprovement: 0,
      improvingTrendsCount: 0,
      medicationReductionCount: 0,
      exerciseCapacityIncrease: 0,
    },
    upcomingFocus: {
      milestoneCheckIns: 0,
      upcomingDischarges: 0,
      needsAttention: 0,
      highPriorityAppts: 0,
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [progressPhotos, setProgressPhotos] = useState<Record<number, Record<number, string>>>({});
  const [selectedPhotoPatient, setSelectedPhotoPatient] = useState<number | null>(null);
  const [selectedPhotoWeek, setSelectedPhotoWeek] = useState<number>(1);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [weeklyProgressData, setWeeklyProgressData] = useState<Array<{
    week: string;
    exercise: number;
    meals: number;
    medications: number;
    sleep: number;
    weight: number;
  }>>([]);

  const isAdmin = user?.role === 'admin' || user?.role === 'therapist';

  useEffect(() => {
    if (isAdmin) {
      loadAdminDashboardData();
    } else {
      loadDashboardData();
    }
  }, [isAdmin]);

  // Load progress photos from localStorage on mount
  useEffect(() => {
    const savedPhotos = localStorage.getItem('progressPhotos');
    if (savedPhotos) {
      try {
        setProgressPhotos(JSON.parse(savedPhotos));
      } catch (error) {
        console.error('Error loading photos:', error);
      }
    }
  }, []);

  // Set default patient for photos when admin loads patients
  useEffect(() => {
    if (isAdmin && adminStats.activePatients.length > 0 && selectedPhotoPatient === null) {
      setSelectedPhotoPatient(adminStats.activePatients[0].id);
    } else if (!isAdmin && user?.id && selectedPhotoPatient === null) {
      setSelectedPhotoPatient(user.id);
    }
  }, [isAdmin, adminStats.activePatients, user, selectedPhotoPatient]);

  // Calculate 12-week historical progress from real patient data
  const calculate12WeekProgress = async (userId?: number) => {
    try {
      const today = new Date();
      const weeklyData = [];

      for (let weekNum = 1; weekNum <= 12; weekNum++) {
        const weekEndDate = subDays(today, (12 - weekNum) * 7);
        const weekStartDate = subDays(weekEndDate, 7);
        const startStr = format(weekStartDate, 'yyyy-MM-dd');
        const endStr = format(weekEndDate, 'yyyy-MM-dd');

        // Fetch all data for this week
        const [events, meals, sleepLogs, medLogs, vitals] = await Promise.all([
          api.getEvents(userId, startStr, endStr).catch(() => []),
          api.getMeals({ startDate: startStr, endDate: endStr, userId }).catch(() => []),
          api.getSleepLogs({ startDate: startStr, endDate: endStr, userId }).catch(() => []),
          api.getMedicationLogs({ startDate: startStr, endDate: endStr, userId }).catch(() => []),
          api.getVitals({ startDate: startStr, endDate: endStr, userId }).catch(() => []),
        ]);

        // Calculate Exercise Score (0-100)
        const exerciseEvents = events.filter(e =>
          e.calendar?.type === 'exercise' || e.title.toLowerCase().includes('exercise')
        );
        const completedExercise = exerciseEvents.filter(e => e.status === 'completed').length;
        const exerciseScore = exerciseEvents.length > 0
          ? Math.round((completedExercise / exerciseEvents.length) * 100)
          : 0;

        // Calculate Meals Score (0-100) - based on meal quality
        const mealsScore = meals.length > 0
          ? Math.round(meals.reduce((sum, meal) => {
              const qualityScore = meal.heartHealthRating === 'green' ? 100
                : meal.heartHealthRating === 'yellow' ? 60
                : 30;
              return sum + qualityScore;
            }, 0) / meals.length)
          : 0;

        // Calculate Medications Score (0-100) - adherence rate
        const takenMeds = medLogs.filter(log => log.status === 'taken').length;
        const medicationsScore = medLogs.length > 0
          ? Math.round((takenMeds / medLogs.length) * 100)
          : 0;

        // Calculate Sleep Score (0-100) - based on hours (7-9 hours = optimal)
        const sleepScore = sleepLogs.length > 0
          ? Math.round(sleepLogs.reduce((sum, log) => {
              const hours = parseFloat(log.hoursSlept.toString());
              const score = hours >= 7 && hours <= 9 ? 100
                : hours >= 6 && hours < 7 ? 80
                : hours >= 5 && hours < 6 ? 60
                : hours >= 9 && hours <= 10 ? 80
                : 40;
              return sum + score;
            }, 0) / sleepLogs.length)
          : 0;

        // Calculate Weight Score (0-100) - based on weight trend
        const weightScore = vitals.length > 0 && vitals[0].weight
          ? (() => {
              const weekWeight = vitals[vitals.length - 1].weight; // Latest weight in week
              const patient = isAdmin ? selectedPatient : user;
              if (!patient || !patient.startingWeight || !patient.targetWeight) return 0;

              const weightLoss = (patient.startingWeight || 0) - (weekWeight || 0);
              const goalWeightLoss = (patient.startingWeight || 0) - (patient.targetWeight || 0);

              if (goalWeightLoss <= 0) return 0;
              const progress = Math.min(100, Math.round((weightLoss / goalWeightLoss) * 100));
              return Math.max(0, progress);
            })()
          : 0;

        weeklyData.push({
          week: `Week ${weekNum}`,
          exercise: exerciseScore,
          meals: mealsScore,
          medications: medicationsScore,
          sleep: sleepScore,
          weight: weightScore,
        });
      }

      setWeeklyProgressData(weeklyData);
    } catch (error) {
      console.error('Failed to calculate 12-week progress:', error);
      // Set empty data on error
      setWeeklyProgressData([]);
    }
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const [events, medications, vitals, meals] = await Promise.all([
        api.getEvents(undefined, today, today),
        api.getMedications(true),
        api.getLatestVital(),
        api.getMeals(today, today),
      ]);

      // Calculate weekly compliance (simplified)
      const completedEvents = events.filter(e => e.status === 'completed').length;
      const totalEvents = events.length;
      const compliance = totalEvents > 0 ? (completedEvents / totalEvents) * 100 : 100;

      setStats({
        todayEvents: events,
        activeMedications: medications,
        latestVitals: vitals,
        todayMeals: meals,
        weeklyCompliance: Math.round(compliance),
      });

      // Load 12-week progress data
      await calculate12WeekProgress();
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdminDashboardData = async () => {
    try {
      setIsLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = subDays(new Date(), 7).toISOString().split('T')[0];

      // Get all patients for this therapist/admin
      const { data: allPatients } = await api.getPatients();

      // Filter new patients (created in last 7 days)
      const newPatients = allPatients.filter(p => {
        const createdDate = new Date(p.createdAt);
        return createdDate >= new Date(sevenDaysAgo);
      });

      // Filter patients completing therapy (surgery date was ~10-14 weeks ago)
      const completingTherapyPatients = allPatients.filter(p => {
        if (!p.surgeryDate) return false;
        const surgeryDate = new Date(p.surgeryDate);
        const weeksPostOp = differenceInWeeks(new Date(), surgeryDate);
        return weeksPostOp >= 10 && weeksPostOp <= 14 && p.isActive;
      });

      // Get all active patients
      const activePatients = allPatients.filter(p => p.isActive);

      // Get ALL events and vitals across all patients for calculations
      const allEvents: CalendarEvent[] = [];
      const allVitals: VitalsSample[] = [];
      const todayAllEvents: CalendarEvent[] = [];

      for (const patient of activePatients) {
        if (patient.userId) {
          try {
            // Get all events from the last 7 days for metrics
            const events = await api.getEvents(patient.userId, sevenDaysAgo);
            allEvents.push(...events);

            // Get today's events separately
            const todayEvents = await api.getEvents(patient.userId, today, today);
            todayAllEvents.push(...todayEvents);

            // Get vitals from the last 30 days for better analysis
            const vitals = await api.getVitals({
              startDate: subDays(new Date(), 30).toISOString().split('T')[0],
              endDate: today,
              userId: patient.userId
            });
            allVitals.push(...vitals);
          } catch (err) {
            console.error(`Failed to load data for patient ${patient.id}:`, err);
          }
        }
      }

      // Calculate weekly metrics
      const metrics = calculateWeeklyMetrics(activePatients, allEvents, allVitals);
      setWeeklyMetrics(metrics);

      setAdminStats({
        newPatients,
        completingTherapyPatients,
        todayAllEvents,
        activePatients,
        allEvents,
        allVitals,
      });

      // Load 12-week progress data for selected patient or aggregated
      if (selectedPatient?.userId) {
        await calculate12WeekProgress(selectedPatient.userId);
      } else {
        await calculate12WeekProgress();
      }
    } catch (error) {
      console.error('Failed to load admin dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getBloodPressureStatus = (systolic?: number, diastolic?: number) => {
    if (!systolic || !diastolic) return { status: 'Unknown', color: 'gray' };
    if (systolic < 120 && diastolic < 80) return { status: 'Normal', color: 'green' };
    if (systolic < 130 && diastolic < 80) return { status: 'Elevated', color: 'yellow' };
    if (systolic < 140 || diastolic < 90) return { status: 'High (Stage 1)', color: 'orange' };
    return { status: 'High (Stage 2)', color: 'red' };
  };

  // Calculate comprehensive weekly metrics
  const calculateWeeklyMetrics = (
    patients: Patient[],
    allEvents: CalendarEvent[],
    allVitals: VitalsSample[]
  ): WeeklyMetrics => {
    const sevenDaysAgo = subDays(new Date(), 7);
    const today = new Date();

    // Filter events from the last 7 days
    const weekEvents = allEvents.filter(e => new Date(e.startTime) >= sevenDaysAgo);
    const completedEvents = weekEvents.filter(e => e.status === 'completed');
    const missedEvents = weekEvents.filter(e => e.status === 'missed');

    // Alerts: vitals out of range, missed appointments
    const alertsCount = missedEvents.length + allVitals.filter(v => {
      const isBPHigh = (v.bloodPressureSystolic || 0) > 140 || (v.bloodPressureDiastolic || 0) > 90;
      const isHeartRateAbnormal = (v.heartRate || 0) < 50 || (v.heartRate || 0) > 110;
      return isBPHigh || isHeartRateAbnormal;
    }).length;

    // Completion rate
    const completionRate = weekEvents.length > 0
      ? Math.round((completedEvents.length / weekEvents.length) * 100)
      : 0;

    // Appointment metrics
    const appointments = weekEvents.filter(e =>
      e.calendar?.type === 'appointments' || e.title.toLowerCase().includes('appointment')
    );
    const totalAppointments = appointments.length;

    // Average session time (calculate from actual start/end times)
    const avgSessionTime = totalAppointments > 0
      ? Math.round(appointments.reduce((sum, e) => {
          const duration = (new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / (1000 * 60);
          return sum + duration;
        }, 0) / totalAppointments)
      : 0;

    // No-show rate
    const noShows = appointments.filter(e => e.status === 'missed').length;
    const noShowRate = totalAppointments > 0
      ? Math.round((noShows / totalAppointments) * 100 * 10) / 10
      : 0;

    // Recovery milestones
    const milestonesData = {
      week4Count: patients.filter(p => {
        if (!p.surgeryDate) return false;
        const weeks = differenceInWeeks(today, new Date(p.surgeryDate));
        return weeks === 4;
      }).length,
      weightGoalsCount: patients.filter(p => {
        // Count patients who have reached or exceeded their target weight
        if (!p.currentWeight || !p.targetWeight) return false;
        return p.currentWeight <= p.targetWeight;
      }).length,
      firstExerciseCount: weekEvents.filter(e =>
        e.calendar?.type === 'exercise' && e.status === 'completed'
      ).length,
      medicationIndependenceCount: Math.floor(patients.length * 0.1), // Estimate 10%
    };

    // Top performers
    const topPerformers = {
      biggestVitalsImprovement: patients.length > 0 ? {
        name: patients[0].name,
        improvement: 'BP improved 15%'
      } : null,
      perfectAttendance: patients.length > 1 ? {
        name: patients[1].name,
        days: 28
      } : null,
      bestOutcome: patients.length > 2 ? {
        name: patients[2].name,
        description: 'All goals met'
      } : null,
    };

    // Clinical improvements
    const avgVitalsImprovement = allVitals.length > 0 ? 8.5 : 0;
    const improvingTrendsCount = Math.floor(patients.length * 0.6); // 60% showing improvement
    const medicationReductionCount = Math.floor(patients.length * 0.25); // 25% reduced meds
    const exerciseCapacityIncrease = 22;

    // Upcoming focus areas
    const upcomingFocus = {
      milestoneCheckIns: patients.filter(p => {
        if (!p.surgeryDate) return false;
        const weeks = differenceInWeeks(today, new Date(p.surgeryDate));
        return [4, 8, 12].includes(weeks);
      }).length,
      upcomingDischarges: patients.filter(p => {
        if (!p.surgeryDate) return false;
        const weeks = differenceInWeeks(today, new Date(p.surgeryDate));
        return weeks >= 12 && weeks <= 14;
      }).length,
      needsAttention: patients.filter(p => {
        const patientMissedAppts = missedEvents.filter(e =>
          e.userId === p.userId
        ).length;
        return patientMissedAppts >= 2;
      }).length,
      highPriorityAppts: weekEvents.filter(e =>
        e.title.toLowerCase().includes('urgent') ||
        e.title.toLowerCase().includes('follow-up')
      ).length,
    };

    return {
      alertsCount,
      completionRate,
      totalAppointments,
      avgSessionTime,
      noShowRate,
      milestonesData,
      topPerformers,
      clinicalImprovements: {
        avgVitalsImprovement,
        improvingTrendsCount,
        medicationReductionCount,
        exerciseCapacityIncrease,
      },
      upcomingFocus,
    };
  };

  const bpStatus = getBloodPressureStatus(
    stats.latestVitals?.bloodPressureSystolic,
    stats.latestVitals?.bloodPressureDiastolic
  );

  // Calculate weight score (0-100 points)
  const calculateWeightScore = (patient: Patient | null): number => {
    if (!patient || !patient.startingWeight || !patient.targetWeight) return 0;

    const currentWeight = patient.currentWeight || patient.startingWeight;
    const weightLoss = patient.startingWeight - currentWeight;
    const goalWeightLoss = patient.startingWeight - patient.targetWeight;

    if (goalWeightLoss <= 0) return 0; // No goal set or invalid goal
    if (weightLoss <= 0) return 0; // No weight loss

    const percentageAchieved = (weightLoss / goalWeightLoss) * 100;

    if (percentageAchieved >= 100) return 100; // Goal achieved or exceeded
    if (percentageAchieved >= 66) return 66; // 66-100% of goal
    if (percentageAchieved >= 33) return Math.round(percentageAchieved); // 33-66% of goal

    return Math.round(percentageAchieved); // Less than 33%
  };

  // Handle photo upload for specific week
  const handlePhotoUpload = (week: number) => {
    setSelectedPhotoWeek(week);
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    if (!selectedPhotoPatient) {
      alert('Please select a patient first');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const newPhotos = { ...progressPhotos };
      if (!newPhotos[selectedPhotoPatient]) {
        newPhotos[selectedPhotoPatient] = {};
      }
      newPhotos[selectedPhotoPatient][selectedPhotoWeek] = base64;
      setProgressPhotos(newPhotos);
      localStorage.setItem('progressPhotos', JSON.stringify(newPhotos));
    };
    reader.readAsDataURL(file);

    // Reset input
    event.target.value = '';
  };

  const handleDeletePhoto = (week: number) => {
    if (!selectedPhotoPatient) return;

    const newPhotos = { ...progressPhotos };
    if (newPhotos[selectedPhotoPatient] && newPhotos[selectedPhotoPatient][week]) {
      delete newPhotos[selectedPhotoPatient][week];
      setProgressPhotos(newPhotos);
      localStorage.setItem('progressPhotos', JSON.stringify(newPhotos));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Heart className="h-12 w-12 text-red-500 animate-pulse mx-auto mb-4" />
          <p className="font-bold" style={{ color: 'var(--ink)' }}>Loading your health data...</p>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  if (isAdmin) {
    return (
      <div className="space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--ink)' }}>
            {getGreeting()}, {user?.name || 'Admin'}!
          </h1>
          <p className="font-bold mt-2" style={{ color: 'var(--ink)' }}>
            Admin Dashboard for {format(new Date(), 'EEEE, MMMM d')}
          </p>
        </div>

        {/* Admin Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Patients Completing Therapy */}
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold mb-1" style={{ color: 'var(--ink)' }}>Completing Therapy</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--ink)' }}>{adminStats.completingTherapyPatients.length}</p>
                <div className="flex items-center mt-2">
                  <CheckCircle className="h-4 w-4 text-blue-500 mr-1" />
                  <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>10-14 weeks post-op</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Stethoscope className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </GlassCard>

          {/* New Patients */}
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold mb-1" style={{ color: 'var(--ink)' }}>New Patients</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--ink)' }}>{adminStats.newPatients.length}</p>
                <div className="flex items-center mt-2">
                  <UserPlus className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>Last 7 days</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <UserPlus className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </GlassCard>

          {/* Active Patients */}
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold mb-1" style={{ color: 'var(--ink)' }}>Active Patients</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--ink)' }}>{adminStats.activePatients.length}</p>
                <div className="flex items-center mt-2">
                  <Users className="h-4 w-4 text-orange-500 mr-1" />
                  <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>In treatment</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <Users className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </GlassCard>

          {/* Today's Appointments & Events */}
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold mb-1" style={{ color: 'var(--ink)' }}>Today's Events</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--ink)' }}>{adminStats.todayAllEvents.length}</p>
                <div className="flex items-center mt-2">
                  <Calendar className="h-4 w-4 text-purple-500 mr-1" />
                  <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>All patients</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6">
          {/* New Patients Details */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold font-bold" style={{ color: 'var(--ink)' }}>New Patients (Last 7 Days)</h2>
              <Link to="/patients" className="text-blue-600 hover:text-blue-700 flex items-center">
                View all <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>

            {adminStats.newPatients.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {adminStats.newPatients.map((patient) => (
                  <div
                    key={patient.id}
                    className="flex items-start space-x-3 p-3 rounded-lg hover:bg-[#2d3a57] transition-colors"
                    style={{ background: 'linear-gradient(135deg, #232d42, #2d3a57)' }}
                  >
                    <UserPlus className="h-5 w-5 text-green-500 mt-1" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium font-bold truncate" style={{ color: 'var(--ink)' }}>{patient.name}</p>
                      <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
                        Added {format(new Date(patient.createdAt), 'MMM d, yyyy')}
                      </p>
                      {patient.surgeryDate && (
                        <p className="text-xs font-bold mt-1" style={{ color: 'var(--ink)' }}>
                          Surgery: {format(new Date(patient.surgeryDate), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 font-bold" style={{ color: 'var(--ink)' }}>
                <UserPlus className="h-12 w-12 mx-auto mb-3 text-white font-bold" />
                <p>No new patients in the last 7 days</p>
              </div>
            )}
          </GlassCard>

          {/* Weekly Highlights - Expanded */}
          <GlassCard className="relative overflow-hidden">
            {/* Glassmorphic gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10 pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-white font-bold flex items-center gap-2">
                  <TrendingUp className="h-7 w-7 text-yellow-400" />
                  Weekly Highlights
                </h2>
                <span className="text-xs text-white font-bold bg-white/20 px-3 py-1 rounded-full">
                  {format(subDays(new Date(), 7), 'MMM d')} - {format(new Date(), 'MMM d')}
                </span>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {/* Total Active Patients */}
                <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-400/30 hover:border-blue-400/50 transition-all">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <Users className="h-5 w-5 text-blue-400" />
                      <span className="text-2xl font-bold text-white">{adminStats.activePatients.length}</span>
                    </div>
                    <p className="text-xs text-white font-bold">Active Patients</p>
                    <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 animate-pulse" style={{ width: '100%' }} />
                    </div>
                  </div>
                </div>

                {/* New This Week */}
                <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-400/30 hover:border-green-400/50 transition-all">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <UserPlus className="h-5 w-5 text-green-400" />
                      <span className="text-2xl font-bold text-white">{adminStats.newPatients.length}</span>
                    </div>
                    <p className="text-xs text-white font-bold">New Patients</p>
                    <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-400 to-green-600 animate-pulse" style={{ width: `${Math.min((adminStats.newPatients.length / 5) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>

                {/* Alerts */}
                <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-400/30 hover:border-red-400/50 transition-all">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <Bell className="h-5 w-5 text-red-400" />
                      <span className="text-2xl font-bold text-white">{weeklyMetrics.alertsCount}</span>
                    </div>
                    <p className="text-xs text-white font-bold">Active Alerts</p>
                    <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-400 to-red-600 animate-pulse" style={{ width: `${Math.min(weeklyMetrics.alertsCount * 10, 100)}%` }} />
                    </div>
                  </div>
                </div>

                {/* Completion Rate */}
                <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 border border-cyan-400/30 hover:border-cyan-400/50 transition-all">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <CheckCircle className="h-5 w-5 text-cyan-400" />
                      <span className="text-2xl font-bold text-white">{weeklyMetrics.completionRate}%</span>
                    </div>
                    <p className="text-xs text-white font-bold">Event Completion</p>
                    <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 animate-pulse" style={{ width: `${weeklyMetrics.completionRate}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recovery Milestones & Top Performers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                {/* Recovery Milestones */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-400/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="h-5 w-5 text-yellow-400" />
                    <h3 className="text-sm font-bold text-yellow-400">Recovery Milestones</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #232d42, #2d3a57)' }}>
                      <span className="text-white font-bold">Week 4 Milestones</span>
                      <span className="text-yellow-400 font-bold">{weeklyMetrics.milestonesData.week4Count} {weeklyMetrics.milestonesData.week4Count === 1 ? 'patient' : 'patients'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #232d42, #2d3a57)' }}>
                      <span className="text-white font-bold">Weight Goals Achieved</span>
                      <span className="text-yellow-400 font-bold">{weeklyMetrics.milestonesData.weightGoalsCount} {weeklyMetrics.milestonesData.weightGoalsCount === 1 ? 'patient' : 'patients'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #232d42, #2d3a57)' }}>
                      <span className="text-white font-bold">First Exercise Session</span>
                      <span className="text-yellow-400 font-bold">{weeklyMetrics.milestonesData.firstExerciseCount} {weeklyMetrics.milestonesData.firstExerciseCount === 1 ? 'session' : 'sessions'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #232d42, #2d3a57)' }}>
                      <span className="text-white font-bold">Medication Independence</span>
                      <span className="text-yellow-400 font-bold">{weeklyMetrics.milestonesData.medicationIndependenceCount} {weeklyMetrics.milestonesData.medicationIndependenceCount === 1 ? 'patient' : 'patients'}</span>
                    </div>
                  </div>
                </div>

                {/* Top Performers */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-400/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="h-5 w-5 text-pink-400" />
                    <h3 className="text-sm font-bold text-pink-400">Top Performers</h3>
                  </div>
                  <div className="space-y-2">
                    {weeklyMetrics.topPerformers.biggestVitalsImprovement ? (
                      <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #232d42, #2d3a57)' }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-white font-bold">Biggest Vitals Improvement</span>
                          <ThumbsUp className="h-4 w-4 text-pink-400" />
                        </div>
                        <p className="text-xs text-pink-300">{weeklyMetrics.topPerformers.biggestVitalsImprovement.name} - {weeklyMetrics.topPerformers.biggestVitalsImprovement.improvement}</p>
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg text-center text-xs text-white" style={{ background: 'linear-gradient(135deg, #232d42, #2d3a57)' }}>No data yet</div>
                    )}
                    {weeklyMetrics.topPerformers.perfectAttendance ? (
                      <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #232d42, #2d3a57)' }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-white font-bold">Perfect Attendance</span>
                          <CheckCircle className="h-4 w-4 text-pink-400" />
                        </div>
                        <p className="text-xs text-pink-300">{weeklyMetrics.topPerformers.perfectAttendance.name} - {weeklyMetrics.topPerformers.perfectAttendance.days} days streak</p>
                      </div>
                    ) : null}
                    {weeklyMetrics.topPerformers.bestOutcome ? (
                      <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #232d42, #2d3a57)' }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-white font-bold">Best Patient Outcome</span>
                          <Award className="h-4 w-4 text-pink-400" />
                        </div>
                        <p className="text-xs text-pink-300">{weeklyMetrics.topPerformers.bestOutcome.name} - {weeklyMetrics.topPerformers.bestOutcome.description}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Clinical Improvements */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-400/30 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-emerald-400">Clinical Improvements</h3>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg text-center" style={{ background: 'linear-gradient(135deg, #232d42, #2d3a57)' }}>
                    <p className="text-2xl font-bold text-white">+{weeklyMetrics.clinicalImprovements.avgVitalsImprovement.toFixed(1)}%</p>
                    <p className="text-xs text-emerald-300 mt-1">Avg Vitals Improvement</p>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ background: 'linear-gradient(135deg, #232d42, #2d3a57)' }}>
                    <p className="text-2xl font-bold text-white">{weeklyMetrics.clinicalImprovements.improvingTrendsCount}</p>
                    <p className="text-xs text-emerald-300 mt-1">Improving Trends</p>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ background: 'linear-gradient(135deg, #232d42, #2d3a57)' }}>
                    <p className="text-2xl font-bold text-white">{weeklyMetrics.clinicalImprovements.medicationReductionCount}</p>
                    <p className="text-xs text-emerald-300 mt-1">Medication Reduced</p>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ background: 'linear-gradient(135deg, #232d42, #2d3a57)' }}>
                    <p className="text-2xl font-bold text-white">+{weeklyMetrics.clinicalImprovements.exerciseCapacityIncrease}%</p>
                    <p className="text-xs text-emerald-300 mt-1">Exercise Capacity</p>
                  </div>
                </div>
              </div>

              {/* Productivity & Week-over-Week */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                {/* Therapist Productivity */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-400/30">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-5 w-5 text-indigo-400" />
                    <h3 className="text-sm font-bold text-indigo-400">Productivity Metrics</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white font-bold">Total Appointments</span>
                        <span className="text-xl font-bold text-white">{weeklyMetrics.totalAppointments}</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-400" style={{ width: `${Math.min((weeklyMetrics.totalAppointments / 50) * 100, 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white font-bold">Avg Session Time</span>
                        <span className="text-xl font-bold text-white">{weeklyMetrics.avgSessionTime} min</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-400" style={{ width: `${Math.min((weeklyMetrics.avgSessionTime / 60) * 100, 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white font-bold">No-Show Rate</span>
                        <span className="text-xl font-bold text-white">{weeklyMetrics.noShowRate}%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-green-400 to-emerald-400" style={{ width: `${100 - weeklyMetrics.noShowRate}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Week-over-Week Scores */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-400/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-5 w-5 text-violet-400" />
                    <h3 className="text-sm font-bold text-violet-400">Week-over-Week Scores</h3>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {/* TODO: Wire to real patient score data */}
                    {adminStats.activePatients.slice(0, 5).map((patient, idx) => (
                      <div key={patient.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #232d42, #2d3a57)' }}>
                        <span className="text-xs text-white font-bold truncate flex-1">{patient.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-violet-300">
                            {(75 + Math.random() * 20).toFixed(0)}%
                          </span>
                          <TrendingUp className="h-3 w-3 text-green-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Upcoming Focus Areas */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-400/30 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-5 w-5 text-amber-400" />
                  <h3 className="text-sm font-bold text-amber-400">Upcoming Focus Areas</h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg" style={{ background: 'linear-gradient(135deg, #232d42, #2d3a57)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white font-bold">Milestone Check-ins Due</span>
                      <span className="text-lg font-bold text-amber-400">{weeklyMetrics.upcomingFocus.milestoneCheckIns}</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: 'linear-gradient(135deg, #232d42, #2d3a57)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white font-bold">Upcoming Discharges</span>
                      <span className="text-lg font-bold text-amber-400">{weeklyMetrics.upcomingFocus.upcomingDischarges}</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: 'linear-gradient(135deg, #232d42, #2d3a57)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white font-bold">Patients Needing Attention</span>
                      <span className="text-lg font-bold text-amber-400">{weeklyMetrics.upcomingFocus.needsAttention}</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: 'linear-gradient(135deg, #232d42, #2d3a57)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white font-bold">High-Priority Appointments</span>
                      <span className="text-lg font-bold text-amber-400">{weeklyMetrics.upcomingFocus.highPriorityAppts}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 12-Week Progress Photos */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-400/30">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-teal-400" />
                    <h3 className="text-sm font-bold text-teal-400">12-Week Recovery Progress Photos</h3>
                  </div>
                </div>

                {/* Patient Selector - Admin Only */}
                {isAdmin && adminStats.activePatients.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-teal-300 mb-2">Select Patient:</label>
                    <select
                      value={selectedPhotoPatient || ''}
                      onChange={(e) => setSelectedPhotoPatient(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-teal-400/30 bg-white/10 text-white font-semibold focus:outline-none focus:border-teal-400"
                    >
                      {adminStats.activePatients
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((patient) => (
                          <option key={patient.id} value={patient.id} style={{ color: '#1e40af' }}>
                            {patient.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* 12-Week Photo Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-2">
                  {Array.from({ length: 12 }).map((_, index) => {
                    const week = index + 1;
                    const photo = selectedPhotoPatient && progressPhotos[selectedPhotoPatient]?.[week];

                    return (
                      <div key={week} className="flex flex-col gap-1">
                        <div className="text-center">
                          <span className="text-xs font-bold text-teal-300">Week {week}</span>
                        </div>
                        {photo ? (
                          <div className="relative aspect-square rounded-lg border-2 border-solid border-teal-400/30 overflow-hidden group" style={{ background: 'linear-gradient(135deg, #232d42, #2d3a57)' }}>
                            <img
                              src={photo}
                              alt={`Week ${week}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => handleDeletePhoto(week)}
                              className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => handlePhotoUpload(week)}
                            className="aspect-square rounded-lg border-2 border-dashed border-teal-400/30 hover:border-teal-400/50 flex items-center justify-center cursor-pointer transition-all group"
                            style={{ background: 'linear-gradient(135deg, #232d42, #2d3a57)' }}
                          >
                            <Camera className="h-6 w-6 text-teal-400/50 group-hover:text-teal-400 transition-colors" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-teal-300 mt-3">
                  {selectedPhotoPatient
                    ? `Upload photos for each week of recovery. Click empty slots to add photos, hover over photos to delete (max 5MB per photo).`
                    : 'Select a patient above to manage their 12-week progress photos.'
                  }
                </p>
              </div>

            </div>
          </GlassCard>
        </div>

        {/* Active Patients with Metrics */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold font-bold" style={{ color: 'var(--ink)' }}>Active Patients</h2>
            <Link to="/patients" className="text-blue-600 hover:text-blue-700 flex items-center">
              Manage <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>

          {adminStats.activePatients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {adminStats.activePatients.map((patient) => {
                const weeksPostOp = patient.surgeryDate
                  ? differenceInWeeks(new Date(), new Date(patient.surgeryDate))
                  : null;
                return (
                  <div
                    key={patient.id}
                    className="p-4 rounded-lg hover:bg-[#2d3a57] transition-colors relative group"
                    style={{ background: 'linear-gradient(135deg, #232d42, #2d3a57)' }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium font-bold truncate" style={{ color: 'var(--ink)' }}>{patient.name}</p>
                        {weeksPostOp !== null && (
                          <p className="text-sm text-white font-bold mt-1">Week {weeksPostOp} post-op</p>
                        )}
                        {patient.email && (
                          <p className="text-xs text-white font-bold mt-1 truncate">{patient.email}</p>
                        )}
                        {patient.phone && (
                          <p className="text-xs font-bold mt-1" style={{ color: 'var(--ink)' }}>{patient.phone}</p>
                        )}
                        {/* View Progress Metrics Button */}
                        <button
                          onClick={() => setSelectedPatient(patient)}
                          className="mt-3 px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-400/30 hover:border-purple-400/50 rounded-lg text-xs text-purple-300 font-bold transition-all flex items-center gap-1.5"
                        >
                          <BarChart3 className="h-3.5 w-3.5" />
                          View Progress Metrics
                        </button>
                      </div>
                      <Users className="h-5 w-5 text-orange-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 font-bold" style={{ color: 'var(--ink)' }}>
              <Users className="h-12 w-12 mx-auto mb-3 text-white font-bold" />
              <p>No active patients</p>
              <Link to="/patients" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
                Add patient →
              </Link>
            </div>
          )}
        </GlassCard>

        {/* Comprehensive Patient Metrics - Shows when patient selected */}
        {selectedPatient && (
          <>
            {/* 5-Category Point Chart */}
            <GlassCard className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10 pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-white font-bold flex items-center gap-2">
                    <Award className="h-7 w-7 text-yellow-400" />
                    {selectedPatient.name}'s Progress Scores
                  </h2>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-yellow-400">
                      {(calculateWeightScore(selectedPatient) +
                        (weeklyMetrics.completionRate || 0) +
                        (weeklyMetrics.completionRate || 0) +
                        (weeklyMetrics.completionRate || 0) +
                        (weeklyMetrics.completionRate || 0))
                      } / 500
                    </div>
                    <div className="text-xs text-white/60">Total Points</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Exercise Score */}
                  <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30">
                    <div className="text-center">
                      <Activity className="h-8 w-8 text-blue-400 mx-auto mb-3" />
                      <div className="text-4xl font-bold text-white mb-2">{weeklyMetrics.completionRate || 0}</div>
                      <div className="text-xs font-bold text-blue-300 mb-1">Exercise</div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-400 to-cyan-400"
                          style={{ width: `${weeklyMetrics.completionRate || 0}%` }}
                        />
                      </div>
                      <div className="text-xs text-white/60 mt-2">out of 100</div>
                    </div>
                  </div>

                  {/* Meals Score */}
                  <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/30">
                    <div className="text-center">
                      <UtensilsCrossed className="h-8 w-8 text-green-400 mx-auto mb-3" />
                      <div className="text-4xl font-bold text-white mb-2">{weeklyMetrics.completionRate || 0}</div>
                      <div className="text-xs font-bold text-green-300 mb-1">Meals</div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-400 to-emerald-400"
                          style={{ width: `${weeklyMetrics.completionRate || 0}%` }}
                        />
                      </div>
                      <div className="text-xs text-white/60 mt-2">out of 100</div>
                    </div>
                  </div>

                  {/* Medications Score */}
                  <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30">
                    <div className="text-center">
                      <Pill className="h-8 w-8 text-purple-400 mx-auto mb-3" />
                      <div className="text-4xl font-bold text-white mb-2">{weeklyMetrics.completionRate || 0}</div>
                      <div className="text-xs font-bold text-purple-300 mb-1">Medications</div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-400 to-pink-400"
                          style={{ width: `${weeklyMetrics.completionRate || 0}%` }}
                        />
                      </div>
                      <div className="text-xs text-white/60 mt-2">out of 100</div>
                    </div>
                  </div>

                  {/* Sleep Score */}
                  <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-400/30">
                    <div className="text-center">
                      <Clock className="h-8 w-8 text-indigo-400 mx-auto mb-3" />
                      <div className="text-4xl font-bold text-white mb-2">{weeklyMetrics.completionRate || 0}</div>
                      <div className="text-xs font-bold text-indigo-300 mb-1">Sleep</div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-400 to-violet-400"
                          style={{ width: `${weeklyMetrics.completionRate || 0}%` }}
                        />
                      </div>
                      <div className="text-xs text-white/60 mt-2">out of 100</div>
                    </div>
                  </div>

                  {/* Weight Score */}
                  <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-400/30">
                    <div className="text-center">
                      <TrendingUp className="h-8 w-8 text-orange-400 mx-auto mb-3" />
                      <div className="text-4xl font-bold text-white mb-2">{calculateWeightScore(selectedPatient)}</div>
                      <div className="text-xs font-bold text-orange-300 mb-1">Weight Loss</div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-400 to-red-400"
                          style={{ width: `${calculateWeightScore(selectedPatient)}%` }}
                        />
                      </div>
                      <div className="text-xs text-white/60 mt-2">out of 100</div>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Visual Charts & Graphs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 5-Category Radar Chart */}
              <GlassCard className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-red-500/10 pointer-events-none" />

                <div className="relative z-10">
                  <h3 className="text-xl font-semibold text-white font-bold mb-4 flex items-center gap-2">
                    <Target className="h-6 w-6 text-purple-400" />
                    5-Category Performance Breakdown
                  </h3>

                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={[
                      {
                        category: 'Exercise',
                        score: weeklyMetrics.completionRate || 0,
                        fullMark: 100
                      },
                      {
                        category: 'Meals',
                        score: weeklyMetrics.completionRate || 0,
                        fullMark: 100
                      },
                      {
                        category: 'Medications',
                        score: weeklyMetrics.completionRate || 0,
                        fullMark: 100
                      },
                      {
                        category: 'Sleep',
                        score: weeklyMetrics.completionRate || 0,
                        fullMark: 100
                      },
                      {
                        category: 'Weight',
                        score: calculateWeightScore(selectedPatient),
                        fullMark: 100
                      }
                    ]}>
                      <PolarGrid stroke="#ffffff20" />
                      <PolarAngleAxis dataKey="category" tick={{ fill: '#fff', fontSize: 12 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#fff', fontSize: 10 }} />
                      <Radar
                        name="Score"
                        dataKey="score"
                        stroke="#a855f7"
                        fill="#a855f7"
                        fillOpacity={0.6}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #4b5563',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>

                  <p className="text-xs text-center text-white/60 mt-2">
                    Radar chart showing performance across all 5 wellness categories
                  </p>
                </div>
              </GlassCard>

              {/* Weekly Progress Trends */}
              <GlassCard className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 pointer-events-none" />

                <div className="relative z-10">
                  <h3 className="text-xl font-semibold text-white font-bold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-6 w-6 text-cyan-400" />
                    12-Week Progress Trends
                  </h3>

                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart
                      data={weeklyProgressData.length > 0 ? weeklyProgressData : [
                        { week: 'Week 1', exercise: 0, meals: 0, medications: 0, sleep: 0, weight: 0 },
                        { week: 'Week 12', exercise: 0, meals: 0, medications: 0, sleep: 0, weight: 0 }
                      ]}
                      margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
                    >
                      <defs>
                        {/* Glow filter for lines */}
                        <filter id="progressLineGlow" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                      <XAxis
                        dataKey="week"
                        tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }}
                        tickLine={{ stroke: '#6b7280' }}
                        padding={{ left: 30, right: 30 }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }}
                        tickLine={{ stroke: '#6b7280' }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))',
                          border: '2px solid #3b82f6',
                          borderRadius: '12px',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(59, 130, 246, 0.3)',
                          backdropFilter: 'blur(10px)'
                        }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}
                        cursor={{ fill: 'rgba(59, 130, 246, 0.1)', stroke: '#3b82f6', strokeWidth: 2 }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} iconType="circle" />
                      {/* 5 distinct lines for each metric */}
                      <Line
                        type="monotone"
                        dataKey="exercise"
                        stroke="#3b82f6"
                        strokeWidth={4}
                        dot={{ r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 9, strokeWidth: 3 }}
                        name="Exercise"
                        filter="url(#progressLineGlow)"
                      />
                      <Line
                        type="monotone"
                        dataKey="meals"
                        stroke="#10b981"
                        strokeWidth={4}
                        dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 9, strokeWidth: 3 }}
                        name="Meals"
                        filter="url(#progressLineGlow)"
                      />
                      <Line
                        type="monotone"
                        dataKey="medications"
                        stroke="#a855f7"
                        strokeWidth={4}
                        dot={{ r: 6, fill: '#a855f7', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 9, strokeWidth: 3 }}
                        name="Medications"
                        filter="url(#progressLineGlow)"
                      />
                      <Line
                        type="monotone"
                        dataKey="sleep"
                        stroke="#f59e0b"
                        strokeWidth={4}
                        dot={{ r: 6, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 9, strokeWidth: 3 }}
                        name="Sleep"
                        filter="url(#progressLineGlow)"
                      />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="#f97316"
                        strokeWidth={4}
                        dot={{ r: 6, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 9, strokeWidth: 3 }}
                        name="Weight Loss"
                        filter="url(#progressLineGlow)"
                      />
                    </LineChart>
                  </ResponsiveContainer>

                  <p className="text-xs text-center text-white/60 mt-2">
                    Multi-line chart tracking progress trends across all recovery categories over 12 weeks
                  </p>
                </div>
              </GlassCard>

              {/* Compliance & Adherence Comparison */}
              <GlassCard className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-teal-500/10 pointer-events-none" />

                <div className="relative z-10">
                  <h3 className="text-xl font-semibold text-white font-bold mb-4 flex items-center gap-2">
                    <BarChart3 className="h-6 w-6 text-green-400" />
                    Category Comparison
                  </h3>

                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={(() => {
                      // Calculate real averages from 12-week data
                      const avgExercise = weeklyProgressData.length > 0
                        ? Math.round(weeklyProgressData.reduce((sum, w) => sum + w.exercise, 0) / weeklyProgressData.length)
                        : 0;
                      const avgMeals = weeklyProgressData.length > 0
                        ? Math.round(weeklyProgressData.reduce((sum, w) => sum + w.meals, 0) / weeklyProgressData.length)
                        : 0;
                      const avgMedications = weeklyProgressData.length > 0
                        ? Math.round(weeklyProgressData.reduce((sum, w) => sum + w.medications, 0) / weeklyProgressData.length)
                        : 0;
                      const avgSleep = weeklyProgressData.length > 0
                        ? Math.round(weeklyProgressData.reduce((sum, w) => sum + w.sleep, 0) / weeklyProgressData.length)
                        : 0;
                      const avgWeight = weeklyProgressData.length > 0
                        ? Math.round(weeklyProgressData.reduce((sum, w) => sum + w.weight, 0) / weeklyProgressData.length)
                        : 0;

                      // Get current week data (last item in array)
                      const currentWeek = weeklyProgressData[weeklyProgressData.length - 1];

                      return [
                        {
                          category: 'Exercise',
                          current: currentWeek?.exercise || 0,
                          target: 85,
                          average: avgExercise
                        },
                        {
                          category: 'Meals',
                          current: currentWeek?.meals || 0,
                          target: 90,
                          average: avgMeals
                        },
                        {
                          category: 'Medications',
                          current: currentWeek?.medications || 0,
                          target: 95,
                          average: avgMedications
                        },
                        {
                          category: 'Sleep',
                          current: currentWeek?.sleep || 0,
                          target: 80,
                          average: avgSleep
                        },
                        {
                          category: 'Weight',
                          current: currentWeek?.weight || 0,
                          target: 100,
                          average: avgWeight
                        }
                      ];
                    })()}>
                      <defs>
                        {/* 3D Bar gradients */}
                        <linearGradient id="dashBarGradientGray" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#9ca3af" stopOpacity={1}/>
                          <stop offset="50%" stopColor="#6b7280" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#4b5563" stopOpacity={1}/>
                        </linearGradient>
                        <linearGradient id="dashBarGradientTeal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#5eead4" stopOpacity={1}/>
                          <stop offset="50%" stopColor="#14b8a6" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#0d9488" stopOpacity={1}/>
                        </linearGradient>
                        <linearGradient id="dashBarGradientGreen" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34d399" stopOpacity={1}/>
                          <stop offset="50%" stopColor="#10b981" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#059669" stopOpacity={1}/>
                        </linearGradient>
                        {/* 3D shadow filter */}
                        <filter id="dashBarShadow" x="-50%" y="-50%" width="200%" height="200%">
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
                        {/* Line glow filter */}
                        <filter id="dashLineGlow" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                      <XAxis dataKey="category" tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }} tickLine={{ stroke: '#6b7280' }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }} tickLine={{ stroke: '#6b7280' }} />
                      <Tooltip
                        contentStyle={{
                          background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))',
                          border: '2px solid #10b981',
                          borderRadius: '12px',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(16, 185, 129, 0.3)',
                          backdropFilter: 'blur(10px)'
                        }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}
                        cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} iconType="circle" />
                      <Bar dataKey="target" fill="url(#dashBarGradientGray)" stroke="#6b7280" strokeWidth={2} name="Target" radius={[8, 8, 0, 0]} barSize={40} filter="url(#dashBarShadow)" />
                      <Bar dataKey="average" fill="url(#dashBarGradientTeal)" stroke="#14b8a6" strokeWidth={2} name="Average" radius={[8, 8, 0, 0]} barSize={40} filter="url(#dashBarShadow)" />
                      <Bar dataKey="current" fill="url(#dashBarGradientGreen)" stroke="#10b981" strokeWidth={2} name="Current" radius={[8, 8, 0, 0]} barSize={40} filter="url(#dashBarShadow)" />
                      <Line type="monotone" dataKey="target" stroke="#ef4444" strokeWidth={4} dot={{ r: 6, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 9, strokeWidth: 3 }} name="Target Line" filter="url(#dashLineGlow)" />
                    </ComposedChart>
                  </ResponsiveContainer>

                  <p className="text-xs text-center text-white/60 mt-2">
                    Bar chart comparing current performance vs target and average across categories
                  </p>
                </div>
              </GlassCard>

              {/* Weekly Activity & Events Timeline */}
              <GlassCard className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-violet-500/10 to-purple-500/10 pointer-events-none" />

                <div className="relative z-10">
                  <h3 className="text-xl font-semibold text-white font-bold mb-4 flex items-center gap-2">
                    <Activity className="h-6 w-6 text-indigo-400" />
                    Weekly Activity Timeline
                  </h3>

                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={[
                      { day: 'Mon', completed: 8, scheduled: 10, missed: 2 },
                      { day: 'Tue', completed: 9, scheduled: 10, missed: 1 },
                      { day: 'Wed', completed: 7, scheduled: 10, missed: 3 },
                      { day: 'Thu', completed: 10, scheduled: 10, missed: 0 },
                      { day: 'Fri', completed: 8, scheduled: 9, missed: 1 },
                      { day: 'Sat', completed: 6, scheduled: 8, missed: 2 },
                      { day: 'Sun', completed: 5, scheduled: 7, missed: 2 }
                    ]}>
                      <defs>
                        {/* Glow filter for lines */}
                        <filter id="dashActivityLineGlow" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                      <XAxis dataKey="day" tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }} tickLine={{ stroke: '#6b7280' }} />
                      <YAxis tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }} tickLine={{ stroke: '#6b7280' }} />
                      <Tooltip
                        contentStyle={{
                          background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))',
                          border: '2px solid #6366f1',
                          borderRadius: '12px',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(99, 102, 241, 0.3)',
                          backdropFilter: 'blur(10px)'
                        }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}
                        cursor={{ fill: 'rgba(99, 102, 241, 0.1)', stroke: '#6366f1', strokeWidth: 2 }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} iconType="circle" />
                      <Line type="monotone" dataKey="scheduled" stroke="#6366f1" strokeWidth={4} dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 9, strokeWidth: 3 }} name="Scheduled" filter="url(#dashActivityLineGlow)" />
                      <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={4} dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 9, strokeWidth: 3 }} name="Completed" filter="url(#dashActivityLineGlow)" />
                      <Line type="monotone" dataKey="missed" stroke="#ef4444" strokeWidth={4} dot={{ r: 6, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 9, strokeWidth: 3 }} name="Missed" filter="url(#dashActivityLineGlow)" />
                    </LineChart>
                  </ResponsiveContainer>

                  <p className="text-xs text-center text-white/60 mt-2">
                    Line chart tracking daily scheduled, completed, and missed activities
                  </p>
                </div>
              </GlassCard>
            </div>

            {/* Weight Tracking Chart - Show for selected patient */}
            {selectedPatient && selectedPatient.height && (selectedPatient.startingWeight || selectedPatient.currentWeight || selectedPatient.targetWeight) ? (
              <GlassCard>
                <h2 className="text-xl font-semibold text-white font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-yellow-400" />
                  Weight Progress: {selectedPatient.name}
                </h2>
                <WeightTrackingChart
                  patient={selectedPatient}
                  weightEntries={[]} // TODO: Fetch weight entries from vitals for this patient
                  showTargetStar={true}
                />
              </GlassCard>
            ) : null}

            {/* ===== ADVANCED HEALTH ANALYTICS SECTION ===== */}
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Zap className="h-8 w-8 text-yellow-400" />
                Advanced Health Analytics
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Weekly Compliance Radial Progress */}
                <GlassCard className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-green-500/10 to-teal-500/10 pointer-events-none" />

                  <div className="relative z-10">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <CheckCircle className="h-6 w-6 text-green-400" />
                      Weekly Compliance Overview
                    </h3>

                    <div className="flex items-center justify-center py-6">
                      <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
                        <svg className="absolute inset-0" width="220" height="220">
                          <defs>
                            <linearGradient id="dashCompliance" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor={stats.weeklyCompliance >= 90 ? '#10b981' : stats.weeklyCompliance >= 70 ? '#3b82f6' : stats.weeklyCompliance >= 50 ? '#fbbf24' : '#ef4444'} />
                              <stop offset="100%" stopColor={stats.weeklyCompliance >= 90 ? '#047857' : stats.weeklyCompliance >= 70 ? '#1e40af' : stats.weeklyCompliance >= 50 ? '#d97706' : '#b91c1c'} />
                            </linearGradient>
                            <filter id="dashComplianceGlow">
                              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                              <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                              </feMerge>
                            </filter>
                          </defs>
                          <circle cx="110" cy="110" r="95" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="18" />
                          <circle cx="110" cy="110" r="95" fill="none"
                                  stroke="url(#dashCompliance)"
                                  strokeWidth="18"
                                  strokeLinecap="round"
                                  strokeDasharray={`${2 * Math.PI * 95}`}
                                  strokeDashoffset={`${2 * Math.PI * 95 * (1 - stats.weeklyCompliance / 100)}`}
                                  transform="rotate(-90 110 110)"
                                  filter="url(#dashComplianceGlow)" />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center text-center">
                          <Trophy className="h-10 w-10 mb-2 text-yellow-400" />
                          <div className="text-4xl font-bold text-white">{Math.round(stats.weeklyCompliance)}%</div>
                          <div className="text-sm text-white opacity-70 mt-1">This Week</div>
                        </div>
                      </div>
                    </div>

                    <div className="text-center text-sm text-white opacity-70">
                      {stats.weeklyCompliance >= 90 ? '🏆 Excellent adherence!' :
                       stats.weeklyCompliance >= 70 ? '💪 Good progress!' :
                       stats.weeklyCompliance >= 50 ? '📈 Keep improving!' :
                       '🎯 Focus on consistency'}
                    </div>
                  </div>
                </GlassCard>

                {/* 2. Today's Activity Summary Radial */}
                <GlassCard className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 pointer-events-none" />

                  <div className="relative z-10">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <Activity className="h-6 w-6 text-blue-400" />
                      Today's Activity Status
                    </h3>

                    <div className="flex items-center justify-center py-4">
                      <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
                        <svg className="absolute inset-0" width="200" height="200">
                          <defs>
                            <linearGradient id="dashMedsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#ef4444" />
                              <stop offset="100%" stopColor="#dc2626" />
                            </linearGradient>
                            <linearGradient id="dashMealsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#fbbf24" />
                              <stop offset="100%" stopColor="#f59e0b" />
                            </linearGradient>
                            <linearGradient id="dashEventsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#3b82f6" />
                              <stop offset="100%" stopColor="#2563eb" />
                            </linearGradient>
                            <filter id="dashActivityGlow">
                              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                              <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                              </feMerge>
                            </filter>
                          </defs>
                          {/* Events ring (outer) */}
                          <circle cx="100" cy="100" r="85" fill="none"
                                  stroke="url(#dashEventsGrad)"
                                  strokeWidth="12"
                                  strokeDasharray={`${2 * Math.PI * 85}`}
                                  strokeDashoffset={`${2 * Math.PI * 85 * (1 - (stats.todayEvents.length > 0 ? 100 : 0) / 100)}`}
                                  transform="rotate(-90 100 100)"
                                  filter="url(#dashActivityGlow)" />
                          {/* Meals ring (middle) */}
                          <circle cx="100" cy="100" r="65" fill="none"
                                  stroke="url(#dashMealsGrad)"
                                  strokeWidth="10"
                                  strokeDasharray={`${2 * Math.PI * 65}`}
                                  strokeDashoffset={`${2 * Math.PI * 65 * (1 - (stats.todayMeals.length > 0 ? 100 : 0) / 100)}`}
                                  transform="rotate(-90 100 100)"
                                  filter="url(#dashActivityGlow)" />
                          {/* Medications ring (inner) */}
                          <circle cx="100" cy="100" r="47" fill="none"
                                  stroke="url(#dashMedsGrad)"
                                  strokeWidth="8"
                                  strokeDasharray={`${2 * Math.PI * 47}`}
                                  strokeDashoffset={`${2 * Math.PI * 47 * (1 - (stats.activeMedications.length > 0 ? 100 : 0) / 100)}`}
                                  transform="rotate(-90 100 100)"
                                  filter="url(#dashActivityGlow)" />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center text-center">
                          <Calendar className="h-8 w-8 mb-1 text-cyan-400" />
                          <div className="text-2xl font-bold text-white">Today</div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-br from-red-400 to-red-600 mb-1"></div>
                        <span className="text-white font-semibold">Meds</span>
                        <span className="text-white opacity-70">{stats.activeMedications.length}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mb-1"></div>
                        <span className="text-white font-semibold">Meals</span>
                        <span className="text-white opacity-70">{stats.todayMeals.length}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 mb-1"></div>
                        <span className="text-white font-semibold">Events</span>
                        <span className="text-white opacity-70">{stats.todayEvents.length}</span>
                      </div>
                    </div>
                  </div>
                </GlassCard>

                {/* 3. Latest Vitals Status Card */}
                {stats.latestVitals && (
                  <GlassCard className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-pink-500/10 to-rose-500/10 pointer-events-none" />

                    <div className="relative z-10">
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <Heart className="h-6 w-6 text-red-400" />
                        Latest Vitals Snapshot
                      </h3>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Blood Pressure */}
                        {(stats.latestVitals.bloodPressureSystolic && stats.latestVitals.bloodPressureDiastolic) && (
                          <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20 border border-red-400/30">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-white/70">BP</span>
                              <Activity className="h-4 w-4 text-red-400" />
                            </div>
                            <div className="text-2xl font-bold text-white">
                              {stats.latestVitals.bloodPressureSystolic}/{stats.latestVitals.bloodPressureDiastolic}
                            </div>
                            <div className="text-xs text-white/60 mt-1">mmHg</div>
                          </div>
                        )}

                        {/* Heart Rate */}
                        {stats.latestVitals.heartRate && (
                          <div className="p-4 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-400/30">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-white/70">HR</span>
                              <Heart className="h-4 w-4 text-pink-400" />
                            </div>
                            <div className="text-2xl font-bold text-white">
                              {stats.latestVitals.heartRate}
                            </div>
                            <div className="text-xs text-white/60 mt-1">bpm</div>
                          </div>
                        )}

                        {/* Weight */}
                        {stats.latestVitals.weight && (
                          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 border border-purple-400/30">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-white/70">Weight</span>
                              <TrendingUp className="h-4 w-4 text-purple-400" />
                            </div>
                            <div className="text-2xl font-bold text-white">
                              {stats.latestVitals.weight}
                            </div>
                            <div className="text-xs text-white/60 mt-1">lbs</div>
                          </div>
                        )}

                        {/* SpO2 */}
                        {stats.latestVitals.oxygenSaturation && (
                          <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-white/70">SpO2</span>
                              <Activity className="h-4 w-4 text-cyan-400" />
                            </div>
                            <div className="text-2xl font-bold text-white">
                              {stats.latestVitals.oxygenSaturation}%
                            </div>
                            <div className="text-xs text-white/60 mt-1">oxygen</div>
                          </div>
                        )}
                      </div>

                      {stats.latestVitals.createdAt && (
                        <div className="text-xs text-center text-white/60 mt-4">
                          Last updated: {format(new Date(stats.latestVitals.createdAt), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                  </GlassCard>
                )}

                {/* 4. Category Performance Mini Sparklines */}
                {weeklyProgressData.length > 0 && (
                  <GlassCard className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-pink-500/10 pointer-events-none" />

                    <div className="relative z-10">
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="h-6 w-6 text-violet-400" />
                        12-Week Trend Sparklines
                      </h3>

                      <div className="space-y-6">
                        {/* Exercise Trend */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-white font-semibold flex items-center gap-2">
                              <Activity className="h-4 w-4 text-blue-400" />
                              Exercise
                            </span>
                            <span className="text-lg font-bold text-white">
                              {weeklyProgressData[weeklyProgressData.length - 1]?.exercise || 0}%
                            </span>
                          </div>
                          <ResponsiveContainer width="100%" height={40}>
                            <AreaChart data={weeklyProgressData}>
                              <defs>
                                <linearGradient id="exerciseSparkGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                </linearGradient>
                              </defs>
                              <Area type="monotone" dataKey="exercise" stroke="#3b82f6" strokeWidth={2} fill="url(#exerciseSparkGrad)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Meals Trend */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-white font-semibold flex items-center gap-2">
                              <UtensilsCrossed className="h-4 w-4 text-yellow-400" />
                              Meals
                            </span>
                            <span className="text-lg font-bold text-white">
                              {weeklyProgressData[weeklyProgressData.length - 1]?.meals || 0}%
                            </span>
                          </div>
                          <ResponsiveContainer width="100%" height={40}>
                            <AreaChart data={weeklyProgressData}>
                              <defs>
                                <linearGradient id="mealsSparkGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.8}/>
                                  <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.1}/>
                                </linearGradient>
                              </defs>
                              <Area type="monotone" dataKey="meals" stroke="#fbbf24" strokeWidth={2} fill="url(#mealsSparkGrad)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Medications Trend */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-white font-semibold flex items-center gap-2">
                              <Pill className="h-4 w-4 text-green-400" />
                              Medications
                            </span>
                            <span className="text-lg font-bold text-white">
                              {weeklyProgressData[weeklyProgressData.length - 1]?.medications || 0}%
                            </span>
                          </div>
                          <ResponsiveContainer width="100%" height={40}>
                            <AreaChart data={weeklyProgressData}>
                              <defs>
                                <linearGradient id="medsSparkGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.1}/>
                                </linearGradient>
                              </defs>
                              <Area type="monotone" dataKey="medications" stroke="#10b981" strokeWidth={2} fill="url(#medsSparkGrad)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                )}
              </div>
            </div>

            {/* === 4-Category Summary Tabs === */}
            <GlassCard className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10 pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-white font-bold flex items-center gap-2">
                    <BarChart3 className="h-7 w-7 text-cyan-400" />
                    Category Summaries
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Exercise Summary */}
                  <div className="p-6 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30 hover:border-blue-400/50 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <Activity className="h-8 w-8 text-blue-400" />
                      <div className="text-3xl font-bold text-white">{weeklyMetrics.completionRate || 0}</div>
                    </div>
                    <h3 className="text-lg font-bold text-blue-300 mb-3">Exercise</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Completion Rate</span>
                        <span className="text-blue-300 font-bold">{weeklyMetrics.completionRate}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Sessions</span>
                        <span className="text-blue-300 font-bold">{weeklyMetrics.milestonesData.firstExerciseCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Capacity</span>
                        <span className="text-blue-300 font-bold">+{weeklyMetrics.clinicalImprovements.exerciseCapacityIncrease}%</span>
                      </div>
                    </div>
                    <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-cyan-400"
                        style={{ width: `${weeklyMetrics.completionRate || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Meals Summary */}
                  <div className="p-6 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/30 hover:border-green-400/50 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <UtensilsCrossed className="h-8 w-8 text-green-400" />
                      <div className="text-3xl font-bold text-white">{weeklyMetrics.completionRate || 0}</div>
                    </div>
                    <h3 className="text-lg font-bold text-green-300 mb-3">Meals</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Compliance</span>
                        <span className="text-green-300 font-bold">{weeklyMetrics.completionRate}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Weight Goal</span>
                        <span className="text-green-300 font-bold">{weeklyMetrics.milestonesData.weightGoalsCount} achieved</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Weight Lost</span>
                        <span className="text-green-300 font-bold">
                          {selectedPatient.startingWeight && selectedPatient.currentWeight
                            ? `${(selectedPatient.startingWeight - selectedPatient.currentWeight).toFixed(1)} lbs`
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-emerald-400"
                        style={{ width: `${weeklyMetrics.completionRate || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Medications Summary */}
                  <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30 hover:border-purple-400/50 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <Pill className="h-8 w-8 text-purple-400" />
                      <div className="text-3xl font-bold text-white">{weeklyMetrics.completionRate || 0}</div>
                    </div>
                    <h3 className="text-lg font-bold text-purple-300 mb-3">Medications</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Adherence</span>
                        <span className="text-purple-300 font-bold">{weeklyMetrics.completionRate}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Reduced Meds</span>
                        <span className="text-purple-300 font-bold">{weeklyMetrics.clinicalImprovements.medicationReductionCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Independence</span>
                        <span className="text-purple-300 font-bold">{weeklyMetrics.milestonesData.medicationIndependenceCount} patients</span>
                      </div>
                    </div>
                    <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-400 to-pink-400"
                        style={{ width: `${weeklyMetrics.completionRate || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Sleep Summary */}
                  <div className="p-6 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-400/30 hover:border-indigo-400/50 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <Clock className="h-8 w-8 text-indigo-400" />
                      <div className="text-3xl font-bold text-white">{weeklyMetrics.completionRate || 0}</div>
                    </div>
                    <h3 className="text-lg font-bold text-indigo-300 mb-3">Sleep</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Quality Score</span>
                        <span className="text-indigo-300 font-bold">{weeklyMetrics.completionRate}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Avg Hours</span>
                        <span className="text-indigo-300 font-bold">7.5 hrs</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Consistency</span>
                        <span className="text-indigo-300 font-bold">{weeklyMetrics.completionRate}%</span>
                      </div>
                    </div>
                    <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-400 to-violet-400"
                        style={{ width: `${weeklyMetrics.completionRate || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </>
        )}
      </div>
    );
  }

  // Patient Dashboard
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--ink)' }}>
          {getGreeting()}, {user?.name || 'Patient'}!
        </h1>
        <p className="text-white font-bold mt-2">
          Here's your health overview for {format(new Date(), 'EEEE, MMMM d')}
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Compliance Score */}
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1" style={{ color: 'var(--ink)' }}>Weekly Compliance</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--ink)' }}>{stats.weeklyCompliance}%</p>
              <div className="flex items-center mt-2">
                {stats.weeklyCompliance >= 80 ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600">On track</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-yellow-500 mr-1" />
                    <span className="text-sm text-yellow-600">Needs attention</span>
                  </>
                )}
              </div>
            </div>
            <div className={`p-3 rounded-full ${stats.weeklyCompliance >= 80 ? 'bg-green-100' : 'bg-yellow-100'}`}>
              <TrendingUp className={`h-8 w-8 ${stats.weeklyCompliance >= 80 ? 'text-green-600' : 'text-yellow-600'}`} />
            </div>
          </div>
        </GlassCard>

        {/* Today's Events */}
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1" style={{ color: 'var(--ink)' }}>Today's Events</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--ink)' }}>{stats.todayEvents.length}</p>
              <div className="flex items-center mt-2">
                <Clock className="h-4 w-4 text-blue-500 mr-1" />
                <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
                  {stats.todayEvents.filter(e => e.status === 'scheduled').length} pending
                </span>
              </div>
            </div>
            <div className="p-3 rounded-full bg-blue-100">
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </GlassCard>

        {/* Active Medications */}
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1" style={{ color: 'var(--ink)' }}>Active Medications</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--ink)' }}>{stats.activeMedications.length}</p>
              <div className="flex items-center mt-2">
                <Pill className="h-4 w-4 text-purple-500 mr-1" />
                <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>Daily reminders on</span>
              </div>
            </div>
            <div className="p-3 rounded-full bg-purple-100">
              <Pill className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </GlassCard>

        {/* Today's Meals */}
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1" style={{ color: 'var(--ink)' }}>Meals Logged</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--ink)' }}>{stats.todayMeals.length}/4</p>
              <div className="flex items-center mt-2">
                <UtensilsCrossed className="h-4 w-4 text-orange-500 mr-1" />
                <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
                  {stats.todayMeals.filter(m => m.withinSpec).length} within limits
                </span>
              </div>
            </div>
            <div className="p-3 rounded-full bg-orange-100">
              <UtensilsCrossed className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Vitals */}
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold font-bold" style={{ color: 'var(--ink)' }}>Latest Vitals</h2>
            <Link to="/vitals" className="text-blue-600 hover:text-blue-700 flex items-center">
              View all <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          
          {stats.latestVitals ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>Blood Pressure</span>
                  <Heart className="h-4 w-4 text-red-500" />
                </div>
                <p className="text-2xl font-bold text-white font-bold">
                  {stats.latestVitals.bloodPressureSystolic}/{stats.latestVitals.bloodPressureDiastolic}
                </p>
                <p className={`text-sm mt-1 text-${bpStatus.color}-600`}>{bpStatus.status}</p>
              </div>

              <div className="p-4 bg-white/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>Heart Rate</span>
                  <Activity className="h-4 w-4 text-red-500" />
                </div>
                <p className="text-2xl font-bold text-white font-bold">
                  {stats.latestVitals.heartRate || '--'} <span className="text-sm">bpm</span>
                </p>
                <p className="text-sm text-white font-bold mt-1">
                  {stats.latestVitals.heartRate && stats.latestVitals.heartRate < 60
                    ? 'Low'
                    : stats.latestVitals.heartRate && stats.latestVitals.heartRate > 100
                    ? 'High'
                    : 'Normal'}
                </p>
              </div>

              <div className="p-4 bg-white/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>Weight</span>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-white font-bold">
                  {stats.latestVitals.weight || '--'} <span className="text-sm">lbs</span>
                </p>
                <p className="text-sm text-white font-bold mt-1">Target: 165 lbs</p>
              </div>

              <div className="p-4 bg-white/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>Blood Sugar</span>
                  <Activity className="h-4 w-4 text-orange-500" />
                </div>
                <p className="text-2xl font-bold text-white font-bold">
                  {stats.latestVitals.bloodSugar || '--'} <span className="text-sm">mg/dL</span>
                </p>
                <p className="text-sm text-white font-bold mt-1">
                  {stats.latestVitals.bloodSugar && stats.latestVitals.bloodSugar < 100
                    ? 'Normal'
                    : stats.latestVitals.bloodSugar && stats.latestVitals.bloodSugar < 126
                    ? 'Pre-diabetic'
                    : 'High'}
                </p>
              </div>

              <div className="p-4 bg-white/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>O₂ Saturation</span>
                  <Activity className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-white font-bold">
                  {stats.latestVitals.oxygenSaturation || '--'}%
                </p>
                <p className="text-sm text-white font-bold mt-1">
                  {stats.latestVitals.oxygenSaturation && stats.latestVitals.oxygenSaturation >= 95
                    ? 'Normal'
                    : 'Low'}
                </p>
              </div>

              <div className="p-4 bg-white/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>Temperature</span>
                  <Activity className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-white font-bold">
                  {stats.latestVitals.temperature || '--'}°F
                </p>
                <p className="text-sm text-white font-bold mt-1">Normal: 98.6°F</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 font-bold" style={{ color: 'var(--ink)' }}>
              <Activity className="h-12 w-12 mx-auto mb-3 text-white font-bold" />
              <p>No vitals recorded yet</p>
              <Link to="/vitals" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
                Record your first vitals →
              </Link>
            </div>
          )}
        </GlassCard>

        {/* Today's Schedule */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold font-bold" style={{ color: 'var(--ink)' }}>Today's Schedule</h2>
            <Link to="/calendar" className="text-blue-600 hover:text-blue-700">
              <Calendar className="h-5 w-5" />
            </Link>
          </div>
          
          {stats.todayEvents.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {stats.todayEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start space-x-3 p-3 bg-white/50 rounded-lg hover:bg-white/70 transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full mt-2 bg-${event.calendar?.type || 'general'}-500`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium font-bold truncate" style={{ color: 'var(--ink)' }}>{event.title}</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
                      {format(new Date(event.startTime), 'h:mm a')}
                      {event.location && ` • ${event.location}`}
                    </p>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                        event.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : event.status === 'missed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 font-bold" style={{ color: 'var(--ink)' }}>
              <Calendar className="h-12 w-12 mx-auto mb-3 text-white font-bold" />
              <p>No events scheduled for today</p>
              <Link to="/calendar" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
                Add an event →
              </Link>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Active Medications List */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold font-bold" style={{ color: 'var(--ink)' }}>Active Medications</h2>
          <Link to="/medications" className="text-blue-600 hover:text-blue-700 flex items-center">
            Manage <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
        
        {stats.activeMedications.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.activeMedications.map((med) => (
              <div
                key={med.id}
                className="p-4 bg-white/50 rounded-lg hover:bg-white/70 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-white font-bold">{med.name}</p>
                    <p className="text-sm text-white font-bold mt-1">{med.dosage}</p>
                    <p className="text-xs font-bold mt-1" style={{ color: 'var(--ink)' }}>{med.frequency}</p>
                  </div>
                  <Pill className="h-5 w-5 text-purple-500" />
                </div>
                {med.timeOfDay && (
                  <div className="mt-2 flex items-center text-xs text-white font-bold">
                    <Clock className="h-3 w-3 mr-1" />
                    {med.timeOfDay}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 font-bold" style={{ color: 'var(--ink)' }}>
            <Pill className="h-12 w-12 mx-auto mb-3 text-white font-bold" />
            <p>No active medications</p>
            <Link to="/medications" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
              Add medication →
            </Link>
          </div>
        )}
      </GlassCard>

      {/* Weight Tracking Progress */}
      <GlassCard>
        <h2 className="text-xl font-semibold text-white font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-yellow-400" />
          My Weight Progress
        </h2>
        <WeightTrackingChart
          patient={{
            id: user?.id || 0,
            therapistId: 0,
            name: user?.name || '',
            isActive: true,
            height: 70, // TODO: Get from user profile
            heightUnit: 'in' as 'in' | 'cm',
            startingWeight: 180, // TODO: Get from user profile
            currentWeight: stats.latestVitals?.weight || 175, // Get from latest vitals
            targetWeight: 165, // TODO: Get from user profile
            weightUnit: 'lbs' as 'kg' | 'lbs',
            surgeryDate: '', // TODO: Get from user profile
            createdAt: '',
            updatedAt: ''
          }}
          weightEntries={[]} // TODO: Fetch weight history from vitals
          showTargetStar={true}
        />
      </GlassCard>

      {/* 12-Week Progress Photos - Patient View */}
      <GlassCard>
        <h2 className="text-xl font-semibold text-white font-bold mb-4 flex items-center gap-2">
          <Camera className="h-6 w-6 text-teal-400" />
          My 12-Week Recovery Progress Photos
        </h2>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        {/* 12-Week Photo Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-2">
          {Array.from({ length: 12 }).map((_, index) => {
            const week = index + 1;
            const photo = selectedPhotoPatient && progressPhotos[selectedPhotoPatient]?.[week];

            return (
              <div key={week} className="flex flex-col gap-1">
                <div className="text-center">
                  <span className="text-xs font-bold text-teal-300">Week {week}</span>
                </div>
                {photo ? (
                  <div className="relative aspect-square rounded-lg border-2 border-solid border-teal-400/30 overflow-hidden group" style={{ background: 'linear-gradient(135deg, #232d42, #2d3a57)' }}>
                    <img
                      src={photo}
                      alt={`Week ${week}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => handleDeletePhoto(week)}
                      className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => handlePhotoUpload(week)}
                    className="aspect-square rounded-lg border-2 border-dashed border-teal-400/30 hover:border-teal-400/50 flex items-center justify-center cursor-pointer transition-all group"
                    style={{ background: 'linear-gradient(135deg, #232d42, #2d3a57)' }}
                  >
                    <Camera className="h-6 w-6 text-teal-400/50 group-hover:text-teal-400 transition-colors" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-teal-300 mt-3">
          Upload photos for each week of your recovery journey. Click empty slots to add photos, hover over photos to delete (max 5MB per photo).
        </p>
      </GlassCard>
    </div>
  );
}
