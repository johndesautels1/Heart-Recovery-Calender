const { Sequelize } = require('sequelize');
require('dotenv').config();

// Initialize database connection
const sequelize = new Sequelize(
  process.env.DB_NAME || 'heartbeat_calendar',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASS || '2663',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  }
);

async function cleanInvalidSleepLogs() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    // Delete sleep logs with "Invalid date" in bedTime or wakeTime
    const result = await sequelize.query(
      `DELETE FROM sleep_logs
       WHERE "bedTime"::text = 'Invalid date'
          OR "wakeTime"::text = 'Invalid date'
       RETURNING id`,
      { type: Sequelize.QueryTypes.DELETE }
    );

    console.log(`Deleted ${result.length} invalid sleep logs`);

    // Also update any remaining NULL timestamps to be truly NULL instead of invalid
    const updateResult = await sequelize.query(
      `UPDATE sleep_logs
       SET "bedTime" = NULL
       WHERE "bedTime"::text LIKE '%Invalid%'`,
      { type: Sequelize.QueryTypes.UPDATE }
    );

    const updateResult2 = await sequelize.query(
      `UPDATE sleep_logs
       SET "wakeTime" = NULL
       WHERE "wakeTime"::text LIKE '%Invalid%'`,
      { type: Sequelize.QueryTypes.UPDATE }
    );

    console.log('Cleanup completed successfully!');

  } catch (error) {
    console.error('Error cleaning invalid sleep logs:', error);
  } finally {
    await sequelize.close();
  }
}

cleanInvalidSleepLogs();
