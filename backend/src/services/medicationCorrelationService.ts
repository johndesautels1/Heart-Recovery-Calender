import Medication, { KnownSideEffects } from '../models/Medication';
import User from '../models/User';
import Patient from '../models/Patient';
import { Op } from 'sequelize';

export interface HawkAlert {
  type: 'weight_gain' | 'weight_loss' | 'edema' | 'hyperglycemia' | 'hypoglycemia' | 'food_medication_interaction';
  severity: 'warning' | 'danger';
  medicationNames: string[];
  message: string;
  recommendation: string;
  foodItems?: string[]; // For food-medication interactions
}

/**
 * Check for medication correlations with weight changes
 * @param userId - User ID to check
 * @param weightChange - Weight change in lbs (positive for gain, negative for loss)
 * @param changePerWeek - Rate of weight change per week
 * @returns HawkAlert if correlation found, null otherwise
 */
export async function checkWeightChangeMedicationCorrelation(
  userId: number,
  weightChange: number,
  changePerWeek: number
): Promise<HawkAlert | null> {
  try {
    // Get user's active medications
    const medications = await Medication.findAll({
      where: {
        userId,
        isActive: true,
        knownSideEffects: { [Op.not]: null }
      }
    });

    // Determine if gaining or losing weight
    const isGaining = weightChange > 0;
    const relevantSideEffect = isGaining ? 'weightGain' : 'weightLoss';

    // Find medications with the relevant side effect
    const correlatedMeds = medications.filter(med => {
      const sideEffects = med.knownSideEffects as KnownSideEffects;
      return sideEffects && sideEffects[relevantSideEffect] === true;
    });

    if (correlatedMeds.length === 0) {
      return null;
    }

    // Determine severity based on rate of change
    const severity: 'warning' | 'danger' = changePerWeek > 3.5 ? 'danger' : 'warning';

    const medicationNames = correlatedMeds.map(med => med.name);
    const medList = medicationNames.join(', ');

    const direction = isGaining ? 'gain' : 'loss';
    const message = `🦅 HAWK ALERT: Possible Medication-Induced Weight ${direction === 'gain' ? 'Gain' : 'Loss'} - Investigate!`;

    const recommendation = `You are experiencing rapid weight ${direction} (${Math.abs(weightChange).toFixed(1)} lbs, ${changePerWeek.toFixed(1)} lbs/week). The following medication(s) are known to cause weight ${direction}: ${medList}. Contact your healthcare provider to discuss if medication adjustments are needed.`;

    return {
      type: isGaining ? 'weight_gain' : 'weight_loss',
      severity,
      medicationNames,
      message,
      recommendation
    };
  } catch (error) {
    console.error('[MED_CORRELATION] Error checking weight change correlation:', error);
    return null;
  }
}

/**
 * Check for medication correlations with edema
 * @param userId - User ID to check
 * @param edemaSeverity - Edema severity level
 * @param edemaLocation - Location of edema
 * @returns HawkAlert if correlation found, null otherwise
 */
export async function checkEdemaMedicationCorrelation(
  userId: number,
  edemaSeverity: 'mild' | 'moderate' | 'severe',
  edemaLocation?: string
): Promise<HawkAlert | null> {
  try {
    // Get user's active medications
    const medications = await Medication.findAll({
      where: {
        userId,
        isActive: true,
        knownSideEffects: { [Op.not]: null }
      }
    });

    // Find medications with edema or fluid retention side effects
    const correlatedMeds = medications.filter(med => {
      const sideEffects = med.knownSideEffects as KnownSideEffects;
      return sideEffects && (sideEffects.edema === true || sideEffects.fluidRetention === true);
    });

    if (correlatedMeds.length === 0) {
      return null;
    }

    // Determine severity
    const severity: 'warning' | 'danger' = (edemaSeverity === 'severe') ? 'danger' : 'warning';

    const medicationNames = correlatedMeds.map(med => med.name);
    const medList = medicationNames.join(', ');

    const message = `🦅 HAWK ALERT: Possible Medication-Induced Edema - Investigate!`;

    const location = edemaLocation ? ` in your ${edemaLocation}` : '';
    const recommendation = `You are experiencing ${edemaSeverity} edema${location}. The following medication(s) are known to cause fluid retention/edema: ${medList}. This could indicate fluid buildup, which is dangerous for heart patients. Contact your healthcare provider immediately to discuss if medication adjustments or diuretics are needed.`;

    return {
      type: 'edema',
      severity,
      medicationNames,
      message,
      recommendation
    };
  } catch (error) {
    console.error('[MED_CORRELATION] Error checking edema correlation:', error);
    return null;
  }
}

/**
 * Get care team members to notify for Hawk Alerts
 * @param userId - User ID
 * @returns Array of User objects (therapists/admins assigned to this patient)
 */
export async function getCareTeamForNotification(userId: number): Promise<User[]> {
  try {
    // Get patient profile
    const patient = await Patient.findOne({ where: { userId } });

    if (!patient) {
      return [];
    }

    // Get therapists and admins
    const careTeam = await User.findAll({
      where: {
        role: {
          [Op.in]: ['therapist', 'admin']
        }
      }
    });

    return careTeam;
  } catch (error) {
    console.error('[MED_CORRELATION] Error getting care team:', error);
    return [];
  }
}

/**
 * Common heart medications with known side effects
 * This can be used to populate the knownSideEffects field when medications are created
 */
export const COMMON_HEART_MEDICATION_SIDE_EFFECTS: Record<string, KnownSideEffects> = {
  // Beta Blockers - often cause weight gain
  'metoprolol': { weightGain: true, fatigue: true },
  'carvedilol': { weightGain: true, dizziness: true, fatigue: true },
  'atenolol': { weightGain: true, fatigue: true },
  'propranolol': { weightGain: true, fatigue: true },

  // Calcium Channel Blockers - cause edema/fluid retention
  'amlodipine': { edema: true, fluidRetention: true, dizziness: true },
  'diltiazem': { edema: true, dizziness: true },
  'nifedipine': { edema: true, fluidRetention: true },

  // Diuretics - cause weight loss through fluid loss
  'furosemide': { weightLoss: true },
  'lasix': { weightLoss: true },
  'hydrochlorothiazide': { weightLoss: true },
  'spironolactone': { weightLoss: true },

  // Corticosteroids - cause weight gain and fluid retention
  'prednisone': { weightGain: true, edema: true, fluidRetention: true },
  'dexamethasone': { weightGain: true, edema: true, fluidRetention: true },

  // NSAIDs - cause fluid retention
  'ibuprofen': { fluidRetention: true, edema: true },
  'naproxen': { fluidRetention: true, edema: true },

  // Antidepressants - some cause weight gain
  'sertraline': { weightGain: true },
  'paroxetine': { weightGain: true },
  'amitriptyline': { weightGain: true },
};

/**
 * Auto-populate known side effects for a medication based on its name
 * @param medicationName - Name of the medication (case-insensitive)
 * @returns KnownSideEffects object if found, null otherwise
 */
export function autoPopulateSideEffects(medicationName: string): KnownSideEffects | null {
  const normalizedName = medicationName.toLowerCase().trim();

  // Check exact match first
  if (COMMON_HEART_MEDICATION_SIDE_EFFECTS[normalizedName]) {
    return COMMON_HEART_MEDICATION_SIDE_EFFECTS[normalizedName];
  }

  // Check if medication name contains a known medication (for brand names, etc.)
  for (const [knownMed, sideEffects] of Object.entries(COMMON_HEART_MEDICATION_SIDE_EFFECTS)) {
    if (normalizedName.includes(knownMed)) {
      return sideEffects;
    }
  }

  return null;
}

/**
 * Check for medication correlations with high blood sugar (hyperglycemia)
 * @param userId - User ID to check
 * @param bloodSugar - Blood sugar level in mg/dL
 * @returns HawkAlert if correlation found, null otherwise
 */
export async function checkHyperglycemiaMedicationCorrelation(
  userId: number,
  bloodSugar: number
): Promise<HawkAlert | null> {
  try {
    // High blood sugar threshold: >140 mg/dL (fasting) or >180 mg/dL (post-meal)
    // For simplicity, we'll use >180 mg/dL as "danger" and >140 as "warning"
    if (bloodSugar <= 140) {
      return null;
    }

    // Get user's active medications
    const medications = await Medication.findAll({
      where: {
        userId,
        isActive: true,
        knownSideEffects: { [Op.not]: null }
      }
    });

    // Find medications that raise blood sugar
    const correlatedMeds = medications.filter(med => {
      const sideEffects = med.knownSideEffects as KnownSideEffects;
      return sideEffects && sideEffects.raisesBloodSugar === true;
    });

    if (correlatedMeds.length === 0) {
      return null;
    }

    const severity: 'warning' | 'danger' = bloodSugar > 180 ? 'danger' : 'warning';
    const medicationNames = correlatedMeds.map(med => med.name);
    const medList = medicationNames.join(', ');

    const message = `🦅 HAWK ALERT: Possible Medication-Induced High Blood Sugar - Investigate!`;
    const recommendation = `Your blood sugar is elevated (${bloodSugar} mg/dL). The following medication(s) are known to raise blood sugar: ${medList}. High blood sugar is especially dangerous for heart patients. Contact your healthcare provider immediately to discuss if medication adjustments or additional diabetes management is needed.`;

    return {
      type: 'hyperglycemia',
      severity,
      medicationNames,
      message,
      recommendation
    };
  } catch (error) {
    console.error('[MED_CORRELATION] Error checking hyperglycemia correlation:', error);
    return null;
  }
}

/**
 * Check for medication correlations with low blood sugar (hypoglycemia)
 * @param userId - User ID to check
 * @param bloodSugar - Blood sugar level in mg/dL
 * @returns HawkAlert if correlation found, null otherwise
 */
export async function checkHypoglycemiaMedicationCorrelation(
  userId: number,
  bloodSugar: number
): Promise<HawkAlert | null> {
  try {
    // Low blood sugar threshold: <70 mg/dL is danger, <80 is warning
    if (bloodSugar >= 80) {
      return null;
    }

    // Get user's active medications
    const medications = await Medication.findAll({
      where: {
        userId,
        isActive: true,
        knownSideEffects: { [Op.not]: null }
      }
    });

    // Find medications that lower blood sugar
    const correlatedMeds = medications.filter(med => {
      const sideEffects = med.knownSideEffects as KnownSideEffects;
      return sideEffects && sideEffects.lowersBloodSugar === true;
    });

    if (correlatedMeds.length === 0) {
      return null;
    }

    const severity: 'warning' | 'danger' = bloodSugar < 70 ? 'danger' : 'warning';
    const medicationNames = correlatedMeds.map(med => med.name);
    const medList = medicationNames.join(', ');

    const message = `🦅 HAWK ALERT: Possible Medication-Induced Low Blood Sugar - URGENT!`;
    const recommendation = `Your blood sugar is dangerously low (${bloodSugar} mg/dL). The following medication(s) are known to lower blood sugar: ${medList}. Hypoglycemia can cause confusion, fainting, and is life-threatening. EAT OR DRINK SOMETHING WITH SUGAR IMMEDIATELY (juice, candy, glucose tablets). Contact your healthcare provider or call 911 if symptoms worsen.`;

    return {
      type: 'hypoglycemia',
      severity,
      medicationNames,
      message,
      recommendation
    };
  } catch (error) {
    console.error('[MED_CORRELATION] Error checking hypoglycemia correlation:', error);
    return null;
  }
}

/**
 * Check for dangerous food-medication interactions
 * @param userId - User ID to check
 * @param recentMeals - Recent meal data (sodium, sugar content)
 * @param bloodSugar - Optional blood sugar reading
 * @returns HawkAlert if dangerous interaction found, null otherwise
 */
export async function checkFoodMedicationInteraction(
  userId: number,
  recentMeals: { sodium?: number; sugar?: number; items?: string[] },
  bloodSugar?: number
): Promise<HawkAlert | null> {
  try {
    // Get user's active medications
    const medications = await Medication.findAll({
      where: {
        userId,
        isActive: true,
        knownSideEffects: { [Op.not]: null }
      }
    });

    const alerts: HawkAlert[] = [];

    // Check for high sodium + medications that interact with sodium
    if (recentMeals.sodium && recentMeals.sodium > 2000) {
      const sodiumInteractMeds = medications.filter(med => {
        const sideEffects = med.knownSideEffects as KnownSideEffects;
        return sideEffects && sideEffects.interactsWithSodium === true;
      });

      if (sodiumInteractMeds.length > 0 && bloodSugar && bloodSugar > 140) {
        const medicationNames = sodiumInteractMeds.map(med => med.name);
        const medList = medicationNames.join(', ');

        alerts.push({
          type: 'food_medication_interaction',
          severity: 'danger',
          medicationNames,
          foodItems: recentMeals.items || ['High-sodium foods'],
          message: `🦅 HAWK ALERT: Dangerous Food-Medication Combination Detected!`,
          recommendation: `You consumed high sodium (${recentMeals.sodium}mg) with elevated blood sugar (${bloodSugar} mg/dL) while taking: ${medList}. This combination is especially dangerous for heart patients and can cause fluid retention, increased blood pressure, and worsened diabetes. Reduce sodium intake immediately and monitor your vitals closely.`
        });
      }
    }

    // Check for high sugar + medications that raise blood sugar
    if (recentMeals.sugar && recentMeals.sugar > 50 && bloodSugar && bloodSugar > 140) {
      const sugarInteractMeds = medications.filter(med => {
        const sideEffects = med.knownSideEffects as KnownSideEffects;
        return sideEffects && (sideEffects.interactsWithSugar === true || sideEffects.raisesBloodSugar === true);
      });

      if (sugarInteractMeds.length > 0) {
        const medicationNames = sugarInteractMeds.map(med => med.name);
        const medList = medicationNames.join(', ');

        alerts.push({
          type: 'food_medication_interaction',
          severity: 'warning',
          medicationNames,
          foodItems: recentMeals.items || ['High-sugar foods'],
          message: `🦅 HAWK ALERT: High Sugar Intake with Blood Sugar-Raising Medication!`,
          recommendation: `You consumed high sugar (${recentMeals.sugar}g) and your blood sugar is elevated (${bloodSugar} mg/dL) while taking: ${medList}. This medication can further raise your blood sugar. Avoid sugary foods and monitor your glucose levels frequently.`
        });
      }
    }

    return alerts.length > 0 ? alerts[0] : null;
  } catch (error) {
    console.error('[MED_CORRELATION] Error checking food-medication interaction:', error);
    return null;
  }
}
