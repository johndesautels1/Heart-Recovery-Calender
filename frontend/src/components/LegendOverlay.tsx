import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  IconButton,
  Collapse,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  CheckCircle,
  Schedule,
  Warning,
  Priority,
  Restaurant,
  Medication,
  FitnessCenter,
  Favorite,
  Event,
  LocalHospital,
} from '@mui/icons-material';
import { useHeartbeatTheme } from '../theme/HeartbeatThemeProvider';

interface LegendItem {
  icon: React.ReactNode;
  label: string;
  color: string;
  description?: string;
}

const LegendOverlay: React.FC = () => {
  const theme = useHeartbeatTheme();
  const [expanded, setExpanded] = useState(false);

  const statusLegend: LegendItem[] = [
    {
      icon: <CheckCircle fontSize="small" />,
      label: 'Confirmed',
      color: theme.colors.confirmed,
      description: 'Appointment or event is confirmed',
    },
    {
      icon: <Schedule fontSize="small" />,
      label: 'Requested',
      color: theme.colors.requested,
      description: 'Waiting for confirmation',
    },
    {
      icon: <Warning fontSize="small" />,
      label: 'To Request',
      color: '#fbbf24',
      description: 'Need to schedule or request',
    },
    {
      icon: <Priority fontSize="small" />,
      label: 'Urgent',
      color: theme.colors.urgent,
      description: 'Requires immediate attention',
    },
  ];

  const eventTypeLegend: LegendItem[] = [
    {
      icon: <LocalHospital fontSize="small" />,
      label: 'Medical Appointment',
      color: '#2196f3',
      description: 'Doctor visits and checkups',
    },
    {
      icon: <Medication fontSize="small" />,
      label: 'Medication',
      color: '#9c27b0',
      description: 'Medication reminders',
    },
    {
      icon: <FitnessCenter fontSize="small" />,
      label: 'Exercise',
      color: '#4caf50',
      description: 'Physical activity and rehab',
    },
    {
      icon: <Favorite fontSize="small" />,
      label: 'Vitals Check',
      color: '#f44336',
      description: 'Blood pressure and heart rate',
    },
    {
      icon: <Restaurant fontSize="small" />,
      label: 'Meal',
      color: '#ff9800',
      description: 'Meal tracking and nutrition',
    },
  ];

  const complianceLegend: LegendItem[] = [
    {
      icon: <CheckCircle fontSize="small" />,
      label: 'Within Spec',
      color: theme.colors.mealInSpec,
      description: 'Meets dietary requirements',
    },
    {
      icon: <Warning fontSize="small" />,
      label: 'Out of Spec',
      color: theme.colors.mealOutOfSpec,
      description: 'Exceeds limits',
    },
  ];

  const LegendSection: React.FC<{ title: string; items: LegendItem[] }> = ({ title, items }) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {items.map((item, index) => (
          <Tooltip key={index} title={item.description || ''} placement="left">
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                py: 0.5,
                px: 1,
                borderRadius: 1,
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  borderRadius: 1,
                  bgcolor: `${item.color}20`,
                  color: item.color,
                }}
              >
                {item.icon}
              </Box>
              <Typography variant="body2">{item.label}</Typography>
            </Box>
          </Tooltip>
        ))}
      </Box>
    </Box>
  );

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        top: 80,
        right: 16,
        width: 250,
        p: 2,
        zIndex: theme.zIndex?.dropdown || 1000,
        maxHeight: '80vh',
        overflow: 'auto',
        borderRadius: theme.borderRadius,
        backgroundColor: theme.colors.panel,
        backdropFilter: 'blur(10px)',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Legend
        </Typography>
        <IconButton size="small" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      <LegendSection title="Event Status" items={statusLegend} />

      <Collapse in={expanded}>
        <Divider sx={{ my: 2 }} />
        <LegendSection title="Event Types" items={eventTypeLegend} />
        <Divider sx={{ my: 2 }} />
        <LegendSection title="Meal Compliance" items={complianceLegend} />
      </Collapse>

      {!expanded && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 1, textAlign: 'center' }}
        >
          Click to expand
        </Typography>
      )}
    </Paper>
  );
};

export default LegendOverlay;