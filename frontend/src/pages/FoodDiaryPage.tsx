import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/ui';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Copy, Plus } from 'lucide-react';
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
      carbs: (totals.carbohydrates || 0) + (meal.carbohydrates || 0),
      fat: (totals.totalFat || 0) + (meal.totalFat || 0),
    }), { calories: 0, sodium: 0, protein: 0, carbs: 0, fat: 0 });
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
        <h1 className="text-3xl font-bold" style={{ color: 'var(--ink)' }}>Food Diary</h1>
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-cobalt-600" />
          <span className="text-sm font-semibold" style={{ color: 'var(--ink-gold)' }}>Daily Meal Tracker</span>
        </div>
      </div>

      {/* Date Navigator */}
      <GlassCard>
        <div className="flex items-center justify-between">
          <button
            onClick={handlePreviousDay}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </button>

          <div className="flex-1 text-center">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--ink-bright)' }}>{formatDate(selectedDate)}</h2>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cobalt-500 focus:border-cobalt-500 outline-none"
            />
          </div>

          <button
            onClick={handleNextDay}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="h-6 w-6 text-gray-600" />
          </button>
        </div>
      </GlassCard>

      {/* Daily Totals */}
      <GlassCard>
        <h3 className="text-lg font-bold text-bright mb-4" style={{ color: 'var(--ink-bright)' }}>Daily Totals</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                onClick={() => setShowAddDialog(true)}
                className="px-4 py-2 bg-cobalt-500 text-white font-bold rounded-lg hover:bg-cobalt-600 transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : sectionMeals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No {section.label.toLowerCase()} recorded for this day
              </div>
            ) : (
              <div className="space-y-3">
                {sectionMeals.map((meal) => (
                  <div
                    key={meal.id}
                    className="bg-white rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{meal.foodItems}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(meal.timestamp).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      {meal.withinSpec !== null && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          meal.withinSpec
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {meal.withinSpec ? '✓ Within Goals' : '⚠ Over Limit'}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs text-gray-600 mt-2">
                      {meal.calories !== null && <div>Cal: {meal.calories}</div>}
                      {meal.protein !== null && <div>Protein: {meal.protein}g</div>}
                      {meal.carbohydrates !== null && <div>Carbs: {meal.carbohydrates}g</div>}
                      {meal.totalFat !== null && <div>Fat: {meal.totalFat}g</div>}
                      {meal.sodium !== null && <div>Sodium: {meal.sodium}mg</div>}
                      {meal.fiber !== null && <div>Fiber: {meal.fiber}g</div>}
                    </div>

                    {meal.notes && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-sm text-gray-600 italic">{meal.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
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
            className="w-full px-6 py-4 bg-gradient-to-r from-cobalt-500 to-sky-500 text-white font-bold rounded-lg hover:from-cobalt-600 hover:to-sky-600 transition-all flex items-center justify-center gap-2 shadow-lg"
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
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Copy Meals to Another Day</h2>

            <p className="text-gray-600 mb-4">
              This will copy all {meals.length} meal(s) from {formatDate(selectedDate)} to the selected date.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Target Date
              </label>
              <input
                type="date"
                value={copyToDate}
                onChange={(e) => setCopyToDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cobalt-500 focus:border-cobalt-500 outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCopyDialog(false);
                  setCopyToDate('');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCopyToDay}
                disabled={!copyToDate || loading}
                className="flex-1 px-4 py-3 bg-cobalt-500 text-white font-medium rounded-lg hover:bg-cobalt-600 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Copying...' : 'Copy Meals'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Meal Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Add Meal</h2>
            <p className="text-gray-600">
              Go to the <a href="/meals" className="text-cobalt-600 hover:underline">Food Database</a> to select and add foods to this day.
            </p>
            <button
              onClick={() => setShowAddDialog(false)}
              className="mt-4 w-full px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
