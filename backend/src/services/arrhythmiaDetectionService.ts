/**
 * Arrhythmia Detection Service
 * Analyzes heart rate patterns from Polar H10 to detect abnormal rhythms
 *
 * Detects:
 * - Atrial Fibrillation (AFib): Irregular R-R intervals, chaotic variability
 * - Premature Ventricular Contractions (PVCs): Sudden large changes followed by compensatory pause
 * - Premature Atrial Contractions (PACs): Early beats with slightly irregular pattern
 * - Bradycardia: Sustained low heart rate <50 bpm
 * - Tachycardia: Sustained high heart rate >120 bpm
 */

import VitalsSample from '../models/VitalsSample';
import Alert from '../models/Alert';
import User from '../models/User';
import { sendSMS, sendEmail } from './notificationService';
import { Op } from 'sequelize';

interface ArrhythmiaDetectionResult {
  detected: boolean;
  arrhythmiaType?: 'afib' | 'pvc' | 'pac' | 'bradycardia' | 'tachycardia';
  severity: 'warning' | 'critical';
  confidence: number; // 0-100%
  description: string;
  recommendation: string;
  metrics: {
    avgHeartRate: number;
    minHeartRate: number;
    maxHeartRate: number;
    heartRateRange: number;
    avgChange: number;
    maxChange: number;
    stdDev: number;
    irregularityScore: number;
  };
}

/**
 * Analyze recent heart rate data for arrhythmias
 * Looks at last 2-5 minutes of HR data (minimum 60 readings for reliable detection)
 */
export async function detectArrhythmia(userId: number): Promise<ArrhythmiaDetectionResult | null> {
  try {
    // Get last 5 minutes of heart rate data
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const recentReadings = await VitalsSample.findAll({
      where: {
        userId,
        heartRate: { [Op.ne]: null },
        timestamp: { [Op.gte]: fiveMinutesAgo },
      },
      order: [['timestamp', 'ASC']],
      limit: 300, // Max 300 readings (5 min at 1 reading/sec)
    });

    // Need minimum 60 readings (1 minute) for reliable detection
    if (recentReadings.length < 60) {
      return null;
    }

    const heartRates = recentReadings.map(r => r.heartRate!);
    const timestamps = recentReadings.map(r => r.timestamp);

    // Calculate metrics
    const avgHR = heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length;
    const minHR = Math.min(...heartRates);
    const maxHR = Math.max(...heartRates);
    const hrRange = maxHR - minHR;

    // Calculate beat-to-beat changes
    const changes: number[] = [];
    for (let i = 1; i < heartRates.length; i++) {
      changes.push(Math.abs(heartRates[i] - heartRates[i - 1]));
    }

    const avgChange = changes.reduce((sum, c) => sum + c, 0) / changes.length;
    const maxChange = Math.max(...changes);

    // Calculate standard deviation of HR
    const variance = heartRates.reduce((sum, hr) => sum + Math.pow(hr - avgHR, 2), 0) / heartRates.length;
    const stdDev = Math.sqrt(variance);

    // Calculate irregularity score (normalized variance of consecutive changes)
    const changeVariance = changes.reduce((sum, c) => sum + Math.pow(c - avgChange, 2), 0) / changes.length;
    const irregularityScore = Math.sqrt(changeVariance);

    const metrics = {
      avgHeartRate: Math.round(avgHR * 10) / 10,
      minHeartRate: minHR,
      maxHeartRate: maxHR,
      heartRateRange: hrRange,
      avgChange: Math.round(avgChange * 10) / 10,
      maxChange,
      stdDev: Math.round(stdDev * 10) / 10,
      irregularityScore: Math.round(irregularityScore * 10) / 10,
    };

    // DETECTION ALGORITHM 1: Atrial Fibrillation (AFib)
    // AFib characteristics:
    // - Highly irregular R-R intervals (high irregularity score)
    // - Large standard deviation (>10 bpm)
    // - Frequent beat-to-beat changes (avgChange >5 bpm)
    // - HR typically 70-150 bpm (but can be anywhere)
    if (irregularityScore > 5 && stdDev > 10 && avgChange > 5) {
      const confidence = Math.min(100, Math.round((irregularityScore / 10 + stdDev / 15 + avgChange / 10) * 33));
      return {
        detected: true,
        arrhythmiaType: 'afib',
        severity: 'critical',
        confidence,
        description: `Atrial Fibrillation (AFib) detected: Highly irregular heart rhythm with erratic beat-to-beat variability (irregularity score: ${metrics.irregularityScore}, std dev: ${metrics.stdDev} bpm)`,
        recommendation: 'IMMEDIATE medical attention required. AFib increases stroke risk 5x. Contact your cardiologist or call 911 if experiencing chest pain, shortness of breath, or dizziness.',
        metrics,
      };
    }

    // DETECTION ALGORITHM 2: Premature Ventricular Contractions (PVCs)
    // PVC characteristics:
    // - Sudden large HR changes (>20 bpm) followed by compensatory pause
    // - Isolated ectopic beats (not sustained)
    // - Look for pattern: normal → spike → drop → normal
    let pvcCount = 0;
    for (let i = 2; i < heartRates.length - 1; i++) {
      const change1 = heartRates[i] - heartRates[i - 1];
      const change2 = heartRates[i + 1] - heartRates[i];

      // PVC pattern: HR jumps up >20 bpm, then drops >15 bpm
      if (change1 > 20 && change2 < -15) {
        pvcCount++;
      }
    }

    if (pvcCount >= 3) { // 3+ PVCs in 5 minutes
      const confidence = Math.min(100, Math.round((pvcCount / 10) * 100));
      const severity = pvcCount >= 6 ? 'critical' : 'warning';
      return {
        detected: true,
        arrhythmiaType: 'pvc',
        severity,
        description: `Premature Ventricular Contractions (PVCs) detected: ${pvcCount} ectopic beats in last 5 minutes. Pattern shows sudden HR spikes followed by compensatory pauses.`,
        recommendation: severity === 'critical'
          ? 'Frequent PVCs detected. Contact your cardiologist today. If experiencing chest pain, palpitations, or lightheadedness, seek immediate medical attention.'
          : 'Occasional PVCs detected. Monitor symptoms and inform your cardiologist at next appointment. Seek immediate care if symptoms worsen.',
        confidence,
        metrics,
      };
    }

    // DETECTION ALGORITHM 3: Premature Atrial Contractions (PACs)
    // PAC characteristics:
    // - Moderate irregularity (less than AFib)
    // - Occasional early beats (moderate changes 10-20 bpm)
    // - More frequent than PVCs but less disruptive
    let pacCount = 0;
    for (let i = 1; i < changes.length; i++) {
      // PAC pattern: moderate change (10-20 bpm) not meeting PVC criteria
      if (changes[i] >= 10 && changes[i] <= 20) {
        pacCount++;
      }
    }

    if (pacCount >= 10 && irregularityScore > 3) { // 10+ PACs in 5 minutes
      const confidence = Math.min(100, Math.round((pacCount / 20) * 100));
      return {
        detected: true,
        arrhythmiaType: 'pac',
        severity: 'warning',
        description: `Premature Atrial Contractions (PACs) detected: ${pacCount} early atrial beats in last 5 minutes with irregular rhythm pattern.`,
        recommendation: 'PACs are usually benign but should be monitored. Reduce caffeine, stress, and alcohol. Inform your cardiologist if episodes become frequent or symptomatic.',
        confidence,
        metrics,
      };
    }

    // DETECTION ALGORITHM 4: Sustained Bradycardia
    // Bradycardia: HR <50 bpm for >2 minutes (sustained)
    const twoMinutesOfReadings = Math.min(120, recentReadings.length); // 2 min = 120 readings
    const recentHRs = heartRates.slice(-twoMinutesOfReadings);
    const sustainedLowHR = recentHRs.filter(hr => hr < 50).length;

    if (sustainedLowHR >= twoMinutesOfReadings * 0.8) { // 80% of readings <50 bpm
      const confidence = Math.round((sustainedLowHR / twoMinutesOfReadings) * 100);
      const severity = avgHR < 40 ? 'critical' : 'warning';
      return {
        detected: true,
        arrhythmiaType: 'bradycardia',
        severity,
        description: `Sustained Bradycardia detected: Heart rate <50 bpm for extended period (avg ${metrics.avgHeartRate} bpm, min ${metrics.minHeartRate} bpm)`,
        recommendation: severity === 'critical'
          ? 'CRITICAL: Heart rate dangerously low. If experiencing dizziness, weakness, or confusion, call 911 immediately.'
          : 'Low heart rate detected. If experiencing symptoms (dizziness, fatigue, shortness of breath), contact your cardiologist. May be normal if you are an athlete or on beta-blockers.',
        confidence,
        metrics,
      };
    }

    // DETECTION ALGORITHM 5: Sustained Tachycardia
    // Tachycardia: HR >120 bpm for >2 minutes (sustained, non-exercise)
    const sustainedHighHR = recentHRs.filter(hr => hr > 120).length;

    if (sustainedHighHR >= twoMinutesOfReadings * 0.8) { // 80% of readings >120 bpm
      const confidence = Math.round((sustainedHighHR / twoMinutesOfReadings) * 100);
      const severity = avgHR > 140 ? 'critical' : 'warning';
      return {
        detected: true,
        arrhythmiaType: 'tachycardia',
        severity,
        description: `Sustained Tachycardia detected: Heart rate >120 bpm for extended period (avg ${metrics.avgHeartRate} bpm, max ${metrics.maxHeartRate} bpm)`,
        recommendation: severity === 'critical'
          ? 'CRITICAL: Heart rate dangerously high. If not exercising and experiencing chest pain, palpitations, or shortness of breath, call 911 immediately.'
          : 'Elevated heart rate detected. If at rest (not exercising), contact your cardiologist. Monitor for symptoms like palpitations, chest discomfort, or dizziness.',
        confidence,
        metrics,
      };
    }

    // No arrhythmia detected
    return null;
  } catch (error: any) {
    console.error('[ARRHYTHMIA DETECTION] Error:', error.message);
    return null;
  }
}

/**
 * Continuously monitor for arrhythmias and create alerts when detected
 * Call this periodically (e.g., every 1-2 minutes via cron job or after new vitals inserted)
 */
export async function monitorAndAlertArrhythmia(userId: number): Promise<boolean> {
  try {
    const result = await detectArrhythmia(userId);

    if (!result || !result.detected) {
      return false; // No arrhythmia detected
    }

    // Check if we already created an alert for this arrhythmia type recently (last 30 minutes)
    // Avoid duplicate alerts for same condition
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const recentAlert = await Alert.findOne({
      where: {
        userId,
        alertType: 'vital_concern',
        title: { [Op.iLike]: `%${result.arrhythmiaType}%` },
        resolved: false,
        createdAt: { [Op.gte]: thirtyMinutesAgo },
      },
    });

    if (recentAlert) {
      console.log(`[ARRHYTHMIA ALERT] Duplicate alert suppressed for ${result.arrhythmiaType} (recent alert exists)`);
      return false;
    }

    // Create alert
    const alert = await Alert.create({
      userId,
      alertType: 'vital_concern',
      severity: result.severity,
      title: `${result.arrhythmiaType.toUpperCase()} Detected (${result.confidence}% confidence)`,
      message: `${result.description}\n\n${result.recommendation}\n\nMetrics: Avg HR ${result.metrics.avgHeartRate} bpm, Range ${result.metrics.heartRateRange} bpm, Irregularity Score ${result.metrics.irregularityScore}`,
      relatedEntityType: 'vitals',
      resolved: false,
      notificationSent: false,
    });

    console.log(`[ARRHYTHMIA ALERT] Created ${result.severity} alert for ${result.arrhythmiaType}`);

    // Send notifications for critical arrhythmias
    if (result.severity === 'critical') {
      const user = await User.findByPk(userId);
      if (user) {
        const notificationMethods: string[] = [];

        // SMS
        if (user.phoneNumber) {
          const smsText = `🚨 CRITICAL HEART RHYTHM ALERT: ${result.arrhythmiaType.toUpperCase()} detected with ${result.confidence}% confidence. ${result.recommendation.substring(0, 120)}... - Heart Recovery Calendar`;
          const smsSent = await sendSMS(user.phoneNumber, smsText);
          if (smsSent) notificationMethods.push('sms');
        }

        // Email
        const emailSubject = `🚨 Critical Arrhythmia Alert: ${result.arrhythmiaType.toUpperCase()} Detected`;
        const emailHtml = generateArrhythmiaEmailHTML(result);
        const emailSent = await sendEmail(user.email, emailSubject, emailHtml);
        if (emailSent) notificationMethods.push('email');

        // Update alert with notification status
        if (notificationMethods.length > 0) {
          await alert.update({
            notificationSent: true,
            notificationMethods,
          });
        }

        console.log(`[ARRHYTHMIA ALERT] Sent ${notificationMethods.length} notifications for ${result.arrhythmiaType}`);
      }
    }

    return true;
  } catch (error: any) {
    console.error('[ARRHYTHMIA MONITORING] Error:', error.message);
    return false;
  }
}

/**
 * Generate HTML email for arrhythmia alert
 */
function generateArrhythmiaEmailHTML(result: ArrhythmiaDetectionResult): string {
  const arrhythmiaNames: Record<string, string> = {
    afib: 'Atrial Fibrillation (AFib)',
    pvc: 'Premature Ventricular Contractions (PVCs)',
    pac: 'Premature Atrial Contractions (PACs)',
    bradycardia: 'Bradycardia (Slow Heart Rate)',
    tachycardia: 'Tachycardia (Rapid Heart Rate)',
  };

  const arrhythmiaName = arrhythmiaNames[result.arrhythmiaType!] || result.arrhythmiaType;
  const colorHex = result.severity === 'critical' ? '#dc2626' : '#f59e0b';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .alert-box { border-left: 5px solid ${colorHex}; background: ${colorHex}15; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .alert-header { font-size: 24px; font-weight: bold; color: ${colorHex}; margin-bottom: 10px; }
    .alert-body { font-size: 16px; color: #991b1b; }
    .metrics { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .metric-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .metric-label { font-weight: 600; color: #666; }
    .metric-value { font-weight: bold; color: ${colorHex}; }
    .cta-button { display: inline-block; padding: 12px 24px; background: ${colorHex}; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 15px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee; font-size: 12px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="alert-box">
      <div class="alert-header">🚨 Arrhythmia Detected: ${arrhythmiaName}</div>
      <div class="alert-body">
        <p><strong>Confidence: ${result.confidence}%</strong></p>
        <p>${result.description}</p>
      </div>
    </div>

    <div class="metrics">
      <h3 style="margin:0 0 10px 0; color:${colorHex};">📊 Heart Rhythm Metrics</h3>
      <div class="metric-row">
        <span class="metric-label">Average Heart Rate:</span>
        <span class="metric-value">${result.metrics.avgHeartRate} bpm</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Heart Rate Range:</span>
        <span class="metric-value">${result.metrics.minHeartRate}-${result.metrics.maxHeartRate} bpm</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Irregularity Score:</span>
        <span class="metric-value">${result.metrics.irregularityScore}</span>
      </div>
      <div class="metric-row" style="border-bottom:none;">
        <span class="metric-label">Standard Deviation:</span>
        <span class="metric-value">${result.metrics.stdDev} bpm</span>
      </div>
    </div>

    <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
      <h3 style="margin-top: 0; color: #333;">⚕️ Recommended Action</h3>
      <p>${result.recommendation}</p>
    </div>

    <center>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/vitals" class="cta-button">View My Heart Data →</a>
    </center>

    <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 3px solid #f59e0b;">
      <strong>📞 When to Call 911:</strong><br>
      • Severe chest pain or pressure<br>
      • Extreme shortness of breath<br>
      • Loss of consciousness or fainting<br>
      • Severe dizziness or confusion<br>
      • Rapid heart rate with chest discomfort
    </div>

    <div class="footer">
      <p><strong>Heart Recovery Calendar - Arrhythmia Detection System</strong></p>
      <p>This alert was generated by analyzing your Polar H10 heart rate data over the last 5 minutes.</p>
      <p>Detection confidence: ${result.confidence}% | Arrhythmia type: ${arrhythmiaName}</p>
    </div>
  </div>
</body>
</html>`;
}

export default {
  detectArrhythmia,
  monitorAndAlertArrhythmia,
};
