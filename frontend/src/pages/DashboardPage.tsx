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
  Clock
} from 'lucide-react';
import { GlassCard } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { VitalsSample, Medication, CalendarEvent, MealEntry } from '../types';
import { format } from 'date-fns';

interface DashboardStats {
  todayEvents: CalendarEvent[];
  activeMedications: Medication[];
  latestVitals: VitalsSample | null;
  todayMeals: MealEntry[];
  weeklyCompliance: number;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    todayEvents: [],
    activeMedications: [],
    latestVitals: null,
    todayMeals: [],
    weeklyCompliance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

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
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
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

  const bpStatus = getBloodPressureStatus(
    stats.latestVitals?.bloodPressureSystolic,
    stats.latestVitals?.bloodPressureDiastolic
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Heart className="h-12 w-12 text-red-500 animate-pulse mx-auto mb-4" />
          <p className="text-white font-bold">Loading your health data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-white font-bold">
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
              <p className="text-sm text-white font-bold mb-1">Weekly Compliance</p>
              <p className="text-3xl font-bold text-white font-bold">{stats.weeklyCompliance}%</p>
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
              <p className="text-sm text-white font-bold mb-1">Today's Events</p>
              <p className="text-3xl font-bold text-white font-bold">{stats.todayEvents.length}</p>
              <div className="flex items-center mt-2">
                <Clock className="h-4 w-4 text-blue-500 mr-1" />
                <span className="text-sm text-white font-bold">
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
              <p className="text-sm text-white font-bold mb-1">Active Medications</p>
              <p className="text-3xl font-bold text-white font-bold">{stats.activeMedications.length}</p>
              <div className="flex items-center mt-2">
                <Pill className="h-4 w-4 text-purple-500 mr-1" />
                <span className="text-sm text-white font-bold">Daily reminders on</span>
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
              <p className="text-sm text-white font-bold mb-1">Meals Logged</p>
              <p className="text-3xl font-bold text-white font-bold">{stats.todayMeals.length}/4</p>
              <div className="flex items-center mt-2">
                <UtensilsCrossed className="h-4 w-4 text-orange-500 mr-1" />
                <span className="text-sm text-white font-bold">
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
            <h2 className="text-xl font-semibold text-white font-bold">Latest Vitals</h2>
            <Link to="/vitals" className="text-blue-600 hover:text-blue-700 flex items-center">
              View all <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          
          {stats.latestVitals ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white font-bold">Blood Pressure</span>
                  <Heart className="h-4 w-4 text-red-500" />
                </div>
                <p className="text-2xl font-bold text-white font-bold">
                  {stats.latestVitals.bloodPressureSystolic}/{stats.latestVitals.bloodPressureDiastolic}
                </p>
                <p className={`text-sm mt-1 text-${bpStatus.color}-600`}>{bpStatus.status}</p>
              </div>

              <div className="p-4 bg-white/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white font-bold">Heart Rate</span>
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
                  <span className="text-sm text-white font-bold">Weight</span>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-white font-bold">
                  {stats.latestVitals.weight || '--'} <span className="text-sm">lbs</span>
                </p>
                <p className="text-sm text-white font-bold mt-1">Target: 165 lbs</p>
              </div>

              <div className="p-4 bg-white/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white font-bold">Blood Sugar</span>
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
                  <span className="text-sm text-white font-bold">O₂ Saturation</span>
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
                  <span className="text-sm text-white font-bold">Temperature</span>
                  <Activity className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-white font-bold">
                  {stats.latestVitals.temperature || '--'}°F
                </p>
                <p className="text-sm text-white font-bold mt-1">Normal: 98.6°F</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-white font-bold">
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
            <h2 className="text-xl font-semibold text-white font-bold">Today's Schedule</h2>
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
                    <p className="font-medium text-white font-bold truncate">{event.title}</p>
                    <p className="text-sm text-white font-bold">
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
            <div className="text-center py-8 text-white font-bold">
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
          <h2 className="text-xl font-semibold text-white font-bold">Active Medications</h2>
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
                    <p className="text-xs text-white font-bold mt-1">{med.frequency}</p>
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
          <div className="text-center py-8 text-white font-bold">
            <Pill className="h-12 w-12 mx-auto mb-3 text-white font-bold" />
            <p>No active medications</p>
            <Link to="/medications" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
              Add medication →
            </Link>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
