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
  BarChart3
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import { SleepLog, CreateSleepLogInput, SleepStats } from '../types';
import toast from 'react-hot-toast';
import { format, subDays, parseISO } from 'date-fns';

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
  }, [dateRange]);

  const loadSleepLogs = async () => {
    try {
      setIsLoading(true);
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      const data = await api.getSleepLogs({
        startDate,
        endDate,
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

      const data = await api.getSleepStats(startDate, endDate);
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
        const newLog = await api.createSleepLog(data);
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

  const chartData = sleepLogs
    .slice()
    .reverse()
    .map(log => ({
      date: format(parseISO(log.date), 'MMM d'),
      hours: parseFloat(log.hoursSlept.toString()),
    }));

  const qualityData = stats ? [
    { name: 'Excellent', value: stats.qualityDistribution.excellent, color: '#10b981' },
    { name: 'Good', value: stats.qualityDistribution.good, color: '#3b82f6' },
    { name: 'Fair', value: stats.qualityDistribution.fair, color: '#f59e0b' },
    { name: 'Poor', value: stats.qualityDistribution.poor, color: '#ef4444' },
  ].filter(item => item.value > 0) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Sleep Journal</h1>
        <Button onClick={handleOpenModal}>
          <Plus className="h-5 w-5 mr-2" />
          Log Sleep
        </Button>
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
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" domain={[0, 12]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorHours)"
                  name="Hours"
                />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>

          {qualityData.length > 0 && (
            <GlassCard>
              <h3 className="text-lg font-semibold text-white mb-4">Sleep Quality Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={qualityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {qualityData.map((entry, index) => (
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
