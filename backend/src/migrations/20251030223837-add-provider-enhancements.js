'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new provider type field as ENUM
    await queryInterface.addColumn('providers', 'providerType', {
      type: Sequelize.ENUM(
        'cardiothoracic_surgeon',
        'cardiologist',
        'electrophysiologist',
        'general_practitioner',
        'physical_therapist',
        'pharmacy',
        'hospital',
        'other'
      ),
      allowNull: true,
      comment: 'Primary provider type',
    });

    await queryInterface.addColumn('providers', 'officeHours', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Office hours (e.g., Mon-Fri 9am-5pm)',
    });

    await queryInterface.addColumn('providers', 'faxNumber', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'Fax number for medical records',
    });

    await queryInterface.addColumn('providers', 'patientPortalUrl', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'URL to patient portal',
    });

    await queryInterface.addColumn('providers', 'preferredContactMethod', {
      type: Sequelize.ENUM('phone', 'email', 'portal', 'any'),
      allowNull: true,
      defaultValue: 'phone',
      comment: 'Preferred way to contact provider',
    });

    await queryInterface.addColumn('providers', 'acceptedInsurance', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Insurance plans accepted',
    });

    await queryInterface.addColumn('providers', 'lastVisitDate', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Date of last visit/appointment',
    });

    await queryInterface.addColumn('providers', 'isEmergencyContact', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Designate as emergency contact',
    });

    await queryInterface.addColumn('providers', 'pharmacyLicenseNumber', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Pharmacy license/DEA number for medication linking',
    });

    console.log('✅ Added provider enhancement fields');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('providers', 'providerType');
    await queryInterface.removeColumn('providers', 'officeHours');
    await queryInterface.removeColumn('providers', 'faxNumber');
    await queryInterface.removeColumn('providers', 'patientPortalUrl');
    await queryInterface.removeColumn('providers', 'preferredContactMethod');
    await queryInterface.removeColumn('providers', 'acceptedInsurance');
    await queryInterface.removeColumn('providers', 'lastVisitDate');
    await queryInterface.removeColumn('providers', 'isEmergencyContact');
    await queryInterface.removeColumn('providers', 'pharmacyLicenseNumber');

    console.log('↩️  Removed provider enhancement fields');
  }
};
