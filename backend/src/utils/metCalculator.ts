/**
 * MET (Metabolic Equivalent of Task) Calculator
 *
 * METs represent the energy cost of physical activities.
 * 1 MET = resting metabolic rate (approximately 3.5 mL O2/kg/min)
 *
 * This utility calculates METs from heart rate data using the relationship
 * between heart rate and oxygen consumption.
 */

interface METCalculationInput {
  averageHeartRate?: number;
  maxHeartRate?: number;
  restingHeartRate?: number;
  age?: number;
  duration?: number; // in minutes
}

/**
 * Calculate METs from average heart rate during exercise
 *
 * Formula based on ACSM guidelines:
 * %HRR (Heart Rate Reserve) correlates with %VO2max
 * METs = 1 + (%HRR × 10)
 *
 * Where HRR = (HR_exercise - HR_rest) / (HR_max - HR_rest)
 */
export function calculateMETsFromHeartRate(input: METCalculationInput): number | null {
  const { averageHeartRate, maxHeartRate, restingHeartRate, age } = input;

  // Need at least average heart rate
  if (!averageHeartRate) {
    return null;
  }

  // If we have resting HR and max HR, use the precise formula
  if (restingHeartRate && maxHeartRate) {
    const hrReserve = maxHeartRate - restingHeartRate;
    if (hrReserve <= 0) return null;

    const hrReservePercent = (averageHeartRate - restingHeartRate) / hrReserve;
    const mets = 1 + (hrReservePercent * 10);

    return Math.max(1, Math.min(20, mets)); // Clamp between 1 and 20 METs
  }

  // If we have age, estimate max HR and use formula
  if (age) {
    const estimatedMaxHR = 220 - age;
    const estimatedRestingHR = restingHeartRate || 70; // Default resting HR

    const hrReserve = estimatedMaxHR - estimatedRestingHR;
    if (hrReserve <= 0) return null;

    const hrReservePercent = (averageHeartRate - estimatedRestingHR) / hrReserve;
    const mets = 1 + (hrReservePercent * 10);

    return Math.max(1, Math.min(20, mets));
  }

  // Simplified estimation based on heart rate ranges (least accurate)
  if (averageHeartRate < 100) {
    return 3; // Light activity
  } else if (averageHeartRate < 120) {
    return 5; // Moderate activity
  } else if (averageHeartRate < 140) {
    return 7; // Vigorous activity
  } else if (averageHeartRate < 160) {
    return 10; // Very vigorous
  } else {
    return 12; // Maximum effort
  }
}

/**
 * Get target MET range based on exercise intensity level
 */
export function getTargetMETRange(intensity: 'light' | 'moderate' | 'vigorous' | 'very_vigorous'): {
  min: number;
  max: number;
} {
  switch (intensity) {
    case 'light':
      return { min: 1.5, max: 3.0 };
    case 'moderate':
      return { min: 3.0, max: 6.0 };
    case 'vigorous':
      return { min: 6.0, max: 9.0 };
    case 'very_vigorous':
      return { min: 9.0, max: 12.0 };
    default:
      return { min: 3.0, max: 6.0 };
  }
}

/**
 * Estimate calorie burn from METs
 * Calories = METs × weight(kg) × duration(hours)
 */
export function calculateCaloriesFromMETs(
  mets: number,
  weightKg: number,
  durationMinutes: number
): number {
  const durationHours = durationMinutes / 60;
  return Math.round(mets * weightKg * durationHours);
}

/**
 * Get MET level description
 */
export function getMETLevelDescription(mets: number): string {
  if (mets < 3) return 'Light Intensity';
  if (mets < 6) return 'Moderate Intensity';
  if (mets < 9) return 'Vigorous Intensity';
  return 'Very Vigorous Intensity';
}

export default {
  calculateMETsFromHeartRate,
  getTargetMETRange,
  calculateCaloriesFromMETs,
  getMETLevelDescription,
};
