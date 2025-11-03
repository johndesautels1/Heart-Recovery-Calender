module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('therapy_goals', 'reminder_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('therapy_goals', 'reminder_frequency', {
      type: Sequelize.ENUM('daily', 'weekly', 'biweekly', 'monthly'),
      allowNull: true,
    });

    await queryInterface.addColumn('therapy_goals', 'last_reminded', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('therapy_goals', 'reminder_enabled');
    await queryInterface.removeColumn('therapy_goals', 'reminder_frequency');
    await queryInterface.removeColumn('therapy_goals', 'last_reminded');
  },
};
