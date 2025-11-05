'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('medications', 'known_side_effects', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Structured side effect flags for Hawk Alert system (weightGain, weightLoss, edema, fluidRetention, etc.)',
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('medications', 'known_side_effects');
  }
};
