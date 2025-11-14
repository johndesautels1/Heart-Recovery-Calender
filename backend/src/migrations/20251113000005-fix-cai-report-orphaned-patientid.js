'use strict';

/**
 * Migration: Fix CAI Report orphaned patientId
 *
 * PROBLEM:
 * CAIReport records maintain both userId and patientId fields, but lack proper
 * foreign key constraints on patientId. When a Patient is deleted, cai_reports.patientId
 * becomes orphaned (references non-existent patient).
 *
 * SOLUTION:
 * - Add FK constraint on cai_reports.patientId with ON DELETE SET NULL
 * - Clean up any existing orphaned references
 * - When Patient is deleted, CAI report patientId becomes NULL (userId remains valid)
 *
 * SAFETY:
 * - CAI reports remain accessible via userId reference
 * - No data loss - only patientId set to NULL
 * - Fully reversible
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('[MIGRATION] Fixing CAI Report orphaned patientId references...');

      // Step 1: Check for existing orphaned CAI reports
      console.log('[MIGRATION] Checking for orphaned CAI reports...');

      const [orphanedReports] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count
         FROM cai_reports cr
         LEFT JOIN patients p ON p.id = cr."patientId"
         WHERE cr."patientId" IS NOT NULL
           AND p.id IS NULL`,
        { transaction }
      );

      if (orphanedReports[0].count > 0) {
        console.log(`[MIGRATION] Found ${orphanedReports[0].count} orphaned CAI reports`);
        console.log('[MIGRATION] Setting orphaned patientId to NULL...');

        // Set orphaned patientId to NULL
        const [remediationResult] = await queryInterface.sequelize.query(
          `UPDATE cai_reports
           SET "patientId" = NULL
           WHERE "patientId" IS NOT NULL
             AND "patientId" NOT IN (SELECT id FROM patients)`,
          { transaction }
        );

        console.log(`[MIGRATION] ✓ Remediated ${remediationResult.rowCount || 0} orphaned CAI reports`);
      } else {
        console.log('[MIGRATION] ✓ No orphaned CAI reports found');
      }

      // Step 2: Add FK constraint with ON DELETE SET NULL
      console.log('[MIGRATION] Adding FK constraint to cai_reports.patientId...');

      // Check if constraint already exists
      const [existingConstraints] = await queryInterface.sequelize.query(
        `SELECT constraint_name
         FROM information_schema.table_constraints
         WHERE table_name = 'cai_reports'
           AND constraint_type = 'FOREIGN KEY'
           AND constraint_name = 'cai_reports_patientId_fkey'`,
        { transaction }
      );

      if (existingConstraints.length > 0) {
        console.log('[MIGRATION] FK constraint already exists, dropping and recreating...');
        await queryInterface.sequelize.query(
          `ALTER TABLE cai_reports DROP CONSTRAINT IF EXISTS cai_reports_patientId_fkey`,
          { transaction }
        );
      }

      await queryInterface.sequelize.query(
        `ALTER TABLE cai_reports
         ADD CONSTRAINT cai_reports_patientId_fkey
         FOREIGN KEY ("patientId") REFERENCES patients(id)
         ON DELETE SET NULL`,
        { transaction }
      );

      console.log('[MIGRATION] ✓ FK constraint added: cai_reports.patientId → patients.id (ON DELETE SET NULL)');

      // Step 3: Create index for join queries
      console.log('[MIGRATION] Creating index on cai_reports.patientId...');

      const [existingIndexes] = await queryInterface.sequelize.query(
        `SELECT indexname
         FROM pg_indexes
         WHERE tablename = 'cai_reports'
           AND indexname = 'idx_cai_reports_patientId'`,
        { transaction }
      );

      if (existingIndexes.length === 0) {
        await queryInterface.sequelize.query(
          `CREATE INDEX idx_cai_reports_patientId ON cai_reports("patientId")
           WHERE "patientId" IS NOT NULL`,
          { transaction }
        );
        console.log('[MIGRATION] ✓ Index created: idx_cai_reports_patientId');
      } else {
        console.log('[MIGRATION] ✓ Index already exists: idx_cai_reports_patientId');
      }

      // Step 4: Verify fix
      console.log('[MIGRATION] Verifying CAI report references...');

      const [finalCheck] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count
         FROM cai_reports cr
         LEFT JOIN patients p ON p.id = cr."patientId"
         WHERE cr."patientId" IS NOT NULL
           AND p.id IS NULL`,
        { transaction }
      );

      if (finalCheck[0].count > 0) {
        throw new Error(`Verification failed: ${finalCheck[0].count} orphaned CAI reports still exist`);
      }

      console.log('[MIGRATION] ✅ CAI Report orphaned patientId fix complete');
      console.log('[MIGRATION] Result: CAI reports will have patientId set to NULL when Patient is deleted');
      console.log('[MIGRATION] CAI reports remain accessible via userId reference');

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
      console.log('[MIGRATION ROLLBACK] Reverting CAI Report FK constraint...');

      // Remove FK constraint
      await queryInterface.sequelize.query(
        `ALTER TABLE cai_reports DROP CONSTRAINT IF EXISTS cai_reports_patientId_fkey`,
        { transaction }
      );

      // Remove index
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS idx_cai_reports_patientId`,
        { transaction }
      );

      console.log('[MIGRATION ROLLBACK] ✅ CAI Report FK constraint removed');

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('[MIGRATION ROLLBACK] ❌ Rollback failed:', error);
      throw error;
    }
  },
};
