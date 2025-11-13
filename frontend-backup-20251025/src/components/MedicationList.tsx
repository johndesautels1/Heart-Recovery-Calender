import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Fab,
  Alert,
  Badge,
  Divider,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Medication,
  Schedule,
  LocalPharmacy,
  Phone,
  Warning,
  CheckCircle,
  Refresh,
  CalendarMonth,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, addDays, isBefore, isAfter } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { medicationsAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface Medication {
  id?: number;
  name: string;
  dosage: string;
  frequency: string;
  prescribedBy?: string;
  startDate: Date;
  endDate?: Date;
  purpose?: string;
  sideEffects?: string;
  instructions?: string;
  isActive: boolean;
  refillDate?: Date;
  remainingRefills?: number;
  pharmacy?: string;
  pharmacyPhone?: string;
  notes?: string;
}

const frequencyColors: Record<string, string> = {
  'Once daily': '#4caf50',
  'Twice daily': '#2196f3',
  'Three times daily': '#ff9800',
  'Four times daily': '#f44336',
  'As needed': '#9c27b0',
  'Weekly': '#00bcd4',
};

export default function MedicationList() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const [formData, setFormData] = useState<Medication>({
    name: '',
    dosage: '',
    frequency: 'Once daily',
    startDate: new Date(),
    isActive: true,
  });

  // Fetch medications
  const { data: medications, isLoading } = useQuery({
    queryKey: ['medications', showInactive ? 'all' : 'active'],
    queryFn: () =>
      medicationsAPI.getMedications({
        userId: user?.id,
        active: !showInactive ? true : undefined,
      }),
    enabled: !!user?.id,
  });

  // Create medication mutation
  const createMedicationMutation = useMutation({
    mutationFn: (data: any) => medicationsAPI.addMedication(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      handleCloseDialog();
    },
  });

  // Update medication mutation
  const updateMedicationMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      medicationsAPI.updateMedication(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      handleCloseDialog();
    },
  });

  // Delete medication mutation
  const deleteMedicationMutation = useMutation({
    mutationFn: (id: number) => medicationsAPI.deleteMedication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: (id: number) => medicationsAPI.toggleActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
    },
  });

  const handleOpenDialog = (medication?: Medication) => {
    if (medication) {
      setSelectedMedication(medication);
      setFormData(medication);
    } else {
      setSelectedMedication(null);
      setFormData({
        name: '',
        dosage: '',
        frequency: 'Once daily',
        startDate: new Date(),
        isActive: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedMedication(null);
  };

  const handleSaveMedication = () => {
    const medicationData = {
      ...formData,
      userId: user?.id,
    };

    if (selectedMedication?.id) {
      updateMedicationMutation.mutate({ id: selectedMedication.id, data: medicationData });
    } else {
      createMedicationMutation.mutate(medicationData);
    }
  };

  const getRefillStatus = (refillDate?: Date, remainingRefills?: number) => {
    if (!refillDate) return null;

    const daysUntilRefill = Math.ceil((new Date(refillDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilRefill <= 0) {
      return { color: 'error', message: 'Refill overdue', icon: <Warning /> };
    } else if (daysUntilRefill <= 7) {
      return { color: 'warning', message: `Refill in ${daysUntilRefill} days`, icon: <Warning /> };
    } else if (remainingRefills && remainingRefills <= 1) {
      return { color: 'warning', message: `${remainingRefills} refill${remainingRefills === 1 ? '' : 's'} remaining`, icon: <Warning /> };
    }
    return { color: 'success', message: `Refill on ${format(new Date(refillDate), 'MMM d')}`, icon: <CheckCircle /> };
  };

  const activeMedications = medications?.data?.filter((m: any) => m.isActive) || [];
  const needsRefill = activeMedications.filter((m: any) => {
    if (!m.refillDate) return false;
    const daysUntilRefill = Math.ceil((new Date(m.refillDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilRefill <= 7;
  });

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Medications</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="body2">
            Show inactive
          </Typography>
          <Switch
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <Medication />
                </Avatar>
                <Box>
                  <Typography variant="h4">{activeMedications.length}</Typography>
                  <Typography color="text.secondary">Active Medications</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <Refresh />
                </Avatar>
                <Box>
                  <Typography variant="h4">{needsRefill.length}</Typography>
                  <Typography color="text.secondary">Need Refill Soon</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <CheckCircle />
                </Avatar>
                <Box>
                  <Typography variant="h4">
                    {activeMedications.reduce((sum: number, m: any) => {
                      const freq = m.frequency.toLowerCase();
                      if (freq.includes('once')) return sum + 1;
                      if (freq.includes('twice')) return sum + 2;
                      if (freq.includes('three')) return sum + 3;
                      if (freq.includes('four')) return sum + 4;
                      return sum + 1;
                    }, 0)}
                  </Typography>
                  <Typography color="text.secondary">Daily Doses</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Refill Alerts */}
      {needsRefill.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Medications Needing Refill:
          </Typography>
          {needsRefill.map((med: any) => (
            <Typography key={med.id} variant="body2">
              • {med.name} - {format(new Date(med.refillDate), 'MMM d, yyyy')}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Medications List */}
      <Grid container spacing={3}>
        {isLoading ? (
          <Grid item xs={12}>
            <Typography>Loading medications...</Typography>
          </Grid>
        ) : medications?.data?.length > 0 ? (
          medications.data.map((medication: any) => {
            const refillStatus = getRefillStatus(medication.refillDate, medication.remainingRefills);
            return (
              <Grid item xs={12} md={6} key={medication.id}>
                <Card sx={{ opacity: medication.isActive ? 1 : 0.6 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6">{medication.name}</Typography>
                        <Typography color="text.secondary">
                          {medication.dosage}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip
                          label={medication.frequency}
                          size="small"
                          sx={{
                            backgroundColor: frequencyColors[medication.frequency] || '#grey',
                            color: 'white',
                          }}
                        />
                        {!medication.isActive && (
                          <Chip label="Inactive" size="small" color="default" />
                        )}
                      </Box>
                    </Box>

                    {medication.purpose && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Purpose:</strong> {medication.purpose}
                      </Typography>
                    )}

                    {medication.instructions && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Instructions:</strong> {medication.instructions}
                      </Typography>
                    )}

                    {medication.prescribedBy && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Prescribed by:</strong> {medication.prescribedBy}
                      </Typography>
                    )}

                    {refillStatus && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                        <Box sx={{ color: `${refillStatus.color}.main`, mr: 1 }}>
                          {refillStatus.icon}
                        </Box>
                        <Typography variant="body2" color={`${refillStatus.color}.main`}>
                          {refillStatus.message}
                        </Typography>
                      </Box>
                    )}

                    {medication.pharmacy && (
                      <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LocalPharmacy sx={{ mr: 1, fontSize: 18 }} />
                          <Typography variant="body2">{medication.pharmacy}</Typography>
                        </Box>
                        {medication.pharmacyPhone && (
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <Phone sx={{ mr: 1, fontSize: 18 }} />
                            <Typography variant="body2">{medication.pharmacyPhone}</Typography>
                          </Box>
                        )}
                      </Box>
                    )}
                  </CardContent>
                  <CardActions>
                    <IconButton size="small" onClick={() => handleOpenDialog(medication)}>
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => toggleActiveMutation.mutate(medication.id)}
                    >
                      {medication.isActive ? <Schedule /> : <CheckCircle />}
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => deleteMedicationMutation.mutate(medication.id)}
                      sx={{ ml: 'auto' }}
                    >
                      <Delete />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            );
          })
        ) : (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Medication sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No medications added yet
              </Typography>
              <Typography color="text.secondary" gutterBottom>
                Add your medications to track doses and refills
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenDialog()}
                sx={{ mt: 2 }}
              >
                Add First Medication
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        onClick={() => handleOpenDialog()}
      >
        <Add />
      </Fab>

      {/* Medication Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedMedication ? 'Edit Medication' : 'Add New Medication'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Medication Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Dosage"
                value={formData.dosage}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                placeholder="e.g., 10mg, 2 tablets"
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Frequency"
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                select
                SelectProps={{ native: true }}
                required
              >
                <option value="Once daily">Once daily</option>
                <option value="Twice daily">Twice daily</option>
                <option value="Three times daily">Three times daily</option>
                <option value="Four times daily">Four times daily</option>
                <option value="As needed">As needed</option>
                <option value="Weekly">Weekly</option>
                <option value="Other">Other</option>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Prescribed By"
                value={formData.prescribedBy || ''}
                onChange={(e) => setFormData({ ...formData, prescribedBy: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Start Date"
                value={formData.startDate}
                onChange={(newValue) => setFormData({ ...formData, startDate: newValue || new Date() })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <DatePicker
                label="End Date (if applicable)"
                value={formData.endDate || null}
                onChange={(newValue) => setFormData({ ...formData, endDate: newValue || undefined })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Purpose"
                value={formData.purpose || ''}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="SpeCAIl Instructions"
                value={formData.instructions || ''}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                multiline
                rows={2}
                placeholder="e.g., Take with food, avoid alcohol"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Side Effects to Watch For"
                value={formData.sideEffects || ''}
                onChange={(e) => setFormData({ ...formData, sideEffects: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>Refill Information</Divider>
            </Grid>
            <Grid item xs={12} md={4}>
              <DatePicker
                label="Next Refill Date"
                value={formData.refillDate || null}
                onChange={(newValue) => setFormData({ ...formData, refillDate: newValue || undefined })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Remaining Refills"
                type="number"
                value={formData.remainingRefills || ''}
                onChange={(e) => setFormData({ ...formData, remainingRefills: parseInt(e.target.value) || undefined })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Pharmacy"
                value={formData.pharmacy || ''}
                onChange={(e) => setFormData({ ...formData, pharmacy: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Pharmacy Phone"
                value={formData.pharmacyPhone || ''}
                onChange={(e) => setFormData({ ...formData, pharmacyPhone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Additional Notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSaveMedication}
            variant="contained"
            disabled={!formData.name || !formData.dosage || !formData.frequency}
          >
            {selectedMedication ? 'Update' : 'Add'} Medication
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}