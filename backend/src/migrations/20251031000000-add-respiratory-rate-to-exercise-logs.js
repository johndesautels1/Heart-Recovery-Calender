'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add respiratory rate during exercise
    await queryInterface.addColumn('exercise_logs', 'duringRespiratoryRate', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Respiratory rate during exercise (breaths per minute)',
    });

    console.log('✅ Added duringRespiratoryRate to exercise_logs');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('exercise_logs', 'duringRespiratoryRate');

    console.log('↩️  Removed duringRespiratoryRate from exercise_logs');
  }
};
