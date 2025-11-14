'use strict';

/**
 * Migration: Cleanup duplicate FK constraints on patients table
 *
 * PROBLEM:
 * Previous migrations created duplicate FK constraints on patients table:
 * - patients_therapistId_fkey (CASCADE) + patients_therapistid_fkey (RESTRICT)
 * - patients_userId_fkey (SET NULL) + patients_userId_fkey1 (CASCADE)
 *
 * SOLUTION:
 * Drop the CASCADE constraints, keeping only the safe RESTRICT/SET NULL variants
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('[MIGRATION] Cleaning up duplicate FK constraints on patients table...');

      // List all FK constraints before cleanup
      const [constraintsBefore] = await queryInterface.sequelize.query(
        `SELECT
           tc.constraint_name,
           kcu.column_name,
           rc.delete_rule
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
         JOIN information_schema.referential_constraints rc
           ON tc.constraint_name = rc.constraint_name
         WHERE tc.table_name = 'patients'
           AND tc.constraint_type = 'FOREIGN KEY'
         ORDER BY kcu.column_name, tc.constraint_name`,
        { transaction }
      );

      console.log('[MIGRATION] FK constraints BEFORE cleanup:');
      constraintsBefore.forEach(c => {
        console.log(`  - ${c.constraint_name}: ${c.column_name} → ON DELETE ${c.delete_rule}`);
      });

      // Drop CASCADE therapistId constraint (keeping RESTRICT)
      console.log('[MIGRATION] Dropping CASCADE therapistId constraint...');
      await queryInterface.sequelize.query(
        `ALTER TABLE patients
         DROP CONSTRAINT IF EXISTS "patients_therapistId_fkey"`,
        { transaction }
      );

      // Drop CASCADE userId constraint (keeping SET NULL)
      console.log('[MIGRATION] Dropping CASCADE userId constraint...');
      await queryInterface.sequelize.query(
        `ALTER TABLE patients
         DROP CONSTRAINT IF EXISTS "patients_userId_fkey1"`,
        { transaction }
      );

      // List all FK constraints after cleanup
      const [constraintsAfter] = await queryInterface.sequelize.query(
        `SELECT
           tc.constraint_name,
           kcu.column_name,
           rc.delete_rule
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
         JOIN information_schema.referential_constraints rc
           ON tc.constraint_name = rc.constraint_name
         WHERE tc.table_name = 'patients'
           AND tc.constraint_type = 'FOREIGN KEY'
         ORDER BY kcu.column_name, tc.constraint_name`,
        { transaction }
      );

      console.log('[MIGRATION] FK constraints AFTER cleanup:');
      constraintsAfter.forEach(c => {
        console.log(`  - ${c.constraint_name}: ${c.column_name} → ON DELETE ${c.delete_rule}`);
      });

      console.log('[MIGRATION] ✅ Duplicate FK constraints cleaned up');

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('[MIGRATION] ❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('[MIGRATION ROLLBACK] No rollback needed - this migration only removed duplicate constraints');
    return Promise.resolve();
  },
};
