'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cai_reports', {
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
        onDelete: 'CASCADE',
        comment: 'Patient/user who this report belongs to',
      },
      patientId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'patients',
          key: 'id',
        },
        onDelete: 'SET NULL',
        comment: 'Link to patient profile data',
      },
      generatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'When this report was generated',
      },
      surgeryDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Day 0 - copied from patient record for reference',
      },
      analysisStartDate: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Start of analysis period (usually surgery date)',
      },
      analysisEndDate: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'End of analysis period (current date or 90 days post-surgery)',
      },
      daysPostSurgery: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Number of days since surgery at time of report generation',
      },
      recoveryScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Overall recovery score 0-100',
      },
      reportData: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Full structured AI response with all analysis sections',
      },
      summary: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Executive summary of findings',
      },
      riskAssessment: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Array of identified risks with severity levels',
      },
      unusualFindings: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Array of anomalies and concerning patterns detected',
      },
      actionPlan: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Array of personalized recommendations and next steps',
      },
      dataCompleteness: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Metadata about what data sources were available',
      },
      metricsAnalyzed: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'List of specific metrics that were analyzed',
      },
      aiModel: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Claude model version used (e.g., claude-sonnet-4-5)',
      },
      aiPromptVersion: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Version of AI prompt template for tracking',
      },
      status: {
        type: Sequelize.ENUM('generating', 'completed', 'error'),
        allowNull: false,
        defaultValue: 'generating',
        comment: 'Current status of report generation',
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error details if status is error',
      },
      sharedWithProviders: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this report is visible to patient cardiac team',
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

    // Add indexes for common queries
    await queryInterface.addIndex('CAI_reports', ['userId'], {
      name: 'CAI_reports_user_id_idx',
    });

    await queryInterface.addIndex('CAI_reports', ['patientId'], {
      name: 'CAI_reports_patient_id_idx',
    });

    await queryInterface.addIndex('CAI_reports', ['generatedAt'], {
      name: 'CAI_reports_generated_at_idx',
    });

    await queryInterface.addIndex('CAI_reports', ['status'], {
      name: 'CAI_reports_status_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('cai_reports');
  },
};
