import Medication, { KnownSideEffects } from '../models/Medication';
import User from '../models/User';
import Patient from '../models/Patient';
import { Op } from 'sequelize';

export interface HawkAlert {
  type: 'weight_gain' | 'weight_loss' | 'edema';
  severity: 'warning' | 'danger';
  medicationNames: string[];
  message: string;
  recommendation: string;
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
