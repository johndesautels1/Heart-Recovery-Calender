'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('vitals_samples', 'peakFlow', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Peak expiratory flow rate in L/min'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('vitals_samples', 'peakFlow');
  }
};
