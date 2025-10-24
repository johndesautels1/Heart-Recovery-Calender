module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('calendars', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('medications', 'appointments', 'exercise', 'vitals', 'diet', 'symptoms', 'general'),
        allowNull: false,
        defaultValue: 'general'
      },
      color: {
        type: Sequelize.STRING(7),
        allowNull: false,
        defaultValue: '#3f51b5'
      },
      isSharedWithDoctor: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      description: {
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

    await queryInterface.addIndex('calendars', ['userId']);
    await queryInterface.addIndex('calendars', ['type']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('calendars');
  }
};
