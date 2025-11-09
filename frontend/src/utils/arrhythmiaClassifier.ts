/**
 * Arrhythmia Classification Utility
 *
 * This utility analyzes R-R intervals and ECG characteristics to classify
 * cardiac arrhythmias. This is for monitoring purposes only and should not
 * replace professional medical diagnosis.
 *
 * @author Claude Code
 * @date 2025-11-09
 */

export enum ArrhythmiaType {
  NORMAL_SINUS = 'Normal Sinus Rhythm',
  SINUS_BRADYCARDIA = 'Sinus Bradycardia',
  SINUS_TACHYCARDIA = 'Sinus Tachycardia',
  ATRIAL_FIBRILLATION = 'Atrial Fibrillation',
  PREMATURE_VENTRICULAR_CONTRACTION = 'Premature Ventricular Contraction',
  VENTRICULAR_TACHYCARDIA = 'Ventricular Tachycardia',
  IRREGULAR_RHYTHM = 'Irregular Rhythm',
  INSUFFICIENT_DATA = 'Insufficient Data',
}

export enum RiskLevel {
  NORMAL = 'normal',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ArrhythmiaClassification {
  type: ArrhythmiaType;
  riskLevel: RiskLevel;
  confidence: number; // 0-1
  heartRate: number; // BPM
  rrMean: number; // Mean R-R interval (ms)
  rrStdDev: number; // Standard deviation of R-R intervals (ms)
  irregularityScore: number; // 0-1 (0 = regular, 1 = highly irregular)
  pvcCount: number; // Number of detected PVCs
  recommendations: string[];
  alerts: string[];
}

export class ArrhythmiaClassifier {
  private readonly NORMAL_HR_MIN = 60; // BPM
  private readonly NORMAL_HR_MAX = 100; // BPM
  private readonly BRADYCARDIA_THRESHOLD = 60; // BPM
  private readonly TACHYCARDIA_THRESHOLD = 100; // BPM
  private readonly VT_THRESHOLD = 120; // BPM
  private readonly IRREGULAR_THRESHOLD = 0.3; // RR variation coefficient
  private readonly AFIB_IRREGULARITY_THRESHOLD = 0.4;
  private readonly PVC_EARLY_THRESHOLD = 0.8; // 80% of expected RR interval

  /**
   * Classify arrhythmia based on R-R intervals
   * @param rrIntervals - Array of R-R intervals in milliseconds
   * @param ecgSignal - Optional raw ECG signal for additional analysis
   * @returns ArrhythmiaClassification object
   */
  public classify(
    rrIntervals: number[],
    ecgSignal?: number[]
  ): ArrhythmiaClassification {
    // Check for insufficient data
    if (rrIntervals.length < 5) {
      return this.insufficientDataResult();
    }

    // Calculate basic metrics
    const rrMean = this.calculateMean(rrIntervals);
    const rrStdDev = this.calculateStdDev(rrIntervals, rrMean);
    const heartRate = 60000 / rrMean; // Convert ms to BPM
    const irregularityScore = this.calculateIrregularityScore(rrIntervals, rrMean, rrStdDev);

    // Detect PVCs (Premature Ventricular Contractions)
    const pvcCount = this.detectPVCs(rrIntervals);

    // Classify rhythm
    let type: ArrhythmiaType;
    let riskLevel: RiskLevel;
    let confidence: number;
    let recommendations: string[] = [];
    let alerts: string[] = [];

    // Atrial Fibrillation Detection
    if (irregularityScore > this.AFIB_IRREGULARITY_THRESHOLD && rrIntervals.length >= 10) {
      type = ArrhythmiaType.ATRIAL_FIBRILLATION;
      riskLevel = RiskLevel.HIGH;
      confidence = Math.min(0.95, irregularityScore);
      alerts.push('⚠️ Atrial fibrillation detected - high stroke risk');
      alerts.push('Seek immediate medical attention');
      recommendations.push('Contact your cardiologist immediately');
      recommendations.push('Avoid strenuous activity');
      recommendations.push('Monitor for symptoms: chest pain, shortness of breath, dizziness');
    }
    // Ventricular Tachycardia Detection
    else if (heartRate >= this.VT_THRESHOLD && pvcCount >= 3) {
      type = ArrhythmiaType.VENTRICULAR_TACHYCARDIA;
      riskLevel = RiskLevel.CRITICAL;
      confidence = 0.85;
      alerts.push('🚨 CRITICAL: Ventricular tachycardia detected');
      alerts.push('Call emergency services (911) immediately');
      recommendations.push('Seek emergency medical care NOW');
      recommendations.push('Do not drive yourself to hospital');
    }
    // PVC Detection
    else if (pvcCount > 0 && pvcCount < 3) {
      type = ArrhythmiaType.PREMATURE_VENTRICULAR_CONTRACTION;
      riskLevel = pvcCount === 1 ? RiskLevel.LOW : RiskLevel.MODERATE;
      confidence = 0.75;
      if (pvcCount > 1) {
        alerts.push('⚠️ Multiple PVCs detected');
      } else {
        alerts.push('ℹ️ Occasional PVC detected (usually benign)');
      }
      recommendations.push('Monitor frequency of PVCs');
      recommendations.push('Reduce caffeine and stress');
      recommendations.push('Mention to your doctor at next appointment');
    }
    // Sinus Tachycardia
    else if (heartRate > this.TACHYCARDIA_THRESHOLD && irregularityScore < this.IRREGULAR_THRESHOLD) {
      type = ArrhythmiaType.SINUS_TACHYCARDIA;
      riskLevel = heartRate > 150 ? RiskLevel.MODERATE : RiskLevel.LOW;
      confidence = 0.9;
      if (heartRate > 150) {
        alerts.push('⚠️ Elevated heart rate detected');
      }
      recommendations.push('Rest and hydrate if heart rate is elevated without activity');
      recommendations.push('Check for fever, dehydration, or anxiety');
      if (heartRate > 150) {
        recommendations.push('Consult doctor if sustained >30 minutes at rest');
      }
    }
    // Sinus Bradycardia
    else if (heartRate < this.BRADYCARDIA_THRESHOLD && irregularityScore < this.IRREGULAR_THRESHOLD) {
      type = ArrhythmiaType.SINUS_BRADYCARDIA;
      // Bradycardia can be normal in athletes
      riskLevel = heartRate < 40 ? RiskLevel.MODERATE : RiskLevel.LOW;
      confidence = 0.9;
      if (heartRate < 40) {
        alerts.push('⚠️ Very low heart rate detected');
        recommendations.push('Monitor for dizziness or fainting');
        recommendations.push('Consult doctor if experiencing symptoms');
      } else {
        alerts.push('ℹ️ Low heart rate (may be normal for athletes)');
        recommendations.push('Monitor for symptoms: dizziness, fatigue, chest pain');
      }
    }
    // Irregular Rhythm (unclassified)
    else if (irregularityScore > this.IRREGULAR_THRESHOLD) {
      type = ArrhythmiaType.IRREGULAR_RHYTHM;
      riskLevel = RiskLevel.MODERATE;
      confidence = 0.7;
      alerts.push('⚠️ Irregular heart rhythm detected');
      recommendations.push('Schedule appointment with cardiologist');
      recommendations.push('Keep log of symptoms and timing');
      recommendations.push('Avoid triggers: caffeine, alcohol, stress');
    }
    // Normal Sinus Rhythm
    else {
      type = ArrhythmiaType.NORMAL_SINUS;
      riskLevel = RiskLevel.NORMAL;
      confidence = 0.95;
      alerts.push('✅ Normal heart rhythm');
      recommendations.push('Continue regular cardiac monitoring');
      recommendations.push('Maintain healthy lifestyle and exercise routine');
    }

    return {
      type,
      riskLevel,
      confidence,
      heartRate: Math.round(heartRate),
      rrMean: Math.round(rrMean),
      rrStdDev: Math.round(rrStdDev * 10) / 10,
      irregularityScore: Math.round(irregularityScore * 100) / 100,
      pvcCount,
      recommendations,
      alerts,
    };
  }

  /**
   * Calculate mean of array
   */
  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate irregularity score (coefficient of variation)
   */
  private calculateIrregularityScore(
    rrIntervals: number[],
    mean: number,
    stdDev: number
  ): number {
    if (mean === 0) return 0;
    return stdDev / mean; // Coefficient of variation
  }

  /**
   * Detect Premature Ventricular Contractions (PVCs)
   * PVCs are characterized by:
   * - Short R-R interval followed by compensatory pause
   * - Different QRS morphology (requires ECG analysis)
   */
  private detectPVCs(rrIntervals: number[]): number {
    let pvcCount = 0;

    for (let i = 1; i < rrIntervals.length - 1; i++) {
      const prevRR = rrIntervals[i - 1];
      const currentRR = rrIntervals[i];
      const nextRR = rrIntervals[i + 1];

      // Average of surrounding intervals
      const expectedRR = (prevRR + nextRR) / 2;

      // Check for premature beat (short RR) followed by compensatory pause
      const isPremature = currentRR < expectedRR * this.PVC_EARLY_THRESHOLD;
      const hasCompensatoryPause = nextRR > expectedRR * 1.2;

      if (isPremature && hasCompensatoryPause) {
        pvcCount++;
      }
    }

    return pvcCount;
  }

  /**
   * Result for insufficient data
   */
  private insufficientDataResult(): ArrhythmiaClassification {
    return {
      type: ArrhythmiaType.INSUFFICIENT_DATA,
      riskLevel: RiskLevel.NORMAL,
      confidence: 0,
      heartRate: 0,
      rrMean: 0,
      rrStdDev: 0,
      irregularityScore: 0,
      pvcCount: 0,
      recommendations: ['Collect more data for accurate classification (minimum 10 seconds)'],
      alerts: ['ℹ️ Insufficient data for classification'],
    };
  }

  /**
   * Get color for risk level (for UI display)
   */
  public static getRiskColor(riskLevel: RiskLevel): string {
    switch (riskLevel) {
      case RiskLevel.NORMAL:
        return 'green';
      case RiskLevel.LOW:
        return 'blue';
      case RiskLevel.MODERATE:
        return 'orange';
      case RiskLevel.HIGH:
        return 'red';
      case RiskLevel.CRITICAL:
        return 'purple';
      default:
        return 'gray';
    }
  }
}

/**
 * Convenience function for one-time classification
 */
export function classifyArrhythmia(
  rrIntervals: number[],
  ecgSignal?: number[]
): ArrhythmiaClassification {
  const classifier = new ArrhythmiaClassifier();
  return classifier.classify(rrIntervals, ecgSignal);
}
