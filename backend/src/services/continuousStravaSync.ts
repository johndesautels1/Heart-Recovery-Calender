import DeviceConnection from '../models/DeviceConnection';
import DeviceSyncLog from '../models/DeviceSyncLog';
import { syncStravaData } from './stravaService';

// Sync interval in milliseconds (5 minutes for critical heart condition monitoring)
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let syncInterval: NodeJS.Timeout | null = null;
let isSyncing = false;

/**
 * Continuous Strava Sync Service
 * Automatically syncs all active Strava connections every 5 minutes
 * Critical for heart condition monitoring
 */
export async function syncAllStravaDevices(): Promise<void> {
  if (isSyncing) {
    console.log('[STRAVA-SYNC] ⏳ Sync already in progress, skipping...');
    return;
  }

  try {
    isSyncing = true;
    const timestamp = new Date().toLocaleTimeString();
    console.log(`\n[STRAVA-SYNC] 🔄 Starting automatic sync at ${timestamp}`);

    // Find all active Strava connections with auto-sync enabled
    const devices = await DeviceConnection.findAll({
      where: {
        deviceType: 'strava',
        syncStatus: 'active',
        autoSync: true,
      },
    });

    if (devices.length === 0) {
      console.log('[STRAVA-SYNC] ℹ️  No active Strava devices found');
      return;
    }

    console.log(`[STRAVA-SYNC] 📱 Found ${devices.length} active device(s)`);

    // Sync each device
    for (const device of devices) {
      try {
        console.log(`[STRAVA-SYNC] 🔄 Syncing device: ${device.deviceName} (User ID: ${device.userId})`);

        // Create sync log
        const syncLog = await DeviceSyncLog.create({
          deviceConnectionId: device.id,
          syncType: 'scheduled',
          dataType: 'all',
          status: 'pending',
          startedAt: new Date(),
        });

        // Perform sync
        const completedLog = await syncStravaData(device, syncLog);

        // Log results
        const newRecords = completedLog.recordsCreated || 0;
        if (newRecords > 0) {
          console.log(`[STRAVA-SYNC] ✅ ${device.deviceName}: ${newRecords} new record(s) synced! 💓`);
        } else {
          console.log(`[STRAVA-SYNC] ✓ ${device.deviceName}: No new data (already up to date)`);
        }
      } catch (error: any) {
        console.error(`[STRAVA-SYNC] ❌ Error syncing ${device.deviceName}:`, error.message);
      }
    }

    console.log(`[STRAVA-SYNC] ✅ Sync cycle complete at ${new Date().toLocaleTimeString()}\n`);
  } catch (error: any) {
    console.error('[STRAVA-SYNC] ❌ Error in sync cycle:', error.message);
  } finally {
    isSyncing = false;
  }
}

/**
 * Start the continuous sync service
 */
export function startContinuousSync(): void {
  if (syncInterval) {
    console.log('[STRAVA-SYNC] ⚠️  Sync service already running');
    return;
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  🫀 CONTINUOUS STRAVA HEART RATE SYNC - STARTED           ║');
  console.log('║  ⏰ Sync Interval: Every 5 minutes                         ║');
  console.log('║  🚑 Critical Heart Condition Monitoring Active            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Run initial sync immediately
  setTimeout(() => {
    syncAllStravaDevices().catch(error => {
      console.error('[STRAVA-SYNC] Error in initial sync:', error);
    });
  }, 5000); // Wait 5 seconds after server start

  // Set up recurring sync every 5 minutes
  syncInterval = setInterval(() => {
    syncAllStravaDevices().catch(error => {
      console.error('[STRAVA-SYNC] Error in scheduled sync:', error);
    });
  }, SYNC_INTERVAL_MS);

  console.log('[STRAVA-SYNC] 🎯 First sync will run in 5 seconds');
  console.log('[STRAVA-SYNC] 🔁 Then every 5 minutes thereafter\n');
}

/**
 * Stop the continuous sync service
 */
export function stopContinuousSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('[STRAVA-SYNC] 🛑 Continuous sync service stopped');
  }
}

/**
 * Get sync service status
 */
export function getSyncStatus(): {
  isRunning: boolean;
  isSyncing: boolean;
  intervalMs: number;
  intervalMinutes: number;
} {
  return {
    isRunning: syncInterval !== null,
    isSyncing,
    intervalMs: SYNC_INTERVAL_MS,
    intervalMinutes: SYNC_INTERVAL_MS / 60000,
  };
}
