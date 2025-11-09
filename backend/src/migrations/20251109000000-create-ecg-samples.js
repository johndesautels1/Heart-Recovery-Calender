'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('📊 Creating ecg_samples table for real-time ECG waveform data...');

    await queryInterface.createTable('ecg_samples', {
      id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Primary key for ECG sample',
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
        comment: 'Foreign key to users table',
      },
      vitalsSampleId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'vitals_samples',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Optional foreign key to vitals_samples for correlation with broader vitals data',
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Exact timestamp of this ECG sample',
      },
      sampleIndex: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Sequential index within recording session (0, 1, 2, ...) for ordering',
      },
      voltage: {
        type: Sequelize.FLOAT,
        allowNull: false,
        comment: 'ECG voltage in millivolts (mV) - typically ranges from -3.0 to +3.0 mV',
      },
      samplingRate: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 130,
        comment: 'Sampling rate in Hz (130 for Polar H10)',
      },
      leadType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'Lead I',
        comment: 'ECG lead type (e.g., "Lead I", "Lead II", "V1") - Polar H10 uses Lead I',
      },
      deviceId: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Device identifier (e.g., "polar_h10_bluetooth", "Polar H10 9D3A412E")',
      },
      sessionId: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Optional session ID (UUID) to group samples from the same recording session',
      },
      rPeak: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'True if this sample is an R-peak (QRS complex peak)',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    console.log('  📋 Creating indexes for performance...');

    // Index for querying ECG samples by user and time range
    await queryInterface.addIndex('ecg_samples', ['userId', 'timestamp'], {
      name: 'idx_ecg_samples_user_timestamp',
      comment: 'Index for querying ECG samples by user and time range',
    });

    // Index for querying all samples from a recording session
    await queryInterface.addIndex('ecg_samples', ['sessionId'], {
      name: 'idx_ecg_samples_session',
      comment: 'Index for querying all samples from a recording session',
    });

    // Index for linking ECG samples to vitals samples
    await queryInterface.addIndex('ecg_samples', ['vitalsSampleId'], {
      name: 'idx_ecg_samples_vitals',
      comment: 'Index for linking ECG samples to vitals samples',
    });

    // Index for quickly finding R-peaks
    await queryInterface.addIndex('ecg_samples', ['rPeak'], {
      name: 'idx_ecg_samples_rpeak',
      comment: 'Index for quickly finding R-peaks',
    });

    console.log('✅ ECG samples table created successfully with all indexes');
    console.log('🫀 Ready to store real-time ECG waveform data at 130 Hz from Polar H10');
  },

  async down(queryInterface, Sequelize) {
    console.log('↩️  Dropping ecg_samples table...');
    await queryInterface.dropTable('ecg_samples');
    console.log('✅ ECG samples table dropped');
  }
};
