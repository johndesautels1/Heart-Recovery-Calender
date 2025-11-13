/**
 * HAWK Alert Service - Heart Activity Warning & Knowledge System
 *
 * Detects LIFE-THREATENING combinations of:
 * - Weather conditions
 * - Medications
 * - Cardiac function (EF)
 * - Planned activities
 * - Current hydration status
 *
 * CRITICAL MEDICAL COMBINATIONS (100% REAL):
 * 1. Outdoor exercise + Heat >85°F + Diuretics = DEADLY dehydration risk
 * 2. EF <40% + High-intensity exercise = Cardiac event risk
 * 3. Heat >95°F + Dehydration + Beta-blockers = Heat stroke risk
 * 4. Outdoor activity + Extreme heat (>105°F) = Medical emergency risk
 *
 * This is life-and-death serious - these alerts MUST be accurate.
 */

interface HAWKAlertParams {
  // Patient data
  ejectionFraction?: number;
  hasHeartFailure?: boolean;
  medications?: string[]; // Medication names
  currentHydration?: number; // oz consumed today
  targetHydration?: number; // oz target for today

  // Activity data
  activityType?: 'rest' | 'walking' | 'light_exercise' | 'moderate_exercise' | 'vigorous_exercise';
  activityLocation?: 'indoor' | 'outdoor';
  activityDuration?: number; // minutes

  // Weather data
  temperature?: number; // Fahrenheit
  humidity?: number; // percentage
  weatherCondition?: 'safe' | 'caution' | 'danger' | 'extreme';
}

interface HAWKAlert {
  id: string;
  severity: 'info' | 'warning' | 'danger' | 'critical';
  category: 'hydration' | 'cardiac' | 'medication' | 'weather' | 'combination';
  title: string;
  message: string;
  actions: string[]; // Recommended actions
  isDismissable: boolean; // Critical alerts cannot be dismissed
}

/**
 * Analyze patient situation and generate HAWK alerts
 */
export function analyzeForHAWKAlerts(params: HAWKAlertParams): HAWKAlert[] {
  const alerts: HAWKAlert[] = [];

  // CRITICAL COMBINATION 1: Outdoor Exercise + Heat + Diuretics
  checkOutdoorExerciseHeatDiuretics(params, alerts);

  // CRITICAL COMBINATION 2: Low EF + High-Intensity Exercise
  checkLowEFHighIntensity(params, alerts);

  // CRITICAL COMBINATION 3: Extreme Heat + Dehydration
  checkExtremeHeatDehydration(params, alerts);

  // CRITICAL COMBINATION 4: Heat + Beta-Blockers (impaired heat response)
  checkHeatBetaBlockers(params, alerts);

  // CRITICAL COMBINATION 5: Heart Failure + Overhydration
  checkHeartFailureOverhydration(params, alerts);

  // Weather-only warnings
  checkWeatherAlerts(params, alerts);

  // Medication-specific alerts
  checkMedicationAlerts(params, alerts);

  return alerts;
}

/**
 * CRITICAL: Outdoor exercise + Heat + Diuretics = DEADLY
 *
 * MEDICAL ATTESTATION:
 * - Diuretics (Lasix) cause fluid loss
 * - Exercise causes additional fluid loss through sweat
 * - Heat amplifies both effects
 * - This combination can cause:
 *   - Severe dehydration
 *   - Electrolyte imbalance
 *   - Cardiac arrhythmias
 *   - Sudden cardiac death
 */
function checkOutdoorExerciseHeatDiuretics(params: HAWKAlertParams, alerts: HAWKAlert[]) {
  const hasDiuretics = params.medications?.some(med =>
    med.toLowerCase().includes('lasix') ||
    med.toLowerCase().includes('furosemide') ||
    med.toLowerCase().includes('diuretic') ||
    med.toLowerCase().includes('bumetanide') ||
    med.toLowerCase().includes('torsemide')
  );

  const isOutdoorActivity = params.activityLocation === 'outdoor';
  const isExercise = params.activityType && ['light_exercise', 'moderate_exercise', 'vigorous_exercise'].includes(params.activityType);
  const isDangerousHeat = params.temperature && params.temperature >= 85;

  if (hasDiuretics && isOutdoorActivity && isExercise && isDangerousHeat) {
    const severity = params.temperature! >= 95 ? 'critical' : 'danger';

    alerts.push({
      id: 'hawk_diuretic_heat_exercise',
      severity,
      category: 'combination',
      title: '🚨 CRITICAL: Deadly Dehydration Risk Detected',
      message: `DANGER: You are planning outdoor exercise in ${params.temperature}°F heat while taking diuretics (Lasix). This combination is LIFE-THREATENING and can cause severe dehydration, electrolyte imbalance, and cardiac arrhythmias.`,
      actions: [
        '❌ CANCEL outdoor activity or move indoors (air conditioning)',
        '💧 Drink 24-32 oz water BEFORE any activity',
        '⏰ Reschedule to early morning (<75°F) or evening',
        '📞 Call your cardiologist if you experience: dizziness, chest pain, rapid heartbeat, or extreme fatigue',
        '🏥 Have someone nearby - do NOT exercise alone',
      ],
      isDismissable: false, // CANNOT be dismissed - too dangerous
    });
  }
}

/**
 * CRITICAL: EF <40% + High-Intensity Exercise
 *
 * MEDICAL ATTESTATION:
 * - EF <40% = Severely reduced heart function (HFrEF)
 * - Heart cannot pump enough blood during intense exercise
 * - Risk of: cardiac arrest, ventricular arrhythmias, acute decompensation
 */
function checkLowEFHighIntensity(params: HAWKAlertParams, alerts: HAWKAlert[]) {
  const hasLowEF = params.ejectionFraction && params.ejectionFraction < 40;
  const isHighIntensity = params.activityType === 'vigorous_exercise' || params.activityType === 'moderate_exercise';

  if (hasLowEF && isHighIntensity) {
    alerts.push({
      id: 'hawk_low_ef_high_intensity',
      severity: 'critical',
      category: 'cardiac',
      title: '🚨 CARDIAC RISK: Exercise Contraindicated',
      message: `CRITICAL: Your ejection fraction is ${params.ejectionFraction}% (severely reduced). High-intensity exercise is medically CONTRAINDICATED and poses serious cardiac event risk.`,
      actions: [
        '❌ DO NOT perform this high-intensity activity',
        '🚶 Limit to light walking only (10-15 min, slow pace)',
        '📞 Consult cardiologist before ANY exercise program',
        '💓 Monitor heart rate - stop immediately if >100 bpm or if you feel: chest pain, shortness of breath, dizziness',
        '🏥 Call 911 if you experience chest pain or severe shortness of breath',
      ],
      isDismissable: false,
    });
  }
}

/**
 * CRITICAL: Extreme Heat + Dehydration
 */
function checkExtremeHeatDehydration(params: HAWKAlertParams, alerts: HAWKAlert[]) {
  const isExtremeHeat = params.temperature && params.temperature >= 95;
  const isDehydrated = params.currentHydration && params.targetHydration &&
    (params.currentHydration / params.targetHydration) < 0.5; // Less than 50% of target

  if (isExtremeHeat && isDehydrated) {
    alerts.push({
      id: 'hawk_extreme_heat_dehydration',
      severity: 'critical',
      category: 'combination',
      title: '🚨 HEAT STROKE RISK: Critically Dehydrated in Extreme Heat',
      message: `EMERGENCY: You are severely dehydrated (${params.currentHydration}oz / ${params.targetHydration}oz target) and the temperature is ${params.temperature}°F. This is a medical emergency risk.`,
      actions: [
        '💧 Drink 16-24 oz water IMMEDIATELY',
        '❄️ Get to air conditioning NOW',
        '❌ NO outdoor activities today',
        '🌡️ Monitor for heat stroke symptoms: confusion, rapid pulse, hot/dry skin, nausea',
        '🏥 Call 911 if you experience: confusion, seizures, loss of consciousness, or inability to drink',
      ],
      isDismissable: false,
    });
  }
}

/**
 * DANGER: Heat + Beta-Blockers
 *
 * MEDICAL ATTESTATION:
 * - Beta-blockers (Metoprolol, Carvedilol) reduce heart rate
 * - This impairs body's ability to cool itself via increased circulation
 * - Patients on beta-blockers have reduced heat tolerance
 */
function checkHeatBetaBlockers(params: HAWKAlertParams, alerts: HAWKAlert[]) {
  const hasBetaBlockers = params.medications?.some(med =>
    med.toLowerCase().includes('metoprolol') ||
    med.toLowerCase().includes('carvedilol') ||
    med.toLowerCase().includes('atenolol') ||
    med.toLowerCase().includes('bisoprolol') ||
    med.toLowerCase().includes('beta blocker') ||
    med.toLowerCase().includes('beta-blocker')
  );

  const isDangerousHeat = params.temperature && params.temperature >= 90;

  if (hasBetaBlockers && isDangerousHeat) {
    alerts.push({
      id: 'hawk_heat_beta_blockers',
      severity: 'danger',
      category: 'medication',
      title: '⚠️ Heat Intolerance Risk: Beta-Blockers',
      message: `WARNING: You're taking beta-blockers which reduce your body's ability to regulate temperature in heat (${params.temperature}°F). You have reduced heat tolerance.`,
      actions: [
        '❄️ Stay in air conditioning as much as possible',
        '💧 Increase hydration by 16-24 oz',
        '⏰ If outdoor activity is necessary, limit to early morning (<80°F)',
        '👕 Wear light, loose clothing',
        '🌡️ Monitor for: dizziness, excessive fatigue, confusion (signs of heat stress)',
      ],
      isDismissable: true,
    });
  }
}

/**
 * CRITICAL: Heart Failure + Overhydration
 */
function checkHeartFailureOverhydration(params: HAWKAlertParams, alerts: HAWKAlert[]) {
  const hasHeartFailure = params.hasHeartFailure || (params.ejectionFraction && params.ejectionFraction < 50);
  const isOverhydrated = params.currentHydration && params.targetHydration &&
    params.currentHydration > params.targetHydration * 1.2; // More than 120% of target

  if (hasHeartFailure && isOverhydrated) {
    alerts.push({
      id: 'hawk_chf_overhydration',
      severity: 'danger',
      category: 'cardiac',
      title: '⚠️ FLUID OVERLOAD RISK: Exceeding Cardiac Limit',
      message: `WARNING: You have heart failure and are consuming excessive fluids (${params.currentHydration}oz vs ${params.targetHydration}oz limit). This can cause fluid retention and pulmonary edema.`,
      actions: [
        '❌ STOP drinking fluids for now',
        '⚖️ Weigh yourself - sudden weight gain (>2-3 lbs overnight) requires immediate medical attention',
        '👀 Monitor for: swelling in legs/feet, shortness of breath, difficulty lying flat',
        '📞 Call cardiologist if you notice these symptoms',
        '💊 Take your diuretic as prescribed - do NOT skip',
      ],
      isDismissable: false,
    });
  }
}

/**
 * Weather-specific alerts
 */
function checkWeatherAlerts(params: HAWKAlertParams, alerts: HAWKAlert[]) {
  if (params.temperature && params.temperature >= 105) {
    alerts.push({
      id: 'hawk_extreme_heat',
      severity: 'critical',
      category: 'weather',
      title: '🚨 EXTREME HEAT WARNING',
      message: `EXTREME HEAT ADVISORY: ${params.temperature}°F is life-threatening, espeCAIlly for cardiac patients.`,
      actions: [
        '❄️ Stay indoors with air conditioning',
        '❌ NO outdoor activities',
        '💧 Increase fluid intake by 24-32 oz',
        '📞 Check in with family/friends regularly',
      ],
      isDismissable: false,
    });
  }
}

/**
 * Medication-specific alerts
 */
function checkMedicationAlerts(params: HAWKAlertParams, alerts: HAWKAlert[]) {
  // ACE inhibitors can cause low blood pressure in heat
  const hasACEInhibitors = params.medications?.some(med =>
    med.toLowerCase().includes('lisinopril') ||
    med.toLowerCase().includes('enalapril') ||
    med.toLowerCase().includes('ramipril')
  );

  if (hasACEInhibitors && params.temperature && params.temperature >= 90) {
    alerts.push({
      id: 'hawk_ace_heat',
      severity: 'warning',
      category: 'medication',
      title: '⚠️ Low Blood Pressure Risk',
      message: `Your ACE inhibitor medication combined with ${params.temperature}°F heat may cause low blood pressure and dizziness.`,
      actions: [
        '💧 Stay well hydrated',
        '🧍 Stand up slowly to avoid dizziness',
        '📊 Monitor blood pressure if possible',
        '📞 Call doctor if: severe dizziness, fainting, or confusion',
      ],
      isDismissable: true,
    });
  }
}
