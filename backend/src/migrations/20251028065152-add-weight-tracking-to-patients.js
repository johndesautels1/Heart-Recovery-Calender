'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('patients', 'startingWeight', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Weight at start of therapy',
    });

    await queryInterface.addColumn('patients', 'currentWeight', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Most recent weight measurement',
    });

    await queryInterface.addColumn('patients', 'targetWeight', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Goal weight for patient',
    });

    await queryInterface.addColumn('patients', 'weightUnit', {
      type: Sequelize.STRING(3),
      allowNull: true,
      defaultValue: 'lbs',
      comment: 'kg or lbs',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('patients', 'startingWeight');
    await queryInterface.removeColumn('patients', 'currentWeight');
    await queryInterface.removeColumn('patients', 'targetWeight');
    await queryInterface.removeColumn('patients', 'weightUnit');
  }
};
