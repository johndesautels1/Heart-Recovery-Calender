const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('heartbeat_calendar', 'postgres', '2663', {
  host: 'localhost',
  dialect: 'postgres',
  logging: console.log
});

async function cleanup() {
  try {
    console.log('🧹 Cleaning up partial exercise_logs migration...');

    // Check if column exists
    const [results] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='exercise_logs' AND column_name='postSurgeryDay';
    `);

    if (results.length > 0) {
      await sequelize.query(`ALTER TABLE exercise_logs DROP COLUMN "postSurgeryDay";`);
      console.log('  ✅ Removed postSurgeryDay column from exercise_logs');
    } else {
      console.log('  ℹ️  postSurgeryDay column does not exist, nothing to clean');
    }

    // Drop any existing triggers and functions (just in case)
    await sequelize.query(`DROP TRIGGER IF EXISTS exercise_auto_post_surgery_day ON exercise_logs;`);
    await sequelize.query(`DROP FUNCTION IF EXISTS calculate_exercise_post_surgery_day();`);
    console.log('  ✅ Dropped any existing triggers/functions');

    console.log('✅ Cleanup complete');
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanup();
