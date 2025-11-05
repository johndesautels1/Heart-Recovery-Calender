import sequelize from '../models/database';
import DeviceConnection from '../models/DeviceConnection';
import User from '../models/User';
import VitalsSample from '../models/VitalsSample';

async function checkStravaConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Check for Strava device connections
    const stravaDevices = await DeviceConnection.findAll({
      where: { deviceType: 'strava' }
    });

    console.log('🔍 Strava Device Connections:');
    console.log('==============================');
    if (stravaDevices.length === 0) {
      console.log('❌ No Strava connections found\n');
      console.log('📝 To connect Strava:');
      console.log('1. Navigate to http://localhost:3000/devices');
      console.log('2. Click "Connect Strava"');
      console.log('3. Authorize the app on Strava\'s website');
      console.log('4. You\'ll be redirected back and data will auto-sync\n');
    } else {
      for (const device of stravaDevices) {
        const user = await User.findByPk(device.userId);
        console.log(`\n📱 Device ID: ${device.id}`);
        console.log(`   Name: ${device.deviceName}`);
        console.log(`   User ID: ${device.userId} (${user?.name || 'Unknown'} - ${user?.email || 'N/A'})`);
        console.log(`   Status: ${device.syncStatus}`);
        console.log(`   Last Synced: ${device.lastSyncedAt || 'Never'}`);
        console.log(`   Sync Heart Rate: ${device.syncHeartRate ? '✅' : '❌'}`);
        console.log(`   Auto Sync: ${device.autoSync ? '✅' : '❌'}`);
        if (device.syncError) {
          console.log(`   ⚠️  Error: ${device.syncError}`);
        }
      }
    }

    // Check for heart rate data from Strava
    console.log('\n\n💓 Heart Rate Data from Strava:');
    console.log('================================');
    const stravaHeartRateData = await VitalsSample.findAll({
      where: {
        source: 'device',
      },
      order: [['timestamp', 'DESC']],
      limit: 10
    });

    if (stravaHeartRateData.length === 0) {
      console.log('❌ No heart rate data found from devices\n');
    } else {
      console.log(`✅ Found ${stravaHeartRateData.length} recent heart rate entries:\n`);
      for (const sample of stravaHeartRateData) {
        if (sample.deviceId?.includes('strava')) {
          console.log(`   📊 ${sample.timestamp.toLocaleString()}`);
          console.log(`      Heart Rate: ${sample.heartRate} bpm`);
          console.log(`      Device: ${sample.deviceId}`);
          console.log(`      Notes: ${sample.notes || 'N/A'}\n`);
        }
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkStravaConnection();
