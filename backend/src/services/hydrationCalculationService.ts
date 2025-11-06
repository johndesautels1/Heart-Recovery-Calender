/**
 * Hydration Calculation Service
 *
 * Calculates daily water intake targets based on:
 * - Body weight
 * - Age
 * - Height (for metabolic rate estimation)
 * - Gender
 * - Activity level
 *
 * Clinical formulas based on:
 * - National Academies of Sciences, Engineering, and Medicine recommendations
 * - Institute of Medicine dietary reference intakes
 * - Age-adjusted needs for cardiac patients
 */

interface HydrationCalculationParams {
  weight: number; // in pounds
  age: number; // in years
  height?: number; // in inches
  gender?: 'male' | 'female' | 'other';
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active'; // daily activity
  exerciseMinutes?: number; // additional exercise minutes today
  hasHeartFailure?: boolean; // fluid restriction needed
  onDiuretics?: boolean; // may need slightly more
}

interface HydrationResult {
  targetOunces: number;
  minOunces: number;
  maxOunces: number;
  recommendation: string;
  warning?: string;
}

/**
 * Calculate daily water intake target
 *
 * Base formula: Weight (lbs) × multiplier
 * - Age 19-30: 0.5-0.6 oz/lb
 * - Age 31-50: 0.5 oz/lb
 * - Age 51-70: 0.45 oz/lb
 * - Age 70+: 0.4 oz/lb
 *
 * Adjustments:
 * - Gender: Males need ~3L (101 oz), females ~2.7L (91 oz) per day
 * - Height/BMI: Taller people have higher metabolic rate
 * - Activity: +12 oz per 30 min moderate exercise
 * - Cardiac: Heart failure patients often restricted to 1.5-2L (50-68 oz)
 */
export function calculateDailyWaterIntake(params: HydrationCalculationParams): HydrationResult {
  const { weight, age, height, gender, activityLevel = 'sedentary', exerciseMinutes = 0, hasHeartFailure = false, onDiuretics = false } = params;

  // STEP 1: Base calculation using age-adjusted multiplier
  let multiplier = 0.5; // default

  if (age < 19) {
    multiplier = 0.6; // growing, high metabolic rate
  } else if (age >= 19 && age <= 30) {
    multiplier = 0.55; // peak adult years
  } else if (age >= 31 && age <= 50) {
    multiplier = 0.5; // standard adult
  } else if (age >= 51 && age <= 70) {
    multiplier = 0.45; // decreased kidney function
  } else {
    multiplier = 0.4; // elderly, lower needs, aspiration risk
  }

  let baseOunces = weight * multiplier;

  // STEP 2: Gender adjustment (males need ~10% more)
  if (gender === 'male') {
    baseOunces *= 1.1;
  } else if (gender === 'female') {
    baseOunces *= 0.95;
  }

  // STEP 3: Activity level adjustment
  const activityAdjustments: Record<typeof activityLevel, number> = {
    sedentary: 0, // no additional
    light: 8, // +8 oz for light daily activity
    moderate: 16, // +16 oz for moderate daily activity
    active: 24, // +24 oz for active lifestyle
  };
  baseOunces += activityAdjustments[activityLevel];

  // STEP 4: Additional exercise adjustment (+12 oz per 30 min)
  const exerciseOunces = (exerciseMinutes / 30) * 12;
  baseOunces += exerciseOunces;

  // STEP 5: Height/metabolic rate adjustment (optional, if height provided)
  if (height) {
    // Taller people have higher BMR - rough adjustment
    // Average height: 69" (male), 64" (female)
    const avgHeight = gender === 'male' ? 69 : gender === 'female' ? 64 : 67;
    const heightDiffInches = height - avgHeight;
    // +/- 2 oz per inch above/below average
    baseOunces += heightDiffInches * 2;
  }

  // STEP 6: Medical condition adjustments
  let targetOunces = baseOunces;
  let minOunces = baseOunces * 0.8; // 80% of target
  let maxOunces = baseOunces * 1.2; // 120% of target
  let recommendation = '';
  let warning: string | undefined;

  if (hasHeartFailure) {
    // Heart failure patients typically restricted to 1.5-2L (50-68 oz)
    maxOunces = 68; // 2L maximum
    targetOunces = Math.min(targetOunces, 60); // aim for ~2L
    minOunces = 50; // 1.5L minimum
    warning = '⚠️ CARDIAC RESTRICTION: You have heart failure. Daily fluid intake should be limited to 50-68 oz (1.5-2L). ALWAYS follow your cardiologist\'s specific fluid restriction orders.';
    recommendation = 'Heart failure patients require careful fluid management. Track ALL fluids (water, coffee, soup, etc.). Weigh yourself daily - sudden weight gain may indicate fluid retention.';
  } else if (onDiuretics) {
    // On diuretics but no heart failure - may need slightly more
    minOunces *= 1.1;
    targetOunces *= 1.05;
    recommendation = 'You\'re taking diuretics (water pills). You may need slightly more fluids to compensate for increased urination. Monitor for signs of dehydration (dark urine, dizziness, fatigue).';
  } else {
    recommendation = 'Stay well hydrated throughout the day. Drink water with meals and between meals. Increase intake during hot weather or exercise.';
  }

  // Round all values
  targetOunces = Math.round(targetOunces);
  minOunces = Math.round(minOunces);
  maxOunces = Math.round(maxOunces);

  return {
    targetOunces,
    minOunces,
    maxOunces,
    recommendation,
    warning,
  };
}

/**
 * Calculate hydration status from actual intake vs target
 */
export function calculateHydrationStatus(actualOunces: number, targetOunces: number): {
  percentage: number;
  status: 'dehydrated' | 'low' | 'good' | 'excellent' | 'overhydrated';
  color: string;
  message: string;
} {
  const percentage = Math.round((actualOunces / targetOunces) * 100);

  if (percentage < 50) {
    return {
      percentage,
      status: 'dehydrated',
      color: '#ef4444', // red
      message: '🚨 Severely dehydrated - increase fluid intake immediately',
    };
  } else if (percentage >= 50 && percentage < 75) {
    return {
      percentage,
      status: 'low',
      color: '#eab308', // yellow
      message: '⚠️ Below target - drink more water',
    };
  } else if (percentage >= 75 && percentage < 90) {
    return {
      percentage,
      status: 'good',
      color: '#10b981', // green
      message: '✓ Good hydration - keep it up',
    };
  } else if (percentage >= 90 && percentage <= 120) {
    return {
      percentage,
      status: 'excellent',
      color: '#10b981', // green
      message: '✓ Excellent hydration!',
    };
  } else {
    return {
      percentage,
      status: 'overhydrated',
      color: '#3b82f6', // blue
      message: '💧 Above target - monitor for fluid retention (if cardiac patient)',
    };
  }
}
