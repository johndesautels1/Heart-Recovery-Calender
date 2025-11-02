import React, { useState, useEffect } from 'react';
import { GlassCard, Button, Modal, Input } from '../components/ui';
import {
  Moon,
  Plus,
  TrendingUp,
  Calendar,
  Clock,
  Edit2,
  Trash2,
  BarChart3,
  Trophy,
  Award,
  User,
  AlertCircle,
  Flame,
  Target,
  Zap,
  Activity,
  Sun
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, ReferenceLine } from 'recharts';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import { SleepLog, CreateSleepLogInput, SleepStats } from '../types';
import toast from 'react-hot-toast';
import { format, subDays, parseISO, getDaysInMonth, startOfMonth, endOfMonth, eachDayOfInterval, differenceInDays } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { usePatientSelection } from '../contexts/PatientSelectionContext';

const sleepSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  hoursSlept: z.number().min(0).max(24, 'Hours must be between 0 and 24'),
  sleepQuality: z.enum(['poor', 'fair', 'good', 'excellent']).optional(),
  bedTime: z.string().optional(),
  wakeTime: z.string().optional(),
  notes: z.string().optional(),
});

type SleepFormData = z.infer<typeof sleepSchema>;

export function SleepPage() {
  const { user } = useAuth();
  const { selectedPatient, isViewingAsTherapist } = usePatientSelection();
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [stats, setStats] = useState<SleepStats | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingLog, setEditingLog] = useState<SleepLog | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SleepFormData>({
    resolver: zodResolver(sleepSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  useEffect(() => {
    loadSleepLogs();
    loadStats();
  }, [dateRange, selectedPatient]); // Reload when selected patient changes

  const loadSleepLogs = async () => {
    try {
      setIsLoading(true);
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');
      const userId = isViewingAsTherapist && selectedPatient?.userId ? selectedPatient.userId : user?.id;

      const data = await api.getSleepLogs({
        startDate,
        endDate,
        userId
      });

      setSleepLogs(data);
    } catch (error) {
      console.error('Failed to load sleep logs:', error);
      toast.error('Failed to load sleep logs');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');
      const userId = isViewingAsTherapist && selectedPatient?.userId ? selectedPatient.userId : user?.id;

      const data = await api.getSleepStats(startDate, endDate, userId);
      setStats(data);
    } catch (error) {
      console.error('Failed to load sleep stats:', error);
    }
  };

  const onSubmit = async (data: SleepFormData) => {
    try {
      setIsLoading(true);

      // Clean the data: remove empty bedTime/wakeTime to prevent "Invalid date" errors
      const cleanedData = {
        ...data,
        bedTime: data.bedTime?.trim() || undefined,
        wakeTime: data.wakeTime?.trim() || undefined,
      };

      if (editingLog) {
        const updated = await api.updateSleepLog(editingLog.id, cleanedData);
        setSleepLogs(sleepLogs.map(log => log.id === editingLog.id ? updated : log));
        toast.success('Sleep log updated successfully');
      } else {
        const newLogData = {
          ...cleanedData,
          // Always include userId: therapist uses selectedPatient, patient uses own user
          userId: isViewingAsTherapist && selectedPatient?.userId ? selectedPatient.userId : user?.id
        } as CreateSleepLogInput & { userId?: number };

        const newLog = await api.createSleepLog(newLogData);
        setSleepLogs([newLog, ...sleepLogs]);
        toast.success('Sleep log added successfully');
      }

      setIsModalOpen(false);
      setEditingLog(null);
      reset({ date: format(new Date(), 'yyyy-MM-dd') });
      loadStats();
    } catch (error: any) {
      console.error('Failed to save sleep log:', error);
      if (error.response?.status === 409) {
        toast.error('A sleep log already exists for this date');
      } else {
        toast.error('Failed to save sleep log');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (log: SleepLog) => {
    setEditingLog(log);
    setValue('date', log.date);
    setValue('hoursSlept', parseFloat(log.hoursSlept.toString()));
    setValue('sleepQuality', log.sleepQuality);

    // Format datetime-local inputs: they require "yyyy-MM-ddTHH:mm" format
    // Convert ISO timestamps from database to the correct format
    if (log.bedTime) {
      try {
        const bedTimeDate = new Date(log.bedTime);
        if (!isNaN(bedTimeDate.getTime())) {
          setValue('bedTime', format(bedTimeDate, "yyyy-MM-dd'T'HH:mm"));
        } else {
          setValue('bedTime', '');
        }
      } catch {
        setValue('bedTime', '');
      }
    } else {
      setValue('bedTime', '');
    }

    if (log.wakeTime) {
      try {
        const wakeTimeDate = new Date(log.wakeTime);
        if (!isNaN(wakeTimeDate.getTime())) {
          setValue('wakeTime', format(wakeTimeDate, "yyyy-MM-dd'T'HH:mm"));
        } else {
          setValue('wakeTime', '');
        }
      } catch {
        setValue('wakeTime', '');
      }
    } else {
      setValue('wakeTime', '');
    }

    setValue('notes', log.notes || '');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this sleep log?')) return;

    try {
      await api.deleteSleepLog(id);
      setSleepLogs(sleepLogs.filter(log => log.id !== id));
      toast.success('Sleep log deleted successfully');
      loadStats();
    } catch (error) {
      console.error('Failed to delete sleep log:', error);
      toast.error('Failed to delete sleep log');
    }
  };

  const handleOpenModal = () => {
    setEditingLog(null);
    reset({ date: format(new Date(), 'yyyy-MM-dd') });
    setIsModalOpen(true);
  };

  const getSleepQualityColor = (quality?: string) => {
    switch (quality) {
      case 'excellent':
        return 'bg-green-100 text-green-800';
      case 'good':
        return 'bg-blue-100 text-blue-800';
      case 'fair':
        return 'bg-yellow-100 text-yellow-800';
      case 'poor':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to get color based on sleep hours
  const getSleepHoursColor = (hours: number) => {
    if (hours >= 0 && hours < 3) return '#ef4444'; // Red
    if (hours >= 3 && hours < 6) return '#f59e0b'; // Orange
    if (hours >= 6 && hours < 9) return '#3b82f6'; // Blue
    if (hours >= 9 && hours <= 12) return '#10b981'; // Green
    return '#6b7280'; // Gray for > 12 hours
  };

  // Helper function to get category name based on sleep hours
  const getSleepHoursCategory = (hours: number) => {
    if (hours >= 0 && hours < 3) return 'Critical (0-3h)';
    if (hours >= 3 && hours < 6) return 'Poor (3-6h)';
    if (hours >= 6 && hours < 9) return 'Good (6-9h)';
    if (hours >= 9 && hours <= 12) return 'Excellent (9-12h)';
    return 'Excessive (>12h)';
  };

  // Helper function to calculate points for a single sleep log
  const getSleepPoints = (hours: number) => {
    if (hours >= 0 && hours < 3) return 0; // Red - 0 points
    if (hours >= 3 && hours < 6) return 1; // Orange - 1 point
    if (hours >= 6 && hours < 9) return 2; // Blue - 2 points
    if (hours >= 9 && hours <= 12) return 3; // Green - 3 points
    return 2; // Excessive > 12 hours - treat as blue (2 points)
  };

  // Calculate monthly sleep score
  const calculateMonthlySleepScore = () => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const daysInCurrentMonth = getDaysInMonth(now);

    // Filter logs for current month
    const monthLogs = sleepLogs.filter(log => {
      const logDate = parseISO(log.date);
      return logDate >= monthStart && logDate <= monthEnd;
    });

    // Calculate base score
    let baseScore = 0;
    monthLogs.forEach(log => {
      const hours = parseFloat(log.hoursSlept.toString());
      baseScore += getSleepPoints(hours);
    });

    // Check for perfect attendance (all days logged)
    const allDaysLogged = monthLogs.length === daysInCurrentMonth;
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
      daysLogged: monthLogs.length,
      daysInMonth: daysInCurrentMonth,
      isPerfect: allDaysLogged,
    };
  };

  // Helper function to get score color based on total score
  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;

    if (percentage >= 90) return { bg: 'bg-gradient-to-br from-green-500 to-emerald-600', text: 'text-white', border: 'border-green-400' };
    if (percentage >= 75) return { bg: 'bg-gradient-to-br from-blue-500 to-cyan-600', text: 'text-white', border: 'border-blue-400' };
    if (percentage >= 50) return { bg: 'bg-gradient-to-br from-yellow-500 to-orange-500', text: 'text-white', border: 'border-yellow-400' };
    if (percentage >= 25) return { bg: 'bg-gradient-to-br from-orange-500 to-red-500', text: 'text-white', border: 'border-orange-400' };
    return { bg: 'bg-gradient-to-br from-red-600 to-red-800', text: 'text-white', border: 'border-red-500' };
  };

  const sleepScore = calculateMonthlySleepScore();
  const scoreColor = getScoreColor(sleepScore.totalScore, sleepScore.maxPossibleScore);

  const chartData = sleepLogs
    .slice()
    .reverse()
    .map(log => {
      const hours = parseFloat(log.hoursSlept.toString());
      return {
        date: format(parseISO(log.date), 'MMM d'),
        hours,
        fill: getSleepHoursColor(hours),
      };
    });

  // Calculate hours category distribution for pie chart
  const hoursCategories = sleepLogs.reduce((acc, log) => {
    const hours = parseFloat(log.hoursSlept.toString());
    const category = getSleepHoursCategory(hours);
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const hoursCategoryData = Object.entries(hoursCategories).map(([category, count]) => {
    let color = '#6b7280';
    if (category.includes('0-3h')) color = '#ef4444';
    else if (category.includes('3-6h')) color = '#f59e0b';
    else if (category.includes('6-9h')) color = '#3b82f6';
    else if (category.includes('9-12h')) color = '#10b981';

    return {
      name: category,
      value: count,
      color,
    };
  });

  // ==================== NEW SLEEP VISUALIZATION DATA ====================

  // 1. Radial Sleep Quality Clock Data
  const qualityDistribution = {
    poor: sleepLogs.filter(log => log.sleepQuality === 'poor').length,
    fair: sleepLogs.filter(log => log.sleepQuality === 'fair').length,
    good: sleepLogs.filter(log => log.sleepQuality === 'good').length,
    excellent: sleepLogs.filter(log => log.sleepQuality === 'excellent').length,
  };
  const totalQualityLogs = qualityDistribution.poor + qualityDistribution.fair + qualityDistribution.good + qualityDistribution.excellent;

  // 2. Sleep Heatmap Calendar Data - Current month
  const heatmapSleepData = (() => {
    const now = new Date();
    const daysInMonth = getDaysInMonth(now);
    const monthStart = startOfMonth(now);
    const data = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(monthStart);
      date.setDate(day);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayLog = sleepLogs.find(log => log.date === dateStr);
      const hours = dayLog ? parseFloat(dayLog.hoursSlept.toString()) : null;

      data.push({
        day,
        date: format(date, 'MMM d'),
        hours,
        quality: dayLog?.sleepQuality || null,
        dayOfWeek: format(date, 'EEE'),
      });
    }
    return data;
  })();

  // 3. Sleep Debt Wave Data
  const sleepDebtData = (() => {
    const TARGET_HOURS = 8;
    let cumulativeDebt = 0;

    return sleepLogs
      .slice()
      .reverse()
      .map((log, index) => {
        const hours = parseFloat(log.hoursSlept.toString());
        cumulativeDebt += (TARGET_HOURS - hours);

        return {
          date: format(parseISO(log.date), 'MMM d'),
          debt: cumulativeDebt,
          actualHours: hours,
        };
      });
  })();

  // 4. Sleep Target Achievement Percentage
  const nightsInTarget = sleepLogs.filter(log => {
    const hours = parseFloat(log.hoursSlept.toString());
    return hours >= 7 && hours <= 9;
  }).length;

  const targetAchievementPercentage = sleepLogs.length > 0
    ? (nightsInTarget / sleepLogs.length) * 100
    : 0;

  // 5. Bed/Wake Time Scatter Data
  const bedWakeScatterData = sleepLogs
    .filter(log => log.bedTime && log.wakeTime)
    .map(log => {
      const bedHour = parseInt(log.bedTime!.split(':')[0]) + parseInt(log.bedTime!.split(':')[1]) / 60;
      const wakeHour = parseInt(log.wakeTime!.split(':')[0]) + parseInt(log.wakeTime!.split(':')[1]) / 60;
      const hours = parseFloat(log.hoursSlept.toString());

      return {
        bedHour: bedHour >= 18 ? bedHour : bedHour + 24, // Normalize PM times
        wakeHour: wakeHour,
        hours,
        quality: log.sleepQuality || 'unknown',
        date: format(parseISO(log.date), 'MMM d'),
      };
    });

  // 6. Sleep Streak Data (already calculated in JSX, extract here)
  const calculateStreak = () => {
    const sortedLogs = [...sleepLogs].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedLogs.length; i++) {
      const logDate = new Date(sortedLogs[i].date);
      logDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);

      if (logDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };
  const currentStreak = calculateStreak();

  // 7. Sleep Phases Timeline Data - Last 7 nights
  const phasesTimelineData = sleepLogs
    .slice(0, 7)
    .reverse()
    .filter(log => log.bedTime && log.wakeTime)
    .map(log => {
      const bedHour = parseInt(log.bedTime!.split(':')[0]) + parseInt(log.bedTime!.split(':')[1]) / 60;
      const wakeHour = parseInt(log.wakeTime!.split(':')[0]) + parseInt(log.wakeTime!.split(':')[1]) / 60;
      const normalizedBedTime = bedHour >= 18 ? bedHour : bedHour + 24;
      const normalizedWakeTime = wakeHour <= 12 ? wakeHour + 24 : wakeHour;

      return {
        date: format(parseISO(log.date), 'MMM d'),
        bedTime: normalizedBedTime,
        wakeTime: normalizedWakeTime,
        duration: parseFloat(log.hoursSlept.toString()),
        quality: log.sleepQuality || 'unknown',
      };
    });

  // 8. 3D Pyramid Data (quality distribution for isometric view)
  const pyramidData = [
    { level: 'Excellent', count: qualityDistribution.excellent, color: '#10b981', layer: 4 },
    { level: 'Good', count: qualityDistribution.good, color: '#3b82f6', layer: 3 },
    { level: 'Fair', count: qualityDistribution.fair, color: '#f59e0b', layer: 2 },
    { level: 'Poor', count: qualityDistribution.poor, color: '#ef4444', layer: 1 },
  ].filter(item => item.count > 0);

  return (
    <div className="space-y-6">
      {/* Patient Selection Banner */}
      {isViewingAsTherapist && selectedPatient && (
        <div className="glass rounded-xl p-4 border-2" style={{ borderColor: 'var(--accent)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <User className="h-6 w-6" style={{ color: 'var(--accent)' }} />
              <div>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Viewing sleep data for:</p>
                <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{selectedPatient.name}</p>
              </div>
            </div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>
              Therapist View
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <h1 className="text-3xl font-bold text-white">Sleep Journal</h1>

        {/* Sleep Score Card */}
        <div className={`${scoreColor.bg} ${scoreColor.text} rounded-xl p-4 shadow-lg border-2 ${scoreColor.border} transform hover:scale-105 transition-transform duration-300`}>
          <div className="flex items-center justify-center gap-3">
            <Trophy className="h-8 w-8" />
            <div className="text-center">
              <div className="text-sm font-semibold opacity-90">Sleep Score</div>
              <div className="text-3xl font-bold">
                {sleepScore.totalScore}
                <span className="text-lg opacity-75">/{sleepScore.maxPossibleScore}</span>
              </div>
              <div className="text-xs opacity-80 mt-1">
                {sleepScore.daysLogged}/{sleepScore.daysInMonth} days
                {sleepScore.isPerfect && (
                  <span className="ml-2">
                    <Award className="inline h-4 w-4 animate-pulse" />
                  </span>
                )}
              </div>
              {sleepScore.isPerfect && (
                <div className="text-xs font-semibold mt-1 animate-pulse">
                  Perfect Month! +{sleepScore.bonusPoints} Bonus
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleOpenModal}>
            <Plus className="h-5 w-5 mr-2" />
            Log Sleep
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="flex gap-2">
        <Button
          variant={dateRange === '7d' ? 'primary' : 'secondary'}
          onClick={() => setDateRange('7d')}
        >
          7 Days
        </Button>
        <Button
          variant={dateRange === '30d' ? 'primary' : 'secondary'}
          onClick={() => setDateRange('30d')}
        >
          30 Days
        </Button>
        <Button
          variant={dateRange === '90d' ? 'primary' : 'secondary'}
          onClick={() => setDateRange('90d')}
        >
          90 Days
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && stats.totalLogs > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-bold mb-1">Average Sleep</p>
                  <p className="text-2xl font-bold text-white">
                    {stats.averageHours.toFixed(1)} hrs
                  </p>
                </div>
                <Moon className="h-8 w-8 text-blue-400" />
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-bold mb-1">Total Logs</p>
                  <p className="text-2xl font-bold text-white">{stats.totalLogs}</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-400" />
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-bold mb-1">Trend</p>
                  <p className="text-2xl font-bold text-white capitalize">
                    {stats.trend.replace('_', ' ')}
                  </p>
                </div>
                <TrendingUp className={`h-8 w-8 ${
                  stats.trend === 'improving' ? 'text-green-400' :
                  stats.trend === 'declining' ? 'text-red-400' : 'text-gray-400'
                }`} />
              </div>
            </GlassCard>

            {/* NEW: Days Since Last Log */}
            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-bold mb-1">Last Log</p>
                  <p className={`text-2xl font-bold ${(() => {
                    if (sleepLogs.length === 0) return 'text-white';
                    const lastLog = sleepLogs[0];
                    const daysSince = differenceInDays(new Date(), parseISO(lastLog.date));
                    return daysSince === 0 ? 'text-green-400' : daysSince === 1 ? 'text-yellow-400' : 'text-red-400';
                  })()}`}>
                    {(() => {
                      if (sleepLogs.length === 0) return 'Never';
                      const lastLog = sleepLogs[0];
                      const daysSince = differenceInDays(new Date(), parseISO(lastLog.date));
                      if (daysSince === 0) return 'Today';
                      if (daysSince === 1) return '1 day ago';
                      return `${daysSince} days ago`;
                    })()}
                  </p>
                  <p className="text-xs text-white opacity-70 mt-1">since last entry</p>
                </div>
                <Clock className="h-8 w-8 text-indigo-400" />
              </div>
            </GlassCard>
          </div>

          {/* NEW: Sleep Debt, Efficiency & Average Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-bold mb-1">Sleep Debt</p>
                  <p className={`text-2xl font-bold ${(() => {
                    const TARGET_HOURS = 8;
                    const debt = (TARGET_HOURS * stats.totalLogs) - sleepLogs.reduce((sum, log) => sum + parseFloat(log.hoursSlept.toString()), 0);
                    return debt > 10 ? 'text-red-400' : debt > 5 ? 'text-yellow-400' : 'text-green-400';
                  })()}`}>
                    {(() => {
                      const TARGET_HOURS = 8;
                      const debt = (TARGET_HOURS * stats.totalLogs) - sleepLogs.reduce((sum, log) => sum + parseFloat(log.hoursSlept.toString()), 0);
                      return Math.abs(debt).toFixed(1);
                    })()} hrs {(() => {
                      const TARGET_HOURS = 8;
                      const debt = (TARGET_HOURS * stats.totalLogs) - sleepLogs.reduce((sum, log) => sum + parseFloat(log.hoursSlept.toString()), 0);
                      return debt > 0 ? 'deficit' : 'surplus';
                    })()}
                  </p>
                  <p className="text-xs text-white opacity-70 mt-1">vs 8h/night target</p>
                </div>
                <Clock className="h-8 w-8 text-orange-400" />
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-bold mb-1">Sleep Efficiency</p>
                  <p className="text-2xl font-bold text-white">
                    {(() => {
                      // Calculate efficiency for logs with both bed/wake times
                      const logsWithTimes = sleepLogs.filter(log => log.bedTime && log.wakeTime);
                      if (logsWithTimes.length === 0) return 'N/A';

                      const avgEfficiency = logsWithTimes.reduce((sum, log) => {
                        const bedTime = new Date(`2000-01-01T${log.bedTime}`);
                        let wakeTime = new Date(`2000-01-01T${log.wakeTime}`);

                        // Handle wake time next day
                        if (wakeTime < bedTime) {
                          wakeTime = new Date(`2000-01-02T${log.wakeTime}`);
                        }

                        const timeInBed = (wakeTime.getTime() - bedTime.getTime()) / (1000 * 60 * 60); // hours
                        const hoursSlept = parseFloat(log.hoursSlept.toString());
                        const efficiency = (hoursSlept / timeInBed) * 100;

                        return sum + efficiency;
                      }, 0) / logsWithTimes.length;

                      return `${avgEfficiency.toFixed(0)}%`;
                    })()}
                  </p>
                  <p className="text-xs text-white opacity-70 mt-1">time asleep / time in bed</p>
                </div>
                <Trophy className="h-8 w-8 text-purple-400" />
              </div>
            </GlassCard>

            {/* NEW: 7-Day Average */}
            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-bold mb-1">7-Day Average</p>
                  <p className={`text-2xl font-bold ${(() => {
                    if (sleepLogs.length === 0) return 'text-white';
                    const recentLogs = sleepLogs.slice(0, Math.min(7, sleepLogs.length));
                    const avg = recentLogs.reduce((sum, log) => sum + parseFloat(log.hoursSlept.toString()), 0) / recentLogs.length;
                    return avg >= 7 ? 'text-green-400' : avg >= 6 ? 'text-yellow-400' : 'text-red-400';
                  })()}`}>
                    {(() => {
                      if (sleepLogs.length === 0) return '--';
                      const recentLogs = sleepLogs.slice(0, Math.min(7, sleepLogs.length));
                      const avg = recentLogs.reduce((sum, log) => sum + parseFloat(log.hoursSlept.toString()), 0) / recentLogs.length;
                      return `${avg.toFixed(1)} hrs`;
                    })()}
                  </p>
                  <p className="text-xs text-white opacity-70 mt-1">last {Math.min(7, sleepLogs.length)} nights</p>
                </div>
                <Moon className="h-8 w-8 text-blue-400" />
              </div>
            </GlassCard>
          </div>

          {/* NEW: Sleep Quality Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlassCard>
              <div className="text-center">
                <p className="text-xs text-white opacity-70 mb-1">Poor Sleep</p>
                <p className="text-3xl font-bold text-red-400">
                  {sleepLogs.filter(log => log.sleepQuality === 'poor').length}
                </p>
                <p className="text-xs text-white opacity-50 mt-1">nights</p>
              </div>
            </GlassCard>
            <GlassCard>
              <div className="text-center">
                <p className="text-xs text-white opacity-70 mb-1">Fair Sleep</p>
                <p className="text-3xl font-bold text-yellow-400">
                  {sleepLogs.filter(log => log.sleepQuality === 'fair').length}
                </p>
                <p className="text-xs text-white opacity-50 mt-1">nights</p>
              </div>
            </GlassCard>
            <GlassCard>
              <div className="text-center">
                <p className="text-xs text-white opacity-70 mb-1">Good Sleep</p>
                <p className="text-3xl font-bold text-blue-400">
                  {sleepLogs.filter(log => log.sleepQuality === 'good').length}
                </p>
                <p className="text-xs text-white opacity-50 mt-1">nights</p>
              </div>
            </GlassCard>
            <GlassCard>
              <div className="text-center">
                <p className="text-xs text-white opacity-70 mb-1">Excellent Sleep</p>
                <p className="text-3xl font-bold text-green-400">
                  {sleepLogs.filter(log => log.sleepQuality === 'excellent').length}
                </p>
                <p className="text-xs text-white opacity-50 mt-1">nights</p>
              </div>
            </GlassCard>
          </div>

          {/* NEW: Poor Sleep Nights Tracker */}
          {sleepLogs.length > 0 && (
            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-bold mb-1">Poor Sleep Nights (Last 30)</p>
                  <p className={`text-3xl font-bold ${(() => {
                    const recentLogs = sleepLogs.slice(0, Math.min(30, sleepLogs.length));
                    const recentPoor = recentLogs.filter(log => log.sleepQuality === 'poor').length;
                    return recentPoor === 0 ? 'text-green-400' : recentPoor <= 3 ? 'text-yellow-400' : 'text-red-400';
                  })()}`}>
                    {(() => {
                      const recentLogs = sleepLogs.slice(0, Math.min(30, sleepLogs.length));
                      return recentLogs.filter(log => log.sleepQuality === 'poor').length;
                    })()}
                  </p>
                  <p className="text-xs text-white opacity-70 mt-1">
                    {(() => {
                      const recentLogs = sleepLogs.slice(0, Math.min(30, sleepLogs.length));
                      const poorNights = recentLogs.filter(log => log.sleepQuality === 'poor').length;
                      const percentage = recentLogs.length > 0 ? (poorNights / recentLogs.length * 100).toFixed(0) : 0;
                      return `${percentage}% of nights`;
                    })()}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
            </GlassCard>
          )}

          {/* NEW: Sleep Logging Streak */}
          {sleepLogs.length > 0 && (
            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-bold mb-1">Logging Streak</p>
                  <p className={`text-3xl font-bold ${(() => {
                    const sortedLogs = [...sleepLogs].sort((a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime()
                    );

                    let streak = 0;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    for (let i = 0; i < sortedLogs.length; i++) {
                      const logDate = new Date(sortedLogs[i].date);
                      logDate.setHours(0, 0, 0, 0);

                      const expectedDate = new Date(today);
                      expectedDate.setDate(today.getDate() - i);
                      expectedDate.setHours(0, 0, 0, 0);

                      if (logDate.getTime() === expectedDate.getTime()) {
                        streak++;
                      } else {
                        break;
                      }
                    }

                    return streak >= 7 ? 'text-green-400' : streak >= 3 ? 'text-yellow-400' : 'text-red-400';
                  })()}`}>
                    {(() => {
                      const sortedLogs = [...sleepLogs].sort((a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                      );

                      let streak = 0;
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);

                      for (let i = 0; i < sortedLogs.length; i++) {
                        const logDate = new Date(sortedLogs[i].date);
                        logDate.setHours(0, 0, 0, 0);

                        const expectedDate = new Date(today);
                        expectedDate.setDate(today.getDate() - i);
                        expectedDate.setHours(0, 0, 0, 0);

                        if (logDate.getTime() === expectedDate.getTime()) {
                          streak++;
                        } else {
                          break;
                        }
                      }

                      return streak;
                    })()}
                  </p>
                  <p className="text-xs text-white opacity-70 mt-1">
                    {(() => {
                      const sortedLogs = [...sleepLogs].sort((a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                      );

                      let streak = 0;
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);

                      for (let i = 0; i < sortedLogs.length; i++) {
                        const logDate = new Date(sortedLogs[i].date);
                        logDate.setHours(0, 0, 0, 0);

                        const expectedDate = new Date(today);
                        expectedDate.setDate(today.getDate() - i);
                        expectedDate.setHours(0, 0, 0, 0);

                        if (logDate.getTime() === expectedDate.getTime()) {
                          streak++;
                        } else {
                          break;
                        }
                      }

                      if (streak === 0) return 'No current streak';
                      if (streak === 1) return 'consecutive day';
                      return 'consecutive days';
                    })()}
                  </p>
                </div>
                <Flame className={`h-8 w-8 ${(() => {
                  const sortedLogs = [...sleepLogs].sort((a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                  );

                  let streak = 0;
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  for (let i = 0; i < sortedLogs.length; i++) {
                    const logDate = new Date(sortedLogs[i].date);
                    logDate.setHours(0, 0, 0, 0);

                    const expectedDate = new Date(today);
                    expectedDate.setDate(today.getDate() - i);
                    expectedDate.setHours(0, 0, 0, 0);

                    if (logDate.getTime() === expectedDate.getTime()) {
                      streak++;
                    } else {
                      break;
                    }
                  }

                  return streak >= 7 ? 'text-orange-500' : streak >= 3 ? 'text-yellow-400' : 'text-gray-400';
                })()}`} />
              </div>
            </GlassCard>
          )}

          {/* NEW: Sleep Consistency Score */}
          {sleepLogs.length >= 3 && (
            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-bold mb-1">Sleep Consistency</p>
                  <p className={`text-3xl font-bold ${(() => {
                    const recentLogs = sleepLogs.slice(0, Math.min(7, sleepLogs.length));
                    const hours = recentLogs.map(log => parseFloat(log.hoursSlept.toString()));
                    const avg = hours.reduce((sum, h) => sum + h, 0) / hours.length;
                    const variance = hours.reduce((sum, h) => sum + Math.pow(h - avg, 2), 0) / hours.length;
                    const stdDev = Math.sqrt(variance);
                    return stdDev <= 1 ? 'text-green-400' : stdDev <= 2 ? 'text-yellow-400' : 'text-red-400';
                  })()}`}>
                    {(() => {
                      const recentLogs = sleepLogs.slice(0, Math.min(7, sleepLogs.length));
                      const hours = recentLogs.map(log => parseFloat(log.hoursSlept.toString()));
                      const avg = hours.reduce((sum, h) => sum + h, 0) / hours.length;
                      const variance = hours.reduce((sum, h) => sum + Math.pow(h - avg, 2), 0) / hours.length;
                      const stdDev = Math.sqrt(variance);
                      if (stdDev <= 1) return 'Excellent';
                      if (stdDev <= 2) return 'Good';
                      return 'Irregular';
                    })()}
                  </p>
                  <p className="text-xs text-white opacity-70 mt-1">
                    {(() => {
                      const recentLogs = sleepLogs.slice(0, Math.min(7, sleepLogs.length));
                      const hours = recentLogs.map(log => parseFloat(log.hoursSlept.toString()));
                      const avg = hours.reduce((sum, h) => sum + h, 0) / hours.length;
                      const variance = hours.reduce((sum, h) => sum + Math.pow(h - avg, 2), 0) / hours.length;
                      const stdDev = Math.sqrt(variance);
                      return `±${stdDev.toFixed(1)}h variation`;
                    })()}
                  </p>
                </div>
                <Award className="h-8 w-8 text-yellow-400" />
              </div>
            </GlassCard>
          )}

          {/* NEW: Best/Worst Sleep This Week */}
          {sleepLogs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GlassCard>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-white font-bold mb-1">Best Sleep This Week</p>
                    {(() => {
                      const recentLogs = sleepLogs.slice(0, Math.min(7, sleepLogs.length));
                      if (recentLogs.length === 0) return <p className="text-xl text-white">--</p>;
                      const best = recentLogs.reduce((max, log) =>
                        parseFloat(log.hoursSlept.toString()) > parseFloat(max.hoursSlept.toString()) ? log : max
                      );
                      return (
                        <>
                          <p className="text-2xl font-bold text-green-400">
                            {parseFloat(best.hoursSlept.toString()).toFixed(1)} hrs
                          </p>
                          <p className="text-xs text-white opacity-70 mt-1">
                            {format(parseISO(best.date), 'MMM d')}
                            {best.sleepQuality && ` • ${best.sleepQuality}`}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                  <Trophy className="h-8 w-8 text-green-400" />
                </div>
              </GlassCard>

              <GlassCard>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-white font-bold mb-1">Worst Sleep This Week</p>
                    {(() => {
                      const recentLogs = sleepLogs.slice(0, Math.min(7, sleepLogs.length));
                      if (recentLogs.length === 0) return <p className="text-xl text-white">--</p>;
                      const worst = recentLogs.reduce((min, log) =>
                        parseFloat(log.hoursSlept.toString()) < parseFloat(min.hoursSlept.toString()) ? log : min
                      );
                      return (
                        <>
                          <p className="text-2xl font-bold text-red-400">
                            {parseFloat(worst.hoursSlept.toString()).toFixed(1)} hrs
                          </p>
                          <p className="text-xs text-white opacity-70 mt-1">
                            {format(parseISO(worst.date), 'MMM d')}
                            {worst.sleepQuality && ` • ${worst.sleepQuality}`}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-400" />
                </div>
              </GlassCard>
            </div>
          )}
        </>
      )}

      {/* Charts */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard>
            <h3 className="text-lg font-semibold text-white mb-4">Sleep Hours Trend</h3>
            <div className="mb-2 flex flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }}></div>
                <span className="text-white">Critical (0-3h)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
                <span className="text-white">Poor (3-6h)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
                <span className="text-white">Good (6-9h)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10b981' }}></div>
                <span className="text-white">Excellent (9-12h)</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <defs>
                  {/* 3D Bar gradients */}
                  <linearGradient id="sleepBarGradientRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f87171" stopOpacity={1}/>
                    <stop offset="50%" stopColor="#ef4444" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#dc2626" stopOpacity={1}/>
                  </linearGradient>
                  <linearGradient id="sleepBarGradientOrange" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={1}/>
                    <stop offset="50%" stopColor="#f59e0b" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#d97706" stopOpacity={1}/>
                  </linearGradient>
                  <linearGradient id="sleepBarGradientBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={1}/>
                    <stop offset="50%" stopColor="#3b82f6" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={1}/>
                  </linearGradient>
                  <linearGradient id="sleepBarGradientGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={1}/>
                    <stop offset="50%" stopColor="#10b981" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#059669" stopOpacity={1}/>
                  </linearGradient>
                  <linearGradient id="sleepBarGradientGray" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#9ca3af" stopOpacity={1}/>
                    <stop offset="50%" stopColor="#6b7280" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#4b5563" stopOpacity={1}/>
                  </linearGradient>
                  {/* 3D shadow filter */}
                  <filter id="sleepBarShadow" x="-50%" y="-50%" width="200%" height="200%">
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
                <YAxis stroke="#9ca3af" domain={[0, 12]} tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }} tickLine={{ stroke: '#6b7280' }} />
                <Tooltip
                  contentStyle={{
                    background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))',
                    border: '2px solid #60a5fa',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(96, 165, 250, 0.3)',
                    backdropFilter: 'blur(10px)'
                  }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}
                  cursor={{ fill: 'rgba(96, 165, 250, 0.1)' }}
                />
                <Bar dataKey="hours" name="Hours" radius={[8, 8, 0, 0]} barSize={35} filter="url(#sleepBarShadow)">
                  {chartData.map((entry, index) => {
                    const hours = entry.hours;
                    const gradientId = hours >= 0 && hours < 3 ? 'sleepBarGradientRed' :
                                       hours >= 3 && hours < 6 ? 'sleepBarGradientOrange' :
                                       hours >= 6 && hours < 9 ? 'sleepBarGradientBlue' :
                                       hours >= 9 && hours <= 12 ? 'sleepBarGradientGreen' :
                                       'sleepBarGradientGray';
                    return (
                      <Cell key={`cell-${index}`} fill={`url(#${gradientId})`} stroke={entry.fill} strokeWidth={2} />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

          {hoursCategoryData.length > 0 && (
            <GlassCard>
              <h3 className="text-lg font-semibold text-white mb-4">Sleep Hours Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <defs>
                    {/* 3D pie slice gradients */}
                    <radialGradient id="sleepPieGradientRed">
                      <stop offset="0%" stopColor="#f87171" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#dc2626" stopOpacity={1}/>
                    </radialGradient>
                    <radialGradient id="sleepPieGradientOrange">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#d97706" stopOpacity={1}/>
                    </radialGradient>
                    <radialGradient id="sleepPieGradientBlue">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={1}/>
                    </radialGradient>
                    <radialGradient id="sleepPieGradientGreen">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#059669" stopOpacity={1}/>
                    </radialGradient>
                    <radialGradient id="sleepPieGradientGray">
                      <stop offset="0%" stopColor="#9ca3af" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#4b5563" stopOpacity={1}/>
                    </radialGradient>
                    {/* 3D shadow for pie */}
                    <filter id="sleepPieShadow" x="-50%" y="-50%" width="200%" height="200%">
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
                    data={hoursCategoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={{
                      stroke: '#9ca3af',
                      strokeWidth: 2
                    }}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    innerRadius={20}
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={2}
                    filter="url(#sleepPieShadow)"
                  >
                    {hoursCategoryData.map((entry, index) => {
                      const gradientId = entry.name.includes('0-3h') ? 'sleepPieGradientRed' :
                                         entry.name.includes('3-6h') ? 'sleepPieGradientOrange' :
                                         entry.name.includes('6-9h') ? 'sleepPieGradientBlue' :
                                         entry.name.includes('9-12h') ? 'sleepPieGradientGreen' :
                                         'sleepPieGradientGray';
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
                      border: '2px solid #60a5fa',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(96, 165, 250, 0.3)',
                      backdropFilter: 'blur(10px)'
                    }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </GlassCard>
          )}
        </div>
      )}

      {/* NEW: 8 Advanced Sleep Visualizations */}
      {sleepLogs.length > 0 && (
        <>
          {/* 1. Radial Sleep Quality Clock & 4. Sleep Target Radial Progress */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Radial Sleep Quality Clock */}
            <GlassCard>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Moon className="h-5 w-5 text-blue-400" />
                Sleep Quality Distribution
              </h3>
              <div className="flex items-center justify-center" style={{ minHeight: 220 }}>
                <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
                  <svg className="absolute inset-0" width="200" height="200">
                    <defs>
                      {/* Quality ring gradients */}
                      <linearGradient id="qualityGradientPoor" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fca5a5" />
                        <stop offset="50%" stopColor="#ef4444" />
                        <stop offset="100%" stopColor="#b91c1c" />
                      </linearGradient>
                      <linearGradient id="qualityGradientFair" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fcd34d" />
                        <stop offset="50%" stopColor="#fbbf24" />
                        <stop offset="100%" stopColor="#d97706" />
                      </linearGradient>
                      <linearGradient id="qualityGradientGood" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#93c5fd" />
                        <stop offset="50%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#1e40af" />
                      </linearGradient>
                      <linearGradient id="qualityGradientExcellent" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6ee7b7" />
                        <stop offset="50%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#047857" />
                      </linearGradient>
                      <filter id="qualityRingGlow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    {/* Concentric rings for each quality level */}
                    {/* Excellent ring (outermost) */}
                    <circle cx="100" cy="100" r="85" fill="none"
                            stroke="url(#qualityGradientExcellent)"
                            strokeWidth="14"
                            strokeDasharray={`${2 * Math.PI * 85}`}
                            strokeDashoffset={`${2 * Math.PI * 85 * (1 - (qualityDistribution.excellent / sleepLogs.length))}`}
                            transform="rotate(-90 100 100)"
                            filter="url(#qualityRingGlow)"
                            opacity={qualityDistribution.excellent > 0 ? 1 : 0.2} />
                    {/* Good ring */}
                    <circle cx="100" cy="100" r="65" fill="none"
                            stroke="url(#qualityGradientGood)"
                            strokeWidth="12"
                            strokeDasharray={`${2 * Math.PI * 65}`}
                            strokeDashoffset={`${2 * Math.PI * 65 * (1 - (qualityDistribution.good / sleepLogs.length))}`}
                            transform="rotate(-90 100 100)"
                            filter="url(#qualityRingGlow)"
                            opacity={qualityDistribution.good > 0 ? 1 : 0.2} />
                    {/* Fair ring */}
                    <circle cx="100" cy="100" r="47" fill="none"
                            stroke="url(#qualityGradientFair)"
                            strokeWidth="10"
                            strokeDasharray={`${2 * Math.PI * 47}`}
                            strokeDashoffset={`${2 * Math.PI * 47 * (1 - (qualityDistribution.fair / sleepLogs.length))}`}
                            transform="rotate(-90 100 100)"
                            filter="url(#qualityRingGlow)"
                            opacity={qualityDistribution.fair > 0 ? 1 : 0.2} />
                    {/* Poor ring (innermost) */}
                    <circle cx="100" cy="100" r="31" fill="none"
                            stroke="url(#qualityGradientPoor)"
                            strokeWidth="8"
                            strokeDasharray={`${2 * Math.PI * 31}`}
                            strokeDashoffset={`${2 * Math.PI * 31 * (1 - (qualityDistribution.poor / sleepLogs.length))}`}
                            transform="rotate(-90 100 100)"
                            filter="url(#qualityRingGlow)"
                            opacity={qualityDistribution.poor > 0 ? 1 : 0.2} />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <Trophy className="h-6 w-6 mb-1 text-yellow-400" />
                    <div className="text-xl font-bold text-white">{sleepLogs.length}</div>
                    <div className="text-xs text-white opacity-70">nights</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-red-400 to-red-700"></div>
                  <span className="text-white">Poor: {qualityDistribution.poor}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-700"></div>
                  <span className="text-white">Fair: {qualityDistribution.fair}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-blue-700"></div>
                  <span className="text-white">Good: {qualityDistribution.good}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-green-400 to-green-700"></div>
                  <span className="text-white">Excellent: {qualityDistribution.excellent}</span>
                </div>
              </div>
            </GlassCard>

            {/* Sleep Target Radial Progress */}
            <GlassCard>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-400" />
                Target Achievement
              </h3>
              <div className="flex items-center justify-center" style={{ minHeight: 220 }}>
                <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
                  <svg className="absolute inset-0" width="180" height="180">
                    <defs>
                      <linearGradient id="targetProgress" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={targetAchievementPercentage >= 80 ? '#10b981' : targetAchievementPercentage >= 60 ? '#3b82f6' : targetAchievementPercentage >= 40 ? '#fbbf24' : '#ef4444'} />
                        <stop offset="100%" stopColor={targetAchievementPercentage >= 80 ? '#047857' : targetAchievementPercentage >= 60 ? '#1e40af' : targetAchievementPercentage >= 40 ? '#d97706' : '#b91c1c'} />
                      </linearGradient>
                      <filter id="targetGlow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <circle cx="90" cy="90" r="75" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="14" />
                    <circle cx="90" cy="90" r="75" fill="none"
                            stroke="url(#targetProgress)"
                            strokeWidth="14"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 75}`}
                            strokeDashoffset={`${2 * Math.PI * 75 * (1 - targetAchievementPercentage / 100)}`}
                            transform="rotate(-90 90 90)"
                            filter="url(#targetGlow)" />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <Activity className="h-6 w-6 mb-1 text-purple-400" />
                    <div className="text-3xl font-bold text-white">{Math.round(targetAchievementPercentage)}%</div>
                    <div className="text-xs text-white opacity-70">7-9h nights</div>
                  </div>
                </div>
              </div>
              <div className="text-center text-xs text-white opacity-70 mt-2">
                {nightsInTarget} of {sleepLogs.length} nights achieved target
              </div>
            </GlassCard>
          </div>

          {/* 2. Sleep Heatmap Calendar */}
          <GlassCard>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-400" />
              Monthly Sleep Heatmap
            </h3>
            <div className="grid grid-cols-7 gap-1">
              {heatmapSleepData.map((day) => {
                const hours = day.hours || 0;
                const bgColor = hours === null ? 'bg-gray-800' :
                                hours < 4 ? 'bg-gradient-to-br from-red-500 to-red-700' :
                                hours < 6 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                                hours < 7 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                                hours < 9 ? 'bg-gradient-to-br from-blue-400 to-blue-600' :
                                'bg-gradient-to-br from-green-400 to-green-600';
                const opacity = hours === null ? 0.2 : 1;
                return (
                  <div key={day.day}
                       className={`${bgColor} rounded-lg p-2 text-center transition-all duration-300 hover:scale-110 hover:shadow-lg`}
                       style={{ opacity }}
                       title={day.hours ? `${day.date}: ${day.hours}h (${day.quality})` : day.date}>
                    <div className="text-xs font-bold text-white opacity-70">{day.dayOfWeek}</div>
                    <div className="text-lg font-bold text-white">{day.day}</div>
                    {day.hours && <div className="text-xs text-white opacity-90">{day.hours}h</div>}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center mt-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-red-500 to-red-700"></div>
                <span className="text-white opacity-70">&lt;4h</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-orange-400 to-orange-600"></div>
                <span className="text-white opacity-70">4-6h</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-yellow-400 to-yellow-600"></div>
                <span className="text-white opacity-70">6-7h</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-400 to-blue-600"></div>
                <span className="text-white opacity-70">7-9h</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-green-400 to-green-600"></div>
                <span className="text-white opacity-70">9+h</span>
              </div>
            </div>
          </GlassCard>

          {/* 3. Sleep Debt Wave Chart */}
          {sleepDebtData.length > 0 && (
            <GlassCard>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-400" />
                Sleep Debt Accumulation
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={sleepDebtData}>
                  <defs>
                    <linearGradient id="debtGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8}/>
                      <stop offset="50%" stopColor="#f97316" stopOpacity={0.6}/>
                      <stop offset="100%" stopColor="#dc2626" stopOpacity={0.3}/>
                    </linearGradient>
                    <filter id="debtShadow">
                      <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                      <feOffset dx="0" dy="3" result="offsetblur"/>
                      <feComponentTransfer>
                        <feFuncA type="linear" slope="0.4"/>
                      </feComponentTransfer>
                      <feMerge>
                        <feMergeNode/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 11 }} />
                  <YAxis stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 11 }}
                         label={{ value: 'Cumulative Debt (hours)', angle: -90, position: 'insideLeft', fill: '#d1d5db', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))',
                      border: '2px solid #f59e0b',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                      backdropFilter: 'blur(10px)'
                    }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <ReferenceLine y={0} stroke="#10b981" strokeDasharray="3 3" strokeWidth={2} />
                  <Area type="monotone" dataKey="debt" stroke="#f59e0b" strokeWidth={3}
                        fill="url(#debtGradient)" filter="url(#debtShadow)" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="text-xs text-center text-white opacity-70 mt-2">
                Target: 8 hours per night. Positive values indicate sleep debt.
              </div>
            </GlassCard>
          )}

          {/* 5. Bed/Wake Time Scatter Plot */}
          {bedWakeScatterData.length > 0 && (
            <GlassCard>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Sun className="h-5 w-5 text-yellow-400" />
                Bed Time vs Wake Time
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart>
                  <defs>
                    <linearGradient id="scatterGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.8}/>
                    </linearGradient>
                    <filter id="scatterGlow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis type="number" dataKey="bedHour" domain={[20, 32]}
                         ticks={[20, 22, 24, 26, 28, 30, 32]}
                         tickFormatter={(value) => {
                           const hour = value % 24;
                           return `${hour}:00`;
                         }}
                         stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 11 }}
                         label={{ value: 'Bed Time', position: 'insideBottom', offset: -5, fill: '#d1d5db', fontSize: 12 }} />
                  <YAxis type="number" dataKey="wakeHour" domain={[5, 12]}
                         stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 11 }}
                         label={{ value: 'Wake Time', angle: -90, position: 'insideLeft', fill: '#d1d5db', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))',
                      border: '2px solid #60a5fa',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                      backdropFilter: 'blur(10px)'
                    }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    formatter={(value: any, name: any, props: any) => {
                      if (name === 'bedHour') {
                        const hour = value % 24;
                        return [`${hour}:00`, 'Bed Time'];
                      }
                      if (name === 'wakeHour') {
                        return [`${value}:00`, 'Wake Time'];
                      }
                      return [value, name];
                    }}
                  />
                  <Scatter name="Sleep Sessions" data={bedWakeScatterData} fill="url(#scatterGradient)"
                           filter="url(#scatterGlow)" />
                </ScatterChart>
              </ResponsiveContainer>
            </GlassCard>
          )}

          {/* 6. Sleep Streak Flame Meter */}
          <GlassCard>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Logging Streak
            </h3>
            <div className="flex items-center justify-center py-6">
              <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
                <svg className="absolute inset-0" width="160" height="160">
                  <defs>
                    <linearGradient id="streakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={currentStreak >= 30 ? '#fbbf24' : currentStreak >= 14 ? '#f59e0b' : currentStreak >= 7 ? '#f97316' : '#6b7280'} />
                      <stop offset="100%" stopColor={currentStreak >= 30 ? '#d97706' : currentStreak >= 14 ? '#ea580c' : currentStreak >= 7 ? '#dc2626' : '#374151'} />
                    </linearGradient>
                    <filter id="streakFlameGlow">
                      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
                  <circle cx="80" cy="80" r="70" fill="none"
                          stroke="url(#streakGradient)"
                          strokeWidth="10"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 70}`}
                          strokeDashoffset={`${2 * Math.PI * 70 * (1 - Math.min(currentStreak / 30, 1))}`}
                          transform="rotate(-90 80 80)"
                          filter="url(#streakFlameGlow)" />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <Flame className={`h-8 w-8 mb-1 ${currentStreak >= 7 ? 'text-orange-500 animate-pulse' : 'text-gray-400'}`} />
                  <div className="text-3xl font-bold text-white">{currentStreak}</div>
                  <div className="text-xs text-white opacity-70">{currentStreak === 1 ? 'day' : 'days'}</div>
                </div>
              </div>
            </div>
            <div className="text-center text-xs text-white opacity-70">
              {currentStreak >= 30 ? '🏆 Master Logger!' :
               currentStreak >= 14 ? '🔥 On Fire!' :
               currentStreak >= 7 ? '💪 Keep Going!' :
               '📅 Start your streak!'}
            </div>
          </GlassCard>

          {/* 7. Sleep Phases Timeline */}
          {phasesTimelineData.length > 0 && (
            <GlassCard>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-cyan-400" />
                Recent Sleep Timeline
              </h3>
              <div className="space-y-2">
                {phasesTimelineData.map((day, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="text-xs text-white opacity-70 w-20">{day.date}</div>
                    <div className="flex-1 relative h-8 rounded-lg overflow-hidden"
                         style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="absolute inset-0 flex">
                        {/* Awake before bed */}
                        <div style={{
                          width: `${(day.bedHour / 24) * 100}%`,
                          background: 'linear-gradient(90deg, rgba(107, 114, 128, 0.3), rgba(75, 85, 99, 0.3))'
                        }}></div>
                        {/* Sleep period */}
                        <div style={{
                          width: `${(day.sleepDuration / 24) * 100}%`,
                          background: day.quality === 'excellent' ? 'linear-gradient(90deg, #10b981, #059669)' :
                                     day.quality === 'good' ? 'linear-gradient(90deg, #3b82f6, #1e40af)' :
                                     day.quality === 'fair' ? 'linear-gradient(90deg, #fbbf24, #d97706)' :
                                     'linear-gradient(90deg, #ef4444, #b91c1c)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }} className="flex items-center justify-center">
                          <span className="text-xs font-bold text-white">{day.hours}h</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-white opacity-70 w-16">{day.wakeTime}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-gradient-to-r from-green-500 to-green-700"></div>
                  <span className="text-white opacity-70">Excellent</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-gradient-to-r from-blue-500 to-blue-700"></div>
                  <span className="text-white opacity-70">Good</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-gradient-to-r from-yellow-500 to-yellow-700"></div>
                  <span className="text-white opacity-70">Fair</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-gradient-to-r from-red-500 to-red-700"></div>
                  <span className="text-white opacity-70">Poor</span>
                </div>
              </div>
            </GlassCard>
          )}

          {/* 8. 3D Sleep Quality Pyramid */}
          <GlassCard>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-400" />
              Sleep Quality Pyramid
            </h3>
            <div className="flex flex-col items-center justify-center py-6 space-y-2">
              {pyramidData.map((level, index) => {
                const width = 60 + (pyramidData.length - index) * 40;
                const height = 40;
                return (
                  <div key={index}
                       className="relative transition-all duration-300 hover:scale-105"
                       style={{ width: `${width}px` }}>
                    <div className={`${level.gradient} rounded-lg shadow-lg border-2 ${level.border} flex items-center justify-center`}
                         style={{
                           height: `${height}px`,
                           boxShadow: `0 4px 16px ${level.color}40, inset 0 2px 8px rgba(255,255,255,0.1)`
                         }}>
                      <div className="text-center">
                        <div className="text-xl font-bold text-white">{level.count}</div>
                        <div className="text-xs text-white opacity-90">{level.label}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-center text-xs text-white opacity-70 mt-2">
              Distribution across {sleepLogs.length} nights
            </div>
          </GlassCard>
        </>
      )}

      {/* Sleep Logs List */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-white mb-4">Recent Sleep Logs</h3>
        {sleepLogs.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No sleep logs yet. Start tracking your sleep!</p>
        ) : (
          <div className="space-y-3">
            {sleepLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-white font-semibold">
                      {format(parseISO(log.date), 'MMMM d, yyyy')}
                    </p>
                    {log.sleepQuality && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSleepQualityColor(log.sleepQuality)}`}>
                        {log.sleepQuality}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Moon className="h-4 w-4" />
                      {log.hoursSlept} hours
                    </span>
                    {log.bedTime && (() => {
                      try {
                        const bedDate = new Date(log.bedTime);
                        if (!isNaN(bedDate.getTime())) {
                          return (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Bed: {format(bedDate, 'h:mm a')}
                            </span>
                          );
                        }
                      } catch (e) {
                        return null;
                      }
                      return null;
                    })()}
                    {log.wakeTime && (() => {
                      try {
                        const wakeDate = new Date(log.wakeTime);
                        if (!isNaN(wakeDate.getTime())) {
                          return (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Wake: {format(wakeDate, 'h:mm a')}
                            </span>
                          );
                        }
                      } catch (e) {
                        return null;
                      }
                      return null;
                    })()}
                  </div>
                  {log.notes && (
                    <p className="text-gray-400 text-sm mt-2">{log.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(log)}
                    className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="p-2 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingLog(null);
          reset({ date: format(new Date(), 'yyyy-MM-dd') });
        }}
        title={editingLog ? 'Edit Sleep Log' : 'Log Sleep'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Date *
            </label>
            <Input
              type="date"
              {...register('date')}
              error={errors.date?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Hours Slept *
            </label>
            <Input
              type="number"
              step="0.5"
              placeholder="8.0"
              {...register('hoursSlept', { valueAsNumber: true })}
              error={errors.hoursSlept?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Sleep Quality
            </label>
            <select
              {...register('sleepQuality')}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select quality</option>
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Bed Time
              </label>
              <Input
                type="datetime-local"
                {...register('bedTime')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Wake Time
              </label>
              <Input
                type="datetime-local"
                {...register('wakeTime')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Notes
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any notes about your sleep..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setEditingLog(null);
                reset({ date: format(new Date(), 'yyyy-MM-dd') });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : editingLog ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
