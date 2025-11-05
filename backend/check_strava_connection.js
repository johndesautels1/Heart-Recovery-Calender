require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS
});

async function checkStravaConnection() {
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // First, list all tables
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('\n📋 All tables in database:');
    console.log(tablesResult.rows.map(r => r.table_name).join(', '));

    const result = await client.query(`
      SELECT
        id,
        "userId",
        "deviceType",
        "deviceName",
        "syncStatus",
        "lastSyncedAt",
        "autoSync",
        "syncHeartRate"
      FROM device_connections
      WHERE "deviceType" = 'strava'
    `);

    console.log(`\nFound ${result.rows.length} Strava connection(s):\n`);
    console.log(JSON.stringify(result.rows, null, 2));

    if (result.rows.length > 0) {
      // Also check for recent heart rate data
      const hrResult = await client.query(`
        SELECT COUNT(*) as count, MAX(timestamp) as latest
        FROM vitals_samples
        WHERE "deviceId" LIKE 'strava_%'
        AND timestamp > NOW() - INTERVAL '30 days'
      `);

      console.log('\n📊 Heart rate data from Strava (last 30 days):');
      console.log(JSON.stringify(hrResult.rows, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkStravaConnection();
