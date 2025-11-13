/**
 * Debug why CAI reports don't show vitals, meals, exercise data
 */

import sequelize from '../models/database';
import Patient from '../models/Patient';

async function debugCAIData() {
  try {
    const userId = 2;
    console.log(`\n🔍 DEBUGGING CAI DATA FOR USER ${userId}\n`);

    // Get patient and surgery date
    const patient = await Patient.findOne({ where: { userId } });
    if (!patient) {
      console.log('❌ No patient found');
      return;
    }

    console.log('👤 PATIENT INFO:');
    console.log(`   Patient ID: ${patient.id}`);
    console.log(`   User ID: ${patient.userId}`);
    console.log(`   Surgery Date: ${patient.surgeryDate}`);
    console.log(`   Surgery Date (raw): ${JSON.stringify(patient.surgeryDate)}`);

    // Calculate analysis date range (same logic as CAIDataAggregationService.ts)
    const now = new Date();
    let analysisStartDate: Date;
    let analysisEndDate: Date;

    if (patient.surgeryDate) {
      analysisStartDate = new Date(patient.surgeryDate);
      const ninetyDaysOut = new Date(patient.surgeryDate);
      ninetyDaysOut.setDate(ninetyDaysOut.getDate() + 90);
      analysisEndDate = now > ninetyDaysOut ? now : ninetyDaysOut;
    } else {
      analysisEndDate = now;
      analysisStartDate = new Date(now);
      analysisStartDate.setDate(analysisStartDate.getDate() - 90);
    }

    console.log(`\n📅 ANALYSIS DATE RANGE:`);
    console.log(`   Start: ${analysisStartDate}`);
    console.log(`   End: ${analysisEndDate}`);

    // Check meal status distribution
    console.log(`\n🍽️  MEALS STATUS CHECK:`);
    const [mealStatusResults] = await sequelize.query(`
      SELECT status, COUNT(*) as count
      FROM meal_entries
      WHERE "userId" = :userId
      GROUP BY status
    `, { replacements: { userId } });
    console.log(mealStatusResults);

    // Check vitals date range
    console.log(`\n📊 VITALS DATE RANGE:`);
    const [vitalsRange] = await sequelize.query(`
      SELECT
        MIN(timestamp) as earliest,
        MAX(timestamp) as latest,
        COUNT(*) as total_count
      FROM vitals_samples
      WHERE "userId" = :userId
    `, { replacements: { userId } });
    console.log(vitalsRange);

    // Check vitals within analysis range
    console.log(`\n📊 VITALS WITHIN ANALYSIS RANGE:`);
    const [vitalsInRange] = await sequelize.query(`
      SELECT COUNT(*) as count_in_range
      FROM vitals_samples
      WHERE "userId" = :userId
        AND timestamp BETWEEN :startDate AND :endDate
    `, {
      replacements: {
        userId,
        startDate: analysisStartDate,
        endDate: analysisEndDate
      }
    });
    console.log(vitalsInRange);

    // Check meals date range
    console.log(`\n🍽️  MEALS DATE RANGE:`);
    const [mealsRange] = await sequelize.query(`
      SELECT
        status,
        MIN(timestamp) as earliest,
        MAX(timestamp) as latest,
        COUNT(*) as total_count
      FROM meal_entries
      WHERE "userId" = :userId
      GROUP BY status
    `, { replacements: { userId } });
    console.log(mealsRange);

    // Check meals within analysis range (completed only)
    console.log(`\n🍽️  MEALS WITHIN ANALYSIS RANGE (status='completed'):`);
    const [mealsInRange] = await sequelize.query(`
      SELECT COUNT(*) as count_in_range
      FROM meal_entries
      WHERE "userId" = :userId
        AND timestamp BETWEEN :startDate AND :endDate
        AND status = 'completed'
    `, {
      replacements: {
        userId,
        startDate: analysisStartDate,
        endDate: analysisEndDate
      }
    });
    console.log(mealsInRange);

    // Check exercise date range
    console.log(`\n🏃 EXERCISE DATE RANGE (patientId=${patient.id}):`);
    const [exerciseRange] = await sequelize.query(`
      SELECT
        MIN("completedAt") as earliest,
        MAX("completedAt") as latest,
        COUNT(*) as total_count
      FROM exercise_logs
      WHERE "patientId" = :patientId
    `, { replacements: { patientId: patient.id } });
    console.log(exerciseRange);

    // Check exercise within analysis range
    console.log(`\n🏃 EXERCISE WITHIN ANALYSIS RANGE:`);
    const [exerciseInRange] = await sequelize.query(`
      SELECT COUNT(*) as count_in_range
      FROM exercise_logs
      WHERE ("patientId" = :patientId OR "patientId" = :userId)
        AND "completedAt" BETWEEN :startDate AND :endDate
    `, {
      replacements: {
        patientId: patient.id,
        userId,
        startDate: analysisStartDate,
        endDate: analysisEndDate
      }
    });
    console.log(exerciseInRange);

    // Run the ACTUAL query from CAIDataAggregationService for vitals
    console.log(`\n📊 ACTUAL VITALS QUERY FROM SERVICE:`);
    const [vitalsActual] = await sequelize.query(`
      SELECT
        DATE(timestamp) as date,
        COUNT(*) as sample_count,
        AVG("heartRate") as avg_heart_rate,
        MIN("heartRate") as min_heart_rate,
        MAX("heartRate") as max_heart_rate,
        AVG("bloodPressureSystolic") as avg_bp_systolic,
        AVG("bloodPressureDiastolic") as avg_bp_diastolic
      FROM vitals_samples
      WHERE "userId" = :userId
        AND timestamp BETWEEN :startDate AND :endDate
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
      LIMIT 5
    `, {
      replacements: {
        userId,
        startDate: analysisStartDate,
        endDate: analysisEndDate
      }
    });
    console.log(`   Results (first 5 days):`, vitalsActual);

    console.log('\n✅ Debug complete\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

debugCAIData();
