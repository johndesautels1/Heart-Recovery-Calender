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
  Users
} from 'lucide-react';
import { GlassCard } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { VitalsSample, Medication, CalendarEvent, MealEntry, Patient } from '../types';
import { format, subDays, differenceInWeeks } from 'date-fns';

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
  const [adminStats, setAdminStats] = useState<AdminDashboardStats>({
    newPatients: [],
    completingTherapyPatients: [],
    todayAllEvents: [],
    activePatients: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = user?.role === 'admin' || user?.role === 'therapist';

  useEffect(() => {
    if (isAdmin) {
      loadAdminDashboardData();
    } else {
      loadDashboardData();
    }
  }, [isAdmin]);

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

  const loadAdminDashboardData = async () => {
    try {
      setIsLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = subDays(new Date(), 7);

      // Get all patients for this therapist/admin
      const { data: allPatients } = await api.getPatients();

      // Filter new patients (created in last 7 days)
      const newPatients = allPatients.filter(p => {
        const createdDate = new Date(p.createdAt);
        return createdDate >= sevenDaysAgo;
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

      // Get today's events across all patients
      const todayAllEvents: CalendarEvent[] = [];
      for (const patient of activePatients) {
        if (patient.userId) {
          try {
            const events = await api.getEvents(patient.userId, today, today);
            todayAllEvents.push(...events);
          } catch (err) {
            console.error(`Failed to load events for patient ${patient.id}:`, err);
          }
        }
      }

      setAdminStats({
        newPatients,
        completingTherapyPatients,
        todayAllEvents,
        activePatients,
      });
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

  // Admin Dashboard
  if (isAdmin) {
    return (
      <div className="space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-3xl font-bold text-white font-bold">
            {getGreeting()}, {user?.name || 'Admin'}!
          </h1>
          <p className="text-white font-bold mt-2">
            Admin Dashboard for {format(new Date(), 'EEEE, MMMM d')}
          </p>
        </div>

        {/* Admin Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Patients Completing Therapy */}
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white font-bold mb-1">Completing Therapy</p>
                <p className="text-3xl font-bold text-white font-bold">{adminStats.completingTherapyPatients.length}</p>
                <div className="flex items-center mt-2">
                  <CheckCircle className="h-4 w-4 text-blue-500 mr-1" />
                  <span className="text-sm text-white font-bold">10-14 weeks post-op</span>
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
                <p className="text-sm text-white font-bold mb-1">New Patients</p>
                <p className="text-3xl font-bold text-white font-bold">{adminStats.newPatients.length}</p>
                <div className="flex items-center mt-2">
                  <UserPlus className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-white font-bold">Last 7 days</span>
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
                <p className="text-sm text-white font-bold mb-1">Active Patients</p>
                <p className="text-3xl font-bold text-white font-bold">{adminStats.activePatients.length}</p>
                <div className="flex items-center mt-2">
                  <Users className="h-4 w-4 text-orange-500 mr-1" />
                  <span className="text-sm text-white font-bold">In treatment</span>
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
                <p className="text-sm text-white font-bold mb-1">Today's Events</p>
                <p className="text-3xl font-bold text-white font-bold">{adminStats.todayAllEvents.length}</p>
                <div className="flex items-center mt-2">
                  <Calendar className="h-4 w-4 text-purple-500 mr-1" />
                  <span className="text-sm text-white font-bold">All patients</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* New Patients Details */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white font-bold">New Patients (Last 7 Days)</h2>
              <Link to="/patients" className="text-blue-600 hover:text-blue-700 flex items-center">
                View all <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>

            {adminStats.newPatients.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {adminStats.newPatients.map((patient) => (
                  <div
                    key={patient.id}
                    className="flex items-start space-x-3 p-3 bg-white/50 rounded-lg hover:bg-white/70 transition-colors"
                  >
                    <UserPlus className="h-5 w-5 text-green-500 mt-1" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white font-bold truncate">{patient.name}</p>
                      <p className="text-sm text-white font-bold">
                        Added {format(new Date(patient.createdAt), 'MMM d, yyyy')}
                      </p>
                      {patient.surgeryDate && (
                        <p className="text-xs text-white font-bold mt-1">
                          Surgery: {format(new Date(patient.surgeryDate), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-white font-bold">
                <UserPlus className="h-12 w-12 mx-auto mb-3 text-white font-bold" />
                <p>No new patients in the last 7 days</p>
              </div>
            )}
          </GlassCard>

          {/* Weekly Highlights */}
          <GlassCard className="relative overflow-hidden">
            {/* Glassmorphic gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10 pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white font-bold flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-yellow-400" />
                  Weekly Highlights
                </h2>
                <span className="text-xs text-white font-bold bg-white/20 px-3 py-1 rounded-full">
                  {format(new Date(), 'MMM d')} - {format(subDays(new Date(), 7), 'MMM d')}
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Total Active Patients */}
                <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-400/30">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <Users className="h-5 w-5 text-blue-400" />
                      <span className="text-2xl font-bold text-white">{adminStats.activePatients.length}</span>
                    </div>
                    <p className="text-xs text-white font-bold">Active Patients</p>
                    <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600" style={{ width: '100%' }} />
                    </div>
                  </div>
                </div>

                {/* New This Week */}
                <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-400/30">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <UserPlus className="h-5 w-5 text-green-400" />
                      <span className="text-2xl font-bold text-white">{adminStats.newPatients.length}</span>
                    </div>
                    <p className="text-xs text-white font-bold">New Patients</p>
                    <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-400 to-green-600" style={{ width: `${Math.min((adminStats.newPatients.length / 5) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>

                {/* Completing Soon */}
                <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-400/30">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <Stethoscope className="h-5 w-5 text-purple-400" />
                      <span className="text-2xl font-bold text-white">{adminStats.completingTherapyPatients.length}</span>
                    </div>
                    <p className="text-xs text-white font-bold">Completing Therapy</p>
                    <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600" style={{ width: `${Math.min((adminStats.completingTherapyPatients.length / 3) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>

                {/* Today's Events */}
                <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-400/30">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <Calendar className="h-5 w-5 text-orange-400" />
                      <span className="text-2xl font-bold text-white">{adminStats.todayAllEvents.length}</span>
                    </div>
                    <p className="text-xs text-white font-bold">Today's Events</p>
                    <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-orange-400 to-orange-600" style={{ width: `${Math.min((adminStats.todayAllEvents.length / 10) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Achievement Badges */}
              <div className="space-y-2">
                <p className="text-xs text-white font-bold mb-3">Weekly Achievements</p>

                {adminStats.newPatients.length > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-transparent border border-green-400/20">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">New Patient Onboarding</p>
                      <p className="text-xs text-white font-bold">Added {adminStats.newPatients.length} new {adminStats.newPatients.length === 1 ? 'patient' : 'patients'} this week</p>
                    </div>
                  </div>
                )}

                {adminStats.completingTherapyPatients.length > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-transparent border border-purple-400/20">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">Recovery Progress</p>
                      <p className="text-xs text-white font-bold">{adminStats.completingTherapyPatients.length} {adminStats.completingTherapyPatients.length === 1 ? 'patient' : 'patients'} nearing completion</p>
                    </div>
                  </div>
                )}

                {adminStats.activePatients.length >= 10 && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-400/20">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">Full Caseload</p>
                      <p className="text-xs text-white font-bold">Managing {adminStats.activePatients.length} active patients</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Active Patients with Metrics */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white font-bold">Active Patients</h2>
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
                    className="p-4 bg-white/50 rounded-lg hover:bg-white/70 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white font-bold truncate">{patient.name}</p>
                        {weeksPostOp !== null && (
                          <p className="text-sm text-white font-bold mt-1">Week {weeksPostOp} post-op</p>
                        )}
                        {patient.email && (
                          <p className="text-xs text-white font-bold mt-1 truncate">{patient.email}</p>
                        )}
                        {patient.phone && (
                          <p className="text-xs text-white font-bold mt-1">{patient.phone}</p>
                        )}
                      </div>
                      <Users className="h-5 w-5 text-orange-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-white font-bold">
              <Users className="h-12 w-12 mx-auto mb-3 text-white font-bold" />
              <p>No active patients</p>
              <Link to="/patients" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
                Add patient →
              </Link>
            </div>
          )}
        </GlassCard>
      </div>
    );
  }

  // Patient Dashboard
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
