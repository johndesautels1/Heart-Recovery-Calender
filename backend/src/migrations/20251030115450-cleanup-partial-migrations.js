'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🧹 Cleaning up any partial migration state...');

    // Check if column exists before trying to remove
    const [results] = await queryInterface.sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='vitals_samples' AND column_name='postSurgeryDay';
    `);

    if (results.length > 0) {
      await queryInterface.removeColumn('vitals_samples', 'postSurgeryDay');
      console.log('  Removed postSurgeryDay column from vitals_samples');
    }

    // Drop any existing triggers and functions
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS vitals_auto_post_surgery_day ON vitals_samples;`);
    await queryInterface.sequelize.query(`DROP FUNCTION IF EXISTS calculate_vitals_post_surgery_day();`);

    console.log('✅ Cleanup complete');
  },

  async down(queryInterface, Sequelize) {
    // Nothing to undo
    console.log('↩️  Cleanup undo (no-op)');
  }
};
