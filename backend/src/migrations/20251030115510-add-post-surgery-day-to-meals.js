'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add post_surgery_day column
    await queryInterface.addColumn('meal_entries', 'postSurgeryDay', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Days since surgery (Day 0 = surgery date). Auto-calculated from patient.surgeryDate',
    });

    // Create trigger function
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION calculate_meals_post_surgery_day()
      RETURNS TRIGGER AS $$
      DECLARE
        surgery_date DATE;
      BEGIN
        SELECT p."surgeryDate" INTO surgery_date
        FROM patients p
        WHERE p."userId" = NEW."userId";

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
      CREATE TRIGGER meals_auto_post_surgery_day
      BEFORE INSERT OR UPDATE ON meal_entries
      FOR EACH ROW
      EXECUTE FUNCTION calculate_meals_post_surgery_day();
    `);

    // Backfill existing records
    await queryInterface.sequelize.query(`
      UPDATE meal_entries me
      SET "postSurgeryDay" = (me."timestamp"::DATE - p."surgeryDate"::DATE)
      FROM patients p
      WHERE p."userId" = me."userId"
        AND p."surgeryDate" IS NOT NULL;
    `);

    console.log('✅ Added postSurgeryDay to meal_entries with auto-calculation trigger');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS meals_auto_post_surgery_day ON meal_entries;`);
    await queryInterface.sequelize.query(`DROP FUNCTION IF EXISTS calculate_meals_post_surgery_day();`);
    await queryInterface.removeColumn('meal_entries', 'postSurgeryDay');
    console.log('↩️  Removed postSurgeryDay from meal_entries');
  }
};
