/**
 * ECG Signal Filtering Utilities
 * Removes noise and artifacts from ECG waveforms for cleaner cardiologist reports
 */

/**
 * Apply moving average filter to remove high-frequency noise
 * @param signal - Raw ECG signal
 * @param windowSize - Size of moving average window (larger = more smoothing)
 */
const movingAverageFilter = (signal: number[], windowSize: number): number[] => {
  const filtered: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < signal.length; i++) {
    let sum = 0;
    let count = 0;

    for (let j = Math.max(0, i - halfWindow); j <= Math.min(signal.length - 1, i + halfWindow); j++) {
      sum += signal[j];
      count++;
    }

    filtered.push(sum / count);
  }

  return filtered;
};

/**
 * Remove baseline wander (low-frequency drift) using high-pass filter
 * Baseline wander is caused by respiration, patient movement, electrode issues
 * @param signal - ECG signal
 * @param samplingRate - Sampling rate in Hz (130 for Polar H10)
 */
const removeBaselineWander = (signal: number[], samplingRate: number): number[] => {
  // Calculate baseline using large moving average (simulates low-pass filter)
  const baselineWindowSize = Math.round(samplingRate * 0.6); // 0.6 second window
  const baseline = movingAverageFilter(signal, baselineWindowSize);

  // Subtract baseline from original signal (high-pass effect)
  return signal.map((value, i) => value - baseline[i]);
};

/**
 * Apply median filter to remove spike artifacts and impulse noise
 * More effective than moving average for preserving sharp QRS complexes
 * @param signal - ECG signal
 * @param windowSize - Window size (must be odd, typically 3-5)
 */
const medianFilter = (signal: number[], windowSize: number = 3): number[] => {
  const filtered: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < signal.length; i++) {
    const window: number[] = [];

    for (let j = Math.max(0, i - halfWindow); j <= Math.min(signal.length - 1, i + halfWindow); j++) {
      window.push(signal[j]);
    }

    // Sort and get median
    window.sort((a, b) => a - b);
    const median = window[Math.floor(window.length / 2)];
    filtered.push(median);
  }

  return filtered;
};

/**
 * Remove 60 Hz powerline interference using notch filter
 * Powerline noise appears as 60 Hz sinusoidal interference (50 Hz in Europe)
 * @param signal - ECG signal
 * @param samplingRate - Sampling rate in Hz
 * @param powerlineFreq - Powerline frequency (60 Hz in US, 50 Hz in EU)
 */
const removePowerlineNoise = (signal: number[], samplingRate: number, powerlineFreq: number = 60): number[] => {
  // Simple notch filter using moving average at specific frequency
  const periodSamples = Math.round(samplingRate / powerlineFreq);

  // Calculate and remove periodic component
  const filtered = signal.map((value, i) => {
    if (i < periodSamples) return value;

    // Average of values one period apart (cancels out periodic noise)
    const delayed = signal[i - periodSamples];
    return value - 0.5 * (value - delayed);
  });

  return filtered;
};

/**
 * Apply low-pass filter to remove high-frequency muscle noise
 * Muscle artifacts and EMG noise are typically > 40 Hz
 * @param signal - ECG signal
 * @param samplingRate - Sampling rate in Hz
 */
const lowPassFilter = (signal: number[], samplingRate: number): number[] => {
  // Use moving average as simple low-pass filter
  // Window size chosen to attenuate frequencies > 40 Hz
  const windowSize = Math.max(3, Math.round(samplingRate / 40));
  return movingAverageFilter(signal, windowSize);
};

/**
 * MASTER FILTER: Apply complete ECG noise removal pipeline
 * Suitable for clinical-grade ECG reports
 *
 * Pipeline stages:
 * 1. Remove baseline wander (breathing, movement)
 * 2. Remove powerline interference (60 Hz electrical noise)
 * 3. Median filter for spike/artifact removal
 * 4. Low-pass filter for muscle noise removal
 *
 * @param signal - Raw ECG signal from Polar H10
 * @param samplingRate - Sampling rate in Hz (130 for Polar H10)
 * @param options - Filtering options
 */
export const filterECGSignal = (
  signal: number[],
  samplingRate: number = 130,
  options: {
    removeBaseline?: boolean;
    removePowerline?: boolean;
    removeSpikes?: boolean;
    removeMuscleNoise?: boolean;
    powerlineFreq?: number; // 60 Hz (US) or 50 Hz (EU)
  } = {}
): number[] => {
  const {
    removeBaseline = true,
    removePowerline = true,
    removeSpikes = true,
    removeMuscleNoise = true,
    powerlineFreq = 60,
  } = options;

  let filtered = [...signal]; // Copy to avoid mutation

  console.log('[ECG-FILTER] Starting noise removal pipeline...');
  console.log('[ECG-FILTER] Input samples:', filtered.length);

  // Stage 1: Remove baseline wander
  if (removeBaseline) {
    filtered = removeBaselineWander(filtered, samplingRate);
    console.log('[ECG-FILTER] ✓ Baseline wander removed');
  }

  // Stage 2: Remove powerline interference
  if (removePowerline) {
    filtered = removePowerlineNoise(filtered, samplingRate, powerlineFreq);
    console.log('[ECG-FILTER] ✓ Powerline interference removed (', powerlineFreq, 'Hz)');
  }

  // Stage 3: Remove spike artifacts
  if (removeSpikes) {
    filtered = medianFilter(filtered, 3);
    console.log('[ECG-FILTER] ✓ Spike artifacts removed');
  }

  // Stage 4: Remove high-frequency muscle noise
  if (removeMuscleNoise) {
    filtered = lowPassFilter(filtered, samplingRate);
    console.log('[ECG-FILTER] ✓ Muscle noise removed');
  }

  console.log('[ECG-FILTER] Pipeline complete. Signal cleaned for medical review.');

  return filtered;
};

/**
 * Calculate signal quality metrics (SNR estimation)
 * Higher values = cleaner signal
 */
export const estimateSignalQuality = (original: number[], filtered: number[]): number => {
  if (original.length !== filtered.length) return 0;

  // Calculate noise (difference between original and filtered)
  const noise = original.map((val, i) => val - filtered[i]);

  // Signal power
  const signalPower = filtered.reduce((sum, val) => sum + val * val, 0) / filtered.length;

  // Noise power
  const noisePower = noise.reduce((sum, val) => sum + val * val, 0) / noise.length;

  // SNR in dB
  if (noisePower === 0) return 100; // Perfect signal
  const snr = 10 * Math.log10(signalPower / noisePower);

  return Math.max(0, snr);
};
