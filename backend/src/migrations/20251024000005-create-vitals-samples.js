module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('vitals_samples', {
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
      bloodPressureSystolic: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Systolic blood pressure in mmHg'
      },
      bloodPressureDiastolic: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Diastolic blood pressure in mmHg'
      },
      heartRate: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Heart rate in bpm'
      },
      hrVariability: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Heart rate variability in ms'
      },
      weight: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Weight in lbs'
      },
      temperature: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Temperature in Fahrenheit'
      },
      oxygenSaturation: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Oxygen saturation percentage'
      },
      bloodSugar: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Blood sugar in mg/dL'
      },
      respiratoryRate: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Respiratory rate in breaths per minute'
      },
      cholesterol: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Total cholesterol in mg/dL'
      },
      ldl: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'LDL cholesterol in mg/dL'
      },
      hdl: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'HDL cholesterol in mg/dL'
      },
      triglycerides: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Triglycerides in mg/dL'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      symptoms: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      medicationsTaken: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      deviceId: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      source: {
        type: Sequelize.ENUM('manual', 'device', 'import'),
        defaultValue: 'manual'
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

    await queryInterface.addIndex('vitals_samples', ['userId']);
    await queryInterface.addIndex('vitals_samples', ['timestamp']);
    await queryInterface.addIndex('vitals_samples', ['source']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('vitals_samples');
  }
};
