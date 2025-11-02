/**
 * Migration: Add Preferences and Backup Email to Users
 *
 * Adds the following fields to users table:
 * - backupNotificationEmail: Secondary email for export notifications
 * - preferences: JSONB field for user preferences (reminder defaults, time format, export format)
 *
 * Related Tasks: SET-002, SET-006, I18N-002
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add backupNotificationEmail column
    await queryInterface.addColumn('users', 'backupNotificationEmail', {
      type: Sequelize.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true
      },
      comment: 'Secondary email for backup and export notifications'
    });

    // 2. Add preferences JSONB column with comprehensive defaults
    await queryInterface.addColumn('users', 'preferences', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {
        reminderDefaults: {
          medication: 30,      // 30 minutes before
          exercise: 60,        // 1 hour before
          appointment: 1440,   // 24 hours before (1 day)
          meal: 15,            // 15 minutes before
          vitals: 30,          // 30 minutes before
          hydration: 0,        // At time of event
          mood: 0,             // At time of event
          therapy: 120,        // 2 hours before
          education: 60        // 1 hour before
        },
        timeFormat: '12h',     // 12-hour or 24-hour clock
        exportFormat: 'ics'    // Default export format (ics, json, csv)
      },
      comment: 'User preferences including per-category reminder defaults (SET-002), time format (I18N-002), and export format (SET-005)'
    });

    // Add index for faster lookups on backup email
    await queryInterface.addIndex('users', ['backupNotificationEmail'], {
      name: 'users_backupNotificationEmail_idx'
    });

    console.log('✅ Migration complete: Added preferences and backupNotificationEmail to users table');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove index first
    await queryInterface.removeIndex('users', 'users_backupNotificationEmail_idx');

    // Remove columns
    await queryInterface.removeColumn('users', 'preferences');
    await queryInterface.removeColumn('users', 'backupNotificationEmail');

    console.log('⏪ Rollback complete: Removed preferences fields from users');
  }
};
