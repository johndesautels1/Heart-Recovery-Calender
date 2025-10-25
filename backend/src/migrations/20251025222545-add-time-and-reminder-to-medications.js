'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('medications', 'timeOfDay', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'When to take the medication',
    });

    await queryInterface.addColumn('medications', 'reminderEnabled', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('medications', 'timeOfDay');
    await queryInterface.removeColumn('medications', 'reminderEnabled');
  }
};
