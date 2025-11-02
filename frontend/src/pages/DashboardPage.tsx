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
import { format, subDays, differenceInWeeks, parseISO } from 'date-fns';
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
  categoryMetrics: {
    exercise: {
      completionRate: number;
      totalSessions: number;
      capacityIncrease: number;
    };
    meals: {
      complianceRate: number;
      totalWeightLost: number;
    };
    medications: {
      adherenceRate: number;
    };
    sleep: {
      qualityScore: number;
      avgHours: number;
      consistencyRate: number;
    };
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
    categoryMetrics: {
      exercise: {
        completionRate: 0,
        totalSessions: 0,
        capacityIncrease: 0,
      },
      meals: {
        complianceRate: 0,
        totalWeightLost: 0,
      },
      medications: {
        adherenceRate: 0,
      },
      sleep: {
        qualityScore: 0,
        avgHours: 0,
        consistencyRate: 0,
      },
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
  const [calorieData, setCalorieData] = useState<Array<{
    date: string;
    consumed: number;
    burned: number;
    net: number;
  }>>([]);
  const [calorieLoading, setCalorieLoading] = useState(true);
  const [patientScores, setPatientScores] = useState<Record<number, { currentWeek: number; previousWeek: number; change: number }>>({});
  const [weightEntries, setWeightEntries] = useState<Array<{ date: string; weight: number }>>([]);
  const [patientProfile, setPatientProfile] = useState<Patient | null>(null);

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

  // Load patient profile for current user (if patient role)
  useEffect(() => {
    const loadPatientProfile = async () => {
      if (isAdmin || !user?.id) return;

      try {
        const { hasProfile, patient } = await api.checkPatientProfile();
        if (hasProfile && patient) {
          setPatientProfile(patient);
        }
      } catch (error) {
        console.error('Failed to load patient profile:', error);
      }
    };

    loadPatientProfile();
  }, [isAdmin, user?.id]);

  // Load weight entries from vitals
  useEffect(() => {
    const loadWeightEntries = async () => {
      try {
        const userId = isAdmin && selectedPatient?.userId ? selectedPatient.userId : user?.id;
        if (!userId) return;

        const endDate = format(new Date(), 'yyyy-MM-dd');
        const startDate = format(subDays(new Date(), 90), 'yyyy-MM-dd'); // Last 90 days

        const vitals = await api.getVitals({
          startDate,
          endDate,
          userId,
        });

        // Filter vitals that have weight data and transform to weight entries
        const entries = vitals
          .filter(v => v.weight != null)
          .map(v => ({
            date: v.timestamp.split('T')[0],
            weight: v.weight!,
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setWeightEntries(entries);
      } catch (error) {
        console.error('Failed to load weight entries:', error);
        setWeightEntries([]);
      }
    };

    loadWeightEntries();
  }, [isAdmin, selectedPatient?.userId, user?.id]);

  // Load calorie data for energy balance chart
  useEffect(() => {
    const loadCalorieData = async () => {
      try {
        setCalorieLoading(true);
        const endDate = format(new Date(), 'yyyy-MM-dd');
        const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
        const userId = isAdmin && selectedPatient?.userId ? selectedPatient.userId : user?.id;

        const data = await api.getDailyCalories({
          startDate,
          endDate,
          userId
        });

        // Transform data for the chart
        const chartData = data.map(item => ({
          date: format(parseISO(item.date), 'MMM dd'),
          consumed: item.consumed,
          burned: item.burned,
          net: item.net
        }));

        setCalorieData(chartData);
      } catch (error) {
        console.error('Error loading calorie data:', error);
        setCalorieData([]);
      } finally {
        setCalorieLoading(false);
      }
    };

    if (user?.id || (isAdmin && selectedPatient?.userId)) {
      loadCalorieData();
    }
  }, [user?.id, isAdmin, selectedPatient]);

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
          api.getEvents(userId, startStr, endStr, { usePatientId: !!userId }).catch(() => []),
          api.getMeals({ startDate: startStr, endDate: endStr, userId }).catch(() => []),
          api.getSleepLogs({ startDate: startStr, endDate: endStr, userId }).catch(() => []),
          api.getMedicationLogs({ startDate: startStr, endDate: endStr, userId }).catch(() => []),
          api.getVitals({ startDate: startStr, endDate: endStr, userId }).catch(() => []),
        ]);

        // Calculate Exercise Score (0-100) based on performanceScore
        const exerciseEvents = events.filter(e =>
          e.calendar?.type === 'exercise' || e.exerciseId || e.title.toLowerCase().includes('exercise')
        );

        // Sum performance scores (0/4/6/8 points per workout)
        const totalPoints = exerciseEvents.reduce((sum, e) => sum + (e.performanceScore || 0), 0);

        // Weekly expectation: 3 workouts × 8 points = 24 max
        const expectedWeeklyMax = 24;
        const exerciseScore = exerciseEvents.length > 0
          ? Math.min(100, Math.round((totalPoints / expectedWeeklyMax) * 100))
          : 0;

        // Calculate Meals Score (0-100) - based on meal quality
        const mealsScore = meals.length > 0
          ? Math.round(meals.reduce((sum, meal) => {
              // Use withinSpec to determine meal quality score
              const qualityScore = meal.withinSpec ? 100 : 50;
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
              const patient = isAdmin ? selectedPatient : patientProfile;
              if (!patient || !patient.startingWeight || !patient.targetWeight) return 0;

              const weightLoss = (patient.startingWeight || 0) - (weekWeight || 0);
              const goalWeightLoss = (patient.startingWeight || 0) - (patient.targetWeight || 0);

              if (goalWeightLoss <= 0) return 0;
              const progress = Math.min(100, Math.round((weightLoss / goalWeightLoss) * 100));
              return Math.max(0, progress);
            })()
          : 0;

        weeklyData.push({
          week: `${format(weekStartDate, 'M/d')}`,
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

      // Get patient's userId for filtering
      const patientUserId = user?.id;

      const [events, medications, vitals, meals] = await Promise.all([
        api.getEvents(patientUserId, today, today, { usePatientId: true }),
        api.getMedications(true),
        api.getLatestVital(),
        api.getMeals({ startDate: today, endDate: today }),
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

      // Load 12-week progress data for this patient
      await calculate12WeekProgress(patientUserId);
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
      const allMeals: any[] = [];
      const allSleepLogs: any[] = [];
      const allMedicationLogs: any[] = [];

      for (const patient of activePatients) {
        if (patient.userId) {
          try {
            // Get ALL events for total recovery progress (no date filter)
            const events = await api.getEvents(patient.userId, undefined, undefined, { usePatientId: true });
            allEvents.push(...events);

            // Get today's events separately
            const todayEvents = await api.getEvents(patient.userId, today, today, { usePatientId: true });
            todayAllEvents.push(...todayEvents);

            // Get vitals from the last 30 days for better analysis
            const vitals = await api.getVitals({
              startDate: subDays(new Date(), 30).toISOString().split('T')[0],
              endDate: today,
              userId: patient.userId
            });
            allVitals.push(...vitals);

            // Get meals, sleep logs, and medication logs from the last 7 days
            const meals = await api.getMeals({ startDate: sevenDaysAgo, endDate: today, userId: patient.userId }).catch(() => []);
            allMeals.push(...meals);

            const sleepLogs = await api.getSleepLogs({ startDate: sevenDaysAgo, endDate: today, userId: patient.userId }).catch(() => []);
            allSleepLogs.push(...sleepLogs);

            const medicationLogs = await api.getMedicationLogs({ startDate: sevenDaysAgo, endDate: today, userId: patient.userId }).catch(() => []);
            allMedicationLogs.push(...medicationLogs);
          } catch (err) {
            console.error(`Failed to load data for patient ${patient.id}:`, err);
          }
        }
      }

      // Calculate weekly metrics - filter to selected patient if one is selected
      let metrics;
      if (selectedPatient?.userId) {
        // Filter all data to just this patient
        const patientEvents = allEvents.filter(e => e.userId === selectedPatient.userId);
        const patientVitals = allVitals.filter(v => v.userId === selectedPatient.userId);
        const patientMeals = allMeals.filter(m => m.userId === selectedPatient.userId);
        const patientSleep = allSleepLogs.filter(s => s.userId === selectedPatient.userId);
        const patientMeds = allMedicationLogs.filter(m => m.userId === selectedPatient.userId);
        const patientArray = activePatients.filter(p => p.userId === selectedPatient.userId);

        metrics = calculateWeeklyMetrics(patientArray, patientEvents, patientVitals, patientMeals, patientSleep, patientMeds);
      } else {
        // Use aggregate data for all patients
        metrics = calculateWeeklyMetrics(activePatients, allEvents, allVitals, allMeals, allSleepLogs, allMedicationLogs);
      }
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

      // Load patient scores for week-over-week comparison
      await loadPatientScores(activePatients);
    } catch (error) {
      console.error('Failed to load admin dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPatientScores = async (patients: Patient[]) => {
    const scores: Record<number, { currentWeek: number; previousWeek: number; change: number }> = {};
    const today = new Date();
    const sevenDaysAgo = subDays(today, 7);
    const fourteenDaysAgo = subDays(today, 14);

    for (const patient of patients.slice(0, 5)) {
      if (!patient.userId) continue;

      try {
        // Get daily scores for current week and previous week
        const currentWeekScores = await api.getDailyScores({
          userId: patient.userId,
          startDate: format(sevenDaysAgo, 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        });

        const previousWeekScores = await api.getDailyScores({
          userId: patient.userId,
          startDate: format(fourteenDaysAgo, 'yyyy-MM-dd'),
          endDate: format(sevenDaysAgo, 'yyyy-MM-dd'),
        });

        // Calculate average scores
        const currentAvg = currentWeekScores.length > 0
          ? currentWeekScores.reduce((sum, s) => sum + s.totalDailyScore, 0) / currentWeekScores.length
          : 0;

        const previousAvg = previousWeekScores.length > 0
          ? previousWeekScores.reduce((sum, s) => sum + s.totalDailyScore, 0) / previousWeekScores.length
          : 0;

        const change = currentAvg - previousAvg;

        scores[patient.id] = {
          currentWeek: Math.round(currentAvg),
          previousWeek: Math.round(previousAvg),
          change: Math.round(change),
        };
      } catch (error) {
        console.error(`Failed to load scores for patient ${patient.id}:`, error);
        // Set default values if API call fails
        scores[patient.id] = {
          currentWeek: 0,
          previousWeek: 0,
          change: 0,
        };
      }
    }

    setPatientScores(scores);
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
    allVitals: VitalsSample[],
    allMeals: any[] = [],
    allSleepLogs: any[] = [],
    allMedicationLogs: any[] = []
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
      // Real calculation: Count patients with fewer than 3 active medications (considered independent)
      medicationIndependenceCount: patients.filter(p => {
        const patientMedEvents = allEvents.filter(e =>
          e.userId === p.userId &&
          e.calendar?.type === 'medications' &&
          e.status === 'completed'
        );
        // If patient has consistent med compliance and very few meds, consider independent
        return patientMedEvents.length > 0 && patientMedEvents.length < 10; // Less than 10 doses per week suggests minimal meds
      }).length,
    };

    // Top performers - Real calculations
    const topPerformers = (() => {
      // Calculate biggest vitals improvement (BP reduction)
      let biggestVitalsImprovement: { name: string; improvement: string } | null = null;
      let maxBPImprovement = 0;

      patients.forEach(p => {
        const patientVitals = allVitals
          .filter(v => v.userId === p.userId && v.bloodPressureSystolic)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        if (patientVitals.length >= 2) {
          const firstBP = patientVitals[0].bloodPressureSystolic || 0;
          const latestBP = patientVitals[patientVitals.length - 1].bloodPressureSystolic || 0;
          const improvement = firstBP - latestBP; // Positive = improvement

          if (improvement > maxBPImprovement) {
            maxBPImprovement = improvement;
            const improvementPercent = firstBP > 0 ? Math.round((improvement / firstBP) * 100) : 0;
            biggestVitalsImprovement = {
              name: p.name,
              improvement: `BP improved ${improvementPercent}%`
            };
          }
        }
      });

      // Calculate perfect attendance (highest completion rate)
      let perfectAttendance: { name: string; days: number } | null = null;
      let maxCompletions = 0;

      patients.forEach(p => {
        const patientEvents = allEvents.filter(e => e.userId === p.userId);
        const completedCount = patientEvents.filter(e => e.status === 'completed').length;

        if (completedCount > maxCompletions) {
          maxCompletions = completedCount;
          perfectAttendance = {
            name: p.name,
            days: completedCount
          };
        }
      });

      // Calculate best outcome (highest composite score: weight + exercise + vitals goals)
      let bestOutcome: { name: string; description: string } | null = null;
      let maxOutcomeScore = 0;

      patients.forEach(p => {
        let outcomeScore = 0;

        // Weight goal achieved? +1
        if (p.currentWeight && p.targetWeight && p.currentWeight <= p.targetWeight) {
          outcomeScore += 1;
        }

        // Exercise completion > 80%? +1
        const patientExercises = allEvents.filter(e =>
          e.userId === p.userId && e.calendar?.type === 'exercise'
        );
        const exerciseCompletionRate = patientExercises.length > 0
          ? patientExercises.filter(e => e.status === 'completed').length / patientExercises.length
          : 0;
        if (exerciseCompletionRate > 0.8) outcomeScore += 1;

        // Vitals improving? +1
        const patientVitals = allVitals
          .filter(v => v.userId === p.userId && v.bloodPressureSystolic)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        if (patientVitals.length >= 2) {
          const firstBP = patientVitals[0].bloodPressureSystolic || 0;
          const latestBP = patientVitals[patientVitals.length - 1].bloodPressureSystolic || 0;
          if (latestBP < firstBP) outcomeScore += 1;
        }

        if (outcomeScore > maxOutcomeScore) {
          maxOutcomeScore = outcomeScore;
          const goalsText = outcomeScore === 3 ? 'All goals met' :
                          outcomeScore === 2 ? '2 of 3 goals met' :
                          outcomeScore === 1 ? '1 of 3 goals met' : 'In progress';
          bestOutcome = {
            name: p.name,
            description: goalsText
          };
        }
      });

      return {
        biggestVitalsImprovement,
        perfectAttendance,
        bestOutcome,
      };
    })();

    // Clinical improvements - Real calculations
    // Calculate average BP improvement across all patients
    const avgVitalsImprovement = (() => {
      let totalImprovement = 0;
      let patientsWithImprovement = 0;

      patients.forEach(p => {
        const patientVitals = allVitals
          .filter(v => v.userId === p.userId && v.bloodPressureSystolic)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        if (patientVitals.length >= 2) {
          const firstBP = patientVitals[0].bloodPressureSystolic || 0;
          const latestBP = patientVitals[patientVitals.length - 1].bloodPressureSystolic || 0;
          if (firstBP > 0) {
            const improvementPercent = ((firstBP - latestBP) / firstBP) * 100;
            totalImprovement += improvementPercent;
            patientsWithImprovement++;
          }
        }
      });

      return patientsWithImprovement > 0 ? Math.round((totalImprovement / patientsWithImprovement) * 10) / 10 : 0;
    })();

    // Count patients with improving vitals trends
    const improvingTrendsCount = patients.filter(p => {
      const patientVitals = allVitals
        .filter(v => v.userId === p.userId && v.bloodPressureSystolic)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      if (patientVitals.length >= 2) {
        const firstBP = patientVitals[0].bloodPressureSystolic || 0;
        const latestBP = patientVitals[patientVitals.length - 1].bloodPressureSystolic || 0;
        return latestBP < firstBP; // Improving if BP decreased
      }
      return false;
    }).length;

    // Count patients with reduced medication events (comparing first half vs second half of period)
    const medicationReductionCount = (() => {
      let reducedCount = 0;

      patients.forEach(p => {
        const patientMedEvents = allEvents
          .filter(e => e.userId === p.userId && e.calendar?.type === 'medications')
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        if (patientMedEvents.length >= 6) {
          const midpoint = Math.floor(patientMedEvents.length / 2);
          const firstHalf = patientMedEvents.slice(0, midpoint).length;
          const secondHalf = patientMedEvents.slice(midpoint).length;
          if (secondHalf < firstHalf * 0.8) reducedCount++; // 20% reduction
        }
      });

      return reducedCount;
    })();

    // Calculate exercise capacity increase from performance scores
    const exerciseCapacityIncrease = (() => {
      let totalIncrease = 0;
      let patientsWithIncrease = 0;

      patients.forEach(p => {
        const patientExercises = allEvents
          .filter(e => e.userId === p.userId && e.calendar?.type === 'exercise' && e.performanceScore)
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        if (patientExercises.length >= 2) {
          const firstScore = patientExercises[0].performanceScore || 0;
          const latestScore = patientExercises[patientExercises.length - 1].performanceScore || 0;
          if (firstScore > 0) {
            const increasePercent = ((latestScore - firstScore) / firstScore) * 100;
            if (increasePercent > 0) {
              totalIncrease += increasePercent;
              patientsWithIncrease++;
            }
          }
        }
      });

      return patientsWithIncrease > 0 ? Math.round(totalIncrease / patientsWithIncrease) : 0;
    })();

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

    // Calculate category-specific metrics
    const categoryMetrics = {
      exercise: {
        // Calculate exercise points based on performanceScore - USE ALL EVENTS for total progress
        completionRate: (() => {
          // Use ALL events, not just this week's events, to show total recovery progress
          const exerciseEvents = allEvents.filter(e =>
            e.calendar?.type === 'exercise' || e.exerciseId || e.title.toLowerCase().includes('exercise')
          );

          // Sum all performance scores (0/4/6/8 points per workout)
          const totalPoints = exerciseEvents.reduce((sum, e) => {
            return sum + (e.performanceScore || 0);
          }, 0);

          // Monthly expectation: 12 workouts × 8 points = 96 points + 4 bonus = 100 max
          const monthlyMax = 100;
          const scaledScore = exerciseEvents.length > 0
            ? Math.min(100, Math.round((totalPoints / monthlyMax) * 100))
            : 0;

          return scaledScore;
        })(),
        // Calculate total exercise sessions
        totalSessions: weekEvents.filter(e =>
          e.calendar?.type === 'exercise' || e.exerciseId || e.title.toLowerCase().includes('exercise')
        ).length,
        // Calculate capacity increase (same as existing exerciseCapacityIncrease)
        capacityIncrease: exerciseCapacityIncrease,
      },
      meals: {
        // Calculate meal compliance rate (meals logged vs expected)
        complianceRate: (() => {
          const expectedMealsPerWeek = patients.length * 21; // 3 meals per day * 7 days
          const actualMealsLogged = allMeals.length;
          return expectedMealsPerWeek > 0
            ? Math.round((actualMealsLogged / expectedMealsPerWeek) * 100)
            : 0;
        })(),
        // Calculate total weight lost across all patients
        totalWeightLost: (() => {
          let totalLost = 0;
          patients.forEach(p => {
            if (p.currentWeight && p.targetWeight && p.currentWeight <= p.targetWeight) {
              // Calculate weight lost (initial - current)
              const patientVitals = allVitals
                .filter(v => v.userId === p.userId && v.weight)
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

              if (patientVitals.length >= 2) {
                const initialWeight = patientVitals[0].weight || 0;
                const currentWeight = patientVitals[patientVitals.length - 1].weight || 0;
                totalLost += Math.max(0, initialWeight - currentWeight);
              }
            }
          });
          return Math.round(totalLost * 10) / 10;
        })(),
      },
      medications: {
        // Calculate medication adherence rate
        adherenceRate: (() => {
          const expectedDoses = allMedicationLogs.length > 0 ? allMedicationLogs.length : 1;
          const takenDoses = allMedicationLogs.filter((log: any) => log.status === 'taken').length;
          return expectedDoses > 0
            ? Math.round((takenDoses / expectedDoses) * 100)
            : 0;
        })(),
      },
      sleep: {
        // Calculate sleep quality score (average of quality ratings)
        qualityScore: (() => {
          const qualityRatings = allSleepLogs
            .filter((log: any) => log.quality !== undefined && log.quality !== null)
            .map((log: any) => log.quality);

          if (qualityRatings.length === 0) return 0;

          const avgQuality = qualityRatings.reduce((sum: number, q: number) => sum + q, 0) / qualityRatings.length;
          return Math.round(avgQuality * 20); // Convert 1-5 scale to 0-100 percentage
        })(),
        // Calculate average hours of sleep
        avgHours: (() => {
          const sleepDurations = allSleepLogs
            .filter((log: any) => log.hoursSlept !== undefined && log.hoursSlept !== null)
            .map((log: any) => log.hoursSlept);

          if (sleepDurations.length === 0) return 0;

          const avgHours = sleepDurations.reduce((sum: number, h: number) => sum + h, 0) / sleepDurations.length;
          return Math.round(avgHours * 10) / 10;
        })(),
        // Calculate consistency rate (% of days with sleep logs)
        consistencyRate: (() => {
          const expectedLogs = patients.length * 7; // 7 days
          const actualLogs = allSleepLogs.length;
          return expectedLogs > 0
            ? Math.round((actualLogs / expectedLogs) * 100)
            : 0;
        })(),
      },
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
      categoryMetrics,
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
                    {adminStats.activePatients.slice(0, 5).map((patient) => {
                      const score = patientScores[patient.id];
                      const scoreValue = score?.currentWeek || 0;
                      const isPositive = (score?.change || 0) >= 0;

                      return (
                        <div key={patient.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #232d42, #2d3a57)' }}>
                          <span className="text-xs text-white font-bold truncate flex-1">{patient.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-violet-300">
                              {scoreValue}%
                            </span>
                            {isPositive ? (
                              <TrendingUp className="h-3 w-3 text-green-400" />
                            ) : (
                              <TrendingUp className="h-3 w-3 text-red-400 rotate-180" />
                            )}
                          </div>
                        </div>
                      );
                    })}
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
                        (weeklyMetrics.categoryMetrics.exercise.completionRate || 0) +
                        (weeklyMetrics.categoryMetrics.meals.complianceRate || 0) +
                        (weeklyMetrics.categoryMetrics.medications.adherenceRate || 0) +
                        (weeklyMetrics.categoryMetrics.sleep.qualityScore || 0))
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
                      <div className="text-4xl font-bold text-white mb-2">{weeklyMetrics.categoryMetrics.exercise.completionRate || 0}</div>
                      <div className="text-xs font-bold text-blue-300 mb-1">Exercise Points</div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-400 to-cyan-400"
                          style={{ width: `${weeklyMetrics.categoryMetrics.exercise.completionRate || 0}%` }}
                        />
                      </div>
                      <div className="text-xs text-white/60 mt-2">out of 100</div>
                      <div className="text-xs text-white/50 mt-1">Cumulative total recovery progress</div>
                      <div className="text-xs text-white/50">0=No Show, 4=Done, 6=Met, 8=Exceeded</div>
                    </div>
                  </div>

                  {/* Meals Score */}
                  <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/30">
                    <div className="text-center">
                      <UtensilsCrossed className="h-8 w-8 text-green-400 mx-auto mb-3" />
                      <div className="text-4xl font-bold text-white mb-2">{weeklyMetrics.categoryMetrics.meals.complianceRate || 0}</div>
                      <div className="text-xs font-bold text-green-300 mb-1">Meals Compliance</div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-400 to-emerald-400"
                          style={{ width: `${weeklyMetrics.categoryMetrics.meals.complianceRate || 0}%` }}
                        />
                      </div>
                      <div className="text-xs text-white/60 mt-2">out of 100</div>
                      <div className="text-xs text-white/50 mt-1">% of meals within diet specs</div>
                      <div className="text-xs text-white/50">Low sodium, heart-healthy</div>
                    </div>
                  </div>

                  {/* Medications Score */}
                  <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30">
                    <div className="text-center">
                      <Pill className="h-8 w-8 text-purple-400 mx-auto mb-3" />
                      <div className="text-4xl font-bold text-white mb-2">{weeklyMetrics.categoryMetrics.medications.adherenceRate || 0}</div>
                      <div className="text-xs font-bold text-purple-300 mb-1">Medication Adherence</div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-400 to-pink-400"
                          style={{ width: `${weeklyMetrics.categoryMetrics.medications.adherenceRate || 0}%` }}
                        />
                      </div>
                      <div className="text-xs text-white/60 mt-2">out of 100</div>
                      <div className="text-xs text-white/50 mt-1">% of prescribed doses taken</div>
                      <div className="text-xs text-white/50">On-time compliance rate</div>
                    </div>
                  </div>

                  {/* Sleep Score */}
                  <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-400/30">
                    <div className="text-center">
                      <Clock className="h-8 w-8 text-indigo-400 mx-auto mb-3" />
                      <div className="text-4xl font-bold text-white mb-2">{weeklyMetrics.categoryMetrics.sleep.qualityScore || 0}</div>
                      <div className="text-xs font-bold text-indigo-300 mb-1">Sleep Quality</div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-400 to-violet-400"
                          style={{ width: `${weeklyMetrics.categoryMetrics.sleep.qualityScore || 0}%` }}
                        />
                      </div>
                      <div className="text-xs text-white/60 mt-2">out of 100</div>
                      <div className="text-xs text-white/50 mt-1">7-9 hrs nightly target</div>
                      <div className="text-xs text-white/50">Consistency & duration</div>
                    </div>
                  </div>

                  {/* Weight Score */}
                  <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-400/30">
                    <div className="text-center">
                      <TrendingUp className="h-8 w-8 text-orange-400 mx-auto mb-3" />
                      <div className="text-4xl font-bold text-white mb-2">{calculateWeightScore(selectedPatient)}</div>
                      <div className="text-xs font-bold text-orange-300 mb-1">Weight Progress</div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-400 to-red-400"
                          style={{ width: `${calculateWeightScore(selectedPatient)}%` }}
                        />
                      </div>
                      <div className="text-xs text-white/60 mt-2">out of 100</div>
                      <div className="text-xs text-white/50 mt-1">Progress toward weight goal</div>
                      <div className="text-xs text-white/50">Since surgery date</div>
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

                  <div className="text-xs text-white/70 mb-4 px-4">
                    <div className="font-bold text-purple-300 mb-1">Current Week Performance</div>
                    <div className="space-y-1">
                      <div>• Each axis shows 0-100% for that category</div>
                      <div>• Larger polygon = better overall wellness</div>
                      <div>• Exercise: workout completion rate</div>
                      <div>• Meals: diet compliance rate</div>
                      <div>• Medications: adherence rate</div>
                      <div>• Sleep: quality score (7-9 hrs target)</div>
                      <div>• Weight: progress toward target weight</div>
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={[
                      {
                        category: 'Exercise',
                        score: weeklyMetrics.categoryMetrics.exercise.completionRate || 0,
                        fullMark: 100
                      },
                      {
                        category: 'Meals',
                        score: weeklyMetrics.categoryMetrics.meals.complianceRate || 0,
                        fullMark: 100
                      },
                      {
                        category: 'Medications',
                        score: weeklyMetrics.categoryMetrics.medications.adherenceRate || 0,
                        fullMark: 100
                      },
                      {
                        category: 'Sleep',
                        score: weeklyMetrics.categoryMetrics.sleep.qualityScore || 0,
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
                    Balanced shape indicates consistent performance across all wellness categories
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

                  <div className="text-xs text-white/70 mb-4 px-4">
                    <div className="font-bold text-cyan-300 mb-1">Weekly Performance Over 12-Week Recovery Period</div>
                    <div className="space-y-1">
                      <div>• X-axis shows calendar dates (week starting dates)</div>
                      <div>• Y-axis shows 0-100% performance for each category</div>
                      <div>• Track steady improvement or identify concerning declines</div>
                      <div>• Optimal: Upward trends across all categories</div>
                      <div>• Target: All lines above 80% by week 12</div>
                    </div>
                  </div>

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

                  <div className="text-xs text-white/70 mb-4 px-4">
                    <div className="font-bold text-green-300 mb-1">Current vs Target vs 12-Week Average</div>
                    <div className="space-y-1">
                      <div>• <span className="text-gray-400">Gray bars:</span> Target goals for optimal recovery</div>
                      <div>• <span className="text-teal-400">Teal bars:</span> Your 12-week average performance</div>
                      <div>• <span className="text-green-400">Green bars:</span> Your current week performance</div>
                      <div>• <span className="text-red-400">Red line:</span> Target threshold (aim to exceed)</div>
                      <div>• Shows if you're meeting, exceeding, or falling short of goals</div>
                    </div>
                  </div>

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

                  <div className="text-xs text-white/70 mb-4 px-4">
                    <div className="font-bold text-indigo-300 mb-1">Last 7 Days: Daily Event Tracking</div>
                    <div className="space-y-1">
                      <div>• <span className="text-indigo-400">Purple line:</span> Scheduled events per day</div>
                      <div>• <span className="text-green-400">Green line:</span> Completed events per day</div>
                      <div>• <span className="text-red-400">Red line:</span> Missed events per day</div>
                      <div>• Monitors daily adherence to scheduled activities</div>
                      <div>• Optimal: Green line matches or exceeds purple, red stays at 0</div>
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={(() => {
                      // Calculate real daily activity from last 7 days
                      const dailyData = [];
                      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

                      for (let i = 6; i >= 0; i--) {
                        const date = subDays(new Date(), i);
                        const dayName = dayNames[date.getDay()];
                        const dateStr = date.toISOString().split('T')[0];

                        const dayEvents = (adminStats.allEvents || []).filter(e => {
                          const eventDate = new Date(e.startTime).toISOString().split('T')[0];
                          return eventDate === dateStr;
                        });

                        const scheduled = dayEvents.length;
                        const completed = dayEvents.filter(e => e.status === 'completed').length;
                        const missed = dayEvents.filter(e => e.status === 'missed').length;

                        dailyData.push({
                          day: dayName,
                          completed,
                          scheduled,
                          missed
                        });
                      }

                      return dailyData.length > 0 ? dailyData : [
                        { day: 'Mon', completed: 0, scheduled: 0, missed: 0 },
                        { day: 'Tue', completed: 0, scheduled: 0, missed: 0 },
                        { day: 'Wed', completed: 0, scheduled: 0, missed: 0 },
                        { day: 'Thu', completed: 0, scheduled: 0, missed: 0 },
                        { day: 'Fri', completed: 0, scheduled: 0, missed: 0 },
                        { day: 'Sat', completed: 0, scheduled: 0, missed: 0 },
                        { day: 'Sun', completed: 0, scheduled: 0, missed: 0 }
                      ];
                    })()}>
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
                  weightEntries={weightEntries}
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

                    <div className="text-xs text-white/70 mb-2 px-4">
                      <div className="font-bold text-green-300 mb-1">This Week's Overall Adherence</div>
                      <div className="space-y-1">
                        <div>• Percentage of all scheduled tasks completed</div>
                        <div>• Combines all categories (exercise, meals, meds, sleep)</div>
                        <div>• Color changes based on performance level</div>
                      </div>
                    </div>

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

                    <div className="text-xs text-white/70 mb-2 px-4">
                      <div className="font-bold text-blue-300 mb-1">Today's Tracked Activities</div>
                      <div className="space-y-1">
                        <div>• Three concentric rings show today's activity counts</div>
                        <div>• Outer ring (blue): Calendar events scheduled</div>
                        <div>• Middle ring (yellow): Meals logged</div>
                        <div>• Inner ring (red): Medications tracked</div>
                      </div>
                    </div>

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
                      <div className="text-3xl font-bold text-white">{weeklyMetrics.categoryMetrics.exercise.completionRate || 0}</div>
                    </div>
                    <h3 className="text-lg font-bold text-blue-300 mb-3">Exercise</h3>
                    <div className="text-xs text-blue-200 mb-3">
                      This week's completion rate • Target: 12 workouts/month (85%+)
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Completion Rate</span>
                        <span className="text-blue-300 font-bold">{weeklyMetrics.categoryMetrics.exercise.completionRate}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Sessions</span>
                        <span className="text-blue-300 font-bold">{weeklyMetrics.categoryMetrics.exercise.totalSessions}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Capacity</span>
                        <span className="text-blue-300 font-bold">+{weeklyMetrics.categoryMetrics.exercise.capacityIncrease}%</span>
                      </div>
                    </div>
                    <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-cyan-400"
                        style={{ width: `${weeklyMetrics.categoryMetrics.exercise.completionRate || 0}%` }}
                      />
                    </div>
                    <div className="text-xs text-white/50 mt-2">
                      0=No Show, 4=Completed, 6=Met Goals, 8=Exceeded
                    </div>
                  </div>

                  {/* Meals Summary */}
                  <div className="p-6 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/30 hover:border-green-400/50 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <UtensilsCrossed className="h-8 w-8 text-green-400" />
                      <div className="text-3xl font-bold text-white">{weeklyMetrics.categoryMetrics.meals.complianceRate || 0}</div>
                    </div>
                    <h3 className="text-lg font-bold text-green-300 mb-3">Meals</h3>
                    <div className="text-xs text-green-200 mb-3">
                      % within diet specs • Target: 90%+ compliance
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Compliance</span>
                        <span className="text-green-300 font-bold">{weeklyMetrics.categoryMetrics.meals.complianceRate}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Weight Goal</span>
                        <span className="text-green-300 font-bold">{weeklyMetrics.milestonesData.weightGoalsCount} achieved</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Weight Lost</span>
                        <span className="text-green-300 font-bold">
                          {weeklyMetrics.categoryMetrics.meals.totalWeightLost > 0
                            ? `${weeklyMetrics.categoryMetrics.meals.totalWeightLost.toFixed(1)} lbs`
                            : '0 lbs'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-emerald-400"
                        style={{ width: `${weeklyMetrics.categoryMetrics.meals.complianceRate || 0}%` }}
                      />
                    </div>
                    <div className="text-xs text-white/50 mt-2">
                      Low sodium, heart-healthy limits
                    </div>
                  </div>

                  {/* Medications Summary */}
                  <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30 hover:border-purple-400/50 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <Pill className="h-8 w-8 text-purple-400" />
                      <div className="text-3xl font-bold text-white">{weeklyMetrics.categoryMetrics.medications.adherenceRate || 0}</div>
                    </div>
                    <h3 className="text-lg font-bold text-purple-300 mb-3">Medications</h3>
                    <div className="text-xs text-purple-200 mb-3">
                      % of prescribed doses taken • Target: 95%+ adherence
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Adherence</span>
                        <span className="text-purple-300 font-bold">{weeklyMetrics.categoryMetrics.medications.adherenceRate}%</span>
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
                        style={{ width: `${weeklyMetrics.categoryMetrics.medications.adherenceRate || 0}%` }}
                      />
                    </div>
                    <div className="text-xs text-white/50 mt-2">
                      On-time compliance rate
                    </div>
                  </div>

                  {/* Sleep Summary */}
                  <div className="p-6 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-400/30 hover:border-indigo-400/50 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <Clock className="h-8 w-8 text-indigo-400" />
                      <div className="text-3xl font-bold text-white">{weeklyMetrics.categoryMetrics.sleep.qualityScore || 0}</div>
                    </div>
                    <h3 className="text-lg font-bold text-indigo-300 mb-3">Sleep</h3>
                    <div className="text-xs text-indigo-200 mb-3">
                      Overall sleep quality score • Target: 7-9 hrs nightly (80%+)
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Quality Score</span>
                        <span className="text-indigo-300 font-bold">{weeklyMetrics.categoryMetrics.sleep.qualityScore}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Avg Hours</span>
                        <span className="text-indigo-300 font-bold">
                          {weeklyMetrics.categoryMetrics.sleep.avgHours > 0
                            ? `${weeklyMetrics.categoryMetrics.sleep.avgHours.toFixed(1)} hrs`
                            : '0 hrs'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Consistency</span>
                        <span className="text-indigo-300 font-bold">{weeklyMetrics.categoryMetrics.sleep.consistencyRate}%</span>
                      </div>
                    </div>
                    <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-400 to-violet-400"
                        style={{ width: `${weeklyMetrics.categoryMetrics.sleep.qualityScore || 0}%` }}
                      />
                    </div>
                    <div className="text-xs text-white/50 mt-2">
                      Consistency & duration tracked
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
            height: patientProfile?.height || 70,
            heightUnit: (patientProfile?.heightUnit || 'in') as 'in' | 'cm',
            startingWeight: patientProfile?.startingWeight || 180,
            currentWeight: stats.latestVitals?.weight || patientProfile?.currentWeight || 175,
            targetWeight: patientProfile?.targetWeight || 165,
            weightUnit: (patientProfile?.weightUnit || 'lbs') as 'kg' | 'lbs',
            surgeryDate: patientProfile?.surgeryDate || '',
            createdAt: '',
            updatedAt: ''
          }}
          weightEntries={weightEntries}
          showTargetStar={true}
        />
      </GlassCard>

      {/* Energy Balance Tracking */}
      <GlassCard>
        <h2 className="text-xl font-semibold text-white font-bold mb-4 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-blue-400" />
          Energy Balance - Last 30 Days
        </h2>
        <p className="text-sm text-gray-300 mb-4">
          Track your daily caloric intake vs. expenditure to manage weight trajectory
        </p>
        {calorieLoading ? (
          <div className="flex items-center justify-center h-[350px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading energy balance data...</p>
            </div>
          </div>
        ) : calorieData.length === 0 ? (
          <div className="flex items-center justify-center h-[350px]">
            <div className="text-center text-gray-400">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No calorie data available yet</p>
              <p className="text-sm mt-2">Start logging meals and exercises to see your energy balance</p>
            </div>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={calorieData}>
              <defs>
                <linearGradient id="consumedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="burnedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                tick={{ fill: '#d1d5db', fontSize: 11, fontWeight: 600 }}
                tickLine={{ stroke: '#6b7280' }}
              />
              <YAxis
                stroke="#9ca3af"
                tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }}
                tickLine={{ stroke: '#6b7280' }}
                label={{ value: 'Calories', angle: -90, position: 'insideLeft', style: { fill: '#d1d5db', fontSize: 12, fontWeight: 600 } }}
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
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ paddingTop: '10px' }}
              />
              <Area
                type="monotone"
                dataKey="consumed"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#consumedGrad)"
                name="Calories Consumed"
              />
              <Area
                type="monotone"
                dataKey="burned"
                stroke="#f97316"
                strokeWidth={2}
                fill="url(#burnedGrad)"
                name="Calories Burned"
              />
              <Line
                type="monotone"
                dataKey="net"
                stroke="#10b981"
                strokeWidth={3}
                strokeDasharray="5 5"
                name="Net Calories"
                dot={{ fill: '#10b981', r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <div className="text-xs text-blue-300 mb-1">Avg Consumed</div>
            <div className="text-2xl font-bold text-blue-400">
              {calorieData.length > 0
                ? Math.round(calorieData.reduce((sum, d) => sum + d.consumed, 0) / calorieData.length).toLocaleString()
                : '0'}
            </div>
            <div className="text-xs text-gray-400">cal/day</div>
          </div>
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
            <div className="text-xs text-orange-300 mb-1">Avg Burned</div>
            <div className="text-2xl font-bold text-orange-400">
              {calorieData.length > 0
                ? Math.round(calorieData.reduce((sum, d) => sum + d.burned, 0) / calorieData.length).toLocaleString()
                : '0'}
            </div>
            <div className="text-xs text-gray-400">cal/day</div>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="text-xs text-green-300 mb-1">Avg Net</div>
            <div className="text-2xl font-bold text-green-400">
              {calorieData.length > 0
                ? (() => {
                    const avgNet = Math.round(calorieData.reduce((sum, d) => sum + d.net, 0) / calorieData.length);
                    return (avgNet >= 0 ? '+' : '') + avgNet.toLocaleString();
                  })()
                : '0'}
            </div>
            <div className="text-xs text-gray-400">cal/day</div>
          </div>
        </div>
          </>
        )}
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
