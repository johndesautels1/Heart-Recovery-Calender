'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('calendar_events', 'performanceScore', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: '0 = no show, 4 = completed, 6 = met goals, 8 = exceeded goals',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('calendar_events', 'performanceScore');
  }
};
