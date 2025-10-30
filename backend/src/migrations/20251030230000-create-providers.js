'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('providers', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
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
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Provider full name (e.g., Dr. John Smith)',
      },
      specialty: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Medical specialty (e.g., Cardiologist, Primary Care)',
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Contact phone number',
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Contact email address',
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Full office address',
      },
      nextAppointment: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Next scheduled appointment date',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional notes about the provider',
      },
      isPrimary: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Is this the primary care provider',
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

    // Add index for fast lookups by user
    await queryInterface.addIndex('providers', ['userId'], {
      name: 'providers_user_id_idx',
    });

    // Add index for next appointments
    await queryInterface.addIndex('providers', ['nextAppointment'], {
      name: 'providers_next_appointment_idx',
    });

    console.log('✅ Created providers table');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('providers');
    console.log('↩️  Dropped providers table');
  }
};
