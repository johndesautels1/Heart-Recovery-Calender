import React, { useState, useEffect, useRef } from 'react';

interface FoodAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// Comprehensive food database with common items (heart-healthy and general foods)
const FOOD_DATABASE = [
  // Proteins
  'Grilled Chicken Breast',
  'Baked Salmon',
  'Tuna (canned in water)',
  'Grilled Turkey Breast',
  'Egg Whites',
  'Greek Yogurt (non-fat)',
  'Cottage Cheese (low-fat)',
  'Tofu',
  'Tempeh',
  'Lentils',
  'Black Beans',
  'Chickpeas',
  'Kidney Beans',
  'Edamame',
  'Lean Ground Turkey',
  'Tilapia',
  'Cod Fish',
  'Shrimp',

  // Vegetables
  'Steamed Broccoli',
  'Roasted Brussels Sprouts',
  'Spinach (raw)',
  'Kale (raw)',
  'Mixed Greens Salad',
  'Carrots (raw)',
  'Celery Sticks',
  'Bell Peppers (raw)',
  'Cucumber Slices',
  'Cherry Tomatoes',
  'Asparagus (steamed)',
  'Green Beans',
  'Zucchini',
  'Cauliflower',
  'Sweet Potato (baked)',
  'Butternut Squash',
  'Mushrooms',
  'Onions',
  'Garlic',
  'Lettuce',

  // Fruits
  'Apple',
  'Banana',
  'Orange',
  'Strawberries',
  'Blueberries',
  'Raspberries',
  'Blackberries',
  'Grapes',
  'Watermelon',
  'Cantaloupe',
  'Peach',
  'Pear',
  'Plum',
  'Kiwi',
  'Mango',
  'Pineapple',
  'Grapefruit',
  'Avocado',

  // Whole Grains
  'Brown Rice',
  'Quinoa',
  'Oatmeal (steel-cut)',
  'Whole Wheat Bread',
  'Whole Wheat Pasta',
  'Wild Rice',
  'Barley',
  'Farro',
  'Whole Grain Cereal',
  'Ezekiel Bread',

  // Nuts & Seeds (heart-healthy fats)
  'Almonds (unsalted)',
  'Walnuts (unsalted)',
  'Chia Seeds',
  'Flax Seeds',
  'Pumpkin Seeds',
  'Sunflower Seeds',
  'Cashews (unsalted)',
  'Pistachios (unsalted)',
  'Peanut Butter (natural)',
  'Almond Butter',

  // Dairy & Alternatives
  'Skim Milk',
  'Almond Milk (unsweetened)',
  'Oat Milk (unsweetened)',
  'Low-Fat Cheese',
  'Mozzarella Cheese (part-skim)',

  // Prepared Meals (common entries)
  'Chicken Caesar Salad (no croutons)',
  'Grilled Chicken Wrap',
  'Veggie Burger',
  'Turkey Sandwich (whole wheat)',
  'Tuna Salad',
  'Chicken Stir-fry',
  'Vegetable Soup',
  'Chicken Noodle Soup (low sodium)',
  'Minestrone Soup',
  'Garden Salad (no dressing)',
  'Greek Salad',
  'Caprese Salad',

  // Unhealthy Foods (for tracking - will be marked)
  'French Fries',
  'Pizza (pepperoni)',
  'Pizza (cheese)',
  'Hamburger',
  'Cheeseburger',
  'Hot Dog',
  'Bacon',
  'Fried Chicken',
  'Chicken Wings',
  'Potato Chips',
  'Nachos',
  'Mac and Cheese',
  'Ice Cream',
  'Cookies',
  'Cake',
  'Donut',
  'Candy Bar',
  'Soda',
  'Energy Drink',
  'Milkshake',
  'Fried Fish',
  'Onion Rings',
  'Mozzarella Sticks',
  'Loaded Baked Potato',
  'Alfredo Pasta',

  // Snacks
  'Rice Cakes',
  'Air-popped Popcorn (unsalted)',
  'Hummus with Veggies',
  'Apple Slices with Peanut Butter',
  'Trail Mix (unsalted)',
  'Protein Shake',
  'Protein Bar',
  'String Cheese (low-fat)',
  'Hard-boiled Egg',
  'Fruit Smoothie',

  // Beverages - Healthy
  'Water',
  'Sparkling Water (unsweetened)',
  'Green Tea (unsweetened)',
  'Black Tea (unsweetened)',
  'Herbal Tea (unsweetened)',
  'Black Coffee (unsweetened)',
  'Iced Coffee (unsweetened)',
  'Coconut Water',
  'Vegetable Juice (low sodium)',
  'Tomato Juice (low sodium)',
  'Fresh Orange Juice (no sugar added)',
  'Fresh Apple Juice (no sugar added)',
  'Fresh Grapefruit Juice (no sugar added)',
  'Lemon Water',
  'Lime Water',
  'Infused Water',
  'Kombucha (low sugar)',
  'Almond Milk (unsweetened)',
  'Oat Milk (unsweetened)',
  'Skim Milk',

  // Beverages - Unhealthy
  'Soda (Coke)',
  'Soda (Pepsi)',
  'Soda (Sprite)',
  'Soda (Mountain Dew)',
  'Sweet Tea',
  'Lemonade (sweetened)',
  'Energy Drink (Red Bull)',
  'Energy Drink (Monster)',
  'Sports Drink (Gatorade)',
  'Fruit Punch (sweetened)',
  'Chocolate Milk (sweetened)',
  'Frappuccino',
  'Milkshake (chocolate)',
  'Milkshake (vanilla)',
  'Milkshake (strawberry)',
  'Beer',
  'Wine',
  'Cocktail',
  'Juice Box (sweetened)',
  'Iced Tea (sweetened)',
  'Coffee with Sugar and Cream',
];

export const FoodAutocomplete: React.FC<FoodAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'e.g., Grilled Chicken Breast, Brown Rice, Steamed Broccoli',
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.trim().length === 0) {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Get the last food item being typed (after the last comma)
    const items = value.split(',');
    const currentItem = items[items.length - 1].trim().toLowerCase();

    if (currentItem.length < 2) {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Filter food database
    const matches = FOOD_DATABASE.filter(food =>
      food.toLowerCase().includes(currentItem)
    ).sort((a, b) => {
      // Prioritize matches that start with the search term
      const aStarts = a.toLowerCase().startsWith(currentItem);
      const bStarts = b.toLowerCase().startsWith(currentItem);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.localeCompare(b);
    }).slice(0, 8); // Limit to 8 suggestions

    setFilteredSuggestions(matches);
    setShowSuggestions(matches.length > 0);
    setHighlightedIndex(-1);
  }, [value]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (suggestion: string) => {
    // Replace the current item being typed with the selected suggestion
    const items = value.split(',');
    items[items.length - 1] = ' ' + suggestion;
    const newValue = items.join(',');

    onChange(newValue);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
          handleSelectSuggestion(filteredSuggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (filteredSuggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cobalt-500 focus:border-cobalt-500 outline-none font-semibold"
        style={{ color: '#1a1a1a' }}
        autoComplete="off"
      />

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white border-2 border-cobalt-500 rounded-lg shadow-2xl max-h-64 overflow-y-auto"
        >
          <div className="p-2 text-xs font-bold text-gray-500 border-b border-gray-200">
            💡 Suggestions (click to select)
          </div>
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`w-full text-left px-4 py-3 hover:bg-cobalt-50 transition-colors font-semibold border-b border-gray-100 last:border-b-0 ${
                index === highlightedIndex ? 'bg-cobalt-100' : ''
              }`}
              style={{ color: '#1a1a1a' }}
            >
              <div className="flex items-center justify-between">
                <span>{suggestion}</span>
                {(suggestion.includes('Pizza') ||
                  suggestion.includes('Fries') ||
                  suggestion.includes('Burger') ||
                  suggestion.includes('Fried') ||
                  suggestion.includes('Bacon') ||
                  suggestion.includes('Ice Cream') ||
                  suggestion.includes('Cookies') ||
                  suggestion.includes('Cake') ||
                  suggestion.includes('Donut') ||
                  suggestion.includes('Candy') ||
                  suggestion.includes('Soda') ||
                  suggestion.includes('Wings') ||
                  suggestion.includes('Chips') ||
                  suggestion.includes('Nachos') ||
                  suggestion.includes('Sweet Tea') ||
                  suggestion.includes('Energy Drink') ||
                  suggestion.includes('Sports Drink') ||
                  suggestion.includes('Frappuccino') ||
                  suggestion.includes('Milkshake') ||
                  suggestion.includes('Beer') ||
                  suggestion.includes('Wine') ||
                  suggestion.includes('Cocktail') ||
                  suggestion.includes('(sweetened)') ||
                  suggestion.includes('Sugar and Cream')) && (
                  <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">
                    ⚠️ Unhealthy
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Helper Text */}
      <p className="mt-1 text-xs text-gray-500">
        💡 Start typing to see suggestions. Use comma to add multiple items.
      </p>
    </div>
  );
};
