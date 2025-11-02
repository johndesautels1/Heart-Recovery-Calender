import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  FileText,
  Dumbbell,
  User,
  Plus,
  Edit,
  Activity
} from 'lucide-react';
import { Patient } from '../types';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';

type EventStatus = 'completed' | 'warning' | 'missed' | 'upcoming';

interface CalendarEvent {
  id: number;
  date: string;
  title: string;
  status: EventStatus;
  notes?: string;
  metrics?: {
    attendedOnTime: boolean;
    homeworkCompleted: boolean;
    foodDiaryMaintained: boolean;
    medsCompliant: boolean;
    vitalsNormal: boolean;
  };
}

export function PatientCalendarView() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  // Add event form state
  const [eventTemplateSearch, setEventTemplateSearch] = useState('');
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [eventTemplates, setEventTemplates] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    startTime: '',
    endTime: '',
    location: '',
    description: '',
  });

  useEffect(() => {
    loadPatientData();
  }, [patientId]);

  // Load events when patient data is available
  useEffect(() => {
    if (patient) {
      loadCalendarEvents();
    }
  }, [patient]);

  const loadPatientData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/patients/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load patient');

      const data = await response.json();
      setPatient(data);
    } catch (error) {
      console.error('Error loading patient:', error);
      toast.error('Failed to load patient');
    } finally {
      setLoading(false);
    }
  };

  const loadCalendarEvents = async () => {
    try {
      const token = localStorage.getItem('token');

      if (!patient?.userId) {
        console.log('[PatientCalendarView] Patient has no linked user account');
        setEvents([]);
        return;
      }

      // Fetch the patient's calendar(s)
      const calendarsResponse = await fetch(`/api/calendars?userId=${patient.userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!calendarsResponse.ok) {
        throw new Error('Failed to fetch calendars');
      }

      const calendarsData = await calendarsResponse.json();
      const calendars = calendarsData.data || calendarsData;

      if (!calendars || calendars.length === 0) {
        console.log('[PatientCalendarView] No calendars found for patient');
        setEvents([]);
        return;
      }

      // Fetch events for all of the patient's calendars
      const calendarIds = calendars.map((cal: any) => cal.id);
      const eventsPromises = calendarIds.map((calId: number) =>
        fetch(`/api/events?calendarId=${calId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }).then(res => res.json())
      );

      const eventsResponses = await Promise.all(eventsPromises);

      // Combine all events from all calendars
      const allEvents = eventsResponses.flatMap(response => response.data || []);

      // Map backend events to our CalendarEvent interface
      const mappedEvents: CalendarEvent[] = allEvents.map((event: any) => {
        // Determine status based on event status and time
        let status: EventStatus = 'upcoming';
        const eventDate = new Date(event.startTime);
        const now = new Date();

        if (event.status === 'completed') {
          status = 'completed';
        } else if (event.status === 'cancelled') {
          status = 'missed';
        } else if (eventDate < now && event.status !== 'completed') {
          status = 'missed';
        } else {
          status = 'upcoming';
        }

        return {
          id: event.id,
          date: format(new Date(event.startTime), 'yyyy-MM-dd'),
          title: event.title,
          status,
          notes: event.description || event.notes,
          // Metrics would need to be added to backend event model
          // For now, we don't have this data
        };
      });

      setEvents(mappedEvents);
    } catch (error) {
      console.error('[PatientCalendarView] Error loading events:', error);
      toast.error('Failed to load calendar events');
      setEvents([]);
    }
  };

  const getStatusColor = (status: EventStatus) => {
    switch (status) {
      case 'completed':
        return {
          bg: 'rgba(16, 185, 129, 0.1)',
          border: '#10b981',
          text: '#10b981',
          icon: CheckCircle2,
        };
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.1)',
          border: '#f59e0b',
          text: '#f59e0b',
          icon: AlertTriangle,
        };
      case 'missed':
        return {
          bg: 'rgba(239, 68, 68, 0.1)',
          border: '#ef4444',
          text: '#ef4444',
          icon: XCircle,
        };
      default:
        return {
          bg: 'rgba(96, 165, 250, 0.1)',
          border: '#60a5fa',
          text: '#60a5fa',
          icon: Clock,
        };
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(parseISO(event.date), day));
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEventModalOpen(true);
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Autocomplete for event templates
  const searchEventTemplates = async (search: string) => {
    if (!search) {
      setEventTemplates([]);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/event-templates?search=${encodeURIComponent(search)}&limit=10&isActive=true`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to search event templates');

      const data = await response.json();
      setEventTemplates(data.data || []);
    } catch (error) {
      console.error('Error searching event templates:', error);
      toast.error('Failed to search event templates');
    }
  };

  // Autocomplete for exercises
  const searchExercises = async (search: string) => {
    if (!search) {
      setExercises([]);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/exercises?search=${encodeURIComponent(search)}&limit=10&isActive=true`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to search exercises');

      const data = await response.json();
      setExercises(data.data || []);
    } catch (error) {
      console.error('Error searching exercises:', error);
      toast.error('Failed to search exercises');
    }
  };

  // Handle date click to add event
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsAddEventModalOpen(true);
    setNewEvent({
      title: '',
      startTime: format(date, "yyyy-MM-dd'T'HH:mm"),
      endTime: format(date, "yyyy-MM-dd'T'HH:mm"),
      location: '',
      description: '',
    });
    setSelectedTemplate(null);
    setSelectedExercise(null);
    setEventTemplateSearch('');
    setExerciseSearch('');
  };

  // Handle template selection
  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    setEventTemplateSearch(template.name);
    setShowTemplateDropdown(false);

    // Pre-fill form with template defaults
    const startDate = selectedDate || new Date();
    const endDate = new Date(startDate.getTime() + template.defaultDuration * 60000);

    setNewEvent({
      title: template.name,
      startTime: format(startDate, "yyyy-MM-dd'T'HH:mm"),
      endTime: format(endDate, "yyyy-MM-dd'T'HH:mm"),
      location: template.defaultLocation || '',
      description: template.description || '',
    });
  };

  // Handle exercise selection
  const handleExerciseSelect = (exercise: any) => {
    setSelectedExercise(exercise);
    setExerciseSearch(exercise.name);
    setShowExerciseDropdown(false);
  };

  // Save new event
  const handleSaveEvent = async () => {
    try {
      const token = localStorage.getItem('token');

      const eventData: any = {
        ...newEvent,
        patientId: parseInt(patientId!),
        status: 'upcoming',
      };

      if (selectedTemplate) {
        eventData.eventTemplateId = selectedTemplate.id;
        if (selectedTemplate.requiresPatientAcceptance) {
          eventData.invitationStatus = 'pending';
        }
      }

      if (selectedExercise) {
        eventData.exerciseId = selectedExercise.id;
      }

      // Get patient's calendar
      const calendarsResponse = await fetch('/api/calendars', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const calendarsData = await calendarsResponse.json();
      const patientCalendar = calendarsData.data?.find((cal: any) => cal.userId === parseInt(patientId!));

      if (patientCalendar) {
        eventData.calendarId = patientCalendar.id;
      }

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) throw new Error('Failed to create event');

      toast.success('Event created successfully');
      setIsAddEventModalOpen(false);
      loadCalendarEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-xl" style={{ color: 'var(--ink)' }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="glass rounded-xl p-12 text-center">
          <User className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--accent)' }} />
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--ink)' }}>Patient not found</h3>
          <Button onClick={() => navigate('/patients')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patients
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button variant="glass" onClick={() => navigate('/patients')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Patients
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient mb-2">{patient.name}'s Calendar</h1>
            <p style={{ color: 'var(--ink)' }} className="text-sm">
              Track appointments, compliance, and recovery progress
            </p>
          </div>
          <Button onClick={() => handleDateClick(new Date())}>
            <Plus className="h-5 w-5 mr-2" />
            Schedule Event
          </Button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="glass rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <Button variant="glass" onClick={handlePreviousMonth}>
            Previous
          </Button>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <Button variant="glass" onClick={handleNextMonth}>
            Next
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="glass rounded-xl p-4 mb-6">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-sm" style={{ color: 'var(--ink)' }}>Excellent</span>
          </div>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span className="text-sm" style={{ color: 'var(--ink)' }}>Needs Attention</span>
          </div>
          <div className="flex items-center space-x-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <span className="text-sm" style={{ color: 'var(--ink)' }}>Poor/Missed</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5" style={{ color: 'var(--accent)' }} />
            <span className="text-sm" style={{ color: 'var(--ink)' }}>Upcoming</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="glass rounded-xl p-6">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center font-semibold text-sm" style={{ color: 'var(--accent)' }}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {daysInMonth.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={index}
                className={`min-h-[120px] p-2 rounded-lg cursor-pointer ${
                  isSameMonth(day, currentMonth) ? 'glass' : 'opacity-40'
                } ${isToday ? 'ring-2' : ''}`}
                style={isToday ? { borderColor: 'var(--accent)' } : {}}
                onClick={() => isSameMonth(day, currentMonth) && handleDateClick(day)}
              >
                <div className="text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                  {format(day, 'd')}
                </div>

                {/* Events for this day */}
                <div className="space-y-1">
                  {dayEvents.map(event => {
                    const status = getStatusColor(event.status);
                    const StatusIcon = status.icon;

                    return (
                      <button
                        key={event.id}
                        onClick={() => handleEventClick(event)}
                        className="w-full p-2 rounded text-left transition-all hover:scale-105"
                        style={{
                          backgroundColor: status.bg,
                          borderLeft: `3px solid ${status.border}`,
                        }}
                      >
                        <div className="flex items-center space-x-1">
                          <StatusIcon className="h-3 w-3 flex-shrink-0" style={{ color: status.text }} />
                          <span className="text-xs truncate" style={{ color: 'var(--ink)' }}>
                            {event.title}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Details Modal */}
      <Modal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setSelectedEvent(null);
        }}
        title="Event Details"
      >
        {selectedEvent && (
          <div className="space-y-4">
            {/* Event Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>
                {selectedEvent.title}
              </h3>
              <div className="flex items-center space-x-2">
                {(() => {
                  const status = getStatusColor(selectedEvent.status);
                  const StatusIcon = status.icon;
                  return (
                    <>
                      <StatusIcon className="h-6 w-6" style={{ color: status.text }} />
                      <span className="font-medium capitalize" style={{ color: status.text }}>
                        {selectedEvent.status}
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
              <span style={{ color: 'var(--ink)' }}>
                {format(parseISO(selectedEvent.date), 'EEEE, MMMM d, yyyy')}
              </span>
            </div>

            {/* Metrics */}
            {selectedEvent.metrics && (
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                <h4 className="font-semibold mb-3" style={{ color: 'var(--ink)' }}>Compliance Metrics</h4>
                <div className="space-y-2">
                  {[
                    { label: 'Attended On Time', value: selectedEvent.metrics.attendedOnTime },
                    { label: 'Homework Completed', value: selectedEvent.metrics.homeworkCompleted },
                    { label: 'Food Diary Maintained', value: selectedEvent.metrics.foodDiaryMaintained },
                    { label: 'Medications Compliant', value: selectedEvent.metrics.medsCompliant },
                    { label: 'Vitals Normal', value: selectedEvent.metrics.vitalsNormal },
                  ].map(metric => (
                    <div key={metric.label} className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: 'var(--ink)', opacity: 0.8 }}>
                        {metric.label}
                      </span>
                      {metric.value ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedEvent.notes && (
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                  <h4 className="font-semibold" style={{ color: 'var(--ink)' }}>Session Notes</h4>
                </div>
                <p className="text-sm" style={{ color: 'var(--ink)', opacity: 0.8 }}>
                  {selectedEvent.notes}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="glass" onClick={() => setIsEventModalOpen(false)}>
                Close
              </Button>
              <Button>
                <Edit className="h-4 w-4 mr-2" />
                Edit Event
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Event Modal */}
      <Modal
        isOpen={isAddEventModalOpen}
        onClose={() => {
          setIsAddEventModalOpen(false);
          setSelectedDate(null);
          setSelectedTemplate(null);
          setSelectedExercise(null);
          setEventTemplateSearch('');
          setExerciseSearch('');
        }}
        title={`Add Event${selectedDate ? ' - ' + format(selectedDate, 'MMM d, yyyy') : ''}`}
      >
        <div className="space-y-4">
          {/* Event Template Autocomplete */}
          <div className="relative">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
              Event Template (Optional)
            </label>
            <input
              type="text"
              value={eventTemplateSearch}
              onChange={(e) => {
                setEventTemplateSearch(e.target.value);
                searchEventTemplates(e.target.value);
                setShowTemplateDropdown(true);
              }}
              onFocus={() => setShowTemplateDropdown(true)}
              placeholder="Search event templates..."
              className="w-full px-4 py-2 rounded-lg glass border border-white/10 focus:outline-none focus:ring-2 focus:ring-accent"
              style={{ color: 'var(--ink)' }}
            />
            {showTemplateDropdown && eventTemplates.length > 0 && (
              <div className="absolute z-10 w-full mt-1 glass rounded-lg border border-white/10 max-h-60 overflow-auto">
                {eventTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className="w-full px-4 py-2 text-left hover:bg-white/5 transition-colors"
                    style={{ color: 'var(--ink)' }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs opacity-70">{template.category}</div>
                      </div>
                      {template.requiresPatientAcceptance && (
                        <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(96, 165, 250, 0.1)', color: 'var(--accent)' }}>
                          Requires Accept
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Exercise Autocomplete */}
          <div className="relative">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
              Exercise (Optional)
            </label>
            <input
              type="text"
              value={exerciseSearch}
              onChange={(e) => {
                setExerciseSearch(e.target.value);
                searchExercises(e.target.value);
                setShowExerciseDropdown(true);
              }}
              onFocus={() => setShowExerciseDropdown(true)}
              placeholder="Search exercises..."
              className="w-full px-4 py-2 rounded-lg glass border border-white/10 focus:outline-none focus:ring-2 focus:ring-accent"
              style={{ color: 'var(--ink)' }}
            />
            {showExerciseDropdown && exercises.length > 0 && (
              <div className="absolute z-10 w-full mt-1 glass rounded-lg border border-white/10 max-h-60 overflow-auto">
                {exercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    onClick={() => handleExerciseSelect(exercise)}
                    className="w-full px-4 py-2 text-left hover:bg-white/5 transition-colors"
                    style={{ color: 'var(--ink)' }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{exercise.name}</div>
                        <div className="text-xs opacity-70">{exercise.category} - {exercise.difficulty}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Event Title */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
              Event Title *
            </label>
            <input
              type="text"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              placeholder="Enter event title"
              className="w-full px-4 py-2 rounded-lg glass border border-white/10 focus:outline-none focus:ring-2 focus:ring-accent"
              style={{ color: 'var(--ink)' }}
              required
            />
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
              Start Time *
            </label>
            <input
              type="datetime-local"
              value={newEvent.startTime}
              onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
              className="w-full px-4 py-2 rounded-lg glass border border-white/10 focus:outline-none focus:ring-2 focus:ring-accent"
              style={{ color: 'var(--ink)' }}
              required
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
              End Time *
            </label>
            <input
              type="datetime-local"
              value={newEvent.endTime}
              onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
              className="w-full px-4 py-2 rounded-lg glass border border-white/10 focus:outline-none focus:ring-2 focus:ring-accent"
              style={{ color: 'var(--ink)' }}
              required
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
              Location
            </label>
            <input
              type="text"
              value={newEvent.location}
              onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
              placeholder="Enter location"
              className="w-full px-4 py-2 rounded-lg glass border border-white/10 focus:outline-none focus:ring-2 focus:ring-accent"
              style={{ color: 'var(--ink)' }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
              Description
            </label>
            <textarea
              value={newEvent.description}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              placeholder="Enter description"
              rows={3}
              className="w-full px-4 py-2 rounded-lg glass border border-white/10 focus:outline-none focus:ring-2 focus:ring-accent"
              style={{ color: 'var(--ink)' }}
            />
          </div>

          {/* Selected Items Summary */}
          {(selectedTemplate || selectedExercise) && (
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(96, 165, 250, 0.1)' }}>
              <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--accent)' }}>Selected Items:</h4>
              {selectedTemplate && (
                <div className="flex items-center space-x-2 text-sm mb-1">
                  <CalendarIcon className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                  <span style={{ color: 'var(--ink)' }}>Template: {selectedTemplate.name}</span>
                </div>
              )}
              {selectedExercise && (
                <div className="flex items-center space-x-2 text-sm">
                  <Dumbbell className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                  <span style={{ color: 'var(--ink)' }}>Exercise: {selectedExercise.name}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="glass"
              onClick={() => {
                setIsAddEventModalOpen(false);
                setSelectedDate(null);
                setSelectedTemplate(null);
                setSelectedExercise(null);
                setEventTemplateSearch('');
                setExerciseSearch('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEvent}
              disabled={!newEvent.title || !newEvent.startTime || !newEvent.endTime}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
