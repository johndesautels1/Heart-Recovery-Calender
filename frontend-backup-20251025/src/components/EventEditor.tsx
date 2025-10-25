import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  FormControlLabel,
  Switch,
  Alert,
  Typography,
  Divider,
} from '@mui/material';
import {
  Close,
  Save,
  Delete,
  Schedule,
  LocationOn,
  Description,
  Repeat,
  Notifications,
  CheckCircle,
  Warning,
  Priority,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { format, addHours } from 'date-fns';
import { CalendarEvent } from '../types';
import { useHeartbeatTheme } from '../theme/HeartbeatThemeProvider';

interface EventEditorProps {
  event?: CalendarEvent | null;
  open: boolean;
  onSave: (event: Partial<CalendarEvent>) => void;
  onDelete?: (eventId: string) => void;
  onCancel: () => void;
  calendars?: Array<{ id: string; name: string; color: string }>;
}

const emptyEvent: Partial<CalendarEvent> = {
  title: '',
  calendarId: '',
  startTime: new Date().toISOString(),
  endTime: addHours(new Date(), 1).toISOString(),
  status: 'confirmed',
  description: '',
  location: '',
  colorTag: '',
};

const statusOptions = [
  { value: 'confirmed', label: 'Confirmed', icon: <CheckCircle />, color: '#4ade80' },
  { value: 'requested', label: 'Requested', icon: <Schedule />, color: '#60a5fa' },
  { value: 'to-request', label: 'To Request', icon: <Warning />, color: '#fbbf24' },
  { value: 'urgent', label: 'Urgent', icon: <Priority />, color: '#f87171' },
];

const reminderOptions = [
  { value: 0, label: 'At time of event' },
  { value: 5, label: '5 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
];

const EventEditor: React.FC<EventEditorProps> = ({
  event,
  open,
  onSave,
  onDelete,
  onCancel,
  calendars = [],
}) => {
  const theme = useHeartbeatTheme();
  const [form, setForm] = useState<Partial<CalendarEvent>>(emptyEvent);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isRecurring, setIsRecurring] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState(15);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (event) {
      setForm(event);
      setIsRecurring(!!event.recurrenceRule);
    } else {
      setForm({ ...emptyEvent, calendarId: calendars[0]?.id || '' });
    }
  }, [event, calendars]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.title?.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!form.calendarId) {
      newErrors.calendarId = 'Please select a calendar';
    }
    if (!form.startTime) {
      newErrors.startTime = 'Start time is required';
    }
    if (!form.endTime) {
      newErrors.endTime = 'End time is required';
    }
    if (new Date(form.startTime!) > new Date(form.endTime!)) {
      newErrors.endTime = 'End time must be after start time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave({
        ...form,
        reminderMinutes: isRecurring ? reminderMinutes : undefined,
      });
    }
  };

  const handleDelete = () => {
    if (event?.id) {
      onDelete?.(event.id);
      setShowDeleteConfirm(false);
    }
  };

  const selectedStatus = statusOptions.find(s => s.value === form.status);

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: theme.borderRadius,
          backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundSize: '100% 200px',
          backgroundRepeat: 'no-repeat',
        },
      }}
    >
      <DialogTitle
        sx={{
          color: 'white',
          pb: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h5" fontWeight="bold">
          {event ? 'Edit Event' : 'Create New Event'}
        </Typography>
        <IconButton onClick={onCancel} sx={{ color: 'white' }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ mt: 2, bgcolor: 'background.paper' }}>
        <Grid container spacing={3}>
          {/* Title */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Event Title"
              value={form.title || ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              error={!!errors.title}
              helperText={errors.title}
              required
              autoFocus
              InputProps={{
                startAdornment: <Schedule sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />
          </Grid>

          {/* Calendar Selection */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth error={!!errors.calendarId} required>
              <InputLabel>Calendar</InputLabel>
              <Select
                value={form.calendarId || ''}
                label="Calendar"
                onChange={(e) => setForm({ ...form, calendarId: e.target.value })}
              >
                {calendars.map((cal) => (
                  <MenuItem key={cal.id} value={cal.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: cal.color,
                        }}
                      />
                      {cal.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
              {errors.calendarId && (
                <Typography variant="caption" color="error">
                  {errors.calendarId}
                </Typography>
              )}
            </FormControl>
          </Grid>

          {/* Status */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={form.status || 'confirmed'}
                label="Status"
                onChange={(e) => setForm({ ...form, status: e.target.value as CalendarEvent['status'] })}
                renderValue={() => (
                  <Chip
                    icon={selectedStatus?.icon}
                    label={selectedStatus?.label}
                    size="small"
                    sx={{
                      bgcolor: `${selectedStatus?.color}20`,
                      color: selectedStatus?.color,
                    }}
                  />
                )}
              >
                {statusOptions.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ color: status.color }}>{status.icon}</Box>
                      {status.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Date/Time */}
          <Grid item xs={12} md={6}>
            <DateTimePicker
              label="Start Time"
              value={form.startTime ? new Date(form.startTime) : null}
              onChange={(newValue) =>
                setForm({ ...form, startTime: newValue?.toISOString() || '' })
              }
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!errors.startTime,
                  helperText: errors.startTime,
                  required: true,
                },
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <DateTimePicker
              label="End Time"
              value={form.endTime ? new Date(form.endTime) : null}
              onChange={(newValue) =>
                setForm({ ...form, endTime: newValue?.toISOString() || '' })
              }
              minDateTime={form.startTime ? new Date(form.startTime) : undefined}
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!errors.endTime,
                  helperText: errors.endTime,
                  required: true,
                },
              }}
            />
          </Grid>

          {/* Location */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Location"
              value={form.location || ''}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              InputProps={{
                startAdornment: <LocationOn sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />
          </Grid>

          {/* Description */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              InputProps={{
                startAdornment: <Description sx={{ mr: 1, mt: 1, color: 'action.active' }} />,
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* Recurrence */}
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Repeat />
                  Recurring Event
                </Box>
              }
            />
          </Grid>

          {/* Reminder */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Reminder</InputLabel>
              <Select
                value={reminderMinutes}
                label="Reminder"
                onChange={(e) => setReminderMinutes(Number(e.target.value))}
                startAdornment={<Notifications sx={{ mr: 1, color: 'action.active' }} />}
              >
                {reminderOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <Grid item xs={12}>
              <Alert
                severity="warning"
                action={
                  <Box>
                    <Button size="small" onClick={() => setShowDeleteConfirm(false)}>
                      Cancel
                    </Button>
                    <Button size="small" color="error" onClick={handleDelete}>
                      Delete
                    </Button>
                  </Box>
                }
              >
                Are you sure you want to delete this event?
              </Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3, bgcolor: 'background.paper' }}>
        {event && onDelete && !showDeleteConfirm && (
          <Button
            startIcon={<Delete />}
            onClick={() => setShowDeleteConfirm(true)}
            color="error"
            sx={{ mr: 'auto' }}
          >
            Delete
          </Button>
        )}
        <Button onClick={onCancel} variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          startIcon={<Save />}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
          }}
        >
          {event ? 'Update' : 'Create'} Event
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EventEditor;