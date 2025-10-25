import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  IconButton,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
  Alert,
  Collapse,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  Restaurant,
  Add,
  Remove,
  LocalDining,
  EmojiFoodBeverage,
  FastfoodOutlined,
  LunchDining,
  DinnerDining,
  BreakfastDining,
  CheckCircle,
  Warning,
  Error,
  TrendingUp,
  LocalFireDepartment,
  Grain,
  WaterDrop,
  Speed,
  Save,
  Clear,
  History,
  Favorite,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useHeartbeatTheme } from '../theme/HeartbeatThemeProvider';

interface MealData {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  calories: number;
  sodium: number;
  fat: number;
  carbs?: number;
  protein?: number;
  fiber?: number;
  sugar?: number;
  time?: Date;
  notes?: string;
  imageUrl?: string;
}

interface MealPreset {
  id: string;
  name: string;
  icon: React.ReactNode;
  data: Partial<MealData>;
  category: string;
}

interface NutritionLimits {
  calories: { min: number; max: number; target: number };
  sodium: { max: number; warning: number };
  fat: { max: number; warning: number };
  carbs: { min: number; max: number; target: number };
  protein: { min: number; target: number };
}

interface MealQuickAddProps {
  onAdd: (meal: MealData) => Promise<void>;
  onCancel?: () => void;
  limits?: NutritionLimits;
  recentMeals?: MealPreset[];
  favoriteMeals?: MealPreset[];
  todayTotals?: Partial<MealData>;
  compact?: boolean;
}

const defaultLimits: NutritionLimits = {
  calories: { min: 1800, max: 2200, target: 2000 },
  sodium: { max: 2000, warning: 1500 },
  fat: { max: 65, warning: 50 },
  carbs: { min: 225, max: 325, target: 275 },
  protein: { min: 50, target: 75 },
};

const commonPresets: MealPreset[] = [
  {
    id: 'oatmeal',
    name: 'Oatmeal with Berries',
    icon: <BreakfastDining />,
    data: { calories: 280, sodium: 120, fat: 6, carbs: 48, protein: 8, fiber: 6 },
    category: 'breakfast',
  },
  {
    id: 'chicken-salad',
    name: 'Grilled Chicken Salad',
    icon: <LunchDining />,
    data: { calories: 350, sodium: 480, fat: 12, carbs: 25, protein: 35, fiber: 8 },
    category: 'lunch',
  },
  {
    id: 'salmon-veg',
    name: 'Salmon with Vegetables',
    icon: <DinnerDining />,
    data: { calories: 420, sodium: 380, fat: 18, carbs: 30, protein: 38, fiber: 7 },
    category: 'dinner',
  },
  {
    id: 'yogurt',
    name: 'Greek Yogurt',
    icon: <EmojiFoodBeverage />,
    data: { calories: 150, sodium: 65, fat: 4, carbs: 12, protein: 15 },
    category: 'snack',
  },
  {
    id: 'apple-pb',
    name: 'Apple with Peanut Butter',
    icon: <FastfoodOutlined />,
    data: { calories: 195, sodium: 75, fat: 8, carbs: 28, protein: 5, fiber: 5 },
    category: 'snack',
  },
];

const MealQuickAdd: React.FC<MealQuickAddProps> = ({
  onAdd,
  onCancel,
  limits = defaultLimits,
  recentMeals = [],
  favoriteMeals = [],
  todayTotals = {},
  compact = false,
}) => {
  const theme = useHeartbeatTheme();
  const [mealType, setMealType] = useState<MealData['type']>('breakfast');
  const [meal, setMeal] = useState<Partial<MealData>>({
    name: '',
    calories: 0,
    sodium: 0,
    fat: 0,
    carbs: 0,
    protein: 0,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPresets, setShowPresets] = useState(true);

  const handlePresetClick = (preset: MealPreset) => {
    setMeal({
      ...meal,
      ...preset.data,
      name: preset.name,
    });
    setMealType(preset.category as MealData['type'] || 'snack');
    setShowPresets(false);
    setShowAdvanced(true);
  };

  const calculateCompliance = () => {
    const warnings = [];
    const errors = [];

    // Sodium check
    if (meal.sodium && meal.sodium > limits.sodium.max) {
      errors.push(`Sodium exceeds limit (${meal.sodium}mg > ${limits.sodium.max}mg)`);
    } else if (meal.sodium && meal.sodium > limits.sodium.warning) {
      warnings.push(`Sodium approaching limit (${meal.sodium}mg)`);
    }

    // Fat check
    if (meal.fat && meal.fat > limits.fat.max) {
      errors.push(`Fat exceeds limit (${meal.fat}g > ${limits.fat.max}g)`);
    } else if (meal.fat && meal.fat > limits.fat.warning) {
      warnings.push(`Fat approaching limit (${meal.fat}g)`);
    }

    // Daily totals check (if provided)
    if (todayTotals) {
      const totalCalories = (todayTotals.calories || 0) + (meal.calories || 0);
      const totalSodium = (todayTotals.sodium || 0) + (meal.sodium || 0);

      if (totalCalories > limits.calories.max) {
        warnings.push(`Daily calories will exceed limit (${totalCalories})`);
      }
      if (totalSodium > limits.sodium.max) {
        errors.push(`Daily sodium will exceed limit (${totalSodium}mg)`);
      }
    }

    return { warnings, errors };
  };

  const handleSubmit = async () => {
    const validationErrors: Record<string, string> = {};

    if (!meal.name?.trim()) {
      validationErrors.name = 'Meal name is required';
    }
    if (!meal.calories || meal.calories <= 0) {
      validationErrors.calories = 'Calories must be greater than 0';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await onAdd({
        type: mealType,
        name: meal.name!,
        calories: meal.calories!,
        sodium: meal.sodium || 0,
        fat: meal.fat || 0,
        carbs: meal.carbs,
        protein: meal.protein,
        fiber: meal.fiber,
        sugar: meal.sugar,
        time: new Date(),
        notes: meal.notes,
      });

      // Reset form
      setMeal({
        name: '',
        calories: 0,
        sodium: 0,
        fat: 0,
        carbs: 0,
        protein: 0,
      });
      setShowAdvanced(false);
      setShowPresets(true);
    } finally {
      setLoading(false);
    }
  };

  const { warnings, errors: complianceErrors } = calculateCompliance();
  const isCompliant = complianceErrors.length === 0;

  const mealTypeIcons = {
    breakfast: <BreakfastDining />,
    lunch: <LunchDining />,
    dinner: <DinnerDining />,
    snack: <FastfoodOutlined />,
  };

  if (compact) {
    return (
      <Paper
        elevation={2}
        sx={{
          p: 2,
          borderRadius: theme.borderRadius,
          background: theme.colors.panel,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Restaurant color="primary" />
          <Typography variant="h6" fontWeight="bold">
            Quick Add Meal
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <ToggleButtonGroup
              value={mealType}
              exclusive
              onChange={(_, value) => value && setMealType(value)}
              fullWidth
              size="small"
            >
              {Object.entries(mealTypeIcons).map(([type, icon]) => (
                <ToggleButton key={type} value={type}>
                  {icon}
                  <Typography variant="caption" sx={{ ml: 0.5 }}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Typography>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="Meal name"
              value={meal.name || ''}
              onChange={(e) => setMeal({ ...meal, name: e.target.value })}
              error={!!errors.name}
              helperText={errors.name}
            />
          </Grid>

          <Grid item xs={4}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Calories"
              value={meal.calories || ''}
              onChange={(e) => setMeal({ ...meal, calories: Number(e.target.value) })}
              InputProps={{
                endAdornment: <LocalFireDepartment fontSize="small" color="action" />,
              }}
            />
          </Grid>

          <Grid item xs={4}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Sodium"
              value={meal.sodium || ''}
              onChange={(e) => setMeal({ ...meal, sodium: Number(e.target.value) })}
              InputProps={{
                endAdornment: <Typography variant="caption">mg</Typography>,
              }}
            />
          </Grid>

          <Grid item xs={4}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Fat"
              value={meal.fat || ''}
              onChange={(e) => setMeal({ ...meal, fat: Number(e.target.value) })}
              InputProps={{
                endAdornment: <Typography variant="caption">g</Typography>,
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Save />}
                onClick={handleSubmit}
                disabled={loading}
              >
                Add Meal
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        borderRadius: theme.borderRadius,
        background: theme.colors.panel,
        backdropFilter: 'blur(10px)',
        maxWidth: 800,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Restaurant sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" fontWeight="bold" color={theme.colors.heading}>
              Quick Add Meal
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {format(new Date(), 'EEEE, MMMM d')}
            </Typography>
          </Box>
        </Box>
        {onCancel && (
          <IconButton onClick={onCancel}>
            <Clear />
          </IconButton>
        )}
      </Box>

      {/* Meal Type Selection */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          MEAL TYPE
        </Typography>
        <ToggleButtonGroup
          value={mealType}
          exclusive
          onChange={(_, value) => value && setMealType(value)}
          fullWidth
        >
          {Object.entries(mealTypeIcons).map(([type, icon]) => (
            <ToggleButton key={type} value={type}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {icon}
                <Typography>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Typography>
              </Box>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Preset Options */}
      {showPresets && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              QUICK SELECTIONS
            </Typography>
            <Grid container spacing={1}>
              {commonPresets
                .filter(p => !mealType || p.category === mealType || p.category === 'snack')
                .map(preset => (
                  <Grid item xs={6} sm={4} key={preset.id}>
                    <Button
                      fullWidth
                      variant="outlined"
                      sx={{
                        py: 1.5,
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                      }}
                      onClick={() => handlePresetClick(preset)}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          {preset.icon}
                          <Typography variant="body2" fontWeight="medium">
                            {preset.name}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip
                            label={`${preset.data.calories}cal`}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            label={`${preset.data.sodium}mg Na`}
                            size="small"
                            variant="outlined"
                            color={preset.data.sodium! > limits.sodium.warning ? 'warning' : 'default'}
                          />
                        </Box>
                      </Box>
                    </Button>
                  </Grid>
                ))}
            </Grid>

            {(recentMeals.length > 0 || favoriteMeals.length > 0) && (
              <Box sx={{ mt: 2 }}>
                <Button
                  startIcon={showAdvanced ? <Remove /> : <Add />}
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? 'Hide' : 'Show'} Recent & Favorites
                </Button>
              </Box>
            )}
          </Box>
        </>
      )}

      {/* Manual Entry Form */}
      <Collapse in={!showPresets || showAdvanced}>
        <Divider sx={{ my: 2 }} />
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            NUTRITION DETAILS
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Meal Name"
                value={meal.name || ''}
                onChange={(e) => setMeal({ ...meal, name: e.target.value })}
                error={!!errors.name}
                helperText={errors.name}
                required
                InputProps={{
                  startAdornment: <LocalDining sx={{ mr: 1, color: 'action.active' }} />,
                }}
              />
            </Grid>

            {/* Main Nutrients */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Calories"
                value={meal.calories || ''}
                onChange={(e) => setMeal({ ...meal, calories: Number(e.target.value) })}
                error={!!errors.calories}
                helperText={errors.calories}
                required
                InputProps={{
                  startAdornment: <LocalFireDepartment sx={{ mr: 1, color: '#ff9800' }} />,
                  endAdornment: <Typography variant="caption">kcal</Typography>,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Sodium"
                value={meal.sodium || ''}
                onChange={(e) => setMeal({ ...meal, sodium: Number(e.target.value) })}
                InputProps={{
                  startAdornment: <WaterDrop sx={{ mr: 1, color: '#2196f3' }} />,
                  endAdornment: <Typography variant="caption">mg</Typography>,
                }}
                color={meal.sodium && meal.sodium > limits.sodium.warning ? 'warning' : undefined}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Fat"
                value={meal.fat || ''}
                onChange={(e) => setMeal({ ...meal, fat: Number(e.target.value) })}
                InputProps={{
                  endAdornment: <Typography variant="caption">g</Typography>,
                }}
                color={meal.fat && meal.fat > limits.fat.warning ? 'warning' : undefined}
              />
            </Grid>

            {/* Additional Nutrients */}
            <Grid item xs={12}>
              <Button
                size="small"
                startIcon={showAdvanced ? <Remove /> : <Add />}
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? 'Hide' : 'Show'} Additional Nutrients
              </Button>
            </Grid>

            <Collapse in={showAdvanced} sx={{ width: '100%' }}>
              <Grid container spacing={2} sx={{ mt: 0 }}>
                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Carbs"
                    value={meal.carbs || ''}
                    onChange={(e) => setMeal({ ...meal, carbs: Number(e.target.value) })}
                    InputProps={{
                      endAdornment: <Typography variant="caption">g</Typography>,
                    }}
                  />
                </Grid>

                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Protein"
                    value={meal.protein || ''}
                    onChange={(e) => setMeal({ ...meal, protein: Number(e.target.value) })}
                    InputProps={{
                      endAdornment: <Typography variant="caption">g</Typography>,
                    }}
                  />
                </Grid>

                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Fiber"
                    value={meal.fiber || ''}
                    onChange={(e) => setMeal({ ...meal, fiber: Number(e.target.value) })}
                    InputProps={{
                      endAdornment: <Typography variant="caption">g</Typography>,
                    }}
                  />
                </Grid>

                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Sugar"
                    value={meal.sugar || ''}
                    onChange={(e) => setMeal({ ...meal, sugar: Number(e.target.value) })}
                    InputProps={{
                      endAdornment: <Typography variant="caption">g</Typography>,
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Notes (optional)"
                    value={meal.notes || ''}
                    onChange={(e) => setMeal({ ...meal, notes: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Collapse>
          </Grid>
        </Box>
      </Collapse>

      {/* Compliance Alerts */}
      {(complianceErrors.length > 0 || warnings.length > 0) && (
        <Box sx={{ mt: 2 }}>
          {complianceErrors.map((error, idx) => (
            <Alert key={idx} severity="error" sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Error fontSize="small" />
                {error}
              </Box>
            </Alert>
          ))}
          {warnings.map((warning, idx) => (
            <Alert key={idx} severity="warning" sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Warning fontSize="small" />
                {warning}
              </Box>
            </Alert>
          ))}
        </Box>
      )}

      {/* Daily Progress */}
      {todayTotals && todayTotals.calories && (
        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            TODAY'S PROGRESS
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Calories
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, ((todayTotals.calories + (meal.calories || 0)) / limits.calories.target) * 100)}
                  sx={{ my: 0.5, height: 8, borderRadius: 1 }}
                />
                <Typography variant="caption">
                  {todayTotals.calories + (meal.calories || 0)} / {limits.calories.target}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Sodium
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, ((todayTotals.sodium || 0) + (meal.sodium || 0)) / limits.sodium.max) * 100)}
                  color={(todayTotals.sodium || 0) + (meal.sodium || 0) > limits.sodium.warning ? 'warning' : 'primary'}
                  sx={{ my: 0.5, height: 8, borderRadius: 1 }}
                />
                <Typography variant="caption">
                  {(todayTotals.sodium || 0) + (meal.sodium || 0)}mg / {limits.sodium.max}mg
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Fat
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, ((todayTotals.fat || 0) + (meal.fat || 0)) / limits.fat.max) * 100)}
                  color={(todayTotals.fat || 0) + (meal.fat || 0) > limits.fat.warning ? 'warning' : 'primary'}
                  sx={{ my: 0.5, height: 8, borderRadius: 1 }}
                />
                <Typography variant="caption">
                  {(todayTotals.fat || 0) + (meal.fat || 0)}g / {limits.fat.max}g
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Action Buttons */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        {showPresets && (
          <Button
            variant="outlined"
            onClick={() => setShowPresets(false)}
          >
            Manual Entry
          </Button>
        )}
        {!showPresets && (
          <Button
            variant="outlined"
            onClick={() => {
              setShowPresets(true);
              setShowAdvanced(false);
            }}
          >
            Back to Presets
          </Button>
        )}
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <Save />}
          onClick={handleSubmit}
          disabled={loading || !meal.name || !meal.calories}
          sx={{
            bgcolor: isCompliant ? 'success.main' : 'warning.main',
            '&:hover': {
              bgcolor: isCompliant ? 'success.dark' : 'warning.dark',
            },
          }}
        >
          {loading ? 'Adding...' : 'Add Meal'}
        </Button>
      </Box>
    </Paper>
  );
};

export default MealQuickAdd;