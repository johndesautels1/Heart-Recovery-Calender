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
  Zap
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
        <div className="grid grid-cols-1 gap-6">
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
                      <span className="text-2xl font-bold text-white">3</span>
                      {/* TODO: Wire to real alerts count */}
                    </div>
                    <p className="text-xs text-white font-bold">Active Alerts</p>
                    <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-400 to-red-600 animate-pulse" style={{ width: '30%' }} />
                    </div>
                  </div>
                </div>

                {/* Completion Rate */}
                <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 border border-cyan-400/30 hover:border-cyan-400/50 transition-all">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <CheckCircle className="h-5 w-5 text-cyan-400" />
                      <span className="text-2xl font-bold text-white">92%</span>
                      {/* TODO: Wire to real completion rate */}
                    </div>
                    <p className="text-xs text-white font-bold">Event Completion</p>
                    <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 animate-pulse" style={{ width: '92%' }} />
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
                    {/* TODO: Wire to real milestone data */}
                    <div className="flex items-center justify-between text-xs p-2 bg-white/5 rounded-lg">
                      <span className="text-white font-bold">Week 4 Milestones</span>
                      <span className="text-yellow-400 font-bold">5 patients</span>
                    </div>
                    <div className="flex items-center justify-between text-xs p-2 bg-white/5 rounded-lg">
                      <span className="text-white font-bold">Weight Goals Achieved</span>
                      <span className="text-yellow-400 font-bold">3 patients</span>
                    </div>
                    <div className="flex items-center justify-between text-xs p-2 bg-white/5 rounded-lg">
                      <span className="text-white font-bold">First Exercise Session</span>
                      <span className="text-yellow-400 font-bold">7 patients</span>
                    </div>
                    <div className="flex items-center justify-between text-xs p-2 bg-white/5 rounded-lg">
                      <span className="text-white font-bold">Medication Independence</span>
                      <span className="text-yellow-400 font-bold">2 patients</span>
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
                    {/* TODO: Wire to real performance data */}
                    <div className="p-2 bg-white/5 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white font-bold">Biggest Vitals Improvement</span>
                        <ThumbsUp className="h-4 w-4 text-pink-400" />
                      </div>
                      <p className="text-xs text-pink-300">John D. - BP improved 15%</p>
                    </div>
                    <div className="p-2 bg-white/5 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white font-bold">Perfect Attendance</span>
                        <CheckCircle className="h-4 w-4 text-pink-400" />
                      </div>
                      <p className="text-xs text-pink-300">Sarah M. - 28 days streak</p>
                    </div>
                    <div className="p-2 bg-white/5 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white font-bold">Best Patient Outcome</span>
                        <Award className="h-4 w-4 text-pink-400" />
                      </div>
                      <p className="text-xs text-pink-300">Mike R. - All goals met</p>
                    </div>
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
                  {/* TODO: Wire to real clinical data */}
                  <div className="p-3 bg-white/5 rounded-lg text-center">
                    <p className="text-2xl font-bold text-white">+8.5%</p>
                    <p className="text-xs text-emerald-300 mt-1">Avg Vitals Improvement</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg text-center">
                    <p className="text-2xl font-bold text-white">12</p>
                    <p className="text-xs text-emerald-300 mt-1">Improving Trends</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg text-center">
                    <p className="text-2xl font-bold text-white">4</p>
                    <p className="text-xs text-emerald-300 mt-1">Medication Reduced</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg text-center">
                    <p className="text-2xl font-bold text-white">+22%</p>
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
                    {/* TODO: Wire to real productivity data */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white font-bold">Total Appointments</span>
                        <span className="text-xl font-bold text-white">47</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-400" style={{ width: '94%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white font-bold">Avg Session Time</span>
                        <span className="text-xl font-bold text-white">38 min</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-400" style={{ width: '76%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white font-bold">No-Show Rate</span>
                        <span className="text-xl font-bold text-white">4.2%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-green-400 to-emerald-400" style={{ width: '95.8%' }} />
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
                      <div key={patient.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
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
                  {/* TODO: Wire to real focus area data */}
                  <div className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white font-bold">Milestone Check-ins Due</span>
                      <span className="text-lg font-bold text-amber-400">6</span>
                    </div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white font-bold">Upcoming Discharges</span>
                      <span className="text-lg font-bold text-amber-400">3</span>
                    </div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white font-bold">Patients Needing Attention</span>
                      <span className="text-lg font-bold text-amber-400">2</span>
                    </div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white font-bold">High-Priority Appointments</span>
                      <span className="text-lg font-bold text-amber-400">5</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Before/After Photos Upload */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-400/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-teal-400" />
                    <h3 className="text-sm font-bold text-teal-400">Patient Progress Photos</h3>
                  </div>
                  <button className="px-3 py-1 bg-teal-500/20 hover:bg-teal-500/30 rounded-lg text-xs text-teal-300 font-bold transition-all">
                    Upload Photos
                  </button>
                </div>
                <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
                  {/* TODO: Wire to real photo upload functionality */}
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="aspect-square bg-white/5 rounded-lg border-2 border-dashed border-teal-400/30 hover:border-teal-400/50 flex items-center justify-center cursor-pointer transition-all group">
                      <Camera className="h-6 w-6 text-teal-400/50 group-hover:text-teal-400 transition-colors" />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-teal-300 mt-2">Upload before/after photos to track patient progress visually</p>
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
