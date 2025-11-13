'use strict';

/**
 * Migration: Fix Database Triggers to Use User.surgeryDate
 *
 * This migration updates 4 database trigger functions that were incorrectly
 * referencing Patient.surgeryDate instead of User.surgeryDate.
 *
 * Triggers Updated:
 * 1. calculate_vitals_post_surgery_day() - vitals_samples table
 * 2. calculate_meals_post_surgery_day() - meal_entries table
 * 3. calculate_sleep_post_surgery_day() - sleep_logs table
 * 4. calculate_medication_post_surgery_day() - medication_logs table
 *
 * Change: FROM patients p WHERE p."userId" = NEW."userId"
 *      → FROM users u WHERE u.id = NEW."userId"
 *
 * This is part of the Entity Consolidation Strategy (ADR_001).
 * See: ADR_001_ENTITY_CONSOLIDATION.md for full context.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Fixing database triggers to use User.surgeryDate...');

    // =================================================================
    // TRIGGER 1: Vitals (vitals_samples table)
    // =================================================================

    console.log('Updating vitals trigger function...');

    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION calculate_vitals_post_surgery_day()
      RETURNS TRIGGER AS $$
      DECLARE
        surgery_date DATE;
      BEGIN
        -- ✅ FIXED: Get surgery date from users table (not patients)
        SELECT u."surgeryDate" INTO surgery_date
        FROM users u
        WHERE u.id = NEW."userId";

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

    // Backfill vitals_samples with corrected User.surgeryDate
    await queryInterface.sequelize.query(`
      UPDATE vitals_samples vs
      SET "postSurgeryDay" = (vs."timestamp"::DATE - u."surgeryDate"::DATE)
      FROM users u
      WHERE u.id = vs."userId"
        AND u."surgeryDate" IS NOT NULL;
    `);

    console.log('✓ Fixed vitals trigger');

    // =================================================================
    // TRIGGER 2: Meals (meal_entries table)
    // =================================================================

    console.log('Updating meals trigger function...');

    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION calculate_meals_post_surgery_day()
      RETURNS TRIGGER AS $$
      DECLARE
        surgery_date DATE;
      BEGIN
        -- ✅ FIXED: Get surgery date from users table (not patients)
        SELECT u."surgeryDate" INTO surgery_date
        FROM users u
        WHERE u.id = NEW."userId";

        IF surgery_date IS NOT NULL THEN
          NEW."postSurgeryDay" := (NEW."timestamp"::DATE - surgery_date::DATE);
        ELSE
          NEW."postSurgeryDay" := NULL;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Backfill meal_entries with corrected User.surgeryDate
    await queryInterface.sequelize.query(`
      UPDATE meal_entries me
      SET "postSurgeryDay" = (me."timestamp"::DATE - u."surgeryDate"::DATE)
      FROM users u
      WHERE u.id = me."userId"
        AND u."surgeryDate" IS NOT NULL;
    `);

    console.log('✓ Fixed meals trigger');

    // =================================================================
    // TRIGGER 3: Sleep (sleep_logs table)
    // =================================================================

    console.log('Updating sleep trigger function...');

    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION calculate_sleep_post_surgery_day()
      RETURNS TRIGGER AS $$
      DECLARE
        surgery_date DATE;
      BEGIN
        -- ✅ FIXED: Get surgery date from users table (not patients)
        SELECT u."surgeryDate" INTO surgery_date
        FROM users u
        WHERE u.id = NEW."userId";

        IF surgery_date IS NOT NULL THEN
          NEW."postSurgeryDay" := (NEW."date" - surgery_date::DATE);
        ELSE
          NEW."postSurgeryDay" := NULL;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Backfill sleep_logs with corrected User.surgeryDate
    await queryInterface.sequelize.query(`
      UPDATE sleep_logs sl
      SET "postSurgeryDay" = (sl."date" - u."surgeryDate"::DATE)
      FROM users u
      WHERE u.id = sl."userId"
        AND u."surgeryDate" IS NOT NULL;
    `);

    console.log('✓ Fixed sleep trigger');

    // =================================================================
    // TRIGGER 4: Medications (medication_logs table)
    // =================================================================

    console.log('Updating medication trigger function...');

    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION calculate_medication_post_surgery_day()
      RETURNS TRIGGER AS $$
      DECLARE
        surgery_date DATE;
      BEGIN
        -- ✅ FIXED: Get surgery date from users table (not patients)
        SELECT u."surgeryDate" INTO surgery_date
        FROM users u
        WHERE u.id = NEW."userId";

        IF surgery_date IS NOT NULL THEN
          NEW."postSurgeryDay" := (NEW."scheduledTime"::DATE - surgery_date::DATE);
        ELSE
          NEW."postSurgeryDay" := NULL;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Backfill medication_logs with corrected User.surgeryDate
    await queryInterface.sequelize.query(`
      UPDATE medication_logs ml
      SET "postSurgeryDay" = (ml."scheduledTime"::DATE - u."surgeryDate"::DATE)
      FROM users u
      WHERE u.id = ml."userId"
        AND u."surgeryDate" IS NOT NULL;
    `);

    console.log('✓ Fixed medication trigger');
    console.log('✅ All 4 triggers now use User.surgeryDate!');
  },

  async down(queryInterface, Sequelize) {
    console.log('Rolling back trigger fixes (reverting to Patient.surgeryDate)...');

    // =================================================================
    // ROLLBACK: Revert all 4 triggers to Patient.surgeryDate
    // =================================================================

    // TRIGGER 1: Vitals
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION calculate_vitals_post_surgery_day()
      RETURNS TRIGGER AS $$
      DECLARE
        surgery_date DATE;
      BEGIN
        -- Reverted: Get surgery date from patients table
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

    // TRIGGER 2: Meals
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

    // TRIGGER 3: Sleep
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

    // TRIGGER 4: Medications
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION calculate_medication_post_surgery_day()
      RETURNS TRIGGER AS $$
      DECLARE
        surgery_date DATE;
      BEGIN
        SELECT p."surgeryDate" INTO surgery_date
        FROM patients p
        WHERE p."userId" = NEW."userId";

        IF surgery_date IS NOT NULL THEN
          NEW."postSurgeryDay" := (NEW."scheduledTime"::DATE - surgery_date::DATE);
        ELSE
          NEW."postSurgeryDay" := NULL;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log('↩️  Reverted all 4 triggers to use Patient.surgeryDate');
  }
};
