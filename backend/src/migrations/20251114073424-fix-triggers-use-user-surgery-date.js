'use strict';

/**
 * Migration: Fix database triggers to use User.surgeryDate
 *
 * PROBLEM:
 * All 4 postSurgeryDay calculation triggers query Patient.surgeryDate,
 * but User.surgeryDate is the single source of truth. This causes:
 * - Failed calculations for users without Patient records
 * - Inconsistent architecture (Patient table is redundant)
 *
 * SOLUTION:
 * Update all 4 triggers to query User.surgeryDate directly:
 * - calculate_vitals_post_surgery_day
 * - calculate_meals_post_surgery_day
 * - calculate_sleep_post_surgery_day
 * - calculate_medications_post_surgery_day
 *
 * UNDERSTANDING:
 * - User/Patient = SAME person (role='patient')
 * - User/Therapist/Admin = SAME person (role='therapist' or 'admin')
 * - Only 2 types of people, not 4
 * - Patient table is legacy/redundant
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('[MIGRATION] Fixing database triggers to use User.surgeryDate...');

      // ===== TRIGGER 1: calculate_vitals_post_surgery_day =====
      console.log('[MIGRATION] Updating calculate_vitals_post_surgery_day trigger...');

      await queryInterface.sequelize.query(
        `CREATE OR REPLACE FUNCTION calculate_vitals_post_surgery_day()
         RETURNS TRIGGER AS $$
         DECLARE
           surgery_date DATE;
           post_surgery_day INT;
         BEGIN
           -- Query User.surgeryDate (single source of truth)
           SELECT u."surgeryDate" INTO surgery_date
           FROM users u
           WHERE u.id = NEW."userId";

           IF surgery_date IS NULL THEN
             NEW."postSurgeryDay" := NULL;
           ELSE
             post_surgery_day := DATE_PART('day', NEW.timestamp - surgery_date);
             NEW."postSurgeryDay" := post_surgery_day;
           END IF;

           RETURN NEW;
         END;
         $$ LANGUAGE plpgsql;`,
        { transaction }
      );

      console.log('[MIGRATION] ✓ calculate_vitals_post_surgery_day updated');

      // ===== TRIGGER 2: calculate_meals_post_surgery_day =====
      console.log('[MIGRATION] Updating calculate_meals_post_surgery_day trigger...');

      await queryInterface.sequelize.query(
        `CREATE OR REPLACE FUNCTION calculate_meals_post_surgery_day()
         RETURNS TRIGGER AS $$
         DECLARE
           surgery_date DATE;
           post_surgery_day INT;
         BEGIN
           -- Query User.surgeryDate (single source of truth)
           SELECT u."surgeryDate" INTO surgery_date
           FROM users u
           WHERE u.id = NEW."userId";

           IF surgery_date IS NULL THEN
             NEW."postSurgeryDay" := NULL;
           ELSE
             post_surgery_day := DATE_PART('day', NEW."mealTime" - surgery_date);
             NEW."postSurgeryDay" := post_surgery_day;
           END IF;

           RETURN NEW;
         END;
         $$ LANGUAGE plpgsql;`,
        { transaction }
      );

      console.log('[MIGRATION] ✓ calculate_meals_post_surgery_day updated');

      // ===== TRIGGER 3: calculate_sleep_post_surgery_day =====
      console.log('[MIGRATION] Updating calculate_sleep_post_surgery_day trigger...');

      await queryInterface.sequelize.query(
        `CREATE OR REPLACE FUNCTION calculate_sleep_post_surgery_day()
         RETURNS TRIGGER AS $$
         DECLARE
           surgery_date DATE;
           post_surgery_day INT;
         BEGIN
           -- Query User.surgeryDate (single source of truth)
           SELECT u."surgeryDate" INTO surgery_date
           FROM users u
           WHERE u.id = NEW."userId";

           IF surgery_date IS NULL THEN
             NEW."postSurgeryDay" := NULL;
           ELSE
             post_surgery_day := DATE_PART('day', NEW."sleepDate" - surgery_date);
             NEW."postSurgeryDay" := post_surgery_day;
           END IF;

           RETURN NEW;
         END;
         $$ LANGUAGE plpgsql;`,
        { transaction }
      );

      console.log('[MIGRATION] ✓ calculate_sleep_post_surgery_day updated');

      // ===== TRIGGER 4: calculate_medications_post_surgery_day =====
      console.log('[MIGRATION] Updating calculate_medications_post_surgery_day trigger...');

      await queryInterface.sequelize.query(
        `CREATE OR REPLACE FUNCTION calculate_medications_post_surgery_day()
         RETURNS TRIGGER AS $$
         DECLARE
           surgery_date DATE;
           post_surgery_day INT;
         BEGIN
           -- Query User.surgeryDate (single source of truth)
           SELECT u."surgeryDate" INTO surgery_date
           FROM users u
           WHERE u.id = NEW."userId";

           IF surgery_date IS NULL THEN
             NEW."postSurgeryDay" := NULL;
           ELSE
             post_surgery_day := DATE_PART('day', NEW."takenAt" - surgery_date);
             NEW."postSurgeryDay" := post_surgery_day;
           END IF;

           RETURN NEW;
         END;
         $$ LANGUAGE plpgsql;`,
        { transaction }
      );

      console.log('[MIGRATION] ✓ calculate_medications_post_surgery_day updated');

      console.log('[MIGRATION] ✅ All 4 triggers now use User.surgeryDate');
      console.log('[MIGRATION] Result: postSurgeryDay calculations work for all users');
      console.log('[MIGRATION] No dependency on redundant Patient table');

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('[MIGRATION] ❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('[MIGRATION ROLLBACK] Reverting triggers to use Patient.surgeryDate...');

      // Revert to old triggers that query Patient.surgeryDate
      await queryInterface.sequelize.query(
        `CREATE OR REPLACE FUNCTION calculate_vitals_post_surgery_day()
         RETURNS TRIGGER AS $$
         DECLARE
           surgery_date DATE;
           post_surgery_day INT;
         BEGIN
           SELECT p."surgeryDate" INTO surgery_date
           FROM patients p
           WHERE p."userId" = NEW."userId";

           IF surgery_date IS NULL THEN
             NEW."postSurgeryDay" := NULL;
           ELSE
             post_surgery_day := DATE_PART('day', NEW.timestamp - surgery_date);
             NEW."postSurgeryDay" := post_surgery_day;
           END IF;

           RETURN NEW;
         END;
         $$ LANGUAGE plpgsql;`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `CREATE OR REPLACE FUNCTION calculate_meals_post_surgery_day()
         RETURNS TRIGGER AS $$
         DECLARE
           surgery_date DATE;
           post_surgery_day INT;
         BEGIN
           SELECT p."surgeryDate" INTO surgery_date
           FROM patients p
           WHERE p."userId" = NEW."userId";

           IF surgery_date IS NULL THEN
             NEW."postSurgeryDay" := NULL;
           ELSE
             post_surgery_day := DATE_PART('day', NEW."mealTime" - surgery_date);
             NEW."postSurgeryDay" := post_surgery_day;
           END IF;

           RETURN NEW;
         END;
         $$ LANGUAGE plpgsql;`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `CREATE OR REPLACE FUNCTION calculate_sleep_post_surgery_day()
         RETURNS TRIGGER AS $$
         DECLARE
           surgery_date DATE;
           post_surgery_day INT;
         BEGIN
           SELECT p."surgeryDate" INTO surgery_date
           FROM patients p
           WHERE p."userId" = NEW."userId";

           IF surgery_date IS NULL THEN
             NEW."postSurgeryDay" := NULL;
           ELSE
             post_surgery_day := DATE_PART('day', NEW."sleepDate" - surgery_date);
             NEW."postSurgeryDay" := post_surgery_day;
           END IF;

           RETURN NEW;
         END;
         $$ LANGUAGE plpgsql;`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `CREATE OR REPLACE FUNCTION calculate_medications_post_surgery_day()
         RETURNS TRIGGER AS $$
         DECLARE
           surgery_date DATE;
           post_surgery_day INT;
         BEGIN
           SELECT p."surgeryDate" INTO surgery_date
           FROM patients p
           WHERE p."userId" = NEW."userId";

           IF surgery_date IS NULL THEN
             NEW."postSurgeryDay" := NULL;
           ELSE
             post_surgery_day := DATE_PART('day', NEW."takenAt" - surgery_date);
             NEW."postSurgeryDay" := post_surgery_day;
           END IF;

           RETURN NEW;
         END;
         $$ LANGUAGE plpgsql;`,
        { transaction }
      );

      console.log('[MIGRATION ROLLBACK] ✅ Triggers reverted to Patient.surgeryDate');

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('[MIGRATION ROLLBACK] ❌ Rollback failed:', error);
      throw error;
    }
  },
};
