'use strict';

/**
 * Migration: Sync data between User and Patient tables
 *
 * PROBLEMS FOUND IN AUDIT:
 * 1. 11 users have NULL surgeryDate in users table but Patient.surgeryDate has values
 * 2. 8 users have name mismatches between User.name and Patient.name
 *
 * SOLUTIONS:
 * 1. Sync surgeryDate from Patient to User (User.surgeryDate is single source of truth going forward)
 * 2. Sync names from User to Patient (User.name is authoritative)
 *
 * NOTE: Does NOT create missing Patient records (users 1 and 10) - that requires therapistId
 * which must be handled manually or in application logic.
 *
 * SAFETY: Data changes only - no schema changes
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('[MIGRATION] Syncing data between User and Patient tables...');

      // 1. Sync surgeryDate from Patient to User (User.surgeryDate becomes single source of truth)
      console.log('[MIGRATION] Syncing surgery dates from Patient to User...');

      const [surgerySyncResult] = await queryInterface.sequelize.query(
        `UPDATE users u
         SET "surgeryDate" = p."surgeryDate"
         FROM patients p
         WHERE p."userId" = u.id
           AND u."surgeryDate" IS NULL
           AND p."surgeryDate" IS NOT NULL`,
        { transaction }
      );

      console.log(`[MIGRATION] ✓ Synced ${surgerySyncResult.rowCount || 0} surgery dates from Patient to User`);

      // 2. Sync names from User to Patient (User.name is authoritative)
      console.log('[MIGRATION] Syncing names from User to Patient...');

      const [nameSyncResult] = await queryInterface.sequelize.query(
        `UPDATE patients p
         SET name = u.name
         FROM users u
         WHERE p."userId" = u.id
           AND p.name IS DISTINCT FROM u.name
           AND u.name IS NOT NULL`,
        { transaction }
      );

      console.log(`[MIGRATION] ✓ Synced ${nameSyncResult.rowCount || 0} names from User to Patient`);

      // 3. Report status
      console.log('[MIGRATION] Verifying sync results...');

      const [surgeryCounts] = await queryInterface.sequelize.query(
        `SELECT
           COUNT(DISTINCT u.id) as total_users_with_patients,
           COUNT(DISTINCT CASE WHEN u."surgeryDate" IS NOT NULL THEN u.id END) as users_with_surgery_date,
           COUNT(DISTINCT CASE WHEN p."surgeryDate" IS NOT NULL THEN u.id END) as patients_with_surgery_date
         FROM users u
         INNER JOIN patients p ON p."userId" = u.id
         WHERE u.role = 'patient'`,
        { transaction }
      );

      console.log('[MIGRATION] Surgery date counts:', surgeryCounts[0]);

      const [nameMismatches] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count
         FROM users u
         INNER JOIN patients p ON p."userId" = u.id
         WHERE p.name IS DISTINCT FROM u.name`,
        { transaction }
      );

      console.log(`[MIGRATION] Remaining name mismatches: ${nameMismatches[0].count}`);

      const [orphanedUsers] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count
         FROM users u
         LEFT JOIN patients p ON p."userId" = u.id
         WHERE u.role = 'patient'
           AND p.id IS NULL`,
        { transaction }
      );

      if (orphanedUsers[0].count > 0) {
        console.log(`[MIGRATION] ⚠️  WARNING: ${orphanedUsers[0].count} users with role='patient' have no Patient record`);
        console.log('[MIGRATION] These users cannot be synced and may cause issues');
        console.log('[MIGRATION] Recommend: Manually create Patient records or change user role');
      }

      console.log('[MIGRATION] ✅ Data sync complete');

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('[MIGRATION] ❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('[MIGRATION ROLLBACK] This migration only synced data - no rollback needed');
    console.log('[MIGRATION ROLLBACK] Original values were not stored');
    console.log('[MIGRATION ROLLBACK] Restore from backup if needed');
    return Promise.resolve();
  },
};
