'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('sleep_logs');

    // Add dreamQuality enum column
    if (!tableDescription.dreamQuality) {
      await queryInterface.addColumn('sleep_logs', 'dreamQuality', {
        type: Sequelize.ENUM('nightmare', 'cannot_remember', 'sporadic', 'vivid_positive'),
        allowNull: true,
      });
    }

    // Add dreamNotes text column
    if (!tableDescription.dreamNotes) {
      await queryInterface.addColumn('sleep_logs', 'dreamNotes', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    // Add sleepScore integer column
    if (!tableDescription.sleepScore) {
      await queryInterface.addColumn('sleep_logs', 'sleepScore', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    // Add isNap boolean column
    if (!tableDescription.isNap) {
      await queryInterface.addColumn('sleep_logs', 'isNap', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      });
    }

    // Add napDuration decimal column
    if (!tableDescription.napDuration) {
      await queryInterface.addColumn('sleep_logs', 'napDuration', {
        type: Sequelize.DECIMAL(4, 2),
        allowNull: true,
      });
    }

    // Add postSurgeryDay integer column
    if (!tableDescription.postSurgeryDay) {
      await queryInterface.addColumn('sleep_logs', 'postSurgeryDay', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('sleep_logs', 'dreamQuality');
    await queryInterface.removeColumn('sleep_logs', 'dreamNotes');
    await queryInterface.removeColumn('sleep_logs', 'sleepScore');
    await queryInterface.removeColumn('sleep_logs', 'isNap');
    await queryInterface.removeColumn('sleep_logs', 'napDuration');
    await queryInterface.removeColumn('sleep_logs', 'postSurgeryDay');
  },
};
