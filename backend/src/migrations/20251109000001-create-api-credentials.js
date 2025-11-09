'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('api_credentials', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      platform: {
        type: Sequelize.ENUM(
          'polar',
          'samsung_health',
          'strava',
          'fitbit',
          'garmin',
          'googlefit',
          'apple_health',
          'smartpeak',
          'whoop',
          'oura',
          'withings',
          'amazfit',
          'coros'
        ),
        allowNull: false,
        unique: true,
        comment: 'The platform/service this credential is for',
      },
      clientId: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'OAuth client ID (encrypted with AES-256)',
      },
      clientSecret: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'OAuth client secret (encrypted with AES-256)',
      },
      redirectUri: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'OAuth redirect URI',
      },
      apiKey: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'General API key for platforms that use it (encrypted)',
      },
      webhookSecret: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Webhook verification secret (encrypted)',
      },
      additionalConfig: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'JSON string for platform-specific configuration (encrypted)',
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this credential is currently active and should be used',
      },
      lastTested: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last time the credential was tested for validity',
      },
      testStatus: {
        type: Sequelize.ENUM('success', 'failed', 'not_tested'),
        allowNull: false,
        defaultValue: 'not_tested',
        comment: 'Result of last credential test',
      },
      testError: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message from last failed test',
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Admin user who created this credential',
      },
      updatedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Admin user who last updated this credential',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // Create index for faster platform lookups
    await queryInterface.addIndex('api_credentials', ['platform'], {
      name: 'idx_api_credentials_platform',
      unique: true,
    });

    // Create index for active credentials
    await queryInterface.addIndex('api_credentials', ['isActive'], {
      name: 'idx_api_credentials_active',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('api_credentials');
  },
};
