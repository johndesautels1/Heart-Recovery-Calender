'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add post_surgery_day column first
    await queryInterface.addColumn('exercise_logs', 'postSurgeryDay', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Days since surgery (Day 0 = surgery date)',
    });

    // Add startedAt timestamp
    await queryInterface.addColumn('exercise_logs', 'startedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'When the exercise session started',
    });

    // PRE-EXERCISE VITALS
    await queryInterface.addColumn('exercise_logs', 'preBpSystolic', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Pre-exercise systolic blood pressure (mmHg)',
    });

    await queryInterface.addColumn('exercise_logs', 'preBpDiastolic', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Pre-exercise diastolic blood pressure (mmHg)',
    });

    await queryInterface.addColumn('exercise_logs', 'preHeartRate', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Pre-exercise heart rate (bpm)',
    });

    await queryInterface.addColumn('exercise_logs', 'preOxygenSat', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Pre-exercise oxygen saturation (%)',
    });

    // DURING EXERCISE VITALS
    await queryInterface.addColumn('exercise_logs', 'duringHeartRateAvg', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Average heart rate during exercise (bpm)',
    });

    await queryInterface.addColumn('exercise_logs', 'duringHeartRateMax', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Maximum heart rate during exercise (bpm)',
    });

    await queryInterface.addColumn('exercise_logs', 'duringBpSystolic', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Blood pressure during exercise - systolic (optional monitoring)',
    });

    await queryInterface.addColumn('exercise_logs', 'duringBpDiastolic', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Blood pressure during exercise - diastolic (optional monitoring)',
    });

    // POST-EXERCISE VITALS
    await queryInterface.addColumn('exercise_logs', 'postBpSystolic', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Post-exercise systolic blood pressure (mmHg)',
    });

    await queryInterface.addColumn('exercise_logs', 'postBpDiastolic', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Post-exercise diastolic blood pressure (mmHg)',
    });

    await queryInterface.addColumn('exercise_logs', 'postHeartRate', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Post-exercise heart rate (bpm)',
    });

    await queryInterface.addColumn('exercise_logs', 'postOxygenSat', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Post-exercise oxygen saturation (%)',
    });

    // ACTIVITY-SPECIFIC METRICS (expanding existing)
    await queryInterface.addColumn('exercise_logs', 'distanceMiles', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Distance covered in miles (running, cycling, swimming, walking)',
    });

    await queryInterface.addColumn('exercise_logs', 'laps', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Number of laps (swimming, track)',
    });

    await queryInterface.addColumn('exercise_logs', 'steps', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Step count (walking, hiking)',
    });

    await queryInterface.addColumn('exercise_logs', 'elevationFeet', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Elevation gain in feet (hiking, cycling)',
    });

    await queryInterface.addColumn('exercise_logs', 'caloriesBurned', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Estimated calories burned',
    });

    // SUBJECTIVE RATINGS (add perceived exertion if not exists)
    await queryInterface.addColumn('exercise_logs', 'perceivedExertion', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Borg Scale 1-10 (1=very easy, 10=max effort)',
    });

    // Create trigger function for post_surgery_day
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION calculate_exercise_post_surgery_day()
      RETURNS TRIGGER AS $$
      DECLARE
        surgery_date DATE;
      BEGIN
        SELECT p."surgeryDate" INTO surgery_date
        FROM patients p
        WHERE p.id = NEW."patientId";

        IF surgery_date IS NOT NULL THEN
          NEW."postSurgeryDay" := (NEW."completedAt"::DATE - surgery_date::DATE);
        ELSE
          NEW."postSurgeryDay" := NULL;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger
    await queryInterface.sequelize.query(`
      CREATE TRIGGER exercise_auto_post_surgery_day
      BEFORE INSERT OR UPDATE ON exercise_logs
      FOR EACH ROW
      EXECUTE FUNCTION calculate_exercise_post_surgery_day();
    `);

    // Backfill existing records
    await queryInterface.sequelize.query(`
      UPDATE exercise_logs el
      SET "postSurgeryDay" = (el."completedAt"::DATE - p."surgeryDate"::DATE)
      FROM patients p
      WHERE p.id = el."patientId"
        AND p."surgeryDate" IS NOT NULL;
    `);

    console.log('✅ Added vitals, activity metrics, and postSurgeryDay to exercise_logs');
  },

  async down(queryInterface, Sequelize) {
    // Drop trigger and function
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS exercise_auto_post_surgery_day ON exercise_logs;`);
    await queryInterface.sequelize.query(`DROP FUNCTION IF EXISTS calculate_exercise_post_surgery_day();`);

    // Remove all added columns
    await queryInterface.removeColumn('exercise_logs', 'postSurgeryDay');
    await queryInterface.removeColumn('exercise_logs', 'startedAt');
    await queryInterface.removeColumn('exercise_logs', 'preBpSystolic');
    await queryInterface.removeColumn('exercise_logs', 'preBpDiastolic');
    await queryInterface.removeColumn('exercise_logs', 'preHeartRate');
    await queryInterface.removeColumn('exercise_logs', 'preOxygenSat');
    await queryInterface.removeColumn('exercise_logs', 'duringHeartRateAvg');
    await queryInterface.removeColumn('exercise_logs', 'duringHeartRateMax');
    await queryInterface.removeColumn('exercise_logs', 'duringBpSystolic');
    await queryInterface.removeColumn('exercise_logs', 'duringBpDiastolic');
    await queryInterface.removeColumn('exercise_logs', 'postBpSystolic');
    await queryInterface.removeColumn('exercise_logs', 'postBpDiastolic');
    await queryInterface.removeColumn('exercise_logs', 'postHeartRate');
    await queryInterface.removeColumn('exercise_logs', 'postOxygenSat');
    await queryInterface.removeColumn('exercise_logs', 'distanceMiles');
    await queryInterface.removeColumn('exercise_logs', 'laps');
    await queryInterface.removeColumn('exercise_logs', 'steps');
    await queryInterface.removeColumn('exercise_logs', 'elevationFeet');
    await queryInterface.removeColumn('exercise_logs', 'caloriesBurned');
    await queryInterface.removeColumn('exercise_logs', 'perceivedExertion');

    console.log('↩️  Removed vitals and activity metrics from exercise_logs');
  }
};
