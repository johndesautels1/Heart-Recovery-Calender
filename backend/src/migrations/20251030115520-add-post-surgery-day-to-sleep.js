'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add post_surgery_day column
    await queryInterface.addColumn('sleep_logs', 'postSurgeryDay', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Days since surgery (Day 0 = surgery date). Auto-calculated from patient.surgeryDate',
    });

    // Create trigger function
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION calculate_sleep_post_surgery_day()
      RETURNS TRIGGER AS $$
      DECLARE
        surgery_date DATE;
      BEGIN
        SELECT p."surgeryDate" INTO surgery_date
        FROM patients p
        WHERE p."userId" = NEW."userId";

        IF surgery_date IS NOT NULL THEN
          NEW."postSurgeryDay" := (NEW."date" - surgery_date::DATE);
        ELSE
          NEW."postSurgeryDay" := NULL;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger
    await queryInterface.sequelize.query(`
      CREATE TRIGGER sleep_auto_post_surgery_day
      BEFORE INSERT OR UPDATE ON sleep_logs
      FOR EACH ROW
      EXECUTE FUNCTION calculate_sleep_post_surgery_day();
    `);

    // Backfill existing records
    await queryInterface.sequelize.query(`
      UPDATE sleep_logs sl
      SET "postSurgeryDay" = (sl."date" - p."surgeryDate"::DATE)
      FROM patients p
      WHERE p."userId" = sl."userId"
        AND p."surgeryDate" IS NOT NULL;
    `);

    console.log('✅ Added postSurgeryDay to sleep_logs with auto-calculation trigger');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS sleep_auto_post_surgery_day ON sleep_logs;`);
    await queryInterface.sequelize.query(`DROP FUNCTION IF EXISTS calculate_sleep_post_surgery_day();`);
    await queryInterface.removeColumn('sleep_logs', 'postSurgeryDay');
    console.log('↩️  Removed postSurgeryDay from sleep_logs');
  }
};
