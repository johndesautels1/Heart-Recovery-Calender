'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('device_connections', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      deviceType: {
        type: Sequelize.ENUM('polar', 'samsung_health', 'health_connect', 'strava'),
        allowNull: false,
        comment: 'Type of device/service connected',
      },
      deviceId: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Unique device identifier from the provider',
      },
      deviceName: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'User-friendly device name (e.g., "Polar H10", "Galaxy Watch 8")',
      },
      accessToken: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'OAuth access token (encrypted)',
      },
      refreshToken: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'OAuth refresh token (encrypted)',
      },
      tokenExpiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the access token expires',
      },
      webhookSecret: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Secret key for webhook verification',
      },
      polarUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Polar Flow user ID',
      },
      samsungUserId: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Samsung Health user ID',
      },
      stravaAthleteId: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Strava athlete ID',
      },
      lastSyncedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp of last successful data sync',
      },
      syncStatus: {
        type: Sequelize.ENUM('active', 'error', 'disconnected'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Current sync status',
      },
      syncError: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Last sync error message',
      },
      autoSync: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Automatically sync data from device',
      },
      syncExercises: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Sync exercise/workout data',
      },
      syncHeartRate: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Sync heart rate data',
      },
      syncSteps: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Sync step count data',
      },
      syncCalories: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Sync calorie burn data',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Add unique constraint: one device type per user
    await queryInterface.addIndex('device_connections', ['userId', 'deviceType'], {
      unique: true,
      name: 'unique_user_device',
    });

    // Add index for fast lookups
    await queryInterface.addIndex('device_connections', ['userId']);
    await queryInterface.addIndex('device_connections', ['syncStatus']);

    console.log('✅ Created device_connections table');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('device_connections');
    console.log('↩️  Dropped device_connections table');
  }
};
