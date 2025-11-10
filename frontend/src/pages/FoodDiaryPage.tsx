import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/ui';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Copy, Plus, Edit, Trash2, Calculator } from 'lucide-react';
import { api } from '../services/api';
import { MealEntry } from '../types';
import { AddToMealDialog } from '../components/AddToMealDialog';
import { FoodAutocomplete } from '../components/FoodAutocomplete';
import { parseAndLookupNutrition } from '../data/nutritionDatabase';

/**
 * FoodDiaryPage - Daily/Weekly/Monthly Nutrition Tracking
 *
 * PURPOSE:
 * This page allows heart recovery patients to log completed meals and track their
 * cumulative nutrition intake over different time periods (daily, weekly, monthly).
 *
 * KEY FEATURES:
 * 1. VIEW PERIOD TOGGLE - Switch between daily/weekly/monthly views
 *    - Daily: Shows meals for a single day (00:00 - 23:59)
 *    - Weekly: Shows meals for the current week (Sunday-Saturday)
 *    - Monthly: Shows meals for the entire month
 *
 * 2. AUTO-NUTRITION CALCULATION - Uses nutritionDatabase.ts
 *    - parseAndLookupNutrition() searches 150+ foods/beverages
 *    - Serving size multiplier for portion control
 *    - Smart matching: "Grilled Chicken" matches "Grilled Chicken Breast"
 *
 * 3. DATE FILTERING - Proper backend integration
 *    - getDateRange() calculates startDate/endDate based on view period
 *    - Sends ?startDate=X&endDate=Y to backend getMeals endpoint
 *    - Backend normalizes to full day ranges (see mealController.ts)
 *
 * 4. SCALED NUTRITIONAL GOALS
 *    - Daily view: Shows standard daily limits (2000 cal, 2300mg sodium, etc.)
 *    - Weekly view: Multiplies limits by 7
 *    - Monthly view: Multiplies limits by 30
 *
 * 5. GLASSMORPHIC MODAL - Ultra-modern futuristic design
 *    - Dark gradients with glowing blue borders
 *    - Orbitron/Rajdhani fonts for sci-fi aesthetic
 *    - Backdrop blur and transparency effects
 *    - Matches VitalsPage design language
 *
 * DATA FLOW:
 * - Reads from meal_entries table (backend)
 * - Shows only meals with status='completed' (logged meals, not planned)
 * - Nutrition totals calculated in real-time from filtered meals
 * - No caching - always fresh data from database
 *
 * IMPORTANT FUNCTIONS:
 * - getDateRange(): Calculates start/end dates based on view period
 * - calculateNutrition(): Auto-populates nutrition from food database
 * - getGoals(): Scales daily nutritional limits based on view period
 * - loadMeals(): Fetches meals with proper date filtering
 */
export function FoodDiaryPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyToDate, setCopyToDate] = useState('');
  const [currentMealType, setCurrentMealType] = useState<string>('breakfast');
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null);
  const [viewPeriod, setViewPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Form state for adding meals
  const [newMeal, setNewMeal] = useState({
    foodItems: '',
    time: new Date().toTimeString().slice(0, 5),
    calories: '',
    sodium: '',
    protein: '',
    carbs: '',
    fat: '',
    fiber: '',
    sugar: '',
    notes: '',
    isUnhealthy: false,
    satisfactionRating: 0, // NEW: 0 = not rated, 1-5 = star rating
  });
  const [servings, setServings] = useState(1);
  const [nutritionLookupMessage, setNutritionLookupMessage] = useState('');
  const [validationWarning, setValidationWarning] = useState('');

  /**
   * Validate Nutrition Input Values
   *
   * Prevents invalid nutrition data entry with smart validation:
   * - Blocks negative values (nutrition can't be negative)
   * - Warns on unrealistic values (helps catch typos)
   * - Allows empty strings (optional fields)
   *
   * VALIDATION THRESHOLDS (per meal):
   * - Calories: max 5000 (very large meal, but possible)
   * - Sodium: max 10000mg (extremely high but possible for very salty foods)
   * - Protein: max 200g (very high but achievable with protein shakes)
   * - Carbs: max 500g (high but possible with large pasta/rice dishes)
   * - Fat: max 300g (very high but possible with fried foods)
   * - Fiber: max 50g (high but achievable with fiber supplements)
   * - Sugar: max 300g (very high but possible with desserts/drinks)
   *
   * @returns validated value or empty string if invalid
   */
  const validateNutritionInput = (value: string, fieldName: string, maxThreshold: number): string => {
    // Allow empty string (optional field)
    if (value === '') return '';

    const numValue = parseFloat(value);

    // Prevent negative values
    if (numValue < 0) {
      setValidationWarning(`${fieldName} cannot be negative`);
      setTimeout(() => setValidationWarning(''), 3000);
      return '';
    }

    // Warn on unrealistic values
    if (numValue > maxThreshold) {
      setValidationWarning(`⚠️ ${fieldName} value (${Math.round(numValue)}) seems unusually high. Please double-check.`);
      setTimeout(() => setValidationWarning(''), 5000);
    }

    return value;
  };

  /**
   * Auto-Calculate Nutrition from Food Items
   *
   * Searches the nutrition database (150+ foods) for matches and auto-populates
   * the nutrition fields. Uses serving size multiplier for portion control.
   *
   * MATCHING LOGIC (see nutritionDatabase.ts):
   * - Case-insensitive partial matching
   * - "Chicken" matches "Grilled Chicken Breast", "Chicken Salad", etc.
   * - Multiple foods: "Chicken, Rice, Broccoli" → sums all nutrition
   *
   * USER FEEDBACK:
   * - Shows count of found vs unknown items
   * - Message auto-clears after 5 seconds
   * - Does NOT prevent saving if items unknown (manual entry allowed)
   */
  const calculateNutrition = () => {
    if (!newMeal.foodItems.trim()) {
      setNutritionLookupMessage('Please enter food items first');
      return;
    }

    const result = parseAndLookupNutrition(newMeal.foodItems);
    const multiplier = servings;

    setNewMeal({
      ...newMeal,
      calories: String(Math.round(result.totalNutrition.calories * multiplier)),
      sodium: String(Math.round(result.totalNutrition.sodium * multiplier)),
      protein: String(Math.round(result.totalNutrition.protein * multiplier)),
      carbs: String(Math.round(result.totalNutrition.carbs * multiplier)),
      fat: String(Math.round(result.totalNutrition.fat * multiplier)),
      fiber: String(Math.round(result.totalNutrition.fiber * multiplier)),
      sugar: String(Math.round(result.totalNutrition.sugar * multiplier)),
      isUnhealthy: !result.totalNutrition.isHealthy,
    });

    if (result.foundItems.length > 0) {
      setNutritionLookupMessage(
        `✓ Found ${result.foundItems.length} item(s)${
          result.unknownItems.length > 0
            ? ` • ${result.unknownItems.length} unknown: ${result.unknownItems.join(', ')}`
            : ''
        }`
      );
    } else {
      setNutritionLookupMessage('⚠️ No matching foods found in database');
    }

    // Clear message after 5 seconds
    setTimeout(() => setNutritionLookupMessage(''), 5000);
  };

  useEffect(() => {
    loadMeals();
  }, [selectedDate, viewPeriod]);

  /**
   * Calculate Date Range Based on View Period
   *
   * Converts selectedDate + viewPeriod into startDate/endDate for API calls.
   * These parameters are sent to backend getMeals endpoint which handles the
   * actual database filtering.
   *
   * DAILY VIEW:
   * - Returns same date for start and end
   * - Example: 2025-01-10 → { startDate: '2025-01-10', endDate: '2025-01-10' }
   *
   * WEEKLY VIEW:
   * - Calculates Sunday (start) to Saturday (end) of current week
   * - Example: If selected date is Wed 2025-01-15
   *   → { startDate: '2025-01-12' (Sun), endDate: '2025-01-18' (Sat) }
   *
   * MONTHLY VIEW:
   * - First day to last day of selected month
   * - Example: Selected 2025-01-15 → { startDate: '2025-01-01', endDate: '2025-01-31' }
   *
   * IMPORTANT: Backend normalizes these to full day ranges (00:00:00 - 23:59:59)
   */
  const getDateRange = () => {
    const date = new Date(selectedDate);

    if (viewPeriod === 'daily') {
      return { startDate: selectedDate, endDate: selectedDate };
    } else if (viewPeriod === 'weekly') {
      // Get the start of the week (Sunday)
      const dayOfWeek = date.getDay();
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - dayOfWeek);

      // Get the end of the week (Saturday)
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      return {
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0]
      };
    } else {
      // Monthly view
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      return {
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: endOfMonth.toISOString().split('T')[0]
      };
    }
  };

  const loadMeals = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange();
      const data = await api.getMeals({ startDate, endDate });
      setMeals(data);
    } catch (error) {
      console.error('Error loading meals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousDay = () => {
    const date = new Date(selectedDate);
    if (viewPeriod === 'daily') {
      date.setDate(date.getDate() - 1);
    } else if (viewPeriod === 'weekly') {
      date.setDate(date.getDate() - 7);
    } else {
      date.setMonth(date.getMonth() - 1);
    }
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const date = new Date(selectedDate);
    if (viewPeriod === 'daily') {
      date.setDate(date.getDate() + 1);
    } else if (viewPeriod === 'weekly') {
      date.setDate(date.getDate() + 7);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleCopyToDay = async () => {
    if (!copyToDate || meals.length === 0) return;

    try {
      setLoading(true);

      // Copy each meal to the new date
      for (const meal of meals) {
        const mealTime = new Date(meal.timestamp).toTimeString().split(' ')[0];
        const newTimestamp = `${copyToDate}T${mealTime}`;

        await api.createMeal({
          timestamp: newTimestamp,
          mealType: meal.mealType,
          foodItems: meal.foodItems,
          calories: meal.calories,
          sodium: meal.sodium,
          cholesterol: meal.cholesterol,
          saturatedFat: meal.saturatedFat,
          totalFat: meal.totalFat,
          fiber: meal.fiber,
          sugar: meal.sugar,
          protein: meal.protein,
          carbohydrates: meal.carbohydrates,
          withinSpec: meal.withinSpec,
          notes: meal.notes ? `${meal.notes} (Copied from ${selectedDate})` : `Copied from ${selectedDate}`,
        });
      }

      alert(`Successfully copied ${meals.length} meal(s) to ${copyToDate}!`);
      setShowCopyDialog(false);
      setCopyToDate('');
    } catch (error: any) {
      console.error('Error copying meals:', error);
      alert('Failed to copy meals: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMeal = async () => {
    if (!newMeal.foodItems.trim()) {
      alert('Please enter a food item name');
      return;
    }

    try {
      setLoading(true);

      const timestamp = `${selectedDate}T${newMeal.time}:00`;

      await api.createMeal({
        timestamp,
        mealType: currentMealType,
        foodItems: newMeal.foodItems + (newMeal.isUnhealthy ? ' ⚠️' : ''),
        calories: newMeal.calories ? Number(newMeal.calories) : undefined,
        sodium: newMeal.sodium ? Number(newMeal.sodium) : undefined,
        protein: newMeal.protein ? Number(newMeal.protein) : undefined,
        carbohydrates: newMeal.carbs ? Number(newMeal.carbs) : undefined,
        totalFat: newMeal.fat ? Number(newMeal.fat) : undefined,
        fiber: newMeal.fiber ? Number(newMeal.fiber) : undefined,
        sugar: newMeal.sugar ? Number(newMeal.sugar) : undefined,
        notes: newMeal.notes || undefined,
        satisfactionRating: newMeal.satisfactionRating > 0 ? newMeal.satisfactionRating : undefined, // NEW
      });

      // Reset form
      setNewMeal({
        foodItems: '',
        time: new Date().toTimeString().slice(0, 5),
        calories: '',
        sodium: '',
        protein: '',
        carbs: '',
        fat: '',
        fiber: '',
        sugar: '',
        notes: '',
        isUnhealthy: false,
        satisfactionRating: 0,
      });
      setServings(1);
      setNutritionLookupMessage('');

      setShowAddDialog(false);
      loadMeals(); // Refresh the meal list
      alert('Meal added successfully!');
    } catch (error: any) {
      console.error('Error adding meal:', error);
      alert('Failed to add meal: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (meal: MealEntry) => {
    // Populate form with meal data
    const time = new Date(meal.timestamp).toTimeString().slice(0, 5);
    const foodName = meal.foodItems.replace(' ⚠️', '');
    const isUnhealthy = meal.foodItems.includes('⚠️');

    setNewMeal({
      foodItems: foodName,
      time,
      calories: meal.calories?.toString() || '',
      sodium: meal.sodium?.toString() || '',
      protein: meal.protein?.toString() || '',
      carbs: meal.carbohydrates?.toString() || '',
      fat: meal.totalFat?.toString() || '',
      fiber: meal.fiber?.toString() || '',
      sugar: meal.sugar?.toString() || '',
      notes: meal.notes || '',
      isUnhealthy,
      satisfactionRating: meal.satisfactionRating || 0, // NEW
    });

    setEditingMeal(meal);
    setCurrentMealType(meal.mealType);
    setShowAddDialog(true);
  };

  const handleUpdateMeal = async () => {
    if (!editingMeal || !newMeal.foodItems.trim()) {
      alert('Please enter a food item name');
      return;
    }

    try {
      setLoading(true);

      const timestamp = `${selectedDate}T${newMeal.time}:00`;

      await api.updateMeal(editingMeal.id, {
        timestamp,
        mealType: currentMealType,
        foodItems: newMeal.foodItems + (newMeal.isUnhealthy ? ' ⚠️' : ''),
        calories: newMeal.calories ? Number(newMeal.calories) : undefined,
        sodium: newMeal.sodium ? Number(newMeal.sodium) : undefined,
        protein: newMeal.protein ? Number(newMeal.protein) : undefined,
        carbohydrates: newMeal.carbs ? Number(newMeal.carbs) : undefined,
        totalFat: newMeal.fat ? Number(newMeal.fat) : undefined,
        fiber: newMeal.fiber ? Number(newMeal.fiber) : undefined,
        sugar: newMeal.sugar ? Number(newMeal.sugar) : undefined,
        notes: newMeal.notes || undefined,
        satisfactionRating: newMeal.satisfactionRating > 0 ? newMeal.satisfactionRating : undefined, // NEW
      });

      // Reset form
      setNewMeal({
        foodItems: '',
        time: new Date().toTimeString().slice(0, 5),
        calories: '',
        sodium: '',
        protein: '',
        carbs: '',
        fat: '',
        fiber: '',
        sugar: '',
        notes: '',
        isUnhealthy: false,
        satisfactionRating: 0,
      });
      setServings(1);
      setNutritionLookupMessage('');

      setEditingMeal(null);
      setShowAddDialog(false);
      loadMeals(); // Refresh the meal list
      alert('Meal updated successfully!');
    } catch (error: any) {
      console.error('Error updating meal:', error);
      alert('Failed to update meal: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMeal = async (mealId: number) => {
    if (!confirm('Are you sure you want to delete this meal entry?')) {
      return;
    }

    try {
      setLoading(true);
      await api.deleteMeal(mealId);
      loadMeals(); // Refresh the meal list
      alert('Meal deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting meal:', error);
      alert('Failed to delete meal: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getMealsByType = (mealType: string) => {
    return meals.filter(m => m.mealType.toLowerCase() === mealType.toLowerCase());
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatDateRange = () => {
    const { startDate, endDate } = getDateRange();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (viewPeriod === 'daily') {
      return formatDate(selectedDate);
    } else if (viewPeriod === 'weekly') {
      return `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  const getTotalNutrition = () => {
    return meals.reduce((totals, meal) => ({
      calories: (totals.calories || 0) + (meal.calories || 0),
      sodium: (totals.sodium || 0) + (meal.sodium || 0),
      protein: (totals.protein || 0) + (meal.protein || 0),
      carbs: (totals.carbs || 0) + (meal.carbohydrates || 0),
      fat: (totals.fat || 0) + (meal.totalFat || 0),
      fiber: (totals.fiber || 0) + (meal.fiber || 0),
    }), { calories: 0, sodium: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  };

  const getGoals = () => {
    const multiplier = viewPeriod === 'daily' ? 1 : viewPeriod === 'weekly' ? 7 : 30;
    return {
      protein: 60 * multiplier, // 60g daily
      calories: 2000 * multiplier, // 2000 cal daily
      sodium: 2300 * multiplier, // 2300mg daily limit
      sodiumIdeal: 1500 * multiplier, // 1500mg ideal for heart patients
      fiberMin: 25 * multiplier, // 25g minimum daily
      fiberIdeal: 30 * multiplier, // 30g ideal daily
    };
  };

  const totals = getTotalNutrition();
  const goals = getGoals();

  const mealSections = [
    { type: 'breakfast', label: 'Breakfast', icon: '🍳' },
    { type: 'lunch', label: 'Lunch', icon: '🥗' },
    { type: 'dinner', label: 'Dinner', icon: '🍽️' },
    { type: 'snack', label: 'Snacks', icon: '🍿' },
    { type: 'beverage', label: 'Beverages', icon: '🥤' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold" style={{ color: '#ff9500' }}>Food Diary</h1>
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" style={{ color: '#ff9500' }} />
          <span className="text-sm font-bold" style={{ color: '#ff9500' }}>Daily Meal Tracker</span>
        </div>
      </div>

      {/* Date Navigator */}
      <GlassCard>
        <div className="flex items-center justify-between">
          <button
            onClick={handlePreviousDay}
            className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-6 w-6" style={{ color: '#ff9500', strokeWidth: 3 }} />
          </button>

          <div className="flex-1 text-center">
            <h2 className="text-2xl font-bold" style={{ color: '#ff9500' }}>{formatDateRange()}</h2>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cobalt-500 focus:border-cobalt-500 outline-none font-bold"
              style={{ color: '#ff9500' }}
            />
          </div>

          <button
            onClick={handleNextDay}
            className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
          >
            <ChevronRight className="h-6 w-6" style={{ color: '#ff9500', strokeWidth: 3 }} />
          </button>
        </div>

        {/* Period Toggle Tabs */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setViewPeriod('daily')}
            className={`px-6 py-2 font-bold rounded-lg transition-all ${
              viewPeriod === 'daily'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setViewPeriod('weekly')}
            className={`px-6 py-2 font-bold rounded-lg transition-all ${
              viewPeriod === 'weekly'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setViewPeriod('monthly')}
            className={`px-6 py-2 font-bold rounded-lg transition-all ${
              viewPeriod === 'monthly'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Monthly
          </button>
        </div>
      </GlassCard>

      {/* Daily Totals */}
      <GlassCard>
        <h3 className="text-lg font-bold text-bright mb-4" style={{ color: 'var(--ink-bright)' }}>
          {viewPeriod === 'daily' ? 'Daily' : viewPeriod === 'weekly' ? 'Weekly' : 'Monthly'} Totals
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-cobalt-600">{Math.round(totals.calories)}</div>
            <div className="text-sm font-bold text-gold" style={{ color: 'var(--ink-gold)' }}>Calories</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{Math.round(totals.protein)}g</div>
            <div className="text-sm font-bold text-gold" style={{ color: 'var(--ink-gold)' }}>Protein</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{Math.round(totals.carbs)}g</div>
            <div className="text-sm font-bold text-gold" style={{ color: 'var(--ink-gold)' }}>Carbs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{Math.round(totals.fat)}g</div>
            <div className="text-sm font-bold text-gold" style={{ color: 'var(--ink-gold)' }}>Fat</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{Math.round(totals.sodium)}mg</div>
            <div className="text-sm font-bold text-gold" style={{ color: 'var(--ink-gold)' }}>Sodium</div>
          </div>
          {/* NEW: Meals Logged Today */}
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{meals.length}</div>
            <div className="text-sm font-bold text-gold" style={{ color: 'var(--ink-gold)' }}>Meals Logged</div>
          </div>
          {/* NEW: Unhealthy Meals Count */}
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {meals.filter(m => m.foodItems.includes('⚠️')).length}
            </div>
            <div className="text-sm font-bold text-gold" style={{ color: 'var(--ink-gold)' }}>Unhealthy</div>
          </div>
          {/* NEW: Average Satisfaction */}
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-500">
              {(() => {
                const ratedMeals = meals.filter(m => m.satisfactionRating);
                if (ratedMeals.length === 0) return '--';
                const avg = ratedMeals.reduce((sum, m) => sum + (m.satisfactionRating || 0), 0) / ratedMeals.length;
                return avg.toFixed(1);
              })()}⭐
            </div>
            <div className="text-sm font-bold text-gold" style={{ color: 'var(--ink-gold)' }}>Avg Rating</div>
          </div>
        </div>
      </GlassCard>

      {/* NEW: Fiber Intake Card */}
      <GlassCard>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--muted)' }}>Total Fiber Intake</p>
            <p className="text-3xl font-bold" style={{ color: '#22c55e' }}>{Math.round(totals.fiber)}g</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
              Recommended: {goals.fiberMin}-{goals.fiberIdeal}g {viewPeriod}
            </p>
          </div>
          <div className={`text-xs font-bold px-4 py-2 rounded-full ${
            Math.round(totals.fiber) >= goals.fiberMin ? 'bg-green-500 text-white' :
            Math.round(totals.fiber) >= goals.fiberMin * 0.6 ? 'bg-yellow-500 text-black' :
            'bg-red-500 text-white'
          }`}>
            {Math.round(totals.fiber) >= goals.fiberMin ? '✓ Great!' :
             Math.round(totals.fiber) >= goals.fiberMin * 0.6 ? 'Good' :
             'Low'}
          </div>
        </div>
      </GlassCard>

      {/* NEW: Protein Goal Achievement */}
      <GlassCard>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-bold mb-2" style={{ color: 'var(--muted)' }}>Protein Goal Achievement</p>
            <div className="w-full bg-gray-700 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all ${(() => {
                  const percentage = (totals.protein / goals.protein) * 100;
                  if (percentage >= 100) return 'bg-green-500';
                  if (percentage >= 75) return 'bg-yellow-500';
                  return 'bg-red-500';
                })()}`}
                style={{ width: `${Math.min((totals.protein / goals.protein) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
              Goal: {goals.protein}g {viewPeriod} for heart health
            </p>
          </div>
          <div className="ml-4 text-right">
            <p className="text-3xl font-bold" style={{ color: (() => {
              const percentage = (totals.protein / goals.protein) * 100;
              if (percentage >= 100) return '#22c55e';
              if (percentage >= 75) return '#eab308';
              return '#ef4444';
            })() }}>
              {Math.round((totals.protein / goals.protein) * 100)}%
            </p>
            <p className={`text-xs font-bold px-3 py-1 rounded-full mt-1 ${(() => {
              const percentage = (totals.protein / goals.protein) * 100;
              if (percentage >= 100) return 'bg-green-500 text-white';
              if (percentage >= 75) return 'bg-yellow-500 text-black';
              return 'bg-red-500 text-white';
            })()}`}>
              {(() => {
                const percentage = (totals.protein / goals.protein) * 100;
                if (percentage >= 100) return 'Goal Met!';
                if (percentage >= 75) return 'Almost There';
                return 'Needs More';
              })()}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
              {Math.round(totals.protein)}g / {goals.protein}g
            </p>
          </div>
        </div>
      </GlassCard>

      {/* NEW: Calories vs Daily Goal */}
      <GlassCard>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-bold mb-2" style={{ color: 'var(--muted)' }}>Calories vs {viewPeriod === 'daily' ? 'Daily' : viewPeriod === 'weekly' ? 'Weekly' : 'Monthly'} Goal</p>
            <div className="w-full bg-gray-700 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all ${(() => {
                  const percentage = (totals.calories / goals.calories) * 100;
                  if (percentage >= 90 && percentage <= 110) return 'bg-green-500';
                  if (percentage >= 75 && percentage < 130) return 'bg-yellow-500';
                  return 'bg-red-500';
                })()}`}
                style={{ width: `${Math.min((totals.calories / goals.calories) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
              Target: {goals.calories} calories {viewPeriod}
            </p>
          </div>
          <div className="ml-4 text-right">
            <p className="text-3xl font-bold" style={{ color: (() => {
              const percentage = (totals.calories / goals.calories) * 100;
              if (percentage >= 90 && percentage <= 110) return '#22c55e';
              if (percentage >= 75 && percentage < 130) return '#eab308';
              return '#ef4444';
            })() }}>
              {Math.round(totals.calories)}
            </p>
            <p className={`text-xs font-bold px-3 py-1 rounded-full mt-1 ${(() => {
              const percentage = (totals.calories / goals.calories) * 100;
              if (percentage >= 90 && percentage <= 110) return 'bg-green-500 text-white';
              if (percentage >= 75 && percentage < 130) return 'bg-yellow-500 text-black';
              return 'bg-red-500 text-white';
            })()}`}>
              {(() => {
                const percentage = (totals.calories / goals.calories) * 100;
                if (percentage >= 90 && percentage <= 110) return 'On Target';
                if (percentage < 75) return 'Too Low';
                if (percentage >= 130) return 'Too High';
                return 'Close';
              })()}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
              {Math.round((totals.calories / goals.calories) * 100)}% of goal
            </p>
          </div>
        </div>
      </GlassCard>

      {/* NEW: Meals Within Spec */}
      {meals.length > 0 && (
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--muted)' }}>Meals Within Goals</p>
              <p className="text-3xl font-bold" style={{ color: '#3b82f6' }}>
                {(() => {
                  const withSpec = meals.filter(m => m.withinSpec !== null);
                  if (withSpec.length === 0) return '--';
                  const withinCount = withSpec.filter(m => m.withinSpec === true).length;
                  return Math.round((withinCount / withSpec.length) * 100);
                })()}%
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                {(() => {
                  const withSpec = meals.filter(m => m.withinSpec !== null);
                  const withinCount = withSpec.filter(m => m.withinSpec === true).length;
                  return `${withinCount} of ${withSpec.length} meals`;
                })()}
              </p>
            </div>
            <div className={`text-xs font-bold px-4 py-2 rounded-full ${(() => {
              const withSpec = meals.filter(m => m.withinSpec !== null);
              if (withSpec.length === 0) return 'bg-gray-500 text-white';
              const percentage = (withSpec.filter(m => m.withinSpec === true).length / withSpec.length) * 100;
              if (percentage >= 80) return 'bg-green-500 text-white';
              if (percentage >= 60) return 'bg-yellow-500 text-black';
              return 'bg-red-500 text-white';
            })()}`}>
              {(() => {
                const withSpec = meals.filter(m => m.withinSpec !== null);
                if (withSpec.length === 0) return 'No data';
                const percentage = (withSpec.filter(m => m.withinSpec === true).length / withSpec.length) * 100;
                if (percentage >= 80) return 'Excellent';
                if (percentage >= 60) return 'Good';
                return 'Needs work';
              })()}
            </div>
          </div>
        </GlassCard>
      )}

      {/* NEW: Sodium Intake vs Limit */}
      <GlassCard>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-bold mb-2" style={{ color: 'var(--muted)' }}>Sodium Intake vs {viewPeriod === 'daily' ? 'Daily' : viewPeriod === 'weekly' ? 'Weekly' : 'Monthly'} Limit</p>
            <div className="w-full bg-gray-700 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all ${
                  totals.sodium <= goals.sodiumIdeal ? 'bg-green-500' :
                  totals.sodium <= goals.sodium ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${Math.min((totals.sodium / goals.sodium) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
              Limit: {goals.sodium}mg {viewPeriod} ({goals.sodiumIdeal}mg ideal for heart patients)
            </p>
          </div>
          <div className="ml-4 text-right">
            <p className="text-3xl font-bold" style={{ color: totals.sodium <= goals.sodiumIdeal ? '#22c55e' : totals.sodium <= goals.sodium ? '#eab308' : '#ef4444' }}>
              {Math.round(totals.sodium)}mg
            </p>
            <p className={`text-xs font-bold px-3 py-1 rounded-full mt-1 ${
              totals.sodium <= goals.sodiumIdeal ? 'bg-green-500 text-white' :
              totals.sodium <= goals.sodium ? 'bg-yellow-500 text-black' :
              'bg-red-500 text-white'
            }`}>
              {totals.sodium <= goals.sodiumIdeal ? 'Excellent' :
               totals.sodium <= goals.sodium ? 'Within Limit' :
               'Over Limit'}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Meal Sections */}
      {mealSections.map(section => {
        const sectionMeals = getMealsByType(section.type);

        return (
          <GlassCard key={section.type}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: 'var(--ink-bright)' }}>
                <span className="mr-2">{section.icon}</span>
                {section.label}
              </h3>
              {viewPeriod === 'daily' && (
                <button
                  onClick={() => {
                    setEditingMeal(null);
                    setCurrentMealType(section.type);
                    setShowAddDialog(true);
                  }}
                  className="px-4 py-2 bg-cobalt-500 text-white font-bold rounded-lg hover:bg-cobalt-600 transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-8" style={{ color: 'var(--muted)' }}>Loading...</div>
            ) : sectionMeals.length === 0 ? (
              <div className="text-center py-8" style={{ color: 'var(--muted)' }}>
                No {section.label.toLowerCase()} recorded for this {viewPeriod === 'daily' ? 'day' : viewPeriod === 'weekly' ? 'week' : 'month'}
              </div>
            ) : (
              <div className="space-y-3">
                {sectionMeals.map((meal) => {
                  const isUnhealthy = meal.foodItems.includes('⚠️');
                  return (
                    <div
                      key={meal.id}
                      className="rounded-lg border-2 p-4"
                      style={{
                        backgroundColor: 'var(--card)',
                        borderColor: isUnhealthy ? 'var(--bad)' : 'var(--card-light)'
                      }}
                    >
                      {/* Red Warning Banner for Unhealthy Foods */}
                      {isUnhealthy && (
                        <div
                          className="mb-3 p-2 rounded-lg flex items-center gap-2"
                          style={{ backgroundColor: 'var(--bad)' }}
                        >
                          <span className="font-bold text-sm" style={{ color: 'white' }}>
                            🚨 UNHEALTHY FOOD - HEART PATIENT SHOULD AVOID
                          </span>
                        </div>
                      )}

                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div
                            className="font-bold"
                            style={{ color: isUnhealthy ? 'var(--bad)' : 'var(--ink)' }}
                          >
                            {meal.foodItems}
                          </div>
                          <div className="text-sm" style={{ color: 'var(--muted)' }}>
                            {new Date(meal.timestamp).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {meal.withinSpec !== null && (
                            <span
                              className="px-2 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: meal.withinSpec
                                  ? 'rgba(74, 222, 128, 0.2)'
                                  : 'rgba(248, 113, 113, 0.2)',
                                color: meal.withinSpec ? 'var(--good)' : 'var(--bad)'
                              }}
                            >
                              {meal.withinSpec ? '✓ Within Goals' : '⚠ Over Limit'}
                            </span>
                          )}
                          {viewPeriod === 'daily' && (
                            <>
                              <button
                                onClick={() => handleEditClick(meal)}
                                className="p-2 rounded-lg transition-colors hover:opacity-70"
                                style={{ backgroundColor: 'var(--card-light)' }}
                                title="Edit meal"
                              >
                                <Edit className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                              </button>
                              <button
                                onClick={() => handleDeleteMeal(meal.id)}
                                className="p-2 rounded-lg transition-colors hover:opacity-70"
                                style={{ backgroundColor: 'var(--card-light)' }}
                                title="Delete meal"
                              >
                                <Trash2 className="h-4 w-4" style={{ color: 'var(--bad)' }} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {viewPeriod !== 'daily' && (
                        <div className="text-xs font-semibold mb-2" style={{ color: 'var(--ink-gold)' }}>
                          {new Date(meal.timestamp).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      )}

                      <div
                        className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs mt-2"
                        style={{ color: 'var(--muted)' }}
                      >
                        {meal.calories !== null && <div>Cal: {Math.round(meal.calories)}</div>}
                        {meal.protein !== null && <div>Protein: {Math.round(meal.protein)}g</div>}
                        {meal.carbohydrates !== null && <div>Carbs: {Math.round(meal.carbohydrates)}g</div>}
                        {meal.totalFat !== null && <div>Fat: {Math.round(meal.totalFat)}g</div>}
                        {meal.sodium !== null && <div>Sodium: {Math.round(meal.sodium)}mg</div>}
                        {meal.fiber !== null && <div>Fiber: {Math.round(meal.fiber)}g</div>}
                        {meal.sugar !== null && <div>Sugar: {Math.round(meal.sugar)}g</div>}
                      </div>

                      {meal.notes && (
                        <div
                          className="mt-2 pt-2 border-t"
                          style={{ borderColor: 'var(--card-light)' }}
                        >
                          <p className="text-sm italic" style={{ color: 'var(--muted)' }}>
                            {meal.notes}
                          </p>
                        </div>
                      )}

                      {/* NEW: Satisfaction Rating Display */}
                      {meal.satisfactionRating && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                            Satisfaction:
                          </span>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span
                                key={star}
                                className={star <= meal.satisfactionRating! ? 'text-yellow-400' : 'text-gray-400'}
                              >
                                ⭐
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        );
      })}

      {/* Copy to Another Day Button */}
      {meals.length > 0 && viewPeriod === 'daily' && (
        <GlassCard>
          <button
            onClick={() => setShowCopyDialog(true)}
            className="w-full px-6 py-4 bg-gradient-to-r from-cobalt-500 to-sky-500 font-bold rounded-lg hover:from-cobalt-600 hover:to-sky-600 transition-all flex items-center justify-center gap-2 shadow-lg"
            style={{ color: '#0052cc' }}
          >
            <Copy className="h-5 w-5" />
            Copy This Day's Meals to Another Date
          </button>
        </GlassCard>
      )}

      {/* Copy Dialog */}
      {showCopyDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#ff9500' }}>Copy Meals to Another Day</h2>

            <p className="font-semibold mb-4" style={{ color: '#1a1a1a' }}>
              This will copy all {meals.length} meal(s) from {formatDate(selectedDate)} to the selected date.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-bold mb-2" style={{ color: '#1a1a1a' }}>
                Select Target Date
              </label>
              <input
                type="date"
                value={copyToDate}
                onChange={(e) => setCopyToDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cobalt-500 focus:border-cobalt-500 outline-none font-bold"
                style={{ color: '#1a1a1a' }}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCopyDialog(false);
                  setCopyToDate('');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 font-bold rounded-lg hover:bg-gray-50 transition-colors"
                style={{ color: '#dc2626' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCopyToDay}
                disabled={!copyToDate || loading}
                className="flex-1 px-4 py-3 bg-cobalt-500 font-bold rounded-lg hover:bg-cobalt-600 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ color: '#22c55e' }}
              >
                {loading ? 'Copying...' : 'Copy Meals'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Meal Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)'
        }}>
          <div className="relative rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8" style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
            border: '2px solid rgba(96, 165, 250, 0.3)',
            boxShadow: '0 0 60px rgba(96, 165, 250, 0.4), inset 0 0 60px rgba(96, 165, 250, 0.05)',
            backdropFilter: 'blur(20px)'
          }}>
            {/* Glassmorphic Gradient Overlay */}
            <div className="absolute top-0 right-0 w-96 h-96 opacity-10 pointer-events-none" style={{
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.6) 0%, transparent 70%)'
            }}></div>

            {/* Header */}
            <div className="relative mb-8">
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <span style={{
                  fontSize: '2rem',
                  filter: 'drop-shadow(0 0 15px rgba(249, 115, 22, 0.8))'
                }}>
                  🍽️
                </span>
                <span style={{
                  fontFamily: '"Orbitron", "Rajdhani", monospace',
                  color: '#ffffff',
                  textShadow: '0 0 20px rgba(249, 115, 22, 0.8)',
                  letterSpacing: '3px'
                }}>
                  {editingMeal ? 'EDIT MEAL ENTRY' : 'NEW MEAL ENTRY'}
                </span>
              </h2>
              <p className="text-sm mt-2" style={{
                color: '#93c5fd',
                fontFamily: '"Rajdhani", monospace',
                letterSpacing: '1px'
              }}>
                Nutrition Tracking System
              </p>
            </div>

            <div className="space-y-5 relative">
              {/* Meal Type Selector */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{
                  color: '#93c5fd',
                  fontFamily: '"Rajdhani", monospace',
                  letterSpacing: '1px',
                  textShadow: '0 0 10px rgba(147, 197, 253, 0.5)'
                }}>
                  MEAL TYPE *
                </label>
                <select
                  value={currentMealType}
                  onChange={(e) => setCurrentMealType(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg outline-none font-bold transition-all"
                  style={{
                    background: 'rgba(30, 41, 59, 0.6)',
                    border: '2px solid rgba(96, 165, 250, 0.3)',
                    color: '#ffffff',
                    fontFamily: '"Rajdhani", monospace',
                    boxShadow: '0 0 20px rgba(96, 165, 250, 0.2), inset 0 0 20px rgba(96, 165, 250, 0.05)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <option value="breakfast" style={{ background: '#1e293b', color: '#ffffff' }}>🍳 Breakfast</option>
                  <option value="lunch" style={{ background: '#1e293b', color: '#ffffff' }}>🥗 Lunch</option>
                  <option value="dinner" style={{ background: '#1e293b', color: '#ffffff' }}>🍽️ Dinner</option>
                  <option value="snack" style={{ background: '#1e293b', color: '#ffffff' }}>🍿 Snack</option>
                  <option value="beverage" style={{ background: '#1e293b', color: '#ffffff' }}>🥤 Beverage</option>
                </select>
              </div>

              {/* Food Item Name with Autocomplete */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{
                  color: '#93c5fd',
                  fontFamily: '"Rajdhani", monospace',
                  letterSpacing: '1px',
                  textShadow: '0 0 10px rgba(147, 197, 253, 0.5)'
                }}>
                  FOOD ITEM(S) *
                </label>
                <FoodAutocomplete
                  value={newMeal.foodItems}
                  onChange={(value) => setNewMeal({ ...newMeal, foodItems: value })}
                  placeholder="e.g., Grilled Chicken Breast, Brown Rice, Steamed Broccoli"
                />
              </div>

              {/* Auto-Calculate Nutrition */}
              <div className="rounded-lg p-4" style={{
                background: 'rgba(34, 211, 238, 0.1)',
                border: '2px solid rgba(34, 211, 238, 0.3)',
                boxShadow: '0 0 20px rgba(34, 211, 238, 0.2), inset 0 0 20px rgba(34, 211, 238, 0.05)',
                backdropFilter: 'blur(10px)'
              }}>
                <div className="flex items-center gap-3 mb-3">
                  <Calculator className="h-5 w-5" style={{
                    color: '#22d3ee',
                    filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.6))'
                  }} />
                  <label className="block text-sm font-bold" style={{
                    color: '#22d3ee',
                    fontFamily: '"Rajdhani", monospace',
                    letterSpacing: '1px',
                    textShadow: '0 0 10px rgba(34, 211, 238, 0.5)'
                  }}>
                    AUTO-CALCULATE NUTRITION
                  </label>
                </div>
                <p className="text-xs mb-3" style={{ color: '#93c5fd' }}>
                  Automatically populate nutrition info based on food items entered above
                </p>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-bold mb-1" style={{
                      color: '#93c5fd',
                      fontFamily: '"Rajdhani", monospace',
                      letterSpacing: '0.5px'
                    }}>
                      SERVINGS
                    </label>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={servings}
                      onChange={(e) => setServings(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg outline-none font-bold transition-all"
                      style={{
                        background: 'rgba(30, 41, 59, 0.6)',
                        border: '2px solid rgba(34, 211, 238, 0.3)',
                        color: '#ffffff',
                        fontFamily: '"Rajdhani", monospace',
                        boxShadow: '0 0 15px rgba(34, 211, 238, 0.2)',
                        backdropFilter: 'blur(10px)'
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={calculateNutrition}
                    className="px-4 py-2 font-bold rounded-lg transition-all flex items-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.3), rgba(59, 130, 246, 0.3))',
                      border: '2px solid rgba(34, 211, 238, 0.5)',
                      color: '#22d3ee',
                      boxShadow: '0 0 20px rgba(34, 211, 238, 0.4)',
                      fontFamily: '"Rajdhani", monospace',
                      letterSpacing: '1px',
                      textShadow: '0 0 10px rgba(34, 211, 238, 0.8)'
                    }}
                  >
                    <Calculator className="h-4 w-4" />
                    CALCULATE
                  </button>
                </div>
                {nutritionLookupMessage && (
                  <div className="mt-2 text-xs font-bold" style={{
                    color: '#22d3ee',
                    textShadow: '0 0 8px rgba(34, 211, 238, 0.5)'
                  }}>
                    {nutritionLookupMessage}
                  </div>
                )}
                {validationWarning && (
                  <div className="mt-2 text-xs font-bold" style={{
                    color: '#fb923c',
                    textShadow: '0 0 8px rgba(251, 146, 60, 0.5)'
                  }}>
                    {validationWarning}
                  </div>
                )}
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{
                  color: '#93c5fd',
                  fontFamily: '"Rajdhani", monospace',
                  letterSpacing: '1px',
                  textShadow: '0 0 10px rgba(147, 197, 253, 0.5)'
                }}>
                  TIME
                </label>
                <input
                  type="time"
                  value={newMeal.time}
                  onChange={(e) => setNewMeal({ ...newMeal, time: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg outline-none font-bold transition-all"
                  style={{
                    background: 'rgba(30, 41, 59, 0.6)',
                    border: '2px solid rgba(96, 165, 250, 0.3)',
                    color: '#ffffff',
                    fontFamily: '"Rajdhani", monospace',
                    boxShadow: '0 0 20px rgba(96, 165, 250, 0.2), inset 0 0 20px rgba(96, 165, 250, 0.05)',
                    backdropFilter: 'blur(10px)',
                    colorScheme: 'dark'
                  }}
                />
              </div>

              {/* Unhealthy Food Checkbox */}
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '2px solid rgba(239, 68, 68, 0.3)',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.2), inset 0 0 20px rgba(239, 68, 68, 0.05)',
                backdropFilter: 'blur(10px)'
              }}>
                <input
                  type="checkbox"
                  id="unhealthy"
                  checked={newMeal.isUnhealthy}
                  onChange={(e) => setNewMeal({ ...newMeal, isUnhealthy: e.target.checked })}
                  className="w-5 h-5"
                  style={{
                    accentColor: '#ef4444',
                    cursor: 'pointer'
                  }}
                />
                <label htmlFor="unhealthy" className="font-bold cursor-pointer" style={{
                  color: '#f87171',
                  fontFamily: '"Rajdhani", monospace',
                  letterSpacing: '0.5px',
                  textShadow: '0 0 10px rgba(248, 113, 113, 0.5)'
                }}>
                  ⚠️ THIS IS AN UNHEALTHY FOOD (HEART PATIENT SHOULD AVOID)
                </label>
              </div>

              {/* Nutrition Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{
                    color: '#93c5fd',
                    fontFamily: '"Rajdhani", monospace',
                    letterSpacing: '0.5px'
                  }}>
                    CALORIES
                  </label>
                  <input
                    type="number"
                    value={newMeal.calories}
                    onChange={(e) => {
                      const validated = validateNutritionInput(e.target.value, 'Calories', 5000);
                      setNewMeal({ ...newMeal, calories: validated });
                    }}
                    placeholder="0"
                    className="w-full px-2 py-1.5 rounded-lg outline-none text-sm transition-all"
                    style={{
                      background: 'rgba(30, 41, 59, 0.6)',
                      border: '2px solid rgba(96, 165, 250, 0.3)',
                      color: '#ffffff',
                      fontFamily: '"Rajdhani", monospace',
                      boxShadow: '0 0 15px rgba(96, 165, 250, 0.2)',
                      backdropFilter: 'blur(10px)'
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={{
                    color: '#93c5fd',
                    fontFamily: '"Rajdhani", monospace',
                    letterSpacing: '0.5px'
                  }}>
                    SODIUM (MG)
                  </label>
                  <input
                    type="number"
                    value={newMeal.sodium}
                    onChange={(e) => {
                      const validated = validateNutritionInput(e.target.value, 'Sodium', 10000);
                      setNewMeal({ ...newMeal, sodium: validated });
                    }}
                    placeholder="0"
                    className="w-full px-2 py-1.5 rounded-lg outline-none text-sm transition-all"
                    style={{
                      background: 'rgba(30, 41, 59, 0.6)',
                      border: '2px solid rgba(96, 165, 250, 0.3)',
                      color: '#ffffff',
                      fontFamily: '"Rajdhani", monospace',
                      boxShadow: '0 0 15px rgba(96, 165, 250, 0.2)',
                      backdropFilter: 'blur(10px)'
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={{
                    color: '#93c5fd',
                    fontFamily: '"Rajdhani", monospace',
                    letterSpacing: '0.5px'
                  }}>
                    PROTEIN (G)
                  </label>
                  <input
                    type="number"
                    value={newMeal.protein}
                    onChange={(e) => {
                      const validated = validateNutritionInput(e.target.value, 'Protein', 200);
                      setNewMeal({ ...newMeal, protein: validated });
                    }}
                    placeholder="0"
                    className="w-full px-2 py-1.5 rounded-lg outline-none text-sm transition-all"
                    style={{
                      background: 'rgba(30, 41, 59, 0.6)',
                      border: '2px solid rgba(96, 165, 250, 0.3)',
                      color: '#ffffff',
                      fontFamily: '"Rajdhani", monospace',
                      boxShadow: '0 0 15px rgba(96, 165, 250, 0.2)',
                      backdropFilter: 'blur(10px)'
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={{
                    color: '#93c5fd',
                    fontFamily: '"Rajdhani", monospace',
                    letterSpacing: '0.5px'
                  }}>
                    CARBS (G)
                  </label>
                  <input
                    type="number"
                    value={newMeal.carbs}
                    onChange={(e) => {
                      const validated = validateNutritionInput(e.target.value, 'Carbs', 500);
                      setNewMeal({ ...newMeal, carbs: validated });
                    }}
                    placeholder="0"
                    className="w-full px-2 py-1.5 rounded-lg outline-none text-sm transition-all"
                    style={{
                      background: 'rgba(30, 41, 59, 0.6)',
                      border: '2px solid rgba(96, 165, 250, 0.3)',
                      color: '#ffffff',
                      fontFamily: '"Rajdhani", monospace',
                      boxShadow: '0 0 15px rgba(96, 165, 250, 0.2)',
                      backdropFilter: 'blur(10px)'
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={{
                    color: '#93c5fd',
                    fontFamily: '"Rajdhani", monospace',
                    letterSpacing: '0.5px'
                  }}>
                    FAT (G)
                  </label>
                  <input
                    type="number"
                    value={newMeal.fat}
                    onChange={(e) => {
                      const validated = validateNutritionInput(e.target.value, 'Fat', 300);
                      setNewMeal({ ...newMeal, fat: validated });
                    }}
                    placeholder="0"
                    className="w-full px-2 py-1.5 rounded-lg outline-none text-sm transition-all"
                    style={{
                      background: 'rgba(30, 41, 59, 0.6)',
                      border: '2px solid rgba(96, 165, 250, 0.3)',
                      color: '#ffffff',
                      fontFamily: '"Rajdhani", monospace',
                      boxShadow: '0 0 15px rgba(96, 165, 250, 0.2)',
                      backdropFilter: 'blur(10px)'
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={{
                    color: '#93c5fd',
                    fontFamily: '"Rajdhani", monospace',
                    letterSpacing: '0.5px'
                  }}>
                    FIBER (G)
                  </label>
                  <input
                    type="number"
                    value={newMeal.fiber}
                    onChange={(e) => {
                      const validated = validateNutritionInput(e.target.value, 'Fiber', 50);
                      setNewMeal({ ...newMeal, fiber: validated });
                    }}
                    placeholder="0"
                    className="w-full px-2 py-1.5 rounded-lg outline-none text-sm transition-all"
                    style={{
                      background: 'rgba(30, 41, 59, 0.6)',
                      border: '2px solid rgba(96, 165, 250, 0.3)',
                      color: '#ffffff',
                      fontFamily: '"Rajdhani", monospace',
                      boxShadow: '0 0 15px rgba(96, 165, 250, 0.2)',
                      backdropFilter: 'blur(10px)'
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={{
                    color: '#93c5fd',
                    fontFamily: '"Rajdhani", monospace',
                    letterSpacing: '0.5px'
                  }}>
                    SUGAR (G)
                  </label>
                  <input
                    type="number"
                    value={newMeal.sugar}
                    onChange={(e) => {
                      const validated = validateNutritionInput(e.target.value, 'Sugar', 300);
                      setNewMeal({ ...newMeal, sugar: validated });
                    }}
                    placeholder="0"
                    className="w-full px-2 py-1.5 rounded-lg outline-none text-sm transition-all"
                    style={{
                      background: 'rgba(30, 41, 59, 0.6)',
                      border: '2px solid rgba(96, 165, 250, 0.3)',
                      color: '#ffffff',
                      fontFamily: '"Rajdhani", monospace',
                      boxShadow: '0 0 15px rgba(96, 165, 250, 0.2)',
                      backdropFilter: 'blur(10px)'
                    }}
                  />
                </div>
              </div>

              {/* NEW: Satisfaction Rating */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{
                  color: '#93c5fd',
                  fontFamily: '"Rajdhani", monospace',
                  letterSpacing: '1px',
                  textShadow: '0 0 10px rgba(147, 197, 253, 0.5)'
                }}>
                  SATISFACTION RATING (OPTIONAL)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewMeal({ ...newMeal, satisfactionRating: star })}
                      className="text-3xl transition-all hover:scale-125 focus:outline-none active:scale-110"
                      style={{
                        cursor: 'pointer',
                        filter: star <= newMeal.satisfactionRating ? 'drop-shadow(0 0 8px rgba(250, 204, 21, 0.8))' : 'grayscale(100%)',
                        opacity: star <= newMeal.satisfactionRating ? 1 : 0.3
                      }}
                    >
                      ⭐
                    </button>
                  ))}
                  {newMeal.satisfactionRating > 0 && (
                    <button
                      type="button"
                      onClick={() => setNewMeal({ ...newMeal, satisfactionRating: 0 })}
                      className="ml-2 text-xs font-bold underline"
                      style={{
                        color: '#f87171',
                        fontFamily: '"Rajdhani", monospace'
                      }}
                    >
                      CLEAR
                    </button>
                  )}
                </div>
                <p className="text-xs mt-1" style={{
                  color: '#93c5fd',
                  fontFamily: '"Rajdhani", monospace'
                }}>
                  {newMeal.satisfactionRating > 0
                    ? `Rating: ${newMeal.satisfactionRating} / 5 stars`
                    : 'Click stars to rate - How satisfying was this meal?'}
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{
                  color: '#93c5fd',
                  fontFamily: '"Rajdhani", monospace',
                  letterSpacing: '1px',
                  textShadow: '0 0 10px rgba(147, 197, 253, 0.5)'
                }}>
                  NOTES (OPTIONAL)
                </label>
                <textarea
                  value={newMeal.notes}
                  onChange={(e) => setNewMeal({ ...newMeal, notes: e.target.value })}
                  placeholder="Add any additional notes..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                  style={{
                    background: 'rgba(30, 41, 59, 0.6)',
                    border: '2px solid rgba(96, 165, 250, 0.3)',
                    color: '#ffffff',
                    fontFamily: '"Rajdhani", monospace',
                    boxShadow: '0 0 20px rgba(96, 165, 250, 0.2), inset 0 0 20px rgba(96, 165, 250, 0.05)',
                    backdropFilter: 'blur(10px)',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddDialog(false);
                  setEditingMeal(null);
                  setNewMeal({
                    foodItems: '',
                    time: new Date().toTimeString().slice(0, 5),
                    calories: '',
                    sodium: '',
                    protein: '',
                    carbs: '',
                    fat: '',
                    fiber: '',
                    sugar: '',
                    notes: '',
                    isUnhealthy: false,
                    satisfactionRating: 0,
                  });
                  setServings(1);
                  setNutritionLookupMessage('');
                }}
                className="flex-1 px-4 py-3 font-bold rounded-lg transition-all"
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '2px solid rgba(239, 68, 68, 0.4)',
                  color: '#f87171',
                  fontFamily: '"Rajdhani", monospace',
                  letterSpacing: '1px',
                  boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)',
                  textShadow: '0 0 10px rgba(248, 113, 113, 0.6)'
                }}
              >
                CANCEL
              </button>
              <button
                onClick={editingMeal ? handleUpdateMeal : handleAddMeal}
                disabled={!newMeal.foodItems.trim() || loading}
                className="flex-1 px-4 py-3 font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(16, 185, 129, 0.3))',
                  border: '2px solid rgba(34, 197, 94, 0.5)',
                  color: '#22c55e',
                  fontFamily: '"Rajdhani", monospace',
                  letterSpacing: '2px',
                  boxShadow: '0 0 30px rgba(34, 197, 94, 0.4)',
                  textShadow: '0 0 15px rgba(34, 197, 94, 0.8)'
                }}
              >
                {loading ? (editingMeal ? 'UPDATING...' : 'ADDING...') : (editingMeal ? 'UPDATE MEAL' : 'ADD MEAL')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
