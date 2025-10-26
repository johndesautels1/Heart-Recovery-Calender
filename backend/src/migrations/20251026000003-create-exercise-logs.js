'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('exercise_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      prescriptionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'exercise_prescriptions',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
      completedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      actualSets: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      actualReps: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      actualDuration: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Actual duration in minutes',
      },
      difficultyRating: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: '1-10 scale, 1 = very easy, 10 = very hard',
      },
      painLevel: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: '1-10 scale, 1 = no pain, 10 = severe pain',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
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
    await queryInterface.addIndex('exercise_logs', ['prescriptionId']);
    await queryInterface.addIndex('exercise_logs', ['patientId']);
    await queryInterface.addIndex('exercise_logs', ['completedAt']);
    await queryInterface.addIndex('exercise_logs', ['patientId', 'completedAt']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('exercise_logs');
  }
};
