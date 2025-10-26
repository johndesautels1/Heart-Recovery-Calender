import sequelize from '../models/database';

async function addMissingColumns() {
  try {
    console.log('Adding missing columns to calendar_events table...');

    // Add eventTemplateId column
    await sequelize.query(`
      ALTER TABLE calendar_events
      ADD COLUMN IF NOT EXISTS "eventTemplateId" INTEGER
      REFERENCES event_templates(id);
    `);
    console.log('✓ Added eventTemplateId column');

    // Add invitationStatus column
    await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_calendar_events_invitationStatus') THEN
          CREATE TYPE "enum_calendar_events_invitationStatus" AS ENUM('pending', 'accepted', 'declined');
        END IF;
      END $$;
    `);

    await sequelize.query(`
      ALTER TABLE calendar_events
      ADD COLUMN IF NOT EXISTS "invitationStatus" "enum_calendar_events_invitationStatus";
    `);
    console.log('✓ Added invitationStatus column');

    // Add patientId column
    await sequelize.query(`
      ALTER TABLE calendar_events
      ADD COLUMN IF NOT EXISTS "patientId" INTEGER
      REFERENCES users(id);
    `);
    console.log('✓ Added patientId column');

    console.log('All columns added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding columns:', error);
    process.exit(1);
  }
}

addMissingColumns();
