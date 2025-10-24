import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  IconButton,
  Switch,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  Google,
  Apple,
  CalendarMonth,
  Sync,
  SyncDisabled,
  CheckCircle,
  Error,
  Warning,
  Settings,
  AccessTime,
  CloudSync,
  Info,
  Link,
  LinkOff,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useHeartbeatTheme } from '../theme/HeartbeatThemeProvider';

type Provider = 'google' | 'apple' | 'calendly' | 'outlook' | 'fitbit';

interface ProviderConfig {
  id: Provider;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  features: string[];
}

interface SyncStatus {
  provider: Provider;
  connected: boolean;
  lastSync?: Date;
  nextSync?: Date;
  itemsSynced?: number;
  error?: string;
  syncing?: boolean;
}

interface SyncSettingsProps {
  connected: Provider[];
  onConnect: (provider: Provider) => Promise<void>;
  onDisconnect: (provider: Provider) => Promise<void>;
  onSync?: (provider: Provider) => Promise<void>;
  syncStatus?: Record<Provider, SyncStatus>;
  autoSync?: boolean;
  onAutoSyncChange?: (enabled: boolean) => void;
  syncInterval?: number;
  onSyncIntervalChange?: (minutes: number) => void;
}

const providerConfigs: Record<Provider, ProviderConfig> = {
  google: {
    id: 'google',
    label: 'Google Calendar',
    icon: <Google />,
    color: '#4285f4',
    description: 'Sync with Google Calendar events and reminders',
    features: ['Two-way sync', 'Real-time updates', 'Multiple calendars'],
  },
  apple: {
    id: 'apple',
    label: 'Apple Calendar',
    icon: <Apple />,
    color: '#000000',
    description: 'Connect with iCloud Calendar',
    features: ['iCloud sync', 'Reminders', 'Shared calendars'],
  },
  calendly: {
    id: 'calendly',
    label: 'Calendly',
    icon: <CalendarMonth />,
    color: '#00a2ff',
    description: 'Import scheduling from Calendly',
    features: ['Appointment booking', 'Availability sync', 'Meeting types'],
  },
  outlook: {
    id: 'outlook',
    label: 'Outlook Calendar',
    icon: <CalendarMonth />,
    color: '#0078d4',
    description: 'Sync with Microsoft Outlook',
    features: ['Exchange sync', 'Office 365', 'Teams integration'],
  },
  fitbit: {
    id: 'fitbit',
    label: 'Fitbit',
    icon: <CloudSync />,
    color: '#00b0b9',
    description: 'Import health data from Fitbit',
    features: ['Activity tracking', 'Heart rate data', 'Sleep patterns'],
  },
};

const syncIntervals = [
  { value: 5, label: 'Every 5 minutes' },
  { value: 15, label: 'Every 15 minutes' },
  { value: 30, label: 'Every 30 minutes' },
  { value: 60, label: 'Every hour' },
  { value: 360, label: 'Every 6 hours' },
  { value: 1440, label: 'Once daily' },
];

const SyncSettings: React.FC<SyncSettingsProps> = ({
  connected,
  onConnect,
  onDisconnect,
  onSync,
  syncStatus = {},
  autoSync = false,
  onAutoSyncChange,
  syncInterval = 30,
  onSyncIntervalChange,
}) => {
  const theme = useHeartbeatTheme();
  const [pending, setPending] = useState<Provider | null>(null);
  const [detailsDialog, setDetailsDialog] = useState<Provider | null>(null);
  const [disconnectConfirm, setDisconnectConfirm] = useState<Provider | null>(null);

  const handleConnect = async (provider: Provider) => {
    setPending(provider);
    try {
      await onConnect(provider);
    } finally {
      setPending(null);
    }
  };

  const handleDisconnect = async (provider: Provider) => {
    setDisconnectConfirm(null);
    setPending(provider);
    try {
      await onDisconnect(provider);
    } finally {
      setPending(null);
    }
  };

  const handleSync = async (provider: Provider) => {
    if (onSync) {
      setPending(provider);
      try {
        await onSync(provider);
      } finally {
        setPending(null);
      }
    }
  };

  const getStatusIcon = (provider: Provider) => {
    const status = syncStatus[provider];
    if (!status) return null;

    if (status.syncing || pending === provider) {
      return <CircularProgress size={20} />;
    }
    if (status.error) {
      return <Error color="error" fontSize="small" />;
    }
    if (status.connected) {
      return <CheckCircle color="success" fontSize="small" />;
    }
    return null;
  };

  const getStatusChip = (provider: Provider) => {
    const status = syncStatus[provider];
    if (!status || !status.connected) return null;

    if (status.syncing) {
      return <Chip label="Syncing..." size="small" color="info" />;
    }
    if (status.error) {
      return <Chip label="Error" size="small" color="error" />;
    }
    if (status.lastSync) {
      return (
        <Chip
          label={`Last sync: ${format(status.lastSync, 'h:mm a')}`}
          size="small"
          variant="outlined"
        />
      );
    }
    return null;
  };

  const config = detailsDialog ? providerConfigs[detailsDialog] : null;

  return (
    <>
      <Paper
        elevation={3}
        sx={{
          p: 3,
          borderRadius: theme.borderRadius,
          background: theme.colors.panel,
          backdropFilter: 'blur(10px)',
          maxWidth: 600,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Settings sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h5" fontWeight="bold" color={theme.colors.heading}>
            Sync Settings
          </Typography>
        </Box>

        {/* Auto Sync Settings */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Sync color="primary" />
              <Typography variant="subtitle1" fontWeight="medium">
                Automatic Sync
              </Typography>
            </Box>
            <Switch
              checked={autoSync}
              onChange={(e) => onAutoSyncChange?.(e.target.checked)}
              color="primary"
            />
          </Box>

          {autoSync && (
            <FormControl fullWidth size="small">
              <InputLabel>Sync Frequency</InputLabel>
              <Select
                value={syncInterval}
                label="Sync Frequency"
                onChange={(e) => onSyncIntervalChange?.(Number(e.target.value))}
              >
                {syncIntervals.map((interval) => (
                  <MenuItem key={interval.value} value={interval.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccessTime fontSize="small" />
                      {interval.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Provider List */}
        <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
          CONNECTED SERVICES
        </Typography>

        <List sx={{ p: 0 }}>
          {Object.values(providerConfigs).map((providerConfig) => {
            const isConnected = connected.includes(providerConfig.id);
            const status = syncStatus[providerConfig.id];
            const isPending = pending === providerConfig.id || status?.syncing;

            return (
              <ListItem
                key={providerConfig.id}
                sx={{
                  mb: 2,
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: isConnected ? 'primary.main' : 'divider',
                  bgcolor: isConnected ? 'action.hover' : 'background.paper',
                  transition: theme.transitions?.base || '0.3s',
                  '&:hover': {
                    bgcolor: isConnected ? 'action.selected' : 'action.hover',
                  },
                }}
              >
                <ListItemIcon>
                  <Box
                    sx={{
                      color: providerConfig.color,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {providerConfig.icon}
                  </Box>
                </ListItemIcon>

                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography fontWeight="medium">
                        {providerConfig.label}
                      </Typography>
                      {getStatusIcon(providerConfig.id)}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {providerConfig.description}
                      </Typography>
                      {getStatusChip(providerConfig.id)}
                    </Box>
                  }
                />

                <ListItemSecondaryAction>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {isConnected && onSync && (
                      <Tooltip title="Sync now">
                        <IconButton
                          size="small"
                          onClick={() => handleSync(providerConfig.id)}
                          disabled={isPending}
                        >
                          <Sync />
                        </IconButton>
                      </Tooltip>
                    )}

                    <Tooltip title="View details">
                      <IconButton
                        size="small"
                        onClick={() => setDetailsDialog(providerConfig.id)}
                      >
                        <Info />
                      </IconButton>
                    </Tooltip>

                    {isConnected ? (
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        startIcon={isPending ? <CircularProgress size={16} /> : <LinkOff />}
                        onClick={() => setDisconnectConfirm(providerConfig.id)}
                        disabled={isPending}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={isPending ? <CircularProgress size={16} /> : <Link />}
                        onClick={() => handleConnect(providerConfig.id)}
                        disabled={isPending}
                        sx={{
                          bgcolor: providerConfig.color,
                          '&:hover': {
                            bgcolor: providerConfig.color,
                            filter: 'brightness(0.9)',
                          },
                        }}
                      >
                        Connect
                      </Button>
                    )}
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>

        {/* Sync Progress */}
        {Object.values(syncStatus).some(s => s.syncing) && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Syncing in progress...
            </Typography>
            <LinearProgress />
          </Box>
        )}

        {/* Error Alert */}
        {Object.values(syncStatus).some(s => s.error) && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Some services encountered errors during sync. Click on the service for details.
            </Typography>
          </Alert>
        )}
      </Paper>

      {/* Provider Details Dialog */}
      <Dialog
        open={!!detailsDialog}
        onClose={() => setDetailsDialog(null)}
        maxWidth="sm"
        fullWidth
      >
        {config && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ color: config.color }}>{config.icon}</Box>
                {config.label}
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" paragraph>
                {config.description}
              </Typography>
              <Typography variant="subtitle2" gutterBottom>
                Features:
              </Typography>
              <List dense>
                {config.features.map((feature, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckCircle fontSize="small" color="success" />
                    </ListItemIcon>
                    <ListItemText primary={feature} />
                  </ListItem>
                ))}
              </List>
              {syncStatus[config.id]?.connected && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Sync Status:
                  </Typography>
                  {syncStatus[config.id]?.lastSync && (
                    <Typography variant="body2">
                      Last sync: {format(syncStatus[config.id].lastSync!, 'PPp')}
                    </Typography>
                  )}
                  {syncStatus[config.id]?.itemsSynced && (
                    <Typography variant="body2">
                      Items synced: {syncStatus[config.id].itemsSynced}
                    </Typography>
                  )}
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsDialog(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Disconnect Confirmation Dialog */}
      <Dialog
        open={!!disconnectConfirm}
        onClose={() => setDisconnectConfirm(null)}
      >
        <DialogTitle>Disconnect Service</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will stop syncing data with {disconnectConfirm && providerConfigs[disconnectConfirm].label}.
          </Alert>
          <Typography>
            Are you sure you want to disconnect? Your existing data will be preserved, but no new data will be synced.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisconnectConfirm(null)}>Cancel</Button>
          <Button
            onClick={() => disconnectConfirm && handleDisconnect(disconnectConfirm)}
            color="error"
            variant="contained"
          >
            Disconnect
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SyncSettings;