'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('sleep_logs');

    // ============================================================================
    // 1. SLEEP STAGES DATA (from Samsung Galaxy Watch)
    // ============================================================================

    // JSON field for detailed sleep stages array
    if (!tableDescription.sleepStages) {
      await queryInterface.addColumn('sleep_logs', 'sleepStages', {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Array of sleep stages: [{stage: "awake"|"light"|"deep"|"rem", startTime: ISO, endTime: ISO}]',
      });
    }

    // Duration in minutes for each stage
    if (!tableDescription.awakeDuration) {
      await queryInterface.addColumn('sleep_logs', 'awakeDuration', {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
        comment: 'Minutes spent awake during sleep period',
      });
    }

    if (!tableDescription.lightSleepDuration) {
      await queryInterface.addColumn('sleep_logs', 'lightSleepDuration', {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
        comment: 'Minutes in light sleep stage',
      });
    }

    if (!tableDescription.deepSleepDuration) {
      await queryInterface.addColumn('sleep_logs', 'deepSleepDuration', {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
        comment: 'Minutes in deep sleep stage',
      });
    }

    if (!tableDescription.remSleepDuration) {
      await queryInterface.addColumn('sleep_logs', 'remSleepDuration', {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
        comment: 'Minutes in REM (Rapid Eye Movement) sleep stage',
      });
    }

    // Percentage distribution
    if (!tableDescription.awakePercent) {
      await queryInterface.addColumn('sleep_logs', 'awakePercent', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Percentage of time awake (0-100)',
      });
    }

    if (!tableDescription.lightSleepPercent) {
      await queryInterface.addColumn('sleep_logs', 'lightSleepPercent', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Percentage of time in light sleep (0-100)',
      });
    }

    if (!tableDescription.deepSleepPercent) {
      await queryInterface.addColumn('sleep_logs', 'deepSleepPercent', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Percentage of time in deep sleep (ideal: 15-25%)',
      });
    }

    if (!tableDescription.remSleepPercent) {
      await queryInterface.addColumn('sleep_logs', 'remSleepPercent', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Percentage of time in REM sleep (ideal: 20-25%)',
      });
    }

    // ============================================================================
    // 2. SLEEP EFFICIENCY METRICS
    // ============================================================================

    if (!tableDescription.timeInBed) {
      await queryInterface.addColumn('sleep_logs', 'timeInBed', {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
        comment: 'Total time in bed in minutes (bedTime to wakeTime)',
      });
    }

    if (!tableDescription.timeAsleep) {
      await queryInterface.addColumn('sleep_logs', 'timeAsleep', {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
        comment: 'Total time actually asleep in minutes (excluding awake time)',
      });
    }

    if (!tableDescription.sleepEfficiency) {
      await queryInterface.addColumn('sleep_logs', 'sleepEfficiency', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Sleep efficiency percentage: (timeAsleep / timeInBed) * 100. Target: >85%',
      });
    }

    if (!tableDescription.sleepOnsetLatency) {
      await queryInterface.addColumn('sleep_logs', 'sleepOnsetLatency', {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
        comment: 'Time to fall asleep in minutes (sleep onset latency)',
      });
    }

    if (!tableDescription.wakeAfterSleepOnset) {
      await queryInterface.addColumn('sleep_logs', 'wakeAfterSleepOnset', {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
        comment: 'Minutes awake after initially falling asleep (WASO)',
      });
    }

    // ============================================================================
    // 3. SLEEP ENVIRONMENT TRACKING
    // ============================================================================

    if (!tableDescription.roomTemperature) {
      await queryInterface.addColumn('sleep_logs', 'roomTemperature', {
        type: Sequelize.DECIMAL(4, 1),
        allowNull: true,
        comment: 'Room temperature in Fahrenheit (ideal: 60-67°F)',
      });
    }

    if (!tableDescription.noiseLevel) {
      await queryInterface.addColumn('sleep_logs', 'noiseLevel', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Noise level 1-10 scale (1=silent, 10=very loud)',
        validate: {
          min: 1,
          max: 10,
        },
      });
    }

    if (!tableDescription.lightLevel) {
      await queryInterface.addColumn('sleep_logs', 'lightLevel', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Light level 1-10 scale (1=pitch black, 10=very bright)',
        validate: {
          min: 1,
          max: 10,
        },
      });
    }

    if (!tableDescription.bedtimeRoutine) {
      await queryInterface.addColumn('sleep_logs', 'bedtimeRoutine', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Bedtime routine notes (e.g., meditation, reading, screen time)',
      });
    }

    if (!tableDescription.environmentNotes) {
      await queryInterface.addColumn('sleep_logs', 'environmentNotes', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional environment notes (sounds, smells, comfort)',
      });
    }

    // ============================================================================
    // 4. SLEEP CONSISTENCY METRICS (calculated from historical data)
    // ============================================================================

    if (!tableDescription.bedtimeDeviation) {
      await queryInterface.addColumn('sleep_logs', 'bedtimeDeviation', {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
        comment: 'Minutes deviation from average bedtime (for consistency tracking)',
      });
    }

    if (!tableDescription.waketimeDeviation) {
      await queryInterface.addColumn('sleep_logs', 'waketimeDeviation', {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
        comment: 'Minutes deviation from average wake time (for consistency tracking)',
      });
    }

    // ============================================================================
    // 5. ADDITIONAL QUALITY INDICATORS
    // ============================================================================

    if (!tableDescription.sleepInterruptions) {
      await queryInterface.addColumn('sleep_logs', 'sleepInterruptions', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Number of times woke up during the night',
      });
    }

    if (!tableDescription.restfulness) {
      await queryInterface.addColumn('sleep_logs', 'restfulness', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Subjective restfulness rating 1-10 (1=exhausted, 10=completely refreshed)',
        validate: {
          min: 1,
          max: 10,
        },
      });
    }

    if (!tableDescription.morningMood) {
      await queryInterface.addColumn('sleep_logs', 'morningMood', {
        type: Sequelize.ENUM('terrible', 'poor', 'okay', 'good', 'excellent'),
        allowNull: true,
        comment: 'Mood upon waking up',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove all added columns in reverse order
    await queryInterface.removeColumn('sleep_logs', 'morningMood');
    await queryInterface.removeColumn('sleep_logs', 'restfulness');
    await queryInterface.removeColumn('sleep_logs', 'sleepInterruptions');
    await queryInterface.removeColumn('sleep_logs', 'waketimeDeviation');
    await queryInterface.removeColumn('sleep_logs', 'bedtimeDeviation');
    await queryInterface.removeColumn('sleep_logs', 'environmentNotes');
    await queryInterface.removeColumn('sleep_logs', 'bedtimeRoutine');
    await queryInterface.removeColumn('sleep_logs', 'lightLevel');
    await queryInterface.removeColumn('sleep_logs', 'noiseLevel');
    await queryInterface.removeColumn('sleep_logs', 'roomTemperature');
    await queryInterface.removeColumn('sleep_logs', 'wakeAfterSleepOnset');
    await queryInterface.removeColumn('sleep_logs', 'sleepOnsetLatency');
    await queryInterface.removeColumn('sleep_logs', 'sleepEfficiency');
    await queryInterface.removeColumn('sleep_logs', 'timeAsleep');
    await queryInterface.removeColumn('sleep_logs', 'timeInBed');
    await queryInterface.removeColumn('sleep_logs', 'remSleepPercent');
    await queryInterface.removeColumn('sleep_logs', 'deepSleepPercent');
    await queryInterface.removeColumn('sleep_logs', 'lightSleepPercent');
    await queryInterface.removeColumn('sleep_logs', 'awakePercent');
    await queryInterface.removeColumn('sleep_logs', 'remSleepDuration');
    await queryInterface.removeColumn('sleep_logs', 'deepSleepDuration');
    await queryInterface.removeColumn('sleep_logs', 'lightSleepDuration');
    await queryInterface.removeColumn('sleep_logs', 'awakeDuration');
    await queryInterface.removeColumn('sleep_logs', 'sleepStages');
  },
};
