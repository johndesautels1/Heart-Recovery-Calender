'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('medication_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      medicationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'medications',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      scheduledTime: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'When the medication was scheduled to be taken',
      },
      takenTime: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the medication was actually taken',
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'scheduled',
        comment: 'scheduled, taken, missed, skipped',
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

    // Add index for faster queries
    await queryInterface.addIndex('medication_logs', ['userId', 'scheduledTime']);
    await queryInterface.addIndex('medication_logs', ['medicationId', 'scheduledTime']);
    await queryInterface.addIndex('medication_logs', ['status']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('medication_logs');
  }
};
