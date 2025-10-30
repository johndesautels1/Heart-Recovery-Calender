'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hydration_logs', {
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
        comment: 'User tracking hydration',
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Date of hydration tracking',
      },
      totalOunces: {
        type: Sequelize.DECIMAL(5, 1),
        allowNull: false,
        defaultValue: 0,
        comment: 'Total fluid intake in ounces for the day',
      },
      targetOunces: {
        type: Sequelize.DECIMAL(5, 1),
        allowNull: true,
        comment: 'Daily target based on body weight (Weight in lbs × 0.5)',
      },
      postSurgeryDay: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Days since surgery (auto-calculated)',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
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

    // Add indexes
    await queryInterface.addIndex('hydration_logs', ['userId', 'date'], {
      unique: true,
      name: 'hydration_logs_user_date_unique',
    });

    // Create trigger function for post_surgery_day
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION calculate_hydration_post_surgery_day()
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
      CREATE TRIGGER hydration_auto_post_surgery_day
      BEFORE INSERT OR UPDATE ON hydration_logs
      FOR EACH ROW
      EXECUTE FUNCTION calculate_hydration_post_surgery_day();
    `);

    console.log('✅ Created hydration_logs table with auto-calculated postSurgeryDay');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS hydration_auto_post_surgery_day ON hydration_logs;`);
    await queryInterface.sequelize.query(`DROP FUNCTION IF EXISTS calculate_hydration_post_surgery_day();`);
    await queryInterface.dropTable('hydration_logs');
    console.log('↩️  Dropped hydration_logs table');
  }
};
