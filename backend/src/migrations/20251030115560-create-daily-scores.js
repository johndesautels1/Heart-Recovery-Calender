'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('daily_scores', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'User being scored',
      },
      scoreDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Date of this daily score',
      },
      postSurgeryDay: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Days since surgery (auto-calculated)',
      },

      // CATEGORY SCORES (0-100 scale for each)
      exerciseScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Exercise/Activities score (0-100)',
      },
      nutritionScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Meals/Nutrition score (0-100)',
      },
      medicationScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Medication adherence score (0-100)',
      },
      sleepScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Sleep quality score (0-100)',
      },
      vitalsScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Vitals health score (0-100)',
      },
      hydrationScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Hydration compliance score (0-100)',
      },

      // TOTAL SCORE (weighted average of the 6 categories)
      totalDailyScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Total daily score - weighted average of all categories (0-100)',
      },

      // METADATA
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Optional notes for this day',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Add unique constraint: one score per user per day
    await queryInterface.addIndex('daily_scores', ['userId', 'scoreDate'], {
      unique: true,
      name: 'daily_scores_user_date_unique',
    });

    // Add index for fast lookups
    await queryInterface.addIndex('daily_scores', ['userId', 'postSurgeryDay']);
    await queryInterface.addIndex('daily_scores', ['scoreDate']);

    // Create trigger function for post_surgery_day
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION calculate_daily_score_post_surgery_day()
      RETURNS TRIGGER AS $$
      DECLARE
        surgery_date DATE;
      BEGIN
        SELECT p."surgeryDate" INTO surgery_date
        FROM patients p
        WHERE p."userId" = NEW."userId";

        IF surgery_date IS NOT NULL THEN
          NEW."postSurgeryDay" := (NEW."scoreDate" - surgery_date::DATE);
        ELSE
          NEW."postSurgeryDay" := NULL;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger
    await queryInterface.sequelize.query(`
      CREATE TRIGGER daily_score_auto_post_surgery_day
      BEFORE INSERT OR UPDATE ON daily_scores
      FOR EACH ROW
      EXECUTE FUNCTION calculate_daily_score_post_surgery_day();
    `);

    console.log('✅ Created daily_scores table with 6 category scores + total');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS daily_score_auto_post_surgery_day ON daily_scores;`);
    await queryInterface.sequelize.query(`DROP FUNCTION IF EXISTS calculate_daily_score_post_surgery_day();`);
    await queryInterface.dropTable('daily_scores');
    console.log('↩️  Dropped daily_scores table');
  }
};
