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
  const [selectedMetric, setSelectedMetric] = useState<'bp' | 'hr' | 'weight' | 'sugar'>('bp');
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
    if (!systolic || !diastolic) return { status: 'Unknown', color: 'gray' };
    if (systolic < 120 && diastolic < 80) return { status: 'Normal', color: 'green' };
    if (systolic < 130 && diastolic < 80) return { status: 'Elevated', color: 'yellow' };
    if (systolic < 140 || diastolic < 90) return { status: 'Stage 1 Hypertension', color: 'orange' };
    return { status: 'Stage 2 Hypertension', color: 'red' };
  };

  const chartData = vitals.map(v => ({
    date: format(new Date(v.timestamp), 'MMM d'),
    systolic: v.bloodPressureSystolic,
    diastolic: v.bloodPressureDiastolic,
    heartRate: v.heartRate,
    weight: v.weight,
    bloodSugar: v.bloodSugar,
    o2: v.oxygenSaturation,
  }));

  const bpStatus = getBloodPressureStatus(
    latestVitals?.bloodPressureSystolic,
    latestVitals?.bloodPressureDiastolic
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Vitals Tracking</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-5 w-5 mr-2" />
          Record Vitals
        </Button>
      </div>

      {/* Latest Vitals Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Blood Pressure</p>
              <p className="text-2xl font-bold text-gray-800">
                {latestVitals?.bloodPressureSystolic || '--'}/
                {latestVitals?.bloodPressureDiastolic || '--'}
              </p>
              <p className={`text-sm mt-1 text-${bpStatus.color}-600`}>{bpStatus.status}</p>
            </div>
            <Heart className="h-8 w-8 text-red-500" />
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Heart Rate</p>
              <p className="text-2xl font-bold text-gray-800">
                {latestVitals?.heartRate || '--'} <span className="text-sm">bpm</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {latestVitals?.heartRate && latestVitals.heartRate < 60
                  ? 'Low'
                  : latestVitals?.heartRate && latestVitals.heartRate > 100
                  ? 'High'
                  : 'Normal'}
              </p>
            </div>
            <Activity className="h-8 w-8 text-red-500" />
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Weight</p>
              <p className="text-2xl font-bold text-gray-800">
                {latestVitals?.weight || '--'} <span className="text-sm">lbs</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">BMI: --</p>
            </div>
            <Weight className="h-8 w-8 text-blue-500" />
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Blood Sugar</p>
              <p className="text-2xl font-bold text-gray-800">
                {latestVitals?.bloodSugar || '--'} <span className="text-sm">mg/dL</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {latestVitals?.bloodSugar && latestVitals.bloodSugar < 100
                  ? 'Normal'
                  : latestVitals?.bloodSugar && latestVitals.bloodSugar < 126
                  ? 'Pre-diabetic'
                  : 'High'}
              </p>
            </div>
            <Droplet className="h-8 w-8 text-orange-500" />
          </div>
        </GlassCard>
      </div>

      {/* Chart Controls */}
      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedMetric('bp')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedMetric === 'bp' 
                  ? 'bg-blue-500 text-white' 
                  : 'glass-button text-gray-700'
              }`}
            >
              Blood Pressure
            </button>
            <button
              onClick={() => setSelectedMetric('hr')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedMetric === 'hr' 
                  ? 'bg-red-500 text-white' 
                  : 'glass-button text-gray-700'
              }`}
            >
              Heart Rate
            </button>
            <button
              onClick={() => setSelectedMetric('weight')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedMetric === 'weight' 
                  ? 'bg-green-500 text-white' 
                  : 'glass-button text-gray-700'
              }`}
            >
              Weight
            </button>
            <button
              onClick={() => setSelectedMetric('sugar')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedMetric === 'sugar' 
                  ? 'bg-orange-500 text-white' 
                  : 'glass-button text-gray-700'
              }`}
            >
              Blood Sugar
            </button>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => setDateRange('7d')}
              className={`px-3 py-1 rounded-lg text-sm transition-all ${
                dateRange === '7d' 
                  ? 'bg-gray-700 text-white' 
                  : 'glass-button text-gray-700'
              }`}
            >
              7 days
            </button>
            <button
              onClick={() => setDateRange('30d')}
              className={`px-3 py-1 rounded-lg text-sm transition-all ${
                dateRange === '30d' 
                  ? 'bg-gray-700 text-white' 
                  : 'glass-button text-gray-700'
              }`}
            >
              30 days
            </button>
            <button
              onClick={() => setDateRange('90d')}
              className={`px-3 py-1 rounded-lg text-sm transition-all ${
                dateRange === '90d' 
                  ? 'bg-gray-700 text-white' 
                  : 'glass-button text-gray-700'
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
                    <linearGradient id="systolic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="diastolic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" />
                  <YAxis domain={[60, 180]} />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="systolic" 
                    stroke="#ef4444" 
                    fillOpacity={1} 
                    fill="url(#systolic)"
                    name="Systolic"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="diastolic" 
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#diastolic)"
                    name="Diastolic"
                  />
                </AreaChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey={
                      selectedMetric === 'hr' ? 'heartRate' :
                      selectedMetric === 'weight' ? 'weight' :
                      'bloodSugar'
                    }
                    stroke={
                      selectedMetric === 'hr' ? '#ef4444' :
                      selectedMetric === 'weight' ? '#10b981' :
                      '#f97316'
                    }
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name={
                      selectedMetric === 'hr' ? 'Heart Rate (bpm)' :
                      selectedMetric === 'weight' ? 'Weight (lbs)' :
                      'Blood Sugar (mg/dL)'
                    }
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No vitals data available for this period</p>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Recent Vitals Table */}
      <GlassCard>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Readings</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Date</th>
                <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">BP</th>
                <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">HR</th>
                <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Weight</th>
                <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">O₂</th>
                <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Sugar</th>
                <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Notes</th>
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
                  <td className="py-2 px-2 text-sm">{vital.weight || '--'}</td>
                  <td className="py-2 px-2 text-sm">{vital.oxygenSaturation ? `${vital.oxygenSaturation}%` : '--'}</td>
                  <td className="py-2 px-2 text-sm">{vital.bloodSugar || '--'}</td>
                  <td className="py-2 px-2 text-sm text-gray-600">{vital.notes || '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {vitals.length === 0 && (
            <p className="text-center py-8 text-gray-500">No vitals recorded yet</p>
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
              <h3 className="font-medium text-gray-800">Blood Pressure</h3>
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
              <h3 className="font-medium text-gray-800">Other Metrics</h3>
              
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
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
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
            <label className="block text-sm font-medium text-gray-700">
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
            <label htmlFor="medicationsTaken" className="text-sm text-gray-700">
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
