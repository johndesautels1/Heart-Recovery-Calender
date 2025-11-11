/**
 * Test Script: Check why vitals/exercise/meals aggregation returns empty
 */

import sequelize from '../models/database';

async function testAggregationQueries() {
  try {
    console.log('Testing CIA Data Aggregation Queries\n');
    console.log('='.repeat(60));

    const userId = 2;
    const patientId = 11;
    const startDate = '2025-09-18T00:00:00.000Z';
    const endDate = '2025-12-17T01:00:00.000Z';

    console.log(`\nUser ID: ${userId}`);
    console.log(`Patient ID: ${patientId}`);
    console.log(`Analysis Period: ${startDate} to ${endDate}\n`);

    // Test Vitals Aggregation Query
    console.log('1️⃣  Testing VITALS aggregation query...');

    // First, check if any rows match the WHERE clause
    const [rawCountInRange] = await sequelize.query<any>(`
      SELECT COUNT(*) as total
      FROM vitals_samples
      WHERE "userId" = :userId
        AND timestamp BETWEEN :startDate::timestamptz AND :endDate::timestamptz
    `, {
      replacements: { userId, startDate, endDate },
      type: 'SELECT' as any,
    });
    console.log(`   Raw vitals in date range: ${rawCountInRange[0]?.total || 0}`);

    const [vitalsResult] = await sequelize.query<any>(`
      SELECT
        DATE(timestamp) as date,
        COUNT(*) as sample_count,
        AVG("heartRate") as avg_heart_rate,
        MIN("heartRate") as min_heart_rate,
        MAX("heartRate") as max_heart_rate
      FROM vitals_samples
      WHERE "userId" = :userId
        AND timestamp BETWEEN :startDate::timestamptz AND :endDate::timestamptz
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
      LIMIT 5
    `, {
      replacements: { userId, startDate, endDate },
      type: 'SELECT' as any,
    });

    console.log(`   Found ${vitalsResult?.length || 0} daily vitals summaries`);
    if (vitalsResult && vitalsResult.length > 0) {
      console.log('   Sample data:', JSON.stringify(vitalsResult[0], null, 2));
    } else {
      console.log('   ❌ NO VITALS DATA FOUND');
      // Debug: Check raw vitals count
      const [rawVitals] = await sequelize.query(`
        SELECT COUNT(*) as total, MIN(timestamp) as earliest, MAX(timestamp) as latest
        FROM vitals_samples WHERE "userId" = :userId
      `, { replacements: { userId }, type: 'SELECT' as any });
      console.log('   Debug - Raw vitals count:', rawVitals);
    }

    // Test Exercise Aggregation Query
    console.log('\n2️⃣  Testing EXERCISE aggregation query...');
    const [exerciseResult] = await sequelize.query<any>(`
      SELECT
        DATE("completedAt") as date,
        COUNT(*) as session_count,
        SUM("actualDuration") as total_duration_minutes,
        SUM("caloriesBurned") as total_calories
      FROM exercise_logs
      WHERE "patientId" = :patientId
        AND "completedAt" BETWEEN :startDate::timestamptz AND :endDate::timestamptz
      GROUP BY DATE("completedAt")
      ORDER BY date DESC
      LIMIT 5
    `, {
      replacements: { patientId, startDate, endDate },
      type: 'SELECT' as any,
    });

    console.log(`   Found ${exerciseResult?.length || 0} daily exercise summaries`);
    if (exerciseResult && exerciseResult.length > 0) {
      console.log('   Sample data:', JSON.stringify(exerciseResult[0], null, 2));
    } else {
      console.log('   ❌ NO EXERCISE DATA FOUND');
      // Debug: Check raw exercise count
      const [rawExercise] = await sequelize.query(`
        SELECT COUNT(*) as total, MIN("completedAt") as earliest, MAX("completedAt") as latest
        FROM exercise_logs WHERE "patientId" = :patientId
      `, { replacements: { patientId }, type: 'SELECT' as any });
      console.log('   Debug - Raw exercise count:', rawExercise);
    }

    // Test Meals Aggregation Query
    console.log('\n3️⃣  Testing MEALS aggregation query...');
    const [mealsResult] = await sequelize.query<any>(`
      SELECT
        DATE(timestamp) as date,
        COUNT(*) as meal_count,
        SUM(calories) as total_calories
      FROM meal_entries
      WHERE "userId" = :userId
        AND timestamp BETWEEN :startDate::timestamptz AND :endDate::timestamptz
        AND status = 'completed'
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
      LIMIT 5
    `, {
      replacements: { userId, startDate, endDate },
      type: 'SELECT' as any,
    });

    console.log(`   Found ${mealsResult?.length || 0} daily meal summaries`);
    if (mealsResult && mealsResult.length > 0) {
      console.log('   Sample data:', JSON.stringify(mealsResult[0], null, 2));
    } else {
      console.log('   ❌ NO MEALS DATA FOUND');
      // Debug: Check raw meals count
      const [rawMeals] = await sequelize.query(`
        SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'completed') as completed, MIN(timestamp) as earliest, MAX(timestamp) as latest
        FROM meal_entries WHERE "userId" = :userId
      `, { replacements: { userId }, type: 'SELECT' as any });
      console.log('   Debug - Raw meals count:', rawMeals);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test complete\n');

  } catch (error: any) {
    console.error('\n❌ TEST FAILED!');
    console.error('Error:', error.message);
    console.error('\nStack trace:', error.stack);
  } finally {
    await sequelize.close();
  }
}

// Run the test
console.log('🚀 Starting Aggregation Query Test...\n');
testAggregationQueries();
