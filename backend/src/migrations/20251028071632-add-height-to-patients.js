'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('patients', 'height', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Height in inches or cm depending on heightUnit',
    });

    await queryInterface.addColumn('patients', 'heightUnit', {
      type: Sequelize.STRING(2),
      allowNull: true,
      defaultValue: 'in',
      comment: 'in for inches, cm for centimeters',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('patients', 'height');
    await queryInterface.removeColumn('patients', 'heightUnit');
  }
};
