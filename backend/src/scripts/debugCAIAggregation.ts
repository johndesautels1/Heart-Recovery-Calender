/**
 * DEBUG: Trace EXACT queries and dates used in CAI aggregation
 * This will show us WHY the queries return zero results
 */

import sequelize from '../models/database';
import Patient from '../models/Patient';

async function debugCAIAggregation() {
  try {
    console.log('🔬 DEBUGGING CAI AGGREGATION\n');
    console.log('='.repeat(70));

    const userId = 2;

    // Step 1: Get patient record (exactly like the service does)
    console.log(`\n📋 Step 1: Get patient record for userId = ${userId}...`);
    const patient = await Patient.findOne({ where: { userId } });

    if (!patient) {
      console.log('❌ No patient found');
      return;
    }

    console.log(`✅ Patient: ${patient.name} (patient.id = ${patient.id})`);
    console.log(`   Surgery Date: ${patient.surgeryDate}`);

    const surgeryDate = patient.surgeryDate;
    const now = new Date();
    const patientId = patient.id;

    // Step 2: Calculate analysis period (exactly like the service does)
    console.log(`\n📅 Step 2: Calculate analysis period...`);
    console.log(`   Current time: ${now.toISOString()}`);

    let analysisStartDate: Date;
    let analysisEndDate: Date;

    if (surgeryDate) {
      analysisStartDate = new Date(surgeryDate);
      const ninetyDaysOut = new Date(surgeryDate);
      ninetyDaysOut.setDate(ninetyDaysOut.getDate() + 90);
      analysisEndDate = now > ninetyDaysOut ? now : ninetyDaysOut;
    } else {
      analysisEndDate = now;
      analysisStartDate = new Date(now);
      analysisStartDate.setDate(analysisStartDate.getDate() - 90);
    }

    console.log(`   Analysis Start: ${analysisStartDate.toISOString()}`);
    console.log(`   Analysis End:   ${analysisEndDate.toISOString()}`);

    // Step 3: Check what data exists in each table with timestamps
    console.log(`\n📊 Step 3: Check actual data in database...`);

    // Vitals
    console.log(`\n   VITALS (userId = ${userId}):`);
    const [vitalsInfo] = await sequelize.query<any>(`
      SELECT
        COUNT(*) as total,
        MIN(timestamp) as earliest,
        MAX(timestamp) as latest
      FROM vitals_samples
      WHERE "userId" = :userId
    `, { replacements: { userId }, type: 'SELECT' as any });
    console.log(`      Total records: ${vitalsInfo.total}`);
    console.log(`      Earliest: ${vitalsInfo.earliest}`);
    console.log(`      Latest: ${vitalsInfo.latest}`);

    // Exercise
    console.log(`\n   EXERCISE (patientId = ${patientId}):`);
    const [exerciseInfo] = await sequelize.query<any>(`
      SELECT
        COUNT(*) as total,
        MIN("completedAt") as earliest,
        MAX("completedAt") as latest
      FROM exercise_logs
      WHERE "patientId" = :patientId
    `, { replacements: { patientId }, type: 'SELECT' as any });
    console.log(`      Total records: ${exerciseInfo.total}`);
    console.log(`      Earliest: ${exerciseInfo.earliest}`);
    console.log(`      Latest: ${exerciseInfo.latest}`);

    // Meals
    console.log(`\n   MEALS (userId = ${userId}):`);
    const [mealsInfo] = await sequelize.query<any>(`
      SELECT
        COUNT(*) as total,
        MIN(timestamp) as earliest,
        MAX(timestamp) as latest
      FROM meal_entries
      WHERE "userId" = :userId
    `, { replacements: { userId }, type: 'SELECT' as any });
    console.log(`      Total records: ${mealsInfo.total}`);
    console.log(`      Earliest: ${mealsInfo.earliest}`);
    console.log(`      Latest: ${mealsInfo.latest}`);

    // Step 4: Run EXACT queries with ::timestamptz cast (current code)
    console.log(`\n\n🔍 Step 4: Run queries WITH ::timestamptz cast (CURRENT CODE)...`);

    console.log(`\n   Testing VITALS query WITH ::timestamptz:`);
    console.log(`   SQL: WHERE "userId" = ${userId} AND timestamp BETWEEN '${analysisStartDate.toISOString()}'::timestamptz AND '${analysisEndDate.toISOString()}'::timestamptz`);
    const [vitalsWithCast] = await sequelize.query<any>(`
      SELECT COUNT(*) as total
      FROM vitals_samples
      WHERE "userId" = :userId
        AND timestamp BETWEEN :startDate::timestamptz AND :endDate::timestamptz
    `, {
      replacements: { userId, startDate: analysisStartDate, endDate: analysisEndDate },
      type: 'SELECT' as any,
    });
    console.log(`   ❌ Result: ${vitalsWithCast.total} records`);

    console.log(`\n   Testing EXERCISE query WITH ::timestamptz:`);
    console.log(`   SQL: WHERE "patientId" = ${patientId} AND "completedAt" BETWEEN '${analysisStartDate.toISOString()}'::timestamptz AND '${analysisEndDate.toISOString()}'::timestamptz`);
    const [exerciseWithCast] = await sequelize.query<any>(`
      SELECT COUNT(*) as total
      FROM exercise_logs
      WHERE "patientId" = :patientId
        AND "completedAt" BETWEEN :startDate::timestamptz AND :endDate::timestamptz
    `, {
      replacements: { patientId, startDate: analysisStartDate, endDate: analysisEndDate },
      type: 'SELECT' as any,
    });
    console.log(`   ❌ Result: ${exerciseWithCast.total} records`);

    console.log(`\n   Testing MEALS query WITH ::timestamptz:`);
    const [mealsWithCast] = await sequelize.query<any>(`
      SELECT COUNT(*) as total
      FROM meal_entries
      WHERE "userId" = :userId
        AND timestamp BETWEEN :startDate::timestamptz AND :endDate::timestamptz
    `, {
      replacements: { userId, startDate: analysisStartDate, endDate: analysisEndDate },
      type: 'SELECT' as any,
    });
    console.log(`   ❌ Result: ${mealsWithCast.total} records`);

    // Step 5: Run queries WITHOUT ::timestamptz cast
    console.log(`\n\n🔍 Step 5: Run queries WITHOUT ::timestamptz cast...`);

    console.log(`\n   Testing VITALS query WITHOUT cast:`);
    const [vitalsNoCast] = await sequelize.query<any>(`
      SELECT COUNT(*) as total
      FROM vitals_samples
      WHERE "userId" = :userId
        AND timestamp BETWEEN :startDate AND :endDate
    `, {
      replacements: { userId, startDate: analysisStartDate, endDate: analysisEndDate },
      type: 'SELECT' as any,
    });
    console.log(`   ✅ Result: ${vitalsNoCast.total} records`);

    console.log(`\n   Testing EXERCISE query WITHOUT cast:`);
    const [exerciseNoCast] = await sequelize.query<any>(`
      SELECT COUNT(*) as total
      FROM exercise_logs
      WHERE "patientId" = :patientId
        AND "completedAt" BETWEEN :startDate AND :endDate
    `, {
      replacements: { patientId, startDate: analysisStartDate, endDate: analysisEndDate },
      type: 'SELECT' as any,
    });
    console.log(`   ✅ Result: ${exerciseNoCast.total} records`);

    console.log(`\n   Testing MEALS query WITHOUT cast:`);
    const [mealsNoCast] = await sequelize.query<any>(`
      SELECT COUNT(*) as total
      FROM meal_entries
      WHERE "userId" = :userId
        AND timestamp BETWEEN :startDate AND :endDate
    `, {
      replacements: { userId, startDate: analysisStartDate, endDate: analysisEndDate },
      type: 'SELECT' as any,
    });
    console.log(`   ✅ Result: ${mealsNoCast.total} records`);

    // Step 6: Analysis
    console.log(`\n\n${'='.repeat(70)}`);
    console.log('🎯 ROOT CAUSE IDENTIFIED:\n');

    if (vitalsWithCast.total === 0 && vitalsNoCast.total > 0) {
      console.log('   ❌ THE ::timestamptz CAST IS BREAKING THE QUERIES!');
      console.log('   ❌ When using ::timestamptz, Sequelize passes parameters incorrectly');
      console.log('   ✅ Without the cast, queries return data correctly');
      console.log('\n   🔧 FIX: Remove all ::timestamptz casts from BETWEEN clauses');
      console.log('      Let Sequelize handle timestamp conversion automatically');
    } else if (vitalsWithCast.total > 0) {
      console.log('   ✅ The ::timestamptz cast works fine');
      console.log('   ⚠️  Problem must be elsewhere (date range, timezone, etc.)');
    } else {
      console.log('   ⚠️  Neither query returns data - date range issue');
      console.log(`   Data exists from ${vitalsInfo.earliest} to ${vitalsInfo.latest}`);
      console.log(`   But querying ${analysisStartDate.toISOString()} to ${analysisEndDate.toISOString()}`);
    }

    console.log(`\n${'='.repeat(70)}\n`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

debugCAIAggregation();
