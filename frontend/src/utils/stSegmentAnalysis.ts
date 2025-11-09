/**
 * ST Segment Analysis Utility
 *
 * This utility analyzes the ST segment of ECG signals to detect ST elevation
 * or depression, which can indicate myocardial ischemia (heart attack) or
 * other cardiac conditions.
 *
 * ⚠️ WARNING: This is for monitoring purposes only. ST segment changes can
 * indicate life-threatening conditions. Always seek immediate medical attention
 * for chest pain or suspected heart attack.
 *
 * @author Claude Code
 * @date 2025-11-09
 */

export enum STSegmentStatus {
  NORMAL = 'Normal ST Segment',
  ELEVATED = 'ST Elevation',
  DEPRESSED = 'ST Depression',
  INSUFFICIENT_DATA = 'Insufficient Data',
}

export enum IschemiaSeverity {
  NONE = 'none',
  MILD = 'mild',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  CRITICAL = 'critical',
}

export interface STSegmentResult {
  status: STSegmentStatus;
  severity: IschemiaSeverity;
  stDeviation: number; // mV (positive = elevation, negative = depression)
  jPoint: number | null; // J-point voltage (mV)
  stSlope: number | null; // Slope of ST segment (mV/s)
  confidence: number; // 0-1
  alerts: string[];
  recommendations: string[];
}

export class STSegmentAnalyzer {
  private samplingRate: number;
  private readonly ST_ELEVATION_THRESHOLD = 0.1; // mV (1mm on ECG paper)
  private readonly ST_DEPRESSION_THRESHOLD = -0.05; // mV (0.5mm on ECG paper)
  private readonly CRITICAL_ELEVATION_THRESHOLD = 0.2; // mV (2mm on ECG paper)
  private readonly CRITICAL_DEPRESSION_THRESHOLD = -0.1; // mV (1mm on ECG paper)

  constructor(samplingRate: number = 130) {
    this.samplingRate = samplingRate;
  }

  /**
   * Analyze ST segment for a single heartbeat
   * @param ecgSegment - ECG signal for one heartbeat (R-peak to next R-peak)
   * @param rPeakIndex - Index of R-peak within the segment
   * @returns STSegmentResult
   */
  public analyzeBeat(
    ecgSegment: number[],
    rPeakIndex: number
  ): STSegmentResult {
    if (ecgSegment.length < this.samplingRate * 0.4) {
      return this.insufficientDataResult();
    }

    // Find QRS complex endpoints
    const qrsEnd = this.findQRSEnd(ecgSegment, rPeakIndex);
    if (qrsEnd === null) {
      return this.insufficientDataResult();
    }

    // J-point is at the end of QRS complex
    const jPoint = ecgSegment[qrsEnd];

    // Find T-wave start (ST segment ends where T-wave begins)
    const tWaveStart = this.findTWaveStart(ecgSegment, qrsEnd);
    if (tWaveStart === null) {
      return this.insufficientDataResult();
    }

    // Calculate baseline (isoelectric line) from PR segment
    const baseline = this.calculateBaseline(ecgSegment, rPeakIndex);

    // Measure ST segment at 60-80ms after J-point (standard measurement point)
    const stMeasurementPoint = qrsEnd + Math.round(0.07 * this.samplingRate); // 70ms
    if (stMeasurementPoint >= tWaveStart || stMeasurementPoint >= ecgSegment.length) {
      return this.insufficientDataResult();
    }

    const stVoltage = ecgSegment[stMeasurementPoint];
    const stDeviation = stVoltage - baseline;

    // Calculate ST slope
    const stSlope = this.calculateSTSlope(ecgSegment, qrsEnd, tWaveStart);

    // Classify ST segment
    let status: STSegmentStatus;
    let severity: IschemiaSeverity;
    let confidence: number;
    let alerts: string[] = [];
    let recommendations: string[] = [];

    if (stDeviation >= this.CRITICAL_ELEVATION_THRESHOLD) {
      status = STSegmentStatus.ELEVATED;
      severity = IschemiaSeverity.CRITICAL;
      confidence = 0.9;
      alerts.push('🚨 CRITICAL: Severe ST elevation detected');
      alerts.push('This may indicate acute myocardial infarction (heart attack)');
      alerts.push('CALL 911 IMMEDIATELY');
      recommendations.push('Seek emergency medical care NOW');
      recommendations.push('Do not drive yourself - call ambulance');
      recommendations.push('Chew aspirin if not allergic (unless instructed otherwise)');
    } else if (stDeviation >= this.ST_ELEVATION_THRESHOLD) {
      status = STSegmentStatus.ELEVATED;
      severity = stDeviation >= 0.15 ? IschemiaSeverity.SEVERE : IschemiaSeverity.MODERATE;
      confidence = 0.85;
      alerts.push('⚠️ ST elevation detected');
      if (severity === IschemiaSeverity.SEVERE) {
        alerts.push('Significant elevation - possible myocardial injury');
        recommendations.push('Seek immediate medical attention');
      } else {
        alerts.push('Moderate elevation - monitor closely');
        recommendations.push('Contact your cardiologist urgently');
      }
      recommendations.push('Note any chest pain, shortness of breath, or arm/jaw pain');
      recommendations.push('Avoid physical exertion');
    } else if (stDeviation <= this.CRITICAL_DEPRESSION_THRESHOLD) {
      status = STSegmentStatus.DEPRESSED;
      severity = IschemiaSeverity.SEVERE;
      confidence = 0.85;
      alerts.push('⚠️ Significant ST depression detected');
      alerts.push('This may indicate myocardial ischemia');
      recommendations.push('Seek medical attention promptly');
      recommendations.push('Monitor for chest pain or discomfort');
      recommendations.push('Stop any strenuous activity');
      recommendations.push('Contact your cardiologist');
    } else if (stDeviation <= this.ST_DEPRESSION_THRESHOLD) {
      status = STSegmentStatus.DEPRESSED;
      severity = IschemiaSeverity.MODERATE;
      confidence = 0.8;
      alerts.push('⚠️ ST depression detected');
      alerts.push('May indicate cardiac ischemia or other conditions');
      recommendations.push('Schedule appointment with cardiologist');
      recommendations.push('Monitor for symptoms during activity');
      recommendations.push('Keep log of when depression occurs');
    } else {
      status = STSegmentStatus.NORMAL;
      severity = IschemiaSeverity.NONE;
      confidence = 0.95;
      alerts.push('✅ Normal ST segment');
      recommendations.push('Continue regular cardiac monitoring');
      recommendations.push('Maintain heart-healthy lifestyle');
    }

    return {
      status,
      severity,
      stDeviation: Math.round(stDeviation * 1000) / 1000,
      jPoint: Math.round(jPoint * 1000) / 1000,
      stSlope: stSlope !== null ? Math.round(stSlope * 1000) / 1000 : null,
      confidence,
      alerts,
      recommendations,
    };
  }

  /**
   * Find end of QRS complex (S-wave end)
   * QRS typically lasts 60-100ms after R-peak
   */
  private findQRSEnd(ecgSegment: number[], rPeakIndex: number): number | null {
    const searchStart = rPeakIndex;
    const searchEnd = Math.min(
      ecgSegment.length - 1,
      rPeakIndex + Math.round(0.12 * this.samplingRate) // 120ms max QRS duration
    );

    // Find the point where signal starts to flatten (derivative near zero)
    const minSearchLength = Math.round(0.04 * this.samplingRate); // At least 40ms
    const qrsMinEnd = rPeakIndex + minSearchLength;

    for (let i = qrsMinEnd; i < searchEnd - 1; i++) {
      const slope = Math.abs(ecgSegment[i + 1] - ecgSegment[i]);
      const nextSlope = Math.abs(ecgSegment[i + 2] - ecgSegment[i + 1]);

      // Found the end of QRS when slope becomes very small
      if (slope < 0.02 && nextSlope < 0.02) {
        return i;
      }
    }

    // Default to 80ms after R-peak if not found
    return Math.min(searchEnd, rPeakIndex + Math.round(0.08 * this.samplingRate));
  }

  /**
   * Find start of T-wave
   * T-wave typically starts 100-200ms after R-peak
   */
  private findTWaveStart(ecgSegment: number[], qrsEnd: number): number | null {
    const searchStart = qrsEnd + Math.round(0.05 * this.samplingRate); // 50ms after QRS end
    const searchEnd = Math.min(
      ecgSegment.length - 1,
      qrsEnd + Math.round(0.3 * this.samplingRate) // 300ms max
    );

    if (searchStart >= ecgSegment.length) {
      return null;
    }

    // Find where slope starts increasing again (T-wave upslope)
    let maxSlope = 0;
    let maxSlopeIndex = searchStart;

    for (let i = searchStart; i < searchEnd - 1; i++) {
      const slope = Math.abs(ecgSegment[i + 1] - ecgSegment[i]);
      if (slope > maxSlope) {
        maxSlope = slope;
        maxSlopeIndex = i;
      }
    }

    // T-wave starts where slope begins to increase
    if (maxSlope > 0.01) {
      return maxSlopeIndex;
    }

    return null;
  }

  /**
   * Calculate baseline (isoelectric line) from PR segment
   * PR segment is before QRS complex
   */
  private calculateBaseline(ecgSegment: number[], rPeakIndex: number): number {
    // PR segment is typically 80-120ms before R-peak
    const prStart = Math.max(0, rPeakIndex - Math.round(0.12 * this.samplingRate));
    const prEnd = Math.max(0, rPeakIndex - Math.round(0.04 * this.samplingRate));

    if (prStart >= ecgSegment.length || prEnd >= ecgSegment.length) {
      return 0; // Assume baseline is zero if can't find PR segment
    }

    // Average voltage in PR segment
    let sum = 0;
    let count = 0;
    for (let i = prStart; i <= prEnd; i++) {
      sum += ecgSegment[i];
      count++;
    }

    return count > 0 ? sum / count : 0;
  }

  /**
   * Calculate ST segment slope
   */
  private calculateSTSlope(
    ecgSegment: number[],
    qrsEnd: number,
    tWaveStart: number
  ): number | null {
    if (tWaveStart - qrsEnd < 3) {
      return null;
    }

    const stStart = ecgSegment[qrsEnd];
    const stEnd = ecgSegment[tWaveStart - 1];
    const duration = (tWaveStart - qrsEnd) / this.samplingRate; // seconds

    return (stEnd - stStart) / duration; // mV/s
  }

  /**
   * Result for insufficient data
   */
  private insufficientDataResult(): STSegmentResult {
    return {
      status: STSegmentStatus.INSUFFICIENT_DATA,
      severity: IschemiaSeverity.NONE,
      stDeviation: 0,
      jPoint: null,
      stSlope: null,
      confidence: 0,
      alerts: ['ℹ️ Insufficient data for ST segment analysis'],
      recommendations: ['Ensure good electrode contact and minimal movement'],
    };
  }

  /**
   * Get color for severity (for UI display)
   */
  public static getSeverityColor(severity: IschemiaSeverity): string {
    switch (severity) {
      case IschemiaSeverity.NONE:
        return 'green';
      case IschemiaSeverity.MILD:
        return 'blue';
      case IschemiaSeverity.MODERATE:
        return 'orange';
      case IschemiaSeverity.SEVERE:
        return 'red';
      case IschemiaSeverity.CRITICAL:
        return 'purple';
      default:
        return 'gray';
    }
  }
}

/**
 * Convenience function for one-time ST segment analysis
 */
export function analyzeSTSegment(
  ecgSegment: number[],
  rPeakIndex: number,
  samplingRate: number = 130
): STSegmentResult {
  const analyzer = new STSegmentAnalyzer(samplingRate);
  return analyzer.analyzeBeat(ecgSegment, rPeakIndex);
}
