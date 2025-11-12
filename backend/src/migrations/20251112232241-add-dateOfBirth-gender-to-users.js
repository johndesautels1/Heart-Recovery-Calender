'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add dateOfBirth column to users table
    await queryInterface.addColumn('users', 'dateOfBirth', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'User date of birth for age calculations and risk assessments'
    });

    // Add gender column to users table
    await queryInterface.addColumn('users', 'gender', {
      type: Sequelize.ENUM('male', 'female', 'other'),
      allowNull: true,
      comment: 'User gender for medical risk calculations'
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove gender column
    await queryInterface.removeColumn('users', 'gender');

    // Remove dateOfBirth column
    await queryInterface.removeColumn('users', 'dateOfBirth');

    // Drop the ENUM type for gender
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_gender";');
  }
};
