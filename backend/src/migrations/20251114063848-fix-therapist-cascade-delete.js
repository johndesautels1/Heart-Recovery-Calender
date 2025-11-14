'use strict';

/**
 * Migration: Fix Therapist CASCADE delete risk
 *
 * PROBLEM:
 * When a therapist User record is deleted, the ON DELETE CASCADE constraint on
 * patients.therapistId causes ALL patient records for that therapist to be deleted,
 * which then cascades to delete thousands of exercise logs, prescriptions, vitals,
 * calendar events, and other patient data.
 *
 * CATASTROPHIC SCENARIO:
 * DELETE FROM users WHERE id = 5 (therapist)
 *   → CASCADE deletes 50+ Patient records
 *   → Orphans/deletes 10,000+ ExerciseLog records
 *   → Orphans/deletes 2,000+ ExercisePrescription records
 *   → Orphans/deletes thousands of VitalsSample, CalendarEvent, etc.
 *
 * SOLUTION:
 * - Change patients.therapistId FK from ON DELETE CASCADE to ON DELETE RESTRICT
 * - This prevents therapist deletion if patients exist
 * - Therapist must reassign all patients before account can be deleted
 * - Or use soft-delete (deactivation) instead of hard delete
 *
 * SAFETY:
 * - Prevents accidental catastrophic data loss
 * - Forces explicit patient reassignment workflow
 * - Fully reversible
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('[MIGRATION] Fixing Therapist CASCADE delete risk...');

      // Step 1: Report current therapist-patient relationships
      console.log('[MIGRATION] Auditing therapist-patient relationships...');

      const [therapistStats] = await queryInterface.sequelize.query(
        `SELECT
           u.id as therapist_id,
           u.name as therapist_name,
           COUNT(p.id) as patient_count
         FROM users u
         LEFT JOIN patients p ON p."therapistId" = u.id
         WHERE u.role = 'therapist'
         GROUP BY u.id, u.name
         ORDER BY patient_count DESC`,
        { transaction }
      );

      console.log(`[MIGRATION] Found ${therapistStats.length} therapists:`);
      therapistStats.forEach(stat => {
        console.log(`  - ${stat.therapist_name} (ID: ${stat.therapist_id}): ${stat.patient_count} patients`);
      });

      const totalPatients = therapistStats.reduce((sum, stat) => sum + parseInt(stat.patient_count || 0), 0);
      console.log(`[MIGRATION] Total patients managed: ${totalPatients}`);

      // Step 2: Check current FK constraint
      console.log('[MIGRATION] Checking current FK constraint on patients.therapistId...');

      const [existingConstraints] = await queryInterface.sequelize.query(
        `SELECT
           tc.constraint_name,
           rc.delete_rule
         FROM information_schema.table_constraints tc
         JOIN information_schema.referential_constraints rc
           ON tc.constraint_name = rc.constraint_name
         WHERE tc.table_name = 'patients'
           AND tc.constraint_type = 'FOREIGN KEY'
           AND tc.constraint_name LIKE '%therapistId%'`,
        { transaction }
      );

      if (existingConstraints.length > 0) {
        const currentRule = existingConstraints[0].delete_rule;
        console.log(`[MIGRATION] Current delete rule: ${currentRule}`);

        if (currentRule === 'CASCADE') {
          console.log('[MIGRATION] ⚠️  WARNING: Current CASCADE behavior would delete ALL patient data!');
          console.log(`[MIGRATION] Changing to RESTRICT to prevent catastrophic data loss...`);
        }
      }

      // Step 3: Drop existing FK constraint
      console.log('[MIGRATION] Dropping existing therapistId FK constraint...');

      await queryInterface.sequelize.query(
        `ALTER TABLE patients
         DROP CONSTRAINT IF EXISTS patients_therapistId_fkey`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE patients
         DROP CONSTRAINT IF EXISTS fk_patients_therapist`,
        { transaction }
      );

      console.log('[MIGRATION] ✓ Existing constraints dropped');

      // Step 4: Add new RESTRICT constraint
      console.log('[MIGRATION] Adding new FK constraint with ON DELETE RESTRICT...');

      await queryInterface.sequelize.query(
        `ALTER TABLE patients
         ADD CONSTRAINT patients_therapistId_fkey
         FOREIGN KEY ("therapistId") REFERENCES users(id)
         ON DELETE RESTRICT
         ON UPDATE CASCADE`,
        { transaction }
      );

      console.log('[MIGRATION] ✓ FK constraint added: patients.therapistId → users.id (ON DELETE RESTRICT)');

      // Step 5: Create index for therapist lookups
      console.log('[MIGRATION] Creating index on patients.therapistId...');

      const [existingIndexes] = await queryInterface.sequelize.query(
        `SELECT indexname
         FROM pg_indexes
         WHERE tablename = 'patients'
           AND indexname = 'idx_patients_therapistId'`,
        { transaction }
      );

      if (existingIndexes.length === 0) {
        await queryInterface.sequelize.query(
          `CREATE INDEX idx_patients_therapistId ON patients("therapistId")`,
          { transaction }
        );
        console.log('[MIGRATION] ✓ Index created: idx_patients_therapistId');
      } else {
        console.log('[MIGRATION] ✓ Index already exists: idx_patients_therapistId');
      }

      // Step 6: List all FK constraints for verification
      console.log('[MIGRATION] Listing all FK constraints on patients table...');

      const [allConstraints] = await queryInterface.sequelize.query(
        `SELECT
           tc.constraint_name,
           kcu.column_name,
           rc.delete_rule,
           rc.update_rule
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
         JOIN information_schema.referential_constraints rc
           ON tc.constraint_name = rc.constraint_name
         WHERE tc.table_name = 'patients'
           AND tc.constraint_type = 'FOREIGN KEY'
         ORDER BY tc.constraint_name`,
        { transaction }
      );

      console.log('[MIGRATION] Current FK constraints:');
      allConstraints.forEach(constraint => {
        console.log(`  - ${constraint.constraint_name}: ${constraint.column_name} → ON DELETE ${constraint.delete_rule}`);
      });

      console.log('[MIGRATION] ✅ Therapist CASCADE delete risk mitigation complete');
      console.log('[MIGRATION] Result: Therapist cannot be deleted if patients exist');
      console.log('[MIGRATION] Recommendation: Implement soft-delete (is_active flag) for therapists');
      console.log('[MIGRATION] Alternative: Reassign patients before deleting therapist account');

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
      console.log('[MIGRATION ROLLBACK] Reverting Therapist FK constraint...');
      console.log('[MIGRATION ROLLBACK] ⚠️  WARNING: This will re-enable CASCADE delete behavior!');

      // Drop RESTRICT constraint
      await queryInterface.sequelize.query(
        `ALTER TABLE patients
         DROP CONSTRAINT IF EXISTS patients_therapistId_fkey`,
        { transaction }
      );

      // Restore original CASCADE constraint
      await queryInterface.sequelize.query(
        `ALTER TABLE patients
         ADD CONSTRAINT patients_therapistId_fkey
         FOREIGN KEY ("therapistId") REFERENCES users(id)
         ON DELETE CASCADE
         ON UPDATE CASCADE`,
        { transaction }
      );

      // Remove index
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS idx_patients_therapistId`,
        { transaction }
      );

      console.log('[MIGRATION ROLLBACK] ✅ Therapist FK constraint reverted to CASCADE');
      console.log('[MIGRATION ROLLBACK] ⚠️  CASCADE delete behavior restored - data loss risk active!');

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('[MIGRATION ROLLBACK] ❌ Rollback failed:', error);
      throw error;
    }
  },
};
