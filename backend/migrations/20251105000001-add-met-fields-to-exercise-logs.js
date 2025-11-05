'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add MET tracking fields to exercise_logs table
    await queryInterface.addColumn('exercise_logs', 'actualMET', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Actual MET level achieved during exercise (calculated from heart rate or manually entered)',
    });

    await queryInterface.addColumn('exercise_logs', 'targetMETMin', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Minimum target MET level for this exercise session',
    });

    await queryInterface.addColumn('exercise_logs', 'targetMETMax', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Maximum target MET level for this exercise session',
    });

    console.log('✅ Added MET tracking fields to exercise_logs table');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove MET tracking fields from exercise_logs table
    await queryInterface.removeColumn('exercise_logs', 'actualMET');
    await queryInterface.removeColumn('exercise_logs', 'targetMETMin');
    await queryInterface.removeColumn('exercise_logs', 'targetMETMax');

    console.log('✅ Removed MET tracking fields from exercise_logs table');
  }
};
