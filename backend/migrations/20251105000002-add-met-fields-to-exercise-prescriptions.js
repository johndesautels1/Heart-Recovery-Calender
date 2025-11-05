'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add target MET fields to exercise_prescriptions table
    await queryInterface.addColumn('exercise_prescriptions', 'targetMETMin', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Target minimum MET level for this exercise prescription',
    });

    await queryInterface.addColumn('exercise_prescriptions', 'targetMETMax', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Target maximum MET level for this exercise prescription',
    });

    console.log('✅ Added target MET fields to exercise_prescriptions table');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove target MET fields from exercise_prescriptions table
    await queryInterface.removeColumn('exercise_prescriptions', 'targetMETMin');
    await queryInterface.removeColumn('exercise_prescriptions', 'targetMETMax');

    console.log('✅ Removed target MET fields from exercise_prescriptions table');
  }
};
