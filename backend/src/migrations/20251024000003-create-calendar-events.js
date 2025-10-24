module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('calendar_events', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      calendarId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'calendars',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      startTime: {
        type: Sequelize.DATE,
        allowNull: false
      },
      endTime: {
        type: Sequelize.DATE,
        allowNull: false
      },
      isAllDay: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      location: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      recurrenceRule: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      reminderMinutes: {
        type: Sequelize.INTEGER,
        defaultValue: 30
      },
      status: {
        type: Sequelize.ENUM('scheduled', 'completed', 'cancelled', 'missed'),
        defaultValue: 'scheduled'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('calendar_events', ['calendarId']);
    await queryInterface.addIndex('calendar_events', ['startTime']);
    await queryInterface.addIndex('calendar_events', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('calendar_events');
  }
};
