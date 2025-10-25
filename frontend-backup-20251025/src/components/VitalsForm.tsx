import React, { useState } from 'react';
import {
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  InputAdornment,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from '@mui/material';
import {
  Favorite,
  MonitorHeart,
  Scale,
  Thermostat,
  Bloodtype,
  Air,
  Delete,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vitalsAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface VitalSign {
  id?: number;
  timestamp: Date;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  weight?: number;
  temperature?: number;
  oxygenSaturation?: number;
  bloodSugar?: number;
  respiratoryRate?: number;
  notes?: string;
  symptoms?: string;
  medicationsTaken: boolean;
  source: 'manual' | 'device' | 'import';
}

const normalRanges = {
  bloodPressureSystolic: { min: 90, max: 120, unit: 'mmHg' },
  bloodPressureDiastolic: { min: 60, max: 80, unit: 'mmHg' },
  heartRate: { min: 60, max: 100, unit: 'bpm' },
  temperature: { min: 97, max: 99, unit: '°F' },
  oxygenSaturation: { min: 95, max: 100, unit: '%' },
  bloodSugar: { min: 70, max: 140, unit: 'mg/dL' },
  respiratoryRate: { min: 12, max: 20, unit: 'breaths/min' },
  weight: { unit: 'lbs' },
};

export default function VitalsForm() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const [formData, setFormData] = useState<VitalSign>({
    timestamp: new Date(),
    medicationsTaken: false,
    source: 'manual',
  });

  // Fetch recent vitals
  const { data: recentVitals } = useQuery({
    queryKey: ['vitals', 'recent'],
    queryFn: () =>
      vitalsAPI.getVitals({
        userId: user?.id,
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      }),
    enabled: !!user?.id,
  });

  // Create vital mutation
  const createVitalMutation = useMutation({
    mutationFn: (data: any) => vitalsAPI.addVital(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vitals'] });
      setSnackbarMessage('Vital signs recorded successfully!');
      setSnackbarSeverity('success');
      setShowSnackbar(true);
      // Reset form
      setFormData({
        timestamp: new Date(),
        medicationsTaken: false,
        source: 'manual',
      });
    },
    onError: () => {
      setSnackbarMessage('Error recording vital signs. Please try again.');
      setSnackbarSeverity('error');
      setShowSnackbar(true);
    },
  });

  // Delete vital mutation
  const deleteVitalMutation = useMutation({
    mutationFn: (id: number) => vitalsAPI.deleteVital(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vitals'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createVitalMutation.mutate({
      ...formData,
      userId: user?.id,
    });
  };

  const getValueStatus = (value: number | undefined, key: keyof typeof normalRanges) => {
    if (!value) return null;
    const range = normalRanges[key];
    if (!range.min || !range.max) return null;

    if (value < range.min) return { color: 'warning.main', icon: <TrendingDown /> };
    if (value > range.max) return { color: 'error.main', icon: <TrendingUp /> };
    return { color: 'success.main', icon: null };
  };

  const VitalInput = ({
    label,
    icon,
    field,
    unit,
  }: {
    label: string;
    icon: React.ReactNode;
    field: keyof VitalSign;
    unit: string;
  }) => {
    const status = getValueStatus(formData[field] as number, field as keyof typeof normalRanges);
    const range = normalRanges[field as keyof typeof normalRanges];

    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ color: 'primary.main', mr: 1 }}>{icon}</Box>
            <Typography variant="subtitle1">{label}</Typography>
            {status && status.icon && (
              <Box sx={{ ml: 'auto', color: status.color }}>{status.icon}</Box>
            )}
          </Box>
          <TextField
            fullWidth
            type="number"
            value={formData[field] || ''}
            onChange={(e) =>
              setFormData({ ...formData, [field]: parseFloat(e.target.value) || undefined })
            }
            InputProps={{
              endAdornment: <InputAdornment position="end">{unit}</InputAdornment>,
              sx: status ? { '& input': { color: status.color } } : {},
            }}
            helperText={
              range.min && range.max
                ? `Normal range: ${range.min}-${range.max} ${unit}`
                : ''
            }
          />
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Record Vital Signs
      </Typography>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Date and Time */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <DateTimePicker
                label="Date & Time"
                value={formData.timestamp}
                onChange={(newValue) =>
                  setFormData({ ...formData, timestamp: newValue || new Date() })
                }
                sx={{ width: '100%' }}
              />
            </Paper>
          </Grid>

          {/* Source */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Source</InputLabel>
                <Select
                  value={formData.source}
                  label="Source"
                  onChange={(e) =>
                    setFormData({ ...formData, source: e.target.value as VitalSign['source'] })
                  }
                >
                  <MenuItem value="manual">Manual Entry</MenuItem>
                  <MenuItem value="device">Device</MenuItem>
                  <MenuItem value="import">Imported</MenuItem>
                </Select>
              </FormControl>
            </Paper>
          </Grid>

          {/* Blood Pressure */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Favorite sx={{ color: 'error.main', mr: 1 }} />
                  <Typography variant="subtitle1">Blood Pressure</Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Systolic"
                      type="number"
                      value={formData.bloodPressureSystolic || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bloodPressureSystolic: parseInt(e.target.value) || undefined,
                        })
                      }
                      InputProps={{
                        endAdornment: <InputAdornment position="end">mmHg</InputAdornment>,
                      }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Diastolic"
                      type="number"
                      value={formData.bloodPressureDiastolic || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bloodPressureDiastolic: parseInt(e.target.value) || undefined,
                        })
                      }
                      InputProps={{
                        endAdornment: <InputAdornment position="end">mmHg</InputAdornment>,
                      }}
                    />
                  </Grid>
                </Grid>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  Normal: 120/80 mmHg
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Heart Rate */}
          <Grid item xs={12} sm={6} md={3}>
            <VitalInput
              label="Heart Rate"
              icon={<MonitorHeart />}
              field="heartRate"
              unit="bpm"
            />
          </Grid>

          {/* Weight */}
          <Grid item xs={12} sm={6} md={3}>
            <VitalInput
              label="Weight"
              icon={<Scale />}
              field="weight"
              unit="lbs"
            />
          </Grid>

          {/* Temperature */}
          <Grid item xs={12} sm={6} md={3}>
            <VitalInput
              label="Temperature"
              icon={<Thermostat />}
              field="temperature"
              unit="°F"
            />
          </Grid>

          {/* Oxygen Saturation */}
          <Grid item xs={12} sm={6} md={3}>
            <VitalInput
              label="O₂ Saturation"
              icon={<Air />}
              field="oxygenSaturation"
              unit="%"
            />
          </Grid>

          {/* Blood Sugar */}
          <Grid item xs={12} sm={6} md={3}>
            <VitalInput
              label="Blood Sugar"
              icon={<Bloodtype />}
              field="bloodSugar"
              unit="mg/dL"
            />
          </Grid>

          {/* Notes and Symptoms */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Symptoms"
                    multiline
                    rows={3}
                    value={formData.symptoms || ''}
                    onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                    placeholder="Any symptoms you're experiencing..."
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Notes"
                    multiline
                    rows={3}
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Submit Button */}
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={createVitalMutation.isPending}
            >
              Record Vital Signs
            </Button>
          </Grid>
        </Grid>
      </form>

      {/* Recent Vitals Table */}
      {recentVitals?.data?.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Recent Readings
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Blood Pressure</TableCell>
                  <TableCell>Heart Rate</TableCell>
                  <TableCell>Weight</TableCell>
                  <TableCell>O₂ Sat</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentVitals.data.slice(0, 5).map((vital: any) => (
                  <TableRow key={vital.id}>
                    <TableCell>
                      {format(new Date(vital.timestamp), 'MMM d, h:mm a')}
                    </TableCell>
                    <TableCell>
                      {vital.bloodPressureSystolic && vital.bloodPressureDiastolic
                        ? `${vital.bloodPressureSystolic}/${vital.bloodPressureDiastolic}`
                        : '-'}
                    </TableCell>
                    <TableCell>{vital.heartRate || '-'}</TableCell>
                    <TableCell>{vital.weight || '-'}</TableCell>
                    <TableCell>{vital.oxygenSaturation ? `${vital.oxygenSaturation}%` : '-'}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => deleteVitalMutation.mutate(vital.id)}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      <Snackbar
        open={showSnackbar}
        autoHideDuration={6000}
        onClose={() => setShowSnackbar(false)}
      >
        <Alert severity={snackbarSeverity} onClose={() => setShowSnackbar(false)}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}