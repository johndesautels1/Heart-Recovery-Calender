import React, { useState, useEffect } from 'react';
import { GlassCard, Button, Modal, Input } from '../components/ui';
import { 
  Activity, 
  Heart, 
  Plus, 
  TrendingUp, 
  Droplet,
  Thermometer,
  Wind,
  Weight,
  Calendar
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import { VitalsSample, CreateVitalsInput } from '../types';
import toast from 'react-hot-toast';
import { format, subDays } from 'date-fns';

const vitalsSchema = z.object({
  bloodPressureSystolic: z.number().optional(),
  bloodPressureDiastolic: z.number().optional(),
  heartRate: z.number().optional(),
  weight: z.number().optional(),
  temperature: z.number().optional(),
  oxygenSaturation: z.number().optional(),
  bloodSugar: z.number().optional(),
  hydrationStatus: z.number().optional(),
  notes: z.string().optional(),
  symptoms: z.string().optional(),
  medicationsTaken: z.boolean().optional(),
});

type VitalsFormData = z.infer<typeof vitalsSchema>;

export function VitalsPage() {
  const [vitals, setVitals] = useState<VitalsSample[]>([]);
  const [latestVitals, setLatestVitals] = useState<VitalsSample | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'bp' | 'hr' | 'weight' | 'sugar' | 'temp' | 'hydration' | 'o2'>('bp');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VitalsFormData>({
    resolver: zodResolver(vitalsSchema),
    defaultValues: {
      medicationsTaken: true,
    },
  });

  useEffect(() => {
    loadVitals();
  }, [dateRange]);

  const loadVitals = async () => {
    try {
      setIsLoading(true);
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const startDate = subDays(new Date(), days).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      
      const [vitalsData, latest] = await Promise.all([
        api.getVitals(startDate, endDate),
        api.getLatestVital(),
      ]);
      
      setVitals(vitalsData.reverse()); // Show oldest first for charts
      setLatestVitals(latest);
    } catch (error) {
      console.error('Failed to load vitals:', error);
      toast.error('Failed to load vitals data');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: VitalsFormData) => {
    try {
      setIsLoading(true);
      const newVital = await api.createVital({
        ...data,
        timestamp: new Date().toISOString(),
        source: 'manual',
      } as CreateVitalsInput);
      
      setVitals([...vitals, newVital]);
      setLatestVitals(newVital);
      toast.success('Vitals recorded successfully');
      setIsModalOpen(false);
      reset();
    } catch (error) {
      console.error('Failed to record vitals:', error);
      toast.error('Failed to record vitals');
    } finally {
      setIsLoading(false);
    }
  };

  const getBloodPressureStatus = (systolic?: number, diastolic?: number) => {
    if (!systolic || !diastolic) return { status: 'Unknown', className: 'text-yellow-500' };
    if (systolic < 120 && diastolic < 80) return { status: 'Normal', className: 'text-green-500' };
    if (systolic < 130 && diastolic < 80) return { status: 'Elevated', className: 'text-yellow-500' };
    if (systolic < 140 || diastolic < 90) return { status: 'Stage 1 Hypertension', className: 'text-yellow-500' };
    return { status: 'Stage 2 Hypertension', className: 'text-red-500' };
  };

  const chartData = vitals.map(v => ({
    date: format(new Date(v.timestamp), 'MMM d'),
    systolic: v.bloodPressureSystolic,
    diastolic: v.bloodPressureDiastolic,
    heartRate: v.heartRate,
    weight: v.weight,
    bloodSugar: v.bloodSugar,
    temperature: v.temperature,
    hydration: v.hydrationStatus,
    o2: v.oxygenSaturation,
  }));

  const bpStatus = getBloodPressureStatus(
    latestVitals?.bloodPressureSystolic,
    latestVitals?.bloodPressureDiastolic
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-bold">Vitals Tracking</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-5 w-5 mr-2" />
          Record Vitals
        </Button>
      </div>

      {/* NEW: Last Vital Check Banner */}
      {latestVitals && (
        <div className="glass rounded-xl p-4 border-l-4" style={{ borderColor: 'var(--accent)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5" style={{ color: 'var(--accent)' }} />
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
                  Last Vital Check
                </p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {format(new Date(latestVitals.timestamp), 'MMMM d, yyyy')} at {format(new Date(latestVitals.timestamp), 'h:mm a')}
                </p>
              </div>
            </div>
            <div className="text-xs font-bold px-3 py-1 rounded-full" style={{
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              color: 'var(--accent)'
            }}>
              {(() => {
                const hoursSince = (new Date().getTime() - new Date(latestVitals.timestamp).getTime()) / (1000 * 60 * 60);
                if (hoursSince < 24) return `${Math.round(hoursSince)}h ago`;
                return `${Math.round(hoursSince / 24)}d ago`;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Latest Vitals Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1">Blood Pressure</p>
              <p className="text-2xl font-bold font-bold">
                {latestVitals?.bloodPressureSystolic || '--'}/
                {latestVitals?.bloodPressureDiastolic || '--'}
              </p>
              <p className={`text-sm font-bold mt-1 ${bpStatus.className}`}>{bpStatus.status}</p>
              <p className="text-xs mt-1">Normal: &lt;120/80</p>
            </div>
            <Heart className="h-8 w-8 text-red-500" />
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1">Heart Rate</p>
              <p className="text-2xl font-bold font-bold">
                {latestVitals?.heartRate || '--'} <span className="text-sm">bpm</span>
              </p>
              <p className={`text-sm font-bold mt-1 ${
                !latestVitals?.heartRate
                  ? 'text-yellow-500'
                  : latestVitals.heartRate < 60 || latestVitals.heartRate > 100
                  ? 'text-red-500'
                  : 'text-white'
              }`}>
                {!latestVitals?.heartRate
                  ? 'Unknown'
                  : latestVitals.heartRate < 60
                  ? 'Low'
                  : latestVitals.heartRate > 100
                  ? 'High'
                  : 'Normal'}
              </p>
              <p className="text-xs mt-1">Normal: 60-100</p>
            </div>
            <Activity className="h-8 w-8 text-red-500" />
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1">Temperature</p>
              <p className="text-2xl font-bold font-bold">
                {latestVitals?.temperature ? `${latestVitals.temperature.toFixed(1)}` : '--'} <span className="text-sm">°F</span>
              </p>
              <p className={`text-sm font-bold mt-1 ${
                !latestVitals?.temperature
                  ? 'text-yellow-500'
                  : latestVitals.temperature < 97.0 || latestVitals.temperature > 99.0
                  ? 'text-red-500'
                  : 'text-white'
              }`}>
                {!latestVitals?.temperature
                  ? 'Unknown'
                  : latestVitals.temperature < 97.0
                  ? 'Low'
                  : latestVitals.temperature > 99.0
                  ? 'High'
                  : 'Normal'}
              </p>
              <p className="text-xs mt-1">Normal: 97-99°F</p>
            </div>
            <Thermometer className="h-8 w-8 text-orange-500" />
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1">Weight</p>
              <p className="text-2xl font-bold font-bold">
                {latestVitals?.weight || '--'} <span className="text-sm">lbs</span>
              </p>
              <p className={`text-sm font-bold mt-1 ${!latestVitals?.weight ? 'text-yellow-500' : 'text-white'}`}>
                {!latestVitals?.weight ? 'Unknown' : 'Recorded'}
              </p>
              <p className="text-xs mt-1">Track trends</p>
            </div>
            <Weight className="h-8 w-8 text-blue-500" />
          </div>
        </GlassCard>

        {/* NEW: Weekly Weight Change */}
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1">Weekly Weight Change</p>
              <p className="text-2xl font-bold font-bold">
                {(() => {
                  if (!latestVitals?.weight || vitals.length < 2) return '--';
                  const sevenDaysAgo = subDays(new Date(), 7);
                  const oldWeights = vitals.filter(v => v.weight && new Date(v.timestamp) <= sevenDaysAgo);
                  if (oldWeights.length === 0) return '--';
                  const oldWeight = oldWeights[oldWeights.length - 1].weight!;
                  const change = latestVitals.weight - oldWeight;
                  return `${change > 0 ? '+' : ''}${change.toFixed(1)}`;
                })()} <span className="text-sm">lbs</span>
              </p>
              <p className={`text-sm font-bold mt-1 ${(() => {
                if (!latestVitals?.weight || vitals.length < 2) return 'text-yellow-500';
                const sevenDaysAgo = subDays(new Date(), 7);
                const oldWeights = vitals.filter(v => v.weight && new Date(v.timestamp) <= sevenDaysAgo);
                if (oldWeights.length === 0) return 'text-yellow-500';
                const oldWeight = oldWeights[oldWeights.length - 1].weight!;
                const change = latestVitals.weight - oldWeight;
                return Math.abs(change) < 0.5 ? 'text-white' : change > 0 ? 'text-yellow-500' : 'text-green-500';
              })()}`}>
                {(() => {
                  if (!latestVitals?.weight || vitals.length < 2) return 'Not enough data';
                  const sevenDaysAgo = subDays(new Date(), 7);
                  const oldWeights = vitals.filter(v => v.weight && new Date(v.timestamp) <= sevenDaysAgo);
                  if (oldWeights.length === 0) return 'Not enough data';
                  const oldWeight = oldWeights[oldWeights.length - 1].weight!;
                  const change = latestVitals.weight - oldWeight;
                  return Math.abs(change) < 0.5 ? 'Stable' : change > 0 ? 'Gained' : 'Lost';
                })()}
              </p>
              <p className="text-xs mt-1">Last 7 days</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1">Blood Sugar</p>
              <p className="text-2xl font-bold font-bold">
                {latestVitals?.bloodSugar || '--'} <span className="text-sm">mg/dL</span>
              </p>
              <p className={`text-sm font-bold mt-1 ${
                !latestVitals?.bloodSugar
                  ? 'text-yellow-500'
                  : latestVitals.bloodSugar >= 126 || latestVitals.bloodSugar < 60
                  ? 'text-red-500'
                  : latestVitals.bloodSugar >= 100
                  ? 'text-yellow-500'
                  : 'text-white'
              }`}>
                {!latestVitals?.bloodSugar
                  ? 'Unknown'
                  : latestVitals.bloodSugar < 100
                  ? 'Normal'
                  : latestVitals.bloodSugar < 126
                  ? 'Pre-diabetic'
                  : 'High'}
              </p>
              <p className="text-xs mt-1">Normal: 70-100</p>
            </div>
            <Droplet className="h-8 w-8 text-red-500" />
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1">Hydration</p>
              <p className="text-2xl font-bold font-bold">
                {latestVitals?.hydrationStatus || '--'} <span className="text-sm">%</span>
              </p>
              <p className={`text-sm font-bold mt-1 ${
                !latestVitals?.hydrationStatus
                  ? 'text-yellow-500'
                  : latestVitals.hydrationStatus < 50
                  ? 'text-red-500'
                  : latestVitals.hydrationStatus < 70
                  ? 'text-yellow-500'
                  : 'text-white'
              }`}>
                {!latestVitals?.hydrationStatus
                  ? 'Unknown'
                  : latestVitals.hydrationStatus < 50
                  ? 'Dehydrated'
                  : latestVitals.hydrationStatus < 70
                  ? 'Low'
                  : 'Good'}
              </p>
              <p className="text-xs mt-1">Target: 70-100%</p>
            </div>
            <Droplet className="h-8 w-8 text-blue-500" />
          </div>
        </GlassCard>

        {/* NEW: Oxygen Saturation */}
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1">O₂ Saturation</p>
              <p className="text-2xl font-bold font-bold">
                {latestVitals?.oxygenSaturation || '--'} <span className="text-sm">%</span>
              </p>
              <p className={`text-sm font-bold mt-1 ${
                !latestVitals?.oxygenSaturation
                  ? 'text-yellow-500'
                  : latestVitals.oxygenSaturation < 90
                  ? 'text-red-500'
                  : latestVitals.oxygenSaturation < 95
                  ? 'text-yellow-500'
                  : 'text-white'
              }`}>
                {!latestVitals?.oxygenSaturation
                  ? 'Unknown'
                  : latestVitals.oxygenSaturation < 90
                  ? 'Critical'
                  : latestVitals.oxygenSaturation < 95
                  ? 'Low'
                  : 'Normal'}
              </p>
              <p className="text-xs mt-1">Normal: 95-100%</p>
            </div>
            <Wind className="h-8 w-8 text-cyan-500" />
          </div>
        </GlassCard>
      </div>

      {/* NEW: 7-Day Average Heart Rate */}
      {vitals.length > 0 && (
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1">7-Day Average Heart Rate</p>
              <p className="text-3xl font-bold font-bold">
                {(() => {
                  const recentVitals = vitals.slice(-7);
                  const validHRs = recentVitals.filter(v => v.heartRate);
                  if (validHRs.length === 0) return '--';
                  const avg = validHRs.reduce((sum, v) => sum + (v.heartRate || 0), 0) / validHRs.length;
                  return Math.round(avg);
                })()} <span className="text-sm">bpm</span>
              </p>
              <p className={`text-sm font-bold mt-1 ${(() => {
                const recentVitals = vitals.slice(-7);
                const validHRs = recentVitals.filter(v => v.heartRate);
                if (validHRs.length === 0) return 'text-yellow-500';
                const avg = validHRs.reduce((sum, v) => sum + (v.heartRate || 0), 0) / validHRs.length;
                return avg < 60 || avg > 100 ? 'text-red-500' : 'text-white';
              })()}`}>
                {(() => {
                  const recentVitals = vitals.slice(-7);
                  const validHRs = recentVitals.filter(v => v.heartRate);
                  if (validHRs.length === 0) return 'No data';
                  const avg = validHRs.reduce((sum, v) => sum + (v.heartRate || 0), 0) / validHRs.length;
                  if (avg < 60) return 'Below normal';
                  if (avg > 100) return 'Above normal';
                  return 'Normal range';
                })()}
              </p>
              <p className="text-xs mt-1">Last {(() => {
                const recentVitals = vitals.slice(-7);
                return recentVitals.filter(v => v.heartRate).length;
              })()} readings</p>
            </div>
            <Activity className="h-8 w-8 text-red-500" />
          </div>
        </GlassCard>
      )}

      {/* NEW: Blood Pressure Trend */}
      {vitals.length >= 7 && (
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold mb-1">Blood Pressure Trend</p>
              <p className={`text-3xl font-bold ${(() => {
                const recentVitals = vitals.slice(-7);
                const olderVitals = vitals.slice(-14, -7);
                const validRecent = recentVitals.filter(v => v.bloodPressureSystolic && v.bloodPressureDiastolic);
                const validOlder = olderVitals.filter(v => v.bloodPressureSystolic && v.bloodPressureDiastolic);
                if (validRecent.length === 0 || validOlder.length === 0) return 'text-white';
                const recentAvg = validRecent.reduce((sum, v) => sum + (v.bloodPressureSystolic || 0), 0) / validRecent.length;
                const olderAvg = validOlder.reduce((sum, v) => sum + (v.bloodPressureSystolic || 0), 0) / validOlder.length;
                const diff = recentAvg - olderAvg;
                return diff < -5 ? 'text-green-400' : diff > 5 ? 'text-red-400' : 'text-yellow-400';
              })()}`}>
                {(() => {
                  const recentVitals = vitals.slice(-7);
                  const olderVitals = vitals.slice(-14, -7);
                  const validRecent = recentVitals.filter(v => v.bloodPressureSystolic && v.bloodPressureDiastolic);
                  const validOlder = olderVitals.filter(v => v.bloodPressureSystolic && v.bloodPressureDiastolic);
                  if (validRecent.length === 0 || validOlder.length === 0) return 'No data';
                  const recentAvg = validRecent.reduce((sum, v) => sum + (v.bloodPressureSystolic || 0), 0) / validRecent.length;
                  const olderAvg = validOlder.reduce((sum, v) => sum + (v.bloodPressureSystolic || 0), 0) / validOlder.length;
                  const diff = recentAvg - olderAvg;
                  if (diff < -5) return 'Improving';
                  if (diff > 5) return 'Rising';
                  return 'Stable';
                })()}
              </p>
              <p className="text-xs mt-1">
                {(() => {
                  const recentVitals = vitals.slice(-7);
                  const olderVitals = vitals.slice(-14, -7);
                  const validRecent = recentVitals.filter(v => v.bloodPressureSystolic && v.bloodPressureDiastolic);
                  const validOlder = olderVitals.filter(v => v.bloodPressureSystolic && v.bloodPressureDiastolic);
                  if (validRecent.length === 0 || validOlder.length === 0) return 'Need more data';
                  const recentAvg = validRecent.reduce((sum, v) => sum + (v.bloodPressureSystolic || 0), 0) / validRecent.length;
                  const olderAvg = validOlder.reduce((sum, v) => sum + (v.bloodPressureSystolic || 0), 0) / validOlder.length;
                  const diff = recentAvg - olderAvg;
                  return `${diff > 0 ? '+' : ''}${diff.toFixed(0)} mmHg vs last week`;
                })()}
              </p>
            </div>
            <TrendingUp className={`h-8 w-8 ${(() => {
              const recentVitals = vitals.slice(-7);
              const olderVitals = vitals.slice(-14, -7);
              const validRecent = recentVitals.filter(v => v.bloodPressureSystolic && v.bloodPressureDiastolic);
              const validOlder = olderVitals.filter(v => v.bloodPressureSystolic && v.bloodPressureDiastolic);
              if (validRecent.length === 0 || validOlder.length === 0) return 'text-gray-500';
              const recentAvg = validRecent.reduce((sum, v) => sum + (v.bloodPressureSystolic || 0), 0) / validRecent.length;
              const olderAvg = validOlder.reduce((sum, v) => sum + (v.bloodPressureSystolic || 0), 0) / validOlder.length;
              const diff = recentAvg - olderAvg;
              return diff < -5 ? 'text-green-400' : diff > 5 ? 'text-red-400' : 'text-yellow-400';
            })()}`} />
          </div>
        </GlassCard>
      )}

      {/* Chart Controls */}
      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedMetric('bp')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedMetric === 'bp' 
                  ? 'bg-blue-500' 
                  : 'glass-button font-bold'
              }`}
            >
              Blood Pressure
            </button>
            <button
              onClick={() => setSelectedMetric('hr')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedMetric === 'hr' 
                  ? 'bg-red-500' 
                  : 'glass-button font-bold'
              }`}
            >
              Heart Rate
            </button>
            <button
              onClick={() => setSelectedMetric('weight')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedMetric === 'weight' 
                  ? 'bg-green-500' 
                  : 'glass-button font-bold'
              }`}
            >
              Weight
            </button>
            <button
              onClick={() => setSelectedMetric('sugar')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedMetric === 'sugar'
                  ? 'bg-orange-500'
                  : 'glass-button font-bold'
              }`}
            >
              Blood Sugar
            </button>
            <button
              onClick={() => setSelectedMetric('temp')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedMetric === 'temp'
                  ? 'bg-orange-600'
                  : 'glass-button font-bold'
              }`}
            >
              Temperature
            </button>
            <button
              onClick={() => setSelectedMetric('hydration')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedMetric === 'hydration'
                  ? 'bg-blue-600'
                  : 'glass-button font-bold'
              }`}
            >
              Hydration
            </button>
            <button
              onClick={() => setSelectedMetric('o2')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedMetric === 'o2'
                  ? 'bg-cyan-500'
                  : 'glass-button font-bold'
              }`}
            >
              O₂ Sat
            </button>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => setDateRange('7d')}
              className={`px-3 py-1 rounded-lg text-sm transition-all ${
                dateRange === '7d' 
                  ? 'bg-gray-700' 
                  : 'glass-button font-bold'
              }`}
            >
              7 days
            </button>
            <button
              onClick={() => setDateRange('30d')}
              className={`px-3 py-1 rounded-lg text-sm transition-all ${
                dateRange === '30d' 
                  ? 'bg-gray-700' 
                  : 'glass-button font-bold'
              }`}
            >
              30 days
            </button>
            <button
              onClick={() => setDateRange('90d')}
              className={`px-3 py-1 rounded-lg text-sm transition-all ${
                dateRange === '90d' 
                  ? 'bg-gray-700' 
                  : 'glass-button font-bold'
              }`}
            >
              90 days
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="h-96">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {selectedMetric === 'bp' ? (
                <AreaChart data={chartData}>
                  <defs>
                    {/* Enhanced 3D gradients for blood pressure */}
                    <linearGradient id="systolic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f87171" stopOpacity={0.9}/>
                      <stop offset="50%" stopColor="#ef4444" stopOpacity={0.5}/>
                      <stop offset="100%" stopColor="#dc2626" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="diastolic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.9}/>
                      <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.5}/>
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0.1}/>
                    </linearGradient>
                    {/* Glow filter for areas */}
                    <filter id="vitalsAreaGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }} tickLine={{ stroke: '#6b7280' }} />
                  <YAxis domain={[60, 180]} stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }} tickLine={{ stroke: '#6b7280' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))',
                      border: '2px solid #60a5fa',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(96, 165, 250, 0.3)',
                      backdropFilter: 'blur(10px)'
                    }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}
                    cursor={{ fill: 'rgba(96, 165, 250, 0.1)', stroke: '#60a5fa', strokeWidth: 2 }}
                  />
                  <Legend iconType="circle" />
                  <Area
                    type="monotone"
                    dataKey="systolic"
                    stroke="#ef4444"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#systolic)"
                    name="Systolic"
                    filter="url(#vitalsAreaGlow)"
                    dot={{ r: 5, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 7, strokeWidth: 3 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="diastolic"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#diastolic)"
                    name="Diastolic"
                    filter="url(#vitalsAreaGlow)"
                    dot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 7, strokeWidth: 3 }}
                  />
                </AreaChart>
              ) : (
                <LineChart data={chartData}>
                  <defs>
                    {/* Glow filter for lines */}
                    <filter id="vitalsLineGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }} tickLine={{ stroke: '#6b7280' }} />
                  <YAxis stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }} tickLine={{ stroke: '#6b7280' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))',
                      border: '2px solid #60a5fa',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(96, 165, 250, 0.3)',
                      backdropFilter: 'blur(10px)'
                    }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}
                    cursor={{ fill: 'rgba(96, 165, 250, 0.1)', stroke: '#60a5fa', strokeWidth: 2 }}
                  />
                  <Legend iconType="circle" />
                  <Line
                    type="monotone"
                    dataKey={
                      selectedMetric === 'hr' ? 'heartRate' :
                      selectedMetric === 'weight' ? 'weight' :
                      selectedMetric === 'sugar' ? 'bloodSugar' :
                      selectedMetric === 'temp' ? 'temperature' :
                      selectedMetric === 'hydration' ? 'hydration' :
                      'o2'
                    }
                    stroke={
                      selectedMetric === 'hr' ? '#ef4444' :
                      selectedMetric === 'weight' ? '#10b981' :
                      selectedMetric === 'sugar' ? '#f97316' :
                      selectedMetric === 'temp' ? '#ea580c' :
                      selectedMetric === 'hydration' ? '#3b82f6' :
                      '#06b6d4'
                    }
                    strokeWidth={4}
                    dot={{
                      r: 6,
                      strokeWidth: 2,
                      stroke: '#fff',
                      fill: selectedMetric === 'hr' ? '#ef4444' :
                            selectedMetric === 'weight' ? '#10b981' :
                            selectedMetric === 'sugar' ? '#f97316' :
                            selectedMetric === 'temp' ? '#ea580c' :
                            selectedMetric === 'hydration' ? '#3b82f6' :
                            '#06b6d4'
                    }}
                    activeDot={{ r: 9, strokeWidth: 3 }}
                    name={
                      selectedMetric === 'hr' ? 'Heart Rate (bpm)' :
                      selectedMetric === 'weight' ? 'Weight (lbs)' :
                      selectedMetric === 'sugar' ? 'Blood Sugar (mg/dL)' :
                      selectedMetric === 'temp' ? 'Temperature (°F)' :
                      selectedMetric === 'hydration' ? 'Hydration (%)' :
                      'O₂ Saturation (%)'
                    }
                    filter="url(#vitalsLineGlow)"
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full font-bold">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-3 font-bold" />
                <p>No vitals data available for this period</p>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Recent Vitals Table */}
      <GlassCard>
        <h2 className="text-xl font-semibold font-bold mb-4">Recent Readings</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 text-sm font-medium font-bold">Date</th>
                <th className="text-left py-2 px-2 text-sm font-medium font-bold">BP</th>
                <th className="text-left py-2 px-2 text-sm font-medium font-bold">HR</th>
                <th className="text-left py-2 px-2 text-sm font-medium font-bold">Temp</th>
                <th className="text-left py-2 px-2 text-sm font-medium font-bold">Weight</th>
                <th className="text-left py-2 px-2 text-sm font-medium font-bold">O₂</th>
                <th className="text-left py-2 px-2 text-sm font-medium font-bold">Sugar</th>
                <th className="text-left py-2 px-2 text-sm font-medium font-bold">Hydration</th>
                <th className="text-left py-2 px-2 text-sm font-medium font-bold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {vitals.slice(-10).reverse().map((vital) => (
                <tr key={vital.id} className="border-b border-gray-100 hover:bg-white/30">
                  <td className="py-2 px-2 text-sm">
                    {format(new Date(vital.timestamp), 'MMM d, h:mm a')}
                  </td>
                  <td className="py-2 px-2 text-sm">
                    {vital.bloodPressureSystolic && vital.bloodPressureDiastolic
                      ? `${vital.bloodPressureSystolic}/${vital.bloodPressureDiastolic}`
                      : '--'}
                  </td>
                  <td className="py-2 px-2 text-sm">{vital.heartRate || '--'}</td>
                  <td className="py-2 px-2 text-sm">{vital.temperature ? `${vital.temperature.toFixed(1)}°F` : '--'}</td>
                  <td className="py-2 px-2 text-sm">{vital.weight || '--'}</td>
                  <td className="py-2 px-2 text-sm">{vital.oxygenSaturation ? `${vital.oxygenSaturation}%` : '--'}</td>
                  <td className="py-2 px-2 text-sm">{vital.bloodSugar || '--'}</td>
                  <td className="py-2 px-2 text-sm">{vital.hydrationStatus ? `${vital.hydrationStatus}%` : '--'}</td>
                  <td className="py-2 px-2 text-sm font-bold">{vital.notes || '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {vitals.length === 0 && (
            <p className="text-center py-8 font-bold">No vitals recorded yet</p>
          )}
        </div>
      </GlassCard>

      {/* Record Vitals Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          reset();
        }}
        title="Record Vitals"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h3 className="font-medium font-bold">Blood Pressure</h3>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Systolic"
                  type="number"
                  placeholder="120"
                  {...register('bloodPressureSystolic', { valueAsNumber: true })}
                />
                <Input
                  label="Diastolic"
                  type="number"
                  placeholder="80"
                  {...register('bloodPressureDiastolic', { valueAsNumber: true })}
                />
              </div>
              
              <Input
                label="Heart Rate (bpm)"
                type="number"
                placeholder="60-100"
                icon={<Heart className="h-5 w-5" />}
                {...register('heartRate', { valueAsNumber: true })}
              />

              <Input
                label="Weight (lbs)"
                type="number"
                step="0.1"
                placeholder="Enter weight"
                icon={<Weight className="h-5 w-5" />}
                {...register('weight', { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-4">
              <h3 className="font-medium font-bold">Other Metrics</h3>
              
              <Input
                label="Temperature (°F)"
                type="number"
                step="0.1"
                placeholder="98.6"
                icon={<Thermometer className="h-5 w-5" />}
                {...register('temperature', { valueAsNumber: true })}
              />

              <Input
                label="O₂ Saturation (%)"
                type="number"
                placeholder="95-100"
                icon={<Wind className="h-5 w-5" />}
                {...register('oxygenSaturation', { valueAsNumber: true })}
              />

              <Input
                label="Blood Sugar (mg/dL)"
                type="number"
                placeholder="70-100"
                icon={<Droplet className="h-5 w-5" />}
                {...register('bloodSugar', { valueAsNumber: true })}
              />

              <Input
                label="Hydration Status (%)"
                type="number"
                placeholder="0-100"
                icon={<Droplet className="h-5 w-5" />}
                {...register('hydrationStatus', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium font-bold">
              Symptoms (optional)
            </label>
            <textarea
              className="glass-input"
              rows={2}
              placeholder="Any symptoms to note?"
              {...register('symptoms')}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium font-bold">
              Notes (optional)
            </label>
            <textarea
              className="glass-input"
              rows={2}
              placeholder="Additional notes"
              {...register('notes')}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="medicationsTaken"
              className="rounded border-gray-300"
              {...register('medicationsTaken')}
            />
            <label htmlFor="medicationsTaken" className="text-sm font-bold">
              Medications taken as prescribed
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isLoading}>
              Record Vitals
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
