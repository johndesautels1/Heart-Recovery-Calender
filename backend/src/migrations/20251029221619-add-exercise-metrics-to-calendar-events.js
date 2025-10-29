'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🏋️ Adding exercise metrics columns to calendar_events table...');

    try {
      // Add exercise-specific metric columns
      await queryInterface.addColumn('calendar_events', 'exerciseIntensity', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Exercise intensity level (1-10 scale)',
      });

      await queryInterface.addColumn('calendar_events', 'distanceMiles', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Distance covered in miles',
      });

      await queryInterface.addColumn('calendar_events', 'laps', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Number of laps completed',
      });

      await queryInterface.addColumn('calendar_events', 'steps', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Number of steps taken',
      });

      await queryInterface.addColumn('calendar_events', 'elevationFeet', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Elevation gain in feet',
      });

      await queryInterface.addColumn('calendar_events', 'durationMinutes', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Actual exercise duration in minutes',
      });

      await queryInterface.addColumn('calendar_events', 'heartRateAvg', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Average heart rate during exercise',
      });

      await queryInterface.addColumn('calendar_events', 'heartRateMax', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Maximum heart rate during exercise',
      });

      await queryInterface.addColumn('calendar_events', 'caloriesBurned', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Estimated calories burned',
      });

      await queryInterface.addColumn('calendar_events', 'exerciseNotes', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional notes about the exercise session',
      });

      console.log('✅ Successfully added exercise metric columns');

    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('⚠️ Rolling back exercise metrics columns...');

    try {
      await queryInterface.removeColumn('calendar_events', 'exerciseIntensity');
      await queryInterface.removeColumn('calendar_events', 'distanceMiles');
      await queryInterface.removeColumn('calendar_events', 'laps');
      await queryInterface.removeColumn('calendar_events', 'steps');
      await queryInterface.removeColumn('calendar_events', 'elevationFeet');
      await queryInterface.removeColumn('calendar_events', 'durationMinutes');
      await queryInterface.removeColumn('calendar_events', 'heartRateAvg');
      await queryInterface.removeColumn('calendar_events', 'heartRateMax');
      await queryInterface.removeColumn('calendar_events', 'caloriesBurned');
      await queryInterface.removeColumn('calendar_events', 'exerciseNotes');

      console.log('✅ Rollback complete');

    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
};
