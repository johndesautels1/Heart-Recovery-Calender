'use strict';

/**
 * Migration: Fix Exercise tables orphaned patientId
 *
 * PROBLEM:
 * ExerciseLog and ExercisePrescription tables maintain both userId and patientId fields,
 * but lack proper foreign key constraints on patientId. When a Patient is deleted,
 * exercise_logs.patientId and exercise_prescriptions.patientId become orphaned
 * (reference non-existent patient).
 *
 * SOLUTION:
 * - Add FK constraint on exercise_logs.patientId with ON DELETE SET NULL
 * - Add FK constraint on exercise_prescriptions.patientId with ON DELETE SET NULL
 * - Clean up any existing orphaned references
 * - When Patient is deleted, exercise patientId becomes NULL (userId remains valid)
 *
 * SAFETY:
 * - Exercise data remains accessible via userId reference
 * - No data loss - only patientId set to NULL
 * - Fully reversible
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('[MIGRATION] Fixing Exercise tables orphaned patientId references...');

      // ===== EXERCISE LOGS =====

      // Step 1: Check for existing orphaned exercise logs
      console.log('[MIGRATION] Checking for orphaned exercise logs...');

      const [orphanedLogs] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count
         FROM exercise_logs el
         LEFT JOIN patients p ON p.id = el."patientId"
         WHERE el."patientId" IS NOT NULL
           AND p.id IS NULL`,
        { transaction }
      );

      if (orphanedLogs[0].count > 0) {
        console.log(`[MIGRATION] Found ${orphanedLogs[0].count} orphaned exercise logs`);
        console.log('[MIGRATION] Setting orphaned patientId to NULL in exercise_logs...');

        // Set orphaned patientId to NULL
        const [logsRemediationResult] = await queryInterface.sequelize.query(
          `UPDATE exercise_logs
           SET "patientId" = NULL
           WHERE "patientId" IS NOT NULL
             AND "patientId" NOT IN (SELECT id FROM patients)`,
          { transaction }
        );

        console.log(`[MIGRATION] ✓ Remediated ${logsRemediationResult.rowCount || 0} orphaned exercise logs`);
      } else {
        console.log('[MIGRATION] ✓ No orphaned exercise logs found');
      }

      // Step 2: Add FK constraint with ON DELETE SET NULL for exercise_logs
      console.log('[MIGRATION] Adding FK constraint to exercise_logs.patientId...');

      // Check if constraint already exists
      const [existingLogsConstraints] = await queryInterface.sequelize.query(
        `SELECT constraint_name
         FROM information_schema.table_constraints
         WHERE table_name = 'exercise_logs'
           AND constraint_type = 'FOREIGN KEY'
           AND constraint_name = 'exercise_logs_patientId_fkey'`,
        { transaction }
      );

      if (existingLogsConstraints.length > 0) {
        console.log('[MIGRATION] FK constraint already exists, dropping and recreating...');
        await queryInterface.sequelize.query(
          `ALTER TABLE exercise_logs DROP CONSTRAINT IF EXISTS exercise_logs_patientId_fkey`,
          { transaction }
        );
      }

      await queryInterface.sequelize.query(
        `ALTER TABLE exercise_logs
         ADD CONSTRAINT exercise_logs_patientId_fkey
         FOREIGN KEY ("patientId") REFERENCES patients(id)
         ON DELETE SET NULL`,
        { transaction }
      );

      console.log('[MIGRATION] ✓ FK constraint added: exercise_logs.patientId → patients.id (ON DELETE SET NULL)');

      // Step 3: Create index for join queries on exercise_logs
      console.log('[MIGRATION] Creating index on exercise_logs.patientId...');

      const [existingLogsIndexes] = await queryInterface.sequelize.query(
        `SELECT indexname
         FROM pg_indexes
         WHERE tablename = 'exercise_logs'
           AND indexname = 'idx_exercise_logs_patientId'`,
        { transaction }
      );

      if (existingLogsIndexes.length === 0) {
        await queryInterface.sequelize.query(
          `CREATE INDEX idx_exercise_logs_patientId ON exercise_logs("patientId")
           WHERE "patientId" IS NOT NULL`,
          { transaction }
        );
        console.log('[MIGRATION] ✓ Index created: idx_exercise_logs_patientId');
      } else {
        console.log('[MIGRATION] ✓ Index already exists: idx_exercise_logs_patientId');
      }

      // ===== EXERCISE PRESCRIPTIONS =====

      // Step 4: Check for existing orphaned exercise prescriptions
      console.log('[MIGRATION] Checking for orphaned exercise prescriptions...');

      const [orphanedPrescriptions] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count
         FROM exercise_prescriptions ep
         LEFT JOIN patients p ON p.id = ep."patientId"
         WHERE ep."patientId" IS NOT NULL
           AND p.id IS NULL`,
        { transaction }
      );

      if (orphanedPrescriptions[0].count > 0) {
        console.log(`[MIGRATION] Found ${orphanedPrescriptions[0].count} orphaned exercise prescriptions`);
        console.log('[MIGRATION] Setting orphaned patientId to NULL in exercise_prescriptions...');

        // Set orphaned patientId to NULL
        const [prescriptionsRemediationResult] = await queryInterface.sequelize.query(
          `UPDATE exercise_prescriptions
           SET "patientId" = NULL
           WHERE "patientId" IS NOT NULL
             AND "patientId" NOT IN (SELECT id FROM patients)`,
          { transaction }
        );

        console.log(`[MIGRATION] ✓ Remediated ${prescriptionsRemediationResult.rowCount || 0} orphaned exercise prescriptions`);
      } else {
        console.log('[MIGRATION] ✓ No orphaned exercise prescriptions found');
      }

      // Step 5: Add FK constraint with ON DELETE SET NULL for exercise_prescriptions
      console.log('[MIGRATION] Adding FK constraint to exercise_prescriptions.patientId...');

      // Check if constraint already exists
      const [existingPrescriptionsConstraints] = await queryInterface.sequelize.query(
        `SELECT constraint_name
         FROM information_schema.table_constraints
         WHERE table_name = 'exercise_prescriptions'
           AND constraint_type = 'FOREIGN KEY'
           AND constraint_name = 'exercise_prescriptions_patientId_fkey'`,
        { transaction }
      );

      if (existingPrescriptionsConstraints.length > 0) {
        console.log('[MIGRATION] FK constraint already exists, dropping and recreating...');
        await queryInterface.sequelize.query(
          `ALTER TABLE exercise_prescriptions DROP CONSTRAINT IF EXISTS exercise_prescriptions_patientId_fkey`,
          { transaction }
        );
      }

      await queryInterface.sequelize.query(
        `ALTER TABLE exercise_prescriptions
         ADD CONSTRAINT exercise_prescriptions_patientId_fkey
         FOREIGN KEY ("patientId") REFERENCES patients(id)
         ON DELETE SET NULL`,
        { transaction }
      );

      console.log('[MIGRATION] ✓ FK constraint added: exercise_prescriptions.patientId → patients.id (ON DELETE SET NULL)');

      // Step 6: Create index for join queries on exercise_prescriptions
      console.log('[MIGRATION] Creating index on exercise_prescriptions.patientId...');

      const [existingPrescriptionsIndexes] = await queryInterface.sequelize.query(
        `SELECT indexname
         FROM pg_indexes
         WHERE tablename = 'exercise_prescriptions'
           AND indexname = 'idx_exercise_prescriptions_patientId'`,
        { transaction }
      );

      if (existingPrescriptionsIndexes.length === 0) {
        await queryInterface.sequelize.query(
          `CREATE INDEX idx_exercise_prescriptions_patientId ON exercise_prescriptions("patientId")
           WHERE "patientId" IS NOT NULL`,
          { transaction }
        );
        console.log('[MIGRATION] ✓ Index created: idx_exercise_prescriptions_patientId');
      } else {
        console.log('[MIGRATION] ✓ Index already exists: idx_exercise_prescriptions_patientId');
      }

      // Step 7: Verify fix
      console.log('[MIGRATION] Verifying exercise table references...');

      const [finalLogsCheck] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count
         FROM exercise_logs el
         LEFT JOIN patients p ON p.id = el."patientId"
         WHERE el."patientId" IS NOT NULL
           AND p.id IS NULL`,
        { transaction }
      );

      if (finalLogsCheck[0].count > 0) {
        throw new Error(`Verification failed: ${finalLogsCheck[0].count} orphaned exercise logs still exist`);
      }

      const [finalPrescriptionsCheck] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count
         FROM exercise_prescriptions ep
         LEFT JOIN patients p ON p.id = ep."patientId"
         WHERE ep."patientId" IS NOT NULL
           AND p.id IS NULL`,
        { transaction }
      );

      if (finalPrescriptionsCheck[0].count > 0) {
        throw new Error(`Verification failed: ${finalPrescriptionsCheck[0].count} orphaned exercise prescriptions still exist`);
      }

      console.log('[MIGRATION] ✅ Exercise tables orphaned patientId fix complete');
      console.log('[MIGRATION] Result: Exercise logs and prescriptions will have patientId set to NULL when Patient is deleted');
      console.log('[MIGRATION] Exercise data remains accessible via userId reference');

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('[MIGRATION] ❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('[MIGRATION ROLLBACK] Reverting Exercise tables FK constraints...');

      // Remove FK constraints
      await queryInterface.sequelize.query(
        `ALTER TABLE exercise_logs DROP CONSTRAINT IF EXISTS exercise_logs_patientId_fkey`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE exercise_prescriptions DROP CONSTRAINT IF EXISTS exercise_prescriptions_patientId_fkey`,
        { transaction }
      );

      // Remove indexes
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS idx_exercise_logs_patientId`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS idx_exercise_prescriptions_patientId`,
        { transaction }
      );

      console.log('[MIGRATION ROLLBACK] ✅ Exercise tables FK constraints removed');

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('[MIGRATION ROLLBACK] ❌ Rollback failed:', error);
      throw error;
    }
  },
};
