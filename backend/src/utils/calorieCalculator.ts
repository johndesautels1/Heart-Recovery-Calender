/**
 * Calorie Calculator Utility
 * Calculates calories burned during exercise based on:
 * - Exercise category
 * - Duration
 * - Intensity (difficulty level)
 * - Patient weight (optional adjustment)
 */

// Base calorie burn rates per minute (for 150 lb person at moderate intensity)
const BASE_CALORIES_PER_MINUTE: Record<string, number> = {
  // Cardio exercises
  cardio: 7,
  walking: 3.5,
  running: 10,
  cycling: 8,
  swimming: 10,
  elliptical: 7,
  rowing: 8,
  hiking: 6,
  stairs: 9,

  // Strength exercises
  upper_body: 4,
  lower_body: 5,
  full_body: 5.5,
  core: 4,
  strength: 4.5,

  // Flexibility exercises
  flexibility: 3,
  stretching: 2.5,
  yoga: 3,
  balance: 2.5,
};

// Intensity multipliers based on difficulty
const INTENSITY_MULTIPLIERS: Record<string, number> = {
  easy: 0.8,
  beginner: 0.8,
  moderate: 1.0,
  intermediate: 1.0,
  hard: 1.2,
  advanced: 1.2,
};

/**
 * Calculate calories burned during exercise
 * @param category - Exercise category (cardio, upper_body, etc.)
 * @param durationMinutes - Duration in minutes
 * @param difficulty - Difficulty level (easy, moderate, hard)
 * @param patientWeight - Optional patient weight in lbs (defaults to 150)
 * @returns Calories burned
 */
export function calculateCaloriesBurned(
  category: string,
  durationMinutes: number,
  difficulty: string = 'moderate',
  patientWeight?: number
): number {
  // Get base calorie rate for category (default to moderate cardio if unknown)
  const baseRate = BASE_CALORIES_PER_MINUTE[category.toLowerCase()] || 5;

  // Get intensity multiplier
  const intensityMultiplier = INTENSITY_MULTIPLIERS[difficulty.toLowerCase()] || 1.0;

  // Calculate base calories (for 150 lb person)
  let calories = baseRate * durationMinutes * intensityMultiplier;

  // Adjust for patient weight if provided (linear scaling)
  // Formula: calories × (actualWeight / 150)
  if (patientWeight && patientWeight > 0) {
    calories = calories * (patientWeight / 150);
  }

  // Round to nearest integer
  return Math.round(calories);
}

/**
 * Get calorie burn rate per minute for an exercise
 * @param category - Exercise category
 * @param difficulty - Difficulty level
 * @param patientWeight - Optional patient weight
 * @returns Calories per minute
 */
export function getCalorieRatePerMinute(
  category: string,
  difficulty: string = 'moderate',
  patientWeight?: number
): number {
  return calculateCaloriesBurned(category, 1, difficulty, patientWeight);
}

/**
 * Estimate calories for a full workout session
 * @param exercises - Array of exercises with category, duration, difficulty
 * @param patientWeight - Optional patient weight
 * @returns Total calories burned
 */
export function calculateWorkoutCalories(
  exercises: Array<{
    category: string;
    durationMinutes: number;
    difficulty?: string;
  }>,
  patientWeight?: number
): number {
  let totalCalories = 0;

  for (const exercise of exercises) {
    totalCalories += calculateCaloriesBurned(
      exercise.category,
      exercise.durationMinutes,
      exercise.difficulty || 'moderate',
      patientWeight
    );
  }

  return Math.round(totalCalories);
}
