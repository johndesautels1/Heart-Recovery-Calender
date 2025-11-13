'use strict';

/**
 * Migration: Consolidate Patient Model into User Model
 *
 * This migration consolidates the Patient entity into the User entity by:
 * 1. Adding therapistId FK column to users (for patient-therapist assignment)
 * 2. Adding medicalData JSONB column to users (for patient-specific medical data)
 * 3. Creating performance indexes on role, therapistId, and surgeryDate
 *
 * This migration is part of the Entity Consolidation Strategy (ADR_001).
 * See: ADR_001_ENTITY_CONSOLIDATION.md for full context.
 *
 * IMPORTANT: This migration assumes you are willing to wipe existing patient data.
 * The Patient model will be removed in a subsequent migration after all controllers
 * and frontend code have been updated to use the User model exclusively.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Starting entity consolidation migration...');

    // 1. Add therapistId FK column to users table
    // This allows patient users to be assigned to a therapist user
    await queryInterface.addColumn('users', 'therapistId', {
      type: Sequelize.INTEGER,
      allowNull: true, // Null for non-patient users and unassigned patients
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL', // If therapist is deleted, set to null rather than cascade delete
      comment: 'FK to User with role=therapist (for patient users only)',
    });

    console.log('✓ Added therapistId column to users');

    // 2. Add medicalData JSONB column to users table
    // This will store all patient-specific medical data in a flexible JSON structure
    await queryInterface.addColumn('users', 'medicalData', {
      type: Sequelize.JSONB,
      allowNull: true, // Null for non-patient users
      defaultValue: null,
      comment: 'Patient-specific medical data (demographics, contacts, measurements, history, etc.)',
    });

    console.log('✓ Added medicalData JSONB column to users');

    // 3. Create performance indexes

    // Index on role for filtering by user type (patient/therapist/admin)
    await queryInterface.addIndex('users', ['role'], {
      name: 'idx_users_role',
      where: {
        role: { [Sequelize.Op.ne]: null }
      }
    });

    console.log('✓ Created index on users.role');

    // Index on therapistId for therapist queries (e.g., "get all my patients")
    await queryInterface.addIndex('users', ['therapistId'], {
      name: 'idx_users_therapist_id',
      where: {
        therapistId: { [Sequelize.Op.ne]: null }
      }
    });

    console.log('✓ Created index on users.therapistId');

    // Index on surgeryDate for date range queries
    await queryInterface.addIndex('users', ['surgeryDate'], {
      name: 'idx_users_surgery_date',
      where: {
        surgeryDate: { [Sequelize.Op.ne]: null }
      }
    });

    console.log('✓ Created index on users.surgeryDate');

    // Composite index for therapist + role queries
    await queryInterface.addIndex('users', ['therapistId', 'role'], {
      name: 'idx_users_therapist_role',
      where: {
        therapistId: { [Sequelize.Op.ne]: null }
      }
    });

    console.log('✓ Created composite index on users.therapistId + role');

    console.log('Entity consolidation migration complete!');
  },

  async down(queryInterface, Sequelize) {
    console.log('Rolling back entity consolidation migration...');

    // Drop indexes (in reverse order)
    await queryInterface.removeIndex('users', 'idx_users_therapist_role');
    console.log('✓ Dropped index idx_users_therapist_role');

    await queryInterface.removeIndex('users', 'idx_users_surgery_date');
    console.log('✓ Dropped index idx_users_surgery_date');

    await queryInterface.removeIndex('users', 'idx_users_therapist_id');
    console.log('✓ Dropped index idx_users_therapist_id');

    await queryInterface.removeIndex('users', 'idx_users_role');
    console.log('✓ Dropped index idx_users_role');

    // Remove columns (in reverse order)
    await queryInterface.removeColumn('users', 'medicalData');
    console.log('✓ Removed medicalData column from users');

    await queryInterface.removeColumn('users', 'therapistId');
    console.log('✓ Removed therapistId column from users');

    console.log('Rollback complete!');
  }
};
