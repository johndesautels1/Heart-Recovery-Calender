module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('meal_entries', {
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
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      mealType: {
        type: Sequelize.ENUM('breakfast', 'lunch', 'dinner', 'snack'),
        allowNull: false
      },
      foodItems: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      calories: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      sodium: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Sodium in mg'
      },
      cholesterol: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Cholesterol in mg'
      },
      saturatedFat: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Saturated fat in grams'
      },
      totalFat: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Total fat in grams'
      },
      fiber: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Fiber in grams'
      },
      sugar: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Sugar in grams'
      },
      protein: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Protein in grams'
      },
      carbohydrates: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Carbohydrates in grams'
      },
      withinSpec: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Whether meal meets dietary specifications'
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

    await queryInterface.addIndex('meal_entries', ['userId']);
    await queryInterface.addIndex('meal_entries', ['timestamp']);
    await queryInterface.addIndex('meal_entries', ['mealType']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('meal_entries');
  }
};
