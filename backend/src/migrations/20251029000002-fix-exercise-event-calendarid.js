'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 Starting migration: Fix exercise event calendarId to use patient\'s own calendar');

    try {
      // First, let's check how many records need updating
      const [eventsToUpdate] = await queryInterface.sequelize.query(`
        SELECT
          ce.id,
          ce.title,
          ce."calendarId" as current_calendar_id,
          ce."patientId",
          patient_cal.id as correct_calendar_id,
          patient_cal.name as correct_calendar_name,
          wrong_cal.name as wrong_calendar_name,
          wrong_cal."userId" as wrong_calendar_owner
        FROM calendar_events ce
        INNER JOIN calendars wrong_cal ON ce."calendarId" = wrong_cal.id
        INNER JOIN calendars patient_cal ON patient_cal."userId" = ce."patientId" AND patient_cal.type = 'exercise'
        WHERE ce."exerciseId" IS NOT NULL
          AND ce."calendarId" != patient_cal.id
      `);

      const count = eventsToUpdate.length;
      console.log(`📊 Found ${count} exercise events with incorrect calendarId`);

      if (count === 0) {
        console.log('✅ No events need updating. Migration complete.');
        return;
      }

      console.log('📋 Events to fix:');
      eventsToUpdate.forEach(e => {
        console.log(`  - Event #${e.id} "${e.title}": Moving from calendar #${e.current_calendar_id} (${e.wrong_calendar_name}) to calendar #${e.correct_calendar_id} (${e.correct_calendar_name})`);
      });

      // Update the calendarId to use patient's own exercise calendar
      const [result] = await queryInterface.sequelize.query(`
        UPDATE calendar_events ce
        SET "calendarId" = patient_cal.id
        FROM calendars patient_cal
        WHERE patient_cal."userId" = ce."patientId"
          AND patient_cal.type = 'exercise'
          AND ce."exerciseId" IS NOT NULL
          AND ce."calendarId" != patient_cal.id
      `);

      console.log(`✅ Successfully updated ${result.rowCount || count} exercise events`);
      console.log('✨ Migration complete: Exercise events now use patient\'s own calendar');

      // Verify the fix
      const [verifyRecords] = await queryInterface.sequelize.query(`
        SELECT COUNT(*) as count
        FROM calendar_events ce
        INNER JOIN calendars wrong_cal ON ce."calendarId" = wrong_cal.id
        INNER JOIN calendars patient_cal ON patient_cal."userId" = ce."patientId" AND patient_cal.type = 'exercise'
        WHERE ce."exerciseId" IS NOT NULL
          AND ce."calendarId" != patient_cal.id
      `);

      const remainingCount = verifyRecords[0]?.count || 0;
      if (remainingCount > 0) {
        console.warn(`⚠️  Warning: ${remainingCount} events still have mismatched calendarId`);
      } else {
        console.log('✅ Verification passed: All exercise events now use correct calendar');
      }

    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('⚠️  Rollback migration: Reverting exercise event calendarId changes');
    console.log('ℹ️  Note: This rollback cannot accurately restore original calendar assignments');
    console.log('ℹ️  Manual verification required after rollback');

    try {
      // This rollback is not precise - it just moves events back to any exercise calendar
      // In reality, we don't know which calendar they were originally on
      console.log('⚠️  Rollback not implemented - original calendar IDs were not preserved');
      console.log('ℹ️  If rollback is needed, restore from database backup');

    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
};
