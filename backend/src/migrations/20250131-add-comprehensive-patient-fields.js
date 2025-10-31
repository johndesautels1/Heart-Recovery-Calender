module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Name fields
      await queryInterface.addColumn('patients', 'firstName', {
        type: Sequelize.STRING(100),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('patients', 'lastName', {
        type: Sequelize.STRING(100),
        allowNull: true,
      }, { transaction });

      // Demographics
      await queryInterface.addColumn('patients', 'dateOfBirth', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Patient date of birth for age calculation',
      }, { transaction });

      await queryInterface.addColumn('patients', 'gender', {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: 'male, female, or other',
      }, { transaction });

      await queryInterface.addColumn('patients', 'age', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Auto-calculated from dateOfBirth',
      }, { transaction });

      // Primary Contact
      await queryInterface.addColumn('patients', 'primaryPhone', {
        type: Sequelize.STRING(20),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('patients', 'primaryPhoneType', {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: 'mobile, home, or work',
      }, { transaction });

      await queryInterface.addColumn('patients', 'alternatePhone', {
        type: Sequelize.STRING(20),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('patients', 'preferredContactMethod', {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: 'phone, email, or text',
      }, { transaction });

      await queryInterface.addColumn('patients', 'bestTimeToContact', {
        type: Sequelize.STRING(15),
        allowNull: true,
        comment: 'morning, afternoon, or evening',
      }, { transaction });

      // Mailing Address
      await queryInterface.addColumn('patients', 'streetAddress', {
        type: Sequelize.STRING(255),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('patients', 'city', {
        type: Sequelize.STRING(100),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('patients', 'state', {
        type: Sequelize.STRING(50),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('patients', 'postalCode', {
        type: Sequelize.STRING(20),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('patients', 'country', {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: 'United States',
      }, { transaction });

      // Emergency Contact #1
      await queryInterface.addColumn('patients', 'emergencyContact1Name', {
        type: Sequelize.STRING(255),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('patients', 'emergencyContact1Relationship', {
        type: Sequelize.STRING(100),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('patients', 'emergencyContact1Phone', {
        type: Sequelize.STRING(20),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('patients', 'emergencyContact1AlternatePhone', {
        type: Sequelize.STRING(20),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('patients', 'emergencyContact1Email', {
        type: Sequelize.STRING(255),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('patients', 'emergencyContact1SameAddress', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      }, { transaction });

      // Emergency Contact #2
      await queryInterface.addColumn('patients', 'emergencyContact2Name', {
        type: Sequelize.STRING(255),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('patients', 'emergencyContact2Relationship', {
        type: Sequelize.STRING(100),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('patients', 'emergencyContact2Phone', {
        type: Sequelize.STRING(20),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('patients', 'emergencyContact2AlternatePhone', {
        type: Sequelize.STRING(20),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('patients', 'emergencyContact2Email', {
        type: Sequelize.STRING(255),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('patients', 'emergencyContact2SameAddress', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      }, { transaction });

      // Additional Demographics
      await queryInterface.addColumn('patients', 'race', {
        type: Sequelize.STRING(100),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('patients', 'nationality', {
        type: Sequelize.STRING(100),
        allowNull: true,
      }, { transaction });

      // Prior Surgical Procedures
      await queryInterface.addColumn('patients', 'priorSurgicalProcedures', {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        comment: 'CABG, Valve Replacement, etc.',
      }, { transaction });

      await queryInterface.addColumn('patients', 'devicesImplanted', {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        comment: 'Pacemaker, ICD, Stents, etc.',
      }, { transaction });

      await queryInterface.addColumn('patients', 'priorSurgeryNotes', {
        type: Sequelize.TEXT,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('patients', 'hospitalName', {
        type: Sequelize.STRING(255),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('patients', 'surgeonName', {
        type: Sequelize.STRING(255),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('patients', 'dischargeDate', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('patients', 'dischargeInstructions', {
        type: Sequelize.TEXT,
        allowNull: true,
      }, { transaction });

      // Medical History
      await queryInterface.addColumn('patients', 'priorHealthConditions', {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        comment: 'Diabetes, CKD, COPD, etc.',
      }, { transaction });

      await queryInterface.addColumn('patients', 'currentConditions', {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        comment: 'Non-cardiac current conditions',
      }, { transaction });

      await queryInterface.addColumn('patients', 'nonCardiacMedications', {
        type: Sequelize.TEXT,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('patients', 'allergies', {
        type: Sequelize.TEXT,
        allowNull: true,
      }, { transaction });

      // Heart Condition
      await queryInterface.addColumn('patients', 'diagnosisDate', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date of heart condition diagnosis',
      }, { transaction });

      await queryInterface.addColumn('patients', 'heartConditions', {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        comment: 'CAD, CHF, AFib, etc.',
      }, { transaction });

      await queryInterface.addColumn('patients', 'currentTreatmentProtocol', {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('patients', 'recommendedTreatments', {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
      }, { transaction });

      // Cardiac Vitals (CRITICAL for MET calculations)
      await queryInterface.addColumn('patients', 'restingHeartRate', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Baseline resting HR for MET calculations',
      }, { transaction });

      await queryInterface.addColumn('patients', 'maxHeartRate', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Can override 220-age if doctor sets specific limit',
      }, { transaction });

      await queryInterface.addColumn('patients', 'targetHeartRateMin', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Safe exercise zone minimum HR',
      }, { transaction });

      await queryInterface.addColumn('patients', 'targetHeartRateMax', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Safe exercise zone maximum HR',
      }, { transaction });

      await queryInterface.addColumn('patients', 'baselineBpSystolic', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Resting systolic blood pressure',
      }, { transaction });

      await queryInterface.addColumn('patients', 'baselineBpDiastolic', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Resting diastolic blood pressure',
      }, { transaction });

      await queryInterface.addColumn('patients', 'ejectionFraction', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Left ventricular ejection fraction (%)',
      }, { transaction });

      await queryInterface.addColumn('patients', 'cardiacDiagnosis', {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        comment: 'Primary cardiac diagnoses',
      }, { transaction });

      await queryInterface.addColumn('patients', 'medicationsAffectingHR', {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        comment: 'Beta-blockers, etc. that affect heart rate response',
      }, { transaction });

      await queryInterface.addColumn('patients', 'activityRestrictions', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Weight limits, movements to avoid, etc.',
      }, { transaction });

      // Device Integration
      await queryInterface.addColumn('patients', 'polarDeviceId', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Polar heart monitor device ID',
      }, { transaction });

      await queryInterface.addColumn('patients', 'samsungHealthAccount', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Samsung Health / Galaxy Watch account',
      }, { transaction });

      await queryInterface.addColumn('patients', 'preferredDataSource', {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'polar, samsung, or manual',
      }, { transaction });
    });
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Remove all added columns in reverse order
      const columnsToRemove = [
        'firstName', 'lastName', 'dateOfBirth', 'gender', 'age',
        'primaryPhone', 'primaryPhoneType', 'alternatePhone', 'preferredContactMethod', 'bestTimeToContact',
        'streetAddress', 'city', 'state', 'postalCode', 'country',
        'emergencyContact1Name', 'emergencyContact1Relationship', 'emergencyContact1Phone',
        'emergencyContact1AlternatePhone', 'emergencyContact1Email', 'emergencyContact1SameAddress',
        'emergencyContact2Name', 'emergencyContact2Relationship', 'emergencyContact2Phone',
        'emergencyContact2AlternatePhone', 'emergencyContact2Email', 'emergencyContact2SameAddress',
        'race', 'nationality',
        'priorSurgicalProcedures', 'devicesImplanted', 'priorSurgeryNotes',
        'hospitalName', 'surgeonName', 'dischargeDate', 'dischargeInstructions',
        'priorHealthConditions', 'currentConditions', 'nonCardiacMedications', 'allergies',
        'diagnosisDate', 'heartConditions', 'currentTreatmentProtocol', 'recommendedTreatments',
        'restingHeartRate', 'maxHeartRate', 'targetHeartRateMin', 'targetHeartRateMax',
        'baselineBpSystolic', 'baselineBpDiastolic', 'ejectionFraction',
        'cardiacDiagnosis', 'medicationsAffectingHR', 'activityRestrictions',
        'polarDeviceId', 'samsungHealthAccount', 'preferredDataSource',
      ];

      for (const column of columnsToRemove) {
        await queryInterface.removeColumn('patients', column, { transaction });
      }
    });
  },
};
