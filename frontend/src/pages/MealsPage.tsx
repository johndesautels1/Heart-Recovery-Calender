import React, { useState, useEffect } from 'react';
import { GlassCard, Input } from '../components/ui';
import { UtensilsCrossed, Search, TrendingUp, Filter, Heart, Plus, User } from 'lucide-react';
import { api } from '../services/api';
import { FoodCategory, FoodItem, FoodStats } from '../types';
import { AddToMealDialog } from '../components/AddToMealDialog';
import { useAuth } from '../contexts/AuthContext';
import { usePatientSelection } from '../contexts/PatientSelectionContext';

export function MealsPage() {
  const { user } = useAuth();
  const { selectedPatient, isViewingAsTherapist } = usePatientSelection();
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

  // Load categories and stats on mount
  useEffect(() => {
    loadCategories();
    loadStats();
  }, []);

  // Load food items when filters change
  useEffect(() => {
    loadFoodItems();
  }, [selectedCategory, selectedHealthRating, searchQuery]);

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
      // Calculate total nutrition based on portion and quantity
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

      // Show success message
      alert(`${mealData.foodItem.name} added to ${mealData.mealType}!`);
    } catch (err: any) {
      console.error('Error adding to meal:', err);
      alert('Failed to add to meal: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold" style={{ color: '#fbbf24' }}>Food Database</h1>
        <div className="flex items-center gap-2 text-sm font-bold" style={{ color: '#22c55e' }}>
          <Heart className="h-4 w-4 text-red-500" />
          <span>Heart-Healthy Food Guide</span>
        </div>
      </div>

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
