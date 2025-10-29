'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 Starting migration: Fix exercise event patientId to use userId');

    try {
      // First, let's check how many records need updating
      const [eventsToUpdate] = await queryInterface.sequelize.query(`
        SELECT COUNT(*) as count
        FROM calendar_events ce
        INNER JOIN patients p ON ce."patientId" = p.id
        WHERE ce."exerciseId" IS NOT NULL
          AND ce."patientId" != p."userId"
      `);

      const count = eventsToUpdate[0]?.count || 0;
      console.log(`📊 Found ${count} exercise events with incorrect patientId`);

      if (count === 0) {
        console.log('✅ No events need updating. Migration complete.');
        return;
      }

      // Update the patientId to use userId for exercise events
      const [result] = await queryInterface.sequelize.query(`
        UPDATE calendar_events ce
        SET "patientId" = p."userId"
        FROM patients p
        WHERE ce."patientId" = p.id
          AND ce."exerciseId" IS NOT NULL
          AND ce."patientId" != p."userId"
      `);

      console.log(`✅ Successfully updated ${result.rowCount || count} exercise events`);
      console.log('✨ Migration complete: Exercise events now use correct userId as patientId');

      // Verify the fix
      const [verifyRecords] = await queryInterface.sequelize.query(`
        SELECT COUNT(*) as count
        FROM calendar_events ce
        INNER JOIN patients p ON ce."patientId" = p.id
        WHERE ce."exerciseId" IS NOT NULL
          AND ce."patientId" != p."userId"
      `);

      const remainingCount = verifyRecords[0]?.count || 0;
      if (remainingCount > 0) {
        console.warn(`⚠️  Warning: ${remainingCount} events still have mismatched patientId`);
      } else {
        console.log('✅ Verification passed: All exercise events now have correct patientId');
      }

    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('⚠️  Rollback migration: Reverting exercise event patientId changes');
    console.log('ℹ️  Note: This rollback converts userId back to Patient.id, which may not be accurate');
    console.log('ℹ️  Manual verification recommended after rollback');

    try {
      // Revert patientId to use Patient.id for exercise events
      // Note: This assumes the original patientId was Patient.id
      const [result] = await queryInterface.sequelize.query(`
        UPDATE calendar_events ce
        SET "patientId" = p.id
        FROM patients p
        WHERE ce."patientId" = p."userId"
          AND ce."exerciseId" IS NOT NULL
      `);

      console.log(`✅ Rolled back ${result.rowCount} exercise events to use Patient.id`);
      console.log('⚠️  Rollback complete. Verify data integrity manually.');

    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
};
