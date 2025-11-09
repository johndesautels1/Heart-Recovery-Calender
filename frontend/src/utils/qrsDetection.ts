/**
 * QRS Detection Utility - Pan-Tompkins Algorithm
 *
 * This implements the Pan-Tompkins algorithm for real-time QRS complex detection
 * in ECG signals. The algorithm is widely used in medical devices for its accuracy
 * and robustness to noise.
 *
 * Reference: Pan J, Tompkins WJ. A Real-Time QRS Detection Algorithm.
 * IEEE Trans Biomed Eng. 1985;BME-32(3):230-236.
 *
 * @author Claude Code
 * @date 2025-11-09
 */

export interface QRSDetectionResult {
  rPeakIndices: number[]; // Indices of detected R-peaks
  rPeakTimes: number[]; // Timestamps of R-peaks (in milliseconds)
  rrIntervals: number[]; // R-R intervals in milliseconds
  heartRate: number; // Average heart rate in BPM
  confidence: number[]; // Confidence score for each detection (0-1)
}

export class QRSDetector {
  private samplingRate: number;
  private lowpassCoeffs: number[];
  private highpassCoeffs: number[];
  private derivativeCoeffs: number[];
  private integrationWindow: number;
  private refractionPeriod: number; // Minimum time between QRS complexes (ms)

  constructor(samplingRate: number = 130) {
    this.samplingRate = samplingRate;

    // Bandpass filter coefficients (5-15 Hz)
    this.lowpassCoeffs = this.generateLowpassCoeffs();
    this.highpassCoeffs = this.generateHighpassCoeffs();

    // Derivative filter coefficients: (1/8T)[-1 -2 0 2 1]
    this.derivativeCoeffs = [-1, -2, 0, 2, 1];

    // Moving window integration window size (150ms)
    this.integrationWindow = Math.round(0.15 * samplingRate);

    // Refractory period (200ms) - minimum time between R-peaks
    this.refractionPeriod = 200;
  }

  /**
   * Generate lowpass filter coefficients (cutoff ~15 Hz)
   */
  private generateLowpassCoeffs(): number[] {
    // Simple 6-coefficient lowpass filter
    // y(n) = 2*y(n-1) - y(n-2) + x(n) - 2*x(n-6) + x(n-12)
    return [1, 0, 0, 0, 0, 0, -2, 0, 0, 0, 0, 0, 1];
  }

  /**
   * Generate highpass filter coefficients (cutoff ~5 Hz)
   */
  private generateHighpassCoeffs(): number[] {
    // Simple highpass filter
    // y(n) = y(n-1) - (1/32)*x(n) + x(n-16) - x(n-17) + (1/32)*x(n-32)
    return Array(33).fill(0);
  }

  /**
   * Apply FIR filter to signal
   */
  private applyFilter(signal: number[], coeffs: number[]): number[] {
    const filtered: number[] = [];
    const halfLen = Math.floor(coeffs.length / 2);

    for (let i = 0; i < signal.length; i++) {
      let sum = 0;
      for (let j = 0; j < coeffs.length; j++) {
        const idx = i - halfLen + j;
        if (idx >= 0 && idx < signal.length) {
          sum += coeffs[j] * signal[idx];
        }
      }
      filtered.push(sum);
    }

    return filtered;
  }

  /**
   * Apply derivative filter to emphasize QRS slopes
   */
  private applyDerivative(signal: number[]): number[] {
    const derivative: number[] = [];
    const scale = this.samplingRate / 8;

    for (let i = 0; i < signal.length; i++) {
      let sum = 0;
      for (let j = 0; j < this.derivativeCoeffs.length; j++) {
        const idx = i - 2 + j; // Center the filter
        if (idx >= 0 && idx < signal.length) {
          sum += this.derivativeCoeffs[j] * signal[idx];
        }
      }
      derivative.push(sum / scale);
    }

    return derivative;
  }

  /**
   * Square the signal to make all data positive and emphasize larger slopes
   */
  private squareSignal(signal: number[]): number[] {
    return signal.map(val => val * val);
  }

  /**
   * Apply moving window integration
   */
  private movingWindowIntegration(signal: number[]): number[] {
    const integrated: number[] = [];
    const windowSize = this.integrationWindow;

    for (let i = 0; i < signal.length; i++) {
      let sum = 0;
      const start = Math.max(0, i - windowSize + 1);
      for (let j = start; j <= i; j++) {
        sum += signal[j];
      }
      integrated.push(sum / windowSize);
    }

    return integrated;
  }

  /**
   * Adaptive thresholding and peak detection
   */
  private detectPeaks(
    integratedSignal: number[],
    originalSignal: number[]
  ): { indices: number[]; confidence: number[] } {
    const peaks: number[] = [];
    const confidence: number[] = [];

    // Initialize thresholds
    let spkf = 0; // Signal peak running estimate
    let npkf = 0; // Noise peak running estimate
    let threshold1 = 0; // Detection threshold
    let threshold2 = 0; // Secondary threshold

    // Learning phase - first 2 seconds
    const learningLength = Math.min(this.samplingRate * 2, integratedSignal.length);
    for (let i = 0; i < learningLength; i++) {
      if (integratedSignal[i] > spkf) {
        spkf = integratedSignal[i];
      }
    }

    npkf = spkf * 0.5;
    threshold1 = npkf + 0.25 * (spkf - npkf);
    threshold2 = 0.5 * threshold1;

    // Detection phase
    let lastPeakIndex = -this.samplingRate; // Allow first detection
    const refractionSamples = Math.round((this.refractionPeriod / 1000) * this.samplingRate);

    for (let i = 1; i < integratedSignal.length - 1; i++) {
      const current = integratedSignal[i];
      const prev = integratedSignal[i - 1];
      const next = integratedSignal[i + 1];

      // Check if local maximum
      if (current > prev && current > next && current > threshold2) {
        // Check refractory period
        if (i - lastPeakIndex >= refractionSamples) {
          // Find actual R-peak in original signal (within ±50ms window)
          const searchWindow = Math.round(0.05 * this.samplingRate);
          const searchStart = Math.max(0, i - searchWindow);
          const searchEnd = Math.min(originalSignal.length - 1, i + searchWindow);

          let maxIdx = i;
          let maxVal = originalSignal[i];
          for (let j = searchStart; j <= searchEnd; j++) {
            if (originalSignal[j] > maxVal) {
              maxVal = originalSignal[j];
              maxIdx = j;
            }
          }

          // Determine if signal or noise peak
          let conf = 0;
          if (current > threshold1) {
            // Signal peak
            spkf = 0.125 * current + 0.875 * spkf;
            conf = Math.min(1, (current - threshold1) / (spkf - threshold1));
            peaks.push(maxIdx);
            confidence.push(conf);
            lastPeakIndex = i;
          } else if (current > threshold2) {
            // Searchback - possible missed peak
            const avgRR = peaks.length >= 2
              ? (peaks[peaks.length - 1] - peaks[peaks.length - 2])
              : this.samplingRate; // 1 second default

            if (i - lastPeakIndex > 1.66 * avgRR) {
              // Likely missed a beat
              spkf = 0.25 * current + 0.75 * spkf;
              conf = Math.min(0.8, (current - threshold2) / (spkf - threshold2));
              peaks.push(maxIdx);
              confidence.push(conf);
              lastPeakIndex = i;
            } else {
              // Noise peak
              npkf = 0.125 * current + 0.875 * npkf;
            }
          } else {
            // Noise peak
            npkf = 0.125 * current + 0.875 * npkf;
          }

          // Update thresholds
          threshold1 = npkf + 0.25 * (spkf - npkf);
          threshold2 = 0.5 * threshold1;
        }
      }
    }

    return { indices: peaks, confidence };
  }

  /**
   * Main detection function
   * @param ecgSignal - Raw ECG signal (voltage in mV)
   * @param startTime - Start time of the signal (in ms from epoch)
   * @returns QRS detection results
   */
  public detect(ecgSignal: number[], startTime: number = Date.now()): QRSDetectionResult {
    if (ecgSignal.length < this.samplingRate * 2) {
      // Need at least 2 seconds of data
      return {
        rPeakIndices: [],
        rPeakTimes: [],
        rrIntervals: [],
        heartRate: 0,
        confidence: [],
      };
    }

    // Step 1: Bandpass filter (5-15 Hz)
    // For simplicity, using a simplified bandpass filter
    const filtered = this.bandpassFilter(ecgSignal);

    // Step 2: Derivative filter
    const derivative = this.applyDerivative(filtered);

    // Step 3: Squaring
    const squared = this.squareSignal(derivative);

    // Step 4: Moving window integration
    const integrated = this.movingWindowIntegration(squared);

    // Step 5: Peak detection
    const { indices, confidence } = this.detectPeaks(integrated, ecgSignal);

    // Calculate R-peak times
    const msPerSample = 1000 / this.samplingRate;
    const rPeakTimes = indices.map(idx => startTime + idx * msPerSample);

    // Calculate R-R intervals
    const rrIntervals: number[] = [];
    for (let i = 1; i < rPeakTimes.length; i++) {
      rrIntervals.push(rPeakTimes[i] - rPeakTimes[i - 1]);
    }

    // Calculate average heart rate
    const heartRate = rrIntervals.length > 0
      ? 60000 / (rrIntervals.reduce((sum, rr) => sum + rr, 0) / rrIntervals.length)
      : 0;

    return {
      rPeakIndices: indices,
      rPeakTimes,
      rrIntervals,
      heartRate: Math.round(heartRate),
      confidence,
    };
  }

  /**
   * Simplified bandpass filter (5-15 Hz)
   */
  private bandpassFilter(signal: number[]): number[] {
    // Simple implementation: highpass (5Hz) followed by lowpass (15Hz)
    const highpassed = this.highpass(signal, 5);
    const bandpassed = this.lowpass(highpassed, 15);
    return bandpassed;
  }

  /**
   * Simple lowpass filter
   */
  private lowpass(signal: number[], cutoffHz: number): number[] {
    const RC = 1 / (2 * Math.PI * cutoffHz);
    const dt = 1 / this.samplingRate;
    const alpha = dt / (RC + dt);

    const filtered: number[] = [signal[0]];
    for (let i = 1; i < signal.length; i++) {
      filtered[i] = filtered[i - 1] + alpha * (signal[i] - filtered[i - 1]);
    }
    return filtered;
  }

  /**
   * Simple highpass filter
   */
  private highpass(signal: number[], cutoffHz: number): number[] {
    const RC = 1 / (2 * Math.PI * cutoffHz);
    const dt = 1 / this.samplingRate;
    const alpha = RC / (RC + dt);

    const filtered: number[] = [0];
    for (let i = 1; i < signal.length; i++) {
      filtered[i] = alpha * (filtered[i - 1] + signal[i] - signal[i - 1]);
    }
    return filtered;
  }
}

/**
 * Convenience function for one-time QRS detection
 */
export function detectQRS(
  ecgSignal: number[],
  samplingRate: number = 130,
  startTime?: number
): QRSDetectionResult {
  const detector = new QRSDetector(samplingRate);
  return detector.detect(ecgSignal, startTime);
}
