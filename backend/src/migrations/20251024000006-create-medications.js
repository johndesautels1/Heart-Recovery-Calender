module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('medications', {
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
      dosage: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'e.g., 10mg, 2 tablets'
      },
      frequency: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'e.g., Twice daily, Every 8 hours'
      },
      prescribedBy: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      purpose: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      sideEffects: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      instructions: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      refillDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      pharmacy: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      pharmacyPhone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      remainingRefills: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
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

    await queryInterface.addIndex('medications', ['userId']);
    await queryInterface.addIndex('medications', ['isActive']);
    await queryInterface.addIndex('medications', ['refillDate']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('medications');
  }
};
