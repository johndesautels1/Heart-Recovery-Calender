import sequelize from '../models/database';
import FoodCategory from '../models/FoodCategory';
import FoodItem from '../models/FoodItem';

// Comprehensive nutritional database with real USDA data
// All values are per standard serving size as indicated

const categories = [
  { id: 1, name: 'Fruits', description: 'Fresh and dried fruits', icon: '🍎', sortOrder: 1 },
  { id: 2, name: 'Vegetables', description: 'Fresh and cooked vegetables', icon: '🥬', sortOrder: 2 },
  { id: 3, name: 'Proteins', description: 'Meat, fish, poultry, and plant proteins', icon: '🍖', sortOrder: 3 },
  { id: 4, name: 'Grains', description: 'Whole grains, bread, pasta, and rice', icon: '🌾', sortOrder: 4 },
  { id: 5, name: 'Dairy', description: 'Milk, cheese, and yogurt products', icon: '🥛', sortOrder: 5 },
  { id: 6, name: 'Nuts & Seeds', description: 'Nuts, seeds, and nut butters', icon: '🥜', sortOrder: 6 },
  { id: 7, name: 'Legumes', description: 'Beans, lentils, and peas', icon: '🫘', sortOrder: 7 },
  { id: 8, name: 'Beverages', description: 'Drinks and liquid refreshments', icon: '🥤', sortOrder: 8 },
  { id: 9, name: 'Snacks', description: 'Chips, crackers, and processed snacks', icon: '🍿', sortOrder: 9 },
  { id: 10, name: 'Sweets & Desserts', description: 'Candy, cookies, and sweet treats', icon: '🍰', sortOrder: 10 },
];

const foods: Array<{
  categoryId: number;
  name: string;
  healthRating: 'green' | 'yellow' | 'red';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  cholesterol: number;
  sugar: number;
  servingSize: string;
  notes?: string;
}> = [
  // FRUITS (Category 1) - Generally GREEN except high-sugar dried fruits
  { categoryId: 1, name: 'Apple (medium)', healthRating: 'green' as const, calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, sodium: 2, cholesterol: 0, sugar: 19, servingSize: '1 medium (182g)' },
  { categoryId: 1, name: 'Banana (medium)', healthRating: 'green', calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, sodium: 1, cholesterol: 0, sugar: 14, servingSize: '1 medium (118g)' },
  { categoryId: 1, name: 'Orange (medium)', healthRating: 'green', calories: 62, protein: 1.2, carbs: 15, fat: 0.2, fiber: 3.1, sodium: 0, cholesterol: 0, sugar: 12, servingSize: '1 medium (131g)' },
  { categoryId: 1, name: 'Strawberries (fresh)', healthRating: 'green', calories: 49, protein: 1, carbs: 12, fat: 0.5, fiber: 3, sodium: 2, cholesterol: 0, sugar: 7, servingSize: '1 cup (152g)' },
  { categoryId: 1, name: 'Blueberries (fresh)', healthRating: 'green', calories: 84, protein: 1.1, carbs: 21, fat: 0.5, fiber: 3.6, sodium: 1, cholesterol: 0, sugar: 15, servingSize: '1 cup (148g)' },
  { categoryId: 1, name: 'Grapes (red/green)', healthRating: 'yellow', calories: 104, protein: 1.1, carbs: 27, fat: 0.2, fiber: 1.4, sodium: 3, cholesterol: 0, sugar: 23, servingSize: '1 cup (151g)' },
  { categoryId: 1, name: 'Watermelon', healthRating: 'green', calories: 46, protein: 0.9, carbs: 12, fat: 0.2, fiber: 0.6, sodium: 2, cholesterol: 0, sugar: 9, servingSize: '1 cup diced (152g)' },
  { categoryId: 1, name: 'Cantaloupe', healthRating: 'green', calories: 54, protein: 1.3, carbs: 13, fat: 0.3, fiber: 1.4, sodium: 26, cholesterol: 0, sugar: 13, servingSize: '1 cup diced (160g)' },
  { categoryId: 1, name: 'Pineapple (fresh)', healthRating: 'green', calories: 83, protein: 0.9, carbs: 22, fat: 0.2, fiber: 2.3, sodium: 2, cholesterol: 0, sugar: 16, servingSize: '1 cup chunks (165g)' },
  { categoryId: 1, name: 'Mango', healthRating: 'green', calories: 99, protein: 1.4, carbs: 25, fat: 0.6, fiber: 2.6, sodium: 2, cholesterol: 0, sugar: 23, servingSize: '1 cup sliced (165g)' },
  { categoryId: 1, name: 'Peach (medium)', healthRating: 'green', calories: 58, protein: 1.4, carbs: 14, fat: 0.4, fiber: 2.3, sodium: 0, cholesterol: 0, sugar: 13, servingSize: '1 medium (150g)' },
  { categoryId: 1, name: 'Pear (medium)', healthRating: 'green', calories: 101, protein: 0.6, carbs: 27, fat: 0.2, fiber: 5.5, sodium: 2, cholesterol: 0, sugar: 17, servingSize: '1 medium (178g)' },
  { categoryId: 1, name: 'Cherries (sweet)', healthRating: 'yellow', calories: 87, protein: 1.5, carbs: 22, fat: 0.3, fiber: 2.9, sodium: 0, cholesterol: 0, sugar: 18, servingSize: '1 cup with pits (138g)' },
  { categoryId: 1, name: 'Kiwi (medium)', healthRating: 'green', calories: 42, protein: 0.8, carbs: 10, fat: 0.4, fiber: 2.1, sodium: 2, cholesterol: 0, sugar: 6, servingSize: '1 medium (69g)' },
  { categoryId: 1, name: 'Avocado', healthRating: 'green', calories: 234, protein: 2.9, carbs: 12, fat: 21, fiber: 9.2, sodium: 11, cholesterol: 0, sugar: 1, servingSize: '1 medium (136g)', notes: 'High in heart-healthy fats' },
  { categoryId: 1, name: 'Grapefruit (half)', healthRating: 'green', calories: 52, protein: 0.9, carbs: 13, fat: 0.2, fiber: 2, sodium: 0, cholesterol: 0, sugar: 9, servingSize: '1/2 medium (123g)' },
  { categoryId: 1, name: 'Raspberries', healthRating: 'green', calories: 64, protein: 1.5, carbs: 15, fat: 0.8, fiber: 8, sodium: 1, cholesterol: 0, sugar: 5, servingSize: '1 cup (123g)' },
  { categoryId: 1, name: 'Blackberries', healthRating: 'green', calories: 62, protein: 2, carbs: 14, fat: 0.7, fiber: 7.6, sodium: 1, cholesterol: 0, sugar: 7, servingSize: '1 cup (144g)' },
  { categoryId: 1, name: 'Plum (medium)', healthRating: 'green', calories: 30, protein: 0.5, carbs: 8, fat: 0.2, fiber: 0.9, sodium: 0, cholesterol: 0, sugar: 7, servingSize: '1 medium (66g)' },
  { categoryId: 1, name: 'Papaya', healthRating: 'green', calories: 62, protein: 0.7, carbs: 16, fat: 0.4, fiber: 2.5, sodium: 12, cholesterol: 0, sugar: 11, servingSize: '1 cup cubed (145g)' },
  { categoryId: 1, name: 'Raisins', healthRating: 'yellow', calories: 129, protein: 1.4, carbs: 34, fat: 0.2, fiber: 1.6, sodium: 12, cholesterol: 0, sugar: 28, servingSize: '1/4 cup (40g)', notes: 'High sugar, limit portions' },
  { categoryId: 1, name: 'Dates (Medjool)', healthRating: 'red', calories: 277, protein: 1.8, carbs: 75, fat: 0.2, fiber: 6.7, sodium: 1, cholesterol: 0, sugar: 66, servingSize: '5 dates (100g)', notes: 'Very high sugar content' },
  { categoryId: 1, name: 'Prunes (dried plums)', healthRating: 'yellow', calories: 240, protein: 2.2, carbs: 64, fat: 0.4, fiber: 7.1, sodium: 2, cholesterol: 0, sugar: 38, servingSize: '1/2 cup (87g)' },

  // VEGETABLES (Category 2) - Mostly GREEN
  { categoryId: 2, name: 'Broccoli (cooked)', healthRating: 'green', calories: 55, protein: 3.7, carbs: 11, fat: 0.6, fiber: 5.1, sodium: 64, cholesterol: 0, sugar: 2, servingSize: '1 cup chopped (156g)' },
  { categoryId: 2, name: 'Spinach (raw)', healthRating: 'green', calories: 7, protein: 0.9, carbs: 1.1, fat: 0.1, fiber: 0.7, sodium: 24, cholesterol: 0, sugar: 0.1, servingSize: '1 cup (30g)' },
  { categoryId: 2, name: 'Kale (raw)', healthRating: 'green', calories: 33, protein: 2.9, carbs: 6, fat: 0.6, fiber: 2.6, sodium: 29, cholesterol: 0, sugar: 1.6, servingSize: '1 cup chopped (67g)' },
  { categoryId: 2, name: 'Carrots (raw)', healthRating: 'green', calories: 52, protein: 1.2, carbs: 12, fat: 0.3, fiber: 3.6, sodium: 88, cholesterol: 0, sugar: 6, servingSize: '1 cup chopped (128g)' },
  { categoryId: 2, name: 'Bell Pepper (red, raw)', healthRating: 'green', calories: 39, protein: 1.5, carbs: 9, fat: 0.5, fiber: 3.1, sodium: 6, cholesterol: 0, sugar: 6, servingSize: '1 cup chopped (149g)' },
  { categoryId: 2, name: 'Tomato (medium)', healthRating: 'green', calories: 22, protein: 1.1, carbs: 4.8, fat: 0.2, fiber: 1.5, sodium: 6, cholesterol: 0, sugar: 3.2, servingSize: '1 medium (123g)' },
  { categoryId: 2, name: 'Cucumber (with peel)', healthRating: 'green', calories: 16, protein: 0.8, carbs: 3.6, fat: 0.2, fiber: 0.5, sodium: 2, cholesterol: 0, sugar: 1.7, servingSize: '1 cup sliced (119g)' },
  { categoryId: 2, name: 'Lettuce (romaine)', healthRating: 'green', calories: 8, protein: 0.6, carbs: 1.5, fat: 0.1, fiber: 1, sodium: 4, cholesterol: 0, sugar: 0.6, servingSize: '1 cup shredded (47g)' },
  { categoryId: 2, name: 'Cauliflower (raw)', healthRating: 'green', calories: 27, protein: 2.1, carbs: 5.3, fat: 0.3, fiber: 2.1, sodium: 32, cholesterol: 0, sugar: 2, servingSize: '1 cup chopped (107g)' },
  { categoryId: 2, name: 'Brussels Sprouts (cooked)', healthRating: 'green', calories: 56, protein: 4, carbs: 11, fat: 0.8, fiber: 4.1, sodium: 33, cholesterol: 0, sugar: 2.7, servingSize: '1 cup (156g)' },
  { categoryId: 2, name: 'Asparagus (cooked)', healthRating: 'green', calories: 40, protein: 4.3, carbs: 7.4, fat: 0.4, fiber: 3.6, sodium: 24, cholesterol: 0, sugar: 2.5, servingSize: '1 cup (180g)' },
  { categoryId: 2, name: 'Green Beans (cooked)', healthRating: 'green', calories: 44, protein: 2.4, carbs: 10, fat: 0.4, fiber: 4, sodium: 6, cholesterol: 0, sugar: 4.5, servingSize: '1 cup (125g)' },
  { categoryId: 2, name: 'Sweet Potato (baked)', healthRating: 'green', calories: 103, protein: 2.3, carbs: 24, fat: 0.2, fiber: 3.8, sodium: 41, cholesterol: 0, sugar: 7, servingSize: '1 medium (114g)' },
  { categoryId: 2, name: 'Potato (baked with skin)', healthRating: 'yellow', calories: 163, protein: 4.3, carbs: 37, fat: 0.2, fiber: 3.8, sodium: 14, cholesterol: 0, sugar: 1.9, servingSize: '1 medium (173g)' },
  { categoryId: 2, name: 'Corn (sweet, cooked)', healthRating: 'yellow', calories: 134, protein: 4.7, carbs: 31, fat: 2.1, fiber: 3.6, sodium: 23, cholesterol: 0, sugar: 6.4, servingSize: '1 cup kernels (154g)' },
  { categoryId: 2, name: 'Zucchini (raw)', healthRating: 'green', calories: 20, protein: 1.5, carbs: 3.9, fat: 0.4, fiber: 1.2, sodium: 10, cholesterol: 0, sugar: 3.1, servingSize: '1 cup chopped (124g)' },
  { categoryId: 2, name: 'Eggplant (cooked)', healthRating: 'green', calories: 35, protein: 0.8, carbs: 8.6, fat: 0.2, fiber: 2.5, sodium: 1, cholesterol: 0, sugar: 3.2, servingSize: '1 cup cubed (99g)' },
  { categoryId: 2, name: 'Mushrooms (white, raw)', healthRating: 'green', calories: 21, protein: 2.9, carbs: 3.1, fat: 0.3, fiber: 0.7, sodium: 5, cholesterol: 0, sugar: 1.9, servingSize: '1 cup sliced (96g)' },
  { categoryId: 2, name: 'Onion (raw)', healthRating: 'green', calories: 64, protein: 1.8, carbs: 15, fat: 0.2, fiber: 2.7, sodium: 6, cholesterol: 0, sugar: 6.8, servingSize: '1 cup chopped (160g)' },
  { categoryId: 2, name: 'Celery (raw)', healthRating: 'green', calories: 16, protein: 0.7, carbs: 3, fat: 0.2, fiber: 1.6, sodium: 80, cholesterol: 0, sugar: 1.4, servingSize: '1 cup chopped (101g)' },
  { categoryId: 2, name: 'Cabbage (raw)', healthRating: 'green', calories: 22, protein: 1.1, carbs: 5.2, fat: 0.1, fiber: 2.2, sodium: 16, cholesterol: 0, sugar: 2.9, servingSize: '1 cup shredded (89g)' },
  { categoryId: 2, name: 'Beets (cooked)', healthRating: 'green', calories: 75, protein: 2.9, carbs: 17, fat: 0.3, fiber: 3.4, sodium: 131, cholesterol: 0, sugar: 14, servingSize: '1 cup sliced (170g)' },
  { categoryId: 2, name: 'Radishes (raw)', healthRating: 'green', calories: 19, protein: 0.8, carbs: 4, fat: 0.1, fiber: 1.9, sodium: 45, cholesterol: 0, sugar: 2.2, servingSize: '1 cup sliced (116g)' },

  // PROTEINS (Category 3) - Mixed ratings based on fat/sodium content
  { categoryId: 3, name: 'Chicken Breast (skinless, grilled)', healthRating: 'green', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sodium: 74, cholesterol: 85, sugar: 0, servingSize: '3 oz (85g)' },
  { categoryId: 3, name: 'Turkey Breast (skinless)', healthRating: 'green', calories: 125, protein: 26, carbs: 0, fat: 1.8, fiber: 0, sodium: 55, cholesterol: 65, sugar: 0, servingSize: '3 oz (85g)' },
  { categoryId: 3, name: 'Salmon (wild, cooked)', healthRating: 'green', calories: 175, protein: 25, carbs: 0, fat: 8, fiber: 0, sodium: 75, cholesterol: 62, sugar: 0, servingSize: '3 oz (85g)', notes: 'High in omega-3s' },
  { categoryId: 3, name: 'Tuna (canned in water)', healthRating: 'green', calories: 99, protein: 22, carbs: 0, fat: 0.7, fiber: 0, sodium: 247, cholesterol: 42, sugar: 0, servingSize: '3 oz (85g)' },
  { categoryId: 3, name: 'Cod (baked)', healthRating: 'green', calories: 89, protein: 20, carbs: 0, fat: 0.7, fiber: 0, sodium: 66, cholesterol: 47, sugar: 0, servingSize: '3 oz (85g)' },
  { categoryId: 3, name: 'Shrimp (cooked)', healthRating: 'green', calories: 84, protein: 18, carbs: 0, fat: 0.9, fiber: 0, sodium: 94, cholesterol: 161, sugar: 0, servingSize: '3 oz (85g)', notes: 'High cholesterol but low fat' },
  { categoryId: 3, name: 'Tilapia (cooked)', healthRating: 'green', calories: 109, protein: 22, carbs: 0, fat: 2.3, fiber: 0, sodium: 56, cholesterol: 57, sugar: 0, servingSize: '3 oz (85g)' },
  { categoryId: 3, name: 'Ground Beef (95% lean)', healthRating: 'yellow', calories: 145, protein: 22, carbs: 0, fat: 5.5, fiber: 0, sodium: 70, cholesterol: 65, sugar: 0, servingSize: '3 oz (85g)' },
  { categoryId: 3, name: 'Ground Beef (80% lean)', healthRating: 'red', calories: 230, protein: 22, carbs: 0, fat: 15, fiber: 0, sodium: 75, cholesterol: 80, sugar: 0, servingSize: '3 oz (85g)', notes: 'High saturated fat' },
  { categoryId: 3, name: 'Pork Chop (lean, grilled)', healthRating: 'yellow', calories: 165, protein: 25, carbs: 0, fat: 6.4, fiber: 0, sodium: 57, cholesterol: 68, sugar: 0, servingSize: '3 oz (85g)' },
  { categoryId: 3, name: 'Bacon (pork, cooked)', healthRating: 'red', calories: 161, protein: 12, carbs: 0.6, fat: 12, fiber: 0, sodium: 581, cholesterol: 36, sugar: 0, servingSize: '3 slices (26g)', notes: 'Very high sodium and saturated fat' },
  { categoryId: 3, name: 'Sausage (pork)', healthRating: 'red', calories: 286, protein: 16, carbs: 1, fat: 23, fiber: 0, sodium: 665, cholesterol: 65, sugar: 0, servingSize: '2 links (76g)', notes: 'High sodium and saturated fat' },
  { categoryId: 3, name: 'Ham (lean, deli)', healthRating: 'red', calories: 102, protein: 16, carbs: 2.3, fat: 3.1, fiber: 0, sodium: 1117, cholesterol: 42, sugar: 1.4, servingSize: '3 oz (85g)', notes: 'Extremely high sodium' },
  { categoryId: 3, name: 'Eggs (large)', healthRating: 'green', calories: 72, protein: 6.3, carbs: 0.4, fat: 4.8, fiber: 0, sodium: 71, cholesterol: 186, sugar: 0.2, servingSize: '1 large (50g)' },
  { categoryId: 3, name: 'Egg Whites', healthRating: 'green', calories: 17, protein: 3.6, carbs: 0.2, fat: 0.1, fiber: 0, sodium: 55, cholesterol: 0, sugar: 0.2, servingSize: '1 large (33g)' },
  { categoryId: 3, name: 'Tofu (firm)', healthRating: 'green', calories: 94, protein: 10, carbs: 2.3, fat: 5.3, fiber: 1.1, sodium: 9, cholesterol: 0, sugar: 0.7, servingSize: '1/2 cup (126g)' },
  { categoryId: 3, name: 'Tempeh', healthRating: 'green', calories: 162, protein: 15, carbs: 9, fat: 9, fiber: 0, sodium: 9, cholesterol: 0, sugar: 0, servingSize: '3 oz (85g)' },
  { categoryId: 3, name: 'Beef Steak (sirloin, lean)', healthRating: 'yellow', calories: 180, protein: 26, carbs: 0, fat: 7.6, fiber: 0, sodium: 54, cholesterol: 76, sugar: 0, servingSize: '3 oz (85g)' },
  { categoryId: 3, name: 'Lamb Chop (lean)', healthRating: 'yellow', calories: 175, protein: 24, carbs: 0, fat: 8.2, fiber: 0, sodium: 72, cholesterol: 82, sugar: 0, servingSize: '3 oz (85g)' },
  { categoryId: 3, name: 'Duck Breast (skinless)', healthRating: 'yellow', calories: 140, protein: 23, carbs: 0, fat: 5, fiber: 0, sodium: 65, cholesterol: 95, sugar: 0, servingSize: '3 oz (85g)' },

  // GRAINS (Category 4) - Whole grains GREEN, refined grains YELLOW/RED
  { categoryId: 4, name: 'Brown Rice (cooked)', healthRating: 'green', calories: 218, protein: 4.5, carbs: 46, fat: 1.6, fiber: 3.5, sodium: 2, cholesterol: 0, sugar: 0.7, servingSize: '1 cup (195g)' },
  { categoryId: 4, name: 'White Rice (cooked)', healthRating: 'yellow', calories: 205, protein: 4.2, carbs: 45, fat: 0.4, fiber: 0.6, sodium: 2, cholesterol: 0, sugar: 0.1, servingSize: '1 cup (158g)' },
  { categoryId: 4, name: 'Quinoa (cooked)', healthRating: 'green', calories: 222, protein: 8.1, carbs: 39, fat: 3.6, fiber: 5.2, sodium: 13, cholesterol: 0, sugar: 1.6, servingSize: '1 cup (185g)' },
  { categoryId: 4, name: 'Oatmeal (cooked)', healthRating: 'green', calories: 159, protein: 5.9, carbs: 27, fat: 3.2, fiber: 4, sodium: 9, cholesterol: 0, sugar: 0.6, servingSize: '1 cup (234g)' },
  { categoryId: 4, name: 'Whole Wheat Bread', healthRating: 'green', calories: 81, protein: 4, carbs: 14, fat: 1.1, fiber: 1.9, sodium: 148, cholesterol: 0, sugar: 1.4, servingSize: '1 slice (28g)' },
  { categoryId: 4, name: 'White Bread', healthRating: 'yellow', calories: 79, protein: 2.3, carbs: 15, fat: 1, fiber: 0.8, sodium: 147, cholesterol: 0, sugar: 1.6, servingSize: '1 slice (28g)' },
  { categoryId: 4, name: 'Whole Wheat Pasta (cooked)', healthRating: 'green', calories: 174, protein: 7.5, carbs: 37, fat: 0.8, fiber: 6.3, sodium: 4, cholesterol: 0, sugar: 0.8, servingSize: '1 cup (140g)' },
  { categoryId: 4, name: 'White Pasta (cooked)', healthRating: 'yellow', calories: 220, protein: 8.1, carbs: 43, fat: 1.3, fiber: 2.5, sodium: 1, cholesterol: 0, sugar: 0.8, servingSize: '1 cup (140g)' },
  { categoryId: 4, name: 'Barley (cooked)', healthRating: 'green', calories: 193, protein: 3.6, carbs: 44, fat: 0.7, fiber: 6, sodium: 5, cholesterol: 0, sugar: 0.8, servingSize: '1 cup (157g)' },
  { categoryId: 4, name: 'Bulgur (cooked)', healthRating: 'green', calories: 151, protein: 5.6, carbs: 34, fat: 0.4, fiber: 8.2, sodium: 9, cholesterol: 0, sugar: 0.2, servingSize: '1 cup (182g)' },
  { categoryId: 4, name: 'Couscous (cooked)', healthRating: 'yellow', calories: 176, protein: 5.9, carbs: 36, fat: 0.3, fiber: 2.2, sodium: 8, cholesterol: 0, sugar: 0.2, servingSize: '1 cup (157g)' },
  { categoryId: 4, name: 'Cornbread', healthRating: 'yellow', calories: 173, protein: 4.1, carbs: 28, fat: 5.1, fiber: 1.4, sodium: 428, cholesterol: 26, sugar: 7, servingSize: '1 piece (60g)' },
  { categoryId: 4, name: 'Bagel (plain)', healthRating: 'yellow', calories: 277, protein: 11, carbs: 53, fat: 1.7, fiber: 2.3, sodium: 475, cholesterol: 0, sugar: 5.3, servingSize: '1 bagel (98g)' },
  { categoryId: 4, name: 'English Muffin (whole wheat)', healthRating: 'green', calories: 134, protein: 5.8, carbs: 27, fat: 1.1, fiber: 4.4, sodium: 220, cholesterol: 0, sugar: 1.6, servingSize: '1 muffin (66g)' },
  { categoryId: 4, name: 'Tortilla (corn)', healthRating: 'green', calories: 52, protein: 1.4, carbs: 11, fat: 0.7, fiber: 1.5, sodium: 11, cholesterol: 0, sugar: 0.3, servingSize: '1 tortilla (26g)' },
  { categoryId: 4, name: 'Tortilla (flour)', healthRating: 'yellow', calories: 146, protein: 3.9, carbs: 25, fat: 3.5, fiber: 1.6, sodium: 391, cholesterol: 0, sugar: 1.2, servingSize: '1 tortilla (49g)' },
  { categoryId: 4, name: 'Pita Bread (whole wheat)', healthRating: 'green', calories: 170, protein: 6.3, carbs: 35, fat: 1.7, fiber: 4.7, sodium: 340, cholesterol: 0, sugar: 1.1, servingSize: '1 pita (64g)' },
  { categoryId: 4, name: 'Granola', healthRating: 'yellow', calories: 298, protein: 9, carbs: 32, fat: 15, fiber: 5, sodium: 13, cholesterol: 0, sugar: 11, servingSize: '1/2 cup (61g)', notes: 'High sugar and calories' },
  { categoryId: 4, name: 'Cereal (Cheerios)', healthRating: 'green', calories: 100, protein: 3, carbs: 20, fat: 2, fiber: 3, sodium: 140, cholesterol: 0, sugar: 1, servingSize: '1 cup (28g)' },
  { categoryId: 4, name: 'Cereal (Frosted Flakes)', healthRating: 'red', calories: 110, protein: 1, carbs: 27, fat: 0, fiber: 1, sodium: 150, cholesterol: 0, sugar: 12, servingSize: '3/4 cup (29g)', notes: 'Very high sugar' },

  // DAIRY (Category 5) - Low-fat GREEN, full-fat YELLOW, high-fat RED
  { categoryId: 5, name: 'Milk (skim)', healthRating: 'green', calories: 83, protein: 8.3, carbs: 12, fat: 0.2, fiber: 0, sodium: 103, cholesterol: 5, sugar: 12, servingSize: '1 cup (245g)' },
  { categoryId: 5, name: 'Milk (1% low-fat)', healthRating: 'green', calories: 102, protein: 8.2, carbs: 12, fat: 2.4, fiber: 0, sodium: 107, cholesterol: 12, sugar: 13, servingSize: '1 cup (244g)' },
  { categoryId: 5, name: 'Milk (2% reduced-fat)', healthRating: 'yellow', calories: 122, protein: 8.1, carbs: 12, fat: 4.8, fiber: 0, sodium: 115, cholesterol: 20, sugar: 12, servingSize: '1 cup (244g)' },
  { categoryId: 5, name: 'Milk (whole)', healthRating: 'yellow', calories: 149, protein: 7.7, carbs: 12, fat: 7.9, fiber: 0, sodium: 105, cholesterol: 24, sugar: 12, servingSize: '1 cup (244g)' },
  { categoryId: 5, name: 'Almond Milk (unsweetened)', healthRating: 'green', calories: 39, protein: 1.6, carbs: 3.4, fat: 2.9, fiber: 0.5, sodium: 189, cholesterol: 0, sugar: 0, servingSize: '1 cup (240ml)' },
  { categoryId: 5, name: 'Soy Milk (unsweetened)', healthRating: 'green', calories: 80, protein: 7, carbs: 4, fat: 4, fiber: 1, sodium: 90, cholesterol: 0, sugar: 1, servingSize: '1 cup (240ml)' },
  { categoryId: 5, name: 'Greek Yogurt (non-fat, plain)', healthRating: 'green', calories: 100, protein: 17, carbs: 6, fat: 0.7, fiber: 0, sodium: 56, cholesterol: 5, sugar: 6, servingSize: '6 oz (170g)' },
  { categoryId: 5, name: 'Greek Yogurt (full-fat, plain)', healthRating: 'yellow', calories: 220, protein: 20, carbs: 9, fat: 11, fiber: 0, sodium: 75, cholesterol: 25, sugar: 9, servingSize: '7 oz (200g)' },
  { categoryId: 5, name: 'Yogurt (flavored, sweetened)', healthRating: 'red', calories: 200, protein: 7, carbs: 39, fat: 2, fiber: 0, sodium: 130, cholesterol: 10, sugar: 33, servingSize: '6 oz (170g)', notes: 'Very high sugar' },
  { categoryId: 5, name: 'Cottage Cheese (low-fat)', healthRating: 'green', calories: 163, protein: 28, carbs: 6.2, fat: 2.3, fiber: 0, sodium: 918, cholesterol: 9, sugar: 6.2, servingSize: '1 cup (226g)', notes: 'High sodium' },
  { categoryId: 5, name: 'Cheddar Cheese', healthRating: 'red', calories: 114, protein: 7, carbs: 0.4, fat: 9.4, fiber: 0, sodium: 176, cholesterol: 30, sugar: 0.1, servingSize: '1 oz (28g)', notes: 'High saturated fat' },
  { categoryId: 5, name: 'Mozzarella (part-skim)', healthRating: 'yellow', calories: 72, protein: 6.9, carbs: 0.8, fat: 4.5, fiber: 0, sodium: 175, cholesterol: 18, sugar: 0.3, servingSize: '1 oz (28g)' },
  { categoryId: 5, name: 'Swiss Cheese', healthRating: 'yellow', calories: 106, protein: 7.6, carbs: 1.5, fat: 7.9, fiber: 0, sodium: 54, cholesterol: 26, sugar: 0.4, servingSize: '1 oz (28g)' },
  { categoryId: 5, name: 'Cream Cheese', healthRating: 'red', calories: 99, protein: 2.2, carbs: 1.6, fat: 9.9, fiber: 0, sodium: 105, cholesterol: 31, sugar: 0.8, servingSize: '1 oz (28g)', notes: 'High saturated fat' },
  { categoryId: 5, name: 'Parmesan (grated)', healthRating: 'yellow', calories: 21, protein: 1.9, carbs: 0.2, fat: 1.4, fiber: 0, sodium: 76, cholesterol: 4, sugar: 0, servingSize: '1 tbsp (5g)' },
  { categoryId: 5, name: 'Feta Cheese', healthRating: 'yellow', calories: 75, protein: 4, carbs: 1.2, fat: 6, fiber: 0, sodium: 316, cholesterol: 25, sugar: 1.2, servingSize: '1 oz (28g)' },
  { categoryId: 5, name: 'Ice Cream (vanilla)', healthRating: 'red', calories: 273, protein: 4.6, carbs: 32, fat: 14, fiber: 0.8, sodium: 106, cholesterol: 58, sugar: 28, servingSize: '1 cup (132g)', notes: 'High sugar and saturated fat' },
  { categoryId: 5, name: 'Frozen Yogurt (low-fat)', healthRating: 'yellow', calories: 221, protein: 5.2, carbs: 38, fat: 6.3, fiber: 0, sodium: 110, cholesterol: 7, sugar: 35, servingSize: '1 cup (144g)', notes: 'High sugar' },

  // NUTS & SEEDS (Category 6) - Mostly GREEN due to heart-healthy fats
  { categoryId: 6, name: 'Almonds (raw)', healthRating: 'green', calories: 164, protein: 6, carbs: 6.1, fat: 14, fiber: 3.5, sodium: 0, cholesterol: 0, sugar: 1.2, servingSize: '1 oz / 23 almonds (28g)', notes: 'Heart-healthy fats' },
  { categoryId: 6, name: 'Walnuts', healthRating: 'green', calories: 185, protein: 4.3, carbs: 3.9, fat: 18, fiber: 1.9, sodium: 1, cholesterol: 0, sugar: 0.7, servingSize: '1 oz / 14 halves (28g)', notes: 'High omega-3s' },
  { categoryId: 6, name: 'Cashews (raw)', healthRating: 'yellow', calories: 157, protein: 5.2, carbs: 8.6, fat: 12, fiber: 0.9, sodium: 3, cholesterol: 0, sugar: 1.7, servingSize: '1 oz / 18 cashews (28g)' },
  { categoryId: 6, name: 'Peanuts (dry roasted)', healthRating: 'yellow', calories: 166, protein: 6.7, carbs: 6.1, fat: 14, fiber: 2.4, sodium: 230, cholesterol: 0, sugar: 1.4, servingSize: '1 oz (28g)', notes: 'Salted variety high sodium' },
  { categoryId: 6, name: 'Peanut Butter (natural)', healthRating: 'yellow', calories: 191, protein: 7.7, carbs: 7.7, fat: 16, fiber: 1.9, sodium: 152, cholesterol: 0, sugar: 3.4, servingSize: '2 tbsp (32g)' },
  { categoryId: 6, name: 'Almond Butter', healthRating: 'green', calories: 196, protein: 6.7, carbs: 6, fat: 18, fiber: 3.3, sodium: 2, cholesterol: 0, sugar: 1.9, servingSize: '2 tbsp (32g)' },
  { categoryId: 6, name: 'Sunflower Seeds', healthRating: 'green', calories: 165, protein: 5.5, carbs: 6.8, fat: 14, fiber: 2.4, sodium: 1, cholesterol: 0, sugar: 0.8, servingSize: '1 oz (28g)' },
  { categoryId: 6, name: 'Pumpkin Seeds', healthRating: 'green', calories: 151, protein: 7, carbs: 5, fat: 13, fiber: 1.1, sodium: 5, cholesterol: 0, sugar: 0.4, servingSize: '1 oz (28g)' },
  { categoryId: 6, name: 'Chia Seeds', healthRating: 'green', calories: 138, protein: 4.7, carbs: 12, fat: 8.7, fiber: 9.8, sodium: 5, cholesterol: 0, sugar: 0, servingSize: '1 oz (28g)', notes: 'High fiber and omega-3s' },
  { categoryId: 6, name: 'Flaxseeds (ground)', healthRating: 'green', calories: 150, protein: 5.1, carbs: 8.1, fat: 12, fiber: 7.6, sodium: 9, cholesterol: 0, sugar: 0.4, servingSize: '1 oz (28g)', notes: 'High omega-3s' },
  { categoryId: 6, name: 'Pistachios', healthRating: 'green', calories: 159, protein: 5.7, carbs: 7.7, fat: 13, fiber: 3, sodium: 0, cholesterol: 0, sugar: 2.2, servingSize: '1 oz / 49 kernels (28g)' },
  { categoryId: 6, name: 'Pecans', healthRating: 'green', calories: 196, protein: 2.6, carbs: 3.9, fat: 20, fiber: 2.7, sodium: 0, cholesterol: 0, sugar: 1.1, servingSize: '1 oz / 19 halves (28g)' },
  { categoryId: 6, name: 'Hazelnuts', healthRating: 'green', calories: 178, protein: 4.2, carbs: 4.7, fat: 17, fiber: 2.8, sodium: 0, cholesterol: 0, sugar: 1.2, servingSize: '1 oz / 21 nuts (28g)' },
  { categoryId: 6, name: 'Brazil Nuts', healthRating: 'yellow', calories: 186, protein: 4.1, carbs: 3.3, fat: 19, fiber: 2.1, sodium: 1, cholesterol: 0, sugar: 0.7, servingSize: '1 oz / 6 nuts (28g)', notes: 'High selenium, limit intake' },
  { categoryId: 6, name: 'Macadamia Nuts', healthRating: 'yellow', calories: 204, protein: 2.2, carbs: 3.9, fat: 21, fiber: 2.4, sodium: 1, cholesterol: 0, sugar: 1.3, servingSize: '1 oz / 10-12 nuts (28g)' },

  // LEGUMES (Category 7) - All GREEN, excellent for heart health
  { categoryId: 7, name: 'Black Beans (cooked)', healthRating: 'green', calories: 227, protein: 15, carbs: 41, fat: 0.9, fiber: 15, sodium: 2, cholesterol: 0, sugar: 0.3, servingSize: '1 cup (172g)' },
  { categoryId: 7, name: 'Kidney Beans (cooked)', healthRating: 'green', calories: 225, protein: 15, carbs: 40, fat: 0.9, fiber: 11, sodium: 4, cholesterol: 0, sugar: 0.6, servingSize: '1 cup (177g)' },
  { categoryId: 7, name: 'Chickpeas (cooked)', healthRating: 'green', calories: 269, protein: 14, carbs: 45, fat: 4.3, fiber: 12, sodium: 11, cholesterol: 0, sugar: 7.9, servingSize: '1 cup (164g)' },
  { categoryId: 7, name: 'Lentils (cooked)', healthRating: 'green', calories: 230, protein: 18, carbs: 40, fat: 0.8, fiber: 16, sodium: 4, cholesterol: 0, sugar: 1.8, servingSize: '1 cup (198g)' },
  { categoryId: 7, name: 'Pinto Beans (cooked)', healthRating: 'green', calories: 245, protein: 15, carbs: 45, fat: 1.1, fiber: 15, sodium: 2, cholesterol: 0, sugar: 0.6, servingSize: '1 cup (171g)' },
  { categoryId: 7, name: 'Navy Beans (cooked)', healthRating: 'green', calories: 255, protein: 15, carbs: 47, fat: 1.1, fiber: 19, sodium: 2, cholesterol: 0, sugar: 0.6, servingSize: '1 cup (182g)' },
  { categoryId: 7, name: 'Lima Beans (cooked)', healthRating: 'green', calories: 216, protein: 15, carbs: 39, fat: 0.7, fiber: 13, sodium: 4, cholesterol: 0, sugar: 2.9, servingSize: '1 cup (188g)' },
  { categoryId: 7, name: 'Soybeans/Edamame (cooked)', healthRating: 'green', calories: 189, protein: 17, carbs: 15, fat: 8.1, fiber: 8.1, sodium: 15, cholesterol: 0, sugar: 3.4, servingSize: '1 cup (155g)' },
  { categoryId: 7, name: 'Green Peas (cooked)', healthRating: 'green', calories: 134, protein: 8.6, carbs: 25, fat: 0.4, fiber: 8.8, sodium: 7, cholesterol: 0, sugar: 9.5, servingSize: '1 cup (160g)' },
  { categoryId: 7, name: 'Split Peas (cooked)', healthRating: 'green', calories: 231, protein: 16, carbs: 41, fat: 0.8, fiber: 16, sodium: 4, cholesterol: 0, sugar: 5.7, servingSize: '1 cup (196g)' },
  { categoryId: 7, name: 'Black-Eyed Peas (cooked)', healthRating: 'green', calories: 198, protein: 13, carbs: 36, fat: 0.9, fiber: 11, sodium: 7, cholesterol: 0, sugar: 6.9, servingSize: '1 cup (172g)' },
  { categoryId: 7, name: 'Hummus', healthRating: 'green', calories: 166, protein: 7.9, carbs: 14, fat: 9.6, fiber: 6, sodium: 379, cholesterol: 0, sugar: 0.2, servingSize: '1/2 cup (123g)' },

  // BEVERAGES (Category 8) - Water/tea GREEN, juice YELLOW, soda RED
  { categoryId: 8, name: 'Water', healthRating: 'green', calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, cholesterol: 0, sugar: 0, servingSize: '1 cup (237ml)' },
  { categoryId: 8, name: 'Green Tea (unsweetened)', healthRating: 'green', calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, cholesterol: 0, sugar: 0, servingSize: '1 cup (237ml)' },
  { categoryId: 8, name: 'Black Coffee (black)', healthRating: 'green', calories: 2, protein: 0.3, carbs: 0, fat: 0, fiber: 0, sodium: 5, cholesterol: 0, sugar: 0, servingSize: '1 cup (237ml)' },
  { categoryId: 8, name: 'Herbal Tea (unsweetened)', healthRating: 'green', calories: 2, protein: 0, carbs: 0.5, fat: 0, fiber: 0, sodium: 2, cholesterol: 0, sugar: 0, servingSize: '1 cup (237ml)' },
  { categoryId: 8, name: 'Orange Juice (100%)', healthRating: 'yellow', calories: 112, protein: 1.7, carbs: 26, fat: 0.5, fiber: 0.5, sodium: 2, cholesterol: 0, sugar: 21, servingSize: '1 cup (248ml)', notes: 'High sugar, limit portions' },
  { categoryId: 8, name: 'Apple Juice (100%)', healthRating: 'yellow', calories: 114, protein: 0.2, carbs: 28, fat: 0.3, fiber: 0.2, sodium: 10, cholesterol: 0, sugar: 24, servingSize: '1 cup (248ml)', notes: 'High sugar, limit portions' },
  { categoryId: 8, name: 'Cranberry Juice (100%)', healthRating: 'yellow', calories: 116, protein: 0.9, carbs: 31, fat: 0.3, fiber: 0.2, sodium: 5, cholesterol: 0, sugar: 30, servingSize: '1 cup (253ml)', notes: 'High sugar' },
  { categoryId: 8, name: 'Coca-Cola', healthRating: 'red', calories: 140, protein: 0, carbs: 39, fat: 0, fiber: 0, sodium: 45, cholesterol: 0, sugar: 39, servingSize: '12 fl oz (355ml)', notes: 'Very high sugar' },
  { categoryId: 8, name: 'Pepsi', healthRating: 'red', calories: 150, protein: 0, carbs: 41, fat: 0, fiber: 0, sodium: 30, cholesterol: 0, sugar: 41, servingSize: '12 fl oz (355ml)', notes: 'Very high sugar' },
  { categoryId: 8, name: 'Sprite/7-Up', healthRating: 'red', calories: 140, protein: 0, carbs: 38, fat: 0, fiber: 0, sodium: 65, cholesterol: 0, sugar: 38, servingSize: '12 fl oz (355ml)', notes: 'Very high sugar' },
  { categoryId: 8, name: 'Sweet Tea (sweetened)', healthRating: 'red', calories: 90, protein: 0, carbs: 24, fat: 0, fiber: 0, sodium: 10, cholesterol: 0, sugar: 24, servingSize: '8 fl oz (240ml)', notes: 'High sugar' },
  { categoryId: 8, name: 'Lemonade (sweetened)', healthRating: 'red', calories: 99, protein: 0.2, carbs: 26, fat: 0.1, fiber: 0.1, sodium: 7, cholesterol: 0, sugar: 24, servingSize: '8 fl oz (248ml)', notes: 'High sugar' },
  { categoryId: 8, name: 'Energy Drink (Red Bull)', healthRating: 'red', calories: 110, protein: 1.2, carbs: 27, fat: 0, fiber: 0, sodium: 105, cholesterol: 0, sugar: 27, servingSize: '8.4 fl oz (248ml)', notes: 'High sugar and caffeine' },
  { categoryId: 8, name: 'Sports Drink (Gatorade)', healthRating: 'yellow', calories: 80, protein: 0, carbs: 21, fat: 0, fiber: 0, sodium: 160, cholesterol: 0, sugar: 21, servingSize: '12 fl oz (355ml)', notes: 'High sodium' },
  { categoryId: 8, name: 'Beer (regular)', healthRating: 'red', calories: 153, protein: 1.6, carbs: 13, fat: 0, fiber: 0, sodium: 14, cholesterol: 0, sugar: 0, servingSize: '12 fl oz (355ml)', notes: 'Alcohol content' },
  { categoryId: 8, name: 'Wine (red)', healthRating: 'yellow', calories: 125, protein: 0.1, carbs: 3.8, fat: 0, fiber: 0, sodium: 6, cholesterol: 0, sugar: 0.9, servingSize: '5 fl oz (148ml)', notes: 'Moderate amounts may benefit heart' },
  { categoryId: 8, name: 'Vodka (80 proof)', healthRating: 'red', calories: 97, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, cholesterol: 0, sugar: 0, servingSize: '1.5 fl oz (44ml)', notes: 'Alcohol content' },
  { categoryId: 8, name: 'Coconut Water', healthRating: 'green', calories: 46, protein: 1.7, carbs: 9, fat: 0.5, fiber: 2.6, sodium: 252, cholesterol: 0, sugar: 6, servingSize: '1 cup (240ml)' },

  // SNACKS (Category 9) - Mostly YELLOW/RED
  { categoryId: 9, name: 'Potato Chips (regular)', healthRating: 'red', calories: 152, protein: 2, carbs: 15, fat: 10, fiber: 1.4, sodium: 149, cholesterol: 0, sugar: 0.1, servingSize: '1 oz (28g)', notes: 'High fat and sodium' },
  { categoryId: 9, name: 'Tortilla Chips', healthRating: 'yellow', calories: 142, protein: 2.2, carbs: 18, fat: 7.4, fiber: 1.8, sodium: 150, cholesterol: 0, sugar: 0.4, servingSize: '1 oz (28g)' },
  { categoryId: 9, name: 'Pretzels', healthRating: 'yellow', calories: 108, protein: 2.6, carbs: 23, fat: 0.8, fiber: 0.9, sodium: 385, cholesterol: 0, sugar: 0.9, servingSize: '1 oz (28g)', notes: 'High sodium' },
  { categoryId: 9, name: 'Popcorn (air-popped)', healthRating: 'green', calories: 31, protein: 1, carbs: 6.2, fat: 0.4, fiber: 1.2, sodium: 1, cholesterol: 0, sugar: 0.1, servingSize: '1 cup (8g)' },
  { categoryId: 9, name: 'Popcorn (microwave butter)', healthRating: 'red', calories: 164, protein: 3.1, carbs: 18, fat: 9.5, fiber: 3.6, sodium: 290, cholesterol: 0, sugar: 0.1, servingSize: '1 cup (45g)', notes: 'High sodium and fat' },
  { categoryId: 9, name: 'Crackers (whole wheat)', healthRating: 'yellow', calories: 120, protein: 3, carbs: 20, fat: 4, fiber: 3, sodium: 180, cholesterol: 0, sugar: 1, servingSize: '5 crackers (28g)' },
  { categoryId: 9, name: 'Crackers (Ritz)', healthRating: 'yellow', calories: 80, protein: 1, carbs: 10, fat: 4, fiber: 0, sodium: 130, cholesterol: 0, sugar: 1, servingSize: '5 crackers (16g)' },
  { categoryId: 9, name: 'Granola Bar', healthRating: 'yellow', calories: 120, protein: 2, carbs: 19, fat: 4.5, fiber: 1, sodium: 75, cholesterol: 0, sugar: 7, servingSize: '1 bar (28g)' },
  { categoryId: 9, name: 'Trail Mix', healthRating: 'yellow', calories: 173, protein: 5.2, carbs: 17, fat: 11, fiber: 2, sodium: 86, cholesterol: 0, sugar: 11, servingSize: '1 oz (28g)' },
  { categoryId: 9, name: 'Beef Jerky', healthRating: 'red', calories: 116, protein: 9.4, carbs: 3.1, fat: 7.3, fiber: 0.5, sodium: 506, cholesterol: 28, sugar: 2.5, servingSize: '1 oz (28g)', notes: 'Very high sodium' },
  { categoryId: 9, name: 'Rice Cakes (plain)', healthRating: 'green', calories: 35, protein: 0.7, carbs: 7.3, fat: 0.3, fiber: 0.4, sodium: 29, cholesterol: 0, sugar: 0.1, servingSize: '1 cake (9g)' },
  { categoryId: 9, name: 'Pita Chips', healthRating: 'yellow', calories: 130, protein: 3, carbs: 19, fat: 5, fiber: 2, sodium: 270, cholesterol: 0, sugar: 1, servingSize: '1 oz (28g)' },
  { categoryId: 9, name: 'Cheese Puffs', healthRating: 'red', calories: 157, protein: 2.1, carbs: 13, fat: 10, fiber: 0.5, sodium: 322, cholesterol: 1, sugar: 1.7, servingSize: '1 oz (28g)', notes: 'High fat and sodium' },

  // SWEETS & DESSERTS (Category 10) - All RED except dark chocolate (YELLOW)
  { categoryId: 10, name: 'Chocolate Chip Cookie', healthRating: 'red', calories: 226, protein: 2.6, carbs: 30, fat: 11, fiber: 1.3, sodium: 159, cholesterol: 21, sugar: 18, servingSize: '1 large (38g)', notes: 'High sugar and fat' },
  { categoryId: 10, name: 'Brownie', healthRating: 'red', calories: 227, protein: 2.6, carbs: 36, fat: 9, fiber: 1.5, sodium: 175, cholesterol: 31, sugar: 21, servingSize: '1 square (56g)', notes: 'High sugar and fat' },
  { categoryId: 10, name: 'Donut (glazed)', healthRating: 'red', calories: 269, protein: 3.6, carbs: 31, fat: 15, fiber: 0.9, sodium: 257, cholesterol: 26, sugar: 12, servingSize: '1 medium (64g)', notes: 'High sugar and fat' },
  { categoryId: 10, name: 'Candy Bar (Snickers)', healthRating: 'red', calories: 250, protein: 4, carbs: 33, fat: 12, fiber: 1, sodium: 120, cholesterol: 5, sugar: 27, servingSize: '1 bar (52g)', notes: 'Very high sugar' },
  { categoryId: 10, name: 'Candy Bar (Milky Way)', healthRating: 'red', calories: 240, protein: 2, carbs: 37, fat: 9, fiber: 1, sodium: 85, cholesterol: 5, sugar: 31, servingSize: '1 bar (52g)', notes: 'Very high sugar' },
  { categoryId: 10, name: 'M&Ms (plain)', healthRating: 'red', calories: 240, protein: 2, carbs: 34, fat: 10, fiber: 1, sodium: 30, cholesterol: 5, sugar: 31, servingSize: '1 package (47g)', notes: 'Very high sugar' },
  { categoryId: 10, name: 'Skittles', healthRating: 'red', calories: 231, protein: 0, carbs: 54, fat: 2.2, fiber: 0, sodium: 16, cholesterol: 0, sugar: 47, servingSize: '1 package (56g)', notes: 'Extremely high sugar' },
  { categoryId: 10, name: 'Gummy Bears', healthRating: 'red', calories: 140, protein: 3, carbs: 32, fat: 0, fiber: 0, sodium: 10, cholesterol: 0, sugar: 21, servingSize: '17 pieces (40g)', notes: 'Very high sugar' },
  { categoryId: 10, name: 'Dark Chocolate (70-85% cacao)', healthRating: 'yellow', calories: 168, protein: 2.2, carbs: 13, fat: 12, fiber: 3.1, sodium: 6, cholesterol: 2, sugar: 6.8, servingSize: '1 oz (28g)', notes: 'Antioxidants in moderation' },
  { categoryId: 10, name: 'Milk Chocolate Bar', healthRating: 'red', calories: 235, protein: 3.4, carbs: 26, fat: 13, fiber: 1.4, sodium: 36, cholesterol: 10, sugar: 24, servingSize: '1.55 oz (44g)', notes: 'High sugar and fat' },
  { categoryId: 10, name: 'Cake (chocolate, frosted)', healthRating: 'red', calories: 352, protein: 5, carbs: 51, fat: 14, fiber: 1.8, sodium: 299, cholesterol: 55, sugar: 35, servingSize: '1 slice (95g)', notes: 'Very high sugar and fat' },
  { categoryId: 10, name: 'Pie (apple)', healthRating: 'red', calories: 296, protein: 2.4, carbs: 43, fat: 13, fiber: 1.6, sodium: 311, cholesterol: 0, sugar: 19, servingSize: '1 slice (117g)', notes: 'High sugar and fat' },
  { categoryId: 10, name: 'Cupcake (frosted)', healthRating: 'red', calories: 305, protein: 3.6, carbs: 50, fat: 11, fiber: 0.5, sodium: 242, cholesterol: 34, sugar: 35, servingSize: '1 cupcake (95g)', notes: 'Very high sugar' },
  { categoryId: 10, name: 'Candy Corn', healthRating: 'red', calories: 140, protein: 0, carbs: 36, fat: 0, fiber: 0, sodium: 60, cholesterol: 0, sugar: 28, servingSize: '19 pieces (40g)', notes: 'Pure sugar' },
  { categoryId: 10, name: 'Jelly Beans', healthRating: 'red', calories: 140, protein: 0, carbs: 37, fat: 0, fiber: 0, sodium: 15, cholesterol: 0, sugar: 28, servingSize: '35 pieces (40g)', notes: 'Pure sugar' },
  { categoryId: 10, name: 'Cheesecake', healthRating: 'red', calories: 321, protein: 5.5, carbs: 25, fat: 23, fiber: 0.4, sodium: 251, cholesterol: 80, sugar: 19, servingSize: '1 slice (92g)', notes: 'Very high fat and sugar' },
  { categoryId: 10, name: 'Pudding (chocolate)', healthRating: 'yellow', calories: 153, protein: 5.1, carbs: 25, fat: 3.8, fiber: 1.3, sodium: 137, cholesterol: 15, sugar: 21, servingSize: '1/2 cup (142g)', notes: 'High sugar' },
  { categoryId: 10, name: 'Jell-O (prepared)', healthRating: 'yellow', calories: 80, protein: 2, carbs: 19, fat: 0, fiber: 0, sodium: 80, cholesterol: 0, sugar: 18, servingSize: '1/2 cup (140g)', notes: 'High sugar' },

  // Additional common foods across various categories

  // More Proteins
  { categoryId: 3, name: 'Sardines (canned in oil)', healthRating: 'green', calories: 191, protein: 23, carbs: 0, fat: 11, fiber: 0, sodium: 465, cholesterol: 131, sugar: 0, servingSize: '3 oz (85g)', notes: 'High omega-3s and calcium' },
  { categoryId: 3, name: 'Anchovies (canned)', healthRating: 'yellow', calories: 111, protein: 17, carbs: 0, fat: 4.8, fiber: 0, sodium: 1651, cholesterol: 53, sugar: 0, servingSize: '3 oz (85g)', notes: 'Very high sodium' },
  { categoryId: 3, name: 'Crab (cooked)', healthRating: 'green', calories: 82, protein: 16, carbs: 0, fat: 1.3, fiber: 0, sodium: 293, cholesterol: 86, sugar: 0, servingSize: '3 oz (85g)' },
  { categoryId: 3, name: 'Lobster (cooked)', healthRating: 'green', calories: 77, protein: 16, carbs: 0, fat: 0.9, fiber: 0, sodium: 296, cholesterol: 61, sugar: 0, servingSize: '3 oz (85g)' },
  { categoryId: 3, name: 'Scallops (cooked)', healthRating: 'green', calories: 94, protein: 17, carbs: 2.5, fat: 1.2, fiber: 0, sodium: 667, cholesterol: 33, sugar: 0, servingSize: '3 oz (85g)', notes: 'High sodium' },
  { categoryId: 3, name: 'Mussels (cooked)', healthRating: 'green', calories: 146, protein: 20, carbs: 6.3, fat: 3.8, fiber: 0, sodium: 314, cholesterol: 48, sugar: 0, servingSize: '3 oz (85g)' },
  { categoryId: 3, name: 'Oysters (raw)', healthRating: 'green', calories: 50, protein: 4.4, carbs: 4.7, fat: 1.3, fiber: 0, sodium: 211, cholesterol: 21, sugar: 0, servingSize: '3 oz (85g)' },
  { categoryId: 3, name: 'Venison (roasted)', healthRating: 'green', calories: 134, protein: 26, carbs: 0, fat: 2.7, fiber: 0, sodium: 46, cholesterol: 96, sugar: 0, servingSize: '3 oz (85g)', notes: 'Very lean wild game' },
  { categoryId: 3, name: 'Bison (ground)', healthRating: 'green', calories: 202, protein: 20, carbs: 0, fat: 13, fiber: 0, sodium: 66, cholesterol: 60, sugar: 0, servingSize: '3 oz (85g)' },
  { categoryId: 3, name: 'Seitan (wheat gluten)', healthRating: 'green', calories: 104, protein: 21, carbs: 4, fat: 0.5, fiber: 0.2, sodium: 8, cholesterol: 0, sugar: 0.7, servingSize: '3 oz (85g)' },

  // More Fruits
  { categoryId: 1, name: 'Apricot (fresh)', healthRating: 'green', calories: 34, protein: 1, carbs: 8, fat: 0.3, fiber: 1.5, sodium: 1, cholesterol: 0, sugar: 7, servingSize: '2 medium (70g)' },
  { categoryId: 1, name: 'Figs (fresh)', healthRating: 'yellow', calories: 74, protein: 0.8, carbs: 19, fat: 0.3, fiber: 2.9, sodium: 1, cholesterol: 0, sugar: 16, servingSize: '2 medium (100g)' },
  { categoryId: 1, name: 'Pomegranate Seeds', healthRating: 'green', calories: 144, protein: 2.9, carbs: 33, fat: 2, fiber: 7, sodium: 5, cholesterol: 0, sugar: 24, servingSize: '1 cup (174g)', notes: 'High in antioxidants' },
  { categoryId: 1, name: 'Dragon Fruit', healthRating: 'green', calories: 102, protein: 2, carbs: 22, fat: 0, fiber: 5, sodium: 0, cholesterol: 0, sugar: 13, servingSize: '1 cup (227g)' },
  { categoryId: 1, name: 'Star Fruit', healthRating: 'green', calories: 28, protein: 1, carbs: 6, fat: 0.3, fiber: 2.5, sodium: 2, cholesterol: 0, sugar: 4, servingSize: '1 medium (91g)' },
  { categoryId: 1, name: 'Persimmon', healthRating: 'green', calories: 118, protein: 1, carbs: 31, fat: 0.3, fiber: 6, sodium: 2, cholesterol: 0, sugar: 21, servingSize: '1 medium (168g)' },
  { categoryId: 1, name: 'Guava', healthRating: 'green', calories: 37, protein: 1.4, carbs: 8, fat: 0.5, fiber: 3, sodium: 1, cholesterol: 0, sugar: 5, servingSize: '1 fruit (55g)' },
  { categoryId: 1, name: 'Lychee', healthRating: 'yellow', calories: 125, protein: 1.6, carbs: 31, fat: 0.8, fiber: 2.5, sodium: 2, cholesterol: 0, sugar: 29, servingSize: '1 cup (190g)', notes: 'High sugar' },

  // More Vegetables
  { categoryId: 2, name: 'Arugula', healthRating: 'green', calories: 5, protein: 0.5, carbs: 0.7, fat: 0.1, fiber: 0.3, sodium: 5, cholesterol: 0, sugar: 0.4, servingSize: '1 cup (20g)' },
  { categoryId: 2, name: 'Swiss Chard', healthRating: 'green', calories: 7, protein: 0.6, carbs: 1.4, fat: 0.1, fiber: 0.6, sodium: 77, cholesterol: 0, sugar: 0.4, servingSize: '1 cup raw (36g)' },
  { categoryId: 2, name: 'Collard Greens (cooked)', healthRating: 'green', calories: 49, protein: 4, carbs: 9, fat: 0.7, fiber: 5.3, sodium: 30, cholesterol: 0, sugar: 0.8, servingSize: '1 cup (190g)' },
  { categoryId: 2, name: 'Turnip Greens (cooked)', healthRating: 'green', calories: 29, protein: 1.6, carbs: 6.3, fat: 0.3, fiber: 5, sodium: 42, cholesterol: 0, sugar: 0.8, servingSize: '1 cup (144g)' },
  { categoryId: 2, name: 'Bok Choy (cooked)', healthRating: 'green', calories: 20, protein: 2.7, carbs: 3, fat: 0.3, fiber: 1.7, sodium: 58, cholesterol: 0, sugar: 1.5, servingSize: '1 cup (170g)' },
  { categoryId: 2, name: 'Fennel (raw)', healthRating: 'green', calories: 27, protein: 1.1, carbs: 6.3, fat: 0.2, fiber: 2.7, sodium: 45, cholesterol: 0, sugar: 3.9, servingSize: '1 cup sliced (87g)' },
  { categoryId: 2, name: 'Leeks (cooked)', healthRating: 'green', calories: 38, protein: 1, carbs: 9.5, fat: 0.2, fiber: 1.2, sodium: 13, cholesterol: 0, sugar: 2.5, servingSize: '1/2 cup (52g)' },
  { categoryId: 2, name: 'Artichoke (cooked)', healthRating: 'green', calories: 64, protein: 3.5, carbs: 14, fat: 0.4, fiber: 10, sodium: 72, cholesterol: 0, sugar: 1.3, servingSize: '1 medium (120g)' },
  { categoryId: 2, name: 'Okra (cooked)', healthRating: 'green', calories: 18, protein: 1.5, carbs: 3.6, fat: 0.1, fiber: 2, sodium: 5, cholesterol: 0, sugar: 1.2, servingSize: '1/2 cup (80g)' },
  { categoryId: 2, name: 'Jicama (raw)', healthRating: 'green', calories: 46, protein: 0.9, carbs: 11, fat: 0.1, fiber: 5.9, sodium: 5, cholesterol: 0, sugar: 2.2, servingSize: '1 cup (120g)' },
  { categoryId: 2, name: 'Water Chestnuts (canned)', healthRating: 'green', calories: 60, protein: 1, carbs: 15, fat: 0, fiber: 1.8, sodium: 9, cholesterol: 0, sugar: 4.7, servingSize: '1/2 cup (70g)' },

  // More Grains
  { categoryId: 4, name: 'Farro (cooked)', healthRating: 'green', calories: 170, protein: 6.5, carbs: 35, fat: 1, fiber: 5.5, sodium: 5, cholesterol: 0, sugar: 1, servingSize: '1 cup (194g)' },
  { categoryId: 4, name: 'Millet (cooked)', healthRating: 'green', calories: 207, protein: 6.1, carbs: 41, fat: 1.7, fiber: 2.3, sodium: 5, cholesterol: 0, sugar: 0.2, servingSize: '1 cup (174g)' },
  { categoryId: 4, name: 'Amaranth (cooked)', healthRating: 'green', calories: 251, protein: 9.4, carbs: 46, fat: 3.9, fiber: 5.2, sodium: 15, cholesterol: 0, sugar: 0, servingSize: '1 cup (246g)' },
  { categoryId: 4, name: 'Teff (cooked)', healthRating: 'green', calories: 255, protein: 9.8, carbs: 50, fat: 1.6, fiber: 7.1, sodium: 20, cholesterol: 0, sugar: 0.6, servingSize: '1 cup (252g)' },
  { categoryId: 4, name: 'Rye Bread', healthRating: 'green', calories: 83, protein: 2.7, carbs: 15, fat: 1.1, fiber: 1.9, sodium: 211, cholesterol: 0, sugar: 1.2, servingSize: '1 slice (32g)' },
  { categoryId: 4, name: 'Pumpernickel Bread', healthRating: 'green', calories: 65, protein: 2.3, carbs: 12, fat: 0.8, fiber: 1.7, sodium: 174, cholesterol: 0, sugar: 0.2, servingSize: '1 slice (26g)' },
  { categoryId: 4, name: 'Sourdough Bread', healthRating: 'yellow', calories: 93, protein: 3.9, carbs: 18, fat: 0.6, fiber: 0.9, sodium: 177, cholesterol: 0, sugar: 0.7, servingSize: '1 slice (36g)' },
  { categoryId: 4, name: 'Croissant', healthRating: 'red', calories: 272, protein: 5.6, carbs: 31, fat: 14, fiber: 1.6, sodium: 266, cholesterol: 45, sugar: 6.6, servingSize: '1 medium (67g)', notes: 'High saturated fat' },
  { categoryId: 4, name: 'Pancakes', healthRating: 'yellow', calories: 175, protein: 5, carbs: 22, fat: 7.3, fiber: 0.9, sodium: 439, cholesterol: 45, sugar: 3.5, servingSize: '1 medium (77g)' },
  { categoryId: 4, name: 'Waffles', healthRating: 'yellow', calories: 218, protein: 6, carbs: 25, fat: 11, fiber: 1.7, sodium: 383, cholesterol: 52, sugar: 2.1, servingSize: '1 waffle (75g)' },

  // More Dairy Alternatives & Products
  { categoryId: 5, name: 'Oat Milk (unsweetened)', healthRating: 'green', calories: 120, protein: 3, carbs: 16, fat: 5, fiber: 2, sodium: 100, cholesterol: 0, sugar: 7, servingSize: '1 cup (240ml)' },
  { categoryId: 5, name: 'Rice Milk (unsweetened)', healthRating: 'yellow', calories: 113, protein: 0.7, carbs: 22, fat: 2.3, fiber: 0.7, sodium: 86, cholesterol: 0, sugar: 13, servingSize: '1 cup (240ml)' },
  { categoryId: 5, name: 'Cashew Milk (unsweetened)', healthRating: 'green', calories: 25, protein: 1, carbs: 1, fat: 2, fiber: 0, sodium: 160, cholesterol: 0, sugar: 0, servingSize: '1 cup (240ml)' },
  { categoryId: 5, name: 'Kefir (low-fat)', healthRating: 'green', calories: 110, protein: 11, carbs: 12, fat: 2, fiber: 0, sodium: 125, cholesterol: 10, sugar: 12, servingSize: '1 cup (243g)' },
  { categoryId: 5, name: 'Sour Cream (light)', healthRating: 'yellow', calories: 136, protein: 7, carbs: 7, fat: 9, fiber: 0, sodium: 82, cholesterol: 32, sugar: 0, servingSize: '1/2 cup (115g)' },
  { categoryId: 5, name: 'Sour Cream (full-fat)', healthRating: 'red', calories: 222, protein: 2.7, carbs: 5.1, fat: 22, fiber: 0, sodium: 56, cholesterol: 67, sugar: 0, servingSize: '1/2 cup (115g)', notes: 'Very high saturated fat' },
  { categoryId: 5, name: 'Butter', healthRating: 'red', calories: 102, protein: 0.1, carbs: 0, fat: 12, fiber: 0, sodium: 91, cholesterol: 31, sugar: 0, servingSize: '1 tbsp (14g)', notes: 'Very high saturated fat' },
  { categoryId: 5, name: 'Margarine (regular)', healthRating: 'red', calories: 102, protein: 0.1, carbs: 0.1, fat: 11, fiber: 0, sodium: 133, cholesterol: 0, sugar: 0, servingSize: '1 tbsp (14g)', notes: 'Check for trans fats' },
  { categoryId: 5, name: 'Whipped Cream', healthRating: 'red', calories: 51, protein: 0.3, carbs: 0.4, fat: 5.5, fiber: 0, sodium: 6, cholesterol: 21, sugar: 0.4, servingSize: '2 tbsp (15g)', notes: 'High saturated fat' },
  { categoryId: 5, name: 'Goat Cheese (soft)', healthRating: 'yellow', calories: 103, protein: 6.1, carbs: 0.3, fat: 8.5, fiber: 0, sodium: 146, cholesterol: 22, sugar: 0.3, servingSize: '1 oz (28g)' },
  { categoryId: 5, name: 'Blue Cheese', healthRating: 'yellow', calories: 100, protein: 6.1, carbs: 0.7, fat: 8.1, fiber: 0, sodium: 395, cholesterol: 21, sugar: 0.2, servingSize: '1 oz (28g)' },
  { categoryId: 5, name: 'Brie Cheese', healthRating: 'yellow', calories: 95, protein: 5.9, carbs: 0.1, fat: 7.9, fiber: 0, sodium: 178, cholesterol: 28, sugar: 0.1, servingSize: '1 oz (28g)' },

  // More processed foods and condiments
  { categoryId: 9, name: 'Hummus (store-bought)', healthRating: 'green', calories: 70, protein: 2, carbs: 5, fat: 5, fiber: 2, sodium: 130, cholesterol: 0, sugar: 0, servingSize: '2 tbsp (28g)' },
  { categoryId: 9, name: 'Salsa (tomato-based)', healthRating: 'green', calories: 9, protein: 0.4, carbs: 2, fat: 0.1, fiber: 0.5, sodium: 156, cholesterol: 0, sugar: 1.2, servingSize: '2 tbsp (32g)' },
  { categoryId: 9, name: 'Guacamole', healthRating: 'green', calories: 50, protein: 0.6, carbs: 3, fat: 4.5, fiber: 2, sodium: 105, cholesterol: 0, sugar: 0.3, servingSize: '2 tbsp (30g)' },
  { categoryId: 9, name: 'Ketchup', healthRating: 'yellow', calories: 20, protein: 0.2, carbs: 5, fat: 0, fiber: 0.1, sodium: 154, cholesterol: 0, sugar: 4, servingSize: '1 tbsp (17g)', notes: 'High sugar and sodium' },
  { categoryId: 9, name: 'Mustard (yellow)', healthRating: 'green', calories: 3, protein: 0.2, carbs: 0.3, fat: 0.2, fiber: 0.2, sodium: 57, cholesterol: 0, sugar: 0.1, servingSize: '1 tsp (5g)' },
  { categoryId: 9, name: 'Mayonnaise (regular)', healthRating: 'red', calories: 94, protein: 0.1, carbs: 0.1, fat: 10, fiber: 0, sodium: 88, cholesterol: 5, sugar: 0.1, servingSize: '1 tbsp (13g)', notes: 'Very high fat' },
  { categoryId: 9, name: 'Mayonnaise (light)', healthRating: 'yellow', calories: 49, protein: 0, carbs: 1, fat: 5, fiber: 0, sodium: 107, cholesterol: 4, sugar: 0.4, servingSize: '1 tbsp (15g)' },
  { categoryId: 9, name: 'Ranch Dressing', healthRating: 'red', calories: 73, protein: 0.4, carbs: 1.4, fat: 7.7, fiber: 0, sodium: 135, cholesterol: 4, sugar: 1, servingSize: '1 tbsp (15g)', notes: 'High fat and sodium' },
  { categoryId: 9, name: 'Italian Dressing (low-fat)', healthRating: 'yellow', calories: 11, protein: 0, carbs: 2, fat: 0.4, fiber: 0, sodium: 118, cholesterol: 0, sugar: 1, servingSize: '1 tbsp (15g)' },
  { categoryId: 9, name: 'Vinaigrette (balsamic)', healthRating: 'green', calories: 45, protein: 0, carbs: 2, fat: 4.5, fiber: 0, sodium: 180, cholesterol: 0, sugar: 2, servingSize: '1 tbsp (15g)' },
  { categoryId: 9, name: 'Soy Sauce', healthRating: 'red', calories: 8, protein: 0.8, carbs: 0.8, fat: 0, fiber: 0.1, sodium: 879, cholesterol: 0, sugar: 0.1, servingSize: '1 tbsp (16g)', notes: 'Extremely high sodium' },
  { categoryId: 9, name: 'Hot Sauce (Tabasco)', healthRating: 'green', calories: 1, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 35, cholesterol: 0, sugar: 0, servingSize: '1 tsp (5ml)' },
  { categoryId: 9, name: 'BBQ Sauce', healthRating: 'yellow', calories: 29, protein: 0.2, carbs: 7, fat: 0.1, fiber: 0.2, sodium: 157, cholesterol: 0, sugar: 5, servingSize: '1 tbsp (17g)', notes: 'High sugar' },
  { categoryId: 9, name: 'Teriyaki Sauce', healthRating: 'red', calories: 16, protein: 0.7, carbs: 2.8, fat: 0, fiber: 0, sodium: 690, cholesterol: 0, sugar: 2.1, servingSize: '1 tbsp (18g)', notes: 'Very high sodium' },

  // More sweets for completeness
  { categoryId: 10, name: 'Muffin (blueberry)', healthRating: 'red', calories: 426, protein: 6.7, carbs: 60, fat: 18, fiber: 2.6, sodium: 381, cholesterol: 51, sugar: 28, servingSize: '1 large (113g)', notes: 'Very high sugar and calories' },
  { categoryId: 10, name: 'Cinnamon Roll (frosted)', healthRating: 'red', calories: 420, protein: 7, carbs: 58, fat: 19, fiber: 2, sodium: 430, cholesterol: 35, sugar: 28, servingSize: '1 roll (100g)', notes: 'Very high sugar and fat' },
  { categoryId: 10, name: 'Danish Pastry', healthRating: 'red', calories: 266, protein: 4.6, carbs: 29, fat: 15, fiber: 1.3, sodium: 320, cholesterol: 19, sugar: 11, servingSize: '1 pastry (71g)', notes: 'High fat and sugar' },
  { categoryId: 10, name: 'Honey', healthRating: 'yellow', calories: 64, protein: 0.1, carbs: 17, fat: 0, fiber: 0, sodium: 1, cholesterol: 0, sugar: 17, servingSize: '1 tbsp (21g)', notes: 'Pure sugar' },
  { categoryId: 10, name: 'Maple Syrup (pure)', healthRating: 'yellow', calories: 52, protein: 0, carbs: 13, fat: 0, fiber: 0, sodium: 2, cholesterol: 0, sugar: 12, servingSize: '1 tbsp (20g)', notes: 'High sugar' },
  { categoryId: 10, name: 'Pancake Syrup (regular)', healthRating: 'red', calories: 47, protein: 0, carbs: 12, fat: 0, fiber: 0, sodium: 16, cholesterol: 0, sugar: 8, servingSize: '1 tbsp (20g)', notes: 'High fructose corn syrup' },
  { categoryId: 10, name: 'Marshmallows', healthRating: 'red', calories: 318, protein: 1.8, carbs: 81, fat: 0.2, fiber: 0.1, sodium: 80, cholesterol: 0, sugar: 58, servingSize: '10 large (93g)', notes: 'Almost pure sugar' },
  { categoryId: 10, name: 'Cotton Candy', healthRating: 'red', calories: 171, protein: 0, carbs: 44, fat: 0, fiber: 0, sodium: 4, cholesterol: 0, sugar: 44, servingSize: '1 oz (28g)', notes: 'Pure sugar' },
];

async function seedData() {
  try {
    console.log('🌱 Starting nutritional data seed...');

    // Recreate food tables with sugar column
    await FoodCategory.sync({ force: true });
    await FoodItem.sync({ force: true });
    console.log('✅ Database schema synchronized');

    // Insert categories
    for (const category of categories) {
      await FoodCategory.create(category);
    }
    console.log(`✅ Inserted ${categories.length} food categories`);

    // Insert foods
    for (const food of foods) {
      await FoodItem.create(food);
    }
    console.log(`✅ Inserted ${foods.length} food items`);

    console.log('🎉 Seed completed successfully!');
    console.log(`📊 Total: ${categories.length} categories, ${foods.length} foods`);

    // Print summary by health rating
    const greenCount = foods.filter(f => f.healthRating === 'green').length;
    const yellowCount = foods.filter(f => f.healthRating === 'yellow').length;
    const redCount = foods.filter(f => f.healthRating === 'red').length;
    console.log(`💚 Green (Heart-Healthy): ${greenCount}`);
    console.log(`💛 Yellow (Moderation): ${yellowCount}`);
    console.log(`❤️  Red (Limit/Avoid): ${redCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

// Run the seed function
seedData();
