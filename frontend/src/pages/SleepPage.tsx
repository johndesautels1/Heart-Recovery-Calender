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
  User
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
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
      const userId = isViewingAsTherapist && selectedPatient?.userId ? selectedPatient.userId : undefined;

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
      const userId = isViewingAsTherapist && selectedPatient?.userId ? selectedPatient.userId : undefined;

      const data = await api.getSleepStats(startDate, endDate, userId);
      setStats(data);
    } catch (error) {
      console.error('Failed to load sleep stats:', error);
    }
  };

  const onSubmit = async (data: SleepFormData) => {
    try {
      setIsLoading(true);

      if (editingLog) {
        const updated = await api.updateSleepLog(editingLog.id, data);
        setSleepLogs(sleepLogs.map(log => log.id === editingLog.id ? updated : log));
        toast.success('Sleep log updated successfully');
      } else {
        const newLogData = {
          ...data,
          // Include userId if therapist is adding for a selected patient
          ...(isViewingAsTherapist && selectedPatient?.userId && { userId: selectedPatient.userId })
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
    setValue('bedTime', log.bedTime || '');
    setValue('wakeTime', log.wakeTime || '');
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div>
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
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" domain={[0, 12]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="hours" name="Hours" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

          {hoursCategoryData.length > 0 && (
            <GlassCard>
              <h3 className="text-lg font-semibold text-white mb-4">Sleep Hours Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={hoursCategoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {hoursCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    labelStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </GlassCard>
          )}
        </div>
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
                    {log.bedTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Bed: {format(parseISO(log.bedTime), 'h:mm a')}
                      </span>
                    )}
                    {log.wakeTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Wake: {format(parseISO(log.wakeTime), 'h:mm a')}
                      </span>
                    )}
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
