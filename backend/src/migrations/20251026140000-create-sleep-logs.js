'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sleep_logs', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
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
        field: 'userId',
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Date of the sleep (the day you woke up)',
      },
      hoursSlept: {
        type: Sequelize.DECIMAL(4, 2),
        allowNull: false,
        comment: 'Total hours of sleep',
        field: 'hoursSlept',
      },
      sleepQuality: {
        type: Sequelize.ENUM('poor', 'fair', 'good', 'excellent'),
        allowNull: true,
        field: 'sleepQuality',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      bedTime: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Time went to bed',
        field: 'bedTime',
      },
      wakeTime: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Time woke up',
        field: 'wakeTime',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'createdAt',
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'updatedAt',
      },
    });

    await queryInterface.addIndex('sleep_logs', ['userId', 'date'], {
      unique: true,
      name: 'sleep_logs_user_date_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('sleep_logs');
  },
};
