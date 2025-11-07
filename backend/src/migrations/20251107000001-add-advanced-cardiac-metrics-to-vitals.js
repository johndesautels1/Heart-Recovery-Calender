'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add HRV (Heart Rate Variability) fields
    await queryInterface.addColumn('vitals_samples', 'sdnn', {
      type: Sequelize.FLOAT,
      allowNull: true,
      comment: 'SDNN - Standard Deviation of NN intervals in milliseconds (HRV metric)',
    });

    await queryInterface.addColumn('vitals_samples', 'rmssd', {
      type: Sequelize.FLOAT,
      allowNull: true,
      comment: 'RMSSD - Root Mean Square of Successive Differences in milliseconds (HRV metric)',
    });

    await queryInterface.addColumn('vitals_samples', 'pnn50', {
      type: Sequelize.FLOAT,
      allowNull: true,
      comment: 'pNN50 - Percentage of successive NN intervals differing by >50ms (HRV metric)',
    });

    // Add Exercise Capacity fields
    await queryInterface.addColumn('vitals_samples', 'vo2Max', {
      type: Sequelize.FLOAT,
      allowNull: true,
      comment: 'VO2 Max in mL/kg/min - Maximum oxygen uptake during exercise',
    });

    await queryInterface.addColumn('vitals_samples', 'sixMinWalk', {
      type: Sequelize.FLOAT,
      allowNull: true,
      comment: '6-Minute Walk Test distance in meters',
    });

    await queryInterface.addColumn('vitals_samples', 'hrRecovery', {
      type: Sequelize.FLOAT,
      allowNull: true,
      comment: 'Heart Rate Recovery in bpm/min - HR drop 1 minute after exercise',
    });

    // Add Cardiac Function fields
    await queryInterface.addColumn('vitals_samples', 'ejectionFraction', {
      type: Sequelize.FLOAT,
      allowNull: true,
      comment: 'Ejection Fraction percentage - Amount of blood pumped out per heartbeat',
    });

    await queryInterface.addColumn('vitals_samples', 'meanArterialPressure', {
      type: Sequelize.FLOAT,
      allowNull: true,
      comment: 'Mean Arterial Pressure in mmHg - Average arterial pressure during one cardiac cycle',
    });

    await queryInterface.addColumn('vitals_samples', 'pulsePressure', {
      type: Sequelize.FLOAT,
      allowNull: true,
      comment: 'Pulse Pressure in mmHg - Difference between systolic and diastolic BP',
    });

    await queryInterface.addColumn('vitals_samples', 'bpVariability', {
      type: Sequelize.FLOAT,
      allowNull: true,
      comment: 'Blood Pressure Variability - Standard deviation of BP readings',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove HRV fields
    await queryInterface.removeColumn('vitals_samples', 'sdnn');
    await queryInterface.removeColumn('vitals_samples', 'rmssd');
    await queryInterface.removeColumn('vitals_samples', 'pnn50');

    // Remove Exercise Capacity fields
    await queryInterface.removeColumn('vitals_samples', 'vo2Max');
    await queryInterface.removeColumn('vitals_samples', 'sixMinWalk');
    await queryInterface.removeColumn('vitals_samples', 'hrRecovery');

    // Remove Cardiac Function fields
    await queryInterface.removeColumn('vitals_samples', 'ejectionFraction');
    await queryInterface.removeColumn('vitals_samples', 'meanArterialPressure');
    await queryInterface.removeColumn('vitals_samples', 'pulsePressure');
    await queryInterface.removeColumn('vitals_samples', 'bpVariability');
  }
};
