// Medical Risk Calculation Utilities for CIA Reports

/**
 * Calculate Vascular Age based on cardiovascular risk factors
 * Formula based on Framingham Heart Study vascular age calculation
 */
export function calculateVascularAge(params: {
  chronologicalAge: number;
  systolicBP: number;
  totalCholesterol?: number;
  hdlCholesterol?: number;
  smoking: boolean;
  diabetes: boolean;
  gender: 'male' | 'female';
}): {
  vascularAge: number;
  difference: number;
  interpretation: string;
} {
  const { chronologicalAge, systolicBP, totalCholesterol = 200, hdlCholesterol = 50, smoking, diabetes, gender } = params;

  // Base age adjustment factors
  let ageAdjustment = 0;

  // Blood pressure impact (per 10mmHg above 120)
  if (systolicBP > 120) {
    ageAdjustment += ((systolicBP - 120) / 10) * 2.5;
  }

  // Cholesterol impact
  if (totalCholesterol > 200) {
    ageAdjustment += ((totalCholesterol - 200) / 40) * 3;
  }
  if (hdlCholesterol < 40) {
    ageAdjustment += (40 - hdlCholesterol) / 5;
  }

  // Smoking adds ~7-10 years to vascular age
  if (smoking) {
    ageAdjustment += gender === 'male' ? 8 : 7;
  }

  // Diabetes adds ~7-15 years
  if (diabetes) {
    ageAdjustment += gender === 'male' ? 10 : 12;
  }

  const vascularAge = Math.round(chronologicalAge + ageAdjustment);
  const difference = vascularAge - chronologicalAge;

  let interpretation = '';
  if (difference <= -5) {
    interpretation = 'Excellent! Your arteries are significantly younger than your chronological age.';
  } else if (difference <= -1) {
    interpretation = 'Great! Your arteries are younger than your age.';
  } else if (difference <= 1) {
    interpretation = 'Good. Your vascular age matches your chronological age.';
  } else if (difference <= 5) {
    interpretation = 'Caution. Your arteries are aging faster than expected.';
  } else if (difference <= 10) {
    interpretation = 'Warning. Significant vascular aging detected. Lifestyle changes recommended.';
  } else {
    interpretation = 'Critical. Your arteries show advanced aging. Immediate medical attention recommended.';
  }

  return {
    vascularAge,
    difference,
    interpretation,
  };
}

/**
 * Calculate 10-Year Framingham Risk Score for CVD
 * Estimates risk of heart attack, stroke, or cardiovascular death
 */
export function calculateFraminghamRisk(params: {
  age: number;
  gender: 'male' | 'female';
  totalCholesterol: number;
  hdlCholesterol: number;
  systolicBP: number;
  onBPMeds: boolean;
  smoking: boolean;
  diabetes: boolean;
}): {
  riskPercent: number;
  riskCategory: 'low' | 'moderate' | 'high' | 'very_high';
  interpretation: string;
} {
  const { age, gender, totalCholesterol, hdlCholesterol, systolicBP, onBPMeds, smoking, diabetes } = params;

  // Simplified Framingham point system
  let points = 0;

  // Age points (simplified)
  if (age >= 70) points += gender === 'male' ? 11 : 12;
  else if (age >= 60) points += gender === 'male' ? 8 : 9;
  else if (age >= 50) points += gender === 'male' ? 6 : 7;
  else if (age >= 40) points += gender === 'male' ? 4 : 4;
  else points += 0;

  // Cholesterol points
  if (totalCholesterol >= 280) points += 3;
  else if (totalCholesterol >= 240) points += 2;
  else if (totalCholesterol >= 200) points += 1;

  // HDL points (protective)
  if (hdlCholesterol >= 60) points -= 1;
  else if (hdlCholesterol < 40) points += 1;

  // Blood pressure points
  if (systolicBP >= 160) points += onBPMeds ? 3 : 2;
  else if (systolicBP >= 140) points += onBPMeds ? 2 : 1;
  else if (systolicBP >= 120) points += onBPMeds ? 1 : 0;

  // Smoking
  if (smoking) points += gender === 'male' ? 2 : 3;

  // Diabetes
  if (diabetes) points += 2;

  // Convert points to risk percentage (simplified mapping)
  let riskPercent = 0;
  if (points <= 0) riskPercent = 1;
  else if (points <= 5) riskPercent = 3;
  else if (points <= 10) riskPercent = 8;
  else if (points <= 15) riskPercent = 16;
  else if (points <= 20) riskPercent = 30;
  else riskPercent = 45;

  // Risk category
  let riskCategory: 'low' | 'moderate' | 'high' | 'very_high';
  if (riskPercent < 10) riskCategory = 'low';
  else if (riskPercent < 20) riskCategory = 'moderate';
  else if (riskPercent < 30) riskCategory = 'high';
  else riskCategory = 'very_high';

  // Interpretation
  let interpretation = '';
  if (riskCategory === 'low') {
    interpretation = `Low risk: ${riskPercent}% chance of cardiovascular event in next 10 years. Maintain healthy lifestyle.`;
  } else if (riskCategory === 'moderate') {
    interpretation = `Moderate risk: ${riskPercent}% chance of cardiovascular event in next 10 years. Lifestyle changes recommended.`;
  } else if (riskCategory === 'high') {
    interpretation = `High risk: ${riskPercent}% chance of cardiovascular event in next 10 years. Medical intervention recommended.`;
  } else {
    interpretation = `Very high risk: ${riskPercent}% chance of cardiovascular event in next 10 years. Immediate medical attention required.`;
  }

  return {
    riskPercent,
    riskCategory,
    interpretation,
  };
}

/**
 * Calculate ASCVD (Atherosclerotic Cardiovascular Disease) 10-Year Risk
 * American College of Cardiology/American Heart Association calculator
 */
export function calculateASCVDRisk(params: {
  age: number;
  gender: 'male' | 'female';
  race: 'white' | 'black' | 'other';
  totalCholesterol: number;
  hdlCholesterol: number;
  systolicBP: number;
  onBPMeds: boolean;
  smoking: boolean;
  diabetes: boolean;
}): {
  riskPercent: number;
  riskCategory: 'low' | 'borderline' | 'intermediate' | 'high';
  interpretation: string;
} {
  // Simplified ASCVD calculation (actual formula uses logarithms and race-specific coefficients)
  const { age, gender, totalCholesterol, hdlCholesterol, systolicBP, onBPMeds, smoking, diabetes } = params;

  // Base risk increases with age exponentially
  let baseRisk = gender === 'male' ? (age - 40) * 0.8 : (age - 40) * 0.6;
  if (baseRisk < 0) baseRisk = 0.5;

  // Risk multipliers
  let multiplier = 1.0;

  if (totalCholesterol > 240) multiplier *= 1.5;
  else if (totalCholesterol > 200) multiplier *= 1.2;

  if (hdlCholesterol < 40) multiplier *= 1.4;
  else if (hdlCholesterol > 60) multiplier *= 0.7;

  if (systolicBP > 160) multiplier *= onBPMeds ? 1.6 : 1.8;
  else if (systolicBP > 140) multiplier *= onBPMeds ? 1.3 : 1.4;

  if (smoking) multiplier *= 2.0;
  if (diabetes) multiplier *= 1.8;

  const riskPercent = Math.min(Math.round(baseRisk * multiplier * 10) / 10, 50);

  // ASCVD risk categories
  let riskCategory: 'low' | 'borderline' | 'intermediate' | 'high';
  if (riskPercent < 5) riskCategory = 'low';
  else if (riskPercent < 7.5) riskCategory = 'borderline';
  else if (riskPercent < 20) riskCategory = 'intermediate';
  else riskCategory = 'high';

  let interpretation = '';
  if (riskCategory === 'low') {
    interpretation = `Low ASCVD risk (<5%). Continue healthy lifestyle. Statin therapy not typically recommended.`;
  } else if (riskCategory === 'borderline') {
    interpretation = `Borderline ASCVD risk (5-7.5%). Discuss risk-benefit of statin therapy with physician.`;
  } else if (riskCategory === 'intermediate') {
    interpretation = `Intermediate ASCVD risk (7.5-20%). Statin therapy recommended. Coronary calcium score may help refine risk.`;
  } else {
    interpretation = `High ASCVD risk (≥20%). Intensive risk reduction recommended. High-intensity statin therapy indicated.`;
  }

  return {
    riskPercent,
    riskCategory,
    interpretation,
  };
}

/**
 * Detect statistical anomalies in vitals data
 */
export function detectAnomalies(values: number[]): {
  outliers: number[];
  outlierIndices: number[];
  mean: number;
  stdDev: number;
  threshold: number;
} {
  if (values.length < 3) {
    return { outliers: [], outlierIndices: [], mean: 0, stdDev: 0, threshold: 0 };
  }

  // Calculate mean
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

  // Calculate standard deviation
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Outliers are values > 2 standard deviations from mean
  const threshold = 2 * stdDev;
  const outliers: number[] = [];
  const outlierIndices: number[] = [];

  values.forEach((val, idx) => {
    if (Math.abs(val - mean) > threshold) {
      outliers.push(val);
      outlierIndices.push(idx);
    }
  });

  return {
    outliers,
    outlierIndices,
    mean,
    stdDev,
    threshold,
  };
}
