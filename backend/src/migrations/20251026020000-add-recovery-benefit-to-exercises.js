'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('exercises', 'recoveryBenefit', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'How this exercise benefits cardiac recovery',
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('exercises', 'recoveryBenefit');
  }
};
