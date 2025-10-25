module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('alerts', {
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
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      alertType: {
        type: Sequelize.ENUM('medication_missed', 'activity_issue', 'vital_concern', 'goal_overdue', 'routine_skipped', 'other'),
        allowNull: false
      },
      severity: {
        type: Sequelize.ENUM('info', 'warning', 'critical'),
        allowNull: false,
        defaultValue: 'info'
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      relatedEntityType: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      relatedEntityId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      actionTaken: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      resolved: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      resolvedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      resolvedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      notificationSent: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      notificationMethods: {
        type: Sequelize.ARRAY(Sequelize.STRING),
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
    await queryInterface.addIndex('alerts', ['userId']);
    await queryInterface.addIndex('alerts', ['therapistId']);
    await queryInterface.addIndex('alerts', ['alertType']);
    await queryInterface.addIndex('alerts', ['severity']);
    await queryInterface.addIndex('alerts', ['resolved']);
    await queryInterface.addIndex('alerts', ['createdAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('alerts');
  }
};
