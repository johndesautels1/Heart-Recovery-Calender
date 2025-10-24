import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  Restaurant,
  LocalDining,
  EmojiFoodBeverage,
  LunchDining,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, isToday } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mealsAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface MealEntry {
  id?: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodItems: string;
  calories?: number;
  sodium?: number;
  cholesterol?: number;
  saturatedFat?: number;
  totalFat?: number;
  fiber?: number;
  sugar?: number;
  protein?: number;
  carbohydrates?: number;
  notes?: string;
  timestamp: Date;
  withinSpec?: boolean;
}

const dailyLimits = {
  calories: { max: 2000, warning: 1800 },
  sodium: { max: 2300, warning: 2000 }, // mg
  cholesterol: { max: 300, warning: 250 }, // mg
  saturatedFat: { max: 20, warning: 18 }, // g
  sugar: { max: 50, warning: 40 }, // g
};

const mealIcons = {
  breakfast: <EmojiFoodBeverage />,
  lunch: <LunchDining />,
  dinner: <Restaurant />,
  snack: <LocalDining />,
};

export default function MealTracker() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealEntry | null>(null);

  const [formData, setFormData] = useState<MealEntry>({
    mealType: 'breakfast',
    foodItems: '',
    timestamp: new Date(),
  });

  // Fetch meals for selected date
  const { data: meals, isLoading } = useQuery({
    queryKey: ['meals', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: () =>
      mealsAPI.getMeals({
        userId: user?.id,
        date: format(selectedDate, 'yyyy-MM-dd'),
      }),
    enabled: !!user?.id,
  });

  // Fetch compliance data
  const { data: compliance } = useQuery({
    queryKey: ['compliance', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: () =>
      mealsAPI.getCompliance(user?.id || 0, format(selectedDate, 'yyyy-MM-dd')),
    enabled: !!user?.id,
  });

  // Create meal mutation
  const createMealMutation = useMutation({
    mutationFn: (data: any) => mealsAPI.addMeal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
      handleCloseDialog();
    },
  });

  // Update meal mutation
  const updateMealMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      mealsAPI.updateMeal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
      handleCloseDialog();
    },
  });

  // Delete meal mutation
  const deleteMealMutation = useMutation({
    mutationFn: (id: number) => mealsAPI.deleteMeal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
    },
  });

  const handleOpenDialog = (meal?: MealEntry) => {
    if (meal) {
      setSelectedMeal(meal);
      setFormData(meal);
    } else {
      setSelectedMeal(null);
      setFormData({
        mealType: 'breakfast',
        foodItems: '',
        timestamp: selectedDate,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedMeal(null);
    setFormData({
      mealType: 'breakfast',
      foodItems: '',
      timestamp: new Date(),
    });
  };

  const handleSaveMeal = () => {
    const mealData = {
      ...formData,
      userId: user?.id,
      timestamp: formData.timestamp || selectedDate,
      withinSpec: calculateWithinSpec(formData),
    };

    if (selectedMeal?.id) {
      updateMealMutation.mutate({ id: selectedMeal.id, data: mealData });
    } else {
      createMealMutation.mutate(mealData);
    }
  };

  const calculateWithinSpec = (meal: MealEntry): boolean => {
    if (!meal.sodium || !meal.cholesterol || !meal.saturatedFat) {
      return true; // Can't determine if no nutritional data
    }
    return (
      meal.sodium <= dailyLimits.sodium.max &&
      meal.cholesterol <= dailyLimits.cholesterol.max &&
      meal.saturatedFat <= dailyLimits.saturatedFat.max
    );
  };

  const calculateDailyTotals = () => {
    if (!meals?.data) return {};

    const totals = meals.data.reduce((acc: any, meal: any) => {
      return {
        calories: (acc.calories || 0) + (meal.calories || 0),
        sodium: (acc.sodium || 0) + (meal.sodium || 0),
        cholesterol: (acc.cholesterol || 0) + (meal.cholesterol || 0),
        saturatedFat: (acc.saturatedFat || 0) + (meal.saturatedFat || 0),
        totalFat: (acc.totalFat || 0) + (meal.totalFat || 0),
        protein: (acc.protein || 0) + (meal.protein || 0),
        carbohydrates: (acc.carbohydrates || 0) + (meal.carbohydrates || 0),
        fiber: (acc.fiber || 0) + (meal.fiber || 0),
        sugar: (acc.sugar || 0) + (meal.sugar || 0),
      };
    }, {});

    return totals;
  };

  const dailyTotals = calculateDailyTotals();

  const getNutrientStatus = (value: number, limit: { max: number; warning: number }) => {
    if (value >= limit.max) return { color: 'error', icon: <ErrorIcon /> };
    if (value >= limit.warning) return { color: 'warning', icon: <Warning /> };
    return { color: 'success', icon: <CheckCircle /> };
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Meal Tracker</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <DatePicker
            label="Select Date"
            value={selectedDate}
            onChange={(newValue) => setSelectedDate(newValue || new Date())}
          />
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Log Meal
          </Button>
        </Box>
      </Box>

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="Today's Meals" />
        <Tab label="Nutritional Summary" />
        <Tab label="Compliance" />
      </Tabs>

      {/* Today's Meals Tab */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {['breakfast', 'lunch', 'dinner', 'snack'].map((mealType) => {
            const mealData = meals?.data?.filter((m: any) => m.mealType === mealType) || [];
            return (
              <Grid item xs={12} md={6} key={mealType}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {mealIcons[mealType as keyof typeof mealIcons]}
                      <Typography variant="h6" sx={{ ml: 1, textTransform: 'capitalize' }}>
                        {mealType}
                      </Typography>
                      <IconButton
                        size="small"
                        sx={{ ml: 'auto' }}
                        onClick={() => handleOpenDialog({ mealType } as MealEntry)}
                      >
                        <Add />
                      </IconButton>
                    </Box>
                    {mealData.length > 0 ? (
                      mealData.map((meal: any) => (
                        <Paper key={meal.id} sx={{ p: 2, mb: 1 }}>
                          <Typography variant="body1">{meal.foodItems}</Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                            {meal.calories && (
                              <Chip label={`${meal.calories} cal`} size="small" />
                            )}
                            {meal.sodium && (
                              <Chip label={`${meal.sodium}mg sodium`} size="small" />
                            )}
                            {meal.protein && (
                              <Chip label={`${meal.protein}g protein`} size="small" />
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(meal)}
                            >
                              <Edit />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => deleteMealMutation.mutate(meal.id)}
                            >
                              <Delete />
                            </IconButton>
                          </Box>
                        </Paper>
                      ))
                    ) : (
                      <Typography color="text.secondary">No meals logged</Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Nutritional Summary Tab */}
      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Daily Nutritional Summary
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(dailyLimits).map(([nutrient, limit]) => {
                  const value = dailyTotals[nutrient] || 0;
                  const percentage = (value / limit.max) * 100;
                  const status = getNutrientStatus(value, limit);

                  return (
                    <Grid item xs={12} md={6} key={nutrient}>
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                            {nutrient.replace(/([A-Z])/g, ' $1').trim()}
                          </Typography>
                          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ mr: 1 }}>
                              {value} / {limit.max}
                            </Typography>
                            <Box sx={{ color: `${status.color}.main` }}>
                              {status.icon}
                            </Box>
                          </Box>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(percentage, 100)}
                          sx={{
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: 'grey.300',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: `${status.color}.main`,
                            },
                          }}
                        />
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Compliance Tab */}
      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Dietary Compliance
              </Typography>
              {compliance?.data ? (
                <Box>
                  <Typography variant="h2" sx={{ mb: 2 }}>
                    {Math.round((compliance.data.compliant / compliance.data.total) * 100)}%
                  </Typography>
                  <Typography variant="body1">
                    {compliance.data.compliant} of {compliance.data.total} meals within dietary specifications
                  </Typography>
                  {isToday(selectedDate) && compliance.data.compliant < compliance.data.total && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      Some meals today exceeded recommended limits for sodium, cholesterol, or saturated fat.
                    </Alert>
                  )}
                </Box>
              ) : (
                <Typography color="text.secondary">No compliance data available</Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Meal Entry Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedMeal ? 'Edit Meal' : 'Log New Meal'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Meal Type</InputLabel>
                <Select
                  value={formData.mealType}
                  label="Meal Type"
                  onChange={(e) => setFormData({ ...formData, mealType: e.target.value as MealEntry['mealType'] })}
                >
                  <MenuItem value="breakfast">Breakfast</MenuItem>
                  <MenuItem value="lunch">Lunch</MenuItem>
                  <MenuItem value="dinner">Dinner</MenuItem>
                  <MenuItem value="snack">Snack</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Food Items"
                multiline
                rows={2}
                value={formData.foodItems}
                onChange={(e) => setFormData({ ...formData, foodItems: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Calories"
                type="number"
                value={formData.calories || ''}
                onChange={(e) => setFormData({ ...formData, calories: parseInt(e.target.value) || undefined })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Protein"
                type="number"
                value={formData.protein || ''}
                onChange={(e) => setFormData({ ...formData, protein: parseFloat(e.target.value) || undefined })}
                InputProps={{
                  endAdornment: <InputAdornment position="end">g</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Sodium"
                type="number"
                value={formData.sodium || ''}
                onChange={(e) => setFormData({ ...formData, sodium: parseInt(e.target.value) || undefined })}
                InputProps={{
                  endAdornment: <InputAdornment position="end">mg</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Cholesterol"
                type="number"
                value={formData.cholesterol || ''}
                onChange={(e) => setFormData({ ...formData, cholesterol: parseInt(e.target.value) || undefined })}
                InputProps={{
                  endAdornment: <InputAdornment position="end">mg</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={2}
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSaveMeal}
            variant="contained"
            disabled={!formData.foodItems}
          >
            {selectedMeal ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}