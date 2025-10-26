'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('exercises', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      category: {
        type: Sequelize.ENUM('upper_body', 'lower_body', 'cardio', 'flexibility', 'balance', 'breathing', 'core'),
        allowNull: false,
      },
      difficulty: {
        type: Sequelize.ENUM('beginner', 'intermediate', 'advanced'),
        allowNull: false,
      },
      equipmentNeeded: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      videoUrl: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      imageUrl: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      minPostOpWeek: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Minimum post-operative week recommended for this exercise',
      },
      maxPostOpWeek: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Maximum post-operative week recommended for this exercise (null = no limit)',
      },
      contraindications: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Medical contraindications or warnings',
      },
      instructions: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Step-by-step instructions',
      },
      defaultSets: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      defaultReps: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      defaultDuration: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Default duration in minutes',
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Therapist user ID who created this exercise',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Add indexes
    await queryInterface.addIndex('exercises', ['category']);
    await queryInterface.addIndex('exercises', ['difficulty']);
    await queryInterface.addIndex('exercises', ['isActive']);
    await queryInterface.addIndex('exercises', ['minPostOpWeek', 'maxPostOpWeek']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('exercises');
  }
};
