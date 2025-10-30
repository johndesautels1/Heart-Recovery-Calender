'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, check if there are any patients with NULL userId
    const [patients] = await queryInterface.sequelize.query(
      `SELECT id, name FROM patients WHERE "userId" IS NULL;`
    );

    if (patients.length > 0) {
      console.log(`⚠️  WARNING: Found ${patients.length} patients with NULL userId:`);
      patients.forEach(p => console.log(`   - ID ${p.id}: ${p.name}`));
      console.log('⚠️  These patients will need user accounts created before continuing.');
      console.log('⚠️  Skipping userId NOT NULL constraint for now. Please fix data first.');
      return;
    }

    // If no NULL values, make userId required
    await queryInterface.changeColumn('patients', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: false, // NOW REQUIRED
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'REQUIRED: Link to the patient user account for their data',
    });

    console.log('✅ patients.userId is now REQUIRED (NOT NULL)');
  },

  async down(queryInterface, Sequelize) {
    // Revert to allowing NULL
    await queryInterface.changeColumn('patients', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Link to the patient user account for their data',
    });

    console.log('↩️  Reverted: patients.userId can be NULL again');
  }
};
