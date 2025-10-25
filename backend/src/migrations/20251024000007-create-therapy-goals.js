module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('therapy_goals', {
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
      therapistId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      goalTitle: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      goalDescription: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      goalType: {
        type: Sequelize.ENUM('exercise', 'activity', 'mobility', 'medication_adherence', 'diet', 'vitals', 'other'),
        allowNull: false,
        defaultValue: 'other'
      },
      targetValue: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      currentValue: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      unit: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      targetDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('not_started', 'in_progress', 'achieved', 'modified', 'abandoned'),
        allowNull: false,
        defaultValue: 'not_started'
      },
      progressPercentage: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      milestones: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      achievedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high'),
        allowNull: false,
        defaultValue: 'medium'
      },
      recurring: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      frequency: {
        type: Sequelize.STRING(100),
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

    // Add indexes
    await queryInterface.addIndex('therapy_goals', ['userId']);
    await queryInterface.addIndex('therapy_goals', ['therapistId']);
    await queryInterface.addIndex('therapy_goals', ['status']);
    await queryInterface.addIndex('therapy_goals', ['goalType']);
    await queryInterface.addIndex('therapy_goals', ['targetDate']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('therapy_goals');
  }
};
