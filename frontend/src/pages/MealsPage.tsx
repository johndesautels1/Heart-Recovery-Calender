import React, { useState, useEffect } from 'react';
import { GlassCard, Input } from '../components/ui';
import { UtensilsCrossed, Search, TrendingUp, Filter, Heart, Plus, User, Trophy, Award, BarChart3, PieChart as PieChartIcon, Scale, Target, Flame, Activity, Clock, Calendar } from 'lucide-react';
import { api } from '../services/api';
import { FoodCategory, FoodItem, FoodStats, MealEntry } from '../types';
import { AddToMealDialog } from '../components/AddToMealDialog';
import { useAuth } from '../contexts/AuthContext';
import { usePatientSelection } from '../contexts/PatientSelectionContext';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, ReferenceLine } from 'recharts';
import { format, subDays, parseISO, getDaysInMonth, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { WeightTrackingChart } from '../components/charts/WeightTrackingChart';

export function MealsPage() {
  const { user } = useAuth();
  const { selectedPatient, isViewingAsTherapist } = usePatientSelection();
  const [activeTab, setActiveTab] = useState<'database' | 'visuals'>('database');
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [stats, setStats] = useState<FoodStats | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedHealthRating, setSelectedHealthRating] = useState<'green' | 'yellow' | 'red' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // For visuals tab
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [weightEntries, setWeightEntries] = useState<Array<{ date: string; weight: number }>>([]);

  // Load categories and stats on mount
  useEffect(() => {
    loadCategories();
    loadStats();
  }, []);

  // Load food items when filters change
  useEffect(() => {
    if (activeTab === 'database') {
      loadFoodItems();
    }
  }, [selectedCategory, selectedHealthRating, searchQuery, activeTab]);

  // Load meals for visuals tab
  useEffect(() => {
    if (activeTab === 'visuals') {
      loadMeals();
    }
  }, [dateRange, selectedPatient, activeTab]);

  // Load weight entries from vitals
  useEffect(() => {
    const loadWeightEntries = async () => {
      if (activeTab !== 'visuals') return;

      try {
        const userId = isViewingAsTherapist && selectedPatient?.userId ? selectedPatient.userId : user?.id;
        if (!userId) return;

        const endDate = format(new Date(), 'yyyy-MM-dd');
        const startDate = format(subDays(new Date(), 90), 'yyyy-MM-dd'); // Last 90 days

        const vitals = await api.getVitals({
          startDate,
          endDate,
          userId,
        });

        // Filter vitals that have weight data and transform to weight entries
        const entries = vitals
          .filter(v => v.weight != null)
          .map(v => ({
            date: v.timestamp.split('T')[0],
            weight: v.weight!,
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setWeightEntries(entries);
      } catch (error) {
        console.error('Failed to load weight entries:', error);
        setWeightEntries([]);
      }
    };

    loadWeightEntries();
  }, [activeTab, isViewingAsTherapist, selectedPatient?.userId, user?.id]);

  const loadCategories = async () => {
    try {
      const data = await api.getFoodCategories();
      setCategories(data);
    } catch (err: any) {
      console.error('Error loading categories:', err);
      setError(err.message);
    }
  };

  const loadStats = async () => {
    try {
      const data = await api.getFoodStats();
      setStats(data);
    } catch (err: any) {
      console.error('Error loading stats:', err);
    }
  };

  const loadFoodItems = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedCategory) params.categoryId = selectedCategory;
      if (selectedHealthRating) params.healthRating = selectedHealthRating;
      if (searchQuery) params.search = searchQuery;

      const data = await api.getFoodItems(params);
      setFoodItems(data.items);
    } catch (err: any) {
      console.error('Error loading food items:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMeals = async () => {
    try {
      setLoading(true);
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');
      const userId = isViewingAsTherapist && selectedPatient?.userId ? selectedPatient.userId : user?.id;

      const data = await api.getMeals({
        startDate,
        endDate,
        userId
      });

      setMeals(data);
    } catch (error) {
      console.error('Failed to load meals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthRatingColor = (rating: 'green' | 'yellow' | 'red') => {
    switch (rating) {
      case 'green':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'red':
        return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  const getHealthRatingLabel = (rating: 'green' | 'yellow' | 'red') => {
    switch (rating) {
      case 'green':
        return 'Heart-Healthy';
      case 'yellow':
        return 'Moderation';
      case 'red':
        return 'Limit/Avoid';
    }
  };

  const handleFoodClick = (food: FoodItem) => {
    setSelectedFood(food);
    setShowAddDialog(true);
  };

  const handleAddToMeal = async (mealData: any) => {
    try {
      const multiplier = mealData.quantity;

      await api.createMeal({
        timestamp: mealData.timestamp,
        mealType: mealData.mealType,
        foodItems: `${mealData.foodItem.name} (${mealData.portionSize}, ${mealData.quantity}x)`,
        calories: mealData.foodItem.calories ? mealData.foodItem.calories * multiplier : undefined,
        sodium: mealData.foodItem.sodium ? mealData.foodItem.sodium * multiplier : undefined,
        cholesterol: mealData.foodItem.cholesterol ? mealData.foodItem.cholesterol * multiplier : undefined,
        protein: mealData.foodItem.protein ? mealData.foodItem.protein * multiplier : undefined,
        carbohydrates: mealData.foodItem.carbs ? mealData.foodItem.carbs * multiplier : undefined,
        totalFat: mealData.foodItem.fat ? mealData.foodItem.fat * multiplier : undefined,
        fiber: mealData.foodItem.fiber ? mealData.foodItem.fiber * multiplier : undefined,
        notes: mealData.notes,
      });

      setShowAddDialog(false);
      setSelectedFood(null);
      alert(`${mealData.foodItem.name} added to ${mealData.mealType}!`);
    } catch (err: any) {
      console.error('Error adding to meal:', err);
      alert('Failed to add to meal: ' + err.message);
    }
  };

  // ===== SCORING AND CHART LOGIC =====

  // Calculate points for a single day based on meal quality
  const getDayMealPoints = (dayMeals: MealEntry[]) => {
    const breakfastMeals = dayMeals.filter(m => m.mealType.toLowerCase() === 'breakfast');
    const lunchMeals = dayMeals.filter(m => m.mealType.toLowerCase() === 'lunch');
    const dinnerMeals = dayMeals.filter(m => m.mealType.toLowerCase() === 'dinner');

    const isBreakfastGood = breakfastMeals.length > 0 && !breakfastMeals.some(m => m.foodItems.includes('⚠️'));
    const isLunchGood = lunchMeals.length > 0 && !lunchMeals.some(m => m.foodItems.includes('⚠️'));
    const isDinnerGood = dinnerMeals.length > 0 && !dinnerMeals.some(m => m.foodItems.includes('⚠️'));

    const goodMealsCount = [isBreakfastGood, isLunchGood, isDinnerGood].filter(Boolean).length;

    // 0 points: all bad (0 good meals)
    // 1 point: 1 good meal
    // 2 points: 2 good meals
    // 3 points: all 3 good meals
    return goodMealsCount;
  };

  // Get color based on daily points
  const getDayPointsColor = (points: number) => {
    if (points === 0) return '#ef4444'; // Red
    if (points === 1) return '#f59e0b'; // Orange
    if (points === 2) return '#3b82f6'; // Blue
    if (points === 3) return '#10b981'; // Green
    return '#6b7280'; // Gray
  };

  // Calculate monthly food score
  const calculateMonthlyFoodScore = () => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const daysInCurrentMonth = getDaysInMonth(now);

    // Group meals by date
    const mealsByDate: Record<string, MealEntry[]> = {};
    meals.forEach(meal => {
      const mealDate = parseISO(meal.timestamp);
      if (mealDate >= monthStart && mealDate <= monthEnd) {
        const dateKey = format(mealDate, 'yyyy-MM-dd');
        if (!mealsByDate[dateKey]) {
          mealsByDate[dateKey] = [];
        }
        mealsByDate[dateKey].push(meal);
      }
    });

    // Calculate base score
    let baseScore = 0;
    let perfectDays = 0;
    Object.values(mealsByDate).forEach(dayMeals => {
      const points = getDayMealPoints(dayMeals);
      baseScore += points;
      if (points === 3) perfectDays++;
    });

    // Check for perfect month (all days perfect)
    const daysLogged = Object.keys(mealsByDate).length;
    const allDaysPerfect = perfectDays === daysInCurrentMonth && daysLogged === daysInCurrentMonth;
    let bonusPoints = 0;

    if (allDaysPerfect) {
      bonusPoints = daysInCurrentMonth === 30 ? 10 : 7;
    }

    const totalScore = baseScore + bonusPoints;
    const maxPossibleScore = (daysInCurrentMonth * 3) + (daysInCurrentMonth === 30 ? 10 : 7);

    return {
      totalScore,
      baseScore,
      bonusPoints,
      maxPossibleScore,
      daysLogged,
      perfectDays,
      daysInMonth: daysInCurrentMonth,
      isPerfect: allDaysPerfect,
    };
  };

  // Get score color based on percentage
  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;

    if (percentage >= 90) return { bg: 'bg-gradient-to-br from-green-500 to-emerald-600', text: 'text-white', border: 'border-green-400' };
    if (percentage >= 75) return { bg: 'bg-gradient-to-br from-blue-500 to-cyan-600', text: 'text-white', border: 'border-blue-400' };
    if (percentage >= 50) return { bg: 'bg-gradient-to-br from-yellow-500 to-orange-500', text: 'text-white', border: 'border-yellow-400' };
    if (percentage >= 25) return { bg: 'bg-gradient-to-br from-orange-500 to-red-500', text: 'text-white', border: 'border-orange-400' };
    return { bg: 'bg-gradient-to-br from-red-600 to-red-800', text: 'text-white', border: 'border-red-500' };
  };

  // Prepare data for Daily Meal Quality Chart
  const getDailyMealQualityData = () => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const startDate = subDays(new Date(), days);
    const dateRange_dates = eachDayOfInterval({ start: startDate, end: new Date() });

    return dateRange_dates.map(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const dayMeals = meals.filter(m => format(parseISO(m.timestamp), 'yyyy-MM-dd') === dateKey);
      const points = getDayMealPoints(dayMeals);

      return {
        date: format(date, 'MMM d'),
        points,
        fill: getDayPointsColor(points),
      };
    });
  };

  // Prepare data for Food Group Pie Chart
  const getFoodGroupData = () => {
    // Extract food categories from meals
    const categoryCount: Record<string, number> = {};

    meals.forEach(meal => {
      // Simple categorization based on food items text
      const foodText = meal.foodItems.toLowerCase();

      if (foodText.includes('chicken') || foodText.includes('beef') || foodText.includes('fish') || foodText.includes('turkey') || foodText.includes('protein')) {
        categoryCount['Protein'] = (categoryCount['Protein'] || 0) + 1;
      }
      if (foodText.includes('rice') || foodText.includes('bread') || foodText.includes('pasta') || foodText.includes('grain') || foodText.includes('oat')) {
        categoryCount['Grains'] = (categoryCount['Grains'] || 0) + 1;
      }
      if (foodText.includes('broccoli') || foodText.includes('spinach') || foodText.includes('lettuce') || foodText.includes('vegetable') || foodText.includes('salad')) {
        categoryCount['Vegetables'] = (categoryCount['Vegetables'] || 0) + 1;
      }
      if (foodText.includes('apple') || foodText.includes('banana') || foodText.includes('berry') || foodText.includes('fruit') || foodText.includes('orange')) {
        categoryCount['Fruits'] = (categoryCount['Fruits'] || 0) + 1;
      }
      if (foodText.includes('milk') || foodText.includes('cheese') || foodText.includes('yogurt') || foodText.includes('dairy')) {
        categoryCount['Dairy'] = (categoryCount['Dairy'] || 0) + 1;
      }
    });

    const actualData = Object.entries(categoryCount).map(([name, value]) => ({
      name,
      value,
      fill: name === 'Protein' ? '#f59e0b' : name === 'Grains' ? '#8b5cf6' : name === 'Vegetables' ? '#10b981' : name === 'Fruits' ? '#ef4444' : '#3b82f6'
    }));

    // Recommended servings (example data)
    const recommendedData = [
      { name: 'Protein', value: 15, fill: '#f59e0b' },
      { name: 'Grains', value: 20, fill: '#8b5cf6' },
      { name: 'Vegetables', value: 25, fill: '#10b981' },
      { name: 'Fruits', value: 20, fill: '#ef4444' },
      { name: 'Dairy', value: 15, fill: '#3b82f6' },
    ];

    return { actualData, recommendedData };
  };

  // Prepare data for Calorie Line Graph
  const getCalorieData = () => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const startDate = subDays(new Date(), days);
    const dateRange_dates = eachDayOfInterval({ start: startDate, end: new Date() });

    return dateRange_dates.map(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const dayMeals = meals.filter(m => format(parseISO(m.timestamp), 'yyyy-MM-dd') === dateKey);
      const totalCalories = dayMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0);

      return {
        date: format(date, 'MMM d'),
        calories: totalCalories,
        average: 2000, // Recommended average
      };
    });
  };

  const foodScore = calculateMonthlyFoodScore();
  const scoreColor = getScoreColor(foodScore.totalScore, foodScore.maxPossibleScore);
  const dailyMealQualityData = getDailyMealQualityData();
  const { actualData: foodGroupActual, recommendedData: foodGroupRecommended } = getFoodGroupData();
  const calorieData = getCalorieData();

  // ==================== NEW MEAL VISUALIZATION DATA ====================

  // 1. Radial Meal Adherence Clock Data - Completion rates for each meal type
  const mealAdherenceData = (() => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const totalDays = days;

    const breakfastCount = new Set(
      meals
        .filter(m => m.mealType.toLowerCase() === 'breakfast')
        .map(m => format(parseISO(m.timestamp), 'yyyy-MM-dd'))
    ).size;

    const lunchCount = new Set(
      meals
        .filter(m => m.mealType.toLowerCase() === 'lunch')
        .map(m => format(parseISO(m.timestamp), 'yyyy-MM-dd'))
    ).size;

    const dinnerCount = new Set(
      meals
        .filter(m => m.mealType.toLowerCase() === 'dinner')
        .map(m => format(parseISO(m.timestamp), 'yyyy-MM-dd'))
    ).size;

    return {
      breakfast: (breakfastCount / totalDays) * 100,
      lunch: (lunchCount / totalDays) * 100,
      dinner: (dinnerCount / totalDays) * 100,
      breakfastDays: breakfastCount,
      lunchDays: lunchCount,
      dinnerDays: dinnerCount,
      totalDays,
    };
  })();

  // 2. Monthly Meal Heatmap Calendar Data
  const heatmapMealData = (() => {
    const now = new Date();
    const daysInMonth = getDaysInMonth(now);
    const monthStart = startOfMonth(now);
    const data = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(monthStart);
      date.setDate(day);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayMeals = meals.filter(m => format(parseISO(m.timestamp), 'yyyy-MM-dd') === dateStr);
      const points = getDayMealPoints(dayMeals);

      data.push({
        day,
        date: format(date, 'MMM d'),
        points,
        dayOfWeek: format(date, 'EEE'),
        mealsCount: dayMeals.length,
      });
    }
    return data;
  })();

  // 3. Sodium Tracking Wave Data - Cumulative sodium over time
  const sodiumWaveData = (() => {
    const DAILY_LIMIT = 2300; // mg sodium per day recommended
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const startDate = subDays(new Date(), days);
    const dateRange_dates = eachDayOfInterval({ start: startDate, end: new Date() });

    return dateRange_dates.map(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const dayMeals = meals.filter(m => format(parseISO(m.timestamp), 'yyyy-MM-dd') === dateKey);
      const totalSodium = dayMeals.reduce((sum, meal) => sum + (meal.sodium || 0), 0);

      return {
        date: format(date, 'MMM d'),
        sodium: totalSodium,
        limit: DAILY_LIMIT,
        over: totalSodium > DAILY_LIMIT,
      };
    });
  })();

  // 4. Nutrient Target Radial Progress - Achievement percentages for key nutrients
  const nutrientTargets = (() => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const startDate = subDays(new Date(), days);
    const dateRange_dates = eachDayOfInterval({ start: startDate, end: new Date() });

    let sodiumGoodDays = 0;
    let cholesterolGoodDays = 0;
    let fiberGoodDays = 0;
    let proteinGoodDays = 0;

    dateRange_dates.forEach(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const dayMeals = meals.filter(m => format(parseISO(m.timestamp), 'yyyy-MM-dd') === dateKey);

      const dailySodium = dayMeals.reduce((sum, m) => sum + (m.sodium || 0), 0);
      const dailyCholesterol = dayMeals.reduce((sum, m) => sum + (m.cholesterol || 0), 0);
      const dailyFiber = dayMeals.reduce((sum, m) => sum + (m.fiber || 0), 0);
      const dailyProtein = dayMeals.reduce((sum, m) => sum + (m.protein || 0), 0);

      if (dailySodium <= 2300) sodiumGoodDays++;
      if (dailyCholesterol <= 300) cholesterolGoodDays++;
      if (dailyFiber >= 25) fiberGoodDays++;
      if (dailyProtein >= 50) proteinGoodDays++;
    });

    const totalDays = dateRange_dates.length;
    return {
      sodium: (sodiumGoodDays / totalDays) * 100,
      cholesterol: (cholesterolGoodDays / totalDays) * 100,
      fiber: (fiberGoodDays / totalDays) * 100,
      protein: (proteinGoodDays / totalDays) * 100,
    };
  })();

  // 5. Meal Timing Scatter Plot Data - Plot meals by time of day
  const mealTimingData = meals
    .filter(m => m.timestamp)
    .map(m => {
      const time = parseISO(m.timestamp);
      const hour = time.getHours() + time.getMinutes() / 60;

      return {
        hour,
        mealType: m.mealType,
        date: format(time, 'MMM d'),
        calories: m.calories || 0,
        displayTime: format(time, 'h:mm a'),
      };
    });

  // 6. Meal Streak Data - Consecutive days with good meals
  const calculateMealStreak = () => {
    const mealsByDate: Record<string, MealEntry[]> = {};
    meals.forEach(meal => {
      const dateKey = format(parseISO(meal.timestamp), 'yyyy-MM-dd');
      if (!mealsByDate[dateKey]) {
        mealsByDate[dateKey] = [];
      }
      mealsByDate[dateKey].push(meal);
    });

    const sortedDates = Object.keys(mealsByDate).sort((a, b) =>
      new Date(b).getTime() - new Date(a).getTime()
    );

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedDates.length; i++) {
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);
      const expectedDateKey = format(expectedDate, 'yyyy-MM-dd');

      if (sortedDates[i] === expectedDateKey) {
        const dayMeals = mealsByDate[sortedDates[i]];
        const points = getDayMealPoints(dayMeals);
        if (points >= 2) { // At least 2 good meals
          streak++;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return streak;
  };
  const currentMealStreak = calculateMealStreak();

  // 7. Weekly Meal Pattern Timeline - Last 7 days meal distribution
  const weeklyPatternData = (() => {
    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date()
    });

    return last7Days.map(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const dayMeals = meals.filter(m => format(parseISO(m.timestamp), 'yyyy-MM-dd') === dateKey);
      const points = getDayMealPoints(dayMeals);

      const breakfastCount = dayMeals.filter(m => m.mealType.toLowerCase() === 'breakfast').length;
      const lunchCount = dayMeals.filter(m => m.mealType.toLowerCase() === 'lunch').length;
      const dinnerCount = dayMeals.filter(m => m.mealType.toLowerCase() === 'dinner').length;
      const snackCount = dayMeals.filter(m => m.mealType.toLowerCase() === 'snack').length;

      return {
        date: format(date, 'MMM d'),
        points,
        breakfast: breakfastCount,
        lunch: lunchCount,
        dinner: dinnerCount,
        snacks: snackCount,
        total: dayMeals.length,
      };
    });
  })();

  // 8. 3D Meal Quality Pyramid Data - Distribution of quality scores
  const pyramidMealData = (() => {
    const mealsByDate: Record<string, MealEntry[]> = {};
    meals.forEach(meal => {
      const dateKey = format(parseISO(meal.timestamp), 'yyyy-MM-dd');
      if (!mealsByDate[dateKey]) {
        mealsByDate[dateKey] = [];
      }
      mealsByDate[dateKey].push(meal);
    });

    const qualityCounts = { perfect: 0, good: 0, fair: 0, poor: 0 };
    Object.values(mealsByDate).forEach(dayMeals => {
      const points = getDayMealPoints(dayMeals);
      if (points === 3) qualityCounts.perfect++;
      else if (points === 2) qualityCounts.good++;
      else if (points === 1) qualityCounts.fair++;
      else qualityCounts.poor++;
    });

    return [
      {
        label: 'Perfect Days',
        count: qualityCounts.perfect,
        color: '#10b981',
        gradient: 'bg-gradient-to-br from-green-400 to-green-600',
        border: 'border-green-400'
      },
      {
        label: 'Good Days',
        count: qualityCounts.good,
        color: '#3b82f6',
        gradient: 'bg-gradient-to-br from-blue-400 to-blue-600',
        border: 'border-blue-400'
      },
      {
        label: 'Fair Days',
        count: qualityCounts.fair,
        color: '#f59e0b',
        gradient: 'bg-gradient-to-br from-orange-400 to-orange-600',
        border: 'border-orange-400'
      },
      {
        label: 'Poor Days',
        count: qualityCounts.poor,
        color: '#ef4444',
        gradient: 'bg-gradient-to-br from-red-400 to-red-600',
        border: 'border-red-400'
      },
    ];
  })();

  return (
    <div className="space-y-6">
      {/* Patient Selection Banner */}
      {isViewingAsTherapist && selectedPatient && (
        <div className="glass rounded-xl p-4 border-2" style={{ borderColor: 'var(--accent)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <User className="h-6 w-6" style={{ color: 'var(--accent)' }} />
              <div>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Viewing meals for:</p>
                <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{selectedPatient.name}</p>
              </div>
            </div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>
              Therapist View
            </div>
          </div>
        </div>
      )}

      {/* Header with Score Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#fbbf24' }}>Meals & Nutrition</h1>
          <div className="flex items-center gap-2 text-sm font-bold mt-2" style={{ color: '#22c55e' }}>
            <Heart className="h-4 w-4 text-red-500" />
            <span>Heart-Healthy Food Guide</span>
          </div>
        </div>

        {/* Food Score Card */}
        {activeTab === 'visuals' && (
          <div className={`${scoreColor.bg} ${scoreColor.text} rounded-xl p-4 shadow-lg border-2 ${scoreColor.border} transform hover:scale-105 transition-transform duration-300`}>
            <div className="flex items-center justify-center gap-3">
              <Trophy className="h-8 w-8" />
              <div className="text-center">
                <div className="text-sm font-semibold opacity-90">Food Score</div>
                <div className="text-3xl font-bold">
                  {foodScore.totalScore}
                  <span className="text-lg opacity-75">/{foodScore.maxPossibleScore}</span>
                </div>
                <div className="text-xs opacity-80 mt-1">
                  {foodScore.daysLogged}/{foodScore.daysInMonth} days • {foodScore.perfectDays} perfect
                  {foodScore.isPerfect && (
                    <span className="ml-2">
                      <Award className="inline h-4 w-4 animate-pulse" />
                    </span>
                  )}
                </div>
                {foodScore.isPerfect && (
                  <div className="text-xs font-semibold mt-1 animate-pulse">
                    Perfect Month! +{foodScore.bonusPoints} Bonus
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-white/20">
        <button
          onClick={() => setActiveTab('database')}
          className={`px-6 py-3 font-bold rounded-t-lg transition-all ${
            activeTab === 'database'
              ? 'bg-white/20 border-b-2 border-yellow-400 text-yellow-400'
              : 'text-white/60 hover:text-white/80'
          }`}
        >
          <UtensilsCrossed className="inline h-5 w-5 mr-2" />
          Food Database
        </button>
        <button
          onClick={() => setActiveTab('visuals')}
          className={`px-6 py-3 font-bold rounded-t-lg transition-all ${
            activeTab === 'visuals'
              ? 'bg-white/20 border-b-2 border-yellow-400 text-yellow-400'
              : 'text-white/60 hover:text-white/80'
          }`}
        >
          <BarChart3 className="inline h-5 w-5 mr-2" />
          Visuals & Analytics
        </button>
      </div>

      {/* Food Database Tab */}
      {activeTab === 'database' && (
        <>
          {/* Stats Overview */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <GlassCard>
                <div className="text-center">
                  <div className="text-3xl font-bold text-cobalt-600">{stats.totalItems}</div>
                  <div className="text-sm font-bold mt-1" style={{ color: '#fbbf24' }}>Total Foods</div>
                </div>
              </GlassCard>
              <GlassCard>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{stats.healthRatingBreakdown.green}</div>
                  <div className="text-sm font-bold mt-1" style={{ color: '#fbbf24' }}>Heart-Healthy</div>
                </div>
              </GlassCard>
              <GlassCard>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">{stats.healthRatingBreakdown.yellow}</div>
                  <div className="text-sm font-bold mt-1" style={{ color: '#fbbf24' }}>Moderation</div>
                </div>
              </GlassCard>
              <GlassCard>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{stats.healthRatingBreakdown.red}</div>
                  <div className="text-sm font-bold mt-1" style={{ color: '#fbbf24' }}>Limit/Avoid</div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Filters */}
          <GlassCard>
            <div className="space-y-4">
              <div className="flex items-center gap-2 font-bold" style={{ color: '#ffffff' }}>
                <Filter className="h-5 w-5" />
                <span>Filter Foods</span>
              </div>

              {/* Search */}
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5"
                  style={{ color: 'var(--muted)' }}
                />
                <input
                  type="text"
                  placeholder="Search foods..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-cobalt-500 focus:ring-2 focus:ring-cobalt-200 outline-none transition-all"
                />
              </div>

              {/* Category Filter - Symmetrical Grid Layout */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-3 rounded-lg font-bold text-sm transition-all text-center border-2 ${
                    selectedCategory === null
                      ? 'bg-cobalt-500 text-white shadow-lg scale-105'
                      : 'hover:scale-105'
                  }`}
                  style={
                    selectedCategory !== null
                      ? {
                          backgroundColor: 'var(--card)',
                          color: 'var(--ink)',
                          borderColor: 'var(--card-light)'
                        }
                      : undefined
                  }
                >
                  All Categories
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-3 rounded-lg font-bold text-sm transition-all text-center border-2 ${
                      selectedCategory === category.id
                        ? 'bg-cobalt-500 text-white shadow-lg scale-105'
                        : 'hover:scale-105'
                    }`}
                    style={
                      selectedCategory !== category.id
                        ? {
                            backgroundColor: 'var(--card)',
                            color: 'var(--ink)',
                            borderColor: 'var(--card-light)'
                          }
                        : undefined
                    }
                  >
                    {category.icon} {category.name}
                  </button>
                ))}
              </div>

              {/* Health Rating Filter - Symmetrical Grid Layout */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  onClick={() => setSelectedHealthRating(null)}
                  className={`px-6 py-3 rounded-lg font-bold text-sm transition-all text-center border-2 ${
                    selectedHealthRating === null
                      ? 'shadow-lg scale-105'
                      : 'hover:scale-105'
                  }`}
                  style={
                    selectedHealthRating === null
                      ? { backgroundColor: 'var(--card-light)', color: 'white' }
                      : {
                          backgroundColor: 'var(--card)',
                          color: 'var(--ink)',
                          borderColor: 'var(--card-light)'
                        }
                  }
                >
                  All Ratings
                </button>
                <button
                  onClick={() => setSelectedHealthRating('green')}
                  className={`px-6 py-3 rounded-lg font-bold text-sm transition-all text-center border-2 ${
                    selectedHealthRating === 'green'
                      ? 'bg-green-600 text-white shadow-lg scale-105'
                      : 'hover:scale-105'
                  }`}
                  style={
                    selectedHealthRating !== 'green'
                      ? {
                          backgroundColor: 'var(--card)',
                          color: 'var(--good)',
                          borderColor: 'rgba(74, 222, 128, 0.3)'
                        }
                      : undefined
                  }
                >
                  💚 Heart-Healthy
                </button>
                <button
                  onClick={() => setSelectedHealthRating('yellow')}
                  className={`px-6 py-3 rounded-lg font-bold text-sm transition-all text-center border-2 ${
                    selectedHealthRating === 'yellow'
                      ? 'bg-yellow-600 text-white shadow-lg scale-105'
                      : 'hover:scale-105'
                  }`}
                  style={
                    selectedHealthRating !== 'yellow'
                      ? {
                          backgroundColor: 'var(--card)',
                          color: 'var(--warn)',
                          borderColor: 'rgba(251, 191, 36, 0.3)'
                        }
                      : undefined
                  }
                >
                  💛 Moderation
                </button>
                <button
                  onClick={() => setSelectedHealthRating('red')}
                  className={`px-6 py-3 rounded-lg font-bold text-sm transition-all text-center border-2 ${
                    selectedHealthRating === 'red'
                      ? 'bg-red-600 text-white shadow-lg scale-105'
                      : 'hover:scale-105'
                  }`}
                  style={
                    selectedHealthRating !== 'red'
                      ? {
                          backgroundColor: 'var(--card)',
                          color: 'var(--bad)',
                          borderColor: 'rgba(248, 113, 113, 0.3)'
                        }
                      : undefined
                  }
                >
                  ❤️ Limit/Avoid
                </button>
              </div>
            </div>
          </GlassCard>

          {/* Food Items Grid */}
          <GlassCard>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cobalt-600 mx-auto"></div>
                <p className="mt-4" style={{ color: 'var(--muted)' }}>Loading foods...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p style={{ color: 'var(--bad)' }}>Error: {error}</p>
              </div>
            ) : foodItems.length === 0 ? (
              <div className="text-center py-12">
                <UtensilsCrossed
                  className="h-16 w-16 mx-auto mb-4"
                  style={{ color: 'var(--muted)' }}
                />
                <p style={{ color: 'var(--muted)' }}>No foods found matching your criteria.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold" style={{ color: '#22c55e' }}>
                    Found {foodItems.length} food{foodItems.length !== 1 ? 's' : ''}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {foodItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleFoodClick(item)}
                      className="rounded-xl border-3 p-5 cursor-pointer group overflow-hidden relative
                                 transition-all duration-300 hover:scale-105
                                 shadow-lg hover:shadow-2xl
                                 hover:border-cobalt-400"
                      style={{
                        background: `linear-gradient(to bottom right, var(--card), var(--card-light))`,
                        borderColor: 'var(--card-light)',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.08)'
                      }}
                    >
                      {/* Premium header with gradient backdrop */}
                      <div className="flex items-start justify-between mb-4 relative z-10">
                        <h3
                          className="font-bold text-lg group-hover:text-cobalt-600 transition-colors"
                          style={{ color: 'var(--ink)' }}
                        >
                          {item.name}
                        </h3>
                        <span
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 shadow-md ${getHealthRatingColor(
                            item.healthRating
                          )}`}
                        >
                          {getHealthRatingLabel(item.healthRating)}
                        </span>
                      </div>

                      {item.category && (
                        <div
                          className="text-sm font-semibold mb-3 flex items-center gap-2"
                          style={{ color: 'var(--ink)' }}
                        >
                          <span className="text-lg">{item.category.icon}</span>
                          <span>{item.category.name}</span>
                        </div>
                      )}

                      {item.servingSize && (
                        <div
                          className="text-sm font-medium mb-3 rounded-lg px-3 py-2 border"
                          style={{
                            color: 'var(--muted)',
                            backgroundColor: 'var(--card-light)',
                            borderColor: 'var(--card-light)'
                          }}
                        >
                          <span className="font-bold" style={{ color: 'var(--ink)' }}>Serving:</span> {item.servingSize}
                        </div>
                      )}

                      {/* Premium nutrition grid with enhanced styling */}
                      <div
                        className="grid grid-cols-2 gap-3 text-sm mt-4 pt-4 border-t-2"
                        style={{ borderColor: 'var(--card-light)' }}
                      >
                        {item.calories !== undefined && (
                          <div className="bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
                            <span className="font-bold text-blue-900">Cal:</span>
                            <span className="ml-1 text-blue-800">{item.calories}</span>
                          </div>
                        )}
                        {item.protein !== undefined && (
                          <div className="bg-green-50 rounded-lg px-3 py-2 border border-green-200">
                            <span className="font-bold text-green-900">Protein:</span>
                            <span className="ml-1 text-green-800">{item.protein}g</span>
                          </div>
                        )}
                        {item.carbs !== undefined && (
                          <div className="bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                            <span className="font-bold text-amber-900">Carbs:</span>
                            <span className="ml-1 text-amber-800">{item.carbs}g</span>
                          </div>
                        )}
                        {item.fat !== undefined && (
                          <div className="bg-orange-50 rounded-lg px-3 py-2 border border-orange-200">
                            <span className="font-bold text-orange-900">Fat:</span>
                            <span className="ml-1 text-orange-800">{item.fat}g</span>
                          </div>
                        )}
                        {item.fiber !== undefined && (
                          <div className="bg-purple-50 rounded-lg px-3 py-2 border border-purple-200">
                            <span className="font-bold text-purple-900">Fiber:</span>
                            <span className="ml-1 text-purple-800">{item.fiber}g</span>
                          </div>
                        )}
                        {item.sugar !== undefined && (
                          <div className="bg-pink-50 rounded-lg px-3 py-2 border border-pink-200">
                            <span className="font-bold text-pink-900">Sugar:</span>
                            <span className="ml-1 text-pink-800">{item.sugar}g</span>
                          </div>
                        )}
                        {item.sodium !== undefined && (
                          <div className="bg-red-50 rounded-lg px-3 py-2 border border-red-200 col-span-2">
                            <span className="font-bold text-red-900">Sodium:</span>
                            <span className="ml-1 text-red-800">{item.sodium}mg</span>
                          </div>
                        )}
                      </div>

                      {item.notes && (
                        <div
                          className="mt-4 pt-4 border-t-2"
                          style={{ borderColor: 'var(--card-light)' }}
                        >
                          <p
                            className="text-sm italic font-medium leading-relaxed rounded-lg px-3 py-2 border"
                            style={{
                              color: 'var(--ink)',
                              backgroundColor: 'var(--card-light)',
                              borderColor: 'var(--card-light)'
                            }}
                          >
                            💡 {item.notes}
                          </p>
                        </div>
                      )}

                      {/* Hover indicator */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cobalt-400 via-cobalt-500 to-cobalt-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        </>
      )}

      {/* Visuals Tab */}
      {activeTab === 'visuals' && (
        <>
          {/* Date Range Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setDateRange('7d')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                dateRange === '7d'
                  ? 'bg-yellow-500 text-white shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setDateRange('30d')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                dateRange === '30d'
                  ? 'bg-yellow-500 text-white shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setDateRange('90d')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                dateRange === '90d'
                  ? 'bg-yellow-500 text-white shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              90 Days
            </button>
          </div>

          {/* Chart 1: Daily Meal Quality */}
          <GlassCard>
            <h3
              className="text-lg font-semibold mb-4 flex items-center gap-2"
              style={{ color: 'var(--ink)' }}
            >
              <BarChart3 className="h-5 w-5" />
              Daily Meal Quality Score
            </h3>
            <div className="mb-2 flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }}></div>
                <span className="font-semibold" style={{ color: 'var(--ink)' }}>0 pts - All Bad</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
                <span className="font-semibold" style={{ color: 'var(--ink)' }}>1 pt - One Good</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
                <span className="font-semibold" style={{ color: 'var(--ink)' }}>2 pts - Two Good</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10b981' }}></div>
                <span className="font-semibold" style={{ color: 'var(--ink)' }}>3 pts - Perfect Day!</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyMealQualityData}>
                <defs>
                  {/* 3D Bar gradients for meal quality */}
                  <linearGradient id="mealBarGradientRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f87171" stopOpacity={1}/>
                    <stop offset="50%" stopColor="#ef4444" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#dc2626" stopOpacity={1}/>
                  </linearGradient>
                  <linearGradient id="mealBarGradientOrange" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={1}/>
                    <stop offset="50%" stopColor="#f59e0b" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#d97706" stopOpacity={1}/>
                  </linearGradient>
                  <linearGradient id="mealBarGradientBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={1}/>
                    <stop offset="50%" stopColor="#3b82f6" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={1}/>
                  </linearGradient>
                  <linearGradient id="mealBarGradientGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={1}/>
                    <stop offset="50%" stopColor="#10b981" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#059669" stopOpacity={1}/>
                  </linearGradient>
                  {/* 3D shadow filter */}
                  <filter id="mealBarShadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                    <feOffset dx="0" dy="4" result="offsetblur"/>
                    <feComponentTransfer>
                      <feFuncA type="linear" slope="0.5"/>
                    </feComponentTransfer>
                    <feMerge>
                      <feMergeNode/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }} tickLine={{ stroke: '#6b7280' }} />
                <YAxis stroke="#9ca3af" domain={[0, 3]} tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }} tickLine={{ stroke: '#6b7280' }} />
                <Tooltip
                  contentStyle={{
                    background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))',
                    border: '2px solid #10b981',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(16, 185, 129, 0.3)',
                    backdropFilter: 'blur(10px)'
                  }}
                  labelStyle={{ color: '#ffffff', fontWeight: 'bold', fontSize: '14px' }}
                  itemStyle={{ color: '#10b981', fontWeight: '700', fontSize: '15px' }}
                  cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                />
                <Bar dataKey="points" name="Daily Points" radius={[8, 8, 0, 0]} barSize={35} filter="url(#mealBarShadow)">
                  {dailyMealQualityData.map((entry, index) => {
                    const points = entry.points;
                    const gradientId = points === 3 ? 'mealBarGradientGreen' :
                                       points === 2 ? 'mealBarGradientBlue' :
                                       points === 1 ? 'mealBarGradientOrange' :
                                       'mealBarGradientRed';
                    return (
                      <Cell key={`cell-${index}`} fill={`url(#${gradientId})`} stroke={entry.fill} strokeWidth={2} />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Charts 2 & 3: Food Groups and Calories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 2: Food Group Distribution */}
            <GlassCard>
              <h3
                className="text-xl font-bold mb-4 flex items-center gap-2"
                style={{ color: 'var(--ink)' }}
              >
                <PieChartIcon className="h-6 w-6 text-emerald-400" />
                Food Group Distribution
              </h3>
              <div className="mb-3 text-sm font-medium" style={{ color: 'var(--ink)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg"></div>
                  <span>Outer Ring: Your Actual Intake</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 shadow-lg opacity-60"></div>
                  <span>Inner Circle: Recommended Daily Servings</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={650}>
                <PieChart>
                  <defs>
                    {/* Ultra 3D shadow with multiple layers for raised effect */}
                    <filter id="mealPieShadow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur in="SourceAlpha" stdDeviation="10"/>
                      <feOffset dx="0" dy="10" result="offsetblur"/>
                      <feComponentTransfer>
                        <feFuncA type="linear" slope="0.7"/>
                      </feComponentTransfer>
                      <feMerge>
                        <feMergeNode/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>

                    {/* Additional highlight for top edge to create raised appearance */}
                    <filter id="pieHighlight">
                      <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                      <feOffset dx="0" dy="-2" result="offsetblur"/>
                      <feFlood floodColor="#ffffff" floodOpacity="0.3"/>
                      <feComposite in2="offsetblur" operator="in"/>
                      <feMerge>
                        <feMergeNode/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>

                    {/* Radial gradients for each food group - creates 3D lighting effect */}
                    <radialGradient id="pieGradientVegetables" cx="30%" cy="30%">
                      <stop offset="0%" stopColor="#6ee7b7" stopOpacity={1}/>
                      <stop offset="50%" stopColor="#10b981" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#047857" stopOpacity={1}/>
                    </radialGradient>
                    <radialGradient id="pieGradientFruits" cx="30%" cy="30%">
                      <stop offset="0%" stopColor="#fca5a5" stopOpacity={1}/>
                      <stop offset="50%" stopColor="#ef4444" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#b91c1c" stopOpacity={1}/>
                    </radialGradient>
                    <radialGradient id="pieGradientGrains" cx="30%" cy="30%">
                      <stop offset="0%" stopColor="#c4b5fd" stopOpacity={1}/>
                      <stop offset="50%" stopColor="#8b5cf6" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#6b21a8" stopOpacity={1}/>
                    </radialGradient>
                    <radialGradient id="pieGradientProtein" cx="30%" cy="30%">
                      <stop offset="0%" stopColor="#fcd34d" stopOpacity={1}/>
                      <stop offset="50%" stopColor="#f59e0b" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#d97706" stopOpacity={1}/>
                    </radialGradient>
                    <radialGradient id="pieGradientDairy" cx="30%" cy="30%">
                      <stop offset="0%" stopColor="#93c5fd" stopOpacity={1}/>
                      <stop offset="50%" stopColor="#3b82f6" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#1e40af" stopOpacity={1}/>
                    </radialGradient>
                    <radialGradient id="pieGradientFats" cx="30%" cy="30%">
                      <stop offset="0%" stopColor="#c084fc" stopOpacity={1}/>
                      <stop offset="50%" stopColor="#a855f7" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#7e22ce" stopOpacity={1}/>
                    </radialGradient>
                    <radialGradient id="pieGradientOther" cx="30%" cy="30%">
                      <stop offset="0%" stopColor="#cbd5e1" stopOpacity={1}/>
                      <stop offset="50%" stopColor="#94a3b8" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#475569" stopOpacity={1}/>
                    </radialGradient>

                    {/* Bevel/Highlight effect for top of slices */}
                    <linearGradient id="pieBevelHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity={0.4}/>
                      <stop offset="50%" stopColor="#ffffff" stopOpacity={0.1}/>
                      <stop offset="100%" stopColor="#000000" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  {/* Recommended (inner circle) - with 3D gradients */}
                  <Pie
                    data={foodGroupRecommended}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={130}
                    fill="#8884d8"
                    dataKey="value"
                    strokeWidth={2}
                    stroke="#d1d5db"
                    paddingAngle={2}
                  >
                    {foodGroupRecommended.map((entry, index) => {
                      // Map food group name to gradient ID for 3D effect
                      const gradientId = entry.name.toLowerCase().includes('vegetable') ? 'pieGradientVegetables'
                        : entry.name.toLowerCase().includes('fruit') ? 'pieGradientFruits'
                        : entry.name.toLowerCase().includes('grain') ? 'pieGradientGrains'
                        : entry.name.toLowerCase().includes('protein') ? 'pieGradientProtein'
                        : entry.name.toLowerCase().includes('dairy') ? 'pieGradientDairy'
                        : entry.name.toLowerCase().includes('fat') || entry.name.toLowerCase().includes('oil') ? 'pieGradientFats'
                        : 'pieGradientOther';

                      return (
                        <Cell
                          key={`rec-${index}`}
                          fill={`url(#${gradientId})`}
                          stroke="#ffffff"
                          strokeWidth={4}
                          opacity={0.65}
                          style={{
                            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.7))'
                          }}
                        />
                      );
                    })}
                  </Pie>
                  {/* Actual (outer circle) - with enhanced styling */}
                  <Pie
                    data={foodGroupActual}
                    cx="50%"
                    cy="50%"
                    innerRadius={145}
                    outerRadius={220}
                    fill="#8884d8"
                    dataKey="value"
                    label={(props: any) => {
                      const { cx, cy, midAngle, innerRadius, outerRadius, name, percent } = props;
                      const RADIAN = Math.PI / 180;
                      const radius = (outerRadius as number) + 35;
                      const x = (cx as number) + radius * Math.cos(-(midAngle as number) * RADIAN);
                      const y = (cy as number) + radius * Math.sin(-(midAngle as number) * RADIAN);

                      return (
                        <text
                          x={x}
                          y={y}
                          fill="#ffffff"
                          textAnchor={x > (cx as number) ? 'start' : 'end'}
                          dominantBaseline="central"
                          style={{
                            fontSize: '14px',
                            fontWeight: '700',
                            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                            filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))'
                          }}
                        >
                          {`${name}`}
                          <tspan
                            x={x}
                            dy="1.2em"
                            style={{
                              fontSize: '16px',
                              fontWeight: '800',
                              fill: '#10b981'
                            }}
                          >
                            {`${((percent as number) * 100).toFixed(0)}%`}
                          </tspan>
                        </text>
                      );
                    }}
                    labelLine={{
                      stroke: '#d1d5db',
                      strokeWidth: 2,
                      strokeDasharray: '3 3'
                    }}
                    paddingAngle={4}
                    filter="url(#mealPieShadow)"
                  >
                    {foodGroupActual.map((entry, index) => {
                      // Map food group name to gradient ID for 3D effect
                      const gradientId = entry.name.toLowerCase().includes('vegetable') ? 'pieGradientVegetables'
                        : entry.name.toLowerCase().includes('fruit') ? 'pieGradientFruits'
                        : entry.name.toLowerCase().includes('grain') ? 'pieGradientGrains'
                        : entry.name.toLowerCase().includes('protein') ? 'pieGradientProtein'
                        : entry.name.toLowerCase().includes('dairy') ? 'pieGradientDairy'
                        : entry.name.toLowerCase().includes('fat') || entry.name.toLowerCase().includes('oil') ? 'pieGradientFats'
                        : 'pieGradientOther';

                      return (
                        <Cell
                          key={`act-${index}`}
                          fill={`url(#${gradientId})`}
                          stroke="#d1d5db"
                          strokeWidth={2}
                          style={{
                            filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5)) drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                          }}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(31, 41, 55, 0.98))',
                      border: '2px solid #10b981',
                      borderRadius: '16px',
                      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(16, 185, 129, 0.4)',
                      backdropFilter: 'blur(12px)',
                      padding: '12px 16px'
                    }}
                    labelStyle={{
                      color: '#ffffff',
                      fontWeight: '700',
                      fontSize: '15px',
                      marginBottom: '4px'
                    }}
                    itemStyle={{
                      color: '#10b981',
                      fontWeight: '600',
                      fontSize: '14px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </GlassCard>

            {/* Chart 3: Calorie Tracking */}
            <GlassCard>
              <h3
                className="text-lg font-semibold mb-4 flex items-center gap-2"
                style={{ color: 'var(--ink)' }}
              >
                <TrendingUp className="h-5 w-5" />
                Daily Calorie Tracking
              </h3>
              <div className="mb-2 flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="font-semibold" style={{ color: 'var(--ink)' }}>Your Calories</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="font-semibold" style={{ color: 'var(--ink)' }}>Recommended (2000 cal)</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={calorieData}>
                  <defs>
                    {/* Glow filter for lines */}
                    <filter id="mealLineGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }} tickLine={{ stroke: '#6b7280' }} />
                  <YAxis stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 600 }} tickLine={{ stroke: '#6b7280' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))',
                      border: '2px solid #10b981',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(16, 185, 129, 0.3)',
                      backdropFilter: 'blur(10px)'
                    }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}
                    cursor={{ fill: 'rgba(16, 185, 129, 0.1)', stroke: '#10b981', strokeWidth: 2 }}
                  />
                  <Legend iconType="circle" />
                  <Line
                    type="monotone"
                    dataKey="calories"
                    stroke="#3b82f6"
                    strokeWidth={4}
                    name="Your Calories"
                    dot={{ fill: '#3b82f6', r: 6, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 9, strokeWidth: 3 }}
                    filter="url(#mealLineGlow)"
                  />
                  <Line
                    type="monotone"
                    dataKey="average"
                    stroke="#ef4444"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    name="Recommended"
                    dot={{ fill: '#ef4444', r: 5, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8, strokeWidth: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </GlassCard>
          </div>

          {/* NEW: Chart 4: Macro Ratio Pie Chart */}
          <GlassCard>
            <h3
              className="text-xl font-bold mb-4 flex items-center gap-2"
              style={{ color: 'var(--ink)' }}
            >
              <PieChartIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />
              Macro Nutrient Breakdown
            </h3>
            <div className="mb-3 text-sm font-medium" style={{ color: 'var(--ink)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                <span>Protein</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                <span>Carbohydrates</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span>Fat</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    {
                      name: 'Protein',
                      value: dailyMealQualityData.reduce((sum, day) => {
                        // Assuming 4 cal/g for protein
                        return sum + (day.protein || 0);
                      }, 0),
                      color: '#3b82f6'
                    },
                    {
                      name: 'Carbs',
                      value: dailyMealQualityData.reduce((sum, day) => {
                        // Assuming 4 cal/g for carbs
                        return sum + (day.carbs || 0);
                      }, 0),
                      color: '#eab308'
                    },
                    {
                      name: 'Fat',
                      value: dailyMealQualityData.reduce((sum, day) => {
                        // Assuming 9 cal/g for fat
                        return sum + (day.fat || 0);
                      }, 0),
                      color: '#ef4444'
                    }
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {[
                    { color: '#3b82f6' },
                    { color: '#eab308' },
                    { color: '#ef4444' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Chart 5: Weight Tracking */}
          {selectedPatient && (
            <GlassCard>
              <h3
                className="text-lg font-semibold mb-4 flex items-center gap-2"
                style={{ color: 'var(--ink)' }}
              >
                <Scale className="h-5 w-5" />
                Weight Tracking Progress
              </h3>
              <WeightTrackingChart
                patient={selectedPatient}
                weightEntries={weightEntries}
                showTargetStar={true}
              />
            </GlassCard>
          )}

          {/* NEW: 8 Advanced Meal Visualizations */}
          {meals.length > 0 && (
            <>
              {/* 1. Radial Meal Adherence Clock & 4. Nutrient Target Radial Progress */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Radial Meal Adherence Clock */}
                <GlassCard>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-400" />
                    Meal Completion Rates
                  </h3>
                  <div className="flex items-center justify-center" style={{ minHeight: 220 }}>
                    <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
                      <svg className="absolute inset-0" width="200" height="200">
                        <defs>
                          <linearGradient id="breakfastGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fcd34d" />
                            <stop offset="50%" stopColor="#fbbf24" />
                            <stop offset="100%" stopColor="#f59e0b" />
                          </linearGradient>
                          <linearGradient id="lunchGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#60a5fa" />
                            <stop offset="50%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#2563eb" />
                          </linearGradient>
                          <linearGradient id="dinnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#c084fc" />
                            <stop offset="50%" stopColor="#a855f7" />
                            <stop offset="100%" stopColor="#9333ea" />
                          </linearGradient>
                          <filter id="mealRingGlow">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                            <feMerge>
                              <feMergeNode in="coloredBlur"/>
                              <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                          </filter>
                        </defs>
                        {/* Dinner ring (outermost) */}
                        <circle cx="100" cy="100" r="85" fill="none"
                                stroke="url(#dinnerGradient)"
                                strokeWidth="14"
                                strokeDasharray={`${2 * Math.PI * 85}`}
                                strokeDashoffset={`${2 * Math.PI * 85 * (1 - mealAdherenceData.dinner / 100)}`}
                                transform="rotate(-90 100 100)"
                                filter="url(#mealRingGlow)" />
                        {/* Lunch ring */}
                        <circle cx="100" cy="100" r="65" fill="none"
                                stroke="url(#lunchGradient)"
                                strokeWidth="12"
                                strokeDasharray={`${2 * Math.PI * 65}`}
                                strokeDashoffset={`${2 * Math.PI * 65 * (1 - mealAdherenceData.lunch / 100)}`}
                                transform="rotate(-90 100 100)"
                                filter="url(#mealRingGlow)" />
                        {/* Breakfast ring (innermost) */}
                        <circle cx="100" cy="100" r="47" fill="none"
                                stroke="url(#breakfastGradient)"
                                strokeWidth="10"
                                strokeDasharray={`${2 * Math.PI * 47}`}
                                strokeDashoffset={`${2 * Math.PI * 47 * (1 - mealAdherenceData.breakfast / 100)}`}
                                transform="rotate(-90 100 100)"
                                filter="url(#mealRingGlow)" />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <Trophy className="h-6 w-6 mb-1 text-yellow-400" />
                        <div className="text-xl font-bold text-white">{mealAdherenceData.totalDays}</div>
                        <div className="text-xs text-white opacity-70">days</div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mb-1"></div>
                      <span className="text-white font-semibold">Breakfast</span>
                      <span className="text-white opacity-70">{Math.round(mealAdherenceData.breakfast)}%</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 mb-1"></div>
                      <span className="text-white font-semibold">Lunch</span>
                      <span className="text-white opacity-70">{Math.round(mealAdherenceData.lunch)}%</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 mb-1"></div>
                      <span className="text-white font-semibold">Dinner</span>
                      <span className="text-white opacity-70">{Math.round(mealAdherenceData.dinner)}%</span>
                    </div>
                  </div>
                </GlassCard>

                {/* Nutrient Target Radial Progress */}
                <GlassCard>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-400" />
                    Nutrient Goals
                  </h3>
                  <div className="space-y-4">
                    {/* Sodium */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white font-semibold">Sodium ≤2300mg</span>
                        <span className="text-white">{Math.round(nutrientTargets.sodium)}%</span>
                      </div>
                      <div className="relative h-4 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                        <div className="absolute inset-0 h-full rounded-full bg-gradient-to-r from-red-400 to-red-600"
                             style={{ width: `${nutrientTargets.sodium}%`, boxShadow: '0 2px 8px rgba(239, 68, 68, 0.5)' }}></div>
                      </div>
                    </div>
                    {/* Cholesterol */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white font-semibold">Cholesterol ≤300mg</span>
                        <span className="text-white">{Math.round(nutrientTargets.cholesterol)}%</span>
                      </div>
                      <div className="relative h-4 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                        <div className="absolute inset-0 h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600"
                             style={{ width: `${nutrientTargets.cholesterol}%`, boxShadow: '0 2px 8px rgba(251, 146, 60, 0.5)' }}></div>
                      </div>
                    </div>
                    {/* Fiber */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white font-semibold">Fiber ≥25g</span>
                        <span className="text-white">{Math.round(nutrientTargets.fiber)}%</span>
                      </div>
                      <div className="relative h-4 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                        <div className="absolute inset-0 h-full rounded-full bg-gradient-to-r from-green-400 to-green-600"
                             style={{ width: `${nutrientTargets.fiber}%`, boxShadow: '0 2px 8px rgba(34, 197, 94, 0.5)' }}></div>
                      </div>
                    </div>
                    {/* Protein */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white font-semibold">Protein ≥50g</span>
                        <span className="text-white">{Math.round(nutrientTargets.protein)}%</span>
                      </div>
                      <div className="relative h-4 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                        <div className="absolute inset-0 h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                             style={{ width: `${nutrientTargets.protein}%`, boxShadow: '0 2px 8px rgba(59, 130, 246, 0.5)' }}></div>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </div>

              {/* 2. Monthly Meal Heatmap Calendar */}
              <GlassCard>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-400" />
                  Monthly Meal Quality Heatmap
                </h3>
                <div className="grid grid-cols-7 gap-1">
                  {heatmapMealData.map((day) => {
                    const bgColor = day.points === 3 ? 'bg-gradient-to-br from-green-400 to-green-600' :
                                    day.points === 2 ? 'bg-gradient-to-br from-blue-400 to-blue-600' :
                                    day.points === 1 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                                    day.mealsCount > 0 ? 'bg-gradient-to-br from-red-400 to-red-600' :
                                    'bg-gray-800';
                    const opacity = day.mealsCount === 0 ? 0.2 : 1;
                    return (
                      <div key={day.day}
                           className={`${bgColor} rounded-lg p-2 text-center transition-all duration-300 hover:scale-110 hover:shadow-lg`}
                           style={{ opacity }}
                           title={`${day.date}: ${day.points} pts (${day.mealsCount} meals)`}>
                        <div className="text-xs font-bold text-white opacity-70">{day.dayOfWeek}</div>
                        <div className="text-lg font-bold text-white">{day.day}</div>
                        {day.mealsCount > 0 && <div className="text-xs text-white opacity-90">{day.points}pt</div>}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center mt-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gradient-to-br from-green-400 to-green-600"></div>
                    <span className="text-white opacity-70">Perfect (3)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-400 to-blue-600"></div>
                    <span className="text-white opacity-70">Good (2)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gradient-to-br from-orange-400 to-orange-600"></div>
                    <span className="text-white opacity-70">Fair (1)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gradient-to-br from-red-400 to-red-600"></div>
                    <span className="text-white opacity-70">Poor (0)</span>
                  </div>
                </div>
              </GlassCard>

              {/* 3. Sodium Tracking Wave Chart */}
              {sodiumWaveData.length > 0 && (
                <GlassCard>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-red-400" />
                    Daily Sodium Intake
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={sodiumWaveData}>
                      <defs>
                        <linearGradient id="sodiumGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8}/>
                          <stop offset="50%" stopColor="#ef4444" stopOpacity={0.6}/>
                          <stop offset="100%" stopColor="#dc2626" stopOpacity={0.3}/>
                        </linearGradient>
                        <filter id="sodiumShadow">
                          <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                          <feOffset dx="0" dy="3" result="offsetblur"/>
                          <feComponentTransfer>
                            <feFuncA type="linear" slope="0.4"/>
                          </feComponentTransfer>
                          <feMerge>
                            <feMergeNode/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                      <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 11 }} />
                      <YAxis stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 11 }}
                             label={{ value: 'Sodium (mg)', angle: -90, position: 'insideLeft', fill: '#d1d5db', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))',
                          border: '2px solid #ef4444',
                          borderRadius: '12px',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                          backdropFilter: 'blur(10px)'
                        }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                      />
                      <ReferenceLine y={2300} stroke="#10b981" strokeDasharray="3 3" strokeWidth={2}
                                     label={{ value: 'Limit: 2300mg', fill: '#10b981', fontSize: 12 }} />
                      <Area type="monotone" dataKey="sodium" stroke="#ef4444" strokeWidth={3}
                            fill="url(#sodiumGradient)" filter="url(#sodiumShadow)" />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="text-xs text-center text-white opacity-70 mt-2">
                    Daily limit: 2300mg sodium (American Heart Association)
                  </div>
                </GlassCard>
              )}

              {/* 5. Meal Timing Scatter Plot */}
              {mealTimingData.length > 0 && (
                <GlassCard>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-cyan-400" />
                    Meal Timing Patterns
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <ScatterChart>
                      <defs>
                        <linearGradient id="breakfastScatter" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.8}/>
                        </linearGradient>
                        <linearGradient id="lunchScatter" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        </linearGradient>
                        <linearGradient id="dinnerScatter" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                        </linearGradient>
                        <filter id="scatterMealGlow">
                          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                      <XAxis type="number" dataKey="hour" domain={[0, 24]} ticks={[0, 6, 12, 18, 24]}
                             tickFormatter={(value) => `${value}:00`}
                             stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 11 }}
                             label={{ value: 'Time of Day', position: 'insideBottom', offset: -5, fill: '#d1d5db', fontSize: 12 }} />
                      <YAxis type="number" domain={[0, 1000]}
                             stroke="#9ca3af" tick={{ fill: '#d1d5db', fontSize: 11 }}
                             label={{ value: 'Calories', angle: -90, position: 'insideLeft', fill: '#d1d5db', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98))',
                          border: '2px solid #60a5fa',
                          borderRadius: '12px',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                          backdropFilter: 'blur(10px)'
                        }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                      />
                      <Scatter name="Meals" data={mealTimingData} fill="#60a5fa" filter="url(#scatterMealGlow)" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </GlassCard>
              )}

              {/* 6. Meal Streak Flame Meter */}
              <GlassCard>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  Good Eating Streak
                </h3>
                <div className="flex items-center justify-center py-6">
                  <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
                    <svg className="absolute inset-0" width="160" height="160">
                      <defs>
                        <linearGradient id="mealStreakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor={currentMealStreak >= 30 ? '#fbbf24' : currentMealStreak >= 14 ? '#f59e0b' : currentMealStreak >= 7 ? '#f97316' : '#6b7280'} />
                          <stop offset="100%" stopColor={currentMealStreak >= 30 ? '#d97706' : currentMealStreak >= 14 ? '#ea580c' : currentMealStreak >= 7 ? '#dc2626' : '#374151'} />
                        </linearGradient>
                        <filter id="mealStreakGlow">
                          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
                      <circle cx="80" cy="80" r="70" fill="none"
                              stroke="url(#mealStreakGradient)"
                              strokeWidth="10"
                              strokeLinecap="round"
                              strokeDasharray={`${2 * Math.PI * 70}`}
                              strokeDashoffset={`${2 * Math.PI * 70 * (1 - Math.min(currentMealStreak / 30, 1))}`}
                              transform="rotate(-90 80 80)"
                              filter="url(#mealStreakGlow)" />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <Flame className={`h-8 w-8 mb-1 ${currentMealStreak >= 7 ? 'text-orange-500 animate-pulse' : 'text-gray-400'}`} />
                      <div className="text-3xl font-bold text-white">{currentMealStreak}</div>
                      <div className="text-xs text-white opacity-70">{currentMealStreak === 1 ? 'day' : 'days'}</div>
                    </div>
                  </div>
                </div>
                <div className="text-center text-xs text-white opacity-70">
                  {currentMealStreak >= 30 ? '🏆 Nutrition Master!' :
                   currentMealStreak >= 14 ? '🔥 On Fire!' :
                   currentMealStreak >= 7 ? '💪 Keep Going!' :
                   '🍽️ Start your streak!'}
                </div>
              </GlassCard>

              {/* 7. Weekly Meal Pattern Timeline */}
              {weeklyPatternData.length > 0 && (
                <GlassCard>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-400" />
                    Weekly Meal Pattern
                  </h3>
                  <div className="space-y-2">
                    {weeklyPatternData.map((day, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="text-xs text-white opacity-70 w-20">{day.date}</div>
                        <div className="flex-1 relative h-8 rounded-lg overflow-hidden"
                             style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div className="absolute inset-0 flex gap-1 p-1">
                            {/* Breakfast */}
                            {day.breakfast > 0 && (
                              <div className="h-full rounded bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center"
                                   style={{ width: '30%', boxShadow: '0 2px 8px rgba(251, 191, 36, 0.3)' }}>
                                <span className="text-xs font-bold text-white">B: {day.breakfast}</span>
                              </div>
                            )}
                            {/* Lunch */}
                            {day.lunch > 0 && (
                              <div className="h-full rounded bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center"
                                   style={{ width: '30%', boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)' }}>
                                <span className="text-xs font-bold text-white">L: {day.lunch}</span>
                              </div>
                            )}
                            {/* Dinner */}
                            {day.dinner > 0 && (
                              <div className="h-full rounded bg-gradient-to-r from-purple-400 to-purple-600 flex items-center justify-center"
                                   style={{ width: '30%', boxShadow: '0 2px 8px rgba(168, 85, 247, 0.3)' }}>
                                <span className="text-xs font-bold text-white">D: {day.dinner}</span>
                              </div>
                            )}
                            {/* Snacks */}
                            {day.snacks > 0 && (
                              <div className="h-full rounded bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center"
                                   style={{ width: '10%', boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)' }}>
                                <span className="text-xs font-bold text-white">{day.snacks}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-white opacity-70 w-16">{day.points}pts</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-4 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-gradient-to-r from-yellow-400 to-yellow-600"></div>
                      <span className="text-white opacity-70">Breakfast</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-gradient-to-r from-blue-400 to-blue-600"></div>
                      <span className="text-white opacity-70">Lunch</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-gradient-to-r from-purple-400 to-purple-600"></div>
                      <span className="text-white opacity-70">Dinner</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-gradient-to-r from-green-400 to-green-600"></div>
                      <span className="text-white opacity-70">Snacks</span>
                    </div>
                  </div>
                </GlassCard>
              )}

              {/* 8. 3D Meal Quality Pyramid */}
              <GlassCard>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                  Meal Quality Pyramid
                </h3>
                <div className="flex flex-col items-center justify-center py-6 space-y-2">
                  {pyramidMealData.map((level, index) => {
                    const width = 60 + (pyramidMealData.length - index) * 40;
                    const height = 40;
                    return (
                      <div key={index}
                           className="relative transition-all duration-300 hover:scale-105"
                           style={{ width: `${width}px` }}>
                        <div className={`${level.gradient} rounded-lg shadow-lg border-2 ${level.border} flex items-center justify-center`}
                             style={{
                               height: `${height}px`,
                               boxShadow: `0 4px 16px ${level.color}40, inset 0 2px 8px rgba(255,255,255,0.1)`
                             }}>
                          <div className="text-center">
                            <div className="text-xl font-bold text-white">{level.count}</div>
                            <div className="text-xs text-white opacity-90">{level.label}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-center text-xs text-white opacity-70 mt-2">
                  Distribution of meal quality across all logged days
                </div>
              </GlassCard>
            </>
          )}
        </>
      )}

      {/* Add to Meal Dialog */}
      {showAddDialog && selectedFood && (
        <AddToMealDialog
          foodItem={selectedFood}
          onClose={() => {
            setShowAddDialog(false);
            setSelectedFood(null);
          }}
          onAdd={handleAddToMeal}
        />
      )}
    </div>
  );
}
