'use strict';

/**
 * Migration: Fix Patient.userId NULL values for data integrity
 *
 * Problem: Many patient records have userId = NULL, breaking the Patient = User architecture
 * Solution: For self-managed patients (therapistId = userId), populate userId field
 *
 * This is a data integrity fix for the fundamental Patient = User relationship.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 Starting migration: Fix Patient.userId NULL values');

    try {
      // Find all patients where userId IS NULL but therapistId exists
      const [patientsToFix] = await queryInterface.sequelize.query(`
        SELECT id, "therapistId"
        FROM patients
        WHERE "userId" IS NULL
          AND "therapistId" IS NOT NULL
      `);

      console.log(`📊 Found ${patientsToFix.length} patients with NULL userId`);

      if (patientsToFix.length === 0) {
        console.log('✅ No patients need fixing. Migration complete.');
        return;
      }

      // For self-managed patients, set userId = therapistId
      // This represents the Patient = User relationship (one entity, one ID)
      const [result] = await queryInterface.sequelize.query(`
        UPDATE patients
        SET "userId" = "therapistId"
        WHERE "userId" IS NULL
          AND "therapistId" IS NOT NULL
      `);

      console.log(`✅ Successfully updated ${patientsToFix.length} patient records`);
      console.log('✨ Migration complete: Patient.userId now populated for all self-managed patients');

      // Verify the fix
      const [verifyRecords] = await queryInterface.sequelize.query(`
        SELECT COUNT(*) as count
        FROM patients
        WHERE "userId" IS NULL
          AND "therapistId" IS NOT NULL
      `);

      const remainingCount = verifyRecords[0]?.count || 0;
      if (remainingCount > 0) {
        console.warn(`⚠️  Warning: ${remainingCount} patients still have NULL userId`);
      } else {
        console.log('✅ Verification passed: All patients now have userId populated');
      }

    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('⚠️  Rollback migration: Reverting Patient.userId changes');
    console.log('ℹ️  Note: This rollback sets userId back to NULL');
    console.log('ℹ️  Manual verification recommended after rollback');

    try {
      // Revert userId to NULL for patients where userId = therapistId
      const [result] = await queryInterface.sequelize.query(`
        UPDATE patients
        SET "userId" = NULL
        WHERE "userId" = "therapistId"
      `);

      console.log(`✅ Rolled back ${result.rowCount || 0} patient records`);
      console.log('⚠️  Rollback complete. Verify data integrity manually.');

    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
};
