import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { GlassCard, Button, Modal, Input } from '../components/ui';
import { PatientSelector } from '../components/PatientSelector';
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
  Sun,
  Sparkles,
  Smartphone,
  RefreshCw,
  Check
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, ReferenceLine, RadialBarChart, RadialBar } from 'recharts';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import { SleepLog, CreateSleepLogInput, SleepStats } from '../types';
import toast from 'react-hot-toast';
import { format, subDays, parseISO, getDaysInMonth, startOfMonth, endOfMonth, eachDayOfInterval, differenceInDays } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

const sleepSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  hoursSlept: z.number().min(0).max(24, 'Hours must be between 0 and 24'),
  sleepQuality: z.enum(['poor', 'fair', 'good', 'excellent']).optional(),
  dreamQuality: z.enum(['nightmare', 'cannot_remember', 'sporadic', 'vivid_positive']).optional(),
  dreamNotes: z.string().optional(),
  bedTime: z.string().optional(),
  wakeTime: z.string().optional(),
  notes: z.string().optional(),

  // Sleep Environment
  roomTemperature: z.number().min(50).max(90).optional(),
  noiseLevel: z.number().min(1).max(10).optional(),
  lightLevel: z.number().min(1).max(10).optional(),
  bedtimeRoutine: z.string().optional(),
  environmentNotes: z.string().optional(),

  // Additional Quality Indicators
  sleepInterruptions: z.number().min(0).max(50).optional(),
  restfulness: z.number().min(1).max(10).optional(),
  morningMood: z.enum(['terrible', 'poor', 'okay', 'good', 'excellent']).optional(),
});

type SleepFormData = z.infer<typeof sleepSchema>;

export function SleepPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [stats, setStats] = useState<SleepStats | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingLog, setEditingLog] = useState<SleepLog | null>(null);
  const [dateRange, setDateRange] = useState<'daily' | 'weekly' | 'monthly' | 'surgery'>('surgery');

  // 🔄 Patient Selection: Track which user's data to view
  // - null = viewing own data (default for patients, therapist viewing self)
  // - number = therapist viewing specific patient's data
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Heatmap toggle: sleep hours vs dream quality
  const [heatmapMode, setHeatmapMode] = useState<'sleep' | 'dreams'>('sleep');

  // Samsung device sync state
  const [deviceStatus, setDeviceStatus] = useState<{
    connected: boolean;
    deviceName?: string;
    syncStatus?: 'active' | 'error' | 'disconnected';
    lastSyncedAt?: string;
    syncError?: string;
    autoSync?: boolean;
    syncSleep?: boolean;
  }>({ connected: false });
  const [isSyncing, setIsSyncing] = useState(false);

  // Debug: Log when selectedUserId changes
  useEffect(() => {
    console.log('🎯 [SLEEP DEBUG] selectedUserId state changed to:', selectedUserId);
  }, [selectedUserId]);

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

  // Handle navigation from calendar page
  useEffect(() => {
    const state = location.state as { editDate?: string; addDate?: string } | null;
    if (state) {
      if (state.editDate) {
        // Load and edit sleep log for this date
        const loadAndEditSleep = async () => {
          try {
            const sleepLog = await api.getSleepLogByDate(state.editDate!);
            handleEdit(sleepLog);
          } catch (error) {
            console.error('Failed to load sleep log:', error);
            toast.error('Sleep log not found for this date');
          }
        };
        loadAndEditSleep();
      } else if (state.addDate) {
        // Open modal with pre-filled date
        reset({
          date: state.addDate,
          hoursSlept: 0,
        });
        setEditingLog(null);
        setIsModalOpen(true);
      }
      // Clear the navigation state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    console.log(`🔄 [SLEEP DEBUG] useEffect triggered - selectedUserId: ${selectedUserId}, dateRange: ${dateRange}, currentUser: ${user?.id}`);
    loadSleepLogs();
    loadStats();
    loadDeviceStatus();
  }, [dateRange, selectedUserId]); // Reload when selected user changes

  // Reload data when navigating back to sleep page
  useEffect(() => {
    if (location.pathname === '/sleep') {
      loadSleepLogs();
      loadStats();
      loadDeviceStatus();
    }
  }, [location.pathname]);

  const loadSleepLogs = async () => {
    try {
      setIsLoading(true);
      const userId = selectedUserId || user?.id;

      console.log(`🔍 [SLEEP DEBUG] loadSleepLogs called - selectedUserId: ${selectedUserId}, currentUserId: ${user?.id}, effectiveUserId: ${userId}, dateRange: ${dateRange}`);

      // Calculate date range based on selection
      let startDate: string;
      const endDate = format(new Date(), 'yyyy-MM-dd');

      if (dateRange === 'surgery') {
        // From surgery date to now (max 90 days)
        const surgeryDate = user?.surgeryDate;

        if (surgeryDate) {
          const surgeryDateObj = parseISO(surgeryDate);
          const maxStartDate = subDays(new Date(), 90); // Cap at 90 days
          const actualStartDate = surgeryDateObj < maxStartDate ? maxStartDate : surgeryDateObj;
          startDate = format(actualStartDate, 'yyyy-MM-dd');
        } else {
          // Fallback to 30 days if no surgery date
          startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
        }
      } else {
        // Daily/Weekly/Monthly
        const days = dateRange === 'daily' ? 1 : dateRange === 'weekly' ? 7 : 30;
        startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      }

      const data = await api.getSleepLogs({
        startDate,
        endDate,
        userId
      });

      console.log(`✅ [SLEEP DEBUG] Sleep logs loaded - count: ${data.length}, userId: ${userId}, firstLogUserId: ${data[0]?.userId || 'none'}, dateRange: ${startDate} to ${endDate}`);
      console.log('🌙 [DREAM DEBUG] First log has dreamQuality?', data[0]?.dreamQuality, 'Sample log:', data[0]);

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
      const userId = selectedUserId || user?.id;

      // Calculate date range based on selection (same logic as loadSleepLogs)
      let startDate: string;
      const endDate = format(new Date(), 'yyyy-MM-dd');

      if (dateRange === 'surgery') {
        const surgeryDate = user?.surgeryDate;

        if (surgeryDate) {
          const surgeryDateObj = parseISO(surgeryDate);
          const maxStartDate = subDays(new Date(), 90);
          const actualStartDate = surgeryDateObj < maxStartDate ? maxStartDate : surgeryDateObj;
          startDate = format(actualStartDate, 'yyyy-MM-dd');
        } else {
          startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
        }
      } else {
        const days = dateRange === 'daily' ? 1 : dateRange === 'weekly' ? 7 : 30;
        startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      }

      const data = await api.getSleepStats(startDate, endDate, userId);
      setStats(data);
    } catch (error) {
      console.error('Failed to load sleep stats:', error);
    }
  };

  // Load Samsung device status
  const loadDeviceStatus = async () => {
    try {
      const response = await api.getSamsungDeviceStatus();
      setDeviceStatus(response.data);
    } catch (error) {
      console.error('Failed to load device status:', error);
    }
  };

  // Trigger manual sync
  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      await api.triggerSamsungSync();
      toast.success('Syncing sleep data from Samsung Galaxy Watch...');

      // Reload data after a short delay
      setTimeout(() => {
        loadSleepLogs();
        loadStats();
        loadDeviceStatus();
        setIsSyncing(false);
      }, 3000);
    } catch (error: any) {
      console.error('Failed to trigger sync:', error);
      toast.error(error.response?.data?.error || 'Failed to sync device');
      setIsSyncing(false);
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
          // Always include userId: therapist uses selectedUserId, patient uses own user
          userId: selectedUserId || user?.id
        } as CreateSleepLogInput & { userId?: number };

        const newLog = await api.createSleepLog(newLogData);
        setSleepLogs([newLog, ...sleepLogs]);
        toast.success('Sleep log added successfully');
      }

      setIsModalOpen(false);
      setEditingLog(null);
      reset({ date: format(new Date(), 'yyyy-MM-dd') });
      // FIXED: Await stats reload so UI shows updated calculations
      await loadStats();
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

  // Calculate monthly sleep and dream scores (SEPARATE 100-point systems)
  const calculateMonthlyScores = () => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const daysInCurrentMonth = getDaysInMonth(now);

    // Filter logs for current month
    const monthLogs = sleepLogs.filter(log => {
      const logDate = parseISO(log.date);
      return logDate >= monthStart && logDate <= monthEnd;
    });

    // Calculate sleep points (0-3 per day)
    let sleepPoints = 0;
    monthLogs.forEach(log => {
      const hours = parseFloat(log.hoursSlept.toString());
      sleepPoints += getSleepPoints(hours);
    });

    // Calculate dream points (0-3 per day)
    let dreamPoints = 0;
    const dreamPointsMap = {
      nightmare: 0,
      cannot_remember: 1,
      sporadic: 2,
      vivid_positive: 3,
    };
    monthLogs.forEach(log => {
      if (log.dreamQuality) {
        console.log('🌙 [DREAM SCORE] Found dream:', log.date, log.dreamQuality, 'Points:', dreamPointsMap[log.dreamQuality]);
        dreamPoints += dreamPointsMap[log.dreamQuality];
      }
    });

    console.log('🌙 [DREAM SCORE] Total dream points:', dreamPoints, 'from', monthLogs.filter(l => l.dreamQuality).length, 'dreams');

    // Check for perfect attendance (all days logged)
    const allDaysLogged = monthLogs.length === daysInCurrentMonth;

    // Calculate bonus points for 100-point scale
    let sleepBonus = 0;
    let dreamBonus = 0;

    if (allDaysLogged) {
      // Bonus calculation to reach 100 points max
      // 30 days: 90 points max → 10 bonus
      // 31 days: 93 points max → 7 bonus
      // 28/29 days: 84/87 points max → 16/13 bonus
      const maxBasePoints = daysInCurrentMonth * 3;
      sleepBonus = 100 - maxBasePoints;
      dreamBonus = 100 - maxBasePoints;
    }

    // Calculate final scores (out of 100)
    const sleepScore = Math.min(sleepPoints + sleepBonus, 100);
    const dreamScore = Math.min(dreamPoints + dreamBonus, 100);

    return {
      sleepScore,
      dreamScore,
      sleepPoints,
      dreamPoints,
      sleepBonus,
      dreamBonus,
      daysLogged: monthLogs.length,
      daysInMonth: daysInCurrentMonth,
      isPerfect: allDaysLogged,
    };
  };

  // Helper function to get score color based on score (out of 100)
  const getScoreColor = (score: number) => {
    if (score >= 90) return { bg: 'bg-gradient-to-br from-green-500 to-emerald-600', text: 'text-white', border: 'border-green-400', glow: 'shadow-lg shadow-green-500/50' };
    if (score >= 75) return { bg: 'bg-gradient-to-br from-blue-500 to-cyan-600', text: 'text-white', border: 'border-blue-400', glow: 'shadow-lg shadow-blue-500/50' };
    if (score >= 50) return { bg: 'bg-gradient-to-br from-yellow-500 to-orange-500', text: 'text-white', border: 'border-yellow-400', glow: 'shadow-lg shadow-yellow-500/50' };
    if (score >= 25) return { bg: 'bg-gradient-to-br from-orange-500 to-red-500', text: 'text-white', border: 'border-orange-400', glow: 'shadow-lg shadow-orange-500/50' };
    return { bg: 'bg-gradient-to-br from-red-600 to-red-800', text: 'text-white', border: 'border-red-500', glow: 'shadow-lg shadow-red-500/50' };
  };

  console.log(`🎨 [SLEEP DEBUG] RENDERING - sleepLogs.length: ${sleepLogs.length}, selectedUserId: ${selectedUserId}, firstLogUserId: ${sleepLogs[0]?.userId || 'none'}`);

  const monthlyScores = calculateMonthlyScores();
  const sleepScoreColor = getScoreColor(monthlyScores.sleepScore);
  const dreamScoreColor = getScoreColor(monthlyScores.dreamScore);

  // Limit to last 90 days for chart performance
  const chartData = sleepLogs
    .slice(-90)
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
        dreamQuality: dayLog?.dreamQuality || null,
        dayOfWeek: format(date, 'EEE'),
      });
    }
    return data;
  })();

  // 2b. Dream Heatmap Calendar Data - Current month
  const heatmapDreamData = (() => {
    const now = new Date();
    const daysInMonth = getDaysInMonth(now);
    const monthStart = startOfMonth(now);
    const data = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(monthStart);
      date.setDate(day);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayLog = sleepLogs.find(log => log.date === dateStr);

      data.push({
        day,
        date: format(date, 'MMM d'),
        dreamQuality: dayLog?.dreamQuality || null,
        dayOfWeek: format(date, 'EEE'),
      });
    }
    return data;
  })();

  // 3. Sleep Debt Wave Data (limited to 90 days for performance)
  const sleepDebtData = (() => {
    const TARGET_HOURS = 8;
    let cumulativeDebt = 0;

    return sleepLogs
      .slice(-90)
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

  // 5. Bed/Wake Time Data - Chart over Days Since Surgery
  const surgeryDate = user?.surgeryDate;

  const bedWakeScatterData = (() => {
    // sleepLogs is already filtered by loadSleepLogs based on dateRange
    // No need to filter again - just process the data
    return sleepLogs
      .filter(log => log.bedTime && log.wakeTime)
      .map(log => {
        try {
          // Parse full ISO timestamps
          const bedDate = new Date(log.bedTime!);
          const wakeDate = new Date(log.wakeTime!);
          const logDate = parseISO(log.date);

          // Validate dates
          if (isNaN(bedDate.getTime()) || isNaN(wakeDate.getTime()) || isNaN(logDate.getTime())) {
            return null;
          }

          // Calculate days since surgery
          let daysSinceSurgery = 0;
          if (surgeryDate) {
            const surgeryDateParsed = parseISO(surgeryDate);
            if (!isNaN(surgeryDateParsed.getTime())) {
              daysSinceSurgery = differenceInDays(logDate, surgeryDateParsed);
            }
          } else {
            // If no surgery date, use days from earliest log date in the filtered set
            const allDates = sleepLogs.map(l => parseISO(l.date)).filter(d => !isNaN(d.getTime()));
            if (allDates.length > 0) {
              const earliestDate = new Date(Math.min(...allDates.map(d => d.getTime())));
              daysSinceSurgery = differenceInDays(logDate, earliestDate);
            }
          }

          // Only show data from Day 0 to Day 90
          if (daysSinceSurgery < 0 || daysSinceSurgery > 90) {
            return null;
          }

          // Extract hour as decimal (e.g., 22.5 for 10:30 PM)
          const bedHour = bedDate.getHours() + bedDate.getMinutes() / 60;
          const wakeHour = wakeDate.getHours() + wakeDate.getMinutes() / 60;
          const hours = parseFloat(log.hoursSlept.toString());

          return {
            day: daysSinceSurgery,
            bedTime: bedHour,
            wakeTime: wakeHour,
            hours,
            quality: log.sleepQuality || 'unknown',
            date: format(logDate, 'MMM d'),
            fullDate: format(logDate, 'MMM d, yyyy'),
            timestamp: logDate.getTime(), // For sorting and axis
          };
        } catch (error) {
          console.error('Error processing sleep log:', error, log);
          return null; // Skip logs with parsing errors
        }
      })
      .filter(data => data !== null)
      .sort((a, b) => a!.day - b!.day); // Sort by day since surgery
  })();

  // 6. Sleep Streak Data - Count consecutive days from today backwards
  const calculateStreak = () => {
    if (sleepLogs.length === 0) return 0;

    const sortedLogs = [...sleepLogs].sort((a, b) =>
      parseISO(b.date).getTime() - parseISO(a.date).getTime()
    );

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedLogs.length; i++) {
      const logDate = parseISO(sortedLogs[i].date);
      const expectedDate = subDays(today, i);

      // Use yyyy-MM-dd string comparison
      const logDateStr = format(logDate, 'yyyy-MM-dd');
      const expectedDateStr = format(expectedDate, 'yyyy-MM-dd');

      if (logDateStr === expectedDateStr) {
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
      try {
        // Parse ISO timestamps to get hours and minutes
        const bedDate = new Date(log.bedTime!);
        const wakeDate = new Date(log.wakeTime!);

        if (isNaN(bedDate.getTime()) || isNaN(wakeDate.getTime())) {
          return null;
        }

        const bedHour = bedDate.getHours() + bedDate.getMinutes() / 60;
        const wakeHour = wakeDate.getHours() + wakeDate.getMinutes() / 60;

        // Normalize to 24-hour timeline starting from 6 PM (18:00)
        const normalizedBedTime = bedHour >= 18 ? bedHour - 18 : bedHour + 6; // Map 18:00-23:59 to 0-5.99, 0:00-17:59 to 6-23.99
        const normalizedWakeTime = wakeHour <= 12 ? wakeHour + 6 : wakeHour - 18; // Wake times in morning

        const sleepDuration = parseFloat(log.hoursSlept.toString());

        return {
          date: format(parseISO(log.date), 'MMM d'),
          bedHour: normalizedBedTime,
          wakeTime: format(wakeDate, 'h:mm a'),
          sleepDuration: sleepDuration,
          hours: sleepDuration.toFixed(1),
          quality: log.sleepQuality || 'fair',
        };
      } catch (error) {
        console.error('Error parsing sleep timeline data:', error);
        return null;
      }
    })
    .filter((data): data is NonNullable<typeof data> => data !== null);

  // 8. 3D Pyramid Data (quality distribution for isometric view)
  const pyramidData = [
    {
      level: 'Excellent',
      count: qualityDistribution.excellent,
      color: '#10b981',
      layer: 4,
      label: 'Excellent',
      gradient: 'bg-gradient-to-br from-green-500 to-green-700',
      border: 'border-green-400'
    },
    {
      level: 'Good',
      count: qualityDistribution.good,
      color: '#3b82f6',
      layer: 3,
      label: 'Good',
      gradient: 'bg-gradient-to-br from-blue-500 to-blue-700',
      border: 'border-blue-400'
    },
    {
      level: 'Fair',
      count: qualityDistribution.fair,
      color: '#f59e0b',
      layer: 2,
      label: 'Fair',
      gradient: 'bg-gradient-to-br from-yellow-500 to-yellow-700',
      border: 'border-yellow-400'
    },
    {
      level: 'Poor',
      count: qualityDistribution.poor,
      color: '#ef4444',
      layer: 1,
      label: 'Poor',
      gradient: 'bg-gradient-to-br from-red-500 to-red-700',
      border: 'border-red-400'
    },
  ].filter(item => item.count > 0);

  // 9. Dream Quality Distribution
  const dreamQualityDistribution = sleepLogs.reduce((acc, log) => {
    if (log.dreamQuality) {
      acc[log.dreamQuality] = (acc[log.dreamQuality] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const dreamData = [
    {
      quality: 'Vivid & Positive',
      count: dreamQualityDistribution.vivid_positive || 0,
      color: '#10b981',
      gradient: 'from-green-500 to-emerald-600',
      glow: 'shadow-green-500/50',
      points: 3,
      emoji: '✨'
    },
    {
      quality: 'Sporadic',
      count: dreamQualityDistribution.sporadic || 0,
      color: '#3b82f6',
      gradient: 'from-blue-500 to-cyan-600',
      glow: 'shadow-blue-500/50',
      points: 2,
      emoji: '🌙'
    },
    {
      quality: "Can't Remember",
      count: dreamQualityDistribution.cannot_remember || 0,
      color: '#f59e0b',
      gradient: 'from-yellow-500 to-orange-500',
      glow: 'shadow-yellow-500/50',
      points: 1,
      emoji: '💭'
    },
    {
      quality: 'Nightmares',
      count: dreamQualityDistribution.nightmare || 0,
      color: '#ef4444',
      gradient: 'from-red-500 to-red-700',
      glow: 'shadow-red-500/50',
      points: 0,
      emoji: '😱'
    },
  ].filter(item => item.count > 0);

  const totalDreamsLogged = dreamData.reduce((sum, item) => sum + item.count, 0);

  // ==================== SAMSUNG SLEEP TRACKING FEATURES (1-4) ====================

  // FEATURE 1: Sleep Stages Data (Stacked Bar Chart)
  const sleepStagesChartData = sleepLogs
    .filter(log => log.awakeDuration || log.lightSleepDuration || log.deepSleepDuration || log.remSleepDuration)
    .slice(-30) // Last 30 days with sleep stages data
    .reverse()
    .map(log => ({
      date: format(parseISO(log.date), 'MMM d'),
      awake: log.awakeDuration || 0,
      light: log.lightSleepDuration || 0,
      deep: log.deepSleepDuration || 0,
      rem: log.remSleepDuration || 0,
      awakePercent: log.awakePercent || 0,
      lightPercent: log.lightSleepPercent || 0,
      deepPercent: log.deepSleepPercent || 0,
      remPercent: log.remSleepPercent || 0,
    }));

  // Average sleep stages percentages
  const avgSleepStages = sleepStagesChartData.length > 0 ? {
    awake: sleepStagesChartData.reduce((sum, d) => sum + d.awakePercent, 0) / sleepStagesChartData.length,
    light: sleepStagesChartData.reduce((sum, d) => sum + d.lightPercent, 0) / sleepStagesChartData.length,
    deep: sleepStagesChartData.reduce((sum, d) => sum + d.deepPercent, 0) / sleepStagesChartData.length,
    rem: sleepStagesChartData.reduce((sum, d) => sum + d.remPercent, 0) / sleepStagesChartData.length,
  } : { awake: 0, light: 0, deep: 0, rem: 0 };

  // FEATURE 2: Sleep Efficiency Data (Circular Gauge)
  const sleepEfficiencyData = sleepLogs
    .filter(log => log.sleepEfficiency !== null && log.sleepEfficiency !== undefined)
    .slice(-30);

  const avgSleepEfficiency = sleepEfficiencyData.length > 0
    ? sleepEfficiencyData.reduce((sum, log) => sum + (log.sleepEfficiency || 0), 0) / sleepEfficiencyData.length
    : 0;

  const latestSleepEfficiency = sleepEfficiencyData.length > 0
    ? sleepEfficiencyData[sleepEfficiencyData.length - 1].sleepEfficiency || 0
    : 0;

  // FEATURE 3: Sleep Consistency Score
  const sleepConsistencyData = sleepLogs
    .filter(log => log.bedTime && log.wakeTime)
    .slice(-30); // Last 30 days

  const calculateConsistencyScore = () => {
    if (sleepConsistencyData.length < 3) return 0;

    // Calculate average bedtime and waketime in minutes from midnight
    const bedtimes = sleepConsistencyData.map(log => {
      const bed = new Date(log.bedTime!);
      let minutes = bed.getHours() * 60 + bed.getMinutes();
      // Adjust for late night (after 6 PM is same day, before 6 AM is next day)
      if (bed.getHours() < 6) minutes += 24 * 60;
      return minutes;
    });

    const waketimes = sleepConsistencyData.map(log => {
      const wake = new Date(log.wakeTime!);
      return wake.getHours() * 60 + wake.getMinutes();
    });

    const avgBedtime = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length;
    const avgWaketime = waketimes.reduce((a, b) => a + b, 0) / waketimes.length;

    // Calculate standard deviation
    const bedtimeVariance = bedtimes.reduce((sum, time) => sum + Math.pow(time - avgBedtime, 2), 0) / bedtimes.length;
    const waketimeVariance = waketimes.reduce((sum, time) => sum + Math.pow(time - avgWaketime, 2), 0) / waketimes.length;

    const bedtimeStdDev = Math.sqrt(bedtimeVariance);
    const waketimeStdDev = Math.sqrt(waketimeVariance);

    // Score: 100 = perfect consistency (0 deviation), decreases with higher std dev
    // Every 30 min of std dev reduces score by ~15 points
    const bedtimeScore = Math.max(0, 100 - (bedtimeStdDev / 30) * 15);
    const waketimeScore = Math.max(0, 100 - (waketimeStdDev / 30) * 15);

    return Math.round((bedtimeScore + waketimeScore) / 2);
  };

  const consistencyScore = calculateConsistencyScore();

  // FEATURE 4: Nap Impact Analysis
  const napLogs = sleepLogs.filter(log => log.isNap === true);
  const nonNapLogs = sleepLogs.filter(log => log.isNap === false || log.isNap === null);

  // Calculate average sleep quality on days with naps vs without
  const datesWithNaps = new Set(napLogs.map(log => log.date));

  const nightsAfterNaps = nonNapLogs.filter(log => {
    const logDate = parseISO(log.date);
    const prevDate = format(subDays(logDate, 1), 'yyyy-MM-dd');
    return datesWithNaps.has(prevDate);
  });

  const nightsWithoutNaps = nonNapLogs.filter(log => {
    const logDate = parseISO(log.date);
    const prevDate = format(subDays(logDate, 1), 'yyyy-MM-dd');
    return !datesWithNaps.has(prevDate);
  });

  const avgHoursAfterNaps = nightsAfterNaps.length > 0
    ? nightsAfterNaps.reduce((sum, log) => sum + parseFloat(log.hoursSlept.toString()), 0) / nightsAfterNaps.length
    : 0;

  const avgHoursWithoutNaps = nightsWithoutNaps.length > 0
    ? nightsWithoutNaps.reduce((sum, log) => sum + parseFloat(log.hoursSlept.toString()), 0) / nightsWithoutNaps.length
    : 0;

  const napImpactData = [
    {
      category: 'After Naps',
      hours: avgHoursAfterNaps,
      count: nightsAfterNaps.length,
    },
    {
      category: 'No Naps',
      hours: avgHoursWithoutNaps,
      count: nightsWithoutNaps.length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Patient Selector - Shows who's data is being viewed */}
      <PatientSelector
        onPatientChange={setSelectedUserId}
        selectedUserId={selectedUserId}
      />

      {/* Header Row with Title and Action Button */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Sleep Journal</h1>
        <div className="flex items-center gap-3">
          {/* Samsung Device Sync Status */}
          {deviceStatus.connected && deviceStatus.syncSleep && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600/30 to-purple-600/30 border border-blue-400/30 backdrop-blur-sm">
              <Smartphone className={`h-5 w-5 ${deviceStatus.syncStatus === 'active' ? 'text-green-400' : 'text-yellow-400'}`} />
              <div className="flex flex-col">
                <span className="text-xs text-white font-semibold">{deviceStatus.deviceName || 'Samsung Watch'}</span>
                {deviceStatus.lastSyncedAt && (
                  <span className="text-xs text-gray-300">
                    Last sync: {format(new Date(deviceStatus.lastSyncedAt), 'MMM d, h:mm a')}
                  </span>
                )}
              </div>
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className={`ml-2 p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 transition-colors ${isSyncing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                title="Sync now"
              >
                <RefreshCw className={`h-4 w-4 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
          <Button onClick={handleOpenModal}>
            <Plus className="h-5 w-5 mr-2" />
            Log Sleep
          </Button>
        </div>
      </div>

      {/* Score Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sleep Score Card */}
        <div className={`${sleepScoreColor.bg} ${sleepScoreColor.text} rounded-xl p-6 ${sleepScoreColor.glow} border-2 ${sleepScoreColor.border} transform hover:scale-105 transition-all duration-300`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Moon className="h-8 w-8" />
              <div>
                <div className="text-sm font-semibold opacity-90">Sleep Score</div>
                <div className="text-4xl font-bold">
                  {monthlyScores.sleepScore}
                  <span className="text-xl opacity-75">/100</span>
                </div>
              </div>
            </div>
            {monthlyScores.isPerfect && (
              <Award className="h-8 w-8 animate-pulse" />
            )}
          </div>
          <div className="text-xs opacity-90 mt-3 flex items-center justify-between">
            <span>{monthlyScores.daysLogged}/{monthlyScores.daysInMonth} days logged</span>
            {monthlyScores.isPerfect && (
              <span className="font-semibold">+{monthlyScores.sleepBonus} bonus!</span>
            )}
          </div>
        </div>

        {/* Dream Score Card */}
        <div className={`${dreamScoreColor.bg} ${dreamScoreColor.text} rounded-xl p-6 ${dreamScoreColor.glow} border-2 ${dreamScoreColor.border} transform hover:scale-105 transition-all duration-300`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8" />
              <div>
                <div className="text-sm font-semibold opacity-90">Dream Score</div>
                <div className="text-4xl font-bold">
                  {monthlyScores.dreamScore}
                  <span className="text-xl opacity-75">/100</span>
                </div>
              </div>
            </div>
            {monthlyScores.isPerfect && (
              <Award className="h-8 w-8 animate-pulse" />
            )}
          </div>
          <div className="text-xs opacity-90 mt-3 flex items-center justify-between">
            <span>{monthlyScores.daysLogged}/{monthlyScores.daysInMonth} days logged</span>
            {monthlyScores.isPerfect && (
              <span className="font-semibold">+{monthlyScores.dreamBonus} bonus!</span>
            )}
          </div>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={dateRange === 'daily' ? 'primary' : 'secondary'}
          onClick={() => setDateRange('daily')}
        >
          Daily (24h)
        </Button>
        <Button
          variant={dateRange === 'weekly' ? 'primary' : 'secondary'}
          onClick={() => setDateRange('weekly')}
        >
          Weekly (7d)
        </Button>
        <Button
          variant={dateRange === 'monthly' ? 'primary' : 'secondary'}
          onClick={() => setDateRange('monthly')}
        >
          Monthly (30d)
        </Button>
        <Button
          variant={dateRange === 'surgery' ? 'primary' : 'secondary'}
          onClick={() => setDateRange('surgery')}
        >
          Since Surgery (0-90d)
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
                    // FIXED: Use consistent data source (sleepLogs) instead of mixing with stats.totalLogs
                    const totalHoursSlept = sleepLogs.reduce((sum, log) => sum + parseFloat(log.hoursSlept.toString()), 0);
                    const targetHours = TARGET_HOURS * sleepLogs.length;
                    const debt = targetHours - totalHoursSlept;
                    return debt > 10 ? 'text-red-400' : debt > 5 ? 'text-yellow-400' : 'text-green-400';
                  })()}`}>
                    {(() => {
                      const TARGET_HOURS = 8;
                      const totalHoursSlept = sleepLogs.reduce((sum, log) => sum + parseFloat(log.hoursSlept.toString()), 0);
                      const targetHours = TARGET_HOURS * sleepLogs.length;
                      const debt = targetHours - totalHoursSlept;
                      return Math.abs(debt).toFixed(1);
                    })()} hrs {(() => {
                      const TARGET_HOURS = 8;
                      const totalHoursSlept = sleepLogs.reduce((sum, log) => sum + parseFloat(log.hoursSlept.toString()), 0);
                      const targetHours = TARGET_HOURS * sleepLogs.length;
                      const debt = targetHours - totalHoursSlept;
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
                        try {
                          // Parse full ISO timestamps
                          const bedTime = new Date(log.bedTime!);
                          const wakeTime = new Date(log.wakeTime!);

                          // Validate dates
                          if (isNaN(bedTime.getTime()) || isNaN(wakeTime.getTime())) {
                            return sum; // Skip invalid dates
                          }

                          // Calculate time in bed (in hours)
                          const timeInBed = (wakeTime.getTime() - bedTime.getTime()) / (1000 * 60 * 60);

                          // Skip if time in bed is invalid (negative or too large)
                          if (timeInBed <= 0 || timeInBed > 24) {
                            return sum;
                          }

                          const hoursSlept = parseFloat(log.hoursSlept.toString());
                          // Efficiency should never exceed 100% (can't sleep more than time in bed)
                          const efficiency = Math.min(100, (hoursSlept / timeInBed) * 100);

                          return sum + efficiency;
                        } catch (error) {
                          return sum; // Skip logs with parsing errors
                        }
                      }, 0) / logsWithTimes.length;

                      return isNaN(avgEfficiency) ? 'N/A' : `${avgEfficiency.toFixed(0)}%`;
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
                  <p className={`text-3xl font-bold ${currentStreak >= 7 ? 'text-green-400' : currentStreak >= 3 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {currentStreak}
                  </p>
                  <p className="text-xs text-white opacity-70 mt-1">
                    {currentStreak === 0 ? 'No current streak' : currentStreak === 1 ? 'consecutive day' : 'consecutive days'}
                  </p>
                </div>
                <Flame className={`h-8 w-8 ${currentStreak >= 7 ? 'text-orange-500' : currentStreak >= 3 ? 'text-yellow-400' : 'text-gray-400'}`} />
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
                  labelStyle={{ color: '#ffffff', fontWeight: 'bold', fontSize: '14px' }}
                  itemStyle={{ color: '#ffffff', fontWeight: 'bold', fontSize: '13px' }}
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
                    label={({ name, percent }: any) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
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
                    labelStyle={{ color: '#ffffff', fontWeight: 'bold', fontSize: '14px' }}
                    itemStyle={{ color: '#ffffff', fontWeight: 'bold', fontSize: '13px' }}
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
                    labelStyle={{ color: '#ffffff', fontWeight: 'bold', fontSize: '14px' }}
                    itemStyle={{ color: '#ffffff', fontWeight: 'bold', fontSize: '13px' }}
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

          {/* 5. Sleep Schedule Over Time (Days Since Surgery) */}
          {bedWakeScatterData.length > 0 && (
            <GlassCard>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-400" />
                Sleep Schedule Timeline
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={bedWakeScatterData}>
                  <defs>
                    <linearGradient id="bedTimeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.3}/>
                    </linearGradient>
                    <linearGradient id="wakeTimeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    stroke="#9ca3af"
                    tick={{ fill: '#d1d5db', fontSize: 10, fontWeight: 'bold' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    label={{ value: 'Date (Since Surgery)', position: 'insideBottom', offset: -15, fill: '#e5e7eb', fontSize: 13, fontWeight: 'bold' }}
                  />
                  <YAxis
                    domain={[0, 24]}
                    ticks={[0, 3, 6, 9, 12, 15, 18, 21, 24]}
                    tickFormatter={(value) => {
                      if (value === 0) return '12 AM';
                      if (value === 12) return '12 PM';
                      if (value < 12) return `${value} AM`;
                      return `${value - 12} PM`;
                    }}
                    stroke="#9ca3af"
                    tick={{ fill: '#d1d5db', fontSize: 11, fontWeight: 'bold' }}
                    label={{ value: 'Time of Day', angle: -90, position: 'insideLeft', fill: '#e5e7eb', fontSize: 13, fontWeight: 'bold' }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))',
                      border: '2px solid #60a5fa',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                      backdropFilter: 'blur(10px)',
                      padding: '12px'
                    }}
                    labelStyle={{ color: '#ffffff', fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}
                    labelFormatter={(value, payload) => {
                      if (payload && payload[0] && payload[0].payload) {
                        const data = payload[0].payload;
                        return `${data.fullDate} (Day ${data.day})`;
                      }
                      return value;
                    }}
                    formatter={(value: any, name: string) => {
                      const hour = Math.floor(value);
                      const minutes = Math.round((value - hour) * 60);
                      const timeStr = `${hour % 12 || 12}:${minutes.toString().padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;

                      const label = name === 'bedTime' ? '🌙 Bed Time' : '☀️ Wake Time';
                      return [timeStr, label];
                    }}
                    itemStyle={{ color: '#ffffff', fontWeight: 'bold', fontSize: '13px' }}
                  />
                  <Legend
                    wrapperStyle={{
                      color: '#fff',
                      fontWeight: 'bold',
                      paddingTop: '20px'
                    }}
                    iconType="line"
                    layout="horizontal"
                    align="center"
                    verticalAlign="bottom"
                    formatter={(value) => value === 'bedTime' ? '🌙 Bed Time' : '☀️ Wake Time'}
                  />
                  <Line
                    type="monotone"
                    dataKey="bedTime"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#a78bfa' }}
                    name="bedTime"
                  />
                  <Line
                    type="monotone"
                    dataKey="wakeTime"
                    stroke="#fbbf24"
                    strokeWidth={3}
                    dot={{ fill: '#fbbf24', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#fcd34d' }}
                    name="wakeTime"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="text-xs text-center text-white opacity-70 mt-2">
                {surgeryDate
                  ? `Showing ${
                      dateRange === 'daily' ? 'last 24 hours' :
                      dateRange === 'weekly' ? 'last 7 days' :
                      dateRange === 'monthly' ? 'last 30 days' :
                      'since surgery (max 90 days)'
                    } • X-axis: Calendar date • Y-axis: Time of day • Hover for day count since surgery`
                  : 'Set surgery date in profile to track days since surgery (currently showing days from first log)'}
              </div>
            </GlassCard>
          )}

          {/* 6. Sleep Streak Flame Meter */}
          <GlassCard>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Logging Streak
            </h3>
            <div className="flex flex-col items-center justify-center py-6">
              {/* Large Number Display */}
              <div className="flex items-center gap-4 mb-6">
                <Flame className={`h-16 w-16 ${
                  currentStreak >= 30 ? 'text-yellow-400 animate-bounce' :
                  currentStreak >= 14 ? 'text-orange-500 animate-pulse' :
                  currentStreak >= 7 ? 'text-red-500 animate-pulse' :
                  currentStreak >= 3 ? 'text-blue-400 animate-pulse' :
                  currentStreak >= 1 ? 'text-green-400 animate-pulse' :
                  'text-gray-400'
                }`} />
                <div className="text-center">
                  <div className={`text-6xl font-bold ${
                    currentStreak >= 30 ? 'text-yellow-300' :
                    currentStreak >= 14 ? 'text-orange-300' :
                    currentStreak >= 7 ? 'text-red-300' :
                    currentStreak >= 3 ? 'text-blue-300' :
                    currentStreak >= 1 ? 'text-green-300' :
                    'text-white'
                  }`}>{currentStreak}</div>
                  <div className="text-sm text-white opacity-90 font-semibold mt-1">
                    {currentStreak === 1 ? 'day streak' : 'days streak'}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-md">
                <div className="relative h-8 bg-gray-700/30 rounded-full overflow-hidden border-2 border-gray-600">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                      currentStreak >= 30 ? 'bg-gradient-to-r from-yellow-500 to-amber-600' :
                      currentStreak >= 14 ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                      currentStreak >= 7 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                      currentStreak >= 3 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                      currentStreak >= 1 ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                      'bg-gradient-to-r from-gray-500 to-gray-600'
                    }`}
                    style={{ width: `${Math.min((currentStreak / 30) * 100, 100)}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-bold text-xs drop-shadow-lg">
                      {currentStreak} / 30 days
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-white/60 mt-2 px-1">
                  <span>Start</span>
                  <span>Goal: 30 days</span>
                </div>
              </div>

              {/* Status Message */}
              <div className={`text-center text-lg font-bold mt-6 ${
                currentStreak >= 30 ? 'text-yellow-300' :
                currentStreak >= 14 ? 'text-orange-300' :
                currentStreak >= 7 ? 'text-red-300' :
                currentStreak >= 3 ? 'text-blue-300' :
                currentStreak >= 1 ? 'text-green-300' :
                'text-white opacity-70'
              }`}>
                {currentStreak >= 30 ? '🏆 MASTER LOGGER! 🏆' :
                 currentStreak >= 14 ? '🔥 ON FIRE! 🔥' :
                 currentStreak >= 7 ? '💪 KEEP GOING! 💪' :
                 currentStreak >= 3 ? '⭐ Getting Started!' :
                 currentStreak >= 1 ? '🌱 Building Momentum!' :
                 '📅 Start your streak!'}
              </div>
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
                          width: `${((day as any).bedHour / 24) * 100}%`,
                          background: 'linear-gradient(90deg, rgba(107, 114, 128, 0.3), rgba(75, 85, 99, 0.3))'
                        }}></div>
                        {/* Sleep period */}
                        <div style={{
                          width: `${((day as any).sleepDuration / 24) * 100}%`,
                          background: day.quality === 'excellent' ? 'linear-gradient(90deg, #10b981, #059669)' :
                                     day.quality === 'good' ? 'linear-gradient(90deg, #3b82f6, #1e40af)' :
                                     day.quality === 'fair' ? 'linear-gradient(90deg, #fbbf24, #d97706)' :
                                     'linear-gradient(90deg, #ef4444, #b91c1c)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }} className="flex items-center justify-center">
                          <span className="text-xs font-bold text-white">{(day as any).hours}h</span>
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
                    <div className={`${(level as any).gradient} rounded-lg shadow-lg border-2 ${(level as any).border} flex items-center justify-center`}
                         style={{
                           height: `${height}px`,
                           boxShadow: `0 4px 16px ${level.color}40, inset 0 2px 8px rgba(255,255,255,0.1)`
                         }}>
                      <div className="text-center">
                        <div className="text-xl font-bold text-white">{level.count}</div>
                        <div className="text-xs text-white opacity-90">{(level as any).label}</div>
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

          {/* 9. Dream Quality Visualization - 5D Glass Morphic */}
          <GlassCard>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              Dream Journal Analytics
            </h3>

            {totalDreamsLogged > 0 ? (
              <div className="space-y-6">
                {/* Mystical Dream Orbs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {dreamData.map((dream, index) => (
                    <div key={dream.quality} className="relative group">
                      <div className={`absolute inset-0 bg-gradient-to-r ${dream.gradient} opacity-20 blur-xl ${dream.glow} group-hover:opacity-40 transition-all duration-500`}></div>
                      <div className={`relative glass rounded-2xl p-4 border-2 border-opacity-50 hover:scale-105 transition-transform duration-300`} style={{ borderColor: dream.color }}>
                        <div className="text-center">
                          <div className="text-4xl mb-2 animate-pulse">{dream.emoji}</div>
                          <div className="text-2xl font-bold text-white mb-1">{dream.count}</div>
                          <div className="text-xs text-gray-300 mb-1">{dream.quality}</div>
                          <div className={`text-xs font-semibold`} style={{ color: dream.color }}>
                            {dream.points} pts each
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 5D Radial Dream Wave */}
                <div className="relative h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="20%"
                      outerRadius="90%"
                      data={dreamData.map((d, i) => ({
                        ...d,
                        fill: d.color,
                        value: (d.count / totalDreamsLogged) * 100
                      }))}
                      startAngle={180}
                      endAngle={-180}
                    >
                      <RadialBar
                        minAngle={15}
                        background={{ fill: '#1f2937' }}
                        clockWise
                        dataKey="value"
                        cornerRadius={10}
                      />
                      <Legend
                        iconSize={10}
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        content={({ payload }) => (
                          <div className="space-y-2">
                            {payload?.map((entry: any, index: number) => (
                              <div key={index} className="flex items-center gap-2 text-xs">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                <span className="text-white">{entry.payload.quality}</span>
                                <span className="text-gray-400">({entry.payload.count})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Moon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Start logging your dreams to see analytics</p>
              </div>
            )}
          </GlassCard>
        </>
      )}

      {/* Monthly Heatmap - Sleep or Dreams */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-400" />
            Monthly {heatmapMode === 'sleep' ? 'Sleep' : 'Dream'} Heatmap
          </h3>
          {/* Toggle Button */}
          <div className="flex gap-2">
            <button
              onClick={() => setHeatmapMode('sleep')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                heatmapMode === 'sleep'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-500/50'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Moon className="h-4 w-4 inline mr-2" />
              Sleep Hours
            </button>
            <button
              onClick={() => setHeatmapMode('dreams')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                heatmapMode === 'dreams'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/50'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Sparkles className="h-4 w-4 inline mr-2" />
              Dream Quality
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {(heatmapMode === 'sleep' ? heatmapSleepData : heatmapDreamData).map((day) => {
            let bgColor, opacity, tooltip, displayValue;

            if (heatmapMode === 'sleep') {
              const hours = day.hours || 0;
              bgColor = hours === null ? 'bg-gray-800' :
                        hours < 4 ? 'bg-gradient-to-br from-red-500 to-red-700' :
                        hours < 6 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                        hours < 7 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                        hours < 9 ? 'bg-gradient-to-br from-blue-400 to-blue-600' :
                        'bg-gradient-to-br from-green-400 to-green-600';
              opacity = hours === null ? 0.2 : 1;
              tooltip = day.hours ? `${day.date}: ${day.hours}h (${day.quality || 'N/A'})` : day.date;
              displayValue = day.hours ? `${day.hours}h` : null;
            } else {
              // Dream mode
              const dreamQuality = day.dreamQuality;
              bgColor = !dreamQuality ? 'bg-gray-800' :
                        dreamQuality === 'nightmare' ? 'bg-gradient-to-br from-red-500 to-red-700' :
                        dreamQuality === 'cannot_remember' ? 'bg-gradient-to-br from-yellow-500 to-orange-500' :
                        dreamQuality === 'sporadic' ? 'bg-gradient-to-br from-blue-500 to-cyan-600' :
                        'bg-gradient-to-br from-green-500 to-emerald-600';
              opacity = !dreamQuality ? 0.2 : 1;
              const dreamLabels = {
                nightmare: '😱',
                cannot_remember: '💭',
                sporadic: '🌙',
                vivid_positive: '✨'
              };
              tooltip = dreamQuality ? `${day.date}: ${dreamQuality.replace('_', ' ')}` : day.date;
              displayValue = dreamQuality ? dreamLabels[dreamQuality] : null;
            }

            return (
              <div key={day.day}
                   className={`${bgColor} rounded-lg p-2 text-center transition-all duration-300 hover:scale-110 hover:shadow-lg`}
                   style={{ opacity }}
                   title={tooltip}>
                <div className="text-xs font-bold text-white opacity-70">{day.dayOfWeek}</div>
                <div className="text-lg font-bold text-white">{day.day}</div>
                {displayValue && <div className="text-xs text-white opacity-90">{displayValue}</div>}
              </div>
            );
          })}
        </div>

        {/* Legend - switches based on mode */}
        {heatmapMode === 'sleep' ? (
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
        ) : (
          <div className="flex justify-between items-center mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-red-500 to-red-700"></div>
              <span className="text-white opacity-70">😱 Nightmare</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-yellow-500 to-orange-500"></div>
              <span className="text-white opacity-70">💭 Can't Remember</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-500 to-cyan-600"></div>
              <span className="text-white opacity-70">🌙 Sporadic</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-green-500 to-emerald-600"></div>
              <span className="text-white opacity-70">✨ Vivid & Positive</span>
            </div>
          </div>
        )}
      </GlassCard>

      {/* ==================== SAMSUNG SLEEP TRACKING VISUALIZATIONS (Features 1-4) ==================== */}

      {/* FEATURE 1: Sleep Stages Stacked Bar Chart & Pie Chart */}
      {sleepStagesChartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stacked Bar Chart */}
          <GlassCard>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-400" />
              Sleep Stages Breakdown
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={sleepStagesChartData}>
                <defs>
                  <linearGradient id="awakeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fca5a5" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={1}/>
                  </linearGradient>
                  <linearGradient id="lightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#93c5fd" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={1}/>
                  </linearGradient>
                  <linearGradient id="deepGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c084fc" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1}/>
                  </linearGradient>
                  <linearGradient id="remGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6ee7b7" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity={1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  stroke="#9ca3af"
                  tick={{ fill: '#d1d5db', fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  stroke="#9ca3af"
                  tick={{ fill: '#d1d5db', fontSize: 12 }}
                  label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fill: '#d1d5db' }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(31, 41, 55, 0.95)',
                    border: '2px solid #8b5cf6',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  }}
                  labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                  itemStyle={{ color: '#ffffff' }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ color: '#ffffff' }}
                />
                <Bar dataKey="awake" stackId="a" fill="url(#awakeGradient)" name="Awake" radius={[0, 0, 0, 0]} />
                <Bar dataKey="light" stackId="a" fill="url(#lightGradient)" name="Light Sleep" radius={[0, 0, 0, 0]} />
                <Bar dataKey="deep" stackId="a" fill="url(#deepGradient)" name="Deep Sleep" radius={[0, 0, 0, 0]} />
                <Bar dataKey="rem" stackId="a" fill="url(#remGradient)" name="REM Sleep" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="text-xs text-center text-white opacity-70 mt-3">
              Last {sleepStagesChartData.length} nights with Samsung Watch data
            </div>
          </GlassCard>

          {/* Pie Chart - Average Distribution */}
          <GlassCard>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Moon className="h-5 w-5 text-purple-400" />
              Average Sleep Stages Distribution
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Awake', value: avgSleepStages.awake, fill: '#ef4444' },
                    { name: 'Light Sleep', value: avgSleepStages.light, fill: '#3b82f6' },
                    { name: 'Deep Sleep', value: avgSleepStages.deep, fill: '#8b5cf6' },
                    { name: 'REM Sleep', value: avgSleepStages.rem, fill: '#10b981' },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { fill: '#ef4444' },
                    { fill: '#3b82f6' },
                    { fill: '#8b5cf6' },
                    { fill: '#10b981' },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(31, 41, 55, 0.95)',
                    border: '2px solid #8b5cf6',
                    borderRadius: '12px',
                  }}
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
              <div className="text-white opacity-90">
                <span className="font-semibold text-purple-400">Ideal Deep:</span> 15-25%
                <br />
                <span className="font-semibold text-green-400">Ideal REM:</span> 20-25%
              </div>
              <div className="text-white opacity-90">
                <span className="font-semibold text-blue-400">Your Deep:</span> {avgSleepStages.deep.toFixed(1)}%
                <br />
                <span className="font-semibold text-green-400">Your REM:</span> {avgSleepStages.rem.toFixed(1)}%
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* FEATURE 2 & 3: Sleep Efficiency Gauge & Consistency Score */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FEATURE 2: Sleep Efficiency Circular Gauge */}
        {sleepEfficiencyData.length > 0 && (
          <GlassCard>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-cyan-400" />
              Sleep Efficiency
            </h3>
            <div className="flex flex-col items-center justify-center py-6">
              <div className="relative" style={{ width: 200, height: 200 }}>
                <svg className="transform -rotate-90" width="200" height="200">
                  <defs>
                    <linearGradient id="efficiencyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={latestSleepEfficiency < 70 ? '#ef4444' : latestSleepEfficiency < 85 ? '#f59e0b' : '#10b981'} />
                      <stop offset="100%" stopColor={latestSleepEfficiency < 70 ? '#b91c1c' : latestSleepEfficiency < 85 ? '#d97706' : '#059669'} />
                    </linearGradient>
                  </defs>
                  {/* Background circle */}
                  <circle
                    cx="100"
                    cy="100"
                    r="85"
                    stroke="#374151"
                    strokeWidth="16"
                    fill="none"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="100"
                    cy="100"
                    r="85"
                    stroke="url(#efficiencyGradient)"
                    strokeWidth="16"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 85}`}
                    strokeDashoffset={`${2 * Math.PI * 85 * (1 - latestSleepEfficiency / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className={`text-5xl font-bold ${
                    latestSleepEfficiency >= 85 ? 'text-green-400' :
                    latestSleepEfficiency >= 70 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {latestSleepEfficiency.toFixed(1)}%
                  </div>
                  <div className="text-sm text-white opacity-70 mt-1">Latest Night</div>
                </div>
              </div>
              <div className="mt-6 text-center">
                <div className="text-sm text-white opacity-90 mb-2">
                  30-Day Average: <span className="font-bold text-cyan-400">{avgSleepEfficiency.toFixed(1)}%</span>
                </div>
                <div className="text-xs text-white opacity-70">
                  Target: <span className="font-semibold text-green-400">&gt;85%</span> |
                  Formula: (Time Asleep / Time in Bed) × 100
                </div>
              </div>
              {/* Status Badge */}
              <div className={`mt-4 px-4 py-2 rounded-lg font-semibold ${
                latestSleepEfficiency >= 85 ? 'bg-green-500/20 text-green-400' :
                latestSleepEfficiency >= 70 ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {latestSleepEfficiency >= 85 ? '✓ Excellent Efficiency' :
                 latestSleepEfficiency >= 70 ? '○ Good Efficiency' :
                 '⚠ Needs Improvement'}
              </div>
            </div>
          </GlassCard>
        )}

        {/* FEATURE 3: Sleep Consistency Score */}
        {sleepConsistencyData.length >= 3 && (
          <GlassCard>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-400" />
              Sleep Consistency Score
            </h3>
            <div className="flex flex-col items-center justify-center py-6">
              <div className="relative" style={{ width: 200, height: 200 }}>
                <svg className="transform -rotate-90" width="200" height="200">
                  <defs>
                    <linearGradient id="consistencyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={consistencyScore < 60 ? '#ef4444' : consistencyScore < 80 ? '#f59e0b' : '#10b981'} />
                      <stop offset="100%" stopColor={consistencyScore < 60 ? '#b91c1c' : consistencyScore < 80 ? '#d97706' : '#059669'} />
                    </linearGradient>
                  </defs>
                  {/* Background circle */}
                  <circle
                    cx="100"
                    cy="100"
                    r="85"
                    stroke="#374151"
                    strokeWidth="16"
                    fill="none"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="100"
                    cy="100"
                    r="85"
                    stroke="url(#consistencyGradient)"
                    strokeWidth="16"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 85}`}
                    strokeDashoffset={`${2 * Math.PI * 85 * (1 - consistencyScore / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className={`text-5xl font-bold ${
                    consistencyScore >= 80 ? 'text-green-400' :
                    consistencyScore >= 60 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {consistencyScore}
                  </div>
                  <div className="text-sm text-white opacity-70 mt-1">out of 100</div>
                </div>
              </div>
              <div className="mt-6 text-center">
                <div className="text-sm text-white opacity-90 mb-2">
                  Based on {sleepConsistencyData.length} nights
                </div>
                <div className="text-xs text-white opacity-70">
                  Measures bedtime & wake time regularity
                </div>
              </div>
              {/* Status Badge */}
              <div className={`mt-4 px-4 py-2 rounded-lg font-semibold ${
                consistencyScore >= 80 ? 'bg-green-500/20 text-green-400' :
                consistencyScore >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {consistencyScore >= 80 ? '✓ Very Consistent' :
                 consistencyScore >= 60 ? '○ Moderately Consistent' :
                 '⚠ Inconsistent Schedule'}
              </div>
            </div>
          </GlassCard>
        )}
      </div>

      {/* FEATURE 4: Nap Impact Analysis */}
      {napLogs.length > 0 && napImpactData[0].count > 0 && napImpactData[1].count > 0 && (
        <GlassCard>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Sun className="h-5 w-5 text-yellow-400" />
            Nap Impact Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={napImpactData}>
                  <defs>
                    <linearGradient id="napBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={1}/>
                    </linearGradient>
                    <linearGradient id="noNapBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis
                    dataKey="category"
                    stroke="#9ca3af"
                    tick={{ fill: '#d1d5db', fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    tick={{ fill: '#d1d5db', fontSize: 12 }}
                    label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: '#d1d5db' }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(31, 41, 55, 0.95)',
                      border: '2px solid #f59e0b',
                      borderRadius: '12px',
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value.toFixed(1)}h (${props.payload.count} nights)`,
                      'Avg Sleep'
                    ]}
                  />
                  <Bar
                    dataKey="hours"
                    name="Average Hours"
                    radius={[8, 8, 0, 0]}
                  >
                    {napImpactData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? 'url(#napBarGradient)' : 'url(#noNapBarGradient)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Summary Stats */}
            <div className="flex flex-col justify-center space-y-4">
              <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg p-4 border border-yellow-400/30">
                <div className="flex items-center gap-2 mb-2">
                  <Sun className="h-5 w-5 text-yellow-400" />
                  <h4 className="text-white font-semibold">After Napping</h4>
                </div>
                <div className="text-3xl font-bold text-yellow-400 mb-1">
                  {avgHoursAfterNaps.toFixed(1)}h
                </div>
                <div className="text-sm text-white opacity-70">
                  Average nighttime sleep ({nightsAfterNaps.length} nights)
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg p-4 border border-blue-400/30">
                <div className="flex items-center gap-2 mb-2">
                  <Moon className="h-5 w-5 text-blue-400" />
                  <h4 className="text-white font-semibold">Without Naps</h4>
                </div>
                <div className="text-3xl font-bold text-blue-400 mb-1">
                  {avgHoursWithoutNaps.toFixed(1)}h
                </div>
                <div className="text-sm text-white opacity-70">
                  Average nighttime sleep ({nightsWithoutNaps.length} nights)
                </div>
              </div>

              {/* Impact Analysis */}
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg p-4 border border-purple-400/30">
                <h4 className="text-white font-semibold mb-2">Impact:</h4>
                <div className="text-2xl font-bold text-white mb-1">
                  {avgHoursAfterNaps > avgHoursWithoutNaps ? '▼' : '▲'}
                  {' '}
                  {Math.abs(avgHoursAfterNaps - avgHoursWithoutNaps).toFixed(1)}h
                </div>
                <div className="text-sm text-white opacity-70">
                  {avgHoursAfterNaps > avgHoursWithoutNaps
                    ? 'Naps associated with more nighttime sleep'
                    : 'Naps associated with less nighttime sleep'}
                </div>
              </div>

              <div className="text-xs text-white opacity-60 text-center mt-2">
                Total naps logged: {napLogs.length}
              </div>
            </div>
          </div>
        </GlassCard>
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

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              🌙 Dream Quality
            </label>
            <select
              {...register('dreamQuality')}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select dream quality</option>
              <option value="nightmare">🔴 Nightmares (0 pts)</option>
              <option value="cannot_remember">🟡 Can't Remember (1 pt)</option>
              <option value="sporadic">🔵 Sporadic/Forgot (2 pts)</option>
              <option value="vivid_positive">🟢 Vivid & Positive (3 pts)</option>
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

          {/* Sleep Environment Tracking */}
          <div className="border-t border-gray-700 pt-4 mt-2">
            <h4 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
              🌡️ Sleep Environment
            </h4>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Room Temp (°F)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="50"
                  max="90"
                  placeholder="60-67°F ideal"
                  {...register('roomTemperature', { valueAsNumber: true })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Noise Level (1-10)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  placeholder="1=silent"
                  {...register('noiseLevel', { valueAsNumber: true })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Light Level (1-10)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  placeholder="1=dark"
                  {...register('lightLevel', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Bedtime Routine
              </label>
              <Input
                type="text"
                placeholder="e.g., meditation, reading, screen time"
                {...register('bedtimeRoutine')}
              />
            </div>
          </div>

          {/* Additional Quality Indicators */}
          <div className="border-t border-gray-700 pt-4 mt-2">
            <h4 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
              ✨ Sleep Quality Details
            </h4>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Times Woke Up
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  {...register('sleepInterruptions', { valueAsNumber: true })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Restfulness (1-10)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  placeholder="1=exhausted"
                  {...register('restfulness', { valueAsNumber: true })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Morning Mood
                </label>
                <select
                  {...register('morningMood')}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select mood</option>
                  <option value="terrible">😞 Terrible</option>
                  <option value="poor">😕 Poor</option>
                  <option value="okay">😐 Okay</option>
                  <option value="good">🙂 Good</option>
                  <option value="excellent">😊 Excellent</option>
                </select>
              </div>
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

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Dream Journal
            </label>
            <textarea
              {...register('dreamNotes')}
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe your dreams..."
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
