const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('heartbeat_calendar', 'postgres', '2663', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false
});

async function checkColumns() {
  try {
    const [results] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='exercise_logs'
      AND column_name IN ('postSurgeryDay', 'startedAt', 'preBpSystolic', 'distanceMiles', 'perceivedExertion')
      ORDER BY column_name;
    `);

    console.log('Existing columns from migration:', results.map(r => r.column_name));

    // Check for trigger
    const [triggers] = await sequelize.query(`
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE event_object_table='exercise_logs'
      AND trigger_name='exercise_auto_post_surgery_day';
    `);

    console.log('Trigger exists:', triggers.length > 0);

    await sequelize.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkColumns();
