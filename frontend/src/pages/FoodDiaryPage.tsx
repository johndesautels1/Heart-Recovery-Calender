import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/ui';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Copy, Plus, Edit, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { MealEntry } from '../types';
import { AddToMealDialog } from '../components/AddToMealDialog';

export function FoodDiaryPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyToDate, setCopyToDate] = useState('');
  const [currentMealType, setCurrentMealType] = useState<string>('breakfast');
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null);

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
    notes: '',
    isUnhealthy: false,
    satisfactionRating: 0, // NEW: 0 = not rated, 1-5 = star rating
  });

  useEffect(() => {
    loadMeals();
  }, [selectedDate]);

  const loadMeals = async () => {
    try {
      setLoading(true);
      const data = await api.getMeals({ startDate: selectedDate, endDate: selectedDate });
      setMeals(data);
    } catch (error) {
      console.error('Error loading meals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
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
        notes: '',
        isUnhealthy: false,
        satisfactionRating: 0,
      });

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
        notes: '',
        isUnhealthy: false,
        satisfactionRating: 0,
      });

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

  const totals = getTotalNutrition();

  const mealSections = [
    { type: 'breakfast', label: 'Breakfast', icon: '🍳' },
    { type: 'lunch', label: 'Lunch', icon: '🥗' },
    { type: 'dinner', label: 'Dinner', icon: '🍽️' },
    { type: 'snack', label: 'Snacks', icon: '🍿' },
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
            <h2 className="text-2xl font-bold" style={{ color: '#ff9500' }}>{formatDate(selectedDate)}</h2>
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
      </GlassCard>

      {/* Daily Totals */}
      <GlassCard>
        <h3 className="text-lg font-bold text-bright mb-4" style={{ color: 'var(--ink-bright)' }}>Daily Totals</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-cobalt-600">{totals.calories}</div>
            <div className="text-sm font-bold text-gold" style={{ color: 'var(--ink-gold)' }}>Calories</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totals.protein}g</div>
            <div className="text-sm font-bold text-gold" style={{ color: 'var(--ink-gold)' }}>Protein</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{totals.carbs}g</div>
            <div className="text-sm font-bold text-gold" style={{ color: 'var(--ink-gold)' }}>Carbs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{totals.fat}g</div>
            <div className="text-sm font-bold text-gold" style={{ color: 'var(--ink-gold)' }}>Fat</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{totals.sodium}mg</div>
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
            <p className="text-3xl font-bold" style={{ color: '#22c55e' }}>{totals.fiber}g</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Recommended: 25-30g daily</p>
          </div>
          <div className={`text-xs font-bold px-4 py-2 rounded-full ${
            totals.fiber >= 25 ? 'bg-green-500 text-white' :
            totals.fiber >= 15 ? 'bg-yellow-500 text-black' :
            'bg-red-500 text-white'
          }`}>
            {totals.fiber >= 25 ? '✓ Great!' :
             totals.fiber >= 15 ? 'Good' :
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
                  const PROTEIN_GOAL = 60; // 60g daily goal for heart health
                  const percentage = (totals.protein / PROTEIN_GOAL) * 100;
                  if (percentage >= 100) return 'bg-green-500';
                  if (percentage >= 75) return 'bg-yellow-500';
                  return 'bg-red-500';
                })()}`}
                style={{ width: `${Math.min((totals.protein / 60) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
              Goal: 60g daily for heart health
            </p>
          </div>
          <div className="ml-4 text-right">
            <p className="text-3xl font-bold" style={{ color: (() => {
              const PROTEIN_GOAL = 60;
              const percentage = (totals.protein / PROTEIN_GOAL) * 100;
              if (percentage >= 100) return '#22c55e';
              if (percentage >= 75) return '#eab308';
              return '#ef4444';
            })() }}>
              {Math.round((totals.protein / 60) * 100)}%
            </p>
            <p className={`text-xs font-bold px-3 py-1 rounded-full mt-1 ${(() => {
              const PROTEIN_GOAL = 60;
              const percentage = (totals.protein / PROTEIN_GOAL) * 100;
              if (percentage >= 100) return 'bg-green-500 text-white';
              if (percentage >= 75) return 'bg-yellow-500 text-black';
              return 'bg-red-500 text-white';
            })()}`}>
              {(() => {
                const PROTEIN_GOAL = 60;
                const percentage = (totals.protein / PROTEIN_GOAL) * 100;
                if (percentage >= 100) return 'Goal Met!';
                if (percentage >= 75) return 'Almost There';
                return 'Needs More';
              })()}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
              {totals.protein}g / 60g
            </p>
          </div>
        </div>
      </GlassCard>

      {/* NEW: Calories vs Daily Goal */}
      <GlassCard>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-bold mb-2" style={{ color: 'var(--muted)' }}>Calories vs Daily Goal</p>
            <div className="w-full bg-gray-700 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all ${(() => {
                  const CALORIE_GOAL = 2000; // 2000 cal daily goal
                  const percentage = (totals.calories / CALORIE_GOAL) * 100;
                  if (percentage >= 90 && percentage <= 110) return 'bg-green-500';
                  if (percentage >= 75 && percentage < 130) return 'bg-yellow-500';
                  return 'bg-red-500';
                })()}`}
                style={{ width: `${Math.min((totals.calories / 2000) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
              Target: 2000 calories daily
            </p>
          </div>
          <div className="ml-4 text-right">
            <p className="text-3xl font-bold" style={{ color: (() => {
              const CALORIE_GOAL = 2000;
              const percentage = (totals.calories / CALORIE_GOAL) * 100;
              if (percentage >= 90 && percentage <= 110) return '#22c55e';
              if (percentage >= 75 && percentage < 130) return '#eab308';
              return '#ef4444';
            })() }}>
              {totals.calories}
            </p>
            <p className={`text-xs font-bold px-3 py-1 rounded-full mt-1 ${(() => {
              const CALORIE_GOAL = 2000;
              const percentage = (totals.calories / CALORIE_GOAL) * 100;
              if (percentage >= 90 && percentage <= 110) return 'bg-green-500 text-white';
              if (percentage >= 75 && percentage < 130) return 'bg-yellow-500 text-black';
              return 'bg-red-500 text-white';
            })()}`}>
              {(() => {
                const CALORIE_GOAL = 2000;
                const percentage = (totals.calories / CALORIE_GOAL) * 100;
                if (percentage >= 90 && percentage <= 110) return 'On Target';
                if (percentage < 75) return 'Too Low';
                if (percentage >= 130) return 'Too High';
                return 'Close';
              })()}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
              {Math.round((totals.calories / 2000) * 100)}% of goal
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
            <p className="text-sm font-bold mb-2" style={{ color: 'var(--muted)' }}>Sodium Intake vs Daily Limit</p>
            <div className="w-full bg-gray-700 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all ${
                  totals.sodium <= 1500 ? 'bg-green-500' :
                  totals.sodium <= 2300 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${Math.min((totals.sodium / 2300) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
              Limit: 2300mg daily (1500mg ideal for heart patients)
            </p>
          </div>
          <div className="ml-4 text-right">
            <p className="text-3xl font-bold" style={{ color: totals.sodium <= 1500 ? '#22c55e' : totals.sodium <= 2300 ? '#eab308' : '#ef4444' }}>
              {totals.sodium}mg
            </p>
            <p className={`text-xs font-bold px-3 py-1 rounded-full mt-1 ${
              totals.sodium <= 1500 ? 'bg-green-500 text-white' :
              totals.sodium <= 2300 ? 'bg-yellow-500 text-black' :
              'bg-red-500 text-white'
            }`}>
              {totals.sodium <= 1500 ? 'Excellent' :
               totals.sodium <= 2300 ? 'Within Limit' :
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
            </div>

            {loading ? (
              <div className="text-center py-8" style={{ color: 'var(--muted)' }}>Loading...</div>
            ) : sectionMeals.length === 0 ? (
              <div className="text-center py-8" style={{ color: 'var(--muted)' }}>
                No {section.label.toLowerCase()} recorded for this day
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
                        </div>
                      </div>

                      <div
                        className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs mt-2"
                        style={{ color: 'var(--muted)' }}
                      >
                        {meal.calories !== null && <div>Cal: {meal.calories}</div>}
                        {meal.protein !== null && <div>Protein: {meal.protein}g</div>}
                        {meal.carbohydrates !== null && <div>Carbs: {meal.carbohydrates}g</div>}
                        {meal.totalFat !== null && <div>Fat: {meal.totalFat}g</div>}
                        {meal.sodium !== null && <div>Sodium: {meal.sodium}mg</div>}
                        {meal.fiber !== null && <div>Fiber: {meal.fiber}g</div>}
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
      {meals.length > 0 && (
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#ff9500' }}>
              {editingMeal ? 'Edit' : 'Add'} {currentMealType.charAt(0).toUpperCase() + currentMealType.slice(1)}
            </h2>

            <div className="space-y-4">
              {/* Food Item Name */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: '#1a1a1a' }}>
                  Food Item(s) *
                </label>
                <input
                  type="text"
                  value={newMeal.foodItems}
                  onChange={(e) => setNewMeal({ ...newMeal, foodItems: e.target.value })}
                  placeholder="e.g., Grilled Chicken Breast, Brown Rice, Steamed Broccoli"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cobalt-500 focus:border-cobalt-500 outline-none font-semibold"
                  style={{ color: '#1a1a1a' }}
                />
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: '#1a1a1a' }}>
                  Time
                </label>
                <input
                  type="time"
                  value={newMeal.time}
                  onChange={(e) => setNewMeal({ ...newMeal, time: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cobalt-500 focus:border-cobalt-500 outline-none font-bold"
                  style={{ color: '#1a1a1a' }}
                />
              </div>

              {/* Unhealthy Food Checkbox */}
              <div className="flex items-center gap-3 p-3 bg-red-50 border-2 border-red-200 rounded-lg">
                <input
                  type="checkbox"
                  id="unhealthy"
                  checked={newMeal.isUnhealthy}
                  onChange={(e) => setNewMeal({ ...newMeal, isUnhealthy: e.target.checked })}
                  className="w-5 h-5 text-red-600 focus:ring-red-500"
                />
                <label htmlFor="unhealthy" className="font-bold text-red-700 cursor-pointer">
                  ⚠️ This is an unhealthy food (heart patient should avoid)
                </label>
              </div>

              {/* Nutrition Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#1a1a1a' }}>
                    Calories
                  </label>
                  <input
                    type="number"
                    value={newMeal.calories}
                    onChange={(e) => setNewMeal({ ...newMeal, calories: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cobalt-500 outline-none"
                    style={{ color: '#1a1a1a' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#1a1a1a' }}>
                    Sodium (mg)
                  </label>
                  <input
                    type="number"
                    value={newMeal.sodium}
                    onChange={(e) => setNewMeal({ ...newMeal, sodium: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cobalt-500 outline-none"
                    style={{ color: '#1a1a1a' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#1a1a1a' }}>
                    Protein (g)
                  </label>
                  <input
                    type="number"
                    value={newMeal.protein}
                    onChange={(e) => setNewMeal({ ...newMeal, protein: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cobalt-500 outline-none"
                    style={{ color: '#1a1a1a' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#1a1a1a' }}>
                    Carbs (g)
                  </label>
                  <input
                    type="number"
                    value={newMeal.carbs}
                    onChange={(e) => setNewMeal({ ...newMeal, carbs: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cobalt-500 outline-none"
                    style={{ color: '#1a1a1a' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#1a1a1a' }}>
                    Fat (g)
                  </label>
                  <input
                    type="number"
                    value={newMeal.fat}
                    onChange={(e) => setNewMeal({ ...newMeal, fat: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cobalt-500 outline-none"
                    style={{ color: '#1a1a1a' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#1a1a1a' }}>
                    Fiber (g)
                  </label>
                  <input
                    type="number"
                    value={newMeal.fiber}
                    onChange={(e) => setNewMeal({ ...newMeal, fiber: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cobalt-500 outline-none"
                    style={{ color: '#1a1a1a' }}
                  />
                </div>
              </div>

              {/* NEW: Satisfaction Rating */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: '#1a1a1a' }}>
                  Satisfaction Rating (Optional)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewMeal({ ...newMeal, satisfactionRating: star })}
                      className="text-3xl transition-transform hover:scale-110"
                    >
                      <span className={star <= newMeal.satisfactionRating ? 'text-yellow-400' : 'text-gray-300'}>
                        ⭐
                      </span>
                    </button>
                  ))}
                  {newMeal.satisfactionRating > 0 && (
                    <button
                      type="button"
                      onClick={() => setNewMeal({ ...newMeal, satisfactionRating: 0 })}
                      className="ml-2 text-xs font-bold text-red-600 hover:text-red-700 underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
                  How satisfying was this meal?
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: '#1a1a1a' }}>
                  Notes (Optional)
                </label>
                <textarea
                  value={newMeal.notes}
                  onChange={(e) => setNewMeal({ ...newMeal, notes: e.target.value })}
                  placeholder="Add any additional notes..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cobalt-500 focus:border-cobalt-500 outline-none"
                  style={{ color: '#1a1a1a' }}
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
                    notes: '',
                    isUnhealthy: false,
                    satisfactionRating: 0,
                  });
                }}
                className="flex-1 px-4 py-3 border border-gray-300 font-bold rounded-lg hover:bg-gray-50 transition-colors"
                style={{ color: '#dc2626' }}
              >
                Cancel
              </button>
              <button
                onClick={editingMeal ? handleUpdateMeal : handleAddMeal}
                disabled={!newMeal.foodItems.trim() || loading}
                className="flex-1 px-4 py-3 bg-cobalt-500 font-bold rounded-lg hover:bg-cobalt-600 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ color: '#22c55e' }}
              >
                {loading ? (editingMeal ? 'Updating...' : 'Adding...') : (editingMeal ? 'Update Meal' : 'Add Meal')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
