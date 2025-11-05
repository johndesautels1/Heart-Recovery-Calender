import sequelize from '../models/database';
import DeviceConnection from '../models/DeviceConnection';
import DeviceSyncLog from '../models/DeviceSyncLog';
import { syncStravaData } from '../services/stravaService';

async function manualStravaSync() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Find the Strava device connection
    const device = await DeviceConnection.findOne({
      where: { deviceType: 'strava', userId: 2 }
    });

    if (!device) {
      console.log('❌ No Strava connection found for user ID 2');
      process.exit(1);
    }

    console.log('🔍 Found Strava Device:');
    console.log(`   Name: ${device.deviceName}`);
    console.log(`   Status: ${device.syncStatus}`);
    console.log(`   Last Synced: ${device.lastSyncedAt}\n`);

    console.log('🔄 Starting manual sync...\n');

    // Create sync log entry
    const syncLog = await DeviceSyncLog.create({
      deviceConnectionId: device.id,
      syncType: 'manual',
      dataType: 'all',
      status: 'pending',
      startedAt: new Date(),
    });

    // Run the sync
    const completedLog = await syncStravaData(device, syncLog);

    console.log('\n✅ Sync Complete!');
    console.log('==================');
    console.log(`   Status: ${completedLog.status}`);
    console.log(`   Records Processed: ${completedLog.recordsProcessed}`);
    console.log(`   Records Created: ${completedLog.recordsCreated}`);
    console.log(`   Records Skipped: ${completedLog.recordsSkipped}`);
    console.log(`   Duration: ${Math.round((completedLog.completedAt!.getTime() - completedLog.startedAt.getTime()) / 1000)}s`);

    if (completedLog.recordsCreated > 0) {
      console.log('\n💓 New heart rate data is now available on:');
      console.log('   📊 Vitals Page: http://localhost:3000/vitals');
      console.log('   🫀 Pulse Monitor: http://localhost:3000/vitals (Pulse tab)');
    } else {
      console.log('\n📝 No new activities found. All recent activities are already synced.');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Sync Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

manualStravaSync();
