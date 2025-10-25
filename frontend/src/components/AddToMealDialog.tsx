import React, { useState } from 'react';
import { FoodItem } from '../types';
import { X } from 'lucide-react';

interface AddToMealDialogProps {
  foodItem: FoodItem;
  onClose: () => void;
  onAdd: (mealData: {
    foodItem: FoodItem;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    portionSize: 'small' | 'medium' | 'large';
    quantity: number;
    timestamp: string;
    notes?: string;
  }) => void;
}

export function AddToMealDialog({ foodItem, onClose, onAdd }: AddToMealDialogProps) {
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [portionSize, setPortionSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [quantity, setQuantity] = useState(1);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState(new Date().toTimeString().slice(0, 5));
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const timestamp = `${selectedDate}T${selectedTime}:00`;

    onAdd({
      foodItem,
      mealType,
      portionSize,
      quantity,
      timestamp,
      notes: notes.trim() || undefined,
    });
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Add to Meal</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Food Item Info */}
          <div className="bg-gradient-to-br from-cobalt-50 to-sky-50 rounded-lg p-4 border border-cobalt-200">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-lg" style={{ color: '#fbbf24' }}>{foodItem.name}</h3>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium border ${getHealthRatingColor(
                  foodItem.healthRating
                )}`}
              >
                {getHealthRatingLabel(foodItem.healthRating)}
              </span>
            </div>
            {foodItem.servingSize && (
              <p className="text-sm font-bold" style={{ color: '#fbbf24' }}>Serving: {foodItem.servingSize}</p>
            )}
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs font-bold" style={{ color: '#fbbf24' }}>
              {foodItem.calories !== undefined && <div>Cal: {foodItem.calories}</div>}
              {foodItem.protein !== undefined && <div>Protein: {foodItem.protein}g</div>}
              {foodItem.sodium !== undefined && <div>Sodium: {foodItem.sodium}mg</div>}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: '#fbbf24' }}>
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cobalt-500 focus:border-cobalt-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: '#fbbf24' }}>
                Time
              </label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cobalt-500 focus:border-cobalt-500 outline-none"
                required
              />
            </div>
          </div>

          {/* Meal Type */}
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: '#fbbf24' }}>
              Meal Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMealType(type)}
                  className={`px-4 py-2 rounded-lg font-bold transition-all capitalize ${
                    mealType === type
                      ? 'shadow-lg'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  style={mealType === type ? {
                    background: 'linear-gradient(135deg, #ff9500, #fbbf24)',
                    color: '#ffffff'
                  } : {
                    color: '#ffffff'
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Portion Size */}
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: '#fbbf24' }}>
              Portion Size
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPortionSize(size)}
                  className={`px-4 py-2 rounded-lg font-bold transition-all capitalize ${
                    portionSize === size
                      ? 'shadow-lg'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  style={portionSize === size ? {
                    background: 'linear-gradient(135deg, #ff9500, #fbbf24)',
                    color: '#ffffff'
                  } : {
                    color: '#ffffff'
                  }}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: '#fbbf24' }}>
              Quantity (servings)
            </label>
            <input
              type="number"
              min="0.25"
              step="0.25"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cobalt-500 focus:border-cobalt-500 outline-none"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: '#fbbf24' }}>
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this meal..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cobalt-500 focus:border-cobalt-500 outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-cobalt-500 font-bold rounded-lg hover:bg-cobalt-600 transition-colors shadow-lg"
              style={{ color: '#ff9500' }}
            >
              Add to Meal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
