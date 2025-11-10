// Comprehensive nutrition database (per standard serving)
// All values are per serving unless otherwise noted

export interface NutritionData {
  servingSize: string;
  calories: number;
  sodium: number; // mg
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  fiber: number; // g
  sugar: number; // g
  isHealthy: boolean;
}

export const NUTRITION_DATABASE: { [key: string]: NutritionData } = {
  // PROTEINS
  'Grilled Chicken Breast': { servingSize: '4 oz (113g)', calories: 165, sodium: 74, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, isHealthy: true },
  'Baked Salmon': { servingSize: '4 oz (113g)', calories: 206, sodium: 59, protein: 23, carbs: 0, fat: 12, fiber: 0, sugar: 0, isHealthy: true },
  'Tuna (canned in water)': { servingSize: '3 oz (85g)', calories: 99, sodium: 201, protein: 22, carbs: 0, fat: 0.7, fiber: 0, sugar: 0, isHealthy: true },
  'Grilled Turkey Breast': { servingSize: '4 oz (113g)', calories: 153, sodium: 63, protein: 30, carbs: 0, fat: 3, fiber: 0, sugar: 0, isHealthy: true },
  'Egg Whites': { servingSize: '3 large', calories: 51, sodium: 166, protein: 11, carbs: 0.7, fat: 0.2, fiber: 0, sugar: 0.7, isHealthy: true },
  'Greek Yogurt (non-fat)': { servingSize: '6 oz (170g)', calories: 100, sodium: 65, protein: 17, carbs: 6, fat: 0, fiber: 0, sugar: 4, isHealthy: true },
  'Cottage Cheese (low-fat)': { servingSize: '1/2 cup', calories: 81, sodium: 459, protein: 14, carbs: 3, fat: 1, fiber: 0, sugar: 3, isHealthy: true },
  'Tofu': { servingSize: '1/2 cup (126g)', calories: 94, sodium: 9, protein: 10, carbs: 2, fat: 6, fiber: 1, sugar: 0, isHealthy: true },
  'Tempeh': { servingSize: '3 oz (85g)', calories: 162, sodium: 9, protein: 15, carbs: 9, fat: 9, fiber: 0, sugar: 0, isHealthy: true },
  'Lentils': { servingSize: '1/2 cup cooked', calories: 115, sodium: 2, protein: 9, carbs: 20, fat: 0.4, fiber: 8, sugar: 2, isHealthy: true },
  'Black Beans': { servingSize: '1/2 cup cooked', calories: 114, sodium: 1, protein: 8, carbs: 20, fat: 0.5, fiber: 7.5, sugar: 0, isHealthy: true },
  'Chickpeas': { servingSize: '1/2 cup cooked', calories: 134, sodium: 6, protein: 7, carbs: 22, fat: 2, fiber: 6, sugar: 4, isHealthy: true },
  'Kidney Beans': { servingSize: '1/2 cup cooked', calories: 112, sodium: 2, protein: 8, carbs: 20, fat: 0.5, fiber: 6, sugar: 0, isHealthy: true },
  'Edamame': { servingSize: '1/2 cup shelled', calories: 95, sodium: 5, protein: 9, carbs: 7, fat: 4, fiber: 4, sugar: 2, isHealthy: true },
  'Lean Ground Turkey': { servingSize: '4 oz (113g)', calories: 160, sodium: 90, protein: 20, carbs: 0, fat: 8, fiber: 0, sugar: 0, isHealthy: true },
  'Tilapia': { servingSize: '4 oz (113g)', calories: 110, sodium: 48, protein: 23, carbs: 0, fat: 2, fiber: 0, sugar: 0, isHealthy: true },
  'Cod Fish': { servingSize: '4 oz (113g)', calories: 93, sodium: 78, protein: 20, carbs: 0, fat: 0.7, fiber: 0, sugar: 0, isHealthy: true },
  'Shrimp': { servingSize: '3 oz (85g)', calories: 84, sodium: 94, protein: 18, carbs: 0, fat: 1, fiber: 0, sugar: 0, isHealthy: true },

  // VEGETABLES
  'Steamed Broccoli': { servingSize: '1 cup (91g)', calories: 31, sodium: 30, protein: 2.5, carbs: 6, fat: 0.3, fiber: 2.4, sugar: 1.5, isHealthy: true },
  'Roasted Brussels Sprouts': { servingSize: '1 cup (88g)', calories: 38, sodium: 22, protein: 3, carbs: 8, fat: 0.3, fiber: 3.3, sugar: 1.9, isHealthy: true },
  'Spinach (raw)': { servingSize: '1 cup (30g)', calories: 7, sodium: 24, protein: 0.9, carbs: 1, fat: 0.1, fiber: 0.7, sugar: 0.1, isHealthy: true },
  'Kale (raw)': { servingSize: '1 cup (67g)', calories: 33, sodium: 29, protein: 2.2, carbs: 6, fat: 0.6, fiber: 1.3, sugar: 0.8, isHealthy: true },
  'Mixed Greens Salad': { servingSize: '2 cups', calories: 18, sodium: 28, protein: 1.5, carbs: 3, fat: 0.2, fiber: 1.5, sugar: 1, isHealthy: true },
  'Carrots (raw)': { servingSize: '1 medium', calories: 25, sodium: 42, protein: 0.6, carbs: 6, fat: 0.1, fiber: 1.7, sugar: 3, isHealthy: true },
  'Celery Sticks': { servingSize: '2 medium stalks', calories: 12, sodium: 64, protein: 0.6, carbs: 2, fat: 0.1, fiber: 1.2, sugar: 1, isHealthy: true },
  'Bell Peppers (raw)': { servingSize: '1 medium', calories: 31, sodium: 5, protein: 1, carbs: 7, fat: 0.3, fiber: 2.5, sugar: 5, isHealthy: true },
  'Cucumber Slices': { servingSize: '1/2 cup (52g)', calories: 8, sodium: 1, protein: 0.3, carbs: 2, fat: 0.1, fiber: 0.3, sugar: 0.9, isHealthy: true },
  'Cherry Tomatoes': { servingSize: '1 cup (149g)', calories: 27, sodium: 7, protein: 1.3, carbs: 6, fat: 0.3, fiber: 1.8, sugar: 4, isHealthy: true },
  'Asparagus (steamed)': { servingSize: '1 cup (134g)', calories: 27, sodium: 13, protein: 3, carbs: 5, fat: 0.2, fiber: 2.8, sugar: 2, isHealthy: true },
  'Green Beans': { servingSize: '1 cup (100g)', calories: 31, sodium: 6, protein: 1.8, carbs: 7, fat: 0.2, fiber: 2.7, sugar: 3.3, isHealthy: true },
  'Zucchini': { servingSize: '1 medium', calories: 33, sodium: 16, protein: 2.4, carbs: 6, fat: 0.6, fiber: 2, sugar: 5, isHealthy: true },
  'Cauliflower': { servingSize: '1 cup (107g)', calories: 27, sodium: 32, protein: 2, carbs: 5, fat: 0.3, fiber: 2.1, sugar: 2, isHealthy: true },
  'Sweet Potato (baked)': { servingSize: '1 medium', calories: 103, sodium: 41, protein: 2.3, carbs: 24, fat: 0.2, fiber: 3.8, sugar: 7, isHealthy: true },
  'Butternut Squash': { servingSize: '1 cup cubed', calories: 63, sodium: 6, protein: 1.4, carbs: 16, fat: 0.1, fiber: 2.8, sugar: 3, isHealthy: true },
  'Mushrooms': { servingSize: '1 cup (70g)', calories: 15, sodium: 3, protein: 2.2, carbs: 2, fat: 0.2, fiber: 0.7, sugar: 1.4, isHealthy: true },
  'Onions': { servingSize: '1 medium', calories: 44, sodium: 4, protein: 1.2, carbs: 10, fat: 0.1, fiber: 1.9, sugar: 4.7, isHealthy: true },
  'Garlic': { servingSize: '3 cloves', calories: 13, sodium: 2, protein: 0.6, carbs: 3, fat: 0, fiber: 0.2, sugar: 0.1, isHealthy: true },
  'Lettuce': { servingSize: '2 cups shredded', calories: 10, sodium: 20, protein: 0.9, carbs: 2, fat: 0.2, fiber: 1, sugar: 1, isHealthy: true },

  // FRUITS
  'Apple': { servingSize: '1 medium', calories: 95, sodium: 2, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, sugar: 19, isHealthy: true },
  'Banana': { servingSize: '1 medium', calories: 105, sodium: 1, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, sugar: 14, isHealthy: true },
  'Orange': { servingSize: '1 medium', calories: 62, sodium: 0, protein: 1.2, carbs: 15, fat: 0.2, fiber: 3.1, sugar: 12, isHealthy: true },
  'Strawberries': { servingSize: '1 cup (152g)', calories: 49, sodium: 2, protein: 1, carbs: 12, fat: 0.5, fiber: 3, sugar: 7, isHealthy: true },
  'Blueberries': { servingSize: '1 cup (148g)', calories: 84, sodium: 1, protein: 1.1, carbs: 21, fat: 0.5, fiber: 3.6, sugar: 15, isHealthy: true },
  'Raspberries': { servingSize: '1 cup (123g)', calories: 64, sodium: 1, protein: 1.5, carbs: 15, fat: 0.8, fiber: 8, sugar: 5, isHealthy: true },
  'Blackberries': { servingSize: '1 cup (144g)', calories: 62, sodium: 1, protein: 2, carbs: 14, fat: 0.7, fiber: 7.6, sugar: 7, isHealthy: true },
  'Grapes': { servingSize: '1 cup (151g)', calories: 104, sodium: 3, protein: 1.1, carbs: 27, fat: 0.2, fiber: 1.4, sugar: 23, isHealthy: true },
  'Watermelon': { servingSize: '1 cup diced', calories: 46, sodium: 2, protein: 0.9, carbs: 12, fat: 0.2, fiber: 0.6, sugar: 9, isHealthy: true },
  'Cantaloupe': { servingSize: '1 cup cubed', calories: 54, sodium: 26, protein: 1.3, carbs: 13, fat: 0.3, fiber: 1.4, sugar: 12, isHealthy: true },
  'Peach': { servingSize: '1 medium', calories: 59, sodium: 0, protein: 1.4, carbs: 14, fat: 0.4, fiber: 2.3, sugar: 13, isHealthy: true },
  'Pear': { servingSize: '1 medium', calories: 101, sodium: 2, protein: 0.6, carbs: 27, fat: 0.2, fiber: 5.5, sugar: 17, isHealthy: true },
  'Plum': { servingSize: '1 medium', calories: 30, sodium: 0, protein: 0.5, carbs: 8, fat: 0.2, fiber: 0.9, sugar: 7, isHealthy: true },
  'Kiwi': { servingSize: '1 medium', calories: 42, sodium: 2, protein: 0.8, carbs: 10, fat: 0.4, fiber: 2.1, sugar: 6, isHealthy: true },
  'Mango': { servingSize: '1 cup sliced', calories: 99, sodium: 2, protein: 1.4, carbs: 25, fat: 0.6, fiber: 2.6, sugar: 23, isHealthy: true },
  'Pineapple': { servingSize: '1 cup chunks', calories: 82, sodium: 2, protein: 0.9, carbs: 22, fat: 0.2, fiber: 2.3, sugar: 16, isHealthy: true },
  'Grapefruit': { servingSize: '1/2 medium', calories: 52, sodium: 0, protein: 0.9, carbs: 13, fat: 0.2, fiber: 2, sugar: 9, isHealthy: true },
  'Avocado': { servingSize: '1/2 medium', calories: 120, sodium: 5, protein: 1.5, carbs: 6, fat: 11, fiber: 5, sugar: 0.5, isHealthy: true },

  // WHOLE GRAINS
  'Brown Rice': { servingSize: '1 cup cooked', calories: 216, sodium: 2, protein: 5, carbs: 45, fat: 1.8, fiber: 3.5, sugar: 0.7, isHealthy: true },
  'Quinoa': { servingSize: '1 cup cooked', calories: 222, sodium: 13, protein: 8, carbs: 39, fat: 3.6, fiber: 5, sugar: 1.6, isHealthy: true },
  'Oatmeal (steel-cut)': { servingSize: '1 cup cooked', calories: 150, sodium: 0, protein: 5, carbs: 27, fat: 2.5, fiber: 4, sugar: 0, isHealthy: true },
  'Whole Wheat Bread': { servingSize: '1 slice', calories: 81, sodium: 144, protein: 4, carbs: 14, fat: 1, fiber: 2, sugar: 1.4, isHealthy: true },
  'Whole Wheat Pasta': { servingSize: '1 cup cooked', calories: 174, sodium: 4, protein: 7.5, carbs: 37, fat: 0.8, fiber: 6, sugar: 1, isHealthy: true },
  'Wild Rice': { servingSize: '1 cup cooked', calories: 166, sodium: 5, protein: 6.5, carbs: 35, fat: 0.6, fiber: 3, sugar: 1.2, isHealthy: true },
  'Barley': { servingSize: '1 cup cooked', calories: 193, sodium: 5, protein: 3.6, carbs: 44, fat: 0.7, fiber: 6, sugar: 0.5, isHealthy: true },
  'Farro': { servingSize: '1 cup cooked', calories: 200, sodium: 5, protein: 8, carbs: 40, fat: 1.5, fiber: 5, sugar: 1, isHealthy: true },
  'Whole Grain Cereal': { servingSize: '1 cup', calories: 120, sodium: 200, protein: 3, carbs: 25, fat: 1, fiber: 4, sugar: 5, isHealthy: true },
  'Ezekiel Bread': { servingSize: '1 slice', calories: 80, sodium: 75, protein: 4, carbs: 15, fat: 0.5, fiber: 3, sugar: 0, isHealthy: true },

  // NUTS & SEEDS
  'Almonds (unsalted)': { servingSize: '1 oz (23 nuts)', calories: 164, sodium: 0, protein: 6, carbs: 6, fat: 14, fiber: 3.5, sugar: 1, isHealthy: true },
  'Walnuts (unsalted)': { servingSize: '1 oz (14 halves)', calories: 185, sodium: 1, protein: 4.3, carbs: 4, fat: 18, fiber: 1.9, sugar: 0.7, isHealthy: true },
  'Chia Seeds': { servingSize: '1 oz (28g)', calories: 138, sodium: 5, protein: 4.7, carbs: 12, fat: 9, fiber: 10, sugar: 0, isHealthy: true },
  'Flax Seeds': { servingSize: '1 oz (28g)', calories: 150, sodium: 9, protein: 5, carbs: 8, fat: 12, fiber: 8, sugar: 0.4, isHealthy: true },
  'Pumpkin Seeds': { servingSize: '1 oz (28g)', calories: 151, sodium: 5, protein: 7, carbs: 5, fat: 13, fiber: 1.7, sugar: 0.4, isHealthy: true },
  'Sunflower Seeds': { servingSize: '1 oz (28g)', calories: 165, sodium: 1, protein: 5.5, carbs: 7, fat: 14, fiber: 3, sugar: 0.8, isHealthy: true },
  'Cashews (unsalted)': { servingSize: '1 oz (18 nuts)', calories: 157, sodium: 3, protein: 5, carbs: 9, fat: 12, fiber: 0.9, sugar: 2, isHealthy: true },
  'Pistachios (unsalted)': { servingSize: '1 oz (49 nuts)', calories: 159, sodium: 0, protein: 6, carbs: 8, fat: 13, fiber: 3, sugar: 2, isHealthy: true },
  'Peanut Butter (natural)': { servingSize: '2 tbsp', calories: 188, sodium: 5, protein: 8, carbs: 7, fat: 16, fiber: 2, sugar: 3, isHealthy: true },
  'Almond Butter': { servingSize: '2 tbsp', calories: 196, sodium: 2, protein: 7, carbs: 6, fat: 18, fiber: 3, sugar: 2, isHealthy: true },

  // DAIRY & ALTERNATIVES
  'Skim Milk': { servingSize: '1 cup (240ml)', calories: 83, sodium: 103, protein: 8, carbs: 12, fat: 0.2, fiber: 0, sugar: 12, isHealthy: true },
  'Almond Milk (unsweetened)': { servingSize: '1 cup (240ml)', calories: 30, sodium: 170, protein: 1, carbs: 1, fat: 2.5, fiber: 0, sugar: 0, isHealthy: true },
  'Oat Milk (unsweetened)': { servingSize: '1 cup (240ml)', calories: 120, sodium: 100, protein: 3, carbs: 16, fat: 5, fiber: 2, sugar: 7, isHealthy: true },
  'Low-Fat Cheese': { servingSize: '1 oz (28g)', calories: 49, sodium: 174, protein: 7, carbs: 0.6, fat: 2, fiber: 0, sugar: 0.1, isHealthy: true },
  'Mozzarella Cheese (part-skim)': { servingSize: '1 oz (28g)', calories: 72, sodium: 175, protein: 7, carbs: 0.8, fat: 4.5, fiber: 0, sugar: 0.1, isHealthy: true },

  // HEALTHY BEVERAGES
  'Water': { servingSize: '8 oz (240ml)', calories: 0, sodium: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, isHealthy: true },
  'Sparkling Water (unsweetened)': { servingSize: '8 oz (240ml)', calories: 0, sodium: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, isHealthy: true },
  'Green Tea (unsweetened)': { servingSize: '8 oz (240ml)', calories: 2, sodium: 2, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, isHealthy: true },
  'Black Tea (unsweetened)': { servingSize: '8 oz (240ml)', calories: 2, sodium: 7, protein: 0, carbs: 0.7, fat: 0, fiber: 0, sugar: 0, isHealthy: true },
  'Herbal Tea (unsweetened)': { servingSize: '8 oz (240ml)', calories: 2, sodium: 2, protein: 0, carbs: 0.5, fat: 0, fiber: 0, sugar: 0, isHealthy: true },
  'Black Coffee (unsweetened)': { servingSize: '8 oz (240ml)', calories: 2, sodium: 5, protein: 0.3, carbs: 0, fat: 0, fiber: 0, sugar: 0, isHealthy: true },
  'Iced Coffee (unsweetened)': { servingSize: '8 oz (240ml)', calories: 2, sodium: 5, protein: 0.3, carbs: 0, fat: 0, fiber: 0, sugar: 0, isHealthy: true },
  'Coconut Water': { servingSize: '8 oz (240ml)', calories: 46, sodium: 252, protein: 1.7, carbs: 9, fat: 0.5, fiber: 2.6, sugar: 6, isHealthy: true },
  'Vegetable Juice (low sodium)': { servingSize: '8 oz (240ml)', calories: 50, sodium: 140, protein: 2, carbs: 10, fat: 0, fiber: 2, sugar: 7, isHealthy: true },
  'Tomato Juice (low sodium)': { servingSize: '8 oz (240ml)', calories: 41, sodium: 24, protein: 2, carbs: 10, fat: 0.1, fiber: 1, sugar: 8, isHealthy: true },
  'Fresh Orange Juice (no sugar added)': { servingSize: '8 oz (240ml)', calories: 112, sodium: 2, protein: 2, carbs: 26, fat: 0.5, fiber: 0.5, sugar: 21, isHealthy: true },
  'Fresh Apple Juice (no sugar added)': { servingSize: '8 oz (240ml)', calories: 114, sodium: 10, protein: 0.2, carbs: 28, fat: 0.3, fiber: 0.5, sugar: 24, isHealthy: true },
  'Fresh Grapefruit Juice (no sugar added)': { servingSize: '8 oz (240ml)', calories: 96, sodium: 2, protein: 1.2, carbs: 23, fat: 0.2, fiber: 0.2, sugar: 22, isHealthy: true },
  'Lemon Water': { servingSize: '8 oz (240ml)', calories: 6, sodium: 1, protein: 0.1, carbs: 2, fat: 0, fiber: 0.1, sugar: 0.5, isHealthy: true },
  'Lime Water': { servingSize: '8 oz (240ml)', calories: 6, sodium: 2, protein: 0.1, carbs: 2, fat: 0, fiber: 0.1, sugar: 0.3, isHealthy: true },
  'Infused Water': { servingSize: '8 oz (240ml)', calories: 5, sodium: 0, protein: 0, carbs: 1, fat: 0, fiber: 0, sugar: 1, isHealthy: true },
  'Kombucha (low sugar)': { servingSize: '8 oz (240ml)', calories: 30, sodium: 10, protein: 0, carbs: 7, fat: 0, fiber: 0, sugar: 2, isHealthy: true },

  // UNHEALTHY FOODS
  'French Fries': { servingSize: 'Medium (117g)', calories: 365, sodium: 246, protein: 4, carbs: 48, fat: 17, fiber: 4.4, sugar: 0.4, isHealthy: false },
  'Pizza (pepperoni)': { servingSize: '1 slice (107g)', calories: 298, sodium: 760, protein: 13, carbs: 34, fat: 12, fiber: 2, sugar: 4, isHealthy: false },
  'Pizza (cheese)': { servingSize: '1 slice (107g)', calories: 272, sodium: 551, protein: 12, carbs: 34, fat: 10, fiber: 2, sugar: 3.5, isHealthy: false },
  'Hamburger': { servingSize: '1 burger', calories: 354, sodium: 497, protein: 20, carbs: 30, fat: 17, fiber: 1.5, sugar: 6, isHealthy: false },
  'Cheeseburger': { servingSize: '1 burger', calories: 432, sodium: 842, protein: 25, carbs: 32, fat: 22, fiber: 1.5, sugar: 7, isHealthy: false },
  'Hot Dog': { servingSize: '1 hot dog with bun', calories: 314, sodium: 810, protein: 11, carbs: 24, fat: 19, fiber: 1, sugar: 5, isHealthy: false },
  'Bacon': { servingSize: '3 slices', calories: 161, sodium: 581, protein: 12, carbs: 0.6, fat: 12, fiber: 0, sugar: 0, isHealthy: false },
  'Fried Chicken': { servingSize: '1 drumstick', calories: 193, sodium: 346, protein: 16, carbs: 6, fat: 11, fiber: 0, sugar: 0, isHealthy: false },
  'Chicken Wings': { servingSize: '4 wings', calories: 350, sodium: 940, protein: 30, carbs: 10, fat: 22, fiber: 0, sugar: 0, isHealthy: false },
  'Potato Chips': { servingSize: '1 oz (28g)', calories: 152, sodium: 149, protein: 2, carbs: 15, fat: 10, fiber: 1.4, sugar: 0.5, isHealthy: false },
  'Nachos': { servingSize: '6-8 chips with cheese', calories: 346, sodium: 816, protein: 9, carbs: 36, fat: 19, fiber: 2, sugar: 2, isHealthy: false },
  'Mac and Cheese': { servingSize: '1 cup', calories: 310, sodium: 730, protein: 11, carbs: 40, fat: 12, fiber: 2, sugar: 6, isHealthy: false },
  'Ice Cream': { servingSize: '1/2 cup', calories: 137, sodium: 53, protein: 2.3, carbs: 16, fat: 7, fiber: 0.5, sugar: 14, isHealthy: false },
  'Cookies': { servingSize: '2 medium cookies', calories: 150, sodium: 110, protein: 2, carbs: 20, fat: 7, fiber: 0.5, sugar: 11, isHealthy: false },
  'Cake': { servingSize: '1 slice', calories: 264, sodium: 242, protein: 3, carbs: 39, fat: 11, fiber: 0.5, sugar: 24, isHealthy: false },
  'Donut': { servingSize: '1 medium', calories: 269, sodium: 257, protein: 3.6, carbs: 31, fat: 15, fiber: 0.9, sugar: 12, isHealthy: false },
  'Candy Bar': { servingSize: '1 bar (44g)', calories: 215, sodium: 30, protein: 3, carbs: 28, fat: 11, fiber: 1, sugar: 23, isHealthy: false },
  'Onion Rings': { servingSize: '8-9 rings', calories: 276, sodium: 430, protein: 4, carbs: 31, fat: 16, fiber: 1, sugar: 3, isHealthy: false },
  'Mozzarella Sticks': { servingSize: '3 sticks', calories: 250, sodium: 700, protein: 10, carbs: 22, fat: 14, fiber: 1, sugar: 2, isHealthy: false },
  'Loaded Baked Potato': { servingSize: '1 potato', calories: 432, sodium: 478, protein: 11, carbs: 49, fat: 21, fiber: 5, sugar: 3, isHealthy: false },
  'Alfredo Pasta': { servingSize: '1 cup', calories: 543, sodium: 900, protein: 15, carbs: 54, fat: 28, fiber: 3, sugar: 4, isHealthy: false },
  'Fried Fish': { servingSize: '1 fillet', calories: 267, sodium: 484, protein: 15, carbs: 17, fat: 16, fiber: 0.6, sugar: 0.5, isHealthy: false },

  // UNHEALTHY BEVERAGES
  'Soda (Coke)': { servingSize: '12 oz can', calories: 140, sodium: 45, protein: 0, carbs: 39, fat: 0, fiber: 0, sugar: 39, isHealthy: false },
  'Soda (Pepsi)': { servingSize: '12 oz can', calories: 150, sodium: 30, protein: 0, carbs: 41, fat: 0, fiber: 0, sugar: 41, isHealthy: false },
  'Soda (Sprite)': { servingSize: '12 oz can', calories: 140, sodium: 65, protein: 0, carbs: 38, fat: 0, fiber: 0, sugar: 38, isHealthy: false },
  'Soda (Mountain Dew)': { servingSize: '12 oz can', calories: 170, sodium: 60, protein: 0, carbs: 46, fat: 0, fiber: 0, sugar: 46, isHealthy: false },
  'Sweet Tea': { servingSize: '8 oz (240ml)', calories: 90, sodium: 5, protein: 0, carbs: 24, fat: 0, fiber: 0, sugar: 23, isHealthy: false },
  'Lemonade (sweetened)': { servingSize: '8 oz (240ml)', calories: 99, sodium: 10, protein: 0, carbs: 26, fat: 0, fiber: 0.1, sugar: 24, isHealthy: false },
  'Energy Drink (Red Bull)': { servingSize: '8.4 oz can', calories: 110, sodium: 105, protein: 1, carbs: 28, fat: 0, fiber: 0, sugar: 27, isHealthy: false },
  'Energy Drink (Monster)': { servingSize: '16 oz can', calories: 210, sodium: 370, protein: 0, carbs: 54, fat: 0, fiber: 0, sugar: 54, isHealthy: false },
  'Sports Drink (Gatorade)': { servingSize: '12 oz', calories: 80, sodium: 160, protein: 0, carbs: 21, fat: 0, fiber: 0, sugar: 21, isHealthy: false },
  'Fruit Punch (sweetened)': { servingSize: '8 oz (240ml)', calories: 110, sodium: 20, protein: 0, carbs: 29, fat: 0, fiber: 0, sugar: 28, isHealthy: false },
  'Chocolate Milk (sweetened)': { servingSize: '8 oz (240ml)', calories: 208, sodium: 150, protein: 8, carbs: 26, fat: 8, fiber: 2, sugar: 24, isHealthy: false },
  'Frappuccino': { servingSize: '16 oz', calories: 370, sodium: 220, protein: 6, carbs: 54, fat: 15, fiber: 0, sugar: 50, isHealthy: false },
  'Milkshake (chocolate)': { servingSize: '16 oz', calories: 580, sodium: 330, protein: 15, carbs: 79, fat: 23, fiber: 2, sugar: 68, isHealthy: false },
  'Milkshake (vanilla)': { servingSize: '16 oz', calories: 560, sodium: 300, protein: 14, carbs: 73, fat: 22, fiber: 1, sugar: 63, isHealthy: false },
  'Milkshake (strawberry)': { servingSize: '16 oz', calories: 550, sodium: 290, protein: 13, carbs: 72, fat: 22, fiber: 1, sugar: 63, isHealthy: false },
  'Beer': { servingSize: '12 oz', calories: 153, sodium: 14, protein: 1.6, carbs: 13, fat: 0, fiber: 0, sugar: 0, isHealthy: false },
  'Wine': { servingSize: '5 oz', calories: 123, sodium: 6, protein: 0.1, carbs: 4, fat: 0, fiber: 0, sugar: 1, isHealthy: false },
  'Cocktail': { servingSize: '1 drink', calories: 200, sodium: 10, protein: 0, carbs: 20, fat: 0, fiber: 0, sugar: 18, isHealthy: false },
  'Juice Box (sweetened)': { servingSize: '6.75 oz', calories: 100, sodium: 15, protein: 0, carbs: 27, fat: 0, fiber: 0, sugar: 23, isHealthy: false },
  'Iced Tea (sweetened)': { servingSize: '8 oz (240ml)', calories: 90, sodium: 10, protein: 0, carbs: 24, fat: 0, fiber: 0, sugar: 22, isHealthy: false },
  'Coffee with Sugar and Cream': { servingSize: '8 oz (240ml)', calories: 65, sodium: 45, protein: 1, carbs: 8, fat: 3, fiber: 0, sugar: 7, isHealthy: false },
};

export function getNutritionData(foodName: string): NutritionData | null {
  return NUTRITION_DATABASE[foodName] || null;
}

export function parseAndLookupNutrition(foodItems: string): {
  totalNutrition: NutritionData;
  foundItems: string[];
  unknownItems: string[];
} {
  const items = foodItems.split(',').map(item => item.trim().replace(' ⚠️', ''));

  const totalNutrition: NutritionData = {
    servingSize: 'Combined',
    calories: 0,
    sodium: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    isHealthy: true,
  };

  const foundItems: string[] = [];
  const unknownItems: string[] = [];

  items.forEach(item => {
    const nutrition = getNutritionData(item);
    if (nutrition) {
      totalNutrition.calories += nutrition.calories;
      totalNutrition.sodium += nutrition.sodium;
      totalNutrition.protein += nutrition.protein;
      totalNutrition.carbs += nutrition.carbs;
      totalNutrition.fat += nutrition.fat;
      totalNutrition.fiber += nutrition.fiber;
      totalNutrition.sugar += nutrition.sugar;
      if (!nutrition.isHealthy) totalNutrition.isHealthy = false;
      foundItems.push(item);
    } else {
      unknownItems.push(item);
    }
  });

  // Round to 1 decimal place
  totalNutrition.calories = Math.round(totalNutrition.calories);
  totalNutrition.sodium = Math.round(totalNutrition.sodium);
  totalNutrition.protein = Math.round(totalNutrition.protein * 10) / 10;
  totalNutrition.carbs = Math.round(totalNutrition.carbs * 10) / 10;
  totalNutrition.fat = Math.round(totalNutrition.fat * 10) / 10;
  totalNutrition.fiber = Math.round(totalNutrition.fiber * 10) / 10;
  totalNutrition.sugar = Math.round(totalNutrition.sugar * 10) / 10;

  return { totalNutrition, foundItems, unknownItems };
}
