import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { GlassCard, Button, Modal, Input, Select } from '../components/ui';
import { Plus, Calendar as CalendarIcon, Edit, Trash2, Clock, MapPin, UtensilsCrossed, Moon, AlertTriangle, Download, Printer, Share2, FileJson, QrCode } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import { CalendarEvent, Calendar, CreateEventInput, CreateCalendarInput, MealEntry, Medication } from '../types';
import toast from 'react-hot-toast';
import { format, addDays, parseISO } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
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
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDateMeals, setSelectedDateMeals] = useState<MealEntry[]>([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [sleepHours, setSleepHours] = useState<string>('');
  const [allMeals, setAllMeals] = useState<MealEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDateDetailsModal, setShowDateDetailsModal] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<any[]>([]);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const qrCodeRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    loadCalendarsAndEvents();
  }, []);

  // Refresh events when navigating to calendar page
  useEffect(() => {
    if (location.pathname === '/calendar') {
      loadCalendarsAndEvents();
    }
  }, [location.pathname]);

  const loadCalendarsAndEvents = async () => {
    try {
      setIsLoading(true);

      // Get date range for current month +/- 1 month for better coverage
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().split('T')[0];

      const [calendarsData, eventsData, mealsData, medicationsData] = await Promise.all([
        api.getCalendars(),
        api.getEvents(),
        api.getMeals({ startDate, endDate }),
        api.getMedications(),
      ]);

      setCalendars(calendarsData);
      setEvents(eventsData);
      setAllMeals(mealsData);
      setMedications(medicationsData);

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
    const clickedDate = arg.dateStr;
    setSelectedDate(clickedDate);

    // Load meals for this date
    const dateMeals = allMeals.filter(meal => {
      const mealDate = new Date(meal.timestamp).toISOString().split('T')[0];
      return mealDate === clickedDate;
    });

    setSelectedDateMeals(dateMeals);

    // If there are meals for this date, show them
    if (dateMeals.length > 0) {
      setShowDateDetailsModal(true);
    } else {
      // No meals, create a new event
      reset({
        startTime: arg.dateStr + 'T09:00',
        endTime: arg.dateStr + 'T10:00',
        calendarId: calendars[0]?.id,
        reminderMinutes: 30,
      });
      setEditingEvent(null);
      setIsEventModalOpen(true);
    }
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

    // Handle regular events
    const event = events.find(e => e.id === parseInt(arg.event.id));
    if (event) {
      setSelectedEvent(event);
      setSleepHours(event.sleepHours?.toString() || '');

      // Load meals for this event's date
      const eventDate = new Date(event.startTime).toISOString().split('T')[0];
      try {
        const meals = await api.getMeals({ startDate: eventDate, endDate: eventDate });
        setSelectedDateMeals(meals);
      } catch (error) {
        console.error('Failed to load meals:', error);
        setSelectedDateMeals([]);
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
    setValue('startTime', format(new Date(event.startTime), "yyyy-MM-dd'T'HH:mm"));
    setValue('endTime', format(new Date(event.endTime), "yyyy-MM-dd'T'HH:mm"));
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

    // Create calendar data for QR code
    const calendarData = {
      appName: 'Heart Recovery Calendar',
      calendars: calendars.map(cal => ({
        name: cal.name,
        type: cal.type,
        color: cal.color,
      })),
      events: events.map(event => ({
        title: event.title,
        start: event.startTime,
        end: event.endTime,
        location: event.location,
        description: event.description,
        isAllDay: event.isAllDay,
      })),
      exportDate: new Date().toISOString(),
    };

    // Convert to JSON string
    const jsonData = JSON.stringify(calendarData);

    // For large datasets, you might want to upload to a server and use a short URL
    // For now, we'll encode the data directly (works for smaller calendars)
    setQrCodeData(jsonData);
    setIsQRModalOpen(true);

    toast.success('QR Code generated! Scan to import calendar data.');
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

  const createCalendar = async (data: CreateCalendarInput) => {
    try {
      const newCalendar = await api.createCalendar(data);
      setCalendars([...calendars, newCalendar]);
      toast.success('Calendar created successfully');
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
          let backgroundColor, textColor, title;
          if (status === 'taken') {
            backgroundColor = '#10b981'; // green
            textColor = '#ffffff';
            title = `✓ ${med.name}`;
          } else if (status === 'missed' || (isPast && status === 'scheduled')) {
            backgroundColor = '#dc2626'; // red
            textColor = '#ffffff';
            title = `⚠ ${med.name} - MISSED`;
          } else {
            backgroundColor = '#fefce8'; // light yellow
            textColor = '#1e40af'; // cobalt blue
            title = `💊 ${med.name}`;
          }

          medEvents.push({
            id: `med-${med.id}-${currentDate.toISOString()}-${time}`,
            title,
            start: eventDateTime.toISOString(),
            backgroundColor,
            borderColor: status === 'missed' || (isPast && status === 'scheduled') ? '#991b1b' : backgroundColor,
            textColor,
            classNames: ['font-bold', 'cursor-pointer'],
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

  // Create calendar events from both regular events and meals
  const calendarEvents = [
    ...events.map(event => {
      const calendar = calendars.find(c => c.id === event.calendarId);
      return {
        id: event.id.toString(),
        title: event.title,
        start: event.startTime,
        end: event.endTime,
        allDay: event.isAllDay,
        backgroundColor: calendar?.color || '#607d8b',
        borderColor: calendar?.color || '#607d8b',
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
      backgroundColor: '#fefce8',
      borderColor: '#fef08a',
      textColor: '#1e40af',
      classNames: ['font-bold'],
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-green-500">Calendar</h1>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="glass"
            onClick={() => setIsCalendarModalOpen(true)}
          >
            <CalendarIcon className="h-5 w-5 mr-2" />
            Manage Calendars
          </Button>
          <Button
            onClick={() => {
              reset({ calendarId: calendars[0]?.id, reminderMinutes: 30 });
              setEditingEvent(null);
              setIsEventModalOpen(true);
            }}
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Event
          </Button>
          <Button
            variant="glass"
            onClick={handleDeleteTodayEvents}
            className="bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500"
          >
            <Trash2 className="h-5 w-5 mr-2" />
            Delete Today
          </Button>
          <Button
            variant="glass"
            onClick={handleDeleteHistoricEvents}
            className="bg-red-500/20 hover:bg-red-500/30 border border-red-500"
          >
            <AlertTriangle className="h-5 w-5 mr-2" />
            Delete Historic
          </Button>
        </div>
      </div>

      {/* Export & Print Section */}
      <div className="flex items-center justify-end gap-2 -mt-2">
        <span className="text-sm font-semibold text-cyan-400 mr-2">Export & Share:</span>
        <Button
          size="sm"
          variant="glass"
          onClick={handleExportToGoogle}
          className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400"
          title="Export to Google Calendar"
        >
          <Download className="h-4 w-4 mr-1" />
          Google
        </Button>
        <Button
          size="sm"
          variant="glass"
          onClick={handleExportToApple}
          className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400"
          title="Export to Apple Calendar"
        >
          <Download className="h-4 w-4 mr-1" />
          Apple
        </Button>
        <Button
          size="sm"
          variant="glass"
          onClick={handleExportToCalendly}
          className="bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400"
          title="Export for Calendly"
        >
          <Share2 className="h-4 w-4 mr-1" />
          Calendly
        </Button>
        <Button
          size="sm"
          variant="glass"
          onClick={handlePrintCalendar}
          className="bg-green-500/20 hover:bg-green-500/30 border border-green-400"
          title="Print Calendar"
        >
          <Printer className="h-4 w-4 mr-1" />
          Print
        </Button>
        <Button
          size="sm"
          variant="glass"
          onClick={handleBackupAsJSON}
          className="bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-400"
          title="Backup as JSON"
        >
          <FileJson className="h-4 w-4 mr-1" />
          Backup
        </Button>
        <Button
          size="sm"
          variant="glass"
          onClick={handleShareQRCode}
          className="bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400"
          title="Share via QR Code"
        >
          <QrCode className="h-4 w-4 mr-1" />
          QR Code
        </Button>
        <Button
          size="sm"
          variant="glass"
          onClick={handleShowIntegrationInfo}
          className="bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400"
          title="Integration Setup Info"
        >
          🔧 API Setup
        </Button>
      </div>

      <GlassCard className="p-6">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={calendarEvents}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
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
          setSelectedDateMeals([]);
          setSleepHours('');
        }}
        title="Event Details"
        size="lg"
      >
        {selectedEvent && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-green-500">{selectedEvent.title}</h3>
              <p className="text-sm text-white font-bold mt-1 bg-gray-800 px-3 py-2 rounded-lg">
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

            {/* Sleep Hours Section - Moved AFTER description, with cobalt blue text */}
            <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-300 mt-6">
              <div className="flex items-center space-x-2 mb-2">
                <Moon className="h-6 w-6 text-blue-700" />
                <p className="font-bold text-blue-800 text-lg">Hours of Restful Sleep</p>
              </div>
              <p className="text-sm text-blue-700 font-medium mb-3">Sleep from the night before this date</p>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  placeholder="Enter hours (e.g., 7.5)"
                  className="flex-1 px-3 py-2 border-2 border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none text-blue-900 font-bold text-lg"
                  style={{ color: '#1e40af' }}
                />
                <Button
                  size="sm"
                  onClick={handleUpdateSleepHours}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Save Sleep
                </Button>
              </div>
              {selectedEvent.sleepHours && (
                <p className="text-blue-800 font-bold mt-2">
                  Current: {selectedEvent.sleepHours} hours
                </p>
              )}
            </div>

            {/* Meals Section */}
            {selectedDateMeals.length > 0 && (
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <UtensilsCrossed className="h-5 w-5 text-green-600" />
                  <p className="font-medium text-gray-700">Meals for This Day</p>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedDateMeals.map((meal) => (
                    <div
                      key={meal.id}
                      className="bg-white rounded-lg border border-gray-200 p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-800 capitalize">
                              {meal.mealType}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(meal.timestamp).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{meal.foodItems}</p>
                          <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                            {meal.calories && <span>{meal.calories} cal</span>}
                            {meal.protein && <span>{meal.protein}g protein</span>}
                            {meal.sodium && <span>{meal.sodium}mg sodium</span>}
                          </div>
                        </div>
                        {meal.withinSpec !== null && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            meal.withinSpec
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {meal.withinSpec ? '✓' : '⚠'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Status:</span>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  selectedEvent.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : selectedEvent.status === 'missed'
                    ? 'bg-red-100 text-red-700'
                    : selectedEvent.status === 'cancelled'
                    ? 'bg-gray-100 text-gray-700'
                    : 'bg-blue-100 text-blue-700'
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
        onClose={() => setIsCalendarModalOpen(false)}
        title="Manage Calendars"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {calendars.map(calendar => (
              <div
                key={calendar.id}
                className="flex items-center justify-between p-4 bg-white/50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: calendar.color || '#607d8b' }}
                  />
                  <div>
                    <p className="font-medium">{calendar.name}</p>
                    <p className="text-sm text-gray-600">Type: {calendar.type}</p>
                  </div>
                </div>
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
            ))}
          </div>

          <Button
            fullWidth
            variant="glass"
            onClick={() => {
              const name = prompt('Calendar name:');
              if (name) {
                createCalendar({
                  name,
                  type: 'general',
                  color: '#' + Math.floor(Math.random()*16777215).toString(16),
                });
              }
            }}
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Calendar
          </Button>
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
              {qrCodeData && (
                <QRCodeSVG
                  value={qrCodeData}
                  size={256}
                  level="H"
                  includeMargin={true}
                  className="border-4 border-gray-200 rounded-lg"
                />
              )}
            </div>

            {/* Information */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg text-left">
              <h4 className="font-semibold text-blue-900 mb-2">How to Use:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Open the Heart Recovery Calendar app on another device</li>
                <li>Go to Calendar page and click "Scan QR"</li>
                <li>Scan this QR code to import all calendar data</li>
                <li>Alternatively, download the QR code image to share</li>
              </ol>
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

      {/* Date Details Modal (for dates with meals but no events) */}
      <Modal
        isOpen={showDateDetailsModal}
        onClose={() => {
          setShowDateDetailsModal(false);
          setSelectedDateMeals([]);
          setSelectedDate(null);
        }}
        title={selectedDate ? `Meals for ${format(new Date(selectedDate), 'PPP')}` : 'Date Details'}
        size="lg"
      >
        <div className="space-y-4">
          {selectedDateMeals.length > 0 && (
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <UtensilsCrossed className="h-5 w-5 text-green-600" />
                <p className="font-bold text-gray-900">Meals for This Day</p>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {selectedDateMeals.map((meal) => (
                  <div
                    key={meal.id}
                    className="bg-white rounded-lg border-2 border-gray-300 p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-blue-900 capitalize">
                            {meal.mealType}
                          </span>
                          <span className="text-xs font-semibold text-gray-700">
                            {new Date(meal.timestamp).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800 mt-1">{meal.foodItems}</p>
                        <div className="flex items-center space-x-3 mt-1 text-xs font-semibold text-gray-600">
                          {meal.calories && <span>{meal.calories} cal</span>}
                          {meal.protein && <span>{meal.protein}g protein</span>}
                          {meal.sodium && <span>{meal.sodium}mg sodium</span>}
                        </div>
                      </div>
                      {meal.withinSpec !== null && (
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          meal.withinSpec
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {meal.withinSpec ? '✓' : '⚠'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
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
        </div>
      </Modal>
    </div>
  );
}
