'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('device_sync_logs', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      deviceConnectionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'device_connections',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      syncType: {
        type: Sequelize.ENUM('manual', 'webhook', 'scheduled', 'realtime'),
        allowNull: false,
        comment: 'How the sync was triggered',
      },
      dataType: {
        type: Sequelize.ENUM('exercise', 'heart_rate', 'steps', 'calories', 'vitals', 'all'),
        allowNull: false,
        comment: 'Type of data being synced',
      },
      status: {
        type: Sequelize.ENUM('pending', 'success', 'error', 'partial'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Sync operation status',
      },
      startedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'When the sync started',
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the sync completed',
      },
      recordsProcessed: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Total records attempted to sync',
      },
      recordsCreated: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'New records created',
      },
      recordsUpdated: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Existing records updated',
      },
      recordsSkipped: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Records skipped (duplicates, errors)',
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if sync failed',
      },
      errorDetails: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Detailed error information (stack trace, etc.)',
      },
      externalIds: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'JSON array of external IDs that were synced',
      },
      syncMetadata: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'JSON object with additional sync metadata',
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

    // Add indexes for fast lookups
    await queryInterface.addIndex('device_sync_logs', ['deviceConnectionId', 'startedAt'], {
      name: 'device_sync_history',
    });

    await queryInterface.addIndex('device_sync_logs', ['status'], {
      name: 'sync_status_idx',
    });

    console.log('✅ Created device_sync_logs table');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('device_sync_logs');
    console.log('↩️  Dropped device_sync_logs table');
  }
};
