/**
 * Heartbeat Batching Service
 *
 * Problem: Polar H10 sends heartbeats every ~1 second (60-100 times/minute)
 * This creates 8,000+ database records per day, causing performance issues.
 *
 * Solution: Batch heartbeats into 1-minute windows and save aggregated data:
 * - Average heart rate (primary metric)
 * - Min/max heart rate (range)
 * - Standard deviation (variability indicator)
 * - Sample count (data quality indicator)
 *
 * This reduces database records by ~98% while maintaining data quality.
 */

import VitalsSample from '../models/VitalsSample';
import { broadcastVitalsUpdate } from './websocketService';

interface HeartbeatSample {
  userId: number;
  heartRate: number;
  timestamp: Date;
  rrInterval?: number;
  sdnn?: number;
  rmssd?: number;
  pnn50?: number;
}

interface MinuteWindow {
  startTime: Date;
  endTime: Date;
  samples: HeartbeatSample[];
  userId: number;
}

class HeartbeatBatchingService {
  // In-memory storage: Map<userId, Map<minuteKey, MinuteWindow>>
  private userWindows: Map<number, Map<string, MinuteWindow>> = new Map();

  // Flush interval: Save batches every 60 seconds
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly WINDOW_SIZE_MS = 60 * 1000; // 1 minute

  constructor() {
    this.startAutoFlush();
  }

  /**
   * Add a heartbeat sample to the current minute window
   */
  addHeartbeat(sample: HeartbeatSample): void {
    const minuteKey = this.getMinuteKey(sample.timestamp);

    // Get or create user's window map
    if (!this.userWindows.has(sample.userId)) {
      this.userWindows.set(sample.userId, new Map());
    }

    const userWindowMap = this.userWindows.get(sample.userId)!;

    // Get or create minute window
    if (!userWindowMap.has(minuteKey)) {
      const startTime = this.getMinuteStart(sample.timestamp);
      userWindowMap.set(minuteKey, {
        startTime,
        endTime: new Date(startTime.getTime() + this.WINDOW_SIZE_MS),
        samples: [],
        userId: sample.userId,
      });
    }

    // Add sample to window
    const window = userWindowMap.get(minuteKey)!;
    window.samples.push(sample);

    // Log batching activity (throttled)
    if (window.samples.length === 1 || window.samples.length % 10 === 0) {
      console.log(`[HEARTBEAT-BATCH] User ${sample.userId}: ${window.samples.length} samples in window ${minuteKey}`);
    }
  }

  /**
   * Flush completed minute windows to database
   */
  private async flushCompletedWindows(): Promise<void> {
    const now = new Date();
    let totalFlushed = 0;

    for (const [userId, windowMap] of this.userWindows.entries()) {
      const completedWindows: string[] = [];

      for (const [minuteKey, window] of windowMap.entries()) {
        // Only flush windows that are complete (endTime has passed)
        if (window.endTime <= now && window.samples.length > 0) {
          await this.saveAggregatedWindow(window);
          completedWindows.push(minuteKey);
          totalFlushed++;
        }
      }

      // Remove flushed windows from memory
      completedWindows.forEach(key => windowMap.delete(key));

      // Clean up empty user maps
      if (windowMap.size === 0) {
        this.userWindows.delete(userId);
      }
    }

    if (totalFlushed > 0) {
      console.log(`[HEARTBEAT-BATCH] 💾 Flushed ${totalFlushed} completed windows to database`);
    }
  }

  /**
   * Save aggregated minute window to database
   */
  private async saveAggregatedWindow(window: MinuteWindow): Promise<void> {
    try {
      // Calculate aggregated metrics
      const heartRates = window.samples.map(s => s.heartRate);
      const avgHeartRate = Math.round(heartRates.reduce((a, b) => a + b, 0) / heartRates.length);
      const minHeartRate = Math.min(...heartRates);
      const maxHeartRate = Math.max(...heartRates);

      // Calculate standard deviation (HRV proxy)
      const mean = avgHeartRate;
      const squaredDiffs = heartRates.map(hr => Math.pow(hr - mean, 2));
      const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / heartRates.length);

      // Use the first sample for additional metrics (RR interval, HRV)
      const firstSample = window.samples[0];

      // Calculate average RR interval if available
      const rrIntervals = window.samples.filter(s => s.rrInterval).map(s => s.rrInterval!);
      const avgRRInterval = rrIntervals.length > 0
        ? rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length
        : undefined;

      // Calculate average HRV metrics if available
      const sdnnValues = window.samples.filter(s => s.sdnn).map(s => s.sdnn!);
      const avgSDNN = sdnnValues.length > 0
        ? sdnnValues.reduce((a, b) => a + b, 0) / sdnnValues.length
        : undefined;

      const rmssdValues = window.samples.filter(s => s.rmssd).map(s => s.rmssd!);
      const avgRMSSD = rmssdValues.length > 0
        ? rmssdValues.reduce((a, b) => a + b, 0) / rmssdValues.length
        : undefined;

      const pnn50Values = window.samples.filter(s => s.pnn50).map(s => s.pnn50!);
      const avgPNN50 = pnn50Values.length > 0
        ? pnn50Values.reduce((a, b) => a + b, 0) / pnn50Values.length
        : undefined;

      // Create single aggregated vitals record
      const vitalData: any = {
        userId: window.userId,
        timestamp: window.startTime, // Use window start time
        heartRate: avgHeartRate,
        heartRateVariability: avgRRInterval ? Math.round(avgRRInterval) : undefined,
        sdnn: avgSDNN ? Math.round(avgSDNN) : undefined,
        rmssd: avgRMSSD ? Math.round(avgRMSSD) : undefined,
        pnn50: avgPNN50 ? Math.round(avgPNN50 * 10) / 10 : undefined, // 1 decimal place
        source: 'device',
        deviceId: 'polar_h10_bluetooth',
        medicationsTaken: false,
        notes: `Aggregated from ${window.samples.length} samples | Min: ${minHeartRate} | Max: ${maxHeartRate} | StdDev: ${Math.round(stdDev)}`,
      };

      const savedRecord = await VitalsSample.create(vitalData);

      console.log(`[HEARTBEAT-BATCH] ✅ Saved 1-min aggregated: ${avgHeartRate} BPM (${window.samples.length} samples) for user ${window.userId}`);

      // Broadcast aggregated vitals to WebSocket for real-time display
      broadcastVitalsUpdate(window.userId, savedRecord.toJSON());

    } catch (error: any) {
      console.error(`[HEARTBEAT-BATCH] ❌ Failed to save aggregated window:`, error.message);
    }
  }

  /**
   * Get minute key for grouping (YYYY-MM-DD-HH-MM)
   */
  private getMinuteKey(timestamp: Date): string {
    const year = timestamp.getFullYear();
    const month = String(timestamp.getMonth() + 1).padStart(2, '0');
    const day = String(timestamp.getDate()).padStart(2, '0');
    const hour = String(timestamp.getHours()).padStart(2, '0');
    const minute = String(timestamp.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}-${hour}-${minute}`;
  }

  /**
   * Get start of current minute (truncate seconds/milliseconds)
   */
  private getMinuteStart(timestamp: Date): Date {
    const start = new Date(timestamp);
    start.setSeconds(0);
    start.setMilliseconds(0);
    return start;
  }

  /**
   * Start automatic flushing every 30 seconds
   */
  private startAutoFlush(): void {
    if (this.flushInterval) {
      return; // Already started
    }

    console.log('[HEARTBEAT-BATCH] 🚀 Starting auto-flush service (every 30 seconds)');

    this.flushInterval = setInterval(() => {
      this.flushCompletedWindows().catch(error => {
        console.error('[HEARTBEAT-BATCH] Auto-flush error:', error);
      });
    }, 30 * 1000); // Flush every 30 seconds

    // Also flush on process exit
    process.on('beforeExit', () => {
      console.log('[HEARTBEAT-BATCH] 🛑 Process exiting, flushing all windows...');
      this.flushAllWindows().catch(error => {
        console.error('[HEARTBEAT-BATCH] Exit flush error:', error);
      });
    });
  }

  /**
   * Flush all windows immediately (called on shutdown)
   */
  private async flushAllWindows(): Promise<void> {
    for (const [userId, windowMap] of this.userWindows.entries()) {
      for (const [minuteKey, window] of windowMap.entries()) {
        if (window.samples.length > 0) {
          await this.saveAggregatedWindow(window);
        }
      }
      windowMap.clear();
    }
    this.userWindows.clear();
    console.log('[HEARTBEAT-BATCH] ✅ All windows flushed');
  }

  /**
   * Stop auto-flush service (cleanup)
   */
  stopAutoFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
      console.log('[HEARTBEAT-BATCH] 🛑 Auto-flush service stopped');
    }
  }

  /**
   * Get current batching statistics
   */
  getStats(): any {
    let totalWindows = 0;
    let totalSamples = 0;

    for (const [userId, windowMap] of this.userWindows.entries()) {
      totalWindows += windowMap.size;
      for (const window of windowMap.values()) {
        totalSamples += window.samples.length;
      }
    }

    return {
      activeUsers: this.userWindows.size,
      activeWindows: totalWindows,
      queuedSamples: totalSamples,
    };
  }
}

// Singleton instance
export default new HeartbeatBatchingService();
