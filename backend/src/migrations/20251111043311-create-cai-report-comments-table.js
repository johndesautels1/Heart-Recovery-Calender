'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cia_report_comments', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      reportId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'cia_reports',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'CIA report this comment belongs to',
      },
      providerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'providers',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'Provider (cardiac team member) who made this comment',
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'User account of provider making comment',
      },
      comment: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Provider feedback on the CIA report',
      },
      commentType: {
        type: Sequelize.ENUM('feedback', 'approval', 'concern', 'recommendation', 'question'),
        allowNull: false,
        defaultValue: 'feedback',
        comment: 'Type of comment for categorization',
      },
      isPrivate: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'If true, only visible to other providers, not patient',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes
    await queryInterface.addIndex('cia_report_comments', ['reportId'], {
      name: 'cia_report_comments_report_id_idx',
    });

    await queryInterface.addIndex('cia_report_comments', ['providerId'], {
      name: 'cia_report_comments_provider_id_idx',
    });

    await queryInterface.addIndex('cia_report_comments', ['userId'], {
      name: 'cia_report_comments_user_id_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('cia_report_comments');
  },
};
