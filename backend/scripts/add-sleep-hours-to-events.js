const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('heartbeat_calendar', 'postgres', '2663', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false
});

async function addSleepHours() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    // Check if column already exists
    const [columns] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'calendar_events' AND column_name = 'sleepHours'
    `);

    if (columns.length > 0) {
      console.log('✓ sleepHours column already exists');
      process.exit(0);
    }

    console.log('\nAdding sleepHours column to calendar_events table...');

    await sequelize.query(`
      ALTER TABLE calendar_events
      ADD COLUMN "sleepHours" DECIMAL(3, 1) DEFAULT NULL
    `);

    // Add column comment separately (PostgreSQL syntax)
    await sequelize.query(`
      COMMENT ON COLUMN calendar_events."sleepHours" IS 'Hours of restful sleep the night before this date'
    `);

    console.log('✅ sleepHours column added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addSleepHours();
