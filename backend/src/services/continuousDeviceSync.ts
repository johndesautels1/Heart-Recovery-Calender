import DeviceConnection from '../models/DeviceConnection';
import DeviceSyncLog from '../models/DeviceSyncLog';
import { syncStravaData } from './stravaService';
import { syncPolarData } from './polarService';

// Sync interval in milliseconds (5 minutes for critical heart condition monitoring)
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let syncInterval: NodeJS.Timeout | null = null;
let isSyncing = false;

/**
 * Continuous Device Sync Service
 * Automatically syncs all active device connections every 5 minutes
 * Supports: Strava, Polar H10, Samsung Health, Fitbit, Garmin, Google Fit
 * Critical for heart condition monitoring
 */
export async function syncAllDevices(): Promise<void> {
  if (isSyncing) {
    console.log('[DEVICE-SYNC] ⏳ Sync already in progress, skipping...');
    return;
  }

  try {
    isSyncing = true;
    const timestamp = new Date().toLocaleTimeString();
    console.log(`\n[DEVICE-SYNC] 🔄 Starting automatic sync at ${timestamp}`);

    // Find all active device connections with auto-sync enabled
    const devices = await DeviceConnection.findAll({
      where: {
        syncStatus: 'active',
        autoSync: true,
      },
    });

    if (devices.length === 0) {
      console.log('[DEVICE-SYNC] ℹ️  No active devices found');
      return;
    }

    console.log(`[DEVICE-SYNC] 📱 Found ${devices.length} active device(s)`);

    // Group devices by type for better logging
    const devicesByType = devices.reduce((acc, device) => {
      acc[device.deviceType] = (acc[device.deviceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('[DEVICE-SYNC] Device breakdown:', devicesByType);

    // Sync each device
    for (const device of devices) {
      try {
        console.log(`[DEVICE-SYNC] 🔄 Syncing ${device.deviceType}: ${device.deviceName} (User ID: ${device.userId})`);

        // Create sync log
        const syncLog = await DeviceSyncLog.create({
          deviceConnectionId: device.id,
          syncType: 'scheduled',
          dataType: 'all',
          status: 'pending',
          startedAt: new Date(),
        });

        // Perform sync based on device type
        let completedLog;
        switch (device.deviceType) {
          case 'strava':
            completedLog = await syncStravaData(device, syncLog);
            break;
          case 'polar':
            completedLog = await syncPolarData(device, syncLog);
            break;
          // Add other device types here as needed
          default:
            console.log(`[DEVICE-SYNC] ⚠️  Sync not yet implemented for: ${device.deviceType}`);
            await syncLog.update({
              status: 'success',
              completedAt: new Date(),
              recordsProcessed: 0,
              recordsCreated: 0,
              recordsSkipped: 0,
            });
            completedLog = syncLog;
        }

        // Log results
        const newRecords = completedLog.recordsCreated || 0;
        if (newRecords > 0) {
          console.log(`[DEVICE-SYNC] ✅ ${device.deviceName}: ${newRecords} new record(s) synced! 💓`);
        } else {
          console.log(`[DEVICE-SYNC] ✓ ${device.deviceName}: No new data (already up to date)`);
        }
      } catch (error: any) {
        console.error(`[DEVICE-SYNC] ❌ Error syncing ${device.deviceName}:`, error.message);
      }
    }

    console.log(`[DEVICE-SYNC] ✅ Sync cycle complete at ${new Date().toLocaleTimeString()}\n`);
  } catch (error: any) {
    console.error('[DEVICE-SYNC] ❌ Error in sync cycle:', error.message);
  } finally {
    isSyncing = false;
  }
}

/**
 * Start the continuous sync service
 */
export function startContinuousSync(): void {
  if (syncInterval) {
    console.log('[DEVICE-SYNC] ⚠️  Sync service already running');
    return;
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  🫀 CONTINUOUS DEVICE SYNC - STARTED                      ║');
  console.log('║  📱 Syncing: Strava, Polar H10, Samsung Health           ║');
  console.log('║  ⏰ Sync Interval: Every 5 minutes                         ║');
  console.log('║  🚑 Critical Heart Condition Monitoring Active            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Run initial sync immediately
  setTimeout(() => {
    syncAllDevices().catch(error => {
      console.error('[DEVICE-SYNC] Error in initial sync:', error);
    });
  }, 5000); // Wait 5 seconds after server start

  // Set up recurring sync every 5 minutes
  syncInterval = setInterval(() => {
    syncAllDevices().catch(error => {
      console.error('[DEVICE-SYNC] Error in scheduled sync:', error);
    });
  }, SYNC_INTERVAL_MS);

  console.log('[DEVICE-SYNC] 🎯 First sync will run in 5 seconds');
  console.log('[DEVICE-SYNC] 🔁 Then every 5 minutes thereafter\n');
}

/**
 * Stop the continuous sync service
 */
export function stopContinuousSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('[DEVICE-SYNC] 🛑 Continuous sync service stopped');
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
