import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  AccessTime,
  LocationOn,
  Edit,
  Delete,
  CheckCircle,
  Warning,
  Schedule,
  Priority,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { CalendarEvent } from '../types';
import { useHeartbeatTheme } from '../theme/HeartbeatThemeProvider';

interface EventCardProps {
  event: CalendarEvent;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void;
  onStatusChange?: (event: CalendarEvent, status: CalendarEvent['status']) => void;
  compact?: boolean;
}

const statusConfig = {
  confirmed: {
    color: '#4ade80',
    icon: <CheckCircle fontSize="small" />,
    label: 'Confirmed',
  },
  requested: {
    color: '#60a5fa',
    icon: <Schedule fontSize="small" />,
    label: 'Requested',
  },
  'to-request': {
    color: '#fbbf24',
    icon: <Warning fontSize="small" />,
    label: 'To Request',
  },
  urgent: {
    color: '#f87171',
    icon: <Priority fontSize="small" />,
    label: 'Urgent',
  },
};

const EventCard: React.FC<EventCardProps> = ({
  event,
  onEdit,
  onDelete,
  onStatusChange,
  compact = false,
}) => {
  const theme = useHeartbeatTheme();
  const status = statusConfig[event.status];

  const handleStatusClick = () => {
    if (onStatusChange) {
      const statusOrder: CalendarEvent['status'][] = ['to-request', 'requested', 'confirmed'];
      const currentIndex = statusOrder.indexOf(event.status);
      const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length] || 'confirmed';
      onStatusChange(event, nextStatus);
    }
  };

  if (compact) {
    return (
      <Box
        sx={{
          p: 1,
          borderLeft: `4px solid ${status.color}`,
          bgcolor: 'background.paper',
          borderRadius: 1,
          mb: 1,
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {status.icon}
            <Typography variant="body2" fontWeight="medium">
              {event.title}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {format(new Date(event.startTime), 'h:mm a')}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Card
      sx={{
        mb: 2,
        borderLeft: `4px solid ${status.color}`,
        transition: theme.transitions.base,
        '&:hover': {
          boxShadow: theme.colors.shadow,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              {event.title}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AccessTime fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {format(new Date(event.startTime), 'MMM d, yyyy h:mm a')} -{' '}
                {format(new Date(event.endTime), 'h:mm a')}
              </Typography>
            </Box>

            {event.location && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <LocationOn fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {event.location}
                </Typography>
              </Box>
            )}

            {event.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {event.description}
              </Typography>
            )}

            <Box sx={{ mt: 2 }}>
              <Tooltip title="Click to change status">
                <Chip
                  icon={status.icon}
                  label={status.label}
                  size="small"
                  onClick={handleStatusClick}
                  sx={{
                    backgroundColor: `${status.color}20`,
                    color: status.color,
                    borderColor: status.color,
                    cursor: onStatusChange ? 'pointer' : 'default',
                    '&:hover': {
                      backgroundColor: `${status.color}30`,
                    },
                  }}
                />
              </Tooltip>
            </Box>
          </Box>

          {(onEdit || onDelete) && (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {onEdit && (
                <Tooltip title="Edit event">
                  <IconButton size="small" onClick={() => onEdit(event)}>
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {onDelete && (
                <Tooltip title="Delete event">
                  <IconButton size="small" onClick={() => onDelete(event)} color="error">
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default EventCard;