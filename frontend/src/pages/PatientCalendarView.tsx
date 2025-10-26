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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatientData();
    loadCalendarEvents();
  }, [patientId]);

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
    // TODO: Replace with real API call
    // Mock data for demonstration
    const mockEvents: CalendarEvent[] = [
      {
        id: 1,
        date: format(new Date(), 'yyyy-MM-dd'),
        title: 'Cardio Session',
        status: 'upcoming',
      },
      {
        id: 2,
        date: format(new Date(Date.now() - 86400000), 'yyyy-MM-dd'),
        title: 'Therapy Appointment',
        status: 'completed',
        notes: 'Patient arrived on time, completed all exercises, food diary up to date',
        metrics: {
          attendedOnTime: true,
          homeworkCompleted: true,
          foodDiaryMaintained: true,
          medsCompliant: true,
          vitalsNormal: true,
        }
      },
      {
        id: 3,
        date: format(new Date(Date.now() - 2 * 86400000), 'yyyy-MM-dd'),
        title: 'Follow-up Session',
        status: 'warning',
        notes: 'Patient arrived 15 minutes late. Homework partially completed. Reported skipping one meal.',
        metrics: {
          attendedOnTime: false,
          homeworkCompleted: false,
          foodDiaryMaintained: true,
          medsCompliant: true,
          vitalsNormal: true,
        }
      },
      {
        id: 4,
        date: format(new Date(Date.now() - 3 * 86400000), 'yyyy-MM-dd'),
        title: 'Physical Therapy',
        status: 'missed',
        notes: 'Patient did not show up. No call. Food diary not maintained. Medication compliance unclear.',
        metrics: {
          attendedOnTime: false,
          homeworkCompleted: false,
          foodDiaryMaintained: false,
          medsCompliant: false,
          vitalsNormal: false,
        }
      },
    ];

    setEvents(mockEvents);
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
          <Button>
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
                className={`min-h-[120px] p-2 rounded-lg ${
                  isSameMonth(day, currentMonth) ? 'glass' : 'opacity-40'
                } ${isToday ? 'ring-2' : ''}`}
                style={isToday ? { ringColor: 'var(--accent)' } : {}}
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
    </div>
  );
}
