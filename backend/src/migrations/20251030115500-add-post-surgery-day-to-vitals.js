'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add post_surgery_day column
    await queryInterface.addColumn('vitals_samples', 'postSurgeryDay', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Days since surgery (Day 0 = surgery date). Auto-calculated from patient.surgeryDate',
    });

    // Create trigger function to auto-calculate post_surgery_day
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION calculate_vitals_post_surgery_day()
      RETURNS TRIGGER AS $$
      DECLARE
        surgery_date DATE;
      BEGIN
        -- Get surgery date from linked patient
        SELECT p."surgeryDate" INTO surgery_date
        FROM patients p
        WHERE p."userId" = NEW."userId";

        -- Calculate days since surgery
        IF surgery_date IS NOT NULL THEN
          NEW."postSurgeryDay" := (NEW."timestamp"::DATE - surgery_date::DATE);
        ELSE
          NEW."postSurgeryDay" := NULL;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger
    await queryInterface.sequelize.query(`
      CREATE TRIGGER vitals_auto_post_surgery_day
      BEFORE INSERT OR UPDATE ON vitals_samples
      FOR EACH ROW
      EXECUTE FUNCTION calculate_vitals_post_surgery_day();
    `);

    // Backfill existing records
    await queryInterface.sequelize.query(`
      UPDATE vitals_samples vs
      SET "postSurgeryDay" = (vs."timestamp"::DATE - p."surgeryDate"::DATE)
      FROM patients p
      WHERE p."userId" = vs."userId"
        AND p."surgeryDate" IS NOT NULL;
    `);

    console.log('✅ Added postSurgeryDay to vitals_samples with auto-calculation trigger');
  },

  async down(queryInterface, Sequelize) {
    // Drop trigger
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS vitals_auto_post_surgery_day ON vitals_samples;
    `);

    // Drop function
    await queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS calculate_vitals_post_surgery_day();
    `);

    // Remove column
    await queryInterface.removeColumn('vitals_samples', 'postSurgeryDay');

    console.log('↩️  Removed postSurgeryDay from vitals_samples');
  }
};
