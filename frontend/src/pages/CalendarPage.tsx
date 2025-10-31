import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { GlassCard, Button, Modal, Input, Select } from '../components/ui';
import { RestTimer } from '../components/RestTimer';
import { Plus, Calendar as CalendarIcon, Edit, Trash2, Clock, MapPin, UtensilsCrossed, Moon, AlertTriangle, Download, Printer, Share2, FileJson, QrCode, Timer, Heart } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import { CalendarEvent, Calendar, CreateEventInput, CreateCalendarInput, MealEntry, Medication, SleepLog, VitalsSample, Patient } from '../types';
import toast from 'react-hot-toast';
import { format, addDays, parseISO } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { usePatientSelection } from '../contexts/PatientSelectionContext';
import { useAuth } from '../contexts/AuthContext';
import {
  exportToGoogleCalendar,
  exportToAppleCalendar,
  exportToCalendly,
  exportAsJSON,
  printCalendar,
  getCalendlyWebhookConfig,
  getGoogleCalendarOAuthConfig,
} from '../utils/calendarExport';

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  calendarId: z.number().min(1, 'Please select a calendar'),
  startTime: z.string(),
  endTime: z.string(),
  isAllDay: z.boolean().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  reminderMinutes: z.number().optional(),
  notes: z.string().optional(),
  sleepHours: z.number().optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

export function CalendarPage() {
  const { selectedPatient, setSelectedPatient, isViewingAsTherapist } = usePatientSelection();
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDateMeals, setSelectedDateMeals] = useState<MealEntry[]>([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [editingCalendar, setEditingCalendar] = useState<Calendar | null>(null);
  const [calendarFormData, setCalendarFormData] = useState({ name: '', type: 'general', color: '#607d8b', assignToPatientId: 0 });
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [sleepHours, setSleepHours] = useState<string>('');
  const [performanceScore, setPerformanceScore] = useState<string>('');
  const [exerciseIntensity, setExerciseIntensity] = useState<string>('');
  const [distanceMiles, setDistanceMiles] = useState<string>('');
  const [laps, setLaps] = useState<string>('');
  const [steps, setSteps] = useState<string>('');
  const [elevationFeet, setElevationFeet] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<string>('');
  const [heartRateAvg, setHeartRateAvg] = useState<string>('');
  const [heartRateMax, setHeartRateMax] = useState<string>('');
  const [caloriesBurned, setCaloriesBurned] = useState<string>('');
  const [exerciseNotes, setExerciseNotes] = useState<string>('');

  // Phase 1 Vitals Fields
  const [preBpSystolic, setPreBpSystolic] = useState<string>('');
  const [preBpDiastolic, setPreBpDiastolic] = useState<string>('');
  const [preHeartRate, setPreHeartRate] = useState<string>('');
  const [preOxygenSat, setPreOxygenSat] = useState<string>('');
  const [duringBpSystolic, setDuringBpSystolic] = useState<string>('');
  const [duringBpDiastolic, setDuringBpDiastolic] = useState<string>('');
  const [duringHeartRateAvg, setDuringHeartRateAvg] = useState<string>('');
  const [duringHeartRateMax, setDuringHeartRateMax] = useState<string>('');
  const [postBpSystolic, setPostBpSystolic] = useState<string>('');
  const [postBpDiastolic, setPostBpDiastolic] = useState<string>('');
  const [postHeartRate, setPostHeartRate] = useState<string>('');
  const [postOxygenSat, setPostOxygenSat] = useState<string>('');
  const [perceivedExertion, setPerceivedExertion] = useState<string>('');
  const [startedAt, setStartedAt] = useState<string>('');

  // Phase 4 - Progressive overload fields
  const [setsCompleted, setSetsCompleted] = useState<string>('');
  const [repsPerSet, setRepsPerSet] = useState<string>('');
  const [weightUsed, setWeightUsed] = useState<string>('');

  // Phase 4 - PT tracking fields
  const [difficultyRating, setDifficultyRating] = useState<string>('');
  const [painLevel, setPainLevel] = useState<string>('');
  const [painLocation, setPainLocation] = useState<string>('');
  const [rangeOfMotion, setRangeOfMotion] = useState<string>('');

  // Phase 4 - Instruction tabs state
  const [instructionTab, setInstructionTab] = useState<'video' | 'images' | 'instructions'>('video');
  const [currentExercise, setCurrentExercise] = useState<any>(null);
  const [showRestTimer, setShowRestTimer] = useState(false);

  // During-exercise vital signs snapshots (BP declared above in Phase 1)
  const [duringPulse, setDuringPulse] = useState<string>('');
  const [duringRespiration, setDuringRespiration] = useState<string>('');
  const [vitalSnapshots, setVitalSnapshots] = useState<any[]>([]);

  // Device connection state
  const [devicesConnected, setDevicesConnected] = useState(false);
  const [connectedDevices, setConnectedDevices] = useState<string[]>([]);
  const [liveVitalsPolling, setLiveVitalsPolling] = useState<NodeJS.Timeout | null>(null);

  const [allMeals, setAllMeals] = useState<MealEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDateDetailsModal, setShowDateDetailsModal] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<any[]>([]);
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [vitals, setVitals] = useState<VitalsSample[]>([]);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<any>(null);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<number[]>([]);
  const [selectedPatientForCalendar, setSelectedPatientForCalendar] = useState<number | null | undefined>(undefined);
  const [selectedCalendarForView, setSelectedCalendarForView] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      reminderMinutes: 30,
      isAllDay: false,
    },
  });

  const isAllDay = watch('isAllDay');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    loadCalendarsAndEvents();
    loadPatients();
  }, []);

  // Refresh events when navigating to calendar page
  useEffect(() => {
    if (location.pathname === '/calendar') {
      loadCalendarsAndEvents();
    }
  }, [location.pathname]);

  // Reload calendar data when patient selection changes
  useEffect(() => {
    loadCalendarsAndEvents();
    // Reset calendar selection when switching patients
    setSelectedCalendarIds([]);
  }, [selectedPatient]);

  // Initialize selected calendars when calendars are loaded
  useEffect(() => {
    if (calendars.length > 0 && selectedCalendarIds.length === 0) {
      setSelectedCalendarIds(calendars.map(cal => cal.id));
    }
  }, [calendars]);

  // Check device connections when exercise modal opens
  useEffect(() => {
    if (selectedEvent?.exerciseId && currentExercise) {
      checkDeviceConnections();
    }

    // Cleanup polling on modal close
    return () => {
      if (liveVitalsPolling) {
        clearInterval(liveVitalsPolling);
        setLiveVitalsPolling(null);
      }
    };
  }, [selectedEvent, currentExercise]);

  const checkDeviceConnections = async () => {
    try {
      const devices = await api.getDevices();
      const activeDevices = devices.filter((d: any) => d.syncStatus === 'active');

      if (activeDevices.length > 0) {
        setDevicesConnected(true);
        setConnectedDevices(activeDevices.map((d: any) => d.deviceType));
        // Start real-time polling
        startLiveVitalsPolling();
      } else {
        setDevicesConnected(false);
        setConnectedDevices([]);
      }
    } catch (error) {
      console.error('Error checking devices:', error);
      setDevicesConnected(false);
    }
  };

  const startLiveVitalsPolling = () => {
    // Poll every 5 seconds for live data
    const interval = setInterval(async () => {
      try {
        // Get latest vitals from connected devices
        const vitals = await api.getLatestDeviceVitals();

        if (vitals) {
          // Auto-populate widgets with live data
          if (vitals.heartRate) {
            setDuringPulse(vitals.heartRate.toString());
          }
          if (vitals.bloodPressure) {
            setDuringBpSystolic(vitals.bloodPressure.systolic.toString());
            setDuringBpDiastolic(vitals.bloodPressure.diastolic.toString());
          }
          if (vitals.respirationRate) {
            setDuringRespiration(vitals.respirationRate.toString());
          }
        }
      } catch (error) {
        console.error('Error polling vitals:', error);
      }
    }, 5000); // Every 5 seconds

    setLiveVitalsPolling(interval);
  };

  const loadPatients = async () => {
    // Only load patients if user is admin or therapist
    if (user?.role === 'admin' || user?.role === 'therapist') {
      try {
        const patientsData = await api.getPatients();
        setPatients(patientsData.data);
      } catch (error) {
        console.error('Error loading patients:', error);
      }
    }
  };

  const loadCalendarsAndEvents = async () => {
    try {
      setIsLoading(true);

      // Get date range for current month +/- 1 month for better coverage
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().split('T')[0];

      // Determine which user's data to load
      // For admin/therapist: use selectedPatient if set, otherwise load all
      // For patients: always load their own data
      let userId: number | undefined;

      if (user?.role === 'patient') {
        // Patients always see their own calendar
        userId = user.id;
      } else if (selectedPatient?.userId) {
        // Admin/therapist viewing a specific patient
        userId = selectedPatient.userId;
      }
      // Otherwise userId remains undefined (admin viewing all calendars)

      console.log('[CalendarPage] Loading data for userId:', userId, 'user role:', user?.role, 'selectedPatient:', selectedPatient);

      // For admin/therapist viewing all calendars, don't pass userId to getCalendars
      // This will load all calendars (own + patients')
      const shouldLoadAllCalendars = !userId && (user?.role === 'admin' || user?.role === 'therapist');

      const [calendarsData, eventsData, mealsData, medicationsData, sleepLogsData, vitalsData] = await Promise.all([
        api.getCalendars(shouldLoadAllCalendars ? undefined : userId),
        api.getEvents(userId, undefined, undefined, { usePatientId: !!userId }),
        api.getMeals({ startDate, endDate, userId }),
        api.getMedications(false, userId),
        api.getSleepLogs({ startDate, endDate, userId }),
        api.getVitals({ startDate, endDate, userId }),
      ]);

      setCalendars(calendarsData);
      setEvents(eventsData);
      setAllMeals(mealsData);
      setMedications(medicationsData);
      setSleepLogs(sleepLogsData);
      setVitals(vitalsData);

      // Load medication logs for the date range
      try {
        const response = await fetch(`/api/medications/logs?startDate=${startDate}&endDate=${endDate}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        if (response.ok) {
          const logsData = await response.json();
          setMedicationLogs(logsData.data || []);
        }
      } catch (error) {
        console.error('Failed to load medication logs:', error);
      }

      // Create default calendar if none exists
      if (calendarsData.length === 0) {
        const defaultCalendar = await api.createCalendar({
          name: 'My Calendar',
          type: 'general',
          color: '#2196f3',
        });
        setCalendars([defaultCalendar]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load calendar data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateClick = async (arg: any) => {
    // When a date is clicked, open the day details modal
    const clickedDate = arg.dateStr;
    setSelectedDate(clickedDate);

    // Filter meals for this date
    const mealsForDate = allMeals.filter(meal => {
      const mealDate = new Date(meal.timestamp).toISOString().split('T')[0];
      return mealDate === clickedDate;
    });
    setSelectedDateMeals(mealsForDate);

    // Open the modal
    setShowDateDetailsModal(true);
  };

  const handleSelect = async (selectInfo: any) => {
    // When a time range is selected (click and drag on time slot), open event creation modal
    const startTime = selectInfo.start;
    const endTime = selectInfo.end;
    const isAllDay = selectInfo.allDay;

    // Pre-fill form with selected time range
    const defaultCalendar = calendars.find(c => c.type === 'general') || calendars[0];

    reset({
      title: '',
      calendarId: defaultCalendar?.id || 0,
      startTime: startTime.toISOString().slice(0, 16),
      endTime: endTime.toISOString().slice(0, 16),
      isAllDay: isAllDay,
      location: '',
      description: '',
      reminderMinutes: 30,
      status: 'scheduled',
    });

    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  const handleEventClick = async (arg: any) => {
    // Check if it's a medication event
    if (arg.event.extendedProps.isMedicationEvent) {
      const { medication, status, scheduledTime, log } = arg.event.extendedProps;

      // Show dialog to mark as taken/missed
      const action = confirm(
        `${medication.name} (${medication.dosage})\nScheduled: ${format(new Date(scheduledTime), 'PPP p')}\n\nClick OK to mark as TAKEN, or Cancel to mark as MISSED.`
      );

      try {
        const newStatus = action ? 'taken' : 'missed';

        if (log) {
          // Update existing log
          await fetch(`/api/medications/logs/${log.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
              status: newStatus,
              takenTime: action ? new Date().toISOString() : null,
            }),
          });
        } else {
          // Create new log
          await fetch(`/api/medications/${medication.id}/log-dose`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
              scheduledTime,
              status: newStatus,
              takenTime: action ? new Date().toISOString() : null,
            }),
          });
        }

        toast.success(`Medication marked as ${newStatus}`);

        // Reload data
        await loadCalendarsAndEvents();

        // Send alert email if missed and reminders enabled
        if (!action && medication.reminderEnabled) {
          toast.error('⚠️ CRITICAL: Medication dose missed! Alert sent.');
        }
      } catch (error) {
        console.error('Failed to log medication:', error);
        toast.error('Failed to log medication');
      }

      return;
    }

    // Handle regular events - clicking on an event opens the details modal
    const event = events.find(e => e.id === parseInt(arg.event.id));
    if (event) {
      setSelectedEvent(event);
      setSleepHours(event.sleepHours?.toString() || '');
      setPerformanceScore(event.performanceScore?.toString() || '');
      setExerciseIntensity(event.exerciseIntensity?.toString() || '');
      setDistanceMiles(event.distanceMiles?.toString() || '');
      setLaps(event.laps?.toString() || '');
      setSteps(event.steps?.toString() || '');
      setElevationFeet(event.elevationFeet?.toString() || '');
      setDurationMinutes(event.durationMinutes?.toString() || '');
      setHeartRateAvg(event.heartRateAvg?.toString() || '');
      setHeartRateMax(event.heartRateMax?.toString() || '');
      setCaloriesBurned(event.caloriesBurned?.toString() || '');
      setExerciseNotes(event.exerciseNotes || '');

      // Initialize Phase 1 vitals fields (will be populated from exercise logs in Phase 3.3)
      setPreBpSystolic('');
      setPreBpDiastolic('');
      setPreHeartRate('');
      setPreOxygenSat('');
      setDuringBpSystolic('');
      setDuringBpDiastolic('');
      setDuringHeartRateAvg('');
      setDuringHeartRateMax('');
      setPostBpSystolic('');
      setPostBpDiastolic('');
      setPostHeartRate('');
      setPostOxygenSat('');
      setPerceivedExertion('');
      setStartedAt('');

      // Phase 4 - Fetch exercise details if this is an exercise event
      if (event.exerciseId) {
        try {
          const token = localStorage.getItem('token');
          const exerciseResponse = await fetch(`/api/exercises/${event.exerciseId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (exerciseResponse.ok) {
            const exerciseData = await exerciseResponse.json();
            setCurrentExercise(exerciseData);
          }
        } catch (error) {
          console.error('Failed to load exercise details:', error);
          setCurrentExercise(null);
        }
      } else {
        setCurrentExercise(null);
      }
    }
  };

  const onSubmitEvent = async (data: EventFormData) => {
    try {
      setIsLoading(true);
      
      if (editingEvent) {
        const updated = await api.updateEvent(editingEvent.id, data);
        setEvents(events.map(e => e.id === updated.id ? updated : e));
        toast.success('Event updated successfully');
      } else {
        const newEvent = await api.createEvent(data as CreateEventInput);
        setEvents([...events, newEvent]);
        toast.success('Event created successfully');
      }
      
      setIsEventModalOpen(false);
      reset();
      setEditingEvent(null);
    } catch (error) {
      console.error('Failed to save event:', error);
      toast.error('Failed to save event');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setValue('title', event.title);
    setValue('calendarId', event.calendarId);
    // Format dates based on whether it's an all-day event
    if (event.isAllDay) {
      setValue('startTime', format(new Date(event.startTime), 'yyyy-MM-dd'));
      setValue('endTime', format(new Date(event.endTime), 'yyyy-MM-dd'));
    } else {
      setValue('startTime', format(new Date(event.startTime), "yyyy-MM-dd'T'HH:mm"));
      setValue('endTime', format(new Date(event.endTime), "yyyy-MM-dd'T'HH:mm"));
    }
    setValue('isAllDay', event.isAllDay);
    setValue('location', event.location || '');
    setValue('description', event.description || '');
    setValue('reminderMinutes', event.reminderMinutes);
    setValue('notes', event.notes || '');
    setSelectedEvent(null);
    setIsEventModalOpen(true);
  };

  const handleDeleteEvent = async (event: CalendarEvent) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    
    try {
      await api.deleteEvent(event.id);
      setEvents(events.filter(e => e.id !== event.id));
      toast.success('Event deleted successfully');
      setSelectedEvent(null);
    } catch (error) {
      console.error('Failed to delete event:', error);
      toast.error('Failed to delete event');
    }
  };

  const handleUpdateEventStatus = async (event: CalendarEvent, status: CalendarEvent['status']) => {
    try {
      const updated = await api.updateEventStatus(event.id, status);
      setEvents(events.map(e => e.id === updated.id ? updated : e));
      toast.success(`Event marked as ${status}`);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Failed to update event status:', error);
      toast.error('Failed to update event status');
    }
  };

  const handleDeleteTodayEvents = async () => {
    const today = new Date().toISOString().split('T')[0];
    const todayEvents = events.filter(e => {
      const eventDate = new Date(e.startTime).toISOString().split('T')[0];
      return eventDate === today;
    });

    if (todayEvents.length === 0) {
      toast.error('No events found for today');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete all ${todayEvents.length} event(s) for today? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/events/today', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete today\'s events');

      const result = await response.json();
      setEvents(events.filter(e => {
        const eventDate = new Date(e.startTime).toISOString().split('T')[0];
        return eventDate !== today;
      }));
      toast.success(`Deleted ${result.deletedCount} event(s) from today`);
    } catch (error) {
      console.error('Failed to delete today\'s events:', error);
      toast.error('Failed to delete today\'s events');
    }
  };

  const handleDeleteHistoricEvents = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const historicEvents = events.filter(e => new Date(e.endTime) < today);

    if (historicEvents.length === 0) {
      toast.error('No historic events found');
      return;
    }

    if (!window.confirm(`⚠️ WARNING: This will permanently delete all ${historicEvents.length} past event(s). This action cannot be undone. Are you absolutely sure?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/events/history', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete historic events');

      const result = await response.json();
      setEvents(events.filter(e => new Date(e.endTime) >= today));
      toast.success(`Deleted ${result.deletedCount} historic event(s)`);
    } catch (error) {
      console.error('Failed to delete historic events:', error);
      toast.error('Failed to delete historic events');
    }
  };

  // Export and Print Handlers
  const handleExportToGoogle = () => {
    if (events.length === 0) {
      toast.error('No events to export');
      return;
    }
    exportToGoogleCalendar(events);
    toast.success('Google Calendar file downloaded! Import it to Google Calendar.');
  };

  const handleExportToApple = () => {
    if (events.length === 0) {
      toast.error('No events to export');
      return;
    }
    exportToAppleCalendar(events);
    toast.success('Apple Calendar file downloaded! Double-click to import.');
  };

  const handleExportToCalendly = () => {
    if (events.length === 0) {
      toast.error('No events to export');
      return;
    }
    exportToCalendly(events);

    // Show webhook configuration info
    const webhookConfig = getCalendlyWebhookConfig();
    console.log('Calendly Webhook Configuration:', webhookConfig);
    toast.success('Calendly file downloaded! See console for webhook setup.');
  };

  const handlePrintCalendar = () => {
    printCalendar();
    toast.success('Print dialog opened');
  };

  const handleBackupAsJSON = () => {
    if (events.length === 0 && calendars.length === 0) {
      toast.error('No data to backup');
      return;
    }
    exportAsJSON(events, calendars);
    toast.success('Calendar backup downloaded as JSON');
  };

  const handleExportFullJSON = () => {
    if (events.length === 0 && calendars.length === 0) {
      toast.error('No data to export');
      return;
    }

    // Create a comprehensive JSON export with all calendar-related data
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0',
        dataType: 'Heart Recovery Calendar - Full Export',
      },
      calendars: calendars,
      events: events,
      meals: allMeals,
      medications: medications,
      medicationLogs: medicationLogs,
      sleepLogs: sleepLogs,
      vitals: vitals,
      statistics: {
        totalCalendars: calendars.length,
        totalEvents: events.length,
        totalMeals: allMeals.length,
        totalMedications: medications.length,
        totalSleepLogs: sleepLogs.length,
        totalVitals: vitals.length,
      },
    };

    // Convert to JSON string with pretty formatting
    const jsonString = JSON.stringify(exportData, null, 2);

    // Create blob and download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `heart-recovery-calendar-full-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Full calendar data exported as JSON');
  };

  const handleShowIntegrationInfo = () => {
    const googleConfig = getGoogleCalendarOAuthConfig();
    const calendlyConfig = getCalendlyWebhookConfig();

    alert(`
INTEGRATION SETUP INSTRUCTIONS
==============================

📅 GOOGLE CALENDAR SYNC (OAuth)
${googleConfig.instructions}

📆 CALENDLY WEBHOOK INTEGRATION
${calendlyConfig.instructions}

🔗 Webhook URL: ${calendlyConfig.webhookUrl}

See browser console for full configuration details.
    `);

    console.group('🔧 Integration Configuration');
    console.log('Google Calendar OAuth:', googleConfig);
    console.log('Calendly Webhook:', calendlyConfig);
    console.groupEnd();

    toast.success('Integration details logged to console');
  };

  const handleShareQRCode = () => {
    if (events.length === 0 && calendars.length === 0) {
      toast.error('No calendar data to share');
      return;
    }

    // QR codes have a maximum capacity of ~2953 bytes (for Level H error correction)
    // We'll limit to upcoming events only to keep data small
    const now = new Date();
    const upcomingEvents = events
      .filter(event => new Date(event.startTime) >= now)
      .slice(0, 10) // Limit to 10 upcoming events
      .map(event => ({
        title: event.title,
        start: event.startTime,
        end: event.endTime,
        location: event.location,
      }));

    // Create compact calendar data for QR code
    const calendarData = {
      app: 'HRC', // Shortened app name
      cals: calendars.slice(0, 5).map(cal => ({
        n: cal.name,
        t: cal.type,
      })),
      evts: upcomingEvents,
      date: new Date().toISOString().split('T')[0], // Just date, no time
    };

    // Convert to JSON string
    const jsonData = JSON.stringify(calendarData);

    // Check size (QR codes can handle ~2900 bytes comfortably)
    if (jsonData.length > 2800) {
      toast.error('Too much data for QR code. Try exporting fewer events or use JSON export instead.');
      return;
    }

    setQrCodeData(jsonData);
    setIsQRModalOpen(true);

    toast.success(`QR Code generated with ${upcomingEvents.length} upcoming events!`);
  };

  const handleDownloadQRCode = () => {
    if (!qrCodeRef.current) return;

    const svg = qrCodeRef.current.querySelector('svg');
    if (!svg) return;

    // Convert SVG to data URL
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    // Create download link
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `calendar-qr-code-${format(new Date(), 'yyyy-MM-dd')}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);

    toast.success('QR Code downloaded!');
  };

  const handleUpdateSleepHours = async () => {
    if (!selectedEvent) return;

    try {
      const hours = sleepHours ? parseFloat(sleepHours) : undefined;
      const updated = await api.updateEvent(selectedEvent.id, { sleepHours: hours });
      setEvents(events.map(e => e.id === updated.id ? updated : e));
      setSelectedEvent(updated);
      toast.success('Sleep hours updated successfully');
    } catch (error) {
      console.error('Failed to update sleep hours:', error);
      toast.error('Failed to update sleep hours');
    }
  };

  const handleUpdatePerformanceScore = async () => {
    console.log('🎯 handleUpdatePerformanceScore called');
    console.log('📊 performanceScore state:', performanceScore);
    console.log('🎪 selectedEvent:', selectedEvent);

    if (!selectedEvent) {
      console.error('❌ No selected event');
      toast.error('No event selected');
      return;
    }

    if (!performanceScore || performanceScore === '') {
      console.error('❌ No score selected');
      toast.error('Please select a performance score');
      return;
    }

    try {
      const score = parseInt(performanceScore);
      console.log('📤 Sending API request with score:', score);
      console.log('🆔 Event ID:', selectedEvent.id);

      const updated = await api.updateEvent(selectedEvent.id, { performanceScore: score });

      console.log('✅ API response received:', updated);
      setEvents(events.map(e => e.id === updated.id ? updated : e));
      setSelectedEvent(updated);
      toast.success(`Performance score updated to ${score} points`);
    } catch (error) {
      console.error('❌ Failed to update performance score:', error);
      toast.error('Failed to update performance score');
    }
  };

  const handleUpdateExerciseMetrics = async () => {
    if (!selectedEvent) {
      toast.error('No event selected');
      return;
    }

    try {
      // Step 1: Build calendar event update data (existing fields)
      const updateData: any = {};

      if (exerciseIntensity) updateData.exerciseIntensity = parseInt(exerciseIntensity);
      if (distanceMiles) updateData.distanceMiles = parseFloat(distanceMiles);
      if (laps) updateData.laps = parseInt(laps);
      if (steps) updateData.steps = parseInt(steps);
      if (elevationFeet) updateData.elevationFeet = parseInt(elevationFeet);
      if (durationMinutes) updateData.durationMinutes = parseInt(durationMinutes);
      if (heartRateAvg) updateData.heartRateAvg = parseInt(heartRateAvg);
      if (heartRateMax) updateData.heartRateMax = parseInt(heartRateMax);
      if (caloriesBurned) updateData.caloriesBurned = parseInt(caloriesBurned);
      if (exerciseNotes) updateData.exerciseNotes = exerciseNotes;

      if (Object.keys(updateData).length === 0) {
        toast.error('No metrics to update');
        return;
      }

      // Step 2: Update calendar event (existing behavior)
      const updated = await api.updateEvent(selectedEvent.id, updateData);
      setEvents(events.map(e => e.id === updated.id ? updated : e));
      setSelectedEvent(updated);

      // Step 3: Create exercise log with Phase 1 vitals (NEW - dual storage)
      if (selectedEvent.exerciseId && selectedEvent.prescriptionId) {
        const exerciseLogData: any = {
          prescriptionId: selectedEvent.prescriptionId,
          completedAt: startedAt || new Date().toISOString(),

          // Pre-exercise vitals
          preBpSystolic: preBpSystolic ? parseInt(preBpSystolic) : undefined,
          preBpDiastolic: preBpDiastolic ? parseInt(preBpDiastolic) : undefined,
          preHeartRate: preHeartRate ? parseInt(preHeartRate) : undefined,
          preOxygenSat: preOxygenSat ? parseInt(preOxygenSat) : undefined,

          // During-exercise vitals (FIXED: using correct state variables)
          duringBpSystolic: duringBpSystolic ? parseInt(duringBpSystolic) : undefined,
          duringBpDiastolic: duringBpDiastolic ? parseInt(duringBpDiastolic) : undefined,
          duringHeartRateAvg: duringHeartRateAvg || duringPulse ? parseInt(duringHeartRateAvg || duringPulse) : undefined,
          duringHeartRateMax: duringHeartRateMax ? parseInt(duringHeartRateMax) : undefined,
          duringRespiratoryRate: duringRespiration ? parseInt(duringRespiration) : undefined,

          // Post-exercise vitals
          postBpSystolic: postBpSystolic ? parseInt(postBpSystolic) : undefined,
          postBpDiastolic: postBpDiastolic ? parseInt(postBpDiastolic) : undefined,
          postHeartRate: postHeartRate ? parseInt(postHeartRate) : undefined,
          postOxygenSat: postOxygenSat ? parseInt(postOxygenSat) : undefined,

          // Activity metrics (from existing fields)
          distanceMiles: distanceMiles ? parseFloat(distanceMiles) : undefined,
          laps: laps ? parseInt(laps) : undefined,
          steps: steps ? parseInt(steps) : undefined,
          elevationFeet: elevationFeet ? parseInt(elevationFeet) : undefined,
          caloriesBurned: caloriesBurned ? parseInt(caloriesBurned) : undefined,
          durationMinutes: durationMinutes ? parseInt(durationMinutes) : undefined,

          // Phase 4 - Progressive overload tracking
          actualSets: setsCompleted ? parseInt(setsCompleted) : undefined,
          actualReps: repsPerSet ? parseInt(repsPerSet) : undefined,
          weight: weightUsed ? parseFloat(weightUsed) : undefined,

          // Subjective measures
          perceivedExertion: perceivedExertion ? parseInt(perceivedExertion) : undefined,
          performanceScore: selectedEvent.performanceScore,
          exerciseIntensity: exerciseIntensity || undefined,

          // Phase 4 - PT tracking fields
          difficultyRating: difficultyRating ? parseInt(difficultyRating) : undefined,
          painLevel: painLevel ? parseInt(painLevel) : undefined,
          painLocation: painLocation || undefined,
          rangeOfMotion: rangeOfMotion ? parseInt(rangeOfMotion) : undefined,

          // Notes
          notes: exerciseNotes || undefined,
        };

        // Remove undefined fields
        Object.keys(exerciseLogData).forEach(key => {
          if (exerciseLogData[key] === undefined) {
            delete exerciseLogData[key];
          }
        });

        try {
          await api.createExerciseLog(exerciseLogData);
          console.log('✅ Exercise log created successfully');
        } catch (logError) {
          console.error('⚠️ Failed to create exercise log:', logError);
          // Don't fail the entire operation if log creation fails
          toast.error('Metrics saved to calendar, but failed to create detailed log');
        }
      }

      toast.success('Exercise metrics updated successfully');
    } catch (error) {
      console.error('Failed to update exercise metrics:', error);
      toast.error('Failed to update exercise metrics');
    }
  };

  const createCalendar = async (data: CreateCalendarInput & { assignToUserId?: number }) => {
    try {
      // If assignToUserId is provided (for therapist creating calendar for patient),
      // we need to create it via a different endpoint or handle it specially
      const newCalendar = await api.createCalendar(data);
      setCalendars([...calendars, newCalendar]);

      const assignedTo = data.assignToUserId && data.assignToUserId !== user?.id
        ? patients.find(p => p.userId === data.assignToUserId)?.name
        : 'yourself';

      toast.success(`Calendar created successfully${assignedTo !== 'yourself' ? ` for ${assignedTo}` : ''}`);
      setIsCalendarModalOpen(false);
    } catch (error) {
      console.error('Failed to create calendar:', error);
      toast.error('Failed to create calendar');
    }
  };

  // Generate medication events for the calendar
  const generateMedicationEvents = () => {
    const medEvents: any[] = [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    medications.filter(med => med.isActive).forEach(med => {
      const startDate = parseISO(med.startDate);
      const endDate = med.endDate ? parseISO(med.endDate) : monthEnd;

      // Determine dose times based on frequency
      const getTimes = (freq: string) => {
        if (freq.toLowerCase().includes('once')) return ['09:00'];
        if (freq.toLowerCase().includes('twice') || freq.includes('2')) return ['09:00', '21:00'];
        if (freq.toLowerCase().includes('three') || freq.includes('3')) return ['09:00', '14:00', '21:00'];
        if (freq.toLowerCase().includes('four') || freq.includes('4')) return ['09:00', '13:00', '17:00', '21:00'];
        return ['09:00'];
      };

      const times = getTimes(med.frequency);

      // Generate events for each day in range
      let currentDate = new Date(Math.max(startDate.getTime(), monthStart.getTime()));
      const endLoop = new Date(Math.min(endDate.getTime(), monthEnd.getTime()));

      while (currentDate <= endLoop) {
        times.forEach(time => {
          const eventDateTime = new Date(currentDate);
          const [hours, minutes] = time.split(':');
          eventDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

          // Check if there's a log for this medication at this time
          const log = medicationLogs.find(l =>
            l.medicationId === med.id &&
            new Date(l.scheduledTime).toDateString() === currentDate.toDateString()
          );

          const status = log?.status || 'scheduled';
          const isPast = eventDateTime < now;

          // Color coding based on status
          let backgroundColor, textColor, title, classNames;
          if (status === 'taken') {
            backgroundColor = '#10b981'; // green
            textColor = '#ffffff';
            title = `✓ ${med.name}`;
            classNames = ['font-bold', 'cursor-pointer'];
          } else if (status === 'missed' || (isPast && status === 'scheduled')) {
            backgroundColor = '#dc2626'; // red
            textColor = '#ffffff';
            title = `⚠ ${med.name} - MISSED`;
            classNames = ['font-bold', 'cursor-pointer', 'missed-medication'];
          } else {
            backgroundColor = '#fefce8'; // light yellow
            textColor = '#1e40af'; // cobalt blue
            title = `💊 ${med.name}`;
            classNames = ['font-bold', 'cursor-pointer'];
          }

          medEvents.push({
            id: `med-${med.id}-${currentDate.toISOString()}-${time}`,
            title,
            start: eventDateTime.toISOString(),
            backgroundColor,
            borderColor: status === 'missed' || (isPast && status === 'scheduled') ? '#991b1b' : backgroundColor,
            textColor,
            classNames,
            extendedProps: {
              isMedicationEvent: true,
              medication: med,
              log,
              status,
              scheduledTime: eventDateTime.toISOString(),
            },
          });
        });

        currentDate = addDays(currentDate, 1);
      }
    });

    return medEvents;
  };

  // Create a map of sleep logs by date for quick lookup
  const sleepLogsByDate = sleepLogs.reduce((acc, log) => {
    acc[log.date] = log;
    return acc;
  }, {} as Record<string, SleepLog>);

  // Helper function to get sleep color gradient based on hours
  const getSleepColorGradient = (hours: number) => {
    if (hours >= 0 && hours < 3) {
      // Red - Critical
      return {
        gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #7c2d12 100%)',
        border: '#dc2626'
      };
    } else if (hours >= 3 && hours < 6) {
      // Orange - Poor
      return {
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #7c2d12 100%)',
        border: '#ea580c'
      };
    } else if (hours >= 6 && hours < 9) {
      // Blue - Good
      return {
        gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #7c2d12 100%)',
        border: '#2563eb'
      };
    } else if (hours >= 9 && hours <= 12) {
      // Green - Excellent
      return {
        gradient: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #7c2d12 100%)',
        border: '#059669'
      };
    } else {
      // Gray for > 12 hours
      return {
        gradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 50%, #7c2d12 100%)',
        border: '#4b5563'
      };
    }
  };

  // Create a map of vitals by date for medication tracking
  const vitalsByDate = vitals.reduce((acc, vital) => {
    const dateStr = vital.date.split('T')[0];
    acc[dateStr] = vital;
    return acc;
  }, {} as Record<string, VitalsSample>);

  // Helper function to get medication pill color gradient based on adherence
  const getMedicationPillColorGradient = (medicationsTaken: boolean) => {
    if (medicationsTaken) {
      // Green - All medications taken (3 points)
      return {
        gradient: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #7c2d12 100%)',
        border: '#059669'
      };
    } else {
      // Red - No medications taken (0 points)
      return {
        gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #7c2d12 100%)',
        border: '#dc2626'
      };
    }
  };

  // Get exercise category icon
  const getExerciseIcon = (category: string): string => {
    const iconMap: Record<string, string> = {
      'upper_body': '💪',
      'lower_body': '🦵',
      'cardio': '❤️',
      'flexibility': '🤸',
      'balance': '⚖️',
      'breathing': '🫁',
      'core': '🎯',
    };
    return iconMap[category] || '🏋️';
  };

  // Custom event content renderer - shows icons ONLY for COMPLETED exercises
  const renderEventContent = (eventInfo: any) => {
    const event = eventInfo.event;
    const extendedProps = event.extendedProps;
    const title = event.title || '';

    // Determine font size class based on text length
    const getTextSizeClass = (text: string) => {
      const length = text.length;
      if (length <= 15) return 'event-text-default';
      if (length <= 25) return 'event-text-medium';
      if (length <= 35) return 'event-text-long';
      return 'event-text-very-long';
    };

    // For meal events, show with auto-sizing
    if (extendedProps.isMealEvent) {
      const sizeClass = getTextSizeClass(title);
      return {
        html: `<div class="event-text-wrapper ${sizeClass}">${title}</div>`
      };
    }

    // For exercise events
    if (extendedProps.exerciseId && extendedProps.exercise) {
      const exercise = extendedProps.exercise;
      const isCompleted = extendedProps.status === 'completed';

      // ONLY show icon + checkmark if completed
      if (isCompleted) {
        const icon = getExerciseIcon(exercise.category);
        return {
          html: `
            <div class="exercise-event completed"
                 style="display: flex; align-items: center; justify-content: center; gap: 4px;
                        width: 100%; height: 100%; padding: 4px;">
              <span style="font-size: 18px; line-height: 1;">${icon}</span>
              <span style="font-size: 14px; line-height: 1; color: #10b981;">✓</span>
            </div>
          `
        };
      } else {
        // Show text for incomplete exercises with auto-sizing
        const sizeClass = getTextSizeClass(title);
        return {
          html: `<div class="event-text-wrapper ${sizeClass}">${title}</div>`
        };
      }
    }

    // Default for other events with auto-sizing
    const sizeClass = getTextSizeClass(title);
    return {
      html: `<div class="event-text-wrapper ${sizeClass}">${title}</div>`
    };
  };

  // Custom day cell content to show sleep hours
  const renderDayCellContent = (arg: any) => {
    const dateStr = arg.date.toISOString().split('T')[0];
    const sleepLog = sleepLogsByDate[dateStr];
    const vitalsLog = vitalsByDate[dateStr];

    const sleepColors = sleepLog ? getSleepColorGradient(parseFloat(sleepLog.hoursSlept.toString())) : null;
    const medColors = (vitalsLog && vitalsLog.medicationsTaken !== undefined)
      ? getMedicationPillColorGradient(vitalsLog.medicationsTaken)
      : null;

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Sleep hours indicator - TOP LEFT corner with COLOR-CODED & BURGUNDY theme */}
        {sleepLog && sleepColors && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              navigate('/sleep');
            }}
            style={{
              position: 'absolute',
              top: '-1px',
              left: '5px',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              padding: '2px 4px',
              borderRadius: '0 0 6px 0',
              background: sleepColors.gradient,
              border: `2px solid ${sleepColors.border}`,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              zIndex: 10,
              cursor: 'pointer',
            }}
            title="Click to view sleep journal"
          >
            <span style={{ fontSize: '8px', lineHeight: 1 }}>🛏️</span>
            <span
              style={{
                color: '#ffffff',
                fontSize: '7px',
                fontWeight: 800,
                lineHeight: 1,
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
              }}
            >
              {sleepLog.hoursSlept}h
            </span>
          </div>
        )}

        {/* Medication pill indicator - BOTTOM RIGHT corner with COLOR-CODED & BURGUNDY theme */}
        {medColors && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              navigate('/medications');
            }}
            style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              padding: '2px 4px',
              borderRadius: '6px 0 0 0',
              background: medColors.gradient,
              border: `2px solid ${medColors.border}`,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              zIndex: 10,
              cursor: 'pointer',
            }}
            title="Click to view medications"
          >
            <span style={{ fontSize: '8px', lineHeight: 1 }}>💊</span>
          </div>
        )}

        {/* Default day number - positioned in top right */}
        <div style={{
          position: 'absolute',
          top: '4px',
          right: '8px',
          fontSize: '14px',
          fontWeight: 400
        }}>
          {arg.dayNumberText}
        </div>
      </div>
    );
  };

  // Create calendar events from both regular events and meals
  const calendarEvents = [
    // Filter events based on selected calendars
    ...events
      .filter(event => selectedCalendarIds.length === 0 || selectedCalendarIds.includes(event.calendarId))
      .map(event => {
        const calendar = calendars.find(c => c.id === event.calendarId);
        return {
          id: event.id.toString(),
          title: event.title,
          start: event.startTime,
          end: event.endTime,
          allDay: event.isAllDay,
          backgroundColor: calendar?.color || '#607d8b',
          borderColor: calendar?.color || '#607d8b',
          textColor: '#ffffff',
          extendedProps: {
            ...event,
            calendarType: calendar?.type,
            isMealEvent: false,
          },
        };
      }),
    // Add meal indicators to calendar
    ...Object.entries(
      allMeals.reduce((acc, meal) => {
        const date = new Date(meal.timestamp).toISOString().split('T')[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(meal);
        return acc;
      }, {} as Record<string, MealEntry[]>)
    ).map(([date, meals]) => ({
      id: `meal-${date}`,
      title: `🍽️ ${meals.length} meal${meals.length > 1 ? 's' : ''}`,
      start: date,
      allDay: true,
      backgroundColor: '#f0f9ff',
      borderColor: '#bae6fd',
      textColor: '#800020',
      classNames: ['font-bold', 'meal-indicator'],
      display: 'background',
      extendedProps: {
        isMealEvent: true,
        meals,
      },
    })),
    // Add red warning markers for days with unhealthy foods
    ...Object.entries(
      allMeals.reduce((acc, meal) => {
        const date = new Date(meal.timestamp).toISOString().split('T')[0];
        const isUnhealthy = meal.foodItems.includes('⚠️');
        if (isUnhealthy) {
          if (!acc[date]) acc[date] = 0;
          acc[date]++;
        }
        return acc;
      }, {} as Record<string, number>)
    ).map(([date, count]) => ({
      id: `unhealthy-${date}`,
      title: `🚨 ${count} UNHEALTHY FOOD${count > 1 ? 'S' : ''}`,
      start: date,
      allDay: true,
      backgroundColor: '#dc2626',
      borderColor: '#991b1b',
      textColor: '#ffffff',
      classNames: ['font-bold', 'text-white'],
      extendedProps: {
        isUnhealthyWarning: true,
        count,
      },
    })),
    // Add medication events
    ...generateMedicationEvents()
  ];

  // Determine whose calendar is being viewed
  const getCalendarOwnerDisplay = () => {
    if (selectedCalendarIds.length === 1 && selectedCalendarIds.length < calendars.length) {
      const selectedCalendar = calendars.find(cal => cal.id === selectedCalendarIds[0]);
      if (selectedCalendar) {
        return `Now viewing: ${selectedCalendar.name}`;
      }
    }
    return isViewingAsTherapist && selectedPatient
      ? `${selectedPatient.name}'s Calendar`
      : user?.role === 'admin' || user?.role === 'therapist'
      ? `${user?.role === 'admin' ? 'Admin' : 'Therapist'} ${user?.name}'s Calendar`
      : `${user?.name}'s Calendar`;
  };

  const calendarOwnerDisplay = getCalendarOwnerDisplay();

  return (
    <div className="space-y-3">
      {/* Calendar Title Line */}
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-xs font-bold whitespace-nowrap" style={{ color: '#ff6600' }}>{calendarOwnerDisplay}</h1>

        {/* Patient Selector - Only show for admin/therapist */}
        {(user?.role === 'admin' || user?.role === 'therapist') && patients.length > 0 && (
          <select
            value={selectedPatient?.id?.toString() || 'my-calendar'}
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'my-calendar') {
                setSelectedPatient(null);
              } else {
                const patient = patients.find(p => p.id.toString() === value);
                if (patient) setSelectedPatient(patient);
              }
            }}
            className="text-xs px-2 py-1 rounded bg-white border border-white/10 cursor-pointer font-bold"
            style={{ color: '#1e40af' }}
          >
            <option value="my-calendar" style={{ color: '#1e40af', fontWeight: 700 }}>My Calendar</option>
            <optgroup label="Patients" style={{ color: '#1e40af', fontWeight: 700 }}>
              {patients.map(patient => (
                <option key={patient.id} value={patient.id.toString()} style={{ color: '#1e40af', fontWeight: 700 }}>
                  {patient.name}
                </option>
              ))}
            </optgroup>
          </select>
        )}

      </div>

      {/* Buttons Line */}
      <div className="flex gap-2 items-center overflow-x-auto">
          <Button
            size="sm"
            variant="glass"
            onClick={() => {
              loadCalendarsAndEvents();
              setIsCalendarModalOpen(true);
            }}
            className="text-white whitespace-nowrap"
          >
            <CalendarIcon className="h-4 w-4 mr-1" />
            Manage My Calendars
          </Button>
          <Button
            size="sm"
            onClick={() => {
              reset({ calendarId: calendars[0]?.id, reminderMinutes: 30 });
              setEditingEvent(null);
              setIsEventModalOpen(true);
            }}
            className="text-white whitespace-nowrap"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Event
          </Button>
          <Button
            size="sm"
            variant="glass"
            onClick={handleDeleteTodayEvents}
            className="bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500 whitespace-nowrap"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete Today
          </Button>
          <Button
            size="sm"
            variant="glass"
            onClick={handleDeleteHistoricEvents}
            className="bg-red-500/20 hover:bg-red-500/30 border border-red-500 whitespace-nowrap"
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Delete Historic
          </Button>

          <Button
            size="sm"
            variant="glass"
            onClick={handleExportToGoogle}
            className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400 whitespace-nowrap"
            title="Export to Google Calendar"
          >
            <Download className="h-4 w-4 mr-1" />
            Google
          </Button>
          <Button
            size="sm"
            variant="glass"
            onClick={handleExportToApple}
            className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400 whitespace-nowrap"
            title="Export to Apple Calendar"
          >
            <Download className="h-4 w-4 mr-1" />
            Apple
          </Button>
          <Button
            size="sm"
            variant="glass"
            onClick={handleExportToCalendly}
            className="bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 whitespace-nowrap"
            title="Export for Calendly"
          >
            <Share2 className="h-4 w-4 mr-1" />
            Calendly
          </Button>
          <Button
            size="sm"
            variant="glass"
            onClick={handlePrintCalendar}
            className="bg-green-500/20 hover:bg-green-500/30 border border-green-400 whitespace-nowrap"
            title="Print Calendar"
          >
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
          <Button
            size="sm"
            variant="glass"
            onClick={handleBackupAsJSON}
            className="bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-400 whitespace-nowrap"
            title="Backup as JSON"
          >
            <FileJson className="h-4 w-4 mr-1" />
            Backup
          </Button>
          <Button
            size="sm"
            variant="glass"
            onClick={handleExportFullJSON}
            className="bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400 whitespace-nowrap"
            title="Export Full Calendar Data as JSON"
          >
            <FileJson className="h-4 w-4 mr-1" />
            Export JSON
          </Button>
          <Button
            size="sm"
            variant="glass"
            onClick={handleShareQRCode}
            className="bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400 whitespace-nowrap"
            title="Share via QR Code"
          >
            <QrCode className="h-4 w-4 mr-1" />
            QR Code
          </Button>
          <Button
            size="sm"
            variant="glass"
            onClick={handleShowIntegrationInfo}
            className="bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400 whitespace-nowrap"
            title="Integration Setup Info"
          >
            🔧 API Setup
          </Button>
        </div>

      <GlassCard className="p-6">
        <style>
          {`
            /* LARGER Event text sizing for better visibility */
            .fc-event-title,
            .fc-event-time {
              font-size: 14px !important;
              line-height: 1.3 !important;
            }
            .fc-daygrid-event {
              font-size: 13px !important;
            }
            .fc-timegrid-event {
              font-size: 14px !important;
              min-height: 25px !important;
            }

            /* FORCE all event text to be visible - white bold text */
            .fc-event,
            .fc-event *,
            .fc-event-main,
            .fc-event-main *,
            .fc-event-title,
            .fc-event-time,
            .fc-timegrid-event,
            .fc-timegrid-event *,
            .fc-timegrid-event .fc-event-main,
            .fc-timegrid-event .fc-event-main *,
            .fc-timegrid-event .fc-event-title,
            .fc-timegrid-event .fc-event-time,
            .fc-daygrid-event,
            .fc-daygrid-event *,
            .fc-daygrid-event .fc-event-main,
            .fc-daygrid-event .fc-event-title,
            .fc-h-event,
            .fc-h-event *,
            .fc-h-event .fc-event-main,
            .fc-h-event .fc-event-title {
              color: #ffffff !important;
              font-weight: 700 !important;
              opacity: 1 !important;
              visibility: visible !important;
              display: block !important;
            }

            /* Prevent text overflow and ensure padding */
            .fc-event-main {
              position: relative !important;
              z-index: 10 !important;
              padding: 3px 5px !important;
              overflow: visible !important;
              white-space: normal !important;
            }

            .fc-event-title,
            .fc-event-time {
              text-shadow: 1px 1px 2px rgba(0,0,0,0.5) !important;
              overflow: visible !important;
              white-space: normal !important;
              word-wrap: break-word !important;
            }

            /* Ensure events have minimum height */
            .fc-timegrid-event-harness {
              min-height: 30px !important;
            }

            /* Meal indicator styling - Bold Burgundy text with silver emoji */
            .meal-indicator,
            .meal-indicator .fc-event-title,
            .meal-indicator .fc-event-main {
              color: #800020 !important;
              font-weight: 900 !important;
              font-size: 14px !important;
              text-shadow: 0px 0px 1px rgba(255,255,255,0.8) !important;
            }

            /* Make the emoji appear bright silver/metallic */
            .meal-indicator .fc-event-title::first-letter,
            .meal-indicator::first-letter {
              filter: brightness(1.5) contrast(1.2) saturate(0) !important;
              font-size: 16px !important;
              text-shadow: 0px 0px 3px rgba(192,192,192,1), 0px 0px 5px rgba(255,255,255,0.8) !important;
            }

            /* Bright yellow and red warning triangle for missed medications */
            .missed-medication .fc-event-title::first-letter,
            .missed-medication::first-letter {
              filter: brightness(2) saturate(3) hue-rotate(-10deg) !important;
              font-size: 18px !important;
              text-shadow: 0px 0px 4px rgba(255,215,0,1), 0px 0px 8px rgba(255,69,0,0.8), 0px 0px 12px rgba(255,0,0,0.6) !important;
              font-weight: 900 !important;
            }

            /* ========== ALL CALENDAR ICON/EMOJI STYLING ========== */

            /* Scheduled Medication Pill 💊 - Bright Blue/Purple */
            .fc-event:not(.missed-medication):not(.meal-indicator) .fc-event-title::first-letter {
              filter: brightness(1.5) saturate(2) hue-rotate(10deg) !important;
              font-size: 16px !important;
              text-shadow: 0px 0px 3px rgba(147,51,234,1), 0px 0px 6px rgba(99,102,241,0.8) !important;
            }

            /* Unhealthy Food Siren 🚨 - Bright Red Alert */
            .fc-event[style*="background: rgb(220, 38, 38)"] .fc-event-title::first-letter,
            .fc-event[style*="background-color: rgb(220, 38, 38)"] .fc-event-title::first-letter {
              filter: brightness(2) saturate(3) !important;
              font-size: 18px !important;
              text-shadow: 0px 0px 5px rgba(255,0,0,1), 0px 0px 10px rgba(255,69,0,1) !important;
              animation: pulse-glow 2s ease-in-out infinite !important;
            }

            /* Sleep Bed Icon 🛏️ - Warm Golden/Brown */
            .fc-daygrid-day div[title*="sleep"] span {
              filter: brightness(1.8) saturate(2) hue-rotate(-15deg) !important;
              text-shadow: 0px 0px 3px rgba(139,69,19,0.8), 0px 0px 5px rgba(205,133,63,0.6) !important;
              font-size: 10px !important;
            }

            /* Exercise Weight Icon 🏋️ - Bright Silver/Steel */
            span:has(+ *):contains("🏋️"),
            .fc-event-title:contains("🏋️")::first-letter {
              filter: brightness(1.8) saturate(0) contrast(1.3) !important;
              text-shadow: 0px 0px 3px rgba(192,192,192,1), 0px 0px 6px rgba(169,169,169,0.8) !important;
            }

            /* Taken Medication Checkmark ✓ - Bright Green */
            .fc-event[style*="background: rgb(16, 185, 129)"] .fc-event-title::first-letter,
            .fc-event[style*="background-color: rgb(16, 185, 129)"] .fc-event-title::first-letter {
              filter: brightness(2) saturate(2) !important;
              font-size: 18px !important;
              text-shadow: 0px 0px 4px rgba(34,197,94,1), 0px 0px 8px rgba(74,222,128,0.8) !important;
              font-weight: 900 !important;
            }

            /* ========== COMPLETED EXERCISE STYLING ========== */
            /* Faint blue depressed appearance for completed exercises */
            .fc-event:has(.exercise-event.completed) {
              background: linear-gradient(135deg, rgba(147, 197, 253, 0.3), rgba(191, 219, 254, 0.4)) !important;
              border-color: rgba(96, 165, 250, 0.4) !important;
              box-shadow: inset 0 3px 8px rgba(0, 0, 0, 0.35), inset 0 1px 4px rgba(0, 0, 0, 0.25) !important;
              transform: scale(0.97) !important;
              transition: all 0.3s ease !important;
            }

            .fc-event .exercise-event.completed {
              background: transparent !important;
              width: 100%;
              height: 100%;
            }

            /* Make completed exercise icons and checkmark bright */
            .exercise-event.completed span {
              filter: brightness(1.4) saturate(1.3) drop-shadow(0 0 2px rgba(255,255,255,0.6)) !important;
            }

            /* Hover effect for completed exercises */
            .fc-event:has(.exercise-event.completed):hover {
              transform: scale(0.98) !important;
              box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(96, 165, 250, 0.3) !important;
            }

            /* ========== AUTO-SIZING EVENT TEXT ========== */
            /* Base wrapper for event text with overflow handling */
            .event-text-wrapper {
              width: 100%;
              height: auto;
              min-height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
              padding: 2px 4px;
              line-height: 1.2;
              word-wrap: break-word;
              overflow-wrap: break-word;
              white-space: normal;
              hyphens: auto;
              overflow: hidden;
            }

            /* Short text - default size (0-15 characters) */
            .event-text-default {
              font-size: 13px !important;
              line-height: 1.2 !important;
            }

            /* Medium text (16-25 characters) */
            .event-text-medium {
              font-size: 11px !important;
              line-height: 1.2 !important;
            }

            /* Long text (26-35 characters) - allow wrapping */
            .event-text-long {
              font-size: 10px !important;
              line-height: 1.15 !important;
            }

            /* Very long text (36+ characters) - allow multi-line wrapping */
            .event-text-very-long {
              font-size: 9px !important;
              line-height: 1.15 !important;
            }

            /* Ensure FullCalendar event content can expand vertically */
            .fc-event-main {
              overflow: visible !important;
            }

            .fc-event-title {
              white-space: normal !important;
              overflow: visible !important;
            }

            @keyframes pulse-glow {
              0%, 100% {
                filter: brightness(2) saturate(3);
              }
              50% {
                filter: brightness(2.5) saturate(4);
              }
            }
          `}
        </style>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={calendarEvents}
          dateClick={handleDateClick}
          select={handleSelect}
          eventClick={handleEventClick}
          eventContent={renderEventContent}
          dayCellContent={renderDayCellContent}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          height="auto"
          eventClassNames="cursor-pointer hover:opacity-80 transition-opacity"
        />
      </GlassCard>

      {/* Event Form Modal */}
      <Modal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          reset();
          setEditingEvent(null);
        }}
        title={editingEvent ? 'Edit Event' : 'Create Event'}
        size="md"
      >
        <style>
          {`
            /* Ensure all input fields have visible dark text */
            .glass-input,
            input[type="text"],
            input[type="datetime-local"],
            input[type="date"],
            input[type="number"],
            select.glass-input,
            textarea.glass-input {
              color: #1e40af !important;
              font-weight: 700 !important;
              background: #ffffff !important;
            }

            /* Make labels visible */
            label {
              color: var(--ink) !important;
            }
          `}
        </style>
        <form onSubmit={handleSubmit(onSubmitEvent)} className="space-y-4">
          <Input
            label="Event Title"
            placeholder="Enter event title"
            error={errors.title?.message}
            {...register('title')}
          />

          <Select
            label="Calendar"
            error={errors.calendarId?.message}
            options={calendars.map(cal => ({
              value: cal.id.toString(),
              label: `${cal.name} (${cal.type})`,
            }))}
            {...register('calendarId', { valueAsNumber: true })}
          />

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isAllDay"
              className="rounded border-gray-300"
              {...register('isAllDay')}
            />
            <label htmlFor="isAllDay" className="text-sm font-bold text-green-500">
              All day event
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time"
              type={isAllDay ? 'date' : 'datetime-local'}
              error={errors.startTime?.message}
              {...register('startTime')}
            />

            <Input
              label="End Time"
              type={isAllDay ? 'date' : 'datetime-local'}
              error={errors.endTime?.message}
              {...register('endTime')}
            />
          </div>

          <Input
            label="Location (optional)"
            placeholder="Enter location"
            icon={<MapPin className="h-5 w-5" />}
            {...register('location')}
          />

          <div className="space-y-2">
            <label className="block text-sm font-bold text-orange-500">
              Description (optional)
            </label>
            <textarea
              className="glass-input"
              rows={3}
              placeholder="Enter description"
              {...register('description')}
            />
          </div>

          <Input
            label="Reminder (minutes before)"
            type="number"
            icon={<Clock className="h-5 w-5" />}
            error={errors.reminderMinutes?.message}
            {...register('reminderMinutes', { valueAsNumber: true })}
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsEventModalOpen(false);
                reset();
                setEditingEvent(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isLoading}>
              {editingEvent ? 'Update Event' : 'Create Event'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Event Details Modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => {
          setSelectedEvent(null);
          setSleepHours('');
          setPerformanceScore('');
          setExerciseIntensity('');
          setDistanceMiles('');
          setLaps('');
          setSteps('');
          setElevationFeet('');
          setDurationMinutes('');
          setHeartRateAvg('');
          setHeartRateMax('');
          setCaloriesBurned('');
          setExerciseNotes('');
          setSetsCompleted('');
          setRepsPerSet('');
          setWeightUsed('');
          setDifficultyRating('');
          setPainLevel('');
          setPainLocation('');
          setRangeOfMotion('');
          setDuringHeartRateAvg('');
          setDuringHeartRateMax('');
          setInstructionTab('video');
          setCurrentExercise(null);
        }}
        title="Event Details"
        size="lg"
      >
        {selectedEvent && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-green-500">{selectedEvent.title}</h3>
              <p className="text-sm font-bold mt-1 bg-gray-800 px-3 py-2 rounded-lg">
                {format(new Date(selectedEvent.startTime), 'PPP p')} -
                {format(new Date(selectedEvent.endTime), 'p')}
              </p>
            </div>

            {selectedEvent.location && (
              <div className="flex items-start space-x-2">
                <MapPin className="h-5 w-5 text-orange-500 mt-0.5" />
                <p className="text-orange-600 font-medium">{selectedEvent.location}</p>
              </div>
            )}

            {/* Description - Bright Sunshine Yellow/Orange with high contrast */}
            {selectedEvent.description && (
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-4 border-2 border-orange-300">
                <p className="font-bold text-orange-800 mb-2 text-lg">Description:</p>
                <p className="text-orange-900 font-semibold text-base leading-relaxed">{selectedEvent.description}</p>
              </div>
            )}

            {selectedEvent.notes && (
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-4 border-2 border-orange-300">
                <p className="font-bold text-orange-800 mb-2 text-lg">Notes:</p>
                <p className="text-orange-900 font-semibold text-base leading-relaxed">{selectedEvent.notes}</p>
              </div>
            )}

            {/* Phase 4 - Exercise Instructions Tabs - Only show for exercise events */}
            {selectedEvent.exerciseId && currentExercise && (
              <div className="relative rounded-2xl p-6 mt-4 overflow-hidden backdrop-blur-xl border-2 border-white/30 shadow-2xl">
                {/* Glassmorphic background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/40 via-blue-500/30 to-purple-500/40" />

                {/* Content */}
                <div className="relative z-10">
                  {/* VITAL SIGNS SNAPSHOT WIDGETS */}
                  <div className="mb-4 bg-white/95 backdrop-blur-lg rounded-xl p-4 border-2 border-red-200 shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-red-700 flex items-center gap-2">
                          <Heart className="h-4 w-4" />
                          During-Exercise Vitals Snapshot
                        </h3>
                        {devicesConnected ? (
                          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full animate-pulse">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs font-bold text-green-700">LIVE</span>
                            <span className="text-xs text-green-600">({connectedDevices.join(', ')})</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full">
                            <span className="text-xs font-bold text-gray-600">MANUAL ENTRY</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (duringBpSystolic && duringBpDiastolic && duringPulse && duringRespiration) {
                            const snapshot = {
                              timestamp: new Date().toISOString(),
                              bpSystolic: parseInt(duringBpSystolic),
                              bpDiastolic: parseInt(duringBpDiastolic),
                              pulse: parseInt(duringPulse),
                              respiration: parseInt(duringRespiration)
                            };
                            setVitalSnapshots([...vitalSnapshots, snapshot]);
                            toast.success('Vital signs logged!');
                            // Clear inputs
                            setDuringBpSystolic('');
                            setDuringBpDiastolic('');
                            setDuringPulse('');
                            setDuringRespiration('');
                          } else {
                            toast.error('Please fill all vital signs');
                          }
                        }}
                        className="px-4 py-1.5 bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs font-bold rounded-lg hover:scale-105 transition-transform shadow-md"
                      >
                        Log Vitals
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {/* Blood Pressure */}
                      <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-3 border border-red-200">
                        <label className="text-xs font-bold text-red-700 mb-1 block">Blood Pressure</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            placeholder="120"
                            value={duringBpSystolic}
                            onChange={(e) => setDuringBpSystolic(e.target.value)}
                            readOnly={devicesConnected}
                            className={`w-full px-2 py-1 text-sm font-bold rounded border-2 ${
                              devicesConnected
                                ? 'bg-green-50 border-green-400 cursor-not-allowed'
                                : 'border-red-300 focus:border-red-500'
                            } focus:outline-none`}
                          />
                          <span className="text-red-700 font-bold">/</span>
                          <input
                            type="number"
                            placeholder="80"
                            value={duringBpDiastolic}
                            onChange={(e) => setDuringBpDiastolic(e.target.value)}
                            readOnly={devicesConnected}
                            className={`w-full px-2 py-1 text-sm font-bold rounded border-2 ${
                              devicesConnected
                                ? 'bg-green-50 border-green-400 cursor-not-allowed'
                                : 'border-red-300 focus:border-red-500'
                            } focus:outline-none`}
                          />
                        </div>
                        <span className="text-xs text-red-600 font-semibold">mmHg</span>
                      </div>

                      {/* Pulse */}
                      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-3 border border-orange-200">
                        <label className="text-xs font-bold text-orange-700 mb-1 block">Pulse</label>
                        <input
                          type="number"
                          placeholder="72"
                          value={duringPulse}
                          onChange={(e) => setDuringPulse(e.target.value)}
                          readOnly={devicesConnected}
                          className={`w-full px-2 py-1.5 text-sm font-bold rounded border-2 ${
                            devicesConnected
                              ? 'bg-green-50 border-green-400 cursor-not-allowed'
                              : 'border-orange-300 focus:border-orange-500'
                          } focus:outline-none`}
                        />
                        <span className="text-xs text-orange-600 font-semibold">bpm</span>
                      </div>

                      {/* Respiration */}
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-3 border border-blue-200">
                        <label className="text-xs font-bold text-blue-700 mb-1 block">Respiration</label>
                        <input
                          type="number"
                          placeholder="16"
                          value={duringRespiration}
                          onChange={(e) => setDuringRespiration(e.target.value)}
                          readOnly={devicesConnected}
                          className={`w-full px-2 py-1.5 text-sm font-bold rounded border-2 ${
                            devicesConnected
                              ? 'bg-green-50 border-green-400 cursor-not-allowed'
                              : 'border-blue-300 focus:border-blue-500'
                          } focus:outline-none`}
                        />
                        <span className="text-xs text-blue-600 font-semibold">breaths/min</span>
                      </div>
                    </div>

                    {/* Logged Snapshots Display */}
                    {vitalSnapshots.length > 0 && (
                      <div className="mt-3 p-2 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-xs font-bold text-green-700 mb-1">Logged Snapshots ({vitalSnapshots.length}):</p>
                        <div className="flex flex-wrap gap-2">
                          {vitalSnapshots.map((snap, idx) => (
                            <div key={idx} className="text-xs bg-white px-2 py-1 rounded border border-green-300">
                              <span className="font-bold text-blue-700">{snap.bpSystolic}/{snap.bpDiastolic}</span>
                              {' | '}
                              <span className="font-bold text-blue-700">{snap.pulse} bpm</span>
                              {' | '}
                              <span className="font-bold text-blue-700">{snap.respiration} br/min</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tabs and Rest Timer Button */}
                  <div className="flex items-center justify-between mb-6 border-b-2 border-white/40 pb-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setInstructionTab('video')}
                        className={`px-6 py-3 font-bold text-lg rounded-t-xl transition-all shadow-lg ${
                          instructionTab === 'video'
                            ? 'bg-white/95 text-cyan-700 border-b-4 border-cyan-600'
                            : 'bg-white/40 text-white hover:bg-white/60'
                        }`}
                      >
                        📹 Video
                      </button>
                      <button
                        onClick={() => setInstructionTab('images')}
                        className={`px-6 py-3 font-bold text-lg rounded-t-xl transition-all shadow-lg ${
                          instructionTab === 'images'
                            ? 'bg-white/95 text-cyan-700 border-b-4 border-cyan-600'
                            : 'bg-white/40 text-white hover:bg-white/60'
                        }`}
                      >
                        📸 Images
                      </button>
                      <button
                        onClick={() => setInstructionTab('instructions')}
                        className={`px-6 py-3 font-bold text-lg rounded-t-xl transition-all shadow-lg ${
                          instructionTab === 'instructions'
                            ? 'bg-white/95 text-cyan-700 border-b-4 border-cyan-600'
                            : 'bg-white/40 text-white hover:bg-white/60'
                        }`}
                      >
                        📝 Instructions
                      </button>
                    </div>

                    {/* Rest Timer Button */}
                    <button
                      onClick={() => setShowRestTimer(true)}
                      className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-lg rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-2xl hover:shadow-purple-500/50 hover:scale-105"
                    >
                      <Timer className="h-5 w-5" />
                      <span>Rest Timer</span>
                    </button>
                  </div>

                  {/* Tab Content - Glassmorphic */}
                  <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-6 border-2 border-white/50 shadow-inner min-h-[280px] max-h-[500px] overflow-y-auto">
                    {instructionTab === 'video' && (
                      <div className="space-y-4">
                        {currentExercise.videoUrl ? (
                          <div className="flex flex-col items-center space-y-4">
                            <iframe
                              width="420"
                              height="315"
                              src={`${currentExercise.videoUrl.replace('watch?v=', 'embed/')}?autoplay=0&rel=0&modestbranding=1&playsinline=1`}
                              title={currentExercise.name}
                              frameBorder="0"
                              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                              className="rounded-xl shadow-2xl border-4 border-cyan-500/30"
                            ></iframe>
                            <p className="text-lg text-cyan-900 font-bold">{currentExercise.name}</p>
                          </div>
                        ) : (
                          <p className="text-gray-700 font-semibold italic text-center py-8">No video available for this exercise</p>
                        )}

                        {/* UPLOAD VIDEO BUTTON or REST TIMER */}
                        <div className="border-t-2 border-cyan-300 pt-4 mt-4 relative">
                          {showRestTimer ? (
                            <RestTimer onClose={() => setShowRestTimer(false)} isCompact={true} />
                          ) : (
                            <label className="flex flex-col items-center px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl shadow-lg hover:from-cyan-600 hover:to-blue-700 cursor-pointer transition-all hover:scale-105">
                              <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              <span className="text-lg font-bold">Upload Your Exercise Video</span>
                              <span className="text-sm mt-1 opacity-90">MP4, MOV, AVI - Max 100MB</span>
                              <input type="file" className="hidden" accept="video/*" />
                            </label>
                          )}
                        </div>
                      </div>
                    )}

                    {instructionTab === 'images' && (
                      <div className="space-y-4">
                        {currentExercise.imageUrl ? (
                          <div className="flex flex-col items-center space-y-4">
                            <img
                              src={currentExercise.imageUrl}
                              alt={currentExercise.name}
                              className="max-w-full h-auto rounded-xl shadow-2xl border-4 border-pink-500/30"
                              style={{ maxHeight: '400px' }}
                            />
                            <p className="text-lg text-pink-900 font-bold">{currentExercise.name}</p>
                          </div>
                        ) : (
                          <p className="text-gray-700 font-semibold italic text-center py-8">No images available for this exercise</p>
                        )}

                        {/* UPLOAD IMAGE BUTTON */}
                        <div className="border-t-2 border-pink-300 pt-4 mt-4">
                          <label className="flex flex-col items-center px-6 py-4 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-xl shadow-lg hover:from-pink-600 hover:to-rose-700 cursor-pointer transition-all hover:scale-105">
                            <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-lg font-bold">Upload Exercise Image</span>
                            <span className="text-sm mt-1 opacity-90">JPG, PNG, GIF - Max 10MB</span>
                            <input type="file" className="hidden" accept="image/*" />
                          </label>
                        </div>
                      </div>
                    )}

                  {instructionTab === 'instructions' && (
                    <div className="space-y-3">
                      {currentExercise.instructions && (
                        <div>
                          <h4 className="font-bold text-cyan-700 mb-2">📋 Instructions:</h4>
                          <p className="text-gray-700 whitespace-pre-wrap">{currentExercise.instructions}</p>
                        </div>
                      )}
                      {currentExercise.formTips && (
                        <div>
                          <h4 className="font-bold text-cyan-700 mb-2">✅ Form Tips:</h4>
                          <p className="text-gray-700 whitespace-pre-wrap">{currentExercise.formTips}</p>
                        </div>
                      )}
                      {currentExercise.contraindications && (
                        <div>
                          <h4 className="font-bold text-red-700 mb-2">⚠️ Contraindications:</h4>
                          <p className="text-red-600 whitespace-pre-wrap">{currentExercise.contraindications}</p>
                        </div>
                      )}
                      {currentExercise.modifications && (
                        <div>
                          <h4 className="font-bold text-cyan-700 mb-2">🔄 Modifications:</h4>
                          <p className="text-gray-700 whitespace-pre-wrap">{currentExercise.modifications}</p>
                        </div>
                      )}
                      {!currentExercise.instructions && !currentExercise.formTips && !currentExercise.contraindications && !currentExercise.modifications && (
                        <p className="text-gray-500 italic text-center py-8">No detailed instructions available for this exercise</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}

            {/* Performance Score Section - Only show for exercise events */}
            {selectedEvent.exerciseId && (
              <div className="relative rounded-2xl p-6 mt-4 overflow-hidden backdrop-blur-xl border-2 border-white/30 shadow-2xl">
                {/* Glassmorphic gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/40 via-fuchsia-500/30 to-pink-500/40" />

                {/* Content */}
                <div className="relative z-10">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-3xl">🏋️</span>
                    <p className="font-black text-white text-xl drop-shadow-lg">Exercise Performance Score</p>
                  </div>
                  <p className="text-base text-white font-bold mb-4 drop-shadow">Rate the patient's performance for this exercise session</p>

                  <div className="flex items-center space-x-3">
                    <select
                      value={performanceScore}
                      onChange={(e) => setPerformanceScore(e.target.value)}
                      className="flex-1 px-4 py-3 bg-white/95 text-gray-900 font-bold text-lg rounded-xl border-2 border-purple-400/50 focus:border-purple-600 focus:ring-4 focus:ring-purple-400/30 outline-none shadow-lg"
                    >
                      <option value="">Select Score...</option>
                      <option value="0" style={{ color: '#dc2626' }}>0 - No Show (Red)</option>
                      <option value="4" style={{ color: '#ea580c' }}>4 - Completed (Orange)</option>
                      <option value="6" style={{ color: '#2563eb' }}>6 - Met Goals (Blue)</option>
                      <option value="8" style={{ color: '#059669' }}>8 - Exceeded Goals (Green)</option>
                    </select>
                    <Button
                      size="sm"
                      onClick={handleUpdatePerformanceScore}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 font-bold text-lg px-6 py-3 shadow-xl hover:scale-105 transition-all"
                    >
                      Save Score
                    </Button>
                  </div>

                  {selectedEvent.performanceScore !== undefined && selectedEvent.performanceScore !== null && (
                    <div className="mt-3 bg-white/95 backdrop-blur rounded-xl px-4 py-2 border-2 border-purple-400/50 shadow-lg">
                      <p className="text-purple-900 font-black text-base">
                        Current Score: {selectedEvent.performanceScore} points
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Exercise Metrics Section - Only show for exercise events */}
            {selectedEvent.exerciseId && (
              <div className="relative rounded-2xl p-6 mt-4 overflow-hidden backdrop-blur-xl border-2 border-white/30 shadow-2xl">
                {/* Glassmorphic gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/40 via-cyan-500/30 to-blue-500/40" />

                {/* Content */}
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">📊</span>
                      <p className="font-black text-white text-xl drop-shadow-lg">Exercise Metrics</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleUpdateExerciseMetrics}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 font-bold text-lg px-6 py-3 shadow-xl hover:scale-105 transition-all"
                    >
                      Save All Metrics
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Intensity */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">Intensity (1-10)</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={exerciseIntensity}
                        onChange={(e) => setExerciseIntensity(e.target.value)}
                        placeholder="e.g., 7"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-teal-400/50 focus:border-teal-500 focus:ring-4 focus:ring-teal-400/30 outline-none shadow-lg"
                      />
                      {selectedEvent.exerciseIntensity && (
                        <p className="text-xs text-white font-bold mt-1 drop-shadow">Current: {selectedEvent.exerciseIntensity}</p>
                      )}
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">Duration (minutes)</label>
                      <input
                        type="number"
                        min="0"
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(e.target.value)}
                        placeholder="e.g., 30"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-teal-400/50 focus:border-teal-500 focus:ring-4 focus:ring-teal-400/30 outline-none shadow-lg"
                      />
                      {selectedEvent.durationMinutes && (
                        <p className="text-xs text-white font-bold mt-1 drop-shadow">Current: {selectedEvent.durationMinutes} min</p>
                      )}
                    </div>

                    {/* Distance */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">Distance (miles)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={distanceMiles}
                        onChange={(e) => setDistanceMiles(e.target.value)}
                        placeholder="e.g., 2.5"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-teal-400/50 focus:border-teal-500 focus:ring-4 focus:ring-teal-400/30 outline-none shadow-lg"
                      />
                      {selectedEvent.distanceMiles && (
                        <p className="text-xs text-white font-bold mt-1 drop-shadow">Current: {selectedEvent.distanceMiles} mi</p>
                      )}
                    </div>

                    {/* Steps */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">Steps</label>
                      <input
                        type="number"
                        min="0"
                        value={steps}
                        onChange={(e) => setSteps(e.target.value)}
                        placeholder="e.g., 5000"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-teal-400/50 focus:border-teal-500 focus:ring-4 focus:ring-teal-400/30 outline-none shadow-lg"
                      />
                      {selectedEvent.steps && (
                        <p className="text-xs text-white font-bold mt-1 drop-shadow">Current: {selectedEvent.steps.toLocaleString()}</p>
                      )}
                    </div>

                    {/* Laps */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">Laps</label>
                      <input
                        type="number"
                        min="0"
                        value={laps}
                        onChange={(e) => setLaps(e.target.value)}
                        placeholder="e.g., 10"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-teal-400/50 focus:border-teal-500 focus:ring-4 focus:ring-teal-400/30 outline-none shadow-lg"
                      />
                      {selectedEvent.laps && (
                        <p className="text-xs text-white font-bold mt-1 drop-shadow">Current: {selectedEvent.laps}</p>
                      )}
                    </div>

                    {/* Elevation */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">Elevation (feet)</label>
                      <input
                        type="number"
                        min="0"
                        value={elevationFeet}
                        onChange={(e) => setElevationFeet(e.target.value)}
                        placeholder="e.g., 250"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-teal-400/50 focus:border-teal-500 focus:ring-4 focus:ring-teal-400/30 outline-none shadow-lg"
                      />
                      {selectedEvent.elevationFeet && (
                        <p className="text-xs text-white font-bold mt-1 drop-shadow">Current: {selectedEvent.elevationFeet} ft</p>
                      )}
                    </div>

                    {/* Heart Rate Average */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">Avg Heart Rate (bpm)</label>
                      <input
                        type="number"
                        min="0"
                        value={heartRateAvg}
                        onChange={(e) => setHeartRateAvg(e.target.value)}
                        placeholder="e.g., 120"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-teal-400/50 focus:border-teal-500 focus:ring-4 focus:ring-teal-400/30 outline-none shadow-lg"
                      />
                      {selectedEvent.heartRateAvg && (
                        <p className="text-xs text-white font-bold mt-1 drop-shadow">Current: {selectedEvent.heartRateAvg} bpm</p>
                      )}
                    </div>

                    {/* Heart Rate Max */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">Max Heart Rate (bpm)</label>
                      <input
                        type="number"
                        min="0"
                        value={heartRateMax}
                        onChange={(e) => setHeartRateMax(e.target.value)}
                        placeholder="e.g., 150"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-teal-400/50 focus:border-teal-500 focus:ring-4 focus:ring-teal-400/30 outline-none shadow-lg"
                      />
                      {selectedEvent.heartRateMax && (
                        <p className="text-xs text-white font-bold mt-1 drop-shadow">Current: {selectedEvent.heartRateMax} bpm</p>
                      )}
                    </div>

                    {/* Calories */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">Calories Burned</label>
                      <input
                        type="number"
                        min="0"
                        value={caloriesBurned}
                        onChange={(e) => setCaloriesBurned(e.target.value)}
                        placeholder="e.g., 350"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-teal-400/50 focus:border-teal-500 focus:ring-4 focus:ring-teal-400/30 outline-none shadow-lg"
                      />
                      {selectedEvent.caloriesBurned && (
                        <p className="text-xs text-white font-bold mt-1 drop-shadow">Current: {selectedEvent.caloriesBurned} cal</p>
                      )}
                    </div>

                    {/* Phase 4 - Progressive Overload Fields */}
                    {/* Sets Completed */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">Sets Completed</label>
                      <input
                        type="number"
                        min="0"
                        value={setsCompleted}
                        onChange={(e) => setSetsCompleted(e.target.value)}
                        placeholder="e.g., 3"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-teal-400/50 focus:border-teal-500 focus:ring-4 focus:ring-teal-400/30 outline-none shadow-lg"
                      />
                      <p className="text-xs text-white/90 font-bold mt-1 drop-shadow">Number of sets performed</p>
                    </div>

                    {/* Reps Per Set */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">Reps per Set</label>
                      <input
                        type="number"
                        min="0"
                        value={repsPerSet}
                        onChange={(e) => setRepsPerSet(e.target.value)}
                        placeholder="e.g., 12"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-teal-400/50 focus:border-teal-500 focus:ring-4 focus:ring-teal-400/30 outline-none shadow-lg"
                      />
                      <p className="text-xs text-white/90 font-bold mt-1 drop-shadow">Repetitions per set</p>
                    </div>

                    {/* Weight Used */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">Weight Used (lbs)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={weightUsed}
                        onChange={(e) => setWeightUsed(e.target.value)}
                        placeholder="e.g., 25"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-teal-400/50 focus:border-teal-500 focus:ring-4 focus:ring-teal-400/30 outline-none shadow-lg"
                      />
                      <p className="text-xs text-white/90 font-bold mt-1 drop-shadow">Weight in pounds (if applicable)</p>
                    </div>
                  </div>

                  {/* Notes - Full Width */}
                  <div className="mt-6">
                    <label className="block text-sm font-bold text-white mb-2 drop-shadow">Exercise Notes</label>
                    <textarea
                      value={exerciseNotes}
                      onChange={(e) => setExerciseNotes(e.target.value)}
                      placeholder="Add any additional notes about this exercise session..."
                      rows={3}
                      className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-teal-400/50 focus:border-teal-500 focus:ring-4 focus:ring-teal-400/30 outline-none resize-none shadow-lg"
                    />
                    {selectedEvent.exerciseNotes && (
                      <p className="text-xs text-white font-bold mt-1 drop-shadow">Current notes: {selectedEvent.exerciseNotes}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Pre-Exercise Vitals Section - Phase 1 */}
            {selectedEvent.exerciseId && (
              <div className="relative rounded-2xl p-6 mt-4 overflow-hidden backdrop-blur-xl border-2 border-white/30 shadow-2xl">
                {/* Glassmorphic gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/40 via-indigo-500/30 to-cyan-500/40" />

                {/* Content */}
                <div className="relative z-10">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-3xl">🩺</span>
                    <p className="font-black text-white text-xl drop-shadow-lg">Pre-Exercise Vitals</p>
                  </div>
                  <p className="text-base text-white font-bold mb-4 drop-shadow">Record vitals before starting exercise</p>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Pre-BP Systolic */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">BP Systolic (mmHg)</label>
                      <input
                        type="number"
                        min="0"
                        max="250"
                        value={preBpSystolic}
                        onChange={(e) => setPreBpSystolic(e.target.value)}
                        placeholder="e.g., 120"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-blue-400/50 focus:border-blue-500 focus:ring-4 focus:ring-blue-400/30 outline-none shadow-lg"
                      />
                    </div>

                    {/* Pre-BP Diastolic */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">BP Diastolic (mmHg)</label>
                      <input
                        type="number"
                        min="0"
                        max="150"
                        value={preBpDiastolic}
                        onChange={(e) => setPreBpDiastolic(e.target.value)}
                        placeholder="e.g., 80"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-blue-400/50 focus:border-blue-500 focus:ring-4 focus:ring-blue-400/30 outline-none shadow-lg"
                      />
                    </div>

                    {/* Pre-Heart Rate */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">Heart Rate (bpm)</label>
                      <input
                        type="number"
                        min="0"
                        max="250"
                        value={preHeartRate}
                        onChange={(e) => setPreHeartRate(e.target.value)}
                        placeholder="e.g., 70"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-blue-400/50 focus:border-blue-500 focus:ring-4 focus:ring-blue-400/30 outline-none shadow-lg"
                      />
                    </div>

                    {/* Pre-Oxygen Sat */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">Oxygen Sat (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={preOxygenSat}
                        onChange={(e) => setPreOxygenSat(e.target.value)}
                        placeholder="e.g., 98"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-blue-400/50 focus:border-blue-500 focus:ring-4 focus:ring-blue-400/30 outline-none shadow-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* During-Exercise Vitals Section - Phase 1 */}
            {selectedEvent.exerciseId && (
              <div className="relative rounded-2xl p-6 mt-4 overflow-hidden backdrop-blur-xl border-2 border-white/30 shadow-2xl">
                {/* Glassmorphic gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/40 via-purple-500/30 to-pink-500/40" />

                {/* Content */}
                <div className="relative z-10">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-3xl">💓</span>
                    <p className="font-black text-white text-xl drop-shadow-lg">During-Exercise Vitals</p>
                  </div>
                  <p className="text-base text-white font-bold mb-4 drop-shadow">Monitor vitals during activity</p>

                  <div className="grid grid-cols-2 gap-4">
                    {/* During-BP Systolic */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">BP Systolic (mmHg)</label>
                      <input
                        type="number"
                        min="0"
                        max="250"
                        value={duringBpSystolic}
                        onChange={(e) => setDuringBpSystolic(e.target.value)}
                        placeholder="e.g., 140"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-indigo-400/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-400/30 outline-none shadow-lg"
                      />
                    </div>

                    {/* During-BP Diastolic */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">BP Diastolic (mmHg)</label>
                      <input
                        type="number"
                        min="0"
                        max="150"
                        value={duringBpDiastolic}
                        onChange={(e) => setDuringBpDiastolic(e.target.value)}
                        placeholder="e.g., 90"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-indigo-400/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-400/30 outline-none shadow-lg"
                      />
                    </div>

                    {/* During-Heart Rate Average */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">Avg Heart Rate (bpm)</label>
                      <input
                        type="number"
                        min="0"
                        max="250"
                        value={duringHeartRateAvg}
                        onChange={(e) => setDuringHeartRateAvg(e.target.value)}
                        placeholder="e.g., 130"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-indigo-400/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-400/30 outline-none shadow-lg"
                      />
                      <p className="text-xs text-white/90 font-bold mt-1 drop-shadow">Average pulse during exercise</p>
                    </div>

                    {/* During-Heart Rate Max */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">Max Heart Rate (bpm)</label>
                      <input
                        type="number"
                        min="0"
                        max="250"
                        value={duringHeartRateMax}
                        onChange={(e) => setDuringHeartRateMax(e.target.value)}
                        placeholder="e.g., 155"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-indigo-400/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-400/30 outline-none shadow-lg"
                      />
                      <p className="text-xs text-white/90 font-bold mt-1 drop-shadow">Peak pulse during exercise</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Post-Exercise Vitals Section - Phase 1 */}
            {selectedEvent.exerciseId && (
              <div className="relative rounded-2xl p-6 mt-4 overflow-hidden backdrop-blur-xl border-2 border-white/30 shadow-2xl">
                {/* Glassmorphic gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/40 via-teal-500/30 to-green-500/40" />

                {/* Content */}
                <div className="relative z-10">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-3xl">🏁</span>
                    <p className="font-black text-white text-xl drop-shadow-lg">Post-Exercise Vitals (Recovery)</p>
                  </div>
                  <p className="text-base text-white font-bold mb-4 drop-shadow">Record vitals after exercise completion</p>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Post-BP Systolic */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">BP Systolic (mmHg)</label>
                      <input
                        type="number"
                        min="0"
                        max="250"
                        value={postBpSystolic}
                        onChange={(e) => setPostBpSystolic(e.target.value)}
                        placeholder="e.g., 125"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-emerald-400/50 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-400/30 outline-none shadow-lg"
                      />
                    </div>

                    {/* Post-BP Diastolic */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">BP Diastolic (mmHg)</label>
                      <input
                        type="number"
                        min="0"
                        max="150"
                        value={postBpDiastolic}
                        onChange={(e) => setPostBpDiastolic(e.target.value)}
                        placeholder="e.g., 82"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-emerald-400/50 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-400/30 outline-none shadow-lg"
                      />
                    </div>

                    {/* Post-Heart Rate */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">Heart Rate (bpm)</label>
                      <input
                        type="number"
                        min="0"
                        max="250"
                        value={postHeartRate}
                        onChange={(e) => setPostHeartRate(e.target.value)}
                        placeholder="e.g., 85"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-emerald-400/50 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-400/30 outline-none shadow-lg"
                      />
                    </div>

                    {/* Post-Oxygen Sat */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">Oxygen Sat (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={postOxygenSat}
                        onChange={(e) => setPostOxygenSat(e.target.value)}
                        placeholder="e.g., 97"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-emerald-400/50 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-400/30 outline-none shadow-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Perceived Exertion & Timestamp Section - Phase 1 */}
            {selectedEvent.exerciseId && (
              <div className="relative rounded-2xl p-6 mt-4 overflow-hidden backdrop-blur-xl border-2 border-white/30 shadow-2xl">
                {/* Glassmorphic gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/40 via-orange-500/30 to-yellow-500/40" />

                {/* Content */}
                <div className="relative z-10">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-3xl">💪</span>
                    <p className="font-black text-white text-xl drop-shadow-lg">Subjective Measures</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Perceived Exertion (Borg RPE) */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">Perceived Exertion (Borg RPE 1-10)</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={perceivedExertion}
                        onChange={(e) => setPerceivedExertion(e.target.value)}
                        placeholder="1=Very Easy, 10=Max Effort"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-amber-400/50 focus:border-amber-500 focus:ring-4 focus:ring-amber-400/30 outline-none shadow-lg placeholder:text-gray-500"
                      />
                      <p className="text-xs text-white/90 font-bold mt-1 drop-shadow">1=Very Easy → 10=Maximum Effort</p>
                    </div>

                    {/* Started At Timestamp */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">Exercise Start Time</label>
                      <input
                        type="datetime-local"
                        value={startedAt}
                        onChange={(e) => setStartedAt(e.target.value)}
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-amber-400/50 focus:border-amber-500 focus:ring-4 focus:ring-amber-400/30 outline-none shadow-lg"
                      />
                      <p className="text-xs text-white/90 font-bold mt-1 drop-shadow">When did the exercise begin?</p>
                    </div>

                    {/* Phase 4 - PT Tracking Fields */}
                    {/* Difficulty Rating */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">Difficulty Rating (1-10)</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={difficultyRating}
                        onChange={(e) => setDifficultyRating(e.target.value)}
                        placeholder="1=Too Easy, 10=Too Hard"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-amber-400/50 focus:border-amber-500 focus:ring-4 focus:ring-amber-400/30 outline-none shadow-lg placeholder:text-gray-500"
                      />
                      <p className="text-xs text-white/90 font-bold mt-1 drop-shadow">How difficult was this exercise?</p>
                    </div>

                    {/* Pain Level */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">Pain Level (0-10)</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={painLevel}
                        onChange={(e) => setPainLevel(e.target.value)}
                        placeholder="0=No Pain, 10=Worst Pain"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-amber-400/50 focus:border-amber-500 focus:ring-4 focus:ring-amber-400/30 outline-none shadow-lg placeholder:text-gray-500"
                      />
                      <p className="text-xs text-white/90 font-bold mt-1 drop-shadow">0=No Pain → 10=Maximum Pain</p>
                    </div>

                    {/* Range of Motion */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">Range of Motion (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={rangeOfMotion}
                        onChange={(e) => setRangeOfMotion(e.target.value)}
                        placeholder="e.g., 85"
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-amber-400/50 focus:border-amber-500 focus:ring-4 focus:ring-amber-400/30 outline-none shadow-lg placeholder:text-gray-500"
                      />
                      <p className="text-xs text-white/90 font-bold mt-1 drop-shadow">% of normal range achieved</p>
                    </div>

                    {/* Pain Location - Full Width */}
                    <div className="col-span-2">
                      <label className="block text-sm font-bold text-white mb-2 drop-shadow">Pain Location (if any)</label>
                      <input
                        type="text"
                        value={painLocation}
                        onChange={(e) => setPainLocation(e.target.value)}
                        placeholder="e.g., Left knee, lower back, right shoulder..."
                        disabled={!painLevel || parseInt(painLevel) === 0}
                        className="w-full px-4 py-3 bg-white/90 text-gray-900 font-semibold rounded-xl border-2 border-amber-400/50 focus:border-amber-500 focus:ring-4 focus:ring-amber-400/30 outline-none shadow-lg placeholder:text-gray-500 disabled:bg-white/50 disabled:cursor-not-allowed"
                      />
                      <p className="text-xs text-white/90 font-bold mt-1 drop-shadow">Describe where pain occurred (only if pain level {'>'} 0)</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold">Status:</span>
              <span
                className={`px-2 py-1 text-xs font-bold rounded-full ${
                  selectedEvent.status === 'completed'
                    ? 'bg-green-600'
                    : selectedEvent.status === 'missed'
                    ? 'bg-red-600'
                    : selectedEvent.status === 'cancelled'
                    ? 'bg-gray-600'
                    : 'bg-blue-600'
                }`}
              >
                {selectedEvent.status}
              </span>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <div className="flex space-x-2">
                {selectedEvent.status === 'scheduled' && (
                  <>
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => handleUpdateEventStatus(selectedEvent, 'completed')}
                    >
                      Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleUpdateEventStatus(selectedEvent, 'missed')}
                    >
                      Missed
                    </Button>
                  </>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="glass"
                  onClick={() => handleEditEvent(selectedEvent)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleDeleteEvent(selectedEvent)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Calendar Management Modal */}
      <Modal
        isOpen={isCalendarModalOpen}
        onClose={() => {
          setIsCalendarModalOpen(false);
          setEditingCalendar(null);
          setCalendarFormData({ name: '', type: 'general', color: '#607d8b', assignToPatientId: 0 });
          setSelectedPatientForCalendar(undefined);
          setSelectedCalendarForView(null);
        }}
        title={editingCalendar ? 'Edit Calendar' : 'Manage My Calendars'}
        size="lg"
      >
        <div className="space-y-4">
          {!editingCalendar ? (
            <>
              {/* Calendar Selector - Two-Step Process */}
              <div className="space-y-4">
                {/* Step 1: Select Person */}
                <div>
                  <label className="block text-sm font-bold mb-2">1. Select Calendar Owner</label>
                  <select
                    value={selectedPatientForCalendar === null ? 'admin' : selectedPatientForCalendar || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setSelectedPatientForCalendar(undefined);
                        setSelectedCalendarForView(null);
                      } else if (value === 'admin') {
                        setSelectedPatientForCalendar(null);
                        setSelectedCalendarForView(null);
                      } else {
                        setSelectedPatientForCalendar(parseInt(value));
                        setSelectedCalendarForView(null);
                      }
                    }}
                    className="w-full px-4 py-2 rounded-lg bg-white border-2 border-white/30 font-bold focus:border-blue-500 focus:outline-none transition-colors"
                    style={{ color: '#1e40af', maxHeight: '300px', overflowY: 'auto' }}
                  >
                    <option value="" style={{ color: '#1e40af', fontWeight: 700 }}>
                      -- Select Owner --
                    </option>

                    {/* Admin/Current User at Top */}
                    <option value="admin" style={{ color: '#1e40af', fontWeight: 700, backgroundColor: '#e0f2fe' }}>
                      {user?.role === 'admin' ? 'Admin: ' : user?.role === 'therapist' ? 'Therapist: ' : ''}{user?.name}
                    </option>

                    {/* Patient Names Only - Alphabetically */}
                    {patients
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(patient => (
                        <option
                          key={patient.id}
                          value={patient.userId}
                          style={{ color: '#1e40af', fontWeight: 700 }}
                        >
                          {patient.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Step 2: Select Specific Calendar (only shown after Step 1 selection) */}
                {selectedPatientForCalendar !== undefined && (
                  <div>
                    <label className="block text-sm font-bold mb-2">
                      2. Select Calendar
                    </label>
                    <select
                      value={selectedCalendarForView || ''}
                      onChange={(e) => {
                        const calendarId = parseInt(e.target.value);
                        if (calendarId) {
                          setSelectedCalendarForView(calendarId);
                        }
                      }}
                      className="w-full px-4 py-2 rounded-lg bg-white border-2 border-white/30 font-bold focus:border-blue-500 focus:outline-none transition-colors"
                      style={{ color: '#1e40af', maxHeight: '200px', overflowY: 'auto' }}
                    >
                      <option value="" style={{ color: '#1e40af', fontWeight: 700 }}>
                        -- Select Calendar --
                      </option>

                      {(() => {
                        const typeOrder = ['general', 'meals', 'sleep', 'exercise', 'medications', 'vitals', 'appointments'];
                        const userCalendars = selectedPatientForCalendar === null
                          ? calendars.filter(cal => cal.userId === user?.id)
                          : calendars.filter(cal => cal.userId === selectedPatientForCalendar);

                        return userCalendars
                          .sort((a, b) => {
                            const indexA = typeOrder.indexOf(a.type);
                            const indexB = typeOrder.indexOf(b.type);
                            const orderA = indexA === -1 ? 999 : indexA;
                            const orderB = indexB === -1 ? 999 : indexB;
                            return orderA - orderB;
                          })
                          .map(calendar => (
                            <option
                              key={calendar.id}
                              value={calendar.id}
                              style={{ color: '#1e40af', fontWeight: 700 }}
                            >
                              {calendar.name}
                            </option>
                          ));
                      })()}
                    </select>
                  </div>
                )}

                {/* Step 3: Edit/Delete Section (only shown after calendar selection) */}
                {selectedCalendarForView && (() => {
                  const selectedCal = calendars.find(c => c.id === selectedCalendarForView);
                  if (!selectedCal) return null;

                  return (
                    <div className="border-2 border-white/30 rounded-lg p-4 bg-white/5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-bold text-lg">
                          {selectedCal.name}
                        </h3>
                        <div
                          className="w-8 h-8 rounded-full border-2 border-white"
                          style={{ backgroundColor: selectedCal.color || '#607d8b' }}
                        />
                      </div>

                      <div className="space-y-2 mb-4">
                        <div>
                          <span className="text-white/60 text-sm">Type:</span>
                          <p className="text-white font-bold capitalize">{selectedCal.type.replace('_', ' ')}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          fullWidth
                          variant="primary"
                          onClick={() => {
                            setSelectedCalendarIds([selectedCalendarForView]);
                            setIsCalendarModalOpen(false);
                            setSelectedPatientForCalendar(undefined);
                            setSelectedCalendarForView(null);
                            toast.success(`Now viewing: ${selectedCal.name}`);
                          }}
                        >
                          View This Calendar
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditingCalendar(selectedCal);
                            setCalendarFormData({
                              name: selectedCal.name,
                              type: selectedCal.type,
                              color: selectedCal.color || '#607d8b',
                              assignToPatientId: 0
                            });
                            setSelectedPatientForCalendar(undefined);
                            setSelectedCalendarForView(null);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          onClick={async () => {
                            if (window.confirm(`Delete "${selectedCal.name}" calendar and all its events?`)) {
                              try {
                                await api.deleteCalendar(selectedCal.id);
                                setCalendars(calendars.filter(c => c.id !== selectedCal.id));
                                setEvents(events.filter(e => e.calendarId !== selectedCal.id));
                                setSelectedPatientForCalendar(undefined);
                                setSelectedCalendarForView(null);
                                toast.success('Calendar deleted');
                              } catch (error) {
                                toast.error('Failed to delete calendar');
                              }
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Calendar List */}
              <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                {calendars
                  .filter(calendar => {
                    // Filter based on Step 1 selection
                    if (selectedPatientForCalendar === undefined) {
                      return true; // Show all if nothing selected
                    } else if (selectedPatientForCalendar === null) {
                      return calendar.userId === user?.id; // Show admin's calendars
                    } else {
                      return calendar.userId === selectedPatientForCalendar; // Show selected patient's calendars
                    }
                  })
                  .map(calendar => (
                  <div
                    key={calendar.id}
                    className="flex items-center justify-between p-4 bg-white/90 border-2 border-white/30 rounded-lg hover:bg-white transition-colors shadow-md"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div
                        className="w-8 h-8 rounded-full border-3 border-gray-300 shadow-md"
                        style={{ backgroundColor: calendar.color || '#607d8b' }}
                      />
                      <div className="flex-1">
                        <p className="font-bold text-lg text-gray-900">{calendar.name}</p>
                        <p className="text-sm font-semibold capitalize text-gray-600">{calendar.type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingCalendar(calendar);
                          setCalendarFormData({
                            name: calendar.name,
                            type: calendar.type,
                            color: calendar.color || '#607d8b',
                            assignToPatientId: 0
                          });
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={async () => {
                          if (window.confirm('Delete this calendar and all its events?')) {
                            try {
                              await api.deleteCalendar(calendar.id);
                              setCalendars(calendars.filter(c => c.id !== calendar.id));
                              setEvents(events.filter(e => e.calendarId !== calendar.id));
                              toast.success('Calendar deleted');
                            } catch (error) {
                              toast.error('Failed to delete calendar');
                            }
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Calendar Button */}
              <Button
                fullWidth
                variant="glass"
                onClick={() => {
                  setEditingCalendar({ id: 0, name: '', type: 'general', color: '#607d8b', userId: user?.id || 0, createdAt: '', updatedAt: '' } as Calendar);
                  setCalendarFormData({ name: '', type: 'general', color: '#607d8b', assignToPatientId: 0 });
                }}
              >
                <Plus className="h-5 w-5 mr-2" />
                Add New Calendar
              </Button>
            </>
          ) : (
            <>
              {/* Calendar Edit/Create Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">
                    Calendar Name
                  </label>
                  <input
                    type="text"
                    value={calendarFormData.name}
                    onChange={(e) => setCalendarFormData({ ...calendarFormData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white border-2 border-white/30 font-bold focus:border-blue-500 focus:outline-none transition-colors"
                    style={{ color: '#1e40af' }}
                    placeholder="My Calendar"
                  />
                </div>

                {/* Patient Selector - Only for therapists */}
                {isViewingAsTherapist && patients.length > 0 && (
                  <div>
                    <label className="block text-sm font-bold mb-2">
                      Assign To Patient (Optional)
                    </label>
                    <select
                      value={calendarFormData.assignToPatientId}
                      onChange={(e) => setCalendarFormData({ ...calendarFormData, assignToPatientId: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 rounded-lg bg-white border-2 border-white/30 font-bold focus:border-blue-500 focus:outline-none transition-colors"
                      style={{ color: '#1e40af' }}
                    >
                      <option value={0} style={{ color: '#1e40af', fontWeight: 700 }}>My Own Calendar</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.userId || 0} style={{ color: '#1e40af', fontWeight: 700 }}>
                          {patient.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs/60 mt-1">
                      Select a patient to create a calendar for them, or leave as "My Own Calendar" to create one for yourself
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold mb-2">
                    Calendar Type
                  </label>
                  <select
                    value={calendarFormData.type}
                    onChange={(e) => setCalendarFormData({ ...calendarFormData, type: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white border-2 border-white/30 font-bold focus:border-blue-500 focus:outline-none transition-colors"
                    style={{ color: '#1e40af' }}
                  >
                    <option value="general" style={{ color: '#1e40af', fontWeight: 700 }}>General</option>
                    <option value="vitals" style={{ color: '#1e40af', fontWeight: 700 }}>Vitals</option>
                    <option value="medications" style={{ color: '#1e40af', fontWeight: 700 }}>Medications</option>
                    <option value="meals" style={{ color: '#1e40af', fontWeight: 700 }}>Meals</option>
                    <option value="diet" style={{ color: '#1e40af', fontWeight: 700 }}>Food Diary</option>
                    <option value="sleep" style={{ color: '#1e40af', fontWeight: 700 }}>Sleep Journal</option>
                    <option value="exercise" style={{ color: '#1e40af', fontWeight: 700 }}>Exercise & Activities</option>
                    <option value="appointments" style={{ color: '#1e40af', fontWeight: 700 }}>Appointments</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">
                    Calendar Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={calendarFormData.color}
                      onChange={(e) => setCalendarFormData({ ...calendarFormData, color: e.target.value })}
                      className="h-12 w-20 rounded border-2 border-white/30 cursor-pointer bg-white"
                    />
                    <input
                      type="text"
                      value={calendarFormData.color}
                      onChange={(e) => setCalendarFormData({ ...calendarFormData, color: e.target.value })}
                      className="flex-1 px-4 py-2 rounded-lg bg-white border-2 border-white/30 font-bold focus:border-blue-500 focus:outline-none transition-colors"
                      style={{ color: '#1e40af' }}
                      placeholder="#607d8b"
                      pattern="^#[0-9A-Fa-f]{6}$"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => {
                      setEditingCalendar(null);
                      setCalendarFormData({ name: '', type: 'general', color: '#607d8b', assignToPatientId: 0 });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="glass"
                    fullWidth
                    onClick={async () => {
                      if (!calendarFormData.name.trim()) {
                        toast.error('Calendar name is required');
                        return;
                      }

                      try {
                        if (editingCalendar.id === 0) {
                          // Create new calendar
                          await createCalendar({
                            name: calendarFormData.name,
                            type: calendarFormData.type,
                            color: calendarFormData.color,
                            assignToUserId: calendarFormData.assignToPatientId || undefined,
                          });
                        } else {
                          // Update existing calendar
                          const updated = await api.updateCalendar(editingCalendar.id, {
                            name: calendarFormData.name,
                            type: calendarFormData.type,
                            color: calendarFormData.color,
                          });
                          setCalendars(calendars.map(c => c.id === editingCalendar.id ? updated : c));
                          toast.success('Calendar updated successfully');
                        }
                        setEditingCalendar(null);
                        setCalendarFormData({ name: '', type: 'general', color: '#607d8b', assignToPatientId: 0 });
                      } catch (error) {
                        toast.error('Failed to save calendar');
                      }
                    }}
                  >
                    {editingCalendar.id === 0 ? 'Create' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        isOpen={isQRModalOpen}
        onClose={() => {
          setIsQRModalOpen(false);
          setQrCodeData('');
        }}
        title="Share Calendar via QR Code"
        size="md"
      >
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Scan this QR code to import calendar data into another device or share with others.
            </p>

            {/* QR Code Display */}
            <div ref={qrCodeRef} className="flex justify-center p-6 bg-white rounded-lg">
              {qrCodeData ? (
                <QRCodeSVG
                  value={qrCodeData}
                  size={256}
                  level="H"
                  includeMargin={true}
                  className="border-4 border-gray-200 rounded-lg"
                />
              ) : (
                <div className="text-center p-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-500">Generating QR Code...</p>
                </div>
              )}
            </div>

            {/* Information */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg text-left">
              <h4 className="font-semibold text-blue-900 mb-2">How to Use:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Open the Heart Recovery Calendar app on another device</li>
                <li>Go to Calendar page and click "Scan QR"</li>
                <li>Scan this QR code to import calendar data (up to 10 upcoming events)</li>
                <li>For full data export, use the JSON export option instead</li>
              </ol>
              <div className="mt-2 text-xs text-blue-600">
                Note: QR codes have size limits. This includes your next 10 upcoming events and up to 5 calendars.
              </div>
            </div>

            {/* Data Summary */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
              <h4 className="font-semibold text-gray-900 mb-2">Included Data:</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>📅 {calendars.length} Calendar{calendars.length !== 1 ? 's' : ''}</li>
                <li>📌 {events.length} Event{events.length !== 1 ? 's' : ''}</li>
                <li>🕐 Exported: {format(new Date(), 'PPP p')}</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="glass"
              onClick={() => {
                setIsQRModalOpen(false);
                setQrCodeData('');
              }}
            >
              Close
            </Button>
            <Button onClick={handleDownloadQRCode}>
              <Download className="h-4 w-4 mr-2" />
              Download QR Code
            </Button>
          </div>
        </div>
      </Modal>

      {/* Day Details Modal - Shows all activities for a specific date */}
      <Modal
        isOpen={showDateDetailsModal}
        onClose={() => {
          setShowDateDetailsModal(false);
          setSelectedDateMeals([]);
          setSelectedDate(null);
        }}
        title={selectedDate ? `${format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}` : 'Day Details'}
        size="xl"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          {(() => {
            if (!selectedDate) return null;

            // Get all activities for this date
            const eventsForDate = events.filter(event => {
              const eventDate = new Date(event.startTime).toISOString().split('T')[0];
              return eventDate === selectedDate;
            });

            const mealsForDate = selectedDateMeals;

            const sleepForDate = sleepLogs.find(sleep => {
              const sleepDate = new Date(sleep.date).toISOString().split('T')[0];
              return sleepDate === selectedDate;
            });

            const vitalsForDate = vitals.filter(vital => {
              const vitalDate = new Date(vital.timestamp).toISOString().split('T')[0];
              return vitalDate === selectedDate;
            });

            // Check if there's anything to display
            const hasActivities = eventsForDate.length > 0 || mealsForDate.length > 0 || sleepForDate || vitalsForDate.length > 0;

            if (!hasActivities) {
              return (
                <div className="text-center py-12 text-gray-500">
                  <CalendarIcon className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No activities scheduled for this day</p>
                  <p className="text-sm mt-2">Click on a time slot to create an event</p>
                </div>
              );
            }

            return (
              <>
                {/* Exercises & Events */}
                {eventsForDate.length > 0 && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <Clock className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-bold text-lg text-gray-900">Scheduled Events</h3>
                      <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold">{eventsForDate.length}</span>
                    </div>
                    <div className="space-y-3">
                      {eventsForDate.map((event) => (
                        <div
                          key={event.id}
                          className="bg-white rounded-lg border-2 border-blue-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => handleEventClick({ event: { id: event.id, ...event } })}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-base font-bold text-blue-900">{event.title}</span>
                                {event.status === 'completed' && (
                                  <span className="bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">✓ Done</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 font-medium">
                                {new Date(event.startTime).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}
                                {' - '}
                                {new Date(event.endTime).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}
                              </div>
                              {event.location && (
                                <div className="flex items-center space-x-1 mt-1 text-xs text-gray-500">
                                  <MapPin className="h-3 w-3" />
                                  <span>{event.location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meals */}
                {mealsForDate.length > 0 && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <UtensilsCrossed className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-bold text-lg text-gray-900">Meals & Nutrition</h3>
                      <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">{mealsForDate.length}</span>
                    </div>
                    <div className="space-y-3">
                      {mealsForDate.map((meal) => (
                        <div
                          key={meal.id}
                          className="bg-white rounded-lg border-2 border-green-200 p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-base font-bold text-green-900 capitalize">{meal.mealType}</span>
                                <span className="text-sm text-gray-600 font-medium">
                                  {new Date(meal.timestamp).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-gray-700 mb-2">{meal.foodItems}</p>
                              <div className="flex items-center space-x-4 text-xs font-semibold text-gray-600">
                                {meal.calories && <span>{meal.calories} cal</span>}
                                {meal.protein && <span>{meal.protein}g protein</span>}
                                {meal.sodium && <span>{meal.sodium}mg sodium</span>}
                              </div>
                            </div>
                            {meal.withinSpec !== null && (
                              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                meal.withinSpec
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {meal.withinSpec ? '✓ On track' : '⚠ Review'}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sleep */}
                {sleepForDate && (
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-purple-500 rounded-lg">
                        <Moon className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-bold text-lg text-gray-900">Sleep & Recovery</h3>
                    </div>
                    <div className="bg-white rounded-lg border-2 border-purple-200 p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Hours Slept</p>
                          <p className="text-2xl font-bold text-purple-900">{sleepForDate.hoursSlept}h</p>
                        </div>
                        {sleepForDate.quality && (
                          <div>
                            <p className="text-sm text-gray-600 font-medium">Quality</p>
                            <p className="text-2xl font-bold text-purple-900 capitalize">{sleepForDate.quality}</p>
                          </div>
                        )}
                      </div>
                      {sleepForDate.notes && (
                        <p className="text-sm text-gray-700 mt-3 italic">"{sleepForDate.notes}"</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Vitals */}
                {vitalsForDate.length > 0 && (
                  <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-red-500 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-bold text-lg text-gray-900">Vital Signs</h3>
                      <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">{vitalsForDate.length}</span>
                    </div>
                    <div className="space-y-3">
                      {vitalsForDate.map((vital, idx) => (
                        <div key={vital.id || idx} className="bg-white rounded-lg border-2 border-red-200 p-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            {vital.heartRate && (
                              <div>
                                <p className="text-gray-600 font-medium">Heart Rate</p>
                                <p className="text-lg font-bold text-red-900">{vital.heartRate} bpm</p>
                              </div>
                            )}
                            {vital.bloodPressureSystolic && vital.bloodPressureDiastolic && (
                              <div>
                                <p className="text-gray-600 font-medium">Blood Pressure</p>
                                <p className="text-lg font-bold text-red-900">{vital.bloodPressureSystolic}/{vital.bloodPressureDiastolic}</p>
                              </div>
                            )}
                            {vital.oxygenSaturation && (
                              <div>
                                <p className="text-gray-600 font-medium">O₂ Sat</p>
                                <p className="text-lg font-bold text-red-900">{vital.oxygenSaturation}%</p>
                              </div>
                            )}
                            {vital.temperature && (
                              <div>
                                <p className="text-gray-600 font-medium">Temperature</p>
                                <p className="text-lg font-bold text-red-900">{vital.temperature}°F</p>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(vital.timestamp).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 mt-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              setShowDateDetailsModal(false);
              // Switch to day view for this date
              if (calendarRef.current && selectedDate) {
                const calendarApi = calendarRef.current.getApi();
                calendarApi.changeView('timeGridDay', selectedDate);
              }
            }}
          >
            <Clock className="h-4 w-4 mr-2" />
            Day View
          </Button>
          <Button
            onClick={() => {
              setShowDateDetailsModal(false);
              setSelectedDateMeals([]);
              setSelectedDate(null);
            }}
          >
            Close
          </Button>
        </div>
      </Modal>

    </div>
  );
}
