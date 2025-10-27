const { Sequelize } = require('sequelize');
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

    console.log('\n--- Adding columns to exercises table ---');
    await sequelize.query(`
      ALTER TABLE exercises
      ADD COLUMN IF NOT EXISTS "formTips" TEXT,
      ADD COLUMN IF NOT EXISTS "modifications" TEXT;
    `);
    console.log('✓ Added formTips and modifications columns to exercises table');

    await sequelize.query(`
      COMMENT ON COLUMN exercises."formTips" IS 'Proper form and technique tips';
    `);
    await sequelize.query(`
      COMMENT ON COLUMN exercises."modifications" IS 'Exercise modifications for different abilities or limitations';
    `);
    console.log('✓ Added column comments');

    console.log('\n--- Adding columns to exercise_logs table ---');
    await sequelize.query(`
      ALTER TABLE exercise_logs
      ADD COLUMN IF NOT EXISTS "weight" DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS "rangeOfMotion" INTEGER,
      ADD COLUMN IF NOT EXISTS "painLocation" VARCHAR(255);
    `);
    console.log('✓ Added weight, rangeOfMotion, and painLocation columns to exercise_logs table');

    await sequelize.query(`
      COMMENT ON COLUMN exercise_logs."weight" IS 'Weight used in pounds for progressive overload tracking';
    `);
    await sequelize.query(`
      COMMENT ON COLUMN exercise_logs."rangeOfMotion" IS 'Range of motion in degrees (0-180) or percentage (0-100)';
    `);
    await sequelize.query(`
      COMMENT ON COLUMN exercise_logs."painLocation" IS 'Location of pain/discomfort (e.g., chest, shoulder, knee)';
    `);
    console.log('✓ Added column comments');

    console.log('\n--- Creating indexes ---');
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_exercise_logs_patient_date ON exercise_logs("patientId", "completedAt");
    `);
    console.log('✓ Created index: idx_exercise_logs_patient_date');

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_exercise_logs_prescription ON exercise_logs("prescriptionId");
    `);
    console.log('✓ Created index: idx_exercise_logs_prescription');

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
