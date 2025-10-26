'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('vitals_samples', 'hydrationStatus', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Hydration status percentage (0-100)',
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('vitals_samples', 'hydrationStatus');
  }
};
