module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('goal_journal_entries', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      goal_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'therapy_goals',
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
      entry_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      reflection_text: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      progress_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      mood: {
        type: Sequelize.ENUM('excellent', 'good', 'neutral', 'challenging', 'difficult'),
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

    // Add indexes
    await queryInterface.addIndex('goal_journal_entries', ['goal_id']);
    await queryInterface.addIndex('goal_journal_entries', ['user_id']);
    await queryInterface.addIndex('goal_journal_entries', ['entry_date']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('goal_journal_entries');
  },
};
