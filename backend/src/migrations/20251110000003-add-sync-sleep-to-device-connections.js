'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('device_connections');

    // Add syncSleep boolean column
    if (!tableDescription.syncSleep) {
      await queryInterface.addColumn('device_connections', 'syncSleep', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Sync sleep data from device',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('device_connections', 'syncSleep');
  },
};
