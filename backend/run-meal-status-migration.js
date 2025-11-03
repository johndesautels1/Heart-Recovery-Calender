const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'heartbeat_calendar',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASS || '2663',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    logging: console.log,
  }
);

async function runMigration() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected successfully!');

    const migrationPath = path.join(__dirname, 'migrations', 'add_meal_status_field.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('\n--- Running meal status migration ---');
    await sequelize.query(sql);

    console.log('\n✅ Meal status migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
