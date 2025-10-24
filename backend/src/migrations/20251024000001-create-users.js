module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      phoneNumber: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      emergencyContact: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      emergencyPhone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      doctorName: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      doctorPhone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      timezone: {
        type: Sequelize.STRING(50),
        defaultValue: 'America/New_York'
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

    await queryInterface.addIndex('users', ['email']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('users');
  }
};
