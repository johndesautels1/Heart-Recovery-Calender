'use strict';

/**
 * Migration: Add userId to exercise_logs and exercise_prescriptions
 *
 * PROBLEM: ExerciseLog and ExercisePrescription use patientId (FK to patients table)
 *          while ALL other 24 tables use userId (FK to users table).
 *          This creates incompatibility and breaks referential integrity.
 *
 * SOLUTION: Add userId column to both tables
 *           - Backfill userId from patients.userId (via patientId lookup)
 *           - Keep patientId for backwards compatibility (deprecate later)
 *           - Add foreign key constraint for userId
 *
 * SAFETY: Fully reversible with down() migration
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('[MIGRATION] Adding userId to exercise_logs...');

      // 1. Add userId column to exercise_logs (nullable initially)
      await queryInterface.addColumn(
        'exercise_logs',
        'userId',
        {
          type: Sequelize.INTEGER,
          allowNull: true, // Temporarily nullable for backfill
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'User ID (patient) who completed this exercise. Replaces patientId for consistency with other tables.',
        },
        { transaction }
      );

      console.log('[MIGRATION] Backfilling userId in exercise_logs from patients table...');

      // 2. Backfill userId from patients.userId
      await queryInterface.sequelize.query(
        `UPDATE exercise_logs
         SET "userId" = p."userId"
         FROM patients p
         WHERE exercise_logs."patientId" = p.id
           AND p."userId" IS NOT NULL`,
        { transaction }
      );

      // 3. Check for any exercise_logs that couldn't be backfilled
      const [orphanedLogs] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count
         FROM exercise_logs
         WHERE "userId" IS NULL`,
        { transaction }
      );

      if (orphanedLogs[0].count > 0) {
        console.warn(`[MIGRATION] WARNING: ${orphanedLogs[0].count} exercise_logs have NULL userId (orphaned Patient records)`);
        console.warn('[MIGRATION] These records will remain with NULL userId until Patient.userId is fixed');
      }

      console.log('[MIGRATION] Adding userId to exercise_prescriptions...');

      // 4. Add userId column to exercise_prescriptions
      await queryInterface.addColumn(
        'exercise_prescriptions',
        'userId',
        {
          type: Sequelize.INTEGER,
          allowNull: true, // Temporarily nullable for backfill
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'User ID (patient) who this prescription is for. Replaces patientId for consistency.',
        },
        { transaction }
      );

      console.log('[MIGRATION] Backfilling userId in exercise_prescriptions from patients table...');

      // 5. Backfill userId from patients.userId
      await queryInterface.sequelize.query(
        `UPDATE exercise_prescriptions
         SET "userId" = p."userId"
         FROM patients p
         WHERE exercise_prescriptions."patientId" = p.id
           AND p."userId" IS NOT NULL`,
        { transaction }
      );

      // 6. Check for any exercise_prescriptions that couldn't be backfilled
      const [orphanedPrescriptions] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count
         FROM exercise_prescriptions
         WHERE "userId" IS NULL`,
        { transaction }
      );

      if (orphanedPrescriptions[0].count > 0) {
        console.warn(`[MIGRATION] WARNING: ${orphanedPrescriptions[0].count} exercise_prescriptions have NULL userId`);
      }

      console.log('[MIGRATION] Creating indexes for userId columns...');

      // 7. Add index on exercise_logs.userId for query performance
      await queryInterface.addIndex(
        'exercise_logs',
        ['userId'],
        {
          name: 'idx_exercise_logs_user_id',
          transaction,
        }
      );

      // 8. Add index on exercise_prescriptions.userId
      await queryInterface.addIndex(
        'exercise_prescriptions',
        ['userId'],
        {
          name: 'idx_exercise_prescriptions_user_id',
          transaction,
        }
      );

      // 9. Add composite index for common queries (userId + completedAt)
      await queryInterface.addIndex(
        'exercise_logs',
        ['userId', 'completedAt'],
        {
          name: 'idx_exercise_logs_user_completed',
          transaction,
        }
      );

      console.log('[MIGRATION] ✅ Migration complete - userId added to exercise tables');
      console.log('[MIGRATION] NOTE: patientId columns remain for backwards compatibility');
      console.log('[MIGRATION] NEXT STEPS: Update controllers to use userId instead of patientId');

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
      console.log('[MIGRATION ROLLBACK] Removing userId from exercise tables...');

      // Remove indexes
      await queryInterface.removeIndex('exercise_logs', 'idx_exercise_logs_user_completed', { transaction });
      await queryInterface.removeIndex('exercise_logs', 'idx_exercise_logs_user_id', { transaction });
      await queryInterface.removeIndex('exercise_prescriptions', 'idx_exercise_prescriptions_user_id', { transaction });

      // Remove columns
      await queryInterface.removeColumn('exercise_logs', 'userId', { transaction });
      await queryInterface.removeColumn('exercise_prescriptions', 'userId', { transaction });

      console.log('[MIGRATION ROLLBACK] ✅ Rollback complete - userId columns removed');

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('[MIGRATION ROLLBACK] ❌ Rollback failed:', error);
      throw error;
    }
  },
};
