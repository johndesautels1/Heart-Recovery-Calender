const db = require('./dist/models/index.js').default;

async function checkStravaData() {
  try {
    // Check sync logs
    const syncLogs = await db.query(
      'SELECT "startedAt", status, "recordsProcessed", "recordsCreated", "dataType", "errorMessage" FROM device_sync_logs ORDER BY "startedAt" DESC LIMIT 5',
      { type: 'SELECT' }
    );
    console.log('\n=== RECENT SYNC LOGS ===');
    console.log(JSON.stringify(syncLogs, null, 2));

    // Check Strava exercises
    const stravaExercises = await db.query(
      'SELECT COUNT(*) as count FROM exercise_logs WHERE "dataSource" = \'strava\'',
      { type: 'SELECT' }
    );
    console.log('\n=== STRAVA EXERCISES ===');
    console.log('Total Strava exercises synced:', stravaExercises[0].count);

    // Check device vitals
    const deviceVitals = await db.query(
      'SELECT COUNT(*) as count FROM vitals_samples WHERE source = \'device\'',
      { type: 'SELECT' }
    );
    console.log('\n=== DEVICE VITALS ===');
    console.log('Total device vitals synced:', deviceVitals[0].count);

    // Get sample Strava exercises
    const sampleExercises = await db.query(
      'SELECT "completedAt", "actualDuration", "duringHeartRateAvg", "duringHeartRateMax", notes FROM exercise_logs WHERE "dataSource" = \'strava\' ORDER BY "completedAt" DESC LIMIT 3',
      { type: 'SELECT' }
    );
    console.log('\n=== SAMPLE STRAVA EXERCISES ===');
    console.log(JSON.stringify(sampleExercises, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStravaData();
