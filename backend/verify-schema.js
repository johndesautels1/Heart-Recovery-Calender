const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('heartbeat_calendar', 'postgres', '2663', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false
});

async function verifySchema() {
  try {
    console.log('🔍 Verifying database schema changes...\n');

    // Check postSurgeryDay columns
    console.log('1. Checking postSurgeryDay columns:');
    const tables = ['vitals_samples', 'meal_entries', 'sleep_logs', 'medication_logs', 'exercise_logs', 'hydration_logs', 'daily_scores'];

    for (const table of tables) {
      const [results] = await sequelize.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name='${table}' AND column_name='postSurgeryDay';
      `);

      if (results.length > 0) {
        console.log(`   ✅ ${table}: postSurgeryDay exists (${results[0].data_type})`);
      } else {
        console.log(`   ❌ ${table}: postSurgeryDay NOT FOUND`);
      }
    }

    // Check exercise_logs new fields
    console.log('\n2. Checking exercise_logs vitals fields:');
    const exerciseFields = [
      'startedAt', 'preBpSystolic', 'preBpDiastolic', 'preHeartRate', 'preOxygenSat',
      'duringHeartRateAvg', 'duringHeartRateMax', 'duringBpSystolic', 'duringBpDiastolic',
      'postBpSystolic', 'postBpDiastolic', 'postHeartRate', 'postOxygenSat',
      'distanceMiles', 'laps', 'steps', 'elevationFeet', 'caloriesBurned', 'perceivedExertion'
    ];

    const [exerciseColumns] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='exercise_logs' AND column_name = ANY($1);
    `, {
      bind: [exerciseFields]
    });

    const foundFields = exerciseColumns.map(r => r.column_name);
    exerciseFields.forEach(field => {
      if (foundFields.includes(field)) {
        console.log(`   ✅ exercise_logs.${field}`);
      } else {
        console.log(`   ❌ exercise_logs.${field} NOT FOUND`);
      }
    });

    // Check new tables
    console.log('\n3. Checking new tables:');
    const newTables = ['hydration_logs', 'daily_scores'];

    for (const table of newTables) {
      const [results] = await sequelize.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema='public' AND table_name='${table}';
      `);

      if (results.length > 0) {
        // Get column count
        const [cols] = await sequelize.query(`
          SELECT COUNT(*) as count
          FROM information_schema.columns
          WHERE table_name='${table}';
        `);
        console.log(`   ✅ ${table} exists (${cols[0].count} columns)`);
      } else {
        console.log(`   ❌ ${table} NOT FOUND`);
      }
    }

    // Check triggers
    console.log('\n4. Checking triggers:');
    const expectedTriggers = [
      { table: 'vitals_samples', trigger: 'vitals_auto_post_surgery_day' },
      { table: 'meal_entries', trigger: 'meal_auto_post_surgery_day' },
      { table: 'sleep_logs', trigger: 'sleep_auto_post_surgery_day' },
      { table: 'medication_logs', trigger: 'medication_auto_post_surgery_day' },
      { table: 'exercise_logs', trigger: 'exercise_auto_post_surgery_day' },
      { table: 'hydration_logs', trigger: 'hydration_auto_post_surgery_day' },
      { table: 'daily_scores', trigger: 'daily_score_auto_post_surgery_day' }
    ];

    for (const { table, trigger } of expectedTriggers) {
      const [results] = await sequelize.query(`
        SELECT trigger_name
        FROM information_schema.triggers
        WHERE event_object_table='${table}' AND trigger_name='${trigger}';
      `);

      if (results.length > 0) {
        console.log(`   ✅ ${trigger} on ${table}`);
      } else {
        console.log(`   ❌ ${trigger} on ${table} NOT FOUND`);
      }
    }

    // Check daily_scores columns
    console.log('\n5. Checking daily_scores scoring columns:');
    const scoreColumns = ['exerciseScore', 'nutritionScore', 'medicationScore', 'sleepScore', 'vitalsScore', 'hydrationScore', 'totalDailyScore'];

    const [dailyScoresCols] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='daily_scores' AND column_name = ANY($1);
    `, {
      bind: [scoreColumns]
    });

    const foundScores = dailyScoresCols.map(r => r.column_name);
    scoreColumns.forEach(col => {
      if (foundScores.includes(col)) {
        console.log(`   ✅ daily_scores.${col}`);
      } else {
        console.log(`   ❌ daily_scores.${col} NOT FOUND`);
      }
    });

    console.log('\n✅ Schema verification complete!');
    await sequelize.close();
  } catch (error) {
    console.error('\n❌ Error during verification:', error.message);
    process.exit(1);
  }
}

verifySchema();
