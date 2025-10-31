'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add device sync tracking columns to exercise_logs
    await queryInterface.addColumn('exercise_logs', 'dataSource', {
      type: Sequelize.ENUM('manual', 'polar', 'samsung_health', 'health_connect', 'strava'),
      allowNull: true,
      defaultValue: 'manual',
      comment: 'Source of the exercise data',
    });

    await queryInterface.addColumn('exercise_logs', 'externalId', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'External ID from device/service (e.g., Strava activity ID, Polar exercise ID)',
    });

    await queryInterface.addColumn('exercise_logs', 'deviceConnectionId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'device_connections',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Reference to the device connection used for syncing',
    });

    await queryInterface.addColumn('exercise_logs', 'syncedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp when data was synced from device',
    });

    console.log('✅ Added device sync columns to exercise_logs');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('exercise_logs', 'syncedAt');
    await queryInterface.removeColumn('exercise_logs', 'deviceConnectionId');
    await queryInterface.removeColumn('exercise_logs', 'externalId');
    await queryInterface.removeColumn('exercise_logs', 'dataSource');

    // Drop the ENUM type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_exercise_logs_dataSource";');

    console.log('↩️  Removed device sync columns from exercise_logs');
  }
};
