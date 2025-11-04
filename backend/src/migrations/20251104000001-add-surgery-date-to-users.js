'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add surgeryDate column to users table
    await queryInterface.addColumn('users', 'surgeryDate', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Day 0 - the date of heart surgery (for patient users)',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove surgeryDate column from users table
    await queryInterface.removeColumn('users', 'surgeryDate');
  }
};
