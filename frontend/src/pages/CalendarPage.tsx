import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { GlassCard, Button, Modal, Input, Select } from '../components/ui';
import { Plus, Calendar as CalendarIcon, Edit, Trash2, Clock, MapPin } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import { CalendarEvent, Calendar, CreateEventInput, CreateCalendarInput } from '../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

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
});

type EventFormData = z.infer<typeof eventSchema>;

export function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

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

  useEffect(() => {
    loadCalendarsAndEvents();
  }, []);

  const loadCalendarsAndEvents = async () => {
    try {
      setIsLoading(true);
      const [calendarsData, eventsData] = await Promise.all([
        api.getCalendars(),
        api.getEvents(),
      ]);
      
      setCalendars(calendarsData);
      setEvents(eventsData);

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

  const handleDateClick = (arg: any) => {
    reset({
      startTime: arg.dateStr + 'T09:00',
      endTime: arg.dateStr + 'T10:00',
      calendarId: calendars[0]?.id,
      reminderMinutes: 30,
    });
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  const handleEventClick = (arg: any) => {
    const event = events.find(e => e.id === parseInt(arg.event.id));
    if (event) {
      setSelectedEvent(event);
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

  const calendarEvents = events.map(event => {
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
      },
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Calendar</h1>
        <div className="flex space-x-3">
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
        </div>
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
            <label htmlFor="isAllDay" className="text-sm text-gray-700">
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
            <label className="block text-sm font-medium text-gray-700">
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
        onClose={() => setSelectedEvent(null)}
        title="Event Details"
        size="md"
      >
        {selectedEvent && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-800">{selectedEvent.title}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {format(new Date(selectedEvent.startTime), 'PPP p')} - 
                {format(new Date(selectedEvent.endTime), 'p')}
              </p>
            </div>

            {selectedEvent.location && (
              <div className="flex items-start space-x-2">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <p className="text-gray-700">{selectedEvent.location}</p>
              </div>
            )}

            {selectedEvent.description && (
              <div>
                <p className="font-medium text-gray-700 mb-1">Description:</p>
                <p className="text-gray-600">{selectedEvent.description}</p>
              </div>
            )}

            {selectedEvent.notes && (
              <div>
                <p className="font-medium text-gray-700 mb-1">Notes:</p>
                <p className="text-gray-600">{selectedEvent.notes}</p>
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
    </div>
  );
}
