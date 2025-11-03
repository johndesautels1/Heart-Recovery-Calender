module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create habits table
    await queryInterface.createTable('habits', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      frequency: {
        type: Sequelize.ENUM('daily', 'weekly', 'custom'),
        allowNull: false,
        defaultValue: 'daily',
      },
      target_days_per_week: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      streak_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      last_completed: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      category: {
        type: Sequelize.ENUM('exercise', 'medication', 'nutrition', 'sleep', 'stress_management', 'other'),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Create habit_logs table
    await queryInterface.createTable('habit_logs', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      habit_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'habits',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes for habits
    await queryInterface.addIndex('habits', ['user_id']);
    await queryInterface.addIndex('habits', ['is_active']);
    await queryInterface.addIndex('habits', ['category']);

    // Add indexes for habit_logs
    await queryInterface.addIndex('habit_logs', ['habit_id']);
    await queryInterface.addIndex('habit_logs', ['user_id']);
    await queryInterface.addIndex('habit_logs', ['completed_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('habit_logs');
    await queryInterface.dropTable('habits');
  },
};
