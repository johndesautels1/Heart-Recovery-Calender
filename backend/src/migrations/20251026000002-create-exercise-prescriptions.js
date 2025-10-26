'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('exercise_prescriptions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      patientId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'patients',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      exerciseId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'exercises',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      prescribedBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Therapist user ID who prescribed this exercise',
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      sets: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      reps: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Duration in minutes',
      },
      frequency: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'e.g., "daily", "3x/week", "Mon/Wed/Fri"',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('active', 'completed', 'discontinued'),
        defaultValue: 'active',
        allowNull: false,
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
    await queryInterface.addIndex('exercise_prescriptions', ['patientId']);
    await queryInterface.addIndex('exercise_prescriptions', ['exerciseId']);
    await queryInterface.addIndex('exercise_prescriptions', ['prescribedBy']);
    await queryInterface.addIndex('exercise_prescriptions', ['patientId', 'status']);
    await queryInterface.addIndex('exercise_prescriptions', ['startDate', 'endDate']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('exercise_prescriptions');
  }
};
