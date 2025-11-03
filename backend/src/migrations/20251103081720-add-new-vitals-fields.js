'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new fields to vitals_samples table
    await queryInterface.addColumn('vitals_samples', 'edema', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('vitals_samples', 'edemaSeverity', {
      type: Sequelize.ENUM('none', 'mild', 'moderate', 'severe'),
      allowNull: true,
    });

    await queryInterface.addColumn('vitals_samples', 'chestPain', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    });

    await queryInterface.addColumn('vitals_samples', 'chestPainSeverity', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn('vitals_samples', 'chestPainType', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('vitals_samples', 'dyspnea', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn('vitals_samples', 'dyspneaTriggers', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('vitals_samples', 'dizziness', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    });

    await queryInterface.addColumn('vitals_samples', 'dizzinessSeverity', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn('vitals_samples', 'dizzinessFrequency', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('vitals_samples', 'energyLevel', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn('vitals_samples', 'stressLevel', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn('vitals_samples', 'anxietyLevel', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    // Add new field to meal_entries table
    await queryInterface.addColumn('meal_entries', 'satisfactionRating', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    // Add new fields to sleep_logs table
    await queryInterface.addColumn('sleep_logs', 'isNap', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    });

    await queryInterface.addColumn('sleep_logs', 'napDuration', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn('sleep_logs', 'dreamNotes', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('sleep_logs', 'sleepScore', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove vitals_samples columns
    await queryInterface.removeColumn('vitals_samples', 'edema');
    await queryInterface.removeColumn('vitals_samples', 'edemaSeverity');
    await queryInterface.removeColumn('vitals_samples', 'chestPain');
    await queryInterface.removeColumn('vitals_samples', 'chestPainSeverity');
    await queryInterface.removeColumn('vitals_samples', 'chestPainType');
    await queryInterface.removeColumn('vitals_samples', 'dyspnea');
    await queryInterface.removeColumn('vitals_samples', 'dyspneaTriggers');
    await queryInterface.removeColumn('vitals_samples', 'dizziness');
    await queryInterface.removeColumn('vitals_samples', 'dizzinessSeverity');
    await queryInterface.removeColumn('vitals_samples', 'dizzinessFrequency');
    await queryInterface.removeColumn('vitals_samples', 'energyLevel');
    await queryInterface.removeColumn('vitals_samples', 'stressLevel');
    await queryInterface.removeColumn('vitals_samples', 'anxietyLevel');

    // Remove meal_entries column
    await queryInterface.removeColumn('meal_entries', 'satisfactionRating');

    // Remove sleep_logs columns
    await queryInterface.removeColumn('sleep_logs', 'isNap');
    await queryInterface.removeColumn('sleep_logs', 'napDuration');
    await queryInterface.removeColumn('sleep_logs', 'dreamNotes');
    await queryInterface.removeColumn('sleep_logs', 'sleepScore');
  }
};
