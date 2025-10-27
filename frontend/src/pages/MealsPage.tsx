import React, { useState, useEffect } from 'react';
import { GlassCard, Input } from '../components/ui';
import { UtensilsCrossed, Search, TrendingUp, Filter, Heart, Plus, User, Trophy, Award, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { api } from '../services/api';
import { FoodCategory, FoodItem, FoodStats, MealEntry } from '../types';
import { AddToMealDialog } from '../components/AddToMealDialog';
import { useAuth } from '../contexts/AuthContext';
import { usePatientSelection } from '../contexts/PatientSelectionContext';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, parseISO, getDaysInMonth, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

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
      const userId = isViewingAsTherapist && selectedPatient?.userId ? selectedPatient.userId : undefined;

      const data = await api.getMeals({
        startDate,
        endDate,
        ...(userId && { userId })
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search foods..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-cobalt-500 focus:ring-2 focus:ring-cobalt-200 outline-none transition-all"
                />
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedCategory === null
                      ? 'bg-cobalt-500 text-white shadow-lg'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-cobalt-300'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      selectedCategory === category.id
                        ? 'bg-cobalt-500 text-white shadow-lg'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-cobalt-300'
                    }`}
                  >
                    {category.icon} {category.name}
                  </button>
                ))}
              </div>

              {/* Health Rating Filter */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedHealthRating(null)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedHealthRating === null
                      ? 'bg-gray-700 text-white shadow-lg'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
                  }`}
                >
                  All Ratings
                </button>
                <button
                  onClick={() => setSelectedHealthRating('green')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedHealthRating === 'green'
                      ? 'bg-green-600 text-white shadow-lg'
                      : 'bg-white text-green-700 border border-green-300 hover:border-green-400'
                  }`}
                >
                  💚 Heart-Healthy
                </button>
                <button
                  onClick={() => setSelectedHealthRating('yellow')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedHealthRating === 'yellow'
                      ? 'bg-yellow-600 text-white shadow-lg'
                      : 'bg-white text-yellow-700 border border-yellow-300 hover:border-yellow-400'
                  }`}
                >
                  💛 Moderation
                </button>
                <button
                  onClick={() => setSelectedHealthRating('red')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedHealthRating === 'red'
                      ? 'bg-red-600 text-white shadow-lg'
                      : 'bg-white text-red-700 border border-red-300 hover:border-red-400'
                  }`}
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
                <p className="mt-4 text-gray-600">Loading foods...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-600">Error: {error}</p>
              </div>
            ) : foodItems.length === 0 ? (
              <div className="text-center py-12">
                <UtensilsCrossed className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No foods found matching your criteria.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold" style={{ color: '#22c55e' }}>
                    Found {foodItems.length} food{foodItems.length !== 1 ? 's' : ''}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {foodItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleFoodClick(item)}
                      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg hover:border-cobalt-300 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-800">{item.name}</h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${getHealthRatingColor(
                            item.healthRating
                          )}`}
                        >
                          {getHealthRatingLabel(item.healthRating)}
                        </span>
                      </div>

                      {item.category && (
                        <div className="text-sm text-gray-600 mb-3">
                          {item.category.icon} {item.category.name}
                        </div>
                      )}

                      {item.servingSize && (
                        <div className="text-sm text-gray-500 mb-2">Serving: {item.servingSize}</div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-3 pt-3 border-t border-gray-100">
                        {item.calories !== undefined && <div>Cal: {item.calories}</div>}
                        {item.protein !== undefined && <div>Protein: {item.protein}g</div>}
                        {item.carbs !== undefined && <div>Carbs: {item.carbs}g</div>}
                        {item.fat !== undefined && <div>Fat: {item.fat}g</div>}
                        {item.fiber !== undefined && <div>Fiber: {item.fiber}g</div>}
                        {item.sugar !== undefined && <div>Sugar: {item.sugar}g</div>}
                        {item.sodium !== undefined && <div>Sodium: {item.sodium}mg</div>}
                      </div>

                      {item.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-600 italic">{item.notes}</p>
                        </div>
                      )}
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
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Daily Meal Quality Score
            </h3>
            <div className="mb-2 flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }}></div>
                <span className="text-white font-semibold">0 pts - All Bad</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
                <span className="text-white font-semibold">1 pt - One Good</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
                <span className="text-white font-semibold">2 pts - Two Good</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10b981' }}></div>
                <span className="text-white font-semibold">3 pts - Perfect Day!</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyMealQualityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" domain={[0, 3]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Bar dataKey="points" name="Daily Points" radius={[8, 8, 0, 0]}>
                  {dailyMealQualityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Charts 2 & 3: Food Groups and Calories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 2: Food Group Distribution */}
            <GlassCard>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Food Group Distribution
              </h3>
              <div className="mb-2 text-xs text-white/80">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>Outer: Your Actual Intake</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-white/40"></div>
                  <span>Inner: Recommended Servings</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  {/* Recommended (inner circle) */}
                  <Pie
                    data={foodGroupRecommended}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                    opacity={0.4}
                  >
                    {foodGroupRecommended.map((entry, index) => (
                      <Cell key={`rec-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  {/* Actual (outer circle) */}
                  <Pie
                    data={foodGroupActual}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {foodGroupActual.map((entry, index) => (
                      <Cell key={`act-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </GlassCard>

            {/* Chart 3: Calorie Tracking */}
            <GlassCard>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Daily Calorie Tracking
              </h3>
              <div className="mb-2 flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-white font-semibold">Your Calories</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-white font-semibold">Recommended (2000 cal)</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={calorieData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="calories" stroke="#3b82f6" strokeWidth={3} name="Your Calories" dot={{ fill: '#3b82f6', r: 4 }} />
                  <Line type="monotone" dataKey="average" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" name="Recommended" />
                </LineChart>
              </ResponsiveContainer>
            </GlassCard>
          </div>
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
