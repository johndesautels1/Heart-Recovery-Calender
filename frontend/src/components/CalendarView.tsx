import React, { useState, useCallback } from 'react';
import {
  Paper,
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Fab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Medication,
  Restaurant,
  Favorite,
  FitnessCenter,
  Event,
} from '@mui/icons-material';
import {
  Calendar,
  momentLocalizer,
  Event as CalendarEvent,
  View,
} from 'react-big-calendar';
import moment from 'moment';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { eventsAPI, calendarAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

interface CustomEvent extends CalendarEvent {
  id?: number;
  calendarId?: number;
  type?: string;
  description?: string;
  location?: string;
  recurrenceRule?: string;
  status?: string;
}

const eventTypeIcons = {
  medications: <Medication fontSize="small" />,
  appointments: <Event fontSize="small" />,
  exercise: <FitnessCenter fontSize="small" />,
  vitals: <Favorite fontSize="small" />,
  diet: <Restaurant fontSize="small" />,
};

const eventTypeColors = {
  medications: '#9c27b0',
  appointments: '#2196f3',
  exercise: '#4caf50',
  vitals: '#f44336',
  diet: '#ff9800',
  general: '#607d8b',
};

export default function CalendarView() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());
  const [openEventDialog, setOpenEventDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CustomEvent | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start: new Date(),
    end: new Date(),
    calendarId: '',
    type: 'general',
    location: '',
    isAllDay: false,
  });

  // Fetch calendars
  const { data: calendars } = useQuery({
    queryKey: ['calendars'],
    queryFn: () => calendarAPI.getCalendars(),
    enabled: !!user?.id,
  });

  // Fetch events
  const { data: events, isLoading } = useQuery({
    queryKey: ['events', moment(date).format('YYYY-MM')],
    queryFn: () =>
      eventsAPI.getEvents({
        start: moment(date).startOf('month').subtract(7, 'days').toISOString(),
        end: moment(date).endOf('month').add(7, 'days').toISOString(),
      }),
    enabled: !!user?.id,
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: (data: any) => eventsAPI.createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      handleCloseDialog();
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      eventsAPI.updateEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      handleCloseDialog();
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: (id: number) => eventsAPI.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      handleCloseDialog();
    },
  });

  const handleSelectSlot = useCallback(({ start, end }: any) => {
    setSelectedEvent(null);
    setFormData({
      title: '',
      description: '',
      start,
      end,
      calendarId: calendars?.data?.[0]?.id || '',
      type: 'general',
      location: '',
      isAllDay: false,
    });
    setOpenEventDialog(true);
  }, [calendars]);

  const handleSelectEvent = useCallback((event: CustomEvent) => {
    setSelectedEvent(event);
    setFormData({
      title: event.title || '',
      description: event.description || '',
      start: event.start as Date,
      end: event.end as Date,
      calendarId: event.calendarId?.toString() || '',
      type: event.type || 'general',
      location: event.location || '',
      isAllDay: false,
    });
    setOpenEventDialog(true);
  }, []);

  const handleCloseDialog = () => {
    setOpenEventDialog(false);
    setSelectedEvent(null);
    setFormData({
      title: '',
      description: '',
      start: new Date(),
      end: new Date(),
      calendarId: '',
      type: 'general',
      location: '',
      isAllDay: false,
    });
  };

  const handleSaveEvent = () => {
    const eventData = {
      ...formData,
      startTime: formData.start,
      endTime: formData.end,
      calendarId: parseInt(formData.calendarId),
    };

    if (selectedEvent?.id) {
      updateEventMutation.mutate({ id: selectedEvent.id, data: eventData });
    } else {
      createEventMutation.mutate(eventData);
    }
  };

  const handleDeleteEvent = () => {
    if (selectedEvent?.id) {
      deleteEventMutation.mutate(selectedEvent.id);
    }
  };

  // Transform API events to calendar format
  const calendarEvents: CustomEvent[] =
    events?.data?.map((event: any) => ({
      id: event.id,
      title: event.title,
      start: new Date(event.startTime),
      end: new Date(event.endTime),
      description: event.description,
      type: event.calendar?.type || 'general',
      calendarId: event.calendarId,
      location: event.location,
      status: event.status,
    })) || [];

  const eventStyleGetter = (event: CustomEvent) => {
    const backgroundColor = eventTypeColors[event.type as keyof typeof eventTypeColors] || eventTypeColors.general;
    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: event.status === 'completed' ? 0.6 : 1,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  };

  const CustomEvent = ({ event }: { event: CustomEvent }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {eventTypeIcons[event.type as keyof typeof eventTypeIcons]}
      <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
        {event.title}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ height: 'calc(100vh - 120px)' }}>
      <Paper sx={{ p: 2, height: '100%' }}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">Calendar</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {Object.entries(eventTypeColors).map(([type, color]) => (
              <Chip
                key={type}
                label={type}
                size="small"
                sx={{
                  backgroundColor: color,
                  color: 'white',
                  textTransform: 'capitalize',
                }}
              />
            ))}
          </Box>
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            Loading...
          </Box>
        ) : (
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 'calc(100% - 60px)' }}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
            view={view}
            onView={(newView) => setView(newView)}
            date={date}
            onNavigate={(newDate) => setDate(newDate)}
            eventPropGetter={eventStyleGetter}
            components={{
              event: CustomEvent,
            }}
          />
        )}

        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
          onClick={() => handleSelectSlot({ start: new Date(), end: new Date() })}
        >
          <AddIcon />
        </Fab>
      </Paper>

      {/* Event Dialog */}
      <Dialog open={openEventDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedEvent ? 'Edit Event' : 'New Event'}
          {selectedEvent && (
            <IconButton
              aria-label="delete"
              onClick={handleDeleteEvent}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <DeleteIcon />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Title"
              fullWidth
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Calendar</InputLabel>
              <Select
                value={formData.calendarId}
                label="Calendar"
                onChange={(e) => setFormData({ ...formData, calendarId: e.target.value as string })}
              >
                {calendars?.data?.map((calendar: any) => (
                  <MenuItem key={calendar.id} value={calendar.id}>
                    {calendar.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <DateTimePicker
              label="Start"
              value={formData.start}
              onChange={(newValue) => setFormData({ ...formData, start: newValue || new Date() })}
            />
            <DateTimePicker
              label="End"
              value={formData.end}
              onChange={(newValue) => setFormData({ ...formData, end: newValue || new Date() })}
            />
            <TextField
              label="Location"
              fullWidth
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveEvent} variant="contained" disabled={!formData.title}>
            {selectedEvent ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}